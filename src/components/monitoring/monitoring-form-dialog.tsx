
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
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc, Timestamp, query, where, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import type { UnitMonitoringRecord, Campus, Unit, Submission } from '@/lib/types';
import { monitoringChecklistItems, monitoringGroups } from '@/lib/monitoring-checklist-items';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, CalendarIcon, ClipboardCheck, Circle, AlertCircle, FileWarning, CheckCircle2, Info, LayoutList } from 'lucide-react';
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
}

const formSchema = z.object({
  visitDate: z.date({ required_error: 'Date of visit is required.' }),
  campusId: z.string().min(1, 'Please select a campus.'),
  unitId: z.string().min(1, 'Please select a unit.'),
  roomNumber: z.string().optional(),
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
    "Objectives Monitoring": "Quality Objectives Monitoring",
    "Risk and Opportunity Registry": "Risk and Opportunity Registry",
    "Risk and Opportunity Action Plan": "Risk and Opportunity Action Plan"
};

export function MonitoringFormDialog({ isOpen, onOpenChange, record, campuses, units }: MonitoringFormDialogProps) {
  const { userProfile, isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      visitDate: new Date(),
      campusId: '',
      unitId: '',
      roomNumber: '',
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
  const visitDateValue = form.watch('visitDate');
  const selectedYear = visitDateValue ? visitDateValue.getFullYear() : new Date().getFullYear();

  const unitsForCampus = useMemo(() => {
    if (!units) return [];
    return units.filter(u => u.campusIds?.includes(selectedCampusId));
  }, [units, selectedCampusId]);

  // Fetch submissions for the selected unit to show missing ones
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

  const missingReports = useMemo(() => {
    if (!submissions || !selectedUnitId) return [];

    const coreReports = [
        "Operational Plan",
        "Objectives Monitoring",
        "Risk and Opportunity Registry",
        "Risk and Opportunity Action Plan"
    ];

    const results: { name: string; missing: string[]; isNA?: boolean }[] = [];

    // Check Action Plan Requirement (Only required if Registry rating is medium-high)
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

  // AUTOMATION: Automatically flag "Not Available" and add remarks for missing portal submissions
  useEffect(() => {
    if (!record && missingReports.length > 0 && isOpen) {
        missingReports.forEach(missingInfo => {
            const index = monitoringChecklistItems.findIndex(item => item === missingInfo.name);
            if (index !== -1) {
                const cyclesStr = missingInfo.missing.join(' & ');
                form.setValue(`observations.${index}.status`, 'Not Available');
                form.setValue(`observations.${index}.remarks`, `Need to submit the updated ${missingInfo.name} and the ${cyclesStr} cycle(s).`);
            }
        });
    }
  }, [missingReports, record, isOpen, form]);

  useEffect(() => {
    if (isOpen) {
      if (record) {
        const visitDate = record.visitDate instanceof Timestamp ? record.visitDate.toDate() : new Date(record.visitDate);
        form.reset({
          ...record,
          visitDate,
          roomNumber: record.roomNumber || '',
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
          visitDate: new Date(),
          campusId: '',
          unitId: '',
          roomNumber: '',
          officerInCharge: '',
          generalRemarks: '',
          observations: monitoringChecklistItems.map(item => ({ item, status: 'Available', remarks: '' })),
        });
      }
    }
  }, [record, isOpen, form]);

  useEffect(() => {
    if(!record && isOpen) {
        const currentUnitId = form.getValues('unitId');
        if (currentUnitId && !unitsForCampus.some(u => u.id === currentUnitId)) {
            form.setValue('unitId', '');
        }
    }
  }, [selectedCampusId, form, record, isOpen, unitsForCampus]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !userProfile) {
      toast({ title: 'Error', description: 'User not logged in.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    const recordData = {
      ...values,
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
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 border-b bg-card shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
                <ClipboardCheck className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-widest">IQA & Field Monitoring</span>
            </div>
            <DialogHeader>
                <DialogTitle className="text-xl">
                    {isReadOnly ? 'Viewing' : (record ? 'Edit' : 'New')} Unit Monitoring Record
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm font-normal">
                    {isReadOnly ? 'Findings from the official on-site monitoring visit.' : 'Record objective observations and findings from on-site unit monitoring visits.'}
                </DialogDescription>
            </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">
                {/* Visit Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <FormField control={form.control} name="visitDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Visit</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild disabled={isReadOnly}>
                          <FormControl>
                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>
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
                  )} />
                  <FormField control={form.control} name="campusId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campus</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select Campus" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="unitId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly || !selectedCampusId}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{unitsForCampus.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="roomNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office / Room #</FormLabel>
                      <FormControl><Input {...field} value={field.value || ''} placeholder="e.g., Room 101" disabled={isReadOnly} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="officerInCharge" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Officer in Charge</FormLabel>
                      <FormControl><Input {...field} value={field.value || ''} placeholder="Name of official" disabled={isReadOnly} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* EOMS Submission Reference Helper */}
                {selectedUnitId && !isLoadingSubmissions && (
                    <Card className="border-blue-200 bg-blue-50/30">
                        <CardHeader className="py-3 bg-blue-50">
                            <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
                                <Info className="h-4 w-4" />
                                EOMS Submission Compliance Helper (Reference for Year {selectedYear})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4">
                            {missingReports.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-blue-900 mb-2">The following core documents are MISSING from the submission portal:</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {missingReports.map((report, idx) => (
                                            <div key={idx} className="flex items-start gap-2 bg-white p-2 rounded border border-blue-100 shadow-sm">
                                                <FileWarning className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-bold">{report.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">Missing Cycles: <span className="text-destructive font-semibold">{report.missing.join(' & ')}</span></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 text-green-700">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <p className="text-xs font-bold">Full Compliance: This unit has submitted all core EOMS documents for both First and Final cycles.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Categorized Checklist Table */}
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
                                        const internalReportName = eomsReportMap[field.item];
                                        const missingReportInfo = missingReports.find(r => r.name === field.item);
                                        
                                        return (
                                            <TableRow key={field.id} className="hover:bg-muted/20">
                                                <TableCell className="font-medium text-sm py-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span>{field.item}</span>
                                                        {internalReportName && !isLoadingSubmissions && (
                                                            missingReportInfo ? (
                                                                <Badge variant="destructive" className="w-fit text-[9px] h-4 py-0 font-bold uppercase tracking-tighter">
                                                                    Missing in Portal: {missingReportInfo.missing.join('/')}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="w-fit text-[9px] h-4 py-0 bg-green-100 text-green-700 border-green-200">
                                                                    Submitted in Portal
                                                                </Badge>
                                                            )
                                                        )}
                                                    </div>
                                                </TableCell>
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
                                                                <SelectItem value="Available">Available</SelectItem>
                                                                <SelectItem value="Not Available">Not Available</SelectItem>
                                                                <SelectItem value="For Improvement">For Improvement</SelectItem>
                                                                <SelectItem value="Needs Updating">Needs Updating</SelectItem>
                                                                <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                                                                <SelectItem value="Need to revisit">Need to revisit</SelectItem>
                                                            </SelectContent>
                                                            </Select>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                    )} />
                                                </TableCell>
                                                <TableCell>
                                                    <FormField control={form.control} name={`observations.${index}.remarks`} render={({ field: remarksField }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder={isReadOnly ? "" : "Add findings..."} {...remarksField} value={remarksField.value || ''} className="h-8 text-xs bg-background" disabled={isReadOnly} />
                                                        </FormControl>
                                                        <FormMessage />
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

                {/* General Remarks */}
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

            <div className="p-6 border-t bg-card shrink-0">
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        {isReadOnly ? 'Close' : 'Cancel'}
                    </Button>
                    {!isReadOnly && (
                        <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {record ? 'Update Record' : 'Save Monitoring Record'}
                        </Button>
                    )}
                </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
