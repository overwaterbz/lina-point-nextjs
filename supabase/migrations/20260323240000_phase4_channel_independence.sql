-- ============================================================
-- Phase 4: Channel Independence & Platform Dominance
-- ============================================================

-- ── Booking Soft Holds ────────────────────────────────────────────────────
-- 30-minute inventory holds during direct booking payment window
-- Prevents double-booking between direct bookings and OTA channel

CREATE TABLE IF NOT EXISTS booking_soft_holds (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     TEXT NOT NULL,
  room_type      TEXT NOT NULL,
  check_in_date  DATE NOT NULL,
  check_out_date DATE NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  guest_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_soft_holds_session ON booking_soft_holds(session_id);
CREATE INDEX IF NOT EXISTS idx_soft_holds_room_dates ON booking_soft_holds(room_type, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_soft_holds_expires ON booking_soft_holds(expires_at);

ALTER TABLE booking_soft_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to booking_soft_holds" ON booking_soft_holds
  FOR ALL USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- ── Review Monitoring Table ───────────────────────────────────────────────
-- Stores scraped reviews from all platforms for reputation monitoring

CREATE TABLE IF NOT EXISTS review_monitoring (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform         TEXT NOT NULL
    CHECK (platform IN ('google', 'tripadvisor', 'booking', 'expedia', 'airbnb', 'facebook')),
  reviewer_name    TEXT,
  rating           SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text      TEXT,
  review_date      DATE NOT NULL,
  platform_url     TEXT,
  sentiment        TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  escalated        BOOLEAN DEFAULT FALSE,
  response_drafted BOOLEAN DEFAULT FALSE,
  response_sent    BOOLEAN DEFAULT FALSE,
  response_text    TEXT,
  responded_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_monitoring_platform ON review_monitoring(platform, review_date);
CREATE INDEX IF NOT EXISTS idx_review_monitoring_sentiment ON review_monitoring(sentiment) WHERE sentiment IS NULL;
CREATE INDEX IF NOT EXISTS idx_review_monitoring_escalated ON review_monitoring(escalated) WHERE escalated = TRUE;

ALTER TABLE review_monitoring ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view reviews" ON review_monitoring FOR SELECT USING (true);
CREATE POLICY "Service role full access to reviews" ON review_monitoring
  FOR ALL USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

CREATE OR REPLACE FUNCTION update_review_monitoring_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS review_monitoring_updated_at ON review_monitoring;
CREATE TRIGGER review_monitoring_updated_at
  BEFORE UPDATE ON review_monitoring
  FOR EACH ROW EXECUTE FUNCTION update_review_monitoring_updated_at();


-- ── Group Booking Quotes ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS group_booking_quotes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_date       DATE NOT NULL,
  check_out_date      DATE NOT NULL,
  event_type          TEXT NOT NULL
    CHECK (event_type IN ('wedding', 'corporate', 'retreat', 'celebration', 'reunion', 'general')),
  total_guests        INTEGER NOT NULL CHECK (total_guests >= 1),
  rooms_required      INTEGER NOT NULL CHECK (rooms_required >= 1),
  contact_name        TEXT,
  contact_phone       TEXT,
  contact_email       TEXT,
  special_requirements TEXT,
  grand_total         NUMERIC(10,2),
  discount_pct        NUMERIC(5,2) DEFAULT 0,
  status              TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  reservation_id      UUID REFERENCES reservations(id) ON DELETE SET NULL,
  valid_until         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_quotes_status ON group_booking_quotes(status, valid_until);
CREATE INDEX IF NOT EXISTS idx_group_quotes_dates ON group_booking_quotes(check_in_date, check_out_date);

ALTER TABLE group_booking_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to group quotes" ON group_booking_quotes
  FOR ALL USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');


-- ── Reservations: Add Source Column if Missing ────────────────────────────
-- 'direct' | 'whatsapp' | 'web' | 'ota_expedia' | 'ota_booking' | 'group'

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';

CREATE INDEX IF NOT EXISTS idx_reservations_source ON reservations(source) WHERE source IS NOT NULL;
