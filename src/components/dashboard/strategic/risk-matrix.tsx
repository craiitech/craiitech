'use client';

import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Risk } from '@/lib/types';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ShieldAlert, Zap, Info } from 'lucide-react';

interface RiskMatrixProps {
  allRisks: Risk[] | null;
  selectedYear: number;
}

const ratingColor: Record<string, string> = {
    'High': 'hsl(var(--destructive))',
    'Medium': 'hsl(48 96% 53%)',
    'Low': 'hsl(142 71% 45%)',
}

export function RiskMatrix({ allRisks, selectedYear }: RiskMatrixProps) {
  const riskData = useMemo(() => {
    if (!allRisks) return [];
    return allRisks
        .filter(risk => risk.year === selectedYear && risk.type === 'Risk' && risk.status !== 'Closed')
        .map(risk => ({
            x: risk.preTreatment.consequence,
            y: risk.preTreatment.likelihood,
            z: risk.preTreatment.magnitude, 
            name: risk.description,
            rating: risk.preTreatment.rating,
            fill: ratingColor[risk.preTreatment.rating] || '#ccc'
    }));
  }, [allRisks, selectedYear]);

  return (
    <Card className="shadow-md border-primary/10 overflow-hidden">
      <CardHeader className="bg-muted/10 border-b">
        <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Risk Matrix (Pre-Treatment)</CardTitle>
        </div>
        <CardDescription className="text-xs">Open risks for {selectedYear} plotted by likelihood vs. consequence.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ChartContainer config={{}} className="h-[300px] w-full">
            <ResponsiveContainer>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis type="number" dataKey="x" name="Consequence" unit="" domain={[0, 6]} ticks={[1,2,3,4,5]} fontSize={10} label={{ value: 'Consequence Impact', position: 'insideBottom', offset: -10, fontSize: 9, fontWeight: 'black' }} />
                    <YAxis type="number" dataKey="y" name="Likelihood" unit="" domain={[0, 6]} ticks={[1,2,3,4,5]} fontSize={10} label={{ value: 'Likelihood of Occurrence', angle: -90, position: 'insideLeft', offset: 15, fontSize: 9, fontWeight: 'black' }} />
                    <ZAxis type="number" dataKey="z" range={[100, 1000]} name="magnitude" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                    <Scatter name="Risks" data={riskData} />
                </ScatterChart>
            </ResponsiveContainer>
        </ChartContainer>
        <div className="flex justify-center gap-4 text-[9px] font-black uppercase tracking-tighter mt-4 border-t pt-4">
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-600" /> High Magnitude</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500" /> Medium Magnitude</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-600" /> Low Magnitude</div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/5 border-t py-4 px-6">
        <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">
                    <strong>Strategic Perspective:</strong> Bubble size indicates total <strong>Magnitude (L x C)</strong>. Entries in the top-right quadrant (High Likelihood & High Consequence) represent critical threats to university operations or accreditation status. These should be prioritize for immediate treatment funding or administrative oversight.
                </p>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
}
