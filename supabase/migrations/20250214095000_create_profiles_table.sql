-- Base profiles table + initial columns
-- This must run before all other migrations that reference profiles

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  birthday DATE,
  anniversary DATE,
  special_events JSONB,
  music_style TEXT,
  maya_interests TEXT[],
  opt_in_magic BOOLEAN DEFAULT FALSE,
  magic_profile TEXT,
  language TEXT DEFAULT 'en',
  country TEXT,
  dietary_restrictions TEXT[],
  accessibility_needs TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role full access (for crons and admin)
CREATE POLICY "Service role full access on profiles" ON public.profiles
  FOR ALL USING (true);
