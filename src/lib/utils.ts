
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const REPORT_TYPE_CODES: Record<string, string> = {
  'Operational Plans': 'OP',
  'Objectives Monitoring': 'OM',
  'Risk and Opportunity Registry Form': 'ROR',
  'Risk and Opportunity Action Plan': 'ROA',
  'Updated Needs and Expectation of Interested Parties': 'NEIP',
  'SWOT Analysis': 'SWOT',
};

/**
 * Generates a standardized QA Document Control Number.
 * Format: RSU-EOMS-[CAMPUS]-[UNIT]-[YEAR]-[REPORT]-REV[X]
 */
export function generateControlNumber(
  campusName: string,
  unitName: string,
  year: number,
  reportType: string,
  revision: number
): string {
  const campusCode = campusName.split(' ').map(word => word[0]).join('').toUpperCase();
  const unitCode = unitName.split(' ').map(word => word[0]).join('').toUpperCase();
  const reportCode = REPORT_TYPE_CODES[reportType] || 'DOC';
  
  return `RSU-EOMS-${campusCode}-${unitCode}-${year}-${reportCode}-REV${revision}`;
}
