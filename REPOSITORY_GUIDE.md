# Repository Location & Navigation Guide

## 📍 Repository Location

### Official Repository
```
GitHub: https://github.com/overwaterbz/lina-point-ai-ecosystem
Clone URL: git@github.com:overwaterbz/lina-point-ai-ecosystem.git
HTTPS: https://github.com/overwaterbz/lina-point-ai-ecosystem.git
```

### Local Development Location
```bash
# Recommended local location (any of these work):
~/projects/lina-point-ai-ecosystem
~/code/lina-point-ai-ecosystem
~/development/lina-point-ai-ecosystem

# Current working directory after clone:
cd lina-point-ai-ecosystem
```

---

## 🗂️ Repository Structure - Where to Find Everything

### 📚 Documentation (Root Directory)
```
.
├── README.md                              # Main project overview
├── QUICKSTART.md                          # Quick start guide
├── ARCHITECTURE.md                        # System architecture
│
├── WHATSAPP_QUICKSTART.md                 # 🆕 WhatsApp 15-min setup
├── WHATSAPP_INTEGRATION.md                # 🆕 WhatsApp complete guide
├── WHATSAPP_REFERENCE.md                  # 🆕 WhatsApp quick reference
├── WHATSAPP_IMPLEMENTATION_SUMMARY.md     # 🆕 WhatsApp technical details
├── ADMIN_DASHBOARD_VISUAL.md              # 🆕 Admin UI reference
│
├── BOOKING_QUICK_START.md                 # Booking system quick start
├── BOOKING_README.md                      # Booking system guide
├── BOOKING_SYSTEM.md                      # Booking architecture
│
├── SUPABASE_SETUP.md                      # Database setup
├── SUPABASE_INTEGRATION.md                # Database integration
│
├── FILE_INDEX.md                          # File index (if exists)
└── SETUP_CHECKLIST.md                     # Setup checklist
```

### 💻 Source Code (`/src`)
```
src/
├── app/                                   # Next.js 15 App Router
│   ├── page.tsx                          # Homepage
│   ├── layout.tsx                        # Root layout
│   │
│   ├── api/                              # API Routes
│   │   ├── whatsapp-webhook/            # 🆕 WhatsApp webhook
│   │   ├── whatsapp-cron/               # 🆕 WhatsApp cron job
│   │   ├── admin/send-whatsapp/         # 🆕 Admin WhatsApp API
│   │   ├── book-flow/                   # Booking flow API
│   │   ├── gen-magic-content/           # Magic content API
│   │   ├── stripe/                      # Stripe payment APIs
│   │   └── ...                          # Other API routes
│   │
│   ├── auth/                             # Authentication pages
│   │   ├── login/                       # Login page
│   │   ├── signup/                      # Signup page
│   │   └── verify-email/                # Email verification
│   │
│   ├── dashboard/                        # User dashboard
│   │   ├── page.tsx                     # Dashboard home
│   │   ├── profile/                     # User profile
│   │   └── magic/                       # Magic experiences
│   │
│   ├── admin/                            # 🆕 Admin section
│   │   ├── layout.tsx                   # Admin layout
│   │   └── whatsapp/                    # 🆕 WhatsApp dashboard
│   │       └── page.tsx
│   │
│   ├── booking/                          # Booking pages
│   │   └── page.tsx
│   │
│   └── globals.css                       # Global styles
│
├── components/                            # React components
│   └── ToasterProvider.tsx              # Toast notifications
│
├── hooks/                                 # Custom React hooks
│
└── types/                                 # TypeScript types
```

### 🔧 Library Code (`/lib`)
```
lib/
├── whatsappConciergeAgent.ts             # 🆕 WhatsApp AI agent (LangGraph)
├── whatsappHelper.ts                     # 🆕 WhatsApp messaging utilities
│
├── contentAgent.ts                       # Magic content generation agent
├── grokIntegration.ts                    # Grok-4 AI integration
│
├── priceScoutAgent.ts                    # OTA price comparison
├── experienceCuratorAgent.ts             # Tour curation
├── otaIntegration.ts                     # OTA integrations
│
├── supabase.ts                           # Supabase client (browser)
└── supabase-server.ts                    # Supabase client (server)
```

