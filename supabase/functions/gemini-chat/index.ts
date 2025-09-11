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
    const systemPrompt = `Te az AI Talks konferencia hivatalos asszisztense vagy. A konferencia a HVG és Amazing AI közös szervezésében valósul meg Budapesten 2025. november 20-án. A feladatod, hogy udvariasan, segítőkészen és nem nyomulós stílusban tájékoztasd a látogatókat.

ALAPVETŐ TUDÁS:
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

    // Map topic_hint to tags for RAG filtering
    const filterTags = mapTopicToTags(topicHint);
    
    // Try RAG-enhanced response first
    let responseFromAI: string;
    let usedContext: any[] = [];
    let currentApiKey = geminiApiKey;

    try {
      // Generate embedding for the user's message
      const queryEmbedding = await generateEmbedding(originalMessage, currentApiKey);
      
      if (queryEmbedding) {
        // Retrieve relevant knowledge chunks
        const { data: contexts, error: contextError } = await supabase.rpc('match_knowledge', {
          query_embedding: queryEmbedding,
          match_count: 6,
          filter_tags: filterTags
        });

        if (!contextError && contexts && contexts.length > 0) {
          usedContext = contexts;
          
          // Build context string
          const contextString = contexts
            .map((ctx: any, idx: number) => `KONTEXTUS #${idx + 1}:\n${ctx.content}\nCímkék: ${ctx.tags.join(', ')}\n`)
            .join('\n---\n');

          // Enhanced system prompt with context
          const contextualSystemPrompt = `${systemPrompt}

FONTOS: Az alábbi kontextus alapján válaszolj a kérdésekre. Ha a kontextusban nincs releváns információ, akkor használd az általános tudásodat, de mindig jelezd, ha a kontextusból válaszolsz.

RELEVÁNS KONTEXTUS:
${contextString}

Válaszolj barátságosan, természetesen, és ha követő kérdéseket javasolsz, azok legyenek relevánsak a kontextus alapján.`;

          // First attempt with primary API key and context
          responseFromAI = await getGeminiResponse(contextualSystemPrompt, originalMessage, currentApiKey);
        } else {
          // No context found, use original system prompt
          responseFromAI = await getGeminiResponse(systemPrompt, originalMessage, currentApiKey);
        }
      } else {
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

// Helper function to call Gemini API
async function getGeminiResponse(systemPrompt: string, message: string, apiKey: string): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\nFelhasználó üzenete: ${message}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Invalid response from Gemini API');
  }

  return data.candidates[0].content.parts[0].text;
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

// Generate embedding using Gemini text-embedding-004
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