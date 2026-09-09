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
import type { JobApplication } from "@shared/schema";
import { registerChatRoutes } from "./replit_integrations/chat/routes";
import { registerAttachmentRoutes } from "./attachments-routes";

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

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  try {
    const smtp = await getEffectiveSmtpConfig();
    if (!smtp) return false;
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure ?? true,
      auth: { user: smtp.username, pass: smtp.password },
    });
    await transporter.sendMail({ from: `"${smtp.fromName}" <${smtp.fromEmail}>`, to, subject, text });
    return true;
  } catch {
    return false;
  }
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
          const body = `New contact form submission:\n\nName: ${input.name}\nEmail: ${input.email}${input.phone ? `\nPhone: ${input.phone}` : ""}\nService: ${input.service || "Not specified"}\n\nMessage:\n${input.message}\n\n---\nView all messages in the Contact Inbox at /accounting/contact-inbox`;
          await sendEmail(adminEmail, "New Contact Message — MHTSdigiXR", body);
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

  app.post("/api/accounting/employees", requireAuth, requirePermission("employees.manage"), async (req, res) => {
    try {
      const { username, email, password, fullName, role, permissions: userPermissions, phone } = req.body;
      if (req.user!.role !== "super_admin" && (role === "super_admin" || role === "admin")) {
        return res.status(403).json({ message: "Only Super Admin can create Super Admin or Admin accounts" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const { ALL_PERMISSIONS: AP } = await import("@shared/schema");
      const validPerms = Array.isArray(userPermissions) ? userPermissions.filter((p: string) => (AP as readonly string[]).includes(p)) : undefined;
      const employee = await storage.createEmployee({
        username, email, password: hashedPassword, fullName, role,
        permissions: validPerms || null,
        phone: phone || null,
        isActive: true, createdBy: req.user!.id,
      });
      await storage.createAuditLog({
        employeeId: req.user!.id, action: "create", entity: "employee",
        entityId: employee.id, details: `Created employee: ${username} (${role})`,
        ipAddress: req.ip || null,
      });
      const { password: _, ...safe } = employee;
      const baseUrl = req.protocol + "://" + req.get("host");
      const welcomeText = `Hello ${fullName},\n\nYour MHTSdigiXR account has been created.\n\nUsername: ${username}\nPassword: ${password}\nRole: ${role}\nLogin: ${baseUrl}/accounting/login\n\nPlease change your password after first login.\n\nMHTSdigiXR Team`;
      const emailSent = await sendEmail(email, "Welcome to MHTSdigiXR — Your Account Details", welcomeText);
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

    const voucherNumber = await storage.getNextVoucherNumber("sales");
    const voucher = await storage.createVoucher({
      voucherNumber,
      date: new Date().toISOString().split("T")[0],
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
      date: new Date().toISOString().split("T")[0],
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

  app.get("/api/accounting/payroll-employees/:id", requireAuth, requirePermission("payroll_employees.view"), async (req, res) => {
    const employee = await storage.getPayrollEmployee(parseInt(req.params.id));
    if (!employee) return res.status(404).json({ message: "Payroll employee not found" });
    res.json(employee);
  });

  app.post("/api/accounting/payroll-employees", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    const employee = await storage.createPayrollEmployee({ ...req.body, createdBy: req.user!.id });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "payroll_employee",
      entityId: employee.id, details: `Created payroll employee master: ${employee.employeeCode} (${employee.fullName})`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(employee);
  });

  app.patch("/api/accounting/payroll-employees/:id", requireAuth, requirePermission("payroll_employees.manage"), async (req, res) => {
    const updated = await storage.updatePayrollEmployee(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Payroll employee not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "payroll_employee",
      entityId: updated.id, details: `Updated payroll employee master: ${updated.employeeCode}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
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

    const totalDebit = entries.reduce((sum: number, e: any) => sum + parseFloat(e.debit || 0), 0);
    const totalCredit = entries.reduce((sum: number, e: any) => sum + parseFloat(e.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ message: "Total debits must equal total credits" });
    }

    let status = voucherData.status || "pending";
    if (!req.user!.permissions?.includes("vouchers.approve")) status = "draft";

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
    const data = await storage.getBalanceSheet();
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

  app.post("/api/accounting/financial-years", requireAuth, requirePermission("settings.manage"), async (req, res) => {
    const fy = await storage.createFinancialYear(req.body);
    res.status(201).json(fy);
  });

  app.patch("/api/accounting/financial-years/:id", requireAuth, requirePermission("settings.manage"), async (req, res) => {
    const updated = await storage.updateFinancialYear(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Financial year not found" });
    res.json(updated);
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

    res.status(201).json({ ...license, activationCode });
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
