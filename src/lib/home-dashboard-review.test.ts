import { describe, expect, it } from 'vitest';
import { createHomeDashboardFingerprint } from './home-dashboard-review';

describe('createHomeDashboardFingerprint', () => {
  it('returns the same fingerprint for the same dashboard snapshot', () => {
    const snapshot = {
      academicYear: 2026,
      submissions: [{ id: 'submission-1', status: 'approved' }],
      risks: [],
      cars: [],
      compliances: [],
      programs: [],
      schedules: [],
    };

    expect(createHomeDashboardFingerprint(snapshot)).toBe(createHomeDashboardFingerprint(snapshot));
  });

  it('changes the fingerprint when dashboard data or reporting year changes', () => {
    const snapshot = {
      academicYear: 2026,
      submissions: [{ id: 'submission-1', status: 'approved' }],
      risks: [],
      cars: [],
      compliances: [],
      programs: [],
      schedules: [],
    };

    expect(
      createHomeDashboardFingerprint({
        ...snapshot,
        submissions: [{ id: 'submission-1', status: 'submitted' }],
      }),
    ).not.toBe(createHomeDashboardFingerprint(snapshot));
    expect(createHomeDashboardFingerprint({ ...snapshot, academicYear: 2027 })).not.toBe(
      createHomeDashboardFingerprint(snapshot),
    );
  });
});
