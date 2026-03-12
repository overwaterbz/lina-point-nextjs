-- Phase 7: Dashboard Schema — roles, housekeeping, tours catalog, invoices, notifications, AI insights, admin activity
-- Run in Supabase SQL Editor

-- ── Add role column to profiles ─────────────────────────────
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'guest'
CHECK (role IN ('owner', 'manager', 'front_desk', 'guest'));

-- Set owner role for the admin email
UPDATE public.profiles
SET role = 'owner'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
);

-- ── Tours Catalog ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  provider TEXT DEFAULT 'Dee Kay''s Tours',
  price NUMERIC(10,2) NOT NULL,
  duration_hours NUMERIC(4,1),
  category TEXT CHECK (category IN ('water', 'land', 'culture', 'nature', 'adventure', 'dining', 'wellness')),
  max_guests INT DEFAULT 12,
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the 7 Belize tours from the experience curator
INSERT INTO tours (name, description, provider, price, duration_hours, category, max_guests) VALUES
  ('Hol Chan & Shark Ray Alley', 'Snorkel the world-famous Hol Chan Marine Reserve and swim with nurse sharks and rays at Shark Ray Alley.', 'Dee Kay''s Tours', 75, 3, 'water', 12),
  ('Blue Hole Flight + Dive', 'Scenic flight over the Great Blue Hole followed by a guided dive into the ancient sinkhole.', 'Dee Kay''s Tours', 350, 6, 'water', 8),
  ('Lamanai Ruins Day Trip', 'Explore ancient Maya temples deep in the jungle, accessible by boat along the New River.', 'Dee Kay''s Tours', 160, 8, 'culture', 10),
  ('Bioluminescence Night Tour', 'Kayak or paddleboard through bioluminescent waters under the stars.', 'Dee Kay''s Tours', 65, 2, 'water', 10),
  ('Secret Beach & Kiteboarding', 'Visit the famous Secret Beach on the west side of Ambergris Caye with optional kiteboarding lesson.', 'Dee Kay''s Tours', 85, 4, 'water', 12),
  ('Chocolate & Spice Farm Tour', 'Visit a traditional cacao farm, learn Maya chocolate-making, and sample local spices.', 'Dee Kay''s Tours', 95, 5, 'culture', 8),
  ('Sunset Sailing Cruise', 'Private catamaran cruise along the reef with rum punch, ceviche, and a legendary Caribbean sunset.', 'Dee Kay''s Tours', 120, 3, 'dining', 12)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_tours_active ON tours(active);
CREATE INDEX IF NOT EXISTS idx_tours_category ON tours(category);

-- ── Housekeeping Tasks ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_type TEXT NOT NULL CHECK (task_type IN ('turnover', 'deep_clean', 'maintenance', 'inspection')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'skipped')),
  assigned_to UUID REFERENCES profiles(id),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_housekeeping_date ON housekeeping_tasks(date);
CREATE INDEX IF NOT EXISTS idx_housekeeping_room ON housekeeping_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_status ON housekeeping_tasks(status);
CREATE INDEX IF NOT EXISTS idx_housekeeping_assigned ON housekeeping_tasks(assigned_to);

-- ── Invoices ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  guest_id UUID NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,4) DEFAULT 0.125, -- 12.5% Belize GST
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_guest ON invoices(guest_id);
CREATE INDEX IF NOT EXISTS idx_invoices_reservation ON invoices(reservation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ── Notifications ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- NULL = broadcast to all
  type TEXT NOT NULL CHECK (type IN ('booking', 'cancellation', 'housekeeping', 'pricing', 'system', 'ai_insight', 'payment', 'review')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ── AI Insights ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL CHECK (insight_type IN ('pricing', 'occupancy', 'upsell', 'marketing', 'housekeeping', 'guest', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_suggestion TEXT,
  confidence NUMERIC(3,2) CHECK (confidence BETWEEN 0 AND 1),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'acted', 'dismissed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON ai_insights(status);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);

-- ── Admin Activity (for adaptive layout) ────────────────────
CREATE TABLE IF NOT EXISTS admin_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  page TEXT NOT NULL,
  widget TEXT,
  action TEXT DEFAULT 'view' CHECK (action IN ('view', 'click', 'expand', 'dismiss')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_user ON admin_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_page ON admin_activity(page);

-- ── RLS Policies ────────────────────────────────────────────

-- Tours: public read, admin write
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active tours" ON tours FOR SELECT USING (active = true);
CREATE POLICY "Service role full access tours" ON tours FOR ALL USING (auth.role() = 'service_role');

-- Housekeeping: staff+ can read/write
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access housekeeping" ON housekeeping_tasks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Staff can read housekeeping" ON housekeeping_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('owner', 'manager', 'front_desk'))
);
CREATE POLICY "Staff can update housekeeping" ON housekeeping_tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('owner', 'manager', 'front_desk'))
);

-- Invoices: guests see own, staff see all
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guests see own invoices" ON invoices FOR SELECT USING (guest_id = auth.uid());
CREATE POLICY "Service role full access invoices" ON invoices FOR ALL USING (auth.role() = 'service_role');

-- Notifications: users see own + broadcasts
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users mark own as read" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Service role full access notifications" ON notifications FOR ALL USING (auth.role() = 'service_role');

-- AI Insights: admin-only
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access insights" ON ai_insights FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Staff can read insights" ON ai_insights FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('owner', 'manager'))
);

-- Admin Activity: service role only
ALTER TABLE admin_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access admin_activity" ON admin_activity FOR ALL USING (auth.role() = 'service_role');

-- ── Tour Bookings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tour_id UUID NOT NULL REFERENCES tours(id),
  tour_date DATE NOT NULL,
  num_guests INT DEFAULT 1,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_bookings_user ON tour_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_bookings_tour ON tour_bookings(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_bookings_date ON tour_bookings(tour_date);

ALTER TABLE tour_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guests see own tour bookings" ON tour_bookings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Guests insert own tour bookings" ON tour_bookings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role full access tour_bookings" ON tour_bookings FOR ALL USING (auth.role() = 'service_role');

-- ── Price Overrides ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type TEXT NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_overrides_dates ON price_overrides(date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_price_overrides_room_type ON price_overrides(room_type);

ALTER TABLE price_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access price_overrides" ON price_overrides FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Staff can read price overrides" ON price_overrides FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('owner', 'manager'))
);
CREATE POLICY "Staff can manage price overrides" ON price_overrides FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('owner', 'manager'))
);
