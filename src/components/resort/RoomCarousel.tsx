"use client";

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

export interface RoomType {
  name: string;
  slug: string;
  tagline: string;
  price: string;
  image: string;
  highlights: string[];
}

const ROOMS: RoomType[] = [
  {
    name: "2nd Floor Hotel Suite",
    slug: "2nd-floor-suite",
    tagline: "Elevated luxury on the barrier reef",
    price: "From $130/night",
    image: "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-64.jpg",
    highlights: ["Premium Furnishings", "Reef Views", "Balcony"],
  },
  {
    name: "1st Floor Hotel Suite",
    slug: "1st-floor-suite",
    tagline: "Spacious main building luxury",
    price: "From $150/night",
    image: "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-41.jpg",
    highlights: ["Ground Floor", "Beach Access", "Full Amenities"],
  },
  {
    name: "1 Bed Duplex Cabana",
    slug: "overwater-cabana-duplex",
    tagline: "Glass bottom floors meet Caribbean sunrise",
    price: "From $250/night",
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/cabana-duplex.jpg",
    highlights: ["Glass Bottom Floor", "Private Deck", "Ocean View"],
  },
  {
    name: "1 Bedroom Cabana",
    slug: "overwater-cabana",
    tagline: "Our signature standalone overwater experience",
    price: "From $300/night",
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/cabana-1br-exterior.jpeg",
    highlights: ["Standalone", "Private Deck", "360° Ocean View"],
  },
  {
    name: "2 Bedroom Cabana",
    slug: "2br-overwater-cabana",
    tagline: "Family overwater paradise",
    price: "From $400/night",
    image: "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-39.jpg",
    highlights: ["Two Bedrooms", "Largest Deck", "Kitchenette"],
  },
];

export default function RoomCarousel() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div
      ref={ref}
      className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide"
    >
      {ROOMS.map((room, i) => (
        <motion.div
          key={room.slug}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: i * 0.15 }}
          className="snap-center shrink-0 w-[85vw] md:w-[400px] group"
        >
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-xl">
            <Image
              src={room.image}
              alt={room.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-amber-400 text-xs tracking-[0.2em] uppercase font-semibold mb-2">
                {room.price}
              </p>
              <h3 className="text-white font-display text-2xl font-bold mb-1">
                {room.name}
              </h3>
              <p className="text-white/60 text-sm mb-4">{room.tagline}</p>

              <div className="flex flex-wrap gap-2 mb-5">
                {room.highlights.map((h) => (
                  <span
                    key={h}
                    className="text-[10px] tracking-wider uppercase bg-white/15 text-white/80 px-3 py-1 rounded-full"
                  >
                    {h}
                  </span>
                ))}
              </div>

              <Link
                href={`/booking?room=${encodeURIComponent(room.slug)}`}
                className="inline-block bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded text-xs tracking-[0.2em] uppercase font-semibold transition"
              >
                Book This Room
              </Link>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export { ROOMS };
