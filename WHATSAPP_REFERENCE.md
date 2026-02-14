# WhatsApp Integration - Quick Reference Card

## 🚀 Quick Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
node test-whatsapp-integration.mjs

# Check TypeScript
npx tsc --noEmit --skipLibCheck

# Deploy to Vercel
vercel --prod
```

## 📋 Environment Variables

```bash
# Required
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key
GROK_API_KEY=xai-xxx

# Optional
CRON_SECRET=random_secret_string
```

## 🔗 Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/whatsapp-webhook` | GET | Health check |
| `/api/whatsapp-webhook` | POST | Receive messages |
| `/api/whatsapp-cron` | GET | Daily cron job |
| `/api/admin/send-whatsapp` | POST | Manual send |
| `/admin/whatsapp` | GET | Dashboard UI |

## 📊 Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User data | `phone_number` (unique) |
| `whatsapp_sessions` | Conversations | `phone_number`, `context`, `is_active` |
| `whatsapp_messages` | Message history | `direction`, `message_body`, `agent_response` |

## 🤖 Agent Workflow

```
1. Lookup User → Find/create user and session
2. Analyze & Respond → Grok-4 generates response
3. Execute Action → Trigger booking/magic/help
4. Save Conversation → Store in database
```

## 🎯 Intent Detection

| User Message | Intent | Action |
|--------------|--------|--------|
| "book a room" | booking | BOOK_ROOM |
| "magic experience" | magic | EXPLAIN_MAGIC |
| "hello" | general | HELP |

## 📱 Message Templates

```javascript
// Welcome
sendWelcomeMessage(phone, name)

// Booking confirmation
sendBookingConfirmation(phone, {
  bookingId, checkIn, checkOut, roomType, guestName
})

// Reminder
sendBookingReminder(phone, {
  guestName, checkIn, daysUntil
})

// Magic content
sendMagicContentDelivery(phone, {
  songUrl, videoUrl, artworkUrl, title
})
```

## 🔐 Security Checklist

- [x] Twilio signature validation
- [x] HTTPS only
- [x] Environment variables protected
- [x] RLS policies enabled
- [x] Admin authentication
- [x] CRON_SECRET set

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Unauthorized" error | Check Twilio credentials |
| Agent not responding | Verify GROK_API_KEY |
| Webhook not receiving | Check Twilio Console URL |
| Database errors | Run migrations |
| Build fails | Font issue - TypeScript OK |

## 📚 Documentation Index

1. **[WHATSAPP_QUICKSTART.md](./WHATSAPP_QUICKSTART.md)** - 15-min setup
2. **[WHATSAPP_INTEGRATION.md](./WHATSAPP_INTEGRATION.md)** - Complete guide
3. **[WHATSAPP_IMPLEMENTATION_SUMMARY.md](./WHATSAPP_IMPLEMENTATION_SUMMARY.md)** - Technical details
4. **[ADMIN_DASHBOARD_VISUAL.md](./ADMIN_DASHBOARD_VISUAL.md)** - UI reference

## 🧪 Testing Workflow

```bash
# 1. Health check
curl http://localhost:3000/api/whatsapp-webhook

# 2. Simulate webhook
curl -X POST http://localhost:3000/api/whatsapp-webhook \
  -d "From=whatsapp:+1234567890" \
  -d "Body=Hello" \
  -d "MessageSid=TEST123"

# 3. Test cron job
curl http://localhost:3000/api/whatsapp-cron

# 4. Run automated tests
node test-whatsapp-integration.mjs
```

## 📈 Monitoring

**Check these regularly:**
- Vercel Dashboard → Logs
- Twilio Console → Monitor → Logs
- Supabase Dashboard → Table Editor
- `/admin/whatsapp` → Stats & Messages

## 🎨 Admin Dashboard

**Location:** `/admin/whatsapp`

**Features:**
- View active sessions (12 shown)
- Browse recent messages (50 shown)
- Send test messages
- Monitor performance (intents, actions)

## 🔄 Cron Schedule

**Frequency:** Daily at 10:00 AM UTC

**Actions:**
- 7 days before → Welcome message
- 3 days before → First reminder
- 1 day before → Final reminder

## 💡 Pro Tips

1. Use ngrok for local webhook testing
2. Test with Twilio Sandbox before production
3. Monitor message delivery in Twilio Console
4. Check admin dashboard for conversation insights
5. Customize system prompts for your brand
6. Set up alerts for failed messages
7. Review logs regularly

## 🚨 Common Errors

```
Error: Invalid signature
→ Check TWILIO_AUTH_TOKEN

Error: Failed to send message
→ Verify phone format: +1234567890

Error: Database connection failed
→ Check SUPABASE credentials

Error: Grok API error
→ Verify GROK_API_KEY
```

## 📞 Support Resources

- Twilio Docs: https://www.twilio.com/docs/whatsapp
- LangGraph: https://python.langchain.com/docs/langgraph
- Grok API: https://docs.x.ai/
- Vercel Cron: https://vercel.com/docs/cron-jobs

## ✅ Pre-Launch Checklist

- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] Twilio webhook configured
- [ ] Test message sent successfully
- [ ] Admin dashboard accessible
- [ ] Cron job scheduled
- [ ] Monitoring set up
- [ ] Documentation reviewed

## 🎉 Launch Day

1. Enable WhatsApp Business number
2. Update TWILIO_WHATSAPP_NUMBER
3. Configure production webhook
4. Test with real numbers
5. Monitor first conversations
6. Adjust system prompts as needed
7. Celebrate! 🎊

---

**Version:** 1.0.0  
**Last Updated:** February 14, 2026  
**Status:** Production Ready ✅
