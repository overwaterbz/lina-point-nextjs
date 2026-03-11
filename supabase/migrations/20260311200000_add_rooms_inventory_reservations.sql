-- ============================================================
-- Phase 1: Rooms, Inventory Calendar, and Reservations
-- ============================================================

-- Room types enum
CREATE TYPE room_type_enum AS ENUM (
  'cabana_1br',
  'cabana_2br',
  'suite_2nd_floor',
  'overwater_suite'
);

-- Reservation status lifecycle
CREATE TYPE reservation_status AS ENUM (
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show'
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'refunded',
  'failed'
);

-- Inventory date status
CREATE TYPE inventory_status AS ENUM (
  'available',
  'booked',
  'blocked',
  'maintenance'
);

-- ============================================================
-- 1. Rooms table — physical room inventory (16 rooms)
-- ============================================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type room_type_enum NOT NULL,
  name TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 2,
  amenities JSONB DEFAULT '[]'::jsonb,
  base_rate_usd DECIMAL(10,2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the 16 rooms
INSERT INTO rooms (room_type, name, capacity, base_rate_usd, amenities, description, sort_order) VALUES
  -- 7 × 1-bedroom cabanas
  ('cabana_1br', 'Cabana 1', 2, 199.00, '["AC","WiFi","kayak","hammock"]', '1-bedroom cabana with garden view', 1),
  ('cabana_1br', 'Cabana 2', 2, 199.00, '["AC","WiFi","kayak","hammock"]', '1-bedroom cabana with garden view', 2),
  ('cabana_1br', 'Cabana 3', 2, 199.00, '["AC","WiFi","kayak","hammock"]', '1-bedroom cabana with garden view', 3),
  ('cabana_1br', 'Cabana 4', 2, 199.00, '["AC","WiFi","kayak","hammock"]', '1-bedroom cabana with garden view', 4),
  ('cabana_1br', 'Cabana 5', 2, 199.00, '["AC","WiFi","kayak","hammock"]', '1-bedroom cabana with garden view', 5),
  ('cabana_1br', 'Cabana 6', 2, 199.00, '["AC","WiFi","kayak","hammock"]', '1-bedroom cabana with garden view', 6),
  ('cabana_1br', 'Cabana 7', 2, 199.00, '["AC","WiFi","kayak","hammock"]', '1-bedroom cabana with garden view', 7),
  -- 1 × 2-bedroom cabana
  ('cabana_2br', 'Family Cabana', 6, 349.00, '["AC","WiFi","kayak","hammock","kitchenette"]', '2-bedroom cabana for families', 8),
  -- 4 × 2nd floor suites
  ('suite_2nd_floor', 'Reef Suite 1', 2, 249.00, '["AC","WiFi","kayak","balcony","minibar"]', '2nd floor suite with reef view', 9),
  ('suite_2nd_floor', 'Reef Suite 2', 2, 249.00, '["AC","WiFi","kayak","balcony","minibar"]', '2nd floor suite with reef view', 10),
  ('suite_2nd_floor', 'Reef Suite 3', 2, 249.00, '["AC","WiFi","kayak","balcony","minibar"]', '2nd floor suite with reef view', 11),
  ('suite_2nd_floor', 'Reef Suite 4', 2, 249.00, '["AC","WiFi","kayak","balcony","minibar"]', '2nd floor suite with reef view', 12),
  -- 4 × 1st floor overwater suites
  ('overwater_suite', 'Overwater Suite 1', 2, 299.00, '["AC","WiFi","kayak","glass floor","private dock","outdoor shower"]', 'Overwater suite with direct ocean access', 13),
  ('overwater_suite', 'Overwater Suite 2', 2, 299.00, '["AC","WiFi","kayak","glass floor","private dock","outdoor shower"]', 'Overwater suite with direct ocean access', 14),
  ('overwater_suite', 'Overwater Suite 3', 2, 299.00, '["AC","WiFi","kayak","glass floor","private dock","outdoor shower"]', 'Overwater suite with direct ocean access', 15),
  ('overwater_suite', 'Overwater Suite 4', 2, 299.00, '["AC","WiFi","kayak","glass floor","private dock","outdoor shower"]', 'Overwater suite with direct ocean access', 16);

-- ============================================================
-- 2. Room inventory — date-level availability calendar
-- ============================================================
CREATE TABLE room_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status inventory_status NOT NULL DEFAULT 'available',
  reservation_id UUID, -- FK added after reservations table created
  rate_override DECIMAL(10,2), -- null = use base_rate_usd from rooms
  notes TEXT,
  UNIQUE(room_id, date)
);

CREATE INDEX idx_room_inventory_date ON room_inventory(date);
CREATE INDEX idx_room_inventory_status ON room_inventory(status, date);
CREATE INDEX idx_room_inventory_room_date ON room_inventory(room_id, date);

-- ============================================================
-- 3. Reservations table — booking records
-- ============================================================
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_number TEXT NOT NULL UNIQUE,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id),
  room_type room_type_enum NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INT NOT NULL,
  guests_count INT NOT NULL DEFAULT 2,
  base_rate DECIMAL(10,2) NOT NULL,
  total_room_cost DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL, -- room + tours + dining
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_processor TEXT, -- 'square' or 'stripe'
  payment_id TEXT, -- external payment reference
  booking_id TEXT, -- links to tour_bookings.booking_id
  special_requests TEXT,
  status reservation_status NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reservations_guest ON reservations(guest_id);
CREATE INDEX idx_reservations_confirmation ON reservations(confirmation_number);
CREATE INDEX idx_reservations_dates ON reservations(check_in, check_out);
CREATE INDEX idx_reservations_status ON reservations(status);

-- Now add the FK from room_inventory to reservations
ALTER TABLE room_inventory
  ADD CONSTRAINT fk_room_inventory_reservation
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL;

-- ============================================================
-- 4. Add booking_id column to tour_bookings if not exists
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tour_bookings' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE tour_bookings ADD COLUMN booking_id TEXT;
    CREATE INDEX idx_tour_bookings_booking_id ON tour_bookings(booking_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tour_bookings' AND column_name = 'payment_intent'
  ) THEN
    ALTER TABLE tour_bookings ADD COLUMN payment_intent TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tour_bookings' AND column_name = 'payment_processor'
  ) THEN
    ALTER TABLE tour_bookings ADD COLUMN payment_processor TEXT;
  END IF;
END$$;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

-- Rooms: public read
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view rooms" ON rooms FOR SELECT USING (true);

-- Room inventory: public read (for availability checks)
ALTER TABLE room_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view inventory" ON room_inventory FOR SELECT USING (true);

-- Reservations: users see their own
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reservations" ON reservations
  FOR SELECT USING (auth.uid() = guest_id);
CREATE POLICY "Users can insert reservations" ON reservations
  FOR INSERT WITH CHECK (auth.uid() = guest_id);
CREATE POLICY "Users can update own reservations" ON reservations
  FOR UPDATE USING (auth.uid() = guest_id);

-- Service role bypass for webhooks/crons (Supabase service_role key bypasses RLS automatically)
