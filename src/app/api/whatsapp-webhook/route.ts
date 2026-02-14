import { NextRequest, NextResponse } from "next/server";
import { runWhatsAppConciergeAgent } from "@/lib/whatsappConciergeAgent";
import { sendWhatsAppMessage, validateTwilioSignature } from "@/lib/whatsappHelper";

/**
 * POST /api/whatsapp-webhook
 * Receives incoming WhatsApp messages from Twilio
 * Webhook format: https://www.twilio.com/docs/sms/twiml#twilios-request-to-your-application
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[WhatsApp Webhook] Incoming request");

    // Get the full URL for signature validation
    const url = request.url;

    // Parse form data (Twilio sends application/x-www-form-urlencoded)
    const formData = await request.formData();
    const params: Record<string, string> = {};
    
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    console.log("[WhatsApp Webhook] Request params:", {
      From: params.From,
      To: params.To,
      Body: params.Body,
      MessageSid: params.MessageSid,
    });

    // Verify Twilio signature for security
    const twilioSignature = request.headers.get("X-Twilio-Signature") || "";
    
    // Skip signature validation in development or if not configured
    const isDev = process.env.NODE_ENV === "development";
    const skipValidation = isDev || !process.env.TWILIO_AUTH_TOKEN;
    
    if (!skipValidation) {
      const isValid = validateTwilioSignature(twilioSignature, url, params);
      
      if (!isValid) {
        console.error("[WhatsApp Webhook] Invalid Twilio signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 403 }
        );
      }
    } else if (!twilioSignature && !isDev) {
      console.warn("[WhatsApp Webhook] Signature validation skipped - configure TWILIO_AUTH_TOKEN for production");
    }

    // Extract message data
    const from = params.From; // Format: whatsapp:+1234567890
    const body = params.Body;
    const messageSid = params.MessageSid;

    if (!from || !body) {
      console.error("[WhatsApp Webhook] Missing From or Body");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Extract phone number (remove 'whatsapp:' prefix)
    const phoneNumber = from.replace("whatsapp:", "");

    console.log(`[WhatsApp Webhook] Processing message from ${phoneNumber}: "${body}"`);

    // Run the WhatsApp Concierge Agent
    const agentResult = await runWhatsAppConciergeAgent(phoneNumber, body);

    if (agentResult.error) {
      console.error("[WhatsApp Webhook] Agent error:", agentResult.error);
    }

    // Send response back to user
    const response = agentResult.response || "Thanks for your message! I'll get back to you shortly. 🌟";
    
    const sendResult = await sendWhatsAppMessage(phoneNumber, response);

    if (!sendResult.success) {
      console.error("[WhatsApp Webhook] Failed to send response:", sendResult.error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send response",
          details: sendResult.error,
        },
        { status: 500 }
      );
    }

    console.log(`[WhatsApp Webhook] Response sent successfully: ${sendResult.messageSid}`);

    // Return TwiML response (optional - Twilio doesn't require a response for webhooks)
    // But we can return JSON for logging purposes
    return NextResponse.json({
      success: true,
      messageSid: sendResult.messageSid,
      intent: agentResult.intent,
      action: agentResult.action,
    });

  } catch (error) {
    console.error("[WhatsApp Webhook] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/whatsapp-webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "WhatsApp webhook is running",
    timestamp: new Date().toISOString(),
  });
}
