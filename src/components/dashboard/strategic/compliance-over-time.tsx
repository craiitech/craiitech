'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Submission, Cycle, Unit } from '@/lib/types';
import { TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT } from '@/app/(dashboard)/dashboard/page';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp, Target, Activity } from 'lucide-react';

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
    <Card className="shadow-md border-primary/10 overflow-hidden">
      <CardHeader className="bg-muted/10 border-b">
        <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Compliance Momentum</CardTitle>
        </div>
        <CardDescription className="text-xs">Year-over-year submission completion percentage across all university units.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {chartData.length > 0 ? (
            <ChartContainer config={{}} className="h-[300px] w-full">
                <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                        <YAxis unit="%" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                        <Line type="monotone" dataKey="Completion Rate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 6, fill: 'hsl(var(--primary))' }} activeDot={{ r: 8 }}>
                            <LabelList dataKey="Completion Rate" position="top" style={{ fontSize: '11px', fontWeight: '900', fill: 'hsl(var(--primary))' }} formatter={(v: number) => `${v}%`} />
                        </Line>
                    </LineChart>
                </ResponsiveContainer>
            </ChartContainer>
        ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground opacity-40">
                <Activity className="h-12 w-12 mb-2" />
                <p className="text-xl font-black uppercase tracking-[0.2em]">NO DATA YET!</p>
            </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/5 border-t py-4 px-6">
        <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">
                <strong>Strategic Guidance:</strong> This trend analyzes the "adoption rate" of the digital portal. An upward trajectory signifies increasing institutional maturity and successful digital transformation of the quality assurance process. Significant dips between years should trigger a review of administrative documentation friction or technical access barriers.
            </p>
        </div>
      </CardFooter>
    </Card>
  );
}