-- Phase 9: Fix room names to match FreeToBook + add iCal sync columns
-- Run in Supabase SQL Editor
-- SAFE TO RE-RUN: uses idempotent UPDATE statements

-- ── Rename room_type_enum value: overwater_suite → suite_1st_floor ──
-- 101-104 are 1st-floor main building suites, NOT overwater
ALTER TYPE room_type_enum RENAME VALUE 'overwater_suite' TO 'suite_1st_floor';

-- ── Add new columns to rooms table ─────────────────────────
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS fish_name TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS ical_url TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_ical_sync TIMESTAMPTZ;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor INT;

-- ── Update all 16 rooms with real FreeToBook names ──────────
-- 1st Floor Main Building Hotel Suites (101-104)
UPDATE rooms SET name = 'Baracuda',  room_number = '101', fish_name = 'Baracuda',  floor = 1,
  description = '1st Floor Main Building Hotel Suite'
WHERE sort_order = 13 AND room_type = 'suite_1st_floor';

UPDATE rooms SET name = 'Snapper',   room_number = '102', fish_name = 'Snapper',   floor = 1,
  description = '1st Floor Main Building Hotel Suite'
WHERE sort_order = 14 AND room_type = 'suite_1st_floor';

UPDATE rooms SET name = 'Jack',      room_number = '103', fish_name = 'Jack',      floor = 1,
  description = '1st Floor Main Building Hotel Suite'
WHERE sort_order = 15 AND room_type = 'suite_1st_floor';

UPDATE rooms SET name = 'Grouper',   room_number = '104', fish_name = 'Grouper',   floor = 1,
  description = '1st Floor Main Building Hotel Suite'
WHERE sort_order = 16 AND room_type = 'suite_1st_floor';

-- 2nd Floor Main Building Hotel Suites (201-204)
UPDATE rooms SET name = 'Bonefish',  room_number = '201', fish_name = 'Bonefish',  floor = 2,
  description = '2nd Floor Main Building Hotel Suite'
WHERE sort_order = 9 AND room_type = 'suite_2nd_floor';

UPDATE rooms SET name = 'Snook',     room_number = '202', fish_name = 'Snook',     floor = 2,
  description = '2nd Floor Main Building Hotel Suite'
WHERE sort_order = 10 AND room_type = 'suite_2nd_floor';

UPDATE rooms SET name = 'Tarpon',    room_number = '203', fish_name = 'Tarpon',    floor = 2,
  description = '2nd Floor Main Building Hotel Suite'
WHERE sort_order = 11 AND room_type = 'suite_2nd_floor';

UPDATE rooms SET name = 'Permit',    room_number = '204', fish_name = 'Permit',    floor = 2,
  description = '2nd Floor Main Building Hotel Suite'
WHERE sort_order = 12 AND room_type = 'suite_2nd_floor';

-- 1BR Overwater Cabanas (301-307)
UPDATE rooms SET name = 'Conch',     room_number = '301', fish_name = 'Conch',     floor = 1,
  description = '1 Bedroom Overwater Honeymoon Cabana'
WHERE sort_order = 1 AND room_type = 'cabana_1br';

UPDATE rooms SET name = 'Dorado',    room_number = '302', fish_name = 'Dorado',    floor = 1,
  description = '1 Bed Overwater Cabana (Duplex)'
WHERE sort_order = 2 AND room_type = 'cabana_1br';

UPDATE rooms SET name = 'Marlin',    room_number = '303', fish_name = 'Marlin',    floor = 1,
  description = '1 Bed Overwater Cabana (Duplex)'
WHERE sort_order = 3 AND room_type = 'cabana_1br';

UPDATE rooms SET name = 'Sailfish',  room_number = '304', fish_name = 'Sailfish',  floor = 1,
  description = '1 Bed Overwater Cabana (Duplex)'
WHERE sort_order = 4 AND room_type = 'cabana_1br';

UPDATE rooms SET name = 'Wahoo',     room_number = '305', fish_name = 'Wahoo',     floor = 1,
  description = '1 Bed Overwater Cabana (Duplex)'
WHERE sort_order = 5 AND room_type = 'cabana_1br';

UPDATE rooms SET name = 'Bonito',    room_number = '306', fish_name = 'Bonito',    floor = 1,
  description = '1 Bed Overwater Cabana (Duplex)'
WHERE sort_order = 6 AND room_type = 'cabana_1br';

UPDATE rooms SET name = 'Mahi Mahi', room_number = '307', fish_name = 'Mahi Mahi', floor = 1,
  description = '1 Bed Overwater Cabana (Duplex)'
WHERE sort_order = 7 AND room_type = 'cabana_1br';

-- 2BR Overwater Cabana (401)
UPDATE rooms SET name = 'Starfish',  room_number = '401', fish_name = 'Starfish',  floor = 1,
  description = '2 Bedroom Overwater Cabana'
WHERE sort_order = 8 AND room_type = 'cabana_2br';

-- ── Fix sort_order to match FreeToBook room number order ────
-- 101-104 first, then 201-204, then 301-307, then 401
UPDATE rooms SET sort_order = 1  WHERE room_number = '101';
UPDATE rooms SET sort_order = 2  WHERE room_number = '102';
UPDATE rooms SET sort_order = 3  WHERE room_number = '103';
UPDATE rooms SET sort_order = 4  WHERE room_number = '104';
UPDATE rooms SET sort_order = 5  WHERE room_number = '201';
UPDATE rooms SET sort_order = 6  WHERE room_number = '202';
UPDATE rooms SET sort_order = 7  WHERE room_number = '203';
UPDATE rooms SET sort_order = 8  WHERE room_number = '204';
UPDATE rooms SET sort_order = 9  WHERE room_number = '301';
UPDATE rooms SET sort_order = 10 WHERE room_number = '302';
UPDATE rooms SET sort_order = 11 WHERE room_number = '303';
UPDATE rooms SET sort_order = 12 WHERE room_number = '304';
UPDATE rooms SET sort_order = 13 WHERE room_number = '305';
UPDATE rooms SET sort_order = 14 WHERE room_number = '306';
UPDATE rooms SET sort_order = 15 WHERE room_number = '307';
UPDATE rooms SET sort_order = 16 WHERE room_number = '401';

-- ── Set FreeToBook iCal feed URLs per room type ─────────────
-- These are type-level feeds: a date appears blocked when ALL units of that type are sold
-- 1st Floor Hotel Suites (101-104) — 4 units
UPDATE rooms SET ical_url = 'https://www.freetobook.com/ical/unit-feed/959b1a7222.ics' WHERE room_number IN ('101','102','103','104');
-- 2nd Floor Hotel Suites (201-204) — 4 units
UPDATE rooms SET ical_url = 'https://www.freetobook.com/ical/unit-feed/5f7dc5153c.ics' WHERE room_number IN ('201','202','203','204');
-- 1BR Honeymoon Cabana (301 Conch) — 1 unit
UPDATE rooms SET ical_url = 'https://www.freetobook.com/ical/unit-feed/a6f2e1c857.ics' WHERE room_number = '301';
-- 1BR Overwater Cabana Duplex (302-307) — 6 units
UPDATE rooms SET ical_url = 'https://www.freetobook.com/ical/unit-feed/a93a839179.ics' WHERE room_number IN ('302','303','304','305','306','307');
-- 2BR Overwater Cabana (401 Starfish) — 1 unit
UPDATE rooms SET ical_url = 'https://www.freetobook.com/ical/unit-feed/d340dad73c.ics' WHERE room_number = '401';

-- ── Create index on ical_url for sync queries ───────────────
CREATE INDEX IF NOT EXISTS idx_rooms_ical ON rooms(ical_url) WHERE ical_url IS NOT NULL;
