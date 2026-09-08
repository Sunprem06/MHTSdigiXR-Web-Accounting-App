# MHTSdigiX - Maanagarram Hi Tech Solutions Website

## Project Overview

A professional digital agency website for **Maanagarram Hi Tech Solutions** (Brand: **MHTSdigiX**). Built with React, TypeScript, Express, and PostgreSQL. Features sky blue color scheme, AI chatbot named "Kayal", comprehensive service showcase, FAQ section, and Careers page.

**Last Updated:** February 2026

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| Routing | Wouter |
| Animations | Framer Motion |
| Backend | Express 5, TypeScript |
| Database | PostgreSQL (Drizzle ORM) |
| AI Chat | OpenAI (Replit AI Integrations) |

---

## File Structure

```
client/
├── src/
│   ├── pages/                    # All website pages
│   │   ├── Home.tsx              # Landing page
│   │   ├── About.tsx             # About us page
│   │   ├── Services.tsx          # All services listing
│   │   ├── ServiceDetail.tsx     # Individual service details
│   │   ├── FAQ.tsx               # Frequently asked questions
│   │   ├── Careers.tsx           # Job openings
│   │   ├── Contact.tsx           # Contact form
│   │   ├── Blog.tsx              # Blog listing
│   │   ├── CaseStudies.tsx       # Case studies
│   │   └── Workflow.tsx          # How we work
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx        # Top navigation
│   │   │   └── Footer.tsx        # Footer with links
│   │   ├── widgets/
│   │   │   └── FloatingActions.tsx # Chat widget + scroll button
│   │   └── ui/                   # shadcn/ui components
│   ├── lib/                      # Utilities
│   └── App.tsx                   # Main app with routes
server/
├── routes.ts                     # API endpoints
├── storage.ts                    # Database operations
└── replit_integrations/          # AI chat integration
shared/
└── schema.ts                     # Database schema
```

---

## Page-by-Page Editing Guide

### 1. HOME PAGE (`client/src/pages/Home.tsx`)

**What you can change:**

#### Hero Section (Lines 150-250)
```typescript
// Change hero headline
<h1>Transform Your Digital Presence</h1>

// Change hero description
<p>We create stunning websites...</p>

// Change CTA button text
<Button>Get Started Today</Button>
```

#### Stats Counter (Lines 280-320)
```typescript
const stats = [
  { value: 500, suffix: "+", label: "Projects Delivered" },
  { value: 50, suffix: "+", label: "Team Members" },
  { value: 10, suffix: "+", label: "Years Experience" },
  { value: 98, suffix: "%", label: "Client Satisfaction" }
];
```
**To update:** Change the `value`, `suffix`, and `label` for each stat.

#### Client Logos (Lines 350-400)
```typescript
const clients = ["Company 1", "Company 2", ...];
```
**To add client:** Add company name to the array.

#### Testimonials (Lines 420-500)
```typescript
const testimonials = [
  {
    name: "Client Name",
    role: "CEO, Company",
    content: "Their work exceeded our expectations...",
    image: "https://..."
  }
];
```
**To add testimonial:** Add new object with name, role, content, and image URL.

#### Awards Section (Lines 520-580)
```typescript
const awards = [
  { title: "Best Digital Agency 2024", org: "Award Organization" }
];
```

---

### 2. ABOUT PAGE (`client/src/pages/About.tsx`)

**What you can change:**

#### Company Vision/Mission (Lines 80-120)
```typescript
<h2>Our Vision</h2>
<p>To be the leading digital transformation partner...</p>

<h2>Our Mission</h2>
<p>Empowering businesses with innovative solutions...</p>
```

#### Core Values (Lines 150-200)
```typescript
const values = [
  { icon: Heart, title: "Customer First", desc: "..." },
  { icon: Zap, title: "Innovation", desc: "..." }
];
```
**To change values:** Update the `title` and `desc` fields.

#### Team Section (Lines 250-320)
```typescript
const team = [
  {
    name: "Team Member Name",
    role: "Designation",
    image: "https://..."
  }
];
```

---

### 3. SERVICES PAGE (`client/src/pages/Services.tsx`)

**What you can change:**

#### Services List (Lines 20-170)
```typescript
const services = [
  {
    slug: "web-development",        // URL slug (keep lowercase, hyphenated)
    icon: Globe,                     // Lucide icon name
    title: "Web Development",        // Display title
    desc: "Build modern websites...", // Short description
    features: ["Feature 1", "Feature 2", "Feature 3"], // 3 key features
    color: "from-sky-400 to-sky-600", // Gradient colors
    image: "https://..."             // Card image URL
  }
];
```

