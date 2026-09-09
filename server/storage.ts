import { db } from "./db";
import {
  contactMessages, posts, services, caseStudies, pricingPlans, legalPages,
  employees, auditLogs, accountGroups, ledgerAccounts,
  financialYears, companySettings, vouchers, voucherEntries, auditNotes, attachments,
  parties, products, quotations, expenseClaims, roles,
  jobPostings, jobApplications, faqItems, testimonials, siteStats,
  smtpSettings, passwordResetTokens,
  type InsertContactMessage, type InsertPost, type InsertService, type InsertCaseStudy,
  type InsertPricingPlan, type InsertLegalPage,
  type InsertEmployee, type InsertAuditLog, type InsertAccountGroup, type InsertLedgerAccount,
  type InsertFinancialYear, type InsertCompanySettings, type InsertVoucher, type InsertVoucherEntry,
  type InsertAuditNote, type InsertAttachment, type InsertParty, type InsertProduct, type InsertQuotation, type InsertExpenseClaim,
  type InsertDbRole, type InsertJobPosting, type InsertJobApplication,
  type InsertFaqItem, type InsertTestimonial, type InsertSiteStat,
  type InsertSmtpSettings, type InsertPasswordResetToken,
  type ContactMessage, type Post, type Service, type CaseStudy, type PricingPlan, type LegalPage,
  type Employee, type AuditLog, type AccountGroup, type LedgerAccount,
  type FinancialYear, type CompanySettings, type Voucher, type VoucherEntry, type AuditNote, type Attachment,
  type Party, type Product, type Quotation, type ExpenseClaim, type DbRole,
  type JobPosting, type JobApplication, type FaqItem, type Testimonial, type SiteStat,
  type SmtpSettings, type PasswordResetToken,
  erpLicenses, erpLicenseActivations,
  type InsertErpLicense, type InsertErpLicenseActivation,
  type ErpLicense, type ErpLicenseActivation,
  tutors, tutorAgreements, tutorPayslips, payrollEmployees, payrollStatutoryConfigVersions,
  type InsertTutor, type InsertTutorAgreement, type InsertTutorPayslip, type InsertPayrollEmployee, type InsertPayrollStatutoryConfigVersion,
  type Tutor, type TutorAgreement, type TutorPayslip, type PayrollEmployee, type PayrollStatutoryConfigVersion,
  emailTemplates, type InsertEmailTemplate, type EmailTemplate,
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
  updateService(id: number, data: Partial<Service>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;

  getPricingPlans(activeOnly?: boolean): Promise<PricingPlan[]>;
  getPricingPlan(id: number): Promise<PricingPlan | undefined>;
  createPricingPlan(plan: InsertPricingPlan): Promise<PricingPlan>;
  updatePricingPlan(id: number, data: Partial<PricingPlan>): Promise<PricingPlan | undefined>;
  deletePricingPlan(id: number): Promise<boolean>;
  getCaseStudies(): Promise<CaseStudy[]>;
  createCaseStudy(caseStudy: InsertCaseStudy): Promise<CaseStudy>;

  getRoles(): Promise<DbRole[]>;
  getRoleBySlug(slug: string): Promise<DbRole | undefined>;
  createRole(role: InsertDbRole): Promise<DbRole>;
  updateRole(id: number, data: Partial<InsertDbRole>): Promise<DbRole | undefined>;
  deleteRole(id: number): Promise<boolean>;

  getEmployeeById(id: number): Promise<Employee | undefined>;
  getEmployeeByUsername(username: string): Promise<Employee | undefined>;
  getEmployees(): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined>;
  updateEmployeeLastLogin(id: number): Promise<void>;
  updateEmployeePasswordChangedAt(id: number): Promise<void>;
  updateEmployeePassword(id: number, hashedPassword: string): Promise<void>;

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
  activateFinancialYear(id: number): Promise<FinancialYear | undefined>;

  getCompanySettings(): Promise<CompanySettings | undefined>;
  upsertCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;

  getLegalPages(): Promise<LegalPage[]>;
  getLegalPageBySlug(slug: string): Promise<LegalPage | undefined>;
  upsertLegalPage(data: InsertLegalPage): Promise<LegalPage>;
  updateLegalPage(slug: string, data: Partial<InsertLegalPage>): Promise<LegalPage | undefined>;
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplateByKey(key: string): Promise<EmailTemplate | undefined>;
  updateEmailTemplate(key: string, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;

  getVouchers(filters?: { type?: string; status?: string; startDate?: string; endDate?: string; createdBy?: number }): Promise<Voucher[]>;
  getVoucher(id: number): Promise<Voucher | undefined>;
  createVoucher(voucher: InsertVoucher, entries: InsertVoucherEntry[]): Promise<Voucher>;
  updateVoucherStatus(id: number, status: string, approvedBy?: number): Promise<Voucher | undefined>;
  deleteVoucher(id: number): Promise<boolean>;
  getVoucherEntries(voucherId: number): Promise<VoucherEntry[]>;
  getNextVoucherNumber(type: string): Promise<string>;

  getAuditNotes(entity?: string, entityId?: number): Promise<AuditNote[]>;
  createAuditNote(note: InsertAuditNote): Promise<AuditNote>;

  getAttachmentsByEntity(entityType: string, entityId: number): Promise<Attachment[]>;
  getAttachment(id: number): Promise<Attachment | undefined>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  deleteAttachment(id: number): Promise<boolean>;

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

  getTutors(filters?: { status?: string }): Promise<Tutor[]>;
  getTutor(id: number): Promise<Tutor | undefined>;
  getTutorByLoginEmployeeId(employeeId: number): Promise<Tutor | undefined>;
  createTutor(tutor: InsertTutor): Promise<Tutor>;
  updateTutor(id: number, data: Partial<InsertTutor>): Promise<Tutor | undefined>;
  deleteTutor(id: number): Promise<boolean>;
  getNextTutorCode(): Promise<string>;

  getTutorAgreements(filters?: { tutorId?: number }): Promise<TutorAgreement[]>;
  getTutorAgreement(id: number): Promise<TutorAgreement | undefined>;
  createTutorAgreement(agreement: InsertTutorAgreement): Promise<TutorAgreement>;
  updateTutorAgreement(id: number, data: Partial<InsertTutorAgreement>): Promise<TutorAgreement | undefined>;
  deleteTutorAgreement(id: number): Promise<boolean>;
  getNextAgreementRef(): Promise<string>;

  getTutorPayslips(filters?: { tutorId?: number; agreementId?: number; status?: string }): Promise<TutorPayslip[]>;
  getTutorPayslip(id: number): Promise<TutorPayslip | undefined>;
  createTutorPayslip(payslip: InsertTutorPayslip): Promise<TutorPayslip>;
  updateTutorPayslip(id: number, data: Partial<InsertTutorPayslip>): Promise<TutorPayslip | undefined>;

  getPayrollEmployees(filters?: { status?: string }): Promise<PayrollEmployee[]>;
  getPayrollEmployee(id: number): Promise<PayrollEmployee | undefined>;
  createPayrollEmployee(employee: InsertPayrollEmployee): Promise<PayrollEmployee>;
  updatePayrollEmployee(id: number, data: Partial<InsertPayrollEmployee>): Promise<PayrollEmployee | undefined>;

  getPayrollStatutoryConfigVersions(): Promise<PayrollStatutoryConfigVersion[]>;
  createPayrollStatutoryConfigVersion(version: InsertPayrollStatutoryConfigVersion): Promise<PayrollStatutoryConfigVersion>;
  getNextClaimNumber(): Promise<string>;

  deleteProduct(id: number): Promise<boolean>;
  deleteParty(id: number): Promise<boolean>;

  getJobPostings(filters?: { status?: string }): Promise<JobPosting[]>;
  getJobPosting(id: number): Promise<JobPosting | undefined>;
  createJobPosting(posting: InsertJobPosting): Promise<JobPosting>;
  updateJobPosting(id: number, data: Partial<JobPosting>): Promise<JobPosting | undefined>;
  deleteJobPosting(id: number): Promise<boolean>;
  countJobApplications(jobPostingId: number): Promise<number>;

  getJobApplications(filters?: { jobPostingId?: number; status?: string }): Promise<JobApplication[]>;
  getJobApplication(id: number): Promise<JobApplication | undefined>;
  createJobApplication(application: InsertJobApplication): Promise<JobApplication>;
  updateJobApplication(id: number, data: Partial<JobApplication>): Promise<JobApplication | undefined>;
  deleteJobApplication(id: number): Promise<boolean>;

  getContactMessages(): Promise<ContactMessage[]>;
  getContactMessage(id: number): Promise<ContactMessage | undefined>;
  updateContactMessage(id: number, data: Partial<ContactMessage>): Promise<ContactMessage | undefined>;
  deleteContactMessage(id: number): Promise<boolean>;
  getUnreadContactCount(): Promise<number>;

  updatePost(id: number, data: Partial<Post>): Promise<Post | undefined>;
  deletePost(id: number): Promise<boolean>;
  getPostById(id: number): Promise<Post | undefined>;

  getCaseStudy(id: number): Promise<CaseStudy | undefined>;
  updateCaseStudy(id: number, data: Partial<CaseStudy>): Promise<CaseStudy | undefined>;
  deleteCaseStudy(id: number): Promise<boolean>;

  getFaqItems(activeOnly?: boolean): Promise<FaqItem[]>;
  getFaqItem(id: number): Promise<FaqItem | undefined>;
  createFaqItem(item: InsertFaqItem): Promise<FaqItem>;
  updateFaqItem(id: number, data: Partial<FaqItem>): Promise<FaqItem | undefined>;
  deleteFaqItem(id: number): Promise<boolean>;

  getTestimonials(activeOnly?: boolean): Promise<Testimonial[]>;
  getTestimonial(id: number): Promise<Testimonial | undefined>;
  createTestimonial(t: InsertTestimonial): Promise<Testimonial>;
  updateTestimonial(id: number, data: Partial<Testimonial>): Promise<Testimonial | undefined>;
  deleteTestimonial(id: number): Promise<boolean>;

  getSiteStats(): Promise<SiteStat[]>;
  getSiteStat(id: number): Promise<SiteStat | undefined>;
  createSiteStat(s: InsertSiteStat): Promise<SiteStat>;
  updateSiteStat(id: number, data: Partial<SiteStat>): Promise<SiteStat | undefined>;
  deleteSiteStat(id: number): Promise<boolean>;

  getSmtpSettings(): Promise<SmtpSettings | undefined>;
  upsertSmtpSettings(data: InsertSmtpSettings): Promise<SmtpSettings>;

  getEmployeeByEmail(email: string): Promise<Employee | undefined>;

  createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: number): Promise<void>;
  consumePasswordResetToken(hashedToken: string): Promise<PasswordResetToken | null>;
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
  getBalanceSheet(asOfDate?: string): Promise<{ assets: Array<{ name: string; amount: number }>; liabilities: Array<{ name: string; amount: number }>; capital: Array<{ name: string; amount: number }>; netProfit: number }>;
  getDayBook(startDate?: string, endDate?: string, type?: string): Promise<Voucher[]>;
  getGstSummary(startDate?: string, endDate?: string): Promise<{ outputTax: { cgst: number; sgst: number; igst: number; total: number }; inputTax: { cgst: number; sgst: number; igst: number; total: number }; netLiability: number }>;

  getErpLicenses(): Promise<ErpLicense[]>;
  getErpLicense(id: number): Promise<ErpLicense | undefined>;
  getErpLicenseByLicenseId(licenseId: string): Promise<ErpLicense | undefined>;
  getErpLicenseByActivationCodeHash(activationCodeHash: string): Promise<ErpLicense | undefined>;
  createErpLicense(license: InsertErpLicense): Promise<ErpLicense>;
  updateErpLicense(id: number, data: Partial<InsertErpLicense>): Promise<ErpLicense | undefined>;

  getErpLicenseActivations(erpLicenseId: number): Promise<ErpLicenseActivation[]>;
  getErpLicenseActivationByMachine(erpLicenseId: number, machineId: string): Promise<ErpLicenseActivation | undefined>;
  createErpLicenseActivation(activation: InsertErpLicenseActivation): Promise<ErpLicenseActivation>;
  updateErpLicenseActivation(id: number, data: Partial<InsertErpLicenseActivation>): Promise<ErpLicenseActivation | undefined>;
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

  async updateService(id: number, data: Partial<Service>): Promise<Service | undefined> {
    const [updated] = await db.update(services).set(data).where(eq(services.id, id)).returning();
    return updated;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id)).returning();
    return result.length > 0;
  }

  async getPricingPlans(activeOnly?: boolean): Promise<PricingPlan[]> {
    if (activeOnly) {
      return await db.select().from(pricingPlans).where(eq(pricingPlans.isActive, true)).orderBy(pricingPlans.displayOrder);
    }
    return await db.select().from(pricingPlans).orderBy(pricingPlans.displayOrder);
  }

  async getPricingPlan(id: number): Promise<PricingPlan | undefined> {
    const [plan] = await db.select().from(pricingPlans).where(eq(pricingPlans.id, id));
    return plan;
  }

  async createPricingPlan(plan: InsertPricingPlan): Promise<PricingPlan> {
    const [newPlan] = await db.insert(pricingPlans).values(plan).returning();
    return newPlan;
  }

  async updatePricingPlan(id: number, data: Partial<PricingPlan>): Promise<PricingPlan | undefined> {
    const [updated] = await db.update(pricingPlans).set(data).where(eq(pricingPlans.id, id)).returning();
    return updated;
  }

  async deletePricingPlan(id: number): Promise<boolean> {
    const result = await db.delete(pricingPlans).where(eq(pricingPlans.id, id)).returning();
    return result.length > 0;
  }

  async getCaseStudies(): Promise<CaseStudy[]> {
    return await db.select().from(caseStudies);
  }

  async createCaseStudy(caseStudy: InsertCaseStudy): Promise<CaseStudy> {
    const [newCaseStudy] = await db.insert(caseStudies).values(caseStudy).returning();
    return newCaseStudy;
  }

  async getRoles(): Promise<DbRole[]> {
    return await db.select().from(roles).orderBy(roles.slug);
  }

  async getRoleBySlug(slug: string): Promise<DbRole | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.slug, slug));
    return role;
  }

  async createRole(role: InsertDbRole): Promise<DbRole> {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }

  async updateRole(id: number, data: Partial<InsertDbRole>): Promise<DbRole | undefined> {
    const [updated] = await db.update(roles).set(data).where(eq(roles.id, id)).returning();
    return updated;
  }

  async deleteRole(id: number): Promise<boolean> {
    const result = await db.delete(roles).where(eq(roles.id, id)).returning();
    return result.length > 0;
  }

  async getEmployeeById(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getEmployeeByUsername(username: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(sql`lower(${employees.username}) = lower(${username})`);
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

  async updateEmployeePasswordChangedAt(id: number): Promise<void> {
    await db.update(employees).set({ passwordChangedAt: new Date() }).where(eq(employees.id, id));
  }

  async updateEmployeePassword(id: number, hashedPassword: string): Promise<void> {
    await db.update(employees).set({ password: hashedPassword, passwordChangedAt: new Date() }).where(eq(employees.id, id));
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

  async activateFinancialYear(id: number): Promise<FinancialYear | undefined> {
    // Only one financial year may be active at a time — deactivate every other
    // row before activating the target one, in a single transaction.
    return await db.transaction(async (tx) => {
      await tx.update(financialYears).set({ isActive: false }).where(sql`id != ${id}`);
      const [updated] = await tx.update(financialYears).set({ isActive: true }).where(eq(financialYears.id, id)).returning();
      return updated;
    });
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

  async getLegalPages(): Promise<LegalPage[]> {
    return db.select().from(legalPages);
  }

  async getLegalPageBySlug(slug: string): Promise<LegalPage | undefined> {
    const [page] = await db.select().from(legalPages).where(eq(legalPages.slug, slug)).limit(1);
    return page;
  }

  async upsertLegalPage(data: InsertLegalPage): Promise<LegalPage> {
    const existing = await this.getLegalPageBySlug(data.slug);
    if (existing) {
      const [updated] = await db.update(legalPages).set({ ...data, updatedAt: new Date() }).where(eq(legalPages.id, existing.id)).returning();
      return updated;
    }
    const [newPage] = await db.insert(legalPages).values(data).returning();
    return newPage;
  }

  async updateLegalPage(slug: string, data: Partial<InsertLegalPage>): Promise<LegalPage | undefined> {
    const existing = await this.getLegalPageBySlug(slug);
    if (!existing) return undefined;
    const [updated] = await db.update(legalPages).set({ ...data, updatedAt: new Date() }).where(eq(legalPages.id, existing.id)).returning();
    return updated;
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return db.select().from(emailTemplates);
  }

  async getEmailTemplateByKey(key: string): Promise<EmailTemplate | undefined> {
    const [tmpl] = await db.select().from(emailTemplates).where(eq(emailTemplates.key, key)).limit(1);
    return tmpl;
  }

  async updateEmailTemplate(key: string, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const existing = await this.getEmailTemplateByKey(key);
    if (!existing) return undefined;
    const [updated] = await db.update(emailTemplates).set({ ...data, updatedAt: new Date() }).where(eq(emailTemplates.id, existing.id)).returning();
    return updated;
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

  async getAttachmentsByEntity(entityType: string, entityId: number): Promise<Attachment[]> {
    return await db.select().from(attachments)
      .where(and(eq(attachments.entityType, entityType), eq(attachments.entityId, entityId)))
      .orderBy(desc(attachments.createdAt));
  }

  async getAttachment(id: number): Promise<Attachment | undefined> {
    const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id));
    return attachment;
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const [created] = await db.insert(attachments).values(attachment).returning();
    return created;
  }

  async deleteAttachment(id: number): Promise<boolean> {
    const result = await db.delete(attachments).where(eq(attachments.id, id)).returning();
    return result.length > 0;
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

  async getTutors(filters?: { status?: string }): Promise<Tutor[]> {
    if (filters?.status) {
      return await db.select().from(tutors).where(eq(tutors.status, filters.status)).orderBy(tutors.fullName);
    }
    return await db.select().from(tutors).orderBy(tutors.fullName);
  }

  async getTutor(id: number): Promise<Tutor | undefined> {
    const [tutor] = await db.select().from(tutors).where(eq(tutors.id, id));
    return tutor;
  }

  async getTutorByLoginEmployeeId(employeeId: number): Promise<Tutor | undefined> {
    const [tutor] = await db.select().from(tutors).where(eq(tutors.loginEmployeeId, employeeId));
    return tutor;
  }

  async createTutor(tutor: InsertTutor): Promise<Tutor> {
    const [newTutor] = await db.insert(tutors).values(tutor).returning();
    return newTutor;
  }

  async updateTutor(id: number, data: Partial<InsertTutor>): Promise<Tutor | undefined> {
    const [updated] = await db.update(tutors).set(data).where(eq(tutors.id, id)).returning();
    return updated;
  }

  async deleteTutor(id: number): Promise<boolean> {
    const result = await db.delete(tutors).where(eq(tutors.id, id)).returning();
    return result.length > 0;
  }

  async getNextTutorCode(): Promise<string> {
    // Matches the business's existing numbering (Tutor Details.xlsx): year + 3-digit
    // sequence, e.g. 2026001. Editable client-side — this is only a suggested default,
    // not enforced, so existing tutor codes can be entered verbatim when backfilling.
    const year = new Date().getFullYear();
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(tutors)
      .where(sql`tutor_code LIKE ${`${year}%`}`);
    const num = (result?.count || 0) + 1;
    return `${year}${String(num).padStart(3, "0")}`;
  }

  async getTutorAgreements(filters?: { tutorId?: number }): Promise<TutorAgreement[]> {
    if (filters?.tutorId) {
      return await db.select().from(tutorAgreements).where(eq(tutorAgreements.tutorId, filters.tutorId)).orderBy(desc(tutorAgreements.createdAt));
    }
    return await db.select().from(tutorAgreements).orderBy(desc(tutorAgreements.createdAt));
  }

  async getTutorAgreement(id: number): Promise<TutorAgreement | undefined> {
    const [agreement] = await db.select().from(tutorAgreements).where(eq(tutorAgreements.id, id));
    return agreement;
  }

  async createTutorAgreement(agreement: InsertTutorAgreement): Promise<TutorAgreement> {
    const [newAgreement] = await db.insert(tutorAgreements).values(agreement).returning();
    return newAgreement;
  }

  async updateTutorAgreement(id: number, data: Partial<InsertTutorAgreement>): Promise<TutorAgreement | undefined> {
    const [updated] = await db.update(tutorAgreements).set(data).where(eq(tutorAgreements.id, id)).returning();
    return updated;
  }

  async deleteTutorAgreement(id: number): Promise<boolean> {
    const result = await db.delete(tutorAgreements).where(eq(tutorAgreements.id, id)).returning();
    return result.length > 0;
  }

  async getNextAgreementRef(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `KDXS-TUT-${year}-`;
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(tutorAgreements)
      .where(sql`agreement_ref LIKE ${`${prefix}%`}`);
    const num = (result?.count || 0) + 1;
    return `${prefix}${String(num).padStart(4, "0")}`;
  }

  async getTutorPayslips(filters?: { tutorId?: number; agreementId?: number; status?: string }): Promise<TutorPayslip[]> {
    let conditions = [];
    if (filters?.tutorId) conditions.push(eq(tutorPayslips.tutorId, filters.tutorId));
    if (filters?.agreementId) conditions.push(eq(tutorPayslips.agreementId, filters.agreementId));
    if (filters?.status) conditions.push(eq(tutorPayslips.status, filters.status));
    if (conditions.length > 0) {
      return await db.select().from(tutorPayslips).where(and(...conditions)).orderBy(desc(tutorPayslips.createdAt));
    }
    return await db.select().from(tutorPayslips).orderBy(desc(tutorPayslips.createdAt));
  }

  async getTutorPayslip(id: number): Promise<TutorPayslip | undefined> {
    const [payslip] = await db.select().from(tutorPayslips).where(eq(tutorPayslips.id, id));
    return payslip;
  }

  async createTutorPayslip(payslip: InsertTutorPayslip): Promise<TutorPayslip> {
    const [newPayslip] = await db.insert(tutorPayslips).values(payslip).returning();
    return newPayslip;
  }

  async updateTutorPayslip(id: number, data: Partial<InsertTutorPayslip>): Promise<TutorPayslip | undefined> {
    const [updated] = await db.update(tutorPayslips).set(data).where(eq(tutorPayslips.id, id)).returning();
    return updated;
  }

  async getPayrollEmployees(filters?: { status?: string }): Promise<PayrollEmployee[]> {
    if (filters?.status) {
      return await db.select().from(payrollEmployees).where(eq(payrollEmployees.status, filters.status)).orderBy(payrollEmployees.fullName);
    }
    return await db.select().from(payrollEmployees).orderBy(payrollEmployees.fullName);
  }

  async getPayrollEmployee(id: number): Promise<PayrollEmployee | undefined> {
    const [employee] = await db.select().from(payrollEmployees).where(eq(payrollEmployees.id, id));
    return employee;
  }

  async createPayrollEmployee(employee: InsertPayrollEmployee): Promise<PayrollEmployee> {
    const [newEmployee] = await db.insert(payrollEmployees).values(employee).returning();
    return newEmployee;
  }

  async updatePayrollEmployee(id: number, data: Partial<InsertPayrollEmployee>): Promise<PayrollEmployee | undefined> {
    const [updated] = await db.update(payrollEmployees).set(data).where(eq(payrollEmployees.id, id)).returning();
    return updated;
  }

  async getPayrollStatutoryConfigVersions(): Promise<PayrollStatutoryConfigVersion[]> {
    return await db.select().from(payrollStatutoryConfigVersions).orderBy(desc(payrollStatutoryConfigVersions.effectiveFrom));
  }

  async createPayrollStatutoryConfigVersion(version: InsertPayrollStatutoryConfigVersion): Promise<PayrollStatutoryConfigVersion> {
    const [newVersion] = await db.insert(payrollStatutoryConfigVersions).values(version).returning();
    return newVersion;
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
    const activeFy = await this.getActiveFinancialYear();

    // Income/expenses are period figures — scoped to the active FY's date range
    // when one is configured (matches "activate a year to see that year's P&L").
    const allVouchers = activeFy
      ? await db.select().from(vouchers).where(and(eq(vouchers.status, "approved"), gte(vouchers.date, activeFy.startDate), lte(vouchers.date, activeFy.endDate)))
      : await db.select().from(vouchers).where(eq(vouchers.status, "approved"));

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

    // Cash/bank/receivables/payables are running (balance-sheet-style) balances —
    // scoped "as of the end of the active FY" rather than filtered to only that
    // year's transactions, since a carried-forward balance includes everything
    // before it too (same treatment as the Balance Sheet report).
    let validVoucherIds: Set<number> | null = null;
    if (activeFy) {
      const voucherList = await db.select().from(vouchers).where(lte(vouchers.date, activeFy.endDate));
      validVoucherIds = new Set(voucherList.map(v => v.id));
    }

    const getAccountBalance = async (name: string) => {
      const account = allAccounts.find(a => a.name === name);
      if (!account) return 0;
      const entries = await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, account.id));
      const filteredEntries = validVoucherIds ? entries.filter(e => validVoucherIds!.has(e.voucherId)) : entries;
      let balance = parseFloat(account.openingBalance);
      for (const e of filteredEntries) {
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
      const filteredEntries = validVoucherIds ? entries.filter(e => validVoucherIds!.has(e.voucherId)) : entries;
      totalReceivables = parseFloat(debtorAccount.openingBalance);
      for (const e of filteredEntries) totalReceivables += parseFloat(e.debit) - parseFloat(e.credit);
    }
    if (creditorAccount) {
      const entries = await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, creditorAccount.id));
      const filteredEntries = validVoucherIds ? entries.filter(e => validVoucherIds!.has(e.voucherId)) : entries;
      totalPayables = parseFloat(creditorAccount.openingBalance);
      for (const e of filteredEntries) totalPayables += parseFloat(e.credit) - parseFloat(e.debit);
    }

    // Pending approvals and recent activity are actionable/current-work items,
    // not historical figures — deliberately NOT scoped to the active FY, since
    // a to-do queue doesn't make sense filtered by a prior year.
    const [pendingResult] = await db.select({ count: sql<number>`count(*)` }).from(vouchers).where(eq(vouchers.status, "pending"));
    const pendingApprovals = pendingResult?.count || 0;

    const recentVouchers = await db.select().from(vouchers).orderBy(desc(vouchers.createdAt)).limit(10);

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

  async getBalanceSheet(asOfDate?: string) {
    const groups = await db.select().from(accountGroups);
    const allAccounts = await db.select().from(ledgerAccounts);

    const assetGroups = groups.filter(g => g.type === "asset").map(g => g.id);
    const liabilityGroups = groups.filter(g => g.type === "liability").map(g => g.id);
    const capitalGroups = groups.filter(g => g.type === "capital").map(g => g.id);

    let validVoucherIds: Set<number> | null = null;
    if (asOfDate) {
      const voucherList = await db.select().from(vouchers).where(lte(vouchers.date, asOfDate));
      validVoucherIds = new Set(voucherList.map(v => v.id));
    }

    const computeBalances = async (groupIds: number[]) => {
      const accounts = allAccounts.filter(a => groupIds.includes(a.groupId));
      const result: Array<{ name: string; amount: number }> = [];
      for (const account of accounts) {
        const entries = await db.select().from(voucherEntries).where(eq(voucherEntries.ledgerAccountId, account.id));
        const filteredEntries = validVoucherIds ? entries.filter(e => validVoucherIds!.has(e.voucherId)) : entries;
        let amount = parseFloat(account.openingBalance);
        for (const e of filteredEntries) {
          amount += parseFloat(e.debit) - parseFloat(e.credit);
        }
        if (amount !== 0) result.push({ name: account.name, amount: Math.abs(amount) });
      }
      return result;
    };

    const pnl = await this.getProfitAndLoss(undefined, asOfDate);

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

  async getJobPostings(filters?: { status?: string }): Promise<JobPosting[]> {
    if (filters?.status) {
      return await db.select().from(jobPostings).where(eq(jobPostings.status, filters.status)).orderBy(desc(jobPostings.createdAt));
    }
    return await db.select().from(jobPostings).orderBy(desc(jobPostings.createdAt));
  }

  async getJobPosting(id: number): Promise<JobPosting | undefined> {
    const [posting] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
    return posting;
  }

  async createJobPosting(posting: InsertJobPosting): Promise<JobPosting> {
    const [newPosting] = await db.insert(jobPostings).values(posting).returning();
    return newPosting;
  }

  async updateJobPosting(id: number, data: Partial<JobPosting>): Promise<JobPosting | undefined> {
    const [updated] = await db.update(jobPostings).set(data).where(eq(jobPostings.id, id)).returning();
    return updated;
  }

  async deleteJobPosting(id: number): Promise<boolean> {
    const result = await db.delete(jobPostings).where(eq(jobPostings.id, id)).returning();
    return result.length > 0;
  }

  async countJobApplications(jobPostingId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(jobApplications).where(eq(jobApplications.jobPostingId, jobPostingId));
    return result[0]?.count ?? 0;
  }

  async getJobApplications(filters?: { jobPostingId?: number; status?: string }): Promise<JobApplication[]> {
    const conditions = [];
    if (filters?.jobPostingId) conditions.push(eq(jobApplications.jobPostingId, filters.jobPostingId));
    if (filters?.status) conditions.push(eq(jobApplications.status, filters.status));
    if (conditions.length > 0) {
      return await db.select().from(jobApplications).where(and(...conditions)).orderBy(desc(jobApplications.createdAt));
    }
    return await db.select().from(jobApplications).orderBy(desc(jobApplications.createdAt));
  }

  async getJobApplication(id: number): Promise<JobApplication | undefined> {
    const [app] = await db.select().from(jobApplications).where(eq(jobApplications.id, id));
    return app;
  }

  async createJobApplication(application: InsertJobApplication): Promise<JobApplication> {
    const [newApp] = await db.insert(jobApplications).values(application).returning();
    return newApp;
  }

  async updateJobApplication(id: number, data: Partial<JobApplication>): Promise<JobApplication | undefined> {
    const [updated] = await db.update(jobApplications).set(data).where(eq(jobApplications.id, id)).returning();
    return updated;
  }

  async deleteJobApplication(id: number): Promise<boolean> {
    const result = await db.delete(jobApplications).where(eq(jobApplications.id, id)).returning();
    return result.length > 0;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async getContactMessage(id: number): Promise<ContactMessage | undefined> {
    const [msg] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    return msg;
  }

  async updateContactMessage(id: number, data: Partial<ContactMessage>): Promise<ContactMessage | undefined> {
    const [updated] = await db.update(contactMessages).set(data).where(eq(contactMessages.id, id)).returning();
    return updated;
  }

  async deleteContactMessage(id: number): Promise<boolean> {
    const result = await db.delete(contactMessages).where(eq(contactMessages.id, id)).returning();
    return result.length > 0;
  }

  async getUnreadContactCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(contactMessages).where(eq(contactMessages.isRead, false));
    return result[0]?.count ?? 0;
  }

  async updatePost(id: number, data: Partial<Post>): Promise<Post | undefined> {
    const [updated] = await db.update(posts).set(data).where(eq(posts.id, id)).returning();
    return updated;
  }

  async deletePost(id: number): Promise<boolean> {
    const result = await db.delete(posts).where(eq(posts.id, id)).returning();
    return result.length > 0;
  }

  async getPostById(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async getCaseStudy(id: number): Promise<CaseStudy | undefined> {
    const [cs] = await db.select().from(caseStudies).where(eq(caseStudies.id, id));
    return cs;
  }

  async updateCaseStudy(id: number, data: Partial<CaseStudy>): Promise<CaseStudy | undefined> {
    const [updated] = await db.update(caseStudies).set(data).where(eq(caseStudies.id, id)).returning();
    return updated;
  }

  async deleteCaseStudy(id: number): Promise<boolean> {
    const result = await db.delete(caseStudies).where(eq(caseStudies.id, id)).returning();
    return result.length > 0;
  }

  async getFaqItems(activeOnly?: boolean): Promise<FaqItem[]> {
    if (activeOnly) {
      return await db.select().from(faqItems).where(eq(faqItems.isActive, true)).orderBy(faqItems.displayOrder);
    }
    return await db.select().from(faqItems).orderBy(faqItems.displayOrder);
  }

  async getFaqItem(id: number): Promise<FaqItem | undefined> {
    const [item] = await db.select().from(faqItems).where(eq(faqItems.id, id));
    return item;
  }

  async createFaqItem(item: InsertFaqItem): Promise<FaqItem> {
    const [newItem] = await db.insert(faqItems).values(item).returning();
    return newItem;
  }

  async updateFaqItem(id: number, data: Partial<FaqItem>): Promise<FaqItem | undefined> {
    const [updated] = await db.update(faqItems).set(data).where(eq(faqItems.id, id)).returning();
    return updated;
  }

  async deleteFaqItem(id: number): Promise<boolean> {
    const result = await db.delete(faqItems).where(eq(faqItems.id, id)).returning();
    return result.length > 0;
  }

  async getTestimonials(activeOnly?: boolean): Promise<Testimonial[]> {
    if (activeOnly) {
      return await db.select().from(testimonials).where(eq(testimonials.isActive, true)).orderBy(testimonials.displayOrder);
    }
    return await db.select().from(testimonials).orderBy(testimonials.displayOrder);
  }

  async getTestimonial(id: number): Promise<Testimonial | undefined> {
    const [t] = await db.select().from(testimonials).where(eq(testimonials.id, id));
    return t;
  }

  async createTestimonial(t: InsertTestimonial): Promise<Testimonial> {
    const [newT] = await db.insert(testimonials).values(t).returning();
    return newT;
  }

  async updateTestimonial(id: number, data: Partial<Testimonial>): Promise<Testimonial | undefined> {
    const [updated] = await db.update(testimonials).set(data).where(eq(testimonials.id, id)).returning();
    return updated;
  }

  async deleteTestimonial(id: number): Promise<boolean> {
    const result = await db.delete(testimonials).where(eq(testimonials.id, id)).returning();
    return result.length > 0;
  }

  async getSiteStats(): Promise<SiteStat[]> {
    return await db.select().from(siteStats).orderBy(siteStats.displayOrder);
  }

  async getSiteStat(id: number): Promise<SiteStat | undefined> {
    const [s] = await db.select().from(siteStats).where(eq(siteStats.id, id));
    return s;
  }

  async createSiteStat(s: InsertSiteStat): Promise<SiteStat> {
    const [newS] = await db.insert(siteStats).values(s).returning();
    return newS;
  }

  async updateSiteStat(id: number, data: Partial<SiteStat>): Promise<SiteStat | undefined> {
    const [updated] = await db.update(siteStats).set(data).where(eq(siteStats.id, id)).returning();
    return updated;
  }

  async deleteSiteStat(id: number): Promise<boolean> {
    const result = await db.delete(siteStats).where(eq(siteStats.id, id)).returning();
    return result.length > 0;
  }

  async getSmtpSettings(): Promise<SmtpSettings | undefined> {
    const [row] = await db.select().from(smtpSettings).limit(1);
    return row;
  }

  async upsertSmtpSettings(data: InsertSmtpSettings): Promise<SmtpSettings> {
    const existing = await this.getSmtpSettings();
    if (existing) {
      const [updated] = await db.update(smtpSettings).set({ ...data, updatedAt: new Date() }).where(eq(smtpSettings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(smtpSettings).values(data).returning();
    return created;
  }

  async createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [row] = await db.insert(passwordResetTokens).values(data).returning();
    return row;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return row;
  }

  async markPasswordResetTokenUsed(id: number): Promise<void> {
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, id));
  }

  async consumePasswordResetToken(hashedToken: string): Promise<PasswordResetToken | null> {
    const [token] = await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(
        and(
          eq(passwordResetTokens.token, hashedToken),
          eq(passwordResetTokens.used, false),
          gte(passwordResetTokens.expiresAt, new Date())
        )
      )
      .returning();
    return token || null;
  }

  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    const [row] = await db.select().from(employees).where(sql`lower(${employees.email}) = lower(${email})`);
    return row;
  }

  async getErpLicenses(): Promise<ErpLicense[]> {
    return await db.select().from(erpLicenses).orderBy(desc(erpLicenses.createdAt));
  }

  async getErpLicense(id: number): Promise<ErpLicense | undefined> {
    const [row] = await db.select().from(erpLicenses).where(eq(erpLicenses.id, id));
    return row;
  }

  async getErpLicenseByLicenseId(licenseId: string): Promise<ErpLicense | undefined> {
    const [row] = await db.select().from(erpLicenses).where(eq(erpLicenses.licenseId, licenseId));
    return row;
  }

  async getErpLicenseByActivationCodeHash(activationCodeHash: string): Promise<ErpLicense | undefined> {
    const [row] = await db.select().from(erpLicenses).where(eq(erpLicenses.activationCodeHash, activationCodeHash));
    return row;
  }

  async createErpLicense(license: InsertErpLicense): Promise<ErpLicense> {
    const [row] = await db.insert(erpLicenses).values(license).returning();
    return row;
  }

  async updateErpLicense(id: number, data: Partial<InsertErpLicense>): Promise<ErpLicense | undefined> {
    const [row] = await db.update(erpLicenses).set(data).where(eq(erpLicenses.id, id)).returning();
    return row;
  }

  async getErpLicenseActivations(erpLicenseId: number): Promise<ErpLicenseActivation[]> {
    return await db.select().from(erpLicenseActivations).where(eq(erpLicenseActivations.erpLicenseId, erpLicenseId)).orderBy(desc(erpLicenseActivations.firstActivatedAt));
  }

  async getErpLicenseActivationByMachine(erpLicenseId: number, machineId: string): Promise<ErpLicenseActivation | undefined> {
    const [row] = await db.select().from(erpLicenseActivations).where(and(eq(erpLicenseActivations.erpLicenseId, erpLicenseId), eq(erpLicenseActivations.machineId, machineId)));
    return row;
  }

  async createErpLicenseActivation(activation: InsertErpLicenseActivation): Promise<ErpLicenseActivation> {
    const [row] = await db.insert(erpLicenseActivations).values(activation).returning();
    return row;
  }

  async updateErpLicenseActivation(id: number, data: Partial<InsertErpLicenseActivation>): Promise<ErpLicenseActivation | undefined> {
    const [row] = await db.update(erpLicenseActivations).set(data).where(eq(erpLicenseActivations.id, id)).returning();
    return row;
  }
}

export const storage = new DatabaseStorage();
