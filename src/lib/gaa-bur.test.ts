import { describe, expect, it } from 'vitest';
import {
  computeBur,
  getAttainment,
  getAttainmentStatus,
  getBurStatus,
  getFinancialTotal,
  getLatestReport,
  isIpdoProfile,
  toFiniteNumber,
} from './gaa-bur';
import type { GaaBurReport } from './types';

function report(quarter: 1 | 2 | 3 | 4, values: Partial<GaaBurReport> = {}): GaaBurReport {
  return {
    year: 2026,
    quarter,
    allotments: 0,
    obligations: 0,
    disbursements: 0,
    ...values,
  };
}

describe('toFiniteNumber', () => {
  it('parses numeric strings and currency strings', () => {
    expect(toFiniteNumber('1,250.50')).toBe(1250.5);
    expect(toFiniteNumber('PHP 2,000')).toBe(2000);
  });

  it('returns zero for invalid values', () => {
    expect(toFiniteNumber(undefined)).toBe(0);
    expect(toFiniteNumber('')).toBe(0);
    expect(toFiniteNumber(Number.NaN)).toBe(0);
  });
});

describe('isIpdoProfile', () => {
  it('detects IPDO from the role or unit name', () => {
    expect(isIpdoProfile('IPDO Director', 'Planning Office')).toBe(true);
    expect(isIpdoProfile('Director', 'Institutional Planning and Development Office')).toBe(true);
    expect(isIpdoProfile('Director', 'Quality Assurance Office')).toBe(false);
  });
});

describe('getFinancialTotal', () => {
  it('sums PS, MOOE, and CO', () => {
    expect(getFinancialTotal({ ps: 100, mooe: 200, co: 300 })).toBe(600);
  });
});

describe('computeBur', () => {
  it('computes obligation and disbursement utilization', () => {
    const result = computeBur(1000, 900, 810);
    expect(result.obligation).toBeCloseTo(90);
    expect(result.disbursement).toBeCloseTo(90);
  });

  it('returns zero when denominators are zero', () => {
    expect(computeBur(0, 0, 0)).toEqual({ obligation: 0, disbursement: 0 });
    expect(computeBur(1000, 0, 0)).toEqual({ obligation: 0, disbursement: 0 });
  });
});

describe('getLatestReport', () => {
  it('returns the highest quarter with reported values', () => {
    const result = getLatestReport([
      report(1, { allotments: 100, obligations: 90, disbursements: 80 }),
      report(2, { allotments: 200, obligations: 180, disbursements: 160 }),
      report(3),
      report(4),
    ]);

    expect(result?.quarter).toBe(2);
  });

  it('returns null when no report has values', () => {
    expect(getLatestReport([report(1), report(2)])).toBeNull();
  });
});

describe('getAttainment', () => {
  it('computes actual versus target', () => {
    expect(getAttainment(90, 100)).toBe(90);
    expect(getAttainment(120, 100)).toBe(120);
  });

  it('handles zero targets', () => {
    expect(getAttainment(0, 0)).toBe(100);
    expect(getAttainment(1, 0)).toBe(0);
  });
});

describe('status helpers', () => {
  it('classifies attainment', () => {
    expect(getAttainmentStatus(100)).toBe('Met');
    expect(getAttainmentStatus(95)).toBe('On Track');
    expect(getAttainmentStatus(80)).toBe('At Risk');
    expect(getAttainmentStatus(50)).toBe('Not Met');
  });

  it('classifies BUR target performance', () => {
    expect(getBurStatus(95, 95)).toBe('On Target');
    expect(getBurStatus(94.9, 95)).toBe('Below Target');
  });
});
