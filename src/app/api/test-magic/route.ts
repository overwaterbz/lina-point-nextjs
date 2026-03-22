export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runContentAgent } from "@/lib/contentAgent";
import type { MagicQuestionnaire } from "@/lib/contentAgent";

const isProd = process.env.NODE_ENV === "production";
const debugLog = (...args: unknown[]) => {
  if (!isProd) {
    console.log(...args);
  }
};

/**
 * GET /api/test-magic
 * Test magic content generation with mock data
 */
export async function GET(request: NextRequest) {
  try {
    debugLog("[Test] Starting magic content generation test...");

    // Mock user preferences and questionnaire
    const mockQuestionnaire: MagicQuestionnaire = {
      occasion: "birthday",
      recipientName: "Emma & Alex",
      giftYouName: "Test User",
      keyMemories: ["romance", "nature", "adventure"],
      favoriteSongsArtists: ["ambient", "indie-pop"],
      message: "Include references to our love story and the ocean",
      musicStyle: "tropical",
      mood: "romantic",
    };

    // Test case 1: Birthday song
    const birthdayResult = await runContentAgent({
      userId: "test-user-1",
      reservationId: "test-reservation-1",
      contentType: "song",
      questionnaire: mockQuestionnaire,
    });

    // Test case 2: Anniversary video
    const anniversaryResult = await runContentAgent({
      userId: "test-user-2",
      reservationId: "test-reservation-2",
      contentType: "video",
      questionnaire: {
        ...mockQuestionnaire,
        occasion: "anniversary",
      },
    });

    return NextResponse.json({
      success: true,
      tests: [
        {
          occasion: "birthday",
          type: birthdayResult.type,
          title: birthdayResult.title,
          mediaUrl: birthdayResult.mediaUrl,
          durationSeconds: birthdayResult.durationSeconds,
        },
        {
          occasion: "anniversary",
          type: anniversaryResult.type,
          title: anniversaryResult.title,
          mediaUrl: anniversaryResult.mediaUrl,
          durationSeconds: anniversaryResult.durationSeconds,
        },
      ],
      summary: {
        total_tests: 2,
        passed: 2,
        failed: 0,
      },
    });
  } catch (error) {
    console.error("[Test] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
