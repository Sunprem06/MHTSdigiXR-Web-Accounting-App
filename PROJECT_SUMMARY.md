# MHTSdigiXR — Project Summary

**Company:** Maanagarram Hi Tech Solutions  
**Brand:** MHTSdigiXR  
**Website:** mhtsdigixr.com  
**Contact:** info@mhtsdigixr.com  
**Default Admin Login:** Username `superadmin` / Password `admin123` → go to `/accounting/login`

---

## What Was Built

A complete, production-ready digital agency platform with two main parts:

1. **Public-facing website** — showcasing services, blog, careers, about, contact, FAQs, legal pages, and an AI chatbot
2. **Internal accounting & management system** — full double-entry accounting, CMS, HR, reporting, and role-based access control

---

## Work Carried Out — Task by Task

### Task 1 — Rebrand to MHTSdigiXR
- Changed company name from MHTSdigiX to MHTSdigiXR everywhere
- Updated logo (butterfly design), domain, and email across all pages
- Added "Login" button in the main navbar pointing to the accounting system

### Task 2 — Quotation Fixes & Invoice Tab
- Fixed quotation number gaps (now uses MAX instead of counting rows)
- Added Edit, Delete, and View buttons on quotations (restricted to Super Admin / Admin)
- Added printable quotation view page
- Added a dedicated **Invoices** section in the sidebar with a full invoice entry form and GST line items
- Print support for tax invoices and payment receipts

### Task 3 — Quotation Approval Workflow
- Quotations now follow a workflow: Draft → Submit for Review → Approve / Reject
- Senior Accountant, Admin, and Super Admin can approve or reject submitted quotations with an optional rejection reason
- Data Entry users can create and submit their own quotations
- Assigned-to column and workflow trail shown inside the quotation view

### Task 4 — Roles Management & Access Control (Database-Driven)
- All roles are now stored in the database (not hardcoded)
- 9 system roles seeded automatically: Super Admin, Admin, Auditor, Senior Accountant, Accountant, Data Entry Operator, Viewer, Sales Person, Sales Manager
- 39 granular permissions organised across 15 groups
- New **Roles Management** page at `/accounting/roles` — Super Admin can create, edit, delete custom roles
- Employee Management loads roles from the database dynamically
- Sidebar navigation items are filtered based on the logged-in user's permissions
- `ProtectedRoute` supports permission-based page guarding

### Task 5 — Site Settings (Self-Service)
- Super Admin can update company contact details, WhatsApp number, social media links, copyright text, tagline, and careers email from the Settings page — no developer needed
- Footer and contact page read these values from the database in real time

### Task 6 — Careers & Recruitment Management
- Job Postings management at `/accounting/job-postings` — create, edit, delete, open/close postings
- Job Applications tracking at `/accounting/job-applications` with a full status workflow: New → Reviewing → Shortlisted → Interview → Offered → Hired / Rejected
- Public Careers page shows live job data from the database with department tabs and an inline apply modal
- New permissions: `jobs.view`, `jobs.create`, `jobs.edit`, `jobs.delete`

### Task 7 — Website Content CMS
- Blog Posts management at `/accounting/blog-posts` (draft/published)
- Case Studies management at `/accounting/case-studies`
- FAQ Management with categories at `/accounting/faqs`
- Testimonials management at `/accounting/testimonials`
- Site Stats management at `/accounting/site-stats` (the numbers on the homepage)
- Contact Inbox at `/accounting/contact-inbox` with read/unread tracking and badge
- Public pages (Blog, FAQ, Home) pull live data from the database with fallback to defaults
- New permissions: `content.view/create/edit/delete`, `contacts.view/manage`

### Task 8 — Services & Pricing Plan Management
- Services (Web Dev, Mobile App, SEO, etc.) editable from `/accounting/services-management`
- Pricing Plans editable from `/accounting/pricing-plans`
- Public Services page reads from database with loading skeleton
- All plans support: one-time, monthly, yearly, or custom quote pricing

### Task 9 — Legal Pages + About Page Management
- Three Indian law-compliant legal pages: Privacy Policy, Terms of Service, No Refund Policy
- All stored in the database; Super Admin can edit them from Settings → Legal Pages
- Pages cover: IT Act 2000, Consumer Protection Act 2019, Chennai jurisdiction
- About page (story, vision, mission, founded year, location) editable from Settings → About Page Content
- Footer links updated to point to all three policy pages

### Task 10 — Forgot Password (Email-Based Reset)
- "Forgot Password?" link on the login page
- User enters their registered email → receives a reset link valid for 1 hour
- Clicking the link opens a page to set a new password
- Reset tokens stored in the database, expire automatically

### Task 11 — Welcome Email on New Employee Creation
- When a new employee is added via Employee Management, a welcome email is automatically sent to their email address
- Email contains: username, password, role, and direct login link
- If SMTP is not yet configured, the employee is created but a warning toast appears
- Email result (sent / not sent) is shown to the admin immediately

### Task 12 — Email / SMTP Settings (Self-Service)
- Super Admin can configure email settings from Settings → Email / SMTP Settings
- Fields: SMTP host, port, SSL/TLS toggle, username, password, sender name, sender email
- "Send Test Email" button to verify the connection without writing any code
- Pre-configured to work with Hostinger Mail (smtp.hostinger.com, port 465, SSL)
- No developer involvement needed for email setup or changes

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, shadcn/ui |
| Routing | Wouter |
| Server state | TanStack React Query |
| Animations | Framer Motion |
| Build tool | Vite |
| Backend | Express 5, TypeScript |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Authentication | Passport.js + express-session |
| Email | Nodemailer |
| AI Chatbot | OpenAI via Replit AI Integrations |

---

## User Roles & Permissions

| Role | What They Can Do |
|---|---|
| **Super Admin** | Full access — all 39 permissions including settings, roles, legal pages, SMTP |
| **Admin** | Almost everything except settings management |
| **Auditor** | Read-only + can add audit notes |
| **Senior Accountant** | Create/edit/approve vouchers, manage ledgers, reports |
| **Accountant** | Create/edit vouchers, view ledgers and reports |
| **Data Entry Operator** | Create draft entries, view own entries |
| **Viewer** | Dashboard view only |
| **Sales Person** | Quotations, parties, products |
| **Sales Manager** | Approve quotations, manage parties, view reports |

Custom roles can be created at `/accounting/roles`.

---

## Key Pages & Routes

| Page | URL | Access |
|---|---|---|
| Home | `/` | Public |
| Services | `/services` | Public |
| Blog | `/blog` | Public |
| Careers | `/careers` | Public |
| Contact | `/contact` | Public |
| Privacy Policy | `/privacy-policy` | Public |
| Terms of Service | `/terms-of-service` | Public |
| No Refund Policy | `/refund-policy` | Public |
| Accounting Login | `/accounting/login` | Public |
| Forgot Password | `/accounting/forgot-password` | Public |
| Dashboard | `/accounting` | Authenticated |
| Employee Management | `/accounting/employees` | Admin+ |
| Roles Management | `/accounting/roles` | Admin+ |
| Settings | `/accounting/settings` | Admin+ |
| Website CMS | `/accounting/blog-posts` etc. | Content permission |
| Reports | `/accounting/reports/...` | Reports permission |

---

## AI Chatbot "Kayal"
- Floating chat button on the website (bottom right)
- Expert in services, sales, marketing, technical support, and customer queries
- Powered by OpenAI via Replit AI Integrations
- Conversations stored in the database

---

## Default Data Seeded on First Run
- 9 system roles with permissions
- 40+ ledger accounts (Indian chart of accounts)
- 10 service products with GST/SAC codes
- FAQ items, testimonials, site stats, blog posts
- 3 legal pages (Privacy Policy, Terms of Service, No Refund Policy)
- 16 account groups
