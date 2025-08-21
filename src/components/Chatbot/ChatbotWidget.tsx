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
      text: 'Szia! Én vagyok az AI Talks asszisztensed. Segítek minden kérdésben a konferenciával kapcsolatban. Miben segíthetek? 🎯',
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
    
    if (input.includes('program') || input.includes('menetrend') || input.includes('időpont')) {
      return 'Az AI Talks konferencia gazdag programmal várja a résztvevőket! Reggel 9:00-tól délután 17:00-ig tartunk előladásokat, kerekasztal-beszélgetéseket és networking lehetőségeket. A teljes programot megtekintheted a weboldalunkon. Szeretnéd megtudni a jegyáraink is? 💼';
    }
    
    if (input.includes('előadó') || input.includes('speaker')) {
      return 'Fantasztikus előladókat hívtunk meg! AI szakértők, technológiai vezetők és innovációs guruk tartanak előladást. Mindegyikük saját területének elismert szakembere. Az ilyen minőségű előladásokat ritkán hallhatod egy helyen - ez egyedülálló lehetőség! Érdekelnek a jegy opciók? 🚀';
    }
    
    if (input.includes('jegy') || input.includes('ár') || input.includes('költség')) {
      return 'Kiváló kérdés! Különböző jegytípusaink vannak: Early Bird (29.900 Ft), Standard (39.900 Ft) és VIP (59.900 Ft). A VIP jegy külön networking eseményt és meetup lehetőséget is tartalmaz! A helyek limitáltak, érdemes mielőbb foglalni. Segítek a jegyvásárlásban? 🎟️';
    }
    
    if (input.includes('helyszín') || input.includes('hol') || input.includes('cím')) {
      return 'A konferencia Budapesten kerül megrendezésre, könnyu megközelítéssel a belvárosban. A pontos helyszín információkat a jegyvásárlás után küldjük el. Tömegközlekedéssel és autóval is remekül elérhető! Foglaljunk helyet neked? 📍';
    }
    
    if (input.includes('networking') || input.includes('kapcsolat')) {
      return 'Remek, hogy érdekel a networking! Az AI Talks-on nemcsak tanulhatsz, hanem értékes kapcsolatokat is építhetsz. Kávészünetek, ebédpauza és külön networking szekció is lesz. A VIP jeggyel még exkluzív meetup lehetőség is jár! Melyik jegytípus érdekel? 🤝';
    }
    
    if (input.includes('miért') || input.includes('érdemes') || input.includes('előny')) {
      return 'Fantasztikus kérdés! Az AI Talks-on a legfrissebb trendeket ismerheted meg, értékes kapcsolatokat építhetsz és konkrét tudást szerezhetsz, amit azonnal alkalmazhatsz. Plus: certificatet is kapsz a részvételről! Ez egy befektetés a jövődbe. Biztosítsuk a helyed? 💡';
    }

    // Default sales-oriented response
    return 'Köszönöm a kérdésed! Az AI Talks konferencia minden részletéről szívesen tájékoztatlak. Ez egy egyedülálló lehetőség, hogy felzárkózz az AI trendekhez és értékes kapcsolatokat építs. Van konkrét kérdésed a programról, előladókról vagy jegyekről? Segítek megtalálni a számodra ideális opciot! ✨';
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
        <Card className="mb-4 w-96 h-[500px] flex flex-col shadow-chatbot bg-gradient-subtle border-primary/20">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="font-semibold">AI Talks Asszisztens</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-primary-foreground hover:bg-white/20"
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
                      ? 'bg-chatbot-message-bot text-foreground border border-border'
                      : 'bg-chatbot-message-user text-primary-foreground'
                  )}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <span className="text-xs opacity-70 mt-1 block">
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
                <div className="bg-chatbot-message-bot border border-border p-3 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Kérdezz bármit az AI Talks-ról..."
                className="flex-1 transition-smooth focus:shadow-elegant"
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