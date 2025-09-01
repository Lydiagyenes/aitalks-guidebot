import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

export const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Szia! Én vagyok az AI Talks asszisztensed! 🤖 2025. szeptember 3-án várunk Budapesten. Miben segíthetek? Jegyek, program, workshopok, parkolás, éttermek? 🚀',
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

    // Get AI response using Gemini
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
      } catch (error) {
        console.error('Error getting AI response:', error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Elnézést, pillanatnyilag nem tudok válaszolni. Kérlek, próbáld újra később! 🔄',
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    }, 1500);
  };

  const getAIResponse = async (userInput: string): Promise<string> => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { message: userInput }
      });

      if (error) {
        console.error('Supabase function error:', error);
        return getFallbackResponse(userInput);
      }

      return data?.response || getFallbackResponse(userInput);
    } catch (error) {
      console.error('Error calling Gemini:', error);
      return getFallbackResponse(userInput);
    }
  };

  const getFallbackResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    // Program / időpont
    if (input.includes('program') || input.includes('menetrend') || input.includes('időpont') || input.includes('mikor')) {
      return 'Az AI Talks 2025. szeptember 3-án lesz Budapesten. Délelőtt előadások, délután párhuzamos, gyakorlati workshopok. Kérsz ajánlást, melyik program lenne számodra a leghasznosabb? 💼';
    }

    // Előadók
    if (input.includes('előadó') || input.includes('speaker') || input.includes('ki beszél')) {
      return 'Előadóink többek között: Lisa Kleinman (Make.com), Caio Moretti (grupoQ), Németh Gábor (Amazing AI), Balogh Csaba (HVG), W. Szabó Péter (Tengr.ai), Szauder Dávid (MOME). Kérsz részleteket valamelyik előadásról? 🎤';
    }

    // Jegyek / árak
    if (input.includes('jegy') || input.includes('ár') || input.includes('költség') || input.includes('mennyibe')) {
      return 'Jegyek: Early Bird 89.000 Ft, Standard 129.000 Ft, VIP 199.000 Ft (exkluzív networking). Melyik opció érdekel? 🎟️';
    }

    // Helyszín
    if (input.includes('helyszín') || input.includes('hol') || input.includes('cím') || input.includes('bálna')) {
      return 'Helyszín: Budapest (pontosítás hamarosan). Ha a Bálna környéke felé jössz, szívesen adok étterem és parkolási tippeket is! 📍';
    }

    // Éttermek
    if (input.includes('étterem') || input.includes('ebéd') || input.includes('vacsora')) {
      return 'Ajánlott helyek a Bálna / Fővám tér környékén:\n• Esetleg Bisztró – modern európai, panoráma (árak/allergén nem jelölt).\n• Rombusz Étterem – elegáns, panoráma.\n• Petruska étkezde – házias magyar, napi ajánlat.\n• Fakanál Étterem – önkiszolgáló, 4000–6000 Ft, allergén kódok.\n• EscoBar & Cafe – magyar/nemzetközi + pizza. Foglaljak neked asztalt ajánlással? 🍽️';
    }

    // Parkolás
    if (input.includes('parkol') || input.includes('parkoló') || input.includes('mélygarázs') || input.includes('utcai')) {
      return 'Parkolás: Bálna mélygarázs 350 Ft/óra; Csarnok Parkoló (3–4 perc séta); Care Park Liliom (10–12 perc). Utcán: IX. ker. "A" zóna 600 Ft/óra, hétvégén ingyenes. Segítsek útvonalat tervezni? 🚗';
    }

    // Dress code
    if (input.includes('dress') || input.includes('öltözet') || input.includes('ruha') || input.includes('viselet')) {
      return 'Ajánlott viselet: business casual. Uraknak: ing/galléros póló, chino/sötét farmer, opció blézer, elegáns cipő vagy letisztult sneaker. Hölgyeknek: blúz/pulóver/top, szövetnadrág/szoknya/ruha, kiegészítő blézer/kardigán, kényelmes elegáns cipő. A lényeg a kényelem és a professzionális hatás. 👔👗';
    }

    // Allergének
    if (input.includes('allergén') || input.includes('glutén') || input.includes('laktóz')) {
      return 'Több környékbeli étterem online étlapján nincs részletes allergén-jelölés. Biztonság kedvéért javasolt előre rákérdezni telefonon/e-mailben. Szeretnél elérhetőséget egy választott helyhez? ⚠️';
    }

    // Networking
    if (input.includes('networking') || input.includes('kapcsolat') || input.includes('ismerkedés')) {
      return 'Networking: minden jeggyel van rá lehetőség, VIP-nél exkluzív lounge és külön programok. Szeretnél VIP infókat? 🤝';
    }

    // Miért éri meg?
    if (input.includes('miért') || input.includes('érdemes') || input.includes('előny') || input.includes('haszon')) {
      return 'Nem elmélet, hanem azonnal alkalmazható tudás, valós magyar esettanulmányok és AI-ügynök/workflow megoldások – HVG & Amazing AI prémium minőségben. 💡';
    }

    // Workshopok
    if (input.includes('workshop') || input.includes('műhely') || input.includes('gyakorlat')) {
      return 'Délutáni workshopok: AI-csapatom (Amazing AI), Kódolt kreativitás (Béres), No-code automatizáció (Supercharge), Human 2.0 (NEXT), Vizuális anyagok AI-jal (Just Bee Digital), Copywriter 2.0 (Amazing AI), Voice AI (AI Squad). Melyik érdekel? 🛠️';
    }

    // Szervezők
    if (input.includes('hvg') || input.includes('amazing') || input.includes('szervező')) {
      return 'Szervezők: HVG & Amazing AI – minőségi tartalom és gyakorlati megközelítés. 🏆';
    }

    // Alapértelmezett, sales-orientált válasz
    return 'Köszönöm a kérdésed! Az AI Talks 2025. szeptember 3-án indul Budapesten – korlátozott idejű kedvezményekkel. Melyik témáról küldjek részletes infót: jegyek, program, workshopok, parkolás vagy éttermek? ✨';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <Card className="mb-4 w-96 h-[500px] flex flex-col shadow-chatbot border-primary/30 bg-gradient-chatbot backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-card border-b border-primary/20 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse shadow-sm shadow-primary/50"></div>
              <div>
                <span className="font-bold text-foreground text-sm">AI Talks</span>
                <div className="text-xs text-muted-foreground">Asszisztens</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 w-8 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
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
                    'max-w-[80%] p-3 rounded-xl transition-smooth',
                    message.isBot
                      ? 'bg-card text-foreground border border-primary/20 shadow-sm'
                      : 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  )}
                >
                  <p className="text-sm leading-relaxed font-medium">{message.text}</p>
                  <span className={cn(
                    "text-xs mt-1 block",
                    message.isBot ? "text-muted-foreground" : "text-primary-foreground/70"
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
                <div className="bg-card border border-primary/20 p-3 rounded-xl shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-primary/20">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Kérdezz bármit az AI Talks-ról..."
                className="flex-1 bg-muted/50 border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-muted/70 transition-smooth"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="bg-gradient-primary hover:shadow-glow transition-smooth disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-14 w-14 rounded-full shadow-chatbot transition-bounce',
          isOpen 
            ? 'bg-card border border-primary/30 text-foreground hover:bg-muted/80' 
            : 'bg-gradient-primary text-primary-foreground hover:shadow-glow'
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
};