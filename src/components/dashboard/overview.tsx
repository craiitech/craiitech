'use client';

import { useMemo, useState, useEffect } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, LabelList, CartesianGrid } from 'recharts';
import { format, subMonths } from 'date-fns';
import type { Submission } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartTooltipContent, ChartContainer } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Chart3DDefs, RenderBar3DLabel } from '@/components/ui/chart-3d-defs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Sparkles, Layers, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OverviewProps {
  submissions: Submission[] | null;
  isLoading: boolean;
}

const chartConfig = {
  total: {
    label: 'Submissions',
  },
} satisfies ChartConfig;

export function Overview({ submissions, isLoading }: OverviewProps) {
  const [is3DMode, setIs3DMode] = useState(true);
  const [timelineIndex, setTimelineIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fullMonthlyData = useMemo(() => {
    const monthlyData: { [key: string]: { name: string; fullDate: string; total: number } } = {};
    const now = new Date();

    // Initialize the last 12 months with 0 submissions
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(now, i);
      const monthKey = format(month, 'yyyy-MM');
      monthlyData[monthKey] = {
        name: format(month, 'MMM'),
        fullDate: format(month, 'MMMM yyyy'),
        total: 0,
      };
    }

    // Populate with actual submission data
    if (submissions) {
      submissions.forEach((submission) => {
        const submissionDate = new Date(submission.submissionDate);
        if (submissionDate && !isNaN(submissionDate.getTime())) {
          const monthKey = format(submissionDate, 'yyyy-MM');
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].total += 1;
          }
        }
      });
    }

    return Object.values(monthlyData);
  }, [submissions]);

  // 4D timeline animation loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimelineIndex((prev) => {
        if (prev === null) return 0;
        if (prev >= fullMonthlyData.length - 1) return 0;
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [isPlaying, fullMonthlyData.length]);

  const displayData = useMemo(() => {
    if (timelineIndex === null) {
      return fullMonthlyData.map((d) => ({
        ...d,
        isFocused: true,
      }));
    }
    return fullMonthlyData.map((d, i) => ({
      ...d,
      isFocused: i === timelineIndex,
    }));
  }, [fullMonthlyData, timelineIndex]);

  const totalLogged = useMemo(() => {
    return fullMonthlyData.reduce((acc, curr) => acc + curr.total, 0);
  }, [fullMonthlyData]);

  if (isLoading) {
    return <Skeleton className="h-[380px] w-full rounded-2xl" />;
  }

  if (!submissions || submissions.length === 0) {
    return (
      <div className="flex h-[350px] w-full flex-col items-center justify-center text-muted-foreground font-black uppercase tracking-[0.2em] gap-2">
        <Activity className="h-10 w-10 opacity-30 text-indigo-500" />
        NO DATA YET!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 3D SVG GRADIENTS & DEPTH FILTERS */}
      <Chart3DDefs idPrefix="overview3d" />

      {/* 3D & 4D INTERACTIVE CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 text-white rounded-2xl shadow-md">
        <div className="flex items-center gap-2">
          <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" /> 3D/4D Live Motion
          </Badge>
          <span className="text-xs font-bold text-slate-300">
            {timelineIndex === null
              ? `Annual Momentum: ${totalLogged} Submissions`
              : `Focus: ${fullMonthlyData[timelineIndex]?.fullDate} (${fullMonthlyData[timelineIndex]?.total} subs)`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 3D Isometric View Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIs3DMode(!is3DMode)}
            className={cn(
              'h-7 px-2.5 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition-all',
              is3DMode
                ? 'bg-indigo-600/40 border-indigo-400 text-white shadow-md'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20',
            )}
          >
            <Layers className="h-3 w-3" />
            {is3DMode ? '3D View' : '2D View'}
          </Button>

          {/* 4D Temporal Flow Play / Pause */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-7 px-2.5 text-[10px] font-bold rounded-lg bg-white/10 border-white/20 text-white hover:bg-white/20 flex items-center gap-1"
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {isPlaying ? 'Pause 4D' : 'Play 4D Flow'}
          </Button>

          {timelineIndex !== null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsPlaying(false);
                setTimelineIndex(null);
              }}
              className="h-7 px-2 text-[9px] font-bold text-slate-300 hover:text-white"
            >
              <RotateCcw className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      </div>

      <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={displayData} margin={{ top: 25, right: 15, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12} />
            <XAxis dataKey="name" stroke="#888888" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
            <YAxis
              stroke="#888888"
              fontSize={11}
              fontWeight="bold"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 'bold',
              }}
            />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} filter={is3DMode ? 'url(#overview3d-soft-depth)' : undefined}>
              <LabelList content={<RenderBar3DLabel />} />
              {displayData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    is3DMode
                      ? entry.isFocused
                        ? 'url(#overview3d-grad-indigo)'
                        : 'url(#overview3d-grad-sky)'
                      : entry.isFocused
                        ? '#6366f1'
                        : '#94a3b8'
                  }
                  opacity={entry.isFocused ? 1 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
