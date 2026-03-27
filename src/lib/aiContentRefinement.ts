// aiContentRefinement.ts
// Backend utility for AI-powered content refinement and admin review
import { grokLLM } from "./grokIntegration";

export interface ContentRefinementRequest {
  original: string;
  context?: string;
  type: "altText" | "tag" | "description" | "conciergeReply" | "custom";
}

export interface ContentRefinementResult {
  refined: string;
  suggestions: string[];
}

/**
 * Refine AI-generated content for admin review/approval.
 */
export async function refineContent(
  req: ContentRefinementRequest,
): Promise<ContentRefinementResult> {
  const prompt = `Refine the following ${req.type} for a luxury resort brand. Context: ${req.context || "Lina Point Resort"}. Original: "${req.original}". Return a JSON object: {refined: "...", suggestions: ["..."]}`;
  const response = await grokLLM.invoke([{ role: "system", content: prompt }]);
  if (typeof response.content === "string") {
    const match = response.content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  }
  return { refined: req.original, suggestions: [] };
}
