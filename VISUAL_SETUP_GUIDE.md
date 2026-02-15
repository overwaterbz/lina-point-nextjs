# 📸 Visual Setup Guide: Screenshots & Step-by-Step

This guide provides visual references for setting up Twilio Webhook and Vercel Cron.

---

## 🎯 Quick Visual Checklist

```
[ ] 1. Twilio Account Created
[ ] 2. Twilio Credentials Copied (Account SID + Auth Token)
[ ] 3. WhatsApp Sandbox Activated
[ ] 4. Environment Variables Added to Vercel
[ ] 5. Webhook URL Configured in Twilio
[ ] 6. Vercel Cron Job Active
[ ] 7. First Test Message Sent Successfully
```

---

## Part 1: Twilio Console Setup

### 1.1 Finding Your Twilio Credentials

**Location**: https://console.twilio.com/

```
┌─────────────────────────────────────────┐
│ Twilio Console - Dashboard              │
├─────────────────────────────────────────┤
│                                         │
│ Account Info                            │
│ ┌─────────────────────────────────┐   │
│ │ Account SID                      │   │
│ │ ACxxxxxxxxxxxxxxxxxxxxxxxx       │   │
│ │ [Copy]                           │   │
│ └─────────────────────────────────┘   │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ Auth Token                       │   │
│ │ ••••••••••••••••••••••••        │   │
│ │ [Show] [Copy]                    │   │
│ └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Action**: Click [Copy] for both values and save them.

### 1.2 WhatsApp Sandbox Configuration

**Location**: Console → Messaging → Try WhatsApp → Sandbox

```
┌──────────────────────────────────────────────┐
│ WhatsApp Sandbox                              │
├──────────────────────────────────────────────┤
│                                              │
│ Join your sandbox                            │
│ ┌──────────────────────────────────────┐   │
│ │ To connect, send this message to     │   │
│ │ WhatsApp number: +1 415 523 8886     │   │
│ │                                       │   │
│ │ join <your-code>                     │   │
│ └──────────────────────────────────────┘   │
│                                              │
│ Sandbox Configuration                        │
│ ┌──────────────────────────────────────┐   │
│ │ When a message comes in:             │   │
│ │ [https://your-app.vercel.app/api/... │   │
│ │                                       │   │
│ │ HTTP Method: [POST ▼]               │   │
│ │                                       │   │
│ │ [Save Configuration]                 │   │
│ └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

**Actions**:
1. Note the sandbox number: `+1 415 523 8886`
2. Note the join code: `join <your-code>`
3. Later, paste your webhook URL in "When a message comes in"

---

## Part 2: Vercel Dashboard Setup

### 2.1 Creating New Project

**Location**: https://vercel.com/new

```
┌────────────────────────────────────────┐
│ Import Git Repository                  │
├────────────────────────────────────────┤
│                                        │
│ Search repositories...                 │
│ ┌────────────────────────────────┐   │
│ │ lina-point-ai-ecosystem        │   │
│ │ overwaterbz/lina-point-ai...   │   │
│ │                        [Import]│   │
│ └────────────────────────────────┘   │
└────────────────────────────────────────┘
```

**Action**: Click [Import] on your repository.

### 2.2 Adding Environment Variables

**Location**: Project Settings → Environment Variables

```
┌────────────────────────────────────────────────┐
│ Environment Variables                          │
├────────────────────────────────────────────────┤
│                                                │
│ Add New                                        │
│ ┌────────────────────────────────────────┐   │
│ │ Key                                     │   │
│ │ [TWILIO_ACCOUNT_SID              ]     │   │
│ │                                         │   │
│ │ Value                                   │   │
│ │ [ACxxxxxxxxxxxxxxxx              ]     │   │
│ │                                         │   │
│ │ Environment                             │   │
│ │ ☑ Production ☑ Preview ☑ Development  │   │
│ │                                         │   │
│ │ [Cancel]                      [Save]   │   │
│ └────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

**Actions**:
1. Click "Add New"
2. Enter Key name (e.g., `TWILIO_ACCOUNT_SID`)
3. Enter Value
4. Check all three environments
5. Click [Save]
6. Repeat for all variables

**Variables to add**:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROK_API_KEY`
- (and others from `.env.example`)

### 2.3 Verifying Cron Jobs

**Location**: Project Settings → Cron Jobs

```
┌────────────────────────────────────────────┐
│ Cron Jobs                                  │
├────────────────────────────────────────────┤
│                                            │
│ Active Cron Jobs                           │
│ ┌────────────────────────────────────┐   │
│ │ Path: /api/whatsapp-cron           │   │
│ │ Schedule: 0 10 * * *               │   │
│ │ Status: ● Active                   │   │
│ │                                     │   │
│ │ Last run: 2026-02-15 10:00:00 UTC │   │
│ │ Next run: 2026-02-16 10:00:00 UTC │   │
│ └────────────────────────────────────┘   │
│                                            │
│ This cron job was automatically detected  │
│ from your vercel.json file.               │
└────────────────────────────────────────────┘
```

**Verification**:
- Path should be: `/api/whatsapp-cron`
- Schedule should be: `0 10 * * *`
- Status should be: Active (green dot)

**Note**: If not visible, check:
1. `vercel.json` exists in root directory
2. File contains correct cron configuration
3. Redeploy the project

---

## Part 3: Configuration Flow Diagram

```
┌─────────────┐
│   GitHub    │
│ Repository  │
└──────┬──────┘
       │
       │ (Connected to)
       ▼
┌─────────────┐      ┌──────────────┐
│   Vercel    │◄─────│ Environment  │
│ Deployment  │      │  Variables   │
└──────┬──────┘      └──────────────┘
       │
       │ (Generates)
       ▼
┌─────────────────────────────┐
│ Production URL              │
│ https://your-app.vercel.app │
└──────┬──────────────────────┘
       │
       │ (Used in)
       ▼
┌─────────────────────┐
│ Twilio Webhook      │
│ Configuration       │
│                     │
│ When message comes: │
│ → Webhook URL       │
└─────────────────────┘
```

---

## Part 4: Testing Flow

### 4.1 WhatsApp Message Flow

```
┌────────────┐
│   Phone    │
│  WhatsApp  │
└─────┬──────┘
      │
      │ 1. Send: "Hello"
      ▼
┌─────────────────┐
│ Twilio Sandbox  │
│ +1 415 523 8886 │
└────────┬────────┘
         │
         │ 2. Forwards to Webhook
         ▼
┌──────────────────────────────┐
│ Your Vercel App              │
│ /api/whatsapp-webhook        │
│                              │
│ 3. Processes with AI Agent   │
└───────────┬──────────────────┘
            │
            │ 4. Generates Response
            ▼
┌──────────────────┐
│ Twilio API       │
│ Send Message     │
└────────┬─────────┘
         │
         │ 5. Delivers Response
         ▼
┌────────────┐
│   Phone    │
│  WhatsApp  │
└────────────┘
```

### 4.2 Cron Job Flow

```
┌──────────────┐
│ Vercel Cron  │
│ Scheduler    │
└──────┬───────┘
       │
       │ Triggers daily at 10:00 UTC
       ▼
┌────────────────────┐
│ /api/whatsapp-cron │
│                    │
│ 1. Query Database  │
│ 2. Find Bookings   │
│ 3. Send Messages   │
└────────┬───────────┘
         │
         │ For each booking
         ▼
┌──────────────────┐
│ Twilio API       │
│ Send Message     │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Guest WhatsApp  │
└─────────────────┘
```

---

## Part 5: Verification Commands

### Check Webhook Status

```bash
curl https://your-app.vercel.app/api/whatsapp-webhook
```

**Expected Output**:
```json
{
  "status": "ok",
  "message": "WhatsApp webhook is running",
  "timestamp": "2026-02-15T14:11:09.692Z"
}
```

### Check Cron Endpoint

```bash
curl https://your-app.vercel.app/api/whatsapp-cron
```

**Expected Output**:
```json
{
  "success": true,
  "results": {
    "upcomingReminders": 0,
    "welcomeMessages": 0,
    "errors": []
  },
  "timestamp": "..."
}
```

### Check Admin Dashboard

```bash
# Open in browser
open https://your-app.vercel.app/admin/whatsapp
```

**Expected**: Login page → Dashboard with stats

---

## Part 6: Common Screen Locations

### Twilio Console Screens

| Screen | Navigation Path |
|--------|----------------|
| **Credentials** | Console Home → Account Info |
| **WhatsApp Sandbox** | Messaging → Try WhatsApp → Sandbox |
| **Webhook Settings** | Messaging → Try WhatsApp → Sandbox Settings |
| **Logs** | Monitor → Logs → Errors & Warnings |

### Vercel Dashboard Screens

| Screen | Navigation Path |
|--------|----------------|
| **Environment Variables** | Project → Settings → Environment Variables |
| **Cron Jobs** | Project → Settings → Cron Jobs |
| **Deployment Logs** | Project → Deployments → [Latest] → Logs |
| **Function Logs** | Project → Logs |

### Supabase Dashboard Screens

| Screen | Navigation Path |
|--------|----------------|
| **SQL Editor** | Project → SQL Editor |
| **Table Editor** | Project → Table Editor |
| **API Settings** | Project → Settings → API |
| **Database Logs** | Project → Logs |

---

## Part 7: Quick Reference Card

### 📋 Copy-Paste Checklist

```
Twilio Setup:
□ Account SID copied from console
□ Auth Token copied from console
□ Sandbox number noted: +1 415 523 8886
□ Join code sent to WhatsApp: join <code>

Vercel Setup:
□ Repository imported to Vercel
□ All environment variables added
□ Project deployed successfully
□ Deployment URL copied: https://_____.vercel.app

Webhook Configuration:
□ Webhook URL set in Twilio: https://_____.vercel.app/api/whatsapp-webhook
□ HTTP method set to POST
□ Configuration saved in Twilio

Verification:
□ Webhook health check returns OK
□ Cron job visible in Vercel dashboard
□ Test WhatsApp message gets response
□ Admin dashboard accessible
```

---

## 🎉 Success Indicators

You know everything is working when:

1. ✅ **Webhook Responds**:
   ```bash
   curl https://your-app.vercel.app/api/whatsapp-webhook
   # Returns: {"status":"ok",...}
   ```

2. ✅ **WhatsApp Replies**:
   - Send "Hello" to sandbox
   - Get Maya Guide response within 5 seconds

3. ✅ **Dashboard Shows Data**:
   - Visit /admin/whatsapp
   - See your messages in Recent Messages
   - See your session in Active Sessions

4. ✅ **Cron Job Listed**:
   - Vercel → Settings → Cron Jobs
   - Shows: /api/whatsapp-cron (Active)

---

**Visual Guide Complete!** ✅

For detailed instructions, see `SETUP_INSTRUCTIONS.md`
