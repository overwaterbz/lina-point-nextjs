import Link from "next/link";
import Image from "next/image";
import { NewsletterSignup } from "@/components/NewsletterSignup";

const FOOTER_LINKS = [
  { label: "Rooms", href: "/rooms" },
  { label: "Experiences", href: "/experiences" },
  { label: "Gallery", href: "/gallery" },
  { label: "Book Now", href: "/booking" },
  { label: "Concierge", href: "/concierge" },
  { label: "Sign In", href: "/auth/login" },
];

const LEGAL = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
];

const SOCIAL = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/linapointbelize",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/linapointsanpedro",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@linapoint",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="font-display text-2xl font-bold tracking-[0.2em] mb-2">
              LINA POINT
            </h3>
            <p className="text-white/30 text-xs tracking-[0.3em] uppercase mb-6">
              Overwater Resort
            </p>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-md">
              Disconnect once you step on the bridge. Reconnect with the magic
              within at Belize&apos;s premier overwater resort on Ambergris
              Caye.
            </p>
            <div className="relative w-full max-w-md aspect-[3/1] rounded-lg overflow-hidden opacity-60">
              <Image
                src="https://linapoint.com/wp-content/uploads/2022/08/drone-2-scaled.jpg"
                alt="Lina Point aerial"
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs tracking-[0.25em] uppercase text-white/50 font-semibold mb-6">
              Explore
            </h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-amber-400 text-sm transition"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs tracking-[0.25em] uppercase text-white/50 font-semibold mb-6">
              Contact
            </h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li>
                San Pedro, Ambergris Caye
                <br />
                Belize, Central America
              </li>
              <li>
                <a
                  href="tel:+5016327767"
                  className="hover:text-amber-400 transition"
                >
                  BZ +501.632.7767
                </a>
              </li>
              <li>
                <a
                  href="mailto:reservations@linapoint.com"
                  className="hover:text-amber-400 transition"
                >
                  reservations@linapoint.com
                </a>
              </li>
              <li className="pt-4 flex gap-3">
                {SOCIAL.map(({ label, href, icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-amber-600/20 hover:text-amber-400 transition"
                    aria-label={label}
                  >
                    {icon}
                  </a>
                ))}
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter + Ecosystem */}
        <div className="border-t border-white/10 pt-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h4 className="text-xs tracking-[0.25em] uppercase text-white/50 font-semibold mb-3">
              Island Newsletter
            </h4>
            <p className="text-gray-500 text-xs mb-3">
              Belize tips, resort updates &amp; exclusive offers
            </p>
            <div className="max-w-sm">
              <NewsletterSignup />
            </div>
          </div>
          <div className="text-sm text-gray-500 md:text-right space-y-1">
            <p className="text-xs tracking-[0.25em] uppercase text-white/50 font-semibold mb-2">
              Ecosystem
            </p>
            <a
              href="https://overwater.com?utm_source=linapoint&utm_medium=footer&utm_campaign=ecosystem"
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:text-amber-400 transition"
            >
              Overwater.com — Own the Magic
            </a>
            <a
              href="https://magic.overwater.com?utm_source=linapoint&utm_medium=footer&utm_campaign=ecosystem"
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:text-amber-400 transition"
            >
              The Magic is You — Cosmic Blueprint
            </a>
            <a
              href="https://kylapoint.com?utm_source=linapoint&utm_medium=footer&utm_campaign=ecosystem"
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:text-amber-400 transition"
            >
              Kyla Point — Soulful Mainland Living
            </a>
            <a
              href="https://pointrealtor.com?utm_source=linapoint&utm_medium=footer&utm_campaign=ecosystem"
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:text-amber-400 transition"
            >
              Point Realtor — Real Estate Brokerage
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} Lina Point Belize. All rights
            reserved.
          </p>
          <div className="flex gap-6">
            {LEGAL.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-400 text-xs transition"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
