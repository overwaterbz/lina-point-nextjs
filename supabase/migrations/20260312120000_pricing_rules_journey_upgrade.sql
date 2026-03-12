-- Phase 12: Upsell tracking + dynamic pricing + 48h pre-arrival
-- Run in Supabase SQL Editor after 20260312110000_upgrade_agent_prompts.sql
-- SAFE TO RE-RUN: uses IF NOT EXISTS + DROP POLICY IF EXISTS throughout

-- ── Upgrade agent_prompts for prompt versioning ─────────────
-- (from Phase 11 — included here for convenience if not run yet)
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'auto_applied';
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS change_type TEXT;
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS previous_prompt TEXT;
UPDATE agent_prompts SET approval_status = 'auto_applied' WHERE approval_status IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_prompts_active
  ON agent_prompts (agent_name, approval_status, version DESC);
CREATE INDEX IF NOT EXISTS idx_agent_prompts_pending
  ON agent_prompts (approval_status) WHERE approval_status = 'pending_review';

-- ── Pre-arrival packets tracking (if not exists) ─────────────
CREATE TABLE IF NOT EXISTS pre_arrival_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL,
  user_id UUID,
  sent_via TEXT DEFAULT 'whatsapp',
  weather_forecast JSONB,
  recommended_tours JSONB,
  dining_suggestions JSONB,
  personalized_tips TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pre_arrival_res ON pre_arrival_packets(reservation_id);
ALTER TABLE pre_arrival_packets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access pre_arrival_packets" ON pre_arrival_packets;
CREATE POLICY "Service role full access pre_arrival_packets" ON pre_arrival_packets
  FOR ALL USING (auth.role() = 'service_role');

-- ── Dynamic Pricing Rules ─────────────────────────────────
-- Table already exists from 20260311400000 — add missing columns
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS auto_applied BOOLEAN DEFAULT false;
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'system';
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(room_type, active);
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access pricing_rules" ON pricing_rules;
CREATE POLICY "Service role full access pricing_rules" ON pricing_rules
  FOR ALL USING (auth.role() = 'service_role');

-- ── Pricing audit log ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type TEXT NOT NULL,
  date DATE NOT NULL,
  base_rate NUMERIC(10,2) NOT NULL,
  final_rate NUMERIC(10,2) NOT NULL,
  rules_applied JSONB DEFAULT '[]',
  occupancy_pct NUMERIC(5,2),
  computed_by TEXT DEFAULT 'pricing_engine',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pricing_audit_date ON pricing_audit_log(room_type, date);
ALTER TABLE pricing_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access pricing_audit_log" ON pricing_audit_log;
CREATE POLICY "Service role full access pricing_audit_log" ON pricing_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- ── Seed additional per-room-type pricing rules ───────────
-- The original migration seeded 'all' room_type rules. These add room-specific overrides.
INSERT INTO pricing_rules (room_type, rule_name, rule_type, multiplier, start_date, end_date, priority, active, auto_applied, created_by) VALUES
  -- Per-room peak season premium (Dec–Apr) — overrides 'all' rules
  ('cabana_1br', 'Cabana 1BR Peak', 'seasonal', 1.25, '2026-12-15', '2027-04-15', 12, true, true, 'system'),
  ('cabana_2br', 'Cabana 2BR Peak', 'seasonal', 1.25, '2026-12-15', '2027-04-15', 12, true, true, 'system'),
  ('suite_1st_floor', 'Suite 1F Peak', 'seasonal', 1.20, '2026-12-15', '2027-04-15', 12, true, true, 'system'),
  ('suite_2nd_floor', 'Suite 2F Peak', 'seasonal', 1.20, '2026-12-15', '2027-04-15', 12, true, true, 'system')
ON CONFLICT DO NOTHING;

INSERT INTO pricing_rules (room_type, rule_name, rule_type, multiplier, start_date, end_date, priority, active, auto_applied, created_by) VALUES
  -- Per-room green season value (May–Nov)
  ('cabana_1br', 'Cabana 1BR Green', 'seasonal', 0.85, '2026-05-01', '2026-11-30', 12, true, true, 'system'),
  ('cabana_2br', 'Cabana 2BR Green', 'seasonal', 0.85, '2026-05-01', '2026-11-30', 12, true, true, 'system'),
  ('suite_1st_floor', 'Suite 1F Green', 'seasonal', 0.90, '2026-05-01', '2026-11-30', 12, true, true, 'system'),
  ('suite_2nd_floor', 'Suite 2F Green', 'seasonal', 0.90, '2026-05-01', '2026-11-30', 12, true, true, 'system')
ON CONFLICT DO NOTHING;

INSERT INTO pricing_rules (room_type, rule_name, rule_type, multiplier, min_occupancy_pct, priority, active, auto_applied, created_by) VALUES
  -- Per-room high occupancy surge (>80% booked)
  ('cabana_1br', 'Cabana 1BR Surge', 'occupancy', 1.15, 80, 22, true, true, 'system'),
  ('cabana_2br', 'Cabana 2BR Surge', 'occupancy', 1.15, 80, 22, true, true, 'system'),
  ('suite_1st_floor', 'Suite 1F Surge', 'occupancy', 1.15, 80, 22, true, true, 'system'),
  ('suite_2nd_floor', 'Suite 2F Surge', 'occupancy', 1.15, 80, 22, true, true, 'system')
ON CONFLICT DO NOTHING;

INSERT INTO pricing_rules (room_type, rule_name, rule_type, multiplier, min_days_before, max_days_before, priority, active, auto_applied, created_by) VALUES
  -- Per-room last-minute discounts (within 3 days)
  ('cabana_1br', 'Cabana 1BR Last Min', 'last_minute', 0.80, 0, 3, 30, true, true, 'system'),
  ('cabana_2br', 'Cabana 2BR Last Min', 'last_minute', 0.80, 0, 3, 30, true, true, 'system'),
  ('suite_1st_floor', 'Suite 1F Last Min', 'last_minute', 0.85, 0, 3, 30, true, true, 'system'),
  ('suite_2nd_floor', 'Suite 2F Last Min', 'last_minute', 0.85, 0, 3, 30, true, true, 'system')
ON CONFLICT DO NOTHING;
