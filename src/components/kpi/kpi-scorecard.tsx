'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KPI_STATUS_COLORS } from '@/lib/constants';
import type { KpiSnapshot } from '@/lib/types';

interface KpiScorecardProps {
  name: string;
  value: number;
  target: number;
  unit?: string;
  status: 'good' | 'satisfactory' | 'poor';
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}

export function KpiScorecard({ name, value, target, unit = '%', status, trend, description }: KpiScorecardProps) {
  const bgColor = KPI_STATUS_COLORS[status] || KPI_STATUS_COLORS.satisfactory;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400';

  return (
    <Card className="shadow-md border-primary/10 overflow-hidden group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-tight max-w-[70%]">
            {name}
          </p>
          {trend && (
            <div className={cn('flex items-center gap-1 text-xs font-bold', trendColor)}>
              <TrendIcon className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-black tracking-tight">{value}</span>
            <span className="text-sm font-bold text-muted-foreground ml-1">{unit}</span>
          </div>
          <div className={cn('text-[10px] font-black px-2 py-1 rounded-full border', bgColor)}>
            {status === 'good' ? 'On Track' : status === 'satisfactory' ? 'At Risk' : 'Critical'}
          </div>
        </div>
        <div className="mt-3">
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                status === 'good' ? 'bg-emerald-500' : status === 'satisfactory' ? 'bg-amber-500' : 'bg-rose-500'
              )}
              style={{ width: `${Math.min(value, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] font-bold text-muted-foreground">Target: {target}{unit}</span>
            <span className={cn('text-[9px] font-bold', value >= target ? 'text-emerald-600' : 'text-amber-600')}>
              {value >= target ? 'Met' : `${Math.round(target - value)}${unit} to go`}
            </span>
          </div>
        </div>
        {description && (
          <p className="mt-2 text-[9px] text-muted-foreground leading-relaxed">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function KpiScorecardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {children}
    </div>
  );
}
