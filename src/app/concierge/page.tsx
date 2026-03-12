'use client';

import { motion, useInView } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import Navbar from '@/components/resort/Navbar';
import Footer from '@/components/resort/Footer';
import SectionHeading from '@/components/resort/SectionHeading';

const SERVICES = [
  {
    icon: '\u{1F3DD}\uFE0F',
    title: 'Trip Planning',
    desc: 'Tell us your dates, group size, and interests — our AI builds a personalized itinerary with the best prices.',
  },
  {
    icon: '\u{1F4B0}',
    title: 'Price Comparison',
    desc: 'Our Price Scout AI scans OTA platforms and guarantees you the best rate — or beats it by 3%.',
  },
  {
    icon: '\u{1F6F3}\uFE0F',
    title: 'Tour Booking',
    desc: 'Book snorkeling, diving, fishing, cave tubing, and more — all from one conversation.',
  },
  {
    icon: '\u{1F37D}\uFE0F',
    title: 'Dining Reservations',
    desc: 'Reserve a table at Hooked Rooftop or arrange a private candlelit overwater dinner.',
  },
  {
    icon: '\u{1F6CD}\uFE0F',
    title: 'Special Requests',
    desc: 'Anniversaries, proposals, birthday surprises — we make it happen.',
  },
  {
    icon: '\u{1F6A4}',
    title: 'Airport Transfers',
    desc: 'We arrange your water taxi or private boat transfer from San Pedro airstrip.',
  },
];

const FAQS = [
  {
    q: 'How do I get to Lina Point from the airport?',
    a: 'Fly into Philip S.W. Goldson International Airport (BZE) in Belize City, then take a short domestic flight to San Pedro (SPR) on Tropic Air or Maya Island Air (~20 min). From there, we arrange a water taxi or private boat transfer to the resort.',
  },
  {
    q: 'What is the best time to visit Belize?',
    a: 'Belize is beautiful year-round with temperatures averaging 80-85°F. Dry season (November–April) is peak tourist season. June–November sees occasional rain but fewer crowds and lower prices.',
  },
  {
    q: 'Do I need a passport to visit Belize?',
    a: 'Yes, a valid passport is required. US, UK, Canadian, and EU citizens do not need a visa for stays up to 30 days.',
  },
  {
    q: 'Is the reef snorkeling good for beginners?',
    a: 'Absolutely! The barrier reef is just minutes from the resort and has shallow areas perfect for beginners. Our guides provide all gear and instruction.',
  },
  {
    q: 'Can I bring my kids?',
    a: 'Of course! Our Overwater Cabanas and Suites are perfect for families, and we offer a Kids Club Activity Pack ($60). The reef and island excursions are family-friendly.',
  },
  {
    q: 'What currency is used in Belize?',
    a: 'The Belize Dollar (BZD) is pegged at $2 BZD = $1 USD. US dollars are widely accepted everywhere.',
  },
];

function FadeCard({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay }} className={className}>
      {children}
    </motion.div>
  );
}

function FAQItem({ faq, index }: { faq: (typeof FAQS)[0]; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <FadeCard delay={index * 0.08}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-5 border-b border-gray-200 group"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 pr-4 group-hover:text-cyan-700 transition">{faq.q}</h3>
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            className="text-xl text-gray-400 flex-shrink-0"
          >
            +
          </motion.span>
        </div>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-gray-500 text-sm leading-relaxed mt-3 pr-8"
          >
            {faq.a}
          </motion.p>
        )}
      </button>
    </FadeCard>
  );
}

export default function ConciergePage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <Image
          src="https://linapoint.com/wp-content/uploads/2022/08/anniversary_cabana-8-scaled.jpg"
          alt="Lina Point concierge service"
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-[10px] tracking-[0.5em] uppercase text-white/60 mb-4">
            At Your Service
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="font-display text-4xl md:text-6xl font-bold">
            Your AI Concierge
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="font-display text-lg italic text-white/60 mt-3 max-w-xl">
            Plan, book, and customize your perfect Belize escape
          </motion.p>
        </div>
      </section>

      {/* WhatsApp CTA Section */}
      <section className="bg-green-600 py-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white text-center md:text-left">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
              Chat with Us on WhatsApp
            </h2>
            <p className="text-white/70 text-sm">
              Get instant answers, book tours, and arrange your entire trip via WhatsApp. Available 24/7.
            </p>
          </div>
          <a
            href="https://wa.me/5016327767?text=Hi%20Lina%20Point!%20I%27d%20like%20to%20plan%20my%20trip%20to%20Belize."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white text-green-700 px-8 py-4 rounded-full text-sm font-bold hover:bg-white/90 transition shadow-lg flex-shrink-0"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Start WhatsApp Chat
          </a>
        </div>
      </section>

      {/* What We Help With */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="How We Help" title="Concierge Services" description="From trip planning to special requests — we handle everything so you can relax." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <FadeCard key={s.title} delay={i * 0.1}>
                <div className="p-8 rounded-xl bg-gray-50 hover:bg-cyan-50 transition group h-full">
                  <span className="text-3xl block mb-4 group-hover:scale-110 transition-transform">{s.icon}</span>
                  <h3 className="font-display text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </FadeCard>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-950 py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <SectionHeading eyebrow="Simple & Smart" title="How It Works" light />
          <div className="space-y-8">
            {[
              { step: '01', title: 'Tell Us Your Dream Trip', desc: 'Share your dates, interests, group size, and budget via WhatsApp or our booking form.' },
              { step: '02', title: 'AI Builds Your Itinerary', desc: 'Our Experience Curator AI assembles a personalized plan with the best tours, dining, and pricing.' },
              { step: '03', title: 'Review & Customize', desc: 'Adjust anything — swap tours, upgrade dining, add spa sessions. Your trip, your way.' },
              { step: '04', title: 'Book & Enjoy', desc: 'Secure your reservation with Square or Stripe payments. We handle the rest.' },
            ].map((item, i) => (
              <FadeCard key={item.step} delay={i * 0.15}>
                <div className="flex gap-6 items-start">
                  <span className="font-display text-4xl font-bold text-amber-500/30 flex-shrink-0 w-16">{item.step}</span>
                  <div>
                    <h3 className="text-white font-display text-xl font-bold mb-1">{item.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeCard>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6">
          <SectionHeading eyebrow="Questions?" title="Frequently Asked Questions" />
          <div>
            {FAQS.map((faq, i) => (
              <FAQItem key={i} faq={faq} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="bg-cyan-800 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
            Reach Us Anytime
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <p className="text-amber-400 text-sm font-semibold uppercase tracking-wider mb-2">Phone & WhatsApp</p>
              <a href="tel:+5016327767" className="text-white/80 hover:text-white transition text-lg">+501 632-7767</a>
            </div>
            <div>
              <p className="text-amber-400 text-sm font-semibold uppercase tracking-wider mb-2">Email</p>
              <a href="mailto:reservations@linapoint.com" className="text-white/80 hover:text-white transition text-lg">reservations@linapoint.com</a>
            </div>
            <div>
              <p className="text-amber-400 text-sm font-semibold uppercase tracking-wider mb-2">Location</p>
              <p className="text-white/80 text-lg">San Pedro, Ambergris Caye</p>
            </div>
          </div>
          <Link
            href="/booking"
            className="inline-block bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition shadow-lg"
          >
            Book Your Stay
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
