import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

export const ChatbotWidget = () => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Szia! Én vagyok az AI Talks asszisztensed! 🤖 Szívesen segítek a konferenciával kapcsolatos kérdésekben. Miben segíthetek?',
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [followupHistory, setFollowupHistory] = useState<string[]>([]);
  const [ticketMentionCounter, setTicketMentionCounter] = useState(0);
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
        // Update ticket mention counter here before getting response
        setTicketMentionCounter(prev => prev + 1);
        
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
      await supabase.from('chatbot_interactions').insert({
        session_id: sessionId,
        question,
        answer,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        metadata: {
          component: 'ChatbotWidget',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log interaction:', error);
    }
  };

  const detectTopic = (userInput: string): string => {
    const input = userInput.toLowerCase();
    if (input.includes('program') || input.includes('menetrend') || input.includes('időpont') || input.includes('mikor')) return 'program';
    if (input.includes('workshop') || input.includes('műhely') || input.includes('gyakorlat')) return 'workshop';
    if (input.includes('helyszín') || input.includes('hol') || input.includes('cím') || input.includes('bálna')) return 'location';
    if (input.includes('parkol') || input.includes('parkoló') || input.includes('mélygarázs')) return 'parking';
    if (input.includes('étterem') || input.includes('ebéd') || input.includes('vacsora')) return 'restaurant';
    if (input.includes('jegy') || input.includes('ár') || input.includes('költség') || input.includes('mennyibe')) return 'ticket';
    if (input.includes('előadó') || input.includes('speaker') || input.includes('ki beszél')) return 'speaker';
    if (input.includes('dress') || input.includes('öltözet') || input.includes('ruha')) return 'dress';
    if (input.includes('networking') || input.includes('kapcsolat') || input.includes('ismerkedés')) return 'networking';
    return 'general';
  };

  const getFollowUpQuestion = (topic: string, usedFollowups: string[]): string => {
    const followups = {
      program: ["Melyik előadás érdekel leginkább?", "Kérsz részletet valamelyik workshopról?", "Segítsek időbeosztást tervezni?"],
      workshop: ["Melyik témakör lenne számodra leginkább hasznos?", "Kérdések vannak a gyakorlati részekkel kapcsolatban?", "Érdekel más workshop is?"],
      location: ["Segítsek útvonalat tervezni?", "Kell parkolási tipp is?", "Érdeklődnél közlekedési infó iránt?"],
      parking: ["Segítsek dönteni a parkolási opcióban?", "Kérsz útvonal-tippet is?", "Érdekel a közösségi közlekedés is?"],
      restaurant: ["Foglaljak asztalt valahol?", "Kell allergén információ?", "Érdekel még más környékbeli hely?"],
      ticket: ["Melyik jegytípus lenne ideális számodra?", "Kérsz részleteket a VIP előnyökről?", "Segítsek céges elszámolásban?"],
      speaker: ["Kérsz részleteket valamelyik előadásról?", "Érdekel valamelyik előadó háttere?", "Melyik témakör vonzó?"],
      dress: ["Kell konkrét öltözködési tipp?", "Vannak kérdések a business casual-lel kapcsolatban?", "Segítsek outfit ötletekkel?"],
      networking: ["Érdekel a VIP networking?", "Kérsz tippeket az ismerkedéshez?", "Segítsek stratégiát tervezni?"],
      general: ["Miben tudok még segíteni?", "Van más kérdés?", "Érdekel valami konkrét téma?"]
    };

    const options = followups[topic as keyof typeof followups] || followups.general;
    const available = options.filter(option => !usedFollowups.includes(option));
    return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : options[0];
  };

  const getAIResponse = async (userInput: string): Promise<string> => {
    try {
      const topic = detectTopic(userInput);
      const history = messages.slice(-3).map(m => ({ text: m.text, isBot: m.isBot }));
      
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { 
          message: userInput,
          history,
          topic_hint: topic,
          last_followups: followupHistory.slice(-5)
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        return getFallbackResponse(userInput, topic);
      }

      // Check for rate limit or payment errors
      if (data?.error === 'rate_limited' || data?.status === 429) {
        toast({
          title: "Túl sok kérés",
          description: "Kérlek, várj egy kicsit mielőtt újra kérdezel. 🙏",
          variant: "destructive",
        });
        return "Rövid időn belül túl sok kérdést tettél fel. Kérlek, várj egy percet és próbáld újra! 😊";
      }

      if (data?.error === 'payment_required' || data?.status === 402) {
        toast({
          title: "Elérted a limitet",
          description: "Az AI használati keret kimerült. Kérlek, próbáld később!",
          variant: "destructive",
        });
        return "Az AI szolgáltatás átmenetileg nem érhető el. Kérlek, próbáld meg később! 🙏";
      }

      return data?.response || getFallbackResponse(userInput, topic);
    } catch (error) {
      console.error('Error calling Gemini:', error);
      return getFallbackResponse(userInput, detectTopic(userInput));
    }
  };

  const getFallbackResponse = (userInput: string, topic: string): string => {
    const input = userInput.toLowerCase();
    
    // Use current counter value without updating it here
    const shouldMentionTickets = ticketMentionCounter % 5 === 0;

    // Program / időpont
    if (input.includes('program') || input.includes('menetrend') || input.includes('időpont') || input.includes('mikor')) {
      const responses = [
        'A konferencia november 20-án lesz Budapesten. Délelőtt előadások, délután workshopok. Melyik előadás érdekel leginkább?',
        'Program: délelőtt 9:05-tól előadások, délután 13:15-től workshopok. Kérsz részletet valamelyik workshopról?',
        'Teljes napos program november 20-án a Bálnában. Segítsek időbeosztást tervezni?'
      ];
      return responses[Math.floor(Math.random() * responses.length)] + (shouldMentionTickets ? ' (Super Early Bird árak szeptember 30-ig!)' : '');
    }

    // Előadók
    if (input.includes('előadó') || input.includes('speaker') || input.includes('ki beszél')) {
      const responses = [
        'Előadóink: Lisa Kleinman (Make.com), Caio Moretti (grupoQ), Németh Gábor (Amazing AI), Balogh Csaba (HVG) és mások. Kérsz részleteket valamelyik előadásról?',
        'Nemzetközi és hazai AI-szakértők beszélnek. Érdekel valamelyik előadó háttere?',
        'Kiváló speaker lineup: AI-ügynöktől művészetig. Melyik témakör vonzó?'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Jegyek / árak - frissített Super Early Bird árak
    if (input.includes('jegy') || input.includes('ár') || input.includes('költség') || input.includes('mennyibe')) {
      return 'Super Early Bird árak szeptember 30-ig: BASIC 29.950 Ft+áfa, PRÉMIUM 34.950 Ft+áfa, VIP 59.500 Ft+áfa. Melyik jegytípus lenne ideális számodra? 🎟️';
    }

    // Helyszín
    if (input.includes('helyszín') || input.includes('hol') || input.includes('cím') || input.includes('bálna')) {
      const responses = [
        'Helyszín: Bálna, Budapest, Fővám tér 11-12, 1093. Segítsek útvonalat tervezni?',
        'A Bálna épületében leszünk, Fővám téren. Kell parkolási tipp is?',
        'Központi helyszín a Duna-parton. Érdeklődnél közlekedési infó iránt?'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Éttermek
    if (input.includes('étterem') || input.includes('ebéd') || input.includes('vacsora')) {
      const responses = [
        'Top helyek: Esetleg Bisztró (panoráma), Fakanál (4000-6000 Ft), EscoBar & Cafe (pizza is). Foglaljak asztalt valahol?',
        'Közelben: Rombusz Étterem (elegáns), Petruska étkezde (házias magyar). Kell allergén információ?',
        'Válogatás: modern európai, magyar házias, önkiszolgáló opciók. Érdekel még más környékbeli hely?'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Parkolás
    if (input.includes('parkol') || input.includes('parkoló') || input.includes('mélygarázs') || input.includes('utcai')) {
      const responses = [
        'Bálna mélygarázs 350 Ft/óra (legközelebb), vagy környékbeli parkolók. Segítsek dönteni a parkolási opcióban?',
        'Több opció: mélygarázs, Csarnok Parkoló, utcai zónás. Kérsz útvonal-tippet is?',
        'Parkolás IX. kerületi A zóna (600 Ft/óra) vagy fedett garázsok. Érdekel a közösségi közlekedés is?'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Dress code
    if (input.includes('dress') || input.includes('öltözet') || input.includes('ruha') || input.includes('viselet')) {
      const responses = [
        'Business casual ajánlott - kényelmes, mégis professzionális. Kell konkrét öltözködési tipp?',
        'Ing/blúz + chino/szövetnadrág, opcionális blézer. Vannak kérdések a business casual-lel kapcsolatban?',
        'Laza eleganciára törekedj - kényelmes, de szép. Segítsek outfit ötletekkel?'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Workshopok
    if (input.includes('workshop') || input.includes('műhely') || input.includes('gyakorlat')) {
      const responses = [
        'Délutáni workshopok: AI-csapatom, No-code automatizáció, Voice AI, Copywriter 2.0 stb. Melyik témakör lenne számodra leginkább hasznos?',
        'Gyakorlati foglalkozások 13:15-től: kreativitás, hatékonyság, marketing, automatizáció. Kérdések vannak a gyakorlati részekkel kapcsolatban?',
        '8 párhuzamos workshop délután - mindegyik hands-on. Érdekel más workshop is?'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Networking
    if (input.includes('networking') || input.includes('kapcsolat') || input.includes('ismerkedés')) {
      const responses = [
        'Networking minden jegytípusban, VIP-nél exkluzív lounge. Érdekel a VIP networking?',
        'Remek lehetőség kapcsolatépítésre! Kérsz tippeket az ismerkedéshez?',
        'Szünetek és VIP area ideális networking-re. Segítsek stratégiát tervezni?'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Alapértelmezett, változatos válaszok
    const generalResponses = [
      'Szívesen segítek további kérdésekkel! Miben tudok még segíteni?',
      'Köszi a kérdést! Van más kérdés?',
      'További infó kell? Érdekel valami konkrét téma?'
    ];
    return generalResponses[Math.floor(Math.random() * generalResponses.length)] + (shouldMentionTickets ? ' (Jegyvásárlás szeptember 3-án nyílik!)' : '');
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

      {/* Toggle Button - only visible when closed */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-chatbot transition-bounce bg-gradient-primary text-primary-foreground hover:shadow-glow"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

    </div>
  );
};