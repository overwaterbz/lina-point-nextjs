# WhatsApp Integration Setup Guide

This guide explains how to set up and configure WhatsApp integration for the Lina Point AI Ecosystem.

## Overview

The WhatsApp integration provides:
- **Automated guest concierge chat** via Twilio WhatsApp Business API
- **AI-powered responses** using Grok-4 and LangGraph
- **Multi-turn conversations** with session management
- **Proactive messaging** (welcome messages, booking reminders)
- **Admin dashboard** for monitoring and manual messaging

## Prerequisites

1. **Twilio Account** with WhatsApp Business API access
2. **WhatsApp Business Number** (or Twilio Sandbox for testing)
3. **Supabase Database** with migrations applied
4. **Grok API Key** (from X.AI)

## Setup Instructions

### 1. Install Dependencies

Already included in package.json:
```bash
npm install twilio
```

### 2. Configure Environment Variables

Add the following to your `.env.local`:

```bash
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Optional: Cron Job Secret (for Vercel)
CRON_SECRET=your_random_secret_string
```

Get your Twilio credentials from: https://console.twilio.com/

### 3. Run Database Migrations

Apply the WhatsApp support migration:

```sql
-- Run in Supabase SQL editor or via migration tool
-- File: migrations/004_add_whatsapp_support.sql
```

This creates:
- `phone_number` column in `profiles` table
- `whatsapp_sessions` table for conversation tracking
- `whatsapp_messages` table for message history
- Appropriate indexes and RLS policies

### 4. Configure Twilio Webhook

1. Go to Twilio Console → Messaging → Try it out → WhatsApp Sandbox
2. Set the webhook URL for incoming messages:
   ```
   https://your-domain.vercel.app/api/whatsapp-webhook
   ```
3. Set HTTP method to `POST`

For production:
1. Apply for WhatsApp Business API approval
2. Get your WhatsApp Business Number
3. Update `TWILIO_WHATSAPP_NUMBER` in environment variables
4. Configure webhook URL in Twilio Console

### 5. Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The cron job (`/api/whatsapp-cron`) is automatically configured via `vercel.json` to run daily at 10:00 AM UTC.

## Testing

### Test with Twilio Sandbox

1. Join the Twilio WhatsApp Sandbox by sending the join code to the sandbox number
2. Send a test message (e.g., "Hello")
3. The agent should respond with a personalized greeting

### Test the Webhook Locally

Using ngrok or similar tool:

```bash
# Start local dev server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Update Twilio webhook URL to your ngrok URL
# https://your-ngrok-url.ngrok.io/api/whatsapp-webhook
```

### Test Admin Dashboard

1. Navigate to `/admin/whatsapp`
2. Use the "Send Test Message" form
3. Enter a phone number (with country code, e.g., +1234567890)
4. Enter a message and send

## Features

### 1. WhatsApp Concierge Agent (`lib/whatsappConciergeAgent.ts`)

The agent uses LangGraph workflow with 4 steps:
1. **Lookup User** - Find user by phone, create/resume session
2. **Analyze & Respond** - Use Grok-4 to generate personalized response
3. **Execute Action** - Trigger booking flow, magic content generation, etc.
4. **Save Conversation** - Store messages in database

System prompt includes:
- User preferences (birthday, anniversary, music style, maya interests)
- Magic experience promotion
- Direct booking encouragement
- Short, conversational responses optimized for WhatsApp

### 2. Webhook Endpoint (`/api/whatsapp-webhook`)

- Receives incoming messages from Twilio
- Validates Twilio signature for security
- Processes message through agent
- Sends response back to user
- Logs all interactions

### 3. Outbound Messaging (`lib/whatsappHelper.ts`)

Helper functions:
- `sendWhatsAppMessage(phone, text)` - Send any message
- `sendWelcomeMessage(phone, name)` - Welcome new guests
- `sendBookingConfirmation(phone, details)` - Confirm bookings
- `sendBookingReminder(phone, details)` - Remind about upcoming stays
- `sendMagicContentDelivery(phone, links)` - Share generated content

