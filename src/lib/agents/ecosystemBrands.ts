/**
 * Ecosystem Brand Profiles
 * Shared brand voice, themes, and content guidelines for all three properties
 */

export interface BrandProfile {
  name: string;
  tagline: string;
  url: string;
  themes: string[];
  voice: string;
  keyMessages: string[];
  hashtags: string[];
  callToAction: string;
}

export const BRAND_PROFILES: Record<string, BrandProfile> = {
  overwater: {
    name: "Overwater.com",
    tagline: "Own the Magic",
    url: "https://overwater.com",
    themes: [
      "fractional overwater living",
      "glass-floor cabanas",
      "Caribbean investment",
      "expanding worldwide",
      "soulful escape",
    ],
    voice:
      "Aspirational, warm, mystical. Speaks to the soul-searcher who wants to own a piece of paradise. Uses elemental language (Water, Fire, Wind, Earth).",
    keyMessages: [
      "Fractional ownership starting at $458/mo",
      "Glass-floor overwater cabanas on the Belize Barrier Reef",
      "Not a timeshare — real fractional deeds with legal transfer rights",
      "0% interest owner financing, no banks",
      "Take the Soulful Escape Quiz to find your element",
    ],
    hashtags: [
      "#OverwaterLiving",
      "#OwnTheMagic",
      "#FractionalOwnership",
      "#BelizeReef",
      "#GlassFloorCabana",
      "#SoulfulEscape",
    ],
    callToAction: "Take the quiz at overwater.com/quiz",
  },

  "lina-point": {
    name: "Lina Point Resort",
    tagline: "The Magic is You",
    url: "https://linapoint.com",
    themes: [
      "overwater luxury resort",
      "direct booking savings",
      "Belize Caribbean experience",
      "wellness and transformation",
      "kundalini mystique",
    ],
    voice:
      "Luxury with soul. Magical yet grounded. Emphasizes direct booking value (beat OTAs by 6%). Uses 'The Magic is You' mantra.",
    keyMessages: [
      "Book direct — guaranteed 6% below any OTA",
      "Overwater glass-floor cabanas on the Belize Barrier Reef",
      "Promo code DIRECT10 for 10% off first booking",
      "Full-service resort: tours, dining, wellness experiences",
      "Free Dreamweaver cosmic blueprint access for all guests",
    ],
    hashtags: [
      "#LinaPoint",
      "#TheMagicIsYou",
      "#BelizeResort",
      "#OverwaterLuxury",
      "#BookDirect",
      "#AmbergrisCaye",
    ],
    callToAction: "Book direct at linapoint.com",
  },

  "magic-is-you": {
    name: "The Magic Is You",
    tagline: "Discover Your Cosmic Blueprint",
    url: "https://magic.overwater.com",
    themes: [
      "Maya cosmic blueprint",
      "Tzolkin calendar wisdom",
      "soul purpose discovery",
      "spirit animals and crystal allies",
      "Ix Chel cosmic guide",
    ],
    voice:
      "Mystical, wise, cosmic. Speaks as ancient Maya wisdom meeting modern self-discovery. Uses cosmic and elemental language.",
    keyMessages: [
      "35+ cosmic elements from the Maya calendar reveal your soul's purpose",
      "Discover your Day Sign, Spirit Animal, Crystal Ally, and more",
      "AI-powered Ix Chel guide for cosmic conversations",
      "Free blueprint preview, premium subscriptions from $9.99/mo",
      "Lina Point guests get free Dreamweaver access",
    ],
    hashtags: [
      "#TheMagicIsYou",
      "#CosmicBlueprint",
      "#MayaCalendar",
      "#SoulPurpose",
      "#IxChel",
      "#Tzolkin",
    ],
    callToAction: "Discover your blueprint at magic.overwater.com",
  },
};

/** Day-of-week brand rotation for autonomous daily marketing */
export const DAILY_BRAND_ROTATION: Record<number, string> = {
  0: "ecosystem",      // Sunday: cross-promo
  1: "overwater",      // Monday: Overwater focus
  2: "lina-point",     // Tuesday: Lina Point focus
  3: "magic-is-you",   // Wednesday: Magic Is You focus
  4: "ecosystem",      // Thursday: ecosystem cross-promo
  5: "lina-point",     // Friday: LP weekend booking push
  6: "overwater",      // Saturday: OW weekend inspiration
};

export function getTodaysBrand(): string {
  return DAILY_BRAND_ROTATION[new Date().getDay()];
}

export function getEcosystemContext(): string {
  return `ECOSYSTEM CONTEXT:
Overwater.com, Lina Point Resort, and The Magic Is You are three interconnected brands:
- Overwater.com (overwater.com) — Fractional overwater cabana ownership portal. Users discover their element via the Soulful Quiz and can purchase shares.
- Lina Point Resort (linapoint.com) — The flagship property in Belize. Full booking, tours, dining. Guests get free Magic Is You Dreamweaver access.
- The Magic Is You (magic.overwater.com) — Maya Cosmic Blueprint platform. 35+ elements reveal your soul's purpose.

Cross-promo themes:
- "Take the quiz → Book the experience → Discover your cosmic identity"
- "The magic is in the journey: from discovering your element to living it"
- Overwater quiz elements (Water/Fire/Wind/Earth) connect to Maya cosmic elements
- All three share the mantra: "The Magic is You"`;
}
