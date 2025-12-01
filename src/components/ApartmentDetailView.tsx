import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Edit2, Calculator } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { SegmentInput } from "./SegmentInput";
import type { SegmentData } from "@/lib/calculations";
import { 
  lookupIz, 
  voltageDropDs,
  getCableImpedancePerKm,
  ikMinStik,
  ikMaxStik,
  thermalOk,
  STANDARD_SIZES,
  formatCurrentWithAngle
} from "@/lib/calculations";
import { autoSelectGroupCableSize } from "@/lib/groupCalculations";
import { getFuseData, fuseTripTimeExplain } from "@/lib/fuseCurves";

// Helper to check if fuse type uses absolute Ik values instead of multiplier
const usesAbsoluteIk = (fuseType?: string): boolean => {
  if (!fuseType) return false;
  return fuseType === "Diazed gG" || 
         fuseType === "Diazed D2/D3/D4" ||
         fuseType === "Neozed gG" || 
         fuseType === "Knivsikring gG" ||
         fuseType === "Knivsikring NH00" ||
         fuseType === "Knivsikring NH0" ||
         fuseType === "Knivsikring NH1";
};
import { 
  LOAD_TYPES, 
  LOAD_TYPE_LABELS, 
  LoadType,
  calculateVelanderPower, 
  calculatePowerFromArea,
  wattsToAmps 
} from "@/lib/apartmentCalculations";

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

type DimensioningMethod = "manual" | "area" | "velander";
type PhaseSystem = "1-faset" | "3-faset";
type Material = "Cu" | "Al";

interface GroupData {
  id: string;
  name: string;
  In: string;
  fuseType: string;
  phase: PhaseSystem;
  selectedPhase?: "L1" | "L2" | "L3";
  material: Material;
  cosPhi: string;
  maxVoltageDrop: string;
  KjJord: string;
  autoSize: boolean;
  segments: SegmentData[];
  mainFuseIn?: string;
}

export interface ApartmentData {
  id: string;
  name: string;
  unitType: "residential" | "commercial"; // Bolig eller erhverv
  useSharedServiceCable?: boolean; // Deprecated - replaced by sharedServiceCableId
  sharedServiceCableId?: string | null; // null = individuel, eller ID på fælles stikledning
  includeInMainBoard?: boolean; // Om enheden skal inkluderes i hovedtavlen (true) eller have sin egen separate stikledning (false)
  dimensioningMethod: DimensioningMethod;
  manualAmps?: string;
  area_m2?: string;
  loadType?: LoadType;
  W_watts?: string;
  percentageExtra: string;
  voltage: "230" | "400";
  phases: "1-faset" | "3-faset";
  cosPhi: string;
  groups: GroupData[];
  serviceCableSegments?: SegmentData[];
  serviceCable?: {
    fuseType: string;
    fuseRating: string;
    material: Material;
    maxVoltageDrop: string;
    ikTrafo: string;
    cosTrafo: string;
    autoSize: boolean;
  };
  // Nye properties for individuelle stikledninger
  individualServiceCableCalculationMethod?: "sum" | "diversity" | "velander" | "manual";
  diversityFactor?: string;
  manualServiceCableAmps?: string;
}

interface CalculationStep {
  category: 'overbelastning' | 'kortslutning' | 'spændingsfald' | 'effektberegning';
  formula: string;
  variables: string;
  calculation: string;
  result: string;
}

interface ApartmentDetailViewProps {
  apartment: ApartmentData;
  serviceCableMethod: "individual" | "ladder";
  sharedServiceCables: Array<{id: string; name: string; fuseType?: string; material?: "Cu" | "Al"; maxVoltageDrop?: string; ikTrafo?: string; cosTrafo?: string;}>;
  onBack: () => void;
  onUpdate: (data: Partial<ApartmentData>) => void;
  hideBackButton?: boolean;
  onAddSharedServiceCable?: () => void;
  onUpdateSharedServiceCable?: (id: string, updates: Partial<{name: string; fuseType?: string; material?: "Cu" | "Al"; maxVoltageDrop?: string; ikTrafo?: string; cosTrafo?: string;}>) => void;
  onRemoveSharedServiceCable?: (id: string) => void;
  onAddLog?: (title: string, type: 'service' | 'group', steps: CalculationStep[]) => void;
}

const createDefaultSegment = (): SegmentData => ({
  installMethod: "C",
  length: 1,
  ambientTemp: 30,
  loadedConductors: 2,
  crossSection: 2.5,
  cablesGrouped: 1,
  kt: 1.0,
  kgrp: 1.0,
  insulationType: "XLPE",
});

const createDefaultGroup = (index: number, autoPhase?: "L1" | "L2" | "L3"): GroupData => ({
  id: `group-${Date.now()}-${index}`,
  name: `W${index + 1}`,
  In: "10",
  fuseType: "MCB B",
  phase: "1-faset",
  selectedPhase: autoPhase || "L2",
  material: "Cu",
  cosPhi: "1.0",
  maxVoltageDrop: "5.0",
  KjJord: "1.0",
  autoSize: true,
  segments: [createDefaultSegment()],
  mainFuseIn: "35",
});

export function ApartmentDetailView({ 
  apartment, 
  serviceCableMethod,
  sharedServiceCables,
  onBack, 
  onUpdate,
  hideBackButton = false,
  onAddSharedServiceCable,
  onUpdateSharedServiceCable,
  onRemoveSharedServiceCable,
  onAddLog
}: ApartmentDetailViewProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCable, setSelectedCable] = useState<{id: string; name: string} | null>(null);
  const [editName, setEditName] = useState("");
  
  // Service cable state
  const [serviceCableResults, setServiceCableResults] = useState<{
    chosenSize: number | null;
    IzNed: number;
    totalLength: number;
    totalVoltageDrop: number;
    voltageDropPercent: number;
    IkMin: number;
    IkMinAngle: number;
    IkMax: number;
    IkMaxAngle: number;
    thermalOk: boolean;
    thermalE: number;
    thermalI2t: number;
    tripTime: number;
  } | null>(null);

  const addGroup = () => {
    const onePhasedGroups = apartment.groups.filter(g => g.phase === "1-faset");
    const phaseRotation: ("L1" | "L2" | "L3")[] = ["L1", "L2", "L3"];
    const nextPhase = phaseRotation[onePhasedGroups.length % 3];
    
    const newGroup = createDefaultGroup(apartment.groups.length, nextPhase);
    onUpdate({ groups: [...apartment.groups, newGroup] });
  };

  const handleEditCable = (cable: {id: string; name: string}) => {
    setSelectedCable(cable);
    setEditName(cable.name);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (selectedCable && editName.trim()) {
      onUpdateSharedServiceCable?.(selectedCable.id, { name: editName.trim() });
      setEditDialogOpen(false);
      toast.success("Stikledning opdateret");
    }
  };

  const handleDeleteCable = (cable: {id: string; name: string}) => {
    setSelectedCable(cable);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCable) {
      if (apartment.sharedServiceCableId === selectedCable.id) {
        onUpdate({ sharedServiceCableId: null });
      }
      onRemoveSharedServiceCable?.(selectedCable.id);
      setDeleteDialogOpen(false);
      toast.success("Stikledning slettet");
    }
  };

  const removeGroup = (groupId: string) => {
    if (apartment.groups.length === 1) {
      toast.error("Kan ikke slette den eneste gruppe");
      return;
    }
    onUpdate({ groups: apartment.groups.filter(g => g.id !== groupId) });
  };

  const updateGroup = (groupId: string, data: Partial<GroupData>) => {
    onUpdate({
      groups: apartment.groups.map(g => {
        if (g.id !== groupId) return g;
        const updated = { ...g, ...data };
        
        if (data.phase) {
          updated.In = data.phase === "3-faset" ? "16" : "10";
          const correctConductors = data.phase === "3-faset" ? 3 : 2;
          updated.segments = updated.segments.map(seg => ({
            ...seg,
            loadedConductors: correctConductors
          }));
        }
        
        return updated;
      })
    });
  };

  const updateGroupSegment = (groupId: string, index: number, data: Partial<SegmentData>) => {
    onUpdate({
      groups: apartment.groups.map(g => {
        if (g.id !== groupId) return g;
        const segments = [...g.segments];
        segments[index] = { ...segments[index], ...data };
        return { ...g, segments };
      })
    });
  };

  const addSegmentToGroup = (groupId: string) => {
    onUpdate({
      groups: apartment.groups.map(g => 
        g.id === groupId ? { ...g, segments: [...g.segments, createDefaultSegment()] } : g
      )
    });
  };

  const removeSegmentFromGroup = (groupId: string, index: number) => {
    onUpdate({
      groups: apartment.groups.map(g => {
        if (g.id !== groupId) return g;
        if (g.segments.length <= 1) return g;
        return { ...g, segments: g.segments.filter((_, i) => i !== index) };
      })
    });
  };

  const calculateApartmentPower = (): number | null => {
    const cos = parseFloat(apartment.cosPhi.replace(",", "."));
    const extraPercent = parseFloat(apartment.percentageExtra.replace(",", "."));
    let basePower = 0;

    switch (apartment.dimensioningMethod) {
      case "manual": {
        const amps = parseFloat(apartment.manualAmps?.replace(",", ".") || "0");
        const voltage = parseInt(apartment.voltage);
        if (apartment.phases === "3-faset") {
          basePower = Math.sqrt(3) * voltage * amps * cos;
        } else {
          basePower = voltage * amps * cos;
        }
        break;
      }
      case "area": {
        const area = parseFloat(apartment.area_m2?.replace(",", ".") || "0");
        if (!apartment.loadType || area <= 0) return null;
        basePower = calculatePowerFromArea(area, apartment.loadType);
        break;
      }
      case "velander": {
        const W = parseFloat(apartment.W_watts?.replace(",", ".") || "0");
        if (W <= 0) return null;
        basePower = calculateVelanderPower(W, 1);
        break;
      }
    }

    return basePower * (1 + extraPercent / 100);
  };

  const calculateServiceCable = () => {
    const calculationSteps: CalculationStep[] = [];
    
    try {
      if (!apartment.serviceCable || !apartment.serviceCableSegments?.length) {
        setServiceCableResults(null);
        return;
      }

      // Get settings from shared cable if applicable, otherwise from apartment
      let fuseType: string;
      let material: Material;
      let maxVoltageDrop: string;
      let ikTrafo: string;
      let cosTrafo: string;
      
      if (apartment.sharedServiceCableId) {
        const sharedCable = sharedServiceCables.find(c => c.id === apartment.sharedServiceCableId);
        fuseType = sharedCable?.fuseType || "Diazed gG";
        material = sharedCable?.material || "Cu";
        maxVoltageDrop = sharedCable?.maxVoltageDrop || "1.0";
        ikTrafo = sharedCable?.ikTrafo || "16000";
        cosTrafo = sharedCable?.cosTrafo || "0.3";
      } else {
        fuseType = apartment.serviceCable.fuseType;
        material = apartment.serviceCable.material;
        maxVoltageDrop = apartment.serviceCable.maxVoltageDrop;
        ikTrafo = apartment.serviceCable.ikTrafo;
        cosTrafo = apartment.serviceCable.cosTrafo;
      }
      
      const { fuseRating, autoSize } = apartment.serviceCable;
      const segments = apartment.serviceCableSegments;
      
      const In = parseFloat(fuseRating.replace(",", "."));
      const voltage = parseFloat(apartment.voltage);
      const cos = parseFloat(apartment.cosPhi.replace(",", "."));
      const maxDrop = parseFloat(maxVoltageDrop.replace(",", "."));
      const IkT = parseFloat(ikTrafo.replace(",", "."));
      const cosT = parseFloat(cosTrafo.replace(",", "."));
      const k = material === "Cu" ? 143 : 94;
      const phaseStr = apartment.phases;

      if (!isFinite(In) || !isFinite(voltage) || !isFinite(cos) || !isFinite(maxDrop)) {
        setServiceCableResults(null);
        return;
      }
      
      // Effektberegning baseret på metode
      if (apartment.dimensioningMethod === "area" && apartment.loadType) {
        const area = parseFloat(apartment.area_m2?.replace(",", ".") || "0");
        const loadPerM2 = LOAD_TYPES[apartment.loadType];
        const basePower = area * loadPerM2;
        const extraPercent = parseFloat(apartment.percentageExtra.replace(",", "."));
        const totalPower = basePower * (1 + extraPercent / 100);
        
        calculationSteps.push({
          category: 'effektberegning',
          formula: 'P = Areal × Belastning/m²',
          variables: `Areal=${area} m²\nBelastning=${loadPerM2} W/m² (${LOAD_TYPE_LABELS[apartment.loadType]})\nEkstra=${extraPercent}%`,
          calculation: `P_basis = ${area} × ${loadPerM2} = ${basePower.toFixed(0)} W\nP_total = ${basePower.toFixed(0)} × ${(1 + extraPercent / 100).toFixed(2)} = ${totalPower.toFixed(0)} W`,
          result: `${totalPower.toFixed(0)} W (${(totalPower/1000).toFixed(2)} kW)`
        });
        
        const calculatedAmps = wattsToAmps(totalPower, voltage, phaseStr, cos);
        calculationSteps.push({
          category: 'effektberegning',
          formula: phaseStr === "3-faset" ? 'I = P / (√3 × U × cos φ)' : 'I = P / (U × cos φ)',
          variables: `P=${totalPower.toFixed(0)} W\nU=${voltage} V\ncos φ=${cos}`,
          calculation: phaseStr === "3-faset" 
            ? `I = ${totalPower.toFixed(0)} / (√3 × ${voltage} × ${cos}) = ${calculatedAmps.toFixed(2)} A`
            : `I = ${totalPower.toFixed(0)} / (${voltage} × ${cos}) = ${calculatedAmps.toFixed(2)} A`,
          result: `${calculatedAmps.toFixed(2)} A`
        });
      } else if (apartment.dimensioningMethod === "velander") {
        const W = parseFloat(apartment.W_watts?.replace(",", ".") || "0");
        const extraPercent = parseFloat(apartment.percentageExtra.replace(",", "."));
        const k1 = 0.24, k2 = 2.31;
        const W_kw = W / 1000;
        const P_B = k1 * W_kw + k2 * Math.sqrt(W_kw);
        const totalPower = P_B * 1000 * (1 + extraPercent / 100);
        
        calculationSteps.push({
          category: 'effektberegning',
          formula: 'P_B = k1 × W + k2 × √W (Velander)',
          variables: `W=${W_kw.toFixed(2)} kW\nk1=${k1}\nk2=${k2}\nEkstra=${extraPercent}%`,
          calculation: `P_B = ${k1} × ${W_kw.toFixed(2)} + ${k2} × √${W_kw.toFixed(2)} = ${P_B.toFixed(2)} kW\nP_total = ${P_B.toFixed(2)} × ${(1 + extraPercent / 100).toFixed(2)} = ${(totalPower/1000).toFixed(2)} kW`,
          result: `${totalPower.toFixed(0)} W (${(totalPower/1000).toFixed(2)} kW)`
        });
      } else if (apartment.dimensioningMethod === "manual") {
        const amps = parseFloat(apartment.manualAmps?.replace(",", ".") || "0");
        const power = phaseStr === "3-faset" 
          ? Math.sqrt(3) * voltage * amps * cos
          : voltage * amps * cos;
        
        calculationSteps.push({
          category: 'effektberegning',
          formula: phaseStr === "3-faset" ? 'P = √3 × U × I × cos φ' : 'P = U × I × cos φ',
          variables: `U=${voltage} V\nI=${amps} A\ncos φ=${cos}`,
          calculation: phaseStr === "3-faset"
            ? `P = √3 × ${voltage} × ${amps} × ${cos} = ${power.toFixed(0)} W`
            : `P = ${voltage} × ${amps} × ${cos} = ${power.toFixed(0)} W`,
          result: `${power.toFixed(0)} W (${(power/1000).toFixed(2)} kW)`
        });
      }

      let chosenSize: number | null = null;
      let bestSizeWithLongTripTime: number | null = null;
      let bestTripTime: number = Infinity;
      
      if (autoSize) {
        for (const size of STANDARD_SIZES) {
          let overloadOk = true;
          let totalVDropPercent = 0;
          
          // Check overload and voltage drop
          for (const seg of segments) {
            const loadedConductors = phaseStr === "3-faset" ? 3 : 2;
            const iz = lookupIz(material, seg.installMethod, size, loadedConductors, seg.insulationType || "XLPE");
            if (iz === 0) {
              overloadOk = false;
              break;
            }
            const IzKorr = iz * seg.kt * seg.kgrp;
            if (In > IzKorr) {
              overloadOk = false;
              break;
            }
            
            const result = voltageDropDs(
              voltage,
              In,
              material,
              size,
              seg.length,
              phaseStr,
              cos
            );
            totalVDropPercent += result.duPercent;
          }
          
          if (!overloadOk || totalVDropPercent > maxDrop) {
            continue;
          }
          
          // Check trip time (must be <= 5 seconds)
          const loadedConductors = phaseStr === "3-faset" ? 3 : 2;
          let totalLength = 0;
          for (const seg of segments) {
            totalLength += seg.length;
          }
          
          const Zkm = getCableImpedancePerKm(size, material, phaseStr);
          const lengthKm = totalLength / 1000;
          const Zkabel = { R: Zkm.R * lengthKm, X: Zkm.X * lengthKm };
          
          const fuseType = apartment.serviceCable?.fuseType || "Diazed gG";
          const { curvePoints, InCurve, IminFactor } = getFuseData("Standard", fuseType, In);
          const IminSupply = In * IminFactor; // Beregn korrekt Imin fra sikring
          const ikMinResult = ikMinStik(voltage, IminSupply, Zkabel);
          
          const useAbsoluteIk = usesAbsoluteIk(fuseType);
          const { time: tripTime } = fuseTripTimeExplain(InCurve, ikMinResult.Ik, curvePoints, useAbsoluteIk);
          
          // Track the best size even if trip time is too long
          if (tripTime < bestTripTime) {
            bestTripTime = tripTime;
            bestSizeWithLongTripTime = size;
          }
          
          // Accept this size if trip time is <= 5 seconds
          if (tripTime <= 5.0) {
            chosenSize = size;
            break;
          }
        }
        
        // If no size meets 5s requirement, use the best we found (with warning)
        if (!chosenSize && bestSizeWithLongTripTime) {
          chosenSize = bestSizeWithLongTripTime;
        }
        
        // Update segments with chosen size (only if different)
        if (chosenSize) {
          const needsUpdate = segments.some(seg => seg.crossSection !== chosenSize);
          if (needsUpdate) {
            const updatedSegments = segments.map(seg => ({
              ...seg,
              crossSection: chosenSize!
            }));
            onUpdate({ serviceCableSegments: updatedSegments });
          }
        }
      } else {
        chosenSize = segments[0]?.crossSection || null;
      }

      if (!chosenSize) {
        setServiceCableResults(null);
        return;
      }

      // Calculate detailed results
      const loadedConductors = phaseStr === "3-faset" ? 3 : 2;
      let totalLength = 0;
      let totalVDrop = 0;
      let totalVDropPercent = 0;
      let IzNed = Infinity;
      
      for (const seg of segments) {
        totalLength += seg.length;
        const iz = lookupIz(material, seg.installMethod, chosenSize, loadedConductors, seg.insulationType || "XLPE");
        const IzKorr = iz * seg.kt * seg.kgrp;
        if (IzKorr < IzNed) IzNed = IzKorr;
        
        const result = voltageDropDs(
          voltage,
          In,
          material,
          chosenSize,
          seg.length,
          phaseStr,
          cos
        );
        totalVDrop += result.du;
        totalVDropPercent += result.duPercent;
      }
      
      // Short circuit calculations
      const Zkm = getCableImpedancePerKm(chosenSize, material, phaseStr);
      const lengthKm = totalLength / 1000;
      const Zkabel = { R: Zkm.R * lengthKm, X: Zkm.X * lengthKm };
      
      const { curvePoints, InCurve, IminFactor } = getFuseData("Standard", fuseType, In);
      const IminSupply = In * IminFactor; // Beregn korrekt Imin fra sikring
      const ikMinResult = ikMinStik(voltage, IminSupply, Zkabel);
      const ikMaxResult = ikMaxStik(voltage, IkT, cosT, Zkabel);
      
      // Thermal check
      const useAbsoluteIk = usesAbsoluteIk(apartment.serviceCable?.fuseType);
      const { time: tripTime } = fuseTripTimeExplain(InCurve, ikMinResult.Ik, curvePoints, useAbsoluteIk);
      const thermal = thermalOk(k, chosenSize, ikMinResult.Ik, tripTime);
      
      // === SEGMENTDATA ===
      const segmentDataLines: string[] = ["=== Segmentdata ==="];
      segments.forEach((seg, i) => {
        const env = seg.installMethod.startsWith("D") ? "jord" : "luft";
        segmentDataLines.push(`Segment ${i + 1}: Ref=${seg.installMethod} (${env}), L=${seg.length}m, T=${seg.ambientTemp}°C, S=${chosenSize}mm², Leder=${loadedConductors}, Kt=${seg.kt.toFixed(3)}, Kj=1.000, Kgrp=${seg.kgrp.toFixed(3)}`);
      });
      
      calculationSteps.push({
        category: 'overbelastning',
        formula: 'Segmentdata',
        variables: segmentDataLines.join('\n'),
        calculation: '',
        result: `Valgt tværsnit: ${chosenSize} mm²`
      });

      // === IZ,NØDVENDIG BEREGNING ===
      const izNødvendigLines: string[] = ["=== Iz,nødvendig beregning ==="];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const izNødvendig = In / (seg.kt * seg.kgrp);
        izNødvendigLines.push(`Segment ${i + 1}: Iz,nødvendig = ${In.toFixed(2)} / (${seg.kt.toFixed(3)} × 1.000 × ${seg.kgrp.toFixed(3)}) = ${izNødvendig.toFixed(2)} A`);
      }
      
      calculationSteps.push({
        category: 'overbelastning',
        formula: 'Iz,nødvendig beregning',
        variables: izNødvendigLines.join('\n'),
        calculation: '',
        result: ''
      });

      // === IZ,KORRIGERET FOR VALGT KABEL ===
      const izKorrigeretLines: string[] = ["=== Iz,korrigeret for valgt kabel ===", `Valgt tværsnit: ${chosenSize} mm²`];
      let overloadOk = true;
      
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const iz = lookupIz(material, seg.installMethod, chosenSize, loadedConductors, seg.insulationType || "XLPE");
        const IzCorr = iz * seg.kt * seg.kgrp;
        
        if (In > IzCorr) {
          overloadOk = false;
        }
        
        izKorrigeretLines.push(`Segment ${i + 1}: Iz,korrigeret = ${iz.toFixed(2)} × ${seg.kt.toFixed(3)} × 1.000 × ${seg.kgrp.toFixed(3)} = ${IzCorr.toFixed(2)} A ≥ In = ${In.toFixed(2)} A ${In <= IzCorr ? '✓' : '✗'}`);
      }
      
      izKorrigeretLines.push(`\n${overloadOk ? 'Kabel godkendt for overbelastning ✓' : 'Kabel IKKE godkendt for overbelastning ✗'}`);
      
      calculationSteps.push({
        category: 'overbelastning',
        formula: 'Iz,korrigeret for valgt kabel',
        variables: izKorrigeretLines.join('\n'),
        calculation: '',
        result: overloadOk ? 'OK ✓' : 'IKKE OK ✗'
      });

      // === SPÆNDINGSFALD ===
      calculationSteps.push({
        category: 'spændingsfald',
        formula: 'Total spændingsfald',
        variables: `ΔU_total = ${totalVDrop.toFixed(2)} V\nΔU% = ${totalVDropPercent.toFixed(2)}%`,
        calculation: `Maks tilladte spændingsfald: ${maxDrop}%`,
        result: `${totalVDropPercent <= maxDrop ? '✓' : '✗'} ΔU = ${totalVDropPercent.toFixed(2)}% ${totalVDropPercent <= maxDrop ? '≤' : '>'} ${maxDrop}%`
      });
      
      // === KABELIMPEDANS ===
      const kabelImpedansLines: string[] = ["=== Kabelimpedans ==="];
      kabelImpedansLines.push(`L_total = ${totalLength.toFixed(1)}m`);
      kabelImpedansLines.push(`R/km = ${Zkm.R.toFixed(5)} Ω/km, X/km = ${Zkm.X.toFixed(5)} Ω/km`);
      kabelImpedansLines.push(`Z_kabel = (${totalLength.toFixed(1)}/1000) × (${Zkm.R.toFixed(5)} + j×${Zkm.X.toFixed(5)})`);
      kabelImpedansLines.push(`Z_kabel = ${Zkabel.R.toFixed(5)} + j×${Zkabel.X.toFixed(5)} Ω`);
      kabelImpedansLines.push(`|Z_kabel| = ${Math.sqrt(Zkabel.R**2 + Zkabel.X**2).toFixed(5)} Ω`);

      calculationSteps.push({
        category: 'kortslutning',
        formula: 'Kabelimpedans',
        variables: kabelImpedansLines.join('\n'),
        calculation: '',
        result: `|Z_kabel| = ${Math.sqrt(Zkabel.R**2 + Zkabel.X**2).toFixed(5)} Ω`
      });
      
      // === KORTSLUTNINGSSTRØMME ===
      const kortslutningLines: string[] = ["=== Kortslutningsstrømme ==="];
      kortslutningLines.push(`Ik,trafo = ${IkT.toFixed(0)} A`);
      kortslutningLines.push(`cos φ trafo = ${cosT}`);
      kortslutningLines.push(`\nIk,min = ${ikMinResult.Ik.toFixed(1)} A ∠${ikMinResult.angle.toFixed(1)}°`);
      kortslutningLines.push(`Ik,max = ${ikMaxResult.Ik.toFixed(1)} A ∠${ikMaxResult.angle.toFixed(1)}°`);
      kortslutningLines.push(`Udkoblingstid ved Ik,min: t ≈ ${tripTime.toFixed(4)} s`);

      calculationSteps.push({
        category: 'kortslutning',
        formula: 'Kortslutningsstrømme',
        variables: kortslutningLines.join('\n'),
        calculation: '',
        result: tripTime <= 5.0 ? `Ik,min = ${ikMinResult.Ik.toFixed(0)} A (tid OK ✓)` : `Ik,min = ${ikMinResult.Ik.toFixed(0)} A (tid > 5s ⚠)`
      });
      
      // === TERMISK KONTROL ===
      const termiskLines: string[] = ["=== Termisk kontrol (k²S² ≥ I²t) ==="];
      termiskLines.push(`k = ${k} (${material})`);
      termiskLines.push(`S = ${chosenSize} mm²`);
      termiskLines.push(`Ik,min = ${ikMinResult.Ik.toFixed(1)} A`);
      termiskLines.push(`Udkoblingstid: t ≈ ${tripTime.toFixed(4)} s`);
      termiskLines.push(`\nE_kabel = k²×S² = ${k}²×${chosenSize}² = ${thermal.Ekabel.toFixed(0)} A²s`);
      termiskLines.push(`E_bryde = I²×t = ${ikMinResult.Ik.toFixed(1)}²×${tripTime.toFixed(4)} = ${thermal.Ebryde.toFixed(0)} A²s`);
      termiskLines.push(`\n${thermal.ok ? '✓ E_kabel ≥ E_bryde - Termisk OK' : '✗ E_kabel < E_bryde - Termisk IKKE OK'}`);
      
      calculationSteps.push({
        category: 'kortslutning',
        formula: 'Termisk kontrol',
        variables: termiskLines.join('\n'),
        calculation: '',
        result: thermal.ok ? 'OK ✓' : 'IKKE OK ✗'
      });

      setServiceCableResults({
        chosenSize,
        IzNed,
        totalLength,
        totalVoltageDrop: totalVDrop,
        voltageDropPercent: totalVDropPercent,
        IkMin: ikMinResult.Ik,
        IkMinAngle: ikMinResult.angle,
        IkMax: ikMaxResult.Ik,
        IkMaxAngle: ikMaxResult.angle,
        thermalOk: thermal.ok,
        thermalE: thermal.Ekabel,
        thermalI2t: thermal.Ebryde,
        tripTime
      });
      
      // Send log
      if (onAddLog && calculationSteps.length > 0) {
        onAddLog(apartment.name, 'service', calculationSteps);
      }
    } catch (error) {
      console.error("Service cable calculation error:", error);
      setServiceCableResults(null);
    }
  };

  const power = calculateApartmentPower();
  const amps = power ? wattsToAmps(power, parseInt(apartment.voltage), apartment.phases, parseFloat(apartment.cosPhi.replace(",", "."))) : null;

  // Initialize service cable config if missing
  if (!apartment.serviceCable) {
    onUpdate({
      serviceCable: {
        fuseType: "Diazed gG",
        fuseRating: "35",
        material: "Cu",
        maxVoltageDrop: "1.0",
        ikTrafo: "16000",
        cosTrafo: "0.3",
        autoSize: true
      }
    });
  }

  // Auto-select fuse size has been disabled - users should manually select appropriate fuse size
  // based on the calculated total current displayed in the UI
  
  // Initialize service cable segments if missing
  if (!apartment.serviceCableSegments || apartment.serviceCableSegments.length === 0) {
    const loadedConductors = apartment.phases === "3-faset" ? 3 : 2;
    onUpdate({
      serviceCableSegments: [{
        installMethod: "C",
        length: 89,
        ambientTemp: 30,
        loadedConductors,
        crossSection: 50,
        cablesGrouped: 1,
        kt: 1.0,
        kgrp: 1.0,
      }]
    });
  }

  // Recalculate when service cable data changes
  useEffect(() => {
    calculateServiceCable();
  }, [
    apartment.serviceCable, 
    // Only recalculate on segment changes if autoSize is true
    ...(apartment.serviceCable?.autoSize ? [apartment.serviceCableSegments] : []),
    apartment.voltage, 
    apartment.phases, 
    apartment.cosPhi,
    apartment.dimensioningMethod,
    apartment.manualAmps,
    apartment.area_m2,
    apartment.loadType,
    apartment.W_watts,
    apartment.percentageExtra,
    apartment.individualServiceCableCalculationMethod,
    apartment.diversityFactor,
    apartment.manualServiceCableAmps
  ]);

  return (
    <div className="space-y-6">
      {!hideBackButton && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <CardTitle className="text-2xl">{apartment.name}</CardTitle>
                <CardDescription>Konfigurer lejlighedens grupper og stikledning</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="servicecable">Stikledning</TabsTrigger>
          <TabsTrigger value="groups">Grupper ({apartment.groups.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{apartment.unitType === "residential" ? "Lejlighedsoplysninger" : "Erhvervsoplysninger"}</CardTitle>
              <CardDescription>
                {apartment.unitType === "residential" 
                  ? "Angiv effektbehov for lejligheden" 
                  : "Angiv effektbehov for erhvervsenheden"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Navn</Label>
                <Input
                  value={apartment.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                />
              </div>

              {serviceCableMethod === "ladder" && (
                <div className="space-y-2">
                  <Label>Stikledning</Label>
                  <Select
                    value={apartment.sharedServiceCableId || "individual"}
                    onValueChange={(v) => {
                      if (v === "__add_new__") {
                        onAddSharedServiceCable?.();
                      } else {
                        onUpdate({ sharedServiceCableId: v === "individual" ? null : v });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individuel stikledning</SelectItem>
                      {sharedServiceCables.map(cable => (
                        <SelectItem key={cable.id} value={cable.id} className="pr-20">
                          <div className="flex items-center justify-between w-full">
                            <span>{cable.name}</span>
                            <div className="absolute right-2 flex items-center gap-3">
                              <button
                                className="hover:text-primary transition-colors p-1"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleEditCable(cable);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              {sharedServiceCables.length > 1 && (
                                <button
                                  className="hover:text-destructive transition-colors p-1"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteCable(cable);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="__add_new__" className="text-primary">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Tilføj ny fælles stikledning
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {apartment.sharedServiceCableId 
                      ? `Denne enhed er tilsluttet ${sharedServiceCables.find(c => c.id === apartment.sharedServiceCableId)?.name || 'fælles stikledning'}`
                      : "Denne enhed har sin egen separate stikledning"}
                  </p>
                </div>
              )}

              {/* Edit Dialog */}
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rediger stikledning</DialogTitle>
                    <DialogDescription>
                      Rediger navnet på den fælles stikledning
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Navn</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Fælles stikledning A"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                        }}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Annuller
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      Gem
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete Dialog */}
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Slet stikledning</AlertDialogTitle>
                    <AlertDialogDescription>
                      Er du sikker på at du vil slette "{selectedCable?.name}"?
                      {apartment.sharedServiceCableId === selectedCable?.id && (
                        <span className="block mt-2 text-amber-600 dark:text-amber-400">
                          Denne enhed bruger denne stikledning og vil blive sat til individuel stikledning.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuller</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Slet
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Hovedtavle inklusion */}
              <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id={`include-main-board-${apartment.id}`}
                    checked={apartment.includeInMainBoard ?? true}
                    onChange={(e) => onUpdate({ includeInMainBoard: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-border/50"
                  />
                  <div className="flex-1">
                    <Label htmlFor={`include-main-board-${apartment.id}`} className="cursor-pointer font-semibold">
                      Inkluder i hovedtavlen
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {apartment.includeInMainBoard ?? true 
                        ? "Enheden samles i hovedtavlen sammen med andre enheder"
                        : "Enheden har sin egen separate stikledning direkte fra transformatoren"}
                    </p>
                  </div>
                </div>
              </div>

              {apartment.unitType === "residential" && (
                <div className="space-y-2">
                  <Label>Dimensioneringsmetode</Label>
                  <Select
                    value={apartment.dimensioningMethod}
                    onValueChange={(v) => onUpdate({ dimensioningMethod: v as DimensioningMethod })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manuel (angiv ampere)</SelectItem>
                      <SelectItem value="area">Baseret på m² areal</SelectItem>
                      <SelectItem value="velander">Velander-formlen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {apartment.unitType === "residential" && apartment.dimensioningMethod === "manual" && (
                <div className="space-y-2">
                  <Label>Ampere</Label>
                  <Input
                    value={apartment.manualAmps || ""}
                    onChange={(e) => onUpdate({ manualAmps: e.target.value })}
                    placeholder="25"
                  />
                </div>
              )}

              {/* Areal felt - vises altid for erhverv, og for boliger når area-metoden bruges */}
              {(apartment.unitType === "commercial" || apartment.dimensioningMethod === "area") && (
                <>
                  <div className="space-y-2">
                    <Label>Areal (m²)</Label>
                    <Input
                      value={apartment.area_m2 || ""}
                      onChange={(e) => onUpdate({ area_m2: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Belastningstype</Label>
                    <Select
                      value={apartment.loadType || (apartment.unitType === "commercial" ? "detailhandel" : "bolig")}
                      onValueChange={(v) => onUpdate({ loadType: v as LoadType })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vælg type" />
                      </SelectTrigger>
                      <SelectContent>
                        {apartment.unitType === "residential" ? (
                          <SelectItem value="bolig">
                            {LOAD_TYPE_LABELS.bolig} ({LOAD_TYPES.bolig} W/m²)
                          </SelectItem>
                        ) : (
                          <>
                            <SelectItem value="supermarked">
                              {LOAD_TYPE_LABELS.supermarked} ({LOAD_TYPES.supermarked} W/m²)
                            </SelectItem>
                            <SelectItem value="detailhandel">
                              {LOAD_TYPE_LABELS.detailhandel} ({LOAD_TYPES.detailhandel} W/m²)
                            </SelectItem>
                            <SelectItem value="kontor">
                              {LOAD_TYPE_LABELS.kontor} ({LOAD_TYPES.kontor} W/m²)
                            </SelectItem>
                            <SelectItem value="lager">
                              {LOAD_TYPE_LABELS.lager} ({LOAD_TYPES.lager} W/m²)
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {apartment.unitType === "residential" && apartment.dimensioningMethod === "velander" && (
                <div className="space-y-2">
                  <Label>Gennemsnitlig energiforbrug pr. bolig (W)</Label>
                  <Input
                    value={apartment.W_watts || ""}
                    onChange={(e) => onUpdate({ W_watts: e.target.value })}
                    placeholder="4300"
                  />
                  <p className="text-xs text-muted-foreground">
                    Velander-formel: P_B = 0.24·W·n + 2.31·√(W·n) [kW]
                  </p>
                </div>
              )}

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tilslutning:</span>
                  <span className="font-semibold">3-faset 400V (L1, L2, L3, N)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>cos φ</Label>
                  <Input
                    value={apartment.cosPhi}
                    onChange={(e) => onUpdate({ cosPhi: e.target.value })}
                    placeholder="1.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>% tillæg</Label>
                  <Input
                    value={apartment.percentageExtra}
                    onChange={(e) => onUpdate({ percentageExtra: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              {power !== null && amps !== null && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <div className="text-sm font-semibold mb-2">Beregnet belastning</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Effekt:</span>
                      <Badge variant="secondary" className="ml-2">
                        {(power / 1000).toFixed(2)} kW
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Strøm:</span>
                      <Badge variant="secondary" className="ml-2">
                        {amps.toFixed(2)} A
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicecable" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stikledning</CardTitle>
              <CardDescription>
                {serviceCableMethod === "ladder" 
                  ? apartment.sharedServiceCableId 
                    ? `Tilsluttet ${sharedServiceCables.find(c => c.id === apartment.sharedServiceCableId)?.name || 'fælles stikledning'}`
                    : "Individuel stikledning for denne enhed"
                  : "Alle enheder har individuel stikledning"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Assignment Info */}
              {serviceCableMethod === "ladder" && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm font-medium mb-2">Tildeling</div>
                  {apartment.sharedServiceCableId ? (
                    <Badge variant="default" className="text-base">
                      {sharedServiceCables.find(c => c.id === apartment.sharedServiceCableId)?.name || 'Ukendt stikledning'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-base">
                      Individuel stikledning
                    </Badge>
                  )}
                </div>
              )}

              {/* Service Cable Configuration - always shown */}
              <div className="space-y-4">
                <div className="text-sm font-semibold">Input - stikledning</div>
                <p className="text-xs text-muted-foreground -mt-2">
                  {apartment.sharedServiceCableId 
                    ? "Indstillinger for fælles stikledning (fælles for alle tilsluttede enheder)"
                    : "Angiv hoveddata for stikledningen"}
                </p>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Sikringstype</Label>
                    {apartment.sharedServiceCableId ? (
                      <Select 
                        key={`fuse-type-shared-${apartment.id}`}
                        value={sharedServiceCables.find(c => c.id === apartment.sharedServiceCableId)?.fuseType || "Diazed gG"}
                        onValueChange={(v) => {
                          onUpdateSharedServiceCable?.(apartment.sharedServiceCableId!, { fuseType: v });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Diazed gG">Diazed gG</SelectItem>
                          <SelectItem value="Neozed gG">Neozed gG</SelectItem>
                          <SelectItem value="Knivsikring NH00">Knivsikring NH00</SelectItem>
                          <SelectItem value="Knivsikring NH0">Knivsikring NH0</SelectItem>
                          <SelectItem value="MCB B">MCB B</SelectItem>
                          <SelectItem value="MCB C">MCB C</SelectItem>
                          <SelectItem value="MCB D">MCB D</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select 
                        key={`fuse-type-individual-${apartment.id}`}
                        value={apartment.serviceCable?.fuseType || "Diazed gG"}
                        onValueChange={(v) => onUpdate({ 
                          serviceCable: { 
                            fuseType: v,
                            fuseRating: apartment.serviceCable?.fuseRating || "25",
                            material: apartment.serviceCable?.material || "Cu",
                            maxVoltageDrop: apartment.serviceCable?.maxVoltageDrop || "1.0",
                            ikTrafo: apartment.serviceCable?.ikTrafo || "16000",
                            cosTrafo: apartment.serviceCable?.cosTrafo || "0.3",
                            autoSize: apartment.serviceCable?.autoSize !== undefined ? apartment.serviceCable.autoSize : true,
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Diazed gG">Diazed gG</SelectItem>
                          <SelectItem value="Neozed gG">Neozed gG</SelectItem>
                          <SelectItem value="Knivsikring NH00">Knivsikring NH00</SelectItem>
                          <SelectItem value="Knivsikring NH0">Knivsikring NH0</SelectItem>
                          <SelectItem value="MCB B">MCB B</SelectItem>
                          <SelectItem value="MCB C">MCB C</SelectItem>
                          <SelectItem value="MCB D">MCB D</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Sikringsstørrelse Kabelskab [A] In</Label>
                    <Select
                      key={`fuse-rating-${apartment.id}`}
                      value={apartment.serviceCable?.fuseRating || "35"}
                      onValueChange={(v) => onUpdate({ 
                        serviceCable: {
                          fuseType: apartment.serviceCable?.fuseType || "Diazed gG",
                          fuseRating: v,
                          material: apartment.serviceCable?.material || "Cu",
                          maxVoltageDrop: apartment.serviceCable?.maxVoltageDrop || "1.0",
                          ikTrafo: apartment.serviceCable?.ikTrafo || "16000",
                          cosTrafo: apartment.serviceCable?.cosTrafo || "0.3",
                          autoSize: apartment.serviceCable?.autoSize !== undefined ? apartment.serviceCable.autoSize : true,
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STANDARD_FUSE_SIZES.map(size => (
                          <SelectItem key={size} value={size.toString()}>
                            {size} A
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Netspænding [V] Un</Label>
                    <Select
                      value={apartment.voltage.toString()}
                      onValueChange={(v) => onUpdate({ voltage: v as "230" | "400" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="230">230 V</SelectItem>
                        <SelectItem value="400">400 V</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fasesystem</Label>
                    <Select
                      value={apartment.phases}
                      onValueChange={(v) => onUpdate({ phases: v as "1-faset" | "3-faset" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-faset">1-faset</SelectItem>
                        <SelectItem value="3-faset">3-faset</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Materiale</Label>
                    {apartment.sharedServiceCableId ? (
                      <Select 
                        key={`material-shared-${apartment.id}`}
                        value={sharedServiceCables.find(c => c.id === apartment.sharedServiceCableId)?.material || "Cu"}
                        onValueChange={(v) => {
                          onUpdateSharedServiceCable?.(apartment.sharedServiceCableId!, { material: v as Material });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cu">Kobber (Cu)</SelectItem>
                          <SelectItem value="Al">Aluminium (Al)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select 
                        key={`material-individual-${apartment.id}`}
                        value={apartment.serviceCable?.material || "Cu"}
                        onValueChange={(v) => onUpdate({ 
                          serviceCable: {
                            fuseType: apartment.serviceCable?.fuseType || "Diazed gG",
                            fuseRating: apartment.serviceCable?.fuseRating || "25",
                            material: v as Material,
                            maxVoltageDrop: apartment.serviceCable?.maxVoltageDrop || "1.0",
                            ikTrafo: apartment.serviceCable?.ikTrafo || "16000",
                            cosTrafo: apartment.serviceCable?.cosTrafo || "0.3",
                            autoSize: apartment.serviceCable?.autoSize !== undefined ? apartment.serviceCable.autoSize : true,
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cu">Kobber (Cu)</SelectItem>
                          <SelectItem value="Al">Aluminium (Al)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>cos φ (last)</Label>
                    <Input
                      type="text"
                      value={apartment.cosPhi}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.');
                        onUpdate({ cosPhi: value });
                      }}
                      onBlur={(e) => {
                        if (!e.target.value.trim()) {
                          onUpdate({ cosPhi: "1.0" });
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Maks Spændingsfald stikledning [%]</Label>
                    {apartment.sharedServiceCableId ? (
                      <Input
                        type="text"
                        placeholder="1.0"
                        value={sharedServiceCables.find(c => c.id === apartment.sharedServiceCableId)?.maxVoltageDrop ?? "1.0"}
                        onChange={(e) => {
                          const value = e.target.value.replace(',', '.');
                          onUpdateSharedServiceCable?.(apartment.sharedServiceCableId!, { maxVoltageDrop: value });
                        }}
                        onBlur={(e) => {
                          if (!e.target.value.trim()) {
                            onUpdateSharedServiceCable?.(apartment.sharedServiceCableId!, { maxVoltageDrop: "1.0" });
                          }
                        }}
                      />
                    ) : (
                      <Input
                        type="text"
                        placeholder="1.0"
                        value={apartment.serviceCable?.maxVoltageDrop ?? ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(',', '.');
                          onUpdate({ 
                            serviceCable: {
                              fuseType: apartment.serviceCable?.fuseType || "Diazed gG",
                              fuseRating: apartment.serviceCable?.fuseRating || "25",
                              material: apartment.serviceCable?.material || "Cu",
                              maxVoltageDrop: value,
                              ikTrafo: apartment.serviceCable?.ikTrafo || "16000",
                              cosTrafo: apartment.serviceCable?.cosTrafo || "0.3",
                              autoSize: apartment.serviceCable?.autoSize !== undefined ? apartment.serviceCable.autoSize : true,
                            }
                          });
                        }}
                        onBlur={(e) => {
                          if (!e.target.value.trim()) {
                            onUpdate({ 
                              serviceCable: {
                                fuseType: apartment.serviceCable?.fuseType || "Diazed gG",
                                fuseRating: apartment.serviceCable?.fuseRating || "25",
                                material: apartment.serviceCable?.material || "Cu",
                                maxVoltageDrop: "1.0",
                                ikTrafo: apartment.serviceCable?.ikTrafo || "16000",
                                cosTrafo: apartment.serviceCable?.cosTrafo || "0.3",
                                autoSize: apartment.serviceCable?.autoSize !== undefined ? apartment.serviceCable.autoSize : true,
                              }
                            });
                          }
                        }}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Ikmax Trafo [A]</Label>
                    {apartment.sharedServiceCableId ? (
                      <Input
                        type="number"
                        placeholder="16000"
                        value={sharedServiceCables.find(c => c.id === apartment.sharedServiceCableId)?.ikTrafo || "16000"}
                        onChange={(e) => {
                          onUpdateSharedServiceCable?.(apartment.sharedServiceCableId!, { ikTrafo: e.target.value });
                        }}
                      />
                    ) : (
                      <Input
                        type="number"
                        placeholder="16000"
                        value={apartment.serviceCable?.ikTrafo || "16000"}
                        onChange={(e) => onUpdate({ 
                          serviceCable: {
                            fuseType: apartment.serviceCable?.fuseType || "Diazed gG",
                            fuseRating: apartment.serviceCable?.fuseRating || "25",
                            material: apartment.serviceCable?.material || "Cu",
                            maxVoltageDrop: apartment.serviceCable?.maxVoltageDrop || "1.0",
                            ikTrafo: e.target.value,
                            cosTrafo: apartment.serviceCable?.cosTrafo || "0.3",
                            autoSize: apartment.serviceCable?.autoSize !== undefined ? apartment.serviceCable.autoSize : true,
                          }
                        })}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>cos φ trafo</Label>
                    {apartment.sharedServiceCableId ? (
                      <Input
                        type="number"
                        placeholder="0.3"
                        value={sharedServiceCables.find(c => c.id === apartment.sharedServiceCableId)?.cosTrafo || "0.3"}
                        onChange={(e) => {
                          onUpdateSharedServiceCable?.(apartment.sharedServiceCableId!, { cosTrafo: e.target.value });
                        }}
                      />
                    ) : (
                      <Input
                        type="number"
                        placeholder="0.3"
                        value={apartment.serviceCable?.cosTrafo || "0.3"}
                        onChange={(e) => onUpdate({ 
                          serviceCable: {
                            fuseType: apartment.serviceCable?.fuseType || "Diazed gG",
                            fuseRating: apartment.serviceCable?.fuseRating || "25",
                            material: apartment.serviceCable?.material || "Cu",
                            maxVoltageDrop: apartment.serviceCable?.maxVoltageDrop || "1.0",
                            ikTrafo: apartment.serviceCable?.ikTrafo || "16000",
                            cosTrafo: e.target.value,
                            autoSize: apartment.serviceCable?.autoSize !== undefined ? apartment.serviceCable.autoSize : true,
                          }
                        })}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Auto tværsnit</Label>
                    <Select 
                      value={apartment.serviceCable?.autoSize ? "auto" : "manual"}
                      onValueChange={(v) => onUpdate({ 
                        serviceCable: {
                          fuseType: apartment.serviceCable?.fuseType || "Diazed gG",
                          fuseRating: apartment.serviceCable?.fuseRating || "25",
                          material: apartment.serviceCable?.material || "Cu",
                          maxVoltageDrop: apartment.serviceCable?.maxVoltageDrop || "1.0",
                          ikTrafo: apartment.serviceCable?.ikTrafo || "16000",
                          cosTrafo: apartment.serviceCable?.cosTrafo || "0.3",
                          autoSize: v === "auto",
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Ja (auto)</SelectItem>
                        <SelectItem value="manual">Nej (manuelt)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Cable Routing Method */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Kabel fremføringsmetode</div>
                    <p className="text-xs text-muted-foreground">
                      Definer segmenter og deres installationsmetode
                    </p>
                  </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const loadedConductors = apartment.phases === "3-faset" ? 3 : 2;
                          const segments = apartment.serviceCableSegments || [];
                          onUpdate({ 
                            serviceCableSegments: [...segments, {
                              installMethod: "C",
                              length: 50,
                              ambientTemp: 30,
                              loadedConductors,
                              crossSection: 50,
                              cablesGrouped: 1,
                              kt: 1.0,
                              kgrp: 1.0,
                            }] 
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Segment af kabel
                      </Button>
                </div>

                {(apartment.serviceCableSegments || [createDefaultSegment()]).map((seg, idx) => (
                  <div key={idx} className="relative">
                     <SegmentInput
                      segment={seg}
                      onChange={(data) => {
                        const segments = [...(apartment.serviceCableSegments || [createDefaultSegment()])];
                        segments[idx] = { ...segments[idx], ...data };
                        onUpdate({ serviceCableSegments: segments });
                      }}
                      phases={apartment.phases}
                    />
                    {(apartment.serviceCableSegments?.length || 1) > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          const segments = apartment.serviceCableSegments || [createDefaultSegment()];
                          onUpdate({ 
                            serviceCableSegments: segments.filter((_, i) => i !== idx) 
                          });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                 ))}
              </div>

              {/* Manual calculation button */}
              {!apartment.serviceCable?.autoSize && (
                <div className="flex justify-center pt-2">
                  <Button onClick={calculateServiceCable} variant="default">
                    <Calculator className="h-4 w-4 mr-2" />
                    Beregn
                  </Button>
                </div>
              )}

              {/* Results Section */}
              {serviceCableResults && (
                <Card className="border-2 border-primary">
                  <CardHeader>
                    <CardTitle>Resultater – stikledning</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-8">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Værste Iz,ned:</div>
                        <div className="text-xl font-bold">{serviceCableResults.IzNed.toFixed(1)} A</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Kabeltværsnit:</div>
                        <div className="text-xl font-bold">{serviceCableResults.chosenSize} mm²</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Samlet længde:</div>
                        <div className="text-xl font-bold">{serviceCableResults.totalLength.toFixed(1)} m</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mt-6">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Spændingsfald:</div>
                        <div className="text-xl font-bold">
                          {serviceCableResults.totalVoltageDrop.toFixed(2)} V ({serviceCableResults.voltageDropPercent.toFixed(2)} %)
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">KB-termisk:</div>
                        <div className="text-xl font-bold">
                          {serviceCableResults.thermalOk ? '✓ OK' : '✗ Ikke OK'}
                          <span className="text-sm ml-2">
                            ({serviceCableResults.thermalE.toFixed(0)} &gt; {serviceCableResults.thermalI2t.toFixed(0)})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mt-6">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Ik_min (tavle):</div>
                        <div className="text-xl font-bold">
                          {formatCurrentWithAngle(serviceCableResults.IkMin, serviceCableResults.IkMinAngle)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Ik_max (tavle):</div>
                        <div className="text-xl font-bold">
                          {formatCurrentWithAngle(serviceCableResults.IkMax, serviceCableResults.IkMaxAngle)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="text-xs text-muted-foreground mb-1">Udkoblingstid t [s]:</div>
                      <div className="flex items-center gap-3">
                        <div className="text-xl font-bold">{serviceCableResults.tripTime.toFixed(2)}</div>
                        {serviceCableResults.tripTime > 5.0 && (
                          <Badge variant="destructive" className="text-sm">
                            ⚠ Overstiger 5s maksimum
                          </Badge>
                        )}
                      </div>
                      {serviceCableResults.tripTime > 5.0 && (
                        <div className="mt-2 p-3 bg-destructive/10 rounded-lg text-sm">
                          <p className="font-semibold text-destructive mb-1">Udkoblingstiden er for lang!</p>
                          <p className="text-muted-foreground">
                            For at reducere udkoblingstiden:
                          </p>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li>Reducer kabellængden</li>
                            <li>Øg kabeltværsnit for at reducere impedans</li>
                            <li>Overvej MCB (automatsikring) i stedet for gG sikring</li>
                            <li>Reducer sikringsstørrelse hvis muligt</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Grupper</CardTitle>
                  <CardDescription>Konfigurer lejlighedens elektriske grupper</CardDescription>
                </div>
                <Button onClick={addGroup} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Tilføj gruppe
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {apartment.groups.map((group, idx) => (
                <Card key={group.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Input
                        value={group.name}
                        onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                        className="font-semibold w-32"
                      />
                      {apartment.groups.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeGroup(group.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>In (A)</Label>
                        <Input
                          value={group.In}
                          onChange={(e) => updateGroup(group.id, { In: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fasesystem</Label>
                        <Select
                          value={group.phase}
                          onValueChange={(v) => updateGroup(group.id, { phase: v as PhaseSystem })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-faset">1-faset</SelectItem>
                            <SelectItem value="3-faset">3-faset</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Segmenter</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addSegmentToGroup(group.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Tilføj
                        </Button>
                      </div>
                      {group.segments.map((seg, segIdx) => (
                        <div key={segIdx} className="relative">
                          <SegmentInput
                            segment={seg}
                            onChange={(data) => updateGroupSegment(group.id, segIdx, data)}
                          />
                          {group.segments.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={() => removeSegmentFromGroup(group.id, segIdx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
