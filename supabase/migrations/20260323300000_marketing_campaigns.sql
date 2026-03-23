CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  target_audience TEXT,
  key_messages JSONB DEFAULT '[]',
  platforms JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'failed')),
  metrics JSONB DEFAULT '{"impressions":0,"clicks":0,"conversions":0,"ctr":0}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at ON marketing_campaigns(created_at DESC);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Admins can do everything; guests can only read their own (none here, so allow all for service role)
CREATE POLICY "Admin full access to campaigns" ON marketing_campaigns
  FOR ALL USING (true);
