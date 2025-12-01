import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SegmentInput } from "./SegmentInput";
import type { SegmentData } from "@/lib/calculations";
import { lookupIz, voltageDropDs, getCableImpedancePerKm, ikMinGroup, ikMaxStik, thermalOk } from "@/lib/calculations";
import { autoSelectGroupCableSize } from "@/lib/groupCalculations";
import { getFuseData, fuseTripTimeExplain, DIAZED_SIZES, DIAZED_D2D3D4_SIZES, NEOZED_SIZES, KNIV_SIZES, NH00_SIZES, NH0_SIZES, NH1_SIZES, MCB_SIZES, autoSelectMcbType } from "@/lib/fuseCurves";

// Helper to check if fuse type uses absolute Ik values instead of multiplier
const usesAbsoluteIk = (fuseType: string): boolean => {
  return fuseType === "Diazed gG" || 
         fuseType === "Diazed D2/D3/D4" ||
         fuseType === "Neozed gG" || 
         fuseType === "Knivsikring gG" ||
         fuseType === "Knivsikring NH00" ||
         fuseType === "Knivsikring NH0" ||
         fuseType === "Knivsikring NH1";
};

// Helper to check if fuse is a melt fuse (not MCB)
const isMeltFuse = (fuseType: string): boolean => {
  return fuseType === "Diazed gG" || 
         fuseType === "Diazed D2/D3/D4" ||
         fuseType === "Neozed gG" || 
         fuseType === "Knivsikring gG" ||
         fuseType === "Knivsikring NH00" ||
         fuseType === "Knivsikring NH0" ||
         fuseType === "Knivsikring NH1";
};
import type { CalculationStep } from "./CableCalculator";
import { useProject } from "@/contexts/ProjectContext";

interface GroupsTabProps {
  addLog: (title: string, type: 'service' | 'group', steps: CalculationStep[]) => void;
  serviceData?: any;
}

type PhaseSystem = "1-faset" | "3-faset";
type Material = "Cu" | "Al";

interface Group {
  id: string;
  name: string;
  In: string;
  fuseType: string;
  phase: PhaseSystem;
  selectedPhase?: "L1" | "L2" | "L3"; // For 1-phase groups
  material: Material;
  cosPhi: string;
  maxVoltageDrop: string;
  KjJord: string;
  autoSize: boolean;
  segments: SegmentData[];
  results?: GroupResults;
  mainFuseIn?: string; // Hovedsikring fra forsyning (default 35A)
}

interface GroupResults {
  netVoltage: number;
  chosenSize: number | null;
  totalVoltageDropPercent: number;
  totalLength: number;
  allSegmentsOk: boolean;
  selectedMcbType?: string; // Actual MCB type chosen when "MCB automatisk" is used
  IkMin?: number;
  IkMinAngle?: number;
  IkMax?: number;
  IkMaxAngle?: number;
  tripTime?: number;
}

const createDefaultSegment = (): SegmentData => ({
  installMethod: "C",
  length: 1,
  ambientTemp: 30,
  loadedConductors: 2, // Default til 1-faset
  crossSection: 2.5,
  cablesGrouped: 1,
  kt: 1.0,
  kgrp: 1.0,
  insulationType: "XLPE",
});

const createDefaultGroup = (index: number, autoPhase?: "L1" | "L2" | "L3"): Group => ({
  id: `group-${Date.now()}-${index}`,
  name: `W${index + 1}`,
  In: "10",
  fuseType: "MCB B",
  phase: "1-faset", // Default til 1-faset
  selectedPhase: autoPhase || "L2", // Auto-assigned or default phase
  material: "Cu",
  cosPhi: "1.0",
  maxVoltageDrop: "5.0",
  KjJord: "1.0",
  autoSize: true,
  segments: [createDefaultSegment()],
  mainFuseIn: "35", // Standard hovedsikring
});

