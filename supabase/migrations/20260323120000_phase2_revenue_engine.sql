-- Phase 2: Self-Learning Revenue Engine
-- Tables: demand_forecast, funnel_experiments

-- ============================================================
-- 1. Demand Forecast
--    Weekly demand scores per room type, computed by the
--    demand-forecast cron (daily at 02:00 UTC).
--    Read by pricingOptimizationAgent and the Yield Calendar UI.
-- ============================================================
CREATE TABLE IF NOT EXISTS demand_forecast (
  id                  uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_type           text          NOT NULL,
  week_start          date          NOT NULL, -- Monday of the forecasted week
  demand_score        numeric(4, 3) NOT NULL, -- 0.000 to 1.000
  confidence          numeric(4, 3) NOT NULL DEFAULT 0.5,
  seasonal_index      numeric(5, 3),
  booking_velocity    numeric(8, 2),
  competitor_avg_price numeric(10, 2),
  lead_time_factor    numeric(4, 3),
  computed_at         timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (room_type, week_start)
);

CREATE INDEX IF NOT EXISTS idx_demand_forecast_lookup
  ON demand_forecast (room_type, week_start);

-- ============================================================
-- 2. Funnel Experiments (A/B Testing)
--    One row per browser session. Tracks which wizard step
--    was reached and whether a purchase was completed.
--    Variants: A = control (current), B = test variant.
--    Read by selfImprovementAgent and /admin/ai-monitor.
-- ============================================================
CREATE TABLE IF NOT EXISTS funnel_experiments (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  text        NOT NULL,
  variant     text        NOT NULL CHECK (variant IN ('A', 'B')),
  step_reached integer    NOT NULL DEFAULT 1 CHECK (step_reached BETWEEN 1 AND 6),
  converted   boolean     NOT NULL DEFAULT false,
  room_type   text,
  check_in    date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_experiments_session
  ON funnel_experiments (session_id);

CREATE INDEX IF NOT EXISTS idx_funnel_experiments_analysis
  ON funnel_experiments (variant, step_reached, converted);

-- ============================================================
-- 3. Trigger: keep updated_at current on funnel_experiments
-- ============================================================
CREATE OR REPLACE FUNCTION update_funnel_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_funnel_updated_at ON funnel_experiments;
CREATE TRIGGER trg_funnel_updated_at
  BEFORE UPDATE ON funnel_experiments
  FOR EACH ROW EXECUTE FUNCTION update_funnel_updated_at();
