// SmartGallery.tsx
// AI-powered gallery with auto-tagging and curation
import React, { useEffect, useState } from "react";
import { tagAndDescribeImage } from "../src/lib/aiImageTagger";

interface GalleryImage {
  url: string;
  tags: string[];
  description: string;
}

interface SmartGalleryProps {
  images: { url: string }[];
  context?: string;
}

export const SmartGallery: React.FC<SmartGalleryProps> = ({
  images,
  context,
}) => {
  const [taggedImages, setTaggedImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    async function processImages() {
      const results: GalleryImage[] = [];
      for (const img of images) {
        const tagsAndDesc = await tagAndDescribeImage(img.url, context);
        results.push({ url: img.url, ...tagsAndDesc });
      }
      // Sort: prioritize images with 'guest', 'view', 'pool', 'sunset', etc.
      results.sort((a, b) => {
        const priority = (tags: string[]) =>
          tags.some((t) =>
            ["guest", "view", "pool", "sunset", "family", "honeymoon"].includes(
              t.toLowerCase(),
            ),
          )
            ? -1
            : 1;
        return priority(a.tags) - priority(b.tags);
      });
      setTaggedImages(results);
    }
    processImages();
  }, [images, context]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {taggedImages.map((img, i) => (
        <figure key={img.url} className="relative group">
          <img
            src={img.url}
            alt={img.description}
            className="rounded shadow-lg object-cover w-full h-64"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/images/fallback-gallery.jpg";
            }}
          />
          <figcaption className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition">
            {img.description}{" "}
            <span className="block mt-1">{img.tags.join(", ")}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
};