export function GroupsTab({ addLog, serviceData }: GroupsTabProps) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id || 'default';
  const storageKey = `groups-tab-state-${projectId}`;
  
  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Fix loadedConductors for saved data based on phase
        // Also ensure fuseType and selectedPhase exist for backwards compatibility
        return parsed.map((g: Group, index: number) => {
          // Auto-assign phase for old data without selectedPhase
          const onePhasedGroupsBefore = parsed.slice(0, index).filter((gr: Group) => gr.phase === "1-faset");
          const phaseRotation: ("L1" | "L2" | "L3")[] = ["L1", "L2", "L3"];
          const autoPhase = phaseRotation[onePhasedGroupsBefore.length % 3];
          
          return {
            ...g,
            fuseType: g.fuseType || "MCB B", // Default fuseType if missing
            mainFuseIn: g.mainFuseIn || "35", // Default hovedsikring if missing
            selectedPhase: g.phase === "1-faset" ? (g.selectedPhase || autoPhase) : undefined, // Auto-assign if missing
            segments: g.segments.map(seg => ({
              ...seg,
              loadedConductors: g.phase === "3-faset" ? 3 : 2
            }))
          };
        });
      } catch {
        return [createDefaultGroup(0, "L1")];
      }
    }
    return [createDefaultGroup(0, "L1")];
  });

  const isCalculatingRef = useRef(false);
  const prevInputsRef = useRef<string>('');
  const hasCalculatedOnceRef = useRef(false);

  // Save to localStorage whenever groups change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(groups));
  }, [groups]);

  // Initial calculation on mount - also corrects any legacy data
  useEffect(() => {
    if (!hasCalculatedOnceRef.current) {
      hasCalculatedOnceRef.current = true;
      // Fix any groups that might have wrong loadedConductors or missing fuseType
      setGroups(prev => prev.map(g => ({
        ...g,
        fuseType: g.fuseType || "MCB B", // Ensure fuseType exists
        segments: g.segments.map(seg => ({
          ...seg,
          loadedConductors: g.phase === "3-faset" ? 3 : 2
        }))
      })));
      setTimeout(() => calculateGroups(), 100);
    }
  }, []);

  // Auto-calculate when inputs change (with debounce)
  useEffect(() => {
    // Create a hash of inputs only (not results)
    const inputsHash = JSON.stringify(groups.map(g => ({
      id: g.id,
      name: g.name,
      In: g.In,
      phase: g.phase,
      material: g.material,
      cosPhi: g.cosPhi,
      maxVoltageDrop: g.maxVoltageDrop,
      KjJord: g.KjJord,
      autoSize: g.autoSize,
      segments: g.segments.map(s => ({
        installMethod: s.installMethod,
        length: s.length,
        ambientTemp: s.ambientTemp,
        loadedConductors: s.loadedConductors,
        cablesGrouped: s.cablesGrouped,
        kt: s.kt,
        kgrp: s.kgrp,
        // Exclude crossSection when autoSize is on, include it when off
        ...(!g.autoSize && { crossSection: s.crossSection })
      }))
    })));
    
    // Only calculate if inputs actually changed
    if (inputsHash === prevInputsRef.current) return;
    prevInputsRef.current = inputsHash;
    
    const timer = setTimeout(() => {
      calculateGroups();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [groups]);

  const addGroup = () => {
    // Count existing 1-phase groups to determine next phase
    const onePhasedGroups = groups.filter(g => g.phase === "1-faset");
    const phaseRotation: ("L1" | "L2" | "L3")[] = ["L1", "L2", "L3"];
    const nextPhase = phaseRotation[onePhasedGroups.length % 3];
    
    const newGroup = createDefaultGroup(groups.length, nextPhase);
    setGroups((prev) => [...prev, newGroup]);
  };

  const removeGroup = (id: string) => {
    setGroups((prev) => (prev.length <= 1 ? prev : prev.filter((g) => g.id !== id)));
  };

  const updateGroup = (id: string, data: Partial<Group>) => {
    setGroups((prev) => {
      return prev.map((g) => {
        if (g.id !== id) return g;
        
        const updated = { ...g, ...data };
        
        // Hvis fasesystem ændres, opdater sikringsstørrelse automatisk
        if (data.phase) {
          updated.In = data.phase === "3-faset" ? "16" : "10";
          // Opdater også loadedConductors i alle segmenter
          const correctConductors = data.phase === "3-faset" ? 3 : 2;
          updated.segments = updated.segments.map(seg => ({
            ...seg,
            loadedConductors: correctConductors
          }));
        }
        
        return updated;
      });
    });
  };

  const updateGroupSegment = (groupId: string, index: number, data: Partial<SegmentData>) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const segments = [...g.segments];
        segments[index] = { ...segments[index], ...data };
        return { ...g, segments };
      }),
    );
  };

  const addSegmentToGroup = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, segments: [...g.segments, createDefaultSegment()] } : g,
      ),
    );
  };

  const removeSegmentFromGroup = (groupId: string, index: number) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (g.segments.length <= 1) return g;
        const segments = g.segments.filter((_, i) => i !== index);
        return { ...g, segments };
      }),
    );
  };

  const deleteGroup = (id: string) => {
    if (groups.length === 1) {
      toast.error("Kan ikke slette den eneste gruppe");
      return;
    }
    const newGroups = groups.filter((g) => g.id !== id);
    setGroups(newGroups);
  };

  const calculateGroups = () => {
    if (isCalculatingRef.current) return;
    isCalculatingRef.current = true;

    try {
      const allSteps: CalculationStep[][] = [];

      const updatedGroups: Group[] = groups.map((group, idx) => {
        const steps: CalculationStep[] = [];
        
        // Beregn netspænding automatisk baseret på fasesystem
        const Uv = group.phase === "3-faset" ? 400 : 230;

        const In = parseFloat(group.In.replace(",", "."));
        const cos = parseFloat(group.cosPhi.replace(",", "."));
        const duMax = parseFloat(group.maxVoltageDrop.replace(",", "."));
        const KjJord = parseFloat(group.KjJord.replace(",", ".") || "1.0");

        let groupResults: GroupResults = {
          netVoltage: Uv,
          chosenSize: null,
          totalVoltageDropPercent: 0,
          totalLength: 0,
          allSegmentsOk: true,
        };

        if (![In, cos, duMax, KjJord].every((v) => isFinite(v))) {
          return group;
        }

        const activeSegments = group.segments.filter((s) => s.length > 0);
        groupResults.totalLength = activeSegments.reduce((sum, s) => sum + s.length, 0);
        
        if (activeSegments.length === 0) {
          return { ...group, results: groupResults };
        }

        let newGroup = group;
        let chosenSq = 0;

        if (group.autoSize) {
          const segInputs = activeSegments.map((s) => ({
            refMethod: s.installMethod,
            length: s.length,
            cores: s.loadedConductors,
            kt: s.kt,
            kgrp: s.kgrp,
          }));

          const { chosenSize, totalVoltageDropPercent } = autoSelectGroupCableSize(
            In,
            Uv,
            group.material,
            group.phase,
            cos,
            duMax,
            KjJord,
            segInputs,
          );

          if (!chosenSize) {
            groupResults.allSegmentsOk = false;
          } else {
            chosenSq = chosenSize;
            groupResults.chosenSize = chosenSize;
            groupResults.totalVoltageDropPercent = totalVoltageDropPercent;

            const segments = group.segments.map((seg) =>
              seg.length > 0 ? { ...seg, crossSection: chosenSize } : seg,
            );

            newGroup = { ...group, segments };

            // Step 1: Auto tværsnitsvalg
            steps.push({
              category: 'overbelastning',
              formula: "Auto tværsnitsvalg (Iz-kontrol + spændingsfaldskontrol)",
              variables: `In,gruppe = ${In.toFixed(1)} A\nMaterial = ${group.material}\nFasesystem = ${group.phase}\nΔU_max = ${duMax.toFixed(2)}%`,
              calculation: `Tester standardstørrelser og vælger mindste der opfylder:\n- Iz,korr ≥ In for alle segmenter\n- ΔU_total ≤ ${duMax.toFixed(2)}%`,
              result: `Valgt tværsnit: ${chosenSize.toFixed(1)} mm²`
            });

            // Detaljeret Iz-kontrol for hvert segment
            for (let i = 0; i < activeSegments.length; i++) {
              const seg = activeSegments[i];
              const iz = lookupIz(group.material, seg.installMethod, chosenSize, seg.loadedConductors, seg.insulationType || "XLPE");
              const env = seg.installMethod.startsWith("D") ? "jord" : "luft";
              const Kj = env === "jord" ? KjJord : 1.0;
              const IzCorr = iz * seg.kt * Kj * seg.kgrp;

              steps.push({
                category: 'overbelastning',
                formula: `Overbelastningsbeskyttelse - Segment ${i + 1}`,
                variables: `Iz,20°C = ${iz.toFixed(1)} A (fra tabel)\nKt = ${seg.kt.toFixed(2)}\nKj = ${Kj.toFixed(2)}\nKgrp = ${seg.kgrp.toFixed(2)}\nIn = ${In.toFixed(1)} A`,
                calculation: `Iz,korr = Iz,20°C × Kt × Kj × Kgrp\nIz,korr = ${iz.toFixed(1)} × ${seg.kt.toFixed(2)} × ${Kj.toFixed(2)} × ${seg.kgrp.toFixed(2)}`,
                result: `Iz,korr = ${IzCorr.toFixed(1)} A\n${In <= IzCorr ? '✓' : '✗'} In ≤ Iz,korr (${In.toFixed(1)} A ≤ ${IzCorr.toFixed(1)} A)`
              });
            }

            // Detaljeret spændingsfaldsberegning
            let duTotalCalc = 0;
            const duSegments: string[] = [];
            for (let i = 0; i < activeSegments.length; i++) {
              const seg = activeSegments[i];
              const { du, duPercent } = voltageDropDs(Uv, In, group.material, chosenSize, seg.length, group.phase, cos);
              duTotalCalc += du;
              duSegments.push(`Segment ${i + 1}: ΔU = ${du.toFixed(2)} V (${duPercent.toFixed(2)}%)`);
              
              steps.push({
                category: 'spændingsfald',
                formula: `Spændingsfald - Segment ${i + 1}`,
                variables: `L = ${seg.length.toFixed(1)} m\nS = ${chosenSize.toFixed(1)} mm²\nI = ${In.toFixed(1)} A\ncos φ = ${cos.toFixed(2)}\nMaterial = ${group.material}\nFase = ${group.phase}`,
                calculation: `ΔU = k × L × I / S (forenklet DS-formel)\nk = materialekonstant`,
                result: `ΔU = ${du.toFixed(2)} V (${duPercent.toFixed(2)}%)`
              });
            }
            
            steps.push({
              category: 'spændingsfald',
              formula: "Total spændingsfald",
              variables: duSegments.join('\n'),
              calculation: `ΔU_total = ${duSegments.length > 1 ? 'Σ ΔU_segmenter' : 'ΔU_segment1'}`,
              result: `ΔU_total = ${duTotalCalc.toFixed(2)} V (${totalVoltageDropPercent.toFixed(2)}%)\n${totalVoltageDropPercent <= duMax ? '✓' : '✗'} ΔU ≤ ${duMax.toFixed(2)}%`
            });
          }
        } else {
          // Manuel tværsnit
          const areas = new Set(activeSegments.map((s) => s.crossSection));
          if (areas.size !== 1) {
            groupResults.allSegmentsOk = false;
          } else {
            chosenSq = [...areas][0];
            groupResults.chosenSize = chosenSq;

            // === SEGMENTDATA ===
            const segmentDataLines: string[] = ["=== Segmentdata ==="];
            activeSegments.forEach((seg, i) => {
              const env = seg.installMethod.startsWith("D") ? "jord" : "luft";
              segmentDataLines.push(`Segment ${i + 1}: Ref=${seg.installMethod} (${env}), L=${seg.length}m, T=${seg.ambientTemp}°C, S=${chosenSq}mm², Leder=${seg.loadedConductors}, Kt=${seg.kt.toFixed(3)}, Kj=1.000, Kgrp=${seg.kgrp.toFixed(3)}`);
            });
            
            steps.push({
              category: 'overbelastning',
              formula: "Segmentdata",
              variables: segmentDataLines.join("\n"),
              calculation: "",
              result: `Valgt tværsnit: ${chosenSq.toFixed(1)} mm²`
            });

            // === IZ,NØDVENDIG BEREGNING ===
            const izNødvendigLines: string[] = ["=== Iz,nødvendig beregning ==="];
            let allOk = true;
            
            for (let i = 0; i < activeSegments.length; i++) {
              const s = activeSegments[i];
              const env = s.installMethod.startsWith("D") ? "jord" : "luft";
              const Kj = env === "jord" ? KjJord : 1.0;
              
              const izNødvendig = In / (s.kt * Kj * s.kgrp);
              izNødvendigLines.push(`Segment ${i + 1}: Iz,nødvendig = ${In.toFixed(2)} / (${s.kt.toFixed(3)} × ${Kj.toFixed(3)} × ${s.kgrp.toFixed(3)}) = ${izNødvendig.toFixed(2)} A`);
            }
            
            steps.push({
              category: 'overbelastning',
              formula: "Iz,nødvendig beregning",
              variables: izNødvendigLines.join("\n"),
              calculation: "",
              result: ""
            });

            // === IZ,KORRIGERET FOR VALGT KABEL ===
            const izKorrigeretLines: string[] = ["=== Iz,korrigeret for valgt kabel ===", `Valgt tværsnit: ${chosenSq} mm²`];
            let duTotal = 0;
            
            for (let i = 0; i < activeSegments.length; i++) {
              const s = activeSegments[i];
              const iz = lookupIz(group.material, s.installMethod, chosenSq, s.loadedConductors, s.insulationType || "XLPE");
              const env = s.installMethod.startsWith("D") ? "jord" : "luft";
              const Kj = env === "jord" ? KjJord : 1.0;
              const IzCorr = iz * s.kt * Kj * s.kgrp;
              
              if (In > IzCorr) {
                allOk = false;
              }
              
              izKorrigeretLines.push(`Segment ${i + 1}: Iz,korrigeret = ${iz.toFixed(2)} × ${s.kt.toFixed(3)} × ${Kj.toFixed(3)} × ${s.kgrp.toFixed(3)} = ${IzCorr.toFixed(2)} A ≥ In = ${In.toFixed(2)} A ${In <= IzCorr ? '✓' : '✗'}`);

              const { du, duPercent } = voltageDropDs(
                Uv,
                In,
                group.material,
                chosenSq,
                s.length,
                group.phase,
                cos,
              );
              duTotal += du;
            }
            
            const duPct = (duTotal / Uv) * 100;
            groupResults.totalVoltageDropPercent = duPct;
            groupResults.allSegmentsOk = allOk && duPct <= duMax;
            
            izKorrigeretLines.push(`\n${allOk ? 'Kabel godkendt for overbelastning ✓' : 'Kabel IKKE godkendt for overbelastning ✗'}`);

            steps.push({
              category: 'overbelastning',
              formula: "Iz,korrigeret for valgt kabel",
              variables: izKorrigeretLines.join("\n"),
              calculation: "",
              result: allOk ? 'OK ✓' : 'IKKE OK ✗'
            });

            // === SPÆNDINGSFALD ===
            steps.push({
              category: 'spændingsfald',
              formula: "Total spændingsfald",
              variables: `ΔU_total = ${duTotal.toFixed(2)} V\nΔU% = ${duPct.toFixed(2)}%`,
              calculation: `Maks tilladte spændingsfald: ${duMax.toFixed(2)}%`,
              result: `${duPct <= duMax ? '✓' : '✗'} ΔU = ${duPct.toFixed(2)}% ${duPct <= duMax ? '≤' : '>'} ${duMax.toFixed(2)}%`
            });
          }
        }

        // MCB automatisk valg
        if (group.fuseType === "MCB automatisk") {
          const firstSegment = activeSegments[0];
          const selectedMcbType = autoSelectMcbType(
            firstSegment?.installMethod || "C", 
            In
          );
          newGroup = { ...newGroup, fuseType: selectedMcbType };
          groupResults.selectedMcbType = selectedMcbType;

          steps.push({
            category: 'overbelastning',
            formula: "MCB Automatisk Valg",
            variables: `In = ${group.In} A`,
            calculation: `Vælger standard MCB type baseret på In.`,
            result: `Valgt type: ${selectedMcbType}`
          });
        }

        // Kortslutnings- og termiske beregninger (hvis serviceData er tilgængelig og tværsnit er valgt)
        if (serviceData && chosenSq > 0) {
          try {
            // Beregn gruppens impedans
            const totalLengthM = groupResults.totalLength;
            const ZperKmMin = getCableImpedancePerKm(chosenSq, group.material, group.phase);
            const ZperKmMax = getCableImpedancePerKm(chosenSq, group.material, group.phase);
            
            // Total impedans for gruppen (min og max)
            // For Ik,min: R × 1.5 (varmt kabel), X × 1.0
            // For Ik,max: R × 1.0 (koldt kabel), X × 1.0
            const lengthKm = totalLengthM / 1000;
            const ZgroupMin = { R: ZperKmMin.R * lengthKm * 1.5, X: ZperKmMin.X * lengthKm };
            const ZgroupMax = { R: ZperKmMax.R * lengthKm * 1.0, X: ZperKmMax.X * lengthKm };

            // Hent stikledningens data
            const ZstikMin = serviceData.ZkabelMin || { R: 0, X: 0 };
            const ZstikMax = serviceData.ZkabelMax || { R: 0, X: 0 };
            const IkTrafo = parseFloat(serviceData.ikTrafo || "10000");
            const cosTrafo = parseFloat(serviceData.cosTrafo || "0.2");
            
            // Beregn Imin Supply - brug Ik,min fra tavlen (stikledning)
            // For grupper skal IminSupply være Ik,min ved tavlen, IKKE gruppesikringens IminFactor
            const mainIn = parseFloat(group.mainFuseIn || "35");
            const { IminFactor } = getFuseData("Standard", group.fuseType === "MCB automatisk" ? groupResults.selectedMcbType || "MCB B" : group.fuseType, In);
            const IminSupply = serviceData.IkMin || (In * IminFactor); // Brug Ik,min fra tavle hvis tilgængelig

            // Ik,min beregning
            const ikMin = ikMinGroup(Uv, IminSupply, ZstikMin, ZgroupMin);
            groupResults.IkMin = ikMin.Ik;
            groupResults.IkMinAngle = ikMin.angle;

            // Ik,max beregning
            const ikMax = ikMaxStik(Uv, IkTrafo, cosTrafo, { R: ZstikMax.R + ZgroupMax.R, X: ZstikMax.X + ZgroupMax.X });
            groupResults.IkMax = ikMax.Ik;
            groupResults.IkMaxAngle = ikMax.angle;

            // Sikringsdata og udløsningstid
            const fuseTypeToUse = group.fuseType === "MCB automatisk" ? groupResults.selectedMcbType || "MCB B" : group.fuseType;
            const { curvePoints, InCurve } = getFuseData("Standard", fuseTypeToUse, In);
            const useAbsoluteIk = usesAbsoluteIk(fuseTypeToUse);
            const { time: tripTime } = fuseTripTimeExplain(InCurve, ikMin.Ik, curvePoints, useAbsoluteIk);
            groupResults.tripTime = tripTime;

            // Termisk kontrol
            const k = group.material === "Cu" ? 143 : 94;
            const thermal = thermalOk(k, chosenSq, ikMin.Ik, tripTime);

            // === KABELIMPEDANS ===
            const kabelImpedansLines: string[] = ["=== Kabelimpedans ==="];
            kabelImpedansLines.push(`L_total = ${totalLengthM.toFixed(1)}m`);
            kabelImpedansLines.push(`R/km = ${ZperKmMin.R.toFixed(5)} Ω/km, X/km = ${ZperKmMin.X.toFixed(5)} Ω/km`);
            kabelImpedansLines.push(`Z_gruppe = (${totalLengthM.toFixed(1)}/1000) × (${ZperKmMin.R.toFixed(5)} + j×${ZperKmMin.X.toFixed(5)})`);
            kabelImpedansLines.push(`Z_gruppe,min = ${ZgroupMin.R.toFixed(5)} + j×${ZgroupMin.X.toFixed(5)} Ω`);
            kabelImpedansLines.push(`|Z_gruppe| = ${Math.sqrt(ZgroupMin.R**2 + ZgroupMin.X**2).toFixed(5)} Ω`);

            steps.push({
              category: 'kortslutning',
              formula: "Kabelimpedans",
              variables: kabelImpedansLines.join("\n"),
              calculation: "",
              result: `|Z_gruppe| = ${Math.sqrt(ZgroupMin.R**2 + ZgroupMin.X**2).toFixed(5)} Ω`
            });
            
            // === KORTSLUTNINGSSTRØMME ===
            const kortslutningLines: string[] = ["=== Kortslutningsstrømme ==="];
            kortslutningLines.push(`Ik,min,tavle = ${IminSupply.toFixed(1)} A (fra stikledning)`);
            kortslutningLines.push(`Z_stik,min = ${ZstikMin.R.toFixed(5)} + j${ZstikMin.X.toFixed(5)} Ω`);
            kortslutningLines.push(`Z_total = Z_stik + Z_gruppe`);
            kortslutningLines.push(`\nIk,min ved gruppeudtag = ${ikMin.Ik.toFixed(1)} A ∠${ikMin.angle.toFixed(1)}°`);
            kortslutningLines.push(`Ik,max = ${ikMax.Ik.toFixed(1)} A ∠${ikMax.angle.toFixed(1)}°`);

            steps.push({
              category: 'kortslutning',
              formula: "Kortslutningsstrømme",
              variables: kortslutningLines.join("\n"),
              calculation: "",
              result: `Ik,min = ${ikMin.Ik.toFixed(1)} A, Ik,max = ${ikMax.Ik.toFixed(1)} A`
            });

            // === TERMISK KONTROL ===
            const termiskLines: string[] = ["=== Termisk kontrol (k²S² ≥ I²t) ==="];
            termiskLines.push(`k = ${k} (${group.material})`);
            termiskLines.push(`S = ${chosenSq.toFixed(1)} mm²`);
            termiskLines.push(`Ik,min = ${ikMin.Ik.toFixed(1)} A`);
            termiskLines.push(`Udkoblingstid: t ≈ ${tripTime.toFixed(4)} s`);
            termiskLines.push(`\nE_kabel = k²×S² = ${k}²×${chosenSq.toFixed(1)}² = ${thermal.Ekabel.toFixed(0)} A²s`);
            termiskLines.push(`E_bryde = I²×t = ${ikMin.Ik.toFixed(1)}²×${tripTime.toFixed(4)} = ${thermal.Ebryde.toFixed(0)} A²s`);
            termiskLines.push(`\n${thermal.ok ? '✓ E_kabel ≥ E_bryde - Termisk OK' : '✗ E_kabel < E_bryde - Termisk IKKE OK'}`);

            steps.push({
              category: 'kortslutning',
              formula: "Termisk kontrol",
              variables: termiskLines.join("\n"),
              calculation: "",
              result: thermal.ok ? `✓ Termisk OK` : `✗ Termisk IKKE OK`
            });
          } catch (error) {
            console.error("Fejl i kortslutningsberegninger:", error);
          }
        }

        allSteps.push(steps);
        return { ...newGroup, results: groupResults };
      });

      setGroups(updatedGroups);
      
      // Log calculations
      for (let idx = 0; idx < updatedGroups.length; idx++) {
        const group = updatedGroups[idx];
        if (allSteps[idx] && allSteps[idx].length > 0) {
          addLog(`Gruppe ${group.name}`, "group", allSteps[idx]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      isCalculatingRef.current = false;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Grupper</CardTitle>
              <CardDescription>
                Beregn flere grupper med automatisk tværsnitsvalg og spændingsfald.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={groups[0]?.id} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                {groups.map((group) => (
                  <TabsTrigger key={group.id} value={group.id}>
                    {group.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              <Button onClick={addGroup} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Ny gruppe
              </Button>
            </div>

            {groups.map((group) => (
              <TabsContent key={group.id} value={group.id} className="space-y-4 mt-0">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Gruppenavn</Label>
                      <Input
                        value={group.name}
                        onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Sikringstype</Label>
                      <Select
                        value={group.fuseType}
                        onValueChange={(value) => updateGroup(group.id, { fuseType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MCB B">MCB B</SelectItem>
                          <SelectItem value="MCB C">MCB C</SelectItem>
                          <SelectItem value="MCB D">MCB D</SelectItem>
                          <SelectItem value="MCB automatisk">MCB automatisk</SelectItem>
                          <SelectItem value="Diazed gG">Diazed gG</SelectItem>
                          <SelectItem value="Diazed D2/D3/D4">Diazed D2/D3/D4</SelectItem>
                          <SelectItem value="Neozed gG">Neozed gG</SelectItem>
                          <SelectItem value="Knivsikring NH00">Knivsikring NH00</SelectItem>
                          <SelectItem value="Knivsikring NH0">Knivsikring NH0</SelectItem>
                          <SelectItem value="Knivsikring NH1">Knivsikring NH1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 relative">
                      <Label>Sikrings størrelse gruppe [A]</Label>
                      <Select
                        value={group.In}
                        onValueChange={(value) => updateGroup(group.id, { In: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {((group.fuseType === "MCB B" || group.fuseType === "MCB C" || group.fuseType === "MCB D" || group.fuseType === "MCB automatisk") ? MCB_SIZES :
                            group.fuseType === "Diazed gG" ? DIAZED_SIZES :
                            group.fuseType === "Diazed D2/D3/D4" ? DIAZED_D2D3D4_SIZES :
                            group.fuseType === "Knivsikring gG" ? KNIV_SIZES :
                            group.fuseType === "Knivsikring NH00" ? NH00_SIZES :
                            group.fuseType === "Knivsikring NH0" ? NH0_SIZES :
                            group.fuseType === "Knivsikring NH1" ? NH1_SIZES :
                            NEOZED_SIZES).map((size) => (
                            <SelectItem key={size} value={size.toString()}>
                              {size} A
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {groups.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteGroup(group.id)}
                          title="Slet gruppe"
                          className="absolute -right-12 top-6"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>cos φ (gruppe)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={group.cosPhi}
                        onChange={(e) => updateGroup(group.id, { cosPhi: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Fasesystem</Label>
                      <Select
                        value={group.phase}
                        onValueChange={(value: PhaseSystem) => {
                          if (value === "1-faset" && !group.selectedPhase) {
                            const onePhasedGroups = groups.filter(g => g.phase === "1-faset" && g.id !== group.id);
                            const phaseRotation: ("L1" | "L2" | "L3")[] = ["L1", "L2", "L3"];
                            const nextPhase = phaseRotation[onePhasedGroups.length % 3];
                            updateGroup(group.id, { phase: value, selectedPhase: nextPhase });
                          } else {
                            updateGroup(group.id, { phase: value });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-faset">1-faset</SelectItem>
                          <SelectItem value="3-faset">3-faset (Kraft)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Vælg fase</Label>
                      <Select
                        value={group.selectedPhase || "L1"}
                        onValueChange={(value: "L1" | "L2" | "L3") => 
                          updateGroup(group.id, { selectedPhase: value })
                        }
                        disabled={group.phase !== "1-faset"}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L1">L1</SelectItem>
                          <SelectItem value="L2">L2</SelectItem>
                          <SelectItem value="L3">L3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Materiale</Label>
                      <Select
                        value={group.material}
                        onValueChange={(value: Material) => updateGroup(group.id, { material: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cu">Kobber (Cu)</SelectItem>
                          <SelectItem value="Al">Aluminium (Al)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Maks ΔU_total [%]</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={group.maxVoltageDrop}
                        onChange={(e) => updateGroup(group.id, { maxVoltageDrop: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Kj (jordtemp.-faktor)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={group.KjJord}
                        onChange={(e) => updateGroup(group.id, { KjJord: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Auto tværsnit</Label>
                    <Select
                      value={group.autoSize ? "ja" : "nej"}
                      onValueChange={(value) => updateGroup(group.id, { autoSize: value === "ja" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ja">Ja (auto)</SelectItem>
                        <SelectItem value="nej">Nej (manuel)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold">Kabel fremføringsmetode</h3>
                      <Button size="sm" variant="outline" onClick={() => addSegmentToGroup(group.id)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Segment af kabel
                      </Button>
                    </div>

                    {group.segments.map((segment, index) => (
                      <div key={index} className="space-y-3 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Segment {index + 1}</Label>
                          {group.segments.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSegmentFromGroup(group.id, index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <SegmentInput
                          segment={segment}
                          onChange={(data) => updateGroupSegment(group.id, index, data)}
                          phases={group.phase}
                        />
                      </div>
                    ))}
                  </div>

                  {group.results && (
                    <Card className="border-primary/50 bg-primary/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Resultater</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-3">
                          <div className="space-y-0.5">
                            <div className="text-xs text-muted-foreground">Netspænding:</div>
                            <div className="text-base font-bold">{group.results.netVoltage} V</div>
                          </div>
                          
                          {group.results.chosenSize !== null && (
                            <div className="space-y-0.5">
                              <div className="text-xs text-muted-foreground">Kabeltværsnit:</div>
                              <div className="text-base font-bold">{group.results.chosenSize} mm²</div>
                            </div>
                          )}
                          
                          <div className="space-y-0.5">
                            <div className="text-xs text-muted-foreground">Samlet længde:</div>
                            <div className="text-base font-bold">{group.results.totalLength.toFixed(1)} m</div>
                          </div>
                          
                          <div className="space-y-0.5">
                            <div className="text-xs text-muted-foreground">Spændingsfald:</div>
                            <div className="text-base font-bold">
                              {group.results.totalVoltageDropPercent.toFixed(2)} %
                            </div>
                            {group.results.totalVoltageDropPercent > parseFloat(group.maxVoltageDrop) && (
                              <Badge variant="destructive" className="text-xs">Over grænse!</Badge>
                            )}
                          </div>

                          {group.results.IkMin !== undefined && (
                            <>
                              <div className="space-y-0.5">
                                <div className="text-xs text-muted-foreground">Ik,min:</div>
                                <div className="text-base font-bold">{group.results.IkMin.toFixed(1)} A</div>
                              </div>
                              
                              <div className="space-y-0.5">
                                <div className="text-xs text-muted-foreground">Ik,max:</div>
                                <div className="text-base font-bold">{group.results.IkMax?.toFixed(1)} A</div>
                              </div>

                              {group.results.tripTime !== undefined && (
                                <div className="space-y-0.5">
                                  <div className="text-xs text-muted-foreground">Udløsningstid:</div>
                                  <div className="text-base font-bold">{group.results.tripTime.toFixed(3)} s</div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
