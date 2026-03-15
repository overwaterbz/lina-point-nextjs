import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Concierge | Lina Point Overwater Resort",
  description: "Chat with our AI concierge for personalized help with bookings, local recommendations, and island excursions at Lina Point.",
};

export default function ConciergeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