### 🗄️ Database (`/migrations` & `/supabase`)
```
migrations/                                # SQL migrations
├── 001_add_opt_in_magic.sql
├── 002_add_special_events_and_maya_interests.sql
├── 003_add_magic_content_table.sql
└── 004_add_whatsapp_support.sql          # 🆕 WhatsApp tables

supabase/
└── migrations/                            # Supabase-specific migrations
    ├── 20250214100000_add_special_events_and_maya_interests.sql
    ├── 20250214101500_add_prices_and_tours_tables.sql
    ├── 20250214120000_add_analytics_tables.sql
    └── 20250214220000_add_whatsapp_support.sql  # 🆕 WhatsApp schema
```

### ⚙️ Configuration Files (Root)
```
.
├── .env.example                          # Environment variables template
├── .gitignore                            # Git ignore rules
│
├── package.json                          # npm dependencies & scripts
├── package-lock.json                     # Dependency lock file
│
├── tsconfig.json                         # TypeScript configuration
├── next.config.ts                        # Next.js configuration
├── vercel.json                           # 🆕 Vercel & cron config
│
├── eslint.config.mjs                     # ESLint configuration
├── postcss.config.mjs                    # PostCSS configuration
│
└── middleware.ts                         # Next.js middleware
```

### 🧪 Testing (`/` root)
```
.
├── test-whatsapp-integration.mjs         # 🆕 WhatsApp integration tests
└── test-booking-endpoints.ts             # Booking endpoint tests
```

### 🎨 Static Assets (`/public`)
```
public/
├── next.svg                              # Next.js logo
├── vercel.svg                            # Vercel logo
└── ...                                   # Other static files
```

---

## 🔍 How to Find Specific Features

### WhatsApp Integration (🆕 New)
- **Documentation**: `WHATSAPP_QUICKSTART.md` (start here!)
- **Webhook API**: `src/app/api/whatsapp-webhook/route.ts`
- **Cron Job**: `src/app/api/whatsapp-cron/route.ts`
- **AI Agent**: `lib/whatsappConciergeAgent.ts`
- **Messaging**: `lib/whatsappHelper.ts`
- **Admin UI**: `src/app/admin/whatsapp/page.tsx`
- **Database**: `migrations/004_add_whatsapp_support.sql`
- **Tests**: `test-whatsapp-integration.mjs`

### Booking System
- **Documentation**: `BOOKING_QUICK_START.md`
- **API**: `src/app/api/book-flow/route.ts`
- **Page**: `src/app/booking/page.tsx`
- **OTA Integration**: `lib/otaIntegration.ts`
- **Price Agent**: `lib/priceScoutAgent.ts`

### Magic Content (Songs/Videos)
- **Documentation**: Check `README.md` magic section
- **API**: `src/app/api/gen-magic-content/route.ts`
- **Agent**: `lib/contentAgent.ts`
- **Dashboard**: `src/app/dashboard/magic/page.tsx`

### Authentication
- **Login**: `src/app/auth/login/page.tsx`
- **Signup**: `src/app/auth/signup/page.tsx`
- **Verify**: `src/app/auth/verify-email/page.tsx`
- **Config**: `lib/supabase.ts`

### Admin Dashboard
- **Layout**: `src/app/admin/layout.tsx`
- **WhatsApp**: `src/app/admin/whatsapp/page.tsx` (🆕)

---

## 📦 Where to Install/Clone

### Option 1: Clone from GitHub (Recommended)
```bash
# Using SSH (recommended for development)
git clone git@github.com:overwaterbz/lina-point-ai-ecosystem.git
cd lina-point-ai-ecosystem

# Using HTTPS
git clone https://github.com/overwaterbz/lina-point-ai-ecosystem.git
cd lina-point-ai-ecosystem
```

### Option 2: Download ZIP
1. Visit: https://github.com/overwaterbz/lina-point-ai-ecosystem
2. Click: "Code" → "Download ZIP"
3. Extract to your desired location
4. Open terminal in that folder

### Recommended Local Paths
```bash
# Mac/Linux
~/projects/lina-point-ai-ecosystem
~/code/lina-point-ai-ecosystem
~/dev/lina-point-ai-ecosystem

# Windows
C:\Users\YourName\projects\lina-point-ai-ecosystem
C:\dev\lina-point-ai-ecosystem
```

---

## 🚀 After Cloning - Next Steps

### 1. Install Dependencies
```bash
cd lina-point-ai-ecosystem
npm install
```

### 2. Set Up Environment Variables
```bash
# Copy the example file
cp .env.example .env.local

# Edit with your credentials
nano .env.local  # or use your editor
```

### 3. Run Database Migrations
See `SUPABASE_SETUP.md` for database setup instructions.

### 4. Start Development Server
```bash
npm run dev
# Open http://localhost:3000
```

---

## 🔐 Important Files to Configure

### Required Environment Variables (`.env.local`)
Location: **Root directory** (create from `.env.example`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Grok API
GROK_API_KEY=your_grok_key

# Twilio WhatsApp (🆕 New)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Stripe
STRIPE_SECRET_KEY=your_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key

# Optional
CRON_SECRET=random_secret
```

### Where to Find API Keys

| Service | Where to Get | Documentation |
|---------|-------------|---------------|
| **Supabase** | https://app.supabase.com → Project Settings → API | `SUPABASE_SETUP.md` |
| **Grok** | https://console.x.ai → API Keys | `ARCHITECTURE.md` |
| **Twilio** | https://console.twilio.com → Account → API Keys | `WHATSAPP_QUICKSTART.md` |
| **Stripe** | https://dashboard.stripe.com → Developers → API Keys | `BOOKING_README.md` |

---

## 🗺️ Visual Repository Map

```
lina-point-ai-ecosystem/
│
├── 📚 Documentation (Root) ─────────── Start here for guides
│   ├── README.md
│   ├── WHATSAPP_QUICKSTART.md
│   └── ...
│
├── 💻 Source Code (src/) ──────────── Your application code
│   ├── app/
│   │   ├── api/ ────────────────── API endpoints
│   │   ├── admin/ ──────────────── Admin pages
│   │   ├── dashboard/ ──────────── User pages
│   │   └── auth/ ───────────────── Auth pages
│   ├── components/
│   └── hooks/
│
├── 🔧 Libraries (lib/) ────────────── Reusable utilities
│   ├── whatsappConciergeAgent.ts
│   └── ...
│
├── 🗄️ Database (migrations/) ──────── SQL migrations
│   └── 004_add_whatsapp_support.sql
│
├── ⚙️ Config Files (Root) ─────────── Configuration
│   ├── .env.example
│   ├── package.json
│   └── vercel.json
│
└── 🧪 Tests (Root) ────────────────── Test scripts
    └── test-whatsapp-integration.mjs
```

---

## 💡 Quick Tips

### Finding Files Quickly
```bash
# Find all TypeScript files
find src -name "*.ts" -o -name "*.tsx"

# Find API routes
find src/app/api -type f -name "route.ts"

# Find all documentation
ls -1 *.md

# Search for specific code
grep -r "WhatsApp" src/
```

### Opening Specific Features
```bash
# WhatsApp integration
code src/app/api/whatsapp-webhook/route.ts
code lib/whatsappConciergeAgent.ts
code WHATSAPP_QUICKSTART.md

# Admin dashboard
code src/app/admin/whatsapp/page.tsx

# Database migrations
code migrations/004_add_whatsapp_support.sql
```

### Common Paths
```bash
# API Routes
cd src/app/api

# Admin pages
cd src/app/admin

# Libraries
cd lib

# Documentation
ls *.md
```

---

## 🆘 Need Help?

1. **Quick Setup**: Read `WHATSAPP_QUICKSTART.md` (15 minutes)
2. **Complete Guide**: Read `WHATSAPP_INTEGRATION.md`
3. **Technical Details**: Read `WHATSAPP_IMPLEMENTATION_SUMMARY.md`
4. **Admin UI**: Read `ADMIN_DASHBOARD_VISUAL.md`
5. **General Setup**: Read `QUICKSTART.md`

---

## 📋 Checklist: Did You Find What You Need?

- [ ] Cloned repository from GitHub
- [ ] Located configuration files (`.env.example`)
- [ ] Found API routes (`src/app/api/`)
- [ ] Located admin dashboard (`src/app/admin/`)
- [ ] Found WhatsApp integration files
- [ ] Located database migrations
- [ ] Found documentation files
- [ ] Set up local environment

---

**Repository**: https://github.com/overwaterbz/lina-point-ai-ecosystem
**Last Updated**: February 15, 2026
**Status**: ✅ All features documented
