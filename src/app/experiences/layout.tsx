import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Experiences | Lina Point Overwater Resort",
  description: "Discover curated Belize adventures — snorkeling the Barrier Reef, Maya ruins tours, sunset sailing, and bespoke island experiences.",
};

export default function ExperiencesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
