import { db } from "./db";
import {
  contactMessages, posts, services, caseStudies,
  employees, auditLogs, accountGroups, ledgerAccounts,
  financialYears, companySettings, vouchers, voucherEntries, auditNotes,
  parties, products, quotations, expenseClaims,
  type InsertContactMessage, type InsertPost, type InsertService, type InsertCaseStudy,
  type InsertEmployee, type InsertAuditLog, type InsertAccountGroup, type InsertLedgerAccount,
  type InsertFinancialYear, type InsertCompanySettings, type InsertVoucher, type InsertVoucherEntry,
  type InsertAuditNote, type InsertParty, type InsertProduct, type InsertQuotation, type InsertExpenseClaim,
  type ContactMessage, type Post, type Service, type CaseStudy,
  type Employee, type AuditLog, type AccountGroup, type LedgerAccount,
  type FinancialYear, type CompanySettings, type Voucher, type VoucherEntry, type AuditNote,
  type Party, type Product, type Quotation, type ExpenseClaim
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, or, inArray } from "drizzle-orm";

export interface IStorage {
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getPosts(): Promise<Post[]>;
  getPost(slug: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  getServices(): Promise<Service[]>;
  getService(slug: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  getCaseStudies(): Promise<CaseStudy[]>;
  createCaseStudy(caseStudy: InsertCaseStudy): Promise<CaseStudy>;

  getEmployeeById(id: number): Promise<Employee | undefined>;
  getEmployeeByUsername(username: string): Promise<Employee | undefined>;
  getEmployees(): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined>;
  updateEmployeeLastLogin(id: number): Promise<void>;

  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { employeeId?: number; action?: string; startDate?: string; endDate?: string }): Promise<AuditLog[]>;

  getAccountGroups(): Promise<AccountGroup[]>;
  createAccountGroup(group: InsertAccountGroup): Promise<AccountGroup>;

  getLedgerAccounts(): Promise<LedgerAccount[]>;
  getLedgerAccount(id: number): Promise<LedgerAccount | undefined>;
  createLedgerAccount(account: InsertLedgerAccount): Promise<LedgerAccount>;
  updateLedgerAccount(id: number, data: Partial<InsertLedgerAccount>): Promise<LedgerAccount | undefined>;
  deleteLedgerAccount(id: number): Promise<boolean>;
  getVoucherEntriesByLedger(ledgerAccountId: number): Promise<VoucherEntry[]>;
  getLedgerStatement(ledgerAccountId: number, startDate?: string, endDate?: string): Promise<Array<{ date: string; voucherNumber: string; type: string; narration: string | null; debit: number; credit: number; balance: number }>>;

  getFinancialYears(): Promise<FinancialYear[]>;
  getActiveFinancialYear(): Promise<FinancialYear | undefined>;
  createFinancialYear(fy: InsertFinancialYear): Promise<FinancialYear>;
  updateFinancialYear(id: number, data: Partial<InsertFinancialYear>): Promise<FinancialYear | undefined>;

  getCompanySettings(): Promise<CompanySettings | undefined>;
  upsertCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;

  getVouchers(filters?: { type?: string; status?: string; startDate?: string; endDate?: string; createdBy?: number }): Promise<Voucher[]>;
  getVoucher(id: number): Promise<Voucher | undefined>;
  createVoucher(voucher: InsertVoucher, entries: InsertVoucherEntry[]): Promise<Voucher>;
  updateVoucherStatus(id: number, status: string, approvedBy?: number): Promise<Voucher | undefined>;
  deleteVoucher(id: number): Promise<boolean>;
  getVoucherEntries(voucherId: number): Promise<VoucherEntry[]>;
  getNextVoucherNumber(type: string): Promise<string>;

  getAuditNotes(entity?: string, entityId?: number): Promise<AuditNote[]>;
  createAuditNote(note: InsertAuditNote): Promise<AuditNote>;

  getParties(type?: string): Promise<Party[]>;
  getParty(id: number): Promise<Party | undefined>;
  createParty(party: InsertParty): Promise<Party>;
  updateParty(id: number, data: Partial<InsertParty>): Promise<Party | undefined>;

  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined>;
  getNextProductCode(category: string): Promise<string>;

  getQuotations(filters?: { status?: string; partyId?: number; createdBy?: number }): Promise<Quotation[]>;
  getQuotation(id: number): Promise<Quotation | undefined>;
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: number, data: Partial<InsertQuotation>): Promise<Quotation | undefined>;
  deleteQuotation(id: number): Promise<boolean>;
  getNextQuotationNumber(): Promise<string>;

