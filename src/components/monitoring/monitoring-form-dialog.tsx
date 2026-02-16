'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc, Timestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import type { UnitMonitoringRecord, Campus, Unit, Submission, ProcedureManual } from '@/lib/types';
import { monitoringChecklistItems, monitoringGroups, statusLegend } from '@/lib/monitoring-checklist-items';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ClipboardCheck, Circle, FileWarning, CheckCircle2, Info, LayoutList, Printer, BookOpen, BookMarked, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '../ui/table';
import { Badge } from '../ui/badge';

interface MonitoringFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  record: UnitMonitoringRecord | null;
  campuses: Campus[];
  units: Unit[];
  onPrint?: (record: UnitMonitoringRecord) => void;
}

const months = [
  { value: '0', label: 'January' }, { value: '1', label: 'February' }, { value: '2', label: 'March' },
  { value: '3', label: 'April' }, { value: '4', label: 'May' }, { value: '5', label: 'June' },
  { value: '6', label: 'July' }, { value: '7', label: 'August' }, { value: '8', label: 'September' },
  { value: '9', label: 'October' }, { value: '10', label: 'November' }, { value: '11', label: 'December' },
];
const currentYear = new Date().getFullYear();
const yearsList = Array.from({ length: 2076 - (currentYear - 10) + 1 }, (_, i) => String(currentYear - 10 + i));
const daysList = Array.from({ length: 31 }, (_, i) => String(i + 1));

const formSchema = z.object({
  visitMonth: z.string().min(1, 'Month is required'),
  visitDay: z.string().min(1, 'Day is required'),
  visitYear: z.string().min(1, 'Year is required'),
  campusId: z.string().min(1, 'Please select a campus.'),
  unitId: z.string().min(1, 'Please select a unit.'),
  roomNumber: z.string().optional(),
  building: z.string().optional(),
  officerInCharge: z.string().optional(),
  observations: z.array(z.object({
    item: z.string(),
    status: z.enum(['Available', 'Not Available', 'For Improvement', 'Not Applicable', 'Need to revisit', 'Needs Updating']),
    remarks: z.string().optional(),
  })),
  generalRemarks: z.string().optional(),
});

const statusColors: Record<string, string> = {
  'Available': 'text-green-500 fill-green-500',
  'Not Available': 'text-red-500 fill-red-500',
  'For Improvement': 'text-amber-500 fill-amber-500',
  'Not Applicable': 'text-muted-foreground fill-muted-foreground',
  'Need to revisit': 'text-blue-500 fill-blue-500',
  'Needs Updating': 'text-indigo-500 fill-indigo-500',
};

const eomsReportMap: Record<string, string> = {
    "Operational Plan": "Operational Plan",
    "Quality Objectives Monitoring": "Quality Objectives Monitoring",
    "Risk and Opportunity Registry": "Risk and Opportunity Registry",
    "Risk and Opportunity Action Plan": "Risk and Opportunity Action Plan",
    "SWOT Analysis": "SWOT Analysis",
    "Needs and Expectation of Interested Parties": "Needs and Expectation of Interested Parties"
};

export function MonitoringFormDialog({ isOpen, onOpenChange, record, campuses, units, onPrint }: MonitoringFormDialogProps) {
  const { userProfile, isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      visitMonth: String(new Date().getMonth()),
      visitDay: String(new Date().getDate()),
      visitYear: String(new Date().getFullYear()),
      campusId: '',
      unitId: '',
      roomNumber: '',
      building: '',
      officerInCharge: '',
      generalRemarks: '',
      observations: monitoringChecklistItems.map(item => ({
        item,
        status: 'Available',
        remarks: ''
      })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'observations',
  });

  const selectedCampusId = form.watch('campusId');
  const selectedUnitId = form.watch('unitId');
  const visitYearValue = form.watch('visitYear');
  const observationsValue = form.watch('observations');
  
  const selectedYear = useMemo(() => visitYearValue ? Number(visitYearValue) : new Date().getFullYear(), [visitYearValue]);

  // AUTOMATION: Handle "Not Applicable" status change automatically populating remarks
  useEffect(() => {
    observationsValue?.forEach((obs, index) => {
      if (obs.status === 'Not Applicable' && obs.remarks !== 'Not Applicable to this Room') {
        form.setValue(`observations.${index}.remarks`, 'Not Applicable to this Room');
      }
    });
  }, [observationsValue, form]);

  const unitsForCampus = useMemo(() => {
    if (!units) return [];
    return units.filter(u => u.campusIds?.includes(selectedCampusId));
  }, [units, selectedCampusId]);

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedUnitId || !selectedCampusId || !isOpen) return null;
    return query(
        collection(firestore, 'submissions'),
        where('unitId', '==', selectedUnitId),
        where('campusId', '==', selectedCampusId),
        where('year', '==', selectedYear)
    );
  }, [firestore, selectedUnitId, selectedCampusId, selectedYear, isOpen]);

  const { data: submissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const manualRef = useMemoFirebase(() => {
    if (!firestore || !selectedUnitId || !isOpen) return null;
    return doc(firestore, 'procedureManuals', selectedUnitId);
  }, [firestore, selectedUnitId, isOpen]);

  const { data: unitManual } = useDoc<ProcedureManual>(manualRef);

  const missingReports = useMemo(() => {
    if (!submissions || !selectedUnitId) return [];

    const coreReports = [
        "Operational Plan",
        "Quality Objectives Monitoring",
        "Risk and Opportunity Registry",
        "Risk and Opportunity Action Plan",
        "SWOT Analysis",
        "Needs and Expectation of Interested Parties"
    ];

    const results: { name: string; missing: string[]; isNA?: boolean }[] = [];

    const firstRegistry = submissions.find(s => s.reportType === 'Risk and Opportunity Registry' && s.cycleId === 'first');
    const finalRegistry = submissions.find(s => s.reportType === 'Risk and Opportunity Registry' && s.cycleId === 'final');
    
    coreReports.forEach(checklistLabel => {
        const portalReportName = eomsReportMap[checklistLabel];
        const missingCycles: string[] = [];
        const first = submissions.find(s => s.reportType === portalReportName && s.cycleId === 'first');
        const final = submissions.find(s => s.reportType === portalReportName && s.cycleId === 'final');

        let isFirstNA = false;
        let isFinalNA = false;

        if (checklistLabel === "Risk and Opportunity Action Plan") {
            if (firstRegistry && firstRegistry.riskRating === 'low') isFirstNA = true;
            if (finalRegistry && finalRegistry.riskRating === 'low') isFinalNA = true;
        }

        if (!first && !isFirstNA) missingCycles.push('First');
        if (!final && !isFinalNA) missingCycles.push('Final');

        if (missingCycles.length > 0) {
            results.push({ name: checklistLabel, missing: missingCycles });
        }
    });

    return results;
  }, [submissions, selectedUnitId]);

  useEffect(() => {
    if (!record && isOpen && form) {
        if (missingReports.length > 0) {
            missingReports.forEach(missingInfo => {
                const index = monitoringChecklistItems.findIndex(item => item === missingInfo.name);
                if (index !== -1) {
                    const cyclesStr = missingInfo.missing.join(' & ');
                    form.setValue(`observations.${index}.status`, 'Not Available');
                    form.setValue(`observations.${index}.remarks`, `Need to submit the updated ${missingInfo.name} and the ${cyclesStr} cycle(s).`);
                }
            });
        }

        if (unitManual) {
            const index = monitoringChecklistItems.findIndex(item => item === "Procedure Manual");
            if (index !== -1) {
                form.setValue(`observations.${index}.status`, 'Available');
                const rev = unitManual.revisionNumber || '00';
                const date = unitManual.dateImplemented || 'TBA';
                form.setValue(`observations.${index}.remarks`, `Verified current manual: Rev ${rev} (${date}).`);
            }
        }
    }
  }, [missingReports, unitManual, record, isOpen, form]);

  useEffect(() => {
    if (isOpen) {
      if (record) {
        const vDate = record.visitDate instanceof Timestamp ? record.visitDate.toDate() : new Date(record.visitDate);
        form.reset({
          ...record,
          visitMonth: String(vDate.getMonth()),
          visitDay: String(vDate.getDate()),
          visitYear: String(vDate.getFullYear()),
          roomNumber: record.roomNumber || '',
          building: record.building || '',
          officerInCharge: record.officerInCharge || '',
          generalRemarks: record.generalRemarks || '',
          observations: monitoringChecklistItems.map(item => {
            const existing = record.observations?.find(obs => obs.item === item);
            return {
              item,
              status: existing?.status || 'Available',
              remarks: existing?.remarks || '',
            };
          }),
        });
      } else {
        form.reset({
          visitMonth: String(new Date().getMonth()),
          visitDay: String(new Date().getDate()),
          visitYear: String(new Date().getFullYear()),
          campusId: '',
          unitId: '',
          roomNumber: '',
          building: '',
          officerInCharge: '',
          generalRemarks: '',
          observations: monitoringChecklistItems.map(item => ({ item, status: 'Available', remarks: '' })),
        });
      }
    }
  }, [record, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);

    const visitDate = new Date(Number(values.visitYear), Number(values.visitMonth), Number(values.visitDay));

    // CRITICAL: Ensure campusId and unitId are explicitly included in the document
    const recordData = {
      ...values,
      visitDate,
      monitorId: userProfile.id,
      monitorName: `${userProfile.firstName} ${userProfile.lastName}`,
    };

    try {
      if (record) {
        const recordRef = doc(firestore, 'unitMonitoringRecords', record.id);
        await setDoc(recordRef, { ...recordData, createdAt: record.createdAt }, { merge: true });
        toast({ title: 'Success', description: 'Monitoring record updated.' });
      } else {
        const collectionRef = collection(firestore, 'unitMonitoringRecords');
        await addDoc(collectionRef, { ...recordData, createdAt: serverTimestamp() });
        toast({ title: 'Success', description: 'New monitoring record saved.' });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving monitoring record:", error);
      toast({ title: 'Error', description: 'Could not save record.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = !isAdmin;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-[1400px] h-[95vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 border-b bg-card shrink-0 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <ClipboardCheck className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">IQA & Field Monitoring</span>
                    </div>
                    <DialogTitle className="text-xl">
                        {isReadOnly ? 'Viewing' : (record ? 'Edit' : 'New')} Unit Monitoring Record
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm font-normal">
                        Record on-site visit findings and verify EOMS documentation compliance.
                    </DialogDescription>
                </div>
                {record && onPrint && (
                    <Button variant="outline" size="sm" onClick={() => onPrint(record)}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Report
                    </Button>
                )}
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 border-r bg-background">
                <Form {...form}>
                    <form id="monitoring-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-8">
                                {/* Header Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 bg-muted/20 p-4 rounded-lg border">
                                    <div className="space-y-2 lg:col-span-1">
                                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider">Date of Visit</FormLabel>
                                        <div className="grid grid-cols-3 gap-1">
                                            <FormField control={form.control} name="visitMonth" render={({ field }) => (
                                                <FormItem>
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                                                        <FormControl><SelectTrigger className="px-1 h-9 text-[10px]"><SelectValue placeholder="Mo" /></SelectTrigger></FormControl>
                                                        <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="visitDay" render={({ field }) => (
                                                <FormItem>
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                                                        <FormControl><SelectTrigger className="px-1 h-9 text-[10px]"><SelectValue placeholder="Day" /></SelectTrigger></FormControl>
                                                        <SelectContent>{daysList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="visitYear" render={({ field }) => (
                                                <FormItem>
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                                                        <FormControl><SelectTrigger className="px-1 h-9 text-[10px]"><SelectValue placeholder="Yr" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {yearsList.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                        </div>
                                    </div>
                                    <FormField control={form.control} name="campusId" render={({ field }) => (
                                        <FormItem className="lg:col-span-1">
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider">Campus</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Campus" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="unitId" render={({ field }) => (
                                        <FormItem className="lg:col-span-1">
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider">Unit</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly || !selectedCampusId}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Unit" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>{unitsForCampus.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="roomNumber" render={({ field }) => (
                                        <FormItem className="lg:col-span-1">
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider">Office / Room #</FormLabel>
                                            <FormControl><Input {...field} value={field.value || ''} placeholder="e.g., Room 101" className="h-9 text-xs" disabled={isReadOnly} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="building" render={({ field }) => (
                                        <FormItem className="lg:col-span-1">
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider">Building</FormLabel>
                                            <FormControl><Input {...field} value={field.value || ''} placeholder="e.g., CET Building" className="h-9 text-xs" disabled={isReadOnly} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="officerInCharge" render={({ field }) => (
                                        <FormItem className="lg:col-span-1">
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider">Officer in Charge</FormLabel>
                                            <FormControl><Input {...field} value={field.value || ''} placeholder="Name" className="h-9 text-xs" disabled={isReadOnly} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">1</div>
                                        Verification Checklist
                                    </h3>
                                    <div className="border rounded-lg overflow-hidden shadow-sm">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="w-[40%]">Monitoring Item / Document</TableHead>
                                                    <TableHead className="w-[20%]">Status</TableHead>
                                                    <TableHead className="w-[40%]">Remarks / Findings</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {monitoringGroups.map((group) => (
                                                <React.Fragment key={group.category}>
                                                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-y">
                                                        <TableCell colSpan={3} className="py-2 px-4">
                                                            <div className="flex items-center gap-2 font-bold text-primary text-[10px] uppercase tracking-wider">
                                                                <LayoutList className="h-3 w-3" />
                                                                {group.category}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                    {group.items.map((itemName) => {
                                                        const index = fields.findIndex(f => f.item === itemName);
                                                        if (index === -1) return null;
                                                        
                                                        const field = fields[index];
                                                        return (
                                                            <TableRow key={field.id} className="hover:bg-muted/20">
                                                                <TableCell className="font-medium text-sm py-3">{field.item}</TableCell>
                                                                <TableCell>
                                                                    <FormField control={form.control} name={`observations.${index}.status`} render={({ field: statusField }) => (
                                                                    <FormItem>
                                                                        <FormControl>
                                                                            <Select onValueChange={statusField.onChange} value={statusField.value || 'Available'} disabled={isReadOnly}>
                                                                            <SelectTrigger className={cn("h-8 text-xs bg-background flex items-center gap-2", statusColors[statusField.value]?.split(' ')[0])}>
                                                                                <Circle className={cn("h-2 w-2", statusColors[statusField.value])} />
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {statusLegend.map(l => (
                                                                                    <SelectItem key={l.status} value={l.status}>{l.status}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                            </Select>
                                                                        </FormControl>
                                                                    </FormItem>
                                                                    )} />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <FormField control={form.control} name={`observations.${index}.remarks`} render={({ field: remarksField }) => (
                                                                    <FormItem>
                                                                        <FormControl>
                                                                            <Input placeholder={isReadOnly ? "" : "Add findings..."} {...remarksField} value={remarksField.value || ''} className="h-8 text-xs bg-background" disabled={isReadOnly} />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                    )} />
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">2</div>
                                        Final Assessment
                                    </h3>
                                    <FormField control={form.control} name="generalRemarks" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>General Remarks / Summary of Visit</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} value={field.value || ''} rows={5} placeholder={isReadOnly ? "" : "Provide an overall summary..."} disabled={isReadOnly} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )} />
                                </div>
                            </div>
                        </ScrollArea>
                    </form>
                </Form>
            </div>

            {/* Right Panel: LEGEND and REFERENCE */}
            <div className="hidden lg:flex w-[400px] flex-col bg-muted/10 border-l shrink-0">
                <div className="p-4 border-b font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 bg-white">
                    <Info className="h-4 w-4" /> Reference Panel
                </div>
                <ScrollArea className="flex-1 p-6 space-y-6">
                    {/* Status Legend Section */}
                    <Card className="border-primary/20 shadow-sm overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-primary/5 border-b">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <HelpCircle className="h-3.5 w-3.5" /> Status Legend & Criteria
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y text-[11px]">
                                {statusLegend.map((item) => (
                                    <div key={item.status} className="p-3 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Circle className={cn("h-2 w-2", statusColors[item.status])} />
                                            <span className="font-bold uppercase tracking-tighter">{item.status}</span>
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed italic">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* EOMS Compliance Reference (Dynamic) */}
                    {selectedUnitId && !isLoadingSubmissions && (
                        <Card className="border-blue-200 shadow-sm bg-blue-50/20 overflow-hidden">
                            <CardHeader className="py-3 px-4 bg-blue-50 border-b">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-800 flex items-center gap-2">
                                    <BookMarked className="h-3.5 w-3.5" /> Portal Submissions ({selectedYear})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {missingReports.length > 0 ? (
                                    <div className="space-y-2">
                                        {missingReports.map((report, idx) => (
                                            <div key={idx} className="flex items-start gap-2 bg-white p-2 rounded border border-blue-100">
                                                <FileWarning className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold truncate">{report.name}</p>
                                                    <p className="text-[9px] text-muted-foreground">Missing: <span className="text-destructive font-semibold">{report.missing.join(' & ')}</span></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-green-700 bg-white p-3 rounded border border-green-100">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <p className="text-[10px] font-bold">All Required Reports Found</p>
                                    </div>
                                )}

                                <div className="pt-2 border-t mt-2">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase mb-2">Procedure Manual</p>
                                    {unitManual ? (
                                        <div className="flex items-center gap-2 bg-white p-2 rounded border border-green-100">
                                            <BookOpen className="h-3.5 w-3.5 text-green-600" />
                                            <p className="text-[10px] font-medium truncate">Registered Rev {unitManual.revisionNumber}</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 bg-white p-2 rounded border border-amber-100 text-amber-700">
                                            <FileWarning className="h-3.5 w-3.5" />
                                            <p className="text-[10px] font-medium">No manual found in portal.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </ScrollArea>
            </div>
        </div>

        <div className="p-6 border-t bg-card shrink-0 shadow-inner">
            <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                    {isReadOnly ? 'Close' : 'Cancel'}
                </Button>
                {!isReadOnly && (
                    <Button type="submit" form="monitoring-form" disabled={isSubmitting} className="min-w-[150px] shadow-lg shadow-primary/20">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {record ? 'Update Record' : 'Save Monitoring Record'}
                    </Button>
                )}
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
