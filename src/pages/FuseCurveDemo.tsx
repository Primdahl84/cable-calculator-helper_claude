import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MultiFuseCurveChart } from "@/components/MultiFuseCurveChart";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAvailableFuseSizes } from "@/lib/fuseCurves";

export default function FuseCurveDemo() {
  const navigate = useNavigate();
  const [fuseType, setFuseType] = useState("Diazed D2/D3/D4");
  const [highlightCurrent, setHighlightCurrent] = useState<number | undefined>(300);
  const [selectedFuseSize, setSelectedFuseSize] = useState<number | undefined>(undefined);

  // Get available fuse sizes for the selected fuse type
  const availableFuseSizes = useMemo(() => {
    return getAvailableFuseSizes("Standard", fuseType);
  }, [fuseType]);

  const fuseTypes = [
    "Diazed gG",
    "Diazed D2/D3/D4",
    "Neozed gG",
    "Knivsikring NH00",
    "Knivsikring NH0",
    "Knivsikring NH1",
    "MCB B",
    "MCB C",
    "MCB D",
  ];

  // Reset selected fuse size when fuse type changes
  const handleFuseTypeChange = (newType: string) => {
    setFuseType(newType);
    setSelectedFuseSize(undefined);
  };


  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Sikringskurver</h1>
            <p className="text-muted-foreground">
              Tid-strøm karakteristik for forskellige sikringstyper
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid gap-4 md:grid-cols-3 bg-card p-6 rounded-lg border">
          <div className="space-y-2">
            <Label>Sikringstype</Label>
            <Select value={fuseType} onValueChange={handleFuseTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fuseTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vælg sikringsstørrelse</Label>
            <Select
              value={selectedFuseSize?.toString() || "alle"}
              onValueChange={(val) => setSelectedFuseSize(val === "alle" ? undefined : Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alle størrelser" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle størrelser</SelectItem>
                {availableFuseSizes.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} A
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Markér strøm (A)</Label>
            <Input
              type="number"
              min={0}
              step={10}
              value={highlightCurrent || ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setHighlightCurrent(isNaN(val) ? undefined : val);
              }}
              placeholder="Ingen"
            />
          </div>
        </div>

        {/* Chart */}
        <MultiFuseCurveChart
          manufacturer="Standard"
          fuseType={fuseType}
          highlightCurrent={highlightCurrent}
          highlightLabel={highlightCurrent ? `${highlightCurrent} A` : undefined}
          selectedFuseSize={selectedFuseSize}
        />

        {/* Info */}
        <div className="bg-muted/50 p-6 rounded-lg space-y-3">
          <h2 className="text-lg font-semibold">Hvordan bruges kurverne?</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>X-aksen (vandret):</strong> Strømmen gennem sikringen i ampere (A)
            </li>
            <li>
              <strong>Y-aksen (lodret):</strong> Tiden det tager før sikringen springer i sekunder (s)
            </li>
            <li>
              <strong>Kurven:</strong> Viser sammenhængen mellem strøm og udløsningstid. Jo højere strøm, desto hurtigere springer sikringen.
            </li>
            <li>
              <strong>Logaritmisk skala:</strong> Begge akser bruger logaritmisk skala for at vise både meget små og store værdier (fra millisekunder til timer).
            </li>
            <li>
              <strong>Vælg sikringsstørrelse:</strong> Vælg en specifik sikringsstørrelse for at fremhæve dens kurve og se præcis udløsningstid ved den markerede strøm.
            </li>
            <li>
              <strong>Markér strøm:</strong> Ved at markere en strøm kan du se hvor lang tid det vil tage før hver sikring springer ved den strøm.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
