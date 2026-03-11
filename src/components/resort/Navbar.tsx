'use client';

import Link from 'next/link';
import { useSession } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { label: 'Rooms', href: '/rooms' },
  { label: 'Experiences', href: '/experiences' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Concierge', href: '/concierge' },
];

export default function Navbar() {
  const { session, loading } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-gray-900/95 backdrop-blur-md shadow-lg py-3'
          : 'bg-gradient-to-b from-black/60 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <Link
          href="/"
          className="flex flex-col items-start group"
        >
          <span className="text-white text-xl md:text-2xl font-display font-bold tracking-[0.25em]">
            LINA POINT
          </span>
          <span className="text-white/40 text-[9px] tracking-[0.35em] uppercase mt-[-2px] group-hover:text-amber-400/60 transition">
            Overwater Resort
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/80 hover:text-white text-[11px] tracking-[0.2em] uppercase transition relative group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-amber-400 group-hover:w-full transition-all duration-300" />
            </Link>
          ))}

          {!loading && (
            session ? (
              <Link
                href="/dashboard"
                className="border border-white/30 text-white px-5 py-2 rounded text-[11px] tracking-[0.2em] uppercase hover:bg-white/10 transition"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/booking"
                className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded text-[11px] tracking-[0.2em] uppercase font-semibold transition shadow-lg shadow-amber-600/25"
              >
                Book Now
              </Link>
            )
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white p-2"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-gray-900/95 backdrop-blur-md overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 text-white/80 text-sm tracking-wider uppercase border-b border-white/10"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={session ? '/dashboard' : '/booking'}
                onClick={() => setMenuOpen(false)}
                className="block mt-4 text-center bg-amber-600 text-white py-3 rounded text-sm tracking-wider uppercase font-semibold"
              >
                {session ? 'Dashboard' : 'Book Now'}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
