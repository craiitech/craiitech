'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { iso25010Categories } from '@/lib/iso-25010-data';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Iso25010FormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const formSchema = z.object({
  scores: z.record(z.string(), z.number().min(1, 'Please select a rating.')),
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

export function Iso25010Form({ isOpen, onOpenChange, onSuccess }: Iso25010FormProps) {
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scores: {},
      generalComments: '',
      recommendations: '',
    },
  });

  const currentCategory = iso25010Categories[currentStep];
  const isLastStep = currentStep === iso25010Categories.length - 1;

  const validateCurrentStep = () => {
    const scores = form.getValues('scores');
    const missing = currentCategory.subCharacteristics.filter(sub => !scores[sub.id]);
    
    if (missing.length > 0) {
        toast({
            variant: "destructive",
            title: "Assessment Incomplete",
            description: `Please evaluate all ${missing.length} items in the "${currentCategory.name}" category before proceeding.`,
        });
        return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
        setCurrentStep(prev => Math.min(iso25010Categories.length - 1, prev + 1));
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!validateCurrentStep()) return;
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
      toast({ title: 'Evaluation Submitted', description: 'Thank you! The software quality audit has been securely recorded.' });
      onSuccess?.();
      onOpenChange(false);
      setCurrentStep(0);
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
      <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-4 sm:p-6 border-b bg-slate-50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary mb-0.5">
                    <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Institutional Quality Audit</span>
                </div>
                <DialogTitle className="text-base sm:text-xl font-bold">ISO/IEC 25010 Software Quality Assessment</DialogTitle>
                <DialogDescription className="text-[10px] sm:text-xs">
                    Step {currentStep + 1} of {iso25010Categories.length}: {currentCategory?.name}
                </DialogDescription>
            </div>
            <div className="hidden sm:flex gap-2">
                 <Badge variant="outline" className="h-6 font-black bg-white border-primary/20 text-primary">AY 2025</Badge>
                 <Badge variant="secondary" className="h-6 font-black uppercase text-[9px]">{currentCategory?.name}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
              <ScrollArea className="flex-1">
                <div className="p-4 sm:p-8 space-y-8 sm:space-y-10 pb-24">
                  <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner space-y-1">
                    <h3 className="font-black text-primary text-[11px] sm:text-sm uppercase tracking-wider">{currentCategory?.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium italic">"{currentCategory?.description}"</p>
                  </div>

                  <div className="space-y-10">
                    {currentCategory?.subCharacteristics.map((sub) => (
                      <FormField
                        key={sub.id}
                        control={form.control}
                        name={`scores.${sub.id}`}
                        render={({ field }) => (
                          <FormItem className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                <div className="space-y-1 flex-1">
                                    <FormLabel className="text-sm sm:text-base font-black text-slate-800 tracking-tight">{sub.name}</FormLabel>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-2xl">{sub.desc}</p>
                                </div>
                                {field.value && (
                                    <Badge className={cn("h-6 px-4 font-black uppercase border-none text-[10px] w-fit animate-in zoom-in duration-300", LIKERT_OPTIONS.find(o => o.value === field.value)?.bg, LIKERT_OPTIONS.find(o => o.value === field.value)?.color)}>
                                        {LIKERT_OPTIONS.find(o => o.value === field.value)?.label}
                                    </Badge>
                                )}
                            </div>
                            
                            <FormControl>
                              <RadioGroup
                                onValueChange={(val) => field.onChange(parseInt(val))}
                                value={field.value ? String(field.value) : undefined}
                                className="grid grid-cols-1 sm:grid-cols-5 gap-2"
                              >
                                {LIKERT_OPTIONS.map((opt) => (
                                    <FormItem key={opt.value} className="flex flex-col items-center">
                                        <FormControl>
                                            <RadioGroupItem value={String(opt.value)} id={`${sub.id}-${opt.value}`} className="sr-only" />
                                        </FormControl>
                                        <Label
                                            htmlFor={`${sub.id}-${opt.value}`}
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
                                ))}
                              </RadioGroup>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  {isLastStep && (
                    <div className="space-y-6 sm:space-y-8 pt-8 border-t mt-8 animate-in slide-in-from-bottom-4 duration-500">
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
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="p-4 sm:p-6 border-t bg-slate-50 shrink-0 shadow-inner">
                <div className="flex w-full items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                      disabled={currentStep === 0}
                      className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest h-9 sm:h-10 px-4 sm:px-6 bg-white"
                    >
                      <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" /> Previous
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenChange(false)}
                      className="font-bold text-[9px] sm:text-[10px] uppercase tracking-widest h-9 sm:h-10 px-4 sm:px-6 text-muted-foreground hover:text-rose-600"
                    >
                      Abort
                    </Button>
                  </div>

                  {isLastStep ? (
                    <Button type="submit" disabled={isSubmitting} className="font-black text-[10px] sm:text-xs uppercase tracking-widest px-6 sm:px-10 h-9 sm:h-11 shadow-xl shadow-primary/30">
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                      Finalize Report
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="font-black text-[10px] sm:text-xs uppercase tracking-widest px-6 sm:px-10 h-9 sm:h-11 shadow-lg shadow-primary/20"
                    >
                      Next <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}