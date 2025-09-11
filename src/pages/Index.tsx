import React from 'react';
import { AITalksLanding } from '@/components/AITalksLanding';
import { ChatbotWidget } from '@/components/Chatbot/ChatbotWidget';
import { KnowledgeSeeder } from '@/components/admin/KnowledgeSeeder';

const Index = () => {
  return (
    <>
      {/* Admin-only seeder opens with ?seed=1 */}
      <KnowledgeSeeder />

      {/* Main Landing Page */}
      <AITalksLanding />
      
      {/* Chatbot Widget - Fixed positioned */}
      <ChatbotWidget />
    </>
  );
};

export default Index;