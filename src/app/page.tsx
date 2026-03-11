'use client';

import { useSession } from '@/hooks/useAuth';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

/* ── Curated images from linapoint.com (owned content) ── */
const IMG = {
  hero: 'https://linapoint.com/wp-content/uploads/2022/08/drone-2-scaled.jpg',
  cabana: 'https://linapoint.com/wp-content/uploads/2022/08/anniversary_cabana-10-1-scaled.jpg',
  cabanaAlt: 'https://linapoint.com/wp-content/uploads/2022/08/anniversary_cabana-8-scaled.jpg',
  restaurant: 'https://linapoint.com/wp-content/uploads/2017/12/21557862_842375785930679_1662415238731283244_n.jpg',
  dayView: 'https://linapoint.com/wp-content/uploads/2017/12/day-view.jpg',
  nightView: 'https://linapoint.com/wp-content/uploads/2017/12/night-view.jpg',
  food: 'https://linapoint.com/wp-content/uploads/2022/08/conch-21-1.jpg',
  spa: 'https://linapoint.com/wp-content/uploads/2022/08/spa-6.jpg',
  resort1: 'https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-39.jpg',
  resort2: 'https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-64.jpg',
  marine: 'https://linapoint.com/wp-content/uploads/2022/08/greatwhiteshark-19.jpg',
  aerial2: 'https://linapoint.com/wp-content/uploads/2022/08/drone-3-scaled.jpg',
  pool: 'https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-55.jpg',
  spa2: 'https://linapoint.com/wp-content/uploads/2022/08/spa-5.jpg',
  aerial3: 'https://linapoint.com/wp-content/uploads/2022/08/drone-4-1-scaled.jpg',
  resort3: 'https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-41.jpg',
};

