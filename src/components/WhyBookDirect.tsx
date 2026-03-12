"use client";

export default function WhyBookDirect({
  savingsExample,
  compact = false,
}: {
  savingsExample?: number;
  compact?: boolean;
}) {
  const cards = [
    {
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "6% Below Any OTA",
      desc: savingsExample
        ? `Save $${savingsExample.toFixed(0)} vs the best price on Expedia, Booking.com, or Agoda`
        : "We scan every OTA and automatically beat the lowest price by 6%",
    },
    {
      icon: (
        <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      title: "Earn Loyalty Points",
      desc: "Earn points on every stay — unlock 5%, 10%, or 15% off as you level up",
    },
    {
      icon: (
        <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: "No Middleman",
      desc: "Book directly with us — no 20% OTA commission inflating your rate",
    },
    {
      icon: (
        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      title: "Exclusive Perks",
      desc: "Early check-in, room upgrades, welcome drinks — perks OTAs can't offer",
    },
    {
      icon: (
        <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      title: "Refer & Earn $50",
      desc: "Share your referral code — you get $50 credit, your friend gets $25 off",
    },
  ];

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-teal-50 to-green-50 border border-teal-200 rounded-xl p-4">
        <h4 className="font-bold text-teal-800 text-sm mb-3">Why Book Direct?</h4>
        <div className="flex flex-wrap gap-2">
          {cards.map((c) => (
            <span
              key={c.title}
              className="inline-flex items-center gap-1.5 text-xs text-teal-700 bg-white px-3 py-1.5 rounded-full border border-teal-100"
            >
              <span className="w-4 h-4 [&>svg]:w-4 [&>svg]:h-4">{c.icon}</span>
              {c.title}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          Why Travelers Book Direct
        </h2>
        <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
          Skip the middleman. We transparently show every OTA price and beat
          them all — because you shouldn&apos;t pay a 20% commission for someone
          else to book your vacation.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white border border-gray-100 rounded-xl p-5 text-center hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-center mb-3">{card.icon}</div>
            <h3 className="font-bold text-gray-900 text-sm">{card.title}</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              {card.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