**To add a new service:**
1. Add new object to the `services` array
2. Add corresponding entry in `ServiceDetail.tsx` (see below)
3. Use sky-based gradients: `from-sky-400 to-sky-600`

**To remove a service:**
1. Delete the object from the array
2. Remove corresponding entry from `ServiceDetail.tsx`

---

### 4. SERVICE DETAIL PAGE (`client/src/pages/ServiceDetail.tsx`)

**What you can change:**

#### Service Details (Lines 20-250)
```typescript
const serviceDetails: Record<string, ServiceDetailType> = {
  "web-development": {
    title: "Web Development",
    desc: "Short description",
    longDesc: "Detailed description paragraph...",
    image: "https://...",
    features: [
      "Responsive Website Design",
      "E-commerce Development",
      "CMS Integration"
    ],
    benefits: [
      { icon: Zap, title: "Fast Loading", desc: "..." }
    ],
    process: [
      { step: 1, title: "Discovery", desc: "..." },
      { step: 2, title: "Design", desc: "..." },
      { step: 3, title: "Development", desc: "..." },
      { step: 4, title: "Launch", desc: "..." }
    ],
    technologies: ["React", "Node.js", "PostgreSQL"]
  }
};
```

**To add a new service detail:**
1. Add new key matching the `slug` from `Services.tsx`
2. Fill all fields: title, desc, longDesc, image, features, benefits, process, technologies

---

### 5. FAQ PAGE (`client/src/pages/FAQ.tsx`)

**What you can change:**

#### FAQ Categories (Lines 30-60)
```typescript
const categories = [
  { id: "general", name: "General", icon: HelpCircle },
  { id: "web-development", name: "Web Development", icon: Globe }
];
```

#### FAQ Questions (Lines 70-500)
```typescript
const faqs = [
  {
    id: "1",
    category: "general",           // Must match category id
    question: "What services do you offer?",
    answer: "We offer web development, mobile apps..."
  }
];
```

**To add a new FAQ:**
1. Add new object with unique `id`
2. Set `category` to match an existing category id
3. Add `question` and `answer`

**To add a new category:**
1. Add category object with `id`, `name`, and `icon`
2. Import icon from `lucide-react`

---

### 6. CAREERS PAGE (`client/src/pages/Careers.tsx`)

**What you can change:**

#### Job Positions (Lines 22-150)
```typescript
const JOB_POSITIONS = [
  {
    id: "fullstack-dev",           // Unique ID
    title: "Full Stack Developer",
    department: "Engineering",
    location: "Chennai, India",
    type: "Full-time",
    experience: "3-5 years",
    description: "Job description...",
    requirements: [
      "3+ years experience...",
      "Strong React skills..."
    ],
    responsibilities: [
      "Design and develop...",
      "Build APIs..."
    ]
  }
];
```

**Current Positions:**
1. Full Stack Developer
2. UI/UX Designer
3. Digital Marketing Executive
4. Content Writer
5. Business Development Executive

**To add a new position:**
1. Add new object to `JOB_POSITIONS` array
2. Include all required fields

**To remove a position:**
1. Delete the object from the array

#### Company Benefits (Lines 200-250)
```typescript
const benefits = [
  { icon: Heart, title: "Health Insurance", desc: "..." },
  { icon: GraduationCap, title: "Learning Budget", desc: "..." }
];
```

---

### 7. CONTACT PAGE (`client/src/pages/Contact.tsx`)

**What you can change:**

#### Contact Information (Lines 50-90)
```typescript
const contactInfo = {
  address: "123 Main Street, Chennai, Tamil Nadu 600001",
  phone: "+91 98765 43210",
  email: "hello@mhtsdigix.com",
  hours: "Mon-Fri: 9AM - 6PM IST"
};
```

#### Social Media Links (Lines 100-120)
```typescript
const socialLinks = [
  { icon: Facebook, url: "https://facebook.com/mhtsdigix" },
  { icon: Twitter, url: "https://twitter.com/mhtsdigix" },
  { icon: LinkedIn, url: "https://linkedin.com/company/mhtsdigix" }
];
```

---

## Component Editing Guide

### NAVIGATION (`client/src/components/layout/Navbar.tsx`)

#### Navigation Links (Lines 20-40)
```typescript
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/faq", label: "FAQ" },
  { href: "/careers", label: "Careers" },
  { href: "/contact", label: "Contact" }
];
```

**To add a new navigation link:**
1. Add new object with `href` (URL path) and `label` (display text)
2. Create corresponding page in `client/src/pages/`
3. Add route in `client/src/App.tsx`

---

### FOOTER (`client/src/components/layout/Footer.tsx`)

#### Footer Links
- Quick Links section
- Services section
- Social media icons
- Copyright text

---

