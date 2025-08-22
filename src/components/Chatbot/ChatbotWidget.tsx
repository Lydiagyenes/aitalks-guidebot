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
      text: 'Szia! Én vagyok az AI Talks asszisztensed! 🤖 November 20-án várunk a Bálna Budapestben, ahol a HVG & Amazing AI bemutatja, hogyan válhat az AI a te üzleti versenyelőnyeddé. Miben segíthetek? Jegyek, program, workshopok? 🚀',
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
    
    if (input.includes('program') || input.includes('menetrend') || input.includes('időpont') || input.includes('mikor')) {
      return 'Az AI Talks 2025. november 20-án kerül megrendezésre, 11:00-22:00 között a Bálna Budapestben! Délelőtt inspiráló előadások, délután praktikus workshopok várnak. Három szinten választhatsz: Solo, Team vagy Enterprise magic. Szeretnéd megtudni a jegyáraink is? 💼';
    }
    
    if (input.includes('előadó') || input.includes('speaker') || input.includes('ki beszél')) {
      return 'Fantasztikus előadókat hívtunk meg! Például Tomas Snazyk (CEO, Startup Poland) és más AI szakértők, akik valós, működő megoldásokat mutatnak be. Nem elméletet, hanem azonnal alkalmazható tudást kapsz! Érdekelnek a jegy opciók? 🚀';
    }
    
    if (input.includes('jegy') || input.includes('ár') || input.includes('költség') || input.includes('mennyibe')) {
      return 'Háromféle jegytípusunk van kedvezménnyel: BASIC 39.900 Ft+ÁFA (eredeti 49.900 Ft), PRÉMIUM 139.900 Ft+ÁFA (videófelvételekkel), VIP 169.900 Ft+ÁFA (VIP lounge, networking az előadókkal). A kedvezmény augusztus 31-ig él! Melyik érdekel? 🎟️';
    }
    
    if (input.includes('helyszín') || input.includes('hol') || input.includes('cím') || input.includes('bálna')) {
      return 'A konferencia a Bálna Budapestben lesz, a Fővám tér 11-12. szám alatt. Fantasztikus helyszín a Duna-parton, könnyen megközelíthető tömegközlekedéssel és autóval is! November 20-án, 11:00-22:00. Foglaljunk helyet neked? 📍';
    }
    
    if (input.includes('networking') || input.includes('kapcsolat') || input.includes('ismerkedés')) {
      return 'Remek, hogy érdekel a networking! A VIP jeggyel zártkörű kapcsolatépítő találkozó az előadókkal és kiállítókkal, VIP lounge külön cateringgel. De minden jegytípusnál van lehetőség kapcsolatépítésre! Melyik jegytípus érdekel? 🤝';
    }
    
    if (input.includes('miért') || input.includes('érdemes') || input.includes('előny') || input.includes('haszon')) {
      return 'Az AI Talks egyedülálló! HVG & Amazing AI közös rendezvény, 70.000+ embernek már segítettek. Nem elméletet kapsz, hanem másnap már használható tudást. Valós esettanulmányok, működő workflow-k, AI-ügynökök építése. Ez befektetés a jövődbe! 💡';
    }

    if (input.includes('workshop') || input.includes('műhely') || input.includes('gyakorlat')) {
      return 'Délután három párhuzamos workshop-útvonal: Solo magic (egyéni hatékonyság), Team magic (csapat szintű AI), Enterprise magic (vállalatirányítási szint). A helyszínen választhatsz, melyik a legmegfelelőbb számodra! 🛠️';
    }

    if (input.includes('hvg') || input.includes('amazing') || input.includes('szervező')) {
      return 'Az AI Talks a HVG (45+ éves médiatapasztalat) és az Amazing AI (70.000+ ember képzése) stratégiai szövetsége. Két hiteles szereplő garantálja a prémium minőséget és a gyakorlatias megközelítést! 🏆';
    }

    // Default sales-oriented response
    return 'Köszönöm a kérdésed! Az AI Talks november 20-án vár a Bálna Budapestben - ez egy egyedülálló lehetőség, hogy az AI-t valódi versenyelőnnyé alakítsd. Van konkrét kérdésed a programról, jegyekről vagy workshopokról? Segítek megtalálni a számodra ideális opciót! ✨';
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
        <Card className="mb-4 w-96 h-[500px] flex flex-col shadow-chatbot border-primary/20" style={{ background: 'var(--gradient-chatbot-spiral)' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-white/20 backdrop-blur-sm text-purple-900 rounded-t-lg border-b border-white/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="font-semibold">AI Talks Asszisztens</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-purple-900 hover:bg-white/30"
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
                    'max-w-[80%] p-3 rounded-lg transition-smooth',
                    message.isBot
                      ? 'bg-white/80 backdrop-blur-sm text-purple-900 border border-white/40 shadow-sm'
                      : 'bg-purple-800/90 backdrop-blur-sm text-white border border-purple-600/40'
                  )}
                >
                  <p className="text-sm leading-relaxed font-medium">{message.text}</p>
                  <span className="text-xs opacity-60 mt-1 block">
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
                <div className="bg-white/80 backdrop-blur-sm border border-white/40 p-3 rounded-lg shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/30">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Kérdezz bármit az AI Talks-ról..."
                className="flex-1 bg-white/90 backdrop-blur-sm border-white/40 text-purple-900 placeholder:text-purple-600 focus:border-primary transition-smooth"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="bg-gradient-primary hover:shadow-glow transition-smooth"
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
            ? 'bg-muted hover:bg-muted/80' 
            : 'bg-gradient-primary hover:shadow-glow'
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