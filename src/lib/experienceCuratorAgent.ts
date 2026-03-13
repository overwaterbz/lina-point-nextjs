/**
 * ExperienceCuratorAgent: Customizes tour bundles based on user preferences
 * Suggests Belize experiences and generates affiliate links.
 * Tours are loaded from the DB (tours + tour_ota_prices tables).
 */

import { grokLLM } from "@/lib/grokIntegration";
import { runWithRecursion } from "@/lib/agents/agentRecursion";
import { evaluateTextQuality } from "@/lib/agents/recursionEvaluators";
import { getActivePrompt } from "@/lib/agents/promptManager";
import { createClient } from "@supabase/supabase-js";

// Export for type reference in book-flow
export interface UserPreferences {
  interests?: string[];
  activityLevel?: "low" | "medium" | "high";
  familyPreferences?: {
    hasChildren?: boolean;
    childAges?: number[];
    petFriendly?: boolean;
  };
  dietaryRestrictions?: string[];
  budget?: "budget" | "mid" | "luxury";
}

export interface Tour {
  name: string;
  type: string;
  description: string;
  price: number;
  duration: string;
  groupSize: number;
  affiliateUrl: string;
  commission: number; // percentage to split
}

export interface CuratedExperience {
  tours: Tour[];
  dinner: {
    name: string;
    type: string;
    price: number;
    affiliateUrl: string;
  };
  addons: Array<{
    name: string;
    price: number;
    description: string;
  }>;
  totalPrice: number;
  recommendations: string[];
  affiliateLinks: Array<{
    provider: string;
    url: string;
    commission: number;
  }>;
}

// ── DB-backed tour & dinner loading ──────────────────────────────────

interface DBTour {
  id: string;
  name: string;
  description: string;
  category: string;
  slug: string;
  duration_hours: number;
  max_guests: number;
  budget_price: number | null;
  mid_price: number | null;
  luxury_price: number | null;
  price: number;
  tour_ota_prices?: Array<{
    platform: string;
    ota_price: number;
    our_price: number;
    ota_url: string;
  }>;
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  );
}

/**
 * Load active tours from the DB with their OTA prices.
 */
async function loadToursFromDB(): Promise<DBTour[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tours")
      .select("*, tour_ota_prices(platform, ota_price, our_price, ota_url)")
      .eq("active", true)
      .order("category");

    if (error || !data) {
      console.warn("[Curator] Failed to load tours from DB:", error?.message);
      return [];
    }
    return data as DBTour[];
  } catch {
    return [];
  }
}

// Fallback hardcoded tours (used only if DB is empty)
const FALLBACK_TOURS: DBTour[] = [
  { id: "fb-1", name: "Half-Day Snorkeling & Coral Reef", description: "Explore pristine barrier reef with marine life", category: "water", slug: "snorkeling", duration_hours: 4, max_guests: 4, budget_price: 65, mid_price: 95, luxury_price: 150, price: 95 },
  { id: "fb-2", name: "Guided Sport Fishing Adventure", description: "Catch tarpon, permit, or bonefish", category: "water", slug: "fishing", duration_hours: 6, max_guests: 2, budget_price: 250, mid_price: 350, luxury_price: 500, price: 350 },
  { id: "fb-3", name: "Mainland Jungle & Mayan Ruins Day Tour", description: "Visit ancient ruins and jungle canopy", category: "culture", slug: "mainland", duration_hours: 8, max_guests: 6, budget_price: 75, mid_price: 120, luxury_price: 200, price: 120 },
  { id: "fb-4", name: "Cenote Swimming & Cave Exploration", description: "Underground cenote with crystal-clear waters", category: "adventure", slug: "cenote", duration_hours: 5, max_guests: 8, budget_price: 80, mid_price: 130, luxury_price: 180, price: 130 },
  { id: "fb-5", name: "Mangrove Kayaking & Wildlife Spotting", description: "Paddle through mangroves, spot crocodiles & birds", category: "nature", slug: "kayaking", duration_hours: 3, max_guests: 4, budget_price: 50, mid_price: 85, luxury_price: 140, price: 85 },
  { id: "fb-6", name: "Scuba Diving - Blue Hole Day Trip", description: "World-famous Blue Hole dive site", category: "water", slug: "diving", duration_hours: 8, max_guests: 6, budget_price: 180, mid_price: 280, luxury_price: 450, price: 280 },
  { id: "fb-7", name: "Island Hopping & Beach Picnic", description: "Visit multiple islands with beach lunch", category: "nature", slug: "island", duration_hours: 6, max_guests: 8, budget_price: 55, mid_price: 95, luxury_price: 150, price: 95 },
];

