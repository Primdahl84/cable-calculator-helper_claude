import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { getCableColor, formatCurrent, formatLength, formatCrossSection } from "@/lib/circuitDiagram";

interface CircuitDiagramProps {
  serviceData?: Record<string, unknown>;
  groupsData?: Record<string, unknown>[];
}

export function CircuitDiagram({ serviceData, groupsData = [] }: CircuitDiagramProps) {
  const [svgSize, setSvgSize] = useState({ width: 1200, height: 800 });

  // Calculate dynamic height based on number of groups
  useEffect(() => {
    const baseHeight = 700;
    const groupHeight = 150;
    const calculatedHeight = baseHeight + (groupsData.length * groupHeight);
    setSvgSize({ width: 1400, height: Math.max(800, calculatedHeight) });
  }, [groupsData.length]);

  const downloadSVG = () => {
    const svg = document.getElementById("circuit-diagram-svg");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "kredsloebsskema.svg";
    link.click();
    
    URL.revokeObjectURL(url);
  };

  // Layout constants
  const cabinX = 80;
  const cabinY = 80;
  const boardX = 700;
  const boardY = 100;
  const groupStartY = 450;
  const groupSpacing = 150;

  const hasServiceData = serviceData && serviceData.chosenSize;
  const hasGroups = groupsData.length > 0;

  // If no data, show placeholder
  if (!hasServiceData && !hasGroups) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kredsløbsskema</CardTitle>
          <CardDescription>
            Automatisk genereret elektrisk kredsløbsdiagram
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[400px] flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">Ingen beregninger endnu</h3>
            <p className="text-sm text-muted-foreground">
              Udfyld og beregn stikledning og/eller grupper for at generere kredsløbsskemaet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Kredsløbsskema</CardTitle>
            <CardDescription>
              Automatisk genereret diagram baseret på dine beregninger
            </CardDescription>
          </div>
          <Button onClick={downloadSVG} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download SVG
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg bg-white p-4 overflow-auto">
          <svg
            id="circuit-diagram-svg"
            width={svgSize.width}
            height={svgSize.height}
            viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
            className="w-full h-auto"
          >
            <defs>
              {/* Arrow marker for cables */}
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#666" />
              </marker>
              
              {/* Fuse symbol */}
              <g id="fuse-symbol">
                <rect x="-15" y="-8" width="30" height="16" fill="white" stroke="black" strokeWidth="2" />
                <line x1="-15" y1="0" x2="15" y2="0" stroke="black" strokeWidth="2" />
                <text x="0" y="4" textAnchor="middle" fontSize="10" fill="black">⚡</text>
              </g>

              {/* MCB symbol */}
              <g id="mcb-symbol">
                <rect x="-20" y="-15" width="40" height="30" fill="white" stroke="black" strokeWidth="2" rx="3" />
                <line x1="-20" y1="0" x2="20" y2="0" stroke="black" strokeWidth="1.5" />
                <circle cx="0" cy="-5" r="6" fill="none" stroke="black" strokeWidth="1.5" />
                <line x1="0" y1="5" x2="0" y2="15" stroke="black" strokeWidth="2" />
              </g>

              {/* Earth symbol */}
              <g id="earth-symbol">
                <line x1="0" y1="0" x2="0" y2="15" stroke={getCableColor("PE")} strokeWidth="2" />
                <line x1="-10" y1="15" x2="10" y2="15" stroke={getCableColor("PE")} strokeWidth="2" />
                <line x1="-7" y1="20" x2="7" y2="20" stroke={getCableColor("PE")} strokeWidth="2" />
                <line x1="-4" y1="25" x2="4" y2="25" stroke={getCableColor("PE")} strokeWidth="2" />
              </g>
            </defs>

            {/* Title */}
            <text x={svgSize.width / 2} y={30} textAnchor="middle" fontSize="24" fontWeight="bold" fill="#333">
              Kredsløbsskema
            </text>

            {/* ==================== KABELSKAB ==================== */}
            <g id="cabin" transform={`translate(${cabinX}, ${cabinY})`}>
              <rect x="0" y="0" width="180" height="200" fill="#f0f0f0" stroke="black" strokeWidth="2" rx="5" />
              <text x="90" y="25" textAnchor="middle" fontSize="14" fontWeight="bold">Kabelskab</text>
              
              {/* Phase lines */}
              <g transform="translate(30, 50)">
                <text x="0" y="0" fontSize="12" fontWeight="bold">L1</text>
                <line x1="30" y1="-5" x2="120" y2="-5" stroke={getCableColor("L1")} strokeWidth="3" />
                <text x="0" y="20" fontSize="12" fontWeight="bold">L2</text>
                <line x1="30" y1="15" x2="120" y2="15" stroke={getCableColor("L2")} strokeWidth="3" />
                <text x="0" y="40" fontSize="12" fontWeight="bold">L3</text>
                <line x1="30" y1="35" x2="120" y2="35" stroke={getCableColor("L3")} strokeWidth="3" />
                <text x="0" y="60" fontSize="12" fontWeight="bold">N</text>
                <line x1="30" y1="55" x2="120" y2="55" stroke={getCableColor("N")} strokeWidth="3" />
              </g>

              {/* Ik values */}
              {hasServiceData && (
                <g transform="translate(10, 130)">
                  <text x="0" y="0" fontSize="11" fill="#666">
                    Ik,max: {formatCurrent(serviceData.IkMax || 0)}
                  </text>
                  <text x="0" y="18" fontSize="11" fill="#666">
                    Ik,min: {formatCurrent(serviceData.IkMin || 0)}
                  </text>
                  <text x="0" y="36" fontSize="11" fill="#666">
                    {serviceData.netVoltage || 230}V
                  </text>
                </g>
              )}
            </g>

            {/* ==================== STIKLEDNING ==================== */}
            {hasServiceData && (
              <>
                {/* Cable from cabin to board */}
                <g id="service-cable">
                  {/* L1 */}
                  <line
                    x1={cabinX + 150}
                    y1={cabinY + 45}
                    x2={boardX - 30}
                    y2={boardY + 30}
                    stroke={getCableColor("L1")}
                    strokeWidth="4"
                    markerEnd="url(#arrowhead)"
                  />
                  {/* L2 */}
                  <line
                    x1={cabinX + 150}
                    y1={cabinY + 65}
                    x2={boardX - 30}
                    y2={boardY + 50}
                    stroke={getCableColor("L2")}
                    strokeWidth="4"
                  />
                  {/* L3 */}
                  <line
                    x1={cabinX + 150}
                    y1={cabinY + 85}
                    x2={boardX - 30}
                    y2={boardY + 70}
                    stroke={getCableColor("L3")}
                    strokeWidth="4"
                  />
                  {/* N */}
                  <line
                    x1={cabinX + 150}
                    y1={cabinY + 105}
                    x2={boardX - 30}
                    y2={boardY + 90}
                    stroke={getCableColor("N")}
                    strokeWidth="4"
                  />
                  {/* PE */}
                  <line
                    x1={cabinX + 150}
                    y1={cabinY + 125}
                    x2={boardX - 30}
                    y2={boardY + 110}
                    stroke={getCableColor("PE")}
                    strokeWidth="3"
                    strokeDasharray="5,5"
                  />

                  {/* Cable info box */}
                  <g transform={`translate(${(cabinX + 150 + boardX - 30) / 2 - 80}, ${cabinY + 50})`}>
                    <rect x="0" y="0" width="160" height="80" fill="white" stroke="#666" strokeWidth="1" rx="3" />
                    <text x="80" y="18" textAnchor="middle" fontSize="12" fontWeight="bold">
                      Stikledning
                    </text>
                    <text x="80" y="35" textAnchor="middle" fontSize="10" fill="#666">
                      {formatLength(serviceData.totalLength)}
                    </text>
                    <text x="80" y="50" textAnchor="middle" fontSize="10" fill="#666">
                      {formatCrossSection(serviceData.chosenSize)} {serviceData.material || "Cu"}
                    </text>
                    <text x="80" y="65" textAnchor="middle" fontSize="10" fill="#666">
                      {serviceData.selectedFuseType || ""} {serviceData.fuseRating}A
                    </text>
                  </g>
                </g>

                {/* ==================== TAVLE (BOARD) ==================== */}
                <g id="board" transform={`translate(${boardX}, ${boardY})`}>
                  <rect x="0" y="0" width="250" height="250" fill="#e8f4f8" stroke="black" strokeWidth="3" rx="5" />
                  <text x="125" y="30" textAnchor="middle" fontSize="16" fontWeight="bold">Tavle</text>

                  {/* Main fuse */}
                  <g transform="translate(125, 70)">
                    <use href="#fuse-symbol" />
                    <text x="0" y="25" textAnchor="middle" fontSize="10" fontWeight="bold">
                      Hovedsikring
                    </text>
                    <text x="0" y="38" textAnchor="middle" fontSize="9">
                      {serviceData.fuseRating}A
                    </text>
                  </g>

                  {/* Busbars */}
                  <g transform="translate(30, 130)">
                    <line x1="0" y1="0" x2="190" y2="0" stroke={getCableColor("L1")} strokeWidth="4" />
                    <line x1="0" y1="20" x2="190" y2="20" stroke={getCableColor("L2")} strokeWidth="4" />
                    <line x1="0" y1="40" x2="190" y2="40" stroke={getCableColor("L3")} strokeWidth="4" />
                    <line x1="0" y1="60" x2="190" y2="60" stroke={getCableColor("N")} strokeWidth="4" />
                  </g>

                  {/* PE bar */}
                  <g transform="translate(125, 210)">
                    <use href="#earth-symbol" />
                  </g>
                </g>
              </>
            )}

            {/* ==================== GRUPPER ==================== */}
            {hasGroups && groupsData.map((group, index) => {
              const groupY = groupStartY + (index * groupSpacing);
              const groupX = boardX + 50;

              return (
                <g key={group.id || index} id={`group-${index}`}>
                  {/* Cable from board to group MCB */}
                  <line
                    x1={boardX + 220}
                    y1={boardY + 130 + (index % 4) * 20}
                    x2={groupX}
                    y2={groupY}
                    stroke={getCableColor(index % 3 === 0 ? "L1" : index % 3 === 1 ? "L2" : "L3")}
                    strokeWidth="3"
                  />

                  {/* Group MCB */}
                  <g transform={`translate(${groupX}, ${groupY})`}>
                    <use href="#mcb-symbol" />
                    <text x="0" y="-25" textAnchor="middle" fontSize="11" fontWeight="bold">
                      {group.name}
                    </text>
                    <text x="0" y="35" textAnchor="middle" fontSize="9">
                      {group.fuseType} {group.fuseRating}A
                    </text>
                  </g>

                  {/* Group cable to load */}
                  <line
                    x1={groupX + 20}
                    y1={groupY}
                    x2={groupX + 200}
                    y2={groupY}
                    stroke={getCableColor(index % 3 === 0 ? "L1" : index % 3 === 1 ? "L2" : "L3")}
                    strokeWidth="3"
                  />

                  {/* Cable info */}
                  <g transform={`translate(${groupX + 60}, ${groupY - 30})`}>
                    <rect x="0" y="0" width="100" height="45" fill="white" stroke="#999" strokeWidth="1" rx="2" />
                    <text x="50" y="15" textAnchor="middle" fontSize="9" fill="#666">
                      {formatLength(group.totalLength || 0)}
                    </text>
                    <text x="50" y="28" textAnchor="middle" fontSize="9" fill="#666">
                      {formatCrossSection(group.crossSection || 0)}
                    </text>
                    <text x="50" y="40" textAnchor="middle" fontSize="8" fill="#666">
                      {group.material || "Cu"}
                    </text>
                  </g>

                  {/* Load (endpoint) */}
                  <g transform={`translate(${groupX + 200}, ${groupY})`}>
                    <circle cx="0" cy="0" r="8" fill="white" stroke="black" strokeWidth="2" />
                    <text x="0" y="4" textAnchor="middle" fontSize="10">⚙</text>
                    <text x="0" y="25" textAnchor="middle" fontSize="10" fontWeight="bold">
                      {group.description || group.name}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Legend */}
            <g id="legend" transform={`translate(30, ${svgSize.height - 120})`}>
              <rect x="0" y="0" width="250" height="100" fill="white" stroke="#ccc" strokeWidth="1" rx="3" />
              <text x="10" y="20" fontSize="12" fontWeight="bold">Farver (DS/EN standard):</text>
              <line x1="10" y1="35" x2="40" y2="35" stroke={getCableColor("L1")} strokeWidth="4" />
              <text x="45" y="38" fontSize="10">L1 - Brun</text>
              <line x1="10" y1="50" x2="40" y2="50" stroke={getCableColor("L2")} strokeWidth="4" />
              <text x="45" y="53" fontSize="10">L2 - Sort</text>
              <line x1="130" y1="35" x2="160" y2="35" stroke={getCableColor("L3")} strokeWidth="4" />
              <text x="165" y="38" fontSize="10">L3 - Grå</text>
              <line x1="130" y1="50" x2="160" y2="50" stroke={getCableColor("N")} strokeWidth="4" />
              <text x="165" y="53" fontSize="10">N - Blå</text>
              <line x1="10" y1="70" x2="40" y2="70" stroke={getCableColor("PE")} strokeWidth="3" strokeDasharray="5,5" />
              <text x="45" y="73" fontSize="10">PE - Grøn/Gul</text>
            </g>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
