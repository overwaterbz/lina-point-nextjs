"use client";

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import Navbar from "@/components/resort/Navbar";
import Footer from "@/components/resort/Footer";
import SectionHeading from "@/components/resort/SectionHeading";
import WhyBookDirect from "@/components/WhyBookDirect";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";

const ROOMS = [
  {
    name: "2nd Floor Hotel Suite",
    slug: "2nd-floor-suite",
    tagline: "Premium Elevated Living",
    price: 130,
    description:
      "Elevated luxury with expanded living space in the main building, second floor. Floor-to-ceiling windows frame the turquoise Caribbean, while your private balcony offers the perfect spot for morning coffee or evening cocktails. Four suites named Bonefish, Snook, Tarpon, and Permit.",
    features: [
      "Panoramic reef views",
      "Expanded living area",
      "Private balcony with loungers",
      "Queen-size bed",
      "Soaking tub with ocean view",
      "Bluetooth speaker system",
      "Smart TV & Wi-Fi",
      "Complimentary snorkel gear",
    ],
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/suite-2nd-floor.jpg",
    gallery: [
      "https://linapoint.com/wp-content/uploads/2022/08/spa-6.jpg",
      "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-55.jpg",
      "https://linapoint.com/wp-content/uploads/2022/08/drone-3-scaled.jpg",
    ],
    accent: "from-cyan-600 to-cyan-700",
    badge: null,
  },
  {
    name: "1st Floor Hotel Suite",
    slug: "1st-floor-suite",
    tagline: "Main Building Luxury",
    price: 150,
    description:
      "Spacious ground-floor suites in the main building with direct ocean views and beach access. Generous living space and top-tier amenities. Four suites named Baracuda, Snapper, Jack, and Grouper.",
    features: [
      "Direct beach access",
      "Full kitchen",
      "Two bedrooms",
      "Private patio & grill",
      "Washer & dryer",
      "Family-size living room",
      "Smart TV & Wi-Fi",
      "Complimentary kayaks",
    ],
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/suite-1st-floor.jpg",
    gallery: [
      "https://linapoint.com/wp-content/uploads/2017/12/day-view.jpg",
      "https://linapoint.com/wp-content/uploads/2022/08/conch-21-1.jpg",
      "https://linapoint.com/wp-content/uploads/2022/08/drone-4-1-scaled.jpg",
    ],
    accent: "from-teal-500 to-teal-600",
    badge: null,
  },
  {
    name: "1 Bed Overwater Cabana (Duplex)",
    slug: "overwater-cabana-duplex",
    tagline: "Overwater Island Living",
    price: 250,
    description:
      "Duplex-style overwater cabanas offering the quintessential Caribbean experience. Glass bottom floor panels reveal the reef below, with a private deck and direct sea access. Six duplex units share the iconic overwater pier.",
    features: [
      "Glass bottom floor panels",
      "Private overwater deck",
      "Direct sea ladder access",
      "King-size bed",
      "Outdoor rain shower",
      "Mini bar & coffee station",
      "Smart TV & Wi-Fi",
      "In-room safe",
    ],
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/cabana-duplex.jpg",
    gallery: [
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/cabana-duplex-bed.jpg",
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/cabana-duplex-pool.jpg",
      "https://linapoint.com/wp-content/uploads/2017/12/night-view.jpg",
    ],
    accent: "from-amber-500 to-amber-600",
    badge: "Most Popular",
  },
  {
    name: "1 Bedroom Overwater Cabana",
    slug: "overwater-cabana",
    tagline: "Our Signature Experience",
    price: 300,
    description:
      "The standalone overwater cabana — the most private accommodation at Lina Point. Enjoy unobstructed 360° ocean views, a spacious private deck with hammock, and the sound of waves beneath you as you drift to sleep.",
    features: [
      "Standalone private cabana",
      "Glass bottom floor panels",
      "Extra-large overwater deck",
      "King-size bed",
      "Outdoor rain shower",
      "Full mini bar & espresso",
      "Smart TV & Wi-Fi",
      "In-room safe",
    ],
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/cabana-1br-exterior.jpeg",
    gallery: [
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/cabana-duplex.jpg",
      "https://linapoint.com/wp-content/uploads/2017/12/night-view.jpg",
      "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-39.jpg",
    ],
    accent: "from-orange-500 to-orange-600",
    badge: "Premium",
  },
  {
    name: "2 Bedroom Overwater Cabana",
    slug: "2br-overwater-cabana",
    tagline: "Family Overwater Paradise",
    price: 400,
    description:
      "The ultimate family overwater experience. Two separate bedrooms, a full kitchenette, and the largest private deck at the resort. Perfect for families or groups wanting premium overwater living with extra space.",
    features: [
      "Two bedrooms",
      "Glass bottom floor panels",
      "Largest private deck",
      "Kitchenette",
      "Outdoor rain shower",
      "Full mini bar & espresso",
      "Smart TV & Wi-Fi",
      "In-room safe",
    ],
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/cabana-2br-exterior.jpeg",
    gallery: [
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/cabana-2br-bedroom.jpg",
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/cabana-2br-living.JPG",
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/cabana-2br-pool.JPG",
    ],
    accent: "from-rose-500 to-rose-600",
    badge: "Family Favorite",
  },
];

