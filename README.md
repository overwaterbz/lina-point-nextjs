This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🌟 Lina Point AI Ecosystem

A comprehensive resort booking and guest concierge system with AI-powered personalization, featuring:
- 🏖️ Direct booking system with OTA price comparison
- 🤖 AI concierge agents (Grok-4 + LangGraph)
- 💬 WhatsApp integration for guest communication
- 🎵 Personalized magic content generation (songs/videos)
- 📊 Admin dashboard for management
- 🔐 Supabase authentication and database

## 📚 Documentation

### 🗺️ **New to This Project?**
- **[Repository Guide](./REPOSITORY_GUIDE.md)** - 📍 **START HERE** - Find where everything is located!

### Feature Guides
- [WhatsApp Integration Guide](./WHATSAPP_INTEGRATION.md) - Setup and usage for WhatsApp concierge
- [WhatsApp Quick Start](./WHATSAPP_QUICKSTART.md) - 15-minute setup guide
- [Booking System](./BOOKING_README.md) - Direct booking flow and OTA integration
- [Architecture](./ARCHITECTURE.md) - System architecture and design
- [Supabase Setup](./SUPABASE_SETUP.md) - Database setup and migrations

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/overwaterbz/lina-point-ai-ecosystem.git
cd lina-point-ai-ecosystem
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 📍 Need Help Finding Files?
See the **[Repository Guide](./REPOSITORY_GUIDE.md)** for a complete map of where everything is located.

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
