export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🏝️</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          You&apos;re Offline
        </h1>
        <p className="text-slate-600 mb-8">
          Looks like you&apos;ve gone off the grid — just like island life.
          Check your connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );
}
