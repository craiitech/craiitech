
'use client';

import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { format, subMonths } from 'date-fns';
import type { Submission } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartTooltipContent, ChartContainer } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';

interface OverviewProps {
  submissions: Submission[] | null;
  isLoading: boolean;
}

const chartConfig = {
  total: {
    label: 'Submissions',
  },
} satisfies ChartConfig;


export function Overview({ submissions, isLoading }: OverviewProps) {

  const data = useMemo(() => {
    const monthlyData: { [key: string]: { name: string; total: number } } = {};
    const now = new Date();

    // Initialize the last 12 months with 0 submissions
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(now, i);
      const monthKey = format(month, 'yyyy-MM');
      monthlyData[monthKey] = {
        name: format(month, 'MMM'),
        total: 0,
      };
    }

    // Populate with actual submission data
    if (submissions) {
      submissions.forEach((submission) => {
        // This is a more robust check for a valid date
        const submissionDate = new Date(submission.submissionDate);
        if (submissionDate && !isNaN(submissionDate.getTime())) {
            const monthKey = format(submissionDate, 'yyyy-MM');
            if (monthlyData[monthKey]) {
              monthlyData[monthKey].total += 1;
            }
        }
      });
    }

    return Object.values(monthlyData);
  }, [submissions]);

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full" />;
  }
  
   if (!submissions || submissions.length === 0) {
    return (
      <div className="flex h-[350px] w-full items-center justify-center text-muted-foreground">
        No submission data to display.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} accessibilityLayer>
            <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            />
            <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tickFormatter={(value) => `${value}`}
            />
            <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                content={<ChartTooltipContent />}
            />
            <Bar
            dataKey="total"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            />
        </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
