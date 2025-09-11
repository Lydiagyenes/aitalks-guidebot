-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge_items table
CREATE TABLE public.knowledge_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  source_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create knowledge_chunks table
CREATE TABLE public.knowledge_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.knowledge_items(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  embedding VECTOR(768),
  position INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_knowledge_chunks_item_id ON public.knowledge_chunks(item_id);
CREATE INDEX idx_knowledge_chunks_tags ON public.knowledge_chunks USING GIN(tags);
CREATE INDEX idx_knowledge_chunks_embedding ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable RLS
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies - only service role can access
CREATE POLICY "Service role can manage knowledge_items" 
ON public.knowledge_items 
FOR ALL 
USING (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text)
WITH CHECK (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Service role can manage knowledge_chunks" 
ON public.knowledge_chunks 
FOR ALL 
USING (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text)
WITH CHECK (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text);

-- Create function to match knowledge chunks
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

-- Create triggers for updated_at
CREATE TRIGGER update_knowledge_items_updated_at
  BEFORE UPDATE ON public.knowledge_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant execute permission on the function to service role
GRANT EXECUTE ON FUNCTION public.match_knowledge TO service_role;