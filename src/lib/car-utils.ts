import type { CorrectiveActionRequest } from '@/lib/types';
import { format, isToday, isBefore, startOfDay, differenceInDays } from 'date-fns';

export type CarUrgency = 'overdue' | 'today' | 'due_soon' | 'scheduled' | 'closed' | 'none';

export interface CarNextActionInfo {
  date: Date | null;
  formattedDate: string;
  actionType: string;
  actionLabel: string;
  urgency: CarUrgency;
  daysRemaining: number | null;
  badgeText: string;
  isOverdue: boolean;
}

export function parseCarDate(dateVal: any): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
  if (typeof dateVal === 'object' && dateVal.seconds !== undefined) {
    return new Date(dateVal.seconds * 1000);
  }
  if (typeof dateVal === 'string' || typeof dateVal === 'number') {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function getNextCarActionInfo(car: CorrectiveActionRequest): CarNextActionInfo {
  if (!car) {
    return {
      date: null,
      formattedDate: '--',
      actionType: 'None',
      actionLabel: 'No Action',
      urgency: 'none',
      daysRemaining: null,
      badgeText: '--',
      isOverdue: false,
    };
  }

  // If CAR is closed
  if (car.status === 'Closed') {
    const closedDate =
      parseCarDate(car.updatedAt) ||
      (car.effectivenessAudits && car.effectivenessAudits.length > 0
        ? parseCarDate(car.effectivenessAudits[car.effectivenessAudits.length - 1]?.date)
        : null);

    return {
      date: closedDate,
      formattedDate: closedDate ? format(closedDate, 'MMM dd, yyyy') : 'Closed',
      actionType: 'Closed',
      actionLabel: 'Resolved & Verified',
      urgency: 'closed',
      daysRemaining: null,
      badgeText: 'Closed',
      isOverdue: false,
    };
  }

  const today = startOfDay(new Date());

  // 1. Check if nextVerificationDate / follow-up log nextActionDate is set
  const latestFollowUp =
    car.followUpLogs && car.followUpLogs.length > 0 ? car.followUpLogs[car.followUpLogs.length - 1] : null;

  let directVerificationDate =
    parseCarDate(car.nextVerificationDate) ||
    parseCarDate(latestFollowUp?.nextActionDate) ||
    parseCarDate(car.nextActionDate);

  // Check assignedUnits follow-up logs if none found at root
  if (!directVerificationDate && car.assignedUnits && car.assignedUnits.length > 0) {
    for (const au of car.assignedUnits) {
      if (au.followUpLogs && au.followUpLogs.length > 0) {
        const auLatest = au.followUpLogs[au.followUpLogs.length - 1];
        const auDate = parseCarDate(auLatest?.nextActionDate);
        if (auDate) {
          if (!directVerificationDate || auDate < directVerificationDate) {
            directVerificationDate = auDate;
          }
        }
      }
    }
  }

  // 2. Check pending action steps (root and assigned units)
  let earliestStepDate: Date | null = null;
  let earliestStepDesc = '';

  const allActionSteps = [
    ...(car.actionSteps || []),
    ...(car.assignedUnits ? car.assignedUnits.flatMap((u) => u.actionSteps || []) : []),
  ];

  if (allActionSteps.length > 0) {
    for (const step of allActionSteps) {
      if (step.status !== 'Completed') {
        const stepDate = parseCarDate(step.completionDate);
        if (stepDate) {
          if (!earliestStepDate || stepDate < earliestStepDate) {
            earliestStepDate = stepDate;
            earliestStepDesc = step.type || step.description || 'Action Step';
          }
        }
      }
    }
  }

  // 3. Check reply deadline
  const replyDeadline = parseCarDate(car.timeLimitForReply);

  // Determine target date and action label
  let targetDate: Date | null = null;
  let actionType = '';
  let actionLabel = '';

  if (directVerificationDate) {
    targetDate = directVerificationDate;
    const nextAction = latestFollowUp?.nextAction;
    actionType = nextAction ? String(nextAction) : 'Follow-up Verification';
    actionLabel = `Verification: ${actionType}`;
  } else if (car.needsVerification) {
    targetDate = parseCarDate(car.updatedAt) || today;
    actionType = 'For Final Verification';
    actionLabel = 'Awaiting QMS Verification';
  } else if (earliestStepDate) {
    targetDate = earliestStepDate;
    actionType = 'Action Step Due';
    actionLabel = earliestStepDesc;
  } else if (replyDeadline && (car.status === 'Open' || car.status === 'Awaiting Response/Update')) {
    targetDate = replyDeadline;
    actionType = 'Reply Deadline';
    actionLabel = 'Initial Response Due';
  } else {
    targetDate = null;
    actionType = 'To be Scheduled';
    actionLabel = 'Set Next Action Date';
  }

  if (!targetDate) {
    return {
      date: null,
      formattedDate: 'Not Scheduled',
      actionType: 'Pending Date',
      actionLabel: 'Schedule Action Date',
      urgency: 'none',
      daysRemaining: null,
      badgeText: 'Not Scheduled',
      isOverdue: false,
    };
  }

  const targetDay = startOfDay(targetDate);
  const formattedDate = format(targetDate, 'MMM dd, yyyy');

  if (isBefore(targetDay, today)) {
    const diff = differenceInDays(today, targetDay);
    return {
      date: targetDate,
      formattedDate,
      actionType,
      actionLabel,
      urgency: 'overdue',
      daysRemaining: -diff,
      badgeText: diff === 1 ? 'Overdue (1 day)' : `Overdue (${diff} days)`,
      isOverdue: true,
    };
  }

  if (isToday(targetDate)) {
    return {
      date: targetDate,
      formattedDate,
      actionType,
      actionLabel,
      urgency: 'today',
      daysRemaining: 0,
      badgeText: 'Due Today',
      isOverdue: false,
    };
  }

  const days = differenceInDays(targetDay, today);
  if (days <= 7) {
    return {
      date: targetDate,
      formattedDate,
      actionType,
      actionLabel,
      urgency: 'due_soon',
      daysRemaining: days,
      badgeText: days === 1 ? 'Due in 1 day' : `Due in ${days} days`,
      isOverdue: false,
    };
  }

  return {
    date: targetDate,
    formattedDate,
    actionType,
    actionLabel,
    urgency: 'scheduled',
    daysRemaining: days,
    badgeText: `In ${days} days`,
    isOverdue: false,
  };
}

export interface UpcomingCarActionItem {
  car: CorrectiveActionRequest;
  info: CarNextActionInfo;
}

export function getUpcomingCarActions(cars: CorrectiveActionRequest[]): UpcomingCarActionItem[] {
  if (!cars || cars.length === 0) return [];

  const items: UpcomingCarActionItem[] = cars
    .filter((car) => car.status !== 'Closed')
    .map((car) => ({
      car,
      info: getNextCarActionInfo(car),
    }));

  // Sort: Overdue first (most overdue first), then Due Today, then Due Soon (earliest first), then Scheduled (earliest first), then None at the end
  return items.sort((a, b) => {
    const rank: Record<CarUrgency, number> = {
      overdue: 1,
      today: 2,
      due_soon: 3,
      scheduled: 4,
      none: 5,
      closed: 6,
    };

    const rankDiff = rank[a.info.urgency] - rank[b.info.urgency];
    if (rankDiff !== 0) return rankDiff;

    if (a.info.date && b.info.date) {
      return a.info.date.getTime() - b.info.date.getTime();
    }
    if (a.info.date) return -1;
    if (b.info.date) return 1;
    return 0;
  });
}
