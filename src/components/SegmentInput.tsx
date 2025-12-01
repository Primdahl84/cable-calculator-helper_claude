import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import type { SegmentData } from "@/lib/calculations";
import { STANDARD_SIZES, calculateKt, calculateKgrp } from "@/lib/calculations";
import { INSTALLATIONSMETODER, INSTALLATION_METHOD_IMAGES } from "@/lib/tables";

interface SegmentInputProps {
  segment: SegmentData;
  onChange: (data: Partial<SegmentData>) => void;
  phases?: "1-faset" | "3-faset";
  disableCrossSection?: boolean;
}

const INSTALL_METHODS = Object.entries(INSTALLATIONSMETODER).map(([num, data]) => ({
  value: data.reference,
  label: data.beskrivelse,
  number: num,
}));

const LENGTH_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200];
const TEMP_OPTIONS = [10, 15, 20, 25, 30, 35, 40, 45, 50];
const CABLES_GROUPED_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

function environmentFromInstallMethod(ref: string): "luft" | "jord" {
  if (!ref) return "luft";
  return ref.startsWith("D") ? "jord" : "luft";
}

export function SegmentInput({ segment, onChange, phases, disableCrossSection }: SegmentInputProps) {
  const [currentMethodNumber, setCurrentMethodNumber] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredMethodNumber, setHoveredMethodNumber] = useState<string | null>(null);
  const [imageErrorFor, setImageErrorFor] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Auto-set loadedConductors based on phases
  useEffect(() => {
    if (phases) {
      const conductors = phases === "3-faset" ? 3 : 2;
      if (segment.loadedConductors !== conductors) {
        onChange({ loadedConductors: conductors });
      }
    }
  }, [phases]);
  
  // Auto-beregn Kt og kgrp når relevante felter ændres
  useEffect(() => {
    const env = environmentFromInstallMethod(segment.installMethod);
    const kt = calculateKt(segment.ambientTemp, env);
    const kgrp = calculateKgrp(segment.cablesGrouped, segment.installMethod);
    onChange({ kt, kgrp });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment.ambientTemp, segment.cablesGrouped, segment.installMethod]);
  
  // Preload all images when component mounts
  useEffect(() => {
    Object.values(INSTALLATION_METHOD_IMAGES).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);
  
  // Find current method number for image
  useEffect(() => {
    const method = INSTALL_METHODS.find(m => m.value === segment.installMethod);
    if (method) {
      setCurrentMethodNumber(method.number);
    }
  }, [segment.installMethod]);
  
  // Filter methods based on search
  const filteredMethods = INSTALL_METHODS.filter(m => 
    m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.number.includes(searchQuery)
  );
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Get current method label
  const currentMethod = INSTALL_METHODS.find(m => m.number === currentMethodNumber);
  const currentLabel = currentMethod ? `${currentMethod.number}. ${currentMethod.label.split(' – ')[1] || currentMethod.label}` : "Vælg metode...";

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-3 lg:grid-cols-4">
      <div className="space-y-1">
        <Label className="text-xs">Fremføringsmåde</Label>
        
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full h-7 text-sm px-2 flex items-center justify-between rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <span className="truncate">{currentLabel}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
          
          {isDropdownOpen && (
            <>
              <div className="absolute z-50 top-full left-0 mt-1 w-full bg-popover text-popover-foreground rounded-md border shadow-lg">
                <div className="max-h-[300px] overflow-y-auto">
                  {INSTALL_METHODS.map((method) => (
                    <button
                      key={method.number}
                      type="button"
                      onClick={() => {
                        onChange({ installMethod: method.value });
                        setIsDropdownOpen(false);
                      }}
                      onMouseEnter={() => {
                        setHoveredMethodNumber(method.number);
                        setImageErrorFor(null);
                      }}
                      onMouseLeave={() => {
                        setHoveredMethodNumber(null);
                        setImageErrorFor(null);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors ${
                        currentMethodNumber === method.number ? 'bg-accent/50' : ''
                      }`}
                    >
                      {method.number}. {method.label.split(' – ')[1] || method.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {hoveredMethodNumber && INSTALLATION_METHOD_IMAGES[hoveredMethodNumber] && imageErrorFor !== hoveredMethodNumber && (
                <div className="absolute z-50 top-0 left-[calc(100%+0.75rem)] w-80 bg-background border rounded-lg shadow-lg p-3">
                  <div className="text-xs font-semibold mb-2 text-foreground">Metode {hoveredMethodNumber}</div>
                  <div className="bg-muted/30 rounded-md p-1.5">
                    <img 
                      src={INSTALLATION_METHOD_IMAGES[hoveredMethodNumber]} 
                      alt={`Metode ${hoveredMethodNumber}`}
                      className="w-full h-auto max-h-[250px] object-contain"
                      onError={() => {
                        console.error(`Failed to load image for method ${hoveredMethodNumber}`);
                        setImageErrorFor(hoveredMethodNumber);
                      }}
                    />
                  </div>
                </div>
              )}
              
              {hoveredMethodNumber && (!INSTALLATION_METHOD_IMAGES[hoveredMethodNumber] || imageErrorFor === hoveredMethodNumber) && (
                <div className="absolute z-50 top-0 left-[calc(100%+0.75rem)] w-80 bg-background border rounded-lg shadow-lg p-3">
                  <div className="text-xs font-semibold mb-2 text-foreground">Metode {hoveredMethodNumber}</div>
                  <div className="text-xs text-muted-foreground">Billede kunne ikke indlæses</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Længde [m]</Label>
        <Input
          type="number"
          min={0}
          step={0.1}
          value={segment.length || ""}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "") {
              onChange({ length: 0 });
            } else {
              const parsed = parseFloat(value.replace(",", "."));
              if (!isNaN(parsed) && parsed >= 0) {
                onChange({ length: parsed });
              }
            }
          }}
          className="h-7 text-sm px-2 py-1 text-center"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Temperatur Omgivelse [°C]</Label>
        <Input
          type="number"
          min={-50}
          max={100}
          value={segment.ambientTemp}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value.replace(",", "."));
            if (!isNaN(parsed)) {
              onChange({ ambientTemp: parsed });
            }
          }}
          className="h-7 text-sm px-2 py-1 text-center"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Tværsnit [mm²]</Label>
        <Select
          value={segment.crossSection.toString()}
          onValueChange={(value) => onChange({ crossSection: parseFloat(value) })}
          disabled={disableCrossSection}
        >
          <SelectTrigger className="h-7 text-sm px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STANDARD_SIZES.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size} mm²
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Isoleringstype</Label>
        <Select
          value={segment.insulationType || "XLPE"}
          onValueChange={(value: "XLPE" | "PVC") => onChange({ insulationType: value })}
        >
          <SelectTrigger className="h-7 text-sm px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="XLPE">XLPE (90°C)</SelectItem>
            <SelectItem value="PVC">PVC (70°C)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Antal kabler (ks)</Label>
        <Select
          value={segment.cablesGrouped.toString()}
          onValueChange={(value) => onChange({ cablesGrouped: parseInt(value, 10) })}
        >
          <SelectTrigger className="h-7 text-sm px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CABLES_GROUPED_OPTIONS.map((num) => (
              <SelectItem key={num} value={num.toString()}>
                {num} {num === 1 ? "kabel" : "kabler"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
