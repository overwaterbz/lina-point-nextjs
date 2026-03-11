-- Magic Content table for storing generated songs/videos
CREATE TABLE IF NOT EXISTS magic_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES tour_bookings(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL, -- 'song' | 'video' | 'audio_remix'
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  prompt TEXT, -- The Grok prompt used to generate
  media_url TEXT NOT NULL, -- Supabase Storage URL
  duration_seconds INTEGER, -- Length of content
  file_size_bytes INTEGER, -- For display purposes
  status TEXT DEFAULT 'completed', -- pending, processing, completed, failed
  error_message TEXT,
  generation_provider TEXT, -- 'suno', 'ltx_studio', 'klangio', etc.
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_magic_content_user_id ON magic_content(user_id);
CREATE INDEX idx_magic_content_reservation_id ON magic_content(reservation_id);
CREATE INDEX idx_magic_content_content_type ON magic_content(content_type);
CREATE INDEX idx_magic_content_status ON magic_content(status);
CREATE INDEX idx_magic_content_created_at ON magic_content(created_at);

-- Enable RLS
ALTER TABLE magic_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own magic content" ON magic_content
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own magic content" ON magic_content
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own magic content" ON magic_content
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Questionnaire data for content generation
CREATE TABLE IF NOT EXISTS magic_questionnaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES tour_bookings(id) ON DELETE SET NULL,
  occasion TEXT, -- 'birthday', 'anniversary', 'reunion', 'proposal', 'celebration'
  recipient_name TEXT,
  gift_you_name TEXT,
  key_memories TEXT, -- JSON array of memories
  favorite_colors TEXT, -- JSON array
  favorite_songs_artists TEXT, -- JSON array
  message TEXT, -- Personal message to include
  music_style TEXT, -- 'tropical', 'edm', 'reggae', 'calypso', 'ambient'
  mood TEXT, -- 'romantic', 'energetic', 'peaceful', 'celebratory'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_magic_questionnaire_user_id ON magic_questionnaire(user_id);
CREATE INDEX idx_magic_questionnaire_reservation_id ON magic_questionnaire(reservation_id);

-- Enable RLS
ALTER TABLE magic_questionnaire ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own questionnaires" ON magic_questionnaire
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own questionnaires" ON magic_questionnaire
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questionnaires" ON magic_questionnaire
  FOR UPDATE USING (auth.uid() = user_id);
