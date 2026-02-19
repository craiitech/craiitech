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
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, addDoc, collection, Timestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useState, useEffect } from 'react';
import type { AuditPlan, User, Unit, ISOClause, AuditSchedule, UnitCategory } from '@/lib/types';
import { Loader2, CalendarIcon, ShieldCheck, Check, Search, Clock, ListChecks, Building2, Database, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { format } from 'date-fns';

interface AuditScheduleDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: AuditPlan;
  schedule: AuditSchedule | null;
  auditors: User[];
  allUnits: Unit[];
  topManagement: User[];
}

const formSchema = z.object({
  targetId: z.string().min(1, 'Auditee Unit/Office is required'),
  procedureDescription: z.string().min(5, 'Procedure detail is required.'),
  scheduledDate: z.string().regex(/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/, 'Date must be in MM/DD/YYYY format'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  isoClausesToAudit: z.array(z.string()).min(1, 'Select at least one standard clause.'),
  auditorId: z.string().optional().nullable(),
}).refine(data => {
    return data.endTime > data.startTime;
}, {
    message: "End time must be after start time",
    path: ["endTime"]
});

export function AuditScheduleDialog({
  isOpen,
  onOpenChange,
  plan,
  schedule,
  auditors,
  allUnits,
}: AuditScheduleDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isoClausesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'isoClauses') : null, [firestore]);
  const { data: isoClauses, isLoading: isLoadingClauses } = useCollection<ISOClause>(isoClausesQuery);

  const auditeesByCategory = useMemo(() => {
    // If university-wide, show all units. Otherwise, filter by campus site defined in the plan.
    const campusUnits = plan.campusId === 'university-wide'
        ? allUnits
        : allUnits.filter(u => u.campusIds?.includes(plan.campusId));
    
    const groups: Record<UnitCategory, Unit[]> = {
        'Academic': [],
        'Administrative': [],
        'Research': [],
        'Support': []
    };

    campusUnits.forEach(unit => {
        const cat = unit.category || 'Administrative';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(unit);
    });

    // Sort units within each category
    Object.keys(groups).forEach(cat => {
        groups[cat as UnitCategory].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [plan, allUnits]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetId: '',
      scheduledDate: '',
      isoClausesToAudit: [],
      startTime: '09:00',
      endTime: '12:00',
      procedureDescription: '',
      auditorId: '',
    }
  });

  useEffect(() => {
    if (schedule && isOpen) {
        const start = schedule.scheduledDate?.toDate?.() || new Date();
        const end = schedule.endScheduledDate?.toDate?.() || new Date();
        
        form.reset({
            targetId: schedule.targetId,
            scheduledDate: format(start, 'MM/dd/yyyy'),
            startTime: format(start, 'HH:mm'),
            endTime: format(end, 'HH:mm'),
            procedureDescription: schedule.procedureDescription || '',
            isoClausesToAudit: schedule.isoClausesToAudit || [],
            auditorId: schedule.auditorId || '',
        });
    } else if (!schedule && isOpen) {
        form.reset({
            targetId: '',
            scheduledDate: '',
            isoClausesToAudit: [],
            startTime: '09:00',
            endTime: '12:00',
            procedureDescription: '',
            auditorId: '',
        });
    }
  }, [schedule, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    try {
        const targetUnit = allUnits.find(u => u.id === values.targetId);
        const targetName = targetUnit?.name || 'Unknown Unit';

        const [month, day, year] = values.scheduledDate.split('/').map(Number);
        
        const [sHours, sMinutes] = values.startTime.split(':').map(Number);
        const startDateTime = new Date(year, month - 1, day);
        startDateTime.setHours(sHours, sMinutes, 0, 0);

        const [eHours, eMinutes] = values.endTime.split(':').map(Number);
        const endDateTime = new Date(year, month - 1, day);
        endDateTime.setHours(eHours, eMinutes, 0, 0);

        const selectedAuditor = auditors.find(a => a.id === values.auditorId);
        const auditorName = selectedAuditor ? `${selectedAuditor.firstName} ${selectedAuditor.lastName}` : null;

        const scheduleData = {
          auditPlanId: plan.id,
          targetId: values.targetId,
          targetType: 'Unit',
          targetName,
          procedureDescription: values.procedureDescription,
          scheduledDate: Timestamp.fromDate(startDateTime),
          endScheduledDate: Timestamp.fromDate(endDateTime),
          isoClausesToAudit: values.isoClausesToAudit,
          status: schedule?.status || 'Scheduled',
          auditorId: values.auditorId || null,
          auditorName: auditorName,
        };

        if (schedule) {
            await updateDoc(doc(firestore, 'auditSchedules', schedule.id), scheduleData);
            toast({ title: 'Entry Updated', description: `Itinerary entry for ${targetName} has been updated.` });
        } else {
            await addDoc(collection(firestore, 'auditSchedules'), scheduleData);
            toast({ title: 'Session Provisioned', description: `Itinerary entry for ${targetName} registered.` });
        }
        
        onOpenChange(false);
    } catch (error) {
        console.error('Error scheduling audit:', error);
        toast({ title: 'Operation Failed', description: 'Could not save itinerary entry.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const selectedClauses = form.watch('isoClausesToAudit');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-primary mb-1">
            <ListChecks className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Itinerary Provisioning</span>
          </div>
          <DialogTitle>{schedule ? 'Modify' : 'Provision'} Itinerary Entry: "{plan.title}"</DialogTitle>
          <DialogDescription className="text-xs">
            Define the specific procedure, audit focus, and time slot for this session.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 bg-white">
            <Form {...form}>
                <form id="schedule-form" onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-10">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">1. Timeline & Target Unit</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="scheduledDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel className="text-[10px] font-bold uppercase mb-2">Conduct Date</FormLabel>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                placeholder="MM/DD/YYYY" 
                                                className="h-11 font-bold border-slate-200 shadow-sm"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="startTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase mb-2">Start Time</FormLabel>
                                        <FormControl><Input type="time" {...field} className="h-11 font-bold shadow-sm" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="endTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase mb-2">End Time</FormLabel>
                                        <FormControl><Input type="time" {...field} className="h-11 font-bold shadow-sm" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="targetId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Auditee Unit / Office Name</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-11 font-bold bg-muted/5">
                                                <SelectValue placeholder="Select Unit/Office to Audit" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.entries(auditeesByCategory).map(([category, unitList]) => (
                                                unitList.length > 0 && (
                                                    <SelectGroup key={category}>
                                                        <SelectLabel className="text-[9px] font-black uppercase tracking-widest text-primary pt-4 pb-1 border-b mb-2">{category} Group</SelectLabel>
                                                        {unitList.map(u => (
                                                            <SelectItem key={u.id} value={u.id}>
                                                                {u.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                )
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">2. Procedure & Scoping</h4>
                        </div>
                        <FormField
                            control={form.control}
                            name="procedureDescription"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Procedure / Audit Focus Area</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} placeholder="Specify the procedures to be audited (e.g., Business Planning, Strategic Directions)..." rows={4} className="bg-slate-50 italic text-xs leading-relaxed" />
                                    </FormControl>
                                    <FormDescription className="text-[9px]">Describe the organizational processes covered in this session.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="isoClausesToAudit"
                            render={({ field }) => (
                                <FormItem className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="text-[10px] font-black uppercase text-primary">ISO 21001:2018 Clauses in Scope</FormLabel>
                                        <Badge variant="secondary" className="font-mono h-5 text-[10px]">{selectedClauses.length} CLS</Badge>
                                    </div>
                                    <div className="rounded-xl border shadow-sm overflow-hidden">
                                        <Command className="bg-transparent" filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                            <div className="flex items-center border-b px-3 bg-white">
                                                <CommandInput placeholder="Map clauses to itinerary..." className="h-10 text-xs" />
                                            </div>
                                            <CommandList className="max-h-[250px]">
                                                {isLoadingClauses ? (
                                                    <div className="p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                                        <Loader2 className="h-3 w-3 animate-spin" /> Synchronizing Standard...
                                                    </div>
                                                ) : (
                                                    <>
                                                        <CommandEmpty className="p-4 text-center">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <Database className="h-8 w-8 opacity-10" />
                                                                <p className="text-xs font-bold text-muted-foreground uppercase">No clauses found in database</p>
                                                                <p className="text-[10px] text-muted-foreground max-w-[200px]">Ensure you have clicked 'Seed Standard Clauses' in the Audit Hub.</p>
                                                            </div>
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {isoClauses?.map(c => {
                                                                const isSelected = selectedClauses.includes(c.id);
                                                                return (
                                                                    <CommandItem
                                                                        key={c.id}
                                                                        value={`${c.id} ${c.title}`}
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
                                                            })}
                                                        </CommandGroup>
                                                    </>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <UserCheck className="h-4 w-4 text-primary" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">3. Team Assignment</h4>
                        </div>
                        <FormField
                            control={form.control}
                            name="auditorId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Assign Auditor</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl>
                                            <SelectTrigger className="h-11 font-bold bg-muted/5">
                                                <SelectValue placeholder="Select Auditor for this session" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="unassigned" className="italic text-muted-foreground">None (Available for Claiming)</SelectItem>
                                            {auditors.map(auditor => (
                                                <SelectItem key={auditor.id} value={auditor.id}>
                                                    {auditor.firstName} {auditor.lastName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription className="text-[9px]">Assign a specific auditor now, or leave unassigned to allow auditors to claim it themselves.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </form>
            </Form>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-slate-50 shrink-0">
            <div className="flex w-full items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">RSU Quality Management System | Itinerary v2.0</p>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" form="schedule-form" disabled={isSubmitting} className="min-w-[180px] shadow-xl shadow-primary/20 font-black text-xs uppercase tracking-widest">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4 mr-1.5" />}
                        {schedule ? 'Update Entry' : 'Register Entry'}
                    </Button>
                </div>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
