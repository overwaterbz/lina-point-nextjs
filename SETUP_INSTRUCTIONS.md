# 🚀 Complete Setup Guide: Vercel Cron, Twilio Webhook & WhatsApp Integration

This guide provides **detailed, step-by-step instructions** for setting up all components of the WhatsApp integration.

---

## 📋 **Table of Contents**

1. [Prerequisites](#prerequisites)
2. [Part 1: Twilio WhatsApp Setup](#part-1-twilio-whatsapp-setup)
3. [Part 2: Environment Variables](#part-2-environment-variables)
4. [Part 3: Database Setup](#part-3-database-setup)
5. [Part 4: Vercel Deployment & Cron Setup](#part-4-vercel-deployment--cron-setup)
6. [Part 5: Twilio Webhook Configuration](#part-5-twilio-webhook-configuration)
7. [Part 6: Testing](#part-6-testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Git installed
- ✅ GitHub account
- ✅ Vercel account (free tier works) - [Sign up](https://vercel.com/signup)
- ✅ Twilio account (free trial works) - [Sign up](https://www.twilio.com/try-twilio)
- ✅ Supabase project set up - [Sign up](https://supabase.com)
- ✅ Code editor (VS Code recommended)

---

## Part 1: Twilio WhatsApp Setup

### Step 1.1: Create Twilio Account

1. **Go to**: https://www.twilio.com/try-twilio
2. **Sign up** with your email
3. **Verify** your phone number
4. **Complete** the onboarding questionnaire

### Step 1.2: Get Your Twilio Credentials

1. **Log in** to [Twilio Console](https://console.twilio.com/)
2. **Navigate to**: Dashboard (home page)
3. **Find** the "Account Info" section
4. **Copy and save** these values:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click "Show" to reveal)

   ```
   Example:
   Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Auth Token: your_32_character_auth_token
   ```

### Step 1.3: Set Up WhatsApp Sandbox

1. **In Twilio Console**, click **Messaging** in left sidebar
2. **Click**: "Try it out" → "Send a WhatsApp message"
3. **Note**: Your sandbox number (e.g., `+1 415 523 8886`)
4. **Keep this page open** - you'll need it later

---

## Part 2: Environment Variables

### Step 2.1: Create Local Environment File

1. **Navigate** to your project directory
2. **Copy** the example file:
   ```bash
   cp .env.example .env.local
   ```

3. **Open** `.env.local` in your editor
4. **Add** your credentials:

```bash
# Supabase (get from https://app.supabase.com/project/_/settings/api)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Grok API (get from https://console.x.ai)
GROK_API_KEY=xai-xxxxx
GROK_BASE_URL=https://api.x.ai/v1

# Twilio WhatsApp (from Step 1.2)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Optional: For cron job security
CRON_SECRET=generate_a_random_string_here

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Step 2.2: Generate CRON_SECRET (Optional but Recommended)

```bash
# Generate a random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `CRON_SECRET`.

---

## Part 3: Database Setup

### Step 3.1: Run WhatsApp Migration in Supabase

1. **Open**: [Supabase Dashboard](https://app.supabase.com)
2. **Select** your project
3. **Click**: "SQL Editor" in left sidebar
4. **Click**: "New query"

5. **Copy** the entire contents of `migrations/004_add_whatsapp_support.sql`:
   ```bash
   # In your terminal
   cat migrations/004_add_whatsapp_support.sql
   ```

6. **Paste** into Supabase SQL Editor
7. **Click**: "Run" button
8. **Verify** success message

### Step 3.2: Verify Tables Created

1. **In Supabase Dashboard**, click "Table Editor"
2. **Verify** these tables exist:
   - ✅ `whatsapp_sessions`
   - ✅ `whatsapp_messages`
3. **Click** on `profiles` table
4. **Verify** `phone_number` column exists

---

## Part 4: Vercel Deployment & Cron Setup

### Step 4.1: Push Code to GitHub

1. **Commit** your changes (if any):
   ```bash
   git add .
   git commit -m "Setup WhatsApp integration"
   ```

2. **Push** to GitHub:
   ```bash
   git push origin main
   # or
   git push origin copilot/add-whatsapp-integration
   ```

### Step 4.2: Connect Repository to Vercel

1. **Go to**: [Vercel Dashboard](https://vercel.com/dashboard)
2. **Click**: "Add New..." → "Project"
3. **Import** your GitHub repository:
   - Search for: `lina-point-ai-ecosystem`
   - Click "Import"

4. **Configure Project**:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `next build` (leave default)
   - **Output Directory**: `.next` (leave default)

### Step 4.3: Add Environment Variables in Vercel

1. **In project settings**, click "Environment Variables" tab
2. **Add** each variable from your `.env.local`:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Production, Preview, Development |
   | `GROK_API_KEY` | `xai-xxxxx` | Production, Preview, Development |
   | `GROK_BASE_URL` | `https://api.x.ai/v1` | Production, Preview, Development |
   | `TWILIO_ACCOUNT_SID` | `ACxxxxx` | Production, Preview, Development |
   | `TWILIO_AUTH_TOKEN` | `your_token` | Production, Preview, Development |
   | `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` | Production, Preview, Development |
   | `CRON_SECRET` | `your_random_secret` | Production, Preview, Development |

   **Important**: Select all three environments (Production, Preview, Development) for each variable.

3. **Click** "Save" after adding each variable

### Step 4.4: Deploy

1. **Click**: "Deploy" button
2. **Wait** for deployment to complete (2-5 minutes)
3. **Copy** your deployment URL (e.g., `https://your-app.vercel.app`)

### Step 4.5: Verify Vercel Cron Configuration

The `vercel.json` file already configures the cron job:

```json
{
  "crons": [
    {
      "path": "/api/whatsapp-cron",
      "schedule": "0 10 * * *"
    }
  ]
}
```

This means:
- **Cron will run**: Every day at 10:00 AM UTC
- **Endpoint**: `/api/whatsapp-cron`
- **Purpose**: Send proactive WhatsApp messages (welcome, reminders)

**No additional configuration needed** - Vercel automatically detects this file!

### Step 4.6: Verify Cron Job in Vercel Dashboard

1. **In Vercel Dashboard**, go to your project
2. **Click**: "Settings" → "Cron Jobs"
3. **Verify**: You should see:
   ```
   Path: /api/whatsapp-cron
   Schedule: 0 10 * * *
   Status: Active
   ```

---

## Part 5: Twilio Webhook Configuration

### Step 5.1: Configure Webhook URL

1. **Go back** to [Twilio Console](https://console.twilio.com/)
2. **Click**: Messaging → Try it out → Send a WhatsApp message
3. **Scroll down** to "Sandbox Configuration"
4. **Click**: "Sandbox Settings" button

5. **In "When a message comes in" field**, enter:
   ```
   https://your-app.vercel.app/api/whatsapp-webhook
   ```
   (Replace `your-app.vercel.app` with your actual Vercel URL)

6. **Set** HTTP method to: `POST`

7. **Click**: "Save" button

### Step 5.2: Verify Webhook

1. **Test** the webhook endpoint:
   ```bash
   curl https://your-app.vercel.app/api/whatsapp-webhook
   ```

2. **Expected response**:
   ```json
   {
     "status": "ok",
     "message": "WhatsApp webhook is running",
     "timestamp": "2026-02-15T14:11:09.692Z"
   }
   ```

---

## Part 6: Testing

### Step 6.1: Join WhatsApp Sandbox

1. **In Twilio Console**, find the sandbox page
2. **You'll see** a message like:
   ```
   To join this sandbox, send "join <code>" to +1 415 523 8886
   ```

3. **Open WhatsApp** on your phone
4. **Send** the join message to the sandbox number
5. **Wait** for confirmation message

### Step 6.2: Send Test Message

1. **In WhatsApp**, send a message to the sandbox number:
   ```
   Hello!
   ```

2. **Expected**: You should receive a response from Maya Guide within 2-5 seconds:
   ```
   Hi! 👋

   Welcome to Lina Point Resort! I'm Maya, your personal concierge guide. ✨
   
   I can help you with:
   🏖️ Room bookings & reservations
   🎵 Personalized magic experiences
   ...
   ```

### Step 6.3: Test Different Intents

Try these messages to test different features:

1. **Booking intent**:
   ```
   I'd like to book a room
   ```
   Response should mention booking and ask for dates.

2. **Magic intent**:
   ```
   Tell me about magic experiences
   ```
   Response should explain personalized songs/videos.

3. **General conversation**:
   ```
   What can you help me with?
   ```
   Response should list available services.

### Step 6.4: Verify Admin Dashboard

1. **Visit**: `https://your-app.vercel.app/admin/whatsapp`
2. **Log in** with your Supabase credentials
3. **Verify**:
   - Stats cards show your session
   - Recent messages show your conversation
   - Active sessions table shows your phone number

---

## Troubleshooting

### Issue: Webhook Returns 401 Unauthorized

**Cause**: Twilio signature validation failing

**Solution**:
1. Verify `TWILIO_AUTH_TOKEN` is correct in Vercel
2. Check webhook URL is exactly: `https://your-app.vercel.app/api/whatsapp-webhook` (no trailing slash)
3. Redeploy: `vercel --prod`

### Issue: No Response from WhatsApp Bot

**Causes & Solutions**:

1. **Check Vercel Logs**:
   - Go to Vercel Dashboard → Project → Logs
   - Look for errors when you send a message

2. **Verify Environment Variables**:
   - Vercel Dashboard → Settings → Environment Variables
   - Ensure all Twilio variables are set

3. **Check Twilio Webhook Logs**:
   - Twilio Console → Monitor → Logs → Errors & Warnings
   - Look for failed requests

4. **Verify Webhook URL**:
   - Twilio Console → Messaging → Sandbox Settings
   - Ensure URL matches your Vercel deployment

### Issue: Cron Job Not Running

**Verification**:
```bash
# Manually trigger cron job
curl https://your-app.vercel.app/api/whatsapp-cron
```

**Check**:
1. Vercel Dashboard → Settings → Cron Jobs
2. Ensure cron is listed and active
3. Check Vercel logs for cron execution

**Common Issues**:
- Cron jobs run in UTC timezone (10 AM UTC = 5 AM EST)
- First run may take 24 hours to activate
- Check `vercel.json` is in root directory

### Issue: Database Errors

**Verify**:
1. Migration ran successfully in Supabase
2. RLS policies are correct
3. Service role key is set in Vercel

**Test database connection**:
```bash
# In your project
npm run dev
# Visit http://localhost:3000/admin/whatsapp
# Should load without errors
```

### Issue: "GROK_API_KEY not configured"

**This is OK**: Agent will work with mock responses for testing.

**To fix**:
1. Get API key from https://console.x.ai
2. Add to Vercel environment variables
3. Redeploy

---

## 🎉 Success Checklist

Verify all these work:

- [ ] Webhook endpoint returns OK: `curl https://your-app.vercel.app/api/whatsapp-webhook`
- [ ] Can send WhatsApp message and get response
- [ ] Admin dashboard loads: `https://your-app.vercel.app/admin/whatsapp`
- [ ] Messages appear in admin dashboard
- [ ] Vercel cron job is listed in dashboard
- [ ] Environment variables all set in Vercel
- [ ] Database tables exist in Supabase
- [ ] Twilio sandbox configured with webhook URL

---

## 📚 Additional Resources

- **Twilio WhatsApp Docs**: https://www.twilio.com/docs/whatsapp
- **Vercel Cron Docs**: https://vercel.com/docs/cron-jobs
- **Supabase Docs**: https://supabase.com/docs
- **Project Docs**:
  - `WHATSAPP_QUICKSTART.md` - Quick 15-min setup
  - `WHATSAPP_INTEGRATION.md` - Complete technical guide
  - `WHATSAPP_REFERENCE.md` - Quick reference card

---

## 🔄 Updating After Changes

If you modify the code:

1. **Commit changes**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

2. **Vercel auto-deploys** from GitHub (if connected)

3. **Or manually deploy**:
   ```bash
   vercel --prod
   ```

---

## 📞 Support

If you encounter issues:

1. Check Vercel deployment logs
2. Check Twilio webhook logs
3. Check Supabase logs
4. Review troubleshooting section above
5. Test with `test-whatsapp-integration.mjs`:
   ```bash
   export BASE_URL=https://your-app.vercel.app
   node test-whatsapp-integration.mjs
   ```

---

**Last Updated**: February 15, 2026
**Status**: Complete Setup Guide ✅
