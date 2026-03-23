-- ============================================================
-- Phase 3: Agentic Guest Experience Layer
-- ============================================================

-- ── Guest Memory ──────────────────────────────────────────────
-- Persistent per-guest facts, preferences, and observations
-- Populated by: post-stay survey, agent observations, WhatsApp conversations

CREATE TABLE IF NOT EXISTS guest_memory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type  TEXT NOT NULL
    CHECK (memory_type IN ('preference', 'experience', 'milestone', 'feedback', 'observation')),
  content      TEXT NOT NULL,       -- e.g. "Loves sunrise kayaking"
  source       TEXT,                -- 'post_stay_survey' | 'agent_observation' | 'manual' | 'whatsapp'
  confidence   NUMERIC(3,2) DEFAULT 1.0 CHECK (confidence BETWEEN 0.0 AND 1.0),
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_memory_guest_id
  ON guest_memory (guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_memory_type
  ON guest_memory (guest_id, memory_type);

ALTER TABLE guest_memory ENABLE ROW LEVEL SECURITY;

-- Service-role agents read/write; guests can view their own
CREATE POLICY "Guests can view own memory" ON guest_memory
  FOR SELECT USING (auth.uid() = guest_id);

CREATE POLICY "Service role full access to guest_memory" ON guest_memory
  FOR ALL USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

CREATE OR REPLACE FUNCTION update_guest_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS guest_memory_updated_at ON guest_memory;
CREATE TRIGGER guest_memory_updated_at
  BEFORE UPDATE ON guest_memory
  FOR EACH ROW EXECUTE FUNCTION update_guest_memory_updated_at();


-- ── In-Stay Touchpoints ──────────────────────────────────────
-- Records morning messages + agent interactions sent during a stay

CREATE TABLE IF NOT EXISTS in_stay_touchpoints (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id   UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  guest_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  touchpoint_type  TEXT NOT NULL DEFAULT 'morning_message'
    CHECK (touchpoint_type IN ('morning_message', 'activity_suggestion', 'dining_recommendation', 'weather_alert', 'checkout_reminder')),
  message_sent     TEXT,
  response_received TEXT,
  day_number       INTEGER NOT NULL DEFAULT 1
    CHECK (day_number BETWEEN 1 AND 60),
  sent_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_in_stay_touchpoints_reservation
  ON in_stay_touchpoints (reservation_id);
CREATE INDEX IF NOT EXISTS idx_in_stay_touchpoints_guest
  ON in_stay_touchpoints (guest_id);

-- Prevent duplicate sends for same reservation + day + touchpoint type
CREATE UNIQUE INDEX IF NOT EXISTS idx_in_stay_touchpoints_unique_day
  ON in_stay_touchpoints (reservation_id, day_number, touchpoint_type);

ALTER TABLE in_stay_touchpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests can view own touchpoints" ON in_stay_touchpoints
  FOR SELECT USING (auth.uid() = guest_id);

CREATE POLICY "Service role full access to in_stay_touchpoints" ON in_stay_touchpoints
  FOR ALL USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');


-- ── Reservation: welcome_prepared + post_stay_memory_sent columns ──

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS welcome_prepared       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS post_stay_memory_sent  BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_reservations_welcome_prepared
  ON reservations (welcome_prepared, check_in)
  WHERE welcome_prepared = FALSE;

CREATE INDEX IF NOT EXISTS idx_reservations_post_stay_memory
  ON reservations (post_stay_memory_sent, check_out)
  WHERE post_stay_memory_sent = FALSE;
