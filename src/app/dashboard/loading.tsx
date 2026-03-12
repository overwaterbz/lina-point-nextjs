export default function DashboardLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="h-16 bg-slate-100" />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="h-8 w-56 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl" />
        <div className="h-48 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}
