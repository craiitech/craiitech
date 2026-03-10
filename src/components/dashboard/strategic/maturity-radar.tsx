'use client';

import { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend, PolarRadiusAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Submission, Risk, Campus, ManagementReviewOutput } from '@/lib/types';
import { ShieldCheck, Info, Target } from 'lucide-react';

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
      const approvedCount = campusSubmissions.filter(s => s.statusId === 'approved').length;
      const docMaturity = Math.min(100, (approvedCount / 50) * 100); 

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
    <Card className="shadow-lg border-primary/10 overflow-hidden">
      <CardHeader className="bg-muted/10 border-b">
        <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Maturity Profile</CardTitle>
        </div>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Comparative performance across key ISO 21001 pillars for {selectedYear}.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ChartContainer config={{}} className="h-[350px] w-full">
          <ResponsiveContainer>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid strokeOpacity={0.1} />
              <PolarAngleAxis dataKey="campus" tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
              <Radar name="Documentation" dataKey="Documentation" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
              <Radar name="Risk Mgmt" dataKey="Risk Management" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} />
              <Radar name="MR Actions" dataKey="Decision Resolution" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="bg-muted/5 border-t py-4 px-6">
        <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                    <strong>Strategic Insight:</strong> This radar chart identifies the "shape" of your quality system. A balanced radar indicates consistent adherence across modules. Sharp indentations suggest specific pillars (e.g., Risk Closure) that may require targeted administrative intervention or resource allocation.
                </p>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
}
