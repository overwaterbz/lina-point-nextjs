-- Add staff-level read access to admin-queried tables
-- Run in Supabase SQL Editor after the Phase 8 migration

-- ── Reservations: staff can view all ────────────────────────
DROP POLICY IF EXISTS "Staff can view all reservations" ON reservations;
CREATE POLICY "Staff can view all reservations" ON reservations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('owner', 'manager', 'front_desk'))
  );

-- ── Reservations: staff can update all ──────────────────────
DROP POLICY IF EXISTS "Staff can update all reservations" ON reservations;
CREATE POLICY "Staff can update all reservations" ON reservations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('owner', 'manager', 'front_desk'))
  );

-- ── Invoices: staff can view all ────────────────────────────
DROP POLICY IF EXISTS "Staff can view all invoices" ON invoices;
CREATE POLICY "Staff can view all invoices" ON invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('owner', 'manager', 'front_desk'))
  );

-- ── Invoices: staff can manage ──────────────────────────────
DROP POLICY IF EXISTS "Staff can manage invoices" ON invoices;
CREATE POLICY "Staff can manage invoices" ON invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('owner', 'manager'))
  );

-- ── Tour Bookings: staff can view all ───────────────────────
DROP POLICY IF EXISTS "Staff can view all tour bookings" ON tour_bookings;
CREATE POLICY "Staff can view all tour bookings" ON tour_bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('owner', 'manager', 'front_desk'))
  );

-- ── Housekeeping: staff can insert ──────────────────────────
DROP POLICY IF EXISTS "Staff can insert housekeeping" ON housekeeping_tasks;
CREATE POLICY "Staff can insert housekeeping" ON housekeeping_tasks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('owner', 'manager', 'front_desk'))
  );

-- ── Notifications: staff can insert (for broadcasting) ─────
DROP POLICY IF EXISTS "Staff can insert notifications" ON notifications;
CREATE POLICY "Staff can insert notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('owner', 'manager'))
  );
