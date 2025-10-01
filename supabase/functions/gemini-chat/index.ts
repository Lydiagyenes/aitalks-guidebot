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
5. Gondolkodj némán 2-3 lépésben; a felhasználónak csak a végső, ellenőrzött választ add vissza

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

    // Normalize query and detect speaker names
    const normalizedMessage = normalizeDiacritics(originalMessage);
    const mentionedSpeaker = detectSpeakerName(normalizedMessage);
    
    // Map topic_hint to tags for RAG filtering + server-side topic detection
    const initialTags = mapTopicToTags(topicHint);
    const detectedTopic = detectTopicFromMessage(originalMessage);
    let filterTags = initialTags ?? (detectedTopic ? mapTopicToTags(detectedTopic) : null);
    
    // If speaker name detected, skip tag filtering for broader search
    if (mentionedSpeaker) {
      console.log('[RAG] Speaker detected:', mentionedSpeaker, '- using no tag filter');
      filterTags = null;
    }
    
    // Try RAG-enhanced response first
    let responseFromAI: string;
    let usedContext: any[] = [];
    let currentApiKey = geminiApiKey;
    let rateLimitError = false;
    let paymentError = false;

    try {
      // Generate embedding for the user's message
      console.log('[RAG] Generating embedding for query:', originalMessage);
      const queryEmbedding = await generateEmbedding(originalMessage, currentApiKey);
      
      if (queryEmbedding) {
        console.log('[RAG] Embedding generated successfully, dimensions:', queryEmbedding.length);
        
        // FIRST PASS: Retrieve relevant knowledge chunks with tag filtering
        console.log('[RAG] First pass with match_count: 10, filter_tags:', filterTags);
        let { data: contexts, error: contextError } = await supabase.rpc('match_knowledge', {
          query_embedding: queryEmbedding,
          match_count: 10,
          filter_tags: filterTags
        });

        if (contextError) {
          console.error('[RAG] Error calling match_knowledge:', contextError);
        }
        
        // Check quality of first pass results
        const hasSufficientResults = contexts && contexts.length > 0;
        const maxSimilarity = hasSufficientResults ? Math.max(...contexts.map((c: any) => c.similarity || 0)) : 0;
        console.log(`[RAG] First pass: ${contexts?.length || 0} results, max similarity: ${maxSimilarity.toFixed(3)}`);
        
        // SECOND PASS: if no results or low similarity and we used tag filtering, try without tags
        if ((!hasSufficientResults || maxSimilarity < 0.72) && filterTags !== null) {
          console.log('[RAG] Second pass without tag filtering');
          const { data: secondPassContexts, error: secondPassError } = await supabase.rpc('match_knowledge', {
            query_embedding: queryEmbedding,
            match_count: 10,
            filter_tags: null
          });
          
          if (!secondPassError && secondPassContexts && secondPassContexts.length > 0) {
            const secondMaxSim = Math.max(...secondPassContexts.map((c: any) => c.similarity || 0));
            console.log(`[RAG] Second pass: ${secondPassContexts.length} results, max similarity: ${secondMaxSim.toFixed(3)}`);
            
            // Use second pass if better similarity
            if (secondMaxSim > maxSimilarity) {
              contexts = secondPassContexts;
              console.log('[RAG] Using second pass results (better similarity)');
            }
          }
        }
        
        if (!contextError && contexts && contexts.length > 0) {
          console.log('[RAG] Final:', contexts.length, 'relevant contexts');
          usedContext = contexts;
          
          // Build context string
          const contextString = contexts
            .map((ctx: any, idx: number) => `KONTEXTUS #${idx + 1}:\n${ctx.content}\nCímkék: ${ctx.tags.join(', ')}\n`)
            .join('\n---\n');

          // Detect if context is from web scraping
          const isWebScraping = contexts[0]?.metadata?.source === 'web_scraping';
          
          // Enhanced system prompt with context
          const contextualSystemPrompt = `${systemPrompt}

KRITIKUS: Az alábbi kontextus a LEGFONTOSABB információforrásod. KIZÁRÓLAG ebből és az alapinformációkból válaszolj!

${isWebScraping ? 'FIGYELEM: Az alábbi információ az élő aitalks.hu weboldalról származik (valós időben letöltve):' : 'RELEVÁNS KONTEXTUS A TUDÁSBÁZISBÓL:'}
${contextString}

VÁLASZADÁSI PRIORITÁS:
1. ELŐSZÖR: Keress választ a fenti kontextusban
2. MÁSODSZOR: Ha nincs a kontextusban, de az alapinformációk között megtalálod, akkor onnan válaszolj
3. HARMADSZOR: Ha egyik sem tartalmazza, előbb próbálj szinonimákkal és variációkkal keresni a kontextusban; ha továbbra sincs találat, mondd: "Erről most nincs megbízható információ${isWebScraping ? '' : ' a tudásbázisban'}." és kérj rövid pontosítást.

NE HASZNÁLD az "általános tudásodat" vagy ne találj ki semmit. CSAK a kontextus és az alapinformációk!

Válaszolj barátságosan, természetesen, és ha követő kérdéseket javasolsz, azok legyenek relevánsak a kontextus alapján.`;

          // First attempt with primary API key and context
          const ragResponse = await getGeminiResponse(contextualSystemPrompt, originalMessage, currentApiKey);
          if (ragResponse === 'RATE_LIMITED') {
            rateLimitError = true;
            if (geminiApiKey2) {
              console.log('[RAG] Primary key rate limited, trying secondary');
              const secondResponse = await getGeminiResponse(contextualSystemPrompt, originalMessage, geminiApiKey2);
              responseFromAI = secondResponse === 'RATE_LIMITED' ? getFallbackResponse(originalMessage, topicHint) : secondResponse;
            } else {
              responseFromAI = getFallbackResponse(originalMessage, topicHint);
            }
          } else if (ragResponse === 'PAYMENT_REQUIRED') {
            paymentError = true;
            responseFromAI = getFallbackResponse(originalMessage, topicHint);
          } else {
            responseFromAI = ragResponse;
          }
        } else {
          console.log('[RAG] No contexts from embeddings, attempting keyword text search');
          // Fallback: simple keyword text search in knowledge base
          const keywords = extractKeywords(normalizedMessage);
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

              const textResponse = await getGeminiResponse(contextualSystemPrompt, originalMessage, currentApiKey);
              if (textResponse === 'RATE_LIMITED') {
                rateLimitError = true;
                responseFromAI = geminiApiKey2 ? await getGeminiResponse(contextualSystemPrompt, originalMessage, geminiApiKey2) : getFallbackResponse(originalMessage, topicHint);
                if (responseFromAI === 'RATE_LIMITED') responseFromAI = getFallbackResponse(originalMessage, topicHint);
              } else if (textResponse === 'PAYMENT_REQUIRED') {
                paymentError = true;
                responseFromAI = getFallbackResponse(originalMessage, topicHint);
              } else {
                responseFromAI = textResponse;
              }
            } else {
              console.log('[RAG] No text hits, checking if web scraping is needed');
              // FALLBACK 4: Web scraping from aitalks.hu if relevant
              if (originalMessage.toLowerCase().includes('aitalks') || 
                  originalMessage.toLowerCase().includes('honlap') || 
                  originalMessage.toLowerCase().includes('weboldal') ||
                  originalMessage.toLowerCase().includes('oldalon')) {
                console.log('[SCRAPE] Attempting to scrape aitalks.hu');
                const scrapedContent = await scrapeWebsite('https://aitalks.hu');
                
                if (scrapedContent) {
                  console.log('[SCRAPE] Successfully scraped website, using as context');
                  const webCtxPrompt = `${systemPrompt}\n\nKRITIKUS: Az alábbi információ az élő aitalks.hu weboldalról származik (valós időben letöltve):\n\n${scrapedContent}\n\nVÁLASZADÁSI PRIORITÁS:\n1. ELŐSZÖR: Keress választ a fenti webes kontextusban\n2. MÁSODSZOR: Ha nincs a kontextusban, de az alapinformációk között megtalálod, akkor onnan válaszolj\n3. HARMADSZOR: Ha egyik sem tartalmazza, mondd: "Erről most nincs megbízható információ."\n\nNE HASZNÁLD az "általános tudásodat" vagy ne találj ki semmit. CSAK a kontextus és az alapinformációk!`;
                  
                  const webResponse = await getGeminiResponse(webCtxPrompt, originalMessage, currentApiKey);
                  if (webResponse === 'RATE_LIMITED') {
                    rateLimitError = true;
                    responseFromAI = geminiApiKey2 ? await getGeminiResponse(webCtxPrompt, originalMessage, geminiApiKey2) : getFallbackResponse(originalMessage, topicHint);
                    if (responseFromAI === 'RATE_LIMITED') responseFromAI = getFallbackResponse(originalMessage, topicHint);
                  } else if (webResponse === 'PAYMENT_REQUIRED') {
                    paymentError = true;
                    responseFromAI = getFallbackResponse(originalMessage, topicHint);
                  } else {
                    responseFromAI = webResponse;
                  }
                  usedContext = [{ id: 'web_scrape', content: scrapedContent.substring(0, 200) + '...', tags: ['web_scraping'], metadata: { source: 'aitalks.hu', type: 'live_scrape' } }];
                } else {
                  console.log('[SCRAPE] Failed to scrape, using original system prompt');
                  responseFromAI = await getGeminiResponse(systemPrompt, originalMessage, currentApiKey);
                }
              } else {
                console.log('[RAG] No web scraping needed, using original system prompt');
                responseFromAI = await getGeminiResponse(systemPrompt, originalMessage, currentApiKey);
              }
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
          filter_tags: filterTags,
          speaker_detected: mentionedSpeaker || undefined
        },
        error: rateLimitError ? 'rate_limited' : (paymentError ? 'payment_required' : undefined),
        status: rateLimitError ? 429 : (paymentError ? 402 : 200)
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
    console.error(`[AI Gateway] Error ${resp.status}:`, t);
    
    // Return specific error codes for proper handling
    if (resp.status === 429) return 'RATE_LIMITED';
    if (resp.status === 402) return 'PAYMENT_REQUIRED';
    
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

// Normalize Hungarian diacritics for better matching
function normalizeDiacritics(text: string): string {
  const map: Record<string, string> = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ö': 'o', 'ő': 'o', 'ú': 'u', 'ü': 'u', 'ű': 'u',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ö': 'O', 'Ő': 'O', 'Ú': 'U', 'Ü': 'U', 'Ű': 'U'
  };
  return text.split('').map(c => map[c] || c).join('');
}

// Detect known speaker names in query
function detectSpeakerName(text: string): string | null {
  const lower = text.toLowerCase();
  const normalized = normalizeDiacritics(lower);
  
  const speakers = [
    ['németh gábor', 'nemeth gabor'],
    ['lisa kleinman'],
    ['caio moretti'],
    ['balogh csaba'],
    ['szabó péter', 'szabo peter', 'w. szabó', 'w szabo'],
    ['szauder dávid', 'szauder david'],
    ['drobny-burján andrea', 'drobny burjan'],
    ['tóth-czere péter', 'toth czere', 'toth-czere'],
    ['pásti edina', 'pasti edina'],
    ['csonka zsolt'],
    ['lukács bence', 'lukacs bence'],
    ['laczkó gábor', 'laczko gabor'],
    ['tiszavölgyi péter', 'tiszavolyi', 'tiszavolgyi'],
    ['sabján lászló', 'sabjan laszlo'],
    ['kertvéllesy andrás', 'kertvellesy andras'],
    ['koltai balázs', 'koltai balazs'],
    ['deliága ákos', 'deliaga akos']
  ];
  
  for (const variants of speakers) {
    for (const variant of variants) {
      if (lower.includes(variant) || normalized.includes(normalizeDiacritics(variant))) {
        return variants[0];
      }
    }
  }
  return null;
}

// Enhanced keyword extractor with better Hungarian stopwords
function extractKeywords(text: string): string[] {
  const original = text.toLowerCase();
  const withoutPunct = original.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const tokens = withoutPunct.split(/\s+/).filter(Boolean);
  const stop = new Set([
    'a','az','és','vagy','hogy','mi','mit','ki','kik','is','van','lesz','most','nem','de',
    'ra','re','ban','ben','egy','ha','akkor','azt','arra','erről','rol','ról','meg','el',
    'fel','le','be','által','majd','után','előtt','neki','nekem','őt','őket','itt','ott',
    'mert','mint','ezt','azon','ezen','minden','lehet','volt','kell','igen','sem','még'
  ]);
  const keywords = tokens.filter(w => w.length >= 3 && !stop.has(w));
  return Array.from(new Set(keywords)).slice(0, 6);
}

// Web scraping function for aitalks.hu
async function scrapeWebsite(url: string): Promise<string | null> {
  try {
    console.log(`[SCRAPE] Fetching ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AITalksBot/1.0)'
      }
    });
    
    if (!response.ok) {
      console.error(`[SCRAPE] Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                   .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ')
               .replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'");
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Limit to reasonable size (first 8000 chars to avoid token limits)
    if (text.length > 8000) {
      text = text.substring(0, 8000) + '...';
    }
    
    console.log(`[SCRAPE] Successfully scraped ${text.length} characters from ${url}`);
    return text;
  } catch (error) {
    console.error(`[SCRAPE] Error scraping ${url}:`, error);
    return null;
  }
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