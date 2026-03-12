/**
 * ExperienceCuratorAgent: Customizes tour bundles based on user preferences
 * Suggests Belize experiences and generates affiliate links
 */

import { grokLLM } from "@/lib/grokIntegration";
import { runWithRecursion } from "@/lib/agents/agentRecursion";
import { evaluateTextQuality } from "@/lib/agents/recursionEvaluators";
import { getActivePrompt } from "@/lib/agents/promptManager";

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

// Mock tour database for Belize experiences
const BELIZE_TOURS = {
  snorkeling: {
    name: "Half-Day Snorkeling & Coral Reef",
    type: "snorkeling",
    description: "Explore pristine barrier reef with marine life",
    duration: "4 hours",
    budget_price: 65,
    mid_price: 95,
    luxury_price: 150,
    groupSize: 4,
  },
  fishing: {
    name: "Guided Sport Fishing Adventure",
    type: "fishing",
    description: "Catch tarpon, permit, or bonefish",
    duration: "6 hours",
    budget_price: 250,
    mid_price: 350,
    luxury_price: 500,
    groupSize: 2,
  },
  mainland: {
    name: "Mainland Jungle & Mayan Ruins Day Tour",
    type: "cultural",
    description: "Visit ancient ruins and jungle canopy",
    duration: "8 hours",
    budget_price: 75,
    mid_price: 120,
    luxury_price: 200,
    groupSize: 6,
  },
  cenote: {
    name: "Cenote Swimming & Cave Exploration",
    type: "adventure",
    description: "Underground cenote with crystal-clear waters",
    duration: "5 hours",
    budget_price: 80,
    mid_price: 130,
    luxury_price: 180,
    groupSize: 8,
  },
  kayaking: {
    name: "Mangrove Kayaking & Wildlife Spotting",
    type: "nature",
    description: "Paddle through mangroves, spot crocodiles & birds",
    duration: "3 hours",
    budget_price: 50,
    mid_price: 85,
    luxury_price: 140,
    groupSize: 4,
  },
  diving: {
    name: "Scuba Diving - Blue Hole Day Trip",
    type: "diving",
    description: "World-famous Blue Hole dive site",
    duration: "8 hours",
    budget_price: 180,
    mid_price: 280,
    luxury_price: 450,
    groupSize: 6,
  },
  island: {
    name: "Island Hopping & Beach Picnic",
    type: "beach",
    description: "Visit multiple islands with beach lunch",
    duration: "6 hours",
    budget_price: 55,
    mid_price: 95,
    luxury_price: 150,
    groupSize: 8,
  },
};

// Dinner options
const DINNERS = {
  casual: {
    name: "Beachfront Seafood BBQ",
    price_budget: 35,
    price_mid: 55,
    price_luxury: 85,
    description: "Fresh grilled fish with tropical sides",
  },
  romantic: {
    name: "Candlelit Overwater Dining",
    price_budget: 75,
    price_mid: 120,
    price_luxury: 200,
    description: "Private dinner on the dock sunset",
  },
  traditional: {
    name: "Belizean Traditional Feast",
    price_budget: 40,
    price_mid: 65,
    price_luxury: 110,
    description: "Authentic Creole & Maya cuisine",
  },
};

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
 * Select tours based on user interests and preferences
 */
function selectTours(prefs: UserPreferences, groupSize: number): Tour[] {
  const priceTier = getPriceTier(prefs.budget);
  const interests = prefs.interests || ["snorkeling", "fishing"];
  const activityLevel = prefs.activityLevel || "medium";

  let selectedTours: Tour[] = [];

  // Map interests to tours
  interests.forEach((interest) => {
    let tourKey: keyof typeof BELIZE_TOURS | null = null;

    if (interest.toLowerCase().includes("snorkel")) tourKey = "snorkeling";
    else if (interest.toLowerCase().includes("fish")) tourKey = "fishing";
    else if (interest.toLowerCase().includes("mayan") || interest.toLowerCase().includes("ruin"))
      tourKey = "mainland";
    else if (interest.toLowerCase().includes("cenote")) tourKey = "cenote";
    else if (interest.toLowerCase().includes("kayak")) tourKey = "kayaking";
    else if (interest.toLowerCase().includes("dive")) tourKey = "diving";
    else if (interest.toLowerCase().includes("island") || interest.toLowerCase().includes("beach"))
      tourKey = "island";

    if (tourKey && BELIZE_TOURS[tourKey]) {
      const tourData = BELIZE_TOURS[tourKey];
      const priceKey = `${priceTier}_price` as const;
      const price = tourData[priceKey] || tourData.mid_price;

      selectedTours.push({
        name: tourData.name,
        type: tourData.type,
        description: tourData.description,
        price,
        duration: tourData.duration,
        groupSize: tourData.groupSize,
        affiliateUrl: `https://viator.com/experience/${tourKey.replace(/\s+/g, "-").toLowerCase()}?affiliate=linapoint`,
        commission: 5, // 5% commission
      });
    }
  });

  // If no matches, default to snorkeling + fishing
  if (selectedTours.length === 0) {
    selectedTours = [
      {
        name: BELIZE_TOURS.snorkeling.name,
        type: "snorkeling",
        description: BELIZE_TOURS.snorkeling.description,
        price: BELIZE_TOURS.snorkeling[`${priceTier}_price`] || 95,
        duration: BELIZE_TOURS.snorkeling.duration,
        groupSize: BELIZE_TOURS.snorkeling.groupSize,
        affiliateUrl: `https://viator.com/experience/snorkeling?affiliate=linapoint`,
        commission: 5,
      },
    ];
  }

  return selectedTours;
}

/**
 * Select dinner based on travel type and preferences
 */
function selectDinner(prefs: UserPreferences, isRomantic: boolean = false): CuratedExperience["dinner"] {
  const priceTier = getPriceTier(prefs.budget);

  let dinnerKey: keyof typeof DINNERS = isRomantic ? "romantic" : "casual";

  const dinner = DINNERS[dinnerKey];
  const priceKey = `price_${priceTier}` as const;

  return {
    name: dinner.name,
    type: dinnerKey,
    price: dinner[priceKey] || dinner.price_mid,
    affiliateUrl: `https://linapoint.com/dining/${dinnerKey}?referral=package`,
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

  // Select tours
  const tours = selectTours(prefs, groupSize);

  // Select dinner
  const dinner = selectDinner(prefs, groupSize === 2);

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
