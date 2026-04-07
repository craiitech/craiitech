'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { doc, collection, writeBatch, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { AuditPlan, AuditSchedule, Campus } from '@/lib/types';
import { Loader2, Copy, Calendar, Building2, LayoutList, Clock, Check, ChevronRight, PlusCircle, FileText, ShieldCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface AuditPlanCloneDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePlan: AuditPlan;
  sourceSchedules: AuditSchedule[];
  campuses: Campus[];
}

const cloneSchema = z.object({
  auditNumber: z.string().min(1, 'New Audit Number is required.'),
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  scope: z.string().min(10, 'Please provide a clear scope statement.'),
  campusId: z.string().min(1, 'Target campus is required.'),
  openingMeetingDate: z.string().min(1, 'New opening meeting date is required.'),
  closingMeetingDate: z.string().min(1, 'New closing meeting date is required.'),
  schedules: z.array(z.object({
    sourceId: z.string(),
    targetName: z.string(),
    newDate: z.string().min(1, 'Audit date is required'),
    newStartTime: z.string().min(1, 'Start time is required'),
    newEndTime: z.string().min(1, 'End time is required'),
  })),
});

export function AuditPlanCloneDialog({
  isOpen,
  onOpenChange,
  sourcePlan,
  sourceSchedules,
  campuses,
}: AuditPlanCloneDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const form = useForm<z.infer<typeof cloneSchema>>({
    resolver: zodResolver(cloneSchema),
    defaultValues: {
      auditNumber: `${sourcePlan.auditNumber}-COPY`,
      title: `${sourcePlan.title} (Cloned)`,
      scope: sourcePlan.scope || '',
      campusId: '',
      openingMeetingDate: '',
      closingMeetingDate: '',
      schedules: sourceSchedules.map(s => {
          const start = s.scheduledDate?.toDate?.() || new Date();
          const end = s.endScheduledDate?.toDate?.() || new Date();
          return {
              sourceId: s.id,
              targetName: s.targetName,
              newDate: format(start, 'yyyy-MM-dd'),
              newStartTime: format(start, 'HH:mm'),
              newEndTime: format(end, 'HH:mm'),
          };
      }),
    }
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "schedules"
  });

  const onSubmit = async (values: z.infer<typeof cloneSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    try {
        const batch = writeBatch(firestore);
        const newPlanId = doc(collection(firestore, 'auditPlans')).id;
        const newPlanRef = doc(firestore, 'auditPlans', newPlanId);

        // 1. Create the cloned AuditPlan
        const newPlanData = {
            ...sourcePlan,
            id: newPlanId,
            auditNumber: values.auditNumber,
            title: values.title,
            scope: values.scope,
            campusId: values.campusId,
            openingMeetingDate: Timestamp.fromDate(new Date(values.openingMeetingDate)),
            closingMeetingDate: Timestamp.fromDate(new Date(values.closingMeetingDate)),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        batch.set(newPlanRef, newPlanData);

        // 2. Create the cloned schedules
        values.schedules.forEach((sUpdate, idx) => {
            const original = sourceSchedules.find(os => os.id === sUpdate.sourceId);
            if (!original) return;

            const newScheduleId = doc(collection(firestore, 'auditSchedules')).id;
            const newScheduleRef = doc(firestore, 'auditSchedules', newScheduleId);

            const [year, month, day] = sUpdate.newDate.split('-').map(Number);
            const [sH, sM] = sUpdate.newStartTime.split(':').map(Number);
            const [eH, eM] = sUpdate.newEndTime.split(':').map(Number);

            const start = new Date(year, month - 1, day, sH, sM);
            const end = new Date(year, month - 1, day, eH, eM);

            const newScheduleData = {
                ...original,
                id: newScheduleId,
                auditPlanId: newPlanId,
                auditNumber: values.auditNumber,
                campusId: values.campusId,
                scheduledDate: Timestamp.fromDate(start),
                endScheduledDate: Timestamp.fromDate(end),
                status: 'Scheduled',
                // Reset conduct fields
                officerInCharge: '',
                summaryCommendable: '',
                summaryCompliance: '',
                summaryOFI: '',
                summaryNC: '',
            };
            batch.set(newScheduleRef, newScheduleData);
        });

        await batch.commit();
        toast({ title: 'Plan Replicated', description: `Audit Plan ${values.auditNumber} has been established at the new campus.` });
        onOpenChange(false);
    } catch (error) {
        console.error("Cloning Error:", error);
        toast({ title: 'Cloning Failed', description: 'Could not replicate the audit framework.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Copy className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Framework Replication Wizard</span>
          </div>
          <DialogTitle>Clone Audit Plan: "{sourcePlan.title}"</DialogTitle>
          <DialogDescription className="text-xs">Copy this audit framework to another campus and adjust the meeting milestones.</DialogDescription>
        </DialogHeader>

        <div className="bg-muted/30 px-6 py-2 border-b flex items-center gap-4 shrink-0">
            <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", step === 1 ? "bg-primary text-white" : "text-muted-foreground")}>
                1. Target & Meetings
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground opacity-20" />
            <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", step === 2 ? "bg-primary text-white" : "text-muted-foreground")}>
                2. Itinerary Shifting
            </div>
        </div>

        <div className="flex-1 overflow-hidden bg-white">
          <Form {...form}>
            <form id="clone-form" onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-8">
                  {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="auditNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">New Audit No.</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g. 2025-001" className="h-11 font-mono font-black border-primary/20 bg-primary/5" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="campusId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Target Campus Site</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                                        <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase">Plan Title / Description</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                        <Input {...field} placeholder="Enter a descriptive title for this replicated plan..." className="pl-10 h-11 font-bold" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="scope" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase flex items-center gap-2">
                                    <ShieldCheck className="h-3 w-3" />
                                    Detailed Statement of Scope & Criteria
                                </FormLabel>
                                <FormControl>
                                    <Textarea {...field} placeholder="Specific processes, clauses, and units covered..." rows={4} className="bg-slate-50 italic text-xs leading-relaxed" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                            <FormField control={form.control} name="openingMeetingDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Opening Meeting (New Campus)</FormLabel>
                                    <FormControl><Input type="datetime-local" {...field} className="bg-slate-50" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="closingMeetingDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Closing Meeting (New Campus)</FormLabel>
                                    <FormControl><Input type="datetime-local" {...field} className="bg-slate-50" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <div className="p-6 rounded-2xl border border-dashed bg-muted/5 space-y-4">
                            <div className="flex items-center gap-2 text-primary">
                                <LayoutList className="h-5 w-5" />
                                <h4 className="text-xs font-black uppercase tracking-tight">Cloning Summary</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Source Framework</p>
                                    <p className="text-xs font-black">{sourcePlan.title}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Itinerary Size</p>
                                    <Badge variant="secondary" className="h-5 text-[10px] font-black">{sourceSchedules.length} SESSIONS</Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Itinerary Date Shifting</h4>
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground italic">Updating dates for {fields.length} individual sessions</p>
                        </div>

                        <div className="space-y-3">
                            {fields.map((field, idx) => (
                                <div key={field.id} className="p-4 rounded-xl border bg-muted/10 grid grid-cols-1 md:grid-cols-12 gap-4 items-end group hover:border-primary/20 transition-all">
                                    <div className="md:col-span-4 min-w-0">
                                        <p className="text-[9px] font-black uppercase text-primary leading-none mb-1">Auditee</p>
                                        <p className="text-xs font-bold text-slate-700 truncate">{field.targetName}</p>
                                    </div>
                                    <div className="md:col-span-3">
                                        <FormField control={form.control} name={`schedules.${idx}.newDate`} render={({ field: inputField }) => (
                                            <FormItem><FormLabel className="text-[8px] font-black uppercase text-muted-foreground">Audit Date</FormLabel><FormControl><Input type="date" {...inputField} className="h-8 text-[10px] bg-white" /></FormControl></FormItem>
                                        )} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <FormField control={form.control} name={`schedules.${idx}.newStartTime`} render={({ field: inputField }) => (
                                            <FormItem><FormLabel className="text-[8px] font-black uppercase text-muted-foreground">Start</FormLabel><FormControl><Input type="time" {...inputField} className="h-8 text-[10px] bg-white" /></FormControl></FormItem>
                                        )} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <FormField control={form.control} name={`schedules.${idx}.newEndTime`} render={({ field: inputField }) => (
                                            <FormItem><FormLabel className="text-[8px] font-black uppercase text-muted-foreground">End</FormLabel><FormControl><Input type="time" {...inputField} className="h-8 text-[10px] bg-white" /></FormControl></FormItem>
                                        )} />
                                    </div>
                                    <div className="md:col-span-1 flex justify-center pb-1">
                                        <Check className="h-4 w-4 text-emerald-500 opacity-40" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="p-6 border-t bg-slate-50 shrink-0">
                <div className="flex w-full items-center justify-between">
                    <Button type="button" variant="ghost" className="text-[10px] font-black uppercase tracking-widest" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <div className="flex gap-2">
                        {step === 1 ? (
                            <Button type="button" onClick={() => setStep(2)} className="h-10 px-8 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                                Next: Adjust Itinerary dates
                            </Button>
                        ) : (
                            <>
                                <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-10 px-6 font-black uppercase text-xs">Back</Button>
                                <Button type="submit" form="clone-form" disabled={isSubmitting} className="min-w-[200px] h-10 shadow-xl shadow-primary/20 font-black uppercase text-xs tracking-widest">
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4 mr-1.5" />}
                                    Establish Replicated Plan
                                </Button>
                            </>
                        )}
                    </div>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}