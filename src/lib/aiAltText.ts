// aiAltText.ts
// Utility to generate descriptive alt text for images using AI
import { grokLLM } from "./grokIntegration";

/**
 * Generate alt text for an image given its URL and context.
 * Falls back to filename if AI is unavailable.
 */
export async function generateAltText(
  imageUrl: string,
  context?: string,
): Promise<string> {
  try {
    const prompt = `Describe this image for a visually impaired guest. Context: ${context || "Lina Point Resort website"}. Image URL: ${imageUrl}`;
    const response = await grokLLM.invoke([
      { role: "system", content: prompt },
    ]);
    if (typeof response.content === "string" && response.content.length > 5) {
      return response.content.trim().replace(/\n/g, " ");
    }
  } catch {}
  // Fallback: use filename
  const parts = imageUrl.split("/");
  return parts[parts.length - 1].replace(/[-_]/g, " ").replace(/\..+$/, "");
}
