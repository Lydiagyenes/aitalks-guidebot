import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',  
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let topicHint = 'general';
  let lastFollowups: string[] | undefined = undefined;
  let originalMessage = '';
  try {
    const { message, history, topic_hint, last_followups } = await req.json();
    originalMessage = message || '';
    topicHint = topic_hint || 'general';
    lastFollowups = last_followups;
    
    if (!message) {
      throw new Error('Message is required');
    }

    const geminiApiKey = Deno.env.get('Gemini_API');
    const geminiApiKey2 = Deno.env.get('Gemini_API2');
    
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Initialize Supabase client with service role for RAG
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // AI Talks konferencia specifikus prompt (rövidített a RAG miatt)
    const systemPrompt = `Te az AI Talks konferencia hivatalos asszisztense vagy. A konferencia a HVG és Amazing AI közös szervezésében valósul meg Budapesten 2025. november 20-án.

KRITIKUS SZABÁLYOK - KÖTELEZŐ KÖVETNI:
1. CSAK a rendelkezésre álló kontextus vagy az alábbi alapinformációk alapján válaszolj
2. HA nincs információd, mondd: "Erről most nincs megbízható információ a tudásbázisban."
3. SOHA ne találj ki, ne spekulálj, ne hallucinálj információkat
4. Ha bizonytalan vagy, inkább mondd azt, hogy nem tudod, mint hogy pontatlan infót adj

ALAPVETŐ TUDÁS (csak ez és a kontextus):
- Rendezvény: AI TALKS by HVG & Amazing AI
- Időpont: 2025. november 20.
- Helyszín: Bálna, Budapest, Fővám tér 11-12, 1093
- Téma: "Az AI mint üzlettárs: szemléletváltó konferencia"
- Jegyvásárlás: Super early bird kedvezmények (szeptember 30-ig)

JEGYTÍPUSOK:
- BASIC: 35.940 Ft + áfa (teljes napos részvétel)
- PRÉMIUM: 41.940 Ft + áfa (+ videók, próbahozzáférések)
- VIP: 71.400 Ft + áfa (+ VIP belépés, könyvek, extrák)

VÁLASZADÁSI STÍLUS:
- Tegezd a felhasználót, barátságos hangnem
- Lényegre törő, 1-3 mondatos válaszok
- Jegyvásárlást csak minden 5. válaszban említsd
- Minden válasz végén 1 rövid, témára szabott követő kérdést

HISTORY CONTEXT: ${history ? `Utolsó üzenetek: ${JSON.stringify(history)}` : 'Nincs korábbi kontextus'}
TOPIC HINT: ${topicHint || 'általános'}`;

    // Map topic_hint to tags for RAG filtering + server-side topic detection
    const initialTags = mapTopicToTags(topicHint);
    const detectedTopic = detectTopicFromMessage(originalMessage);
    const filterTags = initialTags ?? (detectedTopic ? mapTopicToTags(detectedTopic) : null);
    // Try RAG-enhanced response first
    let responseFromAI: string;
    let usedContext: any[] = [];
    let currentApiKey = geminiApiKey;

    try {
      // Generate embedding for the user's message
      console.log('[RAG] Generating embedding for query:', originalMessage);
      const queryEmbedding = await generateEmbedding(originalMessage, currentApiKey);
      
      if (queryEmbedding) {
        console.log('[RAG] Embedding generated successfully, dimensions:', queryEmbedding.length);
        
        // Retrieve relevant knowledge chunks
        console.log('[RAG] Calling match_knowledge with match_count: 6, filter_tags:', filterTags);
        const { data: contexts, error: contextError } = await supabase.rpc('match_knowledge', {
          query_embedding: queryEmbedding,
          match_count: 6,
          filter_tags: filterTags
        });

        if (contextError) {
          console.error('[RAG] Error calling match_knowledge:', contextError);
        }
        
        if (!contextError && contexts && contexts.length > 0) {
          console.log('[RAG] Found', contexts.length, 'relevant contexts');
          usedContext = contexts;
          
          // Build context string
          const contextString = contexts
            .map((ctx: any, idx: number) => `KONTEXTUS #${idx + 1}:\n${ctx.content}\nCímkék: ${ctx.tags.join(', ')}\n`)
            .join('\n---\n');

          // Enhanced system prompt with context
          const contextualSystemPrompt = `${systemPrompt}

KRITIKUS: Az alábbi kontextus a LEGFONTOSABB információforrásod. KIZÁRÓLAG ebből és az alapinformációkból válaszolj!

RELEVÁNS KONTEXTUS A TUDÁSBÁZISBÓL:
${contextString}

VÁLASZADÁSI PRIORITÁS:
1. ELŐSZÖR: Keress választ a fenti kontextusban
2. MÁSODSZOR: Ha nincs a kontextusban, de az alapinformációk között megtalálod, akkor onnan válaszolj
3. HARMADSZOR: Ha egyik sem tartalmazza, akkor mondd: "Ezt az információt jelenleg nem találom a rendszeremben. Szeretnéd, ha más témában segítenék?"

NE HASZNÁLD az "általános tudásodat" vagy ne találj ki semmit. CSAK a kontextus és az alapinformációk!

Válaszolj barátságosan, természetesen, és ha követő kérdéseket javasolsz, azok legyenek relevánsak a kontextus alapján.`;

          // First attempt with primary API key and context
          responseFromAI = await getGeminiResponse(contextualSystemPrompt, originalMessage, currentApiKey);
        } else {
          console.log('[RAG] No contexts from embeddings, attempting keyword text search');
          // Fallback: simple keyword text search in knowledge base
          const keywords = extractKeywords(originalMessage);
          if (keywords.length > 0) {
            const orFilters = keywords.slice(0, 3).map((kw) => `content.ilike.%${kw}%`).join(',');
            const { data: textHits, error: textErr } = await supabase
              .from('knowledge_chunks')
              .select('id, content, tags')
              .or(orFilters)
              .limit(5);

            if (!textErr && textHits && textHits.length > 0) {
              console.log('[RAG] Text search found', textHits.length, 'hits');
              usedContext = textHits as any[];
              const ctxStr = textHits
                .map((ctx: any, idx: number) => `KONTEXTUS #${idx + 1}:\n${ctx.content}\nCímkék: ${ctx.tags?.join(', ') || ''}\n`)
                .join('\n---\n');

              const contextualSystemPrompt = `${systemPrompt}\n\nKRITIKUS: Az alábbi kontextus a LEGFONTOSABB információforrásod. KIZÁRÓLAG ebből és az alapinformációkból válaszolj!\n\nRELEVÁNS KONTEXTUS A TUDÁSBÁZISBÓL:\n${ctxStr}\n\nVÁLASZADÁSI PRIORITÁS:\n1. ELŐSZÖR: Keress választ a fenti kontextusban\n2. MÁSODSZOR: Ha nincs a kontextusban, de az alapinformációk között megtalálod, akkor onnan válaszolj\n3. HARMADSZOR: Ha egyik sem tartalmazza, mondd: \"Erről most nincs megbízható információ a tudásbázisban.\"\n\nNE HASZNÁLD az \"általános tudásodat\" vagy ne találj ki semmit. CSAK a kontextus és az alapinformációk!`;

              responseFromAI = await getGeminiResponse(contextualSystemPrompt, originalMessage, currentApiKey);
            } else {
              console.log('[RAG] No text hits, using original system prompt');
              responseFromAI = await getGeminiResponse(systemPrompt, originalMessage, currentApiKey);
            }
          } else {
            console.log('[RAG] No keywords extracted, using original system prompt');
            responseFromAI = await getGeminiResponse(systemPrompt, originalMessage, currentApiKey);
          }
        }
      } else {
        console.log('[RAG] Failed to generate embedding, fallback to original approach');
        // Failed to generate embedding, fallback to original approach
        responseFromAI = await getGeminiResponse(systemPrompt, originalMessage, currentApiKey);
      }
    } catch (error: any) {
      console.error('Error with primary Gemini API:', error);
      
      // If 429 error and we have a secondary key, try it
      if (error.message?.includes('429') && geminiApiKey2) {
        console.log('Trying secondary API key due to 429 error...');
        currentApiKey = geminiApiKey2;
        try {
          responseFromAI = await getGeminiResponse(systemPrompt, originalMessage, currentApiKey);
        } catch (secondError: any) {
          console.error('Error with secondary Gemini API:', secondError);
          responseFromAI = getFallbackResponse(originalMessage, topicHint);
        }
      } else {
        responseFromAI = getFallbackResponse(originalMessage, topicHint);
      }
    }

    return new Response(
      JSON.stringify({ 
        response: responseFromAI,
        metadata: {
          used_context_count: usedContext.length,
          context_ids: usedContext.map((ctx: any) => ctx.id),
          filter_tags: filterTags
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    
    // Fallback válasz témára szabottan
    const topicFallbacks = {
      program: 'Köszi az üzeneted! A konferencia november 20-án lesz Budapesten. Melyik előadás érdekel leginkább? ✨',
      workshop: 'Köszi az üzenetet! Délután párhuzamos workshopok lesznek. Melyik témakör lenne számodra leginkább hasznos? 🛠️',
      parking: 'Természetesen! A Bálnánál van saját mélygarázs. Más parkolási lehetőségekről is szeretnél tudni? 🚗',
      restaurant: 'Szuper kérdés! A Bálna környékén több étterem is van. Milyen konyhát preferálnál? 🍽️',
      ticket: 'A super early bird jegyek szeptember 30-ig elérhetők kedvezménnyel! Melyik kategória érdekel? 🎫',
      general: 'Szia! Szívesen segítek az AI Talks konferenciával kapcsolatban. Mire vagy kíváncsi? 😊'
    };

    const fallbackKey = topicHint in topicFallbacks ? topicHint : 'general';
    const fallbackResponse = topicFallbacks[fallbackKey as keyof typeof topicFallbacks];

    return new Response(JSON.stringify({ response: fallbackResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to call AI via Lovable AI Gateway
async function getGeminiResponse(systemPrompt: string, message: string, _apiKey: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway error: ${resp.status} - ${t}`);
  }

  const data = await resp.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Invalid response from AI gateway");
  return content;
}

// Fallback response based on topic
function getFallbackResponse(originalMessage: string, topic_hint?: string): string {
  if (!topic_hint || !originalMessage) {
    return "Sajnos jelenleg nem tudok válaszolni a kérdésedre. Próbáld újra pár perc múlva! 😊";
  }

  const ticketCounter = Math.floor(Math.random() * 5);
  const topicLower = topic_hint.toLowerCase();
  
  const fallbackTopics: { [key: string]: string[] } = {
    program: [
      "A konferencia november 20-án lesz a Bálnában. Délelőtt előadások, délután workshopok. Melyik témakör érdekel? ✨",
      "Izgalmas előadások várnak: AI-ügynökök, vibe-coding, AI-művészet és még sok más! Mit szeretnél tudni? 🎯"
    ],
    workshop: [
      "Délután párhuzamos workshopok lesznek 13:15-től. No-code automatizáció, AI-stratégia, kreatív technikák! Melyik vonz? 🛠️",
      "Gyakorlati workshopok: copywriting AI-jal, vizuális tartalom készítés, voice AI. Mire vagy kíváncsi? ⚡"
    ],
    parking: [
      "A Bálnában van saját mélygarázs 450 Ft/órás díjjal. Más parkolási lehetőségekről is mesélhetek! 🚗",
      "Parkolni lehet a Bálna mélygarázsában, vagy a környékbeli parkolókban. Részleteket szeretnél? 🅿️"
    ]
  };
  
  if (fallbackTopics[topicLower]) {
    return fallbackTopics[topicLower][ticketCounter % fallbackTopics[topicLower].length];
  }
  
  return "Sajnos jelenleg nem tudok válaszolni a kérdésedre, de hamarosan újra próbálkozhatsz! Az AI Talks konferenciával kapcsolatos általános információkért látogass el a hivatalos weboldalra.";
}

// Map topic hints to tags for RAG filtering
function mapTopicToTags(topic_hint?: string): string[] | null {
  if (!topic_hint) return null;
  
  const topicLower = topic_hint.toLowerCase();
  const tagMap: { [key: string]: string[] } = {
    'program': ['program', 'schedule', 'előadás'],
    'workshop': ['workshop', 'műhely'],
    'parking': ['parking', 'parkolás'],
    'restaurant': ['restaurant', 'étterem', 'food'],
    'ticket': ['ticket', 'jegy', 'pricing', 'ár'],
    'speaker': ['speaker', 'előadó'],
    'location': ['location', 'helyszín', 'venue']
  };
  
  for (const [key, tags] of Object.entries(tagMap)) {
    if (topicLower.includes(key) || tags.some(tag => topicLower.includes(tag))) {
      return tags;
    }
  }
  
  return null;
}

// Server-side topic detection
function detectTopicFromMessage(msg: string): string | null {
  const m = msg.toLowerCase();
  if (/(előadó|előad|speaker|ki beszél|kik adnak elő)/i.test(m)) return 'speaker';
  if (/(parkol|garázs|parkoló|parking)/i.test(m)) return 'parking';
  if (/(jegy|ár|ticket|vip|prémium|basic)/i.test(m)) return 'ticket';
  if (/(program|menetrend|schedule|időpont)/i.test(m)) return 'program';
  if (/(workshop|műhely)/i.test(m)) return 'workshop';
  if (/(étterem|ebéd|restaurant|food)/i.test(m)) return 'restaurant';
  if (/(helyszín|megközelítés|location|venue|bálna)/i.test(m)) return 'location';
  return null;
}

// Simple keyword extractor for text search fallback
function extractKeywords(text: string): string[] {
  const original = text.toLowerCase();
  const withoutPunct = original.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const tokens = withoutPunct.split(/\s+/).filter(Boolean);
  const stop = new Set(['a','az','és','vagy','hogy','mi','mit','ki','kik','is','van','lesz','most','nem','de','ra','re','ban','ben','egy','ha','akkor','azt','arra','erről','rol','ról']);
  const keywords = tokens.filter(w => w.length >= 3 && !stop.has(w));
  // Return unique first few
  return Array.from(new Set(keywords)).slice(0, 5);
}

// Generate embedding using Gemini text-embedding-004
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    console.log('[Embedding] Generating for text length:', text.length);
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
      const errorText = await response.text();
      console.error('[Embedding] API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const embeddingValues = data.embedding?.values;
    
    if (!embeddingValues) {
      console.error('[Embedding] No embedding values in response:', JSON.stringify(data));
      return null;
    }
    
    console.log('[Embedding] Successfully generated, dimensions:', embeddingValues.length);
    return embeddingValues;
  } catch (error) {
    console.error('[Embedding] Error generating embedding:', error);
    return null;
  }
}