# Maanagarram Hi Tech Solutions (MHTSdigiXR)

## Overview

This is a full-stack digital agency website for Maanagarram Hi Tech Solutions (brand: MHTSdigiXR), a company providing end-to-end digital services including web development, mobile apps, SEO, branding, and AI integrations. The application features a React frontend with a modern design system, Express backend with PostgreSQL database, integrated AI chat capabilities via Replit AI Integrations, and a full TallyPrime-inspired accounting system with role-based access control.

## Recent Changes (Mar 2026)

- **Website Content CMS**: Self-service content management for Super Admin/Admin. Blog Posts (create/edit/delete, draft/published status) at `/accounting/blog-posts`; Case Studies management at `/accounting/case-studies`; FAQ Management with categories at `/accounting/faqs`; Testimonials management at `/accounting/testimonials`; Site Stats management at `/accounting/site-stats`; Contact Inbox with read/unread tracking and unread badge at `/accounting/contact-inbox`. Public pages (Blog, FAQ, Home) pull from API with fallback to hardcoded data. New permissions: `content.view/create/edit/delete`, `contacts.view/manage`. Seed data auto-populates FAQs, testimonials, stats, and blog posts on first run. Sidebar "Website CMS" section with expandable sub-items.
- **Careers & Recruitment Module**: Job Postings management (create/edit/delete/toggle open) at `/accounting/job-postings`; Job Applications tracking with status workflow (new → reviewing → shortlisted → interview → offered → hired/rejected) at `/accounting/job-applications`; Public Careers page fetches live job data from API with dynamic department tabs and inline apply modal; `jobs.view`, `jobs.create`, `jobs.edit`, `jobs.delete` permissions; Recruitment sidebar item in accounting layout; System role seed auto-updates existing roles with new permissions
- **Database-Driven Roles & Permissions**: New `roles` DB table with slug, label, description, permissions (JSONB), isSystem flag. 9 system roles seeded on startup (Super Admin, Admin, Auditor, Senior Accountant, Accountant, Data Entry Operator, Viewer, Sales Person, Sales Manager). 39 granular permissions organized into 14 groups (dashboard, ledgers, parties, products, quotations, invoices, vouchers, expenses, reports, audit, employees, roles, settings, jobs). Employees table has optional `permissions` JSONB for per-user overrides. `hasPermission()` / `hasAnyPermission()` in useAuth hook. Sidebar nav items filtered by permission. New Roles Management page at /accounting/roles for Super Admin/Admin. Employee Add/Edit loads roles dynamically from API. ProtectedRoute supports `requiredPermission` prop.
- **Quotation Approval Workflow**: Draft → Submit for Review → Approve/Reject flow; added assignedTo, reviewedBy, reviewedAt, submittedAt columns; Senior Accountant/Admin/Super Admin can approve or reject submitted quotations with optional rejection reason; data_entry users can create and submit their own quotations; "Assigned To" column in list; amber "Submitted" badge; workflow trail shown in QuotationView
- **Quotation Fixes**: Fixed quotation number generation to use MAX instead of count(*) to prevent gaps after deletions; added Edit/Delete buttons restricted to Super Admin and Admin roles; added quotation View page with print support; quotation edit mode loads existing data via PATCH
- **Invoices Tab**: New dedicated Invoices section in sidebar (between Products and Vouchers); Invoices list page showing all Sales vouchers; InvoiceEntry form for creating sales invoices with product line items, GST calculations, and auto-generated ledger entries; Invoice View back button updated to point to Invoices list
- **Rebrand to MHTSdigiXR**: Updated brand name from MHTSdigiX to MHTSdigiXR across all pages, new butterfly logo, domain changed to mhtsdigixr.com, email changed to info@mhtsdigixr.com
- **Navbar Login Link**: Added "Login" link with LogIn icon in navbar (desktop + mobile) pointing to /accounting/login, styled with sky blue outline
- **Delete Functionality**: Super Admin and Admin can delete Products, Parties, and Expense Claims with audit logging
- **Voucher Product Mode**: Sales/Purchase vouchers support optional product/service line items with auto-generated double-entry ledger entries (GST-aware)
- **Quick Add Party**: Quotation entry has inline dialog to create new customer without navigating away
- **Expanded Accounting Modules**: Products/Services catalog, Parties (Customer/Vendor) master, Quotations, Expense Claims
- **GST Compliance**: CGST/SGST/IGST calculations on vouchers, GST Summary report, SAC codes for services
- **Credit/Debit Notes**: Added credit_note and debit_note voucher types
- **Invoice & Receipt Views**: Printable GST tax invoice from Sales vouchers, Payment receipt from Receipt vouchers
- **16 Account Groups**: Standard Indian chart of accounts with 40+ pre-loaded ledger accounts
- **10 Pre-loaded Service Products**: Website Dev, Mobile App, SEO, SMM, Branding, Domain/Hosting, etc. with SAC codes
- **Improved Dashboard**: Cash in Hand, Bank Balance, Receivables, Payables, Active FY display, Quick Actions
- **Quotation Module**: Create quotations with line items, GST calc, convert to Sales Invoice
- **Expense Management**: Employee expense claim submission, approval workflow
- **Ledger Statements**: Transaction history with running balance per account
- **Accounting Application**: Full TallyPrime 7.0-inspired accounting system with double-entry bookkeeping
- **Role-Based Access Control**: 9 database-driven roles with 35 granular permissions (Super Admin, Admin, Auditor, Senior Accountant, Accountant, Data Entry Operator, Viewer, Sales Person, Sales Manager)
- **Authentication System**: Passport.js with express-session, bcrypt password hashing, PostgreSQL session store
- **Voucher System**: Sales, Purchase, Payment, Receipt, Journal, Contra, Credit Note, Debit Note with approval workflow
- **Financial Reports**: Day Book, Trial Balance, Profit & Loss (Gross + Net), Balance Sheet (with Net Profit), GST Summary
- **Audit Trail**: Comprehensive audit logging with auditor note capability
- **Employee Management**: Role-based employee CRUD with permission hierarchy

