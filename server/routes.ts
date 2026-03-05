import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth, requireRole } from "./auth";
import { registerChatRoutes } from "./replit_integrations/chat/routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  registerChatRoutes(app);

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
    const posts = await storage.getPosts();
    res.json(posts);
  });

  app.get(api.posts.get.path, async (req, res) => {
    const post = await storage.getPost(req.params.slug);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  });

  app.get(api.caseStudies.list.path, async (req, res) => {
    const studies = await storage.getCaseStudies();
    res.json(studies);
  });

  app.post(api.contact.create.path, async (req, res) => {
    try {
      const input = api.contact.create.input.parse(req.body);
      const message = await storage.createContactMessage(input);
      res.status(201).json(message);
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

  // ===== ACCOUNTING API ROUTES (Protected) =====

  // Dashboard
  app.get("/api/accounting/dashboard", requireAuth, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // Employees
  app.get("/api/accounting/employees", requireAuth, requireRole("super_admin", "admin"), async (req, res) => {
    const allEmployees = await storage.getEmployees();
    const safeEmployees = allEmployees.map(({ password, ...rest }) => rest);
    if (req.user!.role === "admin") {
      return res.json(safeEmployees.filter(e => e.role !== "super_admin"));
    }
    res.json(safeEmployees);
  });

  app.post("/api/accounting/employees", requireAuth, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const { username, email, password, fullName, role } = req.body;
      if (req.user!.role === "admin" && (role === "super_admin" || role === "admin")) {
        return res.status(403).json({ message: "Admin cannot create Super Admin or Admin accounts" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const employee = await storage.createEmployee({
        username, email, password: hashedPassword, fullName, role,
        isActive: true, createdBy: req.user!.id,
      });
      await storage.createAuditLog({
        employeeId: req.user!.id, action: "create", entity: "employee",
        entityId: employee.id, details: `Created employee: ${username} (${role})`,
        ipAddress: req.ip || null,
      });
      const { password: _, ...safe } = employee;
      res.status(201).json(safe);
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(400).json({ message: "Username or email already exists" });
      }
      throw err;
    }
  });

  app.patch("/api/accounting/employees/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res) => {
    const id = parseInt(req.params.id);
    const target = await storage.getEmployeeById(id);
    if (!target) return res.status(404).json({ message: "Employee not found" });

    if (req.user!.role === "admin" && (target.role === "super_admin" || target.role === "admin")) {
      return res.status(403).json({ message: "Cannot modify this account" });
    }

    const data: any = {};
    if (req.body.fullName) data.fullName = req.body.fullName;
    if (req.body.email) data.email = req.body.email;
    if (req.body.role) {
      if (req.user!.role === "admin" && (req.body.role === "super_admin" || req.body.role === "admin")) {
        return res.status(403).json({ message: "Cannot assign this role" });
      }
      data.role = req.body.role;
    }
    if (typeof req.body.isActive === "boolean") data.isActive = req.body.isActive;
    if (req.body.password) data.password = await bcrypt.hash(req.body.password, 10);

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
  app.get("/api/accounting/account-groups", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const groups = await storage.getAccountGroups();
    res.json(groups);
  });

  // Ledger Accounts
  app.get("/api/accounting/ledgers", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const accounts = await storage.getLedgerAccounts();
    res.json(accounts);
  });

  app.get("/api/accounting/ledgers/:id", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const account = await storage.getLedgerAccount(parseInt(req.params.id));
    if (!account) return res.status(404).json({ message: "Ledger account not found" });
    res.json(account);
  });

  app.post("/api/accounting/ledgers", requireAuth, requireRole("super_admin", "admin", "senior_accountant"), async (req, res) => {
    const account = await storage.createLedgerAccount({ ...req.body, createdBy: req.user!.id });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "ledger",
      entityId: account.id, details: `Created ledger: ${account.name}`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(account);
  });

  app.patch("/api/accounting/ledgers/:id", requireAuth, requireRole("super_admin", "admin", "senior_accountant"), async (req, res) => {
    const updated = await storage.updateLedgerAccount(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Ledger account not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "ledger",
      entityId: updated.id, details: `Updated ledger: ${updated.name}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/ledgers/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res) => {
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

  // Vouchers
  app.get("/api/accounting/vouchers", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant", "data_entry"), async (req, res) => {
    const filters: any = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;
    if (req.user!.role === "data_entry") filters.createdBy = req.user!.id;

    const voucherList = await storage.getVouchers(filters);
    res.json(voucherList);
  });

  app.get("/api/accounting/vouchers/:id", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant", "data_entry"), async (req, res) => {
    const voucher = await storage.getVoucher(parseInt(req.params.id));
    if (!voucher) return res.status(404).json({ message: "Voucher not found" });
    if (req.user!.role === "data_entry" && voucher.createdBy !== req.user!.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    const entries = await storage.getVoucherEntries(voucher.id);
    res.json({ ...voucher, entries });
  });

  app.get("/api/accounting/vouchers/next-number/:type", requireAuth, async (req, res) => {
    const number = await storage.getNextVoucherNumber(req.params.type);
    res.json({ voucherNumber: number });
  });

  app.post("/api/accounting/vouchers", requireAuth, requireRole("super_admin", "admin", "senior_accountant", "accountant", "data_entry"), async (req, res) => {
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
    if (req.user!.role === "data_entry") status = "draft";

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

  app.patch("/api/accounting/vouchers/:id/status", requireAuth, requireRole("super_admin", "admin", "senior_accountant"), async (req, res) => {
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

  app.delete("/api/accounting/vouchers/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res) => {
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
  app.get("/api/accounting/reports/trial-balance", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const data = await storage.getTrialBalance();
    res.json(data);
  });

  app.get("/api/accounting/reports/profit-loss", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const data = await storage.getProfitAndLoss(req.query.startDate as string, req.query.endDate as string);
    res.json(data);
  });

  app.get("/api/accounting/reports/balance-sheet", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const data = await storage.getBalanceSheet();
    res.json(data);
  });

  app.get("/api/accounting/reports/day-book", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const data = await storage.getDayBook(req.query.startDate as string, req.query.endDate as string);
    res.json(data);
  });

  // Financial Years
  app.get("/api/accounting/financial-years", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const years = await storage.getFinancialYears();
    res.json(years);
  });

  app.post("/api/accounting/financial-years", requireAuth, requireRole("super_admin"), async (req, res) => {
    const fy = await storage.createFinancialYear(req.body);
    res.status(201).json(fy);
  });

  app.patch("/api/accounting/financial-years/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    const updated = await storage.updateFinancialYear(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Financial year not found" });
    res.json(updated);
  });

  // Company Settings
  app.get("/api/accounting/company-settings", requireAuth, requireRole("super_admin", "admin", "auditor"), async (req, res) => {
    const settings = await storage.getCompanySettings();
    res.json(settings || {});
  });

  app.put("/api/accounting/company-settings", requireAuth, requireRole("super_admin"), async (req, res) => {
    const settings = await storage.upsertCompanySettings(req.body);
    res.json(settings);
  });

  // Audit Logs
  app.get("/api/accounting/audit-logs", requireAuth, requireRole("super_admin", "admin", "auditor"), async (req, res) => {
    const filters: any = {};
    if (req.query.employeeId) filters.employeeId = parseInt(req.query.employeeId as string);
    if (req.query.action) filters.action = req.query.action;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;
    const logs = await storage.getAuditLogs(filters);
    res.json(logs);
  });

  // Audit Notes
  app.get("/api/accounting/audit-notes", requireAuth, requireRole("super_admin", "admin", "auditor"), async (req, res) => {
    const notes = await storage.getAuditNotes(req.query.entity as string, req.query.entityId ? parseInt(req.query.entityId as string) : undefined);
    res.json(notes);
  });

  app.post("/api/accounting/audit-notes", requireAuth, requireRole("auditor"), async (req, res) => {
    const note = await storage.createAuditNote({ ...req.body, auditorId: req.user!.id });
    res.status(201).json(note);
  });

  // Seed data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const servicesList = await storage.getServices();
  if (servicesList.length === 0) {
    const services = [
      { title: "Domain & Hosting", slug: "domain-hosting", description: "Reliable domain registration and web hosting solutions for your business.", icon: "Globe", image: "https://images.unsplash.com/photo-1558494949-efdeb6bf80d1?auto=format&fit=crop&q=80&w=1000", features: ["SSL Certificates", "24/7 Support", "99.9% Uptime", "Scalable Infrastructure"] },
      { title: "Website Development", slug: "web-development", description: "Custom website development for corporate businesses and startups.", icon: "Code", image: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&q=80&w=1000", features: ["Responsive Design", "Custom CMS", "E-commerce Solutions", "Performance Optimization"] },
      { title: "Logo & Graphic Design", slug: "graphic-design", description: "Creative and unique content creation and brand identity development.", icon: "Palette", image: "https://images.unsplash.com/photo-1626785774573-4b7993125486?auto=format&fit=crop&q=80&w=1000", features: ["Logo Design", "Brand Identity", "Marketing Materials", "Social Media Graphics"] },
      { title: "UI/UX Design", slug: "ui-ux-design", description: "User-focused design approach to enhance customer experience.", icon: "Layout", image: "https://images.unsplash.com/photo-1586717791821-3f44a5638d0f?auto=format&fit=crop&q=80&w=1000", features: ["User Research", "Wireframing", "Prototyping", "Usability Testing"] },
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

  // Seed Super Admin
  const existingAdmin = await storage.getEmployeeByUsername("superadmin");
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await storage.createEmployee({
      username: "superadmin",
      email: "admin@mhtsdigix.com",
      password: hashedPassword,
      fullName: "Super Administrator",
      role: "super_admin",
      isActive: true,
      createdBy: null,
    });
  }

  // Seed Account Groups
  const groups = await storage.getAccountGroups();
  if (groups.length === 0) {
    const defaultGroups = [
      { name: "Current Assets", type: "asset", description: "Short-term assets" },
      { name: "Fixed Assets", type: "asset", description: "Long-term assets" },
      { name: "Current Liabilities", type: "liability", description: "Short-term obligations" },
      { name: "Long-term Liabilities", type: "liability", description: "Long-term obligations" },
      { name: "Capital Account", type: "capital", description: "Owner's equity" },
      { name: "Direct Income", type: "income", description: "Revenue from primary operations" },
      { name: "Indirect Income", type: "income", description: "Revenue from secondary sources" },
      { name: "Direct Expenses", type: "expense", description: "Costs directly tied to operations" },
      { name: "Indirect Expenses", type: "expense", description: "Overhead and administrative costs" },
    ];
    const createdGroups: Record<string, number> = {};
    for (const group of defaultGroups) {
      const created = await storage.createAccountGroup(group);
      createdGroups[group.name] = created.id;
    }

    // Seed default ledger accounts
    const defaultAccounts = [
      { name: "Cash", groupId: createdGroups["Current Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Bank Account", groupId: createdGroups["Current Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Sundry Debtors", groupId: createdGroups["Current Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Stock-in-Hand", groupId: createdGroups["Current Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Furniture & Fixtures", groupId: createdGroups["Fixed Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Computer & Equipment", groupId: createdGroups["Fixed Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Sundry Creditors", groupId: createdGroups["Current Liabilities"], openingBalance: "0", balanceType: "credit" as const },
      { name: "GST Payable", groupId: createdGroups["Current Liabilities"], openingBalance: "0", balanceType: "credit" as const },
      { name: "GST Receivable", groupId: createdGroups["Current Assets"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Sales Account", groupId: createdGroups["Direct Income"], openingBalance: "0", balanceType: "credit" as const },
      { name: "Service Revenue", groupId: createdGroups["Direct Income"], openingBalance: "0", balanceType: "credit" as const },
      { name: "Interest Income", groupId: createdGroups["Indirect Income"], openingBalance: "0", balanceType: "credit" as const },
      { name: "Purchase Account", groupId: createdGroups["Direct Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Salary & Wages", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Rent", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Electricity", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Telephone & Internet", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Office Supplies", groupId: createdGroups["Indirect Expenses"], openingBalance: "0", balanceType: "debit" as const },
      { name: "Capital", groupId: createdGroups["Capital Account"], openingBalance: "0", balanceType: "credit" as const },
    ];
    for (const account of defaultAccounts) {
      await storage.createLedgerAccount(account);
    }
  }

  // Seed default company settings
  const settings = await storage.getCompanySettings();
  if (!settings) {
    await storage.upsertCompanySettings({
      companyName: "Maanagarram Hi Tech Solutions",
      address: "Chennai, Tamil Nadu, India",
      gstin: "",
      phone: "+91 4447740195",
      email: "info@mhtsdigix.com",
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
}
