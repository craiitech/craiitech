import type { GaaBurRateTargets, GaaBurFinancialTargets, GaaBurReport } from '@/lib/types';

export const DEFAULT_BUR_TARGETS: GaaBurRateTargets = {
  obligation: 95,
  disbursement: 90,
};

export const DEFAULT_FINANCIAL_TARGETS: GaaBurFinancialTargets = {
  ps: 0,
  mooe: 0,
  co: 0,
};

export type BurComputation = {
  obligation: number;
  disbursement: number;
};

export type AttainmentStatus = 'Met' | 'On Track' | 'At Risk' | 'Not Met';
export type BurStatus = 'On Target' | 'Below Target';

export function isIpdoProfile(role?: string | null, unitName?: string | null): boolean {
  return /ipdo|institutional planning and development/i.test(`${role ?? ''} ${unitName ?? ''}`);
}

export function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;

  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getFinancialTotal(financial: GaaBurFinancialTargets): number {
  return toFiniteNumber(financial.ps) + toFiniteNumber(financial.mooe) + toFiniteNumber(financial.co);
}

export function computeBur(allotments: number, obligations: number, disbursements: number): BurComputation {
  const safeAllotments = toFiniteNumber(allotments);
  const safeObligations = toFiniteNumber(obligations);
  const safeDisbursements = toFiniteNumber(disbursements);

  return {
    obligation: safeAllotments > 0 ? (safeObligations / safeAllotments) * 100 : 0,
    disbursement: safeObligations > 0 ? (safeDisbursements / safeObligations) * 100 : 0,
  };
}

export function computeReportBur(report: GaaBurReport): BurComputation {
  return computeBur(report.allotments, report.obligations, report.disbursements);
}

export function getLatestReport(reports: GaaBurReport[]): GaaBurReport | null {
  return (
    [...reports]
      .filter(
        (report) =>
          toFiniteNumber(report.allotments) > 0 ||
          toFiniteNumber(report.obligations) > 0 ||
          toFiniteNumber(report.disbursements) > 0,
      )
      .sort((a, b) => b.quarter - a.quarter)[0] ?? null
  );
}

export function getAttainment(actual: number, target: number): number {
  const safeActual = toFiniteNumber(actual);
  const safeTarget = toFiniteNumber(target);

  if (safeTarget === 0) return safeActual === 0 ? 100 : 0;
  return (safeActual / safeTarget) * 100;
}

export function getAttainmentStatus(rate: number): AttainmentStatus {
  if (rate >= 100) return 'Met';
  if (rate >= 90) return 'On Track';
  if (rate >= 75) return 'At Risk';
  return 'Not Met';
}

export function getBurStatus(actual: number, target: number): BurStatus {
  return toFiniteNumber(actual) >= toFiniteNumber(target) ? 'On Target' : 'Below Target';
}

export function formatPeso(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(toFiniteNumber(value));
}

export function formatPercent(value: number): string {
  return `${toFiniteNumber(value).toFixed(1)}%`;
}
