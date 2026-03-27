"use client";

import { motion, AnimatePresence, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import Navbar from "@/components/resort/Navbar";
import Footer from "@/components/resort/Footer";
import SectionHeading from "@/components/resort/SectionHeading";
import { EXPERIENCES } from "@/lib/experiencesData";

const BASE_IMG =
  "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/images/";

/* Map experience ID â†’ Supabase CDN image */
const EXPERIENCE_IMAGES: Record<string, string> = {
  "san-pedro-snorkeling-with-4-stops,-shark": `${BASE_IMG}gyg-san-pedro-snorkeling-with-4-stops-sharks.jpg`,
  "san-pedro-hol-chan-and-shark-ray-alley-s": `${BASE_IMG}gyg-san-pedro-hol-chan-and-shark-ray-alley-s.jpg`,
  "san-pedro-belizean-cooking-experience": `${BASE_IMG}gyg-san-pedro-belizean-cooking-experience.jpg`,
  "caye-caulker-marine-reserve-half-day-sno": `${BASE_IMG}gyg-caye-caulker-marine-reserve-snorkeling-a.jpg`,
  "caye-caulker-snorkeling-&-san-pedro-secr": `${BASE_IMG}gyg-caye-caulker-snorkeling-san-pedro-secret.jpg`,
  "all-inclusive-full-day-hol-chan-snorkeli": `${BASE_IMG}gyg-all-inclusive-full-day-hol-chan-snorkeli.jpg`,
  "san-pedro-gourmet-treasure-hunt": `${BASE_IMG}gyg-san-pedro-gourmet-treasure-hunt.jpg`,
  "private-belizean-food-experience-in-san-": `${BASE_IMG}gyg-private-belizean-food-experience-in-san-.jpg`,
  "san-pedro-secret-beach-booze-cruise-with": `${BASE_IMG}gyg-san-pedro-secret-beach-booze-cruise-with.jpg`,
  "garifuna-drumming-class": `${BASE_IMG}gyg-garifuna-drumming-class.jpg`,
  "san-pedro-mexico-rocks-and-tres-cocos-sn": `${BASE_IMG}gyg-san-pedro-mexico-rocks-and-tres-cocos-sn.jpg`,
  "ambergris-caye-discover-scuba-diving": `${BASE_IMG}gyg-ambergris-caye-discover-scuba-diving.jpg`,
  "falling-in-love-in-san-pedro-town-a-roma": `${BASE_IMG}gyg-falling-in-love-in-san-pedro-town-a-roma.jpg`,
  "san-pedro-belize-bamboo-art-with-mocktai": `${BASE_IMG}gyg-san-pedro-belize-bamboo-art-with-mocktai.jpg`,
  "soul-soothing-yoga-private-tour-in-the-p": `${BASE_IMG}gyg-soul-soothing-yoga-private-tour-in-the-p.jpg`,
};

function getImage(id: string, fallback: string): string {
  return EXPERIENCE_IMAGES[id] ?? fallback;
}

/* Parse the raw scraped price string e.g. "4.8\n(227)\nFrom\n$125" */
function parsePrice(raw: string): {
  rating?: string;
  reviewCount?: string;
  price: string;
} {
  const lines = raw.split("\n").filter(Boolean);
  if (lines.length >= 3 && /^\d+\.\d+$/.test(lines[0])) {
    return {
      rating: lines[0],
      reviewCount: lines[1],
      price: lines[lines.length > 1 ? lines.length - 1 : 0],
    };
  }
  return { price: lines[lines.length - 1] ?? raw };
}

/* Parse duration from multi-line text — last meaningful part */
function parseDuration(raw: string): string {
  const lines = raw.split("\n").filter(Boolean);
  const last = lines[lines.length - 1] ?? "";
  return last.split("•")[0].trim();
}

/* Extract numeric dollar amount from price string e.g. "4.8\n(227)\nFrom\n$125" → 125 */
function parseAmount(raw: string): number | null {
  const parts = raw.split("\n").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const m = last.match(/\$(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/* Category → filter key */
function getCategoryFilter(desc: string): string {
  if (
    desc.toLowerCase().includes("water") ||
    desc.toLowerCase().includes("new activity")
  )
    return "water";
  if (desc.toLowerCase().includes("private")) return "private";
  if (
    desc.toLowerCase().includes("workshop") ||
    desc.toLowerCase().includes("class")
  )
    return "workshop";
  if (
    desc.toLowerCase().includes("food") ||
    desc.toLowerCase().includes("cooking") ||
    desc.toLowerCase().includes("guided")
  )
    return "guided";
  return "other";
}

type Filter = "all" | "water" | "guided" | "private" | "workshop";

function FadeCard({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function ExperiencesPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered =
    filter === "all"
      ? EXPERIENCES
      : EXPERIENCES.filter((e) => getCategoryFilter(e.description) === filter);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <Image
          src={`${BASE_IMG}drone-2-scaled.jpg`}
          alt="Experiences at Lina Point"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[10px] tracking-[0.5em] uppercase text-white/60 mb-4"
          >
            Adventures Await
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-display text-4xl md:text-6xl font-bold"
          >
            Unforgettable Experiences
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="font-display text-lg italic text-white/60 mt-3 max-w-xl"
          >
            From the barrier reef to ancient Mayan ruins â€” every day is an
            adventure
          </motion.p>
        </div>
      </section>

      {/* Experiences Section */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="Tours & Activities"
            title="Explore Belize"
            description="Book directly through GetYourGuide â€” world-class adventures curated for Lina Point guests."
          />

          {/* Filter tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {(
              [
                ["all", "All Experiences"],
                ["water", "Water Adventures"],
                ["guided", "Guided Tours"],
                ["workshop", "Workshops"],
                ["private", "Private Tours"],
              ] as [Filter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-6 py-2.5 rounded-full text-xs tracking-[0.15em] uppercase font-semibold transition ${
                  filter === key
                    ? "bg-cyan-700 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Experience grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filtered.map((exp, i) => {
                const { rating, reviewCount, price } = parsePrice(exp.price);
                const duration = parseDuration(exp.duration);
                const imgSrc = getImage(exp.id, exp.image);
                const otaPrice = parseAmount(exp.price);
                const directPrice = otaPrice
                  ? Math.round(otaPrice * 0.94)
                  : null;
                const savings =
                  otaPrice && directPrice ? otaPrice - directPrice : null;
                const internalUrl = `/experiences/book?tour=${encodeURIComponent(exp.id)}`;
                const bookUrl = exp.isInHouse ? exp.bookingLink : internalUrl;

                return (
                  <FadeCard key={exp.id} delay={i * 0.06} className="h-full">
                    <div className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow border border-gray-100 h-full flex flex-col">
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={imgSrc}
                          alt={exp.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        {duration && (
                          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] tracking-wider uppercase px-3 py-1 rounded-full">
                            {duration}
                          </div>
                        )}
                        {rating && (
                          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                            <span className="text-amber-500 text-xs">★</span>
                            <span className="text-gray-900 text-xs font-bold">
                              {rating}
                            </span>
                            {reviewCount && (
                              <span className="text-gray-400 text-[10px]">
                                {reviewCount}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3">
                          <span className="bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full">
                            {price}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="inline-block bg-cyan-50 text-cyan-700 text-[10px] tracking-[0.1em] uppercase font-semibold px-2.5 py-1 rounded-full shrink-0 mt-0.5">
                            {exp.description}
                          </span>
                        </div>
                        <h3 className="font-display text-lg font-bold text-gray-900 mb-3 leading-snug">
                          {exp.title}
                        </h3>
                        <div className="mt-auto pt-4 border-t border-gray-100">
                          {!exp.isInHouse && otaPrice && directPrice && (
                            <div className="mb-3 space-y-1.5">
                              <div className="flex justify-between items-center text-xs px-3 py-1.5 bg-orange-50 rounded-lg">
                                <span className="text-orange-700 font-medium">
                                  🗺️ GYG / Viator
                                </span>
                                <span className="text-orange-800 font-semibold line-through">
                                  ${otaPrice}
                                  <span className="text-[10px] text-orange-400 no-underline">
                                    /person
                                  </span>
                                </span>
                              </div>
                              <div className="flex justify-between items-center px-3 py-2 bg-green-50 border border-green-300 rounded-lg">
                                <span className="text-green-700 font-bold text-xs">
                                  ✓ Book Direct
                                </span>
                                <span className="text-green-800 font-bold text-sm">
                                  ${directPrice}
                                  <span className="text-[10px] text-green-600 font-normal">
                                    /person
                                  </span>
                                </span>
                              </div>
                            </div>
                          )}
                          {exp.isInHouse ? (
                            <Link
                              href={bookUrl}
                              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs tracking-[0.15em] uppercase font-semibold px-5 py-2.5 rounded-full transition shadow-sm"
                            >
                              Book Now →
                            </Link>
                          ) : (
                            <Link
                              href={internalUrl}
                              className="w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white text-xs tracking-[0.15em] uppercase font-semibold px-5 py-2.5 rounded-full transition shadow-sm"
                            >
                              {savings
                                ? `Book Direct — Save $${savings}`
                                : "Book Direct at Lina Point"}{" "}
                              →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </FadeCard>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-12">
              No experiences found for this filter.
            </p>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 overflow-hidden">
        <Image
          src={`${BASE_IMG}drone-4-1-scaled.jpg`}
          alt="Aerial paradise"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-cyan-900/85" />
        <div className="relative text-center text-white px-6">
          <FadeCard>
            <p className="text-xs tracking-[0.3em] uppercase text-amber-400 font-semibold mb-4">
              Plan Your Stay
            </p>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4 max-w-3xl mx-auto">
              Ready to Experience Belize?
            </h2>
            <p className="text-white/60 mb-10 max-w-xl mx-auto">
              Book your stay at Lina Point and choose from over 15 incredible
              experiences right on your doorstep.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/booking"
                className="bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition shadow-lg shadow-amber-600/30"
              >
                Book Your Stay
              </Link>
              <Link
                href="/rooms"
                className="border border-white/30 hover:border-white text-white px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition"
              >
                View Rooms
              </Link>
            </div>
          </FadeCard>
        </div>
      </section>

      <Footer />
    </main>
  );
}
