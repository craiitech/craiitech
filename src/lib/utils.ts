import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const REPORT_TYPE_CODES: Record<string, string> = {
  'Operational Plan': 'OPE',
  'Quality Objectives Monitoring': 'QOM',
  'Risk and Opportunity Registry': 'ROR',
  'Risk and Opportunity Action Plan': 'ROA',
  'Needs and Expectation of Interested Parties': 'NEP',
  'SWOT Analysis': 'SWO',
};

/**
 * Official Unit Mapping based on the RSU directory.
 */
const UNIT_CODES: Record<string, string> = {
  'Office of the President': 'OP',
  'Office of the University and Board Secretary': 'OUBS',
  'Quality Assurance Office': 'QAO',
  'Planning and Development Office': 'PDO',
  'International Relations Office': 'IRO',
  'Gender and Development Office': 'GADO',
  'Internal Audit Services Office': 'IASO',
  'Public Assistance and Security Office': 'PASO',
  'Special Projects and Advocacy Office': 'SPAO',
  'Office of Media and Public Affairs': 'OMPA',
  'University Policy Systems Office': 'UPSO',
  'Strategic Communication Office': 'SCO',
  'Office of the Vice President for Administration and Finance': 'OVPAF',
  'Bids and Awards Committee': 'BAC',
  'Human Resource and Development Office': 'HRDO',
  'Human Resource Management Office': 'HRMO',
  'Business Affairs Office': 'BAO',
  'Information and Communication Technology Services Center': 'ICTSC',
  'Institutional and Physical Planning Development Office': 'IPPDO',
  'Facilities And Infrastructure Auxiliary Management Office': 'FIAMO',
  'Income Generating Activities and Production Office': 'IGAPO',
  'Accounting Office': 'ACCT',
  'Budget Office': 'BO',
  'Cashiering Office': 'CO',
  'Records Officer': 'RO',
  'Supply and Property Management Office': 'SPMO',
  'Food Technology and Innovation Center': 'FTIC',
  'Procurement Management Office': 'PMO',
  'Office of the Vice President for Academic Affairs': 'OVPAA',
  'Graduate Education and Professional Studies': 'GEPS',
  'College of Agriculture, Fisheries, and Forestry': 'CAFF',
  'College of Arts and Sciences': 'CAS',
  'College of Computing, Multimedia Arts and Digital Innovation': 'CCMADI',
  'College of Education': 'COED',
  'College of Business and Accountancy': 'CBA',
  'College of Engineering and Technology': 'CET',
  'Basic Education (Senior High and Laboratory High)': 'BED',
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
  
  // Try to get official abbreviation first
  let unitPrefix = UNIT_CODES[unitName];

  if (!unitPrefix) {
    // Fallback extraction if not in list
    const words = unitName.trim().split(/\s+/).filter(w => !['of', 'and', 'the', '&', 'for'].includes(w.toLowerCase()));
    if (words.length >= 3) {
      unitPrefix = words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
    } else if (words.length === 2) {
      unitPrefix = (words[0].slice(0, 2) + words[1][0]).toUpperCase();
    } else {
      unitPrefix = words[0].slice(0, 3).toUpperCase();
    }
  }
  
  const revPadded = String(revision).padStart(2, '0');
  const docControl = '0001';
  const reportCode = REPORT_TYPE_CODES[reportType] || 'DOC';
  
  // Format date as YYYY-MM-DD
  const dateStr = date.toISOString().split('T')[0];
  
  return `${universityCode}-${unitPrefix}-${revPadded}-${docControl}-${reportCode}-${dateStr}`;
}
