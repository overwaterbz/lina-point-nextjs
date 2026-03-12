'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import Navbar from '@/components/resort/Navbar';
import Footer from '@/components/resort/Footer';
import SectionHeading from '@/components/resort/SectionHeading';

/* ── Tour & experience data from experienceCuratorAgent ── */
const TOURS = [
  {
    name: 'Half-Day Snorkeling & Coral Reef',
    cat: 'water',
    icon: '\u{1F93F}',
    desc: 'Explore the pristine barrier reef teeming with marine life — the largest living reef in the Western Hemisphere.',
    duration: '4 hours',
    price: { budget: 65, mid: 95, luxury: 150 },
    group: 4,
    image: 'https://linapoint.com/wp-content/uploads/2022/08/greatwhiteshark-19.jpg',
  },
  {
    name: 'Guided Sport Fishing Adventure',
    cat: 'water',
    icon: '\u{1F3A3}',
    desc: 'Catch tarpon, permit, or bonefish with expert local guides on a world-class fishing excursion.',
    duration: '6 hours',
    price: { budget: 250, mid: 350, luxury: 500 },
    group: 2,
    image: 'https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-64.jpg',
  },
  {
    name: 'Mainland Jungle & Mayan Ruins',
    cat: 'land',
    icon: '\u{1F3DB}\uFE0F',
    desc: 'Visit ancient Mayan ruins and explore the jungle canopy on the mainland. A full day of cultural immersion.',
    duration: '8 hours',
    price: { budget: 75, mid: 120, luxury: 200 },
    group: 6,
    image: 'https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-39.jpg',
  },
  {
    name: 'Cenote Swimming & Cave Exploration',
    cat: 'land',
    icon: '\u{1F30A}',
    desc: 'Swim in crystal-clear underground cenotes and explore ancient cave systems formed over millions of years.',
    duration: '5 hours',
    price: { budget: 80, mid: 130, luxury: 180 },
    group: 8,
    image: 'https://linapoint.com/wp-content/uploads/2022/08/spa-5.jpg',
  },
  {
    name: 'Mangrove Kayaking & Wildlife',
    cat: 'water',
    icon: '\u{1F6F6}',
    desc: 'Paddle through lush mangroves, spot crocodiles, exotic birds, and manatees in their natural habitat.',
    duration: '3 hours',
    price: { budget: 50, mid: 85, luxury: 140 },
    group: 4,
    image: 'https://linapoint.com/wp-content/uploads/2022/08/drone-3-scaled.jpg',
  },
  {
    name: 'Scuba Diving — Blue Hole Day Trip',
    cat: 'water',
    icon: '\u{1F419}',
    desc: 'Dive the world-famous Great Blue Hole, a UNESCO World Heritage Site over 400 feet deep.',
    duration: '8 hours',
    price: { budget: 180, mid: 280, luxury: 450 },
    group: 6,
    image: 'https://linapoint.com/wp-content/uploads/2022/08/drone-4-1-scaled.jpg',
  },
  {
    name: 'Island Hopping & Beach Picnic',
    cat: 'water',
    icon: '\u{1F3DD}\uFE0F',
    desc: 'Visit multiple islands around Ambergris Caye with a gourmet beach lunch on a pristine sandbar.',
    duration: '6 hours',
    price: { budget: 55, mid: 95, luxury: 150 },
    group: 8,
    image: 'https://linapoint.com/wp-content/uploads/2017/12/day-view.jpg',
  },
];

const DINNERS = [
  {
    name: 'Beachfront Seafood BBQ',
    icon: '\u{1F525}',
    desc: 'Fresh grilled fish, lobster, and conch right on the beach with tropical sides and live music.',
    price: { budget: 35, mid: 55, luxury: 85 },
    image: 'https://linapoint.com/wp-content/uploads/2022/08/conch-21-1.jpg',
  },
  {
    name: 'Candlelit Overwater Dining',
    icon: '\u{1F56F}\uFE0F',
    desc: 'Private dinner on the dock at sunset — the most romantic dining experience in Belize.',
    price: { budget: 75, mid: 120, luxury: 200 },
    image: 'https://linapoint.com/wp-content/uploads/2017/12/night-view.jpg',
  },
  {
    name: 'Belizean Traditional Feast',
    icon: '\u{1F372}',
    desc: 'Authentic Creole and Maya cuisine — a culinary journey through Belize\'s rich cultural heritage.',
    price: { budget: 40, mid: 65, luxury: 110 },
    image: 'https://linapoint.com/wp-content/uploads/2017/12/21557862_842375785930679_1662415238731283244_n.jpg',
  },
];

const ADD_ONS = [
  { name: 'Private Cabana Rental', price: 150, icon: '\u{1F3D6}\uFE0F', unit: 'day' },
  { name: 'Spa Massage', price: 80, icon: '\u{1F486}', unit: 'hour' },
  { name: 'Romantic Setup', price: 120, icon: '\u{1F339}', unit: 'package' },
  { name: 'Kids Club Activity Pack', price: 60, icon: '\u{1F3A8}', unit: '4 activities' },
  { name: 'Sunrise Yoga Class', price: 40, icon: '\u{1F9D8}', unit: 'session' },
  { name: 'Bakery Delivery', price: 25, icon: '\u{1F950}', unit: 'daily' },
];

