'use client';

import React, { useRef, useState, useEffect } from 'react';
import type { ManualProcess } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ListChecks, Info, CheckCircle2, Maximize2, Sparkles, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ProcedureManualProcessSliderProps {
  processes?: ManualProcess[];
  numberOfProcesses?: number;
  procedureNumber?: string;
  unitName?: string;
  className?: string;
}

export function ProcedureManualProcessSlider({
  processes = [],
  numberOfProcesses = 0,
  procedureNumber,
  unitName,
  className,
}: ProcedureManualProcessSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<ManualProcess | null>(null);
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);

  // Normalize process list (either explicit array or generated numbers)
  const processList: ManualProcess[] = React.useMemo(() => {
    if (processes && processes.length > 0) {
      return processes;
    }
    if (numberOfProcesses && numberOfProcesses > 0) {
      return Array.from({ length: numberOfProcesses }, (_, i) => ({
        processNumber: `6.${i + 1}`,
        processTitle: `Process ${i + 1}`,
      }));
    }
    return [];
  }, [processes, numberOfProcesses]);

  const checkScrollability = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScrollability();
    const el = scrollContainerRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScrollability);
    window.addEventListener('resize', checkScrollability);

    return () => {
      el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [processList]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.max(el.clientWidth * 0.75, 240);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (processList.length === 0) {
    return (
      <div
        className={cn(
          'bg-slate-50/70 dark:bg-slate-800/40 border border-dashed rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs',
          className,
        )}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <ListChecks className="h-4 w-4 text-primary/60" />
          <span className="text-[11px] font-bold uppercase tracking-wider">
            Operational Processes:{' '}
            <span className="font-normal normal-case italic">
              No discrete processes registered yet for this manual.
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Slider Controls & Counter Header */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-primary">
            <ListChecks className="h-4 w-4 shrink-0" />
            <span className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-200 truncate">
              Standard Operating Processes
            </span>
          </div>
          <Badge
            variant="outline"
            className="h-5 px-2 text-[9px] font-black uppercase border-primary/30 bg-primary/10 text-primary shrink-0"
          >
            {processList.length} {processList.length === 1 ? 'Process' : 'Processes'}
          </Badge>
          {procedureNumber && (
            <Badge
              variant="secondary"
              className="h-5 px-2 font-mono text-[9px] font-bold shrink-0 hidden sm:inline-flex"
            >
              {procedureNumber}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {processList.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary gap-1"
              onClick={() => setIsGridModalOpen(true)}
              title="View all processes in a grid"
            >
              <Maximize2 className="h-3 w-3" />
              <span className="hidden md:inline">View All</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-lg border-primary/20 hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30 shadow-xs"
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            title="Slide left"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-lg border-primary/20 hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30 shadow-xs"
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            title="Slide right"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Horizontal Slider Track */}
      <div className="relative group">
        {/* Soft edge fade indicators */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 pt-0.5 px-0.5 snap-x snap-mandatory scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {processList.map((proc, idx) => {
            const isSelected =
              selectedProcess?.processNumber === proc.processNumber &&
              selectedProcess?.processTitle === proc.processTitle;
            return (
              <button
                key={`${proc.processNumber}-${idx}`}
                type="button"
                onClick={() => setSelectedProcess(isSelected ? null : proc)}
                className={cn(
                  'snap-start shrink-0 min-w-[210px] max-w-[280px] text-left p-2.5 rounded-xl border transition-all duration-200 flex flex-col justify-between select-none relative overflow-hidden group/card shadow-xs cursor-pointer',
                  isSelected
                    ? 'bg-primary/10 border-primary shadow-md ring-2 ring-primary/20 scale-[1.02]'
                    : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 hover:shadow-sm',
                )}
              >
                {/* Step pill and number */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Badge
                    className={cn(
                      'font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded-md transition-colors',
                      isSelected
                        ? 'bg-primary text-white'
                        : 'bg-primary/10 text-primary border border-primary/20 group-hover/card:bg-primary group-hover/card:text-white',
                    )}
                  >
                    {proc.processNumber || `Step ${idx + 1}`}
                  </Badge>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                    #{idx + 1} of {processList.length}
                  </span>
                </div>

                {/* Process title */}
                <p
                  className={cn(
                    'text-xs font-bold leading-snug line-clamp-2 transition-colors',
                    isSelected
                      ? 'text-primary font-black'
                      : 'text-slate-800 dark:text-slate-200 group-hover/card:text-primary',
                  )}
                  title={proc.processTitle}
                >
                  {proc.processTitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Process Expanded Inspector Banner */}
      {selectedProcess && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-1.5 bg-primary text-white rounded-lg shrink-0 mt-0.5">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black text-primary uppercase">
                  {selectedProcess.processNumber}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Active Selected Process
                </span>
              </div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5 leading-relaxed">
                {selectedProcess.processTitle}
              </h5>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] font-bold text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setSelectedProcess(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Full Process List Modal */}
      <Dialog open={isGridModalOpen} onOpenChange={setIsGridModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-2 text-primary">
              <ListChecks className="h-5 w-5" />
              <DialogTitle className="text-base font-black uppercase tracking-tight">
                Operating Processes Directory
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Complete index of standard operating processes registered for{' '}
              <strong className="text-slate-800 dark:text-slate-200">{unitName || 'this Procedure Manual'}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {processList.map((proc, pIdx) => (
                <div
                  key={`modal-${pIdx}`}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/40 transition-all flex items-start gap-3"
                >
                  <Badge className="font-mono text-xs font-black bg-primary/10 text-primary border border-primary/20 shrink-0 mt-0.5">
                    {proc.processNumber || `#${pIdx + 1}`}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {proc.processTitle}
                    </p>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      Process Sequence #{pIdx + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
