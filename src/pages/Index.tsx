import React from 'react';
import { AITalksLanding } from '@/components/AITalksLanding';
import { ChatbotWidget } from '@/components/Chatbot/ChatbotWidget';

const Index = () => {
  return (
    <>
      {/* Main Landing Page */}
      <AITalksLanding />
      
      {/* Chatbot Widget - Fixed positioned */}
      <ChatbotWidget />
    </>
  );
};

export default Index;