import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

/**
 * ContentAgent: Generates custom songs/videos using Grok + Suno + LTX Studio
 * Workflow: Create prompt -> Generate song (Suno) -> Generate video stub -> Remix audio -> Return URLs
 */

// State schema
const ContentState = Annotation.Root({
  reservationId: Annotation<string>,
  userPrefs: Annotation<Record<string, any>>,
  occasion: Annotation<string>,
  genre: Annotation<string>,
  grokPrompt: Annotation<string>,
  sunoTrackId: Annotation<string>,
  songUrl: Annotation<string>,
  videoUrl: Annotation<string>,
  artworkUrl: Annotation<string>,
  status: Annotation<string>,
  errorMessage: Annotation<string>,
});

// Grok LLM for creative prompts - using fetch to call X.AI directly
async function callGrokAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;

  // For demo purposes, use mock if key is missing
  if (!apiKey) {
    console.log(
      "[ContentAgent] GROK_API_KEY not configured, using mock generator",
    );
    return JSON.stringify({
      title: "Demo Song - The Magic is You",
      lyrics: `[Verse 1]
When moonlight kisses the ocean deep
Stars whisper secrets while the world sleeps
You are the magic, the spark, the flame
In every heartbeat, your sacred name

[Chorus]
The Magic is You, shining so bright
The Magic is You, inner light
The Magic is You, truth set free
The magic inside, sets your spirit free`,
      style: "ambient",
      mood: "uplifting",
      tags: ["mystical", "personal"],
    });
  }

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-2",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Grok API error: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.warn("[ContentAgent] Grok API call failed, using mock:", error);
    // Fallback to mock
    return JSON.stringify({
      title: "Personalized Magic Moment",
      lyrics: `[Verse 1]
In this sacred space we share
Divine energy fills the air
You are the magic, pure and true
This moment is all about you

[Chorus]
The Magic is You, burning bright
The Magic is You, inner light
The Magic is You, spirits rise
The magic reflected in your eyes`,
      style: "ambient",
      mood: "mystical",
      tags: ["personal", "maya", "kundalini"],
    });
  }
}

/**
 * Pixverse video generation API call
 */
async function callPixverseAPI(
  videoPrompt: string,
  audioUrl?: string,
): Promise<{ url: string; id: string }> {
  const apiKey = process.env.PIXVERSE_API_KEY;

  if (!apiKey) {
    console.log("[ContentAgent] PIXVERSE_API_KEY not configured, using mock");
    return {
      id: `pix_${Date.now()}`,
      url: `https://storage.pixverse.example.com/videos/mock_${Date.now()}.mp4`,
    };
  }

  try {
    const response = await fetch("https://api.pixverse.ai/v1/videos/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: videoPrompt,
        duration: 180, // 3 minutes
        audio_url: audioUrl,
        aspect_ratio: "16:9",
        style: "cinematic",
        quality: "hd",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Pixverse API error: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      id: data.id,
      url: data.video_url,
    };
  } catch (error) {
    console.warn("[ContentAgent] Pixverse API call failed, using mock:", error);
    return {
      id: `pix_mock_${Date.now()}`,
      url: `https://storage.pixverse.example.com/videos/mock_${Date.now()}.mp4`,
    };
  }
}

/**
 * LTX Studio video generation API call
 */
async function callLTXStudioAPI(
  videoPrompt: string,
  audioUrl?: string,
): Promise<{ url: string; id: string }> {
  const apiKey = process.env.LTX_STUDIO_API_KEY;

  if (!apiKey) {
    console.log("[ContentAgent] LTX_STUDIO_API_KEY not configured, using mock");
    return {
      id: `ltx_${Date.now()}`,
      url: `https://storage.ltx.example.com/videos/mock_${Date.now()}.mp4`,
    };
  }

  try {
    const response = await fetch(
      "https://api.ltxstudio.com/v1/videos/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: videoPrompt,
          duration: 180,
          music_url: audioUrl,
          resolution: "1080p",
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `LTX Studio API error: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      id: data.id,
      url: data.video_url,
    };
  } catch (error) {
    console.warn(
      "[ContentAgent] LTX Studio API call failed, using mock:",
      error,
    );
    return {
      id: `ltx_mock_${Date.now()}`,
      url: `https://storage.ltx.example.com/videos/mock_${Date.now()}.mp4`,
    };
  }
}

// Suno prompt schema
const SunoPromptSchema = z.object({
  title: z.string().describe("Song title"),
  lyrics: z.string().describe("Full song lyrics with verses, chorus, bridge"),
  style: z.string().describe("Music style/genre"),
  mood: z
    .string()
    .describe("Emotional mood (happy, romantic, energetic, etc.)"),
  tags: z.array(z.string()).describe("Music tags (indie, pop, ambient, etc.)"),
});

