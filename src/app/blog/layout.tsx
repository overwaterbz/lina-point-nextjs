import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Lina Point Belize Overwater Resort",
  description:
    "Travel tips, destination guides, and insider stories from Lina Point Resort on Ambergris Caye, Belize.",
  openGraph: {
    title: "Blog | Lina Point Belize",
    description:
      "Travel tips, Belize guides, and resort stories from the Caribbean's premier overwater resort.",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
