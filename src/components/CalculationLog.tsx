import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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

const CalculationStepDisplay = ({ step }: { step: CalculationStep }) => {
  const categoryColor = categoryColors[step.category] || "bg-secondary";
  const categoryName = categoryLabels[step.category] || step.category;

  const copyToClipboard = (text: string) => {
    // Convert to TI-Nspire compatible format
    const tiFormat = text
      .replace(/√/g, "√(")
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/²/g, "^2")
      .replace(/³/g, "^3");
    
    navigator.clipboard.writeText(tiFormat);
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
              Kopier
            </Button>
          </div>
          <div className="font-mono text-xs bg-background/50 p-3 rounded border border-border/30 whitespace-pre-wrap leading-relaxed">
            {step.variables}
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

  const activeLogId = selectedLogId || logs[0]?.id;
  const activeLog = logs.find(log => log.id === activeLogId);
  const serviceLogs = logs.filter(log => log.type === 'service');
  const groupLogs = logs.filter(log => log.type === 'group');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Detaljerede mellemregninger</h2>
        <Button variant="outline" size="sm" onClick={onClear}>
          <Trash2 className="h-4 w-4 mr-2" />
          Ryd alt
        </Button>
      </div>

      <Tabs defaultValue="service" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="service">Stikledning</TabsTrigger>
          <TabsTrigger value="groups">Grupper</TabsTrigger>
        </TabsList>

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
            serviceLogs.map((log) => (
              <Card key={log.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{log.title}</CardTitle>
                  <CardDescription>
                    {log.timestamp.toLocaleTimeString()} - {log.timestamp.toLocaleDateString()}
                  </CardDescription>
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
              <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg border">
                {groupLogs.map((log) => (
                  <Button
                    key={log.id}
                    variant={activeLogId === log.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedLogId(log.id);
                      console.log("Switched to group:", log.title);
                    }}
                    className="transition-all"
                  >
                    {log.title}
                  </Button>
                ))}
              </div>

              {activeLog && activeLog.type === 'group' ? (
                <Card key={activeLog.id} className="animate-in fade-in-50 duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg">{activeLog.title}</CardTitle>
                    <CardDescription>
                      {activeLog.timestamp.toLocaleTimeString()} - {activeLog.timestamp.toLocaleDateString()}
                    </CardDescription>
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
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
