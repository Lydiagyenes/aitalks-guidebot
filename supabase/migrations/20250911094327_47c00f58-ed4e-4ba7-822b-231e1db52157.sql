-- Secure knowledge base tables with RLS
-- 1) Enable RLS on both tables
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- 2) Ensure service_role-only policies exist (idempotent creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'knowledge_items' 
      AND policyname = 'Service role can manage knowledge_items'
  ) THEN
    CREATE POLICY "Service role can manage knowledge_items"
    ON public.knowledge_items
    AS PERMISSIVE
    FOR ALL
    USING (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role') = 'service_role')
    WITH CHECK (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role') = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'knowledge_chunks' 
      AND policyname = 'Service role can manage knowledge_chunks'
  ) THEN
    CREATE POLICY "Service role can manage knowledge_chunks"
    ON public.knowledge_chunks
    AS PERMISSIVE
    FOR ALL
    USING (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role') = 'service_role')
    WITH CHECK (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role') = 'service_role');
  END IF;
END$$;