
'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Submission } from '@/lib/types';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface CycleSubmissionBreakdownProps {
  allSubmissions: Submission[] | null;
}

export function CycleSubmissionBreakdown({ allSubmissions }: CycleSubmissionBreakdownProps) {
  const chartData = useMemo(() => {
    if (!allSubmissions) return [];

    const currentYear = new Date().getFullYear();
    const yearSubmissions = allSubmissions.filter(s => s.year === currentYear);

    const dataMap: Record<string, { name: string; 'First Cycle': number; 'Final Cycle': number }> = {};

    for (const type of submissionTypes) {
      dataMap[type] = { name: type, 'First Cycle': 0, 'Final Cycle': 0 };
    }

    for (const submission of yearSubmissions) {
      if (dataMap[submission.reportType]) {
        if (submission.cycleId === 'first') {
          dataMap[submission.reportType]['First Cycle']++;
        } else if (submission.cycleId === 'final') {
          dataMap[submission.reportType]['Final Cycle']++;
        }
      }
    }
    
    return Object.values(dataMap);
  }, [allSubmissions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submissions Breakdown by Cycle</CardTitle>
        <CardDescription>
          Count of submissions per document type for the First vs. Final cycle in {new Date().getFullYear()}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[400px] w-full">
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend verticalAlign="top" />
              <Bar dataKey="First Cycle" fill="hsl(var(--chart-1))" />
              <Bar dataKey="Final Cycle" fill="hsl(var(--chart-2))" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
