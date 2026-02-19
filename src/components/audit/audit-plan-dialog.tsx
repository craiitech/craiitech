'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { AuditPlan, Campus } from '@/lib/types';
import { Loader2, LayoutList, ShieldCheck } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';

interface AuditPlanDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: AuditPlan | null;
  campuses: Campus[];
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

const formSchema = z.object({
  title: z.string().min(5, 'Title must be descriptive (min 5 chars).'),
  year: z.number(),
  campusId: z.string().min(1, 'Target campus site is required.'),
  auditeeType: z.enum(['Management Processes', 'Operation Processes', 'Support Processes']),
  scope: z.string().min(10, 'Please provide a clear scope statement.'),
});

export function AuditPlanDialog({ isOpen, onOpenChange, plan, campuses }: AuditPlanDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: currentYear,
      auditeeType: 'Operation Processes',
    },
  });

  useEffect(() => {
    if (plan) {
      form.reset(plan);
    } else {
      form.reset({
        title: '',
        year: currentYear,
        campusId: '',
        auditeeType: 'Operation Processes',
        scope: '',
      });
    }
  }, [plan, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    const id = plan ? plan.id : doc(collection(firestore, 'dummy')).id;
    const planRef = doc(firestore, 'auditPlans', id);

    const planData: Omit<AuditPlan, 'createdAt'> & { id: string } = {
      id,
      ...values,
    };
    
    try {
        if (plan) {
            await setDoc(planRef, planData, { merge: true });
        } else {
            await setDoc(planRef, { ...planData, createdAt: serverTimestamp() });
        }
        toast({ title: 'Plan Established', description: `Audit plan for ${values.year} has been successfully recorded.` });
        onOpenChange(false);
    } catch (error) {
        console.error('Error saving audit plan:', error);
        toast({ title: 'Operational Error', description: 'Could not establish audit plan. Check security permissions.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-primary mb-1">
            <LayoutList className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Master Planning Dialog</span>
          </div>
          <DialogTitle>{plan ? 'Modify' : 'Establish'} Audit Framework</DialogTitle>
          <DialogDescription className="text-xs">
            Define the institutional scope and periodicity for this quality cycle.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
                <Form {...form}>
                    <form id="plan-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase">Plan Designation / Title</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g., Annual IQA for 2025 Cycle" className="h-11 font-bold" /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="year"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase">Academic Year</FormLabel>
                                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                            <FormControl><SelectTrigger className="h-10 font-bold"><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="campusId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase">Target Site</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select Site" /></SelectTrigger></FormControl>
                                            <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="auditeeType"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel className="text-[10px] font-black uppercase text-primary">Process Audit Group</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                                            <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/5">
                                                <RadioGroupItem value="Management Processes" id="group-mgmt" />
                                                <Label htmlFor="group-mgmt" className="text-xs font-bold cursor-pointer">Management Processes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/5">
                                                <RadioGroupItem value="Operation Processes" id="group-ops" />
                                                <Label htmlFor="group-ops" className="text-xs font-bold cursor-pointer">Operation Processes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/5">
                                                <RadioGroupItem value="Support Processes" id="group-support" />
                                                <Label htmlFor="group-support" className="text-xs font-bold cursor-pointer">Support Processes</Label>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="scope"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase">Formal Statement of Scope</FormLabel>
                                <FormControl><Textarea {...field} placeholder="Specify the institutional processes and clauses covered..." rows={5} className="bg-slate-50 text-xs italic font-medium leading-relaxed" /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </form>
                </Form>
            </ScrollArea>
        </div>

        <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Discard</Button>
            <Button type="submit" form="plan-form" disabled={isSubmitting} className="min-w-[140px] shadow-xl shadow-primary/20">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {plan ? 'Update Framework' : 'Establish Framework'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
