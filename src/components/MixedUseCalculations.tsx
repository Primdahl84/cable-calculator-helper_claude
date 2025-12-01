import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  calculateCableForMixedUse,
  type MixedUseCalculationInput,
} from "@/lib/cableCalculations";

interface CalculationStep {
  title: string;
  type: "overbelastning" | "kortslutning";
  content: string;
  result: string;
}

interface Circuit {
  id: string;
  name: string;
  current: string;
  length: string;
  temp: string;
  installationType: string;
  cableType: string;
  kFactor: string;
  rFactor: string;
  result?: string;
}

interface Group {
  id: string;
  name: string;
  current: string;
  length: string;
  temp: string;
  installationType: string;
  cableType: string;
  kFactor: string;
  rFactor: string;
  result?: string;
}

export default function MixedUse() {
  const { toast } = useToast();
  const [calculationSteps, setCalculationSteps] = useState<CalculationStep[]>([]);
  
  // Main supply calculation
  const [mainSupply, setMainSupply] = useState({
    ref: "Hovedtavle",
    current: "",
    length: "",
    temp: "",
    installationType: "luft",
    cableType: "",
    kFactor: "",
    rFactor: "",
  });
  const [mainResult, setMainResult] = useState<string>("");

  // Circuit calculations
  const [circuits, setCircuits] = useState<Circuit[]>([
    {
      id: "1",
      name: "Stikledning 1",
      current: "",
      length: "",
      temp: "",
      installationType: "luft",
      cableType: "",
      kFactor: "",
      rFactor: "",
    },
  ]);

  // Group calculations
  const [groups, setGroups] = useState<Group[]>([
    {
      id: "1",
      name: "Gruppe 1",
      current: "",
      length: "",
      temp: "",
      installationType: "luft",
      cableType: "",
      kFactor: "",
      rFactor: "",
    },
  ]);

  const addCircuit = () => {
    const newId = (circuits.length + 1).toString();
    setCircuits([
      ...circuits,
      {
        id: newId,
        name: `Stikledning ${newId}`,
        current: "",
        length: "",
        temp: "",
        installationType: "luft",
        cableType: "",
        kFactor: "",
        rFactor: "",
      },
    ]);
  };

  const removeCircuit = (id: string) => {
    setCircuits(circuits.filter((c) => c.id !== id));
  };

  const addGroup = () => {
    const newId = (groups.length + 1).toString();
    setGroups([
      ...groups,
      {
        id: newId,
        name: `Gruppe ${newId}`,
        current: "",
        length: "",
        temp: "",
        installationType: "luft",
        cableType: "",
        kFactor: "",
        rFactor: "",
      },
    ]);
  };

  const removeGroup = (id: string) => {
    setGroups(groups.filter((g) => g.id !== id));
  };

  const calculateMainSupply = () => {
    if (!mainSupply.current || !mainSupply.length) {
      toast({
        title: "Manglende data",
        description: "Udfyld venligst alle påkrævede felter for hovedtavle",
        variant: "destructive",
      });
      return;
    }

    const input: MixedUseCalculationInput = {
      ref: mainSupply.ref,
      current: parseFloat(mainSupply.current),
      length: parseFloat(mainSupply.length),
      temp: mainSupply.temp ? parseFloat(mainSupply.temp) : undefined,
      installationType: mainSupply.installationType as "luft" | "jord",
      cableType: mainSupply.cableType || undefined,
      kFactor: mainSupply.kFactor ? parseFloat(mainSupply.kFactor) : undefined,
      rFactor: mainSupply.rFactor ? parseFloat(mainSupply.rFactor) : undefined,
    };

    const result = calculateCableForMixedUse(input);
    setMainResult(result.recommendation);

    // Add calculation steps
    const newSteps: CalculationStep[] = [];
    
    // Overbelastning step
    newSteps.push({
      title: `Hovedtavle – beregning`,
      type: "overbelastning",
      content: result.overloadSteps || "",
      result: result.overloadResult || "",
    });

    // Kortslutning step
    newSteps.push({
      title: `Hovedtavle – beregning`,
      type: "kortslutning",
      content: result.shortCircuitSteps || "",
      result: result.shortCircuitResult || "",
    });

    setCalculationSteps(prev => [...prev.filter(s => !s.title.includes("Hovedtavle")), ...newSteps]);

    toast({
      title: "Beregning gennemført",
      description: "Hovedtavle beregning er klar",
    });
  };

  const calculateCircuit = (circuit: Circuit) => {
    if (!circuit.current || !circuit.length) {
      toast({
        title: "Manglende data",
        description: `Udfyld venligst alle påkrævede felter for ${circuit.name}`,
        variant: "destructive",
      });
      return;
    }

    const input: MixedUseCalculationInput = {
      ref: circuit.name,
      current: parseFloat(circuit.current),
      length: parseFloat(circuit.length),
      temp: circuit.temp ? parseFloat(circuit.temp) : undefined,
      installationType: circuit.installationType as "luft" | "jord",
      cableType: circuit.cableType || undefined,
      kFactor: circuit.kFactor ? parseFloat(circuit.kFactor) : undefined,
      rFactor: circuit.rFactor ? parseFloat(circuit.rFactor) : undefined,
    };

    const result = calculateCableForMixedUse(input);

    // Update circuit result
    setCircuits(
      circuits.map((c) =>
        c.id === circuit.id ? { ...c, result: result.recommendation } : c
      )
    );

    // Add calculation steps
    const newSteps: CalculationStep[] = [];
    
    // Overbelastning step
    newSteps.push({
      title: `${circuit.name} – beregning`,
      type: "overbelastning",
      content: result.overloadSteps || "",
      result: result.overloadResult || "",
    });

    // Kortslutning step
    newSteps.push({
      title: `${circuit.name} – beregning`,
      type: "kortslutning",
      content: result.shortCircuitSteps || "",
      result: result.shortCircuitResult || "",
    });

    setCalculationSteps(prev => [...prev.filter(s => !s.title.includes(circuit.name)), ...newSteps]);

    toast({
      title: "Beregning gennemført",
      description: `${circuit.name} beregning er klar`,
    });
  };

  const calculateGroup = (group: Group) => {
    if (!group.current || !group.length) {
      toast({
        title: "Manglende data",
        description: `Udfyld venligst alle påkrævede felter for ${group.name}`,
        variant: "destructive",
      });
      return;
    }

    const input: MixedUseCalculationInput = {
      ref: group.name,
      current: parseFloat(group.current),
      length: parseFloat(group.length),
      temp: group.temp ? parseFloat(group.temp) : undefined,
      installationType: group.installationType as "luft" | "jord",
      cableType: group.cableType || undefined,
      kFactor: group.kFactor ? parseFloat(group.kFactor) : undefined,
      rFactor: group.rFactor ? parseFloat(group.rFactor) : undefined,
    };

    const result = calculateCableForMixedUse(input);

    // Update group result
    setGroups(
      groups.map((g) =>
        g.id === group.id ? { ...g, result: result.recommendation } : g
      )
    );

    // Add calculation steps
    const newSteps: CalculationStep[] = [];
    
    // Overbelastning step
    newSteps.push({
      title: `${group.name} – beregning`,
      type: "overbelastning",
      content: result.overloadSteps || "",
      result: result.overloadResult || "",
    });

    // Kortslutning step
    newSteps.push({
      title: `${group.name} – beregning`,
      type: "kortslutning",
      content: result.shortCircuitSteps || "",
      result: result.shortCircuitResult || "",
    });

    setCalculationSteps(prev => [...prev.filter(s => !s.title.includes(group.name)), ...newSteps]);

    toast({
      title: "Beregning gennemført",
      description: `${group.name} beregning er klar`,
    });
  };

  const clearAll = () => {
    setMainSupply({
      ref: "Hovedtavle",
      current: "",
      length: "",
      temp: "",
      installationType: "luft",
      cableType: "",
      kFactor: "",
      rFactor: "",
    });
    setMainResult("");
    setCircuits([
      {
        id: "1",
        name: "Stikledning 1",
        current: "",
        length: "",
        temp: "",
        installationType: "luft",
        cableType: "",
        kFactor: "",
        rFactor: "",
      },
    ]);
    setGroups([
      {
        id: "1",
        name: "Gruppe 1",
        current: "",
        length: "",
        temp: "",
        installationType: "luft",
        cableType: "",
        kFactor: "",
        rFactor: "",
      },
    ]);
    setCalculationSteps([]);
    toast({
      title: "Ryddet",
      description: "Alle beregninger er blevet nulstillet",
    });
  };

  const copyCalculationStep = (step: CalculationStep) => {
    const textToCopy = `${step.title}\n\n${step.type === "overbelastning" ? "Overbelastningsbeskyttelse" : "Kortslutningsbeskyttelse"}\n\nBeregninger:\n${step.content}\n\nResultat:\n${step.result}`;
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Kopieret",
      description: "Mellemregning er kopieret til udklipsholder",
    });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Blandet bolig/erhverv</h1>

      <Tabs defaultValue="hovedtavle" className="space-y-6">
        <TabsList>
          <TabsTrigger value="hovedtavle">Hovedtavle</TabsTrigger>
          <TabsTrigger value="stikledninger">Stikledninger</TabsTrigger>
          <TabsTrigger value="grupper">Grupper</TabsTrigger>
          <TabsTrigger value="mellemregninger">Mellemregninger</TabsTrigger>
          <TabsTrigger value="belastningsplan">Belastningsplan</TabsTrigger>
        </TabsList>

        <TabsContent value="hovedtavle">
          <Card>
            <CardHeader>
              <CardTitle>Hovedtavle beregning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="main-ref">Reference</Label>
                  <Input
                    id="main-ref"
                    value={mainSupply.ref}
                    onChange={(e) =>
                      setMainSupply({ ...mainSupply, ref: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="main-current">Strøm (A)</Label>
                  <Input
                    id="main-current"
                    type="number"
                    value={mainSupply.current}
                    onChange={(e) =>
                      setMainSupply({ ...mainSupply, current: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="main-length">Længde (m)</Label>
                  <Input
                    id="main-length"
                    type="number"
                    value={mainSupply.length}
                    onChange={(e) =>
                      setMainSupply({ ...mainSupply, length: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="main-temp">Temperatur (°C)</Label>
                  <Input
                    id="main-temp"
                    type="number"
                    value={mainSupply.temp}
                    onChange={(e) =>
                      setMainSupply({ ...mainSupply, temp: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button onClick={calculateMainSupply}>Beregn hovedtavle</Button>
              {mainResult && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-semibold">Resultat:</h3>
                  <p>{mainResult}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stikledninger">
          <div className="space-y-4">
            {circuits.map((circuit) => (
              <Card key={circuit.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{circuit.name}</CardTitle>
                    {circuits.length > 1 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeCircuit(circuit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Navn</Label>
                      <Input
                        value={circuit.name}
                        onChange={(e) =>
                          setCircuits(
                            circuits.map((c) =>
                              c.id === circuit.id
                                ? { ...c, name: e.target.value }
                                : c
                            )
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Strøm (A)</Label>
                      <Input
                        type="number"
                        value={circuit.current}
                        onChange={(e) =>
                          setCircuits(
                            circuits.map((c) =>
                              c.id === circuit.id
                                ? { ...c, current: e.target.value }
                                : c
                            )
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Længde (m)</Label>
                      <Input
                        type="number"
                        value={circuit.length}
                        onChange={(e) =>
                          setCircuits(
                            circuits.map((c) =>
                              c.id === circuit.id
                                ? { ...c, length: e.target.value }
                                : c
                            )
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Temperatur (°C)</Label>
                      <Input
                        type="number"
                        value={circuit.temp}
                        onChange={(e) =>
                          setCircuits(
                            circuits.map((c) =>
                              c.id === circuit.id
                                ? { ...c, temp: e.target.value }
                                : c
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                  <Button onClick={() => calculateCircuit(circuit)}>
                    Beregn {circuit.name}
                  </Button>
                  {circuit.result && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                      <h3 className="font-semibold">Resultat:</h3>
                      <p>{circuit.result}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            <Button onClick={addCircuit} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Tilføj stikledning
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="grupper">
          <div className="space-y-4">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{group.name}</CardTitle>
                    {groups.length > 1 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeGroup(group.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Navn</Label>
                      <Input
                        value={group.name}
                        onChange={(e) =>
                          setGroups(
                            groups.map((g) =>
                              g.id === group.id
                                ? { ...g, name: e.target.value }
                                : g
                            )
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Strøm (A)</Label>
                      <Input
                        type="number"
                        value={group.current}
                        onChange={(e) =>
                          setGroups(
                            groups.map((g) =>
                              g.id === group.id
                                ? { ...g, current: e.target.value }
                                : g
                            )
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Længde (m)</Label>
                      <Input
                        type="number"
                        value={group.length}
                        onChange={(e) =>
                          setGroups(
                            groups.map((g) =>
                              g.id === group.id
                                ? { ...g, length: e.target.value }
                                : g
                            )
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Temperatur (°C)</Label>
                      <Input
                        type="number"
                        value={group.temp}
                        onChange={(e) =>
                          setGroups(
                            groups.map((g) =>
                              g.id === group.id
                                ? { ...g, temp: e.target.value }
                                : g
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                  <Button onClick={() => calculateGroup(group)}>
                    Beregn {group.name}
                  </Button>
                  {group.result && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                      <h3 className="font-semibold">Resultat:</h3>
                      <p>{group.result}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            <Button onClick={addGroup} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Tilføj gruppe
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="mellemregninger">
          <Card>
            <CardHeader>
              <CardTitle>Beregningsresultater</CardTitle>
              <p className="text-sm text-muted-foreground">
                Detaljerede mellemregninger og resultater vises her
              </p>
            </CardHeader>
            <CardContent>
              {calculationSteps.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Ingen beregninger endnu. Kør en beregning for at se resultater.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {calculationSteps.map((step, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{step.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {step.type === "overbelastning"
                                ? "Overbelastningsbeskyttelse"
                                : "Kortslutningsbeskyttelse"}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCalculationStep(step)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Beregninger:</h4>
                          <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm whitespace-pre-wrap">
                            {step.content}
                          </pre>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Resultat:</h4>
                          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                            <p className="text-blue-900 font-medium">{step.result}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="belastningsplan">
          <Card>
            <CardHeader>
              <CardTitle>Belastningsplan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Belastningsplan funktionalitet kommer snart...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Button variant="outline" onClick={clearAll}>
          Ryd alt
        </Button>
      </div>
    </div>
  );
}