import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/resort/Navbar';
import Footer from '@/components/resort/Footer';

export const metadata: Metadata = {
  title: 'Belize Travel Guide | Ambergris Caye & San Pedro | Lina Point Resort',
  description:
    'Your complete guide to traveling Belize — Ambergris Caye, San Pedro, the Barrier Reef, Great Blue Hole, Maya ruins, and more. Plan your trip from Lina Point Resort.',
};

const SECTIONS = [
  {
    title: 'Getting to Belize',
    image: 'https://linapoint.com/wp-content/uploads/2022/08/drone-2-scaled.jpg',
    content: [
      'Fly into Philip S.W. Goldson International Airport (BZE) in Belize City. Major airlines including American, United, Delta, and Southwest offer direct flights from US hubs.',
      'From Belize City, take a 20-minute domestic flight to San Pedro on Tropic Air or Maya Island Air. We provide complimentary boat transfers from the airstrip to Lina Point.',
      'No visa required for US, Canadian, UK, and EU citizens for stays up to 30 days. Currency is the Belize Dollar (BZD), pegged 2:1 to USD. US dollars are accepted everywhere.',
    ],
  },
  {
    title: 'Ambergris Caye & San Pedro',
    image: 'https://linapoint.com/wp-content/uploads/2022/08/drone-3-scaled.jpg',
    content: [
      'Ambergris Caye is Belize\'s largest island — 25 miles of Caribbean coastline fringed by the world\'s second-largest barrier reef. San Pedro Town is the vibrant hub with restaurants, dive shops, and local markets.',
      'The island runs on island time. Golf carts are the primary transportation. The pace is relaxed, the people are welcoming, and the seafood is incredibly fresh.',
      'Secret Beach on the west side has become a hotspot with calm turquoise waters, beach bars, and restaurants. It\'s about a 30-minute golf cart ride from San Pedro.',
    ],
  },
  {
    title: 'The Belize Barrier Reef',
    image: 'https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-39.jpg',
    content: [
      'A UNESCO World Heritage Site stretching 190 miles along the coast. Hol Chan Marine Reserve and Shark Ray Alley are just minutes from Lina Point — swim with nurse sharks, rays, and sea turtles.',
      'The Great Blue Hole is a bucket-list dive: a 300-foot-deep sinkhole made famous by Jacques Cousteau. Full-day trips depart from San Pedro.',
      'Whether you\'re a beginner snorkeler or an advanced diver, Belize\'s reef system offers world-class underwater experiences year-round.',
    ],
  },
  {
    title: 'Beyond the Beach',
    image: 'https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-55.jpg',
    content: [
      'Belize is much more than beaches. Ancient Maya cities like Lamanai and Xunantunich are accessible as day trips. Explore jungle zip-lines, cave tubing, and howler monkey sanctuaries.',
      'The Belizean Creole culture is rich with music, storytelling, and cuisine. Try rice & beans with stew chicken, fry jacks for breakfast, and fresh conch ceviche.',
      'For wildlife enthusiasts: Belize has jaguars, tapirs (the national animal), manatees, and over 500 bird species.',
    ],
  },
  {
    title: 'When to Visit',
    image: 'https://linapoint.com/wp-content/uploads/2017/12/night-view.jpg',
    content: [
      'Dry season (November–April): Warm days (80–88°F), cool evenings, low humidity. Peak tourist season with higher rates.',
      'Wet season (May–October): Occasional rainfall (usually brief), lush green landscapes, fewer crowds, and better rates. Water stays warm (79–84°F) year-round.',
      'Best months for diving: March–June (whale sharks in Gladden Spit). Best for budget: September–October. Best weather: February–April.',
    ],
  },
];

export default function BelizeGuidePage() {
  const guideJsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelGuide",
    name: "Belize Travel Guide — Ambergris Caye & San Pedro",
    description:
      "Complete guide to traveling Belize, Ambergris Caye, the Barrier Reef, and more.",
    author: {
      "@type": "Organization",
      name: "Lina Point Belize Overwater Resort",
    },
    about: {
      "@type": "Place",
      name: "Ambergris Caye, Belize",
      geo: { "@type": "GeoCoordinates", latitude: "17.9214", longitude: "-87.9611" },
    },
    url: "https://linapoint.com/guides/belize",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://linapoint.com" },
      { "@type": "ListItem", position: 2, name: "Guides", item: "https://linapoint.com/guides/belize" },
      { "@type": "ListItem", position: 3, name: "Belize", item: "https://linapoint.com/guides/belize" },
    ],
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guideJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <Image
          src="https://linapoint.com/wp-content/uploads/2022/08/drone-2-scaled.jpg"
          alt="Aerial view of Ambergris Caye, Belize"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6">
          <p className="text-[10px] tracking-[0.5em] uppercase text-white/60 mb-4">
            Destination Guide
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-bold">
            Belize Travel Guide
          </h1>
          <p className="font-display text-lg italic text-white/60 mt-3 max-w-xl">
            Everything you need to know about Ambergris Caye, San Pedro, and
            the Caribbean coast
          </p>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6 space-y-24">
          {SECTIONS.map((section, i) => (
            <div
              key={section.title}
              className={`flex flex-col ${
                i % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'
              } gap-10 items-center`}
            >
              <div className="md:w-1/2">
                <div className="relative h-72 md:h-80 rounded-xl overflow-hidden">
                  <Image
                    src={section.image}
                    alt={section.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
              <div className="md:w-1/2">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                  {section.title}
                </h2>
                <div className="space-y-4">
                  {section.content.map((para, j) => (
                    <p key={j} className="text-gray-600 leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Facts */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-display text-2xl font-bold text-gray-900 text-center mb-10">
            Belize Quick Facts
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: '🌡️', label: 'Temperature', value: '79–88°F' },
              { icon: '💰', label: 'Currency', value: 'BZD (2:1 USD)' },
              { icon: '🗣️', label: 'Language', value: 'English' },
              { icon: '✈️', label: 'Flight Time', value: '2–4h from US' },
              { icon: '🌊', label: 'Water Temp', value: '79–84°F' },
              { icon: '🤿', label: 'Visibility', value: '60–100 ft' },
              { icon: '📋', label: 'Visa', value: 'Not Required' },
              { icon: '⏰', label: 'Time Zone', value: 'CST (UTC-6)' },
            ].map((fact) => (
              <div key={fact.label} className="p-4">
                <span className="text-2xl block mb-2">{fact.icon}</span>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  {fact.label}
                </p>
                <p className="font-semibold text-gray-900">{fact.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sky-700 py-16 text-center text-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-bold mb-4">
            Ready to Experience Belize?
          </h2>
          <p className="text-white/70 mb-8">
            Book direct at Lina Point and save at least 6% compared to any OTA.
            Your overwater paradise awaits.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/booking"
              className="bg-white text-sky-700 px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold hover:bg-white/90 transition"
            >
              Book Direct & Save
            </Link>
            <Link
              href="/rooms"
              className="border-2 border-white/30 hover:bg-white/10 px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition"
            >
              View Rooms
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
