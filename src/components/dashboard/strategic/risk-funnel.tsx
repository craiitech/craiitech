'use client';

import { useMemo } from 'react';
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Risk } from '@/lib/types';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { LayoutList, Info, Activity } from 'lucide-react';

import { Chart3DDefs } from '@/components/ui/chart-3d-defs';

interface RiskFunnelProps {
  allRisks: Risk[] | null;
  selectedYear: number;
}

export function RiskFunnel({ allRisks, selectedYear }: RiskFunnelProps) {
  const funnelData = useMemo(() => {
    if (!allRisks) return [];

    const yearRisks = allRisks.filter((r) => Number(r.year) === Number(selectedYear));

    const highRiskOpen = yearRisks.filter((r) => r.preTreatment.rating === 'High' && r.status === 'Open').length;
    const mediumRiskOpen = yearRisks.filter((r) => r.preTreatment.rating === 'Medium' && r.status === 'Open').length;
    const inProgress = yearRisks.filter((r) => r.status === 'In Progress').length;
    const closed = yearRisks.filter((r) => r.status === 'Closed').length;

    return [
      { value: highRiskOpen, name: 'High-Risk (Analysis)', fill: 'url(#funnel3d-grad-rose)' },
      { value: mediumRiskOpen, name: 'Medium-Risk (Analysis)', fill: 'url(#funnel3d-grad-amber)' },
      { value: inProgress, name: 'Treatment Execution', fill: 'url(#funnel3d-grad-indigo)' },
      { value: closed, name: 'Mitigated / Closed', fill: 'url(#funnel3d-grad-emerald)' },
    ];
  }, [allRisks, selectedYear]);

  const hasData = useMemo(() => funnelData.some((d) => d.value > 0), [funnelData]);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl border-primary/10 overflow-hidden bg-gradient-to-b from-white to-slate-50/40 dark:from-slate-900 dark:to-slate-850">
      {/* 3D SVG GRADIENTS & DEPTH FILTERS */}
      <Chart3DDefs idPrefix="funnel3d" />

      <CardHeader className="bg-muted/10 border-b py-4">
        <div className="flex items-center gap-2">
          <LayoutList className="h-5 w-5 text-indigo-600" />
          <CardTitle className="text-sm font-black uppercase tracking-tight">
            Institutional Risk Treatment Funnel (3D)
          </CardTitle>
        </div>
        <CardDescription className="text-xs font-medium">
          Processing lifecycle of identified identifying factors for AY {selectedYear}.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {hasData ? (
          <ChartContainer config={{}} className="h-[300px] w-full">
            <ResponsiveContainer>
              <FunnelChart>
                <Tooltip content={<ChartTooltipContent />} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive filter="url(#funnel3d-soft-depth)">
                  <LabelList
                    position="right"
                    fill="#000"
                    stroke="none"
                    dataKey="name"
                    style={{ fontSize: '10px', fontWeight: 'bold' }}
                  />
                </Funnel>
              </FunnelChart>
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
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">
              <strong>Process Guide:</strong> Visualizes the conversion of threats into controlled factors. A healthy
              funnel shows a strong movement of items from the top (Analysis) into the "Mitigated / Closed" stage. Items
              stuck in "Treatment Execution" for long periods may indicate a lack of resources or ineffective mitigation
              plans.
            </p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
