-- ─── Refund Policies ─────────────────────────────────────────────────────────
-- Tiered refund rules (e.g. 14+ days = 100%, 7–13 = 50%, <7 = 0%)
CREATE TABLE IF NOT EXISTS refund_policies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL,
  days_before INTEGER NOT NULL CHECK (days_before >= 0),
  refund_pct  INTEGER NOT NULL CHECK (refund_pct BETWEEN 0 AND 100),
  notes       TEXT,
  active      BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed sensible defaults (can be edited in admin UI)
INSERT INTO refund_policies (name, days_before, refund_pct, notes, sort_order) VALUES
  ('Full Refund Window',    14, 100, 'Cancel 14+ days before arrival for a full refund',  1),
  ('Partial Refund Window',  7,  50, 'Cancel 7–13 days before arrival — 50% refund',       2),
  ('No Refund Window',       0,   0, 'Cancellations within 7 days of arrival are non-refundable', 3)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_refund_policies_active ON refund_policies (active, sort_order);

-- RLS
ALTER TABLE refund_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to refund_policies"
  ON refund_policies FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "Staff read refund_policies"
  ON refund_policies FOR SELECT
  USING (auth.role() = 'authenticated');


-- ─── Incidents ────────────────────────────────────────────────────────────────
-- Property damage / maintenance incidents reported by staff
CREATE TABLE IF NOT EXISTS incidents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID REFERENCES rooms(id) ON DELETE SET NULL,
  reported_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title         TEXT    NOT NULL,
  description   TEXT,
  severity      TEXT    NOT NULL DEFAULT 'low'
                  CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status        TEXT    NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  incident_date DATE    DEFAULT CURRENT_DATE,
  resolved_at   TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_status   ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_room     ON incidents (room_id);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to incidents"
  ON incidents FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "Staff read incidents"
  ON incidents FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Staff insert incidents"
  ON incidents FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Staff update incidents"
  ON incidents FOR UPDATE
  USING (auth.role() = 'authenticated');


-- ─── Pricing Audit Trail ──────────────────────────────────────────────────────
-- Immutable log of every pricing change
CREATE TABLE IF NOT EXISTS pricing_audit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type     TEXT        NOT NULL,
  field         TEXT        NOT NULL,  -- 'base_rate_usd' | 'min_rate' | etc.
  old_value     NUMERIC,
  new_value     NUMERIC     NOT NULL,
  changed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_source TEXT        DEFAULT 'manual'
                  CHECK (change_source IN ('manual', 'ai_agent', 'rule', 'import')),
  change_reason TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_audit_room_type  ON pricing_audit (room_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_audit_changed_by ON pricing_audit (changed_by);

ALTER TABLE pricing_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to pricing_audit"
  ON pricing_audit FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "Staff read pricing_audit"
  ON pricing_audit FOR SELECT
  USING (auth.role() = 'authenticated');
