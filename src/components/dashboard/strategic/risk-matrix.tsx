'use client';

import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Risk } from '@/lib/types';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ShieldAlert, Zap, Info, Activity } from 'lucide-react';

import { Chart3DDefs } from '@/components/ui/chart-3d-defs';
import { Cell } from 'recharts';

interface RiskMatrixProps {
  allRisks: Risk[] | null;
  selectedYear: number;
}

const ratingColor: Record<string, string> = {
  High: '#f43f5e',
  Medium: '#f59e0b',
  Low: '#10b981',
};

const ratingGradients: Record<string, string> = {
  High: 'url(#risk3d-grad-rose)',
  Medium: 'url(#risk3d-grad-amber)',
  Low: 'url(#risk3d-grad-emerald)',
};

export function RiskMatrix({ allRisks, selectedYear }: RiskMatrixProps) {
  const riskData = useMemo(() => {
    if (!allRisks) return [];
    return allRisks
      .filter((risk) => Number(risk.year) === Number(selectedYear) && risk.type === 'Risk' && risk.status !== 'Closed')
      .map((risk) => ({
        x: risk.preTreatment.consequence,
        y: risk.preTreatment.likelihood,
        z: risk.preTreatment.magnitude,
        name: risk.description,
        rating: risk.preTreatment.rating,
        fill: ratingColor[risk.preTreatment.rating] || '#ccc',
        gradient: ratingGradients[risk.preTreatment.rating] || 'url(#risk3d-grad-sky)',
      }));
  }, [allRisks, selectedYear]);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl border-primary/10 overflow-hidden bg-gradient-to-b from-white to-slate-50/40 dark:from-slate-900 dark:to-slate-850">
      {/* 3D SVG GRADIENTS & DEPTH FILTERS */}
      <Chart3DDefs idPrefix="risk3d" />

      <CardHeader className="bg-muted/10 border-b py-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-rose-600" />
          <CardTitle className="text-sm font-black uppercase tracking-tight">
            Institutional Risk Matrix (Pre-Treatment 3D)
          </CardTitle>
        </div>
        <CardDescription className="text-xs font-medium">
          Open risks for AY {selectedYear} plotted by likelihood vs. consequence with 3D magnitude elevation.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {riskData.length > 0 ? (
          <>
            <ChartContainer config={{}} className="h-[320px] w-full">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Consequence"
                    unit=""
                    domain={[0, 6]}
                    ticks={[1, 2, 3, 4, 5]}
                    fontSize={10}
                    tick={{ fontWeight: 'bold' }}
                    label={{
                      value: 'Consequence Impact',
                      position: 'insideBottom',
                      offset: -10,
                      fontSize: 10,
                      fontWeight: 'black',
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Likelihood"
                    unit=""
                    domain={[0, 6]}
                    ticks={[1, 2, 3, 4, 5]}
                    fontSize={10}
                    tick={{ fontWeight: 'bold' }}
                    label={{
                      value: 'Likelihood of Occurrence',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 15,
                      fontSize: 10,
                      fontWeight: 'black',
                    }}
                  />
                  <ZAxis type="number" dataKey="z" range={[200, 1400]} name="magnitude" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                  <Scatter name="Risks" data={riskData} filter="url(#risk3d-soft-depth)">
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.gradient || entry.fill} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex justify-center gap-6 text-[10px] font-black uppercase tracking-wider mt-4 border-t pt-4">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 shadow-sm" /> High
                Magnitude
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 shadow-sm" /> Medium
                Magnitude
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 shadow-sm" /> Low
                Magnitude
              </div>
            </div>
          </>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground opacity-40">
            <Activity className="h-12 w-12 mb-2" />
            <p className="text-xl font-black uppercase tracking-[0.2em]">NO DATA YET!</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/5 border-t py-4 px-6">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">
              <strong>Strategic Perspective:</strong> Bubble size indicates total <strong>Magnitude (L x C)</strong>.
              Entries in the top-right quadrant (High Likelihood & High Consequence) represent critical threats to
              university operations or accreditation status. These should be prioritize for immediate treatment funding
              or administrative oversight.
            </p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
