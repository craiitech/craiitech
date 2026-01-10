
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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { AuditPlan, Campus } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';

interface AuditPlanDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: AuditPlan | null;
  campuses: Campus[];
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  year: z.number(),
  campusId: z.string().min(1, 'Campus is required'),
  auditeeType: z.enum(['Units', 'Top Management']),
  scope: z.string().min(1, 'Scope is required'),
});

export function AuditPlanDialog({ isOpen, onOpenChange, plan, campuses }: AuditPlanDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: currentYear,
      auditeeType: 'Units',
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
        auditeeType: 'Units',
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
        toast({ title: 'Success', description: 'Audit plan saved.' });
        onOpenChange(false);
    } catch (error) {
        console.error('Error saving audit plan:', error);
        toast({ title: 'Error', description: 'Could not save audit plan.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit' : 'Create'} Audit Plan</DialogTitle>
          <DialogDescription>Define the scope and details for an internal audit plan.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Title</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g., Annual IQA 2025" /></FormControl>
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
                            <FormLabel>Year</FormLabel>
                            <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                            <FormLabel>Campus</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a campus"/></SelectTrigger></FormControl>
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
                        <FormLabel>Auditee Group</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="Units" /></FormControl>
                                    <Label className="font-normal">Units</Label>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="Top Management" /></FormControl>
                                    <Label className="font-normal">Top Management</Label>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope of Audit</FormLabel>
                    <FormControl><Textarea {...field} placeholder="Describe the general scope of this audit..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
            />
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Plan
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
