export default function AdminLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-slate-50">
      <div className="h-16 bg-white border-b border-slate-200" />
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
        <div className="h-80 bg-white rounded-xl border border-slate-200" />
      </div>
    </div>
  );
}
