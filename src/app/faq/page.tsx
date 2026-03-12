import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/resort/Navbar';
import Footer from '@/components/resort/Footer';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | Lina Point Belize Overwater Resort',
  description:
    'Find answers about booking, rooms, activities, travel to Belize, and more at Lina Point Overwater Resort on Ambergris Caye.',
};

const FAQS = [
  {
    question: 'How do I get to Lina Point Resort?',
    answer:
      'Fly into Philip S.W. Goldson International Airport (BZE) in Belize City, then take a short 20-minute domestic flight to San Pedro on Ambergris Caye. We offer complimentary boat transfers from the San Pedro airstrip to the resort.',
  },
  {
    question: 'Why should I book direct instead of through an OTA?',
    answer:
      'Booking direct at lina-point.com guarantees you at least 6% savings compared to Expedia, Booking.com, or Agoda. Plus you get exclusive perks: use promo code DIRECT10 for 10% off your first stay, earn loyalty points toward free nights, and enjoy flexible cancellation policies.',
  },
  {
    question: 'What types of rooms are available?',
    answer:
      'We offer three room types: Overwater Cabanas (from $199/night) with glass bottom floors and private decks, 2nd Floor Suites (from $249/night) with panoramic reef views, and 1st Floor Suites (from $299/night) with full kitchens and direct beach access.',
  },
  {
    question: 'What is the best time to visit Belize?',
    answer:
      'Belize is wonderful year-round! The dry season (November–April) is the most popular, with warm days and cool evenings. The wet season (May–October) offers lower rates, lush landscapes, and fewer crowds. Water temperature stays between 79–84°F all year.',
  },
  {
    question: 'Do I need a visa to visit Belize?',
    answer:
      'US, Canadian, UK, and EU citizens do not need a visa for stays up to 30 days. You just need a valid passport with at least 6 months remaining validity.',
  },
  {
    question: 'What activities are available at the resort?',
    answer:
      'Activities include snorkeling the Belize Barrier Reef (the second largest in the world), diving the Great Blue Hole, kayaking through mangroves, paddleboarding, spa treatments, rooftop dining at Hooked restaurant, and guided island tours. Our AI concierge can customize your itinerary.',
  },
  {
    question: 'Is Wi-Fi available?',
    answer:
      'Yes! Complimentary high-speed Wi-Fi is available throughout the resort, including in all rooms and common areas.',
  },
  {
    question: 'What is included in my stay?',
    answer:
      'Every stay includes access to the overwater infinity pool, complimentary snorkel gear, kayaks, paddleboards, Wi-Fi, 24/7 WhatsApp concierge, and daily housekeeping. Meals, tours, and spa services are available at additional cost.',
  },
  {
    question: 'Do you have a cancellation policy?',
    answer:
      "Direct bookings enjoy flexible cancellation: free cancellation up to 14 days before arrival for a full refund. Cancellations within 14 days receive a 50% refund or full credit toward a future stay. OTA bookings follow the respective platform's policy.",
  },
  {
    question: 'Can I use the resort for events or weddings?',
    answer:
      'Absolutely! Lina Point is a stunning venue for intimate weddings, honeymoons, and group retreats. Our team can coordinate everything from ceremonies on the dock to receptions on the rooftop. Contact us at reservations@linapoint.com for event packages.',
  },
];

export default function FAQPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://lina-point.vercel.app" },
      { "@type": "ListItem", position: 2, name: "FAQ", item: "https://lina-point.vercel.app/faq" },
    ],
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-b from-sky-50 to-white pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-[10px] tracking-[0.5em] uppercase text-sky-600 mb-4">
            Help Center
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Everything you need to know about staying at Lina Point Overwater
            Resort on Ambergris Caye, Belize.
          </p>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 space-y-6">
          {FAQS.map((faq, i) => (
            <details
              key={i}
              className="group border border-gray-200 rounded-lg overflow-hidden"
            >
              <summary className="flex items-center justify-between cursor-pointer px-6 py-5 bg-white hover:bg-gray-50 transition-colors">
                <h2 className="text-left font-semibold text-gray-900 pr-4">
                  {faq.question}
                </h2>
                <span className="text-sky-600 group-open:rotate-45 transition-transform text-xl flex-shrink-0">
                  +
                </span>
              </summary>
              <div className="px-6 pb-5 text-gray-600 leading-relaxed">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sky-700 py-16 text-center text-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-bold mb-4">
            Still Have Questions?
          </h2>
          <p className="text-white/70 mb-8">
            Our AI concierge is available 24/7 on WhatsApp to help with anything
            you need.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/concierge"
              className="bg-white text-sky-700 px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold hover:bg-white/90 transition"
            >
              Ask Concierge
            </Link>
            <Link
              href="/booking"
              className="border-2 border-white/30 hover:bg-white/10 px-10 py-4 rounded text-xs tracking-[0.25em] uppercase font-bold transition"
            >
              Book Direct & Save
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