## Previous Changes (Feb 2026)

- **Sky Blue Color Scheme**: Replaced all emerald/teal accent colors with sky blue across entire site
- **AI Chatbot "Kayal"**: Renamed from "Meena" to "Kayal" - expert in service/sales/marketing/technical/customer support
- **Light Mode Default**: Website defaults to light mode (not system preference), full dark mode toggle support
- **Dark Mode Support**: Full dark mode with toggle in Navbar (desktop + mobile), localStorage persistence
- **Sky Blue Buttons**: All buttons use sky blue color with rounded-full styling
- **Logo Watermark**: 25% opacity in light mode, 10% opacity in dark mode

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for page transitions and scroll animations
- **Build Tool**: Vite with hot module replacement

The frontend follows a component-based architecture with:
- Pages in `client/src/pages/` for each route (Home, Services, Contact, etc.)
- Accounting pages in `client/src/pages/accounting/` (Dashboard, Ledgers, Vouchers, Reports, etc.)
- Reusable UI components in `client/src/components/ui/` (shadcn/ui)
- Layout components in `client/src/components/layout/` (Navbar, Footer)
- Accounting components in `client/src/components/accounting/` (AccountingLayout, ProtectedRoute)
- Custom hooks in `client/src/hooks/` (use-auth, use-toast, etc.)

### Backend Architecture
- **Framework**: Express 5 with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with passport-local strategy, express-session with connect-pg-simple
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Auth Module**: `server/auth.ts` (passport setup, session management, role middleware)
- **API Routes**: Defined in `server/routes.ts`

### Data Models
- **Posts**: Blog articles with title, slug, content, summary
- **Services**: Company services with icon, description, features
- **Case Studies**: Project showcases with client info and results
- **Contact Messages**: Form submissions from visitors
- **Conversations/Messages**: AI chat history storage
- **Roles**: Role definitions with slug, label, description, permissions (JSONB), isSystem flag
- **Employees**: User accounts with roles, optional per-user permission overrides
- **Audit Logs**: System activity tracking
- **Account Groups**: Chart of account categories (Assets, Liabilities, Income, Expenses, Capital)
- **Ledger Accounts**: Individual accounts within groups
- **Vouchers**: Transaction entries with approval workflow
- **Voucher Entries**: Double-entry debit/credit line items
- **Financial Years**: Fiscal period management
- **Company Settings**: Organization details for reports
- **Audit Notes**: Auditor comments on entries
- **Parties**: Customer/Vendor master with GSTIN, PAN, credit terms
- **Products**: Service catalog with HSN/SAC codes, GST rates, pricing
- **Quotations**: Estimates with line items, GST calculation, convert-to-invoice
- **Expense Claims**: Employee expense submissions with approval workflow
- **Job Postings**: Career opportunities with title, department, location, type, description, requirements, salary range, open/closed status
- **Job Applications**: Candidate applications with name, email, phone, cover letter, resume URL, status workflow tracking

### Accounting System Roles (Database-Driven)

Roles are stored in the `roles` DB table with granular permissions. 9 system roles are seeded on startup. Custom roles can be created via the Roles Management page.

| Role | Access Level |
|------|-------------|
| Super Admin | Full system control — all 35 permissions |
| Admin | All except settings management (33 permissions) |
| Auditor | Read-only + audit notes (11 permissions) |
| Senior Accountant | Create/edit/approve vouchers, manage ledgers, full CRUD (27 permissions) |
| Accountant | Create/edit vouchers, view ledgers, reports (21 permissions) |
| Data Entry Operator | Create drafts, view own entries (9 permissions) |
| Viewer | Dashboard view only (1 permission) |
| Sales Person | Quotations, parties, products (7 permissions) |
| Sales Manager | Approve quotations, manage parties, reports (13 permissions) |

Permissions are organized in 15 groups: dashboard, ledgers, parties, products, quotations, invoices, vouchers, expenses, reports, audit, employees, roles, settings, content, contacts.

### Default Login
- **Username**: superadmin
- **Password**: admin123
- **Access URL**: /accounting/login

### AI Integrations
Located in `server/replit_integrations/`, these provide:
- **Chat**: Text-based AI conversations with streaming responses
- **Audio**: Voice chat with speech-to-text and text-to-speech
- **Image**: AI image generation via OpenAI
- **Batch**: Utilities for processing multiple items through LLMs

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connected via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with schema in `shared/schema.ts`
- **drizzle-kit**: Database migrations via `npm run db:push`

### Authentication
- **passport**: Authentication middleware
- **passport-local**: Local strategy for username/password
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **bcryptjs**: Password hashing

### AI Services
- **OpenAI API**: Accessed through Replit AI Integrations
- Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

### Key NPM Packages
- **@tanstack/react-query**: Server state management
- **framer-motion**: Animations
- **zod**: Schema validation for API requests/responses
- **drizzle-zod**: Generate Zod schemas from Drizzle tables
- **wouter**: Client-side routing
- **react-hook-form**: Form handling with `@hookform/resolvers`

### Fonts
- DM Sans (body text)
- Outfit (display headings)
- Loaded via Google Fonts in `client/index.html`
