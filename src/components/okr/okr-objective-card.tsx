'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Target, ChevronRight } from 'lucide-react';
import type { OkrObjective, OkrKeyResult } from '@/lib/types';

interface OkrObjectiveCardProps {
  objective: OkrObjective;
  keyResults: OkrKeyResult[];
  onCheckIn?: (objectiveId: string) => void;
  onClick?: (objectiveId: string) => void;
}

export function OkrObjectiveCard({ objective, keyResults, onCheckIn, onClick }: OkrObjectiveCardProps) {
  const progress = keyResults.length > 0
    ? Math.round(keyResults.reduce((sum, kr) => {
        const krProgress = kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0;
        return sum + Math.min(krProgress, 100) * (kr.weight || 1);
      }, 0) / keyResults.reduce((sum, kr) => sum + (kr.weight || 1), 0))
    : 0;

  const confidence = objective.confidenceScore ?? 50;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
      case 'draft': return 'bg-slate-500/10 text-slate-700 border-slate-200';
      case 'completed': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'archived': return 'bg-rose-500/10 text-rose-700 border-rose-200';
      default: return 'bg-slate-500/10 text-slate-700 border-slate-200';
    }
  };

  return (
    <Card
      className={cn(
        'shadow-md border-primary/10 overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
        objective.status === 'completed' && 'opacity-75'
      )}
      onClick={() => onClick?.(objective.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <Badge variant="outline" className={cn('text-[9px] font-black uppercase', getStatusColor(objective.status))}>
              {objective.status}
            </Badge>
          </div>
          <span className="text-[9px] font-black text-muted-foreground">
            Q{objective.quarter} • {objective.entityType}
          </span>
        </div>
        <CardTitle className="text-sm font-black mt-2 leading-snug">{objective.title}</CardTitle>
        {objective.description && (
          <CardDescription className="text-[10px] mt-1">{objective.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-muted-foreground">Progress</span>
            <span className={cn('font-black', progress >= 80 ? 'text-emerald-600' : progress >= 50 ? 'text-amber-600' : 'text-rose-600')}>
              {progress}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {keyResults.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {keyResults.slice(0, 3).map(kr => {
              const krProgress = kr.targetValue > 0 ? Math.min((kr.currentValue / kr.targetValue) * 100, 100) : 0;
              return (
                <div key={kr.id} className="flex items-center justify-between text-[9px]">
                  <span className="font-bold text-muted-foreground truncate max-w-[60%]">{kr.title}</span>
                  <span className="font-black">
                    {kr.currentValue}/{kr.targetValue} {kr.unit}
                  </span>
                </div>
              );
            })}
            {keyResults.length > 3 && (
              <p className="text-[8px] font-bold text-muted-foreground text-right">+{keyResults.length - 3} more</p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 border-t border-dashed border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between w-full pt-2">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              'h-1.5 w-1.5 rounded-full',
              confidence >= 70 ? 'bg-emerald-500' : confidence >= 40 ? 'bg-amber-500' : 'bg-rose-500'
            )} />
            <span className="text-[8px] font-bold text-muted-foreground">
              Confidence: {confidence}%
            </span>
          </div>
          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardFooter>
    </Card>
  );
}
