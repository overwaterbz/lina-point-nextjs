-- Newsletter Subscribers Table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'website',
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active'
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers (status);

-- Enable RLS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_all" ON newsletter_subscribers
  FOR ALL USING (auth.role() = 'service_role');

-- Anon can insert (for signup forms)
CREATE POLICY "anon_insert" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);
