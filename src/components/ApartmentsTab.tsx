import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Building2, Calculator, Check, Edit2 } from "lucide-react";
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
}

import type { ApartmentData } from "./ApartmentDetailView";
import { ApartmentDetailView } from "./ApartmentDetailView";
import type { SegmentData } from "@/lib/calculations";

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
  onAddLog?: (title: string, type: 'service' | 'group', steps: any[]) => void;
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
        return cables.map((cable: any) => ({
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
          cosTrafo: cable.cosTrafo || '0.3'
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
        return apts.map((apt: any) => {
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

  // Calculate shared service cable with detailed logs
  const calculateSharedCableWithLogs = (cableId: string) => {
    if (!onAddLog) return;
    
    const cable = sharedServiceCables.find(c => c.id === cableId);
    if (!cable) return;
    
    const unitsOnCable = apartments.filter(apt => apt.sharedServiceCableId === cableId);
    const method = cable.calculationMethod || "diversity";
    const steps: any[] = [];
    
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
    
    onAddLog(`${cable.name} - Beregning`, "service", steps);
    toast.success("Mellemregninger tilføjet");
  };

  // Calculate individual service cable with detailed logs
  const calculateIndividualCableWithLogs = (apartmentId: string) => {
    if (!onAddLog) return;
    
    const apt = apartments.find(a => a.id === apartmentId);
    if (!apt) return;
    
    const method = apt.individualServiceCableCalculationMethod || "sum";
    const steps: any[] = [];
    
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
    
    onAddLog(`${apt.name} - Individuel stikledning`, "service", steps);
    toast.success("Mellemregninger tilføjet");
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
  }, [JSON.stringify(sharedCableLoads), JSON.stringify(sharedServiceCables.map(c => c.fuseRating))]);

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
                <Select value={newUnitType} onValueChange={(v: "residential" | "commercial") => setNewUnitType(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Bolig</SelectItem>
                    <SelectItem value="commercial">Erhverv</SelectItem>
                  </SelectContent>
                </Select>
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
                                      className="ml-auto hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
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
                                className="ml-auto hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
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
                <Select value={newUnitType} onValueChange={(v) => setNewUnitType(v as "residential" | "commercial")}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Bolig</SelectItem>
                    <SelectItem value="commercial">Erhverv</SelectItem>
                  </SelectContent>
                </Select>
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
                      className="ml-2 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
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
