'use client';

import { useMemo } from 'react';
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Risk } from '@/lib/types';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { LayoutList, Info } from 'lucide-react';

interface RiskFunnelProps {
  allRisks: Risk[] | null;
  selectedYear: number;
}

export function RiskFunnel({ allRisks, selectedYear }: RiskFunnelProps) {
  const funnelData = useMemo(() => {
    if (!allRisks) return [];

    const yearRisks = allRisks.filter(r => r.year === selectedYear);

    const highRiskOpen = yearRisks.filter(r => r.preTreatment.rating === 'High' && r.status === 'Open').length;
    const mediumRiskOpen = yearRisks.filter(r => r.preTreatment.rating === 'Medium' && r.status === 'Open').length;
    const inProgress = yearRisks.filter(r => r.status === 'In Progress').length;
    const closed = yearRisks.filter(r => r.status === 'Closed').length;

    return [
      { value: highRiskOpen, name: 'High-Risk (Analysis)', fill: 'hsl(var(--destructive))' },
      { value: mediumRiskOpen, name: 'Medium-Risk (Analysis)', fill: 'hsl(48 96% 53%)' },
      { value: inProgress, name: 'Treatment Execution', fill: 'hsl(var(--chart-1))' },
      { value: closed, name: 'Mitigated / Closed', fill: 'hsl(142 71% 45%)' },
    ];
  }, [allRisks, selectedYear]);

  return (
    <Card className="shadow-md border-primary/10 overflow-hidden">
      <CardHeader className="bg-muted/10 border-b">
        <div className="flex items-center gap-2">
            <LayoutList className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Risk Treatment Funnel</CardTitle>
        </div>
        <CardDescription className="text-xs">Processing lifecycle of identified identifying factors for {selectedYear}.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ChartContainer config={{}} className="h-[300px] w-full">
            <ResponsiveContainer>
                <FunnelChart>
                    <Tooltip content={<ChartTooltipContent />} />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                        <LabelList position="right" fill="#000" stroke="none" dataKey="name" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </Funnel>
                </FunnelChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="bg-muted/5 border-t py-4 px-6">
        <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">
                    <strong>Process Guide:</strong> Visualizes the conversion of threats into controlled factors. A healthy funnel shows a strong movement of items from the top (Analysis) into the "Mitigated / Closed" stage. Items stuck in "Treatment Execution" for long periods may indicate a lack of resources or ineffective mitigation plans.
                </p>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
}
