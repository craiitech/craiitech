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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import type { AuditPlan, User, Unit, ISOClause } from '@/lib/types';
import { Loader2, CalendarIcon, ShieldCheck, Check, Search, Layers } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

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
  isoClausesToAudit: z.array(z.string()).min(1, 'Select at least one standard clause.'),
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

  /**
   * INTELLIGENT AUDITEE FILTERING
   * Maps the chosen Audit Process Group to the relevant organizational entities.
   */
  const auditees = useMemo(() => {
    if (plan.auditeeType === 'Management Processes') {
        // Management processes typically target Top Management (Users with leadership roles)
        return topManagement.sort((a,b) => a.firstName.localeCompare(b.firstName));
    } else if (plan.auditeeType === 'Operation Processes') {
        // Operation processes typically target Academic Units (Colleges/Institutes)
        return allUnits.filter(u => u.campusIds?.includes(plan.campusId) && u.category === 'Academic')
            .sort((a,b) => a.name.localeCompare(b.name));
    } else {
        // Support processes target Administrative, Research, and Support units
        return allUnits.filter(u => u.campusIds?.includes(plan.campusId) && u.category !== 'Academic')
            .sort((a,b) => a.name.localeCompare(b.name));
    }
  }, [plan, allUnits, topManagement]);

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
    const isUnit = plan.auditeeType !== 'Management Processes';

    if (isUnit) {
        targetName = allUnits.find(u => u.id === values.targetId)?.name || 'Unknown Unit';
    } else {
        const user = topManagement.find(u => u.id === values.targetId);
        targetName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
    }

    const scheduleData = {
      auditPlanId: plan.id,
      auditorId: null, // Left null for auditor pool to claim
      auditorName: null,
      targetId: values.targetId,
      targetType: isUnit ? 'Unit' : 'User',
      targetName,
      scheduledDate: Timestamp.fromDate(values.scheduledDate),
      isoClausesToAudit: values.isoClausesToAudit,
      status: 'Scheduled',
    };

    try {
        await addDoc(collection(firestore, 'auditSchedules'), scheduleData);
        toast({ title: 'Session Scheduled', description: `${targetName} has been queued for audit on ${format(values.scheduledDate, 'PP')}.` });
        onOpenChange(false);
    } catch (error) {
        console.error('Error scheduling audit:', error);
        toast({ title: 'Scheduling Failed', description: 'Could not create schedule. Check field constraints.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const selectedClauses = form.watch('isoClausesToAudit');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-primary mb-1">
            <CalendarIcon className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Schedule Provisioning</span>
          </div>
          <DialogTitle>Add Session to "{plan.title}"</DialogTitle>
          <DialogDescription className="text-xs">
            Targeting auditees within the <strong>{plan.auditeeType}</strong> group.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
            <Form {...form}>
                <form id="schedule-form" onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="targetId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Select Auditee ({plan.auditeeType === 'Management Processes' ? 'Officer' : 'Unit'})</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-11 font-bold">
                                                <SelectValue placeholder={`Select a ${plan.auditeeType === 'Management Processes' ? 'Management Officer' : 'Unit'}`}/>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {auditees.map(a => (
                                                <SelectItem key={a.id} value={a.id}>
                                                    {'name' in a ? a.name : `${a.firstName} ${a.lastName}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription className="text-[9px]">The list is automatically filtered by the chosen process group.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="scheduledDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-[10px] font-bold uppercase mb-2">Target Date of Conduct</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant="outline" className={cn("h-11 pl-3 text-left font-bold border-slate-200", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP") : (<span>Select date...</span>)}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 shadow-xl" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="isoClausesToAudit"
                        render={({ field }) => (
                            <FormItem className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <FormLabel className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4" />
                                            Standard Clauses in Scope
                                        </FormLabel>
                                        <FormDescription className="text-[9px]">Select which ISO 21001:2018 clauses apply to this session.</FormDescription>
                                    </div>
                                    <Badge variant="secondary" className="font-mono h-5 text-[10px]">{selectedClauses.length} Selected</Badge>
                                </div>
                                
                                <div className="rounded-lg border bg-muted/5 shadow-inner">
                                    <Command className="bg-transparent">
                                        <div className="flex items-center border-b px-3 bg-white">
                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                            <CommandInput placeholder="Search standard clauses..." className="h-10 text-xs" />
                                        </div>
                                        <CommandList className="max-h-[300px]">
                                            <CommandEmpty>No matching clauses found.</CommandEmpty>
                                            <CommandGroup>
                                                {isLoadingClauses ? (
                                                    <div className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-primary" /></div>
                                                ) : (
                                                    isoClauses?.map(c => {
                                                        const isSelected = selectedClauses.includes(c.id);
                                                        return (
                                                            <CommandItem
                                                                key={c.id}
                                                                onSelect={() => {
                                                                    const current = selectedClauses;
                                                                    const next = current.includes(c.id)
                                                                        ? current.filter(id => id !== c.id)
                                                                        : [...current, c.id];
                                                                    field.onChange(next);
                                                                }}
                                                                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                                                            >
                                                                <div className={cn(
                                                                    "h-4 w-4 border rounded flex items-center justify-center transition-colors shrink-0",
                                                                    isSelected ? "bg-primary border-primary text-white" : "border-slate-300"
                                                                )}>
                                                                    {isSelected && <Check className="h-3 w-3" />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-black text-[11px] leading-tight mb-0.5">Clause {c.id}</p>
                                                                    <p className="text-[10px] text-muted-foreground truncate">{c.title}</p>
                                                                </div>
                                                            </CommandItem>
                                                        );
                                                    })
                                                )}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </form>
            </Form>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="schedule-form" disabled={isSubmitting} className="min-w-[160px] shadow-xl shadow-primary/20">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Provision Schedule
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
