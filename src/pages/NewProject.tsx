import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Home, Building2, Store, Factory } from "lucide-react";
import type { ProjectType, Project } from "@/types/project";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

const PROJECT_TYPES: { value: ProjectType; label: string; icon: typeof Home; description: string }[] = [
  {
    value: "hus",
    label: "Enfamiliehus",
    icon: Home,
    description: "Villa, rækkehus, parcelhus",
  },
  {
    value: "lejlighed",
    label: "Lejlighedskompleks",
    icon: Building2,
    description: "Kun boliger",
  },
  {
    value: "blandet",
    label: "Blandet bolig/erhverv",
    icon: Store,
    description: "Lejligheder + butikker/restauranter",
  },
  {
    value: "erhverv",
    label: "Erhverv",
    icon: Factory,
    description: "Fabrikker, kontorer, industribyggeri",
  },
];

const NewProject = () => {
  const navigate = useNavigate();
  const { addProject } = useProject();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);
  
  const [selectedType, setSelectedType] = useState<ProjectType | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCvr, setCustomerCvr] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [sameAsCustomer, setSameAsCustomer] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedType) {
      toast.error("Vælg en projekttype");
      return;
    }

    if (!customerName || !customerAddress) {
      toast.error("Udfyld kundenavn og adresse");
      return;
    }

    const newProject: Project = {
      id: `project-${Date.now()}`,
      type: selectedType,
      customer: {
        name: customerName,
        address: customerAddress,
        phone: customerPhone || undefined,
        email: customerEmail || undefined,
        cvr: customerCvr || undefined,
      },
      projectAddress: sameAsCustomer ? undefined : projectAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addProject(newProject);
    toast.success("Projekt oprettet");
    navigate("/calculations");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nyt projekt</h1>
            <p className="text-muted-foreground mt-1">
              Vælg projekttype og indtast kundeoplysninger
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Projekttype valg */}
          <Card>
            <CardHeader>
              <CardTitle>1. Vælg projekttype</CardTitle>
              <CardDescription>
                Vælg den type installation du skal beregne
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {PROJECT_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSelectedType(type.value)}
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                        selectedType === type.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        selectedType === type.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{type.label}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Kundeoplysninger */}
          <Card>
            <CardHeader>
              <CardTitle>2. Kundeoplysninger</CardTitle>
              <CardDescription>
                Indtast information om kunden
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Kundenavn *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Navn på kunde"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Telefon</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+45 12 34 56 78"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="kunde@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerAddress">Kundeadresse *</Label>
                <Textarea
                  id="customerAddress"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Vejnavn 123&#10;1234 By"
                  rows={2}
                  required
                />
              </div>

              {(selectedType === "blandet" || selectedType === "erhverv") && (
                <div className="space-y-2">
                  <Label htmlFor="customerCvr">CVR-nummer</Label>
                  <Input
                    id="customerCvr"
                    value={customerCvr}
                    onChange={(e) => setCustomerCvr(e.target.value)}
                    placeholder="12345678"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projektadresse */}
          <Card>
            <CardHeader>
              <CardTitle>3. Projektadresse</CardTitle>
              <CardDescription>
                Hvor skal installationen udføres?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sameAsCustomer"
                  checked={sameAsCustomer}
                  onCheckedChange={(checked) => setSameAsCustomer(checked === true)}
                />
                <Label
                  htmlFor="sameAsCustomer"
                  className="text-sm font-normal cursor-pointer"
                >
                  Samme som kundeadresse
                </Label>
              </div>

              {!sameAsCustomer && (
                <div className="space-y-2">
                  <Label htmlFor="projectAddress">Projektadresse</Label>
                  <Textarea
                    id="projectAddress"
                    value={projectAddress}
                    onChange={(e) => setProjectAddress(e.target.value)}
                    placeholder="Vejnavn 456&#10;5678 By"
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/")}>
              Annuller
            </Button>
            <Button type="submit" disabled={!selectedType}>
              Opret projekt og start beregning
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProject;
