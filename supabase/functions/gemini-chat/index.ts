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

    // Get current date and pricing information
    const currentDate = new Date();
    const currentPricing = getCurrentPricing(currentDate);
    const currentDateStr = currentDate.toLocaleDateString('hu-HU', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // AI Talks konferencia specifikus prompt (rövidített a RAG miatt)
    const systemPrompt = `Te az AI Talks konferencia hivatalos asszisztense vagy. A konferencia a HVG és Amazing AI közös szervezésében valósul meg Budapesten 2025. november 20-án.

MAI DÁTUM: ${currentDateStr}

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

AKTUÁLIS JEGYÁRAK (${currentPricing.period}):
- BASIC: ${currentPricing.basic} Ft + áfa (teljes napos részvétel)
- PRÉMIUM: ${currentPricing.premium} Ft + áfa (+ videók, próbahozzáférések)
- VIP: ${currentPricing.vip} Ft + áfa (+ VIP belépés, könyvek, extrák)
${currentPricing.note ? `\nMEGJEGYZÉS: ${currentPricing.note}` : ''}

VÁLASZADÁSI STÍLUS:
- Tegezd a felhasználót, barátságos hangnem
- Lényegre törő, 1-3 mondatos válaszok
- Jegyvásárlást csak minden 5. válaszban említsd
- Minden válasz végén 1 rövid, témára szabott követő kérdést

HISTORY CONTEXT: ${history ? `Utolsó üzenetek: ${JSON.stringify(Array.isArray(history) ? history.slice(-3) : history)}` : 'Nincs korábbi kontextus'}
TOPIC HINT: ${topicHint || 'általános'}`;

    // Extract context from conversation history
    const historyContext = extractHistoryContext(history || []);
    console.log('[Entity Resolution] History context:', historyContext);
    
    // Expand query with history context (resolve pronouns, add missing entities)
    const expandedQuery = expandQueryWithContext(originalMessage, historyContext);
    
    // Normalize query and detect speaker names
    const normalizedMessage = normalizeDiacritics(expandedQuery);
    const mentionedSpeaker = detectSpeakerName(normalizedMessage) || (historyContext.speakers.length > 0 ? historyContext.speakers[0] : null);
    
    // Map topic_hint to tags for RAG filtering + server-side topic detection
    const initialTags = mapTopicToTags(topicHint);
    const detectedTopic = detectTopicFromMessage(expandedQuery);
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
      // Check if query is too short (< 3 chars) - these are usually context-dependent
      const isVeryShortQuery = originalMessage.trim().length < 3;
      if (isVeryShortQuery) {
        console.log('[RAG] Very short query detected, checking for web scraping need');
        // For very short queries, check if we should scrape website based on conversation context
        if (history && Array.isArray(history) && history.length > 0) {
          const recentContext = history.slice(-3).map((h: any) => h.content || '').join(' ').toLowerCase();
          if (recentContext.includes('aitalks') || recentContext.includes('honlap') || recentContext.includes('weboldal')) {
            console.log('[SCRAPE] Context suggests website scraping for short query');
            const scrapedContent = await scrapeWebsite('https://aitalks.hu');
            if (scrapedContent) {
              const webCtxPrompt = `${systemPrompt}\n\nFIGYELEM: Az alábbi információ az élő aitalks.hu weboldalról származik:\n\n${scrapedContent}\n\nVálaszolj a felhasználó rövid kérdésére ("${originalMessage}") a fenti kontextus alapján.`;
              responseFromAI = await getGeminiResponse(webCtxPrompt, originalMessage, currentApiKey);
              if (responseFromAI !== 'RATE_LIMITED' && responseFromAI !== 'PAYMENT_REQUIRED') {
                usedContext = [{ id: 'web_scrape', content: scrapedContent.substring(0, 200) + '...', tags: ['web_scraping'], metadata: { source: 'aitalks.hu' } }];
                return new Response(
                  JSON.stringify({ 
                    response: responseFromAI,
                    metadata: {
                      used_context_count: 1,
                      context_ids: ['web_scrape'],
                      source: 'web_scraping'
                    }
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            }
          }
        }
        // Fall through to normal processing if scraping didn't work
      }
      
      // Generate embedding for the EXPANDED query (with context)
      console.log('[RAG] Generating embedding for expanded query:', expandedQuery);
      const queryEmbedding = await generateEmbedding(expandedQuery, currentApiKey);
      
      if (queryEmbedding) {
        console.log('[RAG] Embedding generated successfully, dimensions:', queryEmbedding.length);
        
        // FIRST PASS: Retrieve relevant knowledge chunks with tag filtering
        const firstPassCount = mentionedSpeaker ? 30 : 20; // Increased: 30 for speakers, 20 for general
        console.log('[RAG] First pass with match_count:', firstPassCount, ', filter_tags:', filterTags);
        let { data: contexts, error: contextError } = await supabase.rpc('match_knowledge', {
          query_embedding: queryEmbedding,
          match_count: firstPassCount,
          filter_tags: filterTags
        });

        if (contextError) {
          console.error('[RAG] Error calling match_knowledge:', contextError);
        }
        
        // Check quality of first pass results
        const hasSufficientResults = contexts && contexts.length > 0;
        const maxSimilarity = hasSufficientResults ? Math.max(...contexts.map((c: any) => c.similarity || 0)) : 0;
        console.log(`[RAG] First pass: ${contexts?.length || 0} results, max similarity: ${maxSimilarity.toFixed(3)}`);
        
        // Log top results for debugging
        if (contexts && contexts.length > 0) {
          console.log('[RAG] Top 3 results:');
          contexts.slice(0, 3).forEach((ctx: any, i: number) => {
            console.log(`  ${i + 1}. [${ctx.similarity.toFixed(3)}] ${ctx.content.substring(0, 100)}...`);
          });
        }
        
        // SECOND PASS: if no results or low similarity and we used tag filtering, try without tags
        if ((!hasSufficientResults || maxSimilarity < 0.65) && filterTags !== null) {
          console.log('[RAG] Second pass without tag filtering (threshold lowered)');
          const { data: secondPassContexts, error: secondPassError } = await supabase.rpc('match_knowledge', {
            query_embedding: queryEmbedding,
            match_count: 20,
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
          // Check if contexts are high quality (lowered threshold for better recall)
          const maxSim = Math.max(...contexts.map((c: any) => c.similarity || 0));
          console.log(`[RAG] Using contexts, max similarity: ${maxSim.toFixed(3)}`);
          
          // Lower threshold: only scrape if VERY low quality (0.20) AND no speaker mentioned
          if (maxSim < 0.20 && !mentionedSpeaker) {
            console.log(`[RAG] Context quality very low (max: ${maxSim.toFixed(3)}), attempting web scraping`);
            const scrapedContent = await scrapeWebsite('https://aitalks.hu');
            if (scrapedContent) {
              console.log('[SCRAPE] Using scraped content due to low context quality');
              const webCtxPrompt = `${systemPrompt}\n\nFIGYELEM: Az alábbi információ az élő aitalks.hu weboldalról származik:\n\n${scrapedContent}\n\nVálaszolj a kérdésre: "${originalMessage}"`;
              responseFromAI = await getGeminiResponse(webCtxPrompt, originalMessage, currentApiKey);
              if (responseFromAI !== 'RATE_LIMITED' && responseFromAI !== 'PAYMENT_REQUIRED') {
                usedContext = [{ id: 'web_scrape', content: scrapedContent.substring(0, 200) + '...', tags: ['web_scraping'], metadata: { source: 'aitalks.hu' } }];
                return new Response(
                  JSON.stringify({ 
                    response: responseFromAI,
                    metadata: { used_context_count: 1, context_ids: ['web_scrape'], source: 'web_scraping' }
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            }
          }
          
          // Limit to top 5 most relevant contexts to avoid context overflow
          usedContext = contexts.slice(0, 5);
          console.log('[RAG] Final:', usedContext.length, 'relevant contexts (limited from', contexts.length, ')');
          
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
          console.log('[RAG] Extracted keywords for text search:', keywords);
          
          if (keywords.length > 0) {
            // Use more keywords and get more results
            const orFilters = keywords.slice(0, 5).map((kw) => `content.ilike.%${kw}%`).join(',');
            const { data: textHits, error: textErr } = await supabase
              .from('knowledge_chunks')
              .select('id, content, tags')
              .or(orFilters)
              .limit(5);

            if (!textErr && textHits && textHits.length > 0) {
              console.log('[RAG] Text search found', textHits.length, 'hits');
              textHits.forEach((hit: any, i: number) => {
                console.log(`  ${i + 1}. ${hit.content.substring(0, 80)}...`);
              });
              // Limit to top 5 text search results
              usedContext = textHits.slice(0, 5) as any[];
              console.log('[RAG] Using text search hits:', textHits.length, '→ limited to', usedContext.length, 'results');
              const ctxStr = usedContext
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
              const lower = originalMessage.toLowerCase();
              const shouldScrape =
                lower.includes('aitalks') ||
                lower.includes('honlap') ||
                lower.includes('weboldal') ||
                lower.includes('oldalon') ||
                /kik adnak|előad|előadó|program|menetrend|mikor|hol|helysz[ií]n/.test(lower) ||
                Boolean(mentionedSpeaker) ||
                (detectedTopic && ['speaker','program','location'].includes(detectedTopic));

              if (shouldScrape) {
                console.log('[SCRAPE] Attempting to scrape aitalks.hu');
                const scrapedContent = await scrapeWebsite('https://aitalks.hu');
                
                if (scrapedContent) {
                  // Limit scraped content to 2000 characters to avoid context overflow
                  const limitedContent = scrapedContent.length > 2000 
                    ? scrapedContent.substring(0, 2000) + '... [tartalmat lerövidítettük]'
                    : scrapedContent;
                  
                  console.log('[SCRAPE] Successfully scraped website, using as context');
                  console.log('[SCRAPE] Limited content:', scrapedContent.length, '→', limitedContent.length, 'chars');
                  
                  const webCtxPrompt = `${systemPrompt}\n\nKRITIKUS: Az alábbi információ az élő aitalks.hu weboldalról származik (valós időben letöltve):\n\n${limitedContent}\n\nVÁLASZADÁSI PRIORITÁS:\n1. ELŐSZÖR: Keress választ a fenti webes kontextusban\n2. MÁSODSZOR: Ha nincs a kontextusban, de az alapinformációk között megtalálod, akkor onnan válaszolj\n3. HARMADSZOR: Ha egyik sem tartalmazza, mondd: "Erről most nincs megbízható információ."\n\nNE HASZNÁLD az "általános tudásodat" vagy ne találj ki semmit. CSAK a kontextus és az alapinformációk!`;
                  
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
            console.log('[RAG] No keywords extracted, deciding on web scraping');
            const lower = originalMessage.toLowerCase();
            const shouldScrapeNoKw =
              lower.includes('aitalks') ||
              lower.includes('honlap') ||
              lower.includes('weboldal') ||
              lower.includes('oldalon') ||
              /kik adnak|előad|előadó|program|menetrend|mikor|hol|helysz[ií]n/.test(lower) ||
              Boolean(mentionedSpeaker) ||
              (detectedTopic && ['speaker','program','location'].includes(detectedTopic));

            if (shouldScrapeNoKw) {
              console.log('[SCRAPE] Attempting to scrape aitalks.hu (no keywords)');
              const scrapedContent = await scrapeWebsite('https://aitalks.hu');
              if (scrapedContent) {
                // Limit scraped content to 2000 characters to avoid context overflow
                const limitedContent = scrapedContent.length > 2000 
                  ? scrapedContent.substring(0, 2000) + '... [tartalmat lerövidítettük]'
                  : scrapedContent;
                
                console.log('[SCRAPE] Limited content:', scrapedContent.length, '→', limitedContent.length, 'chars');
                
                const webCtxPrompt = `${systemPrompt}\n\nKRITIKUS: Az alábbi információ az élő aitalks.hu weboldalról származik (valós időben letöltve):\n\n${limitedContent}\n\nVÁLASZADÁSI PRIORITÁS:\n1. ELŐSZÖR: Keress választ a fenti webes kontextusban\n2. MÁSODSZOR: Ha nincs a kontextusban, de az alapinformációk között megtalálod, akkor onnan válaszolj\n3. HARMADSZOR: Ha egyik sem tartalmazza, mondd: "Erről most nincs megbízható információ."`;
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
                responseFromAI = await getGeminiResponse(systemPrompt, originalMessage, currentApiKey);
              }
            } else {
              responseFromAI = await getGeminiResponse(systemPrompt, originalMessage, currentApiKey);
            }
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

// Helper function to get current pricing based on date
interface PricingInfo {
  period: string;
  basic: number;
  premium: number;
  vip: number;
  note?: string;
}

function getCurrentPricing(date: Date): PricingInfo {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (0 = január, 8 = szeptember, 9 = október, 10 = november)
  const day = date.getDate();
  
  // Super Early Bird: szeptember 30-ig (2024 or 2025)
  if ((year === 2024 && (month < 8 || (month === 8 && day <= 30))) ||
      (year === 2025 && month < 8)) {
    return {
      period: 'Super Early Bird (szeptember 30-ig)',
      basic: 35940,
      premium: 41940,
      vip: 71400,
      note: 'Utolsó esélyek a legnagyobb kedvezményre!'
    };
  }
  
  // Early Bird: október 1-19 (35% kedvezmény)
  if ((year === 2024 || year === 2025) && 
      month === 9 && day >= 1 && day <= 19) {
    return {
      period: 'Early Bird (35% kedvezmény, október 1-19-ig)',
      basic: 38935,
      premium: 45435,
      vip: 77350,
      note: '35% kedvezmény - korlátozott ideig!'
    };
  }
  
  // Last Call: október 20 - november 2 (25% kedvezmény)
  if ((year === 2024 || year === 2025) && 
      ((month === 9 && day >= 20) || (month === 10 && day >= 1 && day <= 2))) {
    return {
      period: 'Last Call (25% kedvezmény, október 20 - november 2)',
      basic: 44925,
      premium: 52425,
      vip: 89250,
      note: 'Utolsó kedvezményes időszak!'
    };
  }
  
  // Full Price: november 3-tól
  if ((year === 2024 || year === 2025) && 
      ((month === 10 && day >= 3) || month > 10)) {
    return {
      period: 'Teljes árú jegyek (november 3-tól)',
      basic: 59900,
      premium: 69900,
      vip: 119000,
      note: 'Teljes árú jegyek - ne késlekedj!'
    };
  }
  
  // Default fallback (should not happen, but just in case)
  return {
    period: 'Aktuális árak',
    basic: 59900,
    premium: 69900,
    vip: 119000
  };
}

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

// Enhanced keyword extractor with better Hungarian stopwords and time-related terms
function extractKeywords(text: string): string[] {
  const original = text.toLowerCase();
  const withoutPunct = original.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const tokens = withoutPunct.split(/\s+/).filter(Boolean);
  
  // Hungarian stopwords
  const stop = new Set([
    'a','az','és','vagy','hogy','mi','mit','ki','kik','is','van','lesz','most','nem','de',
    'ra','re','ban','ben','egy','ha','akkor','azt','arra','erről','rol','ról','meg','el',
    'fel','le','be','által','majd','után','előtt','neki','nekem','őt','őket','itt','ott',
    'mert','mint','ezt','azen','ezen','minden','lehet','volt','kell','sem','még'
  ]);
  
  // Extract all tokens but prioritize names and important terms
  const keywords = tokens.filter(w => w.length >= 2 && !stop.has(w));
  
  // For time-related questions, also include variations
  const hasTimeQuestion = /hanytol|hanytol|mikor|idopont|ora/.test(original);
  if (hasTimeQuestion) {
    // Add time-related terms to help search
    keywords.push('idopont', 'ora', 'program', 'eloadok', 'workshop');
  }
  
  // If no keywords after filtering, return original tokens (avoid empty results)
  if (keywords.length === 0 && tokens.length > 0) {
    console.log('[KEYWORD] All tokens were stopwords, using original tokens');
    return tokens.filter(w => w.length >= 2).slice(0, 8);
  }
  
  return Array.from(new Set(keywords)).slice(0, 8);
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

// Extract entities and context from conversation history
function extractHistoryContext(history: any[]): { speakers: string[], topics: string[], lastUserMessage: string } {
  const speakers = new Set<string>();
  const topics = new Set<string>();
  let lastUserMessage = '';
  
  if (!history || history.length === 0) {
    return { speakers: [], topics: [], lastUserMessage: '' };
  }
  
  // Analyze last 5 messages for context
  const recentHistory = history.slice(-5);
  
  for (const msg of recentHistory) {
    const content = (msg.content || '').toLowerCase();
    
    // Track last user message
    if (msg.role === 'user') {
      lastUserMessage = msg.content || '';
    }
    
    // Extract speaker names
    const speaker = detectSpeakerName(content);
    if (speaker) {
      speakers.add(speaker);
    }
    
    // Extract topics
    const topic = detectTopicFromMessage(content);
    if (topic) {
      topics.add(topic);
    }
  }
  
  return {
    speakers: Array.from(speakers),
    topics: Array.from(topics),
    lastUserMessage
  };
}

// Expand query with context from history (resolve pronouns and references)
function expandQueryWithContext(query: string, historyContext: { speakers: string[], topics: string[], lastUserMessage: string }): string {
  const lower = query.toLowerCase();
  const normalized = normalizeDiacritics(lower);
  
  // Check for pronouns and references that need expansion
  const hasPronouns = /\b(ő|őt|őnek|az|annak|ennek|ez|ebből|arról|erről)\b/.test(lower);
  const hasTimeQuestion = /\b(mikor|hánytól|hánykor|időpont)\b/.test(lower);
  const hasVagueReference = /\b(előadás|workshop|beszél|tart)\b/.test(lower) && !detectSpeakerName(lower);
  
  // If query is complete and specific, return as-is
  if (!hasPronouns && !hasVagueReference && query.length > 15) {
    return query;
  }
  
  let expandedQuery = query;
  
  // Expand with speaker names if available
  if ((hasPronouns || hasVagueReference || hasTimeQuestion) && historyContext.speakers.length > 0) {
    const speakerName = historyContext.speakers[0]; // Use most recent speaker
    console.log(`[Query Expansion] Adding speaker: ${speakerName}`);
    
    // Smart expansion based on query type
    if (hasTimeQuestion) {
      expandedQuery = `${speakerName} előadás ${query}`;
    } else if (/\b(előadás|beszél|tart)\b/.test(lower)) {
      expandedQuery = `${speakerName} ${query}`;
    } else {
      expandedQuery = `${query} ${speakerName}`;
    }
  }
  
  // Expand with topic context if helpful
  if (historyContext.topics.length > 0 && expandedQuery.length < 30) {
    const topic = historyContext.topics[0];
    console.log(`[Query Expansion] Adding topic context: ${topic}`);
    expandedQuery = `${expandedQuery} ${topic}`;
  }
  
  console.log(`[Query Expansion] Original: "${query}" → Expanded: "${expandedQuery}"`);
  return expandedQuery.trim();
}