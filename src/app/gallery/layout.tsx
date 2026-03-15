import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery | Lina Point Overwater Resort",
  description: "Explore stunning photos of Lina Point — glass-floor overwater cabanas, Caribbean sunsets, and the Belize Barrier Reef.",
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
