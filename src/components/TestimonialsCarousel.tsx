'use client';

import { useState, useEffect } from 'react';

interface Testimonial {
  name: string;
  location: string;
  rating: number;
  text: string;
}

const CURATED: Testimonial[] = [
  {
    name: 'Sarah M.',
    location: 'Austin, TX',
    rating: 5,
    text: 'Waking up to fish swimming beneath our glass floor was magical. The rooftop restaurant sunset dinner was unforgettable.',
  },
  {
    name: 'James & Laura K.',
    location: 'London, UK',
    rating: 5,
    text: 'Best anniversary trip ever. The concierge arranged a private snorkeling tour that blew us away. Already planning our return.',
  },
  {
    name: 'Maria C.',
    location: 'Toronto, Canada',
    rating: 5,
    text: "The infinity pool overlooking the reef is everything the photos promise and more. Lina Point truly is a hidden gem.",
  },
  {
    name: 'David & Priya R.',
    location: 'San Francisco, CA',
    rating: 5,
    text: "From the moment we stepped on the bridge, every detail felt intentional. The spa treatments with ocean views were the highlight.",
  },
  {
    name: 'Tom B.',
    location: 'Sydney, Australia',
    rating: 5,
    text: 'Traveled all over the Caribbean — nothing compares to Lina Point. The overwater experience here is world class.',
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 mb-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < count ? 'text-amber-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsCarousel() {
  const [current, setCurrent] = useState(0);
  const testimonials = CURATED;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  return (
    <section className="py-16 bg-sky-50/50">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Guest Experiences
        </h2>
        <p className="text-gray-500 mb-10">What our guests are saying</p>

        <div className="relative min-h-[180px]">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-700 ${
                i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <Stars count={t.rating} />
              <blockquote className="text-lg md:text-xl text-gray-700 italic leading-relaxed mb-4">
                &ldquo;{t.text}&rdquo;
              </blockquote>
              <p className="font-semibold text-gray-900">{t.name}</p>
              <p className="text-sm text-gray-500">{t.location}</p>
            </div>
          ))}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === current ? 'bg-sky-600' : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Show testimonial ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
