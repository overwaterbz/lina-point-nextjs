export default function ConciergeLoading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      <div className="pt-32 pb-16 bg-gradient-to-b from-sky-50 to-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="h-3 w-32 bg-sky-100 rounded mx-auto mb-4" />
          <div className="h-10 w-56 bg-gray-200 rounded mx-auto mb-4" />
          <div className="h-4 w-72 bg-gray-100 rounded mx-auto" />
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-6">
        <div className="h-64 bg-gray-50 rounded-xl border border-gray-100" />
        <div className="h-12 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}
