import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Building2, Calculator, Check, Edit2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  LOAD_TYPES, 
  LOAD_TYPE_LABELS, 
  LoadType,
  calculateVelanderPower, 
  calculatePowerFromArea,
  wattsToAmps,
  calculateTotalPowerWithDiversity
} from "@/lib/apartmentCalculations";
import { useProject } from "@/contexts/ProjectContext";

type DimensioningMethod = "manual" | "area" | "velander";
type ServiceCableMethod = "individual" | "ladder";
type SharedCableCalculationMethod = "sum" | "diversity" | "velander" | "manual";

// Standard fuse sizes in amperes
const STANDARD_FUSE_SIZES = [10, 13, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630];

// Function to select the next standard fuse size
const selectNearestFuseSize = (current: number): number => {
  for (const size of STANDARD_FUSE_SIZES) {
    if (size >= current) {
      return size;
    }
  }
  return STANDARD_FUSE_SIZES[STANDARD_FUSE_SIZES.length - 1];
};

interface SharedServiceCable {
  id: string;
  name: string;
  calculationMethod?: SharedCableCalculationMethod;
  diversityFactor?: string;
  manualAmps?: string;
  fuseRating?: string;
  fuseType?: string;
  material?: "Cu" | "Al";
  maxVoltageDrop?: string;
  ikTrafo?: string;
  cosTrafo?: string;
  segments?: SegmentData[];  // Segment data for shared service cables
}

import type { ApartmentData } from "./ApartmentDetailView";
import { ApartmentDetailView } from "./ApartmentDetailView";
import type { SegmentData } from "@/lib/calculations";
import {
  getCableImpedancePerKm,
  ikMinStik,
  ikMaxStik,
  thermalOk,
  formatCurrentWithAngle,
} from "@/lib/calculations";
import { getFuseData, fuseTripTimeExplain } from "@/lib/fuseCurves";
import type { CalculationStep } from "./CableCalculator";

const createDefaultSegment = (): SegmentData => ({
  installMethod: "C",
  length: 1,
  ambientTemp: 30,
  loadedConductors: 2,
  crossSection: 2.5,
  cablesGrouped: 1,
  kt: 1.0,
  kgrp: 1.0,
});

const createDefaultGroup = (index: number) => ({
  id: `group-${Date.now()}-${index}`,
  name: `W${index + 1}`,
  In: "10",
  fuseType: "MCB B",
  phase: "1-faset" as const,
  selectedPhase: "L2" as const,
  material: "Cu" as const,
  cosPhi: "1.0",
  maxVoltageDrop: "5.0",
  KjJord: "1.0",
  autoSize: true,
  segments: [createDefaultSegment()],
  mainFuseIn: "35",
});

interface ApartmentsTabProps {
  filterServiceCableId?: string | null; // null = show all, undefined = show all, string = filter by cable ID
  onAddLog?: (title: string, type: 'service' | 'group', steps: CalculationStep[]) => void;
}

const createDefaultApartment = (index: number, unitType: "residential" | "commercial" = "residential", firstSharedCableId?: string): ApartmentData => {
  const serviceCableId = unitType === "residential" ? (firstSharedCableId || null) : null;
  
  return {
    id: `apt-${Date.now()}-${index}`,
    name: unitType === "residential" ? `Lejlighed ${index + 1}` : `Erhverv ${index + 1}`,
    unitType,
    sharedServiceCableId: serviceCableId,
    includeInMainBoard: true, // Som standard inkluderes enheder i hovedtavlen
    dimensioningMethod: unitType === "commercial" ? "area" : "manual",
    manualAmps: "25",
    percentageExtra: "0",
    voltage: "400",
    phases: "3-faset",
    cosPhi: "1.0",
    area_m2: unitType === "commercial" ? "100" : undefined,
    loadType: unitType === "commercial" ? "detailhandel" : undefined,
    groups: [createDefaultGroup(0)],
    serviceCableSegments: [createDefaultSegment()],
    // Initialize serviceCable object with default values
    serviceCable: {
      fuseType: "Diazed gG",
      fuseRating: "25",
      material: "Cu",
      maxVoltageDrop: "1.0",
      ikTrafo: "16000",
      cosTrafo: "0.3",
      autoSize: true,
    },
    // Only set calculation method for individual service cables
    individualServiceCableCalculationMethod: serviceCableId === null ? "sum" : undefined,
  };
};

export function ApartmentsTab({ filterServiceCableId, onAddLog }: ApartmentsTabProps) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id || 'default';
  const storageKey = `apartments-tab-state-${projectId}`;

  // For residential-only projects (lejlighed), restrict to residential units only
  const allowCommercialUnits = currentProject?.type !== "lejlighed";
  
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  
  const [serviceCableMethod, setServiceCableMethod] = useState<ServiceCableMethod>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.serviceCableMethod || "ladder"; // Default til ladder for lejlighedsprojekter
      } catch {
        return "ladder";
      }
    }
    return "ladder"; // Default til ladder for lejlighedsprojekter
  });

  const [sharedServiceCables, setSharedServiceCables] = useState<SharedServiceCable[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const cables = parsed.sharedServiceCables || [{
          id: 'shared-1', 
          name: 'Fælles stikledning A',
          fuseType: 'Diazed gG',
          material: 'Cu',
          maxVoltageDrop: '1.0',
          ikTrafo: '16000',
          cosTrafo: '0.3'
        }];
        // Ensure all cables have default values
        return cables.map((cable: SharedServiceCable) => ({
          id: cable.id,
          name: cable.name,
          calculationMethod: cable.calculationMethod,
          diversityFactor: cable.diversityFactor,
          manualAmps: cable.manualAmps,
          fuseRating: cable.fuseRating,
          fuseType: cable.fuseType || 'Diazed gG',
          material: cable.material || 'Cu',
          maxVoltageDrop: cable.maxVoltageDrop || '1.0',
          ikTrafo: cable.ikTrafo || '16000',
          cosTrafo: cable.cosTrafo || '0.3',
          segments: cable.segments  // Include segments if present
        }));
      } catch {
        return [{
          id: 'shared-1', 
          name: 'Fælles stikledning A',
          fuseType: 'Diazed gG',
          material: 'Cu',
          maxVoltageDrop: '1.0',
          ikTrafo: '16000',
          cosTrafo: '0.3'
        }];
      }
    }
    return [{
      id: 'shared-1', 
      name: 'Fælles stikledning A',
      fuseType: 'Diazed gG',
      material: 'Cu',
      maxVoltageDrop: '1.0',
      ikTrafo: '16000',
      cosTrafo: '0.3'
    }];
  });

  const [diversityFactor, setDiversityFactor] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.diversityFactor || "0.7";
      } catch {
        return "0.7";
      }
    }
    return "0.7";
  });

  const [apartments, setApartments] = useState<ApartmentData[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const firstSharedCableId = parsed.sharedServiceCables?.[0]?.id || null;
        const apts = parsed.apartments || [createDefaultApartment(0, "residential", firstSharedCableId || undefined)];
          // Ensure each apartment has groups, serviceCableSegments, unitType, and sharedServiceCableId
        return apts.map((apt: Partial<ApartmentData>) => {
          const serviceCableId = apt.sharedServiceCableId !== undefined 
            ? apt.sharedServiceCableId 
            : (apt.useSharedServiceCable !== false ? firstSharedCableId : null);
            
          return {
            ...apt,
            unitType: apt.unitType || "residential",
            // Migrate old useSharedServiceCable to sharedServiceCableId
            sharedServiceCableId: serviceCableId,
            groups: apt.groups || [createDefaultGroup(0)],
            serviceCableSegments: apt.serviceCableSegments || [createDefaultSegment()],
            // Ensure serviceCable object exists with defaults
            serviceCable: apt.serviceCable ? {
              fuseType: apt.serviceCable.fuseType || "Diazed gG",
              fuseRating: apt.serviceCable.fuseRating || "25",
              material: apt.serviceCable.material || "Cu",
              maxVoltageDrop: apt.serviceCable.maxVoltageDrop || "1.0",
              ikTrafo: apt.serviceCable.ikTrafo || "16000",
              cosTrafo: apt.serviceCable.cosTrafo || "0.3",
              autoSize: apt.serviceCable.autoSize !== undefined ? apt.serviceCable.autoSize : true,
            } : {
              fuseType: "Diazed gG",
              fuseRating: "25",
              material: "Cu",
              maxVoltageDrop: "1.0",
              ikTrafo: "16000",
              cosTrafo: "0.3",
              autoSize: true,
            },
            // Separate calculation methods for individual vs shared service cables
            individualServiceCableCalculationMethod: serviceCableId === null 
              ? (apt.individualServiceCableCalculationMethod || "sum")
              : undefined, // Only set for individual service cables
            diversityFactor: apt.diversityFactor,
            manualServiceCableAmps: apt.manualServiceCableAmps,
          };
        });
      } catch {
        const firstSharedCableId = sharedServiceCables?.[0]?.id || null;
        return [createDefaultApartment(0, "residential", firstSharedCableId || undefined)];
      }
    }
    const firstSharedCableId = sharedServiceCables?.[0]?.id || null;
    return [createDefaultApartment(0, "residential", firstSharedCableId || undefined)];
  });

  // Save til localStorage ved ændringer
  useEffect(() => {
    const state = {
      serviceCableMethod,
      sharedServiceCables,
      apartments,
      diversityFactor,
    };
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [serviceCableMethod, sharedServiceCables, apartments, diversityFactor, storageKey]);

  const [newUnitType, setNewUnitType] = useState<"residential" | "commercial">("residential");
  const [showNewUnitDialog, setShowNewUnitDialog] = useState(false);
  const [selectedServiceCableForNewUnit, setSelectedServiceCableForNewUnit] = useState<string | null>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.sharedServiceCables?.[0]?.id || null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isCreatingNewServiceCable, setIsCreatingNewServiceCable] = useState(false);
  const [newServiceCableName, setNewServiceCableName] = useState("");

  const addApartment = () => {
    // Initialize with first shared cable if available
    if (sharedServiceCables.length > 0) {
      setSelectedServiceCableForNewUnit(sharedServiceCables[0].id);
    } else {
      setSelectedServiceCableForNewUnit(null);
    }
    setIsCreatingNewServiceCable(false);
    setNewServiceCableName("");
    setShowNewUnitDialog(true);
  };

  const confirmAddApartment = () => {
    let serviceCableId = selectedServiceCableForNewUnit;
    
    // If creating new service cable
    if (isCreatingNewServiceCable && newServiceCableName.trim()) {
      const newCable: SharedServiceCable = {
        id: `shared-${Date.now()}`,
        name: newServiceCableName.trim(),
      };
      setSharedServiceCables(prev => [...prev, newCable]);
      serviceCableId = newCable.id;
    }
    
    // Pass serviceCableId correctly - don't convert null to undefined
    const newApt = createDefaultApartment(apartments.length, newUnitType, serviceCableId === null ? undefined : serviceCableId);
    setApartments((prev) => [...prev, newApt]);
    
    // Reset dialog state
    setShowNewUnitDialog(false);
    setSelectedServiceCableForNewUnit(sharedServiceCables[0]?.id || null);
    setIsCreatingNewServiceCable(false);
    setNewServiceCableName("");
  };

  const addSharedServiceCable = () => {
    const newCable: SharedServiceCable = {
      id: `shared-${Date.now()}`,
      name: `Fælles stikledning ${String.fromCharCode(65 + sharedServiceCables.length)}`,
      fuseType: 'Diazed gG',
      material: 'Cu',
      maxVoltageDrop: '1.0',
      ikTrafo: '16000',
      cosTrafo: '0.3'
    };
    setSharedServiceCables(prev => [...prev, newCable]);
  };

  const removeSharedServiceCable = (id: string) => {
    if (sharedServiceCables.length === 1) {
      toast.error("Kan ikke slette den eneste fælles stikledning");
      return;
    }
    // Move units from deleted cable to first remaining cable
    const firstRemainingId = sharedServiceCables.find(c => c.id !== id)?.id || null;
    setApartments(prev => prev.map(apt => 
      apt.sharedServiceCableId === id 
        ? { ...apt, sharedServiceCableId: firstRemainingId }
        : apt
    ));
    setSharedServiceCables(prev => prev.filter(c => c.id !== id));
  };

  const updateSharedServiceCable = (id: string, updates: Partial<SharedServiceCable>) => {
    setSharedServiceCables(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeApartment = (id: string) => {
    if (apartments.length === 1) {
      toast.error("Kan ikke slette den eneste lejlighed");
      return;
    }
    setApartments((prev) => prev.filter((a) => a.id !== id));
  };

  const copyApartment = (apartmentToCopy: ApartmentData) => {
    // Create a deep copy of the apartment with new ID and name
    const newApartment: ApartmentData = {
      ...apartmentToCopy,
      id: `apt-${Date.now()}`,
      name: `${apartmentToCopy.name} kopi`,
      groups: apartmentToCopy.groups.map((group) => ({
        ...group,
        id: `group-${Date.now()}-${Math.random()}`,
        segments: group.segments.map((seg) => ({ ...seg }))
      }))
    };

    setApartments((prev) => [...prev, newApartment]);
    toast.success(`Lejlighed "${apartmentToCopy.name}" kopieret`);
  };

  // Calculate shared service cable with detailed logs
  const calculateSharedCableWithLogs = (cableId: string) => {
    if (!onAddLog) return;
    
    const cable = sharedServiceCables.find(c => c.id === cableId);
    if (!cable) return;
    
    const unitsOnCable = apartments.filter(apt => apt.sharedServiceCableId === cableId);
    const method = cable.calculationMethod || "diversity";
    const steps: CalculationStep[] = [];
    
    // Step 1: Calculate power for each unit
    steps.push({
      category: "effektberegning",
      formula: "Effektberegning for hver enhed",
      variables: unitsOnCable.map((apt, idx) => {
        const power = calculateApartmentPower(apt);
        const cos = parseFloat(apt.cosPhi.replace(",", "."));
        
        if (apt.dimensioningMethod === "manual") {
          const amps = parseFloat(apt.manualAmps?.replace(",", ".") || "0");
          return `${apt.name}:\n  I = ${amps} A\n  U = ${apt.voltage} V\n  cos φ = ${cos}\n  P = ${apt.phases === "3-faset" ? "√3 × U × I × cos φ" : "U × I × cos φ"}\n  P = ${(power! / 1000).toFixed(2)} kW`;
        } else if (apt.dimensioningMethod === "area") {
          const area = parseFloat(apt.area_m2?.replace(",", ".") || "0");
          const loadTypeLabel = apt.loadType ? LOAD_TYPE_LABELS[apt.loadType] : "";
          const wattPerM2 = apt.loadType ? LOAD_TYPES[apt.loadType] : 0;
          return `${apt.name} (${loadTypeLabel}):\n  Areal = ${area} m²\n  Belastning = ${wattPerM2} W/m²\n  P = ${area} × ${wattPerM2} = ${(power! / 1000).toFixed(2)} kW`;
        } else if (apt.dimensioningMethod === "velander") {
          const W = parseFloat(apt.W_watts?.replace(",", ".") || "0");
          return `${apt.name}:\n  W = ${W} W (gennemsnitsforbrug)\n  Velander: P = 0.24 × W + 2.31 × √W\n  P = ${(power! / 1000).toFixed(2)} kW`;
        }
        return "";
      }).join("\n\n"),
      result: `${unitsOnCable.length} enheder beregnet`
    });
    
    // Step 2: Calculate total load based on method
    const powers = unitsOnCable.map(apt => calculateApartmentPower(apt)).filter(p => p !== null) as number[];
    const avgCosPhi = unitsOnCable.reduce((sum, a) => sum + parseFloat(a.cosPhi.replace(",", ".")), 0) / unitsOnCable.length;
    let totalWatts = 0;
    let totalAmps = 0;
    
    if (method === "sum") {
      steps.push({
        category: "effektberegning",
        formula: "Simpel summering af strøm",
        variables: unitsOnCable.map(apt => {
          const power = calculateApartmentPower(apt)!;
          const cos = parseFloat(apt.cosPhi.replace(",", "."));
          const amps = wattsToAmps(power, 400, "3-faset", cos);
          return `${apt.name}: I = ${amps.toFixed(2)} A`;
        }).join("\n"),
        result: ""
      });
      
      for (const apt of unitsOnCable) {
        const power = calculateApartmentPower(apt);
        if (power !== null) {
          const cos = parseFloat(apt.cosPhi.replace(",", "."));
          const amps = wattsToAmps(power, 400, "3-faset", cos);
          totalAmps += amps;
        }
      }
      totalWatts = totalAmps * 400 * Math.sqrt(3) * avgCosPhi;
      
      steps.push({
        category: "effektberegning",
        formula: "I_total = ΣI",
        variables: `I_total = ${totalAmps.toFixed(2)} A`,
        result: `Total strøm: ${totalAmps.toFixed(2)} A\nTotal effekt: ${(totalWatts / 1000).toFixed(2)} kW`
      });
    } else if (method === "diversity") {
      const df = parseFloat(cable.diversityFactor?.replace(",", ".") || diversityFactor.replace(",", ".") || "0.7");
      const sumPower = powers.reduce((sum, p) => sum + p, 0);
      totalWatts = sumPower * df;
      totalAmps = wattsToAmps(totalWatts, 400, "3-faset", avgCosPhi);
      
      steps.push({
        category: "effektberegning",
        formula: "P_total = ΣP × Samtidighedsfaktor",
        variables: `ΣP = ${(sumPower / 1000).toFixed(2)} kW\nSamtidighedsfaktor = ${df}\nP_total = ${(sumPower / 1000).toFixed(2)} × ${df}`,
        result: `P_total = ${(totalWatts / 1000).toFixed(2)} kW`
      });
      
      steps.push({
        category: "effektberegning",
        formula: "I = P / (√3 × U × cos φ)",
        variables: `P = ${(totalWatts / 1000).toFixed(2)} kW\nU = 400 V\ncos φ = ${avgCosPhi.toFixed(2)}\nI = ${totalWatts} / (√3 × 400 × ${avgCosPhi.toFixed(2)})`,
        result: `I = ${totalAmps.toFixed(2)} A`
      });
    } else if (method === "velander") {
      const sumPower = powers.reduce((sum, p) => sum + p, 0);
      const n = powers.length;
      totalWatts = sumPower * Math.sqrt(n) / n;
      totalAmps = wattsToAmps(totalWatts, 400, "3-faset", avgCosPhi);
      
      steps.push({
        category: "effektberegning",
        formula: "P_total = ΣP × √n / n",
        variables: `ΣP = ${(sumPower / 1000).toFixed(2)} kW\nn = ${n} enheder\nP_total = ${(sumPower / 1000).toFixed(2)} × √${n} / ${n}`,
        result: `P_total = ${(totalWatts / 1000).toFixed(2)} kW`
      });
      
      steps.push({
        category: "effektberegning",
        formula: "I = P / (√3 × U × cos φ)",
        variables: `P = ${(totalWatts / 1000).toFixed(2)} kW\nU = 400 V\ncos φ = ${avgCosPhi.toFixed(2)}\nI = ${totalWatts} / (√3 × 400 × ${avgCosPhi.toFixed(2)})`,
        result: `I = ${totalAmps.toFixed(2)} A`
      });
    } else if (method === "manual") {
      totalAmps = parseFloat(cable.manualAmps?.replace(",", ".") || "0");
      totalWatts = totalAmps * 400 * Math.sqrt(3) * avgCosPhi;
      
      steps.push({
        category: "effektberegning",
        formula: "Manuel værdi",
        variables: `I_manuel = ${totalAmps} A`,
        result: `I_total = ${totalAmps.toFixed(2)} A\nP_total = ${(totalWatts / 1000).toFixed(2)} kW`
      });
    }
    
    // Step 3: Fuse sizing
    const recommendedFuse = selectNearestFuseSize(totalAmps);
    steps.push({
      category: "overbelastning",
      formula: "Sikringsdimensionering",
      variables: `I_beregnet = ${totalAmps.toFixed(2)} A\nNærmeste standard sikring ≥ I_beregnet`,
      result: `Anbefalet sikring: ${recommendedFuse} A`
    });

    // Step 4: Voltage drop (simplified - assuming standard cable properties)
    // For shared cables we use a simplified approach since we don't have detailed routing
    steps.push({
      category: "spændingsfald",
      formula: "Spændingsfald (estimeret)",
      variables: `I_total = ${totalAmps.toFixed(2)} A\nU = 400 V\nAntagelse: Standard stikledning\nMaksimalt tilladt spændingsfald: 3%`,
      calculation: `ΔU% = I × L × (R + X×tan(φ)) / (10 × U)\nFor fælles stikledninger anbefales ΔU < 3%`,
      result: `Estimeret spændingsfald < 3% (afhænger af kabletype og længde)`
    });

    // Step 5: Short circuit protection (detailed with cable parameters from segments or assumed)
    const kortslutningLines: string[] = [];

    // Use cable configuration or defaults
    const IkT = parseFloat(cable.ikTrafo?.replace(",", ".") || "16000");
    const cosT = parseFloat(cable.cosTrafo?.replace(",", ".") || "0.3");
    const material = cable.material || "Cu";
    const fuseType = cable.fuseType || "Diazed gG";
    const fuseManufacturer = "Standard";
    const k = material === "Cu" ? 143 : 94;
    const actualFuseRating = parseFloat(cable.fuseRating?.replace(",", ".") || recommendedFuse.toString());

    // Try to read segment data from apartments connected to this shared cable
    const toNumber = (value: unknown): number | null => {
      if (typeof value === "number") return Number.isFinite(value) ? value : null;
      if (typeof value === "string") {
        const match = value.replace(",", ".").match(/-?\d+(\.\d+)?/);
        if (match) {
          const num = parseFloat(match[0]);
          return Number.isFinite(num) ? num : null;
        }
      }
      return null;
    };

    let finalCableLength = 0;
    let finalCrossSection = 0;
    let finalIsAssumed = true;

    // For shared service cables, read segments from one of the connected apartments
    if (unitsOnCable.length > 0) {
      // Find the first apartment with serviceCableSegments configured
      for (const apt of unitsOnCable) {
        if (apt.serviceCableSegments && apt.serviceCableSegments.length > 0) {
          const len = apt.serviceCableSegments.reduce((sum, seg) => sum + (toNumber(seg.length) || 0), 0);
          const cs = toNumber(apt.serviceCableSegments[0]?.crossSection);

          if (len && len > 0 && cs && cs > 0) {
            finalCableLength = len;
            finalCrossSection = cs;
            finalIsAssumed = false;
            break;
          }
        }
      }
    }

    // Fallback if no segment data found
    if (finalCableLength <= 0) {
      finalCableLength = 30; // Default assumption
      finalIsAssumed = true;
    }
    if (finalCrossSection <= 0) {
      finalCrossSection = 10; // Default assumption
      finalIsAssumed = true;
    }

    const voltage = 400; // V
    const phases = "3-faset";

    if (finalIsAssumed) {
      kortslutningLines.push("=== ANTAGELSER (ingen segment-data fundet) ===");
      kortslutningLines.push(`Kabellængde: ${finalCableLength}m (antaget)`);
      kortslutningLines.push(`Kabeltværsnit: ${finalCrossSection}mm² (antaget)`);
      kortslutningLines.push(`Materiale: ${material}`);
      kortslutningLines.push("⚠️ Konfigurer segment-data i stiklednings-fanen for præcise beregninger");
    } else {
      kortslutningLines.push("=== KABELDATA ===");
      kortslutningLines.push(`Kabellængde: ${finalCableLength}m`);
      kortslutningLines.push(`Kabeltværsnit: ${finalCrossSection}mm²`);
      kortslutningLines.push(`Materiale: ${material}`);
    }
    kortslutningLines.push("");

    // Get cable impedance
    const impPerKm = getCableImpedancePerKm(finalCrossSection, material, phases);
    const factor = finalCableLength / 1000;
    const Zw1Min = { R: impPerKm.R * 1.5 * factor, X: impPerKm.X * factor };
    const Zw1Max = { R: impPerKm.R * factor, X: impPerKm.X * factor };

    kortslutningLines.push("=== Kabelimpedans ===");
    const Zw1Mag = Math.sqrt(Zw1Min.R * Zw1Min.R + Zw1Min.X * Zw1Min.X);
    const Zw1Angle = Math.atan2(Zw1Min.X, Zw1Min.R) * (180 / Math.PI);
    kortslutningLines.push(`L_total = ${finalCableLength}m`);
    kortslutningLines.push(`R/km = ${impPerKm.R.toFixed(5)} Ω/km, X/km = ${impPerKm.X.toFixed(5)} Ω/km`);
    kortslutningLines.push(`Z_w1 = (${finalCableLength}/1000) × (1.5×${impPerKm.R.toFixed(5)} + i×${impPerKm.X.toFixed(5)})`);
    kortslutningLines.push(`Z_w1 = ${Zw1Min.R.toFixed(5)} + i×${Zw1Min.X.toFixed(5)} Ω`);
    kortslutningLines.push(`|Z_w1| = ${Zw1Mag.toFixed(5)} ∠${Zw1Angle.toFixed(2)}° Ω`);
    kortslutningLines.push("");

    // Calculate Imin from fuse data
    try {
      const { IminFactor } = getFuseData(fuseManufacturer, fuseType, actualFuseRating);
      const IminSup = actualFuseRating * IminFactor;

      kortslutningLines.push("=== Forsyningsimpedans ===");
      const ZsupMin = voltage / IminSup;
      kortslutningLines.push(`I_min_forsyning = In × ${IminFactor.toFixed(2)} = ${actualFuseRating} × ${IminFactor.toFixed(2)} = ${IminSup.toFixed(1)} A`);
      kortslutningLines.push(`Z_sup_min = U_n / I_min_forsyning = ${voltage} / ${IminSup.toFixed(1)} = ${ZsupMin.toFixed(5)} Ω`);
      kortslutningLines.push("");

      // Calculate Ik,min and Ik,max
      const { Ik: IkMin, angle: IkMinAngle } = ikMinStik(voltage, IminSup, Zw1Min);
      const { Ik: IkMax, angle: IkMaxAngle } = ikMaxStik(voltage, IkT, cosT, Zw1Max);

      kortslutningLines.push("=== Ik,min beregning ===");
      kortslutningLines.push(`Ik,min = U_n / (Z_sup_min + 2×Z_w1)`);
      kortslutningLines.push(`Ik,min = ${voltage} / (${ZsupMin.toFixed(5)} + 2×${Zw1Mag.toFixed(5)})`);
      kortslutningLines.push(`Ik,min = ${IkMin.toFixed(2)} A ∠${IkMinAngle.toFixed(2)}°`);
      kortslutningLines.push("");

      kortslutningLines.push("=== Ik,max beregning ===");
      const Zw1MaxMag = Math.sqrt(Zw1Max.R * Zw1Max.R + Zw1Max.X * Zw1Max.X);
      kortslutningLines.push(`Ik,max beregnet fra trafo: ${IkT.toFixed(1)} A, cos φ = ${cosT.toFixed(3)}`);
      kortslutningLines.push(`Z_w1_max = ${Zw1MaxMag.toFixed(5)} Ω`);
      kortslutningLines.push(`Ik,max = ${IkMax.toFixed(2)} A ∠${IkMaxAngle.toFixed(2)}°`);
      kortslutningLines.push("");

      // Get fuse curve and trip time
      const { curvePoints, InCurve } = getFuseData(fuseManufacturer, fuseType, actualFuseRating);
      const useAbsoluteIk = fuseType === "Diazed gG" || fuseType === "Neozed gG" ||
                           fuseType.startsWith("Knivsikring");
      const { time: tTrip } = fuseTripTimeExplain(InCurve, IkMin, curvePoints, useAbsoluteIk);

      kortslutningLines.push("=== Springetid fra sikringskurve ===");
      kortslutningLines.push(`Sikring: ${fuseType} ${actualFuseRating} A`);
      kortslutningLines.push(`Ik,min = ${IkMin.toFixed(1)} A, In_kurve = ${InCurve.toFixed(1)} A`);
      kortslutningLines.push(`m = Ik/In = ${(IkMin / InCurve).toFixed(2)}`);
      const isMeltFuse = fuseType === "Diazed gG" || fuseType === "Neozed gG" ||
                        fuseType.startsWith("Knivsikring");
      kortslutningLines.push(`t_udkobling ≈ ${tTrip.toFixed(4)} s ${isMeltFuse && tTrip > 5.0 ? '✗ > 5 s' : '✓ OK'}`);
      kortslutningLines.push("");

      // Thermal check
      const thermalCheck = thermalOk(k, finalCrossSection, IkMin, tTrip);
      kortslutningLines.push("=== Termisk kontrol ===");
      kortslutningLines.push(`k = ${k} (materiale konstant)`);
      kortslutningLines.push(`S = ${finalCrossSection} mm²`);
      kortslutningLines.push(`E_kabel = k²×S² = ${k}²×${finalCrossSection}² = ${thermalCheck.Ekabel.toFixed(0)} A²s`);
      kortslutningLines.push(`E_bryde = I²×t = ${IkMin.toFixed(1)}²×${tTrip.toFixed(4)} = ${thermalCheck.Ebryde.toFixed(0)} A²s`);
      kortslutningLines.push(`Termisk: ${thermalCheck.ok ? '✓ OK' : '✗ IKKE OK'} (${thermalCheck.Ekabel.toFixed(0)} ${thermalCheck.ok ? '≥' : '<'} ${thermalCheck.Ebryde.toFixed(0)} A²s)`);

      if (finalIsAssumed) {
        kortslutningLines.push("");
        kortslutningLines.push("⚠️ OBS: Beregning baseret på antaget kabellængde og tværsnit!");
        kortslutningLines.push("For præcis beregning skal kabeldata konfigureres i stiklednings-fanen.");
      }

      steps.push({
        category: "kortslutning",
        formula: "Kortslutningsbeskyttelse",
        variables: kortslutningLines.join("\n"),
        calculation: "",
        result: thermalCheck.ok ? "Kortslutningsbeskyttelse OK (med antagelser)" : "Kortslutningsbeskyttelse IKKE OK"
      });
    } catch (error) {
      console.error("Fejl i kortslutningsberegninger:", error);
      steps.push({
        category: "kortslutning",
        formula: "Kortslutningsbeskyttelse",
        variables: `Sikring: ${actualFuseRating} A\nFejl i beregning: ${error}`,
        calculation: "",
        result: "Kunne ikke beregne - kontroller sikringstype og parametre"
      });
    }

    onAddLog(`${cable.name} - Beregning`, "service", steps);
  };

  // Calculate individual service cable with detailed logs
  const calculateIndividualCableWithLogs = (apartmentId: string) => {
    if (!onAddLog) return;
    
    const apt = apartments.find(a => a.id === apartmentId);
    if (!apt) return;
    
    const method = apt.individualServiceCableCalculationMethod || "sum";
    const steps: CalculationStep[] = [];
    
    // Step 1: Calculate power for the apartment
    const power = calculateApartmentPower(apt);
    if (power === null) {
      toast.error("Kunne ikke beregne effekt");
      return;
    }
    
    const cos = parseFloat(apt.cosPhi.replace(",", "."));
    
    if (apt.dimensioningMethod === "manual") {
      const amps = parseFloat(apt.manualAmps?.replace(",", ".") || "0");
      steps.push({
        category: "effektberegning",
        formula: "P = √3 × U × I × cos φ",
        variables: `I = ${amps} A\nU = ${apt.voltage} V\ncos φ = ${cos}\nP = √3 × ${apt.voltage} × ${amps} × ${cos}`,
        result: `P = ${(power / 1000).toFixed(2)} kW`
      });
    } else if (apt.dimensioningMethod === "area") {
      const area = parseFloat(apt.area_m2?.replace(",", ".") || "0");
      const loadTypeLabel = apt.loadType ? LOAD_TYPE_LABELS[apt.loadType] : "";
      const wattPerM2 = apt.loadType ? LOAD_TYPES[apt.loadType] : 0;
      steps.push({
        category: "effektberegning",
        formula: "P = Areal × Belastning",
        variables: `Areal = ${area} m²\nBelastningstype: ${loadTypeLabel}\nBelastning = ${wattPerM2} W/m²\nP = ${area} × ${wattPerM2}`,
        result: `P = ${(power / 1000).toFixed(2)} kW`
      });
    } else if (apt.dimensioningMethod === "velander") {
      const W = parseFloat(apt.W_watts?.replace(",", ".") || "0");
      steps.push({
        category: "effektberegning",
        formula: "Velander: P = 0.24 × W + 2.31 × √W",
        variables: `W = ${W} W (gennemsnitsforbrug)\nP = 0.24 × ${W / 1000} + 2.31 × √${W / 1000}`,
        result: `P = ${(power / 1000).toFixed(2)} kW`
      });
    }
    
    // Step 2: Calculate current
    let totalAmps = 0;
    
    if (method === "manual") {
      totalAmps = parseFloat(apt.manualServiceCableAmps?.replace(",", ".") || "0");
      steps.push({
        category: "effektberegning",
        formula: "Manuel værdi",
        variables: `I_manuel = ${totalAmps} A`,
        result: `I = ${totalAmps.toFixed(2)} A`
      });
    } else if (method === "sum") {
      // Sum of group currents (simplified - just convert total power)
      totalAmps = wattsToAmps(power, 400, "3-faset", cos);
      steps.push({
        category: "effektberegning",
        formula: "I = P / (√3 × U × cos φ)",
        variables: `P = ${(power / 1000).toFixed(2)} kW = ${power} W\nU = 400 V\ncos φ = ${cos}\nI = ${power} / (√3 × 400 × ${cos})`,
        result: `I = ${totalAmps.toFixed(2)} A`
      });
    } else if (method === "diversity") {
      const df = parseFloat(apt.diversityFactor?.replace(",", ".") || diversityFactor.replace(",", ".") || "0.7");
      const adjustedPower = power * df;
      totalAmps = wattsToAmps(adjustedPower, 400, "3-faset", cos);
      
      steps.push({
        category: "effektberegning",
        formula: "P_adjusted = P × Samtidighedsfaktor",
        variables: `P = ${(power / 1000).toFixed(2)} kW\nSamtidighedsfaktor = ${df}\nP_adjusted = ${(power / 1000).toFixed(2)} × ${df}`,
        result: `P_adjusted = ${(adjustedPower / 1000).toFixed(2)} kW`
      });
      
      steps.push({
        category: "effektberegning",
        formula: "I = P / (√3 × U × cos φ)",
        variables: `P = ${adjustedPower} W\nU = 400 V\ncos φ = ${cos}\nI = ${adjustedPower} / (√3 × 400 × ${cos})`,
        result: `I = ${totalAmps.toFixed(2)} A`
      });
    } else if (method === "velander") {
      // For single unit, Velander gives same as base power
      totalAmps = wattsToAmps(power, 400, "3-faset", cos);
      steps.push({
        category: "effektberegning",
        formula: "I = P / (√3 × U × cos φ)",
        variables: `P = ${power} W\nU = 400 V\ncos φ = ${cos}\nI = ${power} / (√3 × 400 × ${cos})`,
        result: `I = ${totalAmps.toFixed(2)} A`
      });
    }
    
    // Step 3: Fuse sizing
    const recommendedFuse = selectNearestFuseSize(totalAmps);
    steps.push({
      category: "overbelastning",
      formula: "Sikringsdimensionering",
      variables: `I_beregnet = ${totalAmps.toFixed(2)} A\nNærmeste standard sikring ≥ I_beregnet`,
      result: `Anbefalet sikring: ${recommendedFuse} A`
    });

    // Step 4: Voltage drop (simplified)
    steps.push({
      category: "spændingsfald",
      formula: "Spændingsfald (estimeret)",
      variables: `I = ${totalAmps.toFixed(2)} A\nU = ${apt.voltage} V\nAntagelse: Standard stikledning\nMaksimalt tilladt: 3%`,
      calculation: `ΔU% = I × L × (R + X×tan(φ)) / (10 × U)\nFor individuelle stikledninger anbefales ΔU < 3%`,
      result: `Estimeret spændingsfald < 3% (afhænger af kabletype og længde)`
    });

    // Step 5: Short circuit protection (simplified)
    steps.push({
      category: "kortslutning",
      formula: "Kortslutningsbeskyttelse (estimeret)",
      variables: `Sikring: ${recommendedFuse} A\nAntagelse: Transformator Ik ≈ 10 kA\nSikriingstype: "Diazed gG eller lignende"`,
      calculation: `For individuelle stikledninger kontrolleres:\n- Sikringen skal kunne afbryde kortslutningsstrøm\n- Triptime skal være < 5 sekunder`,
      result: `Sikring på ${recommendedFuse} A kan håndtere kortslutning ✓\n(Kræver fuld analyse med kabeldata)`
    });

    onAddLog(`${apt.name} - Individuel stikledning`, "service", steps);
  };

  const updateApartment = (id: string, data: Partial<ApartmentData>) => {
    setApartments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        
        const updated = { ...a, ...data };
        
        // If sharedServiceCableId is being changed
        if ('sharedServiceCableId' in data) {
          if (data.sharedServiceCableId === null) {
            // Moving to individual - ensure calculation method is set
            if (!updated.individualServiceCableCalculationMethod) {
              updated.individualServiceCableCalculationMethod = "sum";
            }
          } else {
            // Moving to shared - clear individual calculation method
            updated.individualServiceCableCalculationMethod = undefined;
          }
        }
        
        return updated;
      })
    );
  };

  // Beregn effekt for hver lejlighed
  const calculateApartmentPower = (apt: ApartmentData): number | null => {
    const cos = parseFloat(apt.cosPhi.replace(",", "."));
    const extraPercent = parseFloat(apt.percentageExtra.replace(",", "."));
    let basePower = 0;

    switch (apt.dimensioningMethod) {
      case "manual": {
        const amps = parseFloat(apt.manualAmps?.replace(",", ".") || "0");
        const voltage = parseInt(apt.voltage);
        if (apt.phases === "3-faset") {
          basePower = Math.sqrt(3) * voltage * amps * cos;
        } else {
          basePower = voltage * amps * cos;
        }
        break;
      }
      case "area": {
        const area = parseFloat(apt.area_m2?.replace(",", ".") || "0");
        if (!apt.loadType || area <= 0) return null;
        basePower = calculatePowerFromArea(area, apt.loadType);
        break;
      }
      case "velander": {
        const W = parseFloat(apt.W_watts?.replace(",", ".") || "0");
        if (W <= 0) return null;
        basePower = calculateVelanderPower(W, 1); // 1 bolig
        break;
      }
    }

    // Tilføj procent ekstra
    return basePower * (1 + extraPercent / 100);
  };

  // Beregn total effekt og ampere per fælles stikledning
  const calculateSharedServiceCableLoads = (apartmentsToUse = apartments) => {
    const loads: Record<string, { totalWatts: number; totalAmps: number; units: string[]; method: string }> = {};
    
    sharedServiceCables.forEach(cable => {
      const unitsOnThisCable = apartmentsToUse.filter(apt => apt.sharedServiceCableId === cable.id);
      const powers: number[] = [];
      
      for (const apt of unitsOnThisCable) {
        const power = calculateApartmentPower(apt);
        if (power !== null) {
          powers.push(power);
        }
      }
      
      if (powers.length > 0) {
        const method = cable.calculationMethod || "diversity";
        const avgCosPhi = unitsOnThisCable.reduce((sum, a) => sum + parseFloat(a.cosPhi.replace(",", ".")), 0) / unitsOnThisCable.length;
        let totalWatts = 0;
        let totalAmps = 0;
        
        switch (method) {
          case "sum": {
            // Simpel summering - summer ampere direkte
            for (const apt of unitsOnThisCable) {
              const power = calculateApartmentPower(apt);
              if (power !== null) {
                const cos = parseFloat(apt.cosPhi.replace(",", "."));
                const amps = wattsToAmps(power, 400, "3-faset", cos);
                totalAmps += amps;
              }
            }
            // Beregn total watt fra total ampere
            totalWatts = totalAmps * 400 * Math.sqrt(3) * avgCosPhi;
            break;
          }
          case "diversity": {
            // Med diversity factor (samtidighedsfaktor)
            const df = parseFloat(cable.diversityFactor?.replace(",", ".") || diversityFactor.replace(",", ".") || "0.7");
            totalWatts = calculateTotalPowerWithDiversity(powers, df);
            break;
          }
          case "velander": {
            // Velander-formel: P_total = Sum(P_i) × √n / n
            const sumPower = powers.reduce((sum, p) => sum + p, 0);
            const n = powers.length;
            totalWatts = sumPower * Math.sqrt(n) / n;
            break;
          }
          case "manual": {
            // Manuel værdi
            const manualAmps = parseFloat(cable.manualAmps?.replace(",", ".") || "0");
            totalWatts = manualAmps * 400 * Math.sqrt(3) * avgCosPhi;
            totalAmps = manualAmps;
            break;
          }
        }
        
        // For andre metoder end "sum" og "manual", beregn ampere fra watt
        if (method !== "sum" && method !== "manual") {
          totalAmps = wattsToAmps(totalWatts, 400, "3-faset", avgCosPhi);
        }
        
        loads[cable.id] = {
          totalWatts,
          totalAmps,
          units: unitsOnThisCable.map(u => u.name),
          method,
        };
      }
    });
    
    return loads;
  };

  // Beregn total effekt for individuelle stikledninger
  const calculateIndividualServiceCableLoad = (apartmentsToUse = apartments) => {
    const individualUnits = apartmentsToUse.filter(apt => !apt.sharedServiceCableId);
    let totalWatts = 0;
    let totalAmps = 0;
    
    for (const apt of individualUnits) {
      const power = calculateApartmentPower(apt);
      if (power !== null) {
        totalWatts += power;
        const cos = parseFloat(apt.cosPhi.replace(",", "."));
        const amps = wattsToAmps(power, 400, "3-faset", cos);
        totalAmps += amps;
      }
    }
    
    return {
      totalWatts,
      totalAmps,
      units: individualUnits.map(u => u.name),
    };
  };

  // Filter apartments based on filterServiceCableId
  const filteredApartments = filterServiceCableId !== undefined
    ? apartments.filter(apt => apt.sharedServiceCableId === filterServiceCableId)
    : apartments;

  const sharedCableLoads = calculateSharedServiceCableLoads(filteredApartments);
  
  // Use filteredApartments to ensure consistency when filtering
  const individualServiceCableUnits = filterServiceCableId !== undefined
    ? filteredApartments.filter(apt => !apt.sharedServiceCableId)
    : apartments.filter(apt => !apt.sharedServiceCableId);
    
  const individualLoad = calculateIndividualServiceCableLoad(
    filterServiceCableId !== undefined ? filteredApartments : apartments
  );

  // Auto-update fuse ratings for shared service cables based on calculated current
  useEffect(() => {
    Object.entries(sharedCableLoads).forEach(([cableId, load]) => {
      if (load && load.totalAmps > 0) {
        const recommendedFuseSize = selectNearestFuseSize(load.totalAmps);
        const cable = sharedServiceCables.find(c => c.id === cableId);
        const currentFuseRating = parseFloat(cable?.fuseRating?.replace(",", ".") || "0");

        if (recommendedFuseSize !== currentFuseRating) {
          setSharedServiceCables(prev => prev.map(c =>
            c.id === cableId ? { ...c, fuseRating: recommendedFuseSize.toString() } : c
          ));

          // Also update all apartments on this cable
          setApartments(prev => prev.map(apt => {
            if (apt.sharedServiceCableId === cableId && apt.serviceCable) {
              return {
                ...apt,
                serviceCable: {
                  ...apt.serviceCable,
                  fuseRating: recommendedFuseSize.toString()
                }
              };
            }
            return apt;
          }));
        }
      }
    });
  }, [sharedCableLoads, sharedServiceCables]); // Using objects directly - React will re-run when references change

  // Auto-calculate shared service cables when apartments or cables change
  useEffect(() => {
    if (sharedServiceCables && sharedServiceCables.length > 0 && onAddLog) {
      // Debounce recalculation to avoid excessive updates
      const timeoutId = setTimeout(() => {
        sharedServiceCables.forEach(cable => {
          calculateSharedCableWithLogs(cable.id);
        });
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sharedServiceCables.length,
    apartments.length,
    // Also listen to segment data changes by serializing relevant data
    JSON.stringify(apartments.map(apt => ({
      id: apt.id,
      sharedServiceCableId: apt.sharedServiceCableId,
      serviceCableSegments: apt.serviceCableSegments?.map(seg => ({
        length: seg.length,
        crossSection: seg.crossSection,
        installMethod: seg.installMethod
      }))
    })))
  ]); // calculateSharedCableWithLogs and onAddLog are stable callbacks

  // Recalculate when service cable results are updated (same-tab CustomEvent + cross-tab storage event)
  useEffect(() => {
    if (!onAddLog) return;

    const recalc = () => {
      sharedServiceCables.forEach(cable => {
        calculateSharedCableWithLogs(cable.id);
      });
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (
        event.key.startsWith("service-tab-state") &&
        (event.key.endsWith("-results") || event.key.endsWith("-results-latest"))
      ) {
        recalc();
      }
    };

    window.addEventListener("service-results-updated", recalc as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("service-results-updated", recalc as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, [sharedServiceCables, calculateSharedCableWithLogs, onAddLog]);

  // Find selected apartment or use first one from filtered list
  const selectedApartment = selectedApartmentId 
    ? filteredApartments.find(a => a.id === selectedApartmentId) 
    : filteredApartments[0];

  return (
    <div className="space-y-6">
      {/* Show filter info if filtering */}
      {filterServiceCableId !== undefined && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {filterServiceCableId === null 
                ? "Viser enheder med individuel stikledning" 
                : `Viser kun enheder tilsluttet ${sharedServiceCables.find(c => c.id === filterServiceCableId)?.name || 'denne stikledning'}`}
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* If not filtering, show all in organized sections */}
      {filterServiceCableId === undefined ? (
        <>
          {/* Apartment list and calculation card section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Enheder
                <span className="text-sm font-normal text-muted-foreground">
                  Konfigurer hver enheds (bolig/erhverv) grupper og stikledning
                </span>
              </CardTitle>
              <div className="flex items-center gap-4 pt-4">
                {allowCommercialUnits && (
                  <Select value={newUnitType} onValueChange={(v: "residential" | "commercial") => {
                    if (allowCommercialUnits || v === "residential") {
                      setNewUnitType(v);
                    }
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Bolig</SelectItem>
                      {allowCommercialUnits && <SelectItem value="commercial">Erhverv</SelectItem>}
                    </SelectContent>
                  </Select>
                )}
                <Button onClick={addApartment} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ny enhed
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Venstre side: Enheds-liste */}
                <div className="space-y-6">
                  {/* Fælles stikledninger section */}
                  {sharedServiceCables.some(cable => apartments.some(apt => apt.sharedServiceCableId === cable.id)) && (
                    <div className="space-y-6">
                      {sharedServiceCables.map(cable => {
                        const unitsOnCable = apartments.filter(apt => apt.sharedServiceCableId === cable.id);
                        if (unitsOnCable.length === 0) return null;
                        
                        return (
                          <div key={cable.id} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{cable.name}</h3>
                              <Badge variant="secondary">{unitsOnCable.length}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {unitsOnCable.map((apt) => (
                                <Button
                                  key={apt.id}
                                  variant={selectedApartment?.id === apt.id ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setSelectedApartmentId(apt.id)}
                                  className="relative justify-start"
                                >
                                  <span className="flex items-center gap-2">
                                    {apt.unitType === "commercial" && (
                                      <Badge variant="secondary" className="text-xs px-1 py-0">E</Badge>
                                    )}
                                    {apt.name}
                                  </span>
                                  <div className="ml-auto flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyApartment(apt);
                                      }}
                                      className="hover:text-primary"
                                      title="Kopier lejlighed"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                    {apartments.length > 1 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (selectedApartment?.id === apt.id && apartments.length > 1) {
                                            const currentIndex = apartments.findIndex(a => a.id === apt.id);
                                            const nextApt = apartments[currentIndex === 0 ? 1 : currentIndex - 1];
                                            setSelectedApartmentId(nextApt.id);
                                          }
                                          removeApartment(apt.id);
                                        }}
                                        className="hover:text-destructive"
                                        title="Slet lejlighed"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </Button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Individuelle stikledninger section */}
                  {individualServiceCableUnits.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Individuelle stikledninger</h3>
                        <Badge variant="secondary">{individualServiceCableUnits.length}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {individualServiceCableUnits.map((apt) => (
                          <Button
                            key={apt.id}
                            variant={selectedApartment?.id === apt.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedApartmentId(apt.id)}
                            className="relative justify-start"
                          >
                            <span className="flex items-center gap-2">
                              {apt.unitType === "commercial" && (
                                <Badge variant="secondary" className="text-xs px-1 py-0">E</Badge>
                              )}
                              <Badge variant="outline" className="text-xs px-1 py-0">IND</Badge>
                              {apt.name}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyApartment(apt);
                                }}
                                className="hover:text-primary"
                                title="Kopier lejlighed"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              {apartments.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectedApartment?.id === apt.id && apartments.length > 1) {
                                      const currentIndex = apartments.findIndex(a => a.id === apt.id);
                                      const nextApt = apartments[currentIndex === 0 ? 1 : currentIndex - 1];
                                      setSelectedApartmentId(nextApt.id);
                                    }
                                    removeApartment(apt.id);
                                  }}
                                  className="hover:text-destructive"
                                  title="Slet lejlighed"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Højre side: Beregningskort for valgt enhed */}
                {selectedApartment && (
                  <div className="border-l pl-6">
                    {selectedApartment.sharedServiceCableId ? (
                      // Vis fælles stiklednings-beregning
                      (() => {
                        const cable = sharedServiceCables.find(c => c.id === selectedApartment.sharedServiceCableId);
                        const load = sharedCableLoads[selectedApartment.sharedServiceCableId];
                        if (!cable || !load) return null;
                        
                        const method = cable.calculationMethod || "diversity";
                        const methodDescriptions = {
                          sum: "Simpel summering",
                          diversity: "Med samtidighedsfaktor",
                          velander: "Velander-formel",
                          manual: "Manuel værdi"
                        };
                        
                        return (
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold text-lg">{cable.name}</h3>
                              <p className="text-sm text-muted-foreground">{methodDescriptions[method]}</p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Beregningsmetode</Label>
                              <Select 
                                value={method} 
                                onValueChange={(v: SharedCableCalculationMethod) => {
                                  setSharedServiceCables(prev => prev.map(c => 
                                    c.id === cable.id ? { ...c, calculationMethod: v } : c
                                  ));
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sum">Simpel summering</SelectItem>
                                  <SelectItem value="diversity">Samtidighedsfaktor</SelectItem>
                                  <SelectItem value="velander">Velander-formel</SelectItem>
                                  <SelectItem value="manual">Manuel</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {method === "diversity" && (
                              <div className="space-y-2">
                                <Label>Samtidighedsfaktor</Label>
                                <Input
                                  type="text"
                                  placeholder="0.7"
                                  value={cable.diversityFactor ?? diversityFactor}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(',', '.');
                                    setSharedServiceCables(prev => prev.map(c => 
                                      c.id === cable.id ? { ...c, diversityFactor: value } : c
                                    ));
                                  }}
                                />
                                <p className="text-xs text-muted-foreground">
                                  0.7 = 70%, 1.0 = 100%
                                </p>
                              </div>
                            )}

                            {method === "manual" && (
                              <div className="space-y-2">
                                <Label>Manuel strøm [A]</Label>
                                <Input
                                  type="text"
                                  placeholder="50"
                                  value={cable.manualAmps ?? ""}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(',', '.');
                                    setSharedServiceCables(prev => prev.map(c => 
                                      c.id === cable.id ? { ...c, manualAmps: value } : c
                                    ));
                                  }}
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Total effekt</span>
                                <div className="font-bold text-xl">{(load.totalWatts / 1000).toFixed(2)} kW</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Total strøm</span>
                                <div className="font-bold text-xl text-primary">{load.totalAmps.toFixed(2)} A</div>
                              </div>
                            </div>

                            <div className="pt-2 border-t">
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Anbefalet sikring</span>
                                <Badge variant="secondary" className="text-base">
                                  {cable.fuseRating || selectNearestFuseSize(load.totalAmps)} A
                                </Badge>
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              Enheder på denne stikledning ({load.units.length})
                            </div>

                            <Button
                              onClick={() => calculateSharedCableWithLogs(cable.id)}
                              className="w-full mt-4"
                              variant="default"
                            >
                              <Calculator className="h-4 w-4 mr-2" />
                              Beregn og vis mellemregninger
                            </Button>
                          </div>
                        );
                      })()
                    ) : (
                      // Vis individuel stiklednings-beregning
                      (() => {
                        const apt = selectedApartment;
                        const power = calculateApartmentPower(apt);
                        const method = apt.individualServiceCableCalculationMethod || "sum";
                        const methodDescriptions = {
                          sum: "Simpel summering",
                          diversity: "Med samtidighedsfaktor",
                          velander: "Velander-formel",
                          manual: "Manuel værdi"
                        };
                        
                        return (
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold text-lg">{apt.name}</h3>
                              <p className="text-sm text-muted-foreground">Individuel stikledning · {methodDescriptions[method]}</p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Beregningsmetode</Label>
                              <Select 
                                value={method} 
                                onValueChange={(v: SharedCableCalculationMethod) => {
                                  updateApartment(apt.id, { individualServiceCableCalculationMethod: v });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sum">Simpel summering</SelectItem>
                                  <SelectItem value="diversity">Samtidighedsfaktor</SelectItem>
                                  <SelectItem value="velander">Velander-formel</SelectItem>
                                  <SelectItem value="manual">Manuel</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {method === "diversity" && (
                              <div className="space-y-2">
                                <Label>Samtidighedsfaktor</Label>
                                <Input
                                  type="text"
                                  placeholder="0.7"
                                  value={apt.diversityFactor ?? diversityFactor}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(',', '.');
                                    updateApartment(apt.id, { diversityFactor: value });
                                  }}
                                />
                                <p className="text-xs text-muted-foreground">
                                  0.7 = 70%, 1.0 = 100%
                                </p>
                              </div>
                            )}

                            {method === "manual" && (
                              <div className="space-y-2">
                                <Label>Manuel strøm [A]</Label>
                                <Input
                                  type="text"
                                  placeholder="50"
                                  value={apt.manualServiceCableAmps ?? ""}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(',', '.');
                                    updateApartment(apt.id, { manualServiceCableAmps: value });
                                  }}
                                />
                              </div>
                            )}

                            {power !== null && (
                              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                <div className="space-y-1">
                                  <span className="text-xs text-muted-foreground">Total effekt</span>
                                  <div className="font-bold text-xl">{(power / 1000).toFixed(2)} kW</div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-xs text-muted-foreground">Total strøm</span>
                                  <div className="font-bold text-xl text-primary">
                                    {method === "manual" 
                                      ? parseFloat(apt.manualServiceCableAmps?.replace(",", ".") || "0").toFixed(2)
                                      : wattsToAmps(power, 400, "3-faset", parseFloat(apt.cosPhi.replace(",", "."))).toFixed(2)
                                    } A
                                  </div>
                                </div>
                              </div>
                            )}

                            {power !== null && (
                              <div className="pt-2 border-t">
                                <div className="space-y-1">
                                  <span className="text-xs text-muted-foreground">Anbefalet sikring</span>
                                  <Badge variant="secondary" className="text-base">
                                    {apt.serviceCable?.fuseRating || selectNearestFuseSize(
                                      method === "manual"
                                        ? parseFloat(apt.manualServiceCableAmps?.replace(",", ".") || "0")
                                        : wattsToAmps(power, 400, "3-faset", parseFloat(apt.cosPhi.replace(",", ".")))
                                    )} A
                                  </Badge>
                                </div>
                              </div>
                            )}

                            <p className="text-xs text-muted-foreground">
                              * Baseret på {method === "sum" ? "summering" : method === "diversity" ? "samtidighedsfaktor" : method === "velander" ? "Velander-formel" : "manuel værdi"}
                            </p>

                            <Button
                              onClick={() => calculateIndividualCableWithLogs(apt.id)}
                              className="w-full mt-4"
                              variant="default"
                            >
                              <Calculator className="h-4 w-4 mr-2" />
                              Beregn og vis mellemregninger
                            </Button>
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected apartment detail */}
          {selectedApartment && (
            <Card className="border-2 border-primary/20">
              <CardHeader className="bg-primary/5">
                <CardTitle>Rediger: {selectedApartment.name}</CardTitle>
                <CardDescription>
                  {selectedApartment.sharedServiceCableId 
                    ? `Tilsluttet ${sharedServiceCables.find(c => c.id === selectedApartment.sharedServiceCableId)?.name || 'fælles stikledning'}`
                    : "Individuel stikledning"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ApartmentDetailView
                  apartment={selectedApartment}
                  serviceCableMethod={serviceCableMethod}
                  sharedServiceCables={sharedServiceCables}
                  onBack={() => {}}
                  onUpdate={(data) => updateApartment(selectedApartment.id, data)}
                  hideBackButton
                  onAddSharedServiceCable={addSharedServiceCable}
                  onUpdateSharedServiceCable={updateSharedServiceCable}
                  onRemoveSharedServiceCable={removeSharedServiceCable}
                  onAddLog={onAddLog}
                />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* Filtered view - show as before */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Enheder</CardTitle>
                <CardDescription>
                  Konfigurer hver enheds (bolig/erhverv) grupper og stikledning
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {allowCommercialUnits && (
                  <Select value={newUnitType} onValueChange={(v) => {
                    if (allowCommercialUnits || v === "residential") {
                      setNewUnitType(v as "residential" | "commercial");
                    }
                  }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Bolig</SelectItem>
                      {allowCommercialUnits && <SelectItem value="commercial">Erhverv</SelectItem>}
                    </SelectContent>
                  </Select>
                )}
                <Button onClick={addApartment} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ny enhed
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Unit tabs */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {filteredApartments.map((apt) => (
                <Button
                  key={apt.id}
                  variant={selectedApartment?.id === apt.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedApartmentId(apt.id)}
                  className="relative"
                >
                  <span className="flex items-center gap-2">
                    {apt.unitType === "commercial" && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        E
                      </Badge>
                    )}
                    {!apt.sharedServiceCableId && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        IND
                      </Badge>
                    )}
                    {apt.name}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyApartment(apt);
                      }}
                      className="hover:text-primary"
                      title="Kopier lejlighed"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    {apartments.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedApartment?.id === apt.id && filteredApartments.length > 1) {
                            const currentIndex = filteredApartments.findIndex(a => a.id === apt.id);
                            const nextApt = filteredApartments[currentIndex === 0 ? 1 : currentIndex - 1];
                            setSelectedApartmentId(nextApt.id);
                          }
                          removeApartment(apt.id);
                        }}
                        className="hover:text-destructive"
                        title="Slet lejlighed"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </Button>
              ))}
            </div>

            {/* Selected apartment detail */}
            {selectedApartment && (
              <ApartmentDetailView
                apartment={selectedApartment}
                serviceCableMethod={serviceCableMethod}
                sharedServiceCables={sharedServiceCables}
                onBack={() => {}}
                onUpdate={(data) => updateApartment(selectedApartment.id, data)}
                hideBackButton
                onAddSharedServiceCable={addSharedServiceCable}
                onUpdateSharedServiceCable={updateSharedServiceCable}
                onRemoveSharedServiceCable={removeSharedServiceCable}
                onAddLog={onAddLog}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* New Unit Dialog */}
      <Dialog open={showNewUnitDialog} onOpenChange={setShowNewUnitDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Stikledning</DialogTitle>
            <DialogDescription>
              Vælg hvilken stikledning den nye enhed skal tilsluttes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {/* Individual service cable option */}
              <button
                onClick={() => {
                  setSelectedServiceCableForNewUnit(null);
                  setIsCreatingNewServiceCable(false);
                }}
                className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                  selectedServiceCableForNewUnit === null && !isCreatingNewServiceCable
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="font-medium">Individuel stikledning</span>
                {selectedServiceCableForNewUnit === null && !isCreatingNewServiceCable && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>

              {/* Existing shared service cables */}
              {sharedServiceCables.map(cable => (
                <button
                  key={cable.id}
                  onClick={() => {
                    setSelectedServiceCableForNewUnit(cable.id);
                    setIsCreatingNewServiceCable(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                    selectedServiceCableForNewUnit === cable.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{cable.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {apartments.filter(apt => apt.sharedServiceCableId === cable.id).length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedServiceCableForNewUnit === cable.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </button>
              ))}

              {/* Create new service cable option */}
              {isCreatingNewServiceCable ? (
                <div className="p-4 rounded-lg border-2 border-primary bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Navn på ny stikledning"
                      value={newServiceCableName}
                      onChange={(e) => setNewServiceCableName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreatingNewServiceCable(false);
                        setNewServiceCableName("");
                      }}
                    >
                      Annuller
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsCreatingNewServiceCable(true);
                    setSelectedServiceCableForNewUnit(null);
                    setNewServiceCableName(`Fælles stikledning ${String.fromCharCode(65 + sharedServiceCables.length)}`);
                  }}
                  className="w-full flex items-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tilføj ny fælles stikledning</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewUnitDialog(false)}>
              Annuller
            </Button>
            <Button onClick={confirmAddApartment}>
              Opret enhed
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
