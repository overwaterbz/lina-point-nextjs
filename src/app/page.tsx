"use client";

import { motion, useScroll, useTransform, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import Navbar from "@/components/resort/Navbar";
import Footer from "@/components/resort/Footer";
import SectionHeading from "@/components/resort/SectionHeading";
import RoomCarousel from "@/components/resort/RoomCarousel";
import WhyBookDirect from "@/components/WhyBookDirect";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import TrustBadges from "@/components/TrustBadges";

/* ── Curated images from linapoint.com (owned content) ── */
const IMG = {
  hero: "https://linapoint.com/wp-content/uploads/2022/08/drone-2-scaled.jpg",
  cabana:
    "https://linapoint.com/wp-content/uploads/2022/08/anniversary_cabana-10-1-scaled.jpg",
  cabanaAlt:
    "https://linapoint.com/wp-content/uploads/2022/08/anniversary_cabana-8-scaled.jpg",
  restaurant:
    "https://linapoint.com/wp-content/uploads/2017/12/21557862_842375785930679_1662415238731283244_n.jpg",
  dayView: "https://linapoint.com/wp-content/uploads/2017/12/day-view.jpg",
  nightView: "https://linapoint.com/wp-content/uploads/2017/12/night-view.jpg",
  food: "https://linapoint.com/wp-content/uploads/2022/08/conch-21-1.jpg",
  spa: "https://linapoint.com/wp-content/uploads/2022/08/spa-6.jpg",
  resort1: "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-39.jpg",
  resort2: "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-64.jpg",
  marine:
    "https://linapoint.com/wp-content/uploads/2022/08/greatwhiteshark-19.jpg",
  aerial2:
    "https://linapoint.com/wp-content/uploads/2022/08/drone-3-scaled.jpg",
  pool: "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-55.jpg",
  spa2: "https://linapoint.com/wp-content/uploads/2022/08/spa-5.jpg",
  aerial3:
    "https://linapoint.com/wp-content/uploads/2022/08/drone-4-1-scaled.jpg",
  resort3: "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-41.jpg",
};

/* ── Data ── */
const AMENITIES = [
  {
    title: "Infinity Pool",
    desc: "Overwater infinity pool with panoramic ocean views and sundeck",
    image: IMG.pool,
  },
  {
    title: "Hooked Rooftop",
    desc: "360\u00B0 panoramic restaurant and tiki bar above the reef",
    image: IMG.restaurant,
  },
  {
    title: "Spa & Wellness",
    desc: "Massage and spa services overlooking the Caribbean",
    image: IMG.spa,
  },
  {
    title: "Glass Bottom Floors",
    desc: "Watch marine life beneath your feet from your room",
    image: IMG.cabana,
  },
  {
    title: "Fresh Cuisine",
    desc: "Local conch, lobster, and Belizean flavors daily",
    image: IMG.food,
  },
  {
    title: "Night Magic",
    desc: "Starlit evenings on the Caribbean Sea",
    image: IMG.nightView,
  },
];

const EXPERIENCES = [
  {
    title: "Barrier Reef Snorkeling",
    desc: "The largest living barrier reef in the Western Hemisphere",
    icon: "\u{1F93F}",
    cat: "water",
  },
  {
    title: "Deep Sea Fishing",
    desc: "World-class fly, reef, and deep sea fishing",
    icon: "\u{1F3A3}",
    cat: "water",
  },
  {
    title: "Scuba Diving",
    desc: "Dive the Great Blue Hole and pristine coral gardens",
    icon: "\u{1F419}",
    cat: "water",
  },
  {
    title: "Cave Tubing",
    desc: "Float through ancient Mayan cave systems",
    icon: "\u{1F6F6}",
    cat: "land",
  },
  {
    title: "Paddle & Kayak",
    desc: "Kayaks and paddle boards from the tour desk",
    icon: "\u{1F3C4}",
    cat: "water",
  },
  {
    title: "Island Excursions",
    desc: "Discover the magic of Ambergris Caye",
    icon: "\u{1F3DD}\uFE0F",
    cat: "land",
  },
];

const STATS = [
  { value: "#1", label: "Island Getaway", sub: "3 Years Running" },
  { value: "2nd", label: "Largest Barrier Reef", sub: "In the World" },
  { value: "360\u00B0", label: "Ocean Views", sub: "From Every Angle" },
  { value: "365", label: "Days of Sun", sub: "Caribbean Climate" },
];

/* ── Scroll-triggered card component ── */
function FadeInCard({
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

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      {/* ═══════════ HERO ═══════════ */}
      <section ref={heroRef} className="relative h-screen overflow-hidden">
        <motion.div style={{ y: heroY }} className="absolute inset-0">
          <Image
            src={IMG.hero}
            alt="Aerial view of Lina Point Overwater Resort in San Pedro, Belize"
            fill
            className="object-cover animate-ken-burns"
            priority
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/70" />

        <motion.div
          style={{ opacity: heroOpacity }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6"
        >
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-[10px] md:text-xs tracking-[0.5em] uppercase mb-8 text-white/60"
          >
            San Pedro &middot; Ambergris Caye &middot; Belize
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="font-display text-4xl md:text-6xl lg:text-7xl font-bold max-w-5xl leading-[1.05]"
          >
            Disconnect Once You
            <br />
            Step on the Bridge
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="font-display text-lg md:text-2xl italic text-white/70 mt-5 mb-14 max-w-xl"
          >
            Reconnect with the Magic Within
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              href="/booking"
              className="bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition shadow-lg shadow-amber-600/30"
            >
              Reserve Your Stay
            </Link>
            <Link
              href="/experiences"
              className="border-2 border-white/30 hover:bg-white/10 text-white px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition backdrop-blur-sm"
            >
              Explore Experiences
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-white/30 text-[9px] tracking-[0.3em] uppercase">
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            className="w-[1px] h-8 bg-gradient-to-b from-white/40 to-transparent"
          />
        </motion.div>
      </section>

      {/* Reef shimmer bar — glass-floor effect */}
      <div className="reef-shimmer-bar" />

      {/* ═══════════ ACCOLADE BANNER ═══════════ */}
      <section className="bg-cyan-800 py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-3 text-center text-white">
          <span className="font-display text-lg font-semibold">
            #1 Island Vacation Getaway
          </span>
          <span className="text-white/30 hidden md:inline">|</span>
          <span className="text-sm text-white/70">
            Ambergris Caye &mdash; Voted 3 Years Running
          </span>
          <a
            href="https://www.tripadvisor.com/Hotel_Review-g291962-d12592063-Reviews-Lina_Point_Belize_Overwater_Resort-San_Pedro_Ambergris_Caye_Belize_Cayes.html"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-[10px] bg-white/15 px-4 py-1.5 rounded-full hover:bg-white/25 transition tracking-wider uppercase"
          >
            Reviews &rarr;
          </a>
        </div>
      </section>

      {/* ═══════════ LIFE OVERWATER ═══════════ */}
      <section className="py-24 md:py-32 relative">
        <div
          className="absolute inset-0 water-caustics pointer-events-none"
          aria-hidden
        />
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center relative">
          <FadeInCard className="relative">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src={IMG.cabana}
                alt="Overwater cabana at Lina Point"
                fill
                className="object-cover"
              />
            </div>
            {/* Floating accent image */}
            <div className="absolute -bottom-8 -right-8 w-40 h-40 md:w-52 md:h-52 rounded-xl overflow-hidden shadow-xl border-4 border-white hidden md:block">
              <Image
                src={IMG.resort1}
                alt="Resort deck"
                fill
                className="object-cover"
              />
            </div>
          </FadeInCard>

          <FadeInCard delay={0.2}>
            <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-5">
              Welcome to Lina Point
            </p>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-[1.1]">
              Life Overwater in
              <br />
              San Pedro, Belize
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8 text-base md:text-lg">
              A photographer&apos;s dream &mdash; world class fishing,
              snorkeling, and diving along the largest living barrier reef in
              the world. Relax by our overwater infinity pool, grab a drink at
              the Hooked Rooftop tiki bar with 360&deg; panoramic ocean views,
              or let our concierge plan your adventure.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                "Overwater Infinity Pool",
                "Hooked Rooftop Restaurant",
                "Spa & Massage Services",
                "Glass Bottom Floors",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 text-sm text-gray-700"
                >
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/rooms"
                className="bg-cyan-700 hover:bg-cyan-600 text-white px-8 py-3 rounded text-xs tracking-[0.2em] uppercase font-semibold transition"
              >
                View Rooms
              </Link>
              <Link
                href="/concierge"
                className="border border-gray-300 hover:border-cyan-600 text-gray-700 hover:text-cyan-700 px-8 py-3 rounded text-xs tracking-[0.2em] uppercase font-semibold transition"
              >
                Ask Concierge
              </Link>
            </div>
          </FadeInCard>
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section className="bg-gray-950 py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <FadeInCard
              key={stat.label}
              delay={i * 0.1}
              className="text-center"
            >
              <p className="font-display text-3xl md:text-4xl font-bold text-amber-400 mb-1">
                {stat.value}
              </p>
              <p className="text-white font-semibold text-sm">{stat.label}</p>
              <p className="text-white/40 text-xs mt-1">{stat.sub}</p>
            </FadeInCard>
          ))}
        </div>
      </section>

      {/* ═══════════ ROOMS ═══════════ */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="Accommodations"
            title="Stay Overwater"
            description="Glass bottom floors, private decks, and the sound of the Caribbean beneath you."
          />
          <RoomCarousel />
        </div>
      </section>

      {/* ═══════════ AMENITIES ═══════════ */}
      <section className="bg-gray-50 py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="What We Offer" title="Resort Amenities" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {AMENITIES.map((a, i) => (
              <FadeInCard key={a.title} delay={i * 0.1}>
                <div className="group relative aspect-[4/3] rounded-xl overflow-hidden shadow-lg cursor-pointer">
                  <Image
                    src={a.image}
                    alt={a.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white font-display text-xl font-bold mb-1">
                      {a.title}
                    </h3>
                    <p className="text-white/70 text-sm">{a.desc}</p>
                  </div>
                </div>
              </FadeInCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <TestimonialsCarousel />

      {/* ═══════════ EXPERIENCES ═══════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <Image
          src={IMG.aerial2}
          alt="Aerial view"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-cyan-900/85" />

        <div className="relative max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="Adventures Await"
            title="Unforgettable Experiences"
            description="From the reef to the ruins, every day is an adventure."
            light
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {EXPERIENCES.map((exp, i) => (
              <FadeInCard key={exp.title} delay={i * 0.1}>
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-8 hover:bg-white/20 hover:border-white/25 transition-all duration-300 group hover:-translate-y-1">
                  <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform">
                    {exp.icon}
                  </span>
                  <h3 className="text-white font-display text-xl font-bold mb-2">
                    {exp.title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {exp.desc}
                  </p>
                </div>
              </FadeInCard>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/experiences"
              className="inline-block bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition shadow-lg"
            >
              View All Experiences
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ GALLERY STRIP ═══════════ */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="Visual Journey" title="Explore Lina Point" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[180px] md:auto-rows-[240px]">
            {[
              {
                src: IMG.aerial3,
                alt: "Aerial view",
                span: "col-span-2 row-span-2",
              },
              { src: IMG.cabanaAlt, alt: "Cabana interior", span: "" },
              { src: IMG.spa2, alt: "Spa", span: "" },
              { src: IMG.resort2, alt: "Resort pool", span: "" },
              { src: IMG.marine, alt: "Marine life", span: "" },
              { src: IMG.dayView, alt: "Day view cabanas", span: "col-span-2" },
              { src: IMG.resort3, alt: "Walkway", span: "" },
              { src: IMG.food, alt: "Fresh cuisine", span: "" },
            ].map((img, i) => (
              <FadeInCard
                key={i}
                delay={i * 0.05}
                className={`relative rounded-lg overflow-hidden ${img.span}`}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-700"
                />
              </FadeInCard>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/gallery"
              className="text-cyan-700 hover:text-cyan-600 text-xs tracking-[0.2em] uppercase font-semibold transition"
            >
              View Full Gallery &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ WHY BOOK DIRECT ═══════════ */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-white to-teal-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <WhyBookDirect />
          <TrustBadges />
          <div className="text-center mt-8">
            <Link
              href="/booking"
              className="inline-block bg-teal-600 hover:bg-teal-700 text-white px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition shadow-lg"
            >
              Compare Prices & Book Direct
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ PLAN YOUR TRIP CTA ═══════════ */}
      <section className="relative py-28 md:py-36 overflow-hidden">
        <Image
          src={IMG.nightView}
          alt="Lina Point at night"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative text-center text-white px-6">
          <FadeInCard>
            <p className="text-xs tracking-[0.3em] uppercase text-amber-400 font-semibold mb-4">
              Ready for Paradise?
            </p>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold mb-4 max-w-3xl mx-auto">
              Start Planning Your
              <br />
              Overwater Escape
            </h2>
            <p className="text-lg md:text-xl text-white/60 mb-12 font-display italic">
              You Betta Belize It!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/booking"
                className="bg-amber-600 hover:bg-amber-500 text-white px-12 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition shadow-lg shadow-amber-600/30"
              >
                Book Your Stay
              </Link>
              <Link
                href="/concierge"
                className="border-2 border-white/30 hover:bg-white/10 text-white px-12 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition backdrop-blur-sm"
              >
                Talk to Concierge
              </Link>
            </div>
          </FadeInCard>
        </div>
      </section>

      {/* ═══════════ ECOSYSTEM PORTAL ═══════════ */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FadeInCard>
            <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-4">
              The Overwater Ecosystem
            </p>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-gray-900 mb-4">
              The Magic is You
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto mb-12">
              Lina Point is the flagship resort of the Overwater ecosystem —
              connecting soul-grounded living, ancient wisdom, and smart
              investment.
            </p>
          </FadeInCard>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FadeInCard delay={0.1}>
              <a
                href="https://overwater.com?utm_source=lina-point&utm_medium=portal&utm_campaign=ecosystem"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card-light teal-accent-border p-6 block hover:scale-[1.02] transition-transform"
              >
                <span className="text-3xl block mb-3">🌊</span>
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                  Overwater.com
                </h3>
                <p className="text-sm text-gray-500">
                  Fractional overwater ownership — own your piece of paradise
                  worldwide.
                </p>
              </a>
            </FadeInCard>
            <FadeInCard delay={0.2}>
              <a
                href="https://magic.overwater.com?utm_source=lina-point&utm_medium=portal&utm_campaign=ecosystem"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card-light teal-accent-border p-6 block hover:scale-[1.02] transition-transform"
              >
                <span className="text-3xl block mb-3">✨</span>
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                  The Magic is You
                </h3>
                <p className="text-sm text-gray-500">
                  Discover your Maya Cosmic Blueprint — Day Sign, Spirit Animal
                  &amp; soul purpose.
                </p>
              </a>
            </FadeInCard>
            <FadeInCard delay={0.3}>
              <div className="glass-card-light teal-accent-border p-6 border-2 border-cyan-200">
                <span className="text-3xl block mb-3">🏝️</span>
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                  Lina Point Resort
                </h3>
                <p className="text-sm text-gray-500">
                  You are here — the flagship overwater experience in Belize.
                </p>
              </div>
            </FadeInCard>
            <FadeInCard delay={0.4}>
              <a
                href="https://kylapoint.com?utm_source=lina-point&utm_medium=portal&utm_campaign=ecosystem"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card-light teal-accent-border p-6 block hover:scale-[1.02] transition-transform"
              >
                <span className="text-3xl block mb-3">🌿</span>
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                  Kyla Point
                </h3>
                <p className="text-sm text-gray-500">
                  Soulful mainland living — homes, lots &amp; resort amenities
                  in Belize.
                </p>
              </a>
            </FadeInCard>
            <FadeInCard delay={0.5}>
              <a
                href="https://pointrealtor.com?utm_source=lina-point&utm_medium=portal&utm_campaign=ecosystem"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card-light teal-accent-border p-6 block hover:scale-[1.02] transition-transform"
              >
                <span className="text-3xl block mb-3">🔑</span>
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                  Point Realtor
                </h3>
                <p className="text-sm text-gray-500">
                  Licensed real estate brokerage — Belize &amp; Florida property
                  sales.
                </p>
              </a>
            </FadeInCard>
            <FadeInCard delay={0.6}>
              <a
                href="https://pointenterprise.com?utm_source=lina-point&utm_medium=portal&utm_campaign=ecosystem"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card-light teal-accent-border p-6 block hover:scale-[1.02] transition-transform"
              >
                <span className="text-3xl block mb-3">🏛️</span>
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                  Point Enterprise
                </h3>
                <p className="text-sm text-gray-500">
                  The family behind the magic — 20+ years of soulful companies.
                </p>
              </a>
            </FadeInCard>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
