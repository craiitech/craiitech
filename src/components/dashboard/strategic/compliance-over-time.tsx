
'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Submission, Cycle, Unit } from '@/lib/types';
import { TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT } from '@/app/(dashboard)/dashboard/page';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface ComplianceOverTimeProps {
  allSubmissions: Submission[] | null;
  allCycles: Cycle[] | null;
  allUnits: Unit[] | null;
}

export function ComplianceOverTime({ allSubmissions, allCycles, allUnits }: ComplianceOverTimeProps) {
  const chartData = useMemo(() => {
    if (!allSubmissions || !allCycles || !allUnits) return [];

    const cyclesByYear = allCycles.reduce((acc, cycle) => {
      if (!acc[cycle.year]) {
        acc[cycle.year] = [];
      }
      acc[cycle.year].push(cycle);
      return acc;
    }, {} as Record<number, Cycle[]>);

    const data = Object.entries(cyclesByYear).map(([year, cycles]) => {
      const yearNum = Number(year);
      const totalRequired = allUnits.length * TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT;

      const yearSubmissions = allSubmissions.filter(s => s.year === yearNum);
      const uniqueSubmissions = new Set(yearSubmissions.map(s => `${s.unitId}-${s.reportType}-${s.cycleId}`));
      
      const completionRate = totalRequired > 0 ? (uniqueSubmissions.size / totalRequired) * 100 : 0;

      return {
        year: year,
        "Completion Rate": parseFloat(completionRate.toFixed(2)),
      };
    });

    return data.sort((a, b) => Number(a.year) - Number(b.year));
  }, [allSubmissions, allCycles, allUnits]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall Compliance Trend</CardTitle>
        <CardDescription>Year-over-year submission completion percentage across all units.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[300px] w-full">
            <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis unit="%" />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="Completion Rate" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
                </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
