"use client";

import { useEffect, useState } from "react";
import { linkCrossSiteSession } from "@/lib/sessionLinker";

interface EcosystemBrand {
  name: string;
  tagline: string;
  url: string;
  cta: string;
}

const ECOSYSTEM_BRANDS: EcosystemBrand[] = [
  {
    name: "Lina Point Resort",
    tagline: "Where the Magic Begins",
    url: "https://linapoint.com",
    cta: "Book direct \u2014 save 6%",
  },
  {
    name: "The Magic Is You",
    tagline: "Discover Your Cosmic Blueprint",
    url: "https://magic.overwater.com",
    cta: "Find your Day Sign",
  },
  {
    name: "Kyla Point",
    tagline: "Soulful Living on the Mainland",
    url: "https://kylapoint.com",
    cta: "Explore soulful living",
  },
  {
    name: "Point Realtor",
    tagline: "Your Gateway to Caribbean Living",
    url: "https://pointrealtor.com",
    cta: "Browse listings",
  },
  {
    name: "Overwater.com",
    tagline: "Own the Magic",
    url: "https://overwater.com",
    cta: "Take the quiz",
  },
  {
    name: "Point Enterprise",
    tagline: "A Family of Soulful Companies",
    url: "https://pointenterprise.com",
    cta: "Meet the family",
  },
];

const SOURCE = "lina-point";
const OTHERS = ECOSYSTEM_BRANDS.filter((b) => !b.url.includes("linapoint.com"));

function pickBrand() {
  return OTHERS[Math.floor(Math.random() * OTHERS.length)];
}

export function EcosystemCTA() {
  const [brand] = useState(pickBrand);

  useEffect(() => {
    linkCrossSiteSession();
  }, []);

  const href = `${brand.url}?utm_source=${SOURCE}&utm_medium=cta&utm_campaign=ecosystem`;

  return (
    <section className="border-t border-white/10 bg-gradient-to-r from-white/5 to-white/[0.02] py-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-sm font-medium text-white/80">{brand.name}</p>
          <p className="text-xs text-white/50">{brand.tagline}</p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/20"
        >
          {brand.cta} <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