const FALLBACK_DINNERS: DBTour[] = [
  { id: "fd-1", name: "Beachfront Seafood BBQ", description: "Fresh grilled fish with tropical sides", category: "dining", slug: "dinner-casual", duration_hours: 2, max_guests: 10, budget_price: 35, mid_price: 55, luxury_price: 85, price: 55 },
  { id: "fd-2", name: "Candlelit Overwater Dining", description: "Private dinner on the dock at sunset", category: "dining", slug: "dinner-romantic", duration_hours: 3, max_guests: 2, budget_price: 75, mid_price: 120, luxury_price: 200, price: 120 },
  { id: "fd-3", name: "Belizean Traditional Feast", description: "Authentic Creole & Maya cuisine", category: "dining", slug: "dinner-traditional", duration_hours: 2, max_guests: 10, budget_price: 40, mid_price: 65, luxury_price: 110, price: 65 },
];

// Add-ons
const ADDONS = [
  { name: "Private Cabana Rental (1 day)", price: 150, description: "Exclusive beach cabana with AC" },
  { name: "Spa Massage (1 hour)", price: 80, description: "Relaxing ocean-view massage" },
  { name: "Romantic Setup (roses, candles, champagne)", price: 120, description: "Complete romance package" },
  { name: "Kids Club Activity Pack", price: 60, description: "4 activities for children" },
  { name: "Sunrise Yoga Class", price: 40, description: "Private beachfront yoga session" },
  { name: "Bakery Delivery (fresh pastries)", price: 25, description: "Daily fresh pastries & coffee" },
];

/**
 * Determine price tier based on budget preference
 */
function getPriceTier(budget?: string): "budget" | "mid" | "luxury" {
  if (budget === "luxury") return "luxury";
  if (budget === "budget") return "budget";
  return "mid";
}

/**
 * Select tours based on user interests and preferences.
 * Loads from DB first, falls back to hardcoded data.
 * Includes OTA price comparisons when available.
 */
async function selectTours(prefs: UserPreferences, groupSize: number): Promise<Tour[]> {
  const priceTier = getPriceTier(prefs.budget);
  const interests = prefs.interests || ["snorkeling", "fishing"];

  // Load tours from DB
  let allTours = await loadToursFromDB();
  const tourSource = allTours.length > 0 ? allTours.filter(t => t.category !== "dining") : FALLBACK_TOURS;

  const selectedTours: Tour[] = [];

  for (const interest of interests) {
    const lower = interest.toLowerCase();
    // Match by slug, name substring, or category
    const match = tourSource.find(
      (t) =>
        t.slug?.includes(lower) ||
        t.name.toLowerCase().includes(lower) ||
        t.category?.toLowerCase().includes(lower) ||
        (lower.includes("snorkel") && t.slug === "snorkeling") ||
        (lower.includes("fish") && t.slug === "fishing") ||
        (lower.includes("mayan") && t.slug === "mainland") ||
        (lower.includes("ruin") && t.slug === "mainland") ||
        (lower.includes("cenote") && t.slug === "cenote") ||
        (lower.includes("kayak") && t.slug === "kayaking") ||
        (lower.includes("dive") && t.slug === "diving") ||
        (lower.includes("island") && t.slug === "island") ||
        (lower.includes("beach") && t.slug === "island"),
    );

    if (match && !selectedTours.some(s => s.name === match.name)) {
      const tierPrice = priceTier === "budget"
        ? match.budget_price
        : priceTier === "luxury"
          ? match.luxury_price
          : match.mid_price;
      const price = tierPrice || match.price;

      // If we have OTA prices, show the comparison
      const otaPrices = match.tour_ota_prices || [];
      const lowestOTA = otaPrices.length > 0
        ? Math.min(...otaPrices.map(p => p.ota_price))
        : null;
      const ourBeatPrice = lowestOTA ? Math.round(lowestOTA * 0.94 * 100) / 100 : null;
      const finalPrice = ourBeatPrice && ourBeatPrice < price ? ourBeatPrice : price;

      selectedTours.push({
        name: match.name,
        type: match.category,
        description: match.description,
        price: finalPrice,
        duration: `${match.duration_hours} hours`,
        groupSize: match.max_guests,
        affiliateUrl: otaPrices[0]?.ota_url || `https://viator.com/experience/${match.slug}?affiliate=linapoint`,
        commission: 5,
      });
    }
  }

  // Default to snorkeling if no matches
  if (selectedTours.length === 0) {
    const defaultTour = tourSource[0] || FALLBACK_TOURS[0];
    const tierPrice = priceTier === "budget" ? defaultTour.budget_price : priceTier === "luxury" ? defaultTour.luxury_price : defaultTour.mid_price;
    selectedTours.push({
      name: defaultTour.name,
      type: defaultTour.category,
      description: defaultTour.description,
      price: tierPrice || defaultTour.price,
      duration: `${defaultTour.duration_hours} hours`,
      groupSize: defaultTour.max_guests,
      affiliateUrl: `https://viator.com/experience/snorkeling?affiliate=linapoint`,
      commission: 5,
    });
  }

  return selectedTours;
}

/**
 * Select dinner based on travel type and preferences.
 * Loads dinner-category tours from DB, falls back to hardcoded.
 */
async function selectDinner(prefs: UserPreferences, isRomantic: boolean = false): Promise<CuratedExperience["dinner"]> {
  const priceTier = getPriceTier(prefs.budget);

  // Load dinners from DB
  let allTours = await loadToursFromDB();
  const dinners = allTours.filter(t => t.category === "dining");
  const dinnerSource = dinners.length > 0 ? dinners : FALLBACK_DINNERS;

  // Pick romantic or casual
  const target = isRomantic ? "dinner-romantic" : "dinner-casual";
  const dinner = dinnerSource.find(d => d.slug === target) || dinnerSource[0];

  const tierPrice = priceTier === "budget"
    ? dinner.budget_price
    : priceTier === "luxury"
      ? dinner.luxury_price
      : dinner.mid_price;

  return {
    name: dinner.name,
    type: dinner.slug?.replace("dinner-", "") || "casual",
    price: tierPrice || dinner.price,
    affiliateUrl: `https://linapoint.com/dining/${dinner.slug?.replace("dinner-", "")}?referral=package`,
  };
}

/**
 * Suggest add-ons based on group and preferences
 */
function suggestAddons(prefs: UserPreferences, groupSize: number): CuratedExperience["addons"] {
  const suggested: CuratedExperience["addons"] = [];

  // Kids club for families
  if (prefs.familyPreferences?.hasChildren) {
    suggested.push(ADDONS[3]); // Kids Club
  }

  // Spa for high-budget or couples
  if (prefs.budget === "luxury") {
    suggested.push(ADDONS[1]); // Spa
  }

  // Romance package for 2 people
  if (groupSize === 2 && prefs.budget !== "budget") {
    suggested.push(ADDONS[2]); // Romantic setup
  }

  // Yoga for wellness-oriented
  if (prefs.interests?.some((i) => i.toLowerCase().includes("yoga") || i.toLowerCase().includes("wellness"))) {
    suggested.push(ADDONS[4]); // Yoga
  }

  // Always suggest bakery
  suggested.push(ADDONS[5]); // Bakery

  return suggested;
}

/**
 * Generate recommendations using Grok LLM
 */
async function generateRecommendations(
  prefs: UserPreferences,
  groupSize: number,
  hint?: string
): Promise<string[]> {
  const defaultSystemPrompt = `You are a Belize travel expert at Lina Point Resort. Provide brief, personalized tour and activity recommendations. Return as JSON array of strings, max 100 chars each.`;
  const systemPrompt = await getActivePrompt('experience_curator', defaultSystemPrompt);

  try {
    const prompt = `Provide 2-3 brief personalized recommendations for a ${groupSize}-person group with interests in: ${prefs.interests?.join(", ") || "general tourism"}. 
    Activity level: ${prefs.activityLevel || "medium"}. Budget tier: ${prefs.budget || "mid"}.
    ${hint ? `Refinement: ${hint}` : ""}
    Return as JSON array of strings, max 100 chars each.`;

    const response = await grokLLM.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ]);

    const content = response.content;
    if (typeof content === "string") {
      try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
      } catch {
        return [
          "Explore the famous Barrier Reef at sunset for unforgettable views.",
          "Try local Creole dishes at traditional beachfront restaurants.",
          "Book a private boat tour to visit multiple islands in one day.",
        ];
      }
    }
  } catch (error) {
    console.error("[Curator] Failed to generate Grok recommendations:", error);
  }

  // Fallback recommendations
  return [
    "Visit the Great Blue Hole - one of the world's most iconic dive sites.",
    "Experience a traditional Mayan ceremony at a local village.",
    "Enjoy fresh lobster and coconut rice at sunset over the water.",
  ];
}

/**
 * Main export: Run experience curator agent
 */
export async function runExperienceCurator(
  prefs: UserPreferences,
  groupSize: number,
  tourBudget: number
): Promise<CuratedExperience> {
  const isProd = process.env.NODE_ENV === "production";
  const debugLog = (...args: unknown[]) => {
    if (!isProd) {
      console.log(...args);
    }
  };

  debugLog(`\n🎯 [Curator] Curating experiences for group of ${groupSize}...`);

  // Calculate budget per person
  const budgetPerPerson = tourBudget / groupSize;

  // Select tours (DB-backed with fallback)
  const tours = await selectTours(prefs, groupSize);

  // Select dinner (DB-backed with fallback)
  const dinner = await selectDinner(prefs, groupSize === 2);

  // Suggest add-ons
  const addons = suggestAddons(prefs, groupSize);

  // Calculate totals
  const tourTotal = tours.reduce((sum, t) => sum + t.price, 0);
  const addonTotal = addons.reduce((sum, a) => sum + a.price, 0);
  const totalPrice = tourTotal + dinner.price + addonTotal;

  // Build affiliate links array
  const affiliateLinks = [
    {
      provider: "Viator Tours",
      url: tours[0]?.affiliateUrl || "https://viator.com/affiliate/linapoint",
      commission: 5,
    },
    {
      provider: "Lina Point Dining",
      url: dinner.affiliateUrl,
      commission: 10,
    },
  ];

  let recommendationHint = "";
  const { result: curated } = await runWithRecursion(
    async () => {
      const recommendations = await generateRecommendations(prefs, groupSize, recommendationHint);

      return {
        tours,
        dinner,
        addons,
        totalPrice,
        recommendations,
        affiliateLinks,
      };
    },
    async (state) => {
      const goal = "Provide concise, high-value tour recommendations.";
      const summary = `Tours: ${state.tours.length}, Addons: ${state.addons.length}, Recs: ${state.recommendations.join(" | ")}`;
      const evalResult = await evaluateTextQuality(goal, summary);
      return { score: evalResult.score, feedback: evalResult.feedback, data: state };
    },
    async (state, feedback, iteration) => {
      recommendationHint = `Iteration ${iteration + 1}: ${feedback || "Focus on conversion-focused phrasing."}`;
      return state;
    }
  );

  debugLog(`✅ [Curator] Package created: ${curated.tours.length} tours, ${curated.addons.length} add-ons`);
  debugLog(`💰 [Curator] Total experience cost: $${curated.totalPrice}`);

  return curated;
}
