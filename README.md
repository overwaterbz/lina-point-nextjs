# Lina Point Overwater Resort

A full-stack luxury resort booking platform for **Lina Point Belize Overwater Resort** — built with Next.js 16, React 19, Supabase, Stripe, and AI-powered concierge.

**Live:** [lina-point.vercel.app](https://lina-point.vercel.app)

## Features

- **Direct Booking Engine** — Real-time availability, date selection, room type pricing, OTA price comparison
- **AI Concierge** — LangChain-powered chat assistant for guest inquiries
- **Blog & SEO** — Server-rendered blog with Supabase CMS, JSON-LD structured data, sitemap, robots.txt
- **Admin Dashboard** — Manage reservations, pricing, tours, promos, and marketing campaigns
- **Newsletter System** — Automated digest emails via Resend, one-click unsubscribe
- **Authentication** — Supabase Auth with email verification, protected routes via middleware
- **Analytics** — Vercel Analytics, Speed Insights, Google Analytics, event tracking
- **PWA** — Installable progressive web app with manifest and icons

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Payments | Stripe + Square |
| Email | Resend |
| SMS | Twilio |
| AI | LangChain + OpenAI |
| Analytics | Vercel Analytics, Google Analytics |
| Hosting | Vercel (auto-deploy on push) |

## Getting Started

```bash
# Clone
git clone https://github.com/overwaterbz/lina-point-ai-ecosystem.git
cd lina-point-ai-ecosystem

# Install
npm install

# Environment — copy and fill in your keys
cp .env.example .env.local

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example` for the full list. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side Supabase operations
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Payments
- `RESEND_API_KEY` — Transactional email
- `OPENAI_API_KEY` — AI concierge

## Project Structure

```
src/
  app/
    admin/         # Admin dashboard (protected)
    api/           # API routes (booking, newsletter, concierge, etc.)
    auth/          # Login, signup, email verification
    blog/          # Server-rendered blog
    booking/       # Booking flow with OTA comparison
    concierge/     # AI chat assistant
    experiences/   # Resort activities
    gallery/       # Photo gallery
    unsubscribe/   # Newsletter unsubscribe
  components/      # Shared UI components
  lib/             # Utilities, Supabase clients, env validation
  __tests__/       # Jest test suite
```

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

## Deployment

Push to `main` triggers automatic Vercel deployment. The app validates environment variables at startup and will fail fast if required vars are missing in production.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — Auth flow, data model
- [BOOKING_SYSTEM.md](BOOKING_SYSTEM.md) — Booking engine overview
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) — Database setup
- [DEPLOYMENT_WALKTHROUGH.md](DEPLOYMENT_WALKTHROUGH.md) — Deployment guide

## License

Private — Overwater Ecosystem.
