export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* Navbar skeleton */}
      <div className="h-16 bg-slate-100" />

      {/* Hero skeleton */}
      <div className="h-[70vh] bg-slate-200" />

      {/* Content skeleton */}
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3">
          <div className="h-8 w-64 bg-slate-200 rounded mx-auto" />
          <div className="h-4 w-96 bg-slate-100 rounded mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-48 bg-slate-200 rounded-xl" />
              <div className="h-5 w-3/4 bg-slate-200 rounded" />
              <div className="h-4 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
