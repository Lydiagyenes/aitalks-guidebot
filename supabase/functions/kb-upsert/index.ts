import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

interface UpsertKnowledgeRequest {
  title: string;
  content: string;
  tags: string[];
  source_url?: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check admin token for security
    const adminToken = req.headers.get('x-admin-token');
    const expectedToken = Deno.env.get('ADMIN_TOKEN');
    
    if (!expectedToken || adminToken !== expectedToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { title, content, tags, source_url, metadata }: UpsertKnowledgeRequest = await req.json();

    if (!title || !content || !tags) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, content, tags' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create knowledge item
    const { data: item, error: itemError } = await supabase
      .from('knowledge_items')
      .insert({
        title,
        source_url,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (itemError) {
      console.error('Error creating knowledge item:', itemError);
      return new Response(
        JSON.stringify({ error: 'Failed to create knowledge item' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chunk the content (simple chunking by paragraphs or length)
    const chunks = chunkContent(content);
    const geminiApiKey = Deno.env.get('Gemini_API') || Deno.env.get('Gemini_API2');

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each chunk
    const processedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding using Gemini
      const embedding = await generateEmbedding(chunk, geminiApiKey);
      
      if (embedding) {
        const { data: chunkData, error: chunkError } = await supabase
          .from('knowledge_chunks')
          .insert({
            item_id: item.id,
            content: chunk,
            tags,
            embedding,
            position: i,
            token_count: estimateTokenCount(chunk),
            metadata: {}
          })
          .select()
          .single();

        if (chunkError) {
          console.error('Error creating chunk:', chunkError);
        } else {
          processedChunks.push(chunkData);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        item_id: item.id,
        chunks_created: processedChunks.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in kb-upsert:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function chunkContent(content: string): string[] {
  // Simple chunking by paragraphs, keeping chunks under ~1000 characters
  const paragraphs = content.split('\n\n').filter(p => p.trim());
  const chunks = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > 1000 && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [content];
}

function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: {
          parts: [{ text }]
        }
      }),
    });

    if (!response.ok) {
      console.error('Embedding API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.embedding?.values || null;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}
