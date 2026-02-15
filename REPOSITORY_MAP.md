# 🗺️ Repository Visual Map

```
lina-point-ai-ecosystem/
│
├── 📋 README.md ◄──────────────────────── START HERE
├── 📍 REPOSITORY_GUIDE.md ◄───────────── WHERE TO FIND EVERYTHING
│
├── 📚 Documentation Files (Root)
│   ├── WHATSAPP_QUICKSTART.md ──────────► 15-min WhatsApp setup
│   ├── WHATSAPP_INTEGRATION.md ─────────► Complete WhatsApp guide
│   ├── WHATSAPP_REFERENCE.md ───────────► Quick reference card
│   ├── WHATSAPP_IMPLEMENTATION_SUMMARY.md ► Technical details
│   ├── ADMIN_DASHBOARD_VISUAL.md ───────► Admin UI mockup
│   │
│   ├── BOOKING_QUICK_START.md ──────────► Booking setup
│   ├── BOOKING_README.md ───────────────► Booking guide
│   ├── BOOKING_SYSTEM.md ───────────────► Booking architecture
│   │
│   ├── SUPABASE_SETUP.md ───────────────► Database setup
│   ├── ARCHITECTURE.md ─────────────────► System design
│   └── QUICKSTART.md ───────────────────► General setup
│
├── ⚙️ Configuration (Root)
│   ├── .env.example ────────────────────► Environment template ⭐
│   ├── package.json ────────────────────► Dependencies & scripts
│   ├── tsconfig.json ───────────────────► TypeScript config
│   ├── next.config.ts ──────────────────► Next.js config
│   ├── vercel.json ─────────────────────► Deployment & cron
│   └── .gitignore ──────────────────────► Git ignore rules
│
├── 💻 Source Code (src/)
│   │
│   ├── app/ ◄──────────────────────────── Next.js 15 App Router
│   │   │
│   │   ├── page.tsx ────────────────────► Homepage
│   │   ├── layout.tsx ──────────────────► Root layout
│   │   ├── globals.css ─────────────────► Global styles
│   │   │
│   │   ├── api/ ◄───────────────────────► API Routes (Backend)
│   │   │   │
│   │   │   ├── whatsapp-webhook/ ◄──────► 🆕 Receive WhatsApp messages
│   │   │   │   └── route.ts
│   │   │   │
│   │   │   ├── whatsapp-cron/ ◄─────────► 🆕 Daily proactive messages
│   │   │   │   └── route.ts
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   └── send-whatsapp/ ◄─────► 🆕 Manual WhatsApp send
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   ├── book-flow/
│   │   │   │   └── route.ts ────────────► Booking flow API
│   │   │   │
│   │   │   ├── gen-magic-content/
│   │   │   │   └── route.ts ────────────► Magic content generation
│   │   │   │
│   │   │   ├── stripe/
│   │   │   │   ├── create-payment-intent/
│   │   │   │   └── webhook/ ────────────► Stripe webhooks
│   │   │   │
│   │   │   └── ... ─────────────────────► Other APIs
│   │   │
│   │   ├── auth/ ◄──────────────────────► Authentication Pages
│   │   │   ├── login/
│   │   │   │   └── page.tsx ────────────► Login page
│   │   │   ├── signup/
│   │   │   │   └── page.tsx ────────────► Signup page
│   │   │   └── verify-email/
│   │   │       └── page.tsx ────────────► Email verification
│   │   │
│   │   ├── dashboard/ ◄─────────────────► User Dashboard
│   │   │   ├── page.tsx ────────────────► Dashboard home
│   │   │   ├── profile/
│   │   │   │   ├── page.tsx ────────────► User profile
│   │   │   │   └── actions.ts ──────────► Profile actions
│   │   │   └── magic/
│   │   │       └── page.tsx ────────────► Magic experiences
│   │   │
│   │   ├── admin/ ◄─────────────────────► 🆕 Admin Section
│   │   │   ├── layout.tsx ──────────────► Admin layout + auth
│   │   │   └── whatsapp/
│   │   │       └── page.tsx ────────────► 🆕 WhatsApp dashboard
│   │   │
│   │   └── booking/
│   │       └── page.tsx ────────────────► Booking page
│   │
│   ├── components/ ◄────────────────────► React Components
│   │   └── ToasterProvider.tsx ─────────► Toast notifications
│   │
│   ├── hooks/ ◄─────────────────────────► Custom React Hooks
│   │
│   └── types/ ◄─────────────────────────► TypeScript Types
│
├── 🔧 Libraries (lib/) ◄────────────────► Shared Utilities
│   │
│   ├── whatsappConciergeAgent.ts ◄──────► 🆕 AI agent (LangGraph + Grok)
│   ├── whatsappHelper.ts ◄──────────────► 🆕 Twilio messaging utils
│   │
│   ├── contentAgent.ts ─────────────────► Magic content generation
│   ├── grokIntegration.ts ──────────────► Grok-4 AI integration
│   │
│   ├── priceScoutAgent.ts ──────────────► OTA price comparison
│   ├── experienceCuratorAgent.ts ───────► Tour curation
│   ├── otaIntegration.ts ───────────────► OTA API integration
│   │
│   ├── supabase.ts ─────────────────────► Supabase client (browser)
│   └── supabase-server.ts ──────────────► Supabase client (server)
│
├── 🗄️ Database (migrations/) ◄──────────► SQL Migrations
│   ├── 001_add_opt_in_magic.sql
│   ├── 002_add_special_events_and_maya_interests.sql
│   ├── 003_add_magic_content_table.sql
│   └── 004_add_whatsapp_support.sql ◄───► 🆕 WhatsApp tables
│
├── 🗄️ Database (supabase/migrations/) ◄─► Supabase Migrations
│   ├── 20250214100000_add_special_events_and_maya_interests.sql
│   ├── 20250214101500_add_prices_and_tours_tables.sql
│   ├── 20250214120000_add_analytics_tables.sql
│   └── 20250214220000_add_whatsapp_support.sql ◄─► 🆕 WhatsApp schema
│
├── 🧪 Tests (Root) ◄────────────────────► Test Scripts
│   ├── test-whatsapp-integration.mjs ◄──► 🆕 WhatsApp tests
│   └── test-booking-endpoints.ts ───────► Booking tests
│
├── 🎨 Static Assets (public/) ◄─────────► Images & Static Files
│   ├── next.svg
│   ├── vercel.svg
│   └── ... ─────────────────────────────► Other images
│
└── 🔒 Git (hidden)
    ├── .git/ ───────────────────────────► Git repository
    └── .gitignore ──────────────────────► Git ignore rules
```

## 🎯 Quick Access by Feature

### 🆕 WhatsApp Integration
```
Documentation:
  └── WHATSAPP_QUICKSTART.md         (start here!)

Code:
  ├── lib/whatsappConciergeAgent.ts  (AI agent)
  ├── lib/whatsappHelper.ts          (messaging)
  ├── src/app/api/whatsapp-webhook/  (webhook)
  ├── src/app/api/whatsapp-cron/     (scheduler)
  └── src/app/admin/whatsapp/        (dashboard)

Database:
  └── migrations/004_add_whatsapp_support.sql

Tests:
  └── test-whatsapp-integration.mjs
```

### 🏖️ Booking System
```
Documentation:
  └── BOOKING_QUICK_START.md

Code:
  ├── lib/priceScoutAgent.ts
  ├── lib/otaIntegration.ts
  ├── src/app/api/book-flow/
  └── src/app/booking/

Tests:
  └── test-booking-endpoints.ts
```

### 🎵 Magic Content
```
Code:
  ├── lib/contentAgent.ts
  ├── lib/grokIntegration.ts
  ├── src/app/api/gen-magic-content/
  └── src/app/dashboard/magic/

Database:
  └── migrations/003_add_magic_content_table.sql
```

### 🔐 Authentication
```
Code:
  ├── lib/supabase.ts
  ├── lib/supabase-server.ts
  ├── src/app/auth/login/
  ├── src/app/auth/signup/
  └── src/app/auth/verify-email/
```

## 📍 Most Important Files

### Configuration (Must Set Up)
```
⭐ .env.example          → Copy to .env.local
⭐ package.json          → Dependencies & scripts
⭐ vercel.json           → Deployment config
```

### Entry Points
```
⭐ src/app/page.tsx      → Homepage
⭐ src/app/layout.tsx    → Root layout
⭐ README.md             → Project overview
```

### WhatsApp (New Feature)
```
⭐ lib/whatsappConciergeAgent.ts           → AI agent
⭐ src/app/api/whatsapp-webhook/route.ts  → Message handler
⭐ src/app/admin/whatsapp/page.tsx        → Dashboard
```

## 🔍 How to Navigate

### Find All API Routes
```bash
find src/app/api -name "route.ts"
```

### Find All Pages
```bash
find src/app -name "page.tsx"
```

### Find Documentation
```bash
ls -1 *.md
```

### Find WhatsApp Files
```bash
find . -name "*whatsapp*" -not -path "*/node_modules/*"
```

### Search in Code
```bash
grep -r "WhatsApp" src/
grep -r "Grok" lib/
```

## 💡 Tips

1. **Start with**: `REPOSITORY_GUIDE.md` for complete navigation
2. **Quick setup**: `WHATSAPP_QUICKSTART.md` for WhatsApp (15 min)
3. **Configuration**: Copy `.env.example` to `.env.local`
4. **API Routes**: All in `src/app/api/`
5. **UI Pages**: All in `src/app/`
6. **Utilities**: All in `lib/`
7. **Database**: All in `migrations/` and `supabase/migrations/`

## 🆘 Lost?

→ Read **[REPOSITORY_GUIDE.md](./REPOSITORY_GUIDE.md)** for complete details!

---

**Legend:**
- ◄─► Points to important files
- 🆕 New files (WhatsApp integration)
- ⭐ Critical files to configure
- ► Description of file purpose
