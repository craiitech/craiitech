'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import type { KpiSnapshot, KpiDefinition, Unit } from '@/lib/types';

interface KpiHeatmapProps {
  units: Unit[];
  definitions: KpiDefinition[];
  snapshots: KpiSnapshot[];
  selectedYear: number;
  title?: string;
}

export function KpiHeatmap({ units, definitions, snapshots, selectedYear, title = 'Unit KPI Heatmap' }: KpiHeatmapProps) {
  const heatmapData = useMemo(() => {
    const activeDefs = definitions.filter(d => d.isActive);
    return units.map(unit => {
      const unitSnaps = snapshots.filter(s => s.entityId === unit.id);
      const kpiValues = activeDefs.map(def => {
        const snap = unitSnaps.find(s => s.kpiId === def.id);
        return {
          kpiId: def.id,
          kpiName: def.name,
          value: snap?.value ?? null,
          status: snap?.status ?? null,
        };
      });
      return { unitId: unit.id, unitName: unit.name, kpis: kpiValues };
    }).sort((a, b) => a.unitName.localeCompare(b.unitName));
  }, [units, definitions, snapshots]);

  const activeDefs = definitions.filter(d => d.isActive);

  return (
    <Card className="shadow-md border-primary/10 overflow-hidden">
      <CardHeader className="bg-muted/30 border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
              Performance overview across units for {selectedYear}.
            </CardDescription>
          </div>
          <div className="flex gap-3 text-[8px] font-black uppercase tracking-tighter">
            <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Good</div>
            <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-amber-500" /> At Risk</div>
            <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-rose-500" /> Poor</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full h-[500px]">
          <div className="p-4">
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="text-left text-[9px] font-black uppercase text-muted-foreground p-1 min-w-[150px] sticky top-0 bg-white dark:bg-slate-900 z-10">Unit / Office</th>
                  {activeDefs.map(def => (
                    <th key={def.id} className="text-center p-1 sticky top-0 bg-white dark:bg-slate-900 z-10">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="h-5 text-[8px] font-black border border-primary/20 bg-primary/5 text-primary px-1.5 rounded uppercase tracking-tighter max-w-[60px] truncate">
                              {def.name.slice(0, 8)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-[10px] font-bold">{def.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map(unit => (
                  <tr key={unit.unitId} className="group">
                    <td className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px] p-1 group-hover:text-primary transition-colors">
                      {unit.unitName}
                    </td>
                    {unit.kpis.map((kpi, idx) => (
                      <td key={idx} className="p-0.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div
                                className={cn(
                                  'h-8 w-full rounded border flex items-center justify-center transition-all group-hover:scale-105',
                                  kpi.status === 'good' ? 'bg-emerald-50 border-emerald-200' :
                                  kpi.status === 'satisfactory' ? 'bg-amber-50 border-amber-200' :
                                  kpi.status === 'poor' ? 'bg-rose-50 border-rose-200' :
                                  'bg-white border-slate-100 dark:border-slate-700'
                                )}
                              >
                                <span className={cn(
                                  'text-[10px] font-black',
                                  kpi.status === 'good' ? 'text-emerald-700' :
                                  kpi.status === 'satisfactory' ? 'text-amber-700' :
                                  kpi.status === 'poor' ? 'text-rose-700' :
                                  'text-slate-300'
                                )}>
                                  {kpi.value !== null ? `${Math.round(kpi.value)}%` : '—'}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-[10px] font-bold">{kpi.kpiName}</p>
                              <p className="text-[9px] text-muted-foreground">
                                {kpi.value !== null ? `${Math.round(kpi.value)}% — ${kpi.status}` : 'No data'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
