
'use client';

import { useMemo } from 'react';
import type { Submission, Cycle } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { isAfter, differenceInDays } from 'date-fns';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';

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
    const pastDueCycles = allCycles.filter(cycle => {
      const endDate = cycle.endDate instanceof Timestamp ? cycle.endDate.toDate() : new Date(cycle.endDate);
      return isAfter(now, endDate);
    });

    if (pastDueCycles.length === 0) return [];

    return pastDueCycles.map(cycle => {
      // Get the user's submissions for this specific cycle
      const userSubmissionsForCycle = submissions.filter(s => s.cycleId === cycle.id);
      const submittedTypes = new Set(userSubmissionsForCycle.map(s => s.reportType));
      
      // Find which required reports are missing
      const missingReports = submissionTypes.filter(type => !submittedTypes.has(type));

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
    }).filter(Boolean); // Filter out nulls where cycles were complete

  }, [allCycles, submissions]);

  if (isLoading || overdueCycles.length === 0) {
    return null;
  }

  return (
    <>
      {overdueCycles.map((overdue, index) => (
        <Alert variant="destructive" key={index}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Required: Overdue Submissions</AlertTitle>
          <AlertDescription>
            You have not submitted all reports for the <strong>{overdue?.cycleName}</strong> cycle, which was due <strong>{overdue?.daysLate} days ago</strong>.
            The following reports are missing: {overdue?.missingReports.join(', ')}. Please submit them as soon as possible.
          </AlertDescription>
        </Alert>
      ))}
    </>
  );
}
