-- ============================================================
-- Fix room types, prices, and add cabana_duplex
-- March 13, 2026
--
-- Changes:
--   1. Add 'cabana_duplex' to room_type_enum
--   2. Reclassify 6 former cabana_1br rooms (302-307) as cabana_duplex
--   3. Fix all base_rate_usd to match actual rate cards
--   4. Add pricing rules for cabana_duplex
-- ============================================================

-- ── 1. Add cabana_duplex to the room type enum ─────────────
ALTER TYPE room_type_enum ADD VALUE IF NOT EXISTS 'cabana_duplex';

-- ── 2. Reclassify duplex cabanas (302-307) ─────────────────
-- Dorado, Marlin, Sailfish, Wahoo, Bonito, Mahi Mahi are duplex units
UPDATE rooms SET room_type = 'cabana_duplex'
WHERE room_number IN ('302', '303', '304', '305', '306', '307');

-- ── 3. Fix base rates to match actual rate card ────────────
-- 2nd Floor Hotel Suites: $130/night (was $249)
UPDATE rooms SET base_rate_usd = 130.00
WHERE room_type = 'suite_2nd_floor';

-- 1st Floor Hotel Suites: $150/night (was $299)
UPDATE rooms SET base_rate_usd = 150.00
WHERE room_type = 'suite_1st_floor';

-- 1 Bed Overwater Cabana Duplex: $250/night (was $199 as cabana_1br)
UPDATE rooms SET base_rate_usd = 250.00
WHERE room_type = 'cabana_duplex';

-- 1 Bedroom Overwater Cabana (standalone — Conch 301): $300/night (was $199)
UPDATE rooms SET base_rate_usd = 300.00
WHERE room_type = 'cabana_1br';

-- 2 Bedroom Overwater Cabana: $400/night (was $349)
UPDATE rooms SET base_rate_usd = 400.00
WHERE room_type = 'cabana_2br';

-- ── 4. Update descriptions ─────────────────────────────────
UPDATE rooms SET description = '2nd Floor Overwater Hotel Suite'
WHERE room_type = 'suite_2nd_floor';

UPDATE rooms SET description = '1st Floor Overwater Hotel Suite'
WHERE room_type = 'suite_1st_floor';

UPDATE rooms SET description = '1 Bed Overwater Cabana (Duplex)'
WHERE room_type = 'cabana_duplex';

UPDATE rooms SET description = '1 Bedroom Overwater Cabana'
WHERE room_type = 'cabana_1br';

UPDATE rooms SET description = '2 Bedroom Overwater Cabana'
WHERE room_type = 'cabana_2br';

-- ── 5. Add pricing rules for cabana_duplex ─────────────────
INSERT INTO pricing_rules (room_type, rule_name, rule_type, multiplier, start_date, end_date, priority, active, auto_applied, created_by) VALUES
  ('cabana_duplex', 'Duplex Peak', 'seasonal', 1.25, '2026-12-15', '2027-04-15', 12, true, true, 'system'),
  ('cabana_duplex', 'Duplex Green', 'seasonal', 0.85, '2026-05-01', '2026-11-30', 12, true, true, 'system')
ON CONFLICT DO NOTHING;

INSERT INTO pricing_rules (room_type, rule_name, rule_type, multiplier, min_occupancy_pct, priority, active, auto_applied, created_by) VALUES
  ('cabana_duplex', 'Duplex Surge', 'occupancy', 1.15, 80, 22, true, true, 'system')
ON CONFLICT DO NOTHING;

INSERT INTO pricing_rules (room_type, rule_name, rule_type, multiplier, min_days_before, max_days_before, priority, active, auto_applied, created_by) VALUES
  ('cabana_duplex', 'Duplex Last Min', 'last_minute', 0.80, 0, 3, 30, true, true, 'system')
ON CONFLICT DO NOTHING;
