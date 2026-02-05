# Maanagaram Hi Tech Solutions (MHTSdigiX)

## Overview

This is a full-stack digital agency website for Maanagaram Hi Tech Solutions, a company providing end-to-end digital services including web development, mobile apps, SEO, branding, and AI integrations. The application features a React frontend with a modern design system, Express backend with PostgreSQL database, and integrated AI chat capabilities via Replit AI Integrations.

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
- Reusable UI components in `client/src/components/ui/` (shadcn/ui)
- Layout components in `client/src/components/layout/` (Navbar, Footer)
- Custom hooks in `client/src/hooks/` for data fetching

### Backend Architecture
- **Framework**: Express 5 with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **API Routes**: Defined in `server/routes.ts` with type-safe route definitions in `shared/routes.ts`

The backend serves both the API and static files in production. In development, Vite middleware handles the frontend.

### Data Models
- **Posts**: Blog articles with title, slug, content, summary
- **Services**: Company services with icon, description, features
- **Case Studies**: Project showcases with client info and results
- **Contact Messages**: Form submissions from visitors
- **Conversations/Messages**: AI chat history storage

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