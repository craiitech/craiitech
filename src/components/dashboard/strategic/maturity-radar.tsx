
'use client';

import { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Submission, Risk, Campus, ManagementReviewOutput } from '@/lib/types';
import { TOTAL_REPORTS_PER_CYCLE } from '@/app/(dashboard)/dashboard/page';
import { ShieldCheck } from 'lucide-react';

interface MaturityRadarProps {
  campuses: Campus[];
  submissions: Submission[];
  risks: Risk[];
  mrOutputs: ManagementReviewOutput[];
  selectedYear: number;
}

export function MaturityRadar({ campuses, submissions, risks, mrOutputs, selectedYear }: MaturityRadarProps) {
  const radarData = useMemo(() => {
    if (!campuses.length) return [];

    return campuses.map(campus => {
      const campusSubmissions = submissions.filter(s => s.campusId === campus.id && s.year === selectedYear);
      const campusRisks = risks.filter(r => r.campusId === campus.id && r.year === selectedYear);
      const campusActions = mrOutputs.filter(o => o.assignments?.some(a => a.campusId === campus.id));

      // Axis 1: Documentation Maturity (Approved / Required)
      // For simplicity, we approximate required as 12 per unit (average)
      const approvedCount = campusSubmissions.filter(s => s.statusId === 'approved').length;
      const docMaturity = Math.min(100, (approvedCount / 50) * 100); // Normalize to institutional scale

      // Axis 2: Risk Proactivity (Closed / Total)
      const totalRisks = campusRisks.length;
      const closedRisks = campusRisks.filter(r => r.status === 'Closed').length;
      const riskMaturity = totalRisks > 0 ? (closedRisks / totalRisks) * 100 : 0;

      // Axis 3: Decision Resolution (Closed MR Outputs)
      const totalActions = campusActions.length;
      const closedActions = campusActions.filter(a => a.status === 'Closed').length;
      const actionMaturity = totalActions > 0 ? (closedActions / totalActions) * 100 : 0;

      return {
        campus: campus.name,
        'Documentation': Math.round(docMaturity),
        'Risk Management': Math.round(riskMaturity),
        'Decision Resolution': Math.round(actionMaturity),
      };
    });
  }, [campuses, submissions, risks, mrOutputs, selectedYear]);

  return (
    <Card className="shadow-lg border-primary/10">
      <CardHeader className="bg-muted/10 border-b">
        <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Institutional Maturity Profile
        </CardTitle>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Comparative performance across key ISO 21001 pillars.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ChartContainer config={{}} className="h-[300px] w-full">
          <ResponsiveContainer>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid strokeOpacity={0.1} />
              <PolarAngleAxis dataKey="campus" tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <Tooltip content={<ChartTooltipContent />} />
              <Radar name="Documentation" dataKey="Documentation" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
              <Radar name="Risk Mgmt" dataKey="Risk Management" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} />
              <Radar name="MR Actions" dataKey="Decision Resolution" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
