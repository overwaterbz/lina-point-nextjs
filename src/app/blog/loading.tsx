export default function BlogLoading() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navbar placeholder */}
      <div className="h-16 bg-white border-b border-gray-100" />

      {/* Hero skeleton */}
      <section className="bg-gradient-to-b from-sky-50 to-white pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="h-3 w-24 bg-gray-200 rounded mx-auto mb-4 animate-pulse" />
          <div className="h-10 w-80 bg-gray-200 rounded mx-auto mb-4 animate-pulse" />
          <div className="h-4 w-96 bg-gray-100 rounded mx-auto animate-pulse" />
        </div>
      </section>

      {/* Grid skeleton */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-100 overflow-hidden"
            >
              <div className="h-48 bg-gray-200 animate-pulse" />
              <div className="p-6 space-y-3">
                <div className="h-2 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
