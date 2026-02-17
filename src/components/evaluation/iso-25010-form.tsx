
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { iso25010Categories } from '@/lib/iso-25010-data';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Iso25010FormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  scores: z.record(z.string(), z.number()),
  generalComments: z.string().optional(),
  recommendations: z.string().optional(),
});

export function Iso25010Form({ isOpen, onOpenChange }: Iso25010FormProps) {
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const defaultScores: Record<string, number> = {};
  iso25010Categories.forEach(cat => {
    cat.subCharacteristics.forEach(sub => {
      defaultScores[sub.id] = 3; // Default to neutral (3/5)
    });
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scores: defaultScores,
      generalComments: '',
      recommendations: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const totalPoints = Object.values(values.scores).reduce((a, b) => a + b, 0);
    const overallScore = totalPoints / Object.keys(values.scores).length;

    // Support Guest Submissions
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
      toast({ title: 'Evaluation Submitted', description: 'Thank you for your feedback! The audit results have been securely recorded.' });
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

  const currentCategory = iso25010Categories[currentStep];
  const isLastStep = currentStep === iso25010Categories.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Formal Software Audit</span>
          </div>
          <DialogTitle className="text-xl font-bold">ISO/IEC 25010 Quality Assessment</DialogTitle>
          <DialogDescription className="text-xs">
            Step {currentStep + 1} of {iso25010Categories.length}: {currentCategory?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
              <ScrollArea className="flex-1">
                <div className="p-8 space-y-10 pb-20">
                  <div className="bg-primary/5 p-5 rounded-xl border border-primary/10 shadow-sm">
                    <h3 className="font-bold text-primary text-sm uppercase tracking-wide mb-2">{currentCategory?.name}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{currentCategory?.description}</p>
                  </div>

                  <div className="space-y-12">
                    {currentCategory?.subCharacteristics.map((sub) => (
                      <FormField
                        key={sub.id}
                        control={form.control}
                        name={`scores.${sub.id}`}
                        render={({ field }) => (
                          <FormItem className="space-y-5">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-sm font-black text-slate-800 tracking-tight">{sub.name}</FormLabel>
                              <Badge variant="outline" className="text-xs font-black bg-primary text-white border-none px-3">
                                {field.value} / 5
                              </Badge>
                            </div>
                            <FormDescription className="text-xs text-slate-500 leading-normal bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                              {sub.desc}
                            </FormDescription>
                            <FormControl>
                              <Slider
                                min={1}
                                max={5}
                                step={1}
                                value={[field.value]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                                className="py-4"
                              />
                            </FormControl>
                            <div className="flex justify-between text-[9px] text-slate-400 uppercase font-black tracking-widest px-1">
                              <span>Needs Improvement</span>
                              <span>Average / Satisfactory</span>
                              <span>Exceptional Quality</span>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  {isLastStep && (
                    <div className="space-y-6 pt-12 border-t mt-12">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <h3 className="font-black text-lg text-slate-900 tracking-tight">Final Assessment Summary</h3>
                      </div>
                      <FormField
                        control={form.control}
                        name="generalComments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-slate-700">General Observations</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Share your overall experience with the portal software..." rows={4} className="bg-slate-50 border-slate-200" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="recommendations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-slate-700">Technical or Functional Recommendations</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="What specific features or changes would improve quality for you?" rows={4} className="bg-slate-50 border-slate-200" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="p-6 border-t bg-slate-50 shrink-0">
                <div className="flex w-full items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                      disabled={currentStep === 0}
                      className="font-bold text-[10px] uppercase tracking-widest"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenChange(false)}
                      className="font-bold text-[10px] uppercase tracking-widest"
                    >
                      Exit
                    </Button>
                  </div>

                  {isLastStep ? (
                    <Button type="submit" disabled={isSubmitting} className="font-black text-xs uppercase tracking-widest px-8 shadow-xl shadow-primary/20">
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Submit Audit
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setCurrentStep(prev => Math.min(iso25010Categories.length - 1, prev + 1))}
                      className="font-black text-xs uppercase tracking-widest px-8"
                    >
                      Next: Category {currentStep + 2} <ChevronRight className="ml-2 h-4 w-4" />
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
