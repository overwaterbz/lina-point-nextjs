// aiConcierge.ts
// Backend utility for multimodal AI concierge (text/image, voice-ready)
import { grokLLM } from "./grokIntegration";

export interface ConciergeMessage {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

/**
 * Send a message (optionally with image) to the AI concierge and get a response.
 */
export async function sendToConcierge(
  messages: ConciergeMessage[],
): Promise<ConciergeMessage> {
  // Compose prompt for LLM
  const last = messages[messages.length - 1];
  let prompt = last.content;
  if (last.imageUrl) {
    prompt += `\n[Image: ${last.imageUrl}]`;
  }
  const response = await grokLLM.invoke([
    ...messages.map((m) => ({
      role: m.role,
      content: m.content + (m.imageUrl ? `\n[Image: ${m.imageUrl}]` : ""),
    })),
    {
      role: "system",
      content:
        "You are a helpful, friendly, luxury resort AI concierge. Respond conversationally and offer helpful, personalized suggestions.",
    },
  ]);
  return { role: "assistant", content: response.content };
}
