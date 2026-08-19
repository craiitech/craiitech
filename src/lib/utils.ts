import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Cycle } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
 * Transforms a Google Drive sharing link into a direct image link for rendering.
 */
export function getDirectDriveLink(url: string | undefined): string {
  if (!url) return '';
  if (url.includes('drive.google.com') && url.includes('/file/d/')) {
    const fileId = url.split('/file/d/')[1]?.split('/')[0];
    if (fileId) {
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }
  return url;
}

/**
 * Fuzzy Report Normalizer
 * Centralizes the logic for identifying EOMS reports despite minor naming variations.
 */
export const normalizeReportType = (type: string): string => {
  const t = type?.toLowerCase() || '';
  if (t.includes('swot')) return 'SWOT Analysis';
  if (t.includes('needs') || t.includes('expectation') || t.includes('interested parties'))
    return 'Needs and Expectation of Interested Parties';
  if (t.includes('operational plan')) return 'Operational Plan';
  if (t.includes('objectives monitoring') || t.includes('quality objectives')) return 'Quality Objectives Monitoring';

  // Specificity order: Action Plan first to avoid mis-categorizing as Registry
  if (t.includes('action plan') && t.includes('risk')) return 'Risk and Opportunity Action Plan';
  if (t.includes('registry') && t.includes('risk')) return 'Risk and Opportunity Registry';

  return type;
};

export const UNIT_CODES: Record<string, string> = {
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
 * Resolves the complete full name of the Supervising Unit / Office for a given unit (un-abbreviated).
 * Used for CAR "Concerning" field and official audit reporting.
 */
export function getSupervisingUnitDisplay(
  unitOrNameOrVp: { vicePresidentId?: string; name?: string; id?: string } | string | undefined | null,
  allUnits?: Array<{ id: string; name: string; vicePresidentId?: string }>,
): string {
  if (!unitOrNameOrVp) return '';

  let nameToInspect = '';

  if (typeof unitOrNameOrVp === 'object') {
    const unit = unitOrNameOrVp;
    if (unit.vicePresidentId && allUnits && allUnits.length > 0) {
      const supUnit = allUnits.find((u) => u.id === unit.vicePresidentId);
      if (supUnit?.name) {
        nameToInspect = supUnit.name;
      }
    }
    if (!nameToInspect) {
      nameToInspect = unit.name || '';
    }
  } else {
    nameToInspect = unitOrNameOrVp;
    // If unit ID or name was passed and we have allUnits
    if (allUnits && allUnits.length > 0) {
      const matchedUnit = allUnits.find(
        (u) => u.id === unitOrNameOrVp || u.name.toLowerCase() === unitOrNameOrVp.toLowerCase(),
      );
      if (matchedUnit?.vicePresidentId) {
        const supUnit = allUnits.find((u) => u.id === matchedUnit.vicePresidentId);
        if (supUnit?.name) {
          nameToInspect = supUnit.name;
        }
      } else if (matchedUnit?.name) {
        nameToInspect = matchedUnit.name;
      }
    }
  }

  const trimmed = nameToInspect.trim();
  const lower = trimmed.toLowerCase();

  // If acronym was given, expand to complete official office name
  if (/^(vpaf|ovpaf)$/i.test(trimmed)) {
    return 'Office of the Vice President for Administration and Finance';
  }
  if (/^(vpaa|ovpaa)$/i.test(trimmed)) {
    return 'Office of the Vice President for Academic Affairs';
  }
  if (/^(vpredi|ovpredi|vpre|ovpre)$/i.test(trimmed)) {
    return 'Office of the Vice President for Research, Extension, Development, and Innovation';
  }
  if (/^(vsas|ovsas)$/i.test(trimmed)) {
    return 'Office of the Vice President for Student Affairs and Services';
  }
  if (/^op$/i.test(trimmed)) {
    return 'Office of the President';
  }

  // Vice President for Administration and Finance
  if (
    lower.includes('administration') &&
    (lower.includes('finance') || lower.includes('vpaf') || lower.includes('ovpaf'))
  ) {
    return 'Office of the Vice President for Administration and Finance';
  }

  // Vice President for Academic Affairs
  if (lower.includes('academic') && (lower.includes('affair') || lower.includes('vpaa') || lower.includes('ovpaa'))) {
    return 'Office of the Vice President for Academic Affairs';
  }

  // Vice President for Research, Extension, Development, and Innovation
  if (
    (lower.includes('research') ||
      lower.includes('extension') ||
      lower.includes('innovation') ||
      lower.includes('development')) &&
    (lower.includes('vice president') ||
      lower.includes('vpredi') ||
      lower.includes('ovpredi') ||
      lower.includes('vpre') ||
      lower.includes('ovpre'))
  ) {
    return 'Office of the Vice President for Research, Extension, Development, and Innovation';
  }

  // Vice President for Student Affairs and Services
  if (
    lower.includes('student') &&
    (lower.includes('affair') || lower.includes('service') || lower.includes('vsas') || lower.includes('ovsas'))
  ) {
    return 'Office of the Vice President for Student Affairs and Services';
  }

  // Office of the President
  if (lower.includes('president') && !lower.includes('vice')) {
    return 'Office of the President';
  }

  return trimmed;
}

/**
 * Generates a standardized QA Document Control Number.
 * Format: UNIVERSITY CODE - UNIT PREFIX - REVISION NO. - DOCUMENT CONTROL - DOCUMENT PREFIX - YYYY-MM-DD
 * e.g. RSU-CAJ-00-0001-OPE-2026-02-03
 */
export function generateControlNumber(unitName: string, revision: number, reportType: string, date: Date): string {
  const universityCode = 'RSU';

  // Try to get official abbreviation first
  let unitPrefix = UNIT_CODES[unitName];

  if (!unitPrefix) {
    // Fallback extraction if not in list
    const words = unitName
      .trim()
      .split(/\s+/)
      .filter((w) => !['of', 'and', 'the', '&', 'for'].includes(w.toLowerCase()));
    if (words.length >= 3) {
      unitPrefix = words
        .slice(0, 3)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
    } else if (words.length === 2) {
      unitPrefix = (words[0].slice(0, 2) + words[1][0]).toUpperCase();
    } else {
      unitPrefix = words[0].slice(0, 3).toUpperCase();
    }
  }

  const revPadded = String(revision).padStart(2, '0');
  const docControl = '0001';
  const reportCode = REPORT_TYPE_CODES[normalizeReportType(reportType)] || 'DOC';

  // Format date as YYYY-MM-DD
  const dateStr = date.toISOString().split('T')[0];

  return `${universityCode}-${unitPrefix}-${revPadded}-${docControl}-${reportCode}-${dateStr}`;
}

/**
 * Safely parses various Firestore timestamp representations and date-like formats into a JavaScript Date object.
 */
interface FirestoreTimestamp {
  toDate(): Date;
  toMillis(): number;
  seconds: number;
  nanoseconds: number;
}

export function parseDate(d: unknown): Date {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  const ts = d as FirestoreTimestamp;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (typeof ts.toMillis === 'function') return new Date(ts.toMillis());
  if (typeof ts.seconds === 'number') {
    return new Date(ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1000000));
  }
  if (typeof d === 'string' || typeof d === 'number') {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Checks if a specific submission cycle has started by checking its configured startDate.
 * If the cycle is not configured or allCycles is null, it defaults to active (true) to ensure backward compatibility.
 */
export function isCycleActive(
  cycleName: 'first' | 'final',
  year: number | string,
  allCycles: Cycle[] | null | undefined,
): boolean {
  if (!allCycles) return true;
  const cycle = allCycles.find((c) => c.name === cycleName && Number(c.year) === Number(year));
  if (!cycle) return true;
  try {
    const start = parseDate(cycle.startDate);
    return new Date() >= start;
  } catch (e) {
    return true;
  }
}
