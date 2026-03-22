export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Profile } from "@/types/supabase";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (pErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Build prompt from profile preferences
    const prefs = profile as Profile;
    const promptParts: string[] = [];

    if (prefs.full_name) promptParts.push(`Name: ${prefs.full_name}`);
    if (prefs.birthday) promptParts.push(`Birthday: ${prefs.birthday}`);
    if (prefs.anniversary)
      promptParts.push(`Anniversary: ${prefs.anniversary}`);
    if (prefs.music_style)
      promptParts.push(`Music style: ${prefs.music_style}`);
    if (prefs.maya_interests && prefs.maya_interests.length)
      promptParts.push(`Maya interests: ${prefs.maya_interests.join(", ")}`);
    if (prefs.special_events && prefs.special_events.length) {
      promptParts.push(
        `Special events: ${prefs.special_events.map((e) => `${e.name} on ${e.date}`).join("; ")}`,
      );
    }
    promptParts.push(`Opt-in magic: ${prefs.opt_in_magic ? "yes" : "no"}`);

    const prompt = `Create a short "Magic is You" profile summary that reflects the user's preferences and highlights Maya and kundalini themes when relevant. Then suggest personalized experiences that could be monetized (songs, videos, guided tours, dinner packages, or curated events) and explain how commissions or upsells could be offered in a tasteful way. Use the following user data:\n\n${promptParts.join("\n")}
  \n
  Output as a concise, engaging paragraph (80-180 words) followed by 3 short bullet suggestions (one-line each).`;

    // Call Grok-4 via grokIntegration
    const { runGrokPrompt } = await import("@/lib/grokIntegration");
    const summary = await runGrokPrompt(prompt);

    // Optionally save magic_profile if user opted in
    if (prefs.opt_in_magic) {
      await supabase
        .from("profiles")
        .update({ magic_profile: summary })
        .eq("user_id", user.id);
    }

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("analyze-profile error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
