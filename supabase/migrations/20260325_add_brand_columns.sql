-- Add brand column to all agentic/analytics tables for multi-site support

ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE marketing_content ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE funnel_experiments ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE booking_analytics ADD COLUMN IF NOT EXISTS brand TEXT;

-- Optional: Add indexes for brand queries
CREATE INDEX IF NOT EXISTS idx_content_calendar_brand ON content_calendar(brand);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_brand ON marketing_campaigns(brand);
CREATE INDEX IF NOT EXISTS idx_marketing_content_brand ON marketing_content(brand);
CREATE INDEX IF NOT EXISTS idx_funnel_experiments_brand ON funnel_experiments(brand);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_brand ON booking_analytics(brand);

-- (Repeat for any other agentic/analytics tables as needed)
