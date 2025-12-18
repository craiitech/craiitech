
'use client';

import { useMemo } from 'react';
import type { Cycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface SubmissionScheduleProps {
  cycles: Cycle[] | null;
  isLoading: boolean;
}

export function SubmissionSchedule({ cycles, isLoading }: SubmissionScheduleProps) {
  const currentYear = new Date().getFullYear();

  const cyclesByYear = useMemo(() => {
    if (!cycles) return {};
    return cycles.reduce((acc, cycle) => {
      const year = cycle.year;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(cycle);
      // Sort cycles within the year (e.g., 'first' then 'final')
      acc[year].sort((a, b) => a.name.localeCompare(b.name));
      return acc;
    }, {} as Record<number, Cycle[]>);
  }, [cycles]);

  const sortedYears = useMemo(() => {
    return Object.keys(cyclesByYear).map(Number).sort((a, b) => b - a);
  }, [cyclesByYear]);

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

  if (sortedYears.length === 0) {
    return null; // Don't show the card if no cycles are defined
  }

  const formatDate = (date: any) => {
    if (!date) return 'TBA';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return 'TBA';
    return format(d, 'MMMM d, yyyy');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays />
          Submission Schedules
        </CardTitle>
        <CardDescription>
          Official start and end dates for submission cycles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible defaultValue={String(currentYear)} className="w-full">
          {sortedYears.map(year => (
            <AccordionItem value={String(year)} key={year}>
              <AccordionTrigger className="text-lg font-medium">{year} Schedule</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {cyclesByYear[year].map(cycle => (
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
