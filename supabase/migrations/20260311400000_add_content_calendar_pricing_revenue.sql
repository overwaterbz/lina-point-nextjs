-- ============================================================
-- Phase 4+5: Content Calendar, Dynamic Pricing, Revenue
-- ============================================================

-- ── Content Calendar ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT,
  platform TEXT NOT NULL,          -- 'instagram', 'facebook', 'tiktok'
  content_type TEXT NOT NULL,      -- 'social_post', 'reel_script', 'tiktok_script', 'email'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  media_url TEXT,
  link_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',  -- 'draft', 'scheduled', 'published', 'failed'
  post_id TEXT,                    -- platform's post ID
  post_url TEXT,                   -- URL to live post
  error_message TEXT,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  engagements INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_status ON content_calendar(status);
CREATE INDEX IF NOT EXISTS idx_calendar_scheduled ON content_calendar(scheduled_at);

-- ── Seasonal Pricing Rules ───────────────────────────────

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type TEXT NOT NULL,         -- matches room_type_enum or 'all'
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,         -- 'seasonal', 'occupancy', 'event', 'last_minute', 'loyalty'
  multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,  -- 1.20 = 20% markup
  start_date DATE,
  end_date DATE,
  min_occupancy_pct INT,           -- occupancy trigger (e.g. 80 = fires when >=80% full)
  max_occupancy_pct INT,
  min_days_before INT,             -- days before check-in (for last-minute deals)
  max_days_before INT,
  loyalty_tier TEXT,               -- 'returning', 'loyal', 'vip'
  priority INT DEFAULT 0,         -- higher = evaluated first
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default seasonal rules
INSERT INTO pricing_rules (room_type, rule_name, rule_type, multiplier, start_date, end_date, priority)
VALUES
  ('all', 'Peak Season (Dec-Apr)',       'seasonal', 1.25, '2026-12-15', '2027-04-15', 10),
  ('all', 'Shoulder Season (Nov, May)',  'seasonal', 1.10, '2026-11-01', '2026-11-30', 5),
  ('all', 'Shoulder Season May',         'seasonal', 1.10, '2027-05-01', '2027-05-31', 5),
  ('all', 'Low Season (Jun-Oct)',        'seasonal', 0.85, '2026-06-01', '2026-10-31', 5);

-- Occupancy-based surge rules
INSERT INTO pricing_rules (room_type, rule_name, rule_type, multiplier, min_occupancy_pct, priority)
VALUES
  ('all', 'High Demand (>85% occ)',  'occupancy', 1.15, 85, 15),
  ('all', 'Near Full (>95% occ)',    'occupancy', 1.30, 95, 20);

-- Last-minute deal
INSERT INTO pricing_rules (room_type, rule_name, rule_type, multiplier, min_days_before, max_days_before, priority)
VALUES
  ('all', 'Last Minute (<3 days)',  'last_minute', 0.80, 0, 3, 8);

-- Loyalty discounts
INSERT INTO pricing_rules (room_type, rule_name, rule_type, multiplier, loyalty_tier, priority)
VALUES
  ('all', 'Returning Guest',  'loyalty', 0.95, 'returning', 3),
  ('all', 'Loyal Guest',      'loyalty', 0.90, 'loyal', 3),
  ('all', 'VIP Guest',        'loyalty', 0.85, 'vip', 3);

-- ── Revenue Snapshots (daily aggregation) ────────────────

CREATE TABLE IF NOT EXISTS revenue_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,
  total_reservations INT DEFAULT 0,
  total_room_revenue DECIMAL(12,2) DEFAULT 0,
  total_tour_revenue DECIMAL(12,2) DEFAULT 0,
  total_commission DECIMAL(12,2) DEFAULT 0,
  avg_nightly_rate DECIMAL(10,2) DEFAULT 0,
  occupancy_pct DECIMAL(5,2) DEFAULT 0,
  new_guests INT DEFAULT 0,
  returning_guests INT DEFAULT 0,
  whatsapp_conversations INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Upsell Offers (tracked) ─────────────────────────────

CREATE TABLE IF NOT EXISTS upsell_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_type TEXT NOT NULL,        -- 'room_upgrade', 'tour_addon', 'dining_package', 'romance', 'spa'
  description TEXT NOT NULL,
  original_price DECIMAL(10,2),
  offer_price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'offered', -- 'offered', 'accepted', 'declined', 'expired'
  offered_via TEXT DEFAULT 'whatsapp',
  offered_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_upsell_user ON upsell_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_upsell_status ON upsell_offers(status);
