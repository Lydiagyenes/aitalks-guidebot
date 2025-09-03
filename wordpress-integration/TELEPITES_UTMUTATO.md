# 🚀 AI Talks Chatbot - Telepítési Útmutató

## 📋 Gyors Áttekintés

A chatbot most már elérhető a GitHub repo-ból: https://github.com/Lydiagyenes/aitalks-guidebot.git

### CDN URL-ek (jsDelivr):
- **CSS:** `https://cdn.jsdelivr.net/gh/Lydiagyenes/aitalks-guidebot@main/dist-widget/ai-talks-chatbot.css`
- **JS:** `https://cdn.jsdelivr.net/gh/Lydiagyenes/aitalks-guidebot@main/dist-widget/ai-talks-chatbot.umd.js`

## 🔧 1. Widget Build (Fejlesztőknek)

```bash
# Projekt build-elése
npm run build:widget

# Generált fájlok a dist-widget/ mappában:
# - ai-talks-chatbot.css
# - ai-talks-chatbot.umd.js
```

## 🌐 2. WordPress Integráció

### Opció A: WordPress Plugin (Ajánlott)

1. **Plugin telepítés:**
   ```
   - Csomagold ZIP-be az ai-talks-chatbot-plugin.php fájlt
   - WordPress Admin → Plugins → Add New → Upload Plugin
   - Aktiválás után: Settings → AI Talks Chatbot
   ```

2. **Plugin konfigurálás:**
   - Engedélyezés: ✅ Be
   - Pozíció: Jobb alsó / Bal alsó / stb.
   - Szín: #2563eb (vagy egyedi)
   - Oldalak: Minden oldal / Csak főoldal / Egyedi

### Opció B: Manuális Kód Beágyazás

```html
<!-- WordPress footer.php fájlba a </body> tag elé -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Lydiagyenes/aitalks-guidebot@main/dist-widget/ai-talks-chatbot.css">
<script src="https://cdn.jsdelivr.net/gh/Lydiagyenes/aitalks-guidebot@main/dist-widget/ai-talks-chatbot.umd.js"></script>

<script>
document.addEventListener('DOMContentLoaded', function() {
    window.initAITalksChatbot({
        position: 'bottom-right',
        primaryColor: '#2563eb',
        containerClass: 'wp-ai-talks-chatbot'
    });
});
</script>
```

### Opció C: PHP Functions.php Integráció

```php
function add_ai_talks_chatbot() {
    ?>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Lydiagyenes/aitalks-guidebot@main/dist-widget/ai-talks-chatbot.css">
    <script src="https://cdn.jsdelivr.net/gh/Lydiagyenes/aitalks-guidebot@main/dist-widget/ai-talks-chatbot.umd.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof window.initAITalksChatbot === 'function') {
                window.initAITalksChatbot({
                    position: 'bottom-right',
                    primaryColor: '#2563eb'
                });
                console.log('AI Talks Chatbot: Sikeresen betöltve');
            } else {
                console.error('AI Talks Chatbot: Betöltési hiba');
            }
        });
    </script>
    <?php
}
add_action('wp_footer', 'add_ai_talks_chatbot');
```

## 🎯 3. Konfigurációs Opciók

```javascript
window.initAITalksChatbot({
    // Kötelező beállítások
    position: 'bottom-right',        // 'bottom-left', 'top-right', 'top-left'
    primaryColor: '#2563eb',         // Hexadecimális színkód
    
    // Opcionális beállítások
    containerClass: 'my-chatbot',    // Egyedi CSS osztály
    supabaseUrl: 'custom-url',       // Egyedi Supabase (fejlesztőknek)
    supabaseKey: 'custom-key'        // Egyedi Supabase kulcs
});
```

## 🔍 4. Hibakeresés

### Console Debug Parancsok:

```javascript
// Chatbot állapot ellenőrzése
console.log(typeof window.initAITalksChatbot);     // "function" kell legyen
console.log(typeof window.AITalksChatbot);         // "object" kell legyen

// Chatbot újraindítása
window.AITalksChatbot.destroy();
window.initAITalksChatbot({ position: 'bottom-left' });

// DOM ellenőrzése
console.log(document.getElementById('ai-talks-chatbot-container'));
```

### Gyakori Problémák:

1. **❌ Chatbot nem jelenik meg**
   - Ellenőrizd a Console tab-ot hibákért (F12)
   - Várj 2-3 másodpercet a betöltés után
   - Adblocker kikapcsolása
   
2. **❌ 404 Network Error**
   - GitHub repo nem elérhető vagy main branch hiányzik
   - dist-widget/ mappa nem létezik a repo-ban
   - Build nem futott le
   
3. **❌ JavaScript hibák**
   - Téma/plugin konfliktus
   - jQuery kompatibilitási problémák
   - Cached fájlok (CTRL+F5 refresh)

## 📱 5. Tesztelés

### Teszt HTML Fájl:
Használd a `test-amazingai.html` fájlt a helyi teszteléshez.

### Élő Teszt URL-ek:
- **Demo:** [example.html megnyitása](wordpress-integration/example.html)
- **Teszt:** [test-amazingai.html megnyitása](wordpress-integration/test-amazingai.html)

### Böngésző Kompatibilitás:
- ✅ Chrome 90+
- ✅ Firefox 88+  
- ✅ Safari 14+
- ✅ Edge 90+

## 🎨 6. CSS Testreszabás

```css
/* Egyedi chatbot stílus */
#ai-talks-chatbot-container {
    z-index: 999999 !important;
}

/* Egyedi színek HSL formátumban */
:root {
    --primary: 220 90% 56%;           /* Kék */
    --primary-foreground: 0 0% 100%;  /* Fehér */
}

/* Animációk */
.wp-ai-talks-chatbot {
    animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
```

## 📞 7. Támogatás

### Debug információk gyűjtése:
1. Böngésző Console log mentése (F12 → Console)
2. Network tab ellenőrzése 404 hibákért
3. Használt WordPress verzió és aktív pluginok listája

### Kapcsolat:
- **Email:** support@aitalks.hu
- **Telefon:** +36 70 XXX XXXX
- **GitHub Issues:** https://github.com/Lydiagyenes/aitalks-guidebot/issues

---

## ✅ Gyors Ellenőrző Lista

- [ ] GitHub repo elérhető és main branch létezik
- [ ] `npm run build:widget` lefutott
- [ ] dist-widget/ mappa tartalmazza a CSS és JS fájlokat  
- [ ] WordPress plugin aktiválva vagy kód beágyazva
- [ ] Console log-ban nincs hiba
- [ ] Chatbot megjelenik és válaszol
- [ ] Mobil eszközökön is működik

**Sikeres telepítés esetén a chatbot 2-3 másodperc alatt megjelenik!** 🎉