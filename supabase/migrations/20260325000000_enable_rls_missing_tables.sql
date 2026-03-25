-- ============================================================
-- Security Fix: Enable RLS on all tables missing it
-- Fixes Supabase alert: rls_disabled_in_public
-- Tables covered: content_calendar, pricing_rules,
--   revenue_snapshots, upsell_offers, blog_posts,
--   ota_price_history, pricing_rule_outcomes,
--   demand_forecast, funnel_experiments
-- ============================================================

-- ── blog_posts ───────────────────────────────────────────
-- Public can read published posts; only service role writes.

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published blog posts"
  ON public.blog_posts FOR SELECT
  USING (published = true);

CREATE POLICY "Service role full access on blog_posts"
  ON public.blog_posts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── content_calendar ────────────────────────────────────
-- Internal marketing/agent table — service role only.

ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on content_calendar"
  ON public.content_calendar FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── pricing_rules ────────────────────────────────────────
-- Pricing rules are read by the pricing engine (service role)
-- and displayed in admin. No public access.

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on pricing_rules"
  ON public.pricing_rules FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── revenue_snapshots ────────────────────────────────────
-- Internal financial data — service role only.

ALTER TABLE public.revenue_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on revenue_snapshots"
  ON public.revenue_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── upsell_offers ────────────────────────────────────────
-- Guests can read their own upsell offers; service role handles writes.

ALTER TABLE public.upsell_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own upsell offers"
  ON public.upsell_offers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on upsell_offers"
  ON public.upsell_offers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── ota_price_history ────────────────────────────────────
-- Internal pricing intelligence — service role only.

ALTER TABLE public.ota_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ota_price_history"
  ON public.ota_price_history FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── pricing_rule_outcomes ────────────────────────────────
-- Internal ML feedback data — service role only.

ALTER TABLE public.pricing_rule_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on pricing_rule_outcomes"
  ON public.pricing_rule_outcomes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── demand_forecast ──────────────────────────────────────
-- Internal forecasting data — service role only.

ALTER TABLE public.demand_forecast ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on demand_forecast"
  ON public.demand_forecast FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── funnel_experiments ───────────────────────────────────
-- Anyone (including anon) can INSERT a session row for A/B tracking.
-- Only service role can read or update aggregate data.

ALTER TABLE public.funnel_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert funnel experiment row"
  ON public.funnel_experiments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update own funnel session"
  ON public.funnel_experiments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on funnel_experiments"
  ON public.funnel_experiments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
