'use client';

import React from 'react';
import { Hash, Gauge, Percent, Star, Scale, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CardAnalyticsStripProps {
  number?: string | number;
  index?: string | number;
  percentage?: string | number;
  rating?: string;
  ratio?: string;
  ranking?: string | number;
  className?: string;
  variant?: 'badges' | 'grid' | 'mini-grid';
  isDarkCard?: boolean;
}

export function CardAnalyticsStrip({
  number,
  index,
  percentage,
  rating,
  ratio,
  ranking,
  className,
  variant = 'badges',
  isDarkCard = false,
}: CardAnalyticsStripProps) {
  if (
    number === undefined &&
    index === undefined &&
    percentage === undefined &&
    rating === undefined &&
    ratio === undefined &&
    ranking === undefined
  ) {
    return null;
  }

  const items = [
    number !== undefined && {
      key: 'number',
      label: 'Number',
      value: number,
      icon: Hash,
      color: isDarkCard
        ? 'bg-white/10 text-white border-white/20'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
    },
    index !== undefined && {
      key: 'index',
      label: 'Index',
      value: index,
      icon: Gauge,
      color: isDarkCard
        ? 'bg-indigo-400/20 text-indigo-200 border-indigo-400/30'
        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    },
    percentage !== undefined && {
      key: 'percentage',
      label: 'Percentage',
      value:
        typeof percentage === 'number'
          ? `${percentage}%`
          : percentage.toString().includes('%')
            ? percentage
            : `${percentage}%`,
      icon: Percent,
      color: isDarkCard
        ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30'
        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    rating !== undefined && {
      key: 'rating',
      label: 'Rating',
      value: rating,
      icon: Star,
      color: isDarkCard
        ? 'bg-amber-400/20 text-amber-200 border-amber-400/30'
        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    ratio !== undefined && {
      key: 'ratio',
      label: 'Ratio',
      value: ratio,
      icon: Scale,
      color: isDarkCard
        ? 'bg-sky-400/20 text-sky-200 border-sky-400/30'
        : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    },
    ranking !== undefined && {
      key: 'ranking',
      label: 'Ranking',
      value: typeof ranking === 'number' ? `#${ranking}` : ranking.toString().startsWith('#') ? ranking : `#${ranking}`,
      icon: Trophy,
      color: isDarkCard
        ? 'bg-purple-400/20 text-purple-200 border-purple-400/30'
        : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    },
  ].filter(Boolean) as {
    key: string;
    label: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }[];

  if (variant === 'mini-grid') {
    return (
      <div
        className={cn(
          'grid grid-cols-3 sm:grid-cols-6 gap-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[8px]',
          className,
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={cn('flex flex-col p-1 rounded-md border text-center transition-all', item.color)}
            >
              <div className="flex items-center justify-center gap-0.5 text-[7px] font-black uppercase tracking-tighter opacity-75">
                <Icon className="w-2 h-2" />
                <span>{item.label}</span>
              </div>
              <span className="font-black truncate text-[9px] mt-0.5">{item.value}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div
        className={cn(
          'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2.5 border-t border-muted/30',
          className,
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={cn('flex flex-col p-2 rounded-xl border text-center transition-all', item.color)}
            >
              <div className="flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-wider opacity-80 mb-0.5">
                <Icon className="w-2.5 h-2.5" />
                <span>{item.label}</span>
              </div>
              <span className="text-xs font-black truncate">{item.value}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 pt-2 border-t',
        isDarkCard ? 'border-white/10' : 'border-slate-100 dark:border-slate-800',
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold tracking-tight',
              item.color,
            )}
            title={`${item.label}: ${item.value}`}
          >
            <Icon className="w-2.5 h-2.5 shrink-0 opacity-70" />
            <span className="opacity-75 uppercase text-[7.5px] font-black">{item.label}:</span>
            <span className="font-black">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}
