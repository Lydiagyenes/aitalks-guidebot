# AI Talks Chatbot - WordPress Integráció

Az AI Talks chatbot egyszerűen integrálható bármely WordPress oldalba egyetlen script tag segítségével.

## Gyors Telepítés

### 1. HTML/JavaScript beágyazás

Helyezd el ezt a kódot a WordPress oldal `<head>` szakaszában vagy a footer-ben:

```html
<!-- AI Talks Chatbot -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ai-talks-chatbot@latest/dist/ai-talks-chatbot.css">
<script src="https://cdn.jsdelivr.net/npm/ai-talks-chatbot@latest/dist/ai-talks-chatbot.umd.js"></script>

<script>
// Alapértelmezett beállításokkal
window.initAITalksChatbot();

// Vagy egyedi beállításokkal
/*
window.initAITalksChatbot({
  position: 'bottom-right', // 'bottom-left', 'top-right', 'top-left'
  primaryColor: '#2563eb',
  containerClass: 'my-custom-class'
});
*/
</script>
```

### 2. WordPress Plugin használata

Létrehoztunk egy egyszerű WordPress plugint is. Töltsd le a `ai-talks-chatbot-plugin.zip` fájlt és telepítsd a WordPress admin felületen keresztül.

## Konfigurációs Opciók

```javascript
window.initAITalksChatbot({
  // Pozíció beállítása
  position: 'bottom-right', // 'bottom-left', 'top-right', 'top-left'
  
  // Színek testreszabása
  primaryColor: '#2563eb', // Hexadecimális színkód
  
  // CSS osztály hozzáadása
  containerClass: 'my-custom-chatbot-class',
  
  // Egyedi Supabase konfiguráció (opcionális)
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key'
});
```

## Advanced Integráció

### Funkciók vezérlése

```javascript
// Chatbot inicializálása
window.AITalksChatbot.init({
  position: 'bottom-left',
  primaryColor: '#10b981'
});

// Chatbot eltávolítása
window.AITalksChatbot.destroy();

// Újra inicializálás más beállításokkal
window.AITalksChatbot.init({
  position: 'top-right',
  primaryColor: '#f59e0b'
});
```

### CSS Testreszabás

A chatbot megjelenését CSS-sel is testre szabhatod:

```css
/* Chatbot container testreszabása */
#ai-talks-chatbot-container {
  z-index: 999999 !important;
}

/* Egyedi színek */
:root {
  --primary: 220 90% 56%;
  --primary-foreground: 0 0% 100%;
}

/* Egyedi animációk */
.my-custom-chatbot-class {
  animation: slideInFromRight 0.3s ease-out;
}

@keyframes slideInFromRight {
  from {
    transform: translateX(100px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

## WordPress Specific Instructions

### Theme Integration

Ha a chatbotot közvetlenül a témába szeretnéd beágyazni, add hozzá ezt a kódot a `functions.php` fájlhoz:

```php
function add_ai_talks_chatbot() {
    ?>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ai-talks-chatbot@latest/dist/ai-talks-chatbot.css">
    <script src="https://cdn.jsdelivr.net/npm/ai-talks-chatbot@latest/dist/ai-talks-chatbot.umd.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            window.initAITalksChatbot({
                position: 'bottom-right',
                primaryColor: '<?php echo get_theme_mod('primary_color', '#2563eb'); ?>'
            });
        });
    </script>
    <?php
}
add_action('wp_footer', 'add_ai_talks_chatbot');
```

### Conditional Loading

Ha csak bizonyos oldalakon szeretnéd megjeleníteni a chatbotot:

```php
function add_ai_talks_chatbot_conditional() {
    // Csak a főoldalon és a kapcsolat oldalon
    if (is_front_page() || is_page('contact')) {
        add_ai_talks_chatbot();
    }
}
add_action('wp_footer', 'add_ai_talks_chatbot_conditional');
```

## Troubleshooting

### Gyakori problémák

1. **A chatbot nem jelenik meg**
   - Ellenőrizd, hogy mindkét fájl (CSS és JS) betöltődött-e
   - Nézd meg a browser konzolt hibákért
   - Győződj meg róla, hogy a `initAITalksChatbot()` függvény meghívásra került

2. **Styling problémák**
   - Ellenőrizd, hogy nincs-e CSS konfliktus
   - Próbáld meg növelni a z-index értékét
   - Használj `!important` a kritikus CSS szabályoknál

3. **A chatbot nem válaszol**
   - Ellenőrizd a network tabot a böngészőben
   - Győződj meg róla, hogy a Supabase konfiguráció helyes

### Browser Kompatibilitás

A chatbot támogatja:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Támogatás

Ha problémáid vannak az integrációval, írj nekünk: support@aitalks.hu

## Changelog

### v1.0.0
- Alapvető chatbot funkcionalitás
- WordPress integráció
- Testreszabható színek és pozíciók
- Responsive design

### v1.1.0
- Jobb hibakezélés
- Teljesítmény optimalizáció
- További konfigurációs opciók