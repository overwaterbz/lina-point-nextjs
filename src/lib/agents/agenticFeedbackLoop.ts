import { createClient } from "@supabase/supabase-js";
import { autoRefineSuggestion } from "./agenticAutoRefine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export interface SuggestionAnalytics {
  content_calendar_id: string;
  brand: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
}

/**
 * Fetch analytics for a given suggestion (content_calendar_id, brand)
 */
export async function fetchSuggestionAnalytics(
  content_calendar_id: string,
  brand: string,
): Promise<SuggestionAnalytics> {
  // Aggregate events for this suggestion
  const { data, error } = await supabase
    .from("events")
    .select("event, properties")
    .eq("content_calendar_id", content_calendar_id)
    .eq("brand", brand);

  if (error) throw new Error(error.message);

  let impressions = 0,
    clicks = 0,
    conversions = 0;
  (data || []).forEach((row: any) => {
    if (row.event === "impression") impressions++;
    if (row.event === "click") clicks++;
    if (row.event === "conversion") conversions++;
  });
  const ctr = impressions > 0 ? clicks / impressions : 0;
  return { content_calendar_id, brand, impressions, clicks, conversions, ctr };
}

/**
 * Agentic feedback loop: fetch analytics, decide if improvement needed, and log action
 */
export async function runFeedbackLoop(
  content_calendar_id: string,
  brand: string,
): Promise<{ improved: boolean; analytics: SuggestionAnalytics }> {
  const analytics = await fetchSuggestionAnalytics(content_calendar_id, brand);
  // If CTR < 2%, trigger prompt/content refinement
  if (analytics.impressions >= 20 && analytics.ctr < 0.02) {
    // Fetch suggestion details
    const { data: suggestion } = await supabase
      .from("content_calendar")
      .select("id, title, body, platform, brand")
      .eq("id", content_calendar_id)
      .maybeSingle();
    if (suggestion) {
      await autoRefineSuggestion({
        id: suggestion.id,
        title: suggestion.title,
        content: suggestion.body,
        platform: suggestion.platform,
        brand: suggestion.brand,
      });
    }
    return { improved: true, analytics };
  }
  return { improved: false, analytics };
}
