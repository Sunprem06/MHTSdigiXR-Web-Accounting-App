# Maanagarram Hi Tech Solutions (MHTSdigiX)

## Overview

This is a full-stack digital agency website for Maanagarram Hi Tech Solutions, a company providing end-to-end digital services including web development, mobile apps, SEO, branding, and AI integrations. The application features a React frontend with a modern design system, Express backend with PostgreSQL database, integrated AI chat capabilities via Replit AI Integrations, and a full TallyPrime-inspired accounting system with role-based access control.

## Recent Changes (Mar 2026)

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
- **Role-Based Access Control**: 7 world-standard roles (Super Admin, Admin, Auditor, Senior Accountant, Accountant, Data Entry Operator, Viewer)
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
- **Employees**: User accounts with roles and credentials
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

### Accounting System Roles

| Role | Access Level |
|------|-------------|
| Super Admin | Full system control — all users, settings, data |
| Admin | Manage users (except Super Admin), all accounting operations |
| Auditor | Read-only + audit notes, cannot modify financial data |
| Senior Accountant | Create/edit/approve vouchers, manage ledgers, all reports |
| Accountant | Create/edit vouchers, view ledgers, view reports |
| Data Entry Operator | Create draft vouchers only, view own entries |
| Viewer | Read-only dashboard, summary access only |

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
