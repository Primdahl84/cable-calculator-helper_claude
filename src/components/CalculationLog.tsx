import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, FileText, Copy, ClipboardCopy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { LogEntry, CalculationStep } from "./CableCalculator";

interface CalculationLogProps {
  logs: LogEntry[];
  onClear: () => void;
}

const categoryLabels = {
  overbelastning: 'Overbelastningsbeskyttelse',
  kortslutning: 'Kortslutningsbeskyttelse',
  spændingsfald: 'Spændingsfald',
  effektberegning: 'Effektberegning'
};

const categoryColors = {
  overbelastning: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  kortslutning: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  spændingsfald: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  effektberegning: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20'
};

// Convert text to TI-Nspire CX compatible format
const convertToTINspire = (text: string): string => {
  return text
    // Mathematical operators
    .replace(/×/g, "*")
    .replace(/·/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")

    // Powers and roots
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/√3/g, "√(3)")
    .replace(/√\((\d+)\)/g, "√($1)")
    .replace(/√([^\s\(])/g, "√($1)")
    .replace(/√/g, "√")  // Keep √ symbol as TI-Nspire supports it

    // Greek letters (TI-Nspire supports these)
    .replace(/φ/g, "φ")
    .replace(/Δ/g, "Δ")
    .replace(/π/g, "π")

    // Special formatting
    .replace(/\s*∠\s*/g, "∠")  // Angle symbol
    .replace(/\s*≤\s*/g, " ≤ ")
    .replace(/\s*≥\s*/g, " ≥ ")
    .replace(/\s*=\s*/g, " = ")

    // Clean up multiple spaces
    .replace(/\s+/g, " ")
    .trim();
};

const CalculationStepDisplay = ({ step }: { step: CalculationStep }) => {
  const categoryColor = categoryColors[step.category] || "bg-secondary";
  const categoryName = categoryLabels[step.category] || step.category;

  const copyToClipboard = async (text: string) => {
    const tiFormat = convertToTINspire(text);
    try {
      await navigator.clipboard.writeText(tiFormat);
      toast.success("Kopieret til clipboard (TI-Nspire format)");
    } catch (error) {
      toast.error("Kunne ikke kopiere til clipboard");
    }
  };

  return (
    <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className={`${categoryColor} text-xs font-medium`}>
          {categoryName}
        </Badge>
        {step.formula && (
          <span className="font-semibold text-sm text-foreground">{step.formula}</span>
        )}
      </div>

      {step.variables && (
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium text-muted-foreground">Beregninger:</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(step.variables)}
              className="h-6 px-2 text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              Kopier
            </Button>
          </div>
          <div className="font-mono text-xs bg-background/50 p-3 rounded border border-border/30 whitespace-pre-wrap leading-relaxed">
            {step.variables}
          </div>
        </div>
      )}

      {step.calculation && (
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium text-muted-foreground">Beregning:</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(step.calculation)}
              className="h-6 px-2 text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              Kopier
            </Button>
          </div>
          <div className="font-mono text-xs bg-background/50 p-3 rounded border border-border/30 whitespace-pre-wrap leading-relaxed">
            {step.calculation}
          </div>
        </div>
      )}

      {step.result && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground mb-1">Resultat:</div>
          <div className="font-mono text-sm bg-primary/10 text-primary p-2 rounded border border-primary/20 font-semibold whitespace-pre-wrap">
            {step.result}
          </div>
        </div>
      )}
    </div>
  );
};

