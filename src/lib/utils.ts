import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const REPORT_TYPE_CODES: Record<string, string> = {
  'Operational Plans': 'OPE',
  'Objectives Monitoring': 'OBM',
  'Risk and Opportunity Registry Form': 'ROR',
  'Risk and Opportunity Action Plan': 'ROA',
  'Updated Needs and Expectation of Interested Parties': 'NEP',
  'SWOT Analysis': 'SWO',
};

/**
 * Generates a standardized QA Document Control Number.
 * Format: UNIVERSITY CODE - UNIT PREFIX - REVISION NO. - DOCUMENT CONTROL - DOCUMENT PREFIX - YYYY-MM-DD
 * e.g. RSU-CAJ-00-0001-OPE-2026-02-03
 */
export function generateControlNumber(
  unitName: string,
  revision: number,
  reportType: string,
  date: Date
): string {
  const universityCode = 'RSU';
  
  // Extract 3-letter unit prefix, ignoring common words
  const words = unitName.trim().split(/\s+/).filter(w => !['of', 'and', 'the', '&', 'for'].includes(w.toLowerCase()));
  let unitPrefix = '';
  if (words.length >= 3) {
    unitPrefix = words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  } else if (words.length === 2) {
    unitPrefix = (words[0].slice(0, 2) + words[1][0]).toUpperCase();
  } else {
    unitPrefix = words[0].slice(0, 3).toUpperCase();
  }
  
  const revPadded = String(revision).padStart(2, '0');
  const docControl = '0001';
  const reportCode = REPORT_TYPE_CODES[reportType] || 'DOC';
  
  // Format date as YYYY-MM-DD
  const dateStr = date.toISOString().split('T')[0];
  
  return `${universityCode}-${unitPrefix}-${revPadded}-${docControl}-${reportCode}-${dateStr}`;
}
