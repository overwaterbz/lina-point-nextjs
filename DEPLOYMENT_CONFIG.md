# Deployment Configuration Guide

**Date:** February 17, 2026  
**Status:** ✅ App Live on Vercel → Environment Variables & Webhooks Setup

---

## 🚀 Current Status

- **Live URL:** https://lina-point-ai-ecosystem.vercel.app
- **Build:** ✅ Successful (33.8s)
- **Env File:** ✅ `.env.production` configured
- **TypeScript:** ✅ All errors fixed

---

## 📋 STEP 1: Add Environment Variables to Vercel

**Dashboard:** https://vercel.com/rick-jennings-projects/lina-point-ai-ecosystem/settings/environment-variables

### Instructions:

1. Click "Add New" for each variable
2. Set to apply to: **Production**, **Preview**, **Development**
3. After adding all variables, click "Deploy" to redeploy

### Environment Variables to Add:

**PUBLIC VARIABLES** (Visible in browser):

```
NEXT_PUBLIC_SUPABASE_URL=https://seonmgpsyyzbpcsrzjxi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlb25tZ3BzeXl6YnBjc3J6anxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE4Njk4OTgsImV4cCI6MjAzNzQ0NTg5OH0.1xHz3h9bHPHLIyR2pYPUmN-D7MZ7Z1h8C3VcL5Z5Xfc
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51QXYVZKVxZL8jN0YXsP0vQ1rS2tU3vW4xY5zABbB7cC8dD9eE0fF1gG2hH3iI4jJ5kK6lL7mM
```

**SECRET VARIABLES** (Server-only):

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlb25tZ3BzeXl6YnBjc3J6anh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTg2OTg5OCwiZXhwIjoyMDM3NDQ1ODk4fQ.q_L3W0Yr_DTzf5L8vRw-H8J-RG1YhN2H7f0VT8L7x9Y
TWILIO_ACCOUNT_SID=AC96cc3a8fb6e67d2a9c7f9e3e8e4e3e3
TWILIO_AUTH_TOKEN=9b6d8e4c2f1a8e5d3b7c9f2e1a6d8b4c
TWILIO_PHONE_NUMBER=+13369996930
SQUARE_APPLICATION_ID=sq0idp-2hjvMvHztqoZ1bVdoaYDCQ
SQUARE_ACCESS_TOKEN=sq0atp-xKL5hX7YJ8mN9pQ2r3sT4u5V
STRIPE_SECRET_KEY=sk_test_51QXYVZKVxZL8jN0YXsP0vQ1rS2tU3vW4xY5zA6bB7cC8dD9eE0fF1gG2hH3iI4jJ5kK6lL7mM
STRIPE_WEBHOOK_SECRET=whsec_test_xxx
GROK_API_KEY=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
ADMIN_EMAILS=rick@pointenterprise.com,rick@linapoint.com
CRON_SECRET=<rotate-in-vercel — generate with: openssl rand -hex 32>
N8N_WEBHOOK_SECRET=awXtklQ7GqAInNxd3E1CSF4e8rBmOiuj
N8N_WEBHOOK_URL=https://overwater.app.n8n.cloud/webhook/lina-magic-trigger
```

---

## 🔗 STEP 2: Configure Webhooks

### A. Stripe Webhook

**Location:** https://dashboard.stripe.com → Webhooks → Add endpoint

- **Endpoint URL:** `https://lina-point-ai-ecosystem.vercel.app/api/stripe/webhook`
- **Events:**
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
- **Save:** Copy the webhook signing secret and add to Vercel as `STRIPE_WEBHOOK_SECRET`

### B. Twilio WhatsApp Webhook

**Location:** https://console.twilio.com → WhatsApp → Sandbox/Production → Settings

- **Message Webhook URL:** `https://lina-point-ai-ecosystem.vercel.app/api/whatsapp-webhook`
- **Webhook Method:** POST
- **Save**

### C. Vercel Cron (Auto-configured)

✅ Already set in `vercel.json`:

- **Time:** Daily at 6:00 PM UTC
- **Endpoint:** `https://lina-point-ai-ecosystem.vercel.app/api/cron/send-proactive-messages`
- **Secret:** Uses `CRON_SECRET` for validation

---

## 🔐 STEP 3: Rotate n8n Webhook Secret

**URL:** https://overwater.app.n8n.cloud/

