import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { requireAuth, requirePermission, requireRole } from "./auth";
import { rateLimiter } from "./middleware/security.js";
import type { JobApplication, PayrollStatutoryConfig, PayrollEmployee, LeaveRequest } from "@shared/schema";
import { DEFAULT_PAYROLL_STATUTORY_CONFIG, LONG_LEAVE_THRESHOLD_DAYS } from "@shared/schema";
import { registerChatRoutes } from "./replit_integrations/chat/routes";
import { registerAttachmentRoutes } from "./attachments-routes";
import { getFinancialYearPeriods, computeMonthlyAccrualCredit, computeCarryForwardOpeningBalance, computeAvailableBalance, round1 } from "./lib/leave-accrual-engine";
import { getWeekday, resolveEffectiveDayType, validateSwapRequest } from "./lib/attendance-roster-engine";

// ── Tutor payslip calculation — Sec 194J (KoodaldigiXS Learning independent contractors) ──
// Matches Clause 4.1-4.4 of the signed Individual Tutor Agreement (verified against real
// executed agreements, e.g. KDXS-TUT-2026-0013). This is the ONLY place these formulas
// should live — always recomputed server-side from raw inputs, client-submitted totals
// are never trusted.
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type TutorPayslipInputs = {
  compensationType: string;        // tutorAgreements.compensationType
  rateFee: number;                 // tutorAgreements.rateFee — meaning depends on compensationType
  unitsDelivered: number;          // sessions (per_session) / hours (per_hour) / % 0-100 (per_course)
  revenueAmount: number;           // only used for revenue_share
  platformCommissionPercent: number;
  otherDeduction: number;
  deductTds: boolean;              // Sec 194J only strictly required once aggregate FY payments to
                                    // the payee cross ₹30,000 — operator chooses per payslip rather
                                    // than the app auto-tracking that threshold.
  panAtPayment: string | null | undefined;
  tdsRateOverride?: number; // 10 or 20 — only honored if caller explicitly set it
};

function computeTutorPayslip(input: TutorPayslipInputs) {
  let grossEarnings = 0;
  switch (input.compensationType) {
    case "per_session":
    case "per_hour":
      grossEarnings = round2(input.rateFee * input.unitsDelivered);
      break;
    case "per_course":
      // unitsDelivered = % of course delivered this month (0-100), pro-rated per Clause 4.3(b)
      grossEarnings = round2(input.rateFee * (Math.min(100, Math.max(0, input.unitsDelivered)) / 100));
      break;
    case "revenue_share":
      // rateFee = the agreed % of Gross Earnings (Schedule A), applied to that month's revenue
      grossEarnings = round2(input.revenueAmount * (input.rateFee / 100));
      break;
  }
  grossEarnings = Math.max(0, grossEarnings);

  // Clause 4.2: commission deducted from gross fees before the net is remitted to the tutor.
  const platformCommissionAmount = round2(grossEarnings * (input.platformCommissionPercent || 0) / 100);
  const netOfCommission = Math.max(0, round2(grossEarnings - platformCommissionAmount));

  const pan = (input.panAtPayment || "").trim().toUpperCase();
  const validPan = PAN_REGEX.test(pan);
  const tdsRatePercent = !input.deductTds ? 0
    : (input.tdsRateOverride === 10 || input.tdsRateOverride === 20 ? input.tdsRateOverride : (validPan ? 10 : 20));

  // TDS is computed on the amount actually paid/credited to the tutor — i.e. after commission
  // (flag for CA review on any agreement where commission is nonzero; the agreement text doesn't
  // state this explicitly).
  const tdsAmount = round2(netOfCommission * tdsRatePercent / 100);
  const otherDeduction = round2(Math.max(0, input.otherDeduction || 0));
  const netPay = Math.max(0, round2(netOfCommission - tdsAmount - otherDeduction));

  return { grossEarnings, platformCommissionAmount, tdsAmount, netPay, tdsRatePercent, validPan, panAtPayment: pan || null };
}

// ── Payroll compensation structure — CTC total is always the sum of the named
// components, recomputed server-side (same "never trust client totals" convention
// as computeTutorPayslip above). Matches the business's actual Offer Letter
// Annexure A layout: Basic + HRA + Conveyance + Medical + Other Allowances.
function computeCompensationCtc(input: { basicAnnual: number; hraAnnual: number; conveyanceAnnual: number; medicalAnnual: number; otherAllowancesAnnual: number }): number {
  return round2(
    Math.max(0, input.basicAnnual || 0) +
    Math.max(0, input.hraAnnual || 0) +
    Math.max(0, input.conveyanceAnnual || 0) +
    Math.max(0, input.medicalAnnual || 0) +
    Math.max(0, input.otherAllowancesAnnual || 0)
  );
}

const PAY_MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// payMonth is stored as a label ("April 2026", matching tutorPayslips.payMonth) —
// this resolves it to that month's first day, to look up which compensation
// structure was effective then.
function parsePayMonthToDate(payMonth: string): string | null {
  const match = payMonth.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const idx = PAY_MONTH_NAMES.findIndex(m => m.toLowerCase() === match[1].toLowerCase());
  if (idx === -1) return null;
  return `${match[2]}-${String(idx + 1).padStart(2, "0")}-01`;
}

// ── Payroll payslip earnings — shared by both formats ──
// Each earning component is pro-rated for LOP days and rounded individually
// (not the CTC total divided by 12) — matches how the business's own monthly
// payslips and Full & Final Settlement statement break down pro-rata earnings.
// Rounded to the nearest whole rupee (not paise) — every one of the business's
// actual payslip/compensation documents shows whole-rupee amounts only.
function computeProRatedEarnings(input: {
  basicAnnual: number; hraAnnual: number; conveyanceAnnual: number; medicalAnnual: number; otherAllowancesAnnual: number;
  standardWorkingDays: number; lopDays: number;
}) {
  const factor = input.standardWorkingDays > 0
    ? Math.max(0, Math.min(1, (input.standardWorkingDays - input.lopDays) / input.standardWorkingDays))
    : 1;
  const earned = (annual: number) => Math.round(Math.round((annual || 0) / 12) * factor);

  const basicEarned = earned(input.basicAnnual);
  const hraEarned = earned(input.hraAnnual);
  const conveyanceEarned = earned(input.conveyanceAnnual);
  const medicalEarned = earned(input.medicalAnnual);
  const otherAllowancesEarned = earned(input.otherAllowancesAnnual);
  const grossEarnings = basicEarned + hraEarned + conveyanceEarned + medicalEarned + otherAllowancesEarned;

  return { basicEarned, hraEarned, conveyanceEarned, medicalEarned, otherAllowancesEarned, grossEarnings };
}

// ── Payroll payslip — Format 1 (No PF/ESI) ──
// Professional Tax is the ONLY deduction in this format, entered manually per
// payslip — never derived from a slab table (see the standing rule at
// payrollEmployees in shared/schema.ts). This is the only place these numbers
// should be computed — always recomputed server-side, client totals are never trusted.
function computePayrollPayslipNoPfEsi(input: {
  basicAnnual: number; hraAnnual: number; conveyanceAnnual: number; medicalAnnual: number; otherAllowancesAnnual: number;
  standardWorkingDays: number; lopDays: number; professionalTax: number;
}) {
  const earnings = computeProRatedEarnings(input);
  const professionalTax = Math.round(Math.max(0, input.professionalTax || 0));
  const totalDeductions = professionalTax;
  const netPay = Math.max(0, earnings.grossEarnings - totalDeductions);

  return { ...earnings, professionalTax, totalDeductions, netPay };
}

// ── Payroll payslip — Format 2 (With PF/ESI) ──
// PF and ESI are each independently gated on the employee's own pfApplicable/
// esiApplicable flags (an employee can be covered by one scheme and not the
// other) — the "with_pf_esi" format just means "this payslip's math includes
// PF/ESI where applicable," not "both always apply." Rates/ceilings come from
// the active payrollStatutoryConfigVersions row — never hardcoded — see
// PayrollStatutoryConfig in shared/schema.ts. Both are computed on the
// ALREADY LOP-pro-rated basicEarned/grossEarnings (matching how real PF/ESI
// contributions are based on wages actually earned that month, not the full
// contracted salary) — the wage ceilings themselves are NOT pro-rated for a
// partial month, since no reference material confirms that specific edge case;
// flagging this assumption so it's easy to correct if it's ever wrong.
// Employer-side amounts are computed and returned for storage only — they are
// NOT part of totalDeductions/netPay and are not yet posted to the ledger.
function computePayrollPayslipWithPfEsi(input: {
  basicAnnual: number; hraAnnual: number; conveyanceAnnual: number; medicalAnnual: number; otherAllowancesAnnual: number;
  standardWorkingDays: number; lopDays: number; professionalTax: number;
  pfApplicable: boolean; esiApplicable: boolean; config: PayrollStatutoryConfig;
}) {
  const earnings = computeProRatedEarnings(input);
  const professionalTax = Math.round(Math.max(0, input.professionalTax || 0));

  const pfApplied = !!input.pfApplicable;
  const pfWageBase = input.config.pfWageCeilingApplied ? Math.min(earnings.basicEarned, input.config.pfWageCeiling) : earnings.basicEarned;
  const pfEmployeeAmount = pfApplied ? Math.round(pfWageBase * (input.config.pfRatePercent / 100)) : 0;
  const pfEmployerAmount = pfApplied ? Math.round(pfWageBase * (input.config.pfEmployerRatePercent / 100)) : 0;

  const esiEligible = earnings.grossEarnings <= input.config.esiWageCeiling;
  const esiApplied = !!input.esiApplicable && esiEligible;
  const esiEmployeeAmount = esiApplied ? Math.round(earnings.grossEarnings * (input.config.esiEmployeeRatePercent / 100)) : 0;
  const esiEmployerAmount = esiApplied ? Math.round(earnings.grossEarnings * (input.config.esiEmployerRatePercent / 100)) : 0;

  const totalDeductions = professionalTax + pfEmployeeAmount + esiEmployeeAmount;
  const netPay = Math.max(0, earnings.grossEarnings - totalDeductions);

  return {
    ...earnings, professionalTax,
    pfApplied, pfEmployeeAmount, pfEmployerAmount,
    esiApplied, esiEmployeeAmount, esiEmployerAmount,
    totalDeductions, netPay,
  };
}

// ── Sec 192 TDS (New Tax Regime only) ──
// Applies to every payslip regardless of payslipFormat — PF/ESI applicability
// is a separate axis. Verified against a real payslip's worked example: Gross
// ₹7,42,295 − ₹75,000 standard deduction = Taxable ₹6,67,300; tax = 5% ×
// (6,67,300 − 4,00,000) = ₹13,365 exactly, fully cancelled by the Sec 87A
// rebate (taxable ≤ ₹12,00,000) → Net Tax ₹0. Confirmed via web search
// (Sep 2026) that Budget 2026 made no change to these New Regime numbers for
// FY 2026-27. Old Regime (investment declarations, HRA/80C exemptions) is
// deliberately not built — no reference material for it, and it needs its
// own declaration workflow. Surcharge (only above ₹50L income) is out of
// scope — not applicable at this business's pay scale.
function computeIncomeTaxOnAnnualIncome(taxableIncome: number, config: PayrollStatutoryConfig): { taxBeforeRebate: number; rebate: number; taxAfterRebate: number; cess: number; totalTax: number } {
  let tax = 0;
  let lowerBound = 0;
  for (const slab of config.incomeTaxSlabs) {
    const upperBound = slab.upTo ?? Infinity;
    if (taxableIncome > lowerBound) {
      tax += (Math.min(taxableIncome, upperBound) - lowerBound) * (slab.ratePercent / 100);
    }
    lowerBound = upperBound;
    if (taxableIncome <= upperBound) break;
  }
  tax = Math.round(tax);

  // Sec 87A: full rebate (net tax zero) at/below the threshold; a marginal-relief
  // band just above it caps tax at the amount of income exceeding the threshold,
  // so crossing the threshold by a small amount never costs more tax than the excess.
  let rebate = 0;
  let taxAfterRebate = tax;
  if (taxableIncome <= config.incomeTaxRebateThreshold) {
    rebate = Math.min(tax, config.incomeTaxRebateCap);
    taxAfterRebate = Math.max(0, tax - rebate);
  } else {
    const excessOverThreshold = taxableIncome - config.incomeTaxRebateThreshold;
    if (tax > excessOverThreshold) {
      rebate = tax - excessOverThreshold;
      taxAfterRebate = excessOverThreshold;
    }
  }
  const cess = Math.round(taxAfterRebate * (config.incomeTaxCessPercent / 100));
  return { taxBeforeRebate: tax, rebate, taxAfterRebate, cess, totalTax: taxAfterRebate + cess };
}

// Projects this employee's annual salary for the financial year containing payMonth
// (actual gross from their OTHER payslips already in that FY + this month's actual
// gross + remaining months projected at the current full monthly rate, i.e. without
// this month's own LOP proration — future months are assumed full attendance), then
// spreads the remaining annual tax liability evenly across the remaining months.
// Past payslips' frozen numbers are read-only inputs here — never rewritten.
async function computeIncomeTaxForPayslip(input: {
  payrollEmployeeId: number; payMonth: string;
  currentMonthGrossEarnings: number; fullMonthlyGrossRate: number;
  config: PayrollStatutoryConfig; excludePayslipId?: number;
}): Promise<{ error: string; data?: undefined } | { error?: undefined; data: { annualProjectedGross: number; annualTaxableIncome: number; annualTaxPayable: number; tdsDeductedTillDate: number; tdsThisMonth: number } }> {
  const asOfDate = parsePayMonthToDate(input.payMonth);
  if (!asOfDate) return { error: "Invalid Pay Month" };

  const financialYears = await storage.getFinancialYears();
  const fy = financialYears.find(f => asOfDate >= f.startDate && asOfDate <= f.endDate);
  if (!fy) return { error: `No financial year is configured covering ${input.payMonth} — set one up in Settings → Financial Years first` };

  const allPayslips = await storage.getPayrollPayslips({ payrollEmployeeId: input.payrollEmployeeId });
  const priorInFy = allPayslips.filter(p => {
    if (p.id === input.excludePayslipId || p.status === "rejected") return false;
    const d = parsePayMonthToDate(p.payMonth);
    return !!d && d >= fy.startDate && d <= fy.endDate && d < asOfDate;
  });
  const grossSoFar = priorInFy.reduce((sum, p) => sum + parseFloat(p.grossEarnings), 0);
  const tdsSoFar = priorInFy.reduce((sum, p) => sum + parseFloat(p.tdsThisMonth || "0"), 0);

  const [asOfYear, asOfMonth] = asOfDate.split("-").map(Number);
  const [endYear, endMonth] = fy.endDate.split("-").map(Number);
  const remainingMonths = (endYear * 12 + endMonth) - (asOfYear * 12 + asOfMonth) + 1;
  if (remainingMonths <= 0) return { error: "Pay Month falls outside its financial year" };
  const futureMonthsCount = remainingMonths - 1;

  const annualProjectedGross = Math.round(grossSoFar + input.currentMonthGrossEarnings + futureMonthsCount * input.fullMonthlyGrossRate);
  const annualTaxableIncome = Math.max(0, annualProjectedGross - input.config.incomeTaxStandardDeduction);
  const { totalTax: annualTaxPayable } = computeIncomeTaxOnAnnualIncome(annualTaxableIncome, input.config);

  const remainingTaxLiability = Math.max(0, annualTaxPayable - tdsSoFar);
  const tdsThisMonth = Math.round(remainingTaxLiability / remainingMonths);
  const tdsDeductedTillDate = tdsSoFar + tdsThisMonth;

  return { data: { annualProjectedGross, annualTaxableIncome, annualTaxPayable, tdsDeductedTillDate, tdsThisMonth } };
}

// A voucher's date must fall within SOME configured Financial Year — not
// specifically the currently active one. Backdating/catching up entries into a
// prior year (e.g. FY 2025-26 while FY 2026-27 is active) is normal accounting
// practice; "active" only means "the default year for new work," not "the only
// year postings are allowed into." Checked at every voucher-creation call site
// (manual entry, quotation conversion, tutor payslip mark-paid) — hard block,
// not just a warning. Returns an error message to send back with 400, or null
// if the date falls in a defined year / no financial years are configured at
// all yet (an app that hasn't set one up isn't blocked).
async function checkFinancialYearForDate(date: string): Promise<string | null> {
  const allFys = await storage.getFinancialYears();
  if (allFys.length === 0) return null;
  const matchingFy = allFys.find(fy => date >= fy.startDate && date <= fy.endDate);
  if (!matchingFy) {
    return `Date ${date} doesn't fall within any configured financial year. Add or extend a financial year covering this date in Settings first.`;
  }
  return null;
}

// A date is "past year" if there's an active FY configured and the date falls
// outside its range (either before or, in principle, after — though after would
// mean the active FY is stale). No active FY at all means nothing is "past" —
// everything is treated as current, unrestricted work.
async function isPastFinancialYearDate(date: string): Promise<boolean> {
  const activeFy = await storage.getActiveFinancialYear();
  if (!activeFy) return false;
  return date < activeFy.startDate || date > activeFy.endDate;
}

const ROLES_ALLOWED_PAST_FY_ENTRY = ["senior_accountant", "admin", "super_admin"];
const ROLES_ALLOWED_PAST_FY_APPROVAL = ["admin", "super_admin"];

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
};

function getEnvSmtpConfig(): SmtpConfig | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_NAME, SMTP_FROM_EMAIL } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM_EMAIL) return null;
  return {
    host: SMTP_HOST,
    port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
    secure: SMTP_SECURE === "true",
    username: SMTP_USER,
    password: SMTP_PASSWORD,
    fromName: SMTP_FROM_NAME || "MHTSdigiXR",
    fromEmail: SMTP_FROM_EMAIL,
  };
}

// Falls back to env-configured SMTP when no admin-panel settings exist yet
// (e.g. before anyone has ever logged in to set them).
async function getEffectiveSmtpConfig(): Promise<SmtpConfig | null> {
  const dbSettings = await storage.getSmtpSettings();
  if (dbSettings) return dbSettings;
  return getEnvSmtpConfig();
}

async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  try {
    const smtp = await getEffectiveSmtpConfig();
    if (!smtp) return false;
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure ?? true,
      auth: { user: smtp.username, pass: smtp.password },
    });
    await transporter.sendMail({ from: `"${smtp.fromName}" <${smtp.fromEmail}>`, to, subject, text, ...(html ? { html } : {}) });
    return true;
  } catch {
    return false;
  }
}

// Shared branded wrapper so transactional emails share one look. Matches the
// accent color already used by the password-reset email template below.
function buildBrandedEmailHtml(opts: { brandName: string; heading: string; bodyHtml: string }): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
      <div style="padding: 24px 0 16px; border-bottom: 2px solid #0ea5e9;">
        <span style="font-size: 18px; font-weight: bold; color: #0ea5e9;">${opts.brandName}</span>
      </div>
      <h2 style="color: #0f172a; margin: 24px 0 8px;">${opts.heading}</h2>
      ${opts.bodyHtml}
      <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        This is an automated message from ${opts.brandName}. Please do not reply to this email.
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Substitutes {{token}} placeholders. `vars` values are used as-is for the
// plain-text output; the caller must pass HTML-escaped values when rendering
// into HTML (see renderEmailTemplate below) since some templates (enquiry
// acknowledgement) fill in public, unauthenticated form input.
function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => vars[key] ?? "");
}

function textToHtmlParagraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map(p => `<p style="margin: 0 0 12px;">${p.trim().replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function buildCredentialsHtml(username: string, roleLabel: string, password: string, loginUrl: string): string {
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
      <tr>
        <td style="padding: 10px 14px; color: #64748b; font-size: 13px;">Username</td>
        <td style="padding: 10px 14px; font-family: monospace; font-weight: bold;">${escapeHtml(username)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">Temporary Password</td>
        <td style="padding: 10px 14px; font-family: monospace; font-weight: bold; border-top: 1px solid #e2e8f0;">${escapeHtml(password)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">Role</td>
        <td style="padding: 10px 14px; border-top: 1px solid #e2e8f0;">${escapeHtml(roleLabel)}</td>
      </tr>
    </table>
    <p><a href="${loginUrl}" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In to Your Account</a></p>
  `;
}

