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
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  passwordChangedAt: timestamp("password_changed_at").defaultNow().notNull(),
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
  aboutStory: text("about_story"),
  aboutVision: text("about_vision"),
  aboutMission: text("about_mission"),
  foundedYear: text("founded_year"),
  aboutLocation: text("about_location"),
});

export const legalPages = pgTable("legal_pages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  effectiveDate: text("effective_date"),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// ── Payroll: Tutors (KoodaldigiXS Learning independent contractors) ──
// Sec 194J TDS only (10% w/ valid PAN, 20% w/o — Sec 206AA). PF/ESI/Gratuity
// never apply to tutors — Clause 15.13 of the Independent Contractor
// Agreement. Formulas ported from the business's existing payslip tool
// (KoodaldigiXS_PaySlip_TDS.html) — see tutor-payslip route comments.
export const TUTOR_STATUSES = ["active", "inactive"] as const;
export type TutorStatus = typeof TUTOR_STATUSES[number];

export const tutors = pgTable("tutors", {
  id: serial("id").primaryKey(),
  tutorCode: text("tutor_code").notNull().unique(),
  fullName: text("full_name").notNull(),
  subject: text("subject"),
  agreementDate: date("agreement_date"),
  agreementRef: text("agreement_ref"),
  gender: text("gender"),
  contactPhone: text("contact_phone"),
  email: text("email").unique(),
  panNumber: text("pan_number"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIfsc: text("bank_ifsc"),
  gstNumber: text("gst_number"),
  city: text("city").default("Chennai"),
  defaultRate: decimal("default_rate", { precision: 10, scale: 2 }).default("0"),
  status: text("status").notNull().default("active"),
  loginEmployeeId: integer("login_employee_id").references(() => employees.id),
  createdBy: integer("created_by").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const TUTOR_PAYSLIP_STATUSES = ["draft", "submitted", "approved", "paid", "rejected"] as const;
export type TutorPayslipStatus = typeof TUTOR_PAYSLIP_STATUSES[number];

export const tutorPayslips = pgTable("tutor_payslips", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").references(() => tutors.id).notNull(),
  payMonth: text("pay_month").notNull(),
  liveCoachingRate: decimal("live_coaching_rate", { precision: 10, scale: 2 }).default("0"),
  liveCoachingHours: decimal("live_coaching_hours", { precision: 6, scale: 2 }).default("0"),
  prerecordedRate: decimal("prerecorded_rate", { precision: 10, scale: 2 }).default("0"),
  prerecordedHours: decimal("prerecorded_hours", { precision: 6, scale: 2 }).default("0"),
  contentCreationRate: decimal("content_creation_rate", { precision: 10, scale: 2 }).default("0"),
  contentCreationHours: decimal("content_creation_hours", { precision: 6, scale: 2 }).default("0"),
  lwpHours: decimal("lwp_hours", { precision: 6, scale: 2 }).default("0"),
  otherDeduction: decimal("other_deduction", { precision: 10, scale: 2 }).default("0"),
  panAtPayment: text("pan_at_payment"),
  tdsRatePercent: integer("tds_rate_percent").notNull().default(10),
  grossEarnings: decimal("gross_earnings", { precision: 12, scale: 2 }).notNull().default("0"),
  tdsAmount: decimal("tds_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  netPay: decimal("net_pay", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("draft"),
  preparedBy: integer("prepared_by").references(() => employees.id),
  submittedAt: timestamp("submitted_at"),
  approvedBy: integer("approved_by").references(() => employees.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  voucherId: integer("voucher_id").references(() => vouchers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Payroll: Employees (MHTSdigiXR salaried staff) — SCHEMA STUB ──
// Statutory formulas (Sec 192 TDS, PF, ESI, Gratuity) are NOT implemented.
// The Labour Codes (effective 21 Nov 2025) unified the "wages" definition,
// cap allowances at 50% of total pay for statutory calc, and extend gratuity
// eligibility to fixed-term employees after 1 year — central/state rules were
// still being finalized as of early 2026. A CA must review and sign off on
// the actual formulas before any real payroll run relies on this table.
// `payrollStatutoryConfigVersions.config` is deliberately untyped (jsonb)
// until that review defines its shape, so the config layer stays swappable.
export const payrollEmployees = pgTable("payroll_employees", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull().unique(),
  fullName: text("full_name").notNull(),
  designation: text("designation"),
  dateOfJoining: date("date_of_joining"),
  panNumber: text("pan_number"),
  pfApplicable: boolean("pf_applicable").notNull().default(false),
  esiApplicable: boolean("esi_applicable").notNull().default(false),
  ctcAnnual: decimal("ctc_annual", { precision: 12, scale: 2 }),
  loginEmployeeId: integer("login_employee_id").references(() => employees.id),
  status: text("status").notNull().default("active"),
  createdBy: integer("created_by").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payrollStatutoryConfigVersions = pgTable("payroll_statutory_config_versions", {
  id: serial("id").primaryKey(),
  effectiveFrom: date("effective_from").notNull(),
  label: text("label").notNull(),
  config: jsonb("config").notNull().default({}),
  isActive: boolean("is_active").notNull().default(false),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ATTACHMENT_ENTITY_TYPES = ["voucher", "expense_claim", "quotation", "party"] as const;
export type AttachmentEntityType = typeof ATTACHMENT_ENTITY_TYPES[number];

export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  originalFileName: text("original_file_name").notNull(),
  storedFileName: text("stored_file_name").notNull().unique(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  uploadedBy: integer("uploaded_by").references(() => employees.id).notNull(),
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

export const JOB_APPLICATION_STATUSES = ["new", "reviewing", "shortlisted", "interview", "offered", "hired", "rejected"] as const;
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

export const smtpSettings = pgTable("smtp_settings", {
  id: serial("id").primaryKey(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(587),
  username: text("username").notNull(),
  password: text("password").notNull(),
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  secure: boolean("secure").notNull().default(false),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * MHTS ERP desktop-app licensing portal. `licenseFileContents` is the full
 * Ed25519-signed license.lic JSON, generated OFFLINE by MHTS ERP's own
 * scripts/generate-license.mjs and pasted in here by staff — this server
 * never signs anything itself, it only hands the pre-signed file back on a
 * valid activation request and tracks which machine(s) activated it.
 */
export const erpLicenses = pgTable("erp_licenses", {
  id: serial("id").primaryKey(),
  licenseId: text("license_id").notNull().unique(),
  activationCodeHash: text("activation_code_hash").notNull(),
  licenseFileContents: text("license_file_contents").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  partyId: integer("party_id").references(() => parties.id),
  maxActivations: integer("max_activations").notNull().default(1),
  status: text("status").notNull().default("pending"), // pending | active | revoked
  // Denormalized copy of the signed payload's own expiry, for portal display/sorting only —
  // NOT itself authoritative. The desktop app always verifies the signed file independently.
  expiresAt: timestamp("expires_at"),
  createdBy: integer("created_by").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** One row per machine that has activated a given erpLicenses record. */
export const erpLicenseActivations = pgTable("erp_license_activations", {
  id: serial("id").primaryKey(),
  erpLicenseId: integer("erp_license_id").references(() => erpLicenses.id).notNull(),
  machineId: text("machine_id").notNull(),
  machineLabel: text("machine_label"),
  activationTokenHash: text("activation_token_hash").notNull(),
  status: text("status").notNull().default("active"), // active | revoked
  firstActivatedAt: timestamp("first_activated_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at"),
  revokedAt: timestamp("revoked_at"),
  revokedBy: integer("revoked_by").references(() => employees.id),
});

export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true });
export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({ id: true, createdAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export const insertCaseStudySchema = createInsertSchema(caseStudies).omit({ id: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, lastLogin: true, passwordChangedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertAccountGroupSchema = createInsertSchema(accountGroups).omit({ id: true });
export const insertLedgerAccountSchema = createInsertSchema(ledgerAccounts).omit({ id: true, createdAt: true });
export const insertFinancialYearSchema = createInsertSchema(financialYears).omit({ id: true });
export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({ id: true });
export const insertLegalPageSchema = createInsertSchema(legalPages).omit({ id: true, updatedAt: true });
export const insertVoucherSchema = createInsertSchema(vouchers).omit({ id: true, createdAt: true });
export const insertVoucherEntrySchema = createInsertSchema(voucherEntries).omit({ id: true });
export const insertAuditNoteSchema = createInsertSchema(auditNotes).omit({ id: true, createdAt: true });
export const insertAttachmentSchema = createInsertSchema(attachments).omit({ id: true, createdAt: true });
export const insertPartySchema = createInsertSchema(parties).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertQuotationSchema = createInsertSchema(quotations).omit({ id: true, createdAt: true });
export const insertExpenseClaimSchema = createInsertSchema(expenseClaims).omit({ id: true, createdAt: true });
export const insertTutorSchema = createInsertSchema(tutors).omit({ id: true, createdAt: true }).extend({
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "PAN must be in the format AAAAA9999A").optional().or(z.literal("")),
});
// Note: grossEarnings/tdsAmount/netPay/tdsRatePercent are accepted here for the
// InsertTutorPayslip type shape, but the server ALWAYS recomputes them from the
// raw rate/hours/LWP/PAN fields before insert — client-sent totals are never trusted.
export const insertTutorPayslipSchema = createInsertSchema(tutorPayslips).omit({ id: true, createdAt: true });
export const insertPayrollEmployeeSchema = createInsertSchema(payrollEmployees).omit({ id: true, createdAt: true });
export const insertPayrollStatutoryConfigVersionSchema = createInsertSchema(payrollStatutoryConfigVersions).omit({ id: true, createdAt: true });
export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({ id: true, createdAt: true });
export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({ id: true, createdAt: true });
export const insertFaqItemSchema = createInsertSchema(faqItems).omit({ id: true, createdAt: true });
export const insertTestimonialSchema = createInsertSchema(testimonials).omit({ id: true, createdAt: true });
export const insertSiteStatSchema = createInsertSchema(siteStats).omit({ id: true });
export const insertPricingPlanSchema = createInsertSchema(pricingPlans).omit({ id: true, createdAt: true });
export const insertSmtpSettingsSchema = createInsertSchema(smtpSettings).omit({ id: true });
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export const insertErpLicenseSchema = createInsertSchema(erpLicenses).omit({ id: true, createdAt: true });
export const insertErpLicenseActivationSchema = createInsertSchema(erpLicenseActivations).omit({ id: true, firstActivatedAt: true });

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
export type LegalPage = typeof legalPages.$inferSelect;
export type InsertLegalPage = z.infer<typeof insertLegalPageSchema>;
export type Voucher = typeof vouchers.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type VoucherEntry = typeof voucherEntries.$inferSelect;
export type InsertVoucherEntry = z.infer<typeof insertVoucherEntrySchema>;
export type AuditNote = typeof auditNotes.$inferSelect;
export type InsertAuditNote = z.infer<typeof insertAuditNoteSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Party = typeof parties.$inferSelect;
export type InsertParty = z.infer<typeof insertPartySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type ExpenseClaim = typeof expenseClaims.$inferSelect;
export type InsertExpenseClaim = z.infer<typeof insertExpenseClaimSchema>;
export type Tutor = typeof tutors.$inferSelect;
export type InsertTutor = z.infer<typeof insertTutorSchema>;
export type TutorPayslip = typeof tutorPayslips.$inferSelect;
export type InsertTutorPayslip = z.infer<typeof insertTutorPayslipSchema>;
export type PayrollEmployee = typeof payrollEmployees.$inferSelect;
export type InsertPayrollEmployee = z.infer<typeof insertPayrollEmployeeSchema>;
export type PayrollStatutoryConfigVersion = typeof payrollStatutoryConfigVersions.$inferSelect;
export type InsertPayrollStatutoryConfigVersion = z.infer<typeof insertPayrollStatutoryConfigVersionSchema>;
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
export type SmtpSettings = typeof smtpSettings.$inferSelect;
export type InsertSmtpSettings = z.infer<typeof insertSmtpSettingsSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type ErpLicense = typeof erpLicenses.$inferSelect;
export type InsertErpLicense = z.infer<typeof insertErpLicenseSchema>;
export type ErpLicenseActivation = typeof erpLicenseActivations.$inferSelect;
export type InsertErpLicenseActivation = z.infer<typeof insertErpLicenseActivationSchema>;

export const ROLES = ["super_admin", "admin", "auditor", "senior_accountant", "accountant", "data_entry", "viewer", "sales_person", "sales_manager", "tutor"] as const;
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
  tutor: "Tutor (Self-Service)",
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
  "erp_licenses.view", "erp_licenses.manage",
  "payroll_tutors.view", "payroll_tutors.manage", "payroll_tutors.process", "payroll_tutors.approve", "payroll_tutors.view_own",
  "payroll_employees.view", "payroll_employees.manage",
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
  erp_licenses: { label: "ERP Licenses", permissions: ["erp_licenses.view", "erp_licenses.manage"] },
  payroll_tutors: { label: "Payroll - Tutors", permissions: ["payroll_tutors.view", "payroll_tutors.manage", "payroll_tutors.process", "payroll_tutors.approve", "payroll_tutors.view_own"] },
  payroll_employees: { label: "Payroll - Employees (Stub)", permissions: ["payroll_employees.view", "payroll_employees.manage"] },
};

export const SYSTEM_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [...ALL_PERMISSIONS],
  // erp_licenses.* is deliberately excluded here too, alongside settings.* — confirmed with
  // the user that ONLY super_admin should be able to create/revoke ERP licenses or see
  // activation codes, not every admin.
  admin: ALL_PERMISSIONS.filter(p => !p.startsWith("settings.") && !p.startsWith("erp_licenses.")),
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
    // Senior Accountant can prepare/submit payroll but NOT approve/mark-paid —
    // approval requires super_admin or admin (one-step verification), same as
    // the quotations.approve split above.
    "payroll_tutors.view", "payroll_tutors.manage", "payroll_tutors.process",
    "payroll_employees.view", "payroll_employees.manage",
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
  // Tutor self-service: view-only access to their own payslips. Scoped
  // server-side to the tutor record linked via tutors.loginEmployeeId —
  // this permission alone grants no visibility into other tutors' data.
  tutor: ["payroll_tutors.view_own"],
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

