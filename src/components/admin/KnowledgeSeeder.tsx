import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

// Minimal, client-side seeder that calls the secured kb-upsert Edge Function.
// It only appears when the URL contains ?seed=1 OR when manually opened
// The admin token is entered by the user and sent only in the request header (not persisted).

export const KnowledgeSeeder: React.FC = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTrigger, setShowTrigger] = useState(false);

  useEffect(() => {
    // Check URL params multiple times to ensure we catch it
    const checkSeedParam = () => {
      try {
        const url = new URL(window.location.href);
        const seedParam = url.searchParams.get('seed');
        console.log('Checking seed param:', seedParam, 'Full URL:', window.location.href);
        
        if (seedParam === '1') {
          setOpen(true);
          setShowTrigger(true);
        } else {
          setShowTrigger(true); // Show trigger button anyway for manual access
        }
      } catch (err) {
        console.error('Error parsing URL:', err);
        setShowTrigger(true);
      }
    };

    // Check immediately and after a slight delay
    checkSeedParam();
    const timer = setTimeout(checkSeedParam, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const payload = useMemo(() => ({
    title: "AI Talks 2025 Konferencia – Teljes RAG tudásbázis (v3)",
    tags: [
      "hu","faq","ticket","jegy","pricing","ár","parking","parkolás",
      "restaurant","étterem","food","kedvezmények","early-bird","shownote",
      "logisztika","ruhatár","büfé","vendéglátás","bálna","program","előadók",
      "workshopok","speakers","előadások","helyszín","megközelítés","dress-code",
      "öltözet","nyelv","fordítás","vip","premium","basic","amazing-ai","hvg",
      "célcsoport","solo-magic","team-magic","enterprise-magic"
    ],
    source_url: "internal:complete-seed-v3",
    metadata: { language: "hu", category: "conference-full", source: "pdf-import", version: "3.0" },
    content: `# AI Talks Konferencia 2025 – Teljes Információs Bázis

## 1. ÁLTALÁNOS INFORMÁCIÓK

A rendezvény neve: AI Talks Konferencia
Időpont: 2025. november 20., 08:00 - 17:00
Helyszín: Bálna Budapest

A rendezvény leírása: Prémium szakmai rendezvény, amely bemutatja, hogyan tehető a mesterséges intelligencia a személyes hatékonyság vagy egy cég versenyképességének motorjává. A hangsúly a gyakorlati, gyorsan bevethető és megtérülő üzleti megoldásokon van, a "solo" megoldásoktól a jól skálázható vállalati stratégiákig.

Kinek szól: Olyan vezetőknek és szakembereknek szól, akik tudják, hogy most kell lépniük az MI területén, és nem a felhajtás, hanem a konkrét eredmények érdeklik őket. Azoknak, akik nem tanulni akarnak az MI-ről, hanem azonnal kihasználni a benne rejlő lehetőségeket.

Filozófia: Az MI nem egy egyszerű eszköz, hanem egy segítőtárs és partner a munkában, gondolkodásban és innovációban. A konferencia az "AI Fluency" (MI-jártasság) koncepciójára épül, ami a folyamatos kísérletezést és az MI-vel való partneri együttműködést helyezi előtérbe.

## 2. JEGYINFORMÁCIÓK ÉS ÁRAZÁS

### Jegytípusok:

BASIC (Az induló szint):
- Teljes ár: 59.900 Ft + áfa
- Kedvezményes ár: 38.935 Ft + áfa
- Tartalma: Teljes napos részvétel, délelőtti előadások és délutáni workshopok, kiállítók és interaktív standok, 30% HVG könyvkupon

PRÉMIUM (A legnépszerűbb):
- Teljes ár: 69.900 Ft + áfa
- Kedvezményes ár: 45.435 Ft + áfa
- Tartalma: A BASIC csomag tartalma + videófelvételek az előadásokról és workshopokról + 14 napos ingyenes próbaidőszak az Amazing AI Tudástárhoz + részvétel Karen Hao "AI Birodalom" című könyvbemutatóján (november 10.)

VIP (A kiemelt kategória):
- Teljes ár: 119.000 Ft + áfa
- Kedvezményes ár: 77.350 Ft + áfa
- Tartalma: A PRÉMIUM csomag tartalma + soron kívüli VIP beléptetés + 3000 forint értékű ebédkupon + Shownotes (digitális jegyzetcsomag) + Karen Hao és Németh Gábor könyvei + 30 napos ingyenes próbaidőszak az Amazing AI Tudástárhoz + 1 hónap hvg360 hozzáférés + HVG Klubkártya 2026-ra

### Kedvezményes időszakok:

Super Early Bird (lezárul szeptember 30-ig)
Early Bird (október 1-19): 35% kedvezmény
- BASIC: 38.935 Ft + áfa
- PRÉMIUM: 45.435 Ft + áfa
- VIP: 77.350 Ft + áfa

Last Call (október 20 - november 2): 25% kedvezmény

Teljes árú időszak: november 3-tól

Jegyvásárlás: https://aitalks.hu/ – A jegyeket cégnévre is lehet kérni, költségként elszámolható.

## 3. HELYSZÍN ÉS LOGISZTIKA

### Helyszín: Bálna Budapest
A Petőfi-híd (Boráros tér) és a Szabadság-híd (Fővám tér) között helyezkedik el.

### Megközelítés:
Tömegközlekedéssel: M4-es metró; 2-es, 4-6-os, 47-es, 49-es villamosok; valamint számos autóbusz, HÉV és trolibusz.

### Parkolás:
- Bálna mélygarázsa: Korlátozott számú (max 100) parkolóhely, nem foglalható előre. Díj: 350 Ft/óra.
- Alternatívák: Csarnok Parkoló (Csarnok tér 2, kb. 3-4 perc séta), Care Park Liliom Parkoló (Liliom u. 43-45, kb. 10-12 perc séta)
- Utcai parkolás: "A" zóna, 600 Ft/óra, munkanapokon 8:00-22:00 között fizetős, max 3 óra. Hétvégén és ünnepnapokon díjmentes.

### Catering (Étel és ital):
- Fizetős büfé szendvicsekkel és falatkákkal
- Helyszínen több a'la carte étterem is elérhető
- Kóstoltató partnerek: Szaffi, Samurai Shoelace (egészséges falatok, kávé), Tejmadár (madártej)

### Éttermi ajánlások a közelben:
- Esetleg Bisztró: Modern európai konyha, Duna-parti panorámával, kb. 4 perc (290 m)
- Rombusz Étterem: Elegáns étterem a Bálnában, kb. 4 perc (350 m)
- Petruska étkezde: Hagyományos magyar, kb. 5 perc (400 m)
- Fakanál Étterem: Magyar ételek a Nagy Vásárcsarnokban, kb. 1 perc (100 m), 4000-6000 Ft főételek
- EscoBar & Cafe: Lazább hangulat a Bálnában, kb. 2 perc (97 m)

### Ruhatár:
Regisztrációs pultnál elérhető az 1. emeleten.

### Helyszín térkép és terembeosztás:
- Regisztráció: 1. emeleti liftek előtt
- Délelőtti előadások (09:00-12:15): Görgei terem
- Délutáni workshopok (13:15-től): Görgei, Hadik, Aggházy, Hősök termek (a Vásártérről elérhetőek)
- Büfé: Panoráma szekció
- Hoszteszek és táblák segítik a tájékozódást

### Nyelv és fordítás:
Két külföldi előadó (Lisa Kleinman, Caio Moretti) angolul tart előadást. Magyar fordítást biztosítanak mesterséges intelligencia segítségével. Szükséges: saját telefon és fülhallgató.

### Dress Code: Business Casual
Férfiaknak: Ing (nyakkendő nélkül), galléros póló, vagy elegáns pulóver + szövetnadrág vagy sötétebb farmer + sportzakó vagy blézer (opcionális) + bőrcipő, loafer vagy elegáns sneaker.
Nőknek: Blúz, ing, pulóver vagy top + szövetnadrág, palazzo nadrág, szoknya vagy farmer + egyberuha (ruha) is megfelelő + blézer, kardigán (opcionális) + lapos cipő, mérsékelt sarkú cipő, bokacsizma vagy elegáns sneaker.
A legfontosabb a kényelem és a professzionális megjelenés.

## 4. PROGRAM ÉS ELŐADÁSOK

### Délelőtti szekció (Görgei terem):

09:05-09:25 | Lisa Kleinman (Make.com):
"Ügynökök köztünk – Megbízható no-code munkafolyamatok tervezése"
Hogyan tervezzünk megbízható és emberközpontú MI-ügynököket programozói tudás nélkül, hogy az ügyfeleket is ki merjük szolgálni, miközben a kontroll a mi kezünkben marad.

09:27-09:47 | Caio Moretti (QConcursos):
"Vibe-coding a való világban"
A "vibe-coding" módszer, amellyel cége 48 óra alatt 3 millió dollár bevételt ért el. Hogyan gyorsítható fel drámaian a termékfejlesztés AI-jal.

09:49-10:09 | Németh Gábor (Amazing AI):
"AI Fluency (MI-jártasság): a promptoláson túl"
Az AI Fluency gondolkodásmód, amivel az MI nemcsak eszköz, hanem valódi partner lesz a munkában.

10:11-10:31 | Balogh Csaba (HVG):
"AI Helyzetkép: Hogyan gondolkodj 3 lépéssel a piac előtt?"
Az idei év legfontosabb MI-fejleményei és 2026-os trendek előrejelzése.

10:31-10:51 | Kerekasztal-beszélgetés:
"AI és vállalkozás: lehetőségek, realitás és kihívások"
Moderátor: Koltai Balázs. Résztvevők: Laczkó Gábor, Deliága Ákos, Balogh Csaba.

10:51-11:11 | W. Szabó Péter (Tengr.ai):
"Az AI nem veszi el a munkát? De igen! Eljött az autonóm ügynökök kora"
Provokatív előadás arról, hogyan változtatják meg az autonóm MI-ügynökök a munka világát.

11:45-12:15 | Szauder Dávid (Médiaművész):
"AI-művészet: Mit jelent mesterséges intelligenciával alkotni?"
Bepillantás a kulisszák mögé: saját trénelt MI-modellek, stílusreferenciák, szerzői jog.

### Délutáni workshopok (13:15-től, párhuzamosan):

1. Németh Gábor: "Én és az AI-csapatom" (Solo Magic)
2. Drobny-Burján Andrea: "Kódolt kreativitás" (Solo Magic, Team Magic)
3. Lukács Bence: "AI-automatizációs megoldások no-code eszközökkel" (Team Magic)
4. Tóth-Czere Péter: "Human 2.0 – Fenntartható hatékonyság" (Solo Magic, Team Magic)
5. Pásti Edina: "Látványos vizuális anyagok AI segítségével" (Solo Magic)
6. Csonka Zsolt: "Copywriter 2.0: AI-karmester a tartalomgyártásban" (Solo Magic)
7. Laczkó Gábor & Tiszavölgyi Péter: "AI stratégia 5 lépésben" (Enterprise Magic, Team Magic)
8. Sabján László & Kertvéllesy András: "Voice AI – ügyfélszolgálati alkalmazás" (Enterprise Magic, Team Magic)

## 5. CÉLCSOPORTOK

SOLO MAGIC: Egyéni vállalkozók, szabadúszók
Fókusz: Produktivitás, tartalomgyártás MI-jal, énmárkaépítés

TEAM MAGIC: Kis- és mikrovállalkozások
Fókusz: MI-ügynökök építése, sales & ügyfélszolgálat optimalizálása, projektmenedzsment

ENTERPRISE MAGIC: Közép- és nagyvállalatok
Fókusz: MI bevezetés lépésről lépésre, adatbiztonság, compliance, szervezeti kultúra

## 6. ELŐADÓK RÉSZLETES PROFILJAI

Lisa Kleinman (Make.com): Head of Product Design. Doktori fokozat ember-számítógép interakcióból. Szilícium-völgyi tapasztalat (Intel, Nokia). Szakértője az AI-ügynökök és no-code munkafolyamatok tervezésének.

Caio Moretti (grupoQ): CEO, QConcursos platformon 35+ millió regisztrált felhasználó. 15 éves tapasztalat adatvezérelt oktatási termékekben. São Paulo-i Egyetem "AI for Executives" oktatója.

Németh Gábor (Amazing AI): Társalapító, vezérigazgató. 15+ éves nemzetközi nagyvállalati tapasztalat. AI tanácsadó, képzések vezetője, automatizációs projektek irányítója.

Balogh Csaba (HVG): Tech+Tudomány rovatvezető. Szegedi Tudományegyetem oktatója. Folyamatosan követi a globális AI fejlesztéseket.

W. Szabó Péter (Tengr.ai): Alapító, AI-kutató. 15+ éves UX/UI tapasztalat. "User Experience Mapping" könyv szerzője. Self-Directed AI kutatása.

Koltai Balázs: Digitális transzformációs vezető. 25+ éves tapasztalat. Dolgozott USA-ban és Kínában. Ügyfelek: Accenture, American Express, SPAR.

Laczkó Gábor (Stylers Group): Managing Partner. 20+ éves tapasztalat digitális technológiákban. Számos közép- és nagyvállalat AI-stratégiájának kidolgozója.

Deliága Ákos (Talk-a-bot): Co-Founder & CEO. 100 000+ nem irodai dolgozót köt össze munkáltatójukkal AI-alapú megoldásokkal. IVSZ elnökségi tag.

Szauder Dávid: Médiaművész, MOME oktató. 800 000+ Instagram követő. Munkái: Light Art Museum, Fotonica Festival, Magyar Zene Háza. Jean-Michel Jarre turnéján is dolgozott.

Drobny-Burján Andrea (Béres): Innovációs vezető. 20+ éves tapasztalat termékötletek generálásában. Saját B.I.R.D.S. módszertan fejlesztője.

Lukács Bence (Supercharge): Digitális termékcsapat vezető. 10+ éves tapasztalat termék- és UX-tervezésben. Pszichológus végzettség.

Tóth-Czere Péter (NEXT Academy): "Hatékony Leszek" podcast műsorvezető. Digitális marketing stratéga. Fenntartható hatékonyság mentor.

Pásti Edina (Just Bee Digital): 10+ éves nagyvállalati tapasztalat. B2B és ipari weboldalak specialistája. Tartalmai megjelennek a Perplexity és ChatGPT ajánlásaiban.

Csonka Zsolt (Amazing AI): Vezető szövegíró. 15+ éves tapasztalat marketingszövegírásban. Újságírói múlt. Több ezer fős konferenciák szövegírója.

Tiszavölgyi Péter (Stylers Group): Managing Partner, technológiai vezető. 15 év USA-beli tapasztalat. San Diego Tech Hub alapító tag.

Sabján László (AI Squad): CEO. Technológiai vállalkozó. "Robot mint szolgáltatás" (RaaS) úttörő.

Kertvéllesy András (AI Squad): Project Lead. Minner.hu AI rovata vezetője. Korábban Európai Központi Bank Service Desk tapasztalat.

## 7. SZERVEZŐK ÉS PARTNEREK

Főszervezők: Amazing AI és HVG (AMAI-HVG koprodukció)

Kiemelt partnerek:
- Make.com: No-code automatizációs platform
- QConcursos (grupoQ): Edtech vállalat
- Tengr.ai: MI-alapú képgeneráló platform
- AI Squad: Hangalapú MI ügyfélszolgálat
- Stylers Group: Digitális transzformáció
- Talk-a-bot: AI kommunikációs megoldások

Média partner: HVG

Kóstoltató partnerek: Szaffi, Samurai Shoelace, Tejmadár

## 8. KAPCSOLÓDÓ LINKEK

- Hivatalos weboldal és jegyvásárlás: https://aitalks.hu/
- Webinar: https://aitalks.hu/uzleti-attores-webinar
- Shownotes: https://aitalks.hu/ai-talks-shownotes

## 9. TOVÁBBI INFORMÁCIÓK

Amazing AI Tudástár: A PRÉMIUM jegy 14 napos, a VIP jegy 30 napos ingyenes hozzáférést biztosít.

Karen Hao könyvbemutató: November 10-én, PRÉMIUM és VIP jeggyel részt lehet venni.

Exkluzív interjúk: Előadók interjúi elérhetők a HVG.hu AI Talks BrandChannel-en és az AMAI podcastban.

Shownotes: VIP jegyben benne, külön is megvásárolható.

HVG Klubkártya: VIP jeggyel 2026-ra teljes éves hozzáférés.

Videófelvételek: PRÉMIUM és VIP jeggyel az előadásokról és workshopokról.

A rendezvény filozófiája: Az "AI Fluency" és a Társintelligencia (Ethan Mollick) koncepciókra épül – az AI mint partner, nem mint eszköz.`
  }), []);

  const onSeed = async () => {
    if (!token) {
      toast({ title: "Hiányzó token", description: "Add meg az admin tokent a feltöltéshez." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        "https://jugxnvkjyzgepkzzqjwl.functions.supabase.co/kb-upsert",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": token,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Hiba történt (${res.status})`);
      }

      toast({
        title: "Sikeres feltöltés",
        description: `Elem ID: ${data.item_id} • Létrehozott szeletek: ${data.chunks_created}`,
      });
      setOpen(false);
      setToken("");
    } catch (err: any) {
      toast({ title: "Sikertelen feltöltés", description: String(err?.message || err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger button for manual access (only visible with showTrigger) */}
      {showTrigger && !open && (
        <div className="fixed top-4 right-4 z-50">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => setOpen(true)}
            className="bg-primary/10 text-primary hover:bg-primary/20"
          >
            📝 KB Seed
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tudásbázis feltöltése</DialogTitle>
            <DialogDescription>
              Add meg az admin tokent és indítsd a feltöltést. A token nem kerül mentésre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm">x-admin-token</label>
            <Input
              type="password"
              placeholder="ADMIN_TOKEN"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={loading}>
              Mégse
            </Button>
            <Button onClick={onSeed} disabled={loading}>
              {loading ? "Feltöltés..." : "Feltöltés"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};