// aiImageTagger.ts
// Utility for AI-powered image tagging and curation
import { grokLLM } from "./grokIntegration";

/**
 * Generate tags and a short description for a guest-uploaded photo using AI.
 * Returns an array of tags and a description string.
 */
export async function tagAndDescribeImage(
  imageUrl: string,
  context?: string,
): Promise<{ tags: string[]; description: string }> {
  try {
    const prompt = `Analyze this guest photo for a luxury resort gallery. Context: ${context || "Lina Point Resort guest gallery"}. Image URL: ${imageUrl}. Return a JSON object with {tags: ["tag1", ...], description: "short description"}.`;
    const response = await grokLLM.invoke([
      { role: "system", content: prompt },
    ]);
    if (typeof response.content === "string") {
      const match = response.content.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    }
  } catch {}
  // Fallback: use filename as tag
  const parts = imageUrl.split("/");
  const tag = parts[parts.length - 1]
    .replace(/[-_]/g, " ")
    .replace(/\..+$/, "");
  return { tags: [tag], description: tag };
}
