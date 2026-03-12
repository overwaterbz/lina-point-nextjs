export default function TrustBadges() {
  const badges = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Best Price Guarantee',
      desc: '6% below any OTA — verified daily',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Secure Payments',
      desc: 'Stripe & Square encrypted checkout',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      title: '24/7 WhatsApp Support',
      desc: 'AI concierge + human team',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
      {badges.map((b) => (
        <div
          key={b.title}
          className="flex items-start gap-3 bg-white/80 rounded-lg p-4 border border-gray-100"
        >
          <div className="text-sky-600 flex-shrink-0 mt-0.5">{b.icon}</div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{b.title}</p>
            <p className="text-gray-500 text-xs">{b.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
