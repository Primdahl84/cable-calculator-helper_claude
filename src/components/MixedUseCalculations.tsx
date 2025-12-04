import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Plus, Trash2 } from "lucide-react";
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
  formatCurrentWithAngle,
  ikMinGroup,
} from "@/lib/calculations";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { getFuseData, fuseTripTimeExplain, DIAZED_SIZES, DIAZED_D2D3D4_SIZES, NEOZED_SIZES, KNIV_SIZES, NH00_SIZES, NH0_SIZES, NH1_SIZES, MCB_SIZES, autoSelectMcbType } from "@/lib/fuseCurves";
import { autoSelectGroupCableSize } from "@/lib/groupCalculations";
import type { CalculationStep } from "./CableCalculator";
import { useProject } from "@/contexts/ProjectContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApartmentsTab } from "./ApartmentsTab";

interface MixedUseCalculationsProps {
  addLog: (title: string, type: 'service' | 'group', steps: CalculationStep[]) => void;
}

interface ServiceCable {
  name: string;
  In: string;
  fuseType: string;
  sourceVoltage: string;
  phases: "1-faset" | "3-faset";
  material: "Cu" | "Al";
  cosPhi: string;
  maxVoltageDrop: string;
  autoSize: "auto" | "manual";
  ikTrafo: string;
  iMinSupply: string;
  cosTrafo: string;
  kValue: string;
  tripTime: string;
  fuseManufacturer: string;
  segments: SegmentData[];
  results?: any;
}

interface GroupData {
  id: string;
  name: string;
  In: string;
  fuseType: string;
  fuseRating: string;
  phase: "1-faset" | "3-faset";
  selectedPhase?: "L1" | "L2" | "L3";
  material: "Cu" | "Al";
  cosPhi: string;
  maxVoltageDrop: string;
  KjJord: string;
  autoSize: boolean;
  segments: SegmentData[];
  results?: any;
}

// Helper function to get available fuse sizes based on fuse type
const getAvailableFuseSizes = (fuseType: string): number[] => {
  switch (fuseType) {
    case "Diazed gG":
      return DIAZED_SIZES;
    case "Diazed D2/D3/D4":
      return DIAZED_D2D3D4_SIZES;
    case "Neozed gG":
      return NEOZED_SIZES;
    case "Knivsikring gG":
      return KNIV_SIZES;
    case "Knivsikring NH00":
      return NH00_SIZES;
    case "Knivsikring NH0":
      return NH0_SIZES;
    case "Knivsikring NH1":
      return NH1_SIZES;
    case "MCB B":
    case "MCB C":
    case "MCB D":
    case "MCB automatisk":
      return MCB_SIZES;
    default:
      return DIAZED_SIZES;
  }
};

// Helper to check if fuse type is a melt fuse (max 5s requirement)
const isMeltFuse = (fuseType: string): boolean => {
  return fuseType === "Diazed gG" ||
         fuseType === "Neozed gG" ||
         fuseType === "Knivsikring gG" ||
         fuseType === "Knivsikring NH00" ||
         fuseType === "Knivsikring NH0" ||
         fuseType === "Knivsikring NH1";
};

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
  name: `G${index + 1}`,
  In: "10",
  fuseType: "MCB B",
  fuseRating: "10",
  phase: "1-faset",
  selectedPhase: autoPhase || "L2",
  material: "Cu",
  cosPhi: "1.0",
  maxVoltageDrop: "5.0",
  KjJord: "1.0",
  autoSize: true,
  segments: [createDefaultSegment()],
});

export function MixedUseCalculations({ addLog }: MixedUseCalculationsProps) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id || 'default';
  const storageKey = `mixed-use-tab-state-${projectId}`;

  // Stikledning
  const [serviceCable, setServiceCable] = useState<ServiceCable>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.serviceCable || getDefaultServiceCable();
      } catch {
        return getDefaultServiceCable();
      }
    }
    return getDefaultServiceCable();
  });

  // Grupper
  const [groups, setGroups] = useState<GroupData[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.groups || [createDefaultGroup(0, "L1")];
      } catch {
        return [createDefaultGroup(0, "L1")];
      }
    }
    return [createDefaultGroup(0, "L1")];
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ serviceCable, groups }));
  }, [serviceCable, groups, storageKey]);

  // Auto-update k-value when material changes
  useEffect(() => {
    if (serviceCable.material === "Cu") {
      setServiceCable(prev => ({ ...prev, kValue: "143" }));
    } else {
      setServiceCable(prev => ({ ...prev, kValue: "94" }));
    }
  }, [serviceCable.material]);

  // Auto-update iMinSupply when fuse type changes
  useEffect(() => {
    try {
      const In = parseFloat(serviceCable.In.replace(",", "."));
      if (isFinite(In)) {
        const { IminFactor } = getFuseData(serviceCable.fuseManufacturer, serviceCable.fuseType, In);
        const calculatedImin = In * IminFactor;
        setServiceCable(prev => ({ ...prev, iMinSupply: calculatedImin.toFixed(1) }));
      }
    } catch (error) {
      console.warn("Could not calculate Imin:", error);
    }
  }, [serviceCable.fuseType, serviceCable.In, serviceCable.fuseManufacturer]);

  const prevInputsRef = useRef<string>('');
  const hasCalculatedOnceRef = useRef(false);

  // Auto-calculate when inputs change
  useEffect(() => {
    const inputsHash = JSON.stringify({
      serviceCable: {
        ...serviceCable,
        segments: serviceCable.segments.map(s => ({
          ...s,
          ...(!serviceCable.autoSize && { crossSection: s.crossSection })
        }))
      },
      groups
    });

    if (inputsHash === prevInputsRef.current) return;
    prevInputsRef.current = inputsHash;

    const timer = setTimeout(() => {
      calculateServiceCable();
      calculateGroups();
    }, 300);

    return () => clearTimeout(timer);
  }, [serviceCable, groups]);

  // Initial calculation
  useEffect(() => {
    if (!hasCalculatedOnceRef.current) {
      hasCalculatedOnceRef.current = true;
      setTimeout(() => {
        calculateServiceCable();
        calculateGroups();
      }, 100);
    }
  }, []);

  function getDefaultServiceCable(): ServiceCable {
    return {
      name: "Stikledning",
      In: "35",
      fuseType: "Diazed gG",
      sourceVoltage: "230",
      phases: "3-faset",
      material: "Cu",
      cosPhi: "1.0",
      maxVoltageDrop: "1.0",
      autoSize: "auto",
      ikTrafo: "16000",
      iMinSupply: "175",
      cosTrafo: "0.3",
      kValue: "143",
      tripTime: "5.0",
      fuseManufacturer: "Standard",
      segments: [
        {
          installMethod: "C",
          length: 21,
          ambientTemp: 30,
          loadedConductors: 3,
          crossSection: 10,
          cablesGrouped: 1,
          kt: 1.0,
          kgrp: 1.0,
        },
      ],
    };
  }

  const addSegment = () => {
    setServiceCable(prev => ({
      ...prev,
      segments: [
        ...prev.segments,
        {
          installMethod: "C",
          length: 50,
          ambientTemp: 30,
          loadedConductors: 3,
          crossSection: 10,
          cablesGrouped: 1,
          kt: 1.0,
          kgrp: 1.0,
        },
      ]
    }));
  };

  const removeSegment = (index: number) => {
    setServiceCable(prev => ({
      ...prev,
      segments: prev.segments.filter((_, i) => i !== index)
    }));
  };

  const updateSegment = (index: number, data: Partial<SegmentData>) => {
    setServiceCable(prev => ({
      ...prev,
      segments: prev.segments.map((seg, i) => i === index ? { ...seg, ...data } : seg)
    }));
  };

  const calculateServiceCable = () => {
    try {
      const logs: string[] = [];
      logs.push("=== BLANDET BOLIG/ERHVERV - STIKLEDNINGSBEREGNING ===");
      logs.push("");
      logs.push("[INPUTDATA – STIKLEDNING]");
      logs.push(`In, stikledning = ${serviceCable.In} A`);
      logs.push(`Netspænding U_n = ${serviceCable.sourceVoltage} V`);
      logs.push(`Fasesystem = ${serviceCable.phases}`);
      logs.push(`Materiale = ${serviceCable.material}`);
      logs.push(`cos φ (last) = ${serviceCable.cosPhi}`);
      logs.push(`Maks ΔU_stikledning = ${serviceCable.maxVoltageDrop} %`);
      logs.push("");

      const In = parseFloat(serviceCable.In.replace(",", "."));
      const voltage = parseFloat(serviceCable.sourceVoltage.replace(",", "."));
      const cos = parseFloat(serviceCable.cosPhi.replace(",", "."));
      const maxDrop = parseFloat(serviceCable.maxVoltageDrop.replace(",", "."));
      const IkT = parseFloat(serviceCable.ikTrafo.replace(",", "."));
      const IminSup = parseFloat(serviceCable.iMinSupply.replace(",", "."));
      const cosT = parseFloat(serviceCable.cosTrafo.replace(",", "."));
      const k = parseFloat(serviceCable.kValue.replace(",", "."));

      if (!isFinite(In) || !isFinite(voltage) || !isFinite(cos) || !isFinite(maxDrop)) {
        throw new Error("Ugyldige inputværdier.");
      }

      let chosenSize: number | null = null;

      // Auto-sizing logic (same as ServiceCableTab)
      if (serviceCable.autoSize === "auto") {
        logs.push("=== Auto tværsnit (Iz + ΔU_total + t_udkobling) – stikledning ===");
        const requireMaxTripTime = isMeltFuse(serviceCable.fuseType);
        if (requireMaxTripTime) {
          logs.push("Smeltesikring: Udkoblingstid må maks være 5,0 s");
        }

        for (const size of STANDARD_SIZES) {
          let overloadOk = true;
          let totalVDrop = 0;

          logs.push(`Afprøver tværsnit S = ${size} mm²:`);

          for (const seg of serviceCable.segments) {
            const iz = lookupIz(serviceCable.material, seg.installMethod, size, seg.loadedConductors);
            if (iz === 0) {
              logs.push(`  [ADVARSEL] Mangler Iz-data for ${serviceCable.material}, ref ${seg.installMethod}, ${seg.loadedConductors} belastede, S=${size} mm².`);
              overloadOk = false;
              break;
            }

            const IzCorr = iz * seg.kt * seg.kgrp;
            const IzNed = In / (seg.kt * seg.kgrp);

            logs.push(`  Segment ${serviceCable.segments.indexOf(seg) + 1}: Iz,tabel=${iz.toFixed(1)} A, Kt=${seg.kt.toFixed(3)}, kgrp=${seg.kgrp.toFixed(3)} ⇒ Iz,korr=${IzCorr.toFixed(1)} A, Iz,nød=${IzNed.toFixed(1)} A`);

            if (IzCorr < IzNed) {
              logs.push("    ⇒ Overbelastningsbeskyttelse IKKE OK i dette segment!");
              overloadOk = false;
              break;
            }
          }

          if (!overloadOk) {
            logs.push(`⇒ Tværsnit S = ${size} mm² er IKKE OK (Iz) – prøver større.`);
            logs.push("");
            continue;
          }

          let tempTotalLength = 0;
          for (const seg of serviceCable.segments) {
            const { duPercent } = voltageDropDs(voltage, In, serviceCable.material, size, seg.length, serviceCable.phases, cos);
            totalVDrop += duPercent;
            tempTotalLength += seg.length;
          }

          logs.push(`  ΔU_stik,total for S = ${size} mm²: ${totalVDrop.toFixed(2)} %`);

          if (totalVDrop > maxDrop) {
            logs.push(`    ⇒ Spændingsfaldet (${totalVDrop.toFixed(2)} %) overskrider grænsen på ${maxDrop} %.`);
            logs.push(`⇒ Tværsnit S = ${size} mm² er IKKE OK (ΔU) – prøver større.`);
            logs.push("");
            continue;
          }

          logs.push(`    ⇒ Spændingsfaldet er OK ift. grænsen på ${maxDrop} %.`);

          if (requireMaxTripTime) {
            const impPerKm = getCableImpedancePerKm(size, serviceCable.material, serviceCable.phases);
            const factor = tempTotalLength / 1000;
            const Zw1Min = { R: impPerKm.R * 1.5 * factor, X: impPerKm.X * factor };
            const { Ik: testIkMin } = ikMinStik(voltage, IminSup, Zw1Min);

            const { curvePoints, InCurve } = getFuseData(serviceCable.fuseManufacturer, serviceCable.fuseType, In);
            const useAbsoluteIk = usesAbsoluteIk(serviceCable.fuseType);
            const { time: testTripTime } = fuseTripTimeExplain(InCurve, testIkMin, curvePoints, useAbsoluteIk);

            logs.push(`  Udkoblingstid (sikringskurve) for S = ${size} mm²: ${testTripTime.toFixed(4)} s`);

            if (testTripTime > 5.0) {
              logs.push(`    ⇒ Udkoblingstid (${testTripTime.toFixed(4)} s) > 5,0 s (ikke OK for smeltesikring)`);
              logs.push(`⇒ Tværsnit S = ${size} mm² er IKKE OK (t_udkobling) – prøver større.`);
              logs.push("");
              continue;
            }

            logs.push(`    ⇒ Udkoblingstid OK (≤ 5,0 s)`);
          }

          logs.push(`⇒ Tværsnit S = ${size} mm² er OK for alle segmenter.`);
          logs.push("");

          chosenSize = size;
          setServiceCable(prev => ({
            ...prev,
            segments: prev.segments.map(seg => ({ ...seg, crossSection: size }))
          }));
          break;
        }

        if (!chosenSize) {
          logs.push("⚠ ADVARSEL: Ingen tværsnit kunne opfylde både Iz- og ΔU-betingelserne!");
          logs.push("");
          chosenSize = serviceCable.segments[0]?.crossSection || STANDARD_SIZES[0];
        }
      } else {
        chosenSize = serviceCable.segments[0]?.crossSection || 10;
        logs.push("Auto tværsnit er slået FRA.");
        logs.push(`Bruger tværsnit fra første segment: S = ${chosenSize} mm²`);
        logs.push("");
      }

      let totalVoltageDropPercent = 0;
      let totalLength = 0;
      let worstIzNod = 0;

      serviceCable.segments.forEach((seg, idx) => {
        const effectiveSize = serviceCable.autoSize === "auto" && chosenSize ? chosenSize : seg.crossSection;

        logs.push(`[SEGMENT ${idx + 1}]`);
        logs.push(`Installationsmetode (reference) = ${seg.installMethod}`);
        logs.push(`Længde = ${seg.length.toFixed(1)} m`);
        logs.push(`T_omgivelse = ${seg.ambientTemp.toFixed(1)} °C`);
        logs.push(`Tværsnit = ${effectiveSize.toFixed(1)} mm²`);
        logs.push(`Belastede ledere = ${seg.loadedConductors}`);
        logs.push(`Kt = ${seg.kt.toFixed(3)}`);
        logs.push(`kgrp = ${seg.kgrp.toFixed(3)}`);

        const izTab = lookupIz(serviceCable.material, seg.installMethod, effectiveSize, seg.loadedConductors);
        const IzKorr = izTab * seg.kt * seg.kgrp;
        const IzNod = In / (seg.kt * seg.kgrp);
        worstIzNod = Math.max(worstIzNod, IzNod);

        logs.push(`Iz,tabel = ${izTab.toFixed(1)} A`);
        logs.push(`Iz,korr = Iz,tabel · Kt · kgrp = ${IzKorr.toFixed(1)} A`);
        logs.push(`Iz,nød (segment) = In / (Kt · kgrp) = ${IzNod.toFixed(1)} A`);

        const { du, duPercent } = voltageDropDs(
          voltage,
          In,
          serviceCable.material,
          effectiveSize,
          seg.length,
          serviceCable.phases,
          cos,
        );

        const impedance = getCableImpedancePerKm(effectiveSize, serviceCable.material, serviceCable.phases);
        const segR = impedance.R * (seg.length / 1000);
        const segX = impedance.X * (seg.length / 1000);

        totalVoltageDropPercent += duPercent;
        totalLength += seg.length;

        logs.push(`R_segment ≈ ${segR.toFixed(5)} Ω, X_segment ≈ ${segX.toFixed(5)} Ω`);
        logs.push(`Spændingsfald i segment ≈ ${du.toFixed(2)} V (${duPercent.toFixed(2)} % af U_n)`);
        logs.push("");
      });

      const sqForShort = chosenSize ?? serviceCable.segments[0]?.crossSection ?? 10;
      const impPerKm = getCableImpedancePerKm(sqForShort, serviceCable.material, serviceCable.phases);
      const factor = totalLength / 1000;
      const Zw1Min = { R: impPerKm.R * 1.5 * factor, X: impPerKm.X * factor };
      const Zw1Max = { R: impPerKm.R * factor, X: impPerKm.X * factor };

      const { Ik: IkMin, angle: IkMinAngle } = ikMinStik(voltage, IminSup, Zw1Min);
      const { Ik: IkMax, angle: IkMaxAngle } = ikMaxStik(voltage, IkT, cosT, Zw1Max);

      const actualFuseType = serviceCable.fuseType;
      const { curvePoints, InCurve } = getFuseData(serviceCable.fuseManufacturer, actualFuseType, In);
      const useAbsoluteIk = usesAbsoluteIk(actualFuseType);
      const { time: tTrip, explanation: fuseText } = fuseTripTimeExplain(
        InCurve,
        IkMin,
        curvePoints,
        useAbsoluteIk,
      );

      const thermalCheck = thermalOk(k, sqForShort, IkMin, tTrip);

      // Build structured calculation steps
      const steps: CalculationStep[] = [];

      // OVERBELASTNINGSBESKYTTELSE
      const overbelastningLines: string[] = [];
      overbelastningLines.push("=== Segmentdata ===");
      serviceCable.segments.forEach((seg, idx) => {
        const effectiveSize = serviceCable.autoSize === "auto" && chosenSize ? chosenSize : seg.crossSection;
        const env = seg.installMethod.startsWith("D") ? "jord" : "luft";
        const Kj = env === "jord" ? 1.5 : 1.0;
        overbelastningLines.push(`Segment ${idx + 1}: Ref=${seg.installMethod} (${env}), L=${seg.length}m, T=${seg.ambientTemp}°C, S=${effectiveSize}mm², Leder=${seg.loadedConductors}, Kt=${seg.kt.toFixed(3)}, Kj=${Kj.toFixed(3)}, Kgrp=${seg.kgrp.toFixed(3)}`);
      });

      overbelastningLines.push("\n=== Iz,nødvendigt beregning ===");
      serviceCable.segments.forEach((seg, idx) => {
        const env = seg.installMethod.startsWith("D") ? "jord" : "luft";
        const Kj = env === "jord" ? 1.5 : 1.0;
        const IzNed = In / (seg.kt * Kj * seg.kgrp);
        overbelastningLines.push(`Segment ${idx + 1}: Iz,nødvendigt = ${In.toFixed(2)} / (${seg.kt.toFixed(3)} × ${Kj.toFixed(3)} × ${seg.kgrp.toFixed(3)}) = ${IzNed.toFixed(2)} A`);
      });

      if (chosenSize !== null) {
        overbelastningLines.push("\n=== Iz,korrigeret for valgt kabel ===");
        overbelastningLines.push(`Valgt tværsnit: ${chosenSize} mm²`);
        serviceCable.segments.forEach((seg, idx) => {
          const effectiveSize = serviceCable.autoSize === "auto" && chosenSize ? chosenSize : seg.crossSection;
          const env = seg.installMethod.startsWith("D") ? "jord" : "luft";
          const Kj = env === "jord" ? 1.5 : 1.0;
          const izTab = lookupIz(serviceCable.material, seg.installMethod, effectiveSize, seg.loadedConductors);
          const IzCorr = izTab * seg.kt * Kj * seg.kgrp;
          overbelastningLines.push(`Segment ${idx + 1}: Iz,korrigeret = ${izTab.toFixed(2)} × ${seg.kt.toFixed(3)} × ${Kj.toFixed(3)} × ${seg.kgrp.toFixed(3)} = ${IzCorr.toFixed(2)} A ≥ In = ${In.toFixed(2)} A ✓`);
        });
      }

      steps.push({
        category: "overbelastning",
        formula: "Overbelastningsbeskyttelse",
        variables: overbelastningLines.join("\n"),
        calculation: "",
        result: chosenSize !== null ? `Kabel godkendt for overbelastning` : "",
      });

      // KORTSLUTNINGSBESKYTTELSE
      const kortslutningLines: string[] = [];
      const Zw1Mag = Math.sqrt(Zw1Min.R * Zw1Min.R + Zw1Min.X * Zw1Min.X);
      const Zw1Angle = Math.atan2(Zw1Min.X, Zw1Min.R) * (180 / Math.PI);

      kortslutningLines.push("=== Kabelimpedans ===");
      kortslutningLines.push(`L_total = ${totalLength}m`);
      kortslutningLines.push(`R/km = ${impPerKm.R.toFixed(5)} Ω/km, X/km = ${impPerKm.X.toFixed(5)} Ω/km`);
      kortslutningLines.push(`Z_w1 = (${totalLength}/1000) × (1.5×${impPerKm.R.toFixed(5)} + i×${impPerKm.X.toFixed(5)})`);
      kortslutningLines.push(`Z_w1 = ${Zw1Min.R.toFixed(5)} + i×${Zw1Min.X.toFixed(5)} Ω`);
      kortslutningLines.push(`|Z_w1| = ${Zw1Mag.toFixed(5)} ∠${Zw1Angle.toFixed(2)}° Ω`);

      kortslutningLines.push("\n=== Forsyningsimpedans ===");
      const ZsupMin = voltage / IminSup;
      kortslutningLines.push(`Z_sup_min = U_n / I_min_forsyning = ${voltage} / ${IminSup.toFixed(1)} = ${ZsupMin.toFixed(5)} Ω`);

      kortslutningLines.push("\n=== Ik,min beregning ===");
      kortslutningLines.push(`Ik,min = U_n / (Z_sup_min + 2×Z_w1)`);
      kortslutningLines.push(`Ik,min = ${voltage} / (${ZsupMin.toFixed(5)} + 2×${Zw1Mag.toFixed(5)})`);
      kortslutningLines.push(`Ik,min = ${IkMin.toFixed(2)} A ∠${IkMinAngle.toFixed(2)}°`);

      kortslutningLines.push("\n=== Ik,max beregning ===");
      const Zw1MaxMag = Math.sqrt(Zw1Max.R * Zw1Max.R + Zw1Max.X * Zw1Max.X);
      kortslutningLines.push(`Ik,max beregnet fra trafo: ${IkT.toFixed(1)} A, cos φ = ${cosT.toFixed(3)}`);
      kortslutningLines.push(`Z_w1_max = ${Zw1MaxMag.toFixed(5)} Ω`);
      kortslutningLines.push(`Ik,max = ${IkMax.toFixed(2)} A ∠${IkMaxAngle.toFixed(2)}°`);

      kortslutningLines.push("\n=== Springetid fra sikringskurve ===");
      kortslutningLines.push(`Sikring: ${actualFuseType} ${In} A`);
      kortslutningLines.push(`Ik,min = ${IkMin.toFixed(1)} A, In_kurve = ${InCurve.toFixed(1)} A`);
      kortslutningLines.push(`m = Ik/In = ${(IkMin / InCurve).toFixed(2)}`);
      kortslutningLines.push(`t_udkobling ≈ ${tTrip.toFixed(4)} s ${isMeltFuse(actualFuseType) && tTrip > 5.0 ? '✗ > 5 s' : '✓ OK'}`);

      kortslutningLines.push("\n=== Termisk kontrol ===");
      kortslutningLines.push(`k = ${k} (materiale konstant)`);
      kortslutningLines.push(`S = ${sqForShort} mm²`);
      kortslutningLines.push(`E_kabel = k²×S² = ${k}²×${sqForShort}² = ${thermalCheck.Ekabel.toFixed(0)} A²s`);
      kortslutningLines.push(`E_bryde = I²×t = ${IkMin.toFixed(1)}²×${tTrip.toFixed(4)} = ${thermalCheck.Ebryde.toFixed(0)} A²s`);
      kortslutningLines.push(`Termisk: ${thermalCheck.ok ? '✓ OK' : '✗ IKKE OK'} (${thermalCheck.Ekabel.toFixed(0)} ${thermalCheck.ok ? '≥' : '<'} ${thermalCheck.Ebryde.toFixed(0)} A²s)`);

      steps.push({
        category: "kortslutning",
        formula: "Kortslutningsbeskyttelse",
        variables: kortslutningLines.join("\n"),
        calculation: "",
        result: "Kabel og sikring godkendt for kortslutning",
      });

      // SPÆNDINGSFALD
      const spaendingsfaldLines: string[] = [];
      const sinPhi = Math.sqrt(1 - cos * cos);

      spaendingsfaldLines.push("=== Spændingsfald per segment ===");
      serviceCable.segments.forEach((seg, idx) => {
        const effectiveSize = serviceCable.autoSize === "auto" && chosenSize ? chosenSize : seg.crossSection;
        const { du, duPercent } = voltageDropDs(voltage, In, serviceCable.material, effectiveSize, seg.length, serviceCable.phases, cos);
        spaendingsfaldLines.push(`Segment ${idx + 1}: L=${seg.length}m, S=${effectiveSize}mm², In=${In.toFixed(2)}A → ΔU=${du.toFixed(2)}V (${duPercent.toFixed(2)}%)`);
      });

      const duVolt = (totalVoltageDropPercent * voltage) / 100;
      spaendingsfaldLines.push("\n=== Total spændingsfald ===");
      spaendingsfaldLines.push(`Formel: ΔU = ${serviceCable.phases === "3-faset" ? "(L/1000)×I×(R×cos φ + X×sin φ)×√3" : "(L/1000)×I×(R×cos φ + X×sin φ)×2"}`);
      spaendingsfaldLines.push(`cos φ = ${cos.toFixed(3)}, sin φ = ${sinPhi.toFixed(3)}`);
      spaendingsfaldLines.push(`Total ΔU = ${duVolt.toFixed(2)} V = ${totalVoltageDropPercent.toFixed(2)}%`);
      spaendingsfaldLines.push(`Grænse: ${maxDrop.toFixed(2)}% → ${totalVoltageDropPercent <= maxDrop ? '✓ OK' : '✗ For højt'}`);

      steps.push({
        category: "spændingsfald",
        formula: "Spændingsfald",
        variables: spaendingsfaldLines.join("\n"),
        calculation: "",
        result: `${duVolt.toFixed(2)} V (${totalVoltageDropPercent.toFixed(2)}% ≤ ${maxDrop.toFixed(2)}%)`,
      });

      setServiceCable(prev => ({
        ...prev,
        results: {
          chosenSize,
          IzNed: worstIzNod,
          totalLength,
          totalVoltageDrop: duVolt,
          voltageDropPercent: totalVoltageDropPercent,
          IkMin,
          IkMinAngle,
          IkMax,
          IkMaxAngle,
          thermalOk: thermalCheck.ok,
          thermalE: thermalCheck.Ekabel,
          thermalI2t: thermalCheck.Ebryde,
          tripTime: tTrip,
          ZkabelMin: Zw1Min,
          ZkabelMax: Zw1Max,
        }
      }));

      addLog("Stikledning (blandet) – beregning", "service", steps);
    } catch (error) {
      console.error(error);
    }
  };

  const calculateGroups = () => {
    try {
      const allSteps: CalculationStep[][] = [];
      const serviceData = serviceCable.results;

      const updatedGroups = groups.map((group, idx) => {
        const steps: CalculationStep[] = [];
        const Uv = group.phase === "3-faset" ? 400 : 230;
        const In = parseFloat(group.In.replace(",", "."));
        const cos = parseFloat(group.cosPhi.replace(",", "."));
        const duMax = parseFloat(group.maxVoltageDrop.replace(",", "."));
        const KjJord = parseFloat(group.KjJord.replace(",", ".") || "1.0");

        let groupResults: any = {
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

            // Auto tværsnitsvalg
            steps.push({
              category: 'overbelastning',
              formula: "Auto tværsnitsvalg (Iz-kontrol + spændingsfaldskontrol)",
              variables: `In,gruppe = ${In.toFixed(1)} A\nMaterial = ${group.material}\nFasesystem = ${group.phase}\nΔU_max = ${duMax.toFixed(2)}%`,
              calculation: `Tester standardstørrelser og vælger mindste der opfylder:\n- Iz,korr ≥ In for alle segmenter\n- ΔU_total ≤ ${duMax.toFixed(2)}%`,
              result: `Valgt tværsnit: ${chosenSize.toFixed(1)} mm²`
            });

            // Detaljeret Iz-kontrol
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

            // Segment data
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

            // Iz,nødvendig
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

            // Iz,korrigeret
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

            // Spændingsfald
            steps.push({
              category: 'spændingsfald',
              formula: "Total spændingsfald",
              variables: `ΔU_total = ${duTotal.toFixed(2)} V\nΔU% = ${duPct.toFixed(2)}%`,
              calculation: `Maks tilladte spændingsfald: ${duMax.toFixed(2)}%`,
              result: `${duPct <= duMax ? '✓' : '✗'} ΔU = ${duPct.toFixed(2)}% ${duPct <= duMax ? '≤' : '>'} ${duMax.toFixed(2)}%`
            });
          }
        }

        // Kortslutnings- og termiske beregninger
        if (serviceData && chosenSq > 0) {
          try {
            const totalLengthM = groupResults.totalLength;
            const ZperKmMin = getCableImpedancePerKm(chosenSq, group.material, group.phase);
            const ZperKmMax = getCableImpedancePerKm(chosenSq, group.material, group.phase);

            const lengthKm = totalLengthM / 1000;
            const ZgroupMin = { R: ZperKmMin.R * lengthKm * 1.5, X: ZperKmMin.X * lengthKm };
            const ZgroupMax = { R: ZperKmMax.R * lengthKm * 1.0, X: ZperKmMax.X * lengthKm };

            const ZstikMin = serviceData.ZkabelMin || { R: 0, X: 0 };
            const ZstikMax = serviceData.ZkabelMax || { R: 0, X: 0 };
            const IkTrafo = parseFloat(serviceCable.ikTrafo || "10000");
            const cosTrafo = parseFloat(serviceCable.cosTrafo || "0.2");

            const { IminFactor } = getFuseData("Standard", group.fuseType === "MCB automatisk" ? "MCB B" : group.fuseType, In);
            const IminSupply = serviceData.IkMin || (In * IminFactor);

            // Ik,min beregning
            const ikMin = ikMinGroup(Uv, IminSupply, ZstikMin, ZgroupMin);
            groupResults.IkMin = ikMin.Ik;
            groupResults.IkMinAngle = ikMin.angle;

            // Ik,max beregning
            const ikMax = ikMaxStik(Uv, IkTrafo, cosTrafo, { R: ZstikMax.R + ZgroupMax.R, X: ZstikMax.X + ZgroupMax.X });
            groupResults.IkMax = ikMax.Ik;
            groupResults.IkMaxAngle = ikMax.angle;

            // Sikringsdata
            const fuseTypeToUse = group.fuseType === "MCB automatisk" ? "MCB B" : group.fuseType;
            const { curvePoints, InCurve } = getFuseData("Standard", fuseTypeToUse, In);
            const useAbsoluteIk = usesAbsoluteIk(fuseTypeToUse);
            const { time: tripTime } = fuseTripTimeExplain(InCurve, ikMin.Ik, curvePoints, useAbsoluteIk);
            groupResults.tripTime = tripTime;

            // Termisk kontrol
            const k = group.material === "Cu" ? 143 : 94;
            const thermal = thermalOk(k, chosenSq, ikMin.Ik, tripTime);

            // Kabelimpedans
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

            // Kortslutningsstrømme
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

            // Termisk kontrol
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
          addLog(`Gruppe ${group.name} (blandet)`, "group", allSteps[idx]);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const addGroup = () => {
    const onePhasedGroups = groups.filter(g => g.phase === "1-faset");
    const phaseRotation: ("L1" | "L2" | "L3")[] = ["L1", "L2", "L3"];
    const nextPhase = phaseRotation[onePhasedGroups.length % 3];

    const newGroup = createDefaultGroup(groups.length, nextPhase);
    setGroups((prev) => [...prev, newGroup]);
  };

  const removeGroup = (id: string) => {
    setGroups((prev) => (prev.length <= 1 ? prev : prev.filter((g) => g.id !== id)));
  };

  const updateGroup = (id: string, data: Partial<GroupData>) => {
    setGroups((prev) => {
      return prev.map((g) => {
        if (g.id !== id) return g;

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

  return (
    <Tabs defaultValue="service-cable" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="service-cable">Stikledning</TabsTrigger>
        <TabsTrigger value="groups">Grupper</TabsTrigger>
        <TabsTrigger value="apartments">Lejligheder</TabsTrigger>
        <TabsTrigger value="results">Resultater</TabsTrigger>
      </TabsList>

      {/* STIKLEDNING TAB */}
      <TabsContent value="service-cable" className="space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Input – stikledning (blandet)</CardTitle>
            <CardDescription>Angiv hoveddata for stikledningen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="fuseType">Sikringstype</Label>
                <Select value={serviceCable.fuseType} onValueChange={(v) => {
                  setServiceCable(prev => ({ ...prev, fuseType: v }));
                  const availableSizes = getAvailableFuseSizes(v);
                  const currentRating = parseFloat(serviceCable.In);
                  if (!availableSizes.includes(currentRating)) {
                    setServiceCable(prev => ({ ...prev, In: availableSizes[0].toString() }));
                  }
                }}>
                  <SelectTrigger id="fuseType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diazed gG">Diazed gG</SelectItem>
                    <SelectItem value="Neozed gG">Neozed gG</SelectItem>
                    <SelectItem value="Knivsikring NH00">Knivsikring NH00</SelectItem>
                    <SelectItem value="Knivsikring NH0">Knivsikring NH0</SelectItem>
                    <SelectItem value="Knivsikring NH1">Knivsikring NH1</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="fuseRating">Sikringsstørrelse [A] In</Label>
                <Select value={serviceCable.In} onValueChange={(v) => setServiceCable(prev => ({ ...prev, In: v }))}>
                  <SelectTrigger id="fuseRating">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableFuseSizes(serviceCable.fuseType).map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size} A
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="voltage">Netspænding [V] Un</Label>
                <Select value={serviceCable.sourceVoltage} onValueChange={(v) => setServiceCable(prev => ({ ...prev, sourceVoltage: v }))}>
                  <SelectTrigger id="voltage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="230">230 V</SelectItem>
                    <SelectItem value="400">400 V</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="phases">Fasesystem</Label>
                <Select value={serviceCable.phases} onValueChange={(v: any) => setServiceCable(prev => ({ ...prev, phases: v }))}>
                  <SelectTrigger id="phases">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-faset">1-faset</SelectItem>
                    <SelectItem value="3-faset">3-faset</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="material">Materiale</Label>
                <Select value={serviceCable.material} onValueChange={(v: any) => setServiceCable(prev => ({ ...prev, material: v }))}>
                  <SelectTrigger id="material">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cu">Kobber (Cu)</SelectItem>
                    <SelectItem value="Al">Aluminium (Al)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cosPhi">cos φ (last)</Label>
                <Input
                  id="cosPhi"
                  type="number"
                  step="0.01"
                  value={serviceCable.cosPhi}
                  onChange={(e) => setServiceCable(prev => ({ ...prev, cosPhi: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="maxDrop">Maks Spændingsfald [%]</Label>
                <Input
                  id="maxDrop"
                  type="text"
                  placeholder="1.0"
                  value={serviceCable.maxVoltageDrop}
                  onChange={(e) => {
                    const value = e.target.value.replace(',', '.');
                    setServiceCable(prev => ({ ...prev, maxVoltageDrop: value }));
                  }}
                  onBlur={(e) => {
                    if (!e.target.value.trim()) {
                      setServiceCable(prev => ({ ...prev, maxVoltageDrop: "1.0" }));
                    }
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label>Ikmax Trafo [A]</Label>
                <Input
                  type="number"
                  value={serviceCable.ikTrafo}
                  onChange={(e) => setServiceCable(prev => ({ ...prev, ikTrafo: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label>cos φ trafo</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={serviceCable.cosTrafo}
                  onChange={(e) => setServiceCable(prev => ({ ...prev, cosTrafo: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="autoSize">Auto tværsnit</Label>
                <Select value={serviceCable.autoSize} onValueChange={(v: any) => setServiceCable(prev => ({ ...prev, autoSize: v }))}>
                  <SelectTrigger id="autoSize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Ja (auto)</SelectItem>
                    <SelectItem value="manual">Nej (manuel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Kabel fremføringsmetode</h3>
            <Button onClick={addSegment} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Segment af kabel
            </Button>
          </div>

          {serviceCable.segments.map((segment, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Segment af kabel {index + 1}</CardTitle>
                  {serviceCable.segments.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeSegment(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <SegmentInput
                  segment={segment}
                  onChange={(data) => updateSegment(index, data)}
                  phases={serviceCable.phases}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {serviceCable.results && (
          <Card className="border-primary">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Resultater – stikledning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">Værste Iz,ned:</div>
                  <div className="text-lg font-bold">{serviceCable.results.IzNed.toFixed(1)} A</div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">Kabeltværsnit:</div>
                  <div className="text-lg font-bold">{serviceCable.results.chosenSize} mm²</div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">Samlet længde:</div>
                  <div className="text-lg font-bold">{serviceCable.results.totalLength.toFixed(1)} m</div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">Spændingsfald:</div>
                  <div className="text-lg font-bold">
                    {serviceCable.results.totalVoltageDrop.toFixed(2)} V ({serviceCable.results.voltageDropPercent.toFixed(2)} %)
                  </div>
                  {serviceCable.results.voltageDropPercent > parseFloat(serviceCable.maxVoltageDrop) && (
                    <Badge variant="destructive" className="text-xs">Over grænse!</Badge>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">Ik_min (tavle):</div>
                  <div className="text-lg font-bold">
                    {formatCurrentWithAngle(serviceCable.results.IkMin, serviceCable.results.IkMinAngle)}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">Ik_max (tavle):</div>
                  <div className="text-lg font-bold">
                    {formatCurrentWithAngle(serviceCable.results.IkMax, serviceCable.results.IkMaxAngle)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* GRUPPER TAB */}
      <TabsContent value="groups" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Grupper (blandet)</CardTitle>
                <CardDescription>
                  Beregn flere grupper med automatisk tværsnitsvalg
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
                            <SelectItem value="Neozed gG">Neozed gG</SelectItem>
                            <SelectItem value="Knivsikring NH0">Knivsikring NH0</SelectItem>
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
                              group.fuseType === "Knivsikring NH0" ? NH0_SIZES :
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
                          onValueChange={(value: any) => {
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
                          onValueChange={(value: any) => updateGroup(group.id, { selectedPhase: value })}
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
                          onValueChange={(value: any) => updateGroup(group.id, { material: value })}
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
      </TabsContent>

      {/* LEJLIGHEDER TAB */}
      <TabsContent value="apartments">
        <ApartmentsTab addLog={addLog} />
      </TabsContent>

      {/* RESULTATER TAB */}
      <TabsContent value="results">
        <Card>
          <CardHeader>
            <CardTitle>Beregningsoversigt</CardTitle>
            <CardDescription>Alle beregninger vises i fanen "Mellemregninger" i menuen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Se "Mellemregninger" i hovedmenuen for detaljerede beregninger for stikledninger og grupper</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}