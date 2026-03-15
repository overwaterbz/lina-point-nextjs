-- Newsletter Subscribers Table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'website',
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  unsub_token UUID DEFAULT gen_random_uuid() NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_unsub_token ON newsletter_subscribers (unsub_token);

-- Enable RLS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (drop first if exists for idempotency)
DROP POLICY IF EXISTS "service_role_all" ON newsletter_subscribers;
CREATE POLICY "service_role_all" ON newsletter_subscribers
  FOR ALL USING (auth.role() = 'service_role');

-- Anon can insert (for signup forms)
DROP POLICY IF EXISTS "anon_insert" ON newsletter_subscribers;
CREATE POLICY "anon_insert" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- If table already exists, add new columns
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS unsub_token UUID DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_unsub_token ON newsletter_subscribers (unsub_token);