type Filter = 'all' | 'water' | 'land';

function FadeCard({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay }} className={className}>
      {children}
    </motion.div>
  );
}

export default function ExperiencesPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = filter === 'all' ? TOURS : TOURS.filter((t) => t.cat === filter);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <Image
          src="https://linapoint.com/wp-content/uploads/2022/08/drone-2-scaled.jpg"
          alt="Experiences at Lina Point"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-[10px] tracking-[0.5em] uppercase text-white/60 mb-4">
            Adventures Await
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="font-display text-4xl md:text-6xl font-bold">
            Unforgettable Experiences
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="font-display text-lg italic text-white/60 mt-3 max-w-xl">
            From the barrier reef to ancient Mayan ruins — every day is an adventure
          </motion.p>
        </div>
      </section>

      {/* Tours Section */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="Tours & Activities" title="Explore Belize" description="World-class adventures curated by our AI experience curator, with prices that beat OTA platforms." />

          {/* Filter tabs */}
          <div className="flex justify-center gap-3 mb-12">
            {([['all', 'All Experiences'], ['water', 'Water Adventures'], ['land', 'Land Excursions']] as [Filter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-6 py-2.5 rounded-full text-xs tracking-[0.15em] uppercase font-semibold transition ${
                  filter === key
                    ? 'bg-cyan-700 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tour grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filtered.map((tour) => (
                <div
                  key={tour.name}
                  className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image src={tour.image} alt={tour.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] tracking-wider uppercase px-3 py-1 rounded-full">
                      {tour.duration}
                    </div>
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full">
                      From ${tour.price.budget}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{tour.icon}</span>
                      <h3 className="font-display text-lg font-bold text-gray-900">{tour.name}</h3>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">{tour.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] tracking-wider uppercase text-gray-400">Up to {tour.group} guests</span>
                      <Link
                        href={`/booking?interest=${encodeURIComponent(tour.name)}`}
                        className="text-cyan-700 hover:text-cyan-600 text-xs tracking-[0.15em] uppercase font-semibold transition"
                      >
                        Book Now &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Dining Section */}
      <section className="bg-gray-950 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="Fine Dining" title="Culinary Experiences" description="Savor the flavors of Belize with curated dining experiences." light />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DINNERS.map((dinner, i) => (
              <FadeCard key={dinner.name} delay={i * 0.15}>
                <div className="group relative aspect-[4/5] rounded-xl overflow-hidden">
                  <Image src={dinner.image} alt={dinner.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-7">
                    <span className="text-3xl block mb-3">{dinner.icon}</span>
                    <h3 className="text-white font-display text-2xl font-bold mb-2">{dinner.name}</h3>
                    <p className="text-white/60 text-sm leading-relaxed mb-4">{dinner.desc}</p>
                    <div className="flex items-center gap-4 text-white/80 text-sm">
                      <span>From <strong className="text-amber-400">${dinner.price.budget}</strong></span>
                      <span className="text-white/20">|</span>
                      <span>Premium <strong className="text-amber-400">${dinner.price.luxury}</strong></span>
                    </div>
                  </div>
                </div>
              </FadeCard>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="Enhance Your Stay" title="Premium Add-Ons" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {ADD_ONS.map((addon, i) => (
              <FadeCard key={addon.name} delay={i * 0.08}>
                <div className="text-center p-6 rounded-xl bg-gray-50 hover:bg-cyan-50 transition group">
                  <span className="text-3xl block mb-3 group-hover:scale-110 transition-transform">{addon.icon}</span>
                  <p className="font-semibold text-gray-900 text-sm mb-1">{addon.name}</p>
                  <p className="text-amber-600 font-bold text-lg">${addon.price}</p>
                  <p className="text-gray-400 text-[10px] tracking-wider uppercase mt-1">per {addon.unit}</p>
                </div>
              </FadeCard>
            ))}
          </div>
        </div>
      </section>

      {/* AI Concierge CTA */}
      <section className="relative py-24 overflow-hidden">
        <Image src="https://linapoint.com/wp-content/uploads/2022/08/drone-4-1-scaled.jpg" alt="Aerial paradise" fill className="object-cover" />
        <div className="absolute inset-0 bg-cyan-900/85" />
        <div className="relative text-center text-white px-6">
          <FadeCard>
            <p className="text-xs tracking-[0.3em] uppercase text-amber-400 font-semibold mb-4">AI-Powered Planning</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4 max-w-3xl mx-auto">
              Let Our AI Concierge Build Your Perfect Itinerary
            </h2>
            <p className="text-white/60 mb-10 max-w-xl mx-auto">
              Tell us your interests, group size, and budget — our AI experience curator will create a personalized adventure plan with prices that beat the competition.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/booking" className="bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition shadow-lg shadow-amber-600/30">
                Plan My Trip
              </Link>
              <Link href="/concierge" className="border-2 border-white/30 hover:bg-white/10 text-white px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition backdrop-blur-sm">
                Chat with Concierge
              </Link>
            </div>
          </FadeCard>
        </div>
      </section>

      <Footer />
    </main>
  );
}
