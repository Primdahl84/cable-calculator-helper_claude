import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calculator, Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SegmentInput } from "./SegmentInput";
import type { SegmentData } from "@/lib/calculations";
import type { ApartmentData } from "./ApartmentDetailView";
import type { CalculationStep } from "./CableCalculator";
import {
  lookupIz,
  voltageDropDs,
  getCableImpedancePerKm,
  ikMinStik,
  ikMaxStik,
  thermalOk,
  STANDARD_SIZES,
  calculateEarthFaultProtection,
  calculateMinimumEarthConductorSize,
} from "@/lib/calculations";
import { getFuseData, fuseTripTimeExplain, isFuseSizeAvailable, getAvailableFuseSizes } from "@/lib/fuseCurves";
import { useProject } from "@/contexts/ProjectContext";
import { MultiFuseCurveChart } from "./MultiFuseCurveChart";

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
  earthFaultSystem?: "TN" | "TT"; // Jordfejlssystem (default TN for hovedtavle)
  sourceZs?: string; // Kildeimpedans Zs for TN-systemer [Ω]
  earthResistance?: string; // Jordmodstand Ra for TT-systemer [Ω]
}

interface MainBoardTabProps {
  apartments: ApartmentData[];
  onAddLog?: (title: string, type: 'service' | 'group', steps: CalculationStep[]) => void;
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
  cableType: "single-core",
});

export function MainBoardTab({ apartments, onAddLog }: MainBoardTabProps) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id || 'default';
  const storageKey = `main-board-state-${projectId}`;

  const [mainBoardData, setMainBoardData] = useState<MainBoardData>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all segments have insulationType and cableType set (migration for old data)
        if (parsed.segments) {
          parsed.segments = parsed.segments.map((seg: SegmentData) => ({
            ...seg,
            insulationType: seg.insulationType || "XLPE",
            cableType: seg.cableType || "single-core",
          }));
        }
        // Ensure earth fault protection fields exist (migration for old data)
        return {
          ...parsed,
          earthFaultSystem: parsed.earthFaultSystem || "TN", // TN er standard for hovedtavle
          sourceZs: parsed.sourceZs || "0.15",
          earthResistance: parsed.earthResistance || "50",
        };
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
          earthFaultSystem: "TN", // TN er standard for hovedtavle
          sourceZs: "0.15",
          earthResistance: "50",
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
      earthFaultSystem: "TN", // TN er standard for hovedtavle
      sourceZs: "0.15",
      earthResistance: "50",
    };
  });

  const [results, setResults] = useState<{
    chosenSize: number | null;
    earthConductorSize: number | null; // Calculated earth conductor size
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
    fuseUnavailableWarning: string;
    recommendedIndividualFuseSize?: number; // For parallel cables
    individualCableCurrent?: number; // Current per cable
    earthFault?: {
      Zs?: number;
      Ia?: number;
      meetsSafetyRequirement: boolean;
      rcdRequired?: "30mA" | "300mA" | "none";
      warnings: string[];
    } | null;
  } | null>(null);

  // Track last calculation to prevent redundant calculations
  const lastCalculationRef = useRef<string>("");

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
      const current = apt.phases === "3-faset"
        ? totalPower / (Math.sqrt(3) * voltage * cos)
        : totalPower / (voltage * cos);

      totalCurrent += current;
    }

    return totalCurrent;
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apartments, mainBoardData.autoFuseSize, mainBoardData.fuseRating]);

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
          const errorMessage = error instanceof Error ? error.message : String(error);
          toast.error(`Beregning fejl: ${errorMessage}`);
          setResults(null);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainBoardData, apartments, onAddLog]); // calculateMainBoard defined below

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
    const steps: CalculationStep[] = [];

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
          // Each parallel cable must be able to handle its share of the current
          // Current per cable = In / nParallel
          // Required capacity per cable = In / nParallel
          const currentPerCable = In / nParallel;
          if (currentPerCable > IzCorr) {
            overloadOk = false;
            break;
          }
        }

        if (!overloadOk) continue;

        // Voltage drop calculation
        let duTotal = 0;
        for (const seg of mainBoardData.segments) {
          // For parallel cables, use total equivalent cross-section (n × size)
          const effectiveCrossSection = size * nParallel;
          const { du } = voltageDropDs(Uv, In, mainBoardData.material, effectiveCrossSection, seg.length, phases, cosPhi);
          duTotal += du;
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

    // Calculate voltage drop
    let totalVoltageDrop = 0;
    for (const seg of mainBoardData.segments) {
      const effectiveCrossSection = chosenSize * nParallel;
      const { du } = voltageDropDs(Uv, In, mainBoardData.material, effectiveCrossSection, seg.length, phases, cosPhi);
      totalVoltageDrop += du;
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

    // Validate fuse rating
    if (isNaN(fuseRating) || fuseRating <= 0) {
      toast.error("Sikringsstørrelse skal være et tal større end 0");
      return;
    }

    // Check if fuse size is available
    const fuseSizeAvailable = isFuseSizeAvailable("Standard", mainBoardData.fuseType, fuseRating);
    let tripTime = 0;
    let isThermalOk = false;
    let fuseUnavailableWarning = "";
    let InCurve = 0;
    let kValue = 0;

    if (!fuseSizeAvailable) {
      const availableSizes = getAvailableFuseSizes("Standard", mainBoardData.fuseType);
      fuseUnavailableWarning = `⚠️ ${mainBoardData.fuseType} sikring ${fuseRating.toFixed(0)} A findes ikke i tabelerne.\n\nTilgængelige størrelser: ${availableSizes.join(", ")} A\n\nVælg venligst en tilgængelig størrelse eller en anden sikringstype.`;
    } else {
      try {
        const { curvePoints, InCurve: InCurveValue } = getFuseData("Standard", mainBoardData.fuseType, fuseRating);
        InCurve = InCurveValue;

        const useAbsoluteIk = mainBoardData.fuseType === "Diazed gG" ||
                              mainBoardData.fuseType === "Diazed D2/D3/D4" ||
                              mainBoardData.fuseType === "Neozed gG" ||
                              mainBoardData.fuseType === "Knivsikring gG" ||
                              mainBoardData.fuseType === "Knivsikring NH00" ||
                              mainBoardData.fuseType === "Knivsikring NH0" ||
                              mainBoardData.fuseType === "Knivsikring NH1";
        const { time: calculatedTripTime } = fuseTripTimeExplain(InCurve, ikMinWorstCase, curvePoints, useAbsoluteIk);
        tripTime = calculatedTripTime;

        // Use correct k-value based on material: Cu=143, Al=94
        kValue = mainBoardData.material === "Cu" ? 143 : 94;
        const thermalResult = thermalOk(kValue, chosenSize, ikMinWorstCase, tripTime);
        isThermalOk = thermalResult.ok;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Fejl ved sikringsberegning: ${errorMsg}`);
      }
    }
    
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
    if (nParallel > 1) {
      izNødvendigLines.push(`Strøm per kabel: ${(In / nParallel).toFixed(2)} A (total ${In.toFixed(2)} A / ${nParallel} kabler)`);
    }
    mainBoardData.segments.forEach((seg, idx) => {
      const currentPerCable = In / nParallel;
      const izNødvendig = currentPerCable / (seg.kt * seg.kgrp);
      if (nParallel > 1) {
        izNødvendigLines.push(`Segment ${idx + 1}: Iz,nødvendig = ${currentPerCable.toFixed(2)} / (${seg.kt.toFixed(3)} × 1.000 × ${seg.kgrp.toFixed(3)}) = ${izNødvendig.toFixed(2)} A`);
      } else {
        izNødvendigLines.push(`Segment ${idx + 1}: Iz,nødvendig = ${In.toFixed(2)} / (${seg.kt.toFixed(3)} × 1.000 × ${seg.kgrp.toFixed(3)}) = ${izNødvendig.toFixed(2)} A`);
      }
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
      overbelastningLines.push(`Strøm per kabel: ${(In / nParallel).toFixed(2)} A`);
    }

    mainBoardData.segments.forEach((seg, idx) => {
      const iz = lookupIz(mainBoardData.material, seg.installMethod, chosenSize || 0, seg.loadedConductors, seg.insulationType || "XLPE");
      const IzCorr = iz * seg.kt * seg.kgrp;
      const currentPerCable = In / nParallel;
      overbelastningLines.push(`\nSegment ${idx + 1}:`);
      overbelastningLines.push(`  Iz,tabel = ${iz.toFixed(2)} A`);
      overbelastningLines.push(`  Iz,korrigeret = ${iz.toFixed(2)} × ${seg.kt.toFixed(3)} × 1.000 × ${seg.kgrp.toFixed(3)} = ${IzCorr.toFixed(2)} A`);
      if (nParallel > 1) {
        overbelastningLines.push(`  ✓ Strøm per kabel ≤ Iz,korr (${currentPerCable.toFixed(2)} A ≤ ${IzCorr.toFixed(2)} A)`);
      } else {
        overbelastningLines.push(`  ${In <= IzCorr ? '✓' : '✗'} In ≤ Iz,korr (${In.toFixed(2)} A ≤ ${IzCorr.toFixed(2)} A)`);
      }
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

    if (nParallel > 1) {
      spaendingsfaldLines.push(`${nParallel} parallelle kabler á ${chosenSize} mm² = ${chosenSize * nParallel} mm² ækvivalent tværsnit`);
    }

    mainBoardData.segments.forEach((seg, idx) => {
      const effectiveCrossSection = chosenSize * nParallel;
      const { du, duPercent } = voltageDropDs(Uv, In, mainBoardData.material, effectiveCrossSection, seg.length, phases, cosPhi);
      spaendingsfaldLines.push(`Segment ${idx + 1}: L=${seg.length}m → ΔU=${du.toFixed(2)}V (${duPercent.toFixed(2)}%)`);
    });

    spaendingsfaldLines.push("\n=== Total spændingsfald ===");
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

    // Calculate recommended individual fuse size for parallel cables
    let recommendedIndividualFuseSize: number | undefined;
    let individualCableCurrent: number | undefined;

    if (nParallel > 1) {
      // Current through each individual cable
      individualCableCurrent = In / nParallel;

      // Find smallest standard fuse size that can handle this current
      // Add 10% safety margin
      const requiredFuseSize = individualCableCurrent * 1.1;
      recommendedIndividualFuseSize = STANDARD_FUSE_SIZES.find(size => size >= requiredFuseSize)
        || STANDARD_FUSE_SIZES[STANDARD_FUSE_SIZES.length - 1];
    }

    // JORDFEJLSBESKYTTELSE (EARTH FAULT PROTECTION)
    let earthFaultResults: {
      Zs?: number;
      Ia?: number;
      meetsSafetyRequirement: boolean;
      rcdRequired?: "30mA" | "300mA" | "none";
      warnings: string[];
    } | null = null;

    try {
      const systemType = mainBoardData.earthFaultSystem || "TN";
      const sourceZsValue = parseFloat(mainBoardData.sourceZs || "0.15");
      const earthResistanceValue = parseFloat(mainBoardData.earthResistance || "50");

      const earthFaultCalc = calculateEarthFaultProtection({
        systemType,
        voltage: 400, // Hovedtavle er typisk 3-faset 400V
        fuseType: mainBoardData.fuseType,
        fuseSize: In,
        segments: mainBoardData.segments.map(seg => ({
          ...seg,
          crossSection: chosenSize || seg.crossSection
        })),
        material: mainBoardData.material,
        phase: "3-faset", // Hovedtavle er typisk 3-faset
        sourceZs: sourceZsValue,
        earthResistance: earthResistanceValue,
        circuitType: "distribution" // Hovedtavle er distribution
      });

      earthFaultResults = {
        Zs: earthFaultCalc.Zs,
        Ia: earthFaultCalc.Ia,
        meetsSafetyRequirement: earthFaultCalc.meetsSafetyRequirement,
        rcdRequired: earthFaultCalc.rcdRequired,
        warnings: earthFaultCalc.warnings
      };

      // === JORDFEJLSBESKYTTELSE ===
      const jordfejlLines: string[] = [];
      jordfejlLines.push("=== Jordfejlsbeskyttelse (DS 183) ===");
      jordfejlLines.push(`Systemtype: ${systemType}${systemType === "TN" ? " (TN-C-S/TN-S)" : " (Egen jord)"}`);

      if (systemType === "TN") {
        jordfejlLines.push(`\nKildeimpedans: Zs,source = ${sourceZsValue.toFixed(3)} Ω`);
        jordfejlLines.push(`Total sløjfeimpedans: Zs = ${earthFaultCalc.Zs?.toFixed(3)} Ω`);
        jordfejlLines.push(`Jordfejlsstrøm: Ia = ${earthFaultCalc.Ia?.toFixed(1)} A`);
        jordfejlLines.push(`\nSikring: ${mainBoardData.fuseType} ${In}A`);
      } else {
        jordfejlLines.push(`\nJordmodstand: Ra = ${earthResistanceValue.toFixed(1)} Ω`);
        jordfejlLines.push(`Jordspyd typisk 6mm² Cu beskyttet`);
        jordfejlLines.push(`Jordfejlsstrøm: Ia = ${earthFaultCalc.Ia?.toFixed(2)} A`);
      }

      // RCD krav
      if (earthFaultCalc.rcdRequired === "30mA") {
        jordfejlLines.push(`\n⚠️ HPFI påkrævet: 30 mA (Badeværelse/udendørs)`);
      } else if (earthFaultCalc.rcdRequired === "300mA") {
        jordfejlLines.push(`\n⚠️ HPFI påkrævet: 300 mA (Sikkerhedskrav ikke opfyldt)`);
      } else {
        jordfejlLines.push(`\n✓ HPFI ikke påkrævet (sikkerhedskrav opfyldt)`);
      }

      // Advarsler
      if (earthFaultCalc.warnings.length > 0) {
        jordfejlLines.push(`\n=== Advarsler ===`);
        earthFaultCalc.warnings.forEach(w => jordfejlLines.push(w));
      }

      jordfejlLines.push(`\n${earthFaultCalc.meetsSafetyRequirement ? '✓ Jordfejlsbeskyttelse OK' : '✗ Jordfejlsbeskyttelse IKKE OK'}`);

      steps.push({
        category: "kortslutning",
        formula: "Jordfejlsbeskyttelse",
        variables: jordfejlLines.join("\n"),
        calculation: "",
        result: earthFaultCalc.meetsSafetyRequirement ? `✓ Jordfejlsbeskyttelse OK` : `✗ Jordfejlsbeskyttelse IKKE OK`
      });
    } catch (error) {
      console.error("Fejl i jordfejlsberegninger:", error);
    }

    // Calculate earth conductor size based on the chosen cable size
    const earthConductorSize = chosenSize
      ? calculateMinimumEarthConductorSize(
          chosenSize,
          mainBoardData.material,
          mainBoardData.segments[0]?.cableType || "single-core",
          mainBoardData.earthFaultSystem,
          "distribution"
        )
      : null;

    setResults({
      chosenSize,
      earthConductorSize,
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
      fuseUnavailableWarning,
      recommendedIndividualFuseSize,
      individualCableCurrent,
      earthFault: earthFaultResults,
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

  const handleCalculateMainBoard = () => {
    try {
      calculateMainBoard(true);
    } catch (error) {
      console.error("Main board calculation error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Beregning fejl: ${errorMessage}`);
      setResults(null);
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
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Maks. spændingsfald [%]</Label>
                <Input
                  value={mainBoardData.maxVoltageDrop}
                  onChange={(e) => setMainBoardData({ ...mainBoardData, maxVoltageDrop: e.target.value })}
                  placeholder="1.0"
                />
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
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div className="space-y-4">
              
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

          {/* Earth Fault Protection Settings */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Jordfejlsbeskyttelse (DS 183)</CardTitle>
              <CardDescription className="text-xs">
                {mainBoardData.earthFaultSystem === "TT"
                  ? "TT-system: Typisk for parcelhuse med jordspyd (6mm² Cu)"
                  : "TN-system: Typisk for større bygninger med PE-leder"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Jordsystem</Label>
                  <Select
                    value={mainBoardData.earthFaultSystem || "TN"}
                    onValueChange={(value: "TN" | "TT") => setMainBoardData({ ...mainBoardData, earthFaultSystem: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TN">TN (PE-leder - stor bygning)</SelectItem>
                      <SelectItem value="TT">TT (Jordspyd - parcelhus)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {mainBoardData.earthFaultSystem === "TN" && (
                  <div className="space-y-1">
                    <Label>Kildeimpedans Zs [Ω]</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={mainBoardData.sourceZs || "0.15"}
                      onChange={(e) => setMainBoardData({ ...mainBoardData, sourceZs: e.target.value })}
                      placeholder="0.15"
                    />
                  </div>
                )}

                {mainBoardData.earthFaultSystem === "TT" && (
                  <div className="space-y-1">
                    <Label>Jordmodstand Ra [Ω]</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={mainBoardData.earthResistance || "50"}
                      onChange={(e) => setMainBoardData({ ...mainBoardData, earthResistance: e.target.value })}
                      placeholder="50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Jordspyd typisk 6mm² Cu beskyttet
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
                  material={mainBoardData.material}
                  earthSystem={mainBoardData.earthFaultSystem}
                  circuitType="distribution"
                />
              </div>
            ))}
          </div>

          <Button onClick={handleCalculateMainBoard} className="w-full" size="lg">
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
          <CardContent className="space-y-6">
            {/* Fuse Unavailable Warning */}
            {results.fuseUnavailableWarning && (
              <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-sm text-red-900 dark:text-red-100 whitespace-pre-line ml-2">
                  {results.fuseUnavailableWarning}
                </AlertDescription>
              </Alert>
            )}

            {/* Top Row: 4-column grid */}
            <div className="grid grid-cols-4 gap-6">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Enkelt kabel tværsnit</div>
                <div className="text-xl font-bold">{results.chosenSize} mm²</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Jordleder [mm²]</div>
                <div className="text-xl font-bold text-green-600">
                  {results.earthConductorSize} mm²
                </div>
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
                  <span className="text-xs font-semibold">Ik,min ved fejl i 1 leder (worst case)</span>
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
                  <div className="mt-2 text-muted-foreground">
                    {results.faultWarning
                      ? "Strømmen er muligvis for lav til at udløse beskyttelsen i tide"
                      : "Verificer stadig at individuelle ledere er beskyttet"
                    }
                  </div>
                </div>
              </div>
            )}

            {results.fuseUnavailableWarning && (
              <Alert className="mt-6 border-red-500 bg-red-50 dark:bg-red-950/20">
                <AlertDescription className="text-sm text-red-900 dark:text-red-100 whitespace-pre-line">
                  {results.fuseUnavailableWarning}
                </AlertDescription>
              </Alert>
            )}

            {/* Always show info about parallel cables protection requirements */}
            {parseInt(mainBoardData.parallelCables) > 1 && (
              <Alert className={`mt-6 ${results.faultWarning ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'}`}>
                <AlertCircle className={`h-4 w-4 ${results.faultWarning ? 'text-orange-600' : 'text-blue-600'}`} />
                <AlertDescription className={`text-sm ${results.faultWarning ? 'text-orange-900 dark:text-orange-100' : 'text-blue-900 dark:text-blue-100'}`}>
                  <div className="space-y-3">
                    <div>
                      <strong>{results.faultWarning ? '⚠ Advarsel' : 'ℹ Information'}: Kortslutningsbeskyttelse af parallelforbundne ledere</strong>
                    </div>
                    <div>
                      Ved fejl i én parallel leder falder Ik,min fra {results.IkMin.toFixed(0)} A til {results.IkMinFault.toFixed(0)} A
                      (reduktion på {((1 - results.IkMinFault / results.IkMin) * 100).toFixed(0)}%).
                      {results.faultWarning
                        ? ' Hovedsikringen alene kan ikke nødvendigvis beskytte de individuelle ledere effektivt.'
                        : ' Verificer at beskyttelsen stadig er tilstrækkelig ved denne reducerede strøm.'
                      }
                    </div>
                    <div className={`border-l-4 ${results.faultWarning ? 'border-orange-400 bg-orange-100/50 dark:bg-orange-900/20' : 'border-blue-400 bg-blue-100/50 dark:bg-blue-900/20'} pl-3 py-2`}>
                      <div className="font-semibold mb-1">Anbefaling (IEC 60364-4-43, A.3):</div>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Installer individuelle sikringer for hver parallel leder i forsyningsenden</li>
                        <li>Overvej beskyttelse i både forsynings- og belastningsenden</li>
                        <li>Alternativt: forbundne beskyttelsesudstyrer i forsyningsenden</li>
                        <li>Verificer at beskyttelsen udløser ved Ik,min = {results.IkMinFault.toFixed(0)} A inden for 0,4s (DS 183, tabel 52.A)</li>
                      </ul>
                    </div>
                    <div className="text-xs italic">
                      Individuelle sikringer sikrer, at selv ved fejl i én enkelt leder, vil strømmen gennem denne
                      leder være tilstrækkelig til at udløse beskyttelsen inden for den krævede tid.
                      Se IEC 60364-4-43 Appendix A.3, figur A.3 og A.4.
                    </div>

                    {/* Recommended individual fuse sizes and diagram */}
                    {results.recommendedIndividualFuseSize && results.individualCableCurrent && (
                      <div className="mt-4 p-3 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-700">
                        <div className="font-semibold text-sm mb-2">💡 Anbefalet opsætning:</div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Strøm per kabel:</div>
                            <div className="text-lg font-bold">{results.individualCableCurrent.toFixed(1)} A</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Anbefalet sikring per kabel:</div>
                            <div className="text-lg font-bold text-green-600">{results.recommendedIndividualFuseSize} A</div>
                          </div>
                        </div>

                        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs">
                          <strong>ℹ Note:</strong> Med individuelle sikringer er hovedsikringen <strong>ikke strengt nødvendig</strong> for
                          kortslutningsbeskyttelse af kablerne. Hovedsikringen kan dog stadig være relevant for:
                          <ul className="list-disc list-inside ml-2 mt-1">
                            <li>Overbelastningsbeskyttelse af forsyningen</li>
                            <li>Selektivitet (backup-beskyttelse)</li>
                            <li>Krav fra forsyningsselskabet</li>
                          </ul>
                        </div>

                        {/* SVG Diagram */}
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                          <svg viewBox="0 0 600 400" className="w-full h-auto">
                            {/* Title */}
                            <text x="300" y="30" textAnchor="middle" className="fill-current text-sm font-semibold">
                              Opsætning med individuelle sikringer
                            </text>

                            {/* Supply */}
                            <text x="50" y="120" textAnchor="middle" className="fill-current text-xs">Forsyning</text>
                            <circle cx="50" cy="140" r="15" className="fill-blue-500" />

                            {/* Main fuse - shown with dashed outline to indicate optional */}
                            <line x1="65" y1="140" x2="120" y2="140" className="stroke-current stroke-2 opacity-50" strokeDasharray="4 2" />
                            <rect x="120" y="125" width="40" height="30" className="fill-red-500 stroke-current stroke-2 opacity-50" strokeDasharray="4 2" />
                            <text x="140" y="145" textAnchor="middle" className="fill-white text-xs font-bold opacity-70">
                              {mainBoardData.fuseRating}A
                            </text>
                            <text x="140" y="115" textAnchor="middle" className="fill-current text-xs opacity-70">Hovedsikring</text>
                            <text x="140" y="170" textAnchor="middle" className="fill-current text-xs italic opacity-70">(valgfri)</text>

                            {/* Distribution point */}
                            <line x1="160" y1="140" x2="220" y2="140" className="stroke-current stroke-2" />
                            <circle cx="220" cy="140" r="8" className="fill-gray-400 stroke-current stroke-2" />

                            {/* Parallel cables with individual fuses */}
                            {Array.from({ length: parseInt(mainBoardData.parallelCables) }, (_, i) => {
                              const nCables = parseInt(mainBoardData.parallelCables);
                              const maxSpacing = 180;
                              const spacing = Math.min(maxSpacing / Math.max(nCables - 1, 1), 80);
                              const yPos = 140 + (i - (nCables - 1) / 2) * spacing;
                              const cableNum = i + 1;

                              return (
                                <g key={i}>
                                  {/* Line from distribution to individual fuse */}
                                  <line x1="220" y1="140" x2="280" y2={yPos} className="stroke-current stroke-2" />

                                  {/* Individual fuse */}
                                  <rect x="280" y={yPos - 15} width="35" height="30" className="fill-orange-500 stroke-current stroke-2" />
                                  <text x="297.5" y={yPos + 5} textAnchor="middle" className="fill-white text-xs font-bold">
                                    {results.recommendedIndividualFuseSize}A
                                  </text>

                                  {/* Cable */}
                                  <line x1="315" y1={yPos} x2="450" y2={yPos} className="stroke-current stroke-3" />
                                  <text x="382.5" y={yPos - 5} textAnchor="middle" className="fill-current text-xs">
                                    Kabel {cableNum}
                                  </text>
                                  <text x="382.5" y={yPos + 15} textAnchor="middle" className="fill-current text-xs font-semibold">
                                    {results.chosenSize}mm²
                                  </text>

                                  {/* Line from cable end to load connection point */}
                                  <line x1="450" y1={yPos} x2="450" y2="140" className="stroke-current stroke-2" />
                                </g>
                              );
                            })}

                            {/* Load connection point */}
                            <circle cx="450" cy="140" r="8" className="fill-gray-400 stroke-current stroke-2" />

                            {/* Load */}
                            <line x1="458" y1="140" x2="500" y2="140" className="stroke-current stroke-2" />
                            <circle cx="530" cy="140" r="20" className="fill-green-500 stroke-current stroke-2" />
                            <text x="530" y="145" textAnchor="middle" className="fill-white text-xs font-bold">Last</text>
                            <text x="530" y="175" textAnchor="middle" className="fill-current text-xs">
                              {results.totalCurrent.toFixed(0)} A
                            </text>
                          </svg>
                        </div>

                        <div className="mt-2 text-xs space-y-1">
                          <div className="text-muted-foreground">
                            <strong>✓ Vigtigt:</strong> Individuelle sikringer skal monteres i forsyningsenden af hver parallel leder.
                          </div>
                          <div className="text-muted-foreground">
                            <strong>✓ Verificer:</strong> At {results.recommendedIndividualFuseSize}A sikringen kan udløse ved Ik,min = {results.IkMinFault.toFixed(0)} A inden for 0,4s.
                          </div>
                          <div className="text-green-700 dark:text-green-400 font-medium">
                            <strong>→ Resultat:</strong> Med individuelle {results.recommendedIndividualFuseSize}A sikringer behøver du ikke hovedsikringen for kortslutningsbeskyttelse af kablerne.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Earth Fault Protection Results */}
            {results.earthFault && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Jordfejlsbeskyttelse</div>
                  {results.earthFault.meetsSafetyRequirement ? (
                    <Badge variant="default" className="bg-green-500">✓ OK</Badge>
                  ) : (
                    <Badge variant="destructive">✗ IKKE OK</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
                  {results.earthFault.Zs !== undefined && (
                    <div className="space-y-0.5">
                      <div className="text-xs text-muted-foreground">Sløjfeimpedans Zs:</div>
                      <div className="text-sm font-bold">{results.earthFault.Zs.toFixed(3)} Ω</div>
                    </div>
                  )}

                  {results.earthFault.Ia !== undefined && (
                    <div className="space-y-0.5">
                      <div className="text-xs text-muted-foreground">Jordfejlsstrøm Ia:</div>
                      <div className="text-sm font-bold">{results.earthFault.Ia.toFixed(1)} A</div>
                    </div>
                  )}

                  {results.earthFault.rcdRequired && results.earthFault.rcdRequired !== "none" && (
                    <div className="space-y-0.5">
                      <div className="text-xs text-muted-foreground">HPFI krav:</div>
                      <Badge variant="outline" className="text-xs">{results.earthFault.rcdRequired}</Badge>
                    </div>
                  )}
                </div>

                {results.earthFault.warnings.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {results.earthFault.warnings.map((warning, idx) => (
                      <div key={idx} className="text-xs text-amber-600 dark:text-amber-400">
                        {warning}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fuse curve chart */}
            <div className="mt-6 pt-6 border-t">
              <div className="text-sm font-semibold mb-2">Sikringskurver</div>
              <div className="text-xs text-muted-foreground mb-3">
                {mainBoardData.fuseType} med {mainBoardData.fuseRating}A fremhævet, Ik,min = {results.IkMin.toFixed(1)} A
              </div>
              <MultiFuseCurveChart
                manufacturer="Standard"
                fuseType={mainBoardData.fuseType}
                selectedFuseSize={parseFloat(mainBoardData.fuseRating)}
                highlightCurrent={results.IkMin}
                highlightLabel={`Ik,min = ${results.IkMin.toFixed(1)} A`}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
