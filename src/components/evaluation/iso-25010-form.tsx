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
  DialogFooter
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { iso25010Categories } from '@/lib/iso-25010-data';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const STORAGE_KEY = 'rsu_iso25010_draft';

interface Iso25010FormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const formSchema = z.object({
  scores: z.record(z.string(), z.coerce.number().min(1, 'Please select a rating.')),
  generalComments: z.string().optional(),
  recommendations: z.string().optional(),
});

const LIKERT_OPTIONS = [
    { value: 1, label: 'Poor', color: 'text-rose-600', bg: 'bg-rose-50' },
    { value: 2, label: 'Fair', color: 'text-orange-600', bg: 'bg-orange-50' },
    { value: 3, label: 'Satisfactory', color: 'text-amber-600', bg: 'bg-amber-50' },
    { value: 4, label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' },
    { value: 5, label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

const allSubCharacteristics = iso25010Categories.flatMap(c => c.subCharacteristics);
const totalItemCount = allSubCharacteristics.length;

export function Iso25010Form({ isOpen, onOpenChange, onSuccess }: Iso25010FormProps) {
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.scores && typeof parsed.scores === 'object') {
          const sanitizedScores: Record<string, number> = {};
          for (const [key, val] of Object.entries(parsed.scores)) {
            const num = typeof val === 'number' ? val : parseInt(String(val));
            if (!isNaN(num)) {
              sanitizedScores[key] = num;
            }
          }
          parsed.scores = sanitizedScores;
          form.reset(parsed);
        }
      }
    } catch {}
  }, [form]);

  // Auto-save scores to sessionStorage on every change
  const watchedScores = form.watch('scores');
  const watchedComments = form.watch('generalComments');
  const watchedRecs = form.watch('recommendations');
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        scores: watchedScores,
        generalComments: watchedComments,
        recommendations: watchedRecs,
      }));
    } catch {}
  }, [watchedScores, watchedComments, watchedRecs]);

  // Scroll viewport to top when dialog opens
  useEffect(() => {
    if (isOpen && scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  const answeredCount = allSubCharacteristics.filter(
    sub => {
      const val = watchedScores?.[sub.id] as any;
      return val !== undefined && val !== null && val !== '';
    }
  ).length;

  const allComplete = answeredCount === totalItemCount;

  const validateAll = () => {
    const missing: { category: string; name: string }[] = [];
    for (const cat of iso25010Categories) {
      for (const sub of cat.subCharacteristics) {
        const val = form.getValues(`scores.${sub.id}`) as any;
        if (val === undefined || val === null || val === '') {
          missing.push({ category: cat.name, name: sub.name });
        } else {
          const num = typeof val === 'number' ? val : parseInt(String(val));
          if (isNaN(num) || num < 1) {
            missing.push({ category: cat.name, name: sub.name });
          }
        }
      }
    }
    return missing;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const missing = validateAll();
    if (missing.length > 0) {
        toast({
            variant: "destructive",
            title: "Assessment Incomplete",
            description: `Please evaluate ${missing.length} item(s) before submitting.`,
        });
        return;
    }
    if (!firestore) return;
    
    setIsSubmitting(true);

    const scoreEntries = Object.values(values.scores);
    const overallScore = scoreEntries.length > 0 
        ? scoreEntries.reduce((a, b) => a + b, 0) / scoreEntries.length
        : 0;

    const displayName = userProfile 
        ? `${userProfile.firstName} ${userProfile.lastName}` 
        : (user ? 'Authenticated User' : 'Public Stakeholder');

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
      toast({ title: 'Evaluation Submitted', description: 'Thank you! The software quality audit has been securely recorded.' });
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast({ title: 'Submission Failed', description: 'There was a network error. Please try again.', variant: 'destructive' });
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
        <DialogHeader className="p-4 sm:p-6 border-b bg-slate-50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary mb-0.5">
                    <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Institutional Quality Audit</span>
                </div>
                <DialogTitle className="text-base sm:text-xl font-bold">ISO/IEC 25010 Software Quality Assessment</DialogTitle>
                <DialogDescription className="text-[10px] sm:text-xs font-bold flex items-center gap-1.5">
                    <span className={cn(allComplete ? "text-emerald-600" : "text-amber-600")}>
                        {answeredCount} of {totalItemCount} quality criteria evaluated
                    </span>
                    {allComplete && <span className="text-emerald-600">&bull; All categories complete</span>}
                </DialogDescription>
            </div>
            <div className="hidden sm:flex gap-2 items-center">
                 <Badge variant="outline" className="h-6 font-black bg-white border-primary/20 text-primary">AY 2025</Badge>
                 <Badge 
                   variant={allComplete ? "default" : "secondary"} 
                   className={cn(
                     "h-6 font-black uppercase text-[9px] transition-colors duration-200 min-w-[70px] text-center",
                     allComplete ? "bg-emerald-600 text-white hover:bg-emerald-600" : ""
                   )}
                 >
                     {allComplete ? "Complete" : `${answeredCount}/${totalItemCount}`}
                 </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
              <ScrollArea ref={scrollAreaRef} className="flex-1" type="always">
                <div className="p-4 sm:p-8 space-y-10 pb-24">
                  {iso25010Categories.map((cat) => {
                    const catAnswered = cat.subCharacteristics.filter(
                      sub => {
                        const val = watchedScores?.[sub.id] as any;
                        return val !== undefined && val !== null && val !== '';
                      }
                    ).length;
                    const catComplete = catAnswered === cat.subCharacteristics.length;

                    return (
                      <div key={cat.id} className="space-y-6">
                        <div className="flex items-center justify-between gap-4">
                          <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner space-y-1 flex-1">
                            <h3 className="font-black text-primary text-[11px] sm:text-sm uppercase tracking-wider">{cat.name}</h3>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium italic">"{cat.description}"</p>
                          </div>
                          <Badge 
                            variant={catComplete ? "default" : "outline"} 
                            className={cn(
                              "h-7 px-3 font-black uppercase text-[9px] shrink-0 transition-colors min-w-[70px] text-center",
                              catComplete ? "bg-emerald-600 text-white hover:bg-emerald-600 border-none" : "border-slate-300 text-slate-500"
                            )}
                          >
                            {catComplete ? 'Complete' : `${catAnswered}/${cat.subCharacteristics.length}`}
                          </Badge>
                        </div>

                        <div className="space-y-6">
                          {cat.subCharacteristics.map((sub) => (
                            <FormField
                              key={sub.id}
                              control={form.control}
                              name={`scores.${sub.id}`}
                              render={({ field }) => (
                                <FormItem className="space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                      <div className="space-y-1 flex-1">
                                          <FormLabel className="text-sm sm:text-base font-black text-slate-800 tracking-tight">{sub.name}</FormLabel>
                                          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-2xl">{sub.desc}</p>
                                      </div>
                                      <div className="h-6 w-[90px] shrink-0 text-center">
                                          <Badge className={cn("h-6 px-4 font-black uppercase border-none text-[10px] w-full transition-colors duration-200", field.value ? cn(LIKERT_OPTIONS.find(o => o.value === field.value)?.bg, LIKERT_OPTIONS.find(o => o.value === field.value)?.color) : "invisible bg-slate-100 text-slate-400")}>
                                              {field.value ? LIKERT_OPTIONS.find(o => o.value === field.value)?.label : '--'}
                                          </Badge>
                                      </div>
                                  </div>
                                  
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={(val) => field.onChange(parseInt(val))}
                                      value={String(field.value ?? '')}
                                      className="grid grid-cols-1 sm:grid-cols-5 gap-2"
                                    >
                                      {LIKERT_OPTIONS.map((opt) => {
                                          const radioId = `${sub.id}-${opt.value}`;
                                          return (
                                          <FormItem key={opt.value} className="flex flex-col items-center">
                                              <FormControl>
                                                  <RadioGroupItem value={String(opt.value)} id={radioId} tabIndex={-1} className="sr-only m-0" />
                                              </FormControl>
                                              <Label
                                                  onClick={() => document.getElementById(radioId)?.click()}
                                                  className={cn(
                                                      "w-full flex flex-row sm:flex-col items-center justify-center gap-2 p-2 sm:p-3 rounded-2xl border-2 cursor-pointer transition-all hover:bg-slate-50",
                                                      field.value === opt.value 
                                                          ? cn("border-primary shadow-lg ring-1 ring-primary/20", opt.bg) 
                                                          : "border-slate-100 bg-white opacity-60 hover:opacity-100"
                                                  )}
                                              >
                                                  <span className={cn("text-lg font-black tabular-nums", field.value === opt.value ? "text-primary" : "text-slate-400")}>{opt.value}</span>
                                                  <span className={cn("text-[9px] font-black uppercase tracking-widest", field.value === opt.value ? "text-primary" : "text-slate-500")}>{opt.label}</span>
                                              </Label>
                                          </FormItem>
                                          );
                                      })}
                                    </RadioGroup>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <div className="space-y-6 sm:space-y-8 pt-8 border-t mt-8">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div>
                          <h3 className="font-black text-base sm:text-lg text-slate-900 uppercase tracking-tight">Final Auditor Comments</h3>
                          <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Concluding Remarks for the System Maturity Report.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="generalComments"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500">General Experience Remarks</FormLabel>
                              <FormControl>
                              <Textarea {...field} placeholder="Summarize your overall interaction with the portal..." rows={5} className="bg-slate-50 border-slate-200 shadow-inner text-xs" />
                              </FormControl>
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="recommendations"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500">Technical Suggestions</FormLabel>
                              <FormControl>
                              <Textarea {...field} placeholder="What improvements or new modules would you like to see?" rows={5} className="bg-slate-50 border-slate-200 shadow-inner text-xs" />
                              </FormControl>
                          </FormItem>
                          )}
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="p-4 sm:p-6 border-t bg-slate-50 shrink-0 shadow-inner">
                <div className="flex w-full items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="font-bold text-[9px] sm:text-[10px] uppercase tracking-widest h-9 sm:h-10 px-4 sm:px-6 text-muted-foreground hover:text-rose-600"
                  >
                    Abort
                  </Button>

                  <Button type="submit" disabled={isSubmitting} className="font-black text-[10px] sm:text-xs uppercase tracking-widest px-6 sm:px-10 h-9 sm:h-11 shadow-xl shadow-primary/30">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
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