### 4. Cron Job (`/api/whatsapp-cron`)

Runs daily to:
- Find bookings 7 days out → send welcome message
- Find bookings 3 days out → send reminder
- Find bookings 1 day out → send final reminder

Protected by `CRON_SECRET` environment variable.

### 5. Admin Dashboard (`/admin/whatsapp`)

Features:
- View active sessions
- Browse recent messages
- Send test messages manually
- Monitor agent performance (intents, actions)

Protected by Supabase authentication.

## Architecture

```
┌─────────────┐
│   Twilio    │
│  WhatsApp   │
└──────┬──────┘
       │
       │ Webhook (POST)
       ▼
┌─────────────────┐
│ /api/whatsapp-  │
│    webhook      │
└────────┬────────┘
         │
         │ Processes message
         ▼
┌──────────────────┐
│ WhatsApp         │
│ Concierge Agent  │◄───── Grok-4 LLM
└────────┬─────────┘
         │
         │ Store/Retrieve
         ▼
┌──────────────────┐
│   Supabase DB    │
│  - sessions      │
│  - messages      │
│  - profiles      │
└──────────────────┘
```

## Security

1. **Webhook Signature Validation**
   - All incoming webhooks are validated using Twilio signature
   - Prevents unauthorized access

2. **Row Level Security (RLS)**
   - Database policies enforce data isolation
   - Users can only see their own messages
   - Service role has full access for agent operations

3. **Admin Authentication**
   - Admin routes protected by Supabase auth
   - Token validation on API endpoints

## Monitoring

View logs in:
- Vercel Dashboard → Logs
- Admin Dashboard → Recent Messages
- Supabase Dashboard → Table Editor

Key metrics:
- Active sessions count
- Message volume per day
- Response rate
- Intent distribution (booking, magic, general)

## Troubleshooting

### Agent not responding
1. Check Twilio webhook is configured correctly
2. Verify environment variables are set
3. Check Vercel deployment logs for errors

### Messages not sending
1. Verify Twilio credentials
2. Check phone number format (must include country code)
3. Ensure WhatsApp number is opted-in to receive messages

### Database errors
1. Verify migrations are applied
2. Check Supabase connection
3. Review RLS policies

### Signature validation failing
1. Ensure `TWILIO_AUTH_TOKEN` is correct
2. Check webhook URL matches exactly (including https)
3. For development, signature validation is skipped

## Future Enhancements

- Add support for WhatsApp media (images, audio)
- Implement rich messaging with buttons/lists
- Add conversation analytics dashboard
- Support multiple languages
- Integrate with calendar for appointment scheduling
- Add sentiment analysis for guest satisfaction monitoring

## API Reference

### POST /api/whatsapp-webhook
Receives incoming WhatsApp messages from Twilio.

**Headers:**
- `X-Twilio-Signature`: Signature for validation

**Body (form-urlencoded):**
- `From`: Sender phone (whatsapp:+1234567890)
- `To`: Recipient phone
- `Body`: Message text
- `MessageSid`: Unique message ID

**Response:**
```json
{
  "success": true,
  "messageSid": "SM...",
  "intent": "booking",
  "action": "BOOK_ROOM"
}
```

### GET /api/whatsapp-cron
Daily cron job for proactive messaging.

**Headers:**
- `Authorization`: Bearer {CRON_SECRET}

**Response:**
```json
{
  "success": true,
  "results": {
    "upcomingReminders": 3,
    "welcomeMessages": 2,
    "errors": []
  }
}
```

### POST /api/admin/send-whatsapp
Send manual WhatsApp message from admin.

**Headers:**
- `Authorization`: Bearer {user_token}

**Body:**
```json
{
  "phone": "+1234567890",
  "message": "Hello from Lina Point!"
}
```

**Response:**
```json
{
  "success": true,
  "messageSid": "SM..."
}
```

## Support

For issues or questions:
1. Check logs in Vercel Dashboard
2. Review Twilio Console for delivery status
3. Check Supabase logs for database errors
4. Consult Twilio documentation: https://www.twilio.com/docs/whatsapp
