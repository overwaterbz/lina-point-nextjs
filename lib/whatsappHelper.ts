/**
 * WhatsApp Helper Library
 * Handles outbound WhatsApp messaging via Twilio API
 */

import twilio from "twilio";

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

export interface WhatsAppMessageResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

/**
 * Send a WhatsApp message via Twilio
 * @param phone - Recipient phone number (with country code, e.g., +1234567890)
 * @param text - Message text content
 * @returns Promise with send result
 */
export async function sendWhatsAppMessage(
  phone: string,
  text: string
): Promise<WhatsAppMessageResult> {
  try {
    // Validate environment variables
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error("[WhatsApp] Twilio credentials not configured");
      return {
        success: false,
        error: "Twilio credentials not configured",
      };
    }

    // Ensure phone number has 'whatsapp:' prefix
    const toNumber = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;

    console.log(`[WhatsApp] Sending message to ${toNumber}`);

    // Send message via Twilio
    const message = await twilioClient.messages.create({
      body: text,
      from: TWILIO_WHATSAPP_NUMBER,
      to: toNumber,
    });

    console.log(`[WhatsApp] Message sent successfully: ${message.sid}`);

    return {
      success: true,
      messageSid: message.sid,
    };
  } catch (error) {
    console.error("[WhatsApp] Error sending message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Send a welcome message to a new WhatsApp user
 * @param phone - Recipient phone number
 * @param name - User's name (optional)
 */
export async function sendWelcomeMessage(
  phone: string,
  name?: string
): Promise<WhatsAppMessageResult> {
  const greeting = name ? `Hi ${name}!` : "Hello!";
  const message = `${greeting} 👋

Welcome to Lina Point Resort! I'm Maya, your personal concierge guide. ✨

I can help you with:
🏖️ Room bookings & reservations
🎵 Personalized magic experiences (songs, videos, packages)
🌴 Tours & activities
💫 Special occasions (birthdays, anniversaries, proposals)

Just send me a message and let's create some magic! The Magic is You 🌟`;

  return sendWhatsAppMessage(phone, message);
}

/**
 * Send a booking confirmation message
 * @param phone - Recipient phone number
 * @param bookingDetails - Booking information
 */
export async function sendBookingConfirmation(
  phone: string,
  bookingDetails: {
    bookingId: string;
    checkIn: string;
    checkOut: string;
    roomType: string;
    guestName: string;
  }
): Promise<WhatsAppMessageResult> {
  const message = `🎉 Booking Confirmed!

Hi ${bookingDetails.guestName},

Your reservation at Lina Point Resort is confirmed! ✨

📅 Check-in: ${bookingDetails.checkIn}
📅 Check-out: ${bookingDetails.checkOut}
🏖️ Room: ${bookingDetails.roomType}
🆔 Booking ID: ${bookingDetails.bookingId}

We can't wait to welcome you! Reply with "magic" to explore personalized experiences for your stay. 🌟

The Magic is You! ✨`;

  return sendWhatsAppMessage(phone, message);
}

/**
 * Send a reminder message for upcoming booking
 * @param phone - Recipient phone number
 * @param reminderDetails - Reminder information
 */
export async function sendBookingReminder(
  phone: string,
  reminderDetails: {
    guestName: string;
    checkIn: string;
    daysUntil: number;
  }
): Promise<WhatsAppMessageResult> {
  const message = `🌴 Your Stay is Coming Up!

Hi ${reminderDetails.guestName},

Just ${reminderDetails.daysUntil} day${reminderDetails.daysUntil > 1 ? 's' : ''} until your arrival at Lina Point Resort! 

📅 Check-in: ${reminderDetails.checkIn}

Reply with any questions or if you'd like to add personalized magic experiences to your stay! ✨

Looking forward to hosting you! 🌟`;

  return sendWhatsAppMessage(phone, message);
}

/**
 * Send magic content delivery message
 * @param phone - Recipient phone number
 * @param contentLinks - URLs for song/video content
 */
export async function sendMagicContentDelivery(
  phone: string,
  contentLinks: {
    songUrl?: string;
    videoUrl?: string;
    artworkUrl?: string;
    title?: string;
  }
): Promise<WhatsAppMessageResult> {
  const title = contentLinks.title || "Your Personalized Magic";
  
  let message = `✨ ${title} ✨

Your personalized magic content is ready! 🎵🎬\n\n`;

  if (contentLinks.songUrl) {
    message += `🎵 Song: ${contentLinks.songUrl}\n`;
  }
  if (contentLinks.videoUrl) {
    message += `🎬 Video: ${contentLinks.videoUrl}\n`;
  }
  if (contentLinks.artworkUrl) {
    message += `🎨 Artwork: ${contentLinks.artworkUrl}\n`;
  }

  message += `\nThe Magic is You! 🌟\n\nEnjoy your personalized experience! 💫`;

  return sendWhatsAppMessage(phone, message);
}

/**
 * Validate Twilio webhook signature for security
 * @param twilioSignature - X-Twilio-Signature header value
 * @param url - Full webhook URL
 * @param params - Webhook POST parameters
 * @returns boolean indicating if signature is valid
 */
export function validateTwilioSignature(
  twilioSignature: string,
  url: string,
  params: Record<string, string>
): boolean {
  try {
    if (!process.env.TWILIO_AUTH_TOKEN) {
      console.error("[WhatsApp] TWILIO_AUTH_TOKEN not configured");
      return false;
    }

    return twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      twilioSignature,
      url,
      params
    );
  } catch (error) {
    console.error("[WhatsApp] Error validating Twilio signature:", error);
    return false;
  }
}