/**
 * Step 1: Create Grok prompt for song generation
 */
async function createGrokPrompt(state: typeof ContentState.State) {
  console.log(
    "[ContentAgent] Step 1: Creating Grok prompt for",
    state.occasion,
  );

  const userPrefsStr = JSON.stringify(state.userPrefs);
  const prompt = `
You are a mystical songwriting AI creating a personalized experience. Generate song lyrics for a ${state.occasion} celebration.

**Context:**
- Occasion: ${state.occasion}
- Genre: ${state.genre}
- User Preferences: ${userPrefsStr}
- Mantra: "The Magic is You"
- Themes: Maya spirituality, kundalini energy, personal empowerment

**Requirements:**
1. Create emotionally resonant lyrics (3-5 minutes of music)
2. Include the phrase "The Magic is You" naturally in chorus
3. Weave in Maya/kundalini themes (inner light, awakening, energy)
4. Personalize with user details from preferences
5. Make it celebratory and uplifting
6. Style: ${state.genre} with introspective elements

Output ONLY valid JSON with this exact structure:
{
  "title": "Song title incorporating occasion and theme",
  "lyrics": "Full lyrics with [Verse], [Chorus], [Bridge] sections",
  "style": "${state.genre}",
  "mood": "emotional mood",
  "tags": ["tag1", "tag2", "tag3"]
}
`;

  try {
    const response = await callGrokAPI(prompt);

    // Parse JSON from response
    const jsonStr = response;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // If no JSON found, create a mock response
      console.log("[ContentAgent] No JSON found, using mock response");
      const mockData = {
        title: `${state.occasion} Magic - The Inner Light Awakens`,
        lyrics: `[Verse 1]
When moonlight kisses the ocean deep
Stars whisper secrets while the world sleeps
You are the magic, the spark, the flame
In every heartbeat, your sacred name

[Chorus]
The Magic is You, shining so bright
The Magic is You, inner light
The Magic is You, truth set free
The magic inside, sets your spirit free

[Verse 2]
Maya wisdom flows through your veins
Kundalini rising, breaking all chains
You are the journey, you are the way
The magic unfolds with each new day

[Bridge]
Feel the energy, let it flow
Ancient wisdom that you know
You are divine, you are whole
The Magic is You, body and soul`,
        style: state.genre,
        mood: "uplifting, mystical, celebratory",
        tags: ["mystical", "uplifting", "personal", "energy"],
      };
      return {
        ...state,
        grokPrompt: JSON.stringify(mockData),
        status: "processing_suno",
      };
    }

    const songData = JSON.parse(jsonMatch[0]);

    return {
      ...state,
      grokPrompt: JSON.stringify(songData),
      status: "processing_suno",
    };
  } catch (error) {
    console.error("[ContentAgent] Grok prompt generation failed:", error);
    return {
      ...state,
      status: "failed",
      errorMessage: `Grok prompt generation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Step 2: Generate song via Suno API
 * (For now: mock implementation showing how it would work)
 */
async function generateSunoTrack(state: typeof ContentState.State) {
  if (state.status === "failed") return state;

  console.log("[ContentAgent] Step 2: Generating Suno track...");

  try {
    const songData = JSON.parse(state.grokPrompt);

    // Mock Suno API call (replace with real API when available)
    const sunoPayload = {
      prompt: `${songData.title}\n\n${songData.lyrics}`,
      tags: songData.tags,
      title: songData.title,
      style: songData.style,
    };

    console.log("[ContentAgent] Would call Suno with:", sunoPayload);

    // Simulate Suno response
    const mockSunoResponse = {
      id: `suno_${Date.now()}`,
      url: `https://cdn.suno.ai/tracks/mock_${Date.now()}.mp3`,
      artwork_url: `https://cdn.suno.ai/artwork/mock_${Date.now()}.png`,
      title: songData.title,
      status: "completed",
    };

    return {
      ...state,
      sunoTrackId: mockSunoResponse.id,
      songUrl: mockSunoResponse.url,
      artworkUrl: mockSunoResponse.artwork_url,
      status: "processing_video",
    };
  } catch (error) {
    console.error("[ContentAgent] Suno generation failed:", error);
    return {
      ...state,
      status: "failed",
      errorMessage: `Suno generation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Step 3: Generate video using LTX Studio (mocked for now)
 */
/**
 * Step 3: Generate video using LTX Studio or Pixverse (or both)
 */
async function generateVideo(state: typeof ContentState.State) {
  if (state.status === "failed") return state;

  console.log(
    "[ContentAgent] Step 3: Generating video with LTX Studio & Pixverse...",
  );

  try {
    const videoPrompt = `
Create a 3-minute cinematic video for a ${state.occasion} celebration:
- Setting: Lina Point Overwater Resort, moonlit ocean, gentle waves, tropical breeze
- Visuals: Maya-inspired patterns, kundalini energy flows, sacred geometry
- Color palette: Warm golds, mystical purples, deep ocean blues
- Overlay: Subtle mantra text "The Magic is You" appearing throughout
- Music sync: Sync with audio track (${state.songUrl})
- Mood: Mystical, romantic, empowering, celebratory
- Include: Nature shots (sunrise/sunset), water reflections, light effects
- Voice: Optional voiceover about the magic within and the special moment
    `.trim();

    // Generate with both services in parallel for redundancy/options
    const [ltxResult, pixResult] = await Promise.allSettled([
      callLTXStudioAPI(videoPrompt, state.songUrl),
      callPixverseAPI(videoPrompt, state.songUrl),
    ]);

    // Use Pixverse as primary, fall back to LTX Studio
    let videoUrl = "";
    let videoService = "";

    if (pixResult.status === "fulfilled" && pixResult.value.url) {
      videoUrl = pixResult.value.url;
      videoService = "pixverse";
      console.log("[ContentAgent] Using Pixverse video");
    } else if (ltxResult.status === "fulfilled" && ltxResult.value.url) {
      videoUrl = ltxResult.value.url;
      videoService = "ltx_studio";
      console.log(
        "[ContentAgent] Using LTX Studio video (Pixverse unavailable)",
      );
    } else {
      // Both failed, use mock
      videoUrl = `https://storage.example.com/videos/mock_${Date.now()}.mp4`;
      videoService = "mock";
      console.warn("[ContentAgent] Both video services failed, using mock");
    }

    return {
      ...state,
      videoUrl,
      status: "processing_audio",
    };
  } catch (error) {
    console.error("[ContentAgent] Video generation failed:", error);
    return {
      ...state,
      status: "failed",
      errorMessage: `Video generation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Step 4: Remix audio with Klangio (mocked for now)
 */
async function remixAudio(state: typeof ContentState.State) {
  if (state.status === "failed") return state;

  console.log("[ContentAgent] Step 4: Remixing audio with Klangio...");

  try {
    // Mock Klangio call
    const remixParams = {
      baseTrack: state.songUrl,
      effects: ["ambient_reverb", "kundalini_resonance", "ocean_breeze"],
      duration: 180,
    };

    console.log("[ContentAgent] Would call Klangio with remix params");

    // Simulate Klangio response (in practice, might modify the songUrl)
    // For now, return the same URL as the remix would be applied server-side
    const mockRemixResponse = {
      url: state.songUrl, // In real scenario, this would be a different URL with effects
      status: "completed",
    };

    return {
      ...state,
      songUrl: mockRemixResponse.url,
      status: "completed",
    };
  } catch (error) {
    console.error("[ContentAgent] Audio remix failed:", error);
    return {
      ...state,
      status: "failed",
      errorMessage: `Audio remix failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Initialize and run LangGraph workflow
 */
export async function runContentAgent(
  reservationId: string,
  userPrefs: Record<string, any>,
  occasion: string,
  genre: string = "ambient",
) {
  console.log(`[ContentAgent] Starting for reservation ${reservationId}`);

  const workflow = new StateGraph(ContentState)
    .addNode("create_prompt", createGrokPrompt)
    .addNode("generate_song", generateSunoTrack)
    .addNode("generate_video", generateVideo)
    .addNode("remix_audio", remixAudio)
    .addEdge(START, "create_prompt")
    .addEdge("create_prompt", "generate_song")
    .addEdge("generate_song", "generate_video")
    .addEdge("generate_video", "remix_audio")
    .addEdge("remix_audio", END);

  const graph = workflow.compile();

  const initialState = {
    reservationId,
    userPrefs,
    occasion,
    genre,
    grokPrompt: "",
    sunoTrackId: "",
    songUrl: "",
    videoUrl: "",
    artworkUrl: "",
    status: "initializing",
    errorMessage: "",
  };

  try {
    const result = await graph.invoke(initialState);
    console.log("[ContentAgent] Workflow completed:", {
      status: result.status,
      songUrl: result.songUrl,
      videoUrl: result.videoUrl,
    });
    return result;
  } catch (error) {
    console.error("[ContentAgent] Workflow failed:", error);
    throw error;
  }
}
