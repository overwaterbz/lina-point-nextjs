export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { grokLLM } from "@/lib/grokIntegration";
import {
  getTodaysBrand,
  BRAND_PROFILES,
  getEcosystemContext,
} from "@/lib/agents/ecosystemBrands";
import {
  publishToSocial,
  type SocialPostResult,
} from "@/lib/socialMediaService";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const CONTENT_TYPES = [
  "tip_of_the_day",
  "behind_the_scenes",
  "inspirational_quote",
  "fun_fact",
  "guest_spotlight",
  "ecosystem_highlight",
] as const;

function verifyCronSecret(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brand = getTodaysBrand();
  const profile = BRAND_PROFILES[brand];
  const contentType = CONTENT_TYPES[new Date().getDay() % CONTENT_TYPES.length];

  const systemPrompt = `You are a social media content creator for ${profile.name}. 
Brand voice: ${profile.voice}
Key Messages: ${profile.keyMessages.join("; ")}
Hashtags: ${profile.hashtags.join(" ")}
${brand === "ecosystem" ? getEcosystemContext() : ""}

Create short-form social content. Return ONLY valid JSON — no markdown fences.`;

  const userPrompt = `Generate a ${contentType.replace(/_/g, " ")} post for today.

Return JSON with this exact shape:
{
  "instagram": { "caption": "...", "hashtags": ["..."] },
  "facebook": { "message": "...", "link": "..." },
  "x": { "tweet": "..." }
}

Rules:
- Instagram caption: 100-200 chars, engaging, emoji-rich, end with CTA
- Facebook message: 150-300 chars, conversational, include a link to the relevant site
- X tweet: max 270 chars (leave room for link), punchy hook + hashtags
- Links: linapoint.com for LP, overwater.com for OW, magic.overwater.com for MIY
- Add UTM params: ?utm_source={platform}&utm_medium=social&utm_campaign=daily-post`;

  try {
    const response = await grokLLM.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const raw =
      typeof response.content === "string"
        ? response.content
        : String(response.content);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw },
        { status: 500 },
      );
    }

    const posts = JSON.parse(jsonMatch[0]);
    const results: SocialPostResult[] = [];

    // Post to each platform
    if (posts.instagram?.caption) {
      const caption = `${posts.instagram.caption}\n\n${(posts.instagram.hashtags || []).join(" ")}`;
      // Instagram requires an image — use OG image as fallback
      const imageUrl =
        brand === "magic-is-you"
          ? "https://magic.overwater.com/api/og"
          : brand === "overwater"
            ? "https://overwater.com/api/og"
            : "https://linapoint.com/wp-content/uploads/2024/11/LinaPoint-55.jpg";
      results.push(await publishToSocial("instagram", caption, imageUrl));
    }

    if (posts.facebook?.message) {
      results.push(
        await publishToSocial(
          "facebook",
          posts.facebook.message,
          undefined,
          posts.facebook.link,
        ),
      );
    }

    if (posts.x?.tweet) {
      results.push(await publishToSocial("x", posts.x.tweet));
    }

    // Log to DB
    if (SUPABASE_URL && SUPABASE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      try {
        await supabase.from("marketing_agent_logs").insert({
          agent_type: "social-content-gen",
          action: "daily_short_form",
          details: {
            brand,
            contentType,
            posts,
            results: results.map((r) => ({
              platform: r.platform,
              success: r.success,
              error: r.error,
            })),
          },
        });
      } catch {
        /* ignore logging errors */
      }
    }

    return NextResponse.json({
      brand,
      contentType,
      posts,
      publishResults: results,
    });
  } catch (err) {
    console.error("[SocialContent] Generation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 },
    );
  }
}
