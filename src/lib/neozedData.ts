// NEOZED D01/D02/D03 kurver
// Alle størrelser bruger præcise punkter fra Engauge

import csvData from '@/data/NEOZED_5se2_d01_d02_d03_2a-100a.csv?raw';
import { NEOZED_2A_POINTS as PRECISE_2A_POINTS } from './neozed_2a';
import { NEOZED_4A_POINTS as PRECISE_4A_POINTS } from './neozed_4a';
import { NEOZED_6A_POINTS as PRECISE_6A_POINTS } from './neozed_6a';
import { NEOZED_10A_POINTS as PRECISE_10A_POINTS } from './neozed_10a';
import { NEOZED_16A_POINTS as PRECISE_16A_POINTS } from './neozed_16a';
import { NEOZED_20A_POINTS as PRECISE_20A_POINTS } from './neozed_20a';
import { NEOZED_25A_POINTS as PRECISE_25A_POINTS } from './neozed_25a';
import { NEOZED_35A_POINTS as PRECISE_35A_POINTS } from './neozed_35a';
import { NEOZED_50A_POINTS as PRECISE_50A_POINTS } from './neozed_50a';
import { NEOZED_63A_POINTS as PRECISE_63A_POINTS } from './neozed_63a';
import { NEOZED_80A_POINTS as PRECISE_80A_POINTS } from './neozed_80a';
import { NEOZED_100A_POINTS as PRECISE_100A_POINTS } from './neozed_100a';

export type CurvePoint = [number, number]; // [Ik_absolute (A), time (s)]

// Helper function to parse a CSV value (handles quotes and comma decimals)
function parseValue(str: string): number {
  // Remove all quotes and trim
  const cleaned = str.replace(/"/g, '').trim();
  // Replace comma with period for decimal
  const withDot = cleaned.replace(',', '.');
  const val = parseFloat(withDot);
  return isNaN(val) ? 0 : val;
}

// Parse CSV data - store absolute Ik values with trip times
function parseNeozedCsv(): Record<number, CurvePoint[]> {
  const lines = csvData.trim().split('\n');
  
  // Fuse sizes corresponding to columns 1-12 (after x column)
  // From header: x,35 amp sikring,2 amp sikring,4 amp sikring,6 amp sikring,10 amp sikring,16 amp sikring,20 amp sikring,25 amp sikring,50 amp sikring,63 amp sikring,80 amp sikring,100 amp sikring
  const fuseSizes = [35, 2, 4, 6, 10, 16, 20, 25, 50, 63, 80, 100];
  
  // Initialize result with empty arrays
  const result: Record<number, CurvePoint[]> = {};
  fuseSizes.forEach(size => {
    result[size] = [];
  });
  
  console.log('Parsing NEOZED CSV with', lines.length, 'lines');
  
  // Parse data rows (skip header at line 0)
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    
    // Remove outer quotes if the entire line is quoted
    if (line.startsWith('"') && line.endsWith('"')) {
      line = line.slice(1, -1);
    }
    
    // Now split by comma, being aware that we need to handle double-quotes as escaped quotes
    // Replace "" with a placeholder temporarily
    const QUOTE_PLACEHOLDER = '\u0000';
    line = line.replace(/""/g, QUOTE_PLACEHOLDER);
    
    // Now split by comma
    const rawValues = line.split(',');
    
    // Process each value: remove quotes and restore escaped quotes
    const values = rawValues.map(v => {
      let cleaned = v.replace(/"/g, '').trim();
      cleaned = cleaned.replace(new RegExp(QUOTE_PLACEHOLDER, 'g'), '"');
      return cleaned;
    });
    
    if (values.length < 2) {
      console.warn(`Line ${i} has insufficient values:`, values.length);
      continue;
    }
    
    // Parse x value (absolute Ik current in amperes) - handle comma as decimal separator
    const xStr = values[0].replace(',', '.');
    const ikAbs = parseFloat(xStr);
    if (isNaN(ikAbs) || ikAbs <= 0) {
      console.warn(`Line ${i} has invalid Ik:`, values[0], '→', ikAbs);
      continue;
    }
    
    // Parse time values for each fuse size
    let validPoints = 0;
    for (let j = 0; j < fuseSizes.length; j++) {
      const columnIndex = j + 1;
      if (columnIndex >= values.length) {
        continue;
      }
      
      const timeStr = values[columnIndex].replace(',', '.');
      const timeVal = parseFloat(timeStr);
      
      // Only add valid, non-zero time values
      if (!isNaN(timeVal) && timeVal > 0 && isFinite(timeVal)) {
        const fuseSize = fuseSizes[j];
        result[fuseSize].push([ikAbs, timeVal]);
        validPoints++;
      }
    }
    
    if (i <= 3 || i === lines.length - 1) {
      console.log(`Line ${i}: Ik=${ikAbs.toFixed(3)}A, valid points=${validPoints}`);
    }
  }
  
  // Sort each curve by Ik value
  fuseSizes.forEach(size => {
    result[size].sort((a, b) => a[0] - b[0]);
  });
  
  return result;
}

// Parse all curves on module load
const allCurves = parseNeozedCsv();

// Export individual curves - all use precise Engauge data
export const NEOZED_2A_POINTS: CurvePoint[] = PRECISE_2A_POINTS.map(p => [p.ik, p.t]);
export const NEOZED_4A_POINTS: CurvePoint[] = PRECISE_4A_POINTS.map(p => [p.ik, p.t]);
export const NEOZED_6A_POINTS: CurvePoint[] = PRECISE_6A_POINTS.map(p => [p.ik, p.t]);
export const NEOZED_10A_POINTS: CurvePoint[] = PRECISE_10A_POINTS.map(p => [p.ik, p.t]);
export const NEOZED_16A_POINTS: CurvePoint[] = PRECISE_16A_POINTS.map(p => [p.ik, p.t]);
export const NEOZED_20A_POINTS: CurvePoint[] = PRECISE_20A_POINTS.map(p => [p.ik, p.t]);
export const NEOZED_25A_POINTS: CurvePoint[] = PRECISE_25A_POINTS.map(p => [p.ik, p.t]);
export const NEOZED_35A_POINTS: CurvePoint[] = PRECISE_35A_POINTS.map(p => [p.ik, p.t]);
export const NEOZED_50A_POINTS: CurvePoint[] = PRECISE_50A_POINTS.map(p => [p.ik, p.t]);
export const NEOZED_63A_POINTS: CurvePoint[] = PRECISE_63A_POINTS.map(p => [p.ik, p.t]);
export const NEOZED_80A_POINTS: CurvePoint[] = PRECISE_80A_POINTS.map(p => [p.ik, p.t]);
export const NEOZED_100A_POINTS: CurvePoint[] = PRECISE_100A_POINTS.map(p => [p.ik, p.t]);
