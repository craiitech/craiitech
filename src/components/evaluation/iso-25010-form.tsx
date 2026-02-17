
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
    if (!firestore || !user) return;
    setIsSubmitting(true);

    const totalPoints = Object.values(values.scores).reduce((a, b) => a + b, 0);
    const overallScore = totalPoints / Object.keys(values.scores).length;

    const evaluationData = {
      userId: user.uid,
      userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Auditor',
      timestamp: serverTimestamp(),
      scores: values.scores,
      overallScore,
      generalComments: values.generalComments || '',
      recommendations: values.recommendations || '',
    };

    try {
      await addDoc(collection(firestore, 'softwareEvaluations'), evaluationData);
      toast({ title: 'Evaluation Submitted', description: 'The ISO 25010 audit has been recorded.' });
      onOpenChange(false);
      setCurrentStep(0);
      form.reset();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to submit evaluation.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCategory = iso25010Categories[currentStep];
  const isLastStep = currentStep === iso25010Categories.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b bg-muted/20">
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Formal Software Audit</span>
          </div>
          <DialogTitle className="text-xl">ISO/IEC 25010 Software Quality Assessment</DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {iso25010Categories.length}: {currentCategory?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-8 pb-10">
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <h3 className="font-bold text-primary mb-1">{currentCategory?.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{currentCategory?.description}</p>
                  </div>

                  <div className="space-y-10">
                    {currentCategory?.subCharacteristics.map((sub) => (
                      <FormField
                        key={sub.id}
                        control={form.control}
                        name={`scores.${sub.id}`}
                        render={({ field }) => (
                          <FormItem className="space-y-4">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-sm font-bold">{sub.name}</FormLabel>
                              <Badge variant="outline" className="text-xs font-black bg-primary/10 text-primary">
                                {field.value}/5
                              </Badge>
                            </div>
                            <FormDescription className="text-[11px] leading-snug">
                              {sub.desc}
                            </FormDescription>
                            <FormControl>
                              <Slider
                                min={1}
                                max={5}
                                step={1}
                                value={[field.value]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                                className="py-2"
                              />
                            </FormControl>
                            <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                              <span>Poor</span>
                              <span>Excellent</span>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  {isLastStep && (
                    <div className="space-y-6 pt-10 border-t">
                      <h3 className="font-bold text-lg">Final Remarks</h3>
                      <FormField
                        control={form.control}
                        name="generalComments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>General Comments</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Aggregate observations..." rows={4} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="recommendations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Strategic Recommendations</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Specific areas for improvement..." rows={4} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
                <div className="flex w-full items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                      disabled={currentStep === 0}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancel
                    </Button>
                  </div>

                  {isLastStep ? (
                    <Button type="submit" disabled={isSubmitting} className="shadow-lg shadow-primary/20">
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Finalize Audit
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setCurrentStep(prev => Math.min(iso25010Categories.length - 1, prev + 1))}
                    >
                      Next Category <ChevronRight className="ml-2 h-4 w-4" />
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