### AI CHATBOT "KAYAL" (`client/src/components/widgets/FloatingActions.tsx`)

The chatbot uses OpenAI through Replit AI Integrations.

#### Chatbot Personality (in `server/routes.ts`)
```typescript
const systemPrompt = `You are Kayal, a friendly AI assistant for MHTSdigiX...`;
```

**To customize Kayal's personality:**
1. Edit the system prompt in `server/routes.ts`
2. Add company-specific knowledge
3. Define response style and tone

---

## Styling Guide

### Button Styling (Sky Blue Theme)
All buttons use this standard styling:
```typescript
<Button className="bg-sky-500 hover:bg-sky-600 text-white rounded-full px-6 py-2">
  Button Text
</Button>
```

### Color Palette
| Color | Tailwind Class | Usage |
|-------|---------------|-------|
| Sky Blue (Primary) | `bg-sky-500` | Buttons, accents |
| Sky Blue (Hover) | `hover:bg-sky-600` | Button hover state |
| Sky Blue (Light) | `bg-sky-50` | Backgrounds |
| Dark Text | `text-gray-900` | Headings |
| Body Text | `text-gray-600` | Paragraphs |

### Logo Watermark
Logo watermark uses 25% opacity across all pages:
```typescript
<img className="opacity-25" ... />
```

---

## Adding New Pages

1. **Create Page File:**
   ```
   client/src/pages/NewPage.tsx
   ```

2. **Add Route in App.tsx:**
   ```typescript
   import NewPage from "@/pages/NewPage";
   
   <Route path="/new-page" component={NewPage} />
   ```

3. **Add Navigation Link:**
   Update `Navbar.tsx` and `Footer.tsx`

---

## Database Schema

Located in `shared/schema.ts`:

```typescript
// Contact form submissions
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// AI chat conversations
export const conversations = pgTable("conversations", {...});
export const messages = pgTable("messages", {...});
```

---

## Common Tasks

### Update Company Information
1. Edit `Contact.tsx` for address/phone/email
2. Edit `Footer.tsx` for copyright and links
3. Edit `About.tsx` for company story

### Add New Service
1. Add to `Services.tsx` services array
2. Add detailed entry in `ServiceDetail.tsx`
3. Update FAQ if needed

### Add New Job Position
1. Add to `JOB_POSITIONS` in `Careers.tsx`
2. Include all required fields

### Update FAQ
1. Add new question to `faqs` array in `FAQ.tsx`
2. Assign to appropriate category

### Change Theme Colors
1. Update `client/src/index.css` for global colors
2. Search and replace color classes in components

---

## Running the Project

```bash
# Development
npm run dev

# Database migrations
npm run db:push

# Build for production
npm run build
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session encryption key |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key (auto-configured) |
| `APP_BASE_URL` | Public base URL of the app (e.g. `https://yourdomain.com`), used to build password-reset links. Falls back to the Replit dev domain when unset. |

### Initial super admin seeding

On first startup, if no super admin account exists yet, one is created from these variables. The seed never runs again once that account exists, and it never overwrites an existing admin's details.

| Variable | Description |
|----------|-------------|
| `INITIAL_ADMIN_USERNAME` | Username for the seeded super admin (default: `superadmin`) |
| `INITIAL_ADMIN_EMAIL` | Email for the seeded super admin (default: `admin@localhost` — set this so password reset emails can reach you) |
| `INITIAL_ADMIN_PASSWORD` | Password for the seeded super admin. If unset, a random password is generated and printed **once** to the server log at startup — copy it immediately, it is not stored anywhere. |
| `INITIAL_ADMIN_PHONE` | Phone number for the seeded super admin (optional) |

To reset the password later without touching the database directly, run:

```bash
npm run reset-admin-password -- --username=superadmin
# or with a specific password:
npm run reset-admin-password -- --username=superadmin --password="NewStrongPass123!"
```

### SMTP / email

SMTP can be configured from the admin panel (Settings → SMTP), which is stored in the database. Since that requires being logged in already, you can also set these environment variables as a fallback — used automatically whenever no SMTP row exists in the database yet (e.g. for "Forgot password" to work before first login):

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port (default: `587`) |
| `SMTP_SECURE` | `"true"` to use TLS/SSL, otherwise unset/`"false"` |
| `SMTP_USER` | SMTP auth username |
| `SMTP_PASSWORD` | SMTP auth password |
| `SMTP_FROM_NAME` | Display name for outgoing emails (default: `MHTSdigiXR`) |
| `SMTP_FROM_EMAIL` | From-address for outgoing emails |

---

## Support

For technical support or questions, contact the development team.

**Website:** [MHTSdigiX](https://mhtsdigix.com)
**Email:** dev@mhtsdigix.com
