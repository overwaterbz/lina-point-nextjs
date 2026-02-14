-- Migration: Add WhatsApp integration support
-- Adds phone_number to profiles and creates whatsapp_sessions and whatsapp_messages tables

-- 1) Add phone_number column to profiles table (text, unique)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text UNIQUE;

-- Add index for faster phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number 
  ON public.profiles(phone_number) 
  WHERE phone_number IS NOT NULL;

-- 2) Create whatsapp_sessions table for tracking conversation sessions
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  last_message_at timestamptz DEFAULT now(),
  context jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for active session lookups by phone
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_active 
  ON public.whatsapp_sessions(phone_number, is_active) 
  WHERE is_active = true;

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user 
  ON public.whatsapp_sessions(user_id);

-- 3) Create whatsapp_messages table for message logging
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_body text NOT NULL,
  message_sid text UNIQUE,
  status text DEFAULT 'sent',
  agent_response jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for session message history
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_session 
  ON public.whatsapp_messages(session_id, created_at DESC);

-- Index for phone number message history
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone 
  ON public.whatsapp_messages(phone_number, created_at DESC);

-- 4) Row Level Security (RLS)
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to manage all sessions and messages
CREATE POLICY IF NOT EXISTS "WhatsApp sessions: service role full access"
  ON public.whatsapp_sessions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "WhatsApp messages: service role full access"
  ON public.whatsapp_messages
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Users can view their own sessions
CREATE POLICY IF NOT EXISTS "WhatsApp sessions: users view own"
  ON public.whatsapp_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can view their own messages
CREATE POLICY IF NOT EXISTS "WhatsApp messages: users view own"
  ON public.whatsapp_messages
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.whatsapp_sessions WHERE user_id = auth.uid()
    )
  );

-- 5) Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_whatsapp_session_updated_at ON public.whatsapp_sessions;
CREATE TRIGGER trigger_update_whatsapp_session_updated_at
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_session_updated_at();

-- End of migration
