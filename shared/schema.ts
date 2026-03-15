import { pgTable, text, serial, timestamp, boolean, integer, decimal, date, jsonb } from "drizzle-orm/pg-core";
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
  author: text("author").default("Admin"),
  status: text("status").default("published").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
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

export const pricingPlans = pgTable("pricing_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: text("price").notNull(),
  period: text("period").notNull().default("one-time"),
  description: text("description").notNull(),
  features: jsonb("features").$type<string[]>().default([]),
  isPopular: boolean("is_popular").default(false),
  ctaLabel: text("cta_label").default("Get Started"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const caseStudies = pgTable("case_studies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  client: text("client").notNull(),
  category: text("category").default("Web Development"),
  description: text("description").notNull(),
  image: text("image").notNull(),
  results: text("results").array(),
});

export const faqItems = pgTable("faq_items", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull().default("General Questions"),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  role: text("role").notNull(),
  company: text("company"),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  rating: integer("rating").default(5),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const siteStats = pgTable("site_stats", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  value: text("value").notNull(),
  suffix: text("suffix").default(""),
  icon: text("icon").default("Star"),
  displayOrder: integer("display_order").default(0).notNull(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().default([]),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("viewer"),
  permissions: jsonb("permissions"),
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
  state: text("state"),
  panNumber: text("pan_number"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  bankIfsc: text("bank_ifsc"),
  bankBranch: text("bank_branch"),
  brandName: text("brand_name"),
  tagline: text("tagline"),
  whatsappNumber: text("whatsapp_number"),
  careersEmail: text("careers_email"),
  websiteUrl: text("website_url"),
  linkedinUrl: text("linkedin_url"),
  twitterUrl: text("twitter_url"),
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  copyrightText: text("copyright_text"),
});

export const parties = pgTable("parties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("customer"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  gstin: text("gstin"),
  panNumber: text("pan_number"),
  creditPeriod: integer("credit_period").default(30),
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }).default("0"),
  openingBalance: decimal("opening_balance", { precision: 15, scale: 2 }).default("0"),
  balanceType: text("balance_type").default("debit"),
  ledgerAccountId: integer("ledger_account_id").references(() => ledgerAccounts.id),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  productCode: text("product_code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull().default("other"),
  description: text("description"),
  hsnSacCode: text("hsn_sac_code"),
  unit: text("unit").default("project"),
  rate: decimal("rate", { precision: 15, scale: 2 }).default("0").notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).default("18").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vouchers = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  voucherNumber: text("voucher_number").notNull().unique(),
  date: date("date").notNull(),
  type: text("type").notNull(),
  narration: text("narration"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  partyId: integer("party_id").references(() => parties.id),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }),
  taxableAmount: decimal("taxable_amount", { precision: 15, scale: 2 }),
  cgstAmount: decimal("cgst_amount", { precision: 15, scale: 2 }),
  sgstAmount: decimal("sgst_amount", { precision: 15, scale: 2 }),
  igstAmount: decimal("igst_amount", { precision: 15, scale: 2 }),
  isInterState: boolean("is_inter_state").default(false),
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

export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  quotationNumber: text("quotation_number").notNull().unique(),
  date: date("date").notNull(),
  validUntil: date("valid_until"),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  items: jsonb("items").notNull().default([]),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).default("0").notNull(),
  cgstTotal: decimal("cgst_total", { precision: 15, scale: 2 }).default("0"),
  sgstTotal: decimal("sgst_total", { precision: 15, scale: 2 }).default("0"),
  igstTotal: decimal("igst_total", { precision: 15, scale: 2 }).default("0"),
  grandTotal: decimal("grand_total", { precision: 15, scale: 2 }).default("0").notNull(),
  isInterState: boolean("is_inter_state").default(false),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  status: text("status").notNull().default("draft"),
  convertedVoucherId: integer("converted_voucher_id").references(() => vouchers.id),
  createdBy: integer("created_by").references(() => employees.id),
  assignedTo: integer("assigned_to").references(() => employees.id),
  reviewedBy: integer("reviewed_by").references(() => employees.id),
  reviewedAt: timestamp("reviewed_at"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenseClaims = pgTable("expense_claims", {
  id: serial("id").primaryKey(),
  claimNumber: text("claim_number").notNull().unique(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  date: date("date").notNull(),
  category: text("category").notNull().default("other"),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  receiptRef: text("receipt_ref"),
  status: text("status").notNull().default("pending"),
  approvedBy: integer("approved_by").references(() => employees.id),
  approvedAt: timestamp("approved_at"),
  remarks: text("remarks"),
  voucherId: integer("voucher_id").references(() => vouchers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditNotes = pgTable("audit_notes", {
  id: serial("id").primaryKey(),
  auditorId: integer("auditor_id").references(() => employees.id).notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const JOB_POSTING_STATUSES = ["draft", "open", "closed"] as const;
export type JobPostingStatus = typeof JOB_POSTING_STATUSES[number];

export const JOB_APPLICATION_STATUSES = ["received", "reviewed", "shortlisted", "rejected", "hired"] as const;
export type JobApplicationStatus = typeof JOB_APPLICATION_STATUSES[number];

export const jobPostings = pgTable("job_postings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  department: text("department").notNull(),
  location: text("location").notNull(),
  type: text("type").notNull().default("full_time"),
  experience: text("experience").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements").array().notNull().default([]),
  responsibilities: text("responsibilities").array().notNull().default([]),
  salaryRange: text("salary_range"),
  vacancies: integer("vacancies").notNull().default(1),
  status: text("status").notNull().default("draft"),
  closingDate: date("closing_date"),
  postedAt: timestamp("posted_at"),
  createdBy: integer("created_by").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  jobPostingId: integer("job_posting_id").references(() => jobPostings.id).notNull(),
  applicantName: text("applicant_name").notNull(),
  applicantEmail: text("applicant_email").notNull(),
  applicantPhone: text("applicant_phone"),
  experience: text("experience"),
  message: text("message"),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  resumeUrl: text("resume_url"),
  status: text("status").notNull().default("received"),
  notes: text("notes"),
  reviewedBy: integer("reviewed_by").references(() => employees.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true });
export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({ id: true, createdAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export const insertCaseStudySchema = createInsertSchema(caseStudies).omit({ id: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, lastLogin: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertAccountGroupSchema = createInsertSchema(accountGroups).omit({ id: true });
export const insertLedgerAccountSchema = createInsertSchema(ledgerAccounts).omit({ id: true, createdAt: true });
export const insertFinancialYearSchema = createInsertSchema(financialYears).omit({ id: true });
export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({ id: true });
export const insertVoucherSchema = createInsertSchema(vouchers).omit({ id: true, createdAt: true });
export const insertVoucherEntrySchema = createInsertSchema(voucherEntries).omit({ id: true });
export const insertAuditNoteSchema = createInsertSchema(auditNotes).omit({ id: true, createdAt: true });
export const insertPartySchema = createInsertSchema(parties).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertQuotationSchema = createInsertSchema(quotations).omit({ id: true, createdAt: true });
export const insertExpenseClaimSchema = createInsertSchema(expenseClaims).omit({ id: true, createdAt: true });
export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({ id: true, createdAt: true });
export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({ id: true, createdAt: true });
export const insertFaqItemSchema = createInsertSchema(faqItems).omit({ id: true, createdAt: true });
export const insertTestimonialSchema = createInsertSchema(testimonials).omit({ id: true, createdAt: true });
export const insertSiteStatSchema = createInsertSchema(siteStats).omit({ id: true });
export const insertPricingPlanSchema = createInsertSchema(pricingPlans).omit({ id: true, createdAt: true });

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type CaseStudy = typeof caseStudies.$inferSelect;
export type InsertCaseStudy = z.infer<typeof insertCaseStudySchema>;
export type PricingPlan = typeof pricingPlans.$inferSelect;
export type InsertPricingPlan = z.infer<typeof insertPricingPlanSchema>;
export type DbRole = typeof roles.$inferSelect;
export type InsertDbRole = z.infer<typeof insertRoleSchema>;
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
export type Party = typeof parties.$inferSelect;
export type InsertParty = z.infer<typeof insertPartySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type ExpenseClaim = typeof expenseClaims.$inferSelect;
export type InsertExpenseClaim = z.infer<typeof insertExpenseClaimSchema>;
export type JobPosting = typeof jobPostings.$inferSelect;
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type FaqItem = typeof faqItems.$inferSelect;
export type InsertFaqItem = z.infer<typeof insertFaqItemSchema>;
export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type SiteStat = typeof siteStats.$inferSelect;
export type InsertSiteStat = z.infer<typeof insertSiteStatSchema>;

export const ROLES = ["super_admin", "admin", "auditor", "senior_accountant", "accountant", "data_entry", "viewer", "sales_person", "sales_manager"] as const;
export type Role = typeof ROLES[number];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  auditor: "Auditor",
  senior_accountant: "Senior Accountant",
  accountant: "Accountant",
  data_entry: "Data Entry Operator",
  viewer: "Viewer",
  sales_person: "Sales Person",
  sales_manager: "Sales Manager",
};

export const ALL_PERMISSIONS = [
  "dashboard.view",
  "ledgers.view", "ledgers.create", "ledgers.edit",
  "parties.view", "parties.create", "parties.edit", "parties.delete",
  "products.view", "products.create", "products.edit", "products.delete",
  "quotations.view", "quotations.create", "quotations.edit", "quotations.delete", "quotations.approve",
  "invoices.view", "invoices.create",
  "vouchers.view", "vouchers.create", "vouchers.edit", "vouchers.approve",
  "expenses.view", "expenses.create", "expenses.approve",
  "jobs.view", "jobs.create", "jobs.edit", "jobs.delete",
  "content.view", "content.create", "content.edit", "content.delete",
  "contacts.view", "contacts.manage",
  "reports.view",
  "audit.view", "audit.notes",
  "employees.view", "employees.manage",
  "roles.view", "roles.manage",
  "settings.view", "settings.manage",
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

export const PERMISSION_GROUPS: Record<string, { label: string; permissions: Permission[] }> = {
  dashboard: { label: "Dashboard", permissions: ["dashboard.view"] },
  ledgers: { label: "Ledger Accounts", permissions: ["ledgers.view", "ledgers.create", "ledgers.edit"] },
  parties: { label: "Parties", permissions: ["parties.view", "parties.create", "parties.edit", "parties.delete"] },
  products: { label: "Products", permissions: ["products.view", "products.create", "products.edit", "products.delete"] },
  quotations: { label: "Quotations", permissions: ["quotations.view", "quotations.create", "quotations.edit", "quotations.delete", "quotations.approve"] },
  invoices: { label: "Invoices", permissions: ["invoices.view", "invoices.create"] },
  vouchers: { label: "Vouchers", permissions: ["vouchers.view", "vouchers.create", "vouchers.edit", "vouchers.approve"] },
  expenses: { label: "Expenses", permissions: ["expenses.view", "expenses.create", "expenses.approve"] },
  jobs: { label: "Recruitment", permissions: ["jobs.view", "jobs.create", "jobs.edit", "jobs.delete"] },
  content: { label: "Website Content", permissions: ["content.view", "content.create", "content.edit", "content.delete"] },
  contacts: { label: "Contact Inbox", permissions: ["contacts.view", "contacts.manage"] },
  reports: { label: "Reports", permissions: ["reports.view"] },
  audit: { label: "Audit", permissions: ["audit.view", "audit.notes"] },
  employees: { label: "Employees", permissions: ["employees.view", "employees.manage"] },
  roles: { label: "Roles", permissions: ["roles.view", "roles.manage"] },
  settings: { label: "Settings", permissions: ["settings.view", "settings.manage"] },
};

export const SYSTEM_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [...ALL_PERMISSIONS],
  admin: ALL_PERMISSIONS.filter(p => !p.startsWith("settings.")),
  auditor: ["dashboard.view", "ledgers.view", "parties.view", "products.view", "quotations.view", "invoices.view", "vouchers.view", "expenses.view", "contacts.view", "reports.view", "audit.view", "audit.notes"],
  senior_accountant: [
    "dashboard.view",
    "ledgers.view", "ledgers.create", "ledgers.edit",
    "parties.view", "parties.create", "parties.edit", "parties.delete",
    "products.view", "products.create", "products.edit", "products.delete",
    "quotations.view", "quotations.create", "quotations.edit", "quotations.delete", "quotations.approve",
    "invoices.view", "invoices.create",
    "vouchers.view", "vouchers.create", "vouchers.edit", "vouchers.approve",
    "expenses.view", "expenses.create", "expenses.approve",
    "reports.view",
  ],
  accountant: [
    "dashboard.view",
    "ledgers.view", "ledgers.create", "ledgers.edit",
    "parties.view", "parties.create", "parties.edit",
    "products.view", "products.create", "products.edit",
    "quotations.view", "quotations.create", "quotations.edit",
    "invoices.view", "invoices.create",
    "vouchers.view", "vouchers.create", "vouchers.edit",
    "expenses.view", "expenses.create",
    "reports.view",
  ],
  data_entry: ["dashboard.view", "vouchers.view", "vouchers.create", "quotations.view", "quotations.create", "expenses.view", "expenses.create", "parties.view", "products.view"],
  viewer: ["dashboard.view"],
  sales_person: ["dashboard.view", "quotations.view", "quotations.create", "parties.view", "parties.create", "products.view", "invoices.view"],
  sales_manager: [
    "dashboard.view",
    "quotations.view", "quotations.create", "quotations.edit", "quotations.approve",
    "parties.view", "parties.create", "parties.edit",
    "products.view",
    "invoices.view", "invoices.create",
    "expenses.view",
    "reports.view",
  ],
};

export const VOUCHER_TYPES = ["sales", "purchase", "payment", "receipt", "journal", "contra", "credit_note", "debit_note"] as const;
export type VoucherType = typeof VOUCHER_TYPES[number];

export const VOUCHER_STATUSES = ["draft", "pending", "approved"] as const;
export type VoucherStatus = typeof VOUCHER_STATUSES[number];

export const PRODUCT_CATEGORIES = [
  "web_development", "mobile_app", "seo", "smm", "branding",
  "domain_hosting", "video_animation", "digital_marketing", "ui_ux_design", "consulting", "other"
] as const;
export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  web_development: "Website Development",
  mobile_app: "Mobile App Development",
  seo: "SEO Optimization",
  smm: "Social Media Marketing",
  branding: "Branding & Graphics",
  domain_hosting: "Domain & Hosting",
  video_animation: "Video & Animation",
  digital_marketing: "Digital Marketing",
  ui_ux_design: "UI/UX Design",
  consulting: "Consulting",
  other: "Other",
};

export const PARTY_TYPES = ["customer", "vendor", "both"] as const;
export type PartyType = typeof PARTY_TYPES[number];

export const EXPENSE_CATEGORIES = [
  "travel", "food", "transport", "accommodation", "office_supplies",
  "communication", "client_meeting", "software", "hardware", "other"
] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  travel: "Travel",
  food: "Food & Beverages",
  transport: "Transport",
  accommodation: "Accommodation",
  office_supplies: "Office Supplies",
  communication: "Communication",
  client_meeting: "Client Meeting",
  software: "Software & Subscriptions",
  hardware: "Hardware & Equipment",
  other: "Other",
};

export const EXPENSE_STATUSES = ["pending", "approved", "rejected", "reimbursed"] as const;
export type ExpenseStatus = typeof EXPENSE_STATUSES[number];

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const QUOTATION_STATUSES = ["draft", "submitted", "sent", "accepted", "rejected", "expired", "converted"] as const;
export type QuotationStatus = typeof QUOTATION_STATUSES[number];
