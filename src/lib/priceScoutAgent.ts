/**
 * PriceScoutAgent: Multi-iteration price comparison for Lina Point Overwater Resort
 * Uses LangGraph to scan OTAs via Tavily and beat competitors by 6%
 */

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { runWithRecursion } from "@/lib/agents/agentRecursion";
import { evaluateTextQuality } from "@/lib/agents/recursionEvaluators";
import { fetchCompetitivePrices, type OTAPrice } from "@/lib/otaIntegration";

const isProd = process.env.NODE_ENV === "production";
const debugLog = (...args: unknown[]) => {
  if (!isProd) {
    console.log(...args);
  }
};

export interface PriceScoutResult {
  bestPrice: number;
  bestOTA: string;
  beatPrice: number;
  savingsPercent: number;
  savings: number;
  iterations: number;
  priceUrl: string;
  allPrices: Record<string, number>;
  confidenceScore?: number;
  confidenceFeedback?: string;
}

const PriceScoutAnnotation = Annotation.Root({
  roomType: Annotation<string>,
  checkInDate: Annotation<string>,
  checkOutDate: Annotation<string>,
  location: Annotation<string>,
  iteration: Annotation<number>,
  bestPrice: Annotation<number>,
  bestOTA: Annotation<string>,
  beatPrice: Annotation<number>,
  priceUrl: Annotation<string>,
  allPrices: Annotation<Record<string, number>>,
  refinementNotes: Annotation<string>,
});

/**
 * Step 1: Scan OTAs using real Tavily-powered search
 */
async function scanOTAs(state: typeof PriceScoutAnnotation.State) {
  debugLog(`[PriceScout] Iteration ${state.iteration}: Scanning OTAs for "${state.roomType}"...`);

  const otaPrices = await fetchCompetitivePrices(
    state.roomType,
    state.checkInDate,
    state.checkOutDate,
    state.location
  );

  const scannedPrices: Record<string, number> = {};
  let bestUrl = "";

  for (const p of otaPrices) {
    scannedPrices[p.ota] = p.price;
  }

  // Find lowest
  const lowestEntry = Object.entries(scannedPrices).reduce((prev, curr) =>
    prev[1] < curr[1] ? prev : curr,
    ["unknown", 9999]
  );

  // Get URL of the best price
  const bestOtaResult = otaPrices.find(p => p.ota === lowestEntry[0]);
  bestUrl = bestOtaResult?.url || "";

  const liveSources = otaPrices.filter(p => p.source === "live").length;
  debugLog(`[PriceScout] Scanned ${Object.keys(scannedPrices).length} OTAs (${liveSources} live). Best: $${lowestEntry[1]} on ${lowestEntry[0]}`);

  return {
    ...state,
    bestPrice: lowestEntry[1],
    bestOTA: lowestEntry[0],
    allPrices: scannedPrices,
    priceUrl: bestUrl,
    refinementNotes: `Scanned ${Object.keys(scannedPrices).length} OTAs (${liveSources} live results). Best price: $${lowestEntry[1]} on ${lowestEntry[0]}`,
  };
}

/**
 * Step 2: Calculate beat price (6% lower, with floor protection)
 */
async function calculateBeatPrice(state: typeof PriceScoutAnnotation.State) {
  const rawBeat = Math.round(state.bestPrice * 0.94 * 100) / 100; // 6% discount
  // Floor: never go below 70% of typical base rate ($139 for cheapest room)
  const beatPrice = Math.max(rawBeat, 139);
  const savings = Math.round((state.bestPrice - beatPrice) * 100) / 100;
  const savingsPercent = state.bestPrice > 0 ? Math.round((savings / state.bestPrice) * 100 * 10) / 10 : 6;

  debugLog(
    `[PriceScout] Beat price: $${beatPrice} (save $${savings}, ${savingsPercent}% off $${state.bestPrice})`
  );

  return {
    ...state,
    beatPrice,
  };
}

/**
 * Step 3: Refine search (try additional iterations if not optimal)
 */