  getExpenseClaims(filters?: { employeeId?: number; status?: string }): Promise<ExpenseClaim[]>;
  getExpenseClaim(id: number): Promise<ExpenseClaim | undefined>;
  createExpenseClaim(claim: InsertExpenseClaim): Promise<ExpenseClaim>;
  updateExpenseClaim(id: number, data: Partial<InsertExpenseClaim>): Promise<ExpenseClaim | undefined>;
  deleteExpenseClaim(id: number): Promise<boolean>;
  getNextClaimNumber(): Promise<string>;

  deleteProduct(id: number): Promise<boolean>;
  deleteParty(id: number): Promise<boolean>;

  getDashboardStats(): Promise<{
    totalIncome: number;
    totalExpenses: number;
    totalReceivables: number;
    totalPayables: number;
    pendingApprovals: number;
    cashInHand: number;
    bankBalance: number;
    recentVouchers: Voucher[];
    activeFinancialYear: FinancialYear | null;
  }>;

  getTrialBalance(asOnDate?: string): Promise<Array<{ accountId: number; accountName: string; groupName: string; debit: number; credit: number }>>;
  getProfitAndLoss(startDate?: string, endDate?: string): Promise<{ directIncome: Array<{ name: string; amount: number }>; indirectIncome: Array<{ name: string; amount: number }>; directExpenses: Array<{ name: string; amount: number }>; indirectExpenses: Array<{ name: string; amount: number }>; grossProfit: number; netProfit: number }>;
  getBalanceSheet(): Promise<{ assets: Array<{ name: string; amount: number }>; liabilities: Array<{ name: string; amount: number }>; capital: Array<{ name: string; amount: number }>; netProfit: number }>;
  getDayBook(startDate?: string, endDate?: string, type?: string): Promise<Voucher[]>;
  getGstSummary(startDate?: string, endDate?: string): Promise<{ outputTax: { cgst: number; sgst: number; igst: number; total: number }; inputTax: { cgst: number; sgst: number; igst: number; total: number }; netLiability: number }>;
}

