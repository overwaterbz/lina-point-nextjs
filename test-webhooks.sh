#!/bin/bash

# Webhook Testing Guide for Lina Point AI Ecosystem
# Use these curl commands to test your webhooks locally before deploying

API_URL="https://lina-point-ai-ecosystem.vercel.app"
CRON_SECRET="${CRON_SECRET:?Error: CRON_SECRET env var not set. Generate one with: openssl rand -hex 32}"
N8N_SECRET="awXtklQ7GqAInNxd3E1CSF4e8rBmOiuj"

echo "==================================================================="
echo "  LINA POINT - WEBHOOK & API TESTING GUIDE"
echo "==================================================================="

# ===================================================================
# 1. HEALTH CHECK
# ===================================================================
echo -e "\n📍 1. HEALTH CHECK"
echo "Testing homepage..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$API_URL/"

# ===================================================================
# 2. TEST ENDPOINTS
# ===================================================================
echo -e "\n📍 2. TEST ENDPOINTS"

echo -e "\n🧪 Test Magic Content Generation:"
curl -s "$API_URL/api/test-magic" | jq '.' 2>/dev/null || curl -s "$API_URL/api/test-magic"

echo -e "\n🧪 Check Events:"
curl -s "$API_URL/api/check-events" | jq '.' 2>/dev/null || curl -s "$API_URL/api/check-events"

# ===================================================================
# 3. CRON ENDPOINT (Protected)
# ===================================================================
echo -e "\n📍 3. CRON ENDPOINT"
echo "Testing cron job with secret header..."
curl -X GET "$API_URL/api/cron/send-proactive-messages" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -s | jq '.' 2>/dev/null || echo "Response received"

# ===================================================================
# 4. N8N WEBHOOK
# ===================================================================
echo -e "\n📍 4. N8N WEBHOOK TRIGGER"
echo "Triggering n8n workflow..."
curl -X POST "$API_URL/api/trigger-n8n" \
  -H "Content-Type: application/json" \
  -H "x-n8n-secret: $N8N_SECRET" \
  -d '{"source":"webhook-test","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' \
  -s | jq '.' 2>/dev/null || echo "Webhook triggered"

# ===================================================================
# 5. PAYMENT INTENT (Square/Stripe)
# ===================================================================
echo -e "\n📍 5. PAYMENT PROCESSING"
echo "Creating payment intent (test mode)..."
curl -X POST "$API_URL/api/stripe/create-payment-intent" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.00,
    "currency": "USD",
    "reservationId": "test-'$(date +%s)'",
    "customerName": "Test User",
    "customerEmail": "test@example.com"
  }' \
  -s | jq '.' 2>/dev/null || curl -X POST "$API_URL/api/stripe/create-payment-intent" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.00,
    "currency": "USD",
    "reservationId": "test-'$(date +%s)'",
    "customerName": "Test User",
    "customerEmail": "test@example.com"
  }' -s

# ===================================================================
# 6. STRAIN WEBHOOK (Receiving)
# ===================================================================
echo -e "\n📍 6. STRIPE WEBHOOK SIMULATION"
echo "Note: This will fail signature verification (expected)"
curl -X POST "$API_URL/api/stripe/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_'$(date +%s)'",
    "object": "event",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_'$(date +%s)'",
        "amount": 1000,
        "currency": "usd",
        "status": "succeeded",
        "metadata": {"reservationId": "test-123"}
      }
    }
  }' \
  -s | jq '.' 2>/dev/null || echo "Webhook received (signature validation expected to fail)"

# ===================================================================
# 7. WHATSAPP WEBHOOK SIMULATION
# ===================================================================
echo -e "\n📍 7. WHATSAPP WEBHOOK SIMULATION"
echo "Simulating incoming WhatsApp message..."
curl -X POST "$API_URL/api/whatsapp-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "from": "+1234567890",
      "id": "msg_test_'$(date +%s)'",
      "timestamp": "'$(date +%s)'",
      "text": {
        "body": "Hello bot! Test message"
      },
      "type": "text"
    }]
  }' \
  -s | jq '.' 2>/dev/null || echo "Webhook received"

# ===================================================================
# 8. RESPONSE TIME TESTING
# ===================================================================
echo -e "\n📍 8. RESPONSE TIME TESTING"
echo "Measuring API response times..."

echo -n "Homepage: "
curl -s -o /dev/null -w "%{time_total}s\n" "$API_URL/"

echo -n "Magic Content: "
curl -s -o /dev/null -w "%{time_total}s\n" "$API_URL/api/test-magic"

echo -n "Events Check: "
curl -s -o /dev/null -w "%{time_total}s\n" "$API_URL/api/check-events"

# ===================================================================
# 9. ERROR HANDLING TEST
# ===================================================================
echo -e "\n📍 9. ERROR HANDLING"
echo "Testing invalid endpoints (should return 404)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$API_URL/api/nonexistent-endpoint"

# ===================================================================
# 10. MONITORING SETUP
# ===================================================================
echo -e "\n📍 10. MONITORING & LOGS"
echo "To monitor your deployment:"
echo ""
echo "Vercel Logs:"
echo "  https://vercel.com/rick-jennings-projects/lina-point-ai-ecosystem/logs"
echo ""
echo "Supabase Logs:"
echo "  https://app.supabase.com/project/seonmgpsyyzbpcsrzjxi/logs"
echo ""
echo "Stripe Webhooks:"
echo "  https://dashboard.stripe.com/webhooks"
echo ""
echo "Twilio Console:"
echo "  https://console.twilio.com"

echo -e "\n==================================================================="
echo "  WEBHOOK TESTING COMPLETE"
echo "==================================================================="
