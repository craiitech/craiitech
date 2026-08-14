'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { Chart3DDefs } from '@/components/ui/chart-3d-defs';
import { Skeleton } from '@/components/ui/skeleton';
import type { KpiSnapshot } from '@/lib/types';
import { KPI_STATUS_COLORS } from '@/lib/constants';

interface KpiTrendChartProps {
  title: string;
  description?: string;
  data: KpiSnapshot[];
  target?: number;
  isLoading?: boolean;
  height?: number;
}

export function KpiTrendChart({ title, description, data, target, isLoading, height = 300 }: KpiTrendChartProps) {
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
        const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
        return tA - tB;
      })
      .map((snap) => ({
        period: snap.period,
        value: snap.value,
        target: target || snap.target,
        status: snap.status,
      }));
  }, [data, target]);

  if (isLoading) {
    return <Skeleton className={`h-[${height}px] w-full`} />;
  }

  const lineColor =
    chartData.length > 0
      ? chartData[chartData.length - 1].status === 'good'
        ? '#10b981'
        : chartData[chartData.length - 1].status === 'satisfactory'
          ? '#f59e0b'
          : '#ef4444'
      : '#94a3b8';

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all border-primary/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
      {/* 3D SVG GRADIENTS & DEPTH FILTERS */}
      <Chart3DDefs idPrefix="kpitrend3d" />

      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-tight">{title} (3D)</CardTitle>
        {description && <CardDescription className="text-[10px] font-bold">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis dataKey="period" tick={{ fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 10, fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
              formatter={(value: number) => [`${Math.round(value)}%`, 'Value']}
            />
            {target !== undefined && (
              <ReferenceLine
                y={target}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Target: ${target}%`,
                  position: 'right',
                  fontSize: 10,
                  fill: '#f59e0b',
                  fontWeight: 700,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={3}
              fill={`url(#gradient-${title.replace(/\s+/g, '-')})`}
              filter="url(#kpitrend3d-soft-depth)"
              dot={{ r: 5, fill: lineColor, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7 }}
            >
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v: any) => `${Math.round(Number(v))}%`}
                style={{ fontSize: '10px', fontWeight: '900', fill: lineColor }}
              />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
