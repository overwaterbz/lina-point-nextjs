import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import "@/lib/validateEnv";
import ToasterProvider from "@/components/ToasterProvider";
import WhatsAppButton from "@/components/resort/WhatsAppButton";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lina Point | Overwater Resort in San Pedro, Belize",
  description:
    "Belize's premier overwater resort on Ambergris Caye. Glass bottom floors, infinity pool, Hooked Rooftop restaurant, world-class snorkeling & diving. Book your tropical escape.",
  keywords: [
    "Belize resort",
    "overwater resort",
    "San Pedro Belize",
    "Ambergris Caye",
    "Caribbean vacation",
    "Lina Point",
    "glass bottom floor",
    "barrier reef",
  ],
  openGraph: {
    title: "Lina Point | Overwater Resort in San Pedro, Belize",
    description:
      "Disconnect once you step on the bridge. Reconnect with the magic within at Belize's premier overwater resort.",
    url: "https://lina-point.vercel.app",
    siteName: "Lina Point",
    images: [
      {
        url: "https://linapoint.com/wp-content/uploads/2022/08/drone-2-scaled.jpg",
        width: 1920,
        height: 1080,
        alt: "Lina Point Overwater Resort aerial view",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lina Point | Overwater Resort in San Pedro, Belize",
    description:
      "Disconnect once you step on the bridge. Reconnect with the magic within.",
    images: [
      "https://linapoint.com/wp-content/uploads/2022/08/drone-2-scaled.jpg",
    ],
  },
  metadataBase: new URL("https://lina-point.vercel.app"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.svg" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Hotel",
  name: "Lina Point Belize Overwater Resort",
  description:
    "Premier overwater resort in San Pedro, Ambergris Caye, Belize featuring glass bottom floors, infinity pool, and world-class diving.",
  url: "https://lina-point.vercel.app",
  telephone: "+501-632-7767",
  email: "reservations@linapoint.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "San Pedro",
    addressRegion: "Ambergris Caye",
    addressCountry: "BZ",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "17.9214",
    longitude: "-87.9611",
  },
  image: "https://linapoint.com/wp-content/uploads/2022/08/drone-2-scaled.jpg",
  priceRange: "$$$",
  starRating: { "@type": "Rating", ratingValue: "4.5" },
  amenityFeature: [
    {
      "@type": "LocationFeatureSpecification",
      name: "Overwater Infinity Pool",
    },
    { "@type": "LocationFeatureSpecification", name: "Rooftop Restaurant" },
    { "@type": "LocationFeatureSpecification", name: "Spa Services" },
    { "@type": "LocationFeatureSpecification", name: "Glass Bottom Floors" },
    { "@type": "LocationFeatureSpecification", name: "Free WiFi" },
    { "@type": "LocationFeatureSpecification", name: "Room Service" },
  ],
  sameAs: [
    "https://www.facebook.com/linapointbelize",
    "https://www.instagram.com/linapointsanpedro",
    "https://www.tiktok.com/@linapoint",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Room Types",
    itemListElement: [
      {
        "@type": "Offer",
        name: "2nd Floor Hotel Suite",
        price: "130",
        priceCurrency: "USD",
        url: "https://lina-point.vercel.app/booking?room=2nd-floor-suite",
      },
      {
        "@type": "Offer",
        name: "1st Floor Hotel Suite",
        price: "150",
        priceCurrency: "USD",
        url: "https://lina-point.vercel.app/booking?room=1st-floor-suite",
      },
      {
        "@type": "Offer",
        name: "1 Bed Duplex Cabana",
        price: "250",
        priceCurrency: "USD",
        url: "https://lina-point.vercel.app/booking?room=overwater-cabana-duplex",
      },
      {
        "@type": "Offer",
        name: "1 Bedroom Overwater Cabana",
        price: "300",
        priceCurrency: "USD",
        url: "https://lina-point.vercel.app/booking?room=overwater-cabana",
      },
      {
        "@type": "Offer",
        name: "2 Bedroom Overwater Cabana",
        price: "400",
        priceCurrency: "USD",
        url: "https://lina-point.vercel.app/booking?room=2br-overwater-cabana",
      },
    ],
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "127",
    bestRating: "5",
    worstRating: "1",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0284c7" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-white focus:text-teal-700 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-teal-500"
        >
          Skip to main content
        </a>
        <main id="main-content">{children}</main>
        <WhatsAppButton />
        <ToasterProvider />
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
      </body>
    </html>
  );
}
