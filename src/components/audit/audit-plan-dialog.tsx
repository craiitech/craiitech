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
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import type { AuditPlan, Campus, User } from '@/lib/types';
import { Loader2, LayoutList, ShieldCheck, FileText, CalendarCheck } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { format } from 'date-fns';

interface AuditPlanDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: AuditPlan | null;
  campuses: Campus[];
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

const formSchema = z.object({
  auditNumber: z.string().min(1, 'Audit Number is required (e.g. 2025-001).'),
  auditType: z.enum(['Regular Audit', 'Special Audit']),
  title: z.string().min(5, 'Title must be descriptive.'),
  year: z.number(),
  campusId: z.string().min(1, 'Target campus site is required.'),
  auditeeType: z.enum(['Management Processes', 'Operation Processes', 'Support Processes']),
  scope: z.string().min(10, 'Please provide a clear scope statement.'),
  leadAuditorId: z.string().min(1, 'Please designate a Lead Auditor.'),
  referenceDocument: z.string().min(1, 'Reference document is required.'),
  openingMeetingDate: z.string().min(1, 'Opening meeting date/time is required.'),
  closingMeetingDate: z.string().min(1, 'Closing meeting date/time is required.'),
});

export function AuditPlanDialog({ isOpen, onOpenChange, plan, campuses }: AuditPlanDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all users to find potential auditors (more resilient than role string exact match)
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  const auditors = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => 
        u.role?.toLowerCase().includes('auditor') || 
        u.role?.toLowerCase().includes('admin')
    ).sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [allUsers]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      auditNumber: '',
      auditType: 'Regular Audit',
      title: '',
      year: currentYear,
      campusId: '',
      auditeeType: 'Operation Processes',
      scope: '',
      leadAuditorId: '',
      referenceDocument: 'ISO 21001:2018 / EOMS Standard',
      openingMeetingDate: '',
      closingMeetingDate: '',
    },
  });

  useEffect(() => {
    if (plan && isOpen) {
      const safeDate = (d: any) => {
          if (!d) return '';
          let date: Date;
          if (d.toDate && typeof d.toDate === 'function') date = d.toDate();
          else if (d.seconds) date = new Date(d.seconds * 1000);
          else date = new Date(d);
          
          if (isNaN(date.getTime())) return '';
          return format(date, "yyyy-MM-dd'T'HH:mm");
      };

      form.reset({
        auditNumber: plan.auditNumber || '',
        auditType: plan.auditType || 'Regular Audit',
        title: plan.title || '',
        year: plan.year || currentYear,
        campusId: plan.campusId || '',
        auditeeType: plan.auditeeType || 'Operation Processes',
        scope: plan.scope || '',
        leadAuditorId: plan.leadAuditorId || '',
        referenceDocument: plan.referenceDocument || 'ISO 21001:2018 / EOMS Standard',
        openingMeetingDate: safeDate(plan.openingMeetingDate),
        closingMeetingDate: safeDate(plan.closingMeetingDate),
      });
    } else if (!plan && isOpen) {
        form.reset({
            auditNumber: '',
            auditType: 'Regular Audit',
            title: '',
            year: currentYear,
            campusId: '',
            auditeeType: 'Operation Processes',
            scope: '',
            leadAuditorId: '',
            referenceDocument: 'ISO 21001:2018 / EOMS Standard',
            openingMeetingDate: '',
            closingMeetingDate: '',
        });
    }
  }, [plan, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    const id = plan ? plan.id : doc(collection(firestore, 'dummy')).id;
    const planRef = doc(firestore, 'auditPlans', id);

    const leadAuditor = auditors.find(a => a.id === values.leadAuditorId);

    // Explicitly define save object to ensure Timestamps overwrite form strings
    const planData: any = {
      id,
      auditNumber: values.auditNumber,
      auditType: values.auditType,
      title: values.title,
      year: values.year,
      campusId: values.campusId,
      auditeeType: values.auditeeType,
      scope: values.scope,
      leadAuditorId: values.leadAuditorId,
      leadAuditorName: leadAuditor ? `${leadAuditor.firstName} ${leadAuditor.lastName}` : (plan?.leadAuditorName || 'Unknown Auditor'),
      referenceDocument: values.referenceDocument,
      openingMeetingDate: Timestamp.fromDate(new Date(values.openingMeetingDate)),
      closingMeetingDate: Timestamp.fromDate(new Date(values.closingMeetingDate)),
      updatedAt: serverTimestamp(),
    };
    
    try {
        await setDoc(planRef, planData, { merge: true });
        toast({ title: 'Plan Saved', description: `Institutional Audit Plan ${values.auditNumber} has been updated.` });
        onOpenChange(false);
    } catch (error) {
        console.error('Error saving audit plan:', error);
        toast({ title: 'Operational Error', description: 'Could not establish audit plan.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-primary mb-1">
            <LayoutList className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Institutional Framework Provisioning</span>
          </div>
          <DialogTitle>{plan ? 'Modify' : 'Establish'} Detailed Audit Plan</DialogTitle>
          <DialogDescription className="text-xs">
            Configure institutional parameters, audit team, and meeting milestones.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
            <Form {...form}>
                <form id="plan-form" onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-10">
                    
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">1. Institutional Registry Info</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField control={form.control} name="auditNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">No. of Audit</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g. 2025-001" className="h-10 font-mono font-bold" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="auditType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Audit Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Regular Audit">Regular Audit</SelectItem>
                                            <SelectItem value="Special Audit">Special Audit</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="year" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Academic Year</FormLabel>
                                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                        <FormControl><SelectTrigger className="h-10 font-bold"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase">Plan Title / Description</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g. FY 2025 Annual Internal Quality Audit" className="h-11 font-bold" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">2. Scope & Site Context</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="campusId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Target Site / Campus</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select Site" /></SelectTrigger></FormControl>
                                        <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="auditeeType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Audit Process Group</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Management Processes">Management Processes</SelectItem>
                                            <SelectItem value="Operation Processes">Operation Processes</SelectItem>
                                            <SelectItem value="Support Processes">Support Processes</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="referenceDocument" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase">Audit Reference Document</FormLabel>
                                <FormControl><Input {...field} className="bg-slate-50 font-medium" /></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="scope" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase">Detailed Statement of Scope & Criteria</FormLabel>
                                <FormControl><Textarea {...field} placeholder="Specific processes, clauses, and units covered..." rows={4} className="bg-slate-50 italic text-xs leading-relaxed" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <CalendarCheck className="h-4 w-4 text-primary" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">3. Audit Team & Key Meetings</h4>
                        </div>
                        <FormField control={form.control} name="leadAuditorId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-primary">Lead Auditor (Institutional Lead)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-11 font-bold bg-primary/5 border-primary/20"><SelectValue placeholder="Designate Lead Auditor" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {auditors.map(a => <SelectItem key={a.id} value={a.id}>{a.firstName} {a.lastName}</SelectItem>)}
                                        {auditors.length === 0 && <div className="p-4 text-xs italic text-muted-foreground">No qualified auditors found.</div>}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="openingMeetingDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Opening Meeting (Date/Time)</FormLabel>
                                    <FormControl><Input type="datetime-local" {...field} className="bg-slate-50" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="closingMeetingDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Closing Meeting (Date/Time)</FormLabel>
                                    <FormControl><Input type="datetime-local" {...field} className="bg-slate-50" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </div>
                </form>
            </Form>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="plan-form" disabled={isSubmitting} className="min-w-[160px] shadow-xl shadow-primary/20 font-black uppercase text-xs">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {plan ? 'Update Framework' : 'Establish Framework'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