async function refineSearch(state: typeof PriceScoutAnnotation.State) {
  state.iteration++;

  if (state.iteration >= 3) {
    debugLog(`[PriceScout] Max iterations (3) reached. Stopping refinement.`);
    return {
      ...state,
      refinementNotes: `${state.refinementNotes} → Completed after ${state.iteration} iterations.`,
    };
  }

  // Simulate checking if a better deal appeared
  const potentialBetterDeal = state.bestPrice * 0.99; // Could find 1% cheaper
  if (Math.random() > 0.7) {
    // 30% chance of finding better deal each iteration
    debugLog(
      `[PriceScout] Potential better deal detected. Refining... (Iteration ${state.iteration})`
    );
    return {
      ...state,
      bestPrice: potentialBetterDeal,
      refinementNotes: `${state.refinementNotes} → Found better deal in iteration ${state.iteration}. Re-scanning...`,
    };
  } else {
    debugLog(`[PriceScout] No better deals found. Continuing to next iteration.`);
    return state;
  }
}

/**
 * Conditional: Should refine further?
 */
function shouldRefine(state: typeof PriceScoutAnnotation.State): string {
  return state.iteration < 3 ? "refine" : "done";
}

/**
 * Build the LangGraph for price scout recursion
 */
async function buildPriceScoutGraph() {
  const workflow = new StateGraph(PriceScoutAnnotation)
    .addNode("scan", scanOTAs)
    .addNode("calculate", calculateBeatPrice)
    .addNode("refine", refineSearch)
    .addEdge(START, "scan")
    .addEdge("scan", "calculate")
    .addConditionalEdges("calculate", shouldRefine, {
      refine: "refine",
      done: END,
    })
    .addEdge("refine", "scan");

  return workflow.compile();
}

/**
 * Main export: Run price scout agent
 */
export async function runPriceScout(
  roomType: string,
  checkInDate: string,
  checkOutDate: string,
  location: string
): Promise<PriceScoutResult> {
  debugLog(`\n🔍 [PriceScout] Starting for ${roomType} in ${location}`);

  const graph = await buildPriceScoutGraph();

  const initialState = {
    roomType,
    checkInDate,
    checkOutDate,
    location,
    iteration: 1,
    bestPrice: 9999,
    bestOTA: "unknown",
    beatPrice: 0,
    priceUrl: "",
    allPrices: {},
    refinementNotes: "Starting price scout search...",
  };

  const { result: finalState, score, feedback, iterations } = await runWithRecursion(
    async () => graph.invoke(initialState),
    async (state) => {
      const goal = "Find the best OTA price and calculate a clear beat price.";
      const summary = `Best OTA: ${state.bestOTA} Price: ${state.bestPrice} Beat: ${state.beatPrice}`;
      const evalResult = await evaluateTextQuality(goal, summary);
      return { score: evalResult.score, feedback: evalResult.feedback, data: state };
    },
    async (state) => ({
      ...state,
      iteration: Math.min(state.iteration + 1, 3),
    })
  );

  debugLog(`✅ [PriceScout] Complete. Best OTA: ${finalState.bestOTA} @ $${finalState.bestPrice}`);
  debugLog(`💰 [PriceScout] Direct booking price: $${finalState.beatPrice} (Save 6%!)`);

  const actualSavings = Math.round((finalState.bestPrice - finalState.beatPrice) * 100) / 100;
  const actualSavingsPercent = finalState.bestPrice > 0
    ? Math.round((actualSavings / finalState.bestPrice) * 100 * 10) / 10
    : 6;

  return {
    bestPrice: finalState.bestPrice,
    bestOTA: finalState.bestOTA,
    beatPrice: finalState.beatPrice,
    savingsPercent: actualSavingsPercent,
    savings: Math.round((finalState.bestPrice - finalState.beatPrice) * 100) / 100,
    iterations,
    priceUrl: finalState.priceUrl || `https://linapoint.com/book?check_in=${checkInDate}&check_out=${checkOutDate}&guests=2&room_type=${encodeURIComponent(roomType)}`,
    allPrices: finalState.allPrices,
    confidenceScore: score,
    confidenceFeedback: feedback,
  };
}

/**
 * Insert price record into Supabase for tracking
 */
export async function logPriceToSupabase(
  supabase: any,
  userId: string,
  result: PriceScoutResult,
  roomType: string,
  checkInDate: string,
  checkOutDate: string,
  location: string
) {
  try {
    await supabase.from("prices").insert({
      user_id: userId,
      room_type: roomType,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      location,
      ota_name: result.bestOTA,
      price: result.bestPrice,
      beat_price: result.beatPrice,
      savings_percent: result.savingsPercent,
      url: result.priceUrl,
    });
    debugLog("[PriceScout] Price logged to Supabase");
  } catch (error) {
    console.error("[PriceScout] Failed to log price:", error);
  }
}
