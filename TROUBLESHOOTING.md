# 🔧 Troubleshooting Guide: WhatsApp Integration

Common issues and their solutions for Vercel Cron, Twilio Webhook, and WhatsApp integration.

---

## 🚨 Quick Diagnosis

### Run These Checks First

```bash
# 1. Check webhook health
curl https://your-app.vercel.app/api/whatsapp-webhook

# 2. Check cron endpoint
curl https://your-app.vercel.app/api/whatsapp-cron

# 3. Check environment variables (locally)
cat .env.local | grep TWILIO

# 4. Test TypeScript compilation
npx tsc --noEmit --skipLibCheck
```

---

## Issue 1: WhatsApp Bot Not Responding

### Symptoms
- Send message to WhatsApp sandbox
- No response received
- Message appears as "Delivered" but no reply

### Diagnosis Steps

**Step 1: Check Twilio Webhook Logs**

1. Go to: [Twilio Console](https://console.twilio.com)
2. Navigate: Monitor → Logs → Errors & Warnings
3. Look for recent webhook requests
4. Check HTTP status code

**Common Status Codes**:
- `200`: Success (but check response)
- `401`: Unauthorized (signature validation failed)
- `500`: Internal server error
- `404`: Webhook URL not found

**Step 2: Check Vercel Function Logs**

1. Go to: [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click: "Logs" tab
4. Filter by: "api/whatsapp-webhook"
5. Look for errors

**Step 3: Verify Webhook URL**

```bash
# Should return JSON with status: "ok"
curl https://your-app.vercel.app/api/whatsapp-webhook

# If returns 404, check deployment
vercel ls
```

### Solutions

**Solution A: Fix Webhook URL in Twilio**

1. Twilio Console → Messaging → Sandbox Settings
2. Verify URL is exactly:
   ```
   https://your-app.vercel.app/api/whatsapp-webhook
   ```
3. No trailing slash
4. HTTPS (not HTTP)
5. Correct domain name

**Solution B: Fix Environment Variables**

```bash
# Verify in Vercel Dashboard → Settings → Environment Variables
TWILIO_ACCOUNT_SID=ACxxxxxx  # Must start with "AC"
TWILIO_AUTH_TOKEN=xxxxxxxx   # 32 characters
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Include "whatsapp:" prefix
```

After updating:
```bash
vercel --prod  # Redeploy
```

**Solution C: Disable Signature Validation (Temporary)**

If still failing, temporarily test without signature validation:

1. Check Vercel logs for signature validation errors
2. For development, signature validation is skipped automatically
3. For production, ensure `TWILIO_AUTH_TOKEN` is correct

**Solution D: Check Grok API Key**

```bash
# If you see "Grok API not configured" warnings
# Add GROK_API_KEY to Vercel environment variables
# Or agent will use mock responses (which is OK for testing)
```

---

## Issue 2: Vercel Cron Job Not Running

### Symptoms
- No proactive messages sent
- Cron job not visible in Vercel dashboard
- Or visible but not executing

### Diagnosis Steps

**Step 1: Verify Cron Configuration**

```bash
# Check vercel.json exists in root
cat vercel.json

# Should contain:
{
  "crons": [
    {
      "path": "/api/whatsapp-cron",
      "schedule": "0 10 * * *"
    }
  ]
}
```

**Step 2: Check Vercel Dashboard**

1. Project → Settings → Cron Jobs
2. Should show: `/api/whatsapp-cron` with schedule `0 10 * * *`
3. Status should be "Active" (green dot)

**Step 3: Test Cron Endpoint Manually**

```bash
# Should return success
curl https://your-app.vercel.app/api/whatsapp-cron

# Expected response:
{
  "success": true,
  "results": {
    "upcomingReminders": 0,
    "welcomeMessages": 0,
    "errors": []
  }
}
```

### Solutions

**Solution A: Redeploy Project**

```bash
# Vercel auto-detects vercel.json on deployment
vercel --prod
```

**Solution B: Verify Schedule Format**

The schedule `0 10 * * *` means:
- `0` = minute (0)
- `10` = hour (10 AM)
- `*` = day of month (every day)
- `*` = month (every month)
- `*` = day of week (every day)

Times are in **UTC**. Convert to your timezone:
- 10:00 UTC = 5:00 AM EST
- 10:00 UTC = 2:00 AM PST

**Solution C: Wait for First Run**

- Cron jobs may take up to 24 hours to activate after first deployment
- Check "Next run" time in Vercel dashboard

**Solution D: Check Function Timeout**

Cron functions have a 10-second default timeout on Hobby plan:

1. Vercel Dashboard → Settings → Functions
2. Increase timeout if needed (Pro plan required for >10s)

---

## Issue 3: Database Connection Errors

### Symptoms
- `Failed to create session` errors
- `Database connection failed` in logs
- RLS policy errors

### Diagnosis Steps

**Step 1: Verify Migration Ran**

1. Supabase Dashboard → Table Editor
2. Check tables exist:
   - `whatsapp_sessions`
   - `whatsapp_messages`
3. Check `profiles` table has `phone_number` column

**Step 2: Verify Environment Variables**

```bash
# Must be set in Vercel
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # NOT the anon key
```

**Step 3: Check RLS Policies**

1. Supabase → Authentication → Policies
2. Verify policies exist for:
   - `whatsapp_sessions`
   - `whatsapp_messages`

### Solutions

**Solution A: Run Migration**

```sql
-- In Supabase SQL Editor, run:
-- Copy from migrations/004_add_whatsapp_support.sql
```

**Solution B: Use Service Role Key**

The webhook needs the **service role key**, not the anon key:

1. Supabase → Settings → API
2. Copy "service_role" key (not "anon" key)
3. Add to Vercel as `SUPABASE_SERVICE_ROLE_KEY`
4. Redeploy

**Solution C: Verify Supabase URL**

```bash
# Should be format:
https://xxxxxxxxxxxxx.supabase.co

# NOT:
https://app.supabase.com/project/xxxxx
```

---

## Issue 4: Authentication Errors (401/403)

### Symptoms
- `Invalid signature` errors in logs
- `Unauthorized` responses
- Admin dashboard login fails

### For Twilio Webhook (401)

**Diagnosis**:
```bash
# Check Vercel logs for:
"[WhatsApp Webhook] Invalid Twilio signature"
```

**Solution**:
1. Verify `TWILIO_AUTH_TOKEN` is correct
2. Verify webhook URL has no trailing slash
3. For development, signature validation is skipped
4. For production, ensure URL matches exactly in Twilio

### For Admin Dashboard (401)

**Diagnosis**:
- Cannot access `/admin/whatsapp`
- Redirected to login
- "Unauthorized" error

**Solution**:
1. Ensure you're logged in to Supabase
2. Verify Supabase auth is working:
   ```bash
   # Visit /auth/login
   # Try logging in
   ```
3. Check `middleware.ts` is not blocking admin routes

---

## Issue 5: Messages Not Saving to Database

### Symptoms
- Bot responds, but messages don't appear in admin dashboard
- Database tables are empty
- Sessions not created

### Diagnosis

**Check Agent Logs**:
```bash
# In Vercel logs, look for:
"[WhatsAppAgent] Looking up user for phone: +1234567890"
"[WhatsAppAgent] Created new session: xxxxx"
"[WhatsAppAgent] Conversation saved successfully"
```

**Check Database**:
```sql
-- In Supabase SQL Editor
SELECT * FROM whatsapp_sessions ORDER BY created_at DESC LIMIT 10;
SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT 10;
```

### Solutions

**Solution A: Verify RLS Policies**

The service role should have full access:

```sql
-- Check if this policy exists
SELECT * FROM pg_policies 
WHERE tablename IN ('whatsapp_sessions', 'whatsapp_messages');
```

**Solution B: Check Agent Errors**

Look in Vercel logs for:
- `Error saving conversation`
- `Failed to create session`
- `Database error`

**Solution C: Test Database Connection**

```bash
# Create a simple test file
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
client.from('whatsapp_sessions').select('count').then(console.log);
"
```

---

## Issue 6: "Module not found" Errors

### Symptoms
- Build fails on Vercel
- `Cannot find module '@/lib/whatsappHelper'`
- TypeScript errors

### Solutions

**Solution A: Verify File Paths**

```bash
# Check files exist:
ls -la lib/whatsappHelper.ts
ls -la lib/whatsappConciergeAgent.ts
ls -la src/app/api/whatsapp-webhook/route.ts
```

**Solution B: Check tsconfig.json**

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/lib/*": ["./lib/*"]
    }
  }
}
```

**Solution C: Reinstall Dependencies**

```bash
rm -rf node_modules package-lock.json
npm install
```

**Solution D: Check Build on Vercel**

1. Vercel Dashboard → Deployments → [Latest] → Build Logs
2. Look for TypeScript errors
3. Fix locally first:
   ```bash
   npm run build
   ```

---

## Issue 7: Rate Limiting / Too Many Requests

### Symptoms
- Some messages get through, others don't
- "Rate limit exceeded" in Twilio logs
- Slow response times

### Solutions

**Solution A: Twilio Rate Limits**

Free tier limits:
- 1 message per second
- 100 messages per day (sandbox)

**Check your usage**:
1. Twilio Console → Usage
2. If exceeded, upgrade to paid account

**Solution B: Add Delays in Cron**

The cron job already has 500ms delays:
```typescript
// In whatsapp-cron/route.ts
await new Promise((resolve) => setTimeout(resolve, 500));
```

**Solution C: Implement Queue**

For high volume, implement a message queue (future enhancement).

---

## Issue 8: Grok API Errors

### Symptoms
- "Grok API error" in logs
- Generic responses instead of personalized
- Agent falls back to mock responses

### This is OK for Testing

The agent works with mock responses if Grok is not configured.

### To Enable Grok

**Solution**:
1. Get API key from https://console.x.ai
2. Add to Vercel:
   ```
   GROK_API_KEY=xai-xxxxxxxxxxxxx
   GROK_BASE_URL=https://api.x.ai/v1
   ```
3. Redeploy

---

## 🔍 Debugging Checklist

Use this checklist to systematically debug issues:

```
Environment:
□ All environment variables set in Vercel
□ TWILIO_AUTH_TOKEN is correct
□ SUPABASE_SERVICE_ROLE_KEY is service role (not anon)
□ GROK_API_KEY is set (or accept mock responses)

Deployment:
□ Latest code pushed to GitHub
□ Vercel deployment successful (green checkmark)
□ Build logs show no errors
□ Function logs accessible

Twilio:
□ Webhook URL configured correctly
□ HTTP method is POST
□ Sandbox joined via WhatsApp
□ Webhook logs show 200 responses

Database:
□ Migration ran successfully
□ Tables exist in Supabase
□ RLS policies configured
□ Can query tables manually

Testing:
□ Webhook health check returns OK
□ Cron endpoint returns success
□ Can send/receive WhatsApp messages
□ Messages appear in admin dashboard
```

---

## 🆘 Still Having Issues?

### 1. Check Specific Logs

**Vercel Logs**:
```bash
# Real-time logs
vercel logs --follow

# Or in dashboard:
Project → Logs → Filter by function
```

**Twilio Logs**:
```
Console → Monitor → Logs → Errors & Warnings
Filter: Last 24 hours
```

**Supabase Logs**:
```
Project → Logs → Filter by severity
```

### 2. Run Test Script

```bash
export BASE_URL=https://your-app.vercel.app
export TEST_PHONE=+1234567890
node test-whatsapp-integration.mjs
```

### 3. Test Locally First

```bash
# Test everything locally before deploying
npm run dev

# In another terminal:
export BASE_URL=http://localhost:3000
node test-whatsapp-integration.mjs
```

### 4. Use Debugging Mode

Add console.logs to troubleshoot:

```typescript
// In whatsappConciergeAgent.ts or whatsappHelper.ts
console.log('[DEBUG] Variable value:', someVariable);
```

Redeploy and check Vercel logs.

---

## 📚 Additional Resources

- **Twilio Status**: https://status.twilio.com/
- **Vercel Status**: https://www.vercel-status.com/
- **Supabase Status**: https://status.supabase.com/
- **Documentation**:
  - `SETUP_INSTRUCTIONS.md` - Complete setup guide
  - `VISUAL_SETUP_GUIDE.md` - Visual walkthrough
  - `WHATSAPP_QUICKSTART.md` - Quick 15-min setup

---

**Last Updated**: February 15, 2026
**Status**: Comprehensive Troubleshooting Guide ✅
