CREATE TABLE IF NOT EXISTS client_error_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context     TEXT,
  error       TEXT,
  url         TEXT,
  user_agent  TEXT,
  ts          TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_error_logs_created_at ON client_error_logs(created_at DESC);

ALTER TABLE client_error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access client_error_logs" ON client_error_logs
  FOR ALL USING (auth.role() = 'service_role');
