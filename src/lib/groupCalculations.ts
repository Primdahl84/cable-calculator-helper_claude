import { STANDARD_SIZES, lookupIz, voltageDropDs } from "./calculations";

export interface GroupSegmentInput {
  refMethod: string;
  length: number;
  cores: number;
  kt: number;
  kgrp: number;
  insulationType?: "XLPE" | "PVC";
}

export interface GroupAutoSizeResult {
  chosenSize: number | null;
  totalVoltageDropPercent: number;
}

export function inferEnvironmentFromRef(ref: string): "luft" | "jord" {
  if (!ref) return "luft";
  return ref.startsWith("D") ? "jord" : "luft";
}

export function autoSelectGroupCableSize(
  In: number,
  Uv: number,
  material: string,
  phase: string,
  cosPhi: number,
  maxVoltageDropPercent: number,
  KjJord: number,
  segments: GroupSegmentInput[],
): GroupAutoSizeResult {
  const candidateSizes = (() => {
    if (material === "Al") {
      return STANDARD_SIZES.filter((s) => s >= 16.0);
    }
    if (material === "Cu" && phase === "1-faset") {
      const allowed = [1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0];
      return STANDARD_SIZES.filter((s) => allowed.includes(s));
    }
    return STANDARD_SIZES;
  })();

  for (const size of candidateSizes) {
    let overloadOk = true;

    for (const seg of segments) {
      const env = inferEnvironmentFromRef(seg.refMethod);
      const Kj = env === "jord" ? KjJord : 1.0;
      const iz = lookupIz(material, seg.refMethod, size, seg.cores, seg.insulationType || "XLPE");

      if (!iz || iz <= 0) {
        overloadOk = false;
        break;
      }

      const IzCorr = iz * seg.kt * Kj * seg.kgrp;
      if (In > IzCorr) {
        overloadOk = false;
        break;
      }
    }

    if (!overloadOk) continue;

    let duTotal = 0;
    for (const seg of segments) {
      const { du } = voltageDropDs(Uv, In, material, size, seg.length, phase, cosPhi);
      duTotal += du;
    }
    const duPercent = (duTotal / Uv) * 100;

    if (duPercent <= maxVoltageDropPercent) {
      return {
        chosenSize: size,
        totalVoltageDropPercent: duPercent,
      };
    }
  }

  return { chosenSize: null, totalVoltageDropPercent: Number.NaN };
}
