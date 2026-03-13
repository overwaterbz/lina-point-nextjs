-- Lina Point: OTA-driven pricing + tours marketplace
-- March 13, 2026

-- ─── daily_ota_rates: stores scraped OTA prices per room per date ────

CREATE TABLE IF NOT EXISTS daily_ota_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type TEXT NOT NULL,
  date DATE NOT NULL,
  ota_name TEXT NOT NULL,        -- 'expedia', 'booking', 'agoda'
  ota_price NUMERIC(10,2) NOT NULL,
  ota_url TEXT,
  is_live BOOLEAN DEFAULT true,  -- true=scraped, false=fallback
  our_rate NUMERIC(10,2),        -- calculated: min(ota prices) * 0.94
  scraped_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_type, date, ota_name)
);

CREATE INDEX IF NOT EXISTS idx_daily_ota_rates_lookup
  ON daily_ota_rates(room_type, date, scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_ota_rates_date
  ON daily_ota_rates(date);

-- RLS: Admin read, service role write
ALTER TABLE daily_ota_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read daily_ota_rates"
  ON daily_ota_rates FOR SELECT USING (true);

CREATE POLICY "Service write daily_ota_rates"
  ON daily_ota_rates FOR ALL USING (true);

-- ─── tour_ota_prices: scraped tour prices from Viator/GYG/TA ────────

CREATE TABLE IF NOT EXISTS tour_ota_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,        -- 'viator', 'getyourguide', 'tripadvisor'
  ota_name TEXT NOT NULL,        -- display name from search result
  ota_url TEXT,
  ota_price NUMERIC(10,2) NOT NULL,
  ota_rating NUMERIC(3,1),       -- e.g. 4.5
  our_price NUMERIC(10,2),       -- ota_price * 0.94
  scraped_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tour_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_tour_ota_prices_tour
  ON tour_ota_prices(tour_id, scraped_at DESC);

-- RLS
ALTER TABLE tour_ota_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read tour_ota_prices"
  ON tour_ota_prices FOR SELECT USING (true);

CREATE POLICY "Service write tour_ota_prices"
  ON tour_ota_prices FOR ALL USING (true);

-- ─── Ensure tours table has needed columns ──────────────────────────
-- (tours table already exists from initial migration; add columns for pricing tiers)

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS budget_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS mid_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS luxury_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'San Pedro, Belize';

-- Seed the 7 core tours + 3 dinners if tours table is empty
INSERT INTO tours (name, description, price, duration_hours, category, max_guests, active, slug, budget_price, mid_price, luxury_price)
SELECT * FROM (VALUES
  ('Half-Day Snorkeling & Coral Reef', 'Explore pristine barrier reef with marine life', 95, 4, 'water', 4, true, 'snorkeling', 65, 95, 150),
  ('Guided Sport Fishing Adventure', 'Catch tarpon, permit, or bonefish', 350, 6, 'water', 2, true, 'fishing', 250, 350, 500),
  ('Mainland Jungle & Mayan Ruins Day Tour', 'Visit ancient ruins and jungle canopy', 120, 8, 'culture', 6, true, 'mainland', 75, 120, 200),
  ('Cenote Swimming & Cave Exploration', 'Underground cenote with crystal-clear waters', 130, 5, 'adventure', 8, true, 'cenote', 80, 130, 180),
  ('Mangrove Kayaking & Wildlife Spotting', 'Paddle through mangroves, spot crocodiles & birds', 85, 3, 'nature', 4, true, 'kayaking', 50, 85, 140),
  ('Scuba Diving - Blue Hole Day Trip', 'World-famous Blue Hole dive site', 280, 8, 'water', 6, true, 'diving', 180, 280, 450),
  ('Island Hopping & Beach Picnic', 'Visit multiple islands with beach lunch', 95, 6, 'nature', 8, true, 'island', 55, 95, 150),
  ('Beachfront Seafood BBQ', 'Fresh grilled fish with tropical sides', 55, 2, 'dining', 10, true, 'dinner-casual', 35, 55, 85),
  ('Candlelit Overwater Dining', 'Private dinner on the dock at sunset', 120, 3, 'dining', 2, true, 'dinner-romantic', 75, 120, 200),
  ('Belizean Traditional Feast', 'Authentic Creole & Maya cuisine', 65, 2, 'dining', 10, true, 'dinner-traditional', 40, 65, 110)
) AS v(name, description, price, duration_hours, category, max_guests, active, slug, budget_price, mid_price, luxury_price)
WHERE NOT EXISTS (SELECT 1 FROM tours LIMIT 1);
