#!/usr/bin/env node

const { build } = require('vite');
const path = require('path');

async function buildWidget() {
  console.log('🚀 Building AI Talks Chatbot widget...');
  
  try {
    await build({
      configFile: path.resolve(__dirname, 'vite.widget.config.ts'),
    });
    
    console.log('✅ Widget build completed successfully!');
    console.log('📦 Files created in dist-widget/');
    console.log('   - ai-talks-chatbot.umd.js');
    console.log('   - ai-talks-chatbot.css');
    console.log('');
    console.log('🌐 Ready for WordPress integration!');
    console.log('   Copy files to your CDN or use the provided WordPress plugin.');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildWidget();