import type { AuditFinding, AuditPlan, AuditSchedule, CorrectiveActionRequest } from '@/lib/types';
import { parseCarDate } from '@/lib/car-utils';

export interface IqaOfiRegisterRow {
  id: string;
  year: number;
  statement: string;
  campusId: string;
  campus: string;
  unitId: string;
  unit: string;
  status: string;
  remarks: string;
}

export function buildIqaOfiRegisterRows({
  findings,
  schedules,
  plans,
  cars,
  campusMap,
}: {
  findings: AuditFinding[];
  schedules: AuditSchedule[];
  plans: AuditPlan[];
  cars: CorrectiveActionRequest[];
  campusMap: Map<string, string>;
}): IqaOfiRegisterRow[] {
  const schedulesById = new Map(schedules.map((schedule) => [schedule.id, schedule]));
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));
  const carsByFindingId = new Map<string, CorrectiveActionRequest[]>();

  cars.forEach((car) => {
    if (!car.findingId || car.auditType === 'EQA') return;
    const linkedCars = carsByFindingId.get(car.findingId) || [];
    linkedCars.push(car);
    carsByFindingId.set(car.findingId, linkedCars);
  });

  return findings
    .filter((finding) => finding.type === 'Observation for Improvement')
    .flatMap((finding) => {
      const schedule = schedulesById.get(finding.auditScheduleId);
      if (!schedule) return [];

      const scheduleDate = parseCarDate(schedule.scheduledDate);
      const plan = plansById.get(schedule.auditPlanId);
      const year = Number(plan?.year) || scheduleDate?.getFullYear();
      if (!year) return [];

      const linkedCars = (carsByFindingId.get(finding.id) || []).sort((a, b) => {
        const dateA = parseCarDate(a.updatedAt || a.requestDate)?.getTime() || 0;
        const dateB = parseCarDate(b.updatedAt || b.requestDate)?.getTime() || 0;
        return dateB - dateA;
      });
      const latestCar = linkedCars[0];
      const latestFollowUp = latestCar?.followUpLogs?.at(-1);
      const latestEffectiveness = latestCar?.effectivenessAudits?.at(-1);

      return [
        {
          id: finding.id,
          year,
          statement: finding.description || finding.evidence || 'No OFI statement recorded',
          campusId: schedule.campusId || '',
          campus: campusMap.get(schedule.campusId) || schedule.campusId || 'Not recorded',
          unitId: schedule.targetId || '',
          unit: schedule.targetName || schedule.targetId || 'Not recorded',
          status: latestCar?.status || finding.verification?.status || 'No action recorded',
          remarks:
            latestFollowUp?.remarks ||
            latestEffectiveness?.remarks ||
            finding.verification?.evidence ||
            finding.evidence ||
            'No remarks recorded',
        },
      ];
    })
    .sort((a, b) => b.year - a.year || a.campus.localeCompare(b.campus) || a.statement.localeCompare(b.statement));
}
