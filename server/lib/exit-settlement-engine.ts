// Resignation/Exit (Step 5) — Full & Final settlement calculation engine.
//
// Every number this module produces is a DRAFT baseline (standard notice
// period practice; the Payment of Gratuity Act, 1972 formula and its 5-year
// continuous-service rule) — same standing rule as the depreciation and
// leave-accrual engines this file mirrors: HR/CA review must confirm these
// before a real exit relies on them. The settlement record this feeds stays
// editable while in "draft" status specifically so a reviewed correction
// doesn't require touching this code.
//
// Deliberately pure — no imports from storage/db/express — so the math can be
// reviewed and unit-tested in complete isolation from the rest of the app.

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** resignationDate + noticePeriodDays, both "YYYY-MM-DD". */
export function computeProposedLastWorkingDay(resignationDate: string, noticePeriodDays: number): string {
  const date = new Date(resignationDate + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + noticePeriodDays);
  return date.toISOString().split("T")[0];
}

/**
 * Whole + fractional years between two "YYYY-MM-DD" dates, for display and as
 * the input to computeGratuity's six-month rounding rule below.
 */
export function computeYearsOfService(dateOfJoining: string, lastWorkingDay: string): number {
  const start = new Date(dateOfJoining + "T00:00:00Z");
  const end = new Date(lastWorkingDay + "T00:00:00Z");
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  return Math.max(0, (end.getTime() - start.getTime()) / msPerYear);
}

export interface GratuityResult {
  eligible: boolean;
  yearsOfService: number;
  roundedYears: number;
  amount: number;
}

/**
 * Payment of Gratuity Act, 1972 formula: (last drawn Basic+DA monthly / 26) *
 * 15 * years of service, with a completed period over six months rounded up
 * to the next full year (Sec 4(2)) and eligibility gated on
 * eligibilityYears (default GRATUITY_ELIGIBILITY_YEARS = 5) of continuous
 * service. Returns amount 0 (never negative) when ineligible.
 */
export function computeGratuity(params: {
  basicPlusDaMonthly: number;
  dateOfJoining: string;
  lastWorkingDay: string;
  eligibilityYears?: number;
}): GratuityResult {
  const { basicPlusDaMonthly, dateOfJoining, lastWorkingDay, eligibilityYears = 5 } = params;
  const yearsOfService = computeYearsOfService(dateOfJoining, lastWorkingDay);
  const wholeYears = Math.floor(yearsOfService);
  const remainderMonths = (yearsOfService - wholeYears) * 12;
  const roundedYears = remainderMonths > 6 ? wholeYears + 1 : wholeYears;
  const eligible = yearsOfService >= eligibilityYears;
  const amount = eligible ? round2((basicPlusDaMonthly / 26) * 15 * roundedYears) : 0;
  return { eligible, yearsOfService: Math.round(yearsOfService * 10) / 10, roundedYears, amount };
}

export interface LeaveEncashmentResult {
  days: number;
  amount: number;
}

/**
 * Sums the available balance (opening + accrued + adjustment - used) across
 * only the leave types marked isEncashable, then values it at perDayRate
 * (typically last drawn Basic+DA monthly / 26 — the same day-rate convention
 * as gratuity above and as payrollPayslips' own LOP proration).
 */
export function computeLeaveEncashment(params: {
  balances: Array<{ isEncashable: boolean; availableDays: number }>;
  perDayRate: number;
}): LeaveEncashmentResult {
  const days = params.balances
    .filter(b => b.isEncashable)
    .reduce((sum, b) => sum + Math.max(0, b.availableDays), 0);
  return { days: Math.round(days * 10) / 10, amount: round2(days * params.perDayRate) };
}

/**
 * Pro-rates the final (partial) month's gross pay for days actually worked,
 * mirroring the same "component * daysCounted / standardWorkingDays"
 * proration already used for LOP on payrollPayslips.
 */
export function computePendingSalary(params: {
  monthlyGross: number;
  standardWorkingDays: number;
  daysWorkedInFinalMonth: number;
}): number {
  const { monthlyGross, standardWorkingDays, daysWorkedInFinalMonth } = params;
  if (standardWorkingDays <= 0) return 0;
  const days = Math.min(Math.max(0, daysWorkedInFinalMonth), standardWorkingDays);
  return round2((monthlyGross / standardWorkingDays) * days);
}

/** pendingSalary + leaveEncashment + gratuity + otherEarnings - otherDeductions. */
export function computeNetSettlement(params: {
  pendingSalaryAmount: number;
  leaveEncashmentAmount: number;
  gratuityAmount: number;
  otherEarnings: number;
  otherDeductions: number;
}): number {
  return round2(
    params.pendingSalaryAmount + params.leaveEncashmentAmount + params.gratuityAmount +
    params.otherEarnings - params.otherDeductions
  );
}
