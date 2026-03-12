-- Blog posts table for AI-generated and manual content
-- The marketing agent crew can publish directly to this table

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author TEXT NOT NULL DEFAULT 'Lina Point Team',
  category TEXT NOT NULL DEFAULT 'travel',
  tags TEXT[] DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast slug lookups and published post listing
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);

-- Seed some initial blog posts for SEO
INSERT INTO blog_posts (slug, title, excerpt, content, cover_image, author, category, tags, meta_title, meta_description, published, published_at)
VALUES
(
  'why-book-direct-overwater-resort-belize',
  'Why You Should Always Book Direct at an Overwater Resort in Belize',
  'Discover how booking direct saves you money, unlocks exclusive perks, and guarantees the best rates at Lina Point Resort.',
  E'## The Direct Booking Advantage\n\nWhen planning a trip to Belize''s stunning overwater resorts, many travelers default to booking through OTAs like Expedia or Booking.com. But here''s what they don''t tell you: **booking direct saves you at least 6%** — and often much more.\n\n### Price Guarantee\n\nAt Lina Point Resort, we guarantee our direct rates beat every OTA by a minimum of 6%. If you find a lower price on Expedia, Booking.com, or Agoda, we''ll match it and give you an additional 5% off.\n\n### Exclusive Perks\n\n- **Promo Code DIRECT10**: Save 10% on your first direct booking\n- **Loyalty Points**: Earn points on every stay toward free nights\n- **Room Upgrades**: Direct bookers get priority for complimentary upgrades\n- **Flexible Cancellation**: More generous policies than OTA bookings\n\n### Why OTAs Cost More\n\nOTAs charge hotels 15-25% commission on every booking. That cost gets passed to you through higher rates or fewer perks. When you book direct, that money stays with us — and we pass the savings to you.\n\n### The Bottom Line\n\nSkip the middleman. Book at [lina-point.com](https://lina-point.vercel.app/booking) and enjoy the best rates, exclusive perks, and direct communication with our team.\n\n*Use promo code **DIRECT10** for 10% off your first booking.*',
  'https://linapoint.com/wp-content/uploads/2022/08/drone-2-scaled.jpg',
  'Lina Point Team',
  'travel-tips',
  ARRAY['direct-booking', 'belize', 'overwater', 'savings'],
  'Why Book Direct at Lina Point Overwater Resort | Save 6%+',
  'Book direct at Lina Point Belize and save at least 6% vs Expedia & Booking.com. Plus exclusive perks, loyalty points, and flexible cancellation.',
  true,
  now()
),
(
  'top-5-things-to-do-ambergris-caye-belize',
  'Top 5 Things to Do on Ambergris Caye, Belize',
  'From snorkeling the Belize Barrier Reef to exploring Secret Beach, here are the must-do experiences on Ambergris Caye.',
  E'## Your Ambergris Caye Adventure Guide\n\nAmbergris Caye is Belize''s largest island and one of the Caribbean''s best-kept secrets. Here are the top 5 experiences you can''t miss.\n\n### 1. Snorkel the Belize Barrier Reef\n\nThe second-largest barrier reef in the world is just minutes from Lina Point. Swim alongside nurse sharks, sea turtles, and vibrant coral formations at Hol Chan Marine Reserve and Shark Ray Alley.\n\n### 2. Visit the Great Blue Hole\n\nA UNESCO World Heritage Site and one of Jacques Cousteau''s top dive spots. This 300-foot-deep sinkhole is a bucket-list experience for divers worldwide. Day trips depart from San Pedro.\n\n### 3. Explore Secret Beach\n\nThe west side of Ambergris Caye features calm, crystal-clear waters perfect for families. Secret Beach has grown into a vibrant scene with beach bars and restaurants.\n\n### 4. Kayak Through Mangroves\n\nPaddle through ancient mangrove channels teeming with wildlife. Spot manatees, crocodiles, and exotic birds in their natural habitat.\n\n### 5. Sunset at Lina Point Rooftop\n\nEnd your day at Hooked — our 360° rooftop restaurant and tiki bar. Watch the sun paint the sky over the Caribbean while enjoying fresh ceviche and craft cocktails.\n\n---\n\n*Stay at Lina Point Resort for easy access to all these experiences. [Book direct](https://lina-point.vercel.app/booking) and save.*',
  'https://linapoint.com/wp-content/uploads/2022/08/drone-3-scaled.jpg',
  'Lina Point Team',
  'destination-guide',
  ARRAY['ambergris-caye', 'belize', 'things-to-do', 'barrier-reef', 'blue-hole'],
  'Top 5 Things to Do on Ambergris Caye | Lina Point Resort',
  'Discover the best activities on Ambergris Caye, Belize — from the Barrier Reef to Secret Beach. Stay at Lina Point for the ultimate island experience.',
  true,
  now()
),
(
  'overwater-bungalow-belize-vs-maldives',
  'Overwater Bungalows: Belize vs. Maldives — Which Is Better Value?',
  'Compare overwater bungalow experiences in Belize and the Maldives on price, accessibility, and adventure.',
  E'## The Overwater Dream: Belize vs. Maldives\n\nOverwater bungalows are the ultimate tropical luxury. But which destination delivers better value?\n\n### Price Comparison\n\n| Factor | Belize (Lina Point) | Maldives |\n|--------|-------------------|----------|\n| Room/Night | From $199 | From $800+ |\n| Flights (from US) | $300-600 | $1,500-3,000 |\n| Travel Time | 2-4 hours | 20-30 hours |\n| Visa | None needed | None needed |\n\n### The Verdict\n\nBelize offers the same overwater magic at a fraction of the cost — and you can get there in a few hours from most US cities.\n\n### Adventure Factor\n\nBelize wins hands down. The Barrier Reef, ancient Maya ruins, jungle tours, and a rich Creole culture make it far more than just a beach destination.\n\n### At Lina Point\n\nOur overwater cabanas start at $199/night with glass bottom floors, private decks, and direct sea access. Book direct to save 6% vs any OTA.\n\n[Compare prices and book →](https://lina-point.vercel.app/booking)',
  'https://linapoint.com/wp-content/uploads/2017/12/night-view.jpg',
  'Lina Point Team',
  'travel-tips',
  ARRAY['overwater', 'belize', 'maldives', 'comparison', 'value'],
  'Overwater Bungalows: Belize vs Maldives | Price & Value Comparison',
  'Compare overwater bungalows in Belize vs Maldives. Lina Point offers the same luxury from $199/night — a fraction of Maldives prices.',
  true,
  now()
)
ON CONFLICT (slug) DO NOTHING;