export function CalculationLog({ logs, onClear }: CalculationLogProps) {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Copy all calculations for a log entry to clipboard
  const copyAllCalculations = async (log: LogEntry) => {
    const sections: string[] = [];

    sections.push(`=== ${log.title} ===`);
    sections.push(`Tidspunkt: ${log.timestamp.toLocaleTimeString()} - ${log.timestamp.toLocaleDateString()}`);
    sections.push("");

    log.steps.forEach((step, idx) => {
      sections.push(`--- ${categoryLabels[step.category] || step.category} ---`);

      if (step.formula) {
        sections.push(`Formel: ${step.formula}`);
      }

      if (step.variables) {
        sections.push("");
        sections.push("Værdier:");
        sections.push(convertToTINspire(step.variables));
      }

      if (step.calculation) {
        sections.push("");
        sections.push("Beregning:");
        sections.push(convertToTINspire(step.calculation));
      }

      if (step.result) {
        sections.push("");
        sections.push("Resultat:");
        sections.push(convertToTINspire(step.result));
      }

      sections.push("");
      sections.push("");
    });

    const fullText = sections.join("\n");

    try {
      await navigator.clipboard.writeText(fullText);
      toast.success("Alle mellemregninger kopieret (TI-Nspire format)");
    } catch (error) {
      toast.error("Kunne ikke kopiere til clipboard");
    }
  };

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Beregningsresultater</CardTitle>
          <CardDescription>
            Detaljerede mellemregninger og resultater vises her
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Ingen beregninger endnu. Kør en beregning for at se resultater.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const mainboardLogs = logs.filter(log => log.type === 'service' && log.title.includes('Hovedtavle'));
  const serviceLogs = logs.filter(log => log.type === 'service' && !log.title.includes('Hovedtavle'));
  const groupLogs = logs.filter(log => log.type === 'group');

  // Determine the active log based on what's selected, or use the first log from the current tab
  const activeLogId = selectedLogId || serviceLogs[0]?.id || groupLogs[0]?.id || mainboardLogs[0]?.id || logs[0]?.id;
  const activeLog = logs.find(log => log.id === activeLogId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Detaljerede mellemregninger</h2>
        <Button variant="outline" size="sm" onClick={onClear}>
          <Trash2 className="h-4 w-4 mr-2" />
          Ryd alt
        </Button>
      </div>

      <Tabs defaultValue="mainboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mainboard">Hovedtavle</TabsTrigger>
          <TabsTrigger value="service">Stikledning</TabsTrigger>
          <TabsTrigger value="groups">Grupper</TabsTrigger>
        </TabsList>

        <TabsContent value="mainboard" className="space-y-4 mt-4">
          {mainboardLogs.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  Ingen hovedtavleberegninger endnu
                </p>
              </CardContent>
            </Card>
          ) : (
            mainboardLogs.map((log) => (
              <Card key={log.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{log.title}</CardTitle>
                      <CardDescription>
                        {log.timestamp.toLocaleTimeString()} - {log.timestamp.toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Button
                      variant="default"
                      size="default"
                      onClick={() => copyAllCalculations(log)}
                      className="bg-primary hover:bg-primary/90 font-semibold shadow-md"
                    >
                      <ClipboardCopy className="h-5 w-5 mr-2" />
                      Kopier alle til TI-Nspire
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] w-full">
                    <div className="space-y-6 pr-4">
                      {log.steps.map((step, stepIdx) => (
                        <CalculationStepDisplay key={stepIdx} step={step} />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="service" className="space-y-4 mt-4">
          {serviceLogs.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  Ingen stikledningsberegninger endnu
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg border">
                {serviceLogs.map((log) => (
                  <Button
                    key={log.id}
                    variant={activeLogId === log.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedLogId(log.id);
                    }}
                    className="transition-all"
                  >
                    {log.title}
                  </Button>
                ))}
              </div>

              {activeLog && activeLog.type === 'service' ? (
                <Card key={activeLog.id} className="animate-in fade-in-50 duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{activeLog.title}</CardTitle>
                        <CardDescription>
                          {activeLog.timestamp.toLocaleTimeString()} - {activeLog.timestamp.toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Button
                        variant="default"
                        size="default"
                        onClick={() => copyAllCalculations(activeLog)}
                        className="bg-primary hover:bg-primary/90 font-semibold shadow-md"
                      >
                        <ClipboardCopy className="h-5 w-5 mr-2" />
                        Kopier alle til TI-Nspire
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px] w-full">
                      <div className="space-y-6 pr-4">
                        {activeLog.steps.map((step, stepIdx) => (
                          <CalculationStepDisplay key={stepIdx} step={step} />
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <p className="text-center text-muted-foreground">
                      Vælg en stikledning for at se beregninger
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-4 mt-4">
          {groupLogs.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  Ingen gruppeberegninger endnu
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Organize groups by service cable, then by apartment */}
              {(() => {
                // Parse logs with new format: "serviceCable||apartment||Gruppe name"
                // Fallback to old format: "apartment - Gruppe name"
                const groupedByServiceCable = groupLogs.reduce((acc, log) => {
                  let serviceCable = "Individuelle stikledninger";
                  let apartmentName = "Andre";

                  if (log.title.includes("||")) {
                    const parts = log.title.split("||");
                    serviceCable = parts[0];
                    apartmentName = parts[1];
                  } else {
                    // Fallback to old format
                    const apartmentMatch = log.title.match(/^(.*?)\s*-\s*Gruppe/);
                    if (apartmentMatch) {
                      apartmentName = apartmentMatch[1];
                    }
                  }

                  if (!acc[serviceCable]) {
                    acc[serviceCable] = {};
                  }
                  if (!acc[serviceCable][apartmentName]) {
                    acc[serviceCable][apartmentName] = [];
                  }
                  acc[serviceCable][apartmentName].push(log);
                  return acc;
                }, {} as Record<string, Record<string, typeof groupLogs>>);

                const serviceCableOrder = [
                  "Fælles stikledning A",
                  "Fælles stikledning B",
                  "Fælles stikledning C",
                  "Individuelle stikledninger"
                ];
                const sortedServiceCables = Object.keys(groupedByServiceCable).sort((a, b) => {
                  const aIndex = serviceCableOrder.indexOf(a);
                  const bIndex = serviceCableOrder.indexOf(b);
                  if (aIndex === -1) return 1;
                  if (bIndex === -1) return -1;
                  return aIndex - bIndex;
                });

                return (
                  <Tabs defaultValue={sortedServiceCables[0]} className="w-full">
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(sortedServiceCables.length, 4)}, 1fr)` }}>
                      {sortedServiceCables.map((serviceCable) => (
                        <TabsTrigger
                          key={serviceCable}
                          value={serviceCable}
                          className="text-sm"
                        >
                          {serviceCable}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {sortedServiceCables.map((serviceCable) => (
                      <TabsContent key={serviceCable} value={serviceCable} className="space-y-4 mt-4">
                        <Tabs defaultValue={Object.keys(groupedByServiceCable[serviceCable])[0]} className="w-full">
                          <TabsList className="grid w-full gap-2 mb-4 h-auto" style={{ gridTemplateColumns: `repeat(${Math.min(Object.keys(groupedByServiceCable[serviceCable]).length, 4)}, 1fr)` }}>
                            {Object.keys(groupedByServiceCable[serviceCable]).map((apartmentName) => (
                              <TabsTrigger
                                key={apartmentName}
                                value={apartmentName}
                                className="text-sm"
                              >
                                {apartmentName}
                              </TabsTrigger>
                            ))}
                          </TabsList>

                          {Object.entries(groupedByServiceCable[serviceCable]).map(([apartmentName, apartmentLogs]) => (
                            <TabsContent key={apartmentName} value={apartmentName} className="space-y-4 mt-4">
                              <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg border">
                                {apartmentLogs.map((log) => (
                                  <Button
                                    key={log.id}
                                    variant={activeLogId === log.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      setSelectedLogId(log.id);
                                    }}
                                    className="transition-all text-xs"
                                  >
                                    {log.title.includes("||") ? log.title.split("||")[2] : (log.title.split(" - Gruppe ")[1] ? `Gruppe ${log.title.split(" - Gruppe ")[1]}` : log.title)}
                                  </Button>
                                ))}
                              </div>

                              {activeLog && activeLog.type === 'group' && apartmentLogs.find(l => l.id === activeLogId) ? (
                                <Card key={activeLog.id} className="animate-in fade-in-50 duration-300">
                                  <CardHeader>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <CardTitle className="text-lg">
                                          {activeLog.title.includes("||") ? activeLog.title.split("||")[2] : activeLog.title}
                                        </CardTitle>
                                        <CardDescription>
                                          {activeLog.timestamp.toLocaleTimeString()} - {activeLog.timestamp.toLocaleDateString()}
                                        </CardDescription>
                                      </div>
                                      <Button
                                        variant="default"
                                        size="default"
                                        onClick={() => copyAllCalculations(activeLog)}
                                        className="bg-primary hover:bg-primary/90 font-semibold shadow-md"
                                      >
                                        <ClipboardCopy className="h-5 w-5 mr-2" />
                                        Kopier alle til TI-Nspire
                                      </Button>
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    <ScrollArea className="h-[600px] w-full">
                                      <div className="space-y-6 pr-4">
                                        {activeLog.steps.map((step, stepIdx) => (
                                          <CalculationStepDisplay key={stepIdx} step={step} />
                                        ))}
                                      </div>
                                    </ScrollArea>
                                  </CardContent>
                                </Card>
                              ) : (
                                <Card>
                                  <CardContent className="py-12">
                                    <p className="text-center text-muted-foreground">
                                      Vælg en gruppe for at se beregninger
                                    </p>
                                  </CardContent>
                                </Card>
                              )}
                            </TabsContent>
                          ))}
                        </Tabs>
                      </TabsContent>
                    ))}
                  </Tabs>
                );
              })()}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
