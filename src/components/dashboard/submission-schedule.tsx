
'use client';

import type { Cycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface SubmissionScheduleProps {
  cycles: Cycle[] | null;
  isLoading: boolean;
}

export function SubmissionSchedule({ cycles, isLoading }: SubmissionScheduleProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const currentYear = new Date().getFullYear();
  const currentYearCycles = cycles
    ?.filter(c => c.year === currentYear)
    .sort((a,b) => a.name.localeCompare(b.name));

  if (!currentYearCycles || currentYearCycles.length === 0) {
    return null; // Don't show the card if there are no cycles defined for the current year
  }
  
  const formatDate = (date: any) => {
    if (!date) return 'TBA';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return 'TBA';
    return format(d, 'MMMM d, yyyy');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <CalendarDays />
            {currentYear} Submission Schedule
        </CardTitle>
        <CardDescription>
            Official start and end dates for submission cycles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
            {currentYearCycles.map(cycle => (
                <div key={cycle.id} className="rounded-lg border bg-card-foreground/5 p-4">
                    <p className="font-semibold capitalize text-card-foreground">{cycle.name} Cycle</p>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Starts:</span> {formatDate(cycle.startDate)}
                    </p>
                     <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Ends:</span> {formatDate(cycle.endDate)}
                    </p>
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
