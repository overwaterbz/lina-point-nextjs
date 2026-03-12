import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rooms & Suites | Lina Point Belize Overwater Resort",
  description:
    "Explore overwater cabanas with glass bottom floors, 2nd floor suites with reef views, and premium 1st floor suites. From $199/night — book direct and save 6% vs OTAs.",
  openGraph: {
    title: "Rooms & Suites | Lina Point Belize",
    description:
      "Overwater cabanas, elevated suites & premium beachfront rooms. Direct booking saves 6% vs Expedia.",
    images: [
      "https://linapoint.com/wp-content/uploads/2022/08/anniversary_cabana-10-1-scaled.jpg",
    ],
  },
};

export default function RoomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
