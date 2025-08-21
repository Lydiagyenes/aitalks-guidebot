import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    const geminiApiKey = Deno.env.get('Gemini_API');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // AI Talks konferencia specifikus prompt
    const systemPrompt = `Te az AI Talks konferencia hivatalos asszisztense vagy. A konferencia a HVG és Amazing AI közös szervezésében valósul meg Budapesten. A feladatod, hogy sales-orientált módon segítsd a látogatókat és irányítsd őket a jegyvásárlás felé.

INFORMÁCIÓK A KONFERENCIÁRÓL:
- Időpont: 2024. november 15. (csütörtök), 9:00-17:00
- Helyszín: Budapest, könnyű megközelítéssel a belvárosban
- Témák: AI trendek, technológiai innovációk, gyakorlati alkalmazások
- Előadók: AI szakértők, technológiai vezetők, innovációs guruk
- Jegytípusok: Early Bird (29.900 Ft), Standard (39.900 Ft), VIP (59.900 Ft)
- VIP előnyök: Exkluzív networking esemény és meetup lehetőség
- Program: Előadások, kerekasztal-beszélgetések, networking szünetek, ebédpauza

VÁLASZADÁSI STÍLUS:
- Legyen lelkes, professzionális és sales-orientált
- Hangsúlyozd az esemény egyedülálló értékét
- Minden válasz végén próbáld a jegyvásárlás felé terelni
- Használj magyaros kifejezéseket és emoji-kat mértékkel
- Legyen rövid és lényegretörő
- Ha nem vagy biztos valamiben, általános előnyöket hangsúlyozz

Válaszolj magyarul a következő kérdésre/üzenetre:`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
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
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini response:', data);

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ response: generatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    
    // Fallback válasz ha a Gemini nem elérhető
    const fallbackResponse = 'Köszönöm a kérdésed! Az AI Talks konferencia minden részletéről szívesen tájékoztatlak. Ez egy egyedülálló lehetőség, hogy felzárkózz az AI trendekhez és értékes kapcsolatokat építs. Van konkrét kérdésed a programról, előadókról vagy jegyekről? Segítek megtalálni a számodra ideális opciót! ✨';
    
    return new Response(JSON.stringify({ response: fallbackResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});