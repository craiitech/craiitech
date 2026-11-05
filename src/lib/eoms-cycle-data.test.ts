import { describe, expect, it } from 'vitest';
import { getEomsPlanDataIds } from './eoms-cycle-data';

describe('getEomsPlanDataIds', () => {
  it('uses only First Cycle data in the First Cycle', () => {
    expect(getEomsPlanDataIds(2026, 'first', 'unit-1')).toEqual(['op_2026_first_unit-1', '2026-unit-1-first']);
  });

  it('loads First Cycle baseline and Final Cycle updates in the Final Cycle', () => {
    expect(getEomsPlanDataIds(2026, 'final', 'unit-1')).toEqual([
      'op_2026_first_unit-1',
      '2026-unit-1-first',
      'op_2026_final_unit-1',
      '2026-unit-1-final',
    ]);
  });

  it('returns no plan IDs before a unit is selected', () => {
    expect(getEomsPlanDataIds(2026, 'final', '')).toEqual([]);
  });
});
