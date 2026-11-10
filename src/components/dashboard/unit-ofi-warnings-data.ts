import type {
  AuditFinding,
  AuditPlan,
  AuditSchedule,
  EqaOfiMonitoring,
  EqaOfiStatus,
  IqaOfiActionStatus,
  IqaOfiActionUpdate,
} from '@/lib/types';

export interface UnitOfiActionWarning {
  id: string;
  source: 'IQA' | 'EQA';
  statement: string;
  status: IqaOfiActionStatus | EqaOfiStatus;
  year?: number;
}

const IQA_STATUSES_REQUIRING_UNIT_ACTION = new Set<IqaOfiActionStatus>([
  'Awaiting Unit Update',
  'Returned for Revision',
]);

const EQA_STATUSES_REQUIRING_UNIT_ACTION = new Set<EqaOfiStatus>(['Pending Action', 'In Progress']);

function getYear(value: unknown): number | undefined {
  if (!value) return undefined;
  const date =
    typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function'
      ? value.toDate()
      : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? undefined : date.getFullYear();
}

export function buildUnitIqaOfiWarnings({
  unitId,
  schedules,
  findings,
  plans,
  actionUpdates,
}: {
  unitId: string;
  schedules: AuditSchedule[];
  findings: AuditFinding[];
  plans: AuditPlan[];
  actionUpdates: IqaOfiActionUpdate[];
}): UnitOfiActionWarning[] {
  if (!unitId) return [];

  const schedulesById = new Map(schedules.map((schedule) => [schedule.id, schedule]));
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));
  const actionsByFindingId = new Map(actionUpdates.map((action) => [action.findingId, action]));
  const unitScheduleIds = new Set(
    schedules.filter((schedule) => schedule.targetId === unitId).map((schedule) => schedule.id),
  );

  return findings
    .filter((finding) => finding.type === 'Observation for Improvement')
    .flatMap((finding) => {
      if (!unitScheduleIds.has(finding.auditScheduleId)) return [];

      if (!actionsByFindingId.has(finding.id) && finding.verification?.status) return [];

      const action = actionsByFindingId.get(finding.id);
      const status = action?.status || 'Awaiting Unit Update';
      if (!IQA_STATUSES_REQUIRING_UNIT_ACTION.has(status)) return [];

      const schedule = schedulesById.get(finding.auditScheduleId);
      const plan = schedule ? plansById.get(schedule.auditPlanId) : undefined;

      return [
        {
          id: finding.id,
          source: 'IQA' as const,
          statement: finding.description || finding.evidence || 'No OFI statement recorded',
          status,
          year: plan?.year || getYear(schedule?.scheduledDate),
        },
      ];
    })
    .sort((a, b) => (b.year || 0) - (a.year || 0) || a.statement.localeCompare(b.statement));
}

export function buildUnitEqaOfiWarnings({
  unitId,
  eqaOfis,
}: {
  unitId: string;
  eqaOfis: EqaOfiMonitoring[];
}): UnitOfiActionWarning[] {
  if (!unitId) return [];

  return eqaOfis
    .flatMap((ofi) => {
      const year = getYear(ofi.auditDate);
      return (ofi.targetUnits || []).flatMap((target) => {
        if (target.unitId !== unitId) return [];
        const status = target.status || 'Pending Action';
        if (!EQA_STATUSES_REQUIRING_UNIT_ACTION.has(status)) return [];

        return [
          {
            id: `${ofi.id}-${target.id}`,
            source: 'EQA' as const,
            statement: ofi.ofiStatement || 'No OFI statement recorded',
            status,
            year,
          },
        ];
      });
    })
    .sort((a, b) => (b.year || 0) - (a.year || 0) || a.statement.localeCompare(b.statement));
}
