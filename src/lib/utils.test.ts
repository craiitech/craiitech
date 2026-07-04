import { describe, it, expect } from 'vitest';
import {
  cn,
  normalizeReportType,
  generateControlNumber,
  parseDate,
  isCycleActive,
  getDirectDriveLink,
} from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', 'visible')).toBe('base visible');
  });

  it('handles tailwind conflicts', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2');
  });
});

describe('normalizeReportType', () => {
  it('normalizes SWOT variations', () => {
    expect(normalizeReportType('SWOT Analysis')).toBe('SWOT Analysis');
    expect(normalizeReportType('swot')).toBe('SWOT Analysis');
    expect(normalizeReportType('SWOT')).toBe('SWOT Analysis');
  });

  it('normalizes NEP variations', () => {
    expect(normalizeReportType('Needs and Expectation of Interested Parties')).toBe(
      'Needs and Expectation of Interested Parties',
    );
    expect(normalizeReportType('needs assessment')).toBe(
      'Needs and Expectation of Interested Parties',
    );
    expect(normalizeReportType('expectation of interested parties')).toBe(
      'Needs and Expectation of Interested Parties',
    );
  });

  it('normalizes Operational Plan', () => {
    expect(normalizeReportType('Operational Plan')).toBe('Operational Plan');
    expect(normalizeReportType('operational plan')).toBe('Operational Plan');
  });

  it('normalizes Quality Objectives Monitoring', () => {
    expect(normalizeReportType('Quality Objectives Monitoring')).toBe(
      'Quality Objectives Monitoring',
    );
    expect(normalizeReportType('objectives monitoring')).toBe(
      'Quality Objectives Monitoring',
    );
  });

  it('distinguishes Risk Action Plan from Registry', () => {
    expect(normalizeReportType('Risk and Opportunity Action Plan')).toBe(
      'Risk and Opportunity Action Plan',
    );
    expect(normalizeReportType('Risk and Opportunity Registry')).toBe(
      'Risk and Opportunity Registry',
    );
    expect(normalizeReportType('action plan risk')).toBe('Risk and Opportunity Action Plan');
    expect(normalizeReportType('registry risk')).toBe('Risk and Opportunity Registry');
  });

  it('returns original for unrecognized types', () => {
    expect(normalizeReportType('Custom Report')).toBe('Custom Report');
  });

  it('handles empty string', () => {
    expect(normalizeReportType('')).toBe('');
  });
});

describe('generateControlNumber', () => {
  it('generates correct format for known unit', () => {
    const date = new Date('2026-02-03');
    const result = generateControlNumber('Quality Assurance Office', 0, 'SWOT Analysis', date);
    expect(result).toBe('RSU-QAO-00-0001-SWO-2026-02-03');
  });

  it('generates correct format for multi-word unit without code', () => {
    const date = new Date('2026-06-15');
    const result = generateControlNumber('College of Engineering and Technology', 1, 'Operational Plan', date);
    expect(result).toBe('RSU-CET-01-0001-OPE-2026-06-15');
  });

  it('uses DOC fallback for unknown report type', () => {
    const date = new Date('2026-01-01');
    const result = generateControlNumber('QAO', 0, 'Unknown Report', date);
    expect(result).toContain('-DOC-');
  });

  it('pads revision number to 2 digits', () => {
    const date = new Date('2026-01-01');
    const result = generateControlNumber('QAO', 5, 'SWOT Analysis', date);
    expect(result).toContain('-05-');
  });
});

describe('parseDate', () => {
  it('parses Date objects', () => {
    const d = new Date('2026-01-15');
    expect(parseDate(d)).toEqual(d);
  });

  it('parses Firestore Timestamp with toDate()', () => {
    const d = new Date('2026-03-10');
    const ts = { toDate: () => d };
    expect(parseDate(ts)).toEqual(d);
  });

  it('parses Firestore Timestamp with toMillis()', () => {
    const d = new Date('2026-03-10');
    const ts = { toMillis: () => d.getTime() };
    expect(parseDate(ts)).toEqual(d);
  });

  it('parses seconds/nanoseconds format', () => {
    const result = parseDate({ seconds: 1777852800, nanoseconds: 0 });
    expect(result.getTime()).toBe(1777852800000);
  });

  it('parses ISO date strings', () => {
    const result = parseDate('2026-06-15T00:00:00.000Z');
    expect(result.toISOString().startsWith('2026-06-15')).toBe(true);
  });

  it('parses numeric timestamps', () => {
    const result = parseDate(1777852800000);
    expect(result.getTime()).toBe(1777852800000);
  });

  it('returns current date for null/undefined', () => {
    const now = new Date();
    const result = parseDate(null);
    expect(Math.abs(result.getTime() - now.getTime())).toBeLessThan(1000);
  });
});

describe('isCycleActive', () => {
  it('returns true when allCycles is null', () => {
    expect(isCycleActive('first', 2026, null)).toBe(true);
  });

  it('returns true when allCycles is undefined', () => {
    expect(isCycleActive('first', 2026, undefined)).toBe(true);
  });

  it('returns true when cycle not found', () => {
    expect(isCycleActive('first', 2026, [{ id: '1', name: 'final', year: 2026, startDate: new Date(), endDate: new Date() }])).toBe(true);
  });

  it('returns true when start date is in the past', () => {
    const cycles = [{ id: '1', name: 'first' as const, year: 2026, startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30') }];
    expect(isCycleActive('first', 2026, cycles)).toBe(true);
  });
});

describe('getDirectDriveLink', () => {
  it('transforms drive share links', () => {
    const result = getDirectDriveLink('https://drive.google.com/file/d/abc123/view');
    expect(result).toBe('https://drive.google.com/uc?export=view&id=abc123');
  });

  it('returns empty string for undefined', () => {
    expect(getDirectDriveLink(undefined)).toBe('');
  });

  it('returns original URL for non-drive links', () => {
    expect(getDirectDriveLink('https://example.com/image.png')).toBe(
      'https://example.com/image.png',
    );
  });
});
