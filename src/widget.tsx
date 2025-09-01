import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChatbotWidget } from './components/Chatbot/ChatbotWidget';
import './index.css';

// Global configuration interface
interface ChatbotConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  containerClass?: string;
}

// Standalone wrapper component that doesn't depend on React Router
const StandaloneChatbot: React.FC<ChatbotConfig> = ({ position = 'bottom-right', containerClass = '' }) => {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${containerClass}`}>
      <ChatbotWidget />
    </div>
  );
};

// Global function to initialize the chatbot
declare global {
  interface Window {
    initAITalksChatbot: (config?: ChatbotConfig) => void;
    AITalksChatbot: {
      init: (config?: ChatbotConfig) => void;
      destroy: () => void;
    };
  }
}

let chatbotRoot: any = null;

const initChatbot = (config: ChatbotConfig = {}) => {
  // Find or create container
  let container = document.getElementById('ai-talks-chatbot-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ai-talks-chatbot-container';
    document.body.appendChild(container);
  }

  // Apply custom CSS variables if primaryColor is set
  if (config.primaryColor) {
    document.documentElement.style.setProperty('--primary', config.primaryColor);
  }

  // Update Supabase config if provided
  if (config.supabaseUrl && config.supabaseKey) {
    // This would require updating the Supabase client configuration
    console.log('Custom Supabase config:', { url: config.supabaseUrl, key: config.supabaseKey });
    // For now, we'll use the default configuration
  }

  // Render the chatbot
  if (!chatbotRoot) {
    chatbotRoot = createRoot(container);
  }
  
  chatbotRoot.render(<StandaloneChatbot {...config} />);
};

const destroyChatbot = () => {
  const container = document.getElementById('ai-talks-chatbot-container');
  if (container && chatbotRoot) {
    chatbotRoot.unmount();
    chatbotRoot = null;
    container.remove();
  }
};

// Global API
window.initAITalksChatbot = initChatbot;
window.AITalksChatbot = {
  init: initChatbot,
  destroy: destroyChatbot
};

// Auto-initialize if config is found in window
if (typeof window !== 'undefined' && (window as any).AITalksChatbotConfig) {
  initChatbot((window as any).AITalksChatbotConfig);
}

export { initChatbot, destroyChatbot, StandaloneChatbot };