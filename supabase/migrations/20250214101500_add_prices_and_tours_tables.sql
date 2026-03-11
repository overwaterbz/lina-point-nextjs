-- Create prices table to track OTA prices
CREATE TABLE prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  location TEXT NOT NULL,
  ota_name TEXT NOT NULL, -- 'agoda', 'expedia', 'booking'
  price DECIMAL(10, 2) NOT NULL,
  beat_price DECIMAL(10, 2),
  url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_prices_room_date ON prices(room_type, check_in_date, check_out_date);
CREATE INDEX idx_prices_user ON prices(user_id);
CREATE INDEX idx_prices_ota ON prices(ota_name);

-- Enable RLS
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own prices
CREATE POLICY "Users can view own prices"
  ON prices FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policy: Users can insert prices
CREATE POLICY "Users can insert prices"
  ON prices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own prices
CREATE POLICY "Users can update own prices"
  ON prices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create experiences table for tour bookings
CREATE TABLE tour_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_name TEXT NOT NULL,
  tour_type TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  affiliate_link TEXT,
  commission_earned DECIMAL(10, 2),
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending', -- pending, booked, completed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for tour bookings
CREATE INDEX idx_tour_bookings_user ON tour_bookings(user_id);
CREATE INDEX idx_tour_bookings_status ON tour_bookings(status);

-- Enable RLS on tour bookings
ALTER TABLE tour_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own bookings
CREATE POLICY "Users can view own tour bookings"
  ON tour_bookings FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert bookings
CREATE POLICY "Users can insert tour bookings"
  ON tour_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own bookings
CREATE POLICY "Users can update own tour bookings"
  ON tour_bookings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