1. Open "lina-magic-trigger" workflow
2. Find the webhook trigger node
3. Update webhook URL and authentication:
   - **Auth Type:** Header
   - **Header Name:** `x-n8n-secret`
   - **Header Value:** `awXtklQ7GqAInNxd3E1CSF4e8rBmOiuj`
4. Test with curl:
   ```bash
   curl -X POST https://lina-point-ai-ecosystem.vercel.app/api/trigger-n8n \
     -H "x-n8n-secret: awXtklQ7GqAInNxd3E1CSF4e8rBmOiuj" \
     -H "Content-Type: application/json" \
     -d '{"source":"admin-dashboard"}'
   ```

---

## ✅ STEP 4: Test Endpoints

### Health Check

```bash
curl https://lina-point-ai-ecosystem.vercel.app/
# Should return HTML with "Lina Point"
```

### API Endpoints

**Test Magic Content:**

```bash
curl https://lina-point-ai-ecosystem.vercel.app/api/test-magic
# Returns: { success: true, tests: [...], summary: {...} }
```

**Test Webhook Trigger:**

```bash
curl -X POST https://lina-point-ai-ecosystem.vercel.app/api/trigger-n8n \
  -H "x-n8n-secret: AwXtklQ7GqAInNxd3E1CSF4e8rBmOiuj" \
  -H "Content-Type: application/json" \
  -d '{"source":"testing"}'
```

**Check Agent Runs:**

```bash
curl https://lina-point-ai-ecosystem.vercel.app/api/check-events
```

### Payment Processing Test

#### Square Payment Flow:

1. Go to https://lina-point-ai-ecosystem.vercel.app/booking
2. Enter test amount (e.g., $10)
3. Use Square test card: **4111 1111 1111 1111** (exp: 12/25)
4. Should succeed and create payment_intent

#### Stripe Fallback:

1. If Square fails, automatically falls back to Stripe
2. Test card: **4242 4242 4242 4242** (exp: 12/25)

### WhatsApp Webhook Test:

1. Send message to Twilio sandbox number
2. Check Supabase `whatsapp_messages` table for received message
3. Verify bot response is sent

---

## 🚨 Troubleshooting

### Build Failing

- Check `.env.production` is committed (but not in git, only on Vercel)
- Verify all required env vars are set
- Redeploy from Vercel dashboard

### Webhooks Not Firing

1. Check webhook URL is accessible: `curl https://lina-point-ai-ecosystem.vercel.app/api/[webhook-path]`
2. Verify webhook signing secrets match
3. Check Supabase logs for webhook processing errors
4. Enable debug logging in `.env.production`: `DEBUG=*`

### Payment Processing Issues

- Square: Check `payment_processor` field in booking_analytics table
- Stripe: Check webhook logs in Stripe dashboard
- Both: Check response_metadata for error details

---

## 📊 Monitoring

### Vercel Logs

https://vercel.com/rick-jennings-projects/lina-point-ai-ecosystem/logs

### Supabase Logs

https://app.supabase.com/project/seonmgpsyyzbpcsrzjxi/logs

### Stripe Logs

https://dashboard.stripe.com/logs

### Twilio Logs

https://console.twilio.com/develop/sms/logs

---

## 🎯 Next Actions Checklist

- [ ] Add all environment variables to Vercel
- [ ] Redeploy after adding env vars
- [ ] Configure Stripe webhook + get signing secret
- [ ] Configure Twilio WhatsApp webhook
- [ ] Test magic content generation: `/api/test-magic`
- [ ] Test payment processing with Square test card
- [ ] Test WhatsApp bot with message
- [ ] Verify cron job runs at 6 PM UTC
- [ ] Rotate n8n secret in workflow
- [ ] Test n8n webhook: `/api/trigger-n8n`
- [ ] Monitor production logs for 24 hours
- [ ] Enable error alerting (Sentry recommended)

---

## 🔄 Deployment Info

**Last Deployment:**

```
Build Time: 33.8s
Deployment URL: https://lina-point-ai-ecosystem-47r81simr-rick-jennings-projects.vercel.app
Alias: https://lina-point-ai-ecosystem.vercel.app
Build ID: GBkyeuUsCCn7ZSBiX9RwqLB98rjx
Region: Washington, D.C. (iad1)
```

**Commit:** `10be0b8` - Fix all TypeScript compilation errors blocking build
