import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Vite config for building standalone WordPress widget
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/widget.tsx'),
      name: 'AITalksChatbot',
      fileName: (format) => `ai-talks-chatbot.${format}.js`,
      formats: ['umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'ai-talks-chatbot.css';
          return assetInfo.name || '';
        }
      }
    },
    cssCodeSplit: false,
    outDir: 'dist-widget',
    emptyOutDir: true
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});