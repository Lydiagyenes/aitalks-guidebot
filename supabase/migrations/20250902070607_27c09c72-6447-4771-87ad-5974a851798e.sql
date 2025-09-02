-- Create table to log chatbot interactions
CREATE TABLE IF NOT EXISTS public.chatbot_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  referrer TEXT,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.chatbot_interactions ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anon) to insert logs, but nothing else
CREATE POLICY "Anyone can insert chatbot logs"
ON public.chatbot_interactions
FOR INSERT
USING (true)
WITH CHECK (true);

-- Allow only service_role to read logs
CREATE POLICY "Only service role can select chatbot logs"
ON public.chatbot_interactions
FOR SELECT
USING (((current_setting('request.jwt.claims', true))::jsonb ->> 'role') = 'service_role');

-- No UPDATE/DELETE policies on purpose

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_created_at ON public.chatbot_interactions (created_at);
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_session_id ON public.chatbot_interactions (session_id);
