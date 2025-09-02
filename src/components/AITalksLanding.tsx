import React from 'react';
import { Calendar, MapPin, Users, Sparkles, ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const AITalksLanding = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Sparkles className="w-6 h-6 text-primary mr-2" />
          <span className="font-bold text-lg">AI Talks 2024</span>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
            <Sparkles className="w-4 h-4 mr-2" />
            HVG × Amazing AI Közös Szervezésében
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight">
            AI Talks 2024
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
            Intelligens jövő építése együtt – A mesterséges intelligencia legújabb trendjei, 
            gyakorlati alkalmazások és üzleti lehetőségek egy helyen.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="bg-gradient-primary hover:shadow-glow transition-smooth text-lg px-8">
              Jegyvásárlás
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 border-primary/20 hover:bg-primary/5">
              Program Megtekintése
            </Button>
          </div>

          {/* Event Details */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card className="p-6 bg-card/50 border-primary/10 shadow-elegant">
              <Calendar className="h-8 w-8 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Időpont</h3>
              <p className="text-muted-foreground">2024. November 15.</p>
              <p className="text-muted-foreground">09:00 - 17:00</p>
            </Card>

            <Card className="p-6 bg-card/50 border-primary/10 shadow-elegant">
              <MapPin className="h-8 w-8 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Helyszín</h3>
              <p className="text-muted-foreground">Budapest</p>
              <p className="text-muted-foreground">Belvárosi Konferencia Központ</p>
            </Card>

            <Card className="p-6 bg-card/50 border-primary/10 shadow-elegant">
              <Users className="h-8 w-8 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Résztvevők</h3>
              <p className="text-muted-foreground">500+ szakember</p>
              <p className="text-muted-foreground">20+ előadó</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Topics */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Miről lesz szó?
          </h2>
          <p className="text-xl text-muted-foreground">
            A legaktuálisabb AI témák gyakorlati megközelítésben
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "AI a Marketingben",
              description: "Automatizáció és personalizáció",
              icon: "🎯"
            },
            {
              title: "Üzleti Automatizáció", 
              description: "Folyamatok optimalizálása AI-val",
              icon: "⚡"
            },
            {
              title: "AI Etika & Jog",
              description: "Felelős mesterséges intelligencia",
              icon: "⚖️"
            },
            {
              title: "Startup Ökoszisztéma",
              description: "AI-alapú vállalkozások",
              icon: "🚀"
            }
          ].map((topic, index) => (
            <Card key={index} className="p-6 text-center bg-card/30 border-primary/10 hover:shadow-elegant transition-smooth cursor-pointer group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-bounce">
                {topic.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{topic.title}</h3>
              <p className="text-muted-foreground text-sm">{topic.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16">
        <Card className="p-12 text-center bg-gradient-primary text-primary-foreground shadow-glow">
          <div className="flex justify-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ne maradj le!
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Limitált helyszám! Biztosítsd a helyed az év legfontosabb AI eseményén. 
            Korai foglalás esetén 25% kedvezmény!
          </p>
          <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 text-lg px-8">
            Jegyvásárlás most
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Card>
      </section>
    </div>
  );
};