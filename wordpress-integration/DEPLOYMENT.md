# AI Talks Chatbot - Deployment Guide

## WordPress Integráció Teljes Útmutató

### 1. Widget Build Elkészítése

Először építsd fel a standalone widget verziót:

```bash
npm run build:widget
```

Ez létrehozza a `dist-widget/` mappát a következő fájlokkal:
- `ai-talks-chatbot.umd.js` - A JavaScript bundle
- `ai-talks-chatbot.css` - A stílus fájl

### 2. CDN Hosting

A fájlokat fel kell tölteni egy CDN-re vagy statikus hosting szolgáltatásra:

**Lehetőségek:**
- **jsDelivr**: `https://cdn.jsdelivr.net/npm/ai-talks-chatbot@latest/dist/`
- **unpkg**: `https://unpkg.com/ai-talks-chatbot@latest/dist/`
- **Saját CDN**: Töltsd fel a fájlokat a saját szervedre

### 3. NPM Package Publikálás (Opcionális)

Ha NPM package-ként szeretnéd publikálni:

```bash
# Package.json frissítése
npm version 1.0.0

# Publikálás
npm publish
```

### 4. WordPress Integráció Módszerek

#### A) Plugin Használata (Ajánlott)

1. Csomagold be a plugin fájlt ZIP-be:
```bash
cd wordpress-integration
zip -r ai-talks-chatbot-plugin.zip ai-talks-chatbot-plugin.php
```

2. WordPress Admin → Plugins → Add New → Upload Plugin
3. Aktiválás után Settings → AI Talks Chatbot

#### B) Manuális Theme Integráció

Helyezd el a következő kódot a `functions.php` fájlba:

```php
function add_ai_talks_chatbot() {
    ?>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ai-talks-chatbot@latest/dist/ai-talks-chatbot.css">
    <script src="https://cdn.jsdelivr.net/npm/ai-talks-chatbot@latest/dist/ai-talks-chatbot.umd.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            window.initAITalksChatbot({
                position: 'bottom-right',
                primaryColor: '#2563eb'
            });
        });
    </script>
    <?php
}
add_action('wp_footer', 'add_ai_talks_chatbot');
```

#### C) HTML Snippet Beágyazás

Egyszerűen add hozzá a HTML-hez:

```html
<!-- Foot-er előtt -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ai-talks-chatbot@latest/dist/ai-talks-chatbot.css">
<script src="https://cdn.jsdelivr.net/npm/ai-talks-chatbot@latest/dist/ai-talks-chatbot.umd.js"></script>
<script>
    window.initAITalksChatbot();
</script>
```

### 5. Konfigurációs Opciók

```javascript
window.initAITalksChatbot({
    // Pozíció beállítások
    position: 'bottom-right', // 'bottom-left', 'top-right', 'top-left'
    
    // Vizuális testreszabás
    primaryColor: '#2563eb', // HEX színkód
    containerClass: 'custom-chatbot-class',
    
    // Backend konfiguráció (ha saját Supabase-t használsz)
    supabaseUrl: 'https://your-project.supabase.co',
    supabaseKey: 'your-anon-key'
});
```

### 6. CSS Testreszabás

A chatbot megjelenését CSS-sel testre szabhatod:

```css
/* Chatbot testreszabás */
#ai-talks-chatbot-container {
    z-index: 999999 !important;
}

/* Egyedi színek */
:root {
    --primary: 220 90% 56%; /* HSL formátum */
    --primary-foreground: 0 0% 100%;
}

/* Animáció testreszabás */
.custom-chatbot-class {
    animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

### 7. Teljesítmény Optimalizáció

#### Lazy Loading

```javascript
// Csak akkor töltsd be, ha szükséges
function loadChatbotOnDemand() {
    if (typeof window.initAITalksChatbot === 'undefined') {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://cdn.jsdelivr.net/npm/ai-talks-chatbot@latest/dist/ai-talks-chatbot.css';
        document.head.appendChild(css);
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/ai-talks-chatbot@latest/dist/ai-talks-chatbot.umd.js';
        script.onload = () => window.initAITalksChatbot();
        document.body.appendChild(script);
    } else {
        window.initAITalksChatbot();
    }
}

// Például scroll esetén
let scrolled = false;
window.addEventListener('scroll', () => {
    if (!scrolled && window.scrollY > 100) {
        scrolled = true;
        loadChatbotOnDemand();
    }
});
```

#### Conditional Loading

```php
// Csak bizonyos oldalakon
function should_load_chatbot() {
    return is_front_page() || is_page('contact') || is_page('support');
}

if (should_load_chatbot()) {
    add_action('wp_footer', 'add_ai_talks_chatbot');
}
```

### 8. Hibaelhárítás

#### Gyakori problémák:

1. **Chatbot nem jelenik meg**
   - Ellenőrizd a konzolt hibákért
   - Győződj meg róla, hogy a CSS és JS fájlok betöltődtek
   - Növeld a z-index értékét

2. **Styling konfliktusok**
   - Használj `!important` a kritikus CSS szabályoknál
   - Ellenőrizd, hogy más CSS nem írja felül a chatbot stílusait

3. **Performance problémák**
   - Használj lazy loading-ot
   - Fontold meg a CDN használatát

### 9. Tesztelés

#### Browser kompatibilitás:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

#### WordPress kompatibilitás:
- WordPress 5.0+
- PHP 7.4+
- Minden népszerű témával kompatibilis

### 10. Support & Maintenance

- **Dokumentáció**: `wordpress-integration/README.md`
- **Demo oldal**: `wordpress-integration/example.html`
- **Support email**: support@aitalks.hu

### 11. Version Management

A widget verziókövetése:

```json
{
  "name": "ai-talks-chatbot",
  "version": "1.0.0",
  "description": "AI Talks conference chatbot widget",
  "main": "dist/ai-talks-chatbot.umd.js",
  "files": ["dist/"],
  "repository": "https://github.com/aitalks/chatbot-widget"
}
```

## Következő lépések:

1. ✅ Widget build létrehozása (`npm run build:widget`)
2. 🌐 CDN hosting beállítása  
3. 📦 WordPress plugin tesztelése
4. 📖 Dokumentáció frissítése
5. 🚀 Élő telepítés WordPress oldalakra

A chatbot most készen áll a WordPress integrációra!