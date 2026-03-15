export default function ExperiencesLoading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      <div className="pt-32 pb-16 bg-gradient-to-b from-sky-50 to-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="h-3 w-32 bg-sky-100 rounded mx-auto mb-4" />
          <div className="h-10 w-64 bg-gray-200 rounded mx-auto mb-4" />
          <div className="h-4 w-80 bg-gray-100 rounded mx-auto" />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="h-48 bg-gray-100" />
            <div className="p-6 space-y-3">
              <div className="h-3 w-20 bg-sky-50 rounded" />
              <div className="h-5 w-3/4 bg-gray-200 rounded" />
              <div className="h-3 w-full bg-gray-100 rounded" />
              <div className="h-3 w-2/3 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
