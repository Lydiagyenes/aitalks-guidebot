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
    title: "AI Talks 2024 – Jegyek és helyszíni tudnivalók (seed)",
    tags: [
      "hu","faq","jegyek","kedvezmenyek","early-bird","shownote","ertekesites",
      "csoportos-kedvezmeny","logisztika","parkolas","ruhatar","bufe","vendeglatas","balna"
    ],
    source_url: "internal:seed",
    metadata: { language: "hu", category: "faq", source: "manual-seed" },
    content:
      "Amazing AI tudástár hozzáférés: ha a jegy tartalmazza, akkor teljes hozzáférést ad a tudástár összes anyagához a jegytípustól függő időre (14 vagy 30 nap).\n\n" +
      "Jegyek és kedvezmények: Early bird kedvezmény 40% szeptember 30-ig. A jegyértékesítés már tart (szeptember 3. már elmúlt). Elérhető csoportos kedvezmény; részletekért írj e-mailt. Shownote bármely jegytípushoz kérhető 9 900 Ft + ÁFA áron.\n\n" +
      "Parkolás: a helyek függvényében lehetséges, a parkolóhelyek korlátozottak — érkezz időben vagy válassz alternatív közlekedést.\n\n" +
      "Ruhatár: a helyszínen lesz ruhatár.\n\n" +
      "Vendéglátás: a Bálnában fizetős büfé üzemel a rendezvény alatt. Finom kávékülönlegességeket és egészségtudatos finomságokat díjmentesen kínálnak a kóstoltató partnerek pultjainál."
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