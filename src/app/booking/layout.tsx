import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Your Stay | Lina Point Overwater Resort",
  description: "Book direct at Lina Point for guaranteed best rates — overwater cabanas and suites on the Belize Barrier Reef with instant confirmation.",
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
