export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-white animate-pulse">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm space-y-6">
          <div className="text-center space-y-3">
            <div className="h-10 w-10 bg-sky-100 rounded-full mx-auto" />
            <div className="h-6 w-40 bg-gray-200 rounded mx-auto" />
            <div className="h-3 w-56 bg-gray-100 rounded mx-auto" />
          </div>
          <div className="space-y-4">
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-11 bg-gray-50 rounded-lg border border-gray-100" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-11 bg-gray-50 rounded-lg border border-gray-100" />
            <div className="h-11 bg-sky-100 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
