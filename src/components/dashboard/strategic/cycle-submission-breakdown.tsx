'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Submission } from '@/lib/types';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { FileText, Info } from 'lucide-react';

interface CycleSubmissionBreakdownProps {
  allSubmissions: Submission[] | null;
  selectedYear: number;
}

export function CycleSubmissionBreakdown({ allSubmissions, selectedYear }: CycleSubmissionBreakdownProps) {
  const chartData = useMemo(() => {
    if (!allSubmissions) return [];

    const yearSubmissions = allSubmissions.filter(s => s.year === selectedYear);

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
  }, [allSubmissions, selectedYear]);

  return (
    <Card className="shadow-md border-primary/10 overflow-hidden">
      <CardHeader className="bg-muted/10 border-b py-4">
        <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Cycle Distribution Profile</CardTitle>
        </div>
        <CardDescription className="text-xs">Aggregate count of submissions per core EOMS document for AY {selectedYear}.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ChartContainer config={{}} className="h-[450px] w-full">
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
              <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
              <Bar dataKey="First Cycle" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]}>
                  <LabelList dataKey="First Cycle" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--chart-1))' }} />
              </Bar>
              <Bar dataKey="Final Cycle" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]}>
                  <LabelList dataKey="Final Cycle" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--chart-2))' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="bg-muted/5 border-t py-4 px-6">
        <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">
                    <strong>Guidance for usage:</strong> This profile identifies "Document Friction". Uneven bars indicate procedural gaps where specific documents (e.g., SWOT vs. Action Plans) are lagging. High first-cycle density with low final-cycle density suggests a need for targeted follow-up on end-of-year evidence closure.
                </p>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
}
