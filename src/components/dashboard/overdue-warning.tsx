'use client';

import { useMemo } from 'react';
import type { Submission, Cycle } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Timestamp } from '@/firebase/firestore-wrapper';
import { isAfter, differenceInDays } from 'date-fns';
import { submissionTypes } from '@/lib/constants';

interface OverdueWarningProps {
  allCycles: Cycle[] | null;
  submissions: Submission[] | null;
  isLoading: boolean;
}

export function OverdueWarning({ allCycles, submissions, isLoading }: OverdueWarningProps) {
  const overdueCycles = useMemo(() => {
    if (!allCycles || !submissions) {
      return [];
    }

    const now = new Date();
    // Find cycles whose deadlines have passed
    const pastDueCycles = allCycles.filter((cycle) => {
      const endDate = cycle.endDate instanceof Timestamp ? cycle.endDate.toDate() : new Date(cycle.endDate);
      return isAfter(now, endDate);
    });

    if (pastDueCycles.length === 0) return [];

    return pastDueCycles
      .map((cycle) => {
        // Get the user's submissions for this specific cycle
        const userSubmissionsForCycle = submissions.filter((s) => s.cycleId === cycle.name && s.year === cycle.year);
        const submittedTypes = new Set(userSubmissionsForCycle.map((s) => s.reportType));

        // Find which required reports are missing
        const missingReports = submissionTypes.filter((type) => !submittedTypes.has(type));

        if (missingReports.length > 0) {
          const endDate = cycle.endDate instanceof Timestamp ? cycle.endDate.toDate() : new Date(cycle.endDate);
          const daysLate = differenceInDays(now, endDate);
          return {
            cycleName: `${cycle.name} ${cycle.year}`,
            missingReports,
            daysLate,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [allCycles, submissions]);

  if (isLoading || overdueCycles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {overdueCycles.map((overdue, index) => (
        <Alert
          variant="destructive"
          key={index}
          className="relative overflow-hidden animate-warning-banner border-destructive/50 transition-all shadow-sm"
        >
          {/* Subtle animated hazard stripes texture */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 animate-warning-stripes opacity-70" />

          {/* Luminous sheen wave that glides across the banner */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent animate-warning-shimmer"
          />

          <AlertTriangle className="h-4 w-4 animate-pulse text-destructive shrink-0" />
          <AlertTitle className="relative z-10 font-semibold tracking-tight">
            Action Required: Overdue Submissions
          </AlertTitle>
          <AlertDescription className="relative z-10">
            You have not submitted all reports for the <strong>{overdue?.cycleName}</strong> cycle, which was due{' '}
            <strong>{overdue?.daysLate} days ago</strong>. The following reports are missing:{' '}
            {overdue?.missingReports.join(', ')}. Please submit them as soon as possible.
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
