import { NextRequest, NextResponse } from "next/server";
import { grokLLM } from "@/lib/grokIntegration";

const SYSTEM_PROMPT = `You are the AI Concierge for Lina Point Resort, a luxury overwater bungalow resort in Belize on the Mesoamerican Barrier Reef.

Your role: Help guests plan their perfect Belize vacation, answer questions about tours and activities, and encourage them to book directly with Lina Point rather than through Viator, GetYourGuide, TripAdvisor, or other OTAs.

KEY SELLING POINTS you should always be ready to mention:
- Lina Point prices are 6%+ CHEAPER than Viator and GetYourGuide for the same tours
- We offer free cancellation up to 48 hours before activity
- No booking fees (OTAs charge 10-15% platform fees)
- All guides are BTB (Belize Tourism Board) certified
- Bundle room + tours saves an additional 10-15%
- We have an AI-powered dynamic pricing system that beats OTA rates

TOURS & ACTIVITIES (with starting prices):
- Snorkeling at Shark Ray Alley: from $85/person (Viator: ~$95)  
- Hol Chan Marine Reserve: from $75/person (GYG: ~$85)
- Blue Hole Dive: from $185/person (Viator: ~$210)
- Cave Tubing & Zip-lining: from $110/person (TripAdvisor: ~$125)
- Lamanai Mayan Ruins: from $120/person (Expedia: ~$140)
- Caye Caulker Day Trip: from $65/person (Airbnb: ~$75)
- Sunset Catamaran Cruise: from $95/person (Viator: ~$110)

DINING EXPERIENCES:
- Beachfront Sunset Dinner: from $75/person
- Chef's Table Belize Experience: from $95/person (private, 6-guest max)
- Rum & Reef Cocktail Pairing: from $45/person

BUNDLE PACKAGES (book room + 2+ activities):
- Save 10-15% vs booking separately
- Includes personalized itinerary
- Book via /booking page

RESORT LOCATION: Caye Caulker area, Belize Barrier Reef
CONTACT: WhatsApp +501 632 7767
BOOKING PAGE: /booking
EXPERIENCES PAGE: /experiences

TONE: Warm, knowledgeable, enthusiastic about Belize. Be helpful, specific, and concise. Don't be pushy, but naturally weave in why booking direct beats OTAs. Keep responses under 150 words unless asked for a detailed itinerary. Use bullet points for lists.`;

export async function POST(request: NextRequest) {
  let body: { messages?: Array<{ role: string; content: string }> };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Messages array required" },
      { status: 400 },
    );
  }

  // Sanitize messages — only allow role user/assistant, string content
  const sanitized = messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length > 0,
    )
    .slice(-20) // keep last 20 messages max to limit tokens
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, 1000),
    }));

  if (sanitized.length === 0) {
    return NextResponse.json({ error: "No valid messages" }, { status: 400 });
  }

  try {
    const response = await grokLLM.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      ...sanitized,
    ]);

    const content = response.content;
    const text = typeof content === "string" ? content : String(content);

    return NextResponse.json({ role: "assistant", content: text });
  } catch (error) {
    console.error("[/api/chat] Grok error:", error);
    return NextResponse.json(
      {
        role: "assistant",
        content:
          "I'm having a moment! 😅 For immediate help, reach us on [WhatsApp](https://wa.me/5016327767) — we typically reply within minutes.",
      },
      { status: 200 }, // Return 200 so the widget shows the friendly fallback
    );
  }
}
