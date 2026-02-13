'use client';

import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Risk } from '@/lib/types';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface RiskMatrixProps {
  allRisks: Risk[] | null;
  selectedYear: number;
}

const ratingColor: Record<string, string> = {
    'High': 'hsl(var(--destructive))',
    'Medium': 'hsl(var(--chart-3))',
    'Low': 'hsl(var(--chart-2))',
}

export function RiskMatrix({ allRisks, selectedYear }: RiskMatrixProps) {
  const riskData = useMemo(() => {
    if (!allRisks) return [];
    return allRisks
        .filter(risk => risk.year === selectedYear && risk.type === 'Risk' && risk.status !== 'Closed')
        .map(risk => ({
            x: risk.preTreatment.consequence,
            y: risk.preTreatment.likelihood,
            z: risk.preTreatment.magnitude, // For bubble size
            name: risk.description,
            rating: risk.preTreatment.rating,
            fill: ratingColor[risk.preTreatment.rating] || '#ccc'
    }));
  }, [allRisks, selectedYear]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Matrix (Pre-Treatment) - {selectedYear}</CardTitle>
        <CardDescription>Open risks plotted by likelihood vs. consequence. Bubble size indicates magnitude.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[300px] w-full">
            <ResponsiveContainer>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="x" name="Consequence" unit="" domain={[0, 6]} ticks={[1,2,3,4,5]} />
                    <YAxis type="number" dataKey="y" name="Likelihood" unit="" domain={[0, 6]} ticks={[1,2,3,4,5]}/>
                    <ZAxis type="number" dataKey="z" range={[100, 1000]} name="magnitude" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                    <Scatter name="Risks" data={riskData} fill="hsl(var(--primary))" />
                </ScatterChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
