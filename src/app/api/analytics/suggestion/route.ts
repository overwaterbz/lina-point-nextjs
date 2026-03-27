import { NextRequest, NextResponse } from "next/server";
import { runFeedbackLoop } from "@/lib/agents/agenticFeedbackLoop";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const content_calendar_id = url.searchParams.get("content_calendar_id");
  const brand = url.searchParams.get("brand");
  if (!content_calendar_id || !brand) {
    return NextResponse.json(
      { error: "Missing content_calendar_id or brand" },
      { status: 400 },
    );
  }
  try {
    const { analytics, improved } = await runFeedbackLoop(
      content_calendar_id,
      brand,
    );
    return NextResponse.json({
      analytics,
      improvementStatus: improved ? "Agentic improvement triggered" : "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
