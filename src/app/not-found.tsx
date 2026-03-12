import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="text-8xl mb-4 font-bold text-sky-200">404</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3 font-[family-name:var(--font-playfair)]">
          Lost at Sea
        </h1>
        <p className="text-slate-600 mb-8 text-lg">
          This page drifted away with the tide. Let&apos;s get you back to the resort.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium"
          >
            Back to Lina Point
          </Link>
          <Link
            href="/rooms"
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            View Rooms
          </Link>
          <Link
            href="/booking"
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Book a Stay
          </Link>
        </div>
      </div>
    </div>
  );
}