function RoomCard({ room, index }: { room: (typeof ROOMS)[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const isReversed = index % 2 === 1;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: 0.1 }}
      className={`grid md:grid-cols-2 gap-8 md:gap-14 items-center ${isReversed ? "md:[direction:rtl]" : ""}`}
    >
      {/* Image block */}
      <div className={`relative ${isReversed ? "md:[direction:ltr]" : ""}`}>
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
          <Image
            src={room.image}
            alt={room.name}
            fill
            className="object-cover"
          />
          {room.badge && (
            <span
              className={`absolute top-4 left-4 bg-gradient-to-r ${room.accent} text-white text-[10px] tracking-[0.2em] uppercase font-bold px-4 py-1.5 rounded-full shadow-lg`}
            >
              {room.badge}
            </span>
          )}
        </div>
        {/* Mini gallery */}
        <div className="flex gap-2 mt-3">
          {room.gallery.map((src, i) => (
            <div
              key={i}
              className="relative flex-1 aspect-[3/2] rounded-lg overflow-hidden"
            >
              <Image
                src={src}
                alt={`${room.name} view ${i + 1}`}
                fill
                className="object-cover hover:scale-110 transition-transform duration-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className={isReversed ? "md:[direction:ltr]" : ""}>
        <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-3">
          {room.tagline}
        </p>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          {room.name}
        </h2>
        <p className="text-gray-500 leading-relaxed mb-8">{room.description}</p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {room.features.map((f) => (
            <div
              key={f}
              className="flex items-center gap-2.5 text-sm text-gray-700"
            >
              <span className="w-1.5 h-1.5 bg-cyan-600 rounded-full flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>

        <div className="flex items-end gap-6 mb-8">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              From
            </span>
            <p className="font-display text-4xl font-bold text-gray-900">
              ${room.price}
              <span className="text-base font-normal text-gray-400 ml-1">
                /night
              </span>
            </p>
          </div>
        </div>

        <Link
          href={`/booking?room=${room.slug}`}
          className={`inline-block bg-gradient-to-r ${room.accent} text-white px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition shadow-lg hover:shadow-xl hover:brightness-110`}
        >
          Reserve This Room
        </Link>
      </div>
    </motion.div>
  );
}

const roomsJsonLd = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: "Lina Point Belize Overwater Resort",
  url: "https://linapoint.com/rooms",
  makesOffer: ROOMS.map((room) => ({
    "@type": "Offer",
    name: room.name,
    description: room.description,
    price: room.price,
    priceCurrency: "USD",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: room.price,
      priceCurrency: "USD",
      unitText: "night",
    },
    url: `https://linapoint.com/booking?room=${room.slug}`,
    itemOffered: {
      "@type": "HotelRoom",
      name: room.name,
      description: room.description,
      image: room.image,
      amenityFeature: room.features.map((f) => ({
        "@type": "LocationFeatureSpecification",
        name: f,
      })),
    },
  })),
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://linapoint.com",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Rooms",
      item: "https://linapoint.com/rooms",
    },
  ],
};

export default function RoomsPage() {
  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(roomsJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <Image
          src="https://linapoint.com/wp-content/uploads/2017/12/day-view.jpg"
          alt="Overwater rooms at Lina Point"
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
            Accommodations
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-display text-4xl md:text-6xl font-bold"
          >
            Stay Overwater
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="font-display text-lg italic text-white/60 mt-3"
          >
            Where the Caribbean is your floor
          </motion.p>
        </div>
      </section>

      {/* Room Listings */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 space-y-28">
          {ROOMS.map((room, i) => (
            <RoomCard key={room.slug} room={room} index={i} />
          ))}
        </div>
      </section>

      {/* Why Book Direct */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-white to-teal-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <WhyBookDirect />
          <div className="text-center mt-8">
            <Link
              href="/booking"
              className="inline-block bg-teal-600 hover:bg-teal-700 text-white px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition shadow-lg"
            >
              Compare OTA Prices & Book Direct
            </Link>
          </div>
        </div>
      </section>

      {/* Common Amenities */}
      <section className="bg-gray-50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="Included in Every Stay"
            title="Resort-Wide Amenities"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              {
                icon: "\u{1F3CA}",
                label: "Infinity Pool",
                desc: "Overwater with ocean views",
              },
              {
                icon: "\u{1F37D}\uFE0F",
                label: "Hooked Rooftop",
                desc: "360\u00B0 restaurant & bar",
              },
              {
                icon: "\u{1F486}",
                label: "Spa Services",
                desc: "Massage & wellness",
              },
              {
                icon: "\u{1F6A4}",
                label: "Tour Desk",
                desc: "Daily excursion booking",
              },
              {
                icon: "\u{1F4F6}",
                label: "Free Wi-Fi",
                desc: "Resort-wide coverage",
              },
              {
                icon: "\u{1F6CD}\uFE0F",
                label: "Concierge",
                desc: "24/7 WhatsApp support",
              },
              {
                icon: "\u{1F3B6}",
                label: "Live Music",
                desc: "Weekend entertainment",
              },
              {
                icon: "\u{1F374}",
                label: "Room Service",
                desc: "Fresh Belizean cuisine",
              },
            ].map((a) => (
              <div key={a.label} className="p-6">
                <span className="text-3xl block mb-3">{a.icon}</span>
                <p className="font-semibold text-gray-900 text-sm mb-1">
                  {a.label}
                </p>
                <p className="text-gray-400 text-xs">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-cyan-800 py-16 text-center text-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Not Sure Which Room?
          </h2>
          <p className="text-white/60 mb-8">
            Let our AI concierge help you pick the perfect accommodation based
            on your travel style, group size, and budget.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/concierge"
              className="bg-white text-cyan-800 px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold hover:bg-white/90 transition"
            >
              Ask Concierge
            </Link>
            <Link
              href="/booking"
              className="border-2 border-white/30 hover:bg-white/10 px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition"
            >
              Book Directly
            </Link>
          </div>
        </div>
      </section>

      <TestimonialsCarousel />

      <Footer />
    </main>
  );
}
