'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { iso25010Categories } from '@/lib/iso-25010-data';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, CheckCircle2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const STORAGE_KEY = 'rsu_iso25010_draft';

interface Iso25010FormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const formSchema = z.object({
  scores: z.record(
    z.string(),
    z.coerce.number().min(1, 'Rating must be at least 1.').max(5, 'Rating must not exceed 5.'),
  ),
  generalComments: z.string().optional(),
  recommendations: z.string().optional(),
});

const LIKERT_OPTIONS = [
  {
    value: 1,
    label: 'Poor',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-300 dark:border-rose-800',
  },
  {
    value: 2,
    label: 'Fair',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-300 dark:border-orange-800',
  },
  {
    value: 3,
    label: 'Satisfactory',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-300 dark:border-amber-800',
  },
  {
    value: 4,
    label: 'Good',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-300 dark:border-blue-800',
  },
  {
    value: 5,
    label: 'Excellent',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-300 dark:border-emerald-800',
  },
];

const allSubCharacteristics = iso25010Categories.flatMap((c) => c.subCharacteristics);
const totalItemCount = allSubCharacteristics.length;

export function Iso25010Form({ isOpen, onOpenChange, onSuccess }: Iso25010FormProps) {
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highlightMissing, setHighlightMissing] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  const scrollAreaRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      scrollViewportRef.current = node.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
    } else {
      scrollViewportRef.current = null;
    }
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scores: {},
      generalComments: '',
      recommendations: '',
    },
  });

  // Restore from sessionStorage on mount or when opening
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.scores && typeof parsed.scores === 'object') {
          const sanitizedScores: Record<string, number> = {};
          for (const [key, val] of Object.entries(parsed.scores)) {
            const num = typeof val === 'number' ? val : parseInt(String(val), 10);
            if (!isNaN(num) && num >= 1 && num <= 5) {
              sanitizedScores[key] = num;
            }
          }
          parsed.scores = sanitizedScores;
          form.reset({
            scores: sanitizedScores,
            generalComments: parsed.generalComments || '',
            recommendations: parsed.recommendations || '',
          });
        }
      }
    } catch {
      // Ignore error loading from sessionStorage
    }
  }, [isOpen, form]);

  // Auto-save scores to sessionStorage on every change
  const watchedScores = form.watch('scores');
  const watchedComments = form.watch('generalComments');
  const watchedRecs = form.watch('recommendations');
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          scores: watchedScores,
          generalComments: watchedComments,
          recommendations: watchedRecs,
        }),
      );
    } catch {
      // Ignore error saving to sessionStorage
    }
  }, [watchedScores, watchedComments, watchedRecs]);

  // Scroll viewport to top when dialog opens
  useEffect(() => {
    if (isOpen && scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  const answeredCount = allSubCharacteristics.filter((sub) => {
    const val = watchedScores?.[sub.id] as any;
    return typeof val === 'number' && val >= 1 && val <= 5;
  }).length;

  const allComplete = answeredCount === totalItemCount;
  const progressPercent = Math.round((answeredCount / totalItemCount) * 100);

  // Quick fill all items in a specific category
  const handleBatchRateCategory = (subIds: string[], score: number) => {
    const currentScores = { ...(form.getValues('scores') || {}) };
    subIds.forEach((id) => {
      currentScores[id] = score;
    });
    form.setValue('scores', currentScores, { shouldDirty: true, shouldValidate: true });
  };

  // Quick fill all remaining items across entire form
  const handleBatchRateAll = (score: number) => {
    const currentScores = { ...(form.getValues('scores') || {}) };
    allSubCharacteristics.forEach((sub) => {
      if (!currentScores[sub.id]) {
        currentScores[sub.id] = score;
      }
    });
    form.setValue('scores', currentScores, { shouldDirty: true, shouldValidate: true });
    toast({
      title: `Rated Remaining Items as ${score === 5 ? 'Excellent (5)' : score === 4 ? 'Good (4)' : score}`,
      description: 'You can still adjust individual ratings as needed before submitting.',
    });
  };

  const validateAll = () => {
    const missing: { id: string; category: string; name: string }[] = [];
    for (const cat of iso25010Categories) {
      for (const sub of cat.subCharacteristics) {
        const val = form.getValues(`scores.${sub.id}`) as any;
        const num = typeof val === 'number' ? val : parseInt(String(val), 10);
        if (isNaN(num) || num < 1 || num > 5) {
          missing.push({ id: sub.id, category: cat.name, name: sub.name });
        }
      }
    }
    return missing;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const missing = validateAll();
    if (missing.length > 0) {
      setHighlightMissing(true);
      const firstMissing = missing[0];
      const elem = document.getElementById(`subchar-item-${firstMissing.id}`);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast({
        variant: 'destructive',
        title: 'Assessment Incomplete',
        description: `Please evaluate ${missing.length} item(s) before submitting (e.g., "${firstMissing.name}").`,
      });
      return;
    }
    if (!firestore) return;

    setIsSubmitting(true);

    const scoreEntries = Object.values(values.scores);
    const overallScore = scoreEntries.length > 0 ? scoreEntries.reduce((a, b) => a + b, 0) / scoreEntries.length : 0;

    const displayName = userProfile
      ? `${userProfile.firstName} ${userProfile.lastName}`
      : user
        ? 'Authenticated User'
        : 'Public Stakeholder';

    const evaluationData = {
      userId: user?.uid || 'guest',
      userName: displayName,
      timestamp: serverTimestamp(),
      scores: values.scores,
      overallScore,
      generalComments: values.generalComments || '',
      recommendations: values.recommendations || '',
    };

    try {
      await addDoc(collection(firestore, 'softwareEvaluations'), evaluationData);
      sessionStorage.removeItem(STORAGE_KEY);
      toast({
        title: 'Evaluation Submitted Successfully',
        description: 'Thank you! Your ISO/IEC 25010 Software Quality Assessment has been securely recorded.',
      });
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error submitting software evaluation:', error);
      toast({
        title: 'Submission Failed',
        description: 'There was a network or server error. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl h-[95dvh] flex flex-col p-0 overflow-hidden shadow-2xl border-none"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 sm:p-6 border-b bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary mb-0.5">
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                  Institutional Quality Audit
                </span>
              </div>
              <DialogTitle className="text-base sm:text-xl font-bold">
                ISO/IEC 25010 Software Quality Assessment
              </DialogTitle>
              <DialogDescription className="text-[10px] sm:text-xs font-bold flex items-center gap-1.5">
                <span className={cn(allComplete ? 'text-emerald-600' : 'text-amber-600')}>
                  {answeredCount} of {totalItemCount} quality criteria evaluated ({progressPercent}%)
                </span>
                {allComplete && <span className="text-emerald-600">&bull; All categories complete</span>}
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!allComplete && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchRateAll(5)}
                    className="h-7 text-[9px] font-black uppercase tracking-wider px-2.5 bg-white dark:bg-slate-800 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Fill All 5 (Excellent)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchRateAll(4)}
                    className="h-7 text-[9px] font-black uppercase tracking-wider px-2.5 bg-white dark:bg-slate-800 text-blue-700 border-blue-300 hover:bg-blue-50"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Fill All 4 (Good)
                  </Button>
                </div>
              )}
              <Badge
                variant={allComplete ? 'default' : 'secondary'}
                className={cn(
                  'h-7 font-black uppercase text-[9px] transition-colors duration-200 min-w-[80px] text-center justify-center',
                  allComplete ? 'bg-emerald-600 text-white hover:bg-emerald-600' : '',
                )}
              >
                {allComplete ? 'Complete' : `${answeredCount}/${totalItemCount}`}
              </Badge>
            </div>
          </div>
          <div className="mt-3">
            <Progress value={progressPercent} className="h-1.5 bg-slate-200 dark:bg-slate-700" />
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white dark:bg-slate-900">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
              <ScrollArea ref={scrollAreaRef} className="flex-1" type="always">
                <div className="p-4 sm:p-8 space-y-10 pb-24">
                  {iso25010Categories.map((cat) => {
                    const catSubIds = cat.subCharacteristics.map((s) => s.id);
                    const catAnswered = cat.subCharacteristics.filter((sub) => {
                      const val = watchedScores?.[sub.id] as any;
                      return typeof val === 'number' && val >= 1 && val <= 5;
                    }).length;
                    const catComplete = catAnswered === cat.subCharacteristics.length;

                    return (
                      <div key={cat.id} className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner">
                          <div className="space-y-1 flex-1">
                            <h3 className="font-black text-primary text-[11px] sm:text-sm uppercase tracking-wider">
                              {cat.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">
                              "{cat.description}"
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-bold text-slate-500 uppercase">Rate all:</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBatchRateCategory(catSubIds, 5)}
                                className="h-6 px-2 text-[8px] font-black uppercase text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                              >
                                5
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBatchRateCategory(catSubIds, 4)}
                                className="h-6 px-2 text-[8px] font-black uppercase text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                              >
                                4
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBatchRateCategory(catSubIds, 3)}
                                className="h-6 px-2 text-[8px] font-black uppercase text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg"
                              >
                                3
                              </Button>
                            </div>
                            <Badge
                              variant={catComplete ? 'default' : 'outline'}
                              className={cn(
                                'h-7 px-3 font-black uppercase text-[9px] shrink-0 transition-colors min-w-[70px] text-center justify-center',
                                catComplete
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-600 border-none'
                                  : 'border-slate-300 text-slate-500',
                              )}
                            >
                              {catComplete ? 'Complete' : `${catAnswered}/${cat.subCharacteristics.length}`}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {cat.subCharacteristics.map((sub) => (
                            <FormField
                              key={sub.id}
                              control={form.control}
                              name={`scores.${sub.id}`}
                              render={({ field }) => {
                                const isUnanswered = typeof field.value !== 'number' || field.value < 1;
                                const isMissingError = highlightMissing && isUnanswered;

                                return (
                                  <FormItem
                                    id={`subchar-item-${sub.id}`}
                                    className={cn(
                                      'space-y-3 p-4 rounded-2xl transition-all border',
                                      isMissingError
                                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 ring-2 ring-rose-400/20'
                                        : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700',
                                    )}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                      <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                          <FormLabel className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 tracking-tight cursor-default">
                                            {sub.name}
                                          </FormLabel>
                                          {isMissingError && (
                                            <Badge
                                              variant="destructive"
                                              className="h-5 text-[8px] font-black uppercase"
                                            >
                                              Required
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-2xl">
                                          {sub.desc}
                                        </p>
                                      </div>
                                      <div className="h-6 w-[100px] shrink-0 text-center">
                                        <Badge
                                          className={cn(
                                            'h-6 px-3 font-black uppercase border-none text-[10px] w-full transition-colors duration-200 justify-center',
                                            field.value
                                              ? cn(
                                                  LIKERT_OPTIONS.find((o) => o.value === field.value)?.bg,
                                                  LIKERT_OPTIONS.find((o) => o.value === field.value)?.color,
                                                )
                                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400',
                                          )}
                                        >
                                          {field.value
                                            ? LIKERT_OPTIONS.find((o) => o.value === field.value)?.label
                                            : 'Not Rated'}
                                        </Badge>
                                      </div>
                                    </div>

                                    <FormControl>
                                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                                        {LIKERT_OPTIONS.map((opt) => {
                                          const isSelected = field.value === opt.value;
                                          return (
                                            <button
                                              key={opt.value}
                                              type="button"
                                              onClick={() => field.onChange(opt.value)}
                                              className={cn(
                                                'w-full flex flex-row sm:flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-2xl border-2 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-95 text-left sm:text-center',
                                                isSelected
                                                  ? cn(
                                                      'border-primary shadow-md ring-2 ring-primary/20 scale-[1.02]',
                                                      opt.bg,
                                                    )
                                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 opacity-75 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-600',
                                              )}
                                            >
                                              <span
                                                className={cn(
                                                  'text-base sm:text-lg font-black tabular-nums',
                                                  isSelected ? 'text-primary' : 'text-slate-500 dark:text-slate-400',
                                                )}
                                              >
                                                {opt.value}
                                              </span>
                                              <span
                                                className={cn(
                                                  'text-[9px] sm:text-[10px] font-black uppercase tracking-widest',
                                                  isSelected
                                                    ? cn('font-extrabold', opt.color)
                                                    : 'text-slate-600 dark:text-slate-400',
                                                )}
                                              >
                                                {opt.label}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <div className="space-y-6 sm:space-y-8 pt-8 border-t mt-8">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                          Final Auditor Comments
                        </h3>
                        <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          Optional Concluding Remarks for the System Maturity Report.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="generalComments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500">
                              General Experience Remarks
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Summarize your overall interaction with the portal..."
                                rows={4}
                                className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-inner text-xs"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="recommendations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500">
                              Technical Suggestions
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="What improvements or new modules would you like to see?"
                                rows={4}
                                className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-inner text-xs"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="p-4 sm:p-6 border-t bg-slate-50 dark:bg-slate-800/50 shrink-0 shadow-inner">
                <div className="flex w-full items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="font-bold text-[9px] sm:text-[10px] uppercase tracking-widest h-9 sm:h-10 px-4 sm:px-6 text-muted-foreground hover:text-rose-600"
                  >
                    Abort
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="font-black text-[10px] sm:text-xs uppercase tracking-widest px-6 sm:px-10 h-9 sm:h-11 shadow-xl shadow-primary/30"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    {allComplete ? 'Finalize Report' : `Submit (${answeredCount}/${totalItemCount})`}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
