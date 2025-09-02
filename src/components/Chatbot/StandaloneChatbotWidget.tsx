import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface ChatbotConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
}

export const StandaloneChatbotWidget: React.FC<ChatbotConfig> = ({ 
  supabaseUrl = "https://jugxnvkjyzgepkzzqjwl.supabase.co",
  supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1Z3hudmtqeXpnZXBrenpxandsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODA1NTAsImV4cCI6MjA3MTM1NjU1MH0.Ci1uga23LGBEkVIJftwk3FxFASba9oiCqE5LiPxlfIU"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => `standalone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Szia! Én vagyok az AI Talks asszisztensed! 🤖 Jegyvásárlás szeptember 3-án nyílik, konferencia november 20-án lesz Budapesten. Miben segíthetek? Jegyek, program, workshopok, parkolás, éttermek? 🚀',
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(async () => {
      try {
        const responseText = await getAIResponse(inputValue);
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        
        // Log the interaction
        await logInteraction(inputValue, responseText);
      } catch (error) {
        console.error('Error getting AI response:', error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Elnézést, pillanatnyilag nem tudok válaszolni. Kérlek, próbáld újra később! 🔄',
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        
        // Log the error interaction
        await logInteraction(inputValue, errorMessage.text);
      } finally {
        setIsTyping(false);
      }
    }, 1500);
  };

  const logInteraction = async (question: string, answer: string) => {
    try {
      await supabaseClient.from('chatbot_interactions').insert({
        session_id: sessionId,
        question,
        answer,
        page_url: typeof window !== 'undefined' ? window.location.href : '',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        referrer: typeof document !== 'undefined' ? (document.referrer || null) : null,
        metadata: {
          component: 'StandaloneChatbotWidget',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log interaction:', error);
    }
  };

  const getAIResponse = async (userInput: string): Promise<string> => {
    try {
      // Use fetch directly instead of Supabase client for standalone version
      const response = await fetch(`${supabaseUrl}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ message: userInput })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data?.response || getFallbackResponse(userInput);
    } catch (error) {
      console.error('Error calling Gemini:', error);
      return getFallbackResponse(userInput);
    }
  };

  const getFallbackResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    if (input.includes('program') || input.includes('menetrend') || input.includes('időpont') || input.includes('mikor')) {
      return 'Az AI Talks jegyvásárlása szeptember 3-án nyílik, a konferencia november 20-án lesz Budapesten. Délelőtt előadások, délután párhuzamos, gyakorlati workshopok. Kérsz ajánlást, melyik program lenne számodra a leghasznosabb? 💼';
    }

    if (input.includes('előadó') || input.includes('speaker') || input.includes('ki beszél')) {
      return 'Előadóink többek között: Lisa Kleinman (Make.com), Caio Moretti (grupoQ), Németh Gábor (Amazing AI), Balogh Csaba (HVG), W. Szabó Péter (Tengr.ai), Szauder Dávid (MOME). Kérsz részleteket valamelyik előadásról? 🎤';
    }

    if (input.includes('jegy') || input.includes('ár') || input.includes('költség') || input.includes('mennyibe')) {
      return 'Jegyek: Early Bird 89.000 Ft, Standard 129.000 Ft, VIP 199.000 Ft (exkluzív networking). Melyik opció érdekel? 🎟️';
    }

    if (input.includes('helyszín') || input.includes('hol') || input.includes('cím') || input.includes('bálna')) {
      return 'Helyszín: Budapest (pontosítás hamarosan). Ha a Bálna környéke felé jössz, szívesen adok étterem és parkolási tippeket is! 📍';
    }

    if (input.includes('étterem') || input.includes('ebéd') || input.includes('vacsora')) {
      return 'Ajánlott helyek a Bálna / Fővám tér környékén:\n• Esetleg Bisztró – modern európai, panoráma (árak/allergén nem jelölt).\n• Rombusz Étterem – elegáns, panoráma.\n• Petruska étkezde – házias magyar, napi ajánlat.\n• Fakanál Étterem – önkiszolgáló, 4000–6000 Ft, allergén kódok.\n• EscoBar & Cafe – magyar/nemzetközi + pizza. Foglaljak neked asztalt ajánlással? 🍽️';
    }

    if (input.includes('parkol') || input.includes('parkoló') || input.includes('mélygarázs') || input.includes('utcai')) {
      return 'Parkolás: Bálna mélygarázs 350 Ft/óra; Csarnok Parkoló (3–4 perc séta); Care Park Liliom (10–12 perc). Utcán: IX. ker. "A" zóna 600 Ft/óra, hétvégén ingyenes. Segítsek útvonalat tervezni? 🚗';
    }

    if (input.includes('dress') || input.includes('öltözet') || input.includes('ruha') || input.includes('viselet')) {
      return 'Ajánlott viselet: business casual. Uraknak: ing/galléros póló, chino/sötét farmer, opció blézer, elegáns cipő vagy letisztult sneaker. Hölgyeknek: blúz/pulóver/top, szövetnadrág/szoknya/ruha, kiegészítő blézer/kardigán, kényelmes elegáns cipő. A lényeg a kényelem és a professzionális hatás. 👔👗';
    }

    if (input.includes('allergén') || input.includes('glutén') || input.includes('laktóz')) {
      return 'Több környékbeli étterem online étlapján nincs részletes allergén-jelölés. Biztonság kedvéért javasolt előre rákérdezni telefonon/e-mailben. Szeretnél elérhetőséget egy választott helyhez? ⚠️';
    }

    if (input.includes('networking') || input.includes('kapcsolat') || input.includes('ismerkedés')) {
      return 'Networking: minden jeggyel van rá lehetőség, VIP-nél exkluzív lounge és külön programok. Szeretnél VIP infókat? 🤝';
    }

    if (input.includes('miért') || input.includes('érdemes') || input.includes('előny') || input.includes('haszon')) {
      return 'Nem elmélet, hanem azonnal alkalmazható tudás, valós magyar esettanulmányok és AI-ügynök/workflow megoldások – HVG & Amazing AI prémium minőségben. 💡';
    }

    if (input.includes('workshop') || input.includes('műhely') || input.includes('gyakorlat')) {
      return 'Délutáni workshopok: AI-csapatom (Amazing AI), Kódolt kreativitás (Béres), No-code automatizáció (Supercharge), Human 2.0 (NEXT), Vizuális anyagok AI-jal (Just Bee Digital), Copywriter 2.0 (Amazing AI), Voice AI (AI Squad). Melyik érdekel? 🛠️';
    }

    if (input.includes('hvg') || input.includes('amazing') || input.includes('szervező')) {
      return 'Szervezők: HVG & Amazing AI – minőségi tartalom és gyakorlati megközelítés. 🏆';
    }

    return 'Köszi a kérdésed! Szívesen segítek: program, workshopok, parkolás, éttermek vagy jegyek – melyik érdekel? ✨';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-96 h-[500px] flex flex-col shadow-lg border rounded-lg bg-white backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border-b rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <div>
                <span className="font-bold text-gray-900 text-sm">AI Talks</span>
                <div className="text-xs text-gray-500">Asszisztens</div>
              </div>
            </div>
            <button 
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 h-8 w-8 p-0 rounded-md flex items-center justify-center"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.isBot ? 'justify-start' : 'justify-end'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] p-3 rounded-xl',
                    message.isBot
                      ? 'bg-gray-100 text-gray-900 border border-gray-200'
                      : 'bg-blue-500 text-white'
                  )}
                >
                  <p className="text-sm leading-relaxed font-medium">{message.text}</p>
                  <span className={cn(
                    "text-xs mt-1 block",
                    message.isBot ? "text-gray-500" : "text-blue-100"
                  )}>
                    {message.timestamp.toLocaleTimeString('hu-HU', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 border border-gray-200 p-3 rounded-xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Kérdezz bármit az AI Talks-ról..."
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button - only visible when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </>
  );
};