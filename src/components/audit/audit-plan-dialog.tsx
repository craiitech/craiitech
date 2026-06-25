'use client';

/**
 * @fileOverview A dialog component for creating or editing audit plans.
 */

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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, Timestamp, query, getDocs, orderBy, limit, where } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import type { AuditPlan, Campus, User, AuditGroup, ISOClause } from '@/lib/types';
import { Loader2, LayoutList, ShieldCheck, FileText, CalendarCheck, Globe, ListChecks, Info, Database, Check, Trash2, PlusCircle, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn, parseDate } from '@/lib/utils';

interface AuditPlanDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: AuditPlan | null;
  campuses: Campus[];
}

const currentYear = new Date().getFullYear();
const yearsList = Array.from({ length: 10 }, (_, i) => String(currentYear - 5 + i));

const auditGroups: AuditGroup[] = ['Management Processes', 'Operation Processes', 'Support Processes'];

const formSchema = z.object({
  auditNumber: z.string().min(1, 'Audit Number is required (e.g. 2025-001).'),
  auditType: z.enum(['Regular Audit', 'Special Audit']),
  title: z.string().min(5, 'Title must be descriptive.'),
  year: z.number(),
  campusId: z.string().min(1, 'Target campus site is required.'),
  auditeeType: z.array(z.string()).min(1, 'Select at least one process group.'),
  groupClauseMapping: z.record(z.string(), z.array(z.string())).optional(),
  scope: z.string().min(10, 'Please provide a clear scope statement.'),
  leadAuditorId: z.string().min(1, 'Please designate a Lead Auditor.'),
  referenceDocument: z.string().min(1, 'Reference document is required.'),
  openingMeetingDate: z.string().min(1, 'Opening meeting date/time is required.'),
  closingMeetingDate: z.string().min(1, 'Closing meeting date/time is required.'),
  documents: z.array(z.object({
    name: z.string().min(1, 'Document name is required.'),
    link: z.string().url('Please enter a valid Google Drive or document URL.'),
    communicationId: z.string().optional(),
    communicationRefNum: z.string().optional(),
    communicationSubject: z.string().optional(),
  })).optional(),
}).refine(
  (data) => {
    if (!data.openingMeetingDate || !data.closingMeetingDate) return true;
    return new Date(data.openingMeetingDate) < new Date(data.closingMeetingDate);
  },
  {
    message: 'Opening meeting must precede closing meeting.',
    path: ['closingMeetingDate'],
  }
);

export function AuditPlanDialog({ isOpen, onOpenChange, plan, campuses }: AuditPlanDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comms, setComms] = useState<any[]>([]);
  const [isLoadingComms, setIsLoadingComms] = useState(false);

  const fetchCommunications = async () => {
    if (comms.length > 0 || isLoadingComms || !firestore) return;
    setIsLoadingComms(true);
    try {
      const q = query(
        collection(firestore, 'communications'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = list.filter((c: any) => c.driveLink);
      setComms(filtered);
    } catch (e) {
      console.error("Error fetching comms for linking:", e);
    } finally {
      setIsLoadingComms(false);
    }
  };

  const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  const isoClausesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'isoClauses') : null), [firestore]);
  const { data: isoClauses } = useCollection<ISOClause>(isoClausesQuery);

  const auditors = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => 
        u.role?.toLowerCase().includes('auditor') || 
        u.role?.toLowerCase().includes('admin')
    ).sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
  }, [allUsers]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      auditNumber: '',
      auditType: 'Regular Audit',
      title: '',
      year: currentYear,
      campusId: '',
      auditeeType: [],
      groupClauseMapping: {
          'Management Processes': [],
          'Operation Processes': [],
          'Support Processes': []
      },
      scope: '',
      leadAuditorId: '',
      referenceDocument: 'ISO 21001:2018 / EOMS Standard',
      openingMeetingDate: '',
      closingMeetingDate: '',
      documents: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'documents'
  });

  useEffect(() => {
    if (plan && isOpen) {
      const safeDate = (d: any) => {
          if (!d) return '';
          const date = parseDate(d);
          if (isNaN(date.getTime())) return '';
          return format(date, "yyyy-MM-dd'T'HH:mm");
      };

      form.reset({
        auditNumber: plan.auditNumber || '',
        auditType: plan.auditType || 'Regular Audit',
        title: plan.title || '',
        year: plan.year || currentYear,
        campusId: plan.campusId || '',
        auditeeType: plan.auditeeType || [],
        groupClauseMapping: plan.groupClauseMapping || {
            'Management Processes': [],
            'Operation Processes': [],
            'Support Processes': []
        },
        scope: plan.scope || '',
        leadAuditorId: plan.leadAuditorId || '',
        referenceDocument: plan.referenceDocument || 'ISO 21001:2018 / EOMS Standard',
        openingMeetingDate: safeDate(plan.openingMeetingDate),
        closingMeetingDate: safeDate(plan.closingMeetingDate),
        documents: plan.documents || [],
      });
    } else if (!plan && isOpen) {
        form.reset({
            auditNumber: '',
            auditType: 'Regular Audit',
            title: '',
            year: currentYear,
            campusId: '',
            auditeeType: [],
            groupClauseMapping: {
                'Management Processes': [],
                'Operation Processes': [],
                'Support Processes': []
            },
            scope: '',
            leadAuditorId: '',
            referenceDocument: 'ISO 21001:2018 / EOMS Standard',
            openingMeetingDate: '',
            closingMeetingDate: '',
            documents: [],
        });
    }
  }, [plan, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    const id = plan ? plan.id : doc(collection(firestore, 'dummy')).id;
    const planRef = doc(firestore, 'auditPlans', id);

    const leadAuditor = auditors.find(a => a.id === values.leadAuditorId);

    const planData: any = {
      id,
      ...values,
      leadAuditorName: leadAuditor ? `${leadAuditor.firstName} ${leadAuditor.lastName}` : (plan?.leadAuditorName || 'Unknown Auditor'),
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

  const selectedGroups = form.watch('auditeeType') || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95dvh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-primary mb-1">
            <LayoutList className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Institutional Framework Provisioning</span>
          </div>
          <DialogTitle>{plan ? 'Modify' : 'Establish'} Detailed Audit Plan</DialogTitle>
          <DialogDescription className="text-xs">
            Configure institutional parameters, process groups, and meeting milestones.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 bg-white">
            <Form {...form}>
                <form id="plan-form" onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-12">
                    
                    {/* SECTION 1: REGISTRY INFO */}
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
                                        <SelectContent modal={false}>
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
                                        <SelectContent modal={false}>{yearsList.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
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

                    {/* SECTION 2: SCOPE & GROUPS */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">2. Scope & Process Groups</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <FormField control={form.control} name="campusId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase">Target Site / Campus</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select Site" /></SelectTrigger></FormControl>
                                            <SelectContent modal={false}>
                                                <SelectItem value="university-wide" className="font-bold text-primary italic">
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="h-3 w-3" />
                                                        University-Wide Audit
                                                    </div>
                                                </SelectItem>
                                                {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                                
                                <FormField control={form.control} name="auditeeType" render={() => (
                                    <FormItem>
                                        <div className="mb-4">
                                            <FormLabel className="text-[10px] font-black uppercase text-primary">Active Audit Process Groups</FormLabel>
                                            <FormDescription className="text-[9px]">Check groups to enable standard clause mapping for each below.</FormDescription>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {auditGroups.map((group) => (
                                                <FormField
                                                    key={group}
                                                    control={form.control}
                                                    name="auditeeType"
                                                    render={({ field }) => {
                                                        const isChecked = field.value?.includes(group);
                                                        return (
                                                            <FormItem
                                                                key={group}
                                                                className={cn("flex flex-row items-center space-x-3 space-y-0 p-3 rounded-lg border transition-all cursor-pointer", isChecked ? "bg-primary/5 border-primary/20" : "bg-muted/5 hover:bg-muted/10")}
                                                            >
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={isChecked}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...field.value, group])
                                                                                : field.onChange(field.value?.filter((value) => value !== group))
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="text-xs font-bold cursor-pointer flex-1">
                                                                    {group}
                                                                </FormLabel>
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="space-y-6">
                                <FormField control={form.control} name="referenceDocument" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-bold uppercase">Audit Reference Document</FormLabel><FormControl><Input {...field} className="bg-slate-50 font-medium" /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="scope" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase">Detailed Statement of Scope & Criteria</FormLabel>
                                        <FormControl><Textarea {...field} placeholder="Specific processes, clauses, and units covered..." rows={6} className="bg-slate-50 italic text-xs leading-relaxed" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: STRATEGIC CLAUSE MAPPING */}
                    <div className="space-y-6 pt-6">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <ListChecks className="h-4 w-4 text-primary" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">3. Strategic Standard Clause Mapping (Itinerary Presets)</h4>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-blue-800 font-medium leading-relaxed italic">
                                Map ISO 21001:2018 clauses to each process group. These selections will appear as "Presets" when provisioning individual unit itinerary entries, ensuring institutional consistency.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {auditGroups.map((group) => {
                                const isEnabled = selectedGroups.includes(group);
                                return (
                                    <Card key={group} className={cn("border-primary/10 transition-all shadow-sm flex flex-col h-[400px]", !isEnabled && "opacity-30 pointer-events-none grayscale")}>
                                        <CardHeader className="py-3 px-4 bg-muted/30 border-b">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-tight truncate">{group.replace(' Processes', '')}</CardTitle>
                                                {isEnabled && (
                                                    <Badge variant="secondary" className="h-4 text-[8px] font-black tabular-nums">
                                                        {(form.watch(`groupClauseMapping.${group}`) || []).length} Mapped
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col bg-white">
                                            <FormField 
                                                control={form.control} 
                                                name={`groupClauseMapping.${group}`} 
                                                render={({ field }) => (
                                                    <Command className="flex-1 flex flex-col overflow-hidden">
                                                        <div className="p-2 border-b">
                                                            <CommandInput placeholder="Search clauses..." className="h-8 text-[10px]" />
                                                        </div>
                                                        <CommandList className="flex-1 max-h-none">
                                                            <CommandEmpty className="p-4 text-center text-[10px] text-muted-foreground uppercase font-bold">No matches</CommandEmpty>
                                                            <CommandGroup>
                                                                {isoClauses?.map(clause => {
                                                                    const currentVal = field.value || [];
                                                                    const isSelected = currentVal.includes(clause.id);
                                                                    return (
                                                                        <CommandItem
                                                                            key={clause.id}
                                                                            value={`${clause.id} ${clause.title}`}
                                                                            onSelect={() => {
                                                                                const next = isSelected 
                                                                                    ? currentVal.filter(id => id !== clause.id)
                                                                                    : [...currentVal, clause.id];
                                                                                field.onChange(next);
                                                                            }}
                                                                            className="cursor-pointer flex items-center gap-3 px-4 py-3"
                                                                        >
                                                                            <div className={cn(
                                                                                "h-4 w-4 border rounded flex items-center justify-center shrink-0 transition-colors",
                                                                                isSelected ? "bg-primary border-primary text-white" : "border-slate-300"
                                                                            )}>
                                                                                {isSelected && <Check className="h-3 w-3" />}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className={cn("text-[11px] leading-tight mb-0.5", isSelected ? "font-black text-primary" : "font-bold text-slate-700")}>Clause {clause.id}</p>
                                                                                <p className="text-[9px] text-muted-foreground truncate">{clause.title}</p>
                                                                            </div>
                                                                        </CommandItem>
                                                                    );
                                                                })}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 4: MEETINGS */}
                    <div className="space-y-6 pt-6 border-t">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <CalendarCheck className="h-4 w-4 text-primary" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">4. Lead Auditor & Meeting Milestones</h4>
                        </div>
                        <FormField control={form.control} name="leadAuditorId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-primary">Lead Auditor (Institutional Lead)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-11 font-bold bg-primary/5 border-primary/20"><SelectValue placeholder="Designate Lead Auditor" /></SelectTrigger></FormControl>
                                    <SelectContent modal={false}>
                                        {auditors.map(a => <SelectItem key={a.id} value={a.id}>{a.firstName} {a.lastName}</SelectItem>)}
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

                    {/* SECTION 5: PLAN DOCUMENTS */}
                    <div className="space-y-6 pt-6 border-t">
                        <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">5. Plan Documents (Google Drive Links)</h4>
                            </div>
                            <Button 
                                type="button" 
                                size="sm" 
                                onClick={() => append({ name: '', link: '' })}
                                className="h-7 text-[10px] font-black uppercase tracking-widest gap-1"
                            >
                                <PlusCircle className="h-3.5 w-3.5" />
                                Add Document
                            </Button>
                        </div>
                        
                        {fields.length === 0 ? (
                            <div className="text-center py-6 border border-dashed rounded-xl bg-slate-50/50">
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">No reference documents added yet</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Add Google Drive links to EOMS templates or audit scope files.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="space-y-4 bg-slate-50/50 p-4 rounded-xl border">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dashed pb-2">
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Document Ref #{index + 1}</span>
                                            {form.watch(`documents.${index}.communicationId`) ? (
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[8px] tracking-widest gap-1 border-none shadow-sm">
                                                        <Check className="h-2.5 w-2.5" />
                                                        EOMS Linked: {form.watch(`documents.${index}.communicationRefNum`)}
                                                    </Badge>
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => {
                                                            form.setValue(`documents.${index}.communicationId`, "");
                                                            form.setValue(`documents.${index}.communicationRefNum`, "");
                                                            form.setValue(`documents.${index}.communicationSubject`, "");
                                                        }}
                                                        className="h-5 px-1.5 text-[8px] font-black uppercase text-destructive tracking-widest hover:bg-destructive/5"
                                                    >
                                                        Unlink
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="w-full sm:w-[260px] md:w-[320px]">
                                                    <Select 
                                                        onOpenChange={(open) => open && fetchCommunications()}
                                                        onValueChange={(val) => {
                                                            const comm = comms.find(c => c.id === val);
                                                            if (comm) {
                                                                const ref = comm.senderRefNum || (comm.recipientRefNums ? Object.values(comm.recipientRefNums)[0] : '') || 'N/A';
                                                                form.setValue(`documents.${index}.name`, `[${comm.kind}] ${comm.subject}`);
                                                                form.setValue(`documents.${index}.link`, comm.driveLink || '');
                                                                form.setValue(`documents.${index}.communicationId`, comm.id);
                                                                form.setValue(`documents.${index}.communicationRefNum`, ref);
                                                                form.setValue(`documents.${index}.communicationSubject`, comm.subject);
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-7 text-[9px] font-black uppercase tracking-wider bg-white border-primary/20 text-primary shadow-xs">
                                                            <SelectValue placeholder={isLoadingComms ? "Loading Communications..." : "Link EOMS Memo / Travel Order"} />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-white border-primary/20 max-w-[320px]">
                                                            {comms.map(c => {
                                                                const ref = c.senderRefNum || (c.recipientRefNums ? Object.values(c.recipientRefNums)[0] : '') || 'N/A';
                                                                return (
                                                                    <SelectItem key={c.id} value={c.id} className="text-[9px] font-bold uppercase tracking-wider text-primary truncate max-w-[310px]">
                                                                        [{c.kind}] {c.subject} ({ref})
                                                                    </SelectItem>
                                                                );
                                                            })}
                                                            {comms.length === 0 && !isLoadingComms && (
                                                                <div className="p-2 text-center text-[9px] text-muted-foreground uppercase font-black">No attachable memos found</div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-4 items-start">
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name={`documents.${index}.name`}
                                                    render={({ field: inputField }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[9px] font-bold uppercase">Document Title / Name</FormLabel>
                                                            <FormControl>
                                                                <Input {...inputField} placeholder="e.g. Audit Scope Document / EOMS Form 02" className="h-9 bg-white font-bold" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`documents.${index}.link`}
                                                    render={({ field: inputField }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[9px] font-bold uppercase">Google Drive Link (URL)</FormLabel>
                                                            <FormControl>
                                                                <Input {...inputField} placeholder="https://drive.google.com/..." className="h-9 bg-white font-medium" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                className="mt-6 text-destructive hover:bg-destructive/5 hover:text-destructive shrink-0"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
