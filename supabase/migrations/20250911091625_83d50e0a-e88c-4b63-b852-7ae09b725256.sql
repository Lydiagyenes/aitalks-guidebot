-- Fix security issues from previous migration

-- Update the match_knowledge function with proper search_path
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding VECTOR(768),
  match_count INTEGER DEFAULT 8,
  filter_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  tags TEXT[],
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;