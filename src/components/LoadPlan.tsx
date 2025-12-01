import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle } from "lucide-react";

interface LoadPlanProps {
  groupsData?: any[];
}

export function LoadPlan({ groupsData = [] }: LoadPlanProps) {
  const hasGroups = groupsData.length > 0;

  const downloadTable = () => {
    // Simple CSV export
    const headers = ["Kabelnavn", "Kabellængder", "Beskrivelse", "L1", "L2", "L3"];
    const rows = groupsData.map(g => [
      g.name,
      `${g.totalLength}m`,
      g.description || "",
      g.phase === "1-faset" ? (g.selectedPhase === "L1" ? `${g.fuseRating}A` : "") : `${g.fuseRating}A`,
      g.phase === "1-faset" ? (g.selectedPhase === "L2" ? `${g.fuseRating}A` : "") : `${g.fuseRating}A`,
      g.phase === "1-faset" ? (g.selectedPhase === "L3" ? `${g.fuseRating}A` : "") : `${g.fuseRating}A`,
    ]);
    
    // Calculate totals
    const totalL1 = groupsData.reduce((sum, g) => {
      if (g.phase === "3-faset") return sum + parseFloat(g.In || 0);
      if (g.selectedPhase === "L1") return sum + parseFloat(g.In || 0);
      return sum;
    }, 0);
    
    const totalL2 = groupsData.reduce((sum, g) => {
      if (g.phase === "3-faset") return sum + parseFloat(g.In || 0);
      if (g.selectedPhase === "L2") return sum + parseFloat(g.In || 0);
      return sum;
    }, 0);
    
    const totalL3 = groupsData.reduce((sum, g) => {
      if (g.phase === "3-faset") return sum + parseFloat(g.In || 0);
      if (g.selectedPhase === "L3") return sum + parseFloat(g.In || 0);
      return sum;
    }, 0);

    rows.push(["Sum Pr. fase", "", "", `${totalL1.toFixed(0)}A`, `${totalL2.toFixed(0)}A`, `${totalL3.toFixed(0)}A`]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "belastningsplan.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!hasGroups) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Belastningsplan</CardTitle>
          <CardDescription>
            Oversigt over belastning pr. fase
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[400px] flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">Ingen grupper endnu</h3>
            <p className="text-sm text-muted-foreground">
              Tilføj og beregn grupper for at generere belastningsplanen.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals per phase
  const totalL1 = groupsData.reduce((sum, g) => {
    if (g.phase === "3-faset") return sum + parseFloat(g.In || 0);
    if (g.selectedPhase === "L1") return sum + parseFloat(g.In || 0);
    return sum;
  }, 0);
  
  const totalL2 = groupsData.reduce((sum, g) => {
    if (g.phase === "3-faset") return sum + parseFloat(g.In || 0);
    if (g.selectedPhase === "L2") return sum + parseFloat(g.In || 0);
    return sum;
  }, 0);
  
  const totalL3 = groupsData.reduce((sum, g) => {
    if (g.phase === "3-faset") return sum + parseFloat(g.In || 0);
    if (g.selectedPhase === "L3") return sum + parseFloat(g.In || 0);
    return sum;
  }, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Belastningsplan</CardTitle>
            <CardDescription>
              Oversigt over belastning pr. fase
            </CardDescription>
          </div>
          <Button onClick={downloadTable} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-3 text-left font-semibold">Kabelnavn</th>
                <th className="border border-border p-3 text-left font-semibold">Kabellængder</th>
                <th className="border border-border p-3 text-left font-semibold">Beskrivelse</th>
                <th className="border border-border p-3 text-center font-semibold bg-[#dc6847] text-white">L1</th>
                <th className="border border-border p-3 text-center font-semibold bg-[#1a1a1a] text-white">L2</th>
                <th className="border border-border p-3 text-center font-semibold bg-[#a8a8a8]">L3</th>
              </tr>
            </thead>
            <tbody>
              {groupsData.map((group, index) => {
                const is3Phase = group.phase === "3-faset";
                const selectedPhase = group.selectedPhase || "L2";
                
                return (
                  <tr key={group.id || index} className="hover:bg-muted/50">
                    <td className="border border-border p-3 font-medium">{group.name}</td>
                    <td className="border border-border p-3">{group.totalLength}m</td>
                    <td className="border border-border p-3">{group.description || "-"}</td>
                    <td className="border border-border p-3 text-center bg-[#dc6847]/10">
                      {is3Phase || selectedPhase === "L1" ? (
                        <span className="font-semibold">{group.fuseRating}A</span>
                      ) : ""}
                    </td>
                    <td className="border border-border p-3 text-center bg-[#1a1a1a]/5">
                      {is3Phase || selectedPhase === "L2" ? (
                        <span className="font-semibold">{group.fuseRating}A</span>
                      ) : ""}
                    </td>
                    <td className="border border-border p-3 text-center bg-[#a8a8a8]/10">
                      {is3Phase || selectedPhase === "L3" ? (
                        <span className="font-semibold">{group.fuseRating}A</span>
                      ) : ""}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-muted font-bold">
                <td className="border border-border p-3" colSpan={2}>Sum Pr. fase</td>
                <td className="border border-border p-3"></td>
                <td className="border border-border p-3 text-center bg-[#dc6847]/20">{totalL1.toFixed(0)}A</td>
                <td className="border border-border p-3 text-center bg-[#1a1a1a]/10">{totalL2.toFixed(0)}A</td>
                <td className="border border-border p-3 text-center bg-[#a8a8a8]/20">{totalL3.toFixed(0)}A</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
