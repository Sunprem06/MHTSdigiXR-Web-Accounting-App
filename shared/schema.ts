import { pgTable, text, serial, timestamp, boolean, integer, decimal, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export * from "./models/chat";

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  summary: text("summary").notNull(),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  image: text("image").notNull(),
  features: text("features").array(),
});

export const caseStudies = pgTable("case_studies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  client: text("client").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  results: text("results").array(),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("viewer"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accountGroups = pgTable("account_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(),
  parentId: integer("parent_id"),
  description: text("description"),
});

export const ledgerAccounts = pgTable("ledger_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  groupId: integer("group_id").references(() => accountGroups.id).notNull(),
  openingBalance: decimal("opening_balance", { precision: 15, scale: 2 }).default("0").notNull(),
  balanceType: text("balance_type").notNull().default("debit"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financialYears = pgTable("financial_years", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(false),
});

export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  address: text("address"),
  gstin: text("gstin"),
  phone: text("phone"),
  email: text("email"),
  logo: text("logo"),
});

export const vouchers = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  voucherNumber: text("voucher_number").notNull().unique(),
  date: date("date").notNull(),
  type: text("type").notNull(),
  narration: text("narration"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  createdBy: integer("created_by").references(() => employees.id),
  approvedBy: integer("approved_by").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const voucherEntries = pgTable("voucher_entries", {
  id: serial("id").primaryKey(),
  voucherId: integer("voucher_id").references(() => vouchers.id, { onDelete: "cascade" }).notNull(),
  ledgerAccountId: integer("ledger_account_id").references(() => ledgerAccounts.id).notNull(),
  debit: decimal("debit", { precision: 15, scale: 2 }).default("0").notNull(),
  credit: decimal("credit", { precision: 15, scale: 2 }).default("0").notNull(),
});

export const auditNotes = pgTable("audit_notes", {
  id: serial("id").primaryKey(),
  auditorId: integer("auditor_id").references(() => employees.id).notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true });
export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({ id: true, createdAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export const insertCaseStudySchema = createInsertSchema(caseStudies).omit({ id: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, lastLogin: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertAccountGroupSchema = createInsertSchema(accountGroups).omit({ id: true });
export const insertLedgerAccountSchema = createInsertSchema(ledgerAccounts).omit({ id: true, createdAt: true });
export const insertFinancialYearSchema = createInsertSchema(financialYears).omit({ id: true });
export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({ id: true });
export const insertVoucherSchema = createInsertSchema(vouchers).omit({ id: true, createdAt: true });
export const insertVoucherEntrySchema = createInsertSchema(voucherEntries).omit({ id: true });
export const insertAuditNoteSchema = createInsertSchema(auditNotes).omit({ id: true, createdAt: true });

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type CaseStudy = typeof caseStudies.$inferSelect;
export type InsertCaseStudy = z.infer<typeof insertCaseStudySchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AccountGroup = typeof accountGroups.$inferSelect;
export type InsertAccountGroup = z.infer<typeof insertAccountGroupSchema>;
export type LedgerAccount = typeof ledgerAccounts.$inferSelect;
export type InsertLedgerAccount = z.infer<typeof insertLedgerAccountSchema>;
export type FinancialYear = typeof financialYears.$inferSelect;
export type InsertFinancialYear = z.infer<typeof insertFinancialYearSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type Voucher = typeof vouchers.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type VoucherEntry = typeof voucherEntries.$inferSelect;
export type InsertVoucherEntry = z.infer<typeof insertVoucherEntrySchema>;
export type AuditNote = typeof auditNotes.$inferSelect;
export type InsertAuditNote = z.infer<typeof insertAuditNoteSchema>;

export const ROLES = ["super_admin", "admin", "auditor", "senior_accountant", "accountant", "data_entry", "viewer"] as const;
export type Role = typeof ROLES[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  auditor: "Auditor",
  senior_accountant: "Senior Accountant",
  accountant: "Accountant",
  data_entry: "Data Entry Operator",
  viewer: "Viewer",
};

export const VOUCHER_TYPES = ["sales", "purchase", "payment", "receipt", "journal", "contra"] as const;
export type VoucherType = typeof VOUCHER_TYPES[number];

export const VOUCHER_STATUSES = ["draft", "pending", "approved"] as const;
export type VoucherStatus = typeof VOUCHER_STATUSES[number];
