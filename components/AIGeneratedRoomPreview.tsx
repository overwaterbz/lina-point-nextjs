// AIGeneratedRoomPreview.tsx
// Component for AI-generated room previews (Stable Diffusion/Midjourney integration)
import React, { useState } from "react";

interface AIGeneratedRoomPreviewProps {
  roomType: string;
  theme: string; // e.g., "honeymoon", "family", "celebration"
}

export default function AIGeneratedRoomPreview({
  roomType,
  theme,
}: AIGeneratedRoomPreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generatePreview() {
    setLoading(true);
    setError(null);
    setImageUrl(null);
    try {
      // Placeholder: Replace with actual API call to Stable Diffusion/Midjourney endpoint
      const prompt = `Lina Point ${roomType} room, styled for ${theme}, luxury, photorealistic, natural light, Caribbean resort`;
      // Example: const response = await fetch('/api/ai/generate-room-image', { method: 'POST', body: JSON.stringify({ prompt }) });
      // const data = await response.json();
      // setImageUrl(data.imageUrl);
      setTimeout(() => {
        setImageUrl(`/images/ai-previews/${roomType}-${theme}.jpg`); // Fallback demo image
        setLoading(false);
      }, 1800);
    } catch (e) {
      setError("Failed to generate preview. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="my-8 p-6 bg-cyan-50 rounded-xl shadow flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">Preview Your Room</h3>
      <p className="mb-4 text-gray-700">
        See what your {roomType} could look like for a {theme} stay!
      </p>
      <button
        className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-semibold mb-4 hover:bg-cyan-700"
        onClick={generatePreview}
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Preview"}
      </button>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={`AI preview of ${roomType} for ${theme}`}
          className="rounded-lg shadow-lg max-w-full h-auto"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/fallback-room.jpg";
          }}
        />
      )}
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );
}
