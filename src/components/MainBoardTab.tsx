import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calculator, Plus, Trash2 } from "lucide-react";
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
} from "@/lib/calculations";
import { getFuseData, fuseTripTimeExplain } from "@/lib/fuseCurves";
import { useProject } from "@/contexts/ProjectContext";

// Standard fuse sizes in amperes
const STANDARD_FUSE_SIZES = [10, 13, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630];

interface MainBoardData {
  ikTrafo: string;
  cosTrafo: string;
  fuseType: string;
  fuseRating: string;
  material: "Cu" | "Al";
  maxVoltageDrop: string;
  parallelCables: string;
  autoSize: boolean;
  autoFuseSize: boolean;
  segments: SegmentData[];
}

interface MainBoardTabProps {
  apartments: any[];
  onAddLog?: (title: string, type: 'service' | 'group', steps: any[]) => void;
}

const createDefaultSegment = (): SegmentData => ({
  installMethod: "C",
  length: 1,
  ambientTemp: 30,
  loadedConductors: 3,
  crossSection: 10.0,
  cablesGrouped: 1,
  kt: 1.0,
  kgrp: 1.0,
  insulationType: "XLPE",
});

export function MainBoardTab({ apartments, onAddLog }: MainBoardTabProps) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id || 'default';
  const storageKey = `main-board-state-${projectId}`;

  const [mainBoardData, setMainBoardData] = useState<MainBoardData>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          ikTrafo: "16000",
          cosTrafo: "0.3",
          fuseType: "Neozed gG",
          fuseRating: "63",
          material: "Cu",
          maxVoltageDrop: "1.0",
          parallelCables: "1",
          autoSize: true,
          autoFuseSize: true,
          segments: [createDefaultSegment()],
        };
      }
    }
    return {
      ikTrafo: "16000",
      cosTrafo: "0.3",
      fuseType: "Neozed gG",
      fuseRating: "63",
      material: "Cu",
      maxVoltageDrop: "1.0",
      parallelCables: "1",
      autoSize: true,
      autoFuseSize: true,
      segments: [createDefaultSegment()],
    };
  });

  const [results, setResults] = useState<{
    chosenSize: number | null;
    totalCurrent: number;
    totalLength: number;
    totalVoltageDrop: number;
    voltageDropPercent: number;
    IkMin: number;
    IkMinFault: number;
    IkMax: number;
    thermalOk: boolean;
    faultWarning: boolean;
    tripTime: number;
  } | null>(null);

  // Track last calculation to prevent redundant calculations
  const lastCalculationRef = useRef<string>("");

  // Auto-update fuse size based on total current (only if autoFuseSize is enabled)
  useEffect(() => {
    if (!mainBoardData.autoFuseSize) return;
    
    const totalCurrent = calculateTotalCurrent();
    if (totalCurrent > 0) {
      const recommendedFuseSize = STANDARD_FUSE_SIZES.find(size => size >= totalCurrent) || STANDARD_FUSE_SIZES[STANDARD_FUSE_SIZES.length - 1];
      const currentFuseRating = parseFloat(mainBoardData.fuseRating.replace(",", "."));
      
      if (recommendedFuseSize !== currentFuseRating) {
        setMainBoardData(prev => ({
          ...prev,
          fuseRating: recommendedFuseSize.toString()
        }));
      }
    }
  }, [apartments, mainBoardData.autoFuseSize]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(mainBoardData));
  }, [mainBoardData, storageKey]);

  // Auto-calculate main board when data or apartments change
  useEffect(() => {
    if (onAddLog && apartments.length > 0) {
      // Create a hash of current data to detect actual changes
      const currentDataHash = JSON.stringify({
        mainBoardData,
        apartmentIds: apartments.map(a => a.id),
      });

      // Only calculate if data has actually changed since last calculation
      if (currentDataHash !== lastCalculationRef.current) {
        lastCalculationRef.current = currentDataHash;
        try {
          calculateMainBoard(false); // Auto calculation - don't show toast
        } catch (error) {
          console.error("Main board calculation error:", error);
        }
      }
    }
  }, [mainBoardData, apartments, onAddLog]);

  // Calculate total current from all units included in main board
  const calculateTotalCurrent = (): number => {
    let totalCurrent = 0;

    for (const apt of apartments) {
      // Skip units not included in main board
      if (apt.includeInMainBoard === false) continue;

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
          const loadType = apt.loadType || (apt.unitType === "commercial" ? "detailhandel" : "bolig");
          const LOAD_TYPES: Record<string, number> = {
            bolig: 30,
            supermarked: 65,
            detailhandel: 35,
            kontor: 25,
            lager: 15,
          };
          const wPerM2 = LOAD_TYPES[loadType] || 30;
          basePower = area * wPerM2;
          break;
        }
        case "velander": {
          const W = parseFloat(apt.W_watts?.replace(",", ".") || "4300");
          basePower = 0.24 * W + 2.31 * Math.sqrt(W);
          basePower *= 1000; // Convert to watts
          break;
        }
      }

      const totalPower = basePower * (1 + extraPercent / 100);
      const voltage = parseInt(apt.voltage);
      
      if (apt.phases === "3-faset") {
        totalCurrent += totalPower / (Math.sqrt(3) * voltage * cos);
      } else {
        totalCurrent += totalPower / (voltage * cos);
      }
    }

    return totalCurrent;
  };

  const addSegment = () => {
    setMainBoardData({
      ...mainBoardData,
      segments: [...mainBoardData.segments, createDefaultSegment()],
    });
  };

  const removeSegment = (index: number) => {
    if (mainBoardData.segments.length <= 1) {
      toast.error("Mindst ét segment er påkrævet");
      return;
    }
    setMainBoardData({
      ...mainBoardData,
      segments: mainBoardData.segments.filter((_, i) => i !== index),
    });
  };

  const updateSegment = (index: number, data: Partial<SegmentData>) => {
    const newSegments = [...mainBoardData.segments];
    newSegments[index] = { ...newSegments[index], ...data };
    setMainBoardData({
      ...mainBoardData,
      segments: newSegments,
    });
  };

  const calculateMainBoard = (showToast: boolean = true) => {
    const In = calculateTotalCurrent();

    if (In <= 0) {
      if (showToast) {
        toast.error("Ingen enheder inkluderet i hovedtavlen");
      }
      return;
    }

    const Uv = 400; // 3-phase voltage
    const phases = "3-faset";
    const cosPhi = 1.0; // Conservative for cable sizing

    // Initialize calculation steps for logging
    const steps: any[] = [];

    let chosenSize: number | null = null;
    let totalLength = 0;

    // Calculate total length
    for (const seg of mainBoardData.segments) {
      totalLength += seg.length;
    }

    // Auto-select cable size if enabled
    const nParallel = parseInt(mainBoardData.parallelCables) || 1;
    
    if (mainBoardData.autoSize) {
      for (const size of STANDARD_SIZES) {
        if (size < 10) continue; // Main board cables should be at least 10mm²
        
        let overloadOk = true;
        for (const seg of mainBoardData.segments) {
          const iz = lookupIz(mainBoardData.material, seg.installMethod, size, seg.loadedConductors, seg.insulationType || "XLPE");
          if (!iz || iz <= 0) {
            overloadOk = false;
            break;
          }
          const IzCorr = iz * seg.kt * seg.kgrp;
          // Total capacity is IzCorr multiplied by number of parallel cables
          const totalCapacity = IzCorr * nParallel;
          // Check if total current exceeds total capacity
          if (In > totalCapacity) {
            overloadOk = false;
            break;
          }
        }

        if (!overloadOk) continue;

        // Voltage drop calculation: use total impedance divided by number of parallel cables
        let duTotal = 0;
        for (const seg of mainBoardData.segments) {
          // For parallel cables: Z_total = Z_single / n, so voltage drop is also reduced by n
          const { du } = voltageDropDs(Uv, In, mainBoardData.material, size, seg.length, phases, cosPhi);
          duTotal += du / nParallel; // Voltage drop is reduced by parallel cables
        }
        const duPercent = (duTotal / Uv) * 100;
        const maxDrop = parseFloat(mainBoardData.maxVoltageDrop.replace(",", "."));

        if (duPercent <= maxDrop) {
          chosenSize = size;
          break;
        }
      }
    } else {
      // Use first segment's cross section
      chosenSize = mainBoardData.segments[0]?.crossSection || null;
    }

    if (!chosenSize) {
      toast.error("Kunne ikke finde passende tværsnit");
      return;
    }

    // Calculate voltage drop (reduced by parallel cables)
    let totalVoltageDrop = 0;
    for (const seg of mainBoardData.segments) {
      const { du } = voltageDropDs(Uv, In, mainBoardData.material, chosenSize, seg.length, phases, cosPhi);
      totalVoltageDrop += du / nParallel; // Divided by number of parallel cables
    }
    const voltageDropPercent = (totalVoltageDrop / Uv) * 100;

    // Calculate impedance for short circuit calculations
    let totalR = 0;
    let totalX = 0;
    for (const seg of mainBoardData.segments) {
      const { R, X } = getCableImpedancePerKm(chosenSize, mainBoardData.material, phases);
      totalR += (R * seg.length) / 1000;
      totalX += (X * seg.length) / 1000;
    }
    
    // Normal drift: alle parallelle kabler fungerer
    const Zkabel_normal = { R: totalR / nParallel, X: totalX / nParallel };
    
    // Ved fejl i én leder: kun (n-1) kabler virker efter fejlstedet
    const Zkabel_fault = { 
      R: totalR / (nParallel - 1 || 1), 
      X: totalX / (nParallel - 1 || 1) 
    };

    // Calculate Ik,min for normal drift
    const ikTrafo = parseFloat(mainBoardData.ikTrafo.replace(",", "."));
    const ikMinResult = ikMinStik(Uv, ikTrafo, Zkabel_normal);
    const IkMin = ikMinResult.Ik;
    
    // Calculate Ik,min for fault scenario (worst case)
    const ikMinFaultResult = nParallel > 1 
      ? ikMinStik(Uv, ikTrafo, Zkabel_fault)
      : ikMinResult;
    const IkMinFault = ikMinFaultResult.Ik;

    // Calculate Ik,max (using normal impedance)
    const cosTrafo = parseFloat(mainBoardData.cosTrafo.replace(",", "."));
    const ikMaxResult = ikMaxStik(Uv, ikTrafo, cosTrafo, Zkabel_normal);
    const IkMax = ikMaxResult.Ik;

    // Check thermal capacity using worst case Ik,min
    const ikMinWorstCase = Math.min(IkMin, IkMinFault);
    const fuseRating = parseFloat(mainBoardData.fuseRating.replace(",", "."));
    const { curvePoints, InCurve } = getFuseData("Standard", mainBoardData.fuseType, fuseRating);
    const useAbsoluteIk = mainBoardData.fuseType === "Diazed gG" || 
                          mainBoardData.fuseType === "Diazed D2/D3/D4" ||
                          mainBoardData.fuseType === "Neozed gG" || 
                          mainBoardData.fuseType === "Knivsikring gG" ||
                          mainBoardData.fuseType === "Knivsikring NH00" ||
                          mainBoardData.fuseType === "Knivsikring NH0" ||
                          mainBoardData.fuseType === "Knivsikring NH1";
    const { time: tripTime } = fuseTripTimeExplain(InCurve, ikMinWorstCase, curvePoints, useAbsoluteIk);
    // Use correct k-value based on material: Cu=143, Al=94
    const kValue = mainBoardData.material === "Cu" ? 143 : 94;
    const thermalResult = thermalOk(kValue, chosenSize, ikMinWorstCase, tripTime);
    const isThermalOk = thermalResult.ok;
    
    // Warning if Ik,min at fault is significantly lower
    const faultWarning = nParallel > 1 && IkMinFault < IkMin * 0.8;

    // Generate calculation steps for mellemregninger
    // Get units included in main board
    const unitsInMainBoard = apartments.filter(apt => apt.includeInMainBoard !== false);
    
    // === SEGMENTDATA ===
    const segmentDataLines: string[] = ["=== Segmentdata ==="];
    mainBoardData.segments.forEach((seg, idx) => {
      const env = seg.installMethod.startsWith("D") ? "jord" : "luft";
      segmentDataLines.push(`Segment ${idx + 1}: Ref=${seg.installMethod} (${env}), L=${seg.length}m, T=${seg.ambientTemp}°C, S=${chosenSize}mm², Leder=${seg.loadedConductors}, Kt=${seg.kt.toFixed(3)}, Kj=1.000, Kgrp=${seg.kgrp.toFixed(3)}`);
    });
    
    steps.push({
      category: "overbelastning",
      formula: "Segmentdata",
      variables: segmentDataLines.join("\n"),
      calculation: "",
      result: `Valgt tværsnit: ${chosenSize} mm²${nParallel > 1 ? ` (${nParallel} parallelle kabler)` : ""}`
    });
    
    // === ENHEDER I HOVEDTAVLEN ===
    const enhederLines: string[] = ["=== Enheder inkluderet i hovedtavlen ==="];
    unitsInMainBoard.forEach(apt => {
      enhederLines.push(`${apt.name}`);
    });
    enhederLines.push(`\nTotal beregnet strøm: In = ${In.toFixed(2)} A`);
    enhederLines.push(`Fasesystem: ${phases}`);
    enhederLines.push(`Netspænding: ${Uv} V`);
    
    steps.push({
      category: "overbelastning",
      formula: "Enheder i hovedtavlen",
      variables: enhederLines.join("\n"),
      calculation: "",
      result: `${unitsInMainBoard.length} enheder, I_total = ${In.toFixed(2)} A`
    });
    
    // === IZ,NØDVENDIG BEREGNING ===
    const izNødvendigLines: string[] = ["=== Iz,nødvendig beregning ==="];
    mainBoardData.segments.forEach((seg, idx) => {
      const izNødvendig = In / (seg.kt * seg.kgrp * nParallel);
      izNødvendigLines.push(`Segment ${idx + 1}: Iz,nødvendig = ${In.toFixed(2)} / (${seg.kt.toFixed(3)} × 1.000 × ${seg.kgrp.toFixed(3)}${nParallel > 1 ? ` × ${nParallel}` : ""}) = ${izNødvendig.toFixed(2)} A`);
    });
    
    steps.push({
      category: "overbelastning",
      formula: "Iz,nødvendig beregning",
      variables: izNødvendigLines.join("\n"),
      calculation: "",
      result: ""
    });
    
    // === IZ,KORRIGERET FOR VALGT KABEL ===
    const overbelastningLines: string[] = ["=== Iz,korrigeret for valgt kabel ===", `Valgt tværsnit: ${chosenSize} mm²`];
    if (nParallel > 1) {
      overbelastningLines.push(`Antal parallelle kabler: ${nParallel}`);
    }
    
    mainBoardData.segments.forEach((seg, idx) => {
      const iz = lookupIz(mainBoardData.material, seg.installMethod, chosenSize || 0, seg.loadedConductors, seg.insulationType || "XLPE");
      const IzCorr = iz * seg.kt * seg.kgrp;
      const totalCapacity = IzCorr * nParallel;
      overbelastningLines.push(`\nSegment ${idx + 1}:`);
      overbelastningLines.push(`  Iz,tabel = ${iz.toFixed(2)} A`);
      overbelastningLines.push(`  Iz,korrigeret = ${iz.toFixed(2)} × ${seg.kt.toFixed(3)} × 1.000 × ${seg.kgrp.toFixed(3)} = ${IzCorr.toFixed(2)} A`);
      if (nParallel > 1) {
        overbelastningLines.push(`  Total kapacitet (${nParallel} kabler) = ${IzCorr.toFixed(2)} × ${nParallel} = ${totalCapacity.toFixed(2)} A`);
      }
      overbelastningLines.push(`  ${In <= totalCapacity ? '✓' : '✗'} In ≤ Iz,korr${nParallel > 1 ? '×'+nParallel : ''} (${In.toFixed(2)} A ≤ ${totalCapacity.toFixed(2)} A)`);
    });
    
    overbelastningLines.push(`\nKabel godkendt for overbelastning ✓`);
    
    steps.push({
      category: "overbelastning",
      formula: "Iz,korrigeret for valgt kabel",
      variables: overbelastningLines.join("\n"),
      calculation: "",
      result: chosenSize !== null ? `OK ✓` : "",
    });

    // === KABELIMPEDANS ===
    const kortslutningLines: string[] = ["=== Kabelimpedans ==="];
    
    kortslutningLines.push(`L_total = ${totalLength.toFixed(0)}m`);
    
    // Get R and X per km for detailed display
    const { R: RperKm, X: XperKm } = getCableImpedancePerKm(chosenSize, mainBoardData.material, phases);
    kortslutningLines.push(`R/km = ${RperKm.toFixed(5)} Ω/km, X/km = ${XperKm.toFixed(5)} Ω/km`);
    
    if (nParallel > 1) {
      kortslutningLines.push(`\nNormal drift (${nParallel} parallelle kabler):`);
      const Zmag = Math.sqrt(Zkabel_normal.R**2 + Zkabel_normal.X**2);
      const Zangle = Math.atan2(Zkabel_normal.X, Zkabel_normal.R) * 180 / Math.PI;
      kortslutningLines.push(`Z_kabel = (${totalLength}/1000) * (R + i*X) / ${nParallel}`);
      kortslutningLines.push(`Z_kabel = ${Zkabel_normal.R.toFixed(5)} + i*${Zkabel_normal.X.toFixed(5)} Ω`);
      kortslutningLines.push(`|Z_kabel| = ${Zmag.toFixed(5)} ∠${Zangle.toFixed(2)}° Ω`);
      
      kortslutningLines.push(`\nVed fejl i én leder (worst case, ${nParallel-1} kabler):`);
      const ZmagFault = Math.sqrt(Zkabel_fault.R**2 + Zkabel_fault.X**2);
      const ZangleFault = Math.atan2(Zkabel_fault.X, Zkabel_fault.R) * 180 / Math.PI;
      kortslutningLines.push(`Z_kabel_fejl = ${Zkabel_fault.R.toFixed(5)} + i*${Zkabel_fault.X.toFixed(5)} Ω`);
      kortslutningLines.push(`|Z_kabel_fejl| = ${ZmagFault.toFixed(5)} ∠${ZangleFault.toFixed(2)}° Ω`);
    } else {
      const Zmag = Math.sqrt(Zkabel_normal.R**2 + Zkabel_normal.X**2);
      const Zangle = Math.atan2(Zkabel_normal.X, Zkabel_normal.R) * 180 / Math.PI;
      kortslutningLines.push(`Z_kabel = (${totalLength}/1000) * (R + i*X)`);
      kortslutningLines.push(`Z_kabel = ${Zkabel_normal.R.toFixed(5)} + i*${Zkabel_normal.X.toFixed(5)} Ω`);
      kortslutningLines.push(`|Z_kabel| = ${Zmag.toFixed(5)} ∠${Zangle.toFixed(2)}° Ω`);
    }
    
    steps.push({
      category: "kortslutning",
      formula: "Kabelimpedans",
      variables: kortslutningLines.join("\n"),
      calculation: "",
      result: `|Z_kabel| = ${Math.sqrt(Zkabel_normal.R**2 + Zkabel_normal.X**2).toFixed(5)} Ω`,
    });
    
    // === IK,MIN BEREGNING ===
    const ikMinLines: string[] = ["=== Ik,min beregning ==="];
    const Zsup = Uv / (Math.sqrt(3) * ikTrafo);
    ikMinLines.push(`Ik,trafo = ${ikTrafo} A`);
    ikMinLines.push(`Z_forsyning = U_n / (√3 × Ik,trafo) = ${Uv} / (√3 × ${ikTrafo}) = ${Zsup.toFixed(5)} Ω`);
    ikMinLines.push(``);
    
    if (nParallel > 1) {
      const ZtotalNormal = Math.sqrt(
        (Zsup + Zkabel_normal.R)**2 + Zkabel_normal.X**2
      );
      const angleNormal = Math.atan2(Zkabel_normal.X, Zsup + Zkabel_normal.R) * 180 / Math.PI;
      ikMinLines.push(`Normal drift (${nParallel} kabler):`);
      ikMinLines.push(`Ik,min = U_n / (√3 × Z_total)`);
      ikMinLines.push(`Ik,min = ${Uv} / (√3 × ${ZtotalNormal.toFixed(5)})`);
      ikMinLines.push(`Ik,min = ${IkMin.toFixed(2)} A ∠${(-angleNormal).toFixed(2)}°`);
      ikMinLines.push(``);
      
      const ZtotalFault = Math.sqrt(
        (Zsup + Zkabel_fault.R)**2 + Zkabel_fault.X**2
      );
      const angleFault = Math.atan2(Zkabel_fault.X, Zsup + Zkabel_fault.R) * 180 / Math.PI;
      ikMinLines.push(`Ved fejl i én leder (${nParallel-1} kabler):`);
      ikMinLines.push(`Ik,min = ${Uv} / (√3 × ${ZtotalFault.toFixed(5)})`);
      ikMinLines.push(`Ik,min = ${IkMinFault.toFixed(2)} A ∠${(-angleFault).toFixed(2)}°`);
    } else {
      const Ztotal = Math.sqrt(
        (Zsup + Zkabel_normal.R)**2 + Zkabel_normal.X**2
      );
      const angle = Math.atan2(Zkabel_normal.X, Zsup + Zkabel_normal.R) * 180 / Math.PI;
      ikMinLines.push(`Ik,min = U_n / (√3 × Z_total)`);
      ikMinLines.push(`Ik,min = ${Uv} / (√3 × ${Ztotal.toFixed(5)})`);
      ikMinLines.push(`Ik,min = ${IkMin.toFixed(2)} A ∠${(-angle).toFixed(2)}°`);
    }
    
    steps.push({
      category: "kortslutning",
      formula: "Ik,min beregning",
      variables: ikMinLines.join("\n"),
      calculation: "",
      result: `Ik,min = ${ikMinWorstCase.toFixed(0)} A`,
    });
    
    // === IK,MAX BEREGNING ===
    const ikMaxLines: string[] = ["=== Ik,max beregning ==="];
    ikMaxLines.push(`Ik,max beregnet fra trafo: ${ikTrafo.toFixed(1)} A, cos φ = ${cosTrafo.toFixed(3)}`);
    const ZmaxMag = Math.sqrt(Zkabel_normal.R**2 + Zkabel_normal.X**2);
    ikMaxLines.push(`Z_kabel = ${ZmaxMag.toFixed(5)} Ω`);
    const angleMax = Math.atan2(Zkabel_normal.X, Zkabel_normal.R) * 180 / Math.PI;
    ikMaxLines.push(`Ik,max = ${IkMax.toFixed(2)} A ∠${angleMax.toFixed(2)}°`);
    
    steps.push({
      category: "kortslutning",
      formula: "Ik,max beregning",
      variables: ikMaxLines.join("\n"),
      calculation: "",
      result: `Ik,max = ${IkMax.toFixed(0)} A`,
    });
    
    // === SPRINGETID FRA SIKRINGSKURVE ===
    const sikringLines: string[] = ["=== Springetid fra sikringskurve ==="];
    sikringLines.push(`Sikring: ${mainBoardData.fuseType} ${fuseRating} A`);
    sikringLines.push(`Ik,min = ${ikMinWorstCase.toFixed(1)} A, In_kurve = ${InCurve.toFixed(1)} A`);
    const m = ikMinWorstCase / InCurve;
    sikringLines.push(`m = Ik/In = ${m.toFixed(2)}`);
    sikringLines.push(`t_udkobling ≈ ${tripTime.toFixed(4)} s ✓ OK`);
    
    steps.push({
      category: "kortslutning",
      formula: "Springetid fra sikringskurve",
      variables: sikringLines.join("\n"),
      calculation: "",
      result: `t = ${tripTime.toFixed(4)} s`,
    });
    
    // === TERMISK KONTROL ===
    const termiskLines: string[] = ["=== Termisk kontrol ==="];
    termiskLines.push(`k = ${kValue} (materiale konstant)`);
    termiskLines.push(`S = ${chosenSize} mm²`);
    const E_kabel = kValue**2 * chosenSize**2;
    const E_bryde = ikMinWorstCase**2 * tripTime;
    termiskLines.push(`E_kabel = k²*S² = ${kValue}²*${chosenSize}² = ${E_kabel.toFixed(0)} A²s`);
    termiskLines.push(`E_bryde = I²*t = ${ikMinWorstCase.toFixed(1)}²*${tripTime.toFixed(4)} = ${E_bryde.toFixed(0)} A²s`);
    termiskLines.push(`Termisk: ${isThermalOk ? '✓ OK' : '✗ IKKE OK'} (${E_kabel.toFixed(0)} ${isThermalOk ? '≥' : '<'} ${E_bryde.toFixed(0)} A²s)`);
    
    steps.push({
      category: "kortslutning",
      formula: "Termisk kontrol",
      variables: termiskLines.join("\n"),
      calculation: "",
      result: isThermalOk ? "OK ✓" : "IKKE OK ✗",
    });

    // === SPÆNDINGSFALD ===
    const spaendingsfaldLines: string[] = ["=== Spændingsfald per segment ==="];
    
    mainBoardData.segments.forEach((seg, idx) => {
      const { du, duPercent } = voltageDropDs(Uv, In, mainBoardData.material, chosenSize || 0, seg.length, phases, cosPhi);
      const duAdjusted = du / nParallel;
      const duPercentAdjusted = duPercent / nParallel;
      spaendingsfaldLines.push(`Segment ${idx + 1}: L=${seg.length}m → ΔU=${duAdjusted.toFixed(2)}V (${duPercentAdjusted.toFixed(2)}%)`);
    });
    
    spaendingsfaldLines.push("\n=== Total spændingsfald ===");
    if (nParallel > 1) {
      spaendingsfaldLines.push(`Note: ${nParallel} parallelle kabler reducerer spændingsfaldet`);
    }
    spaendingsfaldLines.push(`Total ΔU = ${totalVoltageDrop.toFixed(2)} V = ${voltageDropPercent.toFixed(2)}%`);
    const maxDrop = parseFloat(mainBoardData.maxVoltageDrop.replace(",", "."));
    spaendingsfaldLines.push(`Grænse: ${maxDrop.toFixed(2)}% → ${voltageDropPercent <= maxDrop ? '✓ OK' : '✗ For højt'}`);
    
    steps.push({
      category: "spændingsfald",
      formula: "Total spændingsfald",
      variables: spaendingsfaldLines.join("\n"),
      calculation: "",
      result: `${voltageDropPercent <= maxDrop ? '✓' : '✗'} ΔU = ${voltageDropPercent.toFixed(2)}% ${voltageDropPercent <= maxDrop ? '≤' : '>'} ${maxDrop.toFixed(2)}%`,
    });

    setResults({
      chosenSize,
      totalCurrent: In,
      totalLength,
      totalVoltageDrop,
      voltageDropPercent,
      IkMin,
      IkMinFault,
      IkMax,
      thermalOk: isThermalOk,
      faultWarning,
      tripTime,
    });
    
    // Add detailed logs to mellemregninger
    if (onAddLog) {
      onAddLog("Hovedtavle – beregning", "service", steps);
    }
    
    if (faultWarning) {
      toast.warning(`Ved fejl i én leder falder Ik,min til ${IkMinFault.toFixed(0)} A`);
    }

    if (showToast) {
      toast.success("Hovedtavle beregnet");
    }
  };

  const unitsInMainBoard = apartments.filter(apt => apt.includeInMainBoard !== false);
  const totalCurrent = calculateTotalCurrent();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hovedtavle</CardTitle>
          <CardDescription>
            Stikledning fra transformator til hovedtavle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
            <div className="text-sm font-semibold mb-2">Inkluderede enheder</div>
            <div className="flex flex-wrap gap-2">
              {unitsInMainBoard.length > 0 ? (
                unitsInMainBoard.map(apt => (
                  <Badge key={apt.id} variant="secondary">
                    {apt.name}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Ingen enheder inkluderet</p>
              )}
            </div>
            {totalCurrent > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total beregnet strøm:</span>
                  <Badge variant="default" className="text-base">
                    {totalCurrent.toFixed(2)} A
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Transformer Data */}
          <div className="space-y-4">
            <div className="text-sm font-semibold">Transformator data</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ik,trafo [A]</Label>
                <Input
                  value={mainBoardData.ikTrafo}
                  onChange={(e) => setMainBoardData({ ...mainBoardData, ikTrafo: e.target.value })}
                  placeholder="16000"
                />
              </div>
              <div className="space-y-2">
                <Label>cos φ trafo</Label>
                <Input
                  value={mainBoardData.cosTrafo}
                  onChange={(e) => setMainBoardData({ ...mainBoardData, cosTrafo: e.target.value })}
                  placeholder="0.3"
                />
              </div>
            </div>
          </div>

          {/* Cable Cross-Section Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Tværsnitsvalg</div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Auto tværsnit</Label>
                <Select
                  value={mainBoardData.autoSize ? "ja" : "nej"}
                  onValueChange={(v) => setMainBoardData({ ...mainBoardData, autoSize: v === "ja" })}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">Ja (auto)</SelectItem>
                    <SelectItem value="nej">Nej (manuel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Fuse Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Sikring i hovedtavle</div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Auto sikring</Label>
                <Select
                  value={mainBoardData.autoFuseSize ? "ja" : "nej"}
                  onValueChange={(v) => setMainBoardData({ ...mainBoardData, autoFuseSize: v === "ja" })}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">Ja (auto)</SelectItem>
                    <SelectItem value="nej">Nej (manuel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Sikringstype</Label>
                <Select
                  value={mainBoardData.fuseType}
                  onValueChange={(v) => setMainBoardData({ ...mainBoardData, fuseType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diazed gG">Diazed gG</SelectItem>
                    <SelectItem value="Diazed D2/D3/D4">Diazed D2/D3/D4</SelectItem>
                    <SelectItem value="Neozed gG">Neozed gG</SelectItem>
                    <SelectItem value="Knivsikring NH00">Knivsikring NH00</SelectItem>
                    <SelectItem value="Knivsikring NH0">Knivsikring NH0</SelectItem>
                    <SelectItem value="Knivsikring NH1">Knivsikring NH1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sikringsstørrelse [A]</Label>
                <Select
                  value={mainBoardData.fuseRating}
                  onValueChange={(v) => setMainBoardData({ ...mainBoardData, fuseRating: v })}
                  disabled={mainBoardData.autoFuseSize}
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
                <Label>Materiale</Label>
                <Select
                  value={mainBoardData.material}
                  onValueChange={(v) => setMainBoardData({ ...mainBoardData, material: v as "Cu" | "Al" })}
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
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Maks. spændingsfald [%]</Label>
                <Input
                  value={mainBoardData.maxVoltageDrop}
                  onChange={(e) => setMainBoardData({ ...mainBoardData, maxVoltageDrop: e.target.value })}
                  placeholder="1.0"
                />
              </div>
              
              {/* Parallel Cables Section - More Prominent */}
              <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Parallelle kabler</Label>
                  <Badge variant={parseInt(mainBoardData.parallelCables) > 1 ? "default" : "outline"}>
                    {parseInt(mainBoardData.parallelCables) > 1 ? `${mainBoardData.parallelCables} parallelle` : "Enkelt kabel"}
                  </Badge>
                </div>
                <Select
                  value={mainBoardData.parallelCables}
                  onValueChange={(v) => setMainBoardData({ ...mainBoardData, parallelCables: v })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 kabel (normal)</SelectItem>
                    <SelectItem value="2">2 kabler (parallelt)</SelectItem>
                    <SelectItem value="3">3 kabler (parallelt)</SelectItem>
                    <SelectItem value="4">4 kabler (parallelt)</SelectItem>
                  </SelectContent>
                </Select>
                {parseInt(mainBoardData.parallelCables) > 1 && (
                  <Alert className="mt-3">
                    <AlertDescription className="text-xs space-y-2">
                      <p className="font-medium">⚠️ Krav til parallelle kabler:</p>
                      <p>
                        Ved parallelle kabler skal alle kabler være samme materiale, tværsnit, længde 
                        og lægges korrekt (trekant/flad) for at opnå lige strømfordeling – DS 183, 523.7.
                      </p>
                      <p className="text-muted-foreground">
                        💡 Parallelle kabler giver lavere impedans i normal drift, men højere impedans ved fejl i én leder.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>

          {/* Segments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Kabelstykker (trafo → hovedtavle)</div>
              <Button size="sm" variant="outline" onClick={addSegment}>
                <Plus className="h-4 w-4 mr-1" />
                Tilføj stykke
              </Button>
            </div>
            {mainBoardData.segments.map((seg, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Stykke {idx + 1}</Label>
                  {mainBoardData.segments.length > 1 && (
                    <Button size="sm" variant="ghost" onClick={() => removeSegment(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <SegmentInput
                  segment={seg}
                  onChange={(data) => updateSegment(idx, data)}
                  phases="3-faset"
                  disableCrossSection={mainBoardData.autoSize}
                />
              </div>
            ))}
          </div>

          <Button onClick={calculateMainBoard} className="w-full" size="lg">
            <Calculator className="mr-2 h-5 w-5" />
            Beregn hovedtavle
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Resultater – Hovedtavle</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Top Row: 3-column grid */}
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Enkelt kabel tværsnit</div>
                <div className="text-xl font-bold">{results.chosenSize} mm²</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Total strøm</div>
                <div className="text-xl font-bold">{results.totalCurrent.toFixed(2)} A</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Samlet længde</div>
                <div className="text-xl font-bold">{results.totalLength.toFixed(1)} m</div>
              </div>
            </div>

            {/* Parallel Cable Info if applicable */}
            {parseInt(mainBoardData.parallelCables) > 1 && (
              <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="font-semibold text-sm mb-1">
                  {mainBoardData.parallelCables} parallelle kabler á {results.chosenSize} mm²
                </div>
                <div className="text-xs text-muted-foreground">
                  Samlet ækvivalent tværsnit: {(results.chosenSize * parseInt(mainBoardData.parallelCables)).toFixed(0)} mm²
                </div>
              </div>
            )}

            {/* Second Row: 2-column grid */}
            <div className="grid grid-cols-2 gap-8 mt-6">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Spændingsfald</div>
                <div className="text-xl font-bold">
                  {results.totalVoltageDrop.toFixed(2)} V ({results.voltageDropPercent.toFixed(2)} %)
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Termisk kapacitet</div>
                <div className="text-xl font-bold">
                  {results.thermalOk ? '✓ OK' : '✗ Ikke OK'}
                </div>
              </div>
            </div>

            {/* Third Row: Short Circuit Results */}
            <div className="mt-6">
              <div className="text-sm font-semibold mb-3">Kortslutningsstrømme</div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Ik,min (normal drift)</div>
                  <div className="text-xl font-bold text-green-600">
                    {results.IkMin.toFixed(0)} A
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Ik,max</div>
                  <div className="text-xl font-bold">
                    {results.IkMax.toFixed(0)} A
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Time */}
            <div className="mt-6">
              <div className="text-xs text-muted-foreground mb-1">Springetid fra sikringskurve</div>
              <div className="text-xl font-bold">
                {results.tripTime.toFixed(4)} s
              </div>
            </div>

            {/* Fault Warning if applicable */}
            {parseInt(mainBoardData.parallelCables) > 1 && (
              <div className={`mt-6 p-4 rounded-lg ${results.faultWarning ? 'bg-orange-100 dark:bg-orange-950/40 border border-orange-300' : 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold">Fejl i 1 leder (worst case)</span>
                  {results.faultWarning && <span className="text-lg">⚠️</span>}
                </div>
                <div className={`text-xl font-bold ${results.faultWarning ? 'text-orange-600' : 'text-blue-600'}`}>
                  {results.IkMinFault.toFixed(0)} A
                </div>
                <div className="text-xs mt-2">
                  <div className={results.faultWarning ? 'text-orange-700 dark:text-orange-300 font-medium' : 'text-muted-foreground'}>
                    ↓ {((1 - results.IkMinFault / results.IkMin) * 100).toFixed(0)}% reduktion
                    (kun {parseInt(mainBoardData.parallelCables) - 1} kabler virker)
                  </div>
                </div>
              </div>
            )}

            {results.faultWarning && (
              <Alert className="mt-6 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                <AlertDescription className="text-sm text-orange-900 dark:text-orange-100">
                  <strong>Advarsel:</strong> Ved fejl i én parallel leder falder Ik,min fra {results.IkMin.toFixed(0)} A til {results.IkMinFault.toFixed(0)} A.
                  Kontroller at sikringen stadig udløser tilstrækkeligt hurtigt ved denne lavere kortslutningsstrøm.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
