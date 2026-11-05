export type EomsCycle = 'first' | 'final';

export function getEomsPlanDataIds(year: number, cycle: EomsCycle, unitId: string): string[] {
  if (!unitId) return [];

  const cycles: EomsCycle[] = cycle === 'final' ? ['first', 'final'] : ['first'];
  return cycles.flatMap((cycleId) => [`op_${year}_${cycleId}_${unitId}`, `${year}-${unitId}-${cycleId}`]);
}
