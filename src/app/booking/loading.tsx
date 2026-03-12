export default function BookingLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="h-16 bg-slate-100" />
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="h-10 w-72 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="h-12 bg-slate-200 rounded-lg" />
            <div className="h-12 bg-slate-200 rounded-lg" />
            <div className="h-12 bg-slate-200 rounded-lg" />
          </div>
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
