import { db } from "./db";
import {
  contactMessages, posts, services, caseStudies,
  employees, auditLogs, accountGroups, ledgerAccounts,
  financialYears, companySettings, vouchers, voucherEntries, auditNotes,
  type InsertContactMessage, type InsertPost, type InsertService, type InsertCaseStudy,
  type InsertEmployee, type InsertAuditLog, type InsertAccountGroup, type InsertLedgerAccount,
  type InsertFinancialYear, type InsertCompanySettings, type InsertVoucher, type InsertVoucherEntry,
  type InsertAuditNote,
  type ContactMessage, type Post, type Service, type CaseStudy,
  type Employee, type AuditLog, type AccountGroup, type LedgerAccount,
  type FinancialYear, type CompanySettings, type Voucher, type VoucherEntry, type AuditNote
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

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

  getFinancialYears(): Promise<FinancialYear[]>;
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

  getDashboardStats(): Promise<{
    totalIncome: number;
    totalExpenses: number;
    totalReceivables: number;
    totalPayables: number;
    pendingApprovals: number;
    recentVouchers: Voucher[];
  }>;

  getTrialBalance(): Promise<Array<{ accountId: number; accountName: string; groupName: string; debit: number; credit: number }>>;
  getProfitAndLoss(startDate?: string, endDate?: string): Promise<{ income: Array<{ name: string; amount: number }>; expenses: Array<{ name: string; amount: number }>; netProfit: number }>;
  getBalanceSheet(): Promise<{ assets: Array<{ name: string; amount: number }>; liabilities: Array<{ name: string; amount: number }>; capital: Array<{ name: string; amount: number }> }>;
  getDayBook(startDate?: string, endDate?: string): Promise<Voucher[]>;
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

  async getFinancialYears(): Promise<FinancialYear[]> {
    return await db.select().from(financialYears).orderBy(desc(financialYears.startDate));
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
    const prefix = type.charAt(0).toUpperCase();
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(vouchers).where(eq(vouchers.type, type));
    const num = (result?.count || 0) + 1;
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

    const incomeGroups = await db.select().from(accountGroups).where(eq(accountGroups.type, "income"));
    const expenseGroups = await db.select().from(accountGroups).where(eq(accountGroups.type, "expense"));

    const [pendingResult] = await db.select({ count: sql<number>`count(*)` }).from(vouchers).where(eq(vouchers.status, "pending"));
    const pendingApprovals = pendingResult?.count || 0;

    const recentVouchers = await db.select().from(vouchers).orderBy(desc(vouchers.createdAt)).limit(10);

    return {
      totalIncome,
      totalExpenses,
      totalReceivables: 0,
      totalPayables: 0,
      pendingApprovals,
      recentVouchers,
    };
  }

  async getTrialBalance() {
    const accounts = await db.select().from(ledgerAccounts);
    const groups = await db.select().from(accountGroups);
    const groupMap = new Map(groups.map(g => [g.id, g.name]));

    const result = [];
    for (const account of accounts) {
      const entries = await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, account.id));
      let totalDebit = parseFloat(account.openingBalance) > 0 && account.balanceType === "debit" ? parseFloat(account.openingBalance) : 0;
      let totalCredit = parseFloat(account.openingBalance) > 0 && account.balanceType === "credit" ? parseFloat(account.openingBalance) : 0;

      for (const entry of entries) {
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
    const incomeGroup = await db.select().from(accountGroups).where(eq(accountGroups.type, "income"));
    const expenseGroup = await db.select().from(accountGroups).where(eq(accountGroups.type, "expense"));

    const incomeIds = incomeGroup.map(g => g.id);
    const expenseIds = expenseGroup.map(g => g.id);

    const allAccounts = await db.select().from(ledgerAccounts);
    const incomeAccounts = allAccounts.filter(a => incomeIds.includes(a.groupId));
    const expenseAccounts = allAccounts.filter(a => expenseIds.includes(a.groupId));

    const income: Array<{ name: string; amount: number }> = [];
    const expenses: Array<{ name: string; amount: number }> = [];

    for (const account of incomeAccounts) {
      const entries = await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, account.id));
      let amount = 0;
      for (const e of entries) {
        amount += parseFloat(e.credit) - parseFloat(e.debit);
      }
      if (amount !== 0) income.push({ name: account.name, amount });
    }

    for (const account of expenseAccounts) {
      const entries = await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, account.id));
      let amount = 0;
      for (const e of entries) {
        amount += parseFloat(e.debit) - parseFloat(e.credit);
      }
      if (amount !== 0) expenses.push({ name: account.name, amount });
    }

    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return { income, expenses, netProfit: totalIncome - totalExpenses };
  }

  async getBalanceSheet() {
    const groups = await db.select().from(accountGroups);
    const allAccounts = await db.select().from(ledgerAccounts);

    const assetGroups = groups.filter(g => g.type === "asset").map(g => g.id);
    const liabilityGroups = groups.filter(g => g.type === "liability").map(g => g.id);
    const capitalGroups = groups.filter(g => g.type === "capital").map(g => g.id);

    const computeBalances = async (accountIds: number[]) => {
      const result: Array<{ name: string; amount: number }> = [];
      for (const id of accountIds) {
        const account = allAccounts.find(a => a.id === id);
        if (!account) continue;
        const entries = await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, id));
        let amount = parseFloat(account.openingBalance);
        for (const e of entries) {
          amount += parseFloat(e.debit) - parseFloat(e.credit);
        }
        if (amount !== 0) result.push({ name: account.name, amount: Math.abs(amount) });
      }
      return result;
    };

    const assetAccountIds = allAccounts.filter(a => assetGroups.includes(a.groupId)).map(a => a.id);
    const liabilityAccountIds = allAccounts.filter(a => liabilityGroups.includes(a.groupId)).map(a => a.id);
    const capitalAccountIds = allAccounts.filter(a => capitalGroups.includes(a.groupId)).map(a => a.id);

    return {
      assets: await computeBalances(assetAccountIds),
      liabilities: await computeBalances(liabilityAccountIds),
      capital: await computeBalances(capitalAccountIds),
    };
  }

  async getDayBook(startDate?: string, endDate?: string): Promise<Voucher[]> {
    let conditions = [];
    if (startDate) conditions.push(gte(vouchers.date, startDate));
    if (endDate) conditions.push(lte(vouchers.date, endDate));

    if (conditions.length > 0) {
      return await db.select().from(vouchers).where(and(...conditions)).orderBy(desc(vouchers.date));
    }
    return await db.select().from(vouchers).orderBy(desc(vouchers.date));
  }
}

export const storage = new DatabaseStorage();
