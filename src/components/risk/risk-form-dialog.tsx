
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { Risk, User as AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { useSessionActivity } from '@/lib/activity-log-provider';

interface RiskFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  risk: Risk | null;
  unitUsers: AppUser[];
}

const formSchema = z.object({
  year: z.number().int().min(new Date().getFullYear() - 5).max(new Date().getFullYear() + 5),
  objective: z.string().min(1, 'Objective is required'),
  type: z.enum(['Risk', 'Opportunity']),
  description: z.string().min(1, 'Description is required'),
  likelihood: z.number().min(1).max(5),
  consequence: z.number().min(1).max(5),
  treatmentAction: z.string().min(1, 'Treatment action is required'),
  responsiblePersonId: z.string().min(1, 'Please select a responsible person'),
  targetDate: z.date(),
  status: z.enum(['Open', 'In Progress', 'Closed']),
  // Optional fields for Action Plan
  resourcesNeeded: z.string().optional(),
  updates: z.string().optional(),
});

const likelihoodOptions = [
  { value: 1, label: '1 - Rare' },
  { value: 2, label: '2 - Unlikely' },
  { value: 3, label: '3 - Possible' },
  { value: 4, label: '4 - Likely' },
  { value: 5, label: '5 - Almost Certain' },
];

const consequenceOptions = [
  { value: 1, label: '1 - Insignificant' },
  { value: 2, label: '2 - Minor' },
  { value: 3, label: '3 - Moderate' },
  { value: 4, label: '4 - Major' },
  { value: 5, label: '5 - Catastrophic' },
];

const getRating = (magnitude: number): string => {
  if (magnitude >= 15) return 'High';
  if (magnitude >= 5) return 'Medium';
  return 'Low';
};

export function RiskFormDialog({ isOpen, onOpenChange, risk, unitUsers }: RiskFormDialogProps) {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logSessionActivity } = useSessionActivity();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      objective: '',
      type: 'Risk',
      description: '',
      treatmentAction: '',
      status: 'Open',
      resourcesNeeded: '',
      updates: '',
    },
  });

  useEffect(() => {
    if (risk) {
      form.reset({
        ...risk,
        likelihood: risk.preTreatment.likelihood,
        consequence: risk.preTreatment.consequence,
        targetDate: risk.targetDate?.toDate(),
        resourcesNeeded: risk.resourcesNeeded || '',
        updates: risk.updates || '',
      });
    } else {
      form.reset({
        year: new Date().getFullYear(),
        objective: '',
        type: 'Risk',
        description: '',
        treatmentAction: '',
        status: 'Open',
        likelihood: undefined,
        consequence: undefined,
        responsiblePersonId: undefined,
        targetDate: undefined,
        resourcesNeeded: '',
        updates: '',
      });
    }
  }, [risk, isOpen, form]);

  const likelihood = form.watch('likelihood');
  const consequence = form.watch('consequence');
  const magnitude = likelihood && consequence ? likelihood * consequence : 0;
  const rating = getRating(magnitude);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    
    const responsiblePerson = unitUsers.find(u => u.id === values.responsiblePersonId);

    const riskData: Omit<Risk, 'id' | 'createdAt'> = {
      ...values,
      unitId: userProfile.unitId,
      campusId: userProfile.campusId,
      preTreatment: {
        likelihood: values.likelihood,
        consequence: values.consequence,
        magnitude,
        rating,
      },
      responsiblePersonName: responsiblePerson ? `${responsiblePerson.firstName} ${responsiblePerson.lastName}` : 'Unknown',
      updatedAt: serverTimestamp(),
    };

    try {
        if (risk) {
            const riskRef = doc(firestore, 'risks', risk.id);
            await setDoc(riskRef, { ...riskData, createdAt: risk.createdAt }, { merge: true });
            logSessionActivity('Updated risk entry', { action: 'update_risk', details: { riskId: risk.id }});
            toast({ title: 'Success', description: 'Risk/Opportunity entry has been updated.' });
        } else {
            const riskRef = collection(firestore, 'risks');
            const newDoc = await addDoc(riskRef, { ...riskData, createdAt: serverTimestamp() });
            logSessionActivity('Created risk entry', { action: 'create_risk', details: { riskId: newDoc.id }});
            toast({ title: 'Success', description: 'New Risk/Opportunity has been logged.' });
        }
        onOpenChange(false);
    } catch (error) {
        console.error("Error saving risk:", error);
        toast({ title: 'Error', description: 'Could not save the entry.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{risk ? 'Edit' : 'Log New'} Risk or Opportunity</DialogTitle>
          <DialogDescription>
            Fill out the details below. All fields are required unless marked optional.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
            
            <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem className="space-y-3">
                <FormLabel>Type of Entry</FormLabel>
                <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Risk" /></FormControl>
                            <Label className="font-normal">Risk</Label>
                        </FormItem>
                         <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Opportunity" /></FormControl>
                            <Label className="font-normal">Opportunity</Label>
                        </FormItem>
                    </RadioGroup>
                </FormControl>
                </FormItem>
            )} />

            <FormField control={form.control} name="objective" render={({ field }) => (
                <FormItem><FormLabel>Related Process/Function Objective</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description of Risk/Opportunity</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="likelihood" render={({ field }) => (
                    <FormItem><FormLabel>Likelihood (Pre-Treatment)</FormLabel>
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select likelihood" /></SelectTrigger></FormControl>
                            <SelectContent>{likelihoodOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="consequence" render={({ field }) => (
                    <FormItem><FormLabel>Consequence (Pre-Treatment)</FormLabel>
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select consequence" /></SelectTrigger></FormControl>
                             <SelectContent>{consequenceOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )} />
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-md border p-4 bg-muted/50">
                <div><span className="font-medium">Calculated Magnitude:</span> {magnitude}</div>
                <div><span className="font-medium">Calculated Rating:</span> {rating}</div>
            </div>

             <FormField control={form.control} name="treatmentAction" render={({ field }) => (
                <FormItem><FormLabel>Action Plan / Treatment</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <FormField control={form.control} name="resourcesNeeded" render={({ field }) => (
                <FormItem><FormLabel>Resources Needed (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <FormField control={form.control} name="updates" render={({ field }) => (
                <FormItem><FormLabel>Updates (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="responsiblePersonId" render={({ field }) => (
                    <FormItem><FormLabel>Accountable Person</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a person" /></SelectTrigger></FormControl>
                            <SelectContent>{unitUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>)}</SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="targetDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Target Completion Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                    <FormMessage /></FormItem>
                )} />
            </div>
             <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                <FormMessage /></FormItem>
            )} />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {risk ? 'Save Changes' : 'Log Entry'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
