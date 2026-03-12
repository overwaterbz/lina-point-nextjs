-- Phase 10: OTA Price Cache + Promo Codes
-- Run in Supabase SQL Editor
-- SAFE TO RE-RUN: uses IF NOT EXISTS + DROP POLICY IF EXISTS throughout

-- ── OTA Price Cache ─────────────────────────────────────────
-- Persists Tavily OTA price scraping results for analytics + reduced API calls
CREATE TABLE IF NOT EXISTS ota_price_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  ota_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  source_url TEXT,
  source TEXT DEFAULT 'live' CHECK (source IN ('live', 'fallback')),
  fetched_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ota_cache_lookup
  ON ota_price_cache(room_type, check_in, check_out, ota_name);
CREATE INDEX IF NOT EXISTS idx_ota_cache_fetched
  ON ota_price_cache(fetched_at DESC);

ALTER TABLE ota_price_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access ota_price_cache" ON ota_price_cache;
CREATE POLICY "Service role full access ota_price_cache" ON ota_price_cache
  FOR ALL USING (auth.role() = 'service_role');

-- ── Promo Codes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percent')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_booking_amount NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2), -- cap for percent discounts (NULL = no cap)
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_to DATE,
  max_uses INT, -- NULL = unlimited
  current_uses INT DEFAULT 0,
  single_use_per_guest BOOLEAN DEFAULT true,
  room_type TEXT, -- NULL = all room types
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access promo_codes" ON promo_codes;
CREATE POLICY "Service role full access promo_codes" ON promo_codes
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated can read active promos" ON promo_codes;
CREATE POLICY "Authenticated can read active promos" ON promo_codes
  FOR SELECT USING (active = true);

-- ── Promo Code Usage Tracking ───────────────────────────────
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
  user_id UUID NOT NULL,
  reservation_id UUID REFERENCES reservations(id),
  discount_applied NUMERIC(10,2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_usage_code ON promo_code_usage(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_user ON promo_code_usage(user_id);

ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access promo_code_usage" ON promo_code_usage;
CREATE POLICY "Service role full access promo_code_usage" ON promo_code_usage
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Users see own promo usage" ON promo_code_usage;
CREATE POLICY "Users see own promo usage" ON promo_code_usage
  FOR SELECT USING (user_id = auth.uid());

-- ── Add promo columns to reservations ───────────────────────
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS promo_discount NUMERIC(10,2) DEFAULT 0;

-- ── Seed initial promo codes ────────────────────────────────
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_booking_amount, max_discount, valid_to, max_uses, single_use_per_guest, active) VALUES
  ('DIRECT10', 'Book direct and save 10%', 'percent', 10, 200, 150, '2027-12-31', NULL, false, true),
  ('WELCOME25', '$25 off your first direct booking', 'fixed', 25, 150, NULL, '2027-12-31', NULL, true, true),
  ('LOYALTY2X', 'Double loyalty points on this stay', 'percent', 0, 0, 0, '2027-12-31', NULL, true, true)
ON CONFLICT (code) DO NOTHING;