function buildActivationCodeHtml(activationCode: string, licenseId: string): string {
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
      <tr>
        <td style="padding: 10px 14px; color: #64748b; font-size: 13px;">License ID</td>
        <td style="padding: 10px 14px; font-family: monospace;">${escapeHtml(licenseId)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">Activation Code</td>
        <td style="padding: 10px 14px; font-family: monospace; font-weight: bold; font-size: 15px; border-top: 1px solid #e2e8f0;">${escapeHtml(activationCode)}</td>
      </tr>
    </table>
  `;
}

// Renders one of the EMAIL_TEMPLATE_KEYS rows (edited by a Super Admin under
// Settings → Email Templates, no code change needed) into a subject/text/html
// triple. Returns null if the template row is missing (falls back to a
// hardcoded message at the call site) — should not happen once seeded.
async function renderEmailTemplate(
  key: "enquiry_welcome" | "employee_welcome" | "tutor_welcome" | "erp_license_activation",
  vars: Record<string, string>,
  brandName: string
): Promise<{ subject: string; text: string; html: string } | null> {
  const tmpl = await storage.getEmailTemplateByKey(key);
  if (!tmpl) return null;

  const subject = fillTemplate(tmpl.subject, vars);
  const bodyTextRendered = fillTemplate(tmpl.bodyText, vars);

  const escapedVars: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) escapedVars[k] = escapeHtml(v);
  const bodyHtmlRendered = textToHtmlParagraphs(fillTemplate(tmpl.bodyText, escapedVars));

  let extraHtml = "";
  let extraText = "";
  let heading = subject;
  if (key === "employee_welcome" || key === "tutor_welcome") {
    heading = `Welcome, ${escapeHtml(vars.fullName || "")}!`;
    extraHtml = buildCredentialsHtml(vars.username || "", vars.role || "", vars.password || "", vars.loginUrl || "");
    extraText = `\n\nUsername: ${vars.username}\nTemporary Password: ${vars.password}\nRole: ${vars.role}\n\nLogin here: ${vars.loginUrl}`;
  } else if (key === "erp_license_activation") {
    heading = subject;
    extraHtml = buildActivationCodeHtml(vars.activationCode || "", vars.licenseId || "");
    extraText = `\n\nLicense ID: ${vars.licenseId}\nActivation Code: ${vars.activationCode}`;
  }

  const html = buildBrandedEmailHtml({ brandName, heading, bodyHtml: bodyHtmlRendered + extraHtml });
  const text = `${bodyTextRendered}${extraText}`;
  return { subject, text, html };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  registerChatRoutes(app);
  registerAttachmentRoutes(app);

  app.get(api.services.list.path, async (req, res) => {
    const services = await storage.getServices();
    res.json(services);
  });

  app.get(api.services.get.path, async (req, res) => {
    const service = await storage.getService(req.params.slug);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json(service);
  });

  app.get(api.posts.list.path, async (req, res) => {
    const allPosts = await storage.getPosts();
    res.json(allPosts.filter(p => p.status === "published"));
  });

  app.get(api.posts.get.path, async (req, res) => {
    const post = await storage.getPost(req.params.slug);
    if (!post || post.status !== "published") {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  });

  app.get(api.caseStudies.list.path, async (req, res) => {
    const studies = await storage.getCaseStudies();
    res.json(studies);
  });

  app.get("/api/faqs", async (_req, res) => {
    const items = await storage.getFaqItems(true);
    res.json(items);
  });

  app.get("/api/testimonials", async (_req, res) => {
    const items = await storage.getTestimonials(true);
    res.json(items);
  });

  app.get("/api/site-stats", async (_req, res) => {
    const items = await storage.getSiteStats();
    res.json(items);
  });

  app.get("/api/pricing-plans", async (_req, res) => {
    const plans = await storage.getPricingPlans(true);
    res.json(plans);
  });

  app.post(api.contact.create.path, async (req, res) => {
    try {
      const input = api.contact.create.input.parse(req.body);
      const message = await storage.createContactMessage(input);
      res.status(201).json(message);

      try {
        const smtp = await storage.getSmtpSettings();
        if (smtp) {
          const companySettings = await storage.getCompanySettings();
          const adminEmail = companySettings?.email || smtp.fromEmail;
          const body = `New contact form submission:\n\nName: ${input.name}\nEmail: ${input.email}${input.phone ? `\nPhone: ${input.phone}` : ""}\n\nMessage:\n${input.message}\n\n---\nView all messages in the Contact Inbox at /accounting/contact-inbox`;
          await sendEmail(adminEmail, "New Contact Message — MHTSdigiXR", body);

          const rendered = await renderEmailTemplate("enquiry_welcome", { name: input.name }, "MHTSdigiXR");
          if (rendered) await sendEmail(input.email, rendered.subject, rendered.text, rendered.html);
        }
      } catch (_emailErr) {}
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // ===== PUBLIC SITE SETTINGS ENDPOINT =====
  app.get("/api/site-settings", async (_req, res) => {
    const settings = await storage.getCompanySettings();
    if (!settings) {
      return res.json({
        brandName: "MHTSdigiXR",
        companyName: "Maanagarram Hi Tech Solutions",
        tagline: "",
        phone: "",
        email: "",
        address: "",
        whatsappNumber: "",
        careersEmail: "",
        websiteUrl: "",
        linkedinUrl: "",
        twitterUrl: "",
        instagramUrl: "",
        facebookUrl: "",
        copyrightText: "",
      });
    }
    res.json({
      brandName: settings.brandName || "MHTSdigiXR",
      companyName: settings.companyName || "Maanagarram Hi Tech Solutions",
      tagline: settings.tagline ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      address: settings.address ?? "",
      whatsappNumber: settings.whatsappNumber ?? "",
      careersEmail: settings.careersEmail ?? "",
      websiteUrl: settings.websiteUrl ?? "",
      linkedinUrl: settings.linkedinUrl ?? "",
      twitterUrl: settings.twitterUrl ?? "",
      instagramUrl: settings.instagramUrl ?? "",
      facebookUrl: settings.facebookUrl ?? "",
      copyrightText: settings.copyrightText ?? "",
      aboutStory: settings.aboutStory ?? "",
      aboutVision: settings.aboutVision ?? "",
      aboutMission: settings.aboutMission ?? "",
      foundedYear: settings.foundedYear ?? "",
      aboutLocation: settings.aboutLocation ?? "",
    });
  });

  app.get("/api/legal/:slug", async (req, res) => {
    const page = await storage.getLegalPageBySlug(req.params.slug);
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json(page);
  });



  // ===== ACCOUNTING API ROUTES (Protected) =====

  // Dashboard
  app.get("/api/accounting/dashboard", requireAuth, requirePermission("dashboard.view"), async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // Roles
  app.get("/api/accounting/roles", requireAuth, requirePermission("roles.view"), async (req, res) => {
    const allRoles = await storage.getRoles();
    res.json(allRoles);
  });

  app.post("/api/accounting/roles", requireAuth, requirePermission("roles.manage"), async (req, res) => {
    try {
      const { slug, label, description, permissions } = req.body;
      if (!slug || !label) {
        return res.status(400).json({ message: "Slug and label are required" });
      }
      if (!/^[a-z][a-z0-9_]{1,49}$/.test(slug)) {
        return res.status(400).json({ message: "Slug must be lowercase letters, digits, underscores; 2-50 chars" });
      }
      const { ALL_PERMISSIONS: AP } = await import("@shared/schema");
      const validPerms = Array.isArray(permissions) ? permissions.filter((p: string) => (AP as readonly string[]).includes(p)) : [];
      const role = await storage.createRole({
        slug, label, description: description || null,
        permissions: validPerms,
        isSystem: false,
      });
      await storage.createAuditLog({
        employeeId: req.user!.id, action: "create", entity: "role",
        entityId: role.id, details: `Created role: ${label} (${slug})`,
        ipAddress: req.ip || null,
      });
      res.status(201).json(role);
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(400).json({ message: "Role slug already exists" });
      }
      throw err;
    }
  });

  app.patch("/api/accounting/roles/:id", requireAuth, requirePermission("roles.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getRoles().then(rs => rs.find(r => r.id === id));
    if (!existing) return res.status(404).json({ message: "Role not found" });

    const { ALL_PERMISSIONS: AP } = await import("@shared/schema");
    const data: Record<string, unknown> = {};
    if (req.body.label) data.label = req.body.label;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.permissions) {
      data.permissions = Array.isArray(req.body.permissions)
        ? req.body.permissions.filter((p: string) => (AP as readonly string[]).includes(p))
        : [];
    }
    if (!existing.isSystem && req.body.slug) {
      if (!/^[a-z][a-z0-9_]{1,49}$/.test(req.body.slug)) {
        return res.status(400).json({ message: "Invalid slug format" });
      }
      data.slug = req.body.slug;
    }

    const updated = await storage.updateRole(id, data);
    if (!updated) return res.status(404).json({ message: "Role not found" });

    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "role",
      entityId: id, details: `Updated role: ${existing.slug}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/roles/:id", requireAuth, requirePermission("roles.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getRoles().then(rs => rs.find(r => r.id === id));
    if (!existing) return res.status(404).json({ message: "Role not found" });
    if (existing.isSystem) return res.status(403).json({ message: "Cannot delete system roles" });

    const allEmployees = await storage.getEmployees();
    const inUse = allEmployees.some(e => e.role === existing.slug);
    if (inUse) return res.status(400).json({ message: "Cannot delete role — it is assigned to employees" });

    const deleted = await storage.deleteRole(id);
    if (!deleted) return res.status(404).json({ message: "Role not found" });

    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "role",
      entityId: id, details: `Deleted role: ${existing.slug}`,
      ipAddress: req.ip || null,
    });
    res.json({ success: true });
  });

  // Employees
  app.get("/api/accounting/employees/directory", requireAuth, requirePermission("employees.view"), async (req, res) => {
    const allEmployees = await storage.getEmployees();
    res.json(allEmployees.filter(e => e.isActive).map(e => ({ id: e.id, fullName: e.fullName, role: e.role })));
  });

  app.get("/api/accounting/employees", requireAuth, requirePermission("employees.manage"), async (req, res) => {
    const allEmployees = await storage.getEmployees();
    const safeEmployees = allEmployees.map(({ password, ...rest }) => rest);
    if (req.user!.role !== "super_admin") {
      return res.json(safeEmployees.filter(e => e.role !== "super_admin"));
    }
    res.json(safeEmployees);
  });

  app.get("/api/accounting/employees/next-code", requireAuth, requirePermission("employees.manage"), async (req, res) => {
    const employeeCode = await storage.getNextEmployeeCode();
    res.json({ employeeCode });
  });

  app.post("/api/accounting/employees", requireAuth, requirePermission("employees.manage"), async (req, res) => {
    try {
      const { username, email, password, fullName, role, permissions: userPermissions, phone, employeeCode, reportsTo } = req.body;
      if (req.user!.role !== "super_admin" && (role === "super_admin" || role === "admin")) {
        return res.status(403).json({ message: "Only Super Admin can create Super Admin or Admin accounts" });
      }
      const finalEmployeeCode = employeeCode || await storage.getNextEmployeeCode();
      // No DB unique constraint on employee_code yet (deferred until backfill —
      // see shared/schema.ts), so this app-level check is the only thing
      // preventing two employees from silently ending up with the same code.
      if (await storage.getEmployeeByCode(finalEmployeeCode)) {
        return res.status(400).json({ message: `Employee code "${finalEmployeeCode}" is already in use` });
      }
      let finalReportsTo: number | null = null;
      if (reportsTo !== undefined && reportsTo !== null && reportsTo !== "") {
        finalReportsTo = parseInt(reportsTo);
        if (!(await storage.getEmployeeById(finalReportsTo))) {
          return res.status(400).json({ message: "Selected manager does not exist" });
        }
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const { ALL_PERMISSIONS: AP } = await import("@shared/schema");
      const validPerms = Array.isArray(userPermissions) ? userPermissions.filter((p: string) => (AP as readonly string[]).includes(p)) : undefined;
      const employee = await storage.createEmployee({
        username, email, password: hashedPassword, fullName, role,
        permissions: validPerms || null,
        phone: phone || null,
        employeeCode: finalEmployeeCode,
        reportsTo: finalReportsTo,
        isActive: true, createdBy: req.user!.id,
      });
      await storage.createAuditLog({
        employeeId: req.user!.id, action: "create", entity: "employee",
        entityId: employee.id, details: `Created employee: ${username} (${role})`,
        ipAddress: req.ip || null,
      });
      const { password: _, ...safe } = employee;
      const baseUrl = req.protocol + "://" + req.get("host");
      const { ROLE_LABELS } = await import("@shared/schema");
      const roleLabel = ROLE_LABELS[role] || role;
      const brandName = role === "tutor" ? "KoodaldigiXS Learning" : "MHTSdigiXR";
      const loginUrl = `${baseUrl}/accounting/login`;
      const templateKey = role === "tutor" ? "tutor_welcome" : "employee_welcome";
      const rendered = await renderEmailTemplate(templateKey, { fullName, username, password, role: roleLabel, loginUrl }, brandName);
      const emailSent = rendered
        ? await sendEmail(email, rendered.subject, rendered.text, rendered.html)
        : await sendEmail(email, `Welcome to ${brandName} — Your Account Details`, `Hello ${fullName},\n\nYour ${brandName} account has been created.\n\nUsername: ${username}\nPassword: ${password}\nRole: ${roleLabel}\nLogin: ${loginUrl}\n\nPlease change your password after first login.\n\n${brandName} Team`);
      res.status(201).json({ ...safe, emailSent });
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(400).json({ message: "Username or email already exists" });
      }
      throw err;
    }
  });

  app.patch("/api/accounting/employees/:id", requireAuth, requirePermission("employees.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const target = await storage.getEmployeeById(id);
    if (!target) return res.status(404).json({ message: "Employee not found" });

    if (req.user!.role !== "super_admin" && (target.role === "super_admin" || target.role === "admin")) {
      return res.status(403).json({ message: "Cannot modify this account" });
    }

    const data: any = {};
    if (req.body.fullName) data.fullName = req.body.fullName;
    if (req.body.email) data.email = req.body.email;
    if (req.body.phone !== undefined) data.phone = req.body.phone || null;
    if (req.body.employeeCode !== undefined) {
      const newCode = req.body.employeeCode || null;
      if (newCode) {
        const existing = await storage.getEmployeeByCode(newCode);
        if (existing && existing.id !== id) {
          return res.status(400).json({ message: `Employee code "${newCode}" is already in use` });
        }
      }
      data.employeeCode = newCode;
    }
    if (req.body.reportsTo !== undefined) {
      if (req.body.reportsTo === null || req.body.reportsTo === "") {
        data.reportsTo = null;
      } else {
        const newManagerId = parseInt(req.body.reportsTo);
        if (newManagerId === id) {
          return res.status(400).json({ message: "An employee cannot report to themselves" });
        }
        if (!(await storage.getEmployeeById(newManagerId))) {
          return res.status(400).json({ message: "Selected manager does not exist" });
        }
        data.reportsTo = newManagerId;
      }
    }
    if (req.body.role) {
      if (req.user!.role !== "super_admin" && (req.body.role === "super_admin" || req.body.role === "admin")) {
        return res.status(403).json({ message: "Cannot assign this role" });
      }
      data.role = req.body.role;
    }
    if (typeof req.body.isActive === "boolean") data.isActive = req.body.isActive;
    if (req.body.password) {
      data.password = await bcrypt.hash(req.body.password, 10);
      data.passwordChangedAt = new Date();
    }
    if (req.body.permissions !== undefined) {
      const { ALL_PERMISSIONS: AP } = await import("@shared/schema");
      data.permissions = Array.isArray(req.body.permissions)
        ? req.body.permissions.filter((p: string) => (AP as readonly string[]).includes(p))
        : null;
    }

    const updated = await storage.updateEmployee(id, data);
    if (!updated) return res.status(404).json({ message: "Employee not found" });

    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "employee",
      entityId: id, details: `Updated employee: ${target.username}`,
      ipAddress: req.ip || null,
    });

    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  // Account Groups
  app.get("/api/accounting/account-groups", requireAuth, requirePermission("ledgers.view"), async (req, res) => {
    const groups = await storage.getAccountGroups();
    res.json(groups);
  });

  // Ledger Accounts
  app.get("/api/accounting/ledgers", requireAuth, requirePermission("ledgers.view"), async (req, res) => {
    const accounts = await storage.getLedgerAccounts();
    res.json(accounts);
  });

  app.get("/api/accounting/ledgers/:id", requireAuth, requirePermission("ledgers.view"), async (req, res) => {
    const account = await storage.getLedgerAccount(parseInt(req.params.id));
    if (!account) return res.status(404).json({ message: "Ledger account not found" });
    res.json(account);
  });

  app.get("/api/accounting/ledgers/:id/statement", requireAuth, requirePermission("ledgers.view"), async (req, res) => {
    const statement = await storage.getLedgerStatement(
      parseInt(req.params.id),
      req.query.startDate as string,
      req.query.endDate as string
    );
    res.json(statement);
  });

  app.post("/api/accounting/ledgers", requireAuth, requirePermission("ledgers.create"), async (req, res) => {
    const account = await storage.createLedgerAccount({ ...req.body, createdBy: req.user!.id });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "ledger",
      entityId: account.id, details: `Created ledger: ${account.name}`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(account);
  });

  app.patch("/api/accounting/ledgers/:id", requireAuth, requirePermission("ledgers.edit"), async (req, res) => {
    const updated = await storage.updateLedgerAccount(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Ledger account not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "ledger",
      entityId: updated.id, details: `Updated ledger: ${updated.name}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/ledgers/:id", requireAuth, requirePermission("ledgers.edit"), async (req, res) => {
    const id = parseInt(req.params.id);
    const entries = await storage.getVoucherEntriesByLedger(id);
    if (entries.length > 0) {
      return res.status(400).json({ message: "Cannot delete ledger with existing voucher entries" });
    }
    const deleted = await storage.deleteLedgerAccount(id);
    if (!deleted) return res.status(404).json({ message: "Ledger account not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "ledger",
      entityId: id, details: `Deleted ledger account`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  // Parties (Customers/Vendors)
  app.get("/api/accounting/parties", requireAuth, requirePermission("parties.view"), async (req, res) => {
    const partyList = await storage.getParties(req.query.type as string);
    res.json(partyList);
  });

  app.get("/api/accounting/parties/:id", requireAuth, requirePermission("parties.view"), async (req, res) => {
    const party = await storage.getParty(parseInt(req.params.id));
    if (!party) return res.status(404).json({ message: "Party not found" });
    res.json(party);
  });

  app.post("/api/accounting/parties", requireAuth, requirePermission("parties.create"), async (req, res) => {
    const groups = await storage.getAccountGroups();
    const debtorGroup = groups.find(g => g.name === "Sundry Debtors" || g.name === "Current Assets");
    const creditorGroup = groups.find(g => g.name === "Sundry Creditors" || g.name === "Current Liabilities");

    const partyType = req.body.type || "customer";
    const group = partyType === "vendor" ? creditorGroup : debtorGroup;

    let ledgerAccountId = null;
    if (group) {
      const ledger = await storage.createLedgerAccount({
        name: req.body.name,
        groupId: group.id,
        openingBalance: req.body.openingBalance || "0",
        balanceType: partyType === "vendor" ? "credit" : "debit",
        description: `Auto-created for ${partyType}: ${req.body.name}`,
        createdBy: req.user!.id,
      });
      ledgerAccountId = ledger.id;
    }

    const party = await storage.createParty({
      ...req.body,
      ledgerAccountId,
      createdBy: req.user!.id,
    });

    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "party",
      entityId: party.id, details: `Created ${partyType}: ${party.name}`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(party);
  });

  app.patch("/api/accounting/parties/:id", requireAuth, requirePermission("parties.edit"), async (req, res) => {
    const updated = await storage.updateParty(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Party not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "party",
      entityId: updated.id, details: `Updated party: ${updated.name}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/parties/:id", requireAuth, requirePermission("parties.delete"), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const deleted = await storage.deleteParty(id);
      if (!deleted) return res.status(404).json({ message: "Party not found" });
      await storage.createAuditLog({
        employeeId: req.user!.id, action: "delete", entity: "party",
        entityId: id, details: `Deleted party`,
        ipAddress: req.ip || null,
      });
      res.json({ message: "Deleted successfully" });
    } catch (err: any) {
      if (err.code === "23503") {
        return res.status(400).json({ message: "Cannot delete party — it is referenced by vouchers or quotations" });
      }
      throw err;
    }
  });

  // Products/Services
  app.get("/api/accounting/products", requireAuth, requirePermission("products.view"), async (req, res) => {
    const productList = await storage.getProducts();
    res.json(productList);
  });

  app.get("/api/accounting/products/:id", requireAuth, requirePermission("products.view"), async (req, res) => {
    const product = await storage.getProduct(parseInt(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.get("/api/accounting/products/next-code/:category", requireAuth, requirePermission("products.create"), async (req, res) => {
    const code = await storage.getNextProductCode(req.params.category);
    res.json({ productCode: code });
  });

  app.post("/api/accounting/products", requireAuth, requirePermission("products.create"), async (req, res) => {
    try {
      const product = await storage.createProduct({ ...req.body, createdBy: req.user!.id });
      await storage.createAuditLog({
        employeeId: req.user!.id, action: "create", entity: "product",
        entityId: product.id, details: `Created product: ${product.name} (${product.productCode})`,
        ipAddress: req.ip || null,
      });
      res.status(201).json(product);
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(400).json({ message: "Product code already exists" });
      }
      throw err;
    }
  });

  app.patch("/api/accounting/products/:id", requireAuth, requirePermission("products.edit"), async (req, res) => {
    const updated = await storage.updateProduct(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Product not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "product",
      entityId: updated.id, details: `Updated product: ${updated.name}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/products/:id", requireAuth, requirePermission("products.delete"), async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteProduct(id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "product",
      entityId: id, details: `Deleted product`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  // Quotations
  app.get("/api/accounting/quotations", requireAuth, requirePermission("quotations.view"), async (req, res) => {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.partyId) filters.partyId = parseInt(req.query.partyId as string);
    if (!req.user!.permissions?.includes("quotations.edit")) filters.createdBy = req.user!.id;
    const quotationList = await storage.getQuotations(filters);
    res.json(quotationList);
  });

  app.get("/api/accounting/quotations/next-number", requireAuth, requirePermission("quotations.create"), async (req, res) => {
    const number = await storage.getNextQuotationNumber();
    res.json({ quotationNumber: number });
  });

  app.get("/api/accounting/quotations/:id", requireAuth, requirePermission("quotations.view"), async (req, res) => {
    const quotation = await storage.getQuotation(parseInt(req.params.id));
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    res.json(quotation);
  });

  app.post("/api/accounting/quotations", requireAuth, requirePermission("quotations.create"), async (req, res) => {
    const quotation = await storage.createQuotation({ ...req.body, createdBy: req.user!.id, assignedTo: req.body.assignedTo || req.user!.id });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "quotation",
      entityId: quotation.id, details: `Created quotation: ${quotation.quotationNumber}`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(quotation);
  });

  app.patch("/api/accounting/quotations/:id", requireAuth, requirePermission("quotations.edit"), async (req, res) => {
    const { status, submittedAt, reviewedBy, reviewedAt, ...safeBody } = req.body;
    const updated = await storage.updateQuotation(parseInt(req.params.id), safeBody);
    if (!updated) return res.status(404).json({ message: "Quotation not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "quotation",
      entityId: updated.id, details: `Updated quotation: ${updated.quotationNumber}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/quotations/:id", requireAuth, requirePermission("quotations.delete"), async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteQuotation(id);
    if (!deleted) return res.status(404).json({ message: "Quotation not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "quotation",
      entityId: id, details: `Deleted quotation`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  app.post("/api/accounting/quotations/:id/submit", requireAuth, requirePermission("quotations.create"), async (req, res) => {
    const quotation = await storage.getQuotation(parseInt(req.params.id));
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    if (quotation.status !== "draft") return res.status(400).json({ message: "Only draft quotations can be submitted" });
    const isManager = req.user!.permissions?.includes("quotations.approve") || false;
    const isOwner = quotation.createdBy === req.user!.id || quotation.assignedTo === req.user!.id;
    if (!isManager && !isOwner) {
      return res.status(403).json({ message: "You can only submit quotations assigned to you or created by you" });
    }
    const updated = await storage.updateQuotation(quotation.id, {
      status: "submitted",
      submittedAt: new Date(),
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "submit", entity: "quotation",
      entityId: quotation.id, details: `Submitted quotation ${quotation.quotationNumber} for review`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/quotations/:id/approve", requireAuth, requirePermission("quotations.approve"), async (req, res) => {
    const quotation = await storage.getQuotation(parseInt(req.params.id));
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    if (quotation.status !== "submitted") return res.status(400).json({ message: "Only submitted quotations can be approved" });
    const updated = await storage.updateQuotation(quotation.id, {
      status: "accepted",
      reviewedBy: req.user!.id,
      reviewedAt: new Date(),
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "approve", entity: "quotation",
      entityId: quotation.id, details: `Approved quotation ${quotation.quotationNumber}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/quotations/:id/reject", requireAuth, requirePermission("quotations.approve"), async (req, res) => {
    const quotation = await storage.getQuotation(parseInt(req.params.id));
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    if (quotation.status !== "submitted") return res.status(400).json({ message: "Only submitted quotations can be rejected" });
    const reason = req.body?.reason || "";
    const updated = await storage.updateQuotation(quotation.id, {
      status: "rejected",
      reviewedBy: req.user!.id,
      reviewedAt: new Date(),
      notes: reason ? `Rejected: ${reason}` : (quotation.notes ?? undefined),
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "reject", entity: "quotation",
      entityId: quotation.id, details: `Rejected quotation ${quotation.quotationNumber}${reason ? ": " + reason : ""}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/quotations/:id/convert", requireAuth, requirePermission("quotations.approve"), async (req, res) => {
    const quotation = await storage.getQuotation(parseInt(req.params.id));
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    if (quotation.status !== "accepted" && quotation.status !== "sent") {
      return res.status(400).json({ message: "Only approved quotations can be converted to invoices" });
    }
    const convertDate = new Date().toISOString().split("T")[0];
    const fyError = await checkFinancialYearForDate(convertDate);
    if (fyError) return res.status(400).json({ message: fyError });

    const voucherNumber = await storage.getNextVoucherNumber("sales");
    const voucher = await storage.createVoucher({
      voucherNumber,
      date: convertDate,
      type: "sales",
      narration: `From Quotation ${quotation.quotationNumber}`,
      totalAmount: String(quotation.grandTotal),
      status: "pending",
      partyId: quotation.partyId,
      gstRate: null,
      taxableAmount: String(quotation.subtotal),
      cgstAmount: String(quotation.cgstTotal),
      sgstAmount: String(quotation.sgstTotal),
      igstAmount: String(quotation.igstTotal),
      isInterState: quotation.isInterState,
      createdBy: req.user!.id,
    }, []);

    await storage.updateQuotation(quotation.id, { status: "converted", convertedVoucherId: voucher.id });

    await storage.createAuditLog({
      employeeId: req.user!.id, action: "convert", entity: "quotation",
      entityId: quotation.id, details: `Converted quotation ${quotation.quotationNumber} to voucher ${voucherNumber}`,
      ipAddress: req.ip || null,
    });

    res.json({ voucher, message: "Quotation converted to sales voucher" });
  });

  // Expense Claims
  app.get("/api/accounting/expenses", requireAuth, requirePermission("expenses.view"), async (req, res) => {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (!req.user!.permissions?.includes("expenses.approve")) {
      filters.employeeId = req.user!.id;
    } else if (req.query.employeeId) {
      filters.employeeId = parseInt(req.query.employeeId as string);
    }
    const claims = await storage.getExpenseClaims(filters);
    res.json(claims);
  });

  app.get("/api/accounting/expenses/next-number", requireAuth, requirePermission("expenses.create"), async (req, res) => {
    const number = await storage.getNextClaimNumber();
    res.json({ claimNumber: number });
  });

  app.get("/api/accounting/expenses/:id", requireAuth, requirePermission("expenses.view"), async (req, res) => {
    const claim = await storage.getExpenseClaim(parseInt(req.params.id));
    if (!claim) return res.status(404).json({ message: "Expense claim not found" });
    if (!req.user!.permissions?.includes("expenses.approve") && claim.employeeId !== req.user!.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    res.json(claim);
  });

  app.post("/api/accounting/expenses", requireAuth, requirePermission("expenses.create"), async (req, res) => {
    const claimNumber = await storage.getNextClaimNumber();
    const claim = await storage.createExpenseClaim({
      ...req.body,
      claimNumber,
      employeeId: req.user!.id,
      status: "pending",
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "expense",
      entityId: claim.id, details: `Created expense claim: ${claimNumber}`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(claim);
  });

  app.patch("/api/accounting/expenses/:id", requireAuth, requirePermission("expenses.approve"), async (req, res) => {
    const id = parseInt(req.params.id);
    const claim = await storage.getExpenseClaim(id);
    if (!claim) return res.status(404).json({ message: "Expense claim not found" });

    const data: any = { ...req.body };
    if (req.body.status === "approved" || req.body.status === "rejected") {
      data.approvedBy = req.user!.id;
      data.approvedAt = new Date();
    }

    const updated = await storage.updateExpenseClaim(id, data);
    if (!updated) return res.status(404).json({ message: "Expense claim not found" });

    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "expense",
      entityId: id, details: `Updated expense claim ${claim.claimNumber}: status=${data.status || "updated"}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/expenses/:id", requireAuth, requirePermission("expenses.approve"), async (req, res) => {
    const id = parseInt(req.params.id);
    const claim = await storage.getExpenseClaim(id);
    if (!claim) return res.status(404).json({ message: "Expense claim not found" });
    if (claim.status !== "pending") {
      return res.status(400).json({ message: "Only pending expense claims can be deleted" });
    }
    const deleted = await storage.deleteExpenseClaim(id);
    if (!deleted) return res.status(404).json({ message: "Expense claim not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "expense",
      entityId: id, details: `Deleted expense claim: ${claim.claimNumber}`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  // ── Payroll: Tutors (independent contractors, Sec 194J) ──
  app.get("/api/accounting/tutors", requireAuth, requirePermission("payroll_tutors.view"), async (req, res) => {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    const list = await storage.getTutors(filters);
    res.json(list);
  });

  app.get("/api/accounting/tutors/next-code", requireAuth, requirePermission("payroll_tutors.manage"), async (req, res) => {
    const tutorCode = await storage.getNextTutorCode();
    res.json({ tutorCode });
  });

  app.get("/api/accounting/tutors/:id", requireAuth, requirePermission("payroll_tutors.view"), async (req, res) => {
    const tutor = await storage.getTutor(parseInt(req.params.id));
    if (!tutor) return res.status(404).json({ message: "Tutor not found" });
    res.json(tutor);
  });

  app.get("/api/accounting/tutors/:id/agreements", requireAuth, requirePermission("payroll_tutors.view"), async (req, res) => {
    const list = await storage.getTutorAgreements({ tutorId: parseInt(req.params.id) });
    res.json(list);
  });

  app.get("/api/accounting/tutors/:id/payslips", requireAuth, requirePermission("payroll_tutors.view"), async (req, res) => {
    const list = await storage.getTutorPayslips({ tutorId: parseInt(req.params.id) });
    res.json(list);
  });

  app.post("/api/accounting/tutors", requireAuth, requirePermission("payroll_tutors.manage"), async (req, res) => {
    if (req.body.panNumber && !PAN_REGEX.test(String(req.body.panNumber).toUpperCase())) {
      return res.status(400).json({ message: "PAN must be in the format AAAAA9999A" });
    }
    const tutorCode = req.body.tutorCode || await storage.getNextTutorCode();
    const tutor = await storage.createTutor({
      ...req.body,
      tutorCode,
      panNumber: req.body.panNumber ? String(req.body.panNumber).toUpperCase() : req.body.panNumber,
      createdBy: req.user!.id,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "tutor",
      entityId: tutor.id, details: `Created tutor: ${tutor.tutorCode} (${tutor.fullName})`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(tutor);
  });

  app.patch("/api/accounting/tutors/:id", requireAuth, requirePermission("payroll_tutors.manage"), async (req, res) => {
    if (req.body.panNumber && !PAN_REGEX.test(String(req.body.panNumber).toUpperCase())) {
      return res.status(400).json({ message: "PAN must be in the format AAAAA9999A" });
    }
    const data = { ...req.body };
    if (data.panNumber) data.panNumber = String(data.panNumber).toUpperCase();
    const updated = await storage.updateTutor(parseInt(req.params.id), data);
    if (!updated) return res.status(404).json({ message: "Tutor not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "tutor",
      entityId: updated.id, details: `Updated tutor: ${updated.tutorCode}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/tutors/:id", requireAuth, requirePermission("payroll_tutors.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existingAgreements = await storage.getTutorAgreements({ tutorId: id });
    if (existingAgreements.length > 0) {
      return res.status(400).json({ message: "Cannot delete a tutor with agreement history — deactivate instead" });
    }
    const deleted = await storage.deleteTutor(id);
    if (!deleted) return res.status(404).json({ message: "Tutor not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "tutor",
      entityId: id, details: `Deleted tutor`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  // ── Tutor Agreements — one row per signed Schedule A (Clause 4.1-4.3). A tutor
  // may hold several, sequentially or concurrently, each with its own compensation terms.
  app.get("/api/accounting/tutor-agreements", requireAuth, requirePermission("payroll_tutors.view"), async (req, res) => {
    const filters: any = {};
    if (req.query.tutorId) filters.tutorId = parseInt(req.query.tutorId as string);
    const list = await storage.getTutorAgreements(filters);
    res.json(list);
  });

  app.get("/api/accounting/tutor-agreements/next-ref", requireAuth, requirePermission("payroll_tutors.manage"), async (req, res) => {
    const agreementRef = await storage.getNextAgreementRef();
    res.json({ agreementRef });
  });

  app.get("/api/accounting/tutor-agreements/:id", requireAuth, requirePermission("payroll_tutors.view"), async (req, res) => {
    const agreement = await storage.getTutorAgreement(parseInt(req.params.id));
    if (!agreement) return res.status(404).json({ message: "Agreement not found" });
    res.json(agreement);
  });

  app.get("/api/accounting/tutor-agreements/:id/payslips", requireAuth, requirePermission("payroll_tutors.view"), async (req, res) => {
    const list = await storage.getTutorPayslips({ agreementId: parseInt(req.params.id) });
    res.json(list);
  });

  app.post("/api/accounting/tutor-agreements", requireAuth, requirePermission("payroll_tutors.manage"), async (req, res) => {
    const tutor = await storage.getTutor(parseInt(req.body.tutorId));
    if (!tutor) return res.status(400).json({ message: "Tutor not found" });
    if (!req.body.subject) return res.status(400).json({ message: "Subject / course is required" });
    const agreementRef = req.body.agreementRef || await storage.getNextAgreementRef();
    const agreement = await storage.createTutorAgreement({
      ...req.body,
      tutorId: tutor.id,
      agreementRef,
      createdBy: req.user!.id,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "tutor_agreement",
      entityId: agreement.id, details: `Created agreement ${agreement.agreementRef} for ${tutor.tutorCode} (${agreement.subject})`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(agreement);
  });

  app.patch("/api/accounting/tutor-agreements/:id", requireAuth, requirePermission("payroll_tutors.manage"), async (req, res) => {
    const updated = await storage.updateTutorAgreement(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Agreement not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "tutor_agreement",
      entityId: updated.id, details: `Updated agreement: ${updated.agreementRef}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/tutor-agreements/:id", requireAuth, requirePermission("payroll_tutors.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existingPayslips = await storage.getTutorPayslips({ agreementId: id });
    if (existingPayslips.length > 0) {
      return res.status(400).json({ message: "Cannot delete an agreement with payslip history — mark it Completed/Cancelled instead" });
    }
    const deleted = await storage.deleteTutorAgreement(id);
    if (!deleted) return res.status(404).json({ message: "Agreement not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "tutor_agreement",
      entityId: id, details: `Deleted agreement`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  // Tutor self-service — scoped to the tutor record linked to the logged-in account
  app.get("/api/accounting/my-tutor-profile", requireAuth, requirePermission("payroll_tutors.view_own"), async (req, res) => {
    const tutor = await storage.getTutorByLoginEmployeeId(req.user!.id);
    if (!tutor) return res.status(404).json({ message: "No tutor profile linked to this account" });
    res.json(tutor);
  });

  app.get("/api/accounting/my-agreements", requireAuth, requirePermission("payroll_tutors.view_own"), async (req, res) => {
    const tutor = await storage.getTutorByLoginEmployeeId(req.user!.id);
    if (!tutor) return res.status(404).json({ message: "No tutor profile linked to this account" });
    const list = await storage.getTutorAgreements({ tutorId: tutor.id });
    res.json(list);
  });

  app.get("/api/accounting/my-payslips", requireAuth, requirePermission("payroll_tutors.view_own"), async (req, res) => {
    const tutor = await storage.getTutorByLoginEmployeeId(req.user!.id);
    if (!tutor) return res.status(404).json({ message: "No tutor profile linked to this account" });
    const list = await storage.getTutorPayslips({ tutorId: tutor.id });
    // Tutors only ever see finalized states — draft/submitted/rejected are internal
    // admin workflow states with no self-service UI to render them.
    res.json(list.filter(p => p.status === "approved" || p.status === "paid"));
  });

  app.get("/api/accounting/my-payslips/:id", requireAuth, requirePermission("payroll_tutors.view_own"), async (req, res) => {
    const tutor = await storage.getTutorByLoginEmployeeId(req.user!.id);
    if (!tutor) return res.status(404).json({ message: "No tutor profile linked to this account" });
    const payslip = await storage.getTutorPayslip(parseInt(req.params.id));
    if (!payslip || payslip.tutorId !== tutor.id || (payslip.status !== "approved" && payslip.status !== "paid")) {
      return res.status(404).json({ message: "Payslip not found" });
    }
    res.json(payslip);
  });

  // Payroll Employee self-service — mirrors the tutor pattern (payroll_tutors.view_own)
  // but granted broadly across staff roles by default (see SYSTEM_ROLE_PERMISSIONS),
  // not restricted to one dedicated role — salaried staff already log in with their
  // real functional role (Senior Accountant, Admin, etc.) to use the Accounts app,
  // and this permission just lets that role also see its own linked payroll profile.
  app.get("/api/accounting/my-payroll-profile", requireAuth, requirePermission("payroll_employees.view_own"), async (req, res) => {
    const profile = await storage.getPayrollEmployeeByLoginEmployeeId(req.user!.id);
    if (!profile) return res.status(404).json({ message: "No payroll profile linked to this account" });
    res.json(profile);
  });

  // Tutor Payslips (admin side)
  app.get("/api/accounting/tutor-payslips", requireAuth, requirePermission("payroll_tutors.view"), async (req, res) => {
    const filters: any = {};
    if (req.query.tutorId) filters.tutorId = parseInt(req.query.tutorId as string);
    if (req.query.agreementId) filters.agreementId = parseInt(req.query.agreementId as string);
    if (req.query.status) filters.status = req.query.status;
    const list = await storage.getTutorPayslips(filters);
    res.json(list);
  });

  app.get("/api/accounting/tutor-payslips/:id", requireAuth, requirePermission("payroll_tutors.view"), async (req, res) => {
    const payslip = await storage.getTutorPayslip(parseInt(req.params.id));
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });
    res.json(payslip);
  });

  function buildTutorPayslipData(body: any, agreement: { compensationType: string; rateFee: string; platformCommissionPercent: string }, tutor: { panNumber: string | null }) {
    const inputs: TutorPayslipInputs = {
      compensationType: agreement.compensationType,
      rateFee: parseFloat(agreement.rateFee) || 0,
      unitsDelivered: parseFloat(body.unitsDelivered) || 0,
      revenueAmount: parseFloat(body.revenueAmount) || 0,
      platformCommissionPercent: parseFloat(agreement.platformCommissionPercent) || 0,
      otherDeduction: parseFloat(body.otherDeduction) || 0,
      deductTds: body.deductTds !== false, // defaults true unless explicitly turned off
      panAtPayment: body.panAtPayment || tutor.panNumber,
      tdsRateOverride: body.tdsRatePercent === 10 || body.tdsRatePercent === 20 ? body.tdsRatePercent : undefined,
    };
    const computed = computeTutorPayslip(inputs);
    return {
      unitsDelivered: String(inputs.unitsDelivered),
      revenueAmount: inputs.compensationType === "revenue_share" ? String(inputs.revenueAmount) : null,
      otherDeduction: String(inputs.otherDeduction),
      deductTds: inputs.deductTds,
      panAtPayment: computed.panAtPayment,
      tdsRatePercent: computed.tdsRatePercent,
      grossEarnings: String(computed.grossEarnings),
      platformCommissionAmount: String(computed.platformCommissionAmount),
      tdsAmount: String(computed.tdsAmount),
      netPay: String(computed.netPay),
    };
  }

  app.post("/api/accounting/tutor-payslips", requireAuth, requirePermission("payroll_tutors.process"), async (req, res) => {
    const agreement = await storage.getTutorAgreement(parseInt(req.body.agreementId));
    if (!agreement) return res.status(400).json({ message: "Tutor agreement not found" });
    const tutor = await storage.getTutor(agreement.tutorId);
    if (!tutor) return res.status(400).json({ message: "Tutor not found" });
    if (!req.body.payMonth) return res.status(400).json({ message: "payMonth is required" });

    const computedData = buildTutorPayslipData(req.body, agreement, tutor);
    const payslip = await storage.createTutorPayslip({
      ...computedData,
      agreementId: agreement.id,
      tutorId: tutor.id,
      payMonth: req.body.payMonth,
      status: "draft",
      preparedBy: req.user!.id,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "tutor_payslip",
      entityId: payslip.id, details: `Created draft payslip for ${tutor.tutorCode} (${agreement.agreementRef}) — ${payslip.payMonth}`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(payslip);
  });

  app.patch("/api/accounting/tutor-payslips/:id", requireAuth, requirePermission("payroll_tutors.process"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getTutorPayslip(id);
    if (!existing) return res.status(404).json({ message: "Payslip not found" });
    if (existing.status !== "draft" && existing.status !== "rejected") {
      return res.status(400).json({ message: "Only draft or rejected payslips can be edited" });
    }
    const agreement = await storage.getTutorAgreement(existing.agreementId);
    if (!agreement) return res.status(400).json({ message: "Tutor agreement not found" });
    const tutor = await storage.getTutor(existing.tutorId);
    if (!tutor) return res.status(400).json({ message: "Tutor not found" });

    const computedData = buildTutorPayslipData({ ...existing, ...req.body }, agreement, tutor);
    const updated = await storage.updateTutorPayslip(id, {
      ...computedData,
      payMonth: req.body.payMonth || existing.payMonth,
      status: "draft",
      rejectionReason: null,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "tutor_payslip",
      entityId: id, details: `Updated payslip for ${tutor.tutorCode} (${agreement.agreementRef}) — ${existing.payMonth}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/tutor-payslips/:id", requireAuth, requirePermission("payroll_tutors.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getTutorPayslip(id);
    if (!existing) return res.status(404).json({ message: "Payslip not found" });
    if (existing.status === "paid") {
      return res.status(400).json({ message: "Cannot delete a paid payslip — it has a posted ledger voucher. Reverse the voucher first if this was posted in error." });
    }
    const deleted = await storage.deleteTutorPayslip(id);
    if (!deleted) return res.status(404).json({ message: "Payslip not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "tutor_payslip",
      entityId: id, details: `Deleted payslip for tutor #${existing.tutorId} — ${existing.payMonth}`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  app.post("/api/accounting/tutor-payslips/:id/submit", requireAuth, requirePermission("payroll_tutors.process"), async (req, res) => {
    const id = parseInt(req.params.id);
    const payslip = await storage.getTutorPayslip(id);
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });
    if (payslip.status !== "draft") return res.status(400).json({ message: "Only draft payslips can be submitted" });
    const updated = await storage.updateTutorPayslip(id, { status: "submitted", submittedAt: new Date() });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "submit", entity: "tutor_payslip",
      entityId: id, details: `Submitted payslip ${id} for approval`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/tutor-payslips/:id/approve", requireAuth, requirePermission("payroll_tutors.approve"), async (req, res) => {
    const id = parseInt(req.params.id);
    const payslip = await storage.getTutorPayslip(id);
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });
    if (payslip.status !== "submitted") return res.status(400).json({ message: "Only submitted payslips can be approved" });
    const updated = await storage.updateTutorPayslip(id, {
      status: "approved", approvedBy: req.user!.id, approvedAt: new Date(),
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "approve", entity: "tutor_payslip",
      entityId: id, details: `Approved payslip ${id}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/tutor-payslips/:id/reject", requireAuth, requirePermission("payroll_tutors.approve"), async (req, res) => {
    const id = parseInt(req.params.id);
    const payslip = await storage.getTutorPayslip(id);
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });
    if (payslip.status !== "submitted") return res.status(400).json({ message: "Only submitted payslips can be rejected" });
    const reason = req.body?.reason || "";
    const updated = await storage.updateTutorPayslip(id, {
      status: "rejected", approvedBy: req.user!.id, approvedAt: new Date(),
      rejectionReason: reason || null,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "reject", entity: "tutor_payslip",
      entityId: id, details: `Rejected payslip ${id}${reason ? ": " + reason : ""}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/tutor-payslips/:id/mark-paid", requireAuth, requirePermission("payroll_tutors.approve"), async (req, res) => {
    const id = parseInt(req.params.id);
    const payslip = await storage.getTutorPayslip(id);
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });
    if (payslip.status !== "approved") return res.status(400).json({ message: "Only approved payslips can be marked paid" });
    const tutor = await storage.getTutor(payslip.tutorId);
    if (!tutor) return res.status(400).json({ message: "Tutor not found" });
    const payDate = new Date().toISOString().split("T")[0];
    const fyError = await checkFinancialYearForDate(payDate);
    if (fyError) return res.status(400).json({ message: fyError });

    const ledgerAccounts = await storage.getLedgerAccounts();
    const feesLedger = ledgerAccounts.find(a => a.name === "Tutor Professional Fees");
    const tdsLedger = ledgerAccounts.find(a => a.name === "TDS Payable");
    const bankLedger = ledgerAccounts.find(a => a.name === "Bank Account");
    const commissionLedger = ledgerAccounts.find(a => a.name === "Platform Commission Income");
    if (!feesLedger || !tdsLedger || !bankLedger || !commissionLedger) {
      return res.status(500).json({ message: "Required ledger accounts are missing — contact an administrator" });
    }

    const gross = parseFloat(payslip.grossEarnings);
    const commission = parseFloat(payslip.platformCommissionAmount || "0");
    const tds = parseFloat(payslip.tdsAmount);
    const other = parseFloat(payslip.otherDeduction || "0");
    const net = parseFloat(payslip.netPay);

    // voucherId is a placeholder — storage.createVoucher() overwrites it with the
    // newly-created voucher's real id for every entry before inserting.
    const entries = [
      { ledgerAccountId: feesLedger.id, voucherId: 0, debit: String(gross), credit: "0" },
      { ledgerAccountId: tdsLedger.id, voucherId: 0, debit: "0", credit: String(tds) },
      { ledgerAccountId: bankLedger.id, voucherId: 0, debit: "0", credit: String(net + other) },
    ];
    if (commission > 0) {
      entries.push({ ledgerAccountId: commissionLedger.id, voucherId: 0, debit: "0", credit: String(commission) });
    }

    const voucherNumber = await storage.getNextVoucherNumber("payment");
    const voucher = await storage.createVoucher({
      voucherNumber,
      date: payDate,
      type: "payment",
      narration: `Tutor payslip — ${tutor.tutorCode} (${tutor.fullName}) — ${payslip.payMonth}`,
      totalAmount: String(gross),
      status: "approved",
      partyId: null,
      gstRate: null,
      taxableAmount: null,
      cgstAmount: null,
      sgstAmount: null,
      igstAmount: null,
      isInterState: false,
      createdBy: req.user!.id,
      approvedBy: req.user!.id,
    }, entries);

    const updated = await storage.updateTutorPayslip(id, { status: "paid", voucherId: voucher.id });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "mark-paid", entity: "tutor_payslip",
      entityId: id, details: `Marked payslip ${id} paid — posted voucher ${voucherNumber}`,
      ipAddress: req.ip || null,
    });
    res.json({ ...updated, voucher });
  });

  // ── Payroll: Employees (MHTSdigiXR salaried staff) — STUB ──
  // Master-data CRUD only. No statutory calculation routes exist here on purpose —
  // Sec 192 TDS / PF / ESI / Gratuity formulas must be reviewed by a CA first.
  app.get("/api/accounting/payroll-employees", requireAuth, requirePermission("payroll_employees.view"), async (req, res) => {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    const list = await storage.getPayrollEmployees(filters);
    res.json(list);
  });

  // Registered BEFORE /:id below — otherwise Express would match "headcount-summary"
  // as an :id value first and this route would never be reached.
  // Informational/gating only for the statutory threshold banner (see
  // PayrollEmployees.tsx / PayrollStatutoryConfig.tsx) — never auto-flips any
  // employee's pfApplicable/esiApplicable flag; those stay a deliberate per-employee choice.
  app.get("/api/accounting/payroll-employees/headcount-summary", requireAuth, requirePermission("payroll_employees.view"), async (req, res) => {
    const employees = await storage.getPayrollEmployees({ status: "active" });
    res.json({
      totalActive: employees.length,
      pfApplicableCount: employees.filter(e => e.pfApplicable).length,
      esiApplicableCount: employees.filter(e => e.esiApplicable).length,
    });
  });

  app.get("/api/accounting/payroll-employees/:id", requireAuth, requirePermission("payroll_employees.view"), async (req, res) => {
    const employee = await storage.getPayrollEmployee(parseInt(req.params.id));
    if (!employee) return res.status(404).json({ message: "Payroll employee not found" });
    res.json(employee);
  });

  app.post("/api/accounting/payroll-employees", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    if (req.body.loginEmployeeId) {
      const linked = await storage.getEmployeeById(parseInt(req.body.loginEmployeeId));
      if (!linked) return res.status(400).json({ message: "Linked login account not found" });
    }
    const employee = await storage.createPayrollEmployee({ ...req.body, createdBy: req.user!.id });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "payroll_employee",
      entityId: employee.id, details: `Created payroll employee master: ${employee.employeeCode} (${employee.fullName})`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(employee);
  });

  app.patch("/api/accounting/payroll-employees/:id", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    if (req.body.loginEmployeeId) {
      const linked = await storage.getEmployeeById(parseInt(req.body.loginEmployeeId));
      if (!linked) return res.status(400).json({ message: "Linked login account not found" });
    }
    const updated = await storage.updatePayrollEmployee(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Payroll employee not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "payroll_employee",
      entityId: updated.id, details: `Updated payroll employee master: ${updated.employeeCode}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/payroll-employees/:id", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getPayrollEmployee(id);
    if (!existing) return res.status(404).json({ message: "Payroll employee not found" });
    const deleted = await storage.deletePayrollEmployee(id);
    if (!deleted) return res.status(404).json({ message: "Payroll employee not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "payroll_employee",
      entityId: id, details: `Deleted payroll employee master: ${existing.employeeCode}`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  // Payroll: Statutory Config — effective-dated, versioned rates/ceilings for the
  // With-PF/ESI payslip format. Every rate/ceiling/threshold is configurable here,
  // never hardcoded in calculation code (see PayrollStatutoryConfig in shared/schema.ts).
  app.get("/api/accounting/payroll-statutory-config", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    const list = await storage.getPayrollStatutoryConfigVersions();
    res.json(list);
  });

  app.get("/api/accounting/payroll-statutory-config/active", requireAuth, requirePermission("payroll_employees.view"), async (req, res) => {
    const active = await storage.getActivePayrollStatutoryConfigVersion();
    if (!active) return res.status(404).json({ message: "No statutory configuration is active" });
    res.json(active);
  });

  app.get("/api/accounting/payroll-statutory-config/:id", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    const version = await storage.getPayrollStatutoryConfigVersion(parseInt(req.params.id));
    if (!version) return res.status(404).json({ message: "Statutory config version not found" });
    res.json(version);
  });

  app.post("/api/accounting/payroll-statutory-config", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    if (!req.body.effectiveFrom) return res.status(400).json({ message: "Effective From date is required" });
    if (!req.body.label) return res.status(400).json({ message: "Label is required" });
    const config = { ...DEFAULT_PAYROLL_STATUTORY_CONFIG, ...(req.body.config || {}) };
    const version = await storage.createPayrollStatutoryConfigVersion({
      effectiveFrom: req.body.effectiveFrom,
      label: req.body.label,
      config,
      isActive: false,
      notes: req.body.notes || null,
      createdBy: req.user!.id,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "payroll_statutory_config_version",
      entityId: version.id, details: `Created statutory config version "${version.label}" effective ${version.effectiveFrom}`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(version);
  });

  app.patch("/api/accounting/payroll-statutory-config/:id", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getPayrollStatutoryConfigVersion(id);
    if (!existing) return res.status(404).json({ message: "Statutory config version not found" });
    const config = req.body.config ? { ...(existing.config as object), ...req.body.config } : undefined;
    const updated = await storage.updatePayrollStatutoryConfigVersion(id, {
      effectiveFrom: req.body.effectiveFrom ?? existing.effectiveFrom,
      label: req.body.label ?? existing.label,
      notes: req.body.notes !== undefined ? req.body.notes || null : existing.notes,
      ...(config ? { config } : {}),
    });
    if (!updated) return res.status(404).json({ message: "Statutory config version not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "payroll_statutory_config_version",
      entityId: updated.id, details: `Updated statutory config version "${updated.label}"`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/payroll-statutory-config/:id/activate", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getPayrollStatutoryConfigVersion(id);
    if (!existing) return res.status(404).json({ message: "Statutory config version not found" });
    const updated = await storage.activatePayrollStatutoryConfigVersion(id);
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "activate", entity: "payroll_statutory_config_version",
      entityId: id, details: `Activated statutory config version "${existing.label}"`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/payroll-statutory-config/:id", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getPayrollStatutoryConfigVersion(id);
    if (!existing) return res.status(404).json({ message: "Statutory config version not found" });
    if (existing.isActive) return res.status(400).json({ message: "Cannot delete the active configuration — activate a different version first" });
    const deleted = await storage.deletePayrollStatutoryConfigVersion(id);
    if (!deleted) return res.status(404).json({ message: "Statutory config version not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "payroll_statutory_config_version",
      entityId: id, details: `Deleted statutory config version "${existing.label}"`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  // Payroll: Compensation Structures — effective-dated, reused by payslip generation (Step 2b/2c)
  app.get("/api/accounting/payroll-compensation-structures", requireAuth, requirePermission("payroll_employees.view"), async (req, res) => {
    const filters: any = {};
    if (req.query.payrollEmployeeId) filters.payrollEmployeeId = parseInt(req.query.payrollEmployeeId as string);
    const list = await storage.getPayrollCompensationStructures(filters);
    res.json(list);
  });

  app.get("/api/accounting/payroll-compensation-structures/:id", requireAuth, requirePermission("payroll_employees.view"), async (req, res) => {
    const structure = await storage.getPayrollCompensationStructure(parseInt(req.params.id));
    if (!structure) return res.status(404).json({ message: "Compensation structure not found" });
    res.json(structure);
  });

  app.post("/api/accounting/payroll-compensation-structures", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    const payrollEmployeeId = parseInt(req.body.payrollEmployeeId);
    const employee = await storage.getPayrollEmployee(payrollEmployeeId);
    if (!employee) return res.status(400).json({ message: "Payroll employee not found" });
    if (!req.body.effectiveFrom) return res.status(400).json({ message: "Effective From date is required" });

    const existingForDate = (await storage.getPayrollCompensationStructures({ payrollEmployeeId }))
      .find(s => s.effectiveFrom === req.body.effectiveFrom);
    if (existingForDate) {
      return res.status(400).json({ message: `A compensation structure already exists effective ${req.body.effectiveFrom} for this employee` });
    }

    const basicAnnual = parseFloat(req.body.basicAnnual) || 0;
    const hraAnnual = parseFloat(req.body.hraAnnual) || 0;
    const conveyanceAnnual = parseFloat(req.body.conveyanceAnnual) || 0;
    const medicalAnnual = parseFloat(req.body.medicalAnnual) || 0;
    const otherAllowancesAnnual = parseFloat(req.body.otherAllowancesAnnual) || 0;
    const ctcAnnual = computeCompensationCtc({ basicAnnual, hraAnnual, conveyanceAnnual, medicalAnnual, otherAllowancesAnnual });

    const structure = await storage.createPayrollCompensationStructure({
      payrollEmployeeId, effectiveFrom: req.body.effectiveFrom,
      reason: req.body.reason || null, refNo: req.body.refNo || null,
      basicAnnual: String(basicAnnual), hraAnnual: String(hraAnnual), conveyanceAnnual: String(conveyanceAnnual),
      medicalAnnual: String(medicalAnnual), otherAllowancesAnnual: String(otherAllowancesAnnual),
      ctcAnnual: String(ctcAnnual),
      createdBy: req.user!.id,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "payroll_compensation_structure",
      entityId: structure.id, details: `Set compensation for ${employee.employeeCode} effective ${structure.effectiveFrom}: CTC Rs.${structure.ctcAnnual}/yr`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(structure);
  });

  app.patch("/api/accounting/payroll-compensation-structures/:id", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getPayrollCompensationStructure(id);
    if (!existing) return res.status(404).json({ message: "Compensation structure not found" });

    const basicAnnual = req.body.basicAnnual !== undefined ? parseFloat(req.body.basicAnnual) || 0 : parseFloat(existing.basicAnnual);
    const hraAnnual = req.body.hraAnnual !== undefined ? parseFloat(req.body.hraAnnual) || 0 : parseFloat(existing.hraAnnual);
    const conveyanceAnnual = req.body.conveyanceAnnual !== undefined ? parseFloat(req.body.conveyanceAnnual) || 0 : parseFloat(existing.conveyanceAnnual);
    const medicalAnnual = req.body.medicalAnnual !== undefined ? parseFloat(req.body.medicalAnnual) || 0 : parseFloat(existing.medicalAnnual);
    const otherAllowancesAnnual = req.body.otherAllowancesAnnual !== undefined ? parseFloat(req.body.otherAllowancesAnnual) || 0 : parseFloat(existing.otherAllowancesAnnual);
    const ctcAnnual = computeCompensationCtc({ basicAnnual, hraAnnual, conveyanceAnnual, medicalAnnual, otherAllowancesAnnual });

    const updated = await storage.updatePayrollCompensationStructure(id, {
      effectiveFrom: req.body.effectiveFrom ?? existing.effectiveFrom,
      reason: req.body.reason !== undefined ? req.body.reason || null : existing.reason,
      refNo: req.body.refNo !== undefined ? req.body.refNo || null : existing.refNo,
      basicAnnual: String(basicAnnual), hraAnnual: String(hraAnnual), conveyanceAnnual: String(conveyanceAnnual),
      medicalAnnual: String(medicalAnnual), otherAllowancesAnnual: String(otherAllowancesAnnual),
      ctcAnnual: String(ctcAnnual),
    });
    if (!updated) return res.status(404).json({ message: "Compensation structure not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "payroll_compensation_structure",
      entityId: updated.id, details: `Updated compensation structure effective ${updated.effectiveFrom}: CTC Rs.${updated.ctcAnnual}/yr`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/payroll-compensation-structures/:id", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getPayrollCompensationStructure(id);
    if (!existing) return res.status(404).json({ message: "Compensation structure not found" });
    const deleted = await storage.deletePayrollCompensationStructure(id);
    if (!deleted) return res.status(404).json({ message: "Compensation structure not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "payroll_compensation_structure",
      entityId: id, details: `Deleted compensation structure effective ${existing.effectiveFrom}`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  // Payroll: Payslips — both formats. Sec 192 TDS applies to both alike (see
  // computeIncomeTaxForPayslip above) — an active statutory config is now required
  // for ANY payslip, not just With-PF/ESI, since it also carries the tax slab settings.
  type PayrollPayslipComputedFields = {
    compensationStructureId: number;
    statutoryConfigVersionId: number | null;
    payMonth: string;
    payslipFormat: "no_pf_esi" | "with_pf_esi";
    standardWorkingDays: number;
    lopDays: string;
    basicEarned: string; hraEarned: string; conveyanceEarned: string; medicalEarned: string; otherAllowancesEarned: string;
    grossEarnings: string;
    professionalTax: string;
    pfApplied: boolean; pfEmployeeAmount: string; pfEmployerAmount: string;
    esiApplied: boolean; esiEmployeeAmount: string; esiEmployerAmount: string;
    annualProjectedGross: string; annualTaxableIncome: string; annualTaxPayable: string;
    tdsDeductedTillDate: string; tdsThisMonth: string;
    totalDeductions: string;
    netPay: string;
  };
  async function buildPayrollPayslipData(employee: PayrollEmployee, body: any, excludePayslipId?: number): Promise<{ error: string; data?: undefined } | { error?: undefined; data: PayrollPayslipComputedFields }> {
    if (!body.payMonth) return { error: "Pay Month is required" };
    const asOfDate = parsePayMonthToDate(body.payMonth);
    if (!asOfDate) return { error: "Invalid Pay Month" };
    const structure = await storage.getCurrentPayrollCompensationStructure(employee.id, asOfDate);
    if (!structure) return { error: `No compensation structure is effective for ${body.payMonth} — set one up first` };

    const configVersion = await storage.getActivePayrollStatutoryConfigVersion();
    if (!configVersion) return { error: "No statutory configuration is active — set one up in Payroll → Statutory Config first" };
    const config = { ...DEFAULT_PAYROLL_STATUTORY_CONFIG, ...(configVersion.config as Partial<PayrollStatutoryConfig>) };

    const standardWorkingDays = parseInt(body.standardWorkingDays) || 26;
    const lopDays = parseFloat(body.lopDays) || 0;
    const professionalTax = parseFloat(body.professionalTax) || 0;
    // Defaults from the employee's own flags, overridable per payslip (e.g. to force a
    // one-off no_pf_esi payslip, or to test with_pf_esi ahead of flipping the flag).
    const payslipFormat: "no_pf_esi" | "with_pf_esi" =
      body.payslipFormat === "with_pf_esi" || body.payslipFormat === "no_pf_esi"
        ? body.payslipFormat
        : (employee.pfApplicable || employee.esiApplicable ? "with_pf_esi" : "no_pf_esi");

    const structureAnnuals = {
      basicAnnual: parseFloat(structure.basicAnnual), hraAnnual: parseFloat(structure.hraAnnual),
      conveyanceAnnual: parseFloat(structure.conveyanceAnnual), medicalAnnual: parseFloat(structure.medicalAnnual),
      otherAllowancesAnnual: parseFloat(structure.otherAllowancesAnnual),
    };
    const earningsInput = { ...structureAnnuals, standardWorkingDays, lopDays };

    const computed = payslipFormat === "no_pf_esi"
      ? { ...computePayrollPayslipNoPfEsi({ ...earningsInput, professionalTax }), pfApplied: false, pfEmployeeAmount: 0, pfEmployerAmount: 0, esiApplied: false, esiEmployeeAmount: 0, esiEmployerAmount: 0 }
      : computePayrollPayslipWithPfEsi({ ...earningsInput, professionalTax, pfApplicable: employee.pfApplicable, esiApplicable: employee.esiApplicable, config });

    // Full (non-LOP-prorated) monthly rate, for projecting the FY's remaining months.
    const fullMonthlyGrossRate = computeProRatedEarnings({ ...structureAnnuals, standardWorkingDays, lopDays: 0 }).grossEarnings;
    const taxResult = await computeIncomeTaxForPayslip({
      payrollEmployeeId: employee.id, payMonth: body.payMonth,
      currentMonthGrossEarnings: computed.grossEarnings, fullMonthlyGrossRate, config, excludePayslipId,
    });
    if (taxResult.error) return { error: taxResult.error };
    const tax = taxResult.data!;

    const totalDeductions = computed.totalDeductions + tax.tdsThisMonth;
    const netPay = Math.max(0, computed.grossEarnings - totalDeductions);

    return {
      data: {
        compensationStructureId: structure.id, statutoryConfigVersionId: configVersion.id,
        payMonth: body.payMonth, payslipFormat,
        standardWorkingDays, lopDays: String(lopDays),
        basicEarned: String(computed.basicEarned), hraEarned: String(computed.hraEarned),
        conveyanceEarned: String(computed.conveyanceEarned), medicalEarned: String(computed.medicalEarned),
        otherAllowancesEarned: String(computed.otherAllowancesEarned),
        grossEarnings: String(computed.grossEarnings),
        professionalTax: String(computed.professionalTax),
        pfApplied: computed.pfApplied, pfEmployeeAmount: String(computed.pfEmployeeAmount), pfEmployerAmount: String(computed.pfEmployerAmount),
        esiApplied: computed.esiApplied, esiEmployeeAmount: String(computed.esiEmployeeAmount), esiEmployerAmount: String(computed.esiEmployerAmount),
        annualProjectedGross: String(tax.annualProjectedGross), annualTaxableIncome: String(tax.annualTaxableIncome), annualTaxPayable: String(tax.annualTaxPayable),
        tdsDeductedTillDate: String(tax.tdsDeductedTillDate), tdsThisMonth: String(tax.tdsThisMonth),
        totalDeductions: String(totalDeductions),
        netPay: String(netPay),
      },
    };
  }

  app.get("/api/accounting/payroll-payslips", requireAuth, requirePermission("payroll_employees.view"), async (req, res) => {
    const filters: any = {};
    if (req.query.payrollEmployeeId) filters.payrollEmployeeId = parseInt(req.query.payrollEmployeeId as string);
    if (req.query.status) filters.status = req.query.status;
    const list = await storage.getPayrollPayslips(filters);
    res.json(list);
  });

  app.get("/api/accounting/payroll-payslips/:id", requireAuth, requirePermission("payroll_employees.view"), async (req, res) => {
    const payslip = await storage.getPayrollPayslip(parseInt(req.params.id));
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });
    res.json(payslip);
  });

  app.post("/api/accounting/payroll-payslips", requireAuth, requirePermission("payroll_employees.process"), async (req, res) => {
    const employee = await storage.getPayrollEmployee(parseInt(req.body.payrollEmployeeId));
    if (!employee) return res.status(400).json({ message: "Payroll employee not found" });

    const existingForMonth = (await storage.getPayrollPayslips({ payrollEmployeeId: employee.id }))
      .find(p => p.payMonth === req.body.payMonth);
    if (existingForMonth) {
      return res.status(400).json({ message: `A payslip already exists for ${req.body.payMonth} for this employee` });
    }

    const built = await buildPayrollPayslipData(employee, req.body);
    if (built.error) return res.status(400).json({ message: built.error });

    const payslip = await storage.createPayrollPayslip({
      ...built.data!,
      payrollEmployeeId: employee.id,
      status: "draft",
      preparedBy: req.user!.id,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "payroll_payslip",
      entityId: payslip.id, details: `Created draft payslip for ${employee.employeeCode} — ${payslip.payMonth}`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(payslip);
  });

  app.patch("/api/accounting/payroll-payslips/:id", requireAuth, requirePermission("payroll_employees.process"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getPayrollPayslip(id);
    if (!existing) return res.status(404).json({ message: "Payslip not found" });
    if (existing.status !== "draft" && existing.status !== "rejected") {
      return res.status(400).json({ message: "Only draft or rejected payslips can be edited" });
    }
    const employee = await storage.getPayrollEmployee(existing.payrollEmployeeId);
    if (!employee) return res.status(400).json({ message: "Payroll employee not found" });

    const mergedBody = { ...existing, ...req.body };
    if (mergedBody.payMonth !== existing.payMonth) {
      const existingForMonth = (await storage.getPayrollPayslips({ payrollEmployeeId: employee.id }))
        .find(p => p.payMonth === mergedBody.payMonth && p.id !== id);
      if (existingForMonth) {
        return res.status(400).json({ message: `A payslip already exists for ${mergedBody.payMonth} for this employee` });
      }
    }

    const built = await buildPayrollPayslipData(employee, mergedBody, id);
    if (built.error) return res.status(400).json({ message: built.error });

    const updated = await storage.updatePayrollPayslip(id, {
      ...built.data!,
      status: "draft",
      rejectionReason: null,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "payroll_payslip",
      entityId: id, details: `Updated payslip for ${employee.employeeCode} — ${updated!.payMonth}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/payroll-payslips/:id", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getPayrollPayslip(id);
    if (!existing) return res.status(404).json({ message: "Payslip not found" });
    if (existing.status === "paid") {
      return res.status(400).json({ message: "Cannot delete a paid payslip — it has a posted ledger voucher. Reverse the voucher first if this was posted in error." });
    }
    const deleted = await storage.deletePayrollPayslip(id);
    if (!deleted) return res.status(404).json({ message: "Payslip not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "payroll_payslip",
      entityId: id, details: `Deleted payslip for payroll employee #${existing.payrollEmployeeId} — ${existing.payMonth}`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  app.post("/api/accounting/payroll-payslips/:id/submit", requireAuth, requirePermission("payroll_employees.process"), async (req, res) => {
    const id = parseInt(req.params.id);
    const payslip = await storage.getPayrollPayslip(id);
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });
    if (payslip.status !== "draft") return res.status(400).json({ message: "Only draft payslips can be submitted" });
    const updated = await storage.updatePayrollPayslip(id, { status: "submitted", submittedAt: new Date() });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "submit", entity: "payroll_payslip",
      entityId: id, details: `Submitted payslip ${id} for approval`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/payroll-payslips/:id/approve", requireAuth, requirePermission("payroll_employees.approve"), async (req, res) => {
    const id = parseInt(req.params.id);
    const payslip = await storage.getPayrollPayslip(id);
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });
    if (payslip.status !== "submitted") return res.status(400).json({ message: "Only submitted payslips can be approved" });
    const updated = await storage.updatePayrollPayslip(id, {
      status: "approved", approvedBy: req.user!.id, approvedAt: new Date(),
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "approve", entity: "payroll_payslip",
      entityId: id, details: `Approved payslip ${id}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/payroll-payslips/:id/reject", requireAuth, requirePermission("payroll_employees.approve"), async (req, res) => {
    const id = parseInt(req.params.id);
    const payslip = await storage.getPayrollPayslip(id);
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });
    if (payslip.status !== "submitted") return res.status(400).json({ message: "Only submitted payslips can be rejected" });
    const reason = req.body?.reason || "";
    const updated = await storage.updatePayrollPayslip(id, {
      status: "rejected", approvedBy: req.user!.id, approvedAt: new Date(),
      rejectionReason: reason || null,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "reject", entity: "payroll_payslip",
      entityId: id, details: `Rejected payslip ${id}${reason ? ": " + reason : ""}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/payroll-payslips/:id/mark-paid", requireAuth, requirePermission("payroll_employees.approve"), async (req, res) => {
    const id = parseInt(req.params.id);
    const payslip = await storage.getPayrollPayslip(id);
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });
    if (payslip.status !== "approved") return res.status(400).json({ message: "Only approved payslips can be marked paid" });
    const employee = await storage.getPayrollEmployee(payslip.payrollEmployeeId);
    if (!employee) return res.status(400).json({ message: "Payroll employee not found" });
    const payDate = new Date().toISOString().split("T")[0];
    const fyError = await checkFinancialYearForDate(payDate);
    if (fyError) return res.status(400).json({ message: fyError });

    const ledgerAccounts = await storage.getLedgerAccounts();
    const salaryLedger = ledgerAccounts.find(a => a.name === "Salary & Wages");
    const ptLedger = ledgerAccounts.find(a => a.name === "Professional Tax");
    const bankLedger = ledgerAccounts.find(a => a.name === "Bank Account");
    const pfLedger = ledgerAccounts.find(a => a.name === "PF Payable");
    const esiLedger = ledgerAccounts.find(a => a.name === "ESI Payable");
    const tdsLedger = ledgerAccounts.find(a => a.name === "TDS Payable");
    if (!salaryLedger || !ptLedger || !bankLedger) {
      return res.status(500).json({ message: "Required ledger accounts are missing — contact an administrator" });
    }

    const gross = parseFloat(payslip.grossEarnings);
    const pt = parseFloat(payslip.professionalTax);
    const pfEmployee = parseFloat(payslip.pfEmployeeAmount || "0");
    const esiEmployee = parseFloat(payslip.esiEmployeeAmount || "0");
    const tds = parseFloat(payslip.tdsThisMonth || "0");
    const net = parseFloat(payslip.netPay);

    // voucherId is a placeholder — storage.createVoucher() overwrites it with the
    // newly-created voucher's real id for every entry before inserting.
    // Only the EMPLOYEE-side PF/ESI withheld is posted here (a real liability the
    // company owes) — employer contributions are stored on the payslip but not yet
    // posted to the ledger (see the payrollPayslips comment in shared/schema.ts).
    const entries = [
      { ledgerAccountId: salaryLedger.id, voucherId: 0, debit: String(gross), credit: "0" },
      { ledgerAccountId: bankLedger.id, voucherId: 0, debit: "0", credit: String(net) },
    ];
    if (pt > 0) {
      entries.push({ ledgerAccountId: ptLedger.id, voucherId: 0, debit: "0", credit: String(pt) });
    }
    if (pfEmployee > 0) {
      if (!pfLedger) return res.status(500).json({ message: "PF Payable ledger account is missing — contact an administrator" });
      entries.push({ ledgerAccountId: pfLedger.id, voucherId: 0, debit: "0", credit: String(pfEmployee) });
    }
    if (esiEmployee > 0) {
      if (!esiLedger) return res.status(500).json({ message: "ESI Payable ledger account is missing — contact an administrator" });
      entries.push({ ledgerAccountId: esiLedger.id, voucherId: 0, debit: "0", credit: String(esiEmployee) });
    }
    if (tds > 0) {
      if (!tdsLedger) return res.status(500).json({ message: "TDS Payable ledger account is missing — contact an administrator" });
      entries.push({ ledgerAccountId: tdsLedger.id, voucherId: 0, debit: "0", credit: String(tds) });
    }

    const voucherNumber = await storage.getNextVoucherNumber("payment");
    const voucher = await storage.createVoucher({
      voucherNumber,
      date: payDate,
      type: "payment",
      narration: `Payroll payslip — ${employee.employeeCode} (${employee.fullName}) — ${payslip.payMonth}`,
      totalAmount: String(gross),
      status: "approved",
      partyId: null,
      gstRate: null,
      taxableAmount: null,
      cgstAmount: null,
      sgstAmount: null,
      igstAmount: null,
      isInterState: false,
      createdBy: req.user!.id,
      approvedBy: req.user!.id,
    }, entries);

    const updated = await storage.updatePayrollPayslip(id, { status: "paid", voucherId: voucher.id });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "mark-paid", entity: "payroll_payslip",
      entityId: id, details: `Marked payslip ${id} paid — posted voucher ${voucherNumber}`,
      ipAddress: req.ip || null,
    });
    res.json({ ...updated, voucher });
  });

  // Payroll Employee self-service payslips — mirrors /my-payslips for tutors,
  // scoped to the payroll profile linked via payrollEmployees.loginEmployeeId.
  app.get("/api/accounting/my-payroll-payslips", requireAuth, requirePermission("payroll_employees.view_own"), async (req, res) => {
    const profile = await storage.getPayrollEmployeeByLoginEmployeeId(req.user!.id);
    if (!profile) return res.status(404).json({ message: "No payroll profile linked to this account" });
    const list = await storage.getPayrollPayslips({ payrollEmployeeId: profile.id });
    // Only finalized states — draft/submitted/rejected are internal admin workflow
    // states with no self-service UI to render them (same convention as tutors).
    res.json(list.filter(p => p.status === "approved" || p.status === "paid"));
  });

  app.get("/api/accounting/my-payroll-payslips/:id", requireAuth, requirePermission("payroll_employees.view_own"), async (req, res) => {
    const profile = await storage.getPayrollEmployeeByLoginEmployeeId(req.user!.id);
    if (!profile) return res.status(404).json({ message: "No payroll profile linked to this account" });
    const payslip = await storage.getPayrollPayslip(parseInt(req.params.id));
    if (!payslip || payslip.payrollEmployeeId !== profile.id || (payslip.status !== "approved" && payslip.status !== "paid")) {
      return res.status(404).json({ message: "Payslip not found" });
    }
    res.json(payslip);
  });

  // Vouchers
  app.get("/api/accounting/vouchers", requireAuth, requirePermission("vouchers.view"), async (req, res) => {
    const filters: any = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;
    if (!req.user!.permissions?.includes("vouchers.edit")) filters.createdBy = req.user!.id;

    const voucherList = await storage.getVouchers(filters);
    res.json(voucherList);
  });

  app.get("/api/accounting/vouchers/next-number/:type", requireAuth, requirePermission("vouchers.create"), async (req, res) => {
    const number = await storage.getNextVoucherNumber(req.params.type);
    res.json({ voucherNumber: number });
  });

  app.get("/api/accounting/vouchers/:id", requireAuth, requirePermission("vouchers.view"), async (req, res) => {
    const voucher = await storage.getVoucher(parseInt(req.params.id));
    if (!voucher) return res.status(404).json({ message: "Voucher not found" });
    if (!req.user!.permissions?.includes("vouchers.edit") && voucher.createdBy !== req.user!.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    const entries = await storage.getVoucherEntries(voucher.id);
    res.json({ ...voucher, entries });
  });

  app.post("/api/accounting/vouchers", requireAuth, requirePermission("vouchers.create"), async (req, res) => {
    const { entries, ...voucherData } = req.body;

    if (!entries || !Array.isArray(entries) || entries.length < 2) {
      return res.status(400).json({ message: "At least 2 entries required for double-entry" });
    }
    if (!voucherData.date || !voucherData.type || !voucherData.voucherNumber) {
      return res.status(400).json({ message: "Date, type, and voucher number are required" });
    }
    const fyError = await checkFinancialYearForDate(voucherData.date);
    if (fyError) return res.status(400).json({ message: fyError });

    const isPastYear = await isPastFinancialYearDate(voucherData.date);
    if (isPastYear && !ROLES_ALLOWED_PAST_FY_ENTRY.includes(req.user!.role)) {
      return res.status(403).json({ message: "Only Senior Accountant, Admin, or Super Admin can post into a past financial year. Switch to the active year, or ask one of them to enter this." });
    }

    const totalDebit = entries.reduce((sum: number, e: any) => sum + parseFloat(e.debit || 0), 0);
    const totalCredit = entries.reduce((sum: number, e: any) => sum + parseFloat(e.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ message: "Total debits must equal total credits" });
    }

    let status = voucherData.status || "pending";
    if (!req.user!.permissions?.includes("vouchers.approve")) status = "draft";
    // A past-year voucher can never come in pre-approved, even from someone who
    // holds vouchers.approve (e.g. Senior Accountant) — approving it into a closed
    // year specifically requires Admin/Super Admin, enforced on the status route.
    if (isPastYear && status === "approved") status = "pending";

    const voucher = await storage.createVoucher(
      { ...voucherData, status, totalAmount: String(totalDebit), createdBy: req.user!.id },
      entries
    );
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "voucher",
      entityId: voucher.id, details: `Created ${voucherData.type} voucher: ${voucher.voucherNumber}`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(voucher);
  });

  app.patch("/api/accounting/vouchers/:id/status", requireAuth, requirePermission("vouchers.approve"), async (req, res) => {
    const { status } = req.body;
    if (status === "approved") {
      const voucher = await storage.getVoucher(parseInt(req.params.id));
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      const isPastYear = await isPastFinancialYearDate(voucher.date);
      if (isPastYear && !ROLES_ALLOWED_PAST_FY_APPROVAL.includes(req.user!.role)) {
        return res.status(403).json({ message: "Entries dated in a past financial year require Admin or Super Admin approval." });
      }
    }
    const approvedBy = status === "approved" ? req.user!.id : undefined;
    const updated = await storage.updateVoucherStatus(parseInt(req.params.id), status, approvedBy);
    if (!updated) return res.status(404).json({ message: "Voucher not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "approve", entity: "voucher",
      entityId: updated.id, details: `Changed voucher ${updated.voucherNumber} status to ${status}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/vouchers/:id", requireAuth, requirePermission("vouchers.approve"), async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteVoucher(id);
    if (!deleted) return res.status(404).json({ message: "Voucher not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "voucher",
      entityId: id, details: `Deleted voucher`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  // Reports
  app.get("/api/accounting/reports/trial-balance", requireAuth, requirePermission("reports.view"), async (req, res) => {
    const data = await storage.getTrialBalance(req.query.asOnDate as string);
    res.json(data);
  });

  app.get("/api/accounting/reports/profit-loss", requireAuth, requirePermission("reports.view"), async (req, res) => {
    const data = await storage.getProfitAndLoss(req.query.startDate as string, req.query.endDate as string);
    res.json(data);
  });

  app.get("/api/accounting/reports/balance-sheet", requireAuth, requirePermission("reports.view"), async (req, res) => {
    const data = await storage.getBalanceSheet(req.query.asOfDate as string | undefined);
    res.json(data);
  });

  app.get("/api/accounting/reports/day-book", requireAuth, requirePermission("reports.view"), async (req, res) => {
    const data = await storage.getDayBook(req.query.startDate as string, req.query.endDate as string, req.query.type as string);
    res.json(data);
  });

  app.get("/api/accounting/reports/gst-summary", requireAuth, requirePermission("reports.view"), async (req, res) => {
    const data = await storage.getGstSummary(req.query.startDate as string, req.query.endDate as string);
    res.json(data);
  });

  // Financial Years
  app.get("/api/accounting/financial-years", requireAuth, requirePermission("dashboard.view"), async (req, res) => {
    const years = await storage.getFinancialYears();
    res.json(years);
  });

  app.post("/api/accounting/financial-years", requireAuth, requirePermission("financial_years.manage"), async (req, res) => {
    const fy = await storage.createFinancialYear(req.body);
    res.status(201).json(fy);
  });

  app.patch("/api/accounting/financial-years/:id", requireAuth, requirePermission("financial_years.manage"), async (req, res) => {
    const updated = await storage.updateFinancialYear(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Financial year not found" });
    res.json(updated);
  });

  app.post("/api/accounting/financial-years/:id/activate", requireAuth, requirePermission("financial_years.manage"), async (req, res) => {
    const updated = await storage.activateFinancialYear(parseInt(req.params.id));
    if (!updated) return res.status(404).json({ message: "Financial year not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "activate", entity: "financial_year",
      entityId: updated.id, details: `Activated financial year: ${updated.name}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  // Leave Management
  app.get("/api/accounting/leave-types", requireAuth, requirePermission("leave.view_own"), async (req, res) => {
    // Admins configuring leave (leave.manage) can see inactive types too; everyone
    // else (applying for their own leave) only needs the active ones.
    const includeInactive = req.query.all === "true" && (req.user!.permissions || []).includes("leave.manage");
    const types = await storage.getLeaveTypes(!includeInactive);
    res.json(types);
  });

  app.post("/api/accounting/leave-types", requireAuth, requirePermission("leave.manage"), async (req, res) => {
    if (await storage.getLeaveTypeByCode(req.body.code)) {
      return res.status(400).json({ message: `Leave type code "${req.body.code}" is already in use` });
    }
    const type = await storage.createLeaveType(req.body);
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "leave_type",
      entityId: type.id, details: `Created leave type: ${type.name} (${type.code})`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(type);
  });

  app.patch("/api/accounting/leave-types/:id", requireAuth, requirePermission("leave.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateLeaveType(id, req.body);
    if (!updated) return res.status(404).json({ message: "Leave type not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "leave_type",
      entityId: id, details: `Updated leave type: ${updated.name}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.get("/api/accounting/leave-balances/mine", requireAuth, requirePermission("leave.view_own"), async (req, res) => {
    const activeFy = await storage.getActiveFinancialYear();
    if (!activeFy) return res.json([]);
    const [balances, types] = await Promise.all([
      storage.getLeaveBalances({ employeeId: req.user!.id, financialYearId: activeFy.id }),
      storage.getLeaveTypes(true),
    ]);
    const typeById = new Map(types.map(t => [t.id, t]));
    res.json(balances.map(b => {
      const type = typeById.get(b.leaveTypeId);
      const opening = parseFloat(b.openingBalance);
      const accrued = parseFloat(b.accruedYtd);
      const adjustment = parseFloat(b.adjustmentYtd);
      const used = parseFloat(b.usedYtd);
      return {
        ...b,
        leaveTypeCode: type?.code, leaveTypeName: type?.name, isPaid: type?.isPaid,
        // Unpaid (LOP) has no ceiling concept — everything else, including Comp-off
        // (annualEntitlementDays is null there too, since it's earned per instance
        // rather than granted annually, but its balance IS tracked via adjustments).
        availableBalance: type?.isPaid === false ? null : computeAvailableBalance({ openingBalance: opening, accruedYtd: accrued, adjustmentYtd: adjustment, usedYtd: used }),
      };
    }));
  });

  app.get("/api/accounting/leave-balances", requireAuth, requirePermission("leave.view"), async (req, res) => {
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const financialYearId = req.query.financialYearId ? parseInt(req.query.financialYearId as string) : undefined;
    const balances = await storage.getLeaveBalances({ employeeId, financialYearId });
    res.json(balances);
  });

  // Ensures every active, non-tutor employee has a leave_balances row for every
  // active leave type in the active financial year — safe to re-run (skips rows
  // that already exist). Annual-frequency types are granted in full immediately;
  // monthly-frequency types start at 0 and build up via run-monthly-accrual.
  app.post("/api/accounting/leave-balances/initialize", requireAuth, requirePermission("leave.manage"), async (req, res) => {
    const activeFy = await storage.getActiveFinancialYear();
    if (!activeFy) return res.status(400).json({ message: "No active financial year is set" });
    const [allEmployees, types, previousFys] = await Promise.all([
      storage.getEmployees(),
      storage.getLeaveTypes(true),
      storage.getFinancialYears(),
    ]);
    const eligibleEmployees = allEmployees.filter(e => e.isActive && e.role !== "tutor");
    // Leave applies to salaried staff only — the immediately preceding FY (by end
    // date) is used to carry forward a closing balance, if one was tracked.
    const priorFy = previousFys
      .filter(f => f.id !== activeFy.id && f.endDate < activeFy.startDate)
      .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0];

    let created = 0;
    for (const employee of eligibleEmployees) {
      for (const type of types) {
        const existing = await storage.getLeaveBalance(employee.id, type.id, activeFy.id);
        if (existing) continue;

        let openingBalance = 0;
        if (priorFy) {
          const priorBalance = await storage.getLeaveBalance(employee.id, type.id, priorFy.id);
          if (priorBalance) {
            const priorClosing = computeAvailableBalance({
              openingBalance: parseFloat(priorBalance.openingBalance),
              accruedYtd: parseFloat(priorBalance.accruedYtd),
              adjustmentYtd: parseFloat(priorBalance.adjustmentYtd),
              usedYtd: parseFloat(priorBalance.usedYtd),
            });
            openingBalance = computeCarryForwardOpeningBalance({
              priorClosingBalance: priorClosing,
              carryForwardCap: type.carryForwardCap === null ? null : parseFloat(type.carryForwardCap),
            });
          }
        }

        const annualEntitlement = type.annualEntitlementDays === null ? 0 : parseFloat(type.annualEntitlementDays);
        const accruedYtd = type.accrualFrequency === "annual" ? annualEntitlement : 0;

        await storage.createLeaveBalance({
          employeeId: employee.id, leaveTypeId: type.id, financialYearId: activeFy.id,
          openingBalance: String(openingBalance), accruedYtd: String(accruedYtd), usedYtd: "0", adjustmentYtd: "0",
          lastAccrualPeriod: null,
        });
        created += 1;
      }
    }

    await storage.createAuditLog({
      employeeId: req.user!.id, action: "initialize", entity: "leave_balance",
      entityId: activeFy.id, details: `Initialized ${created} leave balance row(s) for ${activeFy.name}`,
      ipAddress: req.ip || null,
    });
    res.json({ financialYear: activeFy.name, created });
  });

  // Credits monthly-accrual leave types (e.g. Earned Leave) up through the
  // current calendar month. Idempotent — re-running mid-month credits nothing
  // more until the next month starts.
  app.post("/api/accounting/leave-balances/run-monthly-accrual", requireAuth, requirePermission("leave.manage"), async (req, res) => {
    const activeFy = await storage.getActiveFinancialYear();
    if (!activeFy) return res.status(400).json({ message: "No active financial year is set" });
    const types = await storage.getLeaveTypes(true);
    const monthlyTypeIds = new Set(types.filter(t => t.accrualFrequency === "monthly").map(t => t.id));
    if (monthlyTypeIds.size === 0) return res.json({ updated: 0 });

    const fyPeriods = getFinancialYearPeriods(activeFy.startDate, activeFy.endDate);
    const throughPeriod = new Date().toISOString().slice(0, 7);
    const typeById = new Map(types.map(t => [t.id, t]));
    const balances = await storage.getLeaveBalances({ financialYearId: activeFy.id });

    let updated = 0;
    for (const balance of balances) {
      if (!monthlyTypeIds.has(balance.leaveTypeId)) continue;
      const type = typeById.get(balance.leaveTypeId)!;
      const result = computeMonthlyAccrualCredit({
        annualEntitlementDays: parseFloat(type.annualEntitlementDays || "0"),
        fyPeriods, lastAccrualPeriod: balance.lastAccrualPeriod, throughPeriod,
      });
      if (result.periodsCredited === 0) continue;
      await storage.updateLeaveBalance(balance.id, {
        accruedYtd: String(round1(parseFloat(balance.accruedYtd) + result.creditAmount)),
        lastAccrualPeriod: result.newLastAccrualPeriod,
      });
      updated += 1;
    }
    res.json({ updated });
  });

  app.patch("/api/accounting/leave-balances/:id/adjust", requireAuth, requirePermission("leave.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const amount = parseFloat(req.body.amount);
    const reason = (req.body.reason || "").trim();
    if (!Number.isFinite(amount) || amount === 0) return res.status(400).json({ message: "A non-zero adjustment amount is required" });
    if (!reason) return res.status(400).json({ message: "A reason is required for a manual balance adjustment" });
    const existing = await storage.getLeaveBalanceById(id);
    if (!existing) return res.status(404).json({ message: "Leave balance not found" });
    const updated = await storage.updateLeaveBalance(id, {
      adjustmentYtd: String(round1(parseFloat(existing.adjustmentYtd) + amount)),
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "adjust", entity: "leave_balance",
      entityId: id, details: `Adjusted leave balance by ${amount} day(s): ${reason}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  // Computes the calendar-day count for a leave request. Deliberately simple —
  // no working-day/holiday-calendar exclusion, since no holiday calendar module
  // exists in this app yet. Half-day portions only apply meaningfully on a
  // single-day request; on a multi-day request each end trims 0.5 day.
  function computeLeaveDays(startDate: string, endDate: string, startDayPortion: string, endDayPortion: string): number {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
    const calendarDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (calendarDays <= 0) return 0;
    if (calendarDays === 1) {
      return startDayPortion !== "full" || endDayPortion !== "full" ? 0.5 : 1;
    }
    let days = calendarDays;
    if (startDayPortion !== "full") days -= 0.5;
    if (endDayPortion !== "full") days -= 0.5;
    return days;
  }

  function canActOnLeaveRequest(req: any, request: { approverId: number | null }): boolean {
    const perms: string[] = req.user!.permissions || [];
    return perms.includes("leave.approve") || request.approverId === req.user!.id;
  }

  app.get("/api/accounting/leave-requests/mine", requireAuth, requirePermission("leave.view_own"), async (req, res) => {
    const requests = await storage.getLeaveRequests({ employeeId: req.user!.id });
    res.json(requests);
  });

  // "My team's" pending approvals — scoped to requests routed to this user via
  // employees.reportsTo, no leave.approve permission needed to see your own
  // direct reports' requests. A leave.approve holder (HR/admin override, in
  // practice Super Admin/Admin) additionally sees every "pending" request
  // (covers ones with no manager set) AND every "pending_admin_approval"
  // request — a plain manager's own view never includes the latter, since a
  // >5-day request has already passed their stage.
  // Enriches each request with the applicant's name/leave-type name so the
  // client doesn't need employees.view (which not every manager-capable role
  // has) just to render this page.
  app.get("/api/accounting/leave-requests/for-approval", requireAuth, async (req, res) => {
    const perms: string[] = req.user!.permissions || [];
    const isOverride = perms.includes("leave.approve");
    const requests = isOverride
      ? [...await storage.getLeaveRequests({ status: "pending" }), ...await storage.getLeaveRequests({ status: "pending_admin_approval" })]
      : await storage.getLeaveRequests({ approverId: req.user!.id, status: "pending" });
    const [employees, types] = await Promise.all([storage.getEmployees(), storage.getLeaveTypes()]);
    const employeeById = new Map(employees.map(e => [e.id, e]));
    const typeById = new Map(types.map(t => [t.id, t]));
    res.json(requests.map(r => ({
      ...r,
      employeeName: employeeById.get(r.employeeId)?.fullName || `Employee #${r.employeeId}`,
      leaveTypeName: typeById.get(r.leaveTypeId)?.name || String(r.leaveTypeId),
    })));
  });

  app.get("/api/accounting/leave-requests", requireAuth, requirePermission("leave.view"), async (req, res) => {
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const status = req.query.status as string | undefined;
    const requests = await storage.getLeaveRequests({ employeeId, status });
    res.json(requests);
  });

  app.post("/api/accounting/leave-requests", requireAuth, requirePermission("leave.apply"), async (req, res) => {
    const { leaveTypeId, startDate, endDate, reason } = req.body;
    const startDayPortion = req.body.startDayPortion || "full";
    const endDayPortion = req.body.endDayPortion || "full";
    if (!leaveTypeId || !startDate || !endDate) {
      return res.status(400).json({ message: "leaveTypeId, startDate and endDate are required" });
    }
    if (endDate < startDate) {
      return res.status(400).json({ message: "End date cannot be before start date" });
    }
    const leaveType = await storage.getLeaveType(parseInt(leaveTypeId));
    if (!leaveType || !leaveType.isActive) {
      return res.status(400).json({ message: "Selected leave type is not available" });
    }
    const numberOfDays = computeLeaveDays(startDate, endDate, startDayPortion, endDayPortion);
    if (numberOfDays <= 0) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const overlapping = await storage.getOverlappingLeaveRequests(req.user!.id, startDate, endDate);
    if (overlapping.length > 0) {
      return res.status(400).json({ message: "You already have a pending or approved leave request overlapping these dates" });
    }

    // Paid leave types are balance-checked against the active FY's tracked
    // balance (opening + accrued + manual adjustments - already used). Unpaid
    // (LOP) skips this — it's always available since it isn't a granted benefit.
    if (leaveType.isPaid) {
      const activeFy = await storage.getActiveFinancialYear();
      const balance = activeFy ? await storage.getLeaveBalance(req.user!.id, leaveType.id, activeFy.id) : undefined;
      const available = balance
        ? computeAvailableBalance({
            openingBalance: parseFloat(balance.openingBalance), accruedYtd: parseFloat(balance.accruedYtd),
            adjustmentYtd: parseFloat(balance.adjustmentYtd), usedYtd: parseFloat(balance.usedYtd),
          })
        : 0;
      if (numberOfDays > available) {
        return res.status(400).json({ message: `Insufficient ${leaveType.name} balance: ${available} day(s) available, ${numberOfDays} requested` });
      }
    }

    const applicant = await storage.getEmployeeById(req.user!.id);
    const request = await storage.createLeaveRequest({
      employeeId: req.user!.id, leaveTypeId: leaveType.id, startDate, endDate,
      startDayPortion, endDayPortion, numberOfDays: String(numberOfDays), reason: reason || null,
      approverId: applicant?.reportsTo ?? null,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "leave_request",
      entityId: request.id, details: `Applied for ${leaveType.name}: ${startDate} to ${endDate} (${numberOfDays} day(s))`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(request);
  });

  // Applies the FINAL approval outcome — decrements the paid-leave balance
  // (if applicable) and stamps decidedBy/decidedAt. Shared by both the
  // one-step (<=5 days) and second-stage (>5 days, admin sign-off) paths so
  // the balance-decrement logic only exists once.
  async function finalizeLeaveApproval(request: LeaveRequest, decidedBy: number) {
    const updated = await storage.updateLeaveRequest(request.id, { status: "approved", decidedBy, decidedAt: new Date() });
    const leaveType = await storage.getLeaveType(request.leaveTypeId);
    if (leaveType?.isPaid) {
      const activeFy = await storage.getActiveFinancialYear();
      const balance = activeFy ? await storage.getLeaveBalance(request.employeeId, request.leaveTypeId, activeFy.id) : undefined;
      if (balance) {
        await storage.updateLeaveBalance(balance.id, { usedYtd: String(round1(parseFloat(balance.usedYtd) + parseFloat(request.numberOfDays))) });
      }
    }
    return updated;
  }

  app.post("/api/accounting/leave-requests/:id/approve", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const request = await storage.getLeaveRequest(id);
    if (!request) return res.status(404).json({ message: "Leave request not found" });

    if (request.status === "pending") {
      if (!canActOnLeaveRequest(req, request)) return res.status(403).json({ message: "You are not authorized to approve this request" });
      const isLong = parseFloat(request.numberOfDays) > LONG_LEAVE_THRESHOLD_DAYS;
      if (isLong) {
        const updated = await storage.updateLeaveRequest(id, {
          status: "pending_admin_approval", managerApprovedBy: req.user!.id, managerApprovedAt: new Date(),
        });
        await storage.createAuditLog({
          employeeId: req.user!.id, action: "manager_approve", entity: "leave_request",
          entityId: id, details: `Manager-approved a ${request.numberOfDays}-day request for employee #${request.employeeId} — over ${LONG_LEAVE_THRESHOLD_DAYS} days, awaiting Admin/Super Admin sign-off`,
          ipAddress: req.ip || null,
        });
        return res.json(updated);
      }
      const updated = await finalizeLeaveApproval(request, req.user!.id);
      await storage.createAuditLog({
        employeeId: req.user!.id, action: "approve", entity: "leave_request",
        entityId: id, details: `Approved leave request for employee #${request.employeeId}`,
        ipAddress: req.ip || null,
      });
      return res.json(updated);
    }

    if (request.status === "pending_admin_approval") {
      const perms: string[] = req.user!.permissions || [];
      if (!perms.includes("leave.approve")) {
        return res.status(403).json({ message: `This request is over ${LONG_LEAVE_THRESHOLD_DAYS} days and needs Super Admin/Admin approval` });
      }
      const updated = await finalizeLeaveApproval(request, req.user!.id);
      await storage.createAuditLog({
        employeeId: req.user!.id, action: "approve", entity: "leave_request",
        entityId: id, details: `Final Admin/Super Admin approval for employee #${request.employeeId}'s ${request.numberOfDays}-day request`,
        ipAddress: req.ip || null,
      });
      return res.json(updated);
    }

    return res.status(400).json({ message: "Only pending requests can be approved" });
  });

  app.post("/api/accounting/leave-requests/:id/reject", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const request = await storage.getLeaveRequest(id);
    if (!request) return res.status(404).json({ message: "Leave request not found" });
    if (request.status !== "pending" && request.status !== "pending_admin_approval") {
      return res.status(400).json({ message: "Only pending requests can be rejected" });
    }
    if (request.status === "pending_admin_approval") {
      const perms: string[] = req.user!.permissions || [];
      if (!perms.includes("leave.approve")) {
        return res.status(403).json({ message: `This request is over ${LONG_LEAVE_THRESHOLD_DAYS} days and needs Super Admin/Admin to reject it` });
      }
    } else if (!canActOnLeaveRequest(req, request)) {
      return res.status(403).json({ message: "You are not authorized to reject this request" });
    }
    const rejectionReason = (req.body.rejectionReason || "").trim();
    if (!rejectionReason) return res.status(400).json({ message: "A reason is required to reject a leave request" });

    const updated = await storage.updateLeaveRequest(id, {
      status: "rejected", decidedBy: req.user!.id, decidedAt: new Date(), rejectionReason,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "reject", entity: "leave_request",
      entityId: id, details: `Rejected leave request for employee #${request.employeeId}: ${rejectionReason}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/leave-requests/:id/cancel", requireAuth, requirePermission("leave.apply"), async (req, res) => {
    const id = parseInt(req.params.id);
    const request = await storage.getLeaveRequest(id);
    if (!request) return res.status(404).json({ message: "Leave request not found" });
    if (request.employeeId !== req.user!.id) return res.status(403).json({ message: "You can only cancel your own leave requests" });
    if (request.status !== "pending" && request.status !== "pending_admin_approval") {
      return res.status(400).json({ message: "Only pending requests can be cancelled" });
    }
    const updated = await storage.updateLeaveRequest(id, { status: "cancelled" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "cancel", entity: "leave_request",
      entityId: id, details: `Cancelled own leave request`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  // Attendance Roster (hybrid WFO/WFH + swaps) — DRAFT default template below
  // is a literal reading of "4 WFO, 3 WFH" (Mon-Thu office, Fri-Sat-Sun home,
  // no day off) since which specific weekdays and whether every role follows
  // the same split was not confirmed. Fully per-employee editable — this only
  // seeds a starting point for employees with no roster configured yet.
  const DEFAULT_ROSTER_TEMPLATE: Record<number, string> = { 0: "wfh", 1: "wfo", 2: "wfo", 3: "wfo", 4: "wfo", 5: "wfh", 6: "wfh" };

  async function resolveWeekEffectiveTypes(employeeId: number, startDate: string) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
    const roster = await storage.getAttendanceRoster(employeeId);
    const rosterByWeekday = new Map(roster.map(r => [r.weekday, r.dayType]));
    const acceptedSwaps = await storage.getAttendanceSwapRequests({ employeeId, status: "accepted" });
    const swapByDate = new Map(acceptedSwaps.map(s => [s.date, s]));

    const results = [];
    for (const date of dates) {
      const weekday = getWeekday(date);
      const ownRosterType = (rosterByWeekday.get(weekday) as any) || null;
      const swap = swapByDate.get(date);
      let acceptedSwap = null;
      if (swap) {
        const otherId = swap.requesterId === employeeId ? swap.partnerId : swap.requesterId;
        const otherRoster = await storage.getAttendanceRoster(otherId);
        const otherByWeekday = new Map(otherRoster.map(r => [r.weekday, r.dayType]));
        acceptedSwap = {
          requesterId: swap.requesterId, partnerId: swap.partnerId,
          requesterRosterType: (swap.requesterId === employeeId ? ownRosterType : otherByWeekday.get(weekday)) as any,
          partnerRosterType: (swap.partnerId === employeeId ? ownRosterType : otherByWeekday.get(weekday)) as any,
        };
      }
      const effectiveType = resolveEffectiveDayType({ employeeId, ownRosterType, acceptedSwap });
      results.push({ date, weekday, rosterType: ownRosterType, effectiveType, swapId: swap?.id || null });
    }
    return results;
  }

  // Lightweight colleague picker for the swap-request form — deliberately its
  // own route rather than reusing /employees/directory, since that one is
  // gated on employees.view and most roles that hold attendance.request_swap
  // (accountant, data_entry, sales roles, etc.) don't have that permission.
  app.get("/api/accounting/attendance/colleagues", requireAuth, requirePermission("attendance.request_swap"), async (req, res) => {
    const employees = await storage.getEmployees();
    res.json(employees.filter(e => e.isActive && e.role !== "tutor" && e.id !== req.user!.id).map(e => ({ id: e.id, fullName: e.fullName })));
  });

  app.get("/api/accounting/attendance/week/mine", requireAuth, requirePermission("attendance.view_own"), async (req, res) => {
    const startDate = (req.query.startDate as string) || new Date().toISOString().slice(0, 10);
    const week = await resolveWeekEffectiveTypes(req.user!.id, startDate);
    res.json(week);
  });

  app.get("/api/accounting/attendance/roster", requireAuth, requirePermission("attendance.manage"), async (req, res) => {
    const employees = (await storage.getEmployees()).filter(e => e.isActive && e.role !== "tutor");
    const roster = await storage.getAttendanceRosterForEmployees(employees.map(e => e.id));
    const byEmployee = new Map<number, Record<number, string>>();
    for (const row of roster) {
      if (!byEmployee.has(row.employeeId)) byEmployee.set(row.employeeId, {});
      byEmployee.get(row.employeeId)![row.weekday] = row.dayType;
    }
    res.json(employees.map(e => ({ employeeId: e.id, employeeName: e.fullName, weekdayTypes: byEmployee.get(e.id) || null })));
  });

  app.put("/api/accounting/attendance/roster/:employeeId", requireAuth, requirePermission("attendance.manage"), async (req, res) => {
    const employeeId = parseInt(req.params.employeeId);
    const assignments = req.body.assignments as Array<{ weekday: number; dayType: string }>;
    if (!Array.isArray(assignments)) return res.status(400).json({ message: "assignments array is required" });
    for (const a of assignments) {
      if (![0, 1, 2, 3, 4, 5, 6].includes(a.weekday) || !["wfo", "wfh", "off"].includes(a.dayType)) {
        return res.status(400).json({ message: `Invalid assignment: weekday ${a.weekday}, dayType ${a.dayType}` });
      }
    }
    for (const a of assignments) {
      await storage.upsertAttendanceRosterAssignment(employeeId, a.weekday, a.dayType, req.user!.id);
    }
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "attendance_roster",
      entityId: employeeId, details: `Updated attendance roster for employee #${employeeId}`,
      ipAddress: req.ip || null,
    });
    res.json(await storage.getAttendanceRoster(employeeId));
  });

  app.post("/api/accounting/attendance/roster/apply-default-template", requireAuth, requirePermission("attendance.manage"), async (req, res) => {
    const employees = (await storage.getEmployees()).filter(e => e.isActive && e.role !== "tutor");
    let applied = 0;
    for (const employee of employees) {
      const existing = await storage.getAttendanceRoster(employee.id);
      if (existing.length > 0) continue;
      for (const [weekday, dayType] of Object.entries(DEFAULT_ROSTER_TEMPLATE)) {
        await storage.upsertAttendanceRosterAssignment(employee.id, parseInt(weekday), dayType, req.user!.id);
      }
      applied += 1;
    }
    res.json({ applied });
  });

  app.post("/api/accounting/attendance/swaps", requireAuth, requirePermission("attendance.request_swap"), async (req, res) => {
    const { date, partnerId, reason } = req.body;
    if (!date || !partnerId) return res.status(400).json({ message: "date and partnerId are required" });
    if (parseInt(partnerId) === req.user!.id) return res.status(400).json({ message: "You cannot swap with yourself" });
    const partner = await storage.getEmployeeById(parseInt(partnerId));
    if (!partner || !partner.isActive || partner.role === "tutor") {
      return res.status(400).json({ message: "Selected colleague is not eligible for an attendance swap" });
    }

    const weekday = getWeekday(date);
    const [requesterRoster, partnerRoster] = await Promise.all([
      storage.getAttendanceRoster(req.user!.id),
      storage.getAttendanceRoster(partner.id),
    ]);
    const requesterRosterType = (requesterRoster.find(r => r.weekday === weekday)?.dayType as any) || null;
    const partnerRosterType = (partnerRoster.find(r => r.weekday === weekday)?.dayType as any) || null;
    const validationError = validateSwapRequest({ requesterRosterType, partnerRosterType });
    if (validationError) return res.status(400).json({ message: validationError });

    const [requesterOverlap, partnerOverlap] = await Promise.all([
      storage.getOverlappingAttendanceSwaps(req.user!.id, date),
      storage.getOverlappingAttendanceSwaps(partner.id, date),
    ]);
    if (requesterOverlap.length > 0 || partnerOverlap.length > 0) {
      return res.status(400).json({ message: "One of you already has a pending or accepted swap on this date" });
    }

    const swap = await storage.createAttendanceSwapRequest({
      date, requesterId: req.user!.id, partnerId: partner.id, reason: reason || null,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "attendance_swap",
      entityId: swap.id, details: `Requested attendance swap with employee #${partner.id} on ${date}`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(swap);
  });

  app.get("/api/accounting/attendance/swaps/mine", requireAuth, requirePermission("attendance.view_own"), async (req, res) => {
    const swaps = await storage.getAttendanceSwapRequests({ employeeId: req.user!.id });
    const employees = await storage.getEmployees();
    const employeeById = new Map(employees.map(e => [e.id, e]));
    res.json(swaps.map(s => ({
      ...s,
      requesterName: employeeById.get(s.requesterId)?.fullName || `Employee #${s.requesterId}`,
      partnerName: employeeById.get(s.partnerId)?.fullName || `Employee #${s.partnerId}`,
    })));
  });

  function canActOnAttendanceSwap(req: any, swap: { partnerId: number }): boolean {
    const perms: string[] = req.user!.permissions || [];
    return perms.includes("attendance.manage") || swap.partnerId === req.user!.id;
  }

  app.post("/api/accounting/attendance/swaps/:id/accept", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const swap = await storage.getAttendanceSwapRequest(id);
    if (!swap) return res.status(404).json({ message: "Swap request not found" });
    if (!canActOnAttendanceSwap(req, swap)) return res.status(403).json({ message: "You are not authorized to accept this swap" });
    if (swap.status !== "pending") return res.status(400).json({ message: "Only pending swaps can be accepted" });
    const updated = await storage.updateAttendanceSwapRequest(id, { status: "accepted", decidedBy: req.user!.id, decidedAt: new Date() });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "accept", entity: "attendance_swap",
      entityId: id, details: `Accepted attendance swap for ${swap.date}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/attendance/swaps/:id/reject", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const swap = await storage.getAttendanceSwapRequest(id);
    if (!swap) return res.status(404).json({ message: "Swap request not found" });
    if (!canActOnAttendanceSwap(req, swap)) return res.status(403).json({ message: "You are not authorized to reject this swap" });
    if (swap.status !== "pending") return res.status(400).json({ message: "Only pending swaps can be rejected" });
    const updated = await storage.updateAttendanceSwapRequest(id, { status: "rejected", decidedBy: req.user!.id, decidedAt: new Date() });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "reject", entity: "attendance_swap",
      entityId: id, details: `Rejected attendance swap for ${swap.date}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/attendance/swaps/:id/cancel", requireAuth, requirePermission("attendance.request_swap"), async (req, res) => {
    const id = parseInt(req.params.id);
    const swap = await storage.getAttendanceSwapRequest(id);
    if (!swap) return res.status(404).json({ message: "Swap request not found" });
    if (swap.requesterId !== req.user!.id) return res.status(403).json({ message: "You can only cancel your own swap requests" });
    if (swap.status !== "pending") return res.status(400).json({ message: "Only pending swaps can be cancelled" });
    const updated = await storage.updateAttendanceSwapRequest(id, { status: "cancelled" });
    res.json(updated);
  });

  app.get("/api/accounting/attendance/reports/swaps", requireAuth, requirePermission("attendance.view"), async (req, res) => {
    const status = req.query.status as string | undefined;
    const swaps = await storage.getAttendanceSwapRequests({ status });
    const employees = await storage.getEmployees();
    const employeeById = new Map(employees.map(e => [e.id, e]));
    const enriched = swaps.map(s => ({
      ...s,
      requesterName: employeeById.get(s.requesterId)?.fullName || `Employee #${s.requesterId}`,
      partnerName: employeeById.get(s.partnerId)?.fullName || `Employee #${s.partnerId}`,
    }));
    const countsByEmployee = new Map<string, number>();
    for (const s of enriched) {
      if (s.status !== "accepted") continue;
      countsByEmployee.set(s.requesterName, (countsByEmployee.get(s.requesterName) || 0) + 1);
      countsByEmployee.set(s.partnerName, (countsByEmployee.get(s.partnerName) || 0) + 1);
    }
    res.json({ swaps: enriched, swapCountsByEmployee: Object.fromEntries(countsByEmployee) });
  });

  // Company Settings
  app.get("/api/accounting/company-settings", requireAuth, async (req, res) => {
    const settings = await storage.getCompanySettings();
    res.json(settings || {});
  });

  app.put("/api/accounting/company-settings", requireAuth, requirePermission("settings.manage"), async (req, res) => {
    const data = { ...req.body };
    if (req.user!.role !== "super_admin") {
      delete data.aboutStory;
      delete data.aboutVision;
      delete data.aboutMission;
      delete data.foundedYear;
      delete data.aboutLocation;
    }
    const settings = await storage.upsertCompanySettings(data);
    res.json(settings);
  });

  app.get("/api/accounting/legal-pages", requireAuth, requireRole("super_admin"), async (_req, res) => {
    const pages = await storage.getLegalPages();
    res.json(pages);
  });

  app.patch("/api/accounting/legal-pages/:slug", requireAuth, requireRole("super_admin"), async (req, res) => {
    const { title, content, effectiveDate } = req.body;
    if (title === undefined && content === undefined && effectiveDate === undefined) return res.status(400).json({ message: "No fields to update" });
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (effectiveDate !== undefined) updates.effectiveDate = effectiveDate || null;
    updates.updatedBy = req.user!.id;
    const page = await storage.updateLegalPage(req.params.slug, updates);
    if (!page) return res.status(404).json({ message: "Legal page not found" });
    res.json(page);
  });

  app.get("/api/accounting/email-templates", requireAuth, requireRole("super_admin"), async (_req, res) => {
    const templates = await storage.getEmailTemplates();
    res.json(templates);
  });

  app.patch("/api/accounting/email-templates/:key", requireAuth, requireRole("super_admin"), async (req, res) => {
    const { subject, bodyText } = req.body;
    if (subject === undefined && bodyText === undefined) return res.status(400).json({ message: "No fields to update" });
    const updates: any = {};
    if (subject !== undefined) updates.subject = subject;
    if (bodyText !== undefined) updates.bodyText = bodyText;
    updates.updatedBy = req.user!.id;
    const template = await storage.updateEmailTemplate(req.params.key, updates);
    if (!template) return res.status(404).json({ message: "Email template not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "email_template",
      details: `Updated email template: ${req.params.key}`,
      ipAddress: req.ip || null,
    });
    res.json(template);
  });

  // Audit Logs
  app.get("/api/accounting/audit-logs", requireAuth, requirePermission("audit.view"), async (req, res) => {
    const filters: any = {};
    if (req.query.employeeId) filters.employeeId = parseInt(req.query.employeeId as string);
    if (req.query.action) filters.action = req.query.action;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;
    const logs = await storage.getAuditLogs(filters);
    res.json(logs);
  });

  // Audit Notes
  app.get("/api/accounting/audit-notes", requireAuth, requirePermission("audit.view"), async (req, res) => {
    const notes = await storage.getAuditNotes(req.query.entity as string, req.query.entityId ? parseInt(req.query.entityId as string) : undefined);
    res.json(notes);
  });

  app.post("/api/accounting/audit-notes", requireAuth, requirePermission("audit.notes"), async (req, res) => {
    const note = await storage.createAuditNote({ ...req.body, auditorId: req.user!.id });
    res.status(201).json(note);
  });

  // ===== PUBLIC JOB LISTINGS =====
  app.get("/api/jobs", async (_req, res) => {
    const postings = await storage.getJobPostings({ status: "open" });
    const now = new Date().toISOString().split("T")[0];
    const activePostings = postings.filter(p => !p.closingDate || p.closingDate >= now);
    res.json(activePostings);
  });

  app.get("/api/jobs/:id", async (req, res) => {
    const posting = await storage.getJobPosting(parseInt(req.params.id));
    if (!posting || posting.status !== "open") return res.status(404).json({ message: "Job posting not found" });
    const now = new Date().toISOString().split("T")[0];
    if (posting.closingDate && posting.closingDate < now) return res.status(404).json({ message: "Job posting has expired" });
    res.json(posting);
  });

  app.post("/api/jobs/:id/apply", async (req, res) => {
    try {
      const postingId = parseInt(req.params.id);
      const posting = await storage.getJobPosting(postingId);
      if (!posting || posting.status !== "open") return res.status(404).json({ message: "Job posting not found or closed" });
      const now = new Date().toISOString().split("T")[0];
      if (posting.closingDate && posting.closingDate < now) return res.status(400).json({ message: "This job posting has expired" });
      const { applicantName, applicantEmail, applicantPhone, experience, message, linkedinUrl, portfolioUrl } = req.body;
      if (!applicantName || !applicantEmail) {
        return res.status(400).json({ message: "Name and email are required" });
      }
      const application = await storage.createJobApplication({
        jobPostingId: postingId,
        applicantName,
        applicantEmail,
        applicantPhone: applicantPhone || null,
        experience: experience || null,
        message: message || null,
        linkedinUrl: linkedinUrl || null,
        portfolioUrl: portfolioUrl || null,
        resumeUrl: null,
        status: "received",
        notes: null,
        reviewedBy: null,
        reviewedAt: null,
      });
      res.status(201).json({ message: "Application submitted successfully", id: application.id });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // ===== CONTACT INBOX (Accounting) =====
  app.get("/api/accounting/contact-messages", requireAuth, requirePermission("contacts.view"), async (_req, res) => {
    const messages = await storage.getContactMessages();
    res.json(messages);
  });

  app.get("/api/accounting/contact-messages/unread-count", requireAuth, requirePermission("contacts.view"), async (_req, res) => {
    const count = await storage.getUnreadContactCount();
    res.json({ count });
  });

  app.patch("/api/accounting/contact-messages/:id", requireAuth, requirePermission("contacts.manage"), async (req, res) => {
    const id = parseInt(req.params.id);
    const data: { isRead?: boolean } = {};
    if (req.body.isRead !== undefined) data.isRead = req.body.isRead;
    const updated = await storage.updateContactMessage(id, data);
    if (!updated) return res.status(404).json({ message: "Message not found" });
    res.json(updated);
  });

  app.delete("/api/accounting/contact-messages/:id", requireAuth, requirePermission("contacts.manage"), async (req, res) => {
    const deleted = await storage.deleteContactMessage(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Message not found" });
    res.json({ message: "Deleted" });
  });

  // ===== BLOG POSTS MANAGEMENT (Accounting) =====
  app.get("/api/accounting/posts", requireAuth, requirePermission("content.view"), async (_req, res) => {
    const allPosts = await storage.getPosts();
    res.json(allPosts);
  });

  app.post("/api/accounting/posts", requireAuth, requirePermission("content.create"), async (req, res) => {
    const { title, slug, content, summary, coverImage, author, status } = req.body;
    if (!title || !content || !summary) {
      return res.status(400).json({ message: "Title, content, and summary are required" });
    }
    const postSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const post = await storage.createPost({ title, slug: postSlug, content, summary, coverImage: coverImage || null, author: author || "Admin", status: status || "draft" });
    res.status(201).json(post);
  });

  app.patch("/api/accounting/posts/:id", requireAuth, requirePermission("content.edit"), async (req, res) => {
    const id = parseInt(req.params.id);
    const { title, slug, content, summary, coverImage, author, status } = req.body;
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (slug !== undefined) data.slug = slug;
    if (content !== undefined) data.content = content;
    if (summary !== undefined) data.summary = summary;
    if (coverImage !== undefined) data.coverImage = coverImage;
    if (author !== undefined) data.author = author;
    if (status !== undefined) data.status = status;
    const updated = await storage.updatePost(id, data);
    if (!updated) return res.status(404).json({ message: "Post not found" });
    res.json(updated);
  });

  app.delete("/api/accounting/posts/:id", requireAuth, requirePermission("content.delete"), async (req, res) => {
    const deleted = await storage.deletePost(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Deleted" });
  });

  // ===== CASE STUDIES MANAGEMENT (Accounting) =====
  app.get("/api/accounting/case-studies", requireAuth, requirePermission("content.view"), async (_req, res) => {
    const studies = await storage.getCaseStudies();
    res.json(studies);
  });

  app.post("/api/accounting/case-studies", requireAuth, requirePermission("content.create"), async (req, res) => {
    const { title, client, category, description, image, results } = req.body;
    if (!title || !client || !description || !image) {
      return res.status(400).json({ message: "Title, client, description, and image are required" });
    }
    const study = await storage.createCaseStudy({ title, client, category: category || "Web Development", description, image, results: results || [] });
    res.status(201).json(study);
  });

  app.patch("/api/accounting/case-studies/:id", requireAuth, requirePermission("content.edit"), async (req, res) => {
    const id = parseInt(req.params.id);
    const { title, client, category, description, image, results } = req.body;
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (client !== undefined) data.client = client;
    if (category !== undefined) data.category = category;
    if (description !== undefined) data.description = description;
    if (image !== undefined) data.image = image;
    if (results !== undefined) data.results = results;
    const updated = await storage.updateCaseStudy(id, data);
    if (!updated) return res.status(404).json({ message: "Case study not found" });
    res.json(updated);
  });

  app.delete("/api/accounting/case-studies/:id", requireAuth, requirePermission("content.delete"), async (req, res) => {
    const deleted = await storage.deleteCaseStudy(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Case study not found" });
    res.json({ message: "Deleted" });
  });

  // ===== FAQ MANAGEMENT (Accounting) =====
  app.get("/api/accounting/faqs", requireAuth, requirePermission("content.view"), async (_req, res) => {
    const items = await storage.getFaqItems(false);
    res.json(items);
  });

  app.post("/api/accounting/faqs", requireAuth, requirePermission("content.create"), async (req, res) => {
    const { question, answer, category, displayOrder, isActive } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ message: "Question and answer are required" });
    }
    const item = await storage.createFaqItem({ question, answer, category: category || "General Questions", displayOrder: displayOrder ?? 0, isActive: isActive ?? true });
    res.status(201).json(item);
  });

  app.patch("/api/accounting/faqs/:id", requireAuth, requirePermission("content.edit"), async (req, res) => {
    const id = parseInt(req.params.id);
    const { question, answer, category, displayOrder, isActive } = req.body;
    const data: Record<string, unknown> = {};
    if (question !== undefined) data.question = question;
    if (answer !== undefined) data.answer = answer;
    if (category !== undefined) data.category = category;
    if (displayOrder !== undefined) data.displayOrder = displayOrder;
    if (isActive !== undefined) data.isActive = isActive;
    const updated = await storage.updateFaqItem(id, data);
    if (!updated) return res.status(404).json({ message: "FAQ item not found" });
    res.json(updated);
  });

  app.delete("/api/accounting/faqs/:id", requireAuth, requirePermission("content.delete"), async (req, res) => {
    const deleted = await storage.deleteFaqItem(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ message: "FAQ item not found" });
    res.json({ message: "Deleted" });
  });

  // ===== TESTIMONIALS MANAGEMENT (Accounting) =====
  app.get("/api/accounting/testimonials", requireAuth, requirePermission("content.view"), async (_req, res) => {
    const items = await storage.getTestimonials(false);
    res.json(items);
  });

  app.post("/api/accounting/testimonials", requireAuth, requirePermission("content.create"), async (req, res) => {
    const { clientName, role, company, content, imageUrl, rating, isActive, displayOrder } = req.body;
    if (!clientName || !role || !content) {
      return res.status(400).json({ message: "Client name, role, and content are required" });
    }
    const item = await storage.createTestimonial({ clientName, role, company: company || null, content, imageUrl: imageUrl || null, rating: rating ?? 5, isActive: isActive ?? true, displayOrder: displayOrder ?? 0 });
    res.status(201).json(item);
  });

  app.patch("/api/accounting/testimonials/:id", requireAuth, requirePermission("content.edit"), async (req, res) => {
    const id = parseInt(req.params.id);
    const { clientName, role, company, content, imageUrl, rating, isActive, displayOrder } = req.body;
    const data: Record<string, unknown> = {};
    if (clientName !== undefined) data.clientName = clientName;
    if (role !== undefined) data.role = role;
    if (company !== undefined) data.company = company;
    if (content !== undefined) data.content = content;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (rating !== undefined) data.rating = rating;
    if (isActive !== undefined) data.isActive = isActive;
    if (displayOrder !== undefined) data.displayOrder = displayOrder;
    const updated = await storage.updateTestimonial(id, data);
    if (!updated) return res.status(404).json({ message: "Testimonial not found" });
    res.json(updated);
  });

  app.delete("/api/accounting/testimonials/:id", requireAuth, requirePermission("content.delete"), async (req, res) => {
    const deleted = await storage.deleteTestimonial(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Testimonial not found" });
    res.json({ message: "Deleted" });
  });

  // ===== SITE STATS MANAGEMENT (Accounting) =====
  app.get("/api/accounting/site-stats", requireAuth, requirePermission("content.view"), async (_req, res) => {
    const items = await storage.getSiteStats();
    res.json(items);
  });

  app.post("/api/accounting/site-stats", requireAuth, requirePermission("content.create"), async (req, res) => {
    const { label, value, suffix, icon, displayOrder } = req.body;
    if (!label || !value) {
      return res.status(400).json({ message: "Label and value are required" });
    }
    const item = await storage.createSiteStat({ label, value, suffix: suffix || "", icon: icon || "Star", displayOrder: displayOrder ?? 0 });
    res.status(201).json(item);
  });

  app.patch("/api/accounting/site-stats/:id", requireAuth, requirePermission("content.edit"), async (req, res) => {
    const id = parseInt(req.params.id);
    const { label, value, suffix, icon, displayOrder } = req.body;
    const data: Record<string, unknown> = {};
    if (label !== undefined) data.label = label;
    if (value !== undefined) data.value = value;
    if (suffix !== undefined) data.suffix = suffix;
    if (icon !== undefined) data.icon = icon;
    if (displayOrder !== undefined) data.displayOrder = displayOrder;
    const updated = await storage.updateSiteStat(id, data);
    if (!updated) return res.status(404).json({ message: "Stat not found" });
    res.json(updated);
  });

  app.delete("/api/accounting/site-stats/:id", requireAuth, requirePermission("content.delete"), async (req, res) => {
    const deleted = await storage.deleteSiteStat(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Stat not found" });
    res.json({ message: "Deleted" });
  });

  // ===== SERVICES MANAGEMENT (Accounting) =====
  app.get("/api/accounting/services", requireAuth, requirePermission("content.view"), async (_req, res) => {
    const items = await storage.getServices();
    res.json(items);
  });

  app.post("/api/accounting/services", requireAuth, requirePermission("content.create"), async (req, res) => {
    const { title, slug, description, icon, image, features } = req.body;
    if (!title || !slug || !description || !icon || !image) {
      return res.status(400).json({ message: "Title, slug, description, icon, and image are required" });
    }
    const created = await storage.createService({ title, slug, description, icon, image, features: features || [] });
    res.status(201).json(created);
  });

  app.patch("/api/accounting/services/:id", requireAuth, requirePermission("content.edit"), async (req, res) => {
    const { title, slug, description, icon, image, features } = req.body;
    const updated = await storage.updateService(parseInt(req.params.id), { title, slug, description, icon, image, features });
    if (!updated) return res.status(404).json({ message: "Service not found" });
    res.json(updated);
  });

  app.delete("/api/accounting/services/:id", requireAuth, requirePermission("content.delete"), async (req, res) => {
    const deleted = await storage.deleteService(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Service not found" });
    res.json({ message: "Deleted" });
  });

  // ===== PRICING PLANS MANAGEMENT (Accounting) =====
  app.get("/api/accounting/pricing-plans", requireAuth, requirePermission("content.view"), async (_req, res) => {
    const plans = await storage.getPricingPlans();
    res.json(plans);
  });

  app.post("/api/accounting/pricing-plans", requireAuth, requirePermission("content.create"), async (req, res) => {
    const { name, price, period, description, features, isPopular, ctaLabel, displayOrder, isActive } = req.body;
    if (!name || !price || !description) return res.status(400).json({ message: "Name, price, and description are required" });
    const validPeriod = period || "one-time";
    if (!["one-time", "monthly", "yearly", "quote"].includes(validPeriod)) return res.status(400).json({ message: "Invalid period value" });
    const plan = await storage.createPricingPlan({ name, price, period: validPeriod, description, features: features || [], isPopular: isPopular || false, ctaLabel: ctaLabel || "Get Started", displayOrder: displayOrder || 0, isActive: isActive !== false });
    res.status(201).json(plan);
  });

  app.patch("/api/accounting/pricing-plans/:id", requireAuth, requirePermission("content.edit"), async (req, res) => {
    const allowedFields = ["name", "price", "period", "description", "features", "isPopular", "ctaLabel", "displayOrder", "isActive"];
    const filtered: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in req.body) filtered[key] = req.body[key];
    }
    if (filtered.period && !["one-time", "monthly", "yearly", "quote"].includes(filtered.period)) {
      return res.status(400).json({ message: "Invalid period value" });
    }
    const updated = await storage.updatePricingPlan(parseInt(req.params.id), filtered);
    if (!updated) return res.status(404).json({ message: "Plan not found" });
    res.json(updated);
  });

  app.delete("/api/accounting/pricing-plans/:id", requireAuth, requirePermission("content.delete"), async (req, res) => {
    const deleted = await storage.deletePricingPlan(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Plan not found" });
    res.json({ message: "Deleted" });
  });

  // ===== JOB POSTINGS MANAGEMENT (Accounting) =====
  app.get("/api/accounting/job-postings", requireAuth, requirePermission("jobs.view"), async (req, res) => {
    const postings = await storage.getJobPostings();
    const postingsWithCounts = await Promise.all(postings.map(async (p) => ({
      ...p,
      applicationCount: await storage.countJobApplications(p.id),
    })));
    res.json(postingsWithCounts);
  });

  app.get("/api/accounting/job-postings/:id", requireAuth, requirePermission("jobs.view"), async (req, res) => {
    const posting = await storage.getJobPosting(parseInt(req.params.id));
    if (!posting) return res.status(404).json({ message: "Job posting not found" });
    const applicationCount = await storage.countJobApplications(posting.id);
    res.json({ ...posting, applicationCount });
  });

  app.post("/api/accounting/job-postings", requireAuth, requirePermission("jobs.create"), async (req, res) => {
    const { title, department, location, type, experience, description, requirements, responsibilities, salaryRange, vacancies, closingDate } = req.body;
    if (!title || !department || !location || !description || !experience) {
      return res.status(400).json({ message: "Title, department, location, experience, and description are required" });
    }
    const validTypes = ["full_time", "part_time", "contract", "internship"];
    const posting = await storage.createJobPosting({
      title, department, location,
      type: validTypes.includes(type) ? type : "full_time",
      experience,
      description,
      requirements: Array.isArray(requirements) ? requirements : [],
      responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
      salaryRange: salaryRange || null,
      vacancies: typeof vacancies === "number" && vacancies > 0 ? vacancies : 1,
      status: "draft",
      closingDate: closingDate || null,
      postedAt: null,
      createdBy: req.user!.id,
    });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "job_posting",
      entityId: posting.id, details: `Created job posting: ${posting.title}`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(posting);
  });

  app.patch("/api/accounting/job-postings/:id", requireAuth, requirePermission("jobs.edit"), async (req, res) => {
    const existing = await storage.getJobPosting(parseInt(req.params.id));
    if (!existing) return res.status(404).json({ message: "Job posting not found" });
    const { title, department, location, type, experience, description, requirements, responsibilities, salaryRange, vacancies, closingDate } = req.body;
    const validTypes = ["full_time", "part_time", "contract", "internship"];
    const allowedFields: Partial<typeof existing> = {};
    if (title !== undefined) allowedFields.title = title;
    if (department !== undefined) allowedFields.department = department;
    if (location !== undefined) allowedFields.location = location;
    if (type !== undefined && validTypes.includes(type)) allowedFields.type = type;
    if (experience !== undefined) allowedFields.experience = experience;
    if (description !== undefined) allowedFields.description = description;
    if (requirements !== undefined && Array.isArray(requirements)) allowedFields.requirements = requirements;
    if (responsibilities !== undefined && Array.isArray(responsibilities)) allowedFields.responsibilities = responsibilities;
    if (salaryRange !== undefined) allowedFields.salaryRange = salaryRange;
    if (vacancies !== undefined && typeof vacancies === "number") allowedFields.vacancies = vacancies;
    if (closingDate !== undefined) allowedFields.closingDate = closingDate;
    const updated = await storage.updateJobPosting(existing.id, allowedFields);
    if (!updated) return res.status(404).json({ message: "Job posting not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "job_posting",
      entityId: updated.id, details: `Updated job posting: ${updated.title}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/job-postings/:id/publish", requireAuth, requirePermission("jobs.edit"), async (req, res) => {
    const posting = await storage.getJobPosting(parseInt(req.params.id));
    if (!posting) return res.status(404).json({ message: "Job posting not found" });
    if (posting.status === "open") return res.status(400).json({ message: "Posting is already published" });
    const updated = await storage.updateJobPosting(posting.id, { status: "open", postedAt: new Date() });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "publish", entity: "job_posting",
      entityId: posting.id, details: `Published job posting: ${posting.title}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/job-postings/:id/close", requireAuth, requirePermission("jobs.edit"), async (req, res) => {
    const posting = await storage.getJobPosting(parseInt(req.params.id));
    if (!posting) return res.status(404).json({ message: "Job posting not found" });
    if (posting.status === "closed") return res.status(400).json({ message: "Posting is already closed" });
    const updated = await storage.updateJobPosting(posting.id, { status: "closed" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "close", entity: "job_posting",
      entityId: posting.id, details: `Closed job posting: ${posting.title}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.post("/api/accounting/job-postings/:id/reopen", requireAuth, requirePermission("jobs.edit"), async (req, res) => {
    const posting = await storage.getJobPosting(parseInt(req.params.id));
    if (!posting) return res.status(404).json({ message: "Job posting not found" });
    if (posting.status !== "closed") return res.status(400).json({ message: "Only closed postings can be reopened" });
    const updated = await storage.updateJobPosting(posting.id, { status: "open", postedAt: new Date() });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "reopen", entity: "job_posting",
      entityId: posting.id, details: `Reopened job posting: ${posting.title}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/job-postings/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    const id = parseInt(req.params.id);
    const appCount = await storage.countJobApplications(id);
    if (appCount > 0) {
      return res.status(400).json({ message: "Cannot delete job posting — it has applications. Close it instead." });
    }
    const deleted = await storage.deleteJobPosting(id);
    if (!deleted) return res.status(404).json({ message: "Job posting not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "job_posting",
      entityId: id, details: `Deleted job posting`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  // ===== JOB APPLICATIONS MANAGEMENT (Accounting) =====
  app.get("/api/accounting/job-applications", requireAuth, requirePermission("jobs.view"), async (req, res) => {
    const filters: { jobPostingId?: number; status?: string } = {};
    const jobIdParam = (req.query.jobPostingId || req.query.jobId) as string | undefined;
    if (jobIdParam) filters.jobPostingId = parseInt(jobIdParam);
    if (req.query.status) filters.status = req.query.status as string;
    const apps = await storage.getJobApplications(filters);
    res.json(apps);
  });

  app.get("/api/accounting/job-applications/:id", requireAuth, requirePermission("jobs.view"), async (req, res) => {
    const application = await storage.getJobApplication(parseInt(req.params.id));
    if (!application) return res.status(404).json({ message: "Application not found" });
    res.json(application);
  });

  app.patch("/api/accounting/job-applications/:id", requireAuth, requirePermission("jobs.edit"), async (req, res) => {
    const id = parseInt(req.params.id);
    const validStatuses = ["new", "reviewing", "shortlisted", "interview", "offered", "hired", "rejected"] as const;
    const data: Partial<JobApplication> = {};
    if (req.body.status && validStatuses.includes(req.body.status)) {
      data.status = req.body.status;
      if (req.body.status !== "new") {
        data.reviewedBy = req.user!.id;
        data.reviewedAt = new Date();
      }
    }
    if (req.body.notes !== undefined) data.notes = req.body.notes;
    const updated = await storage.updateJobApplication(id, data);
    if (!updated) return res.status(404).json({ message: "Application not found" });
    if (updated.status === "hired") {
      const posting = await storage.getJobPosting(updated.jobPostingId);
      if (posting && posting.vacancies > 0) {
        const hiredCount = (await storage.getJobApplications({ jobPostingId: posting.id, status: "hired" })).length;
        if (hiredCount >= posting.vacancies && posting.status === "open") {
          await storage.updateJobPosting(posting.id, { status: "closed" });
          await storage.createAuditLog({
            employeeId: req.user!.id, action: "auto_close", entity: "job_posting",
            entityId: posting.id, details: `Auto-closed: all ${posting.vacancies} vacancy(ies) filled`,
            ipAddress: req.ip || null,
          });
        }
      }
    }
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "job_application",
      entityId: id, details: `Updated application status to ${updated.status}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/job-applications/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteJobApplication(id);
    if (!deleted) return res.status(404).json({ message: "Application not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "job_application",
      entityId: id, details: `Deleted job application`,
      ipAddress: req.ip || null,
    });
    res.json({ message: "Deleted successfully" });
  });

  // SMTP Settings (Super Admin only)
  app.get("/api/accounting/smtp-settings", requireAuth, requireRole("super_admin"), async (req, res) => {
    const settings = await storage.getSmtpSettings();
    if (!settings) return res.json(null);
    const { password: _, ...safe } = settings;
    res.json({ ...safe, password: "••••••••" });
  });

  app.put("/api/accounting/smtp-settings", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { host, port, username, password, fromName, fromEmail, secure } = req.body;
      if (!host || !username || !fromName || !fromEmail) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const existing = await storage.getSmtpSettings();
      const effectivePassword = (!password || password === "••••••••") && existing ? existing.password : password;
      if (!effectivePassword) {
        return res.status(400).json({ message: "Password is required" });
      }
      const settings = await storage.upsertSmtpSettings({
        host, port: port || 587, username, password: effectivePassword, fromName, fromEmail, secure: secure || false,
      });
      await storage.createAuditLog({
        employeeId: req.user!.id, action: "update", entity: "smtp_settings",
        details: "Updated SMTP settings",
        ipAddress: req.ip || null,
      });
      const { password: _, ...safe } = settings;
      res.json({ ...safe, password: "••••••••" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to save SMTP settings" });
    }
  });

  app.post("/api/accounting/smtp-settings/test", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const smtpConfig = await storage.getSmtpSettings();
      if (!smtpConfig) {
        return res.status(400).json({ message: "SMTP settings not configured" });
      }
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: { user: smtpConfig.username, pass: smtpConfig.password },
      });
      await transporter.verify();
      await transporter.sendMail({
        from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
        to: req.user!.email,
        subject: "SMTP Test - MHTSdigiXR Accounting",
        text: "This is a test email from MHTSdigiXR Accounting. SMTP settings are working correctly.",
        html: "<p>This is a test email from <strong>MHTSdigiXR Accounting</strong>. SMTP settings are working correctly.</p>",
      });
      res.json({ message: `Test email sent to ${req.user!.email}` });
    } catch (err: any) {
      res.status(500).json({ message: `SMTP test failed: ${err.message}` });
    }
  });

  // Password Reset (public routes)
  function hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  function getAppBaseUrl(): string | null {
    if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
    if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    return null;
  }

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const smtpConfig = await getEffectiveSmtpConfig();
      if (!smtpConfig) {
        return res.status(503).json({ message: "Password reset is not configured — contact your administrator" });
      }

      const employee = await storage.getEmployeeByEmail(email);
      if (!employee || !employee.isActive) {
        return res.json({ message: "If an account with that email exists, a reset link has been sent." });
      }

      const baseUrl = getAppBaseUrl();
      if (!baseUrl) {
        console.error("APP_BASE_URL is not configured and no Replit domain detected");
        return res.status(503).json({ message: "Password reset is not fully configured — contact your administrator" });
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedTokenValue = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await storage.createPasswordResetToken({
        token: hashedTokenValue,
        employeeId: employee.id,
        expiresAt,
        used: false,
      });

      const resetUrl = `${baseUrl}/accounting/reset-password?token=${rawToken}`;

      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: { user: smtpConfig.username, pass: smtpConfig.password },
      });

      await transporter.sendMail({
        from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
        to: employee.email,
        subject: "Password Reset - MHTSdigiXR Accounting",
        text: `Hello ${employee.fullName},\n\nYou requested a password reset. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request this, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0ea5e9;">Password Reset</h2>
            <p>Hello ${employee.fullName},</p>
            <p>You requested a password reset for your MHTSdigiXR Accounting account.</p>
            <p><a href="${resetUrl}" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a></p>
            <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you did not request this, please ignore this email.</p>
          </div>
        `,
      });

      res.json({ message: "If an account with that email exists, a reset link has been sent." });
    } catch (err: any) {
      console.error("Forgot password error:", err);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.get("/api/auth/validate-reset-token", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ valid: false, message: "Token is required" });
      }
      const hashedTokenValue = hashToken(token);
      const resetToken = await storage.getPasswordResetToken(hashedTokenValue);
      if (!resetToken) {
        return res.json({ valid: false, message: "Invalid reset link" });
      }
      if (resetToken.used) {
        return res.json({ valid: false, message: "This reset link has already been used" });
      }
      if (new Date() > resetToken.expiresAt) {
        return res.json({ valid: false, message: "This reset link has expired" });
      }
      res.json({ valid: true });
    } catch (err: any) {
      console.error("Validate reset token error:", err);
      res.status(500).json({ valid: false, message: "Failed to validate reset link" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const hashedTokenValue = hashToken(token);
      const consumed = await storage.consumePasswordResetToken(hashedTokenValue);
      if (!consumed) {
        return res.status(400).json({ message: "Invalid, expired, or already used reset link" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateEmployee(consumed.employeeId, { password: hashedPassword });

      res.json({ message: "Password has been reset successfully" });
    } catch (err: any) {
      console.error("Reset password error:", err);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.get("/api/auth/smtp-configured", async (_req, res) => {
    const smtpConfig = await storage.getSmtpSettings();
    res.json({ configured: !!smtpConfig });
  });

  // ── MHTS ERP desktop-app licensing portal ──────────────────────────────
  // Public endpoints below are machine-to-machine (the caller is a desktop
  // install, not a human with a browser session) — they authenticate with
  // their own bearer secrets (the activation code, then a per-machine
  // activation token) instead of the employee session/cookie auth used
  // everywhere else in this file. Rate-limited since they're the only
  // endpoints in this app reachable without an employee login.

  function countActiveActivations(activations: Awaited<ReturnType<typeof storage.getErpLicenseActivations>>): number {
    return activations.filter(a => a.status === "active").length;
  }

  app.use("/api/erp-licenses/activate", rateLimiter(5, 60 * 60 * 1000));
  app.post("/api/erp-licenses/activate", async (req, res) => {
    const { activationCode, machineId, machineLabel } = req.body || {};
    if (!activationCode || !machineId || typeof activationCode !== "string" || typeof machineId !== "string") {
      return res.status(400).json({ message: "activationCode and machineId are required" });
    }

    const license = await storage.getErpLicenseByActivationCodeHash(hashToken(activationCode));
    if (!license || license.status === "revoked") {
      return res.status(400).json({ message: "Invalid or revoked activation code" });
    }

    const existing = await storage.getErpLicenseActivationByMachine(license.id, machineId);
    const activationToken = crypto.randomBytes(32).toString("hex");
    const activationTokenHash = hashToken(activationToken);

    if (existing) {
      // Same machine re-activating (e.g. re-running setup) — rotate its token rather
      // than consuming another maxActivations slot.
      await storage.updateErpLicenseActivation(existing.id, {
        activationTokenHash,
        machineLabel: machineLabel || existing.machineLabel,
        status: "active",
        lastSeenAt: new Date(),
      });
    } else {
      const activations = await storage.getErpLicenseActivations(license.id);
      if (countActiveActivations(activations) >= license.maxActivations) {
        return res.status(403).json({ message: "This license has already been activated on the maximum number of machines allowed. Contact MHTSdigiXR support to free up a slot." });
      }
      await storage.createErpLicenseActivation({
        erpLicenseId: license.id,
        machineId,
        machineLabel: machineLabel || null,
        activationTokenHash,
        status: "active",
        lastSeenAt: new Date(),
      });
    }

    if (license.status === "pending") {
      await storage.updateErpLicense(license.id, { status: "active" });
    }

    await storage.createAuditLog({
      employeeId: null,
      action: "erp_license_activate",
      entity: "erp_license",
      entityId: license.id,
      details: `Activated for machine ${machineId}${machineLabel ? ` (${machineLabel})` : ""}`,
      ipAddress: req.ip || req.socket.remoteAddress || null,
    });

    res.json({ licenseFileContents: license.licenseFileContents, activationToken });
  });

  app.use("/api/erp-licenses/checkin", rateLimiter(30, 60 * 60 * 1000));
  app.post("/api/erp-licenses/checkin", async (req, res) => {
    const { licenseId, machineId, activationToken } = req.body || {};
    if (!licenseId || !machineId || !activationToken) {
      return res.status(400).json({ ok: false, status: "invalid_request" });
    }

    const license = await storage.getErpLicenseByLicenseId(licenseId);
    if (!license || license.status === "revoked") {
      return res.json({ ok: false, status: "revoked" });
    }

    const activation = await storage.getErpLicenseActivationByMachine(license.id, machineId);
    if (!activation || activation.status === "revoked") {
      return res.json({ ok: false, status: "revoked" });
    }

    const providedHash = Buffer.from(hashToken(activationToken));
    const storedHash = Buffer.from(activation.activationTokenHash);
    if (providedHash.length !== storedHash.length || !crypto.timingSafeEqual(providedHash, storedHash)) {
      return res.json({ ok: false, status: "invalid_token" });
    }

    await storage.updateErpLicenseActivation(activation.id, { lastSeenAt: new Date() });
    res.json({ ok: true, status: "active" });
  });

  // Employee-facing management, same session/permission auth as every other /api/accounting/* route.
  app.get("/api/accounting/erp-licenses", requireAuth, requirePermission("erp_licenses.view"), async (_req, res) => {
    res.json(await storage.getErpLicenses());
  });

  app.get("/api/accounting/erp-licenses/:id", requireAuth, requirePermission("erp_licenses.view"), async (req, res) => {
    const license = await storage.getErpLicense(parseInt(req.params.id));
    if (!license) return res.status(404).json({ message: "License not found" });
    const activations = await storage.getErpLicenseActivations(license.id);
    res.json({ ...license, activations });
  });

  app.post("/api/accounting/erp-licenses", requireAuth, requirePermission("erp_licenses.manage"), async (req, res) => {
    const { licenseFileContentsBase64, customerName, customerEmail, customerPhone, partyId, maxActivations } = req.body || {};
    if (!licenseFileContentsBase64 || !customerName) {
      return res.status(400).json({ message: "licenseFileContentsBase64 and customerName are required" });
    }

    // Sent base64-encoded (rather than raw JSON text) specifically so the global
    // sanitizeInputs middleware's HTML-entity escaping (", ', <, >) — correct for
    // ordinary form fields — can't corrupt this field's embedded quote characters
    // before it ever reaches JSON.parse below.
    let licenseFileContents: string;
    let payload: { licenseId?: string; expiresAt?: string | null };
    try {
      licenseFileContents = Buffer.from(licenseFileContentsBase64, "base64").toString("utf8");
      payload = JSON.parse(licenseFileContents).payload;
      if (!payload?.licenseId) throw new Error("missing licenseId");
    } catch {
      return res.status(400).json({ message: "licenseFileContentsBase64 is not a valid signed license file (paste the exact license.lic contents generated offline)" });
    }

    if (await storage.getErpLicenseByLicenseId(payload.licenseId)) {
      return res.status(400).json({ message: `A license record for licenseId ${payload.licenseId} already exists` });
    }

    const activationCode = crypto.randomBytes(15).toString("base64url"); // shown once — staff must copy it now
    const license = await storage.createErpLicense({
      licenseId: payload.licenseId,
      activationCodeHash: hashToken(activationCode),
      licenseFileContents,
      customerName,
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      partyId: partyId || null,
      maxActivations: maxActivations && Number(maxActivations) > 0 ? Number(maxActivations) : 1,
      status: "pending",
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      createdBy: req.user!.id,
    });

    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "erp_license",
      entityId: license.id, details: `Created ERP license for ${customerName}`,
      ipAddress: req.ip || null,
    });

    // Best-effort — the code is still shown once in the admin UI regardless, so a failed
    // or skipped (no email on file) send never blocks license creation itself.
    let emailSent = false;
    if (customerEmail) {
      const rendered = await renderEmailTemplate("erp_license_activation", { customerName, licenseId: payload.licenseId, activationCode }, "MHTSdigiXR");
      emailSent = rendered
        ? await sendEmail(customerEmail, rendered.subject, rendered.text, rendered.html)
        : await sendEmail(
            customerEmail,
            "Your MHTS ERP Activation Code",
            `Hello ${customerName},\n\nThank you for choosing MHTS ERP. Your license is ready to activate.\n\nOpen the MHTS ERP desktop app, go to "Activate license," and enter this code:\n\nLicense ID: ${payload.licenseId}\nActivation Code: ${activationCode}\n\nKeep this code safe — it will not be shown again after this email.\n\nMHTSdigiXR Team`,
          );
    }

    res.status(201).json({ ...license, activationCode, emailSent });
  });

  app.patch("/api/accounting/erp-licenses/:id/revoke", requireAuth, requirePermission("erp_licenses.manage"), async (req, res) => {
    const license = await storage.getErpLicense(parseInt(req.params.id));
    if (!license) return res.status(404).json({ message: "License not found" });
    const updated = await storage.updateErpLicense(license.id, { status: "revoked" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "revoke", entity: "erp_license",
      entityId: license.id, details: `Revoked ERP license for ${license.customerName}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.patch("/api/accounting/erp-licenses/:id/activations/:activationId/revoke", requireAuth, requirePermission("erp_licenses.manage"), async (req, res) => {
    const licenseId = parseInt(req.params.id);
    const existingActivations = await storage.getErpLicenseActivations(licenseId);
    if (!existingActivations.some((a) => a.id === parseInt(req.params.activationId))) {
      return res.status(404).json({ message: "Activation not found for this license" });
    }

    const activation = await storage.updateErpLicenseActivation(parseInt(req.params.activationId), {
      status: "revoked",
      revokedAt: new Date(),
      revokedBy: req.user!.id,
    });
    if (!activation) return res.status(404).json({ message: "Activation not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "revoke_activation", entity: "erp_license_activation",
      entityId: activation.id, details: `Revoked machine activation ${activation.machineId} (frees a slot for re-activation, e.g. after a hardware transfer)`,
      ipAddress: req.ip || null,
    });
    res.json(activation);
  });

  // Seed data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const servicesList = await storage.getServices();
  if (servicesList.length === 0) {
    const services = [
      { title: "Domain & Hosting", slug: "domain-hosting", description: "Reliable domain registration and web hosting solutions for your business.", icon: "Globe", image: "/images/services/domain-hosting.jpg", features: ["SSL Certificates", "24/7 Support", "99.9% Uptime", "Scalable Infrastructure"] },
      { title: "Website Development", slug: "web-development", description: "Custom website development for corporate businesses and startups.", icon: "Code", image: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&q=80&w=1000", features: ["Responsive Design", "Custom CMS", "E-commerce Solutions", "Performance Optimization"] },
      { title: "Logo & Graphic Design", slug: "graphic-design", description: "Creative and unique content creation and brand identity development.", icon: "Palette", image: "/images/services/graphic-design.jpg", features: ["Logo Design", "Brand Identity", "Marketing Materials", "Social Media Graphics"] },
      { title: "UI/UX Design", slug: "ui-ux-design", description: "User-focused design approach to enhance customer experience.", icon: "Layout", image: "/images/services/ui-ux-design.jpg", features: ["User Research", "Wireframing", "Prototyping", "Usability Testing"] },
      { title: "Mobile App Development", slug: "mobile-apps", description: "Native and hybrid mobile application development for iOS and Android.", icon: "Smartphone", image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=1000", features: ["iOS & Android", "React Native", "Flutter", "App Store Optimization"] },
      { title: "Digital Marketing", slug: "digital-marketing", description: "Comprehensive online marketing strategies to grow your business.", icon: "TrendingUp", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000", features: ["SEO", "SMM", "PPC", "Email Marketing"] },
    ];
    for (const service of services) {
      await storage.createService(service);
    }
  }

  const postsList = await storage.getPosts();
  if (postsList.length === 0) {
    await storage.createPost({ title: "The Future of Digital Marketing in 2026", slug: "future-of-digital-marketing-2026", summary: "Explore the latest trends and technologies shaping the digital marketing landscape.", content: "Digital marketing is evolving rapidly with AI, automation, and personalization leading the way...", coverImage: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&q=80&w=1000" });
    await storage.createPost({ title: "Why Your Business Needs a Mobile App", slug: "why-business-needs-mobile-app", summary: "Understand the benefits of having a dedicated mobile application for your customers.", content: "In today's mobile-first world, having an app can significantly improve customer engagement and retention...", coverImage: "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&q=80&w=1000" });
  }

  // Seed Super Admin — only if no admin account exists yet; never overwrites
  // an existing admin's details on restart. All values come from the
  // environment; see README.md / HOSTINGER_DEPLOYMENT.md for INITIAL_ADMIN_*.
  const initialAdminUsername = process.env.INITIAL_ADMIN_USERNAME || "superadmin";
  const existingAdmin = await storage.getEmployeeByUsername(initialAdminUsername);
  if (!existingAdmin) {
    let initialPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (!initialPassword) {
      initialPassword = crypto.randomBytes(12).toString("base64url");
      console.log(
        `\n[seed] No INITIAL_ADMIN_PASSWORD set — generated a random password for super admin "${initialAdminUsername}":\n` +
        `[seed]   ${initialPassword}\n` +
        `[seed] This is shown once and not stored anywhere. Log in and change it immediately.\n`
      );
    }
    const hashedPassword = await bcrypt.hash(initialPassword, 10);
    try {
      await storage.createEmployee({
        username: initialAdminUsername,
        email: process.env.INITIAL_ADMIN_EMAIL || "admin@localhost",
        password: hashedPassword,
        fullName: "Super Administrator",
        role: "super_admin",
        phone: process.env.INITIAL_ADMIN_PHONE || null,
        isActive: true,
        createdBy: null,
      });
    } catch (err: any) {
      // Most commonly a duplicate email (INITIAL_ADMIN_EMAIL already used by another
      // account) — log it and move on instead of crashing the whole app on startup.
      console.error(`[seed] Failed to create super admin "${initialAdminUsername}": ${err?.message || err}`);
    }
  }

  // Seed Account Groups (expanded with standard groups)
  const groups = await storage.getAccountGroups();
  if (groups.length === 0) {
    const defaultGroups = [
      { name: "Current Assets", type: "asset", description: "Short-term assets convertible to cash within a year" },
      { name: "Bank Accounts", type: "asset", description: "Bank balances and deposits" },
      { name: "Fixed Assets", type: "asset", description: "Long-term tangible assets" },
      { name: "Investments", type: "asset", description: "Financial investments and securities" },
      { name: "Loans & Advances (Asset)", type: "asset", description: "Advances given and loans receivable" },
      { name: "Current Liabilities", type: "liability", description: "Short-term obligations due within a year" },
      { name: "Long-term Liabilities", type: "liability", description: "Long-term obligations and loans" },
      { name: "Duties & Taxes", type: "liability", description: "GST, TDS, Professional Tax and other statutory dues" },
      { name: "Provisions", type: "liability", description: "Provisions for expected expenses" },
      { name: "Capital Account", type: "capital", description: "Owner's equity and capital" },
      { name: "Reserves & Surplus", type: "capital", description: "Retained earnings and reserves" },
      { name: "Direct Income", type: "income", description: "Revenue from primary business operations" },
      { name: "Indirect Income", type: "income", description: "Revenue from secondary sources" },
      { name: "Direct Expenses", type: "expense", description: "Costs directly tied to service delivery" },
      { name: "Indirect Expenses", type: "expense", description: "Overhead and administrative costs" },
      { name: "Suspense Account", type: "asset", description: "Temporary account for unclassified entries" },
    ];
    const createdGroups: Record<string, number> = {};
    for (const group of defaultGroups) {
      const created = await storage.createAccountGroup(group);
      createdGroups[group.name] = created.id;
    }

    // Seed default ledger accounts (comprehensive standard chart)
    const defaultAccounts = [
      { name: "Cash", groupId: createdGroups["Current Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Petty Cash", groupId: createdGroups["Current Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Bank Account", groupId: createdGroups["Bank Accounts"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Bank OD Account", groupId: createdGroups["Bank Accounts"], openingBalance: "0", balanceType: "credit" as const },
      { name: "Sundry Debtors", groupId: createdGroups["Current Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Stock-in-Hand", groupId: createdGroups["Current Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Furniture & Fixtures", groupId: createdGroups["Fixed Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Computer & Equipment", groupId: createdGroups["Fixed Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Sundry Creditors", groupId: createdGroups["Current Liabilities"], openingBalance: "0", balanceType: "credit" as const },
      { name: "CGST Payable", groupId: createdGroups["Duties & Taxes"], openingBalance: "0", balanceType: "credit" as const },
      { name: "SGST Payable", groupId: createdGroups["Duties & Taxes"], openingBalance: "0", balanceType: "credit" as const },
      { name: "IGST Payable", groupId: createdGroups["Duties & Taxes"], openingBalance: "0", balanceType: "credit" as const },
      { name: "CGST Receivable", groupId: createdGroups["Current Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "SGST Receivable", groupId: createdGroups["Current Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "IGST Receivable", groupId: createdGroups["Current Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "TDS Payable", groupId: createdGroups["Duties & Taxes"], openingBalance: "0", balanceType: "credit" as const },
      { name: "TDS Receivable", groupId: createdGroups["Current Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Professional Tax", groupId: createdGroups["Duties & Taxes"], openingBalance: "0", balanceType: "credit" as const },
      { name: "Sales Account", groupId: createdGroups["Direct Income"], openingBalance: "0", balanceType: "credit" as const },
      { name: "Service Revenue", groupId: createdGroups["Direct Income"], openingBalance: "0", balanceType: "credit" as const },
      { name: "Interest Income", groupId: createdGroups["Indirect Income"], openingBalance: "0", balanceType: "credit" as const },
      { name: "Discount Received", groupId: createdGroups["Indirect Income"], openingBalance: "0", balanceType: "credit" as const },
      { name: "Purchase Account", groupId: createdGroups["Direct Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Salary & Wages", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Rent", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Electricity", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Telephone & Internet", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Office Supplies", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Travelling Expenses", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Printing & Stationery", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Bank Charges", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Insurance", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Audit Fees", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Repairs & Maintenance", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Depreciation", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Discount Allowed", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Bad Debts", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Capital", groupId: createdGroups["Capital Account"], openingBalance: "0", balanceType: "credit" as const },
      { name: "Drawings", groupId: createdGroups["Capital Account"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Suspense A/c", groupId: createdGroups["Suspense Account"], openingBalance: "0", balanceType: "debit" as const },
    ];
    for (const account of defaultAccounts) {
      await storage.createLedgerAccount(account);
    }
  }

  // Ensure the Tutor Payroll ledger account exists — runs unconditionally (not gated
  // behind the fresh-install `groups.length === 0` check above) so it also backfills
  // already-seeded/production databases. TDS Payable and Bank Account are reused from
  // the chart of accounts seeded above; only this one expense ledger is new.
  {
    const existingGroups = await storage.getAccountGroups();
    const expenseGroup = existingGroups.find(g => g.name === "Direct Expenses") || existingGroups.find(g => g.name === "Indirect Expenses");
    const incomeGroup = existingGroups.find(g => g.name === "Indirect Income") || existingGroups.find(g => g.name === "Direct Income");
    if (expenseGroup) {
      const existingAccounts = await storage.getLedgerAccounts();
      if (!existingAccounts.some(a => a.name === "Tutor Professional Fees")) {
        await storage.createLedgerAccount({
          name: "Tutor Professional Fees",
          groupId: expenseGroup.id,
          openingBalance: "0",
          balanceType: "debit",
          description: "Sec 194J professional fees paid to independent contractor tutors (KoodaldigiXS Learning)",
        });
      }
    }
    if (incomeGroup) {
      const existingAccounts = await storage.getLedgerAccounts();
      if (!existingAccounts.some(a => a.name === "Platform Commission Income")) {
        await storage.createLedgerAccount({
          name: "Platform Commission Income",
          groupId: incomeGroup.id,
          openingBalance: "0",
          balanceType: "credit",
          description: "Platform commission retained from tutor fees per Clause 4.2 of the Individual Tutor Agreement (usually 0%)",
        });
      }
    }
  }

  // Ensure PF/ESI Payable ledger accounts exist — same unconditional backfill
  // pattern as the Tutor Payroll ledgers above, needed for the With-PF/ESI
  // payroll payslip format's mark-paid voucher posting (employee-side
  // withholding only; employer contributions are tracked on the payslip but
  // not yet posted to the ledger — see payrollPayslips in shared/schema.ts).
  {
    const dutiesGroup = (await storage.getAccountGroups()).find(g => g.name === "Duties & Taxes");
    if (dutiesGroup) {
      const existingAccounts = await storage.getLedgerAccounts();
      if (!existingAccounts.some(a => a.name === "PF Payable")) {
        await storage.createLedgerAccount({
          name: "PF Payable", groupId: dutiesGroup.id, openingBalance: "0", balanceType: "credit",
          description: "Employee PF contribution withheld from salaried staff, due for remittance",
        });
      }
      if (!existingAccounts.some(a => a.name === "ESI Payable")) {
        await storage.createLedgerAccount({
          name: "ESI Payable", groupId: dutiesGroup.id, openingBalance: "0", balanceType: "credit",
          description: "Employee ESI contribution withheld from salaried staff, due for remittance",
        });
      }
    }
  }

  // Seed default company settings; backfill new website fields only if ALL are null (pre-migration state)
  const existingSettings = await storage.getCompanySettings();
  if (existingSettings &&
      existingSettings.brandName === null &&
      existingSettings.whatsappNumber === null &&
      existingSettings.careersEmail === null &&
      existingSettings.websiteUrl === null) {
    await storage.upsertCompanySettings({
      ...existingSettings,
      brandName: "MHTSdigiXR",
      tagline: "Empowering businesses with cutting-edge digital solutions.",
      whatsappNumber: "917358105995",
      careersEmail: "careers@mhtsdigixr.com",
      websiteUrl: "www.mhtsdigixr.com",
      email: existingSettings.email || "info@mhtsdigixr.com",
    });
  }
  if (!existingSettings) {
    await storage.upsertCompanySettings({
      companyName: "Maanagarram Hi Tech Solutions",
      address: "4056, 5th Main Road, Ayyapakam, Chennai, Tamil Nadu, India - 600077",
      gstin: "",
      phone: "+91 4447740195",
      email: "info@mhtsdigixr.com",
      state: "Tamil Nadu",
      brandName: "MHTSdigiXR",
      tagline: "Empowering businesses with cutting-edge digital solutions.",
      whatsappNumber: "917358105995",
      careersEmail: "careers@mhtsdigixr.com",
      websiteUrl: "www.mhtsdigixr.com",
      linkedinUrl: "",
      twitterUrl: "",
      instagramUrl: "",
      facebookUrl: "",
      copyrightText: "",
    });
  }

  // Seed default financial year
  const fys = await storage.getFinancialYears();
  if (fys.length === 0) {
    await storage.createFinancialYear({
      name: "FY 2025-26",
      startDate: "2025-04-01",
      endDate: "2026-03-31",
      isActive: true,
    });
  }

  // Seed default products/services
  const productList = await storage.getProducts();
  if (productList.length === 0) {
    const defaultProducts = [
      { productCode: "SRV-WEB-001", name: "Website Development", category: "web_development", description: "Custom responsive website design and development", hsnSacCode: "998314", unit: "project", rate: "25000", gstRate: "18" },
      { productCode: "SRV-MOB-001", name: "Mobile App Development", category: "mobile_app", description: "iOS and Android mobile application development", hsnSacCode: "998314", unit: "project", rate: "50000", gstRate: "18" },
      { productCode: "SRV-SEO-001", name: "SEO Optimization", category: "seo", description: "Search engine optimization and ranking improvement", hsnSacCode: "998365", unit: "month", rate: "10000", gstRate: "18" },
      { productCode: "SRV-SMM-001", name: "Social Media Marketing", category: "smm", description: "Social media management and marketing campaigns", hsnSacCode: "998365", unit: "month", rate: "8000", gstRate: "18" },
      { productCode: "SRV-BRD-001", name: "Branding & Graphics", category: "branding", description: "Brand identity design including logo, colors, and guidelines", hsnSacCode: "998397", unit: "project", rate: "15000", gstRate: "18" },
      { productCode: "SRV-DIG-001", name: "Digital Marketing", category: "digital_marketing", description: "Complete digital marketing strategy and execution", hsnSacCode: "998365", unit: "month", rate: "20000", gstRate: "18" },
      { productCode: "SRV-DOM-001", name: "Domain & Hosting", category: "domain_hosting", description: "Domain registration and web hosting services", hsnSacCode: "998315", unit: "year", rate: "5000", gstRate: "18" },
      { productCode: "SRV-VID-001", name: "Video & Animation", category: "video_animation", description: "Video production and animation services", hsnSacCode: "998397", unit: "project", rate: "30000", gstRate: "18" },
      { productCode: "SRV-CON-001", name: "Consulting Services", category: "consulting", description: "Technology and digital strategy consulting", hsnSacCode: "998311", unit: "hour", rate: "2000", gstRate: "18" },
      { productCode: "SRV-UI-001", name: "UI/UX Design", category: "ui_ux_design", description: "User interface and experience design", hsnSacCode: "998314", unit: "project", rate: "20000", gstRate: "18" },
    ];
    for (const product of defaultProducts) {
      await storage.createProduct(product);
    }
  }
}