const NAV_LINKS = [
  { label: 'Amenities', href: '#amenities' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Experiences', href: '#experiences' },
  { label: 'Contact', href: '#contact' },
];

const AMENITIES = [
  { title: 'Infinity Pool', desc: 'Overwater infinity pool with sundeck and ocean views', image: IMG.pool, icon: '\u{1F3CA}' },
  { title: 'Hooked Rooftop', desc: '360\u00B0 panoramic restaurant and tiki bar', image: IMG.restaurant, icon: '\u{1F37D}\uFE0F' },
  { title: 'Spa & Wellness', desc: 'Massage and spa services overlooking the Caribbean', image: IMG.spa, icon: '\u{1F486}' },
  { title: 'Ocean Cabanas', desc: 'Glass bottom floors and overwater luxury', image: IMG.cabana, icon: '\u{1F3E0}' },
  { title: 'Fresh Cuisine', desc: 'Local seafood, full kitchen, and room service', image: IMG.food, icon: '\u{1F99E}' },
  { title: 'Night Magic', desc: 'Starlit evenings on the Caribbean Sea', image: IMG.nightView, icon: '\u2728' },
];

const EXPERIENCES = [
  { title: 'Barrier Reef Snorkeling', desc: 'Explore the largest living barrier reef in the Western Hemisphere', icon: '\u{1F93F}' },
  { title: 'Deep Sea Fishing', desc: 'World-class fly, reef, and deep sea fishing excursions', icon: '\u{1F3A3}' },
  { title: 'Scuba Diving', desc: 'Dive the Great Blue Hole and pristine coral gardens', icon: '\u{1F419}' },
  { title: 'Cave Tubing', desc: 'Float through ancient Mayan cave systems on the mainland', icon: '\u{1F6F6}' },
  { title: 'Paddle & Kayak', desc: 'Paddle boards and kayaks available from the tour desk', icon: '\u{1F3C4}' },
  { title: 'Island Excursions', desc: 'Discover the magic of Ambergris Caye and beyond', icon: '\u{1F3DD}\uFE0F' },
];

const GALLERY_IMAGES = [
  { src: IMG.aerial2, alt: 'Aerial view of Lina Point Resort', span: 'col-span-2 row-span-2' },
  { src: IMG.cabanaAlt, alt: 'Overwater cabana interior', span: '' },
  { src: IMG.spa2, alt: 'Spa treatment room', span: '' },
  { src: IMG.resort1, alt: 'Resort grounds', span: '' },
  { src: IMG.marine, alt: 'Marine life snorkeling', span: '' },
  { src: IMG.dayView, alt: 'Overwater cabanas daytime', span: 'col-span-2' },
  { src: IMG.resort2, alt: 'Resort pool area', span: '' },
  { src: IMG.resort3, alt: 'Resort walkway', span: '' },
];

export default function Home() {
  const { session, loading } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white">
      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/50 to-transparent">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-white text-2xl font-display font-bold tracking-widest">
            LINA POINT
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-white/90 hover:text-white text-xs tracking-[0.2em] uppercase transition"
              >
                {link.label}
              </a>
            ))}
            {!loading &&
              (session ? (
                <Link
                  href="/dashboard"
                  className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-5 py-2 rounded text-xs tracking-[0.2em] uppercase hover:bg-white/30 transition"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/booking"
                  className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded text-xs tracking-[0.2em] uppercase font-semibold transition"
                >
                  Book Now
                </Link>
              ))}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white p-2"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-black/90 backdrop-blur-md px-6 pb-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block py-3 text-white/90 text-sm tracking-wider uppercase border-b border-white/10"
              >
                {link.label}
              </a>
            ))}
            <Link
              href={session ? '/dashboard' : '/booking'}
              className="block mt-4 text-center bg-amber-600 text-white py-3 rounded text-sm tracking-wider uppercase font-semibold"
            >
              {session ? 'Dashboard' : 'Book Now'}
            </Link>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative h-screen overflow-hidden">
        <Image
          src={IMG.hero}
          alt="Aerial view of Lina Point Overwater Resort in San Pedro, Belize"
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6">
          <p className="text-xs md:text-sm tracking-[0.4em] uppercase mb-6 text-white/70">
            Overwater Resort &middot; San Pedro, Belize
          </p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-4 max-w-5xl leading-[1.1]">
            Disconnect Once You Step on the Bridge
          </h1>
          <p className="font-display text-lg md:text-2xl italic text-white/80 mb-12 max-w-2xl">
            Reconnect with the Magic Within
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/booking"
              className="bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition shadow-lg"
            >
              Book Your Experience
            </Link>
            <a
              href="#amenities"
              className="border-2 border-white/40 hover:bg-white/10 text-white px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition"
            >
              Explore Resort
            </a>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ─── Accolade Banner ─── */}
      <section className="bg-cyan-800 text-white py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-4 text-center">
          <p className="text-sm md:text-base tracking-wide">
            <span className="font-display text-lg md:text-xl font-semibold">#1 Island Vacation Getaway</span>
            <span className="mx-3 text-white/40">|</span>
            Ambergris Caye &mdash; 3 Years Running
          </p>
          <a
            href="https://www.tripadvisor.com/Hotel_Review-g291962-d12592063-Reviews-Lina_Point_Belize_Overwater_Resort-San_Pedro_Ambergris_Caye_Belize_Cayes.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-white/20 px-4 py-1.5 rounded-full hover:bg-white/30 transition tracking-wider uppercase"
          >
            TripAdvisor Reviews &rarr;
          </a>
        </div>
      </section>

      {/* ─── About / Welcome ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden shadow-2xl">
            <Image
              src={IMG.cabana}
              alt="Overwater cabana at Lina Point"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-4">
              Welcome to Lina Point
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-snug">
              Life Overwater in
              <br />
              San Pedro, Belize
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              A photographer&apos;s dream &mdash; world class fishing, snorkeling, and diving
              along the largest living barrier reef in the world. Relax by our overwater
              infinity pool, grab a drink at the Hooked Rooftop tiki bar with 360&deg;
              panoramic ocean views, or let our tour desk book your next adventure.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                'Overwater Infinity Pool',
                'Hooked Rooftop Restaurant',
                'Spa & Massage Services',
                'Glass Bottom Floors',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <Link
              href="/booking"
              className="inline-block mt-8 bg-cyan-700 hover:bg-cyan-600 text-white px-8 py-3 rounded text-xs tracking-[0.2em] uppercase font-semibold transition"
            >
              Plan Your Stay
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Amenities ─── */}
      <section id="amenities" className="bg-gray-50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-3">
              What We Offer
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900">
              Resort Amenities
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AMENITIES.map((a) => (
              <div
                key={a.title}
                className="group relative aspect-[4/3] rounded-lg overflow-hidden shadow-lg"
              >
                <Image
                  src={a.image}
                  alt={a.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="text-2xl mb-2">{a.icon}</div>
                  <h3 className="text-white font-display text-xl font-bold mb-1">{a.title}</h3>
                  <p className="text-white/80 text-sm">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Gallery ─── */}
      <section id="gallery" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-3">
              Visual Journey
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900">
              Explore Lina Point
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[200px] md:auto-rows-[250px]">
            {GALLERY_IMAGES.map((img, i) => (
              <div key={i} className={`relative rounded-lg overflow-hidden ${img.span}`}>
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Experiences ─── */}
      <section id="experiences" className="bg-cyan-800 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs tracking-[0.3em] uppercase text-amber-400 font-semibold mb-3">
              Adventures Await
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
              Unforgettable Experiences
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXPERIENCES.map((exp) => (
              <div
                key={exp.title}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-8 hover:bg-white/15 transition"
              >
                <div className="text-4xl mb-4">{exp.icon}</div>
                <h3 className="text-white font-display text-xl font-bold mb-2">{exp.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{exp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-28">
        <Image
          src={IMG.aerial3}
          alt="Lina Point from above"
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative text-center text-white px-6">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Ready for an Unforgettable Vacation?
          </h2>
          <p className="text-lg md:text-xl text-white/80 mb-10 font-display italic">
            You Betta Belize It!
          </p>
          <Link
            href="/booking"
            className="inline-block bg-amber-600 hover:bg-amber-500 text-white px-12 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition shadow-lg"
          >
            Book Your Stay
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer id="contact" className="bg-gray-900 text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* About */}
            <div>
              <h3 className="font-display text-2xl font-bold mb-4 tracking-wider">LINA POINT</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Overwater Resort in San Pedro, Ambergris Caye, Belize. Never a dull moment
                experiencing life overwater.
              </p>
              <div className="flex gap-4">
                <a
                  href="https://www.facebook.com/linapointbelize"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition"
                  aria-label="Facebook"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/linapointsanpedro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition"
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@linapoint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition"
                  aria-label="TikTok"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-sm tracking-wider uppercase mb-4">Quick Links</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Amenities', href: '#amenities' },
                  { label: 'Gallery', href: '#gallery' },
                  { label: 'Tours & Experiences', href: '#experiences' },
                  { label: 'Book Now', href: '/booking' },
                  { label: 'Sign In', href: '/auth/login' },
                  { label: 'Terms of Service', href: 'https://linapoint.com/terms-of-service' },
                  { label: 'Privacy Policy', href: 'https://linapoint.com/privacy-policy' },
                ].map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-gray-400 hover:text-white text-sm transition">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-sm tracking-wider uppercase mb-4">Contact</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5">{'\u{1F4CD}'}</span>
                  <span>
                    San Pedro, Ambergris Caye
                    <br />
                    Belize, Central America
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span>{'\u{1F4DE}'}</span>
                  <a href="tel:+5016329205" className="hover:text-white transition">
                    BZ +501.632.9205
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <span>{'\u2709\uFE0F'}</span>
                  <a href="mailto:reservations@linapoint.com" className="hover:text-white transition">
                    reservations@linapoint.com
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <span>{'\u{1F4AC}'}</span>
                  <span>WhatsApp available</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center text-gray-500 text-xs">
            <p>&copy; {new Date().getFullYear()} Lina Point. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}