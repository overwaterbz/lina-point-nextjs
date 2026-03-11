-- ============================================================
-- Phase 2: Guest Intelligence — Enhanced Profiles + Interactions
-- ============================================================

-- Add guest-intelligence columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accessibility_needs TEXT,
  ADD COLUMN IF NOT EXISTS travel_style TEXT DEFAULT 'leisure',
  ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS total_stays INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spend DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS ai_preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_stay_at TIMESTAMPTZ;

-- ============================================================
-- Guest Interactions — tracks meaningful touchpoints for ML
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,       -- 'booking', 'whatsapp', 'tour', 'dining', 'complaint', 'review', 'checkin', 'checkout'
  channel TEXT NOT NULL DEFAULT 'web',  -- 'web', 'whatsapp', 'email', 'phone', 'in_person'
  summary TEXT,
  sentiment TEXT,                       -- 'positive', 'neutral', 'negative'
  metadata JSONB DEFAULT '{}'::jsonb,
  reservation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactions_user ON guest_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON guest_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON guest_interactions(created_at DESC);

ALTER TABLE guest_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to interactions"
  ON guest_interactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Pre-arrival packets — track what was sent
-- ============================================================
CREATE TABLE IF NOT EXISTS pre_arrival_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_via TEXT NOT NULL DEFAULT 'email',  -- 'email', 'whatsapp', 'both'
  weather_forecast JSONB,
  recommended_tours JSONB,
  dining_suggestions JSONB,
  personalized_tips TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pre_arrival_res ON pre_arrival_packets(reservation_id);
