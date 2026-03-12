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
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('seasonal', 'occupancy', 'demand', 'event', 'last_minute')),
  name TEXT NOT NULL,
  multiplier NUMERIC(4,3) NOT NULL DEFAULT 1.000, -- e.g., 1.200 = 20% premium
  conditions JSONB NOT NULL DEFAULT '{}',          -- e.g., {"min_occupancy": 0.8}
  priority INTEGER DEFAULT 0,                       -- higher = evaluated first
  active BOOLEAN DEFAULT true,
  auto_applied BOOLEAN DEFAULT false,               -- autonomy flag
  created_by TEXT DEFAULT 'system',                 -- 'system' | 'ai_agent' | 'admin'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

-- ── Seed default pricing rules ────────────────────────────
INSERT INTO pricing_rules (room_type, rule_type, name, multiplier, conditions, priority, active, auto_applied, created_by) VALUES
  -- High-season premium (Dec–Apr)
  ('cabana_1br', 'seasonal', 'Peak Season Premium', 1.250, '{"months": [12,1,2,3,4]}', 10, true, true, 'system'),
  ('cabana_2br', 'seasonal', 'Peak Season Premium', 1.250, '{"months": [12,1,2,3,4]}', 10, true, true, 'system'),
  ('suite_1st_floor', 'seasonal', 'Peak Season Premium', 1.200, '{"months": [12,1,2,3,4]}', 10, true, true, 'system'),
  ('suite_2nd_floor', 'seasonal', 'Peak Season Premium', 1.200, '{"months": [12,1,2,3,4]}', 10, true, true, 'system'),
  -- Low-season discount (May–Nov, except June/July)
  ('cabana_1br', 'seasonal', 'Green Season Value', 0.850, '{"months": [5,8,9,10,11]}', 10, true, true, 'system'),
  ('cabana_2br', 'seasonal', 'Green Season Value', 0.850, '{"months": [5,8,9,10,11]}', 10, true, true, 'system'),
  ('suite_1st_floor', 'seasonal', 'Green Season Value', 0.900, '{"months": [5,8,9,10,11]}', 10, true, true, 'system'),
  ('suite_2nd_floor', 'seasonal', 'Green Season Value', 0.900, '{"months": [5,8,9,10,11]}', 10, true, true, 'system'),
  -- High occupancy surge (>80% booked)
  ('cabana_1br', 'occupancy', 'High Demand Surge', 1.150, '{"min_occupancy": 0.80}', 20, true, true, 'system'),
  ('cabana_2br', 'occupancy', 'High Demand Surge', 1.150, '{"min_occupancy": 0.80}', 20, true, true, 'system'),
  ('suite_1st_floor', 'occupancy', 'High Demand Surge', 1.150, '{"min_occupancy": 0.80}', 20, true, true, 'system'),
  ('suite_2nd_floor', 'occupancy', 'High Demand Surge', 1.150, '{"min_occupancy": 0.80}', 20, true, true, 'system'),
  -- Last-minute discount (within 3 days, low occupancy)
  ('cabana_1br', 'last_minute', 'Last Minute Deal', 0.800, '{"days_until_checkin_max": 3, "max_occupancy": 0.50}', 30, true, true, 'system'),
  ('cabana_2br', 'last_minute', 'Last Minute Deal', 0.800, '{"days_until_checkin_max": 3, "max_occupancy": 0.50}', 30, true, true, 'system'),
  ('suite_1st_floor', 'last_minute', 'Last Minute Deal', 0.850, '{"days_until_checkin_max": 3, "max_occupancy": 0.50}', 30, true, true, 'system'),
  ('suite_2nd_floor', 'last_minute', 'Last Minute Deal', 0.850, '{"days_until_checkin_max": 3, "max_occupancy": 0.50}', 30, true, true, 'system')
ON CONFLICT DO NOTHING;
