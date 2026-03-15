export default function GalleryLoading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      <div className="pt-32 pb-16 bg-gradient-to-b from-sky-50 to-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="h-3 w-32 bg-sky-100 rounded mx-auto mb-4" />
          <div className="h-10 w-48 bg-gray-200 rounded mx-auto mb-4" />
          <div className="h-4 w-64 bg-gray-100 rounded mx-auto" />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
