# 🚀 AI Talks Chatbot - WordPress Integráció Kész!

Sikeresen elkészítettem a teljes WordPress integrációs csomagot a chatbothoz. Most egyetlen script tag-gel beágyazható bármely WordPress oldalba.

## 📦 Létrehozott fájlok:

### Widget Build Rendszer
- `vite.widget.config.ts` - Standalone build konfiguráció
- `src/widget.tsx` - Widget entry point globális API-val
- `src/components/Chatbot/StandaloneChatbotWidget.tsx` - Standalone verzió
- `build-widget.js` - Build script

### WordPress Integration
- `wordpress-integration/ai-talks-chatbot-plugin.php` - Komplett WordPress plugin
- `wordpress-integration/README.md` - Részletes integráció útmutató
- `wordpress-integration/example.html` - Működő demo oldal
- `wordpress-integration/DEPLOYMENT.md` - Deployment útmutató

## 🎯 Használat:

### 1. Widget Build (package.json-hoz add hozzá: `"build:widget": "node build-widget.js"`)
```bash
npm run build:widget
```

### 2. Egyszerű Beágyazás WordPress-be:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ai-talks-chatbot@latest/dist/ai-talks-chatbot.css">
<script src="https://cdn.jsdelivr.net/npm/ai-talks-chatbot@latest/dist/ai-talks-chatbot.umd.js"></script>
<script>
    window.initAITalksChatbot({
        position: 'bottom-right',
        primaryColor: '#2563eb'
    });
</script>
```

### 3. WordPress Plugin:
- Csomagold ZIP-be a plugin PHP fájlt
- Telepítsd a WordPress admin felületen
- Konfiguráld a Settings → AI Talks Chatbot menüben

## ✨ Főbb Features:

- **Egyszerű integráció** - Egyetlen script tag
- **Testreszabható** - Pozíció, színek, CSS
- **WordPress plugin** - Admin felülettel
- **CDN ready** - Gyors betöltés
- **Responsive** - Minden eszközön működik
- **Performance optimized** - Lazy loading támogatás

## 🔧 API:

```javascript
// Inicializálás
window.initAITalksChatbot(config);

// Vezérlés
window.AITalksChatbot.init(config);
window.AITalksChatbot.destroy();
```

## 📝 Következő lépések:

1. Teszteld a `wordpress-integration/example.html` demo oldalt
2. Build-eld a widget-et: `npm run build:widget`  
3. Töltsd fel a fájlokat CDN-re
4. Telepítsd a WordPress plugint tesztelésre

A chatbot most WordPress-ready! 🎉