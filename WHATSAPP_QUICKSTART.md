# WhatsApp Integration Quick Start

Get your WhatsApp concierge up and running in 15 minutes.

## Prerequisites

- Node.js 18+ installed
- Supabase project set up
- Twilio account (free trial works)

## Step 1: Get Twilio Credentials (5 min)

1. Sign up at [Twilio](https://www.twilio.com/try-twilio)
2. Go to Console Dashboard
3. Copy:
   - Account SID
   - Auth Token
4. Go to Messaging → Try it out → WhatsApp Sandbox
5. Note the sandbox number (e.g., `whatsapp:+14155238886`)

## Step 2: Configure Environment (2 min)

Create `.env.local`:

```bash
# Copy from .env.example
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Your existing vars
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
GROK_API_KEY=your_grok_key
```

## Step 3: Run Database Migration (3 min)

1. Open Supabase SQL Editor
2. Copy contents of `migrations/004_add_whatsapp_support.sql`
3. Paste and run
4. Verify tables created:
   - `whatsapp_sessions`
   - `whatsapp_messages`
   - `profiles` has `phone_number` column

## Step 4: Test Locally (5 min)

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Visit http://localhost:3000/api/whatsapp-webhook - you should see:
```json
{
  "status": "ok",
  "message": "WhatsApp webhook is running",
  "timestamp": "..."
}
```

## Step 5: Test with Twilio Sandbox

### Option A: Use ngrok (Recommended for local testing)

```bash
# In a new terminal
npx ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
```

1. Go to Twilio Console → Messaging → Try it out → WhatsApp Sandbox Settings
2. Set "When a message comes in":
   ```
   https://abc123.ngrok.io/api/whatsapp-webhook
   ```
3. Save

### Option B: Deploy to Vercel first

```bash
# Push to GitHub
git push origin main

# Deploy to Vercel
vercel --prod
```

Then configure webhook:
```
https://your-app.vercel.app/api/whatsapp-webhook
```

## Step 6: Send First Message

1. Join Twilio WhatsApp Sandbox:
   - Send the join code from Twilio Console to the sandbox number
   - Example: Send "join <your-code>" to +1 415 523 8886

2. Send a test message:
   ```
   Hello!
   ```

3. You should receive a response from Maya Guide! 🎉

## Test the Admin Dashboard

1. Visit http://localhost:3000/admin/whatsapp
2. Login with your Supabase credentials
3. You should see:
   - Active sessions
   - Recent messages
   - Ability to send test messages

## Verify Everything Works

Run the test script:

```bash
# Set test environment
export BASE_URL=http://localhost:3000
export TEST_PHONE=+1234567890

# Run tests
node test-whatsapp-integration.mjs
```

## Common Issues

### "Unauthorized" error
- Check Twilio credentials in `.env.local`
- Restart dev server after changing env vars

### "Failed to send message"
- Verify phone number format: `+1234567890` (no spaces, include +)
- Ensure recipient has joined WhatsApp Sandbox

### Agent not responding
- Check Grok API key is set
- Review console logs for errors
- Verify database migrations ran successfully

### Webhook not receiving messages
- Ensure webhook URL is https (ngrok provides this)
- Check webhook URL is saved in Twilio Console
- Verify server is running

## Next Steps

1. ✅ WhatsApp integration working
2. Test conversation flows:
   - "I want to book a room" → should trigger booking intent
   - "Tell me about magic" → should explain magic experiences
3. Test proactive messages:
   - Add a test booking 7 days from now
   - Run cron job: `curl http://localhost:3000/api/whatsapp-cron`
4. Customize agent responses in `lib/whatsappConciergeAgent.ts`
5. Add your branding to welcome messages in `lib/whatsappHelper.ts`

## Production Checklist

Before going live:

- [ ] Apply for WhatsApp Business API approval (not using sandbox)
- [ ] Update `TWILIO_WHATSAPP_NUMBER` to your business number
- [ ] Set `CRON_SECRET` for production
- [ ] Configure webhook on production URL
- [ ] Test signature validation
- [ ] Set up monitoring/alerts
- [ ] Review and customize system prompts
- [ ] Add your team to admin access

## Resources

- [Full Documentation](./WHATSAPP_INTEGRATION.md)
- [Twilio WhatsApp Docs](https://www.twilio.com/docs/whatsapp)
- [LangGraph Guide](https://python.langchain.com/docs/langgraph)
- [Grok API Docs](https://docs.x.ai/)

## Support

Having issues? Check:
1. Server logs: `npm run dev` output
2. Twilio logs: Console → Monitor → Logs
3. Supabase logs: Dashboard → Logs
4. GitHub issues for this repo

Happy building! 🚀
