export default function RoomsLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="h-16 bg-slate-100" />
      <div className="h-64 bg-slate-200" />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden">
              <div className="h-56 bg-slate-200" />
              <div className="p-6 space-y-3">
                <div className="h-6 w-48 bg-slate-200 rounded" />
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
                <div className="h-10 w-32 bg-slate-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
