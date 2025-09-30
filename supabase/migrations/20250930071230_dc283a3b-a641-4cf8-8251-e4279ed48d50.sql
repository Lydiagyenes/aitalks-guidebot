-- Fix: Add authentication check to match_knowledge function to prevent unauthorized access
-- This prevents competitors from stealing the knowledge base through direct function calls

CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector, 
  match_count integer DEFAULT 8, 
  filter_tags text[] DEFAULT NULL::text[]
)
RETURNS TABLE(id uuid, content text, tags text[], metadata jsonb, similarity double precision)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow service role to call this function
  -- This prevents public access while still allowing the edge function to work
  IF NOT (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
  ) THEN
    RAISE EXCEPTION 'Access denied: This function can only be called by authorized services';
  END IF;

  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.tags,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  WHERE 
    (filter_tags IS NULL OR kc.tags && filter_tags)
    AND kc.embedding IS NOT NULL
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;