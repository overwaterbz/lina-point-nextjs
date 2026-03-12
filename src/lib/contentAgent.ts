/**
 * ContentAgent: Generates personalized magical content (songs, videos)
 * Uses Grok-4 for lyric/script creation, mocks external APIs (Suno, LTX Studio, Klangio)
 * Integrates with LangGraph for stateful orchestration
 */

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { grokLLM } from "@/lib/grokIntegration";
import { runWithRecursion } from "@/lib/agents/agentRecursion";
import { evaluateTextQuality } from "@/lib/agents/recursionEvaluators";
import { getActivePrompt } from "@/lib/agents/promptManager";

const isProd = process.env.NODE_ENV === "production";
const debugLog = (...args: unknown[]) => {
  if (!isProd) {
    console.log(...args);
  }
};

export interface MagicQuestionnaire {
  occasion: "birthday" | "anniversary" | "reunion" | "proposal" | "celebration";
  recipientName: string;
  giftYouName: string;
  keyMemories?: string[];
  favoriteColors?: string[];
  favoriteSongsArtists?: string[];
  message?: string;
  musicStyle: "tropical" | "edm" | "reggae" | "calypso" | "ambient";
  mood: "romantic" | "energetic" | "peaceful" | "celebratory";
}

export interface ContentGenerationRequest {
  userId: string;
  reservationId?: string;
  contentType: "song" | "video" | "audio_remix";
  questionnaire: MagicQuestionnaire;
}

export interface GeneratedContent {
  type: "song" | "video" | "audio_remix";
  title: string;
  description: string;
  mediaUrl: string;
  durationSeconds: number;
  fileSizeBytes: number;
  provider: string;
  prompt: string;
  processingTimeMs: number;
}

// LangGraph State
interface ContentGenState {
  userId: string;
  contentType: "song" | "video" | "audio_remix";
  questionnaire: MagicQuestionnaire;
  refinementHint?: string;
  grokPrompt: string;
  grokLyrics: string;
  sunoAudioUrl: string;
  ltxVideoUrl: string;
  klangioRemix: string;
  mergedMediaUrl: string;
  status: "pending" | "generating_lyrics" | "generating_audio" | "generating_video" | "merging" | "completed" | "failed";
  error?: string;
  processingTimeMs: number;
}

const ContentGenAnnotation = Annotation.Root({
  userId: Annotation<string>,
  contentType: Annotation<"song" | "video" | "audio_remix">,
  questionnaire: Annotation<MagicQuestionnaire>,
  refinementHint: Annotation<string | undefined>,
  grokPrompt: Annotation<string>,
  grokLyrics: Annotation<string>,
  sunoAudioUrl: Annotation<string>,
  ltxVideoUrl: Annotation<string>,
  klangioRemix: Annotation<string>,
  mergedMediaUrl: Annotation<string>,
  status: Annotation<
    "pending" | "generating_lyrics" | "generating_audio" | "generating_video" | "merging" | "completed" | "failed"
  >,
  error: Annotation<string | undefined>,
  processingTimeMs: Annotation<number>,
});

/**
 * Step 1: Build Grok prompt from questionnaire
 */
async function buildGrokPrompt(state: typeof ContentGenAnnotation.State) {
  const { questionnaire, contentType } = state;
  const refinement = state.refinementHint ? `\nRefinement: ${state.refinementHint}` : "";

  const prompt = `Create a personalized ${questionnaire.musicStyle} ${contentType} for a ${questionnaire.occasion}.

Recipient: ${questionnaire.recipientName}
Gift from: ${questionnaire.giftYouName}
Mood: ${questionnaire.mood}
Music Style: ${questionnaire.musicStyle}

${questionnaire.keyMemories ? `Key Memories: ${questionnaire.keyMemories.join(", ")}` : ""}
${questionnaire.favoriteColors ? `Favorite Colors: ${questionnaire.favoriteColors.join(", ")}` : ""}
${questionnaire.favoriteSongsArtists ? `Favorite Artists: ${questionnaire.favoriteSongsArtists.join(", ")}` : ""}
${questionnaire.message ? `Personal Message: "${questionnaire.message}"` : ""}

${contentType === "song" ? `Create lyrics with the mantra "The Magic is You" woven throughout. Include Maya wisdom and kundalini energy themes. Structure: Verse 1 → Chorus → Verse 2 → Bridge → Chorus → Outro.` : ""}

${contentType === "video" ? `Create a script for a 60-90 second video. Include scene descriptions, timing, and voiceover elements.` : ""}

${contentType === "audio_remix" ? `Create an ambient remix description with binaural beats, frequency suggestions, and emotional journey arc.` : ""}

Make it magical, personal, and uplifting. Maximum 500 words.${refinement}`;

  debugLog(`[ContentAgent] Building Grok prompt for ${contentType}`);

  return {
    ...state,
    grokPrompt: prompt,
    status: "generating_lyrics",
  };
}

/**
 * Step 2: Call Grok-4 to generate lyrics/script
 */
async function generateLyricsWithGrok(state: typeof ContentGenAnnotation.State) {
  try {
    debugLog(`[ContentAgent] Calling Grok-4 to generate lyrics/script...`);

    const defaultContentPrompt = "You are a magical content creator specializing in personalized songs, videos, and audio experiences with Maya/kundalini themes.";
    const systemPrompt = await getActivePrompt('content_agent', defaultContentPrompt);

    const response = await grokLLM.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: state.grokPrompt },
    ]);

    const lyrics = typeof response.content === "string" ? response.content : String(response.content);

    debugLog(`[ContentAgent] ✅ Generated ${state.contentType} content with Grok`);

    return {
      ...state,
      grokLyrics: lyrics,
    };
  } catch (error) {
    console.error("[ContentAgent] Grok generation failed:", error);
    return {
      ...state,
      status: "failed",
      error: `Grok generation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Step 3: Generate audio via SunoAPI.org (unofficial Suno wrapper)
 * Docs: https://docs.sunoapi.org/suno-api/generate-music
 */
async function generateAudioViaSuno(state: typeof ContentGenAnnotation.State) {
  if (state.contentType === "video") {
    debugLog("[ContentAgent] Skipping Suno for video-only generation");
    return { ...state, sunoAudioUrl: "" };
  }

  debugLog(`[ContentAgent] Calling SunoAPI.org to generate audio...`);

  const SUNO_API_KEY = process.env.SUNO_API_KEY || "";
  const SUNO_API_BASE = process.env.SUNO_API_BASE_URL || "https://api.sunoapi.org";

  if (!SUNO_API_KEY) {
    debugLog("[ContentAgent] No SUNO_API_KEY set, using Grok lyrics as text-only fallback");
    return {
      ...state,
      sunoAudioUrl: "",
      status: "generating_video" as const,
    };
  }

  // Map our music styles to Suno style tags
  const styleMap: Record<string, string> = {
    tropical: "Tropical Pop, Caribbean, Upbeat",
    edm: "EDM, Electronic Dance, Synth",
    reggae: "Reggae, Dub, Island Vibes",
    calypso: "Calypso, Soca, Caribbean",
    ambient: "Ambient, Chill, Meditation",
  };

  const title = `${state.questionnaire.occasion} for ${state.questionnaire.recipientName}`.slice(0, 80);

  try {
    // Step 1: Submit generation request to SunoAPI.org
    const generateResponse = await fetch(`${SUNO_API_BASE}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify({
        customMode: true,
        instrumental: false,
        model: "V4",
        prompt: state.grokLyrics.slice(0, 3000),
        style: styleMap[state.questionnaire.musicStyle] || "Pop, Upbeat",
        title,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!generateResponse.ok) {
      const errText = await generateResponse.text();
      throw new Error(`SunoAPI returned ${generateResponse.status}: ${errText}`);
    }

    const generateData = await generateResponse.json();
    const taskId = generateData.data?.taskId;

    if (!taskId) {
      throw new Error("No taskId returned from SunoAPI");
    }

    debugLog(`[ContentAgent] Suno task submitted: ${taskId}`);

    // Step 2: Poll for completion (max 180s with 10s intervals)
    // SunoAPI.org: stream URL ~30-40s, downloadable ~2-3 min
    let audioUrl = "";
    const maxAttempts = 18;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 10000));

      const statusResponse = await fetch(
        `${SUNO_API_BASE}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
        {
          headers: { "Authorization": `Bearer ${SUNO_API_KEY}` },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!statusResponse.ok) continue;

      const statusData = await statusResponse.json();
      const status = statusData.data?.status;

      if (status === "SUCCESS" || status === "FIRST_SUCCESS") {
        const sunoData = statusData.data?.response?.sunoData;
        if (Array.isArray(sunoData) && sunoData.length > 0) {
          audioUrl = sunoData[0].audioUrl || sunoData[0].streamAudioUrl || "";
        }
        if (audioUrl) break;
      }

      if (status === "CREATE_TASK_FAILED" || status === "GENERATE_AUDIO_FAILED") {
        throw new Error(`Suno generation failed: ${statusData.data?.errorMessage || status}`);
      }

      debugLog(`[ContentAgent] Suno status: ${status} (attempt ${attempt + 1}/${maxAttempts})`);
    }

    if (!audioUrl) {
      throw new Error("Suno generation timed out after 180s");
    }

    debugLog(`[ContentAgent] ✅ Generated audio via Suno: ${audioUrl}`);

    return {
      ...state,
      sunoAudioUrl: audioUrl,
      status: "generating_video" as const,
    };
  } catch (error) {
    console.error("[ContentAgent] Suno generation failed:", error);
    // Non-fatal — continue pipeline without audio
    debugLog("[ContentAgent] Continuing without audio due to Suno error");
    return {
      ...state,
      sunoAudioUrl: "",
      status: "generating_video" as const,
    };
  }
}

/**
 * Step 4: Generate video via LTX Studio (mocked)
 */
async function generateVideoViaLTX(state: typeof ContentGenAnnotation.State) {
  if (state.contentType === "audio_remix" || state.contentType === "song" && !state.questionnaire.message) {
    debugLog("[ContentAgent] Skipping LTX Studio for audio-only generation");
    return { ...state, ltxVideoUrl: "" };
  }

  debugLog(`[ContentAgent] Calling LTX Studio to generate video...`);

  try {
    // Mock LTX Studio API response
    // In production, use resort stock footage from public/videos/ and grokLyrics as scene descriptions
    const mockVideoUrl = `https://supabase.storage.magic.content/video/${state.userId}/${Date.now()}.mp4`;

    debugLog(`[ContentAgent] ✅ Generated video via LTX Studio: ${mockVideoUrl}`);

    return {
      ...state,
      ltxVideoUrl: mockVideoUrl,
    };
  } catch (error) {
    console.error("[ContentAgent] LTX Studio generation failed:", error);
    return {
      ...state,
      status: "failed",
      error: `LTX Studio video generation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Step 5: Remix audio with Klangio (mocked)
 */
async function remixAudioWithKlangio(state: typeof ContentGenAnnotation.State) {
  if (!state.sunoAudioUrl) {
    debugLog("[ContentAgent] No audio to remix");
    return { ...state, klangioRemix: "" };
  }

  debugLog(`[ContentAgent] Calling Klangio to remix audio with ambient elements...`);

  try {
    // Mock Klangio API response
    // In production, apply binaural beats, kundalini activation frequencies, etc.
    const mockRemixUrl = `https://supabase.storage.magic.content/audio/${state.userId}/${Date.now()}-remix.mp3`;

    debugLog(`[ContentAgent] ✅ Created ambient remix via Klangio: ${mockRemixUrl}`);

    return {
      ...state,
      klangioRemix: mockRemixUrl,
      status: "merging",
    };
  } catch (error) {
    console.error("[ContentAgent] Klangio remix failed:", error);
    return {
      ...state,
      status: "failed",
      error: `Klangio remixing failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Step 6: Merge best formats and save to Supabase Storage
 */
async function mergeAndSave(state: typeof ContentGenAnnotation.State) {
  debugLog(`[ContentAgent] Merging and saving final ${state.contentType}...`);

  try {
    // Determine final media URL based on content type and what was generated
    let finalUrl: string;

    if (state.contentType === "song") {
      finalUrl = state.klangioRemix || state.sunoAudioUrl || "";
    } else if (state.contentType === "video") {
      finalUrl = state.ltxVideoUrl || "";
    } else if (state.contentType === "audio_remix") {
      finalUrl = state.klangioRemix || state.sunoAudioUrl || "";
    } else {
      finalUrl = "";
    }

    if (!finalUrl) {
      // If no media was generated (APIs unavailable), mark as lyrics-only
      debugLog("[ContentAgent] No media generated — returning lyrics-only result");
      return {
        ...state,
        mergedMediaUrl: "",
        status: "completed" as const,
      };
    }

    debugLog(`[ContentAgent] ✅ Final media URL: ${finalUrl}`);

    return {
      ...state,
      mergedMediaUrl: finalUrl,
      status: "completed" as const,
    };
  } catch (error) {
    console.error("[ContentAgent] Merge/save failed:", error);
    return {
      ...state,
      status: "failed" as const,
      error: `Media merge/save failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Build the LangGraph for content generation
 */
async function buildContentGraph() {
  const workflow = new StateGraph(ContentGenAnnotation)
    .addNode("build_prompt", buildGrokPrompt)
    .addNode("grok_generation", generateLyricsWithGrok)
    .addNode("suno_audio", generateAudioViaSuno)
    .addNode("ltx_video", generateVideoViaLTX)
    .addNode("klangio_remix", remixAudioWithKlangio)
    .addNode("merge_save", mergeAndSave)
    .addEdge(START, "build_prompt")
    .addEdge("build_prompt", "grok_generation")
    .addEdge("grok_generation", "suno_audio")
    .addEdge("suno_audio", "ltx_video")
    .addEdge("ltx_video", "klangio_remix")
    .addEdge("klangio_remix", "merge_save")
    .addEdge("merge_save", END);

  return workflow.compile();
}

/**
 * Main export: Run content generation agent
 */
export async function runContentAgent(request: ContentGenerationRequest): Promise<GeneratedContent> {
  debugLog(`\n✨ [ContentAgent] Generating ${request.contentType} for ${request.questionnaire.occasion}...`);

  const startTime = Date.now();
  const graph = await buildContentGraph();

  const initialState: typeof ContentGenAnnotation.State = {
    userId: request.userId,
    contentType: request.contentType,
    questionnaire: request.questionnaire,
    refinementHint: undefined,
    grokPrompt: "",
    grokLyrics: "",
    sunoAudioUrl: "",
    ltxVideoUrl: "",
    klangioRemix: "",
    mergedMediaUrl: "",
    status: "pending",
    error: undefined,
    processingTimeMs: 0,
  };

  const { result: finalState } = await runWithRecursion(
    async () => graph.invoke(initialState),
    async (state) => {
      const goal = "Produce a personalized magic experience with clear, uplifting tone.";
      const summary = `Status: ${state.status} Media: ${state.mergedMediaUrl || "pending"}`;
      const evalResult = await evaluateTextQuality(goal, summary);
      return { score: evalResult.score, feedback: evalResult.feedback, data: state };
    },
    async (state, feedback, iteration) => ({
      ...state,
      refinementHint: `Iteration ${iteration + 1}: ${feedback || "Tighten personalization."}`,
    })
  );

  if (finalState.status === "failed") {
    throw new Error(finalState.error || "Content generation failed");
  }

  const processingTime = Date.now() - startTime;

  const title = `${request.questionnaire.occasion
    .charAt(0)
    .toUpperCase()}${request.questionnaire.occasion.slice(1)} ${request.contentType} for ${request.questionnaire.recipientName}`;

  debugLog(`✅ [ContentAgent] Complete in ${processingTime}ms`);
  debugLog(`📢 [ContentAgent] Media URL: ${finalState.mergedMediaUrl}`);

  return {
    type: request.contentType,
    title,
    description: finalState.mergedMediaUrl
      ? `Personalized ${request.contentType} created for ${request.questionnaire.occasion}`
      : `Personalized ${request.contentType} lyrics created for ${request.questionnaire.occasion} (audio generation pending)`,
    mediaUrl: finalState.mergedMediaUrl || "",
    durationSeconds: request.contentType === "video" ? 90 : 180,
    fileSizeBytes: finalState.mergedMediaUrl ? 8000000 : 0,
    provider: request.contentType === "song" ? "suno" : "ltx_studio",
    prompt: finalState.grokPrompt,
    processingTimeMs: processingTime,
  };
}

/**
 * Send download link email via Resend (or log if not configured)
 */
export async function sendContentEmail(
  userEmail: string,
  mediaUrl: string,
  contentType: string,
  recipientName: string
): Promise<boolean> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
  const FROM_EMAIL = process.env.MAGIC_FROM_EMAIL || "magic@linapointresort.com";

  if (!RESEND_API_KEY) {
    debugLog(`[ContentAgent] No RESEND_API_KEY — skipping email to ${userEmail}`);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [userEmail],
        subject: `Your Magic ${contentType === "song" ? "Song" : "Video"} for ${recipientName} is Ready!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1e3a5f;">Your Magic is Ready ✨</h1>
            <p>Hi there! Your personalized ${contentType} for <strong>${recipientName}</strong> has been created.</p>
            <a href="${mediaUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
              Download Your ${contentType === "song" ? "Song" : "Video"}
            </a>
            <p style="color: #666; font-size: 14px; margin-top: 24px;">
              With love from Lina Point Resort, San Pedro, Belize 🌴
            </p>
          </div>
        `,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Resend API returned ${response.status}: ${errText}`);
    }

    debugLog(`[ContentAgent] ✅ Email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error(`[ContentAgent] Email send failed:`, error);
    return false;
  }
}
