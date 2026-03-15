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

  app.get("/api/accounting/ledgers/:id/statement", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const statement = await storage.getLedgerStatement(
      parseInt(req.params.id),
      req.query.startDate as string,
      req.query.endDate as string
    );
    res.json(statement);
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

  // Parties (Customers/Vendors)
  app.get("/api/accounting/parties", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const partyList = await storage.getParties(req.query.type as string);
    res.json(partyList);
  });

  app.get("/api/accounting/parties/:id", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const party = await storage.getParty(parseInt(req.params.id));
    if (!party) return res.status(404).json({ message: "Party not found" });
    res.json(party);
  });

  app.post("/api/accounting/parties", requireAuth, requireRole("super_admin", "admin", "senior_accountant", "accountant"), async (req, res) => {
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

  app.patch("/api/accounting/parties/:id", requireAuth, requireRole("super_admin", "admin", "senior_accountant"), async (req, res) => {
    const updated = await storage.updateParty(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Party not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "party",
      entityId: updated.id, details: `Updated party: ${updated.name}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/parties/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res) => {
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
  app.get("/api/accounting/products", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const productList = await storage.getProducts();
    res.json(productList);
  });

  app.get("/api/accounting/products/:id", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const product = await storage.getProduct(parseInt(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.get("/api/accounting/products/next-code/:category", requireAuth, async (req, res) => {
    const code = await storage.getNextProductCode(req.params.category);
    res.json({ productCode: code });
  });

  app.post("/api/accounting/products", requireAuth, requireRole("super_admin", "admin", "senior_accountant"), async (req, res) => {
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

  app.patch("/api/accounting/products/:id", requireAuth, requireRole("super_admin", "admin", "senior_accountant"), async (req, res) => {
    const updated = await storage.updateProduct(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Product not found" });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "update", entity: "product",
      entityId: updated.id, details: `Updated product: ${updated.name}`,
      ipAddress: req.ip || null,
    });
    res.json(updated);
  });

  app.delete("/api/accounting/products/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res) => {
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
  app.get("/api/accounting/quotations", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant", "data_entry"), async (req, res) => {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.partyId) filters.partyId = parseInt(req.query.partyId as string);
    if (req.user!.role === "data_entry") filters.createdBy = req.user!.id;
    const quotationList = await storage.getQuotations(filters);
    res.json(quotationList);
  });

  app.get("/api/accounting/quotations/next-number", requireAuth, async (req, res) => {
    const number = await storage.getNextQuotationNumber();
    res.json({ quotationNumber: number });
  });

  app.get("/api/accounting/quotations/:id", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const quotation = await storage.getQuotation(parseInt(req.params.id));
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    res.json(quotation);
  });

  app.post("/api/accounting/quotations", requireAuth, requireRole("super_admin", "admin", "senior_accountant", "accountant", "data_entry"), async (req, res) => {
    const quotation = await storage.createQuotation({ ...req.body, createdBy: req.user!.id, assignedTo: req.body.assignedTo || req.user!.id });
    await storage.createAuditLog({
      employeeId: req.user!.id, action: "create", entity: "quotation",
      entityId: quotation.id, details: `Created quotation: ${quotation.quotationNumber}`,
      ipAddress: req.ip || null,
    });
    res.status(201).json(quotation);
  });

  app.patch("/api/accounting/quotations/:id", requireAuth, requireRole("super_admin", "admin", "senior_accountant", "accountant"), async (req, res) => {
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

  app.delete("/api/accounting/quotations/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res) => {
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

  app.post("/api/accounting/quotations/:id/submit", requireAuth, requireRole("super_admin", "admin", "senior_accountant", "accountant", "data_entry"), async (req, res) => {
    const quotation = await storage.getQuotation(parseInt(req.params.id));
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    if (quotation.status !== "draft") return res.status(400).json({ message: "Only draft quotations can be submitted" });
    const isManager = req.user!.role === "super_admin" || req.user!.role === "admin" || req.user!.role === "senior_accountant";
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

  app.post("/api/accounting/quotations/:id/approve", requireAuth, requireRole("super_admin", "admin", "senior_accountant"), async (req, res) => {
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

  app.post("/api/accounting/quotations/:id/reject", requireAuth, requireRole("super_admin", "admin", "senior_accountant"), async (req, res) => {
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

  app.post("/api/accounting/quotations/:id/convert", requireAuth, requireRole("super_admin", "admin", "senior_accountant"), async (req, res) => {
    const quotation = await storage.getQuotation(parseInt(req.params.id));
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    if (quotation.status === "converted") return res.status(400).json({ message: "Quotation already converted" });

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
  app.get("/api/accounting/expenses", requireAuth, async (req, res) => {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.user!.role === "data_entry" || req.user!.role === "viewer") {
      filters.employeeId = req.user!.id;
    } else if (req.query.employeeId) {
      filters.employeeId = parseInt(req.query.employeeId as string);
    }
    const claims = await storage.getExpenseClaims(filters);
    res.json(claims);
  });

  app.get("/api/accounting/expenses/next-number", requireAuth, async (req, res) => {
    const number = await storage.getNextClaimNumber();
    res.json({ claimNumber: number });
  });

  app.get("/api/accounting/expenses/:id", requireAuth, async (req, res) => {
    const claim = await storage.getExpenseClaim(parseInt(req.params.id));
    if (!claim) return res.status(404).json({ message: "Expense claim not found" });
    if ((req.user!.role === "data_entry" || req.user!.role === "viewer") && claim.employeeId !== req.user!.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    res.json(claim);
  });

  app.post("/api/accounting/expenses", requireAuth, async (req, res) => {
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

  app.patch("/api/accounting/expenses/:id", requireAuth, requireRole("super_admin", "admin", "senior_accountant"), async (req, res) => {
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

  app.delete("/api/accounting/expenses/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res) => {
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

  app.get("/api/accounting/vouchers/next-number/:type", requireAuth, async (req, res) => {
    const number = await storage.getNextVoucherNumber(req.params.type);
    res.json({ voucherNumber: number });
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
    const data = await storage.getTrialBalance(req.query.asOnDate as string);
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
    const data = await storage.getDayBook(req.query.startDate as string, req.query.endDate as string, req.query.type as string);
    res.json(data);
  });

  app.get("/api/accounting/reports/gst-summary", requireAuth, requireRole("super_admin", "admin", "auditor", "senior_accountant", "accountant"), async (req, res) => {
    const data = await storage.getGstSummary(req.query.startDate as string, req.query.endDate as string);
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

  // Seed default company settings
  const settings = await storage.getCompanySettings();
  if (!settings) {
    await storage.upsertCompanySettings({
      companyName: "Maanagarram Hi Tech Solutions",
      address: "Chennai, Tamil Nadu, India",
      gstin: "",
      phone: "+91 4447740195",
      email: "info@mhtsdigix.com",
      state: "Tamil Nadu",
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
