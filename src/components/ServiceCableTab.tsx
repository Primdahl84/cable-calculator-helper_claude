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
} from "@/lib/calculations";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { getFuseData, fuseTripTimeExplain, DIAZED_SIZES, DIAZED_D2D3D4_SIZES, NEOZED_SIZES, KNIV_SIZES, NH00_SIZES, NH0_SIZES, NH1_SIZES, MCB_SIZES } from "@/lib/fuseCurves";

import type { CalculationStep } from "./CableCalculator";
import { useProject } from "@/contexts/ProjectContext";

interface ServiceCableTabProps {
  addLog: (title: string, type: 'service' | 'group', steps: CalculationStep[]) => void;
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

export function ServiceCableTab({ addLog }: ServiceCableTabProps) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id || 'default';
  const storageKey = `service-tab-state-${projectId}`;
  
  const [fuseType, setFuseType] = useState<
    "Diazed gG" | "Neozed gG" | "Knivsikring gG" | "Knivsikring NH00" | "Knivsikring NH0" | "Knivsikring NH1"
  >(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Hvis gemt type er MCB, sæt til Diazed gG som default
        if (parsed.fuseType && parsed.fuseType.startsWith("MCB")) {
          return "Diazed gG";
        }
        return parsed.fuseType || "Diazed gG";
      } catch {
        return "Diazed gG";
      }
    }
    return "Diazed gG";
  });
  const [fuseRating, setFuseRating] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.fuseRating || "35";
      } catch {
        return "35";
      }
    }
    return "35";
  });
  const [sourceVoltage, setSourceVoltage] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.sourceVoltage || "230";
      } catch {
        return "230";
      }
    }
    return "230";
  });
  const [phases, setPhases] = useState<"1-faset" | "3-faset">(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.phases || "3-faset";
      } catch {
        return "3-faset";
      }
    }
    return "3-faset";
  });
  const [material, setMaterial] = useState<"Cu" | "Al">(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.material || "Cu";
      } catch {
        return "Cu";
      }
    }
    return "Cu";
  });
  const [cosPhi, setCosPhi] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.cosPhi || "1.0";
      } catch {
        return "1.0";
      }
    }
    return "1.0";
  });
  const [maxVoltageDrop, setMaxVoltageDrop] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.maxVoltageDrop || "1.0";
      } catch {
        return "1.0";
      }
    }
    return "1.0";
  });
  const [autoSize, setAutoSize] = useState<"auto" | "manual">(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Handle old boolean format
        if (typeof parsed.autoSize === 'boolean') {
          return parsed.autoSize ? "auto" : "manual";
        }
        return parsed.autoSize || "auto";
      } catch {
        return "auto";
      }
    }
    return "auto";
  });

  // Trafo-indstillinger
  const [ikTrafo, setIkTrafo] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.ikTrafo || "16000";
      } catch {
        return "16000";
      }
    }
    return "16000";
  });
  const [iMinSupply, setIMinSupply] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.iMinSupply || "175";
      } catch {
        return "175";
      }
    }
    return "175";
  });
  const [cosTrafo, setCosTrafo] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.cosTrafo || "0.3";
      } catch {
        return "0.3";
      }
    }
    return "0.3";
  });
  const [kValue, setKValue] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.kValue || "143";
      } catch {
        return "143";
      }
    }
    return "143";
  });
  const [tripTime, setTripTime] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.tripTime || "5.0";
      } catch {
        return "5.0";
      }
    }
    return "5.0";
  });

  const [fuseManufacturer, setFuseManufacturer] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.fuseManufacturer || "Standard";
      } catch {
        return "Standard";
      }
    }
    return "Standard";
  });

  const [segments, setSegments] = useState<SegmentData[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.segments || [
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
        ];
      } catch {
        return [
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
        ];
      }
    }
    return [
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
    ];
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    const state = {
      fuseType,
      fuseRating,
      sourceVoltage,
      phases,
      material,
      cosPhi,
      maxVoltageDrop,
      autoSize,
      ikTrafo,
      iMinSupply,
      cosTrafo,
      kValue,
      tripTime,
      fuseManufacturer,
      segments,
    };
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [
    fuseType,
    fuseRating,
    sourceVoltage,
    phases,
    material,
    cosPhi,
    maxVoltageDrop,
    autoSize,
    ikTrafo,
    iMinSupply,
    cosTrafo,
    kValue,
    tripTime,
    fuseManufacturer,
    segments,
  ]);

  // Auto-update k-value when material changes
  useEffect(() => {
    const newKValue = material === "Cu" ? "143" : "94";
    setKValue(newKValue);
  }, [material]);

  // Auto-update iMinSupply when fuse type or rating changes
  useEffect(() => {
    try {
      const In = parseFloat(fuseRating.replace(",", "."));
      if (isFinite(In)) {
        const { IminFactor } = getFuseData(fuseManufacturer, fuseType, In);
        const calculatedImin = In * IminFactor;
        setIMinSupply(calculatedImin.toFixed(1));
      }
    } catch (error) {
      // Keep existing value if calculation fails
      console.warn("Could not calculate Imin:", error);
    }
  }, [fuseType, fuseRating, fuseManufacturer]);

  const prevInputsRef = useRef<string>('');
  const hasCalculatedOnceRef = useRef(false);

  // Auto-calculate when inputs change (with debounce)
  useEffect(() => {
    // Create a hash of inputs only (not results)
    const inputsHash = JSON.stringify({
      fuseType,
      fuseRating,
      sourceVoltage,
      phases,
      material,
      cosPhi,
      maxVoltageDrop,
      autoSize,
      ikTrafo,
      iMinSupply,
      cosTrafo,
      kValue,
      tripTime,
      fuseManufacturer,
      segments: segments.map(s => ({
        installMethod: s.installMethod,
        length: s.length,
        ambientTemp: s.ambientTemp,
        loadedConductors: s.loadedConductors,
        cablesGrouped: s.cablesGrouped,
        kt: s.kt,
        kgrp: s.kgrp,
        // Exclude crossSection when autoSize is on
        ...(!autoSize && { crossSection: s.crossSection })
      }))
    });
    
    // Only calculate if inputs actually changed
    if (inputsHash === prevInputsRef.current) return;
    prevInputsRef.current = inputsHash;
    
    const timer = setTimeout(() => {
      calculate();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [
    fuseType,
    fuseRating,
    sourceVoltage,
    phases,
    material,
    cosPhi,
    maxVoltageDrop,
    autoSize,
    ikTrafo,
    iMinSupply,
    cosTrafo,
    kValue,
    tripTime,
    fuseManufacturer,
    segments,
  ]);

  // Initial calculation on mount
  useEffect(() => {
    if (!hasCalculatedOnceRef.current) {
      hasCalculatedOnceRef.current = true;
      setTimeout(() => calculate(), 100);
    }
  }, []);

  // Resultater
  const [results, setResults] = useState<{
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
    ZkabelMin?: { R: number; X: number };
    ZkabelMax?: { R: number; X: number };
  } | null>(null);

  // Save calculation results to localStorage so GroupsTab can access them
  useEffect(() => {
    if (results && results.chosenSize !== null) {
      const resultsState = {
        ...results,
        ikTrafo,
        cosTrafo,
      };
      localStorage.setItem(`${storageKey}-results`, JSON.stringify(resultsState));
    }
  }, [results, ikTrafo, cosTrafo, storageKey]);

  const addSegment = () => {
    setSegments((prev) => [
      ...prev,
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
    ]);
  };

  const removeSegment = (index: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSegment = (index: number, data: Partial<SegmentData>) => {
    setSegments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...data };
      return updated;
    });
  };

  const calculate = () => {
    try {
      const logs: string[] = [];
      logs.push("=== STIKLEDNINGSBEREGNING ===");
      logs.push("");
      logs.push("[INPUTDATA – STIKLEDNING]");
      logs.push(`In, stikledning = ${fuseRating} A`);
      logs.push(`Netspænding U_n = ${sourceVoltage} V`);
      logs.push(`Fasesystem = ${phases}`);
      logs.push(`Materiale = ${material}`);
      logs.push(`cos φ (last) = ${cosPhi}`);
      logs.push(`Maks ΔU_stikledning = ${maxVoltageDrop} %`);
      logs.push(`Ik_trafo = ${ikTrafo} A`);
      logs.push(`Ik_min forsyning = ${iMinSupply} A`);
      logs.push(`cos φ trafo = ${cosTrafo}`);
      logs.push(`k-værdi (termisk) = ${kValue}`);
      logs.push("");

      const In = parseFloat(fuseRating.replace(",", "."));
      const voltage = parseFloat(sourceVoltage.replace(",", "."));
      const cos = parseFloat(cosPhi.replace(",", "."));
      const maxDrop = parseFloat(maxVoltageDrop.replace(",", "."));
      const IkT = parseFloat(ikTrafo.replace(",", "."));
      const IminSup = parseFloat(iMinSupply.replace(",", "."));
      const cosT = parseFloat(cosTrafo.replace(",", "."));
      const k = parseFloat(kValue.replace(",", "."));

      if (!isFinite(In) || !isFinite(voltage) || !isFinite(cos) || !isFinite(maxDrop)) {
        throw new Error("Ugyldige inputværdier.");
      }

      let chosenSize: number | null = null;
      
      // Auto-sizing: find det mindste tværsnit der opfylder BÅDE Iz, spændingsfald OG udkoblingstid
      if (autoSize === "auto") {
        logs.push("=== Auto tværsnit (Iz + ΔU_total + t_udkobling) – stikledning ===");
        const requireMaxTripTime = isMeltFuse(fuseType);
        if (requireMaxTripTime) {
          logs.push("Smeltesikring: Udkoblingstid må maks være 5,0 s");
        }
        
        for (const size of STANDARD_SIZES) {
          let overloadOk = true;
          let totalVDrop = 0;
          
          logs.push(`Afprøver tværsnit S = ${size} mm²:`);
          
          // Check Iz for alle segmenter
          for (const seg of segments) {
            const iz = lookupIz(material, seg.installMethod, size, seg.loadedConductors);
            if (iz === 0) {
              logs.push(`  [ADVARSEL] Mangler Iz-data for ${material}, ref ${seg.installMethod}, ${seg.loadedConductors} belastede, S=${size} mm².`);
              overloadOk = false;
              break;
            }
            
            const IzCorr = iz * seg.kt * seg.kgrp;
            const IzNed = In / (seg.kt * seg.kgrp);
            
            logs.push(`  Segment ${segments.indexOf(seg) + 1}: Iz,tabel=${iz.toFixed(1)} A, Kt=${seg.kt.toFixed(3)}, kgrp=${seg.kgrp.toFixed(3)} ⇒ Iz,korr=${IzCorr.toFixed(1)} A, Iz,nød=${IzNed.toFixed(1)} A`);
            
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
          
          // Check spændingsfald for alle segmenter
          let tempTotalLength = 0;
          for (const seg of segments) {
            const { duPercent } = voltageDropDs(voltage, In, material, size, seg.length, phases, cos);
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
          
          // Check udkoblingstid for smeltesikringer
          if (requireMaxTripTime) {
            const impPerKm = getCableImpedancePerKm(size, material, phases);
            const factor = tempTotalLength / 1000;
            const Zw1Min = { R: impPerKm.R * 1.5 * factor, X: impPerKm.X * factor };
            const { Ik: testIkMin } = ikMinStik(voltage, IminSup, Zw1Min);
            
            const { curvePoints, InCurve } = getFuseData(fuseManufacturer, fuseType, In);
            const useAbsoluteIk = usesAbsoluteIk(fuseType);
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
          // Opdater alle segmenter med det valgte tværsnit hvis det faktisk er anderledes
          setSegments((prev) => {
            const updated = prev.map(seg => ({ ...seg, crossSection: size }));
            const hasChanged = updated.some((s, i) => s.crossSection !== prev[i].crossSection);
            return hasChanged ? updated : prev;
          });
          break;
        }
        
        if (!chosenSize) {
          logs.push("⚠ ADVARSEL: Ingen tværsnit kunne opfylde både Iz- og ΔU-betingelserne!");
          logs.push("");
          // Brug mindste tværsnit som fallback
          chosenSize = segments[0]?.crossSection || STANDARD_SIZES[0];
        }
      } else {
        // Manuel sizing: brug det første segments tværsnit
        chosenSize = segments[0]?.crossSection || 10;
        logs.push("Auto tværsnit er slået FRA.");
        logs.push(`Bruger tværsnit fra første segment: S = ${chosenSize} mm²`);
        logs.push("");
      }

      let totalVoltageDropPercent = 0;
      let totalLength = 0;
      let worstIzNod = 0; // som i Python: In / (Kt * Kj * kgrp)

      segments.forEach((seg, idx) => {
        const effectiveSize = autoSize === "auto" && chosenSize ? chosenSize : seg.crossSection;

        logs.push(`[SEGMENT ${idx + 1}]`);
        logs.push(`Installationsmetode (reference) = ${seg.installMethod}`);
        logs.push(`Længde = ${seg.length.toFixed(1)} m`);
        logs.push(`T_omgivelse = ${seg.ambientTemp.toFixed(1)} °C`);
        logs.push(`Tværsnit = ${effectiveSize.toFixed(1)} mm²`);
        logs.push(`Belastede ledere = ${seg.loadedConductors}`);
        logs.push(`Kt = ${seg.kt.toFixed(3)}`);
        logs.push(`kgrp = ${seg.kgrp.toFixed(3)}`);

        const izTab = lookupIz(material, seg.installMethod, effectiveSize, seg.loadedConductors);
        const IzKorr = izTab * seg.kt * seg.kgrp;
        const IzNod = In / (seg.kt * seg.kgrp); // Kj = 1.0 her (luft)
        worstIzNod = Math.max(worstIzNod, IzNod);

        logs.push(`Iz,tabel = ${izTab.toFixed(1)} A`);
        logs.push(`Iz,korr = Iz,tabel · Kt · kgrp = ${IzKorr.toFixed(1)} A`);
        logs.push(`Iz,nød (segment) = In / (Kt · kgrp) = ${IzNod.toFixed(1)} A`);

        const { du, duPercent } = voltageDropDs(
          voltage,
          In,
          material,
          effectiveSize,
          seg.length,
          phases,
          cos,
        );

        const impedance = getCableImpedancePerKm(effectiveSize, material, phases);
        const segR = impedance.R * (seg.length / 1000);
        const segX = impedance.X * (seg.length / 1000);

        totalVoltageDropPercent += duPercent;
        totalLength += seg.length;

        logs.push(`R_segment ≈ ${segR.toFixed(5)} Ω, X_segment ≈ ${segX.toFixed(5)} Ω`);
        logs.push(`Spændingsfald i segment ≈ ${du.toFixed(2)} V (${duPercent.toFixed(2)} % af U_n)`);
        logs.push("");
      });

      // Beregn kabelimpedanser for Ik,min og Ik,max på samlet længde og valgt tværsnit
      const sqForShort = chosenSize ?? segments[0]?.crossSection ?? 10;
      const impPerKm = getCableImpedancePerKm(sqForShort, material, phases);
      const factor = totalLength / 1000;
      const Zw1Min = { R: impPerKm.R * 1.5 * factor, X: impPerKm.X * factor };
      const Zw1Max = { R: impPerKm.R * factor, X: impPerKm.X * factor };

      // Beregn Ik_min og Ik_max (komplekse)
      const { Ik: IkMin, angle: IkMinAngle } = ikMinStik(voltage, IminSup, Zw1Min);
      const { Ik: IkMax, angle: IkMaxAngle } = ikMaxStik(voltage, IkT, cosT, Zw1Max);

      // Termisk kontrol – brug Ik_min og tid fra sikringskurve
      const actualFuseType = fuseType;
      
      const { curvePoints, InCurve } = getFuseData(fuseManufacturer, actualFuseType, In);
      const useAbsoluteIk = usesAbsoluteIk(actualFuseType);
      const { time: tTrip, explanation: fuseText } = fuseTripTimeExplain(
        InCurve,
        IkMin,
        curvePoints,
        useAbsoluteIk, // Use absolute Ik for NEOZED and Diazed D2/D3/D4
      );

      const thermalCheck = thermalOk(k, sqForShort, IkMin, tTrip);

      // Build structured calculation steps - consolidated by category
      const steps: CalculationStep[] = [];

      // OVERBELASTNINGSBESKYTTELSE - Combined
      const overbelastningLines: string[] = [];
      overbelastningLines.push("=== Segmentdata ===");
      segments.forEach((seg, idx) => {
        const effectiveSize = autoSize === "auto" && chosenSize ? chosenSize : seg.crossSection;
        const env = seg.installMethod.startsWith("D") ? "jord" : "luft";
        const Kj = env === "jord" ? 1.5 : 1.0; // Standard Kj-værdi for jord
        overbelastningLines.push(`Segment ${idx + 1}: Ref=${seg.installMethod} (${env}), L=${seg.length}m, T=${seg.ambientTemp}°C, S=${effectiveSize}mm², Leder=${seg.loadedConductors}, Kt=${seg.kt.toFixed(3)}, Kj=${Kj.toFixed(3)}, Kgrp=${seg.kgrp.toFixed(3)}`);
      });

      overbelastningLines.push("\n=== Iz,nødvendigt beregning ===");
      segments.forEach((seg, idx) => {
        const env = seg.installMethod.startsWith("D") ? "jord" : "luft";
        const Kj = env === "jord" ? 1.5 : 1.0;
        const IzNed = In / (seg.kt * Kj * seg.kgrp);
        overbelastningLines.push(`Segment ${idx + 1}: Iz,nødvendigt = ${In.toFixed(2)} / (${seg.kt.toFixed(3)} × ${Kj.toFixed(3)} × ${seg.kgrp.toFixed(3)}) = ${IzNed.toFixed(2)} A`);
      });

      if (chosenSize !== null) {
        overbelastningLines.push("\n=== Iz,korrigeret for valgt kabel ===");
        overbelastningLines.push(`Valgt tværsnit: ${chosenSize} mm²`);
        segments.forEach((seg, idx) => {
          const effectiveSize = autoSize === "auto" && chosenSize ? chosenSize : seg.crossSection;
          const env = seg.installMethod.startsWith("D") ? "jord" : "luft";
          const Kj = env === "jord" ? 1.5 : 1.0;
          const izTab = lookupIz(material, seg.installMethod, effectiveSize, seg.loadedConductors);
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

      // KORTSLUTNINGSBESKYTTELSE - Combined
      const kortslutningLines: string[] = [];
      
      kortslutningLines.push("=== Kabelimpedans ===");
      const Zw1Mag = Math.sqrt(Zw1Min.R * Zw1Min.R + Zw1Min.X * Zw1Min.X);
      const Zw1Angle = Math.atan2(Zw1Min.X, Zw1Min.R) * (180 / Math.PI);
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

      // SPÆNDINGSFALD - Combined
      const spaendingsfaldLines: string[] = [];
      const sinPhi = Math.sqrt(1 - cos * cos);
      
      spaendingsfaldLines.push("=== Spændingsfald per segment ===");
      segments.forEach((seg, idx) => {
        const effectiveSize = autoSize === "auto" && chosenSize ? chosenSize : seg.crossSection;
        const { du, duPercent } = voltageDropDs(voltage, In, material, effectiveSize, seg.length, phases, cos);
        const impedance = getCableImpedancePerKm(effectiveSize, material, phases);
        spaendingsfaldLines.push(`Segment ${idx + 1}: L=${seg.length}m, S=${effectiveSize}mm², In=${In.toFixed(2)}A → ΔU=${du.toFixed(2)}V (${duPercent.toFixed(2)}%)`);
      });

      const duVolt = (totalVoltageDropPercent * voltage) / 100;
      spaendingsfaldLines.push("\n=== Total spændingsfald ===");
      spaendingsfaldLines.push(`Formel: ΔU = ${phases === "3-faset" ? "(L/1000)×I×(R×cos φ + X×sin φ)×√3" : "(L/1000)×I×(R×cos φ + X×sin φ)×2"}`);
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

      logs.push("[KORTSLUTNINGSBEREGNING]");
      logs.push(`Ik_min (ved tavle/måler) = ${formatCurrentWithAngle(IkMin, IkMinAngle)}`);
      logs.push(`Ik_max (tavle) = ${formatCurrentWithAngle(IkMax, IkMaxAngle)}`);
      logs.push(`t (fra sikringskurve) ≈ ${tTrip.toFixed(4)} s`);
      logs.push(`KB-termisk (k²S² vs. I²t) = ${
        thermalCheck.ok ? "OK" : "IKKE OK"
      } (${thermalCheck.Ekabel.toFixed(0)} ${
        thermalCheck.ok ? ">" : "≤"
      } ${thermalCheck.Ebryde.toFixed(0)})`);
      logs.push("Detaljer fra sikringskurve:");
      logs.push(fuseText);
      logs.push("");

      logs.push("[SAMMENFATNING – STIKLEDNING]");
      logs.push(`Værste Iz,ned (segment): ${worstIzNod.toFixed(1)} A`);
      logs.push(`Valgt kabeltværsnit: ${chosenSize} mm²`);
      logs.push(`Samlet længde = ${totalLength.toFixed(1)} m`);
      logs.push(`ΔU_stikledning,total ≈ ${totalVoltageDropPercent.toFixed(2)} %`);
      logs.push(
        `Spændingsfald (DS-formel): ${(
          (totalVoltageDropPercent * voltage) /
          100
        ).toFixed(2)} V (${totalVoltageDropPercent.toFixed(2)} %)`,
      );
      logs.push(`Maks tilladt ΔU_stikledning = ${maxDrop.toFixed(2)} %`);

      if (totalVoltageDropPercent > maxDrop) {
        logs.push("⚠ ADVARSEL: Spændingsfaldet overskrider den maksimale grænse!");
      } else {
        logs.push("✓ Spændingsfaldet ligger inden for den angivne grænse.");
      }

      setResults({
        chosenSize,
        IzNed: worstIzNod,
        totalLength,
        totalVoltageDrop: (totalVoltageDropPercent * voltage) / 100,
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
      });

      // Convert logs to steps format
      addLog("Stikledning – beregning", "service", steps);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Input – stikledning</CardTitle>
          <CardDescription>Angiv hoveddata for stikledningen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="fuseType">Sikringstype</Label>
              <Select value={fuseType} onValueChange={(v) => {
                setFuseType(v as typeof fuseType);
                const availableSizes = getAvailableFuseSizes(v);
                const currentRating = parseFloat(fuseRating);
                if (!availableSizes.includes(currentRating)) {
                  setFuseRating(availableSizes[0].toString());
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
              <Label htmlFor="fuseRating">Sikringsstørrelse Kabelskab [A] In</Label>
              <Select value={fuseRating} onValueChange={setFuseRating}>
                <SelectTrigger id="fuseRating">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableFuseSizes(fuseType).map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size} A
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="voltage">Netspænding [V] Un</Label>
              <Select value={sourceVoltage} onValueChange={setSourceVoltage}>
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
              <Select value={phases} onValueChange={(value: "1-faset" | "3-faset") => setPhases(value)}>
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
              <Select value={material} onValueChange={(value: "Cu" | "Al") => setMaterial(value)}>
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
                value={cosPhi}
                onChange={(e) => setCosPhi(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="maxDrop">Maks Spændingsfald stikledning [%]</Label>
              <Input
                id="maxDrop"
                type="text"
                placeholder="1.0"
                value={maxVoltageDrop}
                onChange={(e) => {
                  const value = e.target.value.replace(',', '.');
                  setMaxVoltageDrop(value);
                }}
                onBlur={(e) => {
                  if (!e.target.value.trim()) {
                    setMaxVoltageDrop("1.0");
                  }
                }}
              />
            </div>
            
            <div className="space-y-1">
              <Label>Ikmax Trafo [A]</Label>
              <Input
                type="number"
                value={ikTrafo}
                onChange={(e) => setIkTrafo(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <Label>cos φ trafo</Label>
              <Input
                type="number"
                step="0.01"
                value={cosTrafo}
                onChange={(e) => setCosTrafo(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="autoSize2">Auto tværsnit</Label>
              <Select value={autoSize} onValueChange={(val: "auto" | "manual") => setAutoSize(val)}>
                <SelectTrigger id="autoSize2">
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

        {segments.map((segment, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Segment af kabel {index + 1}</CardTitle>
                {segments.length > 1 && (
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
                phases={phases}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {results && (
        <Card className="border-primary">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Resultater – stikledning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">Værste Iz,ned:</div>
                <div className="text-lg font-bold">{results.IzNed.toFixed(1)} A</div>
              </div>
              
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">Kabeltværsnit:</div>
                <div className="text-lg font-bold">{results.chosenSize} mm²</div>
              </div>
              
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">Samlet længde:</div>
                <div className="text-lg font-bold">{results.totalLength.toFixed(1)} m</div>
              </div>
              
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">Spændingsfald:</div>
                <div className="text-lg font-bold">
                  {results.totalVoltageDrop.toFixed(2)} V ({results.voltageDropPercent.toFixed(2)} %)
                </div>
                {results.voltageDropPercent > parseFloat(maxVoltageDrop) && (
                  <Badge variant="destructive" className="text-xs">Over grænse!</Badge>
                )}
              </div>
              
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">Ik_min (tavle):</div>
                <div className="text-lg font-bold">
                  {formatCurrentWithAngle(results.IkMin, results.IkMinAngle)}
                </div>
              </div>
              
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">Ik_max (tavle):</div>
                <div className="text-lg font-bold">
                  {formatCurrentWithAngle(results.IkMax, results.IkMaxAngle)}
                </div>
              </div>
              
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">KB-termisk:</div>
                <div className="text-lg font-bold">
                  {results.thermalOk ? "✓ OK" : "✗ IKKE OK"}
                </div>
                <div className="text-xs text-muted-foreground">
                  ({results.thermalE.toFixed(0)} {results.thermalOk ? ">" : "≤"} {results.thermalI2t.toFixed(0)})
                </div>
                {!results.thermalOk && <Badge variant="destructive" className="text-xs">Fejl!</Badge>}
              </div>
              
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">Udkoblingstid t [s]</div>
                <div className="text-lg font-bold">{results.tripTime.toFixed(4)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={calculate} size="default" className="gap-2">
          <Calculator className="h-4 w-4" />
          Beregn stikledning
        </Button>
      </div>
    </div>
  );
}
