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
    const { message, history, topic_hint, last_followups } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    const geminiApiKey = Deno.env.get('Gemini_API');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // AI Talks konferencia specifikus prompt
   // Cseréld le a teljes régi systemPrompt változót erre az újra:
const systemPrompt = `Te az AI Talks konferencia hivatalos asszisztense vagy. A feladatod, hogy a TUDÁSBÁZIS alapján udvariasan, segítőkészen, tegeződve és nem nyomulós stílusban tájékoztasd a látogatókat. Adj 1-3 mondatos, lényegre törő válaszokat. A jegyvásárlást csak kb. minden 5. válaszban említsd meg, vagy ha a felhasználó rákérdez. Használj magyaros kifejezéseket és mértékkel emojikat. Ha nem vagy biztos a válaszban, kérj pontosítást és ajánld az info@aitalks.hu címet. MINDEN válasz végén tegyél fel egy rövid, kontextusba illő, változatos követő kérdést.

//--- TUDÁSBÁZIS (STRUKTURÁLT ADATOK) ---//
const KNOWLEDGE_BASE = {
  "event_info": {
    "name": "AI TALKS by HVG & Amazing AI",
    "date": "2025. november 20.",
    "location": "Bálna, Budapest, Fővám tér 11-12, 1093",
    "organizers": ["HVG", "Amazing AI"],
    "theme": "Az AI mint üzlettárs: szemléletváltó konferencia az új korszak vezetőinek",
    "status": "Jelenleg super early bird jegyárak érvényesek szeptember 30-ig."
  },
  "tickets": [
    {
      "name": "BASIC",
      "price_early": "35.940 Ft + áfa",
      "price_full": "59.900 Ft + áfa",
      "includes": ["Teljes napos részvétel", "Kiállítók", "30% HVG könyvkupon"]
    },
    {
      "name": "PRÉMIUM",
      "price_early": "41.940 Ft + áfa",
      "price_full": "69.900 Ft + áfa",
      "includes": ["BASIC csomag", "Előadások videófelvétele", "14 nap Amazing AI Tudástár próba", "Részvétel Karen Hao könyvbemutatóján"]
    },
    {
      "name": "VIP",
      "price_early": "71.400 Ft + áfa",
      "price_full": "119.900 Ft + áfa",
      "includes": ["PRÉMIUM csomag", "VIP beléptetés", "3000 Ft ebédkupon", "Shownotes", "Karen Hao könyv", "Németh Gábor könyv", "30 nap Amazing AI Tudástár próba", "1 hónap hvg360", "HVG Klubkártya 2026"]
    }
  ],
  "logistics": {
    "restaurants": [
      {"name": "Fakanál Étterem (Nagyvásárcsarnok)", "type": "önkiszolgáló, magyar", "distance": "1 perc"},
      {"name": "EscoBar & Cafe (Bálna)", "type": "laza, nemzetközi", "distance": "2 perc"},
      {"name": "Esetleg Bisztró", "type": "modern európai", "distance": "4 perc"},
      {"name": "Rombusz Étterem", "type": "elegáns", "distance": "4 perc"},
      {"name": "Petruska étkezde", "type": "házias, magyar", "distance": "5 perc"}
    ],
    "parking": [
      {"name": "Bálna mélygarázs", "price": "450 Ft/óra", "location": "Helyszínen"},
      {"name": "Utcai parkolás ('A' zóna)", "price": "600 Ft/óra", "details": "munkanap 8-22h, max 3 óra"}
    ],
    "dress_code": "Ajánlott a business casual: kényelmes, mégis professzionális megjelenés (pl. ing/blúz, chino/szövetnadrág, blézer)."
  },
  "speakers": [
    {"name": "Lisa Kleinman", "company": "Make.com", "topic": "Megbízható no-code AI-ügynökök tervezése.", "details_on_request": "HCI PhD, korábban Intel/Nokia. A 'calm tech' híve."},
    {"name": "Caio Moretti", "company": "QConcursos", "topic": "'Vibe-coding' a gyakorlatban, AI-vezérelt termékfejlesztés.", "details_on_request": "Edtech cégvezető, 35M+ felhasználó, csapatával 48 óra alatt $3M bevételt ért el egy AI-appal."},
    {"name": "Németh Gábor", "company": "Amazing AI", "topic": "'AI Fluency' szemlélet, mentális modellek az AI korában.", "details_on_request": "Társalapító, 15+ év nagyvállalati tapasztalat, AI-stratégia és automatizáció."},
    {"name": "Balogh Csaba", "company": "HVG", "topic": "Az év legfontosabb AI-történései és 2026-os trendek.", "details_on_request": "A HVG Tech+Tudomány rovatvezetője, egyetemi oktató."},
    {"name": "W. Szabó Péter", "company": "Tengr.ai", "topic": "Az autonóm AI-ügynökök kora és a munka jövője.", "details_on_request": "AI-kutató, a Tengr.ai képgeneráló platform alapítója."},
    {"name": "Szauder Dávid", "company": "Médiaművész, MOME", "topic": "AI-művészet: alkotás saját trénelt modellekkel.", "details_on_request": "Nemzetközi hírű művész, Jean-Michel Jarre és Geszti Péter vizuáljai."},
    {"name": "Koltai Balázs", "company": "Genezit", "role": "Kerekasztal moderátor", "topic": "AI és vállalkozás.", "details_on_request": "Digitális transzformációs szakértő, 25 év tapasztalat."},
    {"name": "Laczkó Gábor", "company": "Stylers Group", "role": "Kerekasztal résztvevő / Workshop vezető", "topic": "Vállalati AI-stratégia.", "details_on_request": "Társalapító, 20+ év tapasztalat digitális transzformációban."},
    {"name": "Deliága Ákos", "company": "Talk-a-bot", "role": "Kerekasztal résztvevő", "topic": "AI-alapú kommunikációs megoldások.", "details_on_request": "Társalapító, IVSZ elnökségi tag."}
  ],
  "workshops": [
    {"speaker": "Németh Gábor (Amazing AI)", "title": "Én és az AI-csapatom"},
    {"speaker": "Drobny-Burján Andrea (Béres)", "title": "Megoldásra kódolt kreativitás"},
    {"speaker": "Lukács Bence (Supercharge)", "title": "Automatizálás AI-ügynökökkel no-code eszközökkel"},
    {"speaker": "Tóth-Czere Péter (NEXT Academy)", "title": "Human 2.0 – Fenntartható hatékonyság"},
    {"speaker": "Pásti Edina (Just Bee Digital)", "title": "Ne várj a grafikusra: Készíts magadnak profi marketinganyagokat!"},
    {"speaker": "Csonka Zsolt (Amazing AI)", "title": "Copywriter 2.0: Így válj AI-karmesterré"},
    {"speaker": "Laczkó Gábor & Tiszavölgyi Péter (Stylers Group)", "title": "Üzleti AI 5 lépésben"},
    {"speaker": "Sabján László & Kertvéllesy András (AI Squad)", "title": "Hibrid ügyfélszolgálat építése Voice AI-jal"}
  ],
  "schedule": {
    "morning_talks": [
      "09:05-09:25: Lisa Kleinman",
      "09:27-09:47: Caio Moretti",
      "09:49-10:09: Németh Gábor",
      "10:11-10:31: Balogh Csaba",
      "10:31-10:51: Kerekasztal",
      "10:51-11:11: W. Szabó Péter",
      "11:45-12:15: Szauder Dávid"
    ],
    "afternoon_workshops_slot1": "13:15-14:45 (Lukács Bence 14:15-ig)",
    "afternoon_workshops_slot2": "15:15-16:45"
  }
};
//--- TUDÁSBÁZIS VÉGE ---//

Válaszolj magyarul a következő kérdésre/üzenetre a TUDÁSBÁZIS alapján:`;

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
    
    // Fallback válasz témára szabottan
    const topicFallbacks = {
      program: 'Köszi az üzeneted! A konferencia november 20-án lesz Budapesten. Melyik előadás érdekel leginkább? ✨',
      workshop: 'Köszi az üzenetet! Délután párhuzamos workshopok lesznek. Melyik témakör lenne számodra leginkább hasznos? 🛠️',
      location: 'Helyszín: Bálna, Budapest, Fővám tér 11-12. Segítsek parkolási lehetőséget keresni? 📍',
      parking: 'Parkolás: Bálna mélygarázs 450 Ft/óra vagy utcai. Segítsek dönteni a parkolási opcióban? 🚗',
      restaurant: 'Sok jó étterem van a környéken! Szeretnél többet tudni a lehetőségekről? 🍽️',
      ticket: 'Super Early Bird árak szeptember 30-ig! Melyik jegytípus lenne ideális számodra? 🎟️',
      speaker: 'Kiváló előadóink lesznek! Kérsz részleteket valamelyik előadásról? 🎤',
      general: 'Köszi az üzeneted! Miben tudok még segíteni? ✨'
    };
    
    const fallbackResponse = topicFallbacks[topic_hint as keyof typeof topicFallbacks] || topicFallbacks.general;
    
    return new Response(JSON.stringify({ response: fallbackResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
