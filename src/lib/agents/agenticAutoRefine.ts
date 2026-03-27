import { createClient } from "@supabase/supabase-js";
import { grokLLM } from "@/lib/grokIntegration";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

/**
 * Auto-generate improved prompt/content variant for a suggestion with low performance.
 * Queues the new variant for admin review.
 */
export async function autoRefineSuggestion(suggestion: {
  id: string;
  title: string;
  content: string;
  platform: string;
  brand: string;
}) {
  // Generate improved content using LLM
  const prompt = `The following marketing content for ${suggestion.brand} performed poorly (low CTR). Improve it for higher engagement.\n\nTitle: ${suggestion.title}\nContent: ${suggestion.content}\nPlatform: ${suggestion.platform}\n\nReturn improved title and content as JSON.`;
  const response = await grokLLM.invoke([
    {
      role: "system",
      content: "You are a marketing copywriter. Return only valid JSON.",
    },
    { role: "user", content: prompt },
  ]);
  let improved: { title: string; content: string };
  try {
    improved = JSON.parse(response.content);
  } catch {
    improved = {
      title: suggestion.title + " (Improved)",
      content: suggestion.content,
    };
  }
  // Insert as a new draft in content_calendar for admin review
  await supabase.from("content_calendar").insert({
    title: improved.title,
    body: improved.content,
    platform: suggestion.platform,
    scheduled_at: new Date().toISOString(),
    status: "suggested",
    brand: suggestion.brand,
    improvement_of: suggestion.id,
    improvement_reason: "Auto-refined due to low CTR",
  });
  // Log action
  await supabase.from("agentic_improvements").insert({
    content_calendar_id: suggestion.id,
    brand: suggestion.brand,
    action: "auto_refine",
    reason: "Low CTR, auto-generated improved variant",
    created_at: new Date().toISOString(),
  });
}