export class DatabaseStorage implements IStorage {
  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [newMessage] = await db.insert(contactMessages).values(message).returning();
    return newMessage;
  }

  async getPosts(): Promise<Post[]> {
    return await db.select().from(posts);
  }

  async getPost(slug: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.slug, slug));
    return post;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async getServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async getService(slug: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.slug, slug));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async getCaseStudies(): Promise<CaseStudy[]> {
    return await db.select().from(caseStudies);
  }

  async createCaseStudy(caseStudy: InsertCaseStudy): Promise<CaseStudy> {
    const [newCaseStudy] = await db.insert(caseStudies).values(caseStudy).returning();
    return newCaseStudy;
  }

  async getEmployeeById(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getEmployeeByUsername(username: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.username, username));
    return employee;
  }

  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(employees.createdAt);
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }

  async updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updated] = await db.update(employees).set(data).where(eq(employees.id, id)).returning();
    return updated;
  }

  async updateEmployeeLastLogin(id: number): Promise<void> {
    await db.update(employees).set({ lastLogin: new Date() }).where(eq(employees.id, id));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(filters?: { employeeId?: number; action?: string; startDate?: string; endDate?: string }): Promise<AuditLog[]> {
    let conditions = [];
    if (filters?.employeeId) conditions.push(eq(auditLogs.employeeId, filters.employeeId));
    if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));
    if (filters?.startDate) conditions.push(gte(auditLogs.createdAt, new Date(filters.startDate)));
    if (filters?.endDate) conditions.push(lte(auditLogs.createdAt, new Date(filters.endDate)));

    if (conditions.length > 0) {
      return await db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.createdAt)).limit(500);
    }
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(500);
  }

  async getAccountGroups(): Promise<AccountGroup[]> {
    return await db.select().from(accountGroups).orderBy(accountGroups.name);
  }

  async createAccountGroup(group: InsertAccountGroup): Promise<AccountGroup> {
    const [newGroup] = await db.insert(accountGroups).values(group).returning();
    return newGroup;
  }

  async getLedgerAccounts(): Promise<LedgerAccount[]> {
    return await db.select().from(ledgerAccounts).orderBy(ledgerAccounts.name);
  }

  async getLedgerAccount(id: number): Promise<LedgerAccount | undefined> {
    const [account] = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.id, id));
    return account;
  }

  async createLedgerAccount(account: InsertLedgerAccount): Promise<LedgerAccount> {
    const [newAccount] = await db.insert(ledgerAccounts).values(account).returning();
    return newAccount;
  }

  async updateLedgerAccount(id: number, data: Partial<InsertLedgerAccount>): Promise<LedgerAccount | undefined> {
    const [updated] = await db.update(ledgerAccounts).set(data).where(eq(ledgerAccounts.id, id)).returning();
    return updated;
  }

  async deleteLedgerAccount(id: number): Promise<boolean> {
    const result = await db.delete(ledgerAccounts).where(eq(ledgerAccounts.id, id)).returning();
    return result.length > 0;
  }

  async getVoucherEntriesByLedger(ledgerAccountId: number): Promise<VoucherEntry[]> {
    return await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, ledgerAccountId));
  }

  async getLedgerStatement(ledgerAccountId: number, startDate?: string, endDate?: string) {
    const account = await this.getLedgerAccount(ledgerAccountId);
    if (!account) return [];

    let conditions: any[] = [eq(voucherEntries.ledgerAccountId, ledgerAccountId)];

    const allEntries = await db.select({
      entryId: voucherEntries.id,
      debit: voucherEntries.debit,
      credit: voucherEntries.credit,
      voucherId: voucherEntries.voucherId,
    }).from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, ledgerAccountId));

    const voucherIds = [...new Set(allEntries.map(e => e.voucherId))];
    if (voucherIds.length === 0) return [];

    let voucherConditions: any[] = [inArray(vouchers.id, voucherIds)];
    if (startDate) voucherConditions.push(gte(vouchers.date, startDate));
    if (endDate) voucherConditions.push(lte(vouchers.date, endDate));

    const voucherList = await db.select().from(vouchers).where(and(...voucherConditions)).orderBy(vouchers.date);

    let balance = parseFloat(account.openingBalance) * (account.balanceType === "credit" ? -1 : 1);
    const result = [];

    for (const v of voucherList) {
      const entries = allEntries.filter(e => e.voucherId === v.id);
      for (const entry of entries) {
        const debit = parseFloat(entry.debit);
        const credit = parseFloat(entry.credit);
        balance += debit - credit;
        result.push({
          date: v.date,
          voucherNumber: v.voucherNumber,
          type: v.type,
          narration: v.narration,
          debit,
          credit,
          balance,
        });
      }
    }
    return result;
  }

  async getFinancialYears(): Promise<FinancialYear[]> {
    return await db.select().from(financialYears).orderBy(desc(financialYears.startDate));
  }

  async getActiveFinancialYear(): Promise<FinancialYear | undefined> {
    const [fy] = await db.select().from(financialYears).where(eq(financialYears.isActive, true));
    return fy;
  }

  async createFinancialYear(fy: InsertFinancialYear): Promise<FinancialYear> {
    const [newFy] = await db.insert(financialYears).values(fy).returning();
    return newFy;
  }

  async updateFinancialYear(id: number, data: Partial<InsertFinancialYear>): Promise<FinancialYear | undefined> {
    const [updated] = await db.update(financialYears).set(data).where(eq(financialYears.id, id)).returning();
    return updated;
  }

  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const [settings] = await db.select().from(companySettings).limit(1);
    return settings;
  }

  async upsertCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings> {
    const existing = await this.getCompanySettings();
    if (existing) {
      const [updated] = await db.update(companySettings).set(settings).where(eq(companySettings.id, existing.id)).returning();
      return updated;
    }
    const [newSettings] = await db.insert(companySettings).values(settings).returning();
    return newSettings;
  }

  async getVouchers(filters?: { type?: string; status?: string; startDate?: string; endDate?: string; createdBy?: number }): Promise<Voucher[]> {
    let conditions = [];
    if (filters?.type) conditions.push(eq(vouchers.type, filters.type));
    if (filters?.status) conditions.push(eq(vouchers.status, filters.status));
    if (filters?.startDate) conditions.push(gte(vouchers.date, filters.startDate));
    if (filters?.endDate) conditions.push(lte(vouchers.date, filters.endDate));
    if (filters?.createdBy) conditions.push(eq(vouchers.createdBy, filters.createdBy));

    if (conditions.length > 0) {
      return await db.select().from(vouchers).where(and(...conditions)).orderBy(desc(vouchers.date));
    }
    return await db.select().from(vouchers).orderBy(desc(vouchers.date));
  }

  async getVoucher(id: number): Promise<Voucher | undefined> {
    const [voucher] = await db.select().from(vouchers).where(eq(vouchers.id, id));
    return voucher;
  }

  async createVoucher(voucher: InsertVoucher, entries: InsertVoucherEntry[]): Promise<Voucher> {
    const [newVoucher] = await db.insert(vouchers).values(voucher).returning();
    for (const entry of entries) {
      await db.insert(voucherEntries).values({ ...entry, voucherId: newVoucher.id });
    }
    return newVoucher;
  }

  async updateVoucherStatus(id: number, status: string, approvedBy?: number): Promise<Voucher | undefined> {
    const data: any = { status };
    if (approvedBy) data.approvedBy = approvedBy;
    const [updated] = await db.update(vouchers).set(data).where(eq(vouchers.id, id)).returning();
    return updated;
  }

  async deleteVoucher(id: number): Promise<boolean> {
    const result = await db.delete(vouchers).where(eq(vouchers.id, id)).returning();
    return result.length > 0;
  }

  async getVoucherEntries(voucherId: number): Promise<VoucherEntry[]> {
    return await db.select().from(voucherEntries).where(eq(voucherEntries.voucherId, voucherId));
  }

  async getNextVoucherNumber(type: string): Promise<string> {
    const prefixMap: Record<string, string> = {
      sales: "S", purchase: "P", payment: "PAY", receipt: "R",
      journal: "J", contra: "C", credit_note: "CN", debit_note: "DN",
    };
    const prefix = prefixMap[type] || type.charAt(0).toUpperCase();
    const prefixPattern = `${prefix}-%`;
    const prefixLen = prefix.length + 1;
    const [result] = await db.select({
      maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(voucher_number FROM ${sql.raw(String(prefixLen + 1))}) AS INTEGER)), 0)`
    }).from(vouchers).where(sql`voucher_number LIKE ${prefixPattern}`);
    const num = (result?.maxNum || 0) + 1;
    return `${prefix}-${String(num).padStart(5, "0")}`;
  }

  async getAuditNotes(entity?: string, entityId?: number): Promise<AuditNote[]> {
    let conditions = [];
    if (entity) conditions.push(eq(auditNotes.entity, entity));
    if (entityId) conditions.push(eq(auditNotes.entityId, entityId));

    if (conditions.length > 0) {
      return await db.select().from(auditNotes).where(and(...conditions)).orderBy(desc(auditNotes.createdAt));
    }
    return await db.select().from(auditNotes).orderBy(desc(auditNotes.createdAt));
  }

  async createAuditNote(note: InsertAuditNote): Promise<AuditNote> {
    const [newNote] = await db.insert(auditNotes).values(note).returning();
    return newNote;
  }

  async getParties(type?: string): Promise<Party[]> {
    if (type) {
      return await db.select().from(parties).where(or(eq(parties.type, type), eq(parties.type, "both"))).orderBy(parties.name);
    }
    return await db.select().from(parties).orderBy(parties.name);
  }

  async getParty(id: number): Promise<Party | undefined> {
    const [party] = await db.select().from(parties).where(eq(parties.id, id));
    return party;
  }

  async createParty(party: InsertParty): Promise<Party> {
    const [newParty] = await db.insert(parties).values(party).returning();
    return newParty;
  }

  async updateParty(id: number, data: Partial<InsertParty>): Promise<Party | undefined> {
    const [updated] = await db.update(parties).set(data).where(eq(parties.id, id)).returning();
    return updated;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(products.name);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  }

  async getNextProductCode(category: string): Promise<string> {
    const prefixMap: Record<string, string> = {
      web_development: "SRV-WEB", mobile_app: "SRV-MOB", seo: "SRV-SEO",
      smm: "SRV-SMM", branding: "SRV-BRD", domain_hosting: "SRV-DOM",
      video_animation: "SRV-VID", digital_marketing: "SRV-DIG",
      ui_ux_design: "SRV-UI", consulting: "SRV-CON", other: "SRV-OTH",
    };
    const prefix = prefixMap[category] || "SRV-OTH";
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.category, category));
    const num = (result?.count || 0) + 1;
    return `${prefix}-${String(num).padStart(3, "0")}`;
  }

  async getQuotations(filters?: { status?: string; partyId?: number; createdBy?: number }): Promise<Quotation[]> {
    let conditions = [];
    if (filters?.status) conditions.push(eq(quotations.status, filters.status));
    if (filters?.partyId) conditions.push(eq(quotations.partyId, filters.partyId));
    if (filters?.createdBy) conditions.push(eq(quotations.createdBy, filters.createdBy));
    if (conditions.length > 0) {
      return await db.select().from(quotations).where(and(...conditions)).orderBy(desc(quotations.date));
    }
    return await db.select().from(quotations).orderBy(desc(quotations.date));
  }

  async getQuotation(id: number): Promise<Quotation | undefined> {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
    return quotation;
  }

  async createQuotation(quotation: InsertQuotation): Promise<Quotation> {
    const [newQuotation] = await db.insert(quotations).values(quotation).returning();
    return newQuotation;
  }

  async updateQuotation(id: number, data: Partial<InsertQuotation>): Promise<Quotation | undefined> {
    const [updated] = await db.update(quotations).set(data).where(eq(quotations.id, id)).returning();
    return updated;
  }

  async deleteQuotation(id: number): Promise<boolean> {
    const result = await db.delete(quotations).where(eq(quotations.id, id)).returning();
    return result.length > 0;
  }

  async getNextQuotationNumber(): Promise<string> {
    const [result] = await db.select({
      maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 5) AS INTEGER)), 0)`
    }).from(quotations);
    const num = (result?.maxNum || 0) + 1;
    return `QTN-${String(num).padStart(5, "0")}`;
  }

  async getExpenseClaims(filters?: { employeeId?: number; status?: string }): Promise<ExpenseClaim[]> {
    let conditions = [];
    if (filters?.employeeId) conditions.push(eq(expenseClaims.employeeId, filters.employeeId));
    if (filters?.status) conditions.push(eq(expenseClaims.status, filters.status));
    if (conditions.length > 0) {
      return await db.select().from(expenseClaims).where(and(...conditions)).orderBy(desc(expenseClaims.createdAt));
    }
    return await db.select().from(expenseClaims).orderBy(desc(expenseClaims.createdAt));
  }

  async getExpenseClaim(id: number): Promise<ExpenseClaim | undefined> {
    const [claim] = await db.select().from(expenseClaims).where(eq(expenseClaims.id, id));
    return claim;
  }

  async createExpenseClaim(claim: InsertExpenseClaim): Promise<ExpenseClaim> {
    const [newClaim] = await db.insert(expenseClaims).values(claim).returning();
    return newClaim;
  }

  async updateExpenseClaim(id: number, data: Partial<InsertExpenseClaim>): Promise<ExpenseClaim | undefined> {
    const [updated] = await db.update(expenseClaims).set(data).where(eq(expenseClaims.id, id)).returning();
    return updated;
  }

  async deleteExpenseClaim(id: number): Promise<boolean> {
    const result = await db.delete(expenseClaims).where(eq(expenseClaims.id, id)).returning();
    return result.length > 0;
  }

  async getNextClaimNumber(): Promise<string> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(expenseClaims);
    const num = (result?.count || 0) + 1;
    return `EXP-${String(num).padStart(5, "0")}`;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  async deleteParty(id: number): Promise<boolean> {
    const result = await db.delete(parties).where(eq(parties.id, id)).returning();
    return result.length > 0;
  }

  async getDashboardStats() {
    const allVouchers = await db.select().from(vouchers).where(eq(vouchers.status, "approved"));

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const v of allVouchers) {
      if (v.type === "sales" || v.type === "receipt") {
        totalIncome += parseFloat(v.totalAmount);
      } else if (v.type === "purchase" || v.type === "payment") {
        totalExpenses += parseFloat(v.totalAmount);
      }
    }

    const groups = await db.select().from(accountGroups);
    const allAccounts = await db.select().from(ledgerAccounts);

    const getAccountBalance = async (name: string) => {
      const account = allAccounts.find(a => a.name === name);
      if (!account) return 0;
      const entries = await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, account.id));
      let balance = parseFloat(account.openingBalance);
      for (const e of entries) {
        balance += parseFloat(e.debit) - parseFloat(e.credit);
      }
      return balance;
    };

    const cashInHand = await getAccountBalance("Cash");
    const bankBalance = await getAccountBalance("Bank Account");

    const debtorAccount = allAccounts.find(a => a.name === "Sundry Debtors");
    const creditorAccount = allAccounts.find(a => a.name === "Sundry Creditors");

    let totalReceivables = 0;
    let totalPayables = 0;

    if (debtorAccount) {
      const entries = await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, debtorAccount.id));
      totalReceivables = parseFloat(debtorAccount.openingBalance);
      for (const e of entries) totalReceivables += parseFloat(e.debit) - parseFloat(e.credit);
    }
    if (creditorAccount) {
      const entries = await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, creditorAccount.id));
      totalPayables = parseFloat(creditorAccount.openingBalance);
      for (const e of entries) totalPayables += parseFloat(e.credit) - parseFloat(e.debit);
    }

    const [pendingResult] = await db.select({ count: sql<number>`count(*)` }).from(vouchers).where(eq(vouchers.status, "pending"));
    const pendingApprovals = pendingResult?.count || 0;

    const recentVouchers = await db.select().from(vouchers).orderBy(desc(vouchers.createdAt)).limit(10);

    const activeFy = await this.getActiveFinancialYear();

    return {
      totalIncome,
      totalExpenses,
      totalReceivables,
      totalPayables,
      pendingApprovals,
      cashInHand,
      bankBalance,
      recentVouchers,
      activeFinancialYear: activeFy || null,
    };
  }

  async getTrialBalance(asOnDate?: string) {
    const accounts = await db.select().from(ledgerAccounts);
    const groups = await db.select().from(accountGroups);
    const groupMap = new Map(groups.map(g => [g.id, g.name]));

    const result = [];
    for (const account of accounts) {
      let entryConditions: any[] = [eq(voucherEntries.ledgerAccountId, account.id)];
      const entries = await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, account.id));

      let filteredEntries = entries;
      if (asOnDate) {
        const voucherList = await db.select().from(vouchers).where(lte(vouchers.date, asOnDate));
        const validIds = new Set(voucherList.map(v => v.id));
        filteredEntries = entries.filter(e => validIds.has(e.voucherId));
      }

      let totalDebit = parseFloat(account.openingBalance) > 0 && account.balanceType === "debit" ? parseFloat(account.openingBalance) : 0;
      let totalCredit = parseFloat(account.openingBalance) > 0 && account.balanceType === "credit" ? parseFloat(account.openingBalance) : 0;

      for (const entry of filteredEntries) {
        totalDebit += parseFloat(entry.debit);
        totalCredit += parseFloat(entry.credit);
      }

      if (totalDebit > 0 || totalCredit > 0) {
        result.push({
          accountId: account.id,
          accountName: account.name,
          groupName: groupMap.get(account.groupId) || "Unknown",
          debit: totalDebit,
          credit: totalCredit,
        });
      }
    }
    return result;
  }

  async getProfitAndLoss(startDate?: string, endDate?: string) {
    const groups = await db.select().from(accountGroups);
    const allAccounts = await db.select().from(ledgerAccounts);

    const directIncomeIds = groups.filter(g => g.name === "Direct Income").map(g => g.id);
    const indirectIncomeIds = groups.filter(g => g.name === "Indirect Income").map(g => g.id);
    const directExpenseIds = groups.filter(g => g.name === "Direct Expenses").map(g => g.id);
    const indirectExpenseIds = groups.filter(g => g.name === "Indirect Expenses").map(g => g.id);

    const getAmounts = async (groupIds: number[], isIncome: boolean) => {
      const accounts = allAccounts.filter(a => groupIds.includes(a.groupId));
      const result: Array<{ name: string; amount: number }> = [];
      for (const account of accounts) {
        const entries = await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, account.id));

        let filteredEntries = entries;
        if (startDate || endDate) {
          let vConds: any[] = [];
          if (startDate) vConds.push(gte(vouchers.date, startDate));
          if (endDate) vConds.push(lte(vouchers.date, endDate));
          const vList = await db.select().from(vouchers).where(and(...vConds));
          const validIds = new Set(vList.map(v => v.id));
          filteredEntries = entries.filter(e => validIds.has(e.voucherId));
        }

        let amount = 0;
        for (const e of filteredEntries) {
          amount += isIncome
            ? parseFloat(e.credit) - parseFloat(e.debit)
            : parseFloat(e.debit) - parseFloat(e.credit);
        }
        if (amount !== 0) result.push({ name: account.name, amount });
      }
      return result;
    };

    const directIncome = await getAmounts(directIncomeIds, true);
    const indirectIncome = await getAmounts(indirectIncomeIds, true);
    const directExpenses = await getAmounts(directExpenseIds, false);
    const indirectExpenses = await getAmounts(indirectExpenseIds, false);

    const totalDirectIncome = directIncome.reduce((sum, i) => sum + i.amount, 0);
    const totalIndirectIncome = indirectIncome.reduce((sum, i) => sum + i.amount, 0);
    const totalDirectExpenses = directExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIndirectExpenses = indirectExpenses.reduce((sum, e) => sum + e.amount, 0);

    const grossProfit = totalDirectIncome - totalDirectExpenses;
    const netProfit = grossProfit + totalIndirectIncome - totalIndirectExpenses;

    return { directIncome, indirectIncome, directExpenses, indirectExpenses, grossProfit, netProfit };
  }

  async getBalanceSheet() {
    const groups = await db.select().from(accountGroups);
    const allAccounts = await db.select().from(ledgerAccounts);

    const assetGroups = groups.filter(g => g.type === "asset").map(g => g.id);
    const liabilityGroups = groups.filter(g => g.type === "liability").map(g => g.id);
    const capitalGroups = groups.filter(g => g.type === "capital").map(g => g.id);

    const computeBalances = async (groupIds: number[]) => {
      const accounts = allAccounts.filter(a => groupIds.includes(a.groupId));
      const result: Array<{ name: string; amount: number }> = [];
      for (const account of accounts) {
        const entries = await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, account.id));
        let amount = parseFloat(account.openingBalance);
        for (const e of entries) {
          amount += parseFloat(e.debit) - parseFloat(e.credit);
        }
        if (amount !== 0) result.push({ name: account.name, amount: Math.abs(amount) });
      }
      return result;
    };

    const pnl = await this.getProfitAndLoss();

    return {
      assets: await computeBalances(assetGroups),
      liabilities: await computeBalances(liabilityGroups),
      capital: await computeBalances(capitalGroups),
      netProfit: pnl.netProfit,
    };
  }

  async getDayBook(startDate?: string, endDate?: string, type?: string): Promise<Voucher[]> {
    let conditions = [];
    if (startDate) conditions.push(gte(vouchers.date, startDate));
    if (endDate) conditions.push(lte(vouchers.date, endDate));
    if (type) conditions.push(eq(vouchers.type, type));

    if (conditions.length > 0) {
      return await db.select().from(vouchers).where(and(...conditions)).orderBy(desc(vouchers.date));
    }
    return await db.select().from(vouchers).orderBy(desc(vouchers.date));
  }

  async getGstSummary(startDate?: string, endDate?: string) {
    let conditions: any[] = [eq(vouchers.status, "approved")];
    if (startDate) conditions.push(gte(vouchers.date, startDate));
    if (endDate) conditions.push(lte(vouchers.date, endDate));

    const allVouchers = await db.select().from(vouchers).where(and(...conditions));

    const outputTax = { cgst: 0, sgst: 0, igst: 0, total: 0 };
    const inputTax = { cgst: 0, sgst: 0, igst: 0, total: 0 };

    for (const v of allVouchers) {
      const cgst = parseFloat(v.cgstAmount || "0");
      const sgst = parseFloat(v.sgstAmount || "0");
      const igst = parseFloat(v.igstAmount || "0");

      if (v.type === "sales" || v.type === "credit_note") {
        outputTax.cgst += cgst;
        outputTax.sgst += sgst;
        outputTax.igst += igst;
      } else if (v.type === "purchase" || v.type === "debit_note") {
        inputTax.cgst += cgst;
        inputTax.sgst += sgst;
        inputTax.igst += igst;
      }
    }

    outputTax.total = outputTax.cgst + outputTax.sgst + outputTax.igst;
    inputTax.total = inputTax.cgst + inputTax.sgst + inputTax.igst;

    return {
      outputTax,
      inputTax,
      netLiability: outputTax.total - inputTax.total,
    };
  }
}

export const storage = new DatabaseStorage();
