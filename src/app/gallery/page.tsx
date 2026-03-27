"use client";

import { motion, AnimatePresence, useInView } from "framer-motion";
import Image from "next/image";
import { useRef, useState, useCallback } from "react";
import Navbar from "@/components/resort/Navbar";
import Footer from "@/components/resort/Footer";

/* ── Gallery images organized by category ── */
const IMAGES = [
  {
    src: "https://linapoint.com/wp-content/uploads/2022/08/drone-2-scaled.jpg",
    alt: "Aerial view of Lina Point Resort",
    cat: "resort",
    span: "col-span-2 row-span-2",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2022/08/anniversary_cabana-10-1-scaled.jpg",
    alt: "Overwater cabana at sunset",
    cat: "rooms",
    span: "",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2017/12/21557862_842375785930679_1662415238731283244_n.jpg",
    alt: "Hooked Rooftop restaurant",
    cat: "dining",
    span: "",
  },
  {
    src: "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/images/LinaPoint-55.jpg",
    alt: "Infinity pool overlooking the reef",
    cat: "resort",
    span: "",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2022/08/greatwhiteshark-19.jpg",
    alt: "Snorkeling the barrier reef",
    cat: "experiences",
    span: "",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2017/12/day-view.jpg",
    alt: "Overwater cabanas by day",
    cat: "rooms",
    span: "col-span-2",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2022/08/spa-6.jpg",
    alt: "Spa treatment with ocean view",
    cat: "resort",
    span: "",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2022/08/conch-21-1.jpg",
    alt: "Fresh conch ceviche",
    cat: "dining",
    span: "",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2022/08/drone-3-scaled.jpg",
    alt: "Resort from above",
    cat: "resort",
    span: "col-span-2 row-span-2",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2022/08/anniversary_cabana-8-scaled.jpg",
    alt: "Cabana interior",
    cat: "rooms",
    span: "",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2022/08/spa-5.jpg",
    alt: "Wellness and relaxation",
    cat: "resort",
    span: "",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2017/12/night-view.jpg",
    alt: "Lina Point at night",
    cat: "resort",
    span: "col-span-2",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-39.jpg",
    alt: "Resort deck and walkway",
    cat: "resort",
    span: "",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-64.jpg",
    alt: "Overwater suites",
    cat: "rooms",
    span: "",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2022/08/drone-4-1-scaled.jpg",
    alt: "Bird's eye view of the resort",
    cat: "resort",
    span: "",
  },
  {
    src: "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-41.jpg",
    alt: "1st floor suite exterior",
    cat: "rooms",
    span: "",
  },
];

type Category = "all" | "resort" | "rooms" | "dining" | "experiences";

const TABS: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "resort", label: "Resort" },
  { key: "rooms", label: "Rooms" },
  { key: "dining", label: "Dining" },
  { key: "experiences", label: "Experiences" },
];

function GalleryImage({
  img,
  index,
  onClick,
}: {
  img: (typeof IMAGES)[0];
  index: number;
  onClick: () => void;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.4) }}
      className={`relative rounded-lg overflow-hidden cursor-pointer group ${img.span}`}
      onClick={onClick}
    >
      <Image
        src={img.src}
        alt={img.alt}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-white text-3xl">&#x2295;</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4">
        <p className="text-white text-sm font-medium">{img.alt}</p>
      </div>
    </motion.div>
  );
}

export default function GalleryPage() {
  const [category, setCategory] = useState<Category>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered =
    category === "all" ? IMAGES : IMAGES.filter((img) => img.cat === category);
  const lightboxImages = filtered;

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const goNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % lightboxImages.length : null,
    );
  }, [lightboxImages.length]);
  const goPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null
        ? (prev - 1 + lightboxImages.length) % lightboxImages.length
        : null,
    );
  }, [lightboxImages.length]);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative h-[50vh] min-h-[350px] overflow-hidden">
        <Image
          src="https://linapoint.com/wp-content/uploads/2022/08/drone-4-1-scaled.jpg"
          alt="Lina Point aerial gallery"
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
            Visual Journey
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-display text-4xl md:text-6xl font-bold"
          >
            Photo Gallery
          </motion.h1>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          {/* Category tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCategory(tab.key)}
                className={`px-6 py-2.5 rounded-full text-xs tracking-[0.15em] uppercase font-semibold transition ${
                  category === tab.key
                    ? "bg-cyan-700 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Masonry grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={category}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[180px] md:auto-rows-[220px]"
            >
              {filtered.map((img, i) => (
                <GalleryImage
                  key={img.src}
                  img={img}
                  index={i}
                  onClick={() => setLightboxIndex(i)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && lightboxImages[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99] bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 text-white/60 hover:text-white text-3xl z-10 transition"
              aria-label="Close"
            >
              &times;
            </button>

            {/* Nav arrows */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 md:left-8 text-white/40 hover:text-white text-4xl z-10 transition"
              aria-label="Previous"
            >
              &#8249;
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 md:right-8 text-white/40 hover:text-white text-4xl z-10 transition"
              aria-label="Next"
            >
              &#8250;
            </button>

            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-[90vw] h-[80vh] max-w-6xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={lightboxImages[lightboxIndex].src}
                alt={lightboxImages[lightboxIndex].alt}
                fill
                className="object-contain"
              />
              <p className="absolute bottom-4 left-0 right-0 text-center text-white/60 text-sm">
                {lightboxImages[lightboxIndex].alt}
                <span className="ml-3 text-white/30">
                  {lightboxIndex + 1} / {lightboxImages.length}
                </span>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}
