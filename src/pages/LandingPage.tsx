import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, Zap, FileText, Building2, Home, Factory, CheckCircle2, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Home,
      title: "Enfamiliehuse",
      description: "Dimensionér kabler til enfamiliehuse med præcise beregninger efter DS 183 standarden",
    },
    {
      icon: Building2,
      title: "Lejlighedskomplekser",
      description: "Beregn stikledninger og gruppeledninger til større lejlighedsprojekter",
    },
    {
      icon: Factory,
      title: "Blandet bolig/erhverv",
      description: "Håndtér komplekse blandede projekter med både boliger og erhvervsenheder",
    },
    {
      icon: Building2,
      title: "Erhvervsbygninger",
      description: "Komplet dimensionering til fabrikker, kontorer og andre erhvervsejendomme",
    },
  ];

  const capabilities = [
    "DS 183 standardberegninger",
    "Automatisk kabelvalg baseret på strøm og spændingsfald",
    "Kortslutningsberegninger (Ik,min og Ik,max)",
    "Termisk kontrol af kabler",
    "Sikringsvalg med kurvetabeller",
    "Parallelle kabler med ulige strømfordeling",
    "Jordkabler med afstandskrav (D1/D2)",
    "Detaljerede mellemregninger og dokumentation",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center space-y-8">
          <Badge variant="secondary" className="text-sm px-4 py-1">
            Professionel kabelberegning efter DS 183
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Kabelberegninger gjort{" "}
            <span className="text-primary">enkle</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Beregn kabler til enfamiliehuse, lejlighedskomplekser og erhvervsbygninger med præcision og hastighed.
            Alt efter danske standarder.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
              Log ind
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8">
              Opret konto
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Dimensionér alle typer projekter
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Capabilities Section */}
      <div className="container mx-auto px-4 py-16 bg-muted/30">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Omfattende funktionalitet
            </h2>
            <p className="text-lg text-muted-foreground">
              Alt du behøver for professionelle elektriske installationsberegninger
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {capabilities.map((capability) => (
              <div key={capability} className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-lg">{capability}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Benefits */}
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Derfor skal du bruge Cable Calc Helper
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Calculator className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Præcise beregninger</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Alle beregninger følger DS 183 standarden nøjagtigt med komplette
                  mellemregninger til dokumentation.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Spar tid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Automatisk dimensionering af kabler og sikringer. Det der tidligere
                  tog timer, tager nu minutter.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Professionel dokumentation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Generer komplette beregningsrapporter med alle mellemregninger
                  klar til myndighedsgodkendelse.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <Card className="bg-primary text-primary-foreground border-0">
            <CardContent className="p-12 text-center space-y-6">
              <h2 className="text-3xl font-bold">
                Klar til at komme i gang?
              </h2>
              <p className="text-lg opacity-90 max-w-2xl mx-auto">
                Log ind for at administrere dine projekter og lave præcise kabelberegninger
                efter DS 183 standarden.
              </p>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/auth")}
                className="text-lg px-8"
              >
                Log ind nu
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 Cable Calc Helper - Professionel kabelberegning efter DS 183</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
