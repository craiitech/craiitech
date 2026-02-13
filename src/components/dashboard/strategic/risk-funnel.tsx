'use client';

import { useMemo } from 'react';
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Risk } from '@/lib/types';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

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
      { value: highRiskOpen, name: 'High-Risk Open', fill: 'hsl(var(--destructive))' },
      { value: mediumRiskOpen, name: 'Medium-Risk Open', fill: 'hsl(var(--chart-3))' },
      { value: inProgress, name: 'In Progress', fill: 'hsl(var(--chart-1))' },
      { value: closed, name: 'Closed', fill: 'hsl(var(--chart-2))' },
    ];
  }, [allRisks, selectedYear]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Management Funnel - {selectedYear}</CardTitle>
        <CardDescription>A visualization of how risks are being processed through the system.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[300px] w-full">
            <ResponsiveContainer>
                <FunnelChart>
                    <Tooltip content={<ChartTooltipContent />} />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                        <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                    </Funnel>
                </FunnelChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
