-- Phase 6: Post-Stay Loyalty, Review Tracking, Referral System
-- Run in Supabase SQL Editor

-- ── Review Requests ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  guest_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('google', 'tripadvisor', 'facebook')),
  sent_via TEXT NOT NULL CHECK (sent_via IN ('email', 'whatsapp', 'both')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  review_url TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_review_requests_guest ON review_requests(guest_id);
CREATE INDEX idx_review_requests_reservation ON review_requests(reservation_id);

-- ── Referrals ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referee_email TEXT,
  referee_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'booked', 'rewarded')),
  referrer_reward_type TEXT DEFAULT 'discount',
  referrer_reward_value NUMERIC(10,2) DEFAULT 50.00,
  referee_reward_type TEXT DEFAULT 'discount',
  referee_reward_value NUMERIC(10,2) DEFAULT 25.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  converted_at TIMESTAMPTZ
);

CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);

-- ── Loyalty Rewards ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('referral_bonus', 'stay_credit', 'room_upgrade', 'tour_discount', 'welcome_gift')),
  value NUMERIC(10,2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'redeemed', 'expired')),
  expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  reservation_id UUID REFERENCES reservations(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loyalty_rewards_user ON loyalty_rewards(user_id);
CREATE INDEX idx_loyalty_rewards_status ON loyalty_rewards(status);

-- ── Add loyalty_points to profiles ─────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_stays INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_spend NUMERIC(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_stay_at DATE;

-- ── RLS Policies ───────────────────────────────────────────
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on review_requests"
  ON review_requests FOR ALL USING (true);
CREATE POLICY "Service role full access on referrals"
  ON referrals FOR ALL USING (true);
CREATE POLICY "Service role full access on loyalty_rewards"
  ON loyalty_rewards FOR ALL USING (true);
