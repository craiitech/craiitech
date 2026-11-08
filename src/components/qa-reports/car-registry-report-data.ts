import type { CorrectiveActionRequest } from '@/lib/types';

export interface CarCampusFindingRow {
  campusId: string;
  campus: string;
  NC: number;
  OFI: number;
  Compliant: number;
  Open: number;
  Ongoing: number;
  Closed: number;
}

type EqaCampusCar = Pick<CorrectiveActionRequest, 'auditType' | 'campusId' | 'natureOfFinding' | 'status'>;

export function buildEqaCampusFindingRows(cars: EqaCampusCar[], campusMap: Map<string, string>): CarCampusFindingRow[] {
  const statsByCampus = new Map<string, CarCampusFindingRow>();

  cars.forEach((car) => {
    if (car.auditType !== 'EQA' || !car.campusId) return;
    const campusName = campusMap.get(car.campusId);
    if (!campusName) return;

    let campusStats = statsByCampus.get(car.campusId);
    if (!campusStats) {
      campusStats = {
        campusId: car.campusId,
        campus: campusName,
        NC: 0,
        OFI: 0,
        Compliant: 0,
        Open: 0,
        Ongoing: 0,
        Closed: 0,
      };
      statsByCampus.set(car.campusId, campusStats);
    }

    if (car.natureOfFinding === 'NC') campusStats.NC += 1;
    else if (car.natureOfFinding === 'OFI') campusStats.OFI += 1;

    if (car.status === 'Open') campusStats.Open += 1;
    else if (car.status === 'Closed') campusStats.Closed += 1;
    else campusStats.Ongoing += 1;
  });

  return Array.from(statsByCampus.values()).sort((a, b) => a.campus.localeCompare(b.campus));
}
