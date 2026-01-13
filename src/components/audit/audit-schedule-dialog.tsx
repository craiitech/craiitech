
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { AuditPlan, User, Unit, ISOClause } from '@/lib/types';
import { Loader2, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { Badge } from '../ui/badge';

interface AuditScheduleDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: AuditPlan;
  auditors: User[];
  allUnits: Unit[];
  topManagement: User[];
}

const formSchema = z.object({
  targetId: z.string().min(1, 'Auditee is required'),
  scheduledDate: z.date({ required_error: 'A date is required.'}),
  isoClausesToAudit: z.array(z.string()).min(1, 'At least one ISO clause must be selected.'),
});

export function AuditScheduleDialog({
  isOpen,
  onOpenChange,
  plan,
  auditors,
  allUnits,
  topManagement
}: AuditScheduleDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isoClausesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'isoClauses') : null, [firestore]);
  const { data: isoClauses, isLoading: isLoadingClauses } = useCollection<ISOClause>(isoClausesQuery);

  const auditees = plan.auditeeType === 'Units' 
    ? allUnits.filter(u => u.campusIds?.includes(plan.campusId))
    : topManagement;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isoClausesToAudit: []
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    let targetName = 'Unknown';
    if (plan.auditeeType === 'Units') {
        targetName = allUnits.find(u => u.id === values.targetId)?.name || 'Unknown Unit';
    } else {
        const user = topManagement.find(u => u.id === values.targetId);
        targetName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
    }

    const scheduleData = {
      auditPlanId: plan.id,
      auditorId: null, // Auditor is not assigned at this stage
      auditorName: null,
      targetId: values.targetId,
      targetType: plan.auditeeType === 'Units' ? 'Unit' : 'User',
      targetName,
      scheduledDate: values.scheduledDate,
      isoClausesToAudit: values.isoClausesToAudit,
      status: 'Scheduled',
    };

    try {
        await addDoc(collection(firestore, 'auditSchedules'), scheduleData);
        toast({ title: 'Success', description: 'New audit has been scheduled.' });
        onOpenChange(false);
    } catch (error) {
        console.error('Error scheduling audit:', error);
        toast({ title: 'Error', description: 'Could not schedule audit.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const selectedClauses = form.watch('isoClausesToAudit');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule New Audit</DialogTitle>
          <DialogDescription>
            Schedule an audit for the plan: "{plan.title}". An auditor can claim this schedule later.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
                control={form.control}
                name="targetId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Assign Auditee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder={`Select a ${plan.auditeeType === 'Units' ? 'Unit' : 'Person'}`}/></SelectTrigger></FormControl>
                            <SelectContent>{auditees.map(a => <SelectItem key={a.id} value={a.id}>{'name' in a ? a.name : `${a.firstName} ${a.lastName}`}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Scheduled Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="isoClausesToAudit"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>ISO 21001:2018 Clauses to Audit</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" role="combobox" className="w-full justify-between h-auto">
                                        <div className="flex gap-1 flex-wrap">
                                            {selectedClauses.length > 0 ? selectedClauses.map(clause => (
                                                <Badge key={clause} variant="secondary">{clause}</Badge>
                                            )) : "Select clauses..."}
                                        </div>
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search clauses..." />
                                    <CommandEmpty>No clauses found.</CommandEmpty>
                                    <CommandGroup className="max-h-60 overflow-auto">
                                        {isoClauses?.map(c => (
                                            <CommandItem
                                                key={c.id}
                                                onSelect={() => {
                                                    const newClauses = selectedClauses.includes(c.id)
                                                        ? selectedClauses.filter(id => id !== c.id)
                                                        : [...selectedClauses, c.id];
                                                    field.onChange(newClauses);
                                                }}
                                            >
                                                {c.id} - {c.title}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
            
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Schedule Audit
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
