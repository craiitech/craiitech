
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import type { CorrectiveActionRequest, Campus, Unit, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    PlusCircle, 
    Trash2, 
    Edit, 
    ShieldCheck, 
    FileText, 
    ClipboardCheck, 
    Clock, 
    UserCheck, 
    Printer, 
    Search, 
    Filter, 
    TrendingUp, 
    AlertTriangle, 
    CheckCircle2, 
    Hash, 
    Eye, 
    ListTodo, 
    Info, 
    UserPlus, 
    User, 
    ShieldAlert, 
    Target, 
    History as HistoryIcon, 
    Calendar, 
    Link as LinkIcon, 
    ExternalLink 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { renderToStaticMarkup } from 'react-dom/server';
import { CARPrintTemplate } from './car-print-template';
import { cn } from '@/lib/utils';

interface CorrectiveActionRequestTabProps {
  campuses: Campus[];
  units: Unit[];
  canManage: boolean;
}

const carSchema = z.object({
  carNumber: z.string().min(1, 'CAR Number is required'),
  ncReportNumber: z.string().optional(),
  source: z.enum(['Audit Finding', 'Legal Non-compliance', 'Non-conforming Service', 'Others']),
  procedureTitle: z.string().min(1, 'Title of Procedure is required'),
  initiator: z.string().min(1, 'Initiator is required'),
  natureOfFinding: z.enum(['NC', 'OFI']),
  concerningClause: z.string().min(1, 'ISO Clause is required'),
  concerningTopManagementName: z.string().min(1, 'Top Management reference is required'),
  timeLimitForReply: z.string().min(1, 'Time limit for reply is required.'),
  unitId: z.string().min(1, 'Responsible unit is required'),
  campusId: z.string().min(1, 'Campus is required'),
  unitHead: z.string().min(1, 'Head of Unit is required'),
  descriptionOfNonconformance: z.string().min(1, 'Description is required'),
  requestDate: z.string().min(1, 'Request date is required'),
  preparedBy: z.string().min(1, 'Prepared by is required'),
  approvedBy: z.string().min(1, 'Approved by is required'),
  rootCauseAnalysis: z.string().optional(),
  actionSteps: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    type: z.enum(['Immediate Correction', 'Long-term Corrective Action']),
    completionDate: z.string().min(1, 'Date is required'),
    status: z.enum(['Pending', 'Completed']),
  })).optional(),
  evidences: z.array(z.object({
    title: z.string().min(1, 'Title is required'),
    url: z.string().url('Invalid Google Drive URL'),
  })).optional(),
  verificationRecords: z.array(z.object({
    result: z.string().min(1, 'Verification result is required'),
    resultVerifiedBy: z.string().min(1, 'Required'),
    resultVerificationDate: z.string().min(1, 'Required'),
    effectivenessResult: z.string().min(1, 'Verification of effectiveness is required'),
    effectivenessVerifiedBy: z.string().min(1, 'Required'),
    effectivenessVerificationDate: z.string().min(1, 'Required'),
    remarks: z.string().optional(),
  })).optional(),
  status: z.enum(['Open', 'In Progress', 'Closed']),
});

export function CorrectiveActionRequestTab({ campuses, units, canManage }: CorrectiveActionRequestTabProps) {
  const { userProfile, isAdmin, userRole, isAuditor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<CorrectiveActionRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');

  const carQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'correctiveActionRequests'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: rawCars, isLoading } = useCollection<CorrectiveActionRequest>(carQuery);

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const filteredCars = useMemo(() => {
    if (!rawCars || !userProfile) return [];

    const isInstitutionalViewer = isAdmin || isAuditor;
    const isCampusSupervisor = userRole === 'Campus Director' || userRole === 'Campus ODIMO';

    return rawCars.filter(car => {
        if (!isInstitutionalViewer) {
            if (isCampusSupervisor) {
                if (car.campusId !== userProfile.campusId) return false;
            } else {
                if (car.unitId !== userProfile.unitId) return false;
            }
        }

        const matchesSearch = 
            car.carNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            car.procedureTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (unitMap.get(car.unitId) || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const reqDate = car.requestDate instanceof Timestamp ? car.requestDate.toDate() : new Date(car.requestDate);
        const matchesYear = yearFilter === 'all' || reqDate.getFullYear().toString() === yearFilter;

        return matchesSearch && matchesYear;
    });
  }, [rawCars, searchTerm, yearFilter, unitMap, userProfile, isAdmin, isAuditor, userRole]);

  const years = useMemo(() => {
    if (!rawCars) return [];
    const yrs = new Set<string>();
    rawCars.forEach(car => {
        const date = car.requestDate instanceof Timestamp ? car.requestDate.toDate() : new Date(car.requestDate);
        yrs.add(date.getFullYear().toString());
    });
    return Array.from(yrs).sort((a,b) => b.localeCompare(a));
  }, [rawCars]);

  const stats = useMemo(() => {
    if (!filteredCars) return { total: 0, open: 0, closed: 0, resolutionRate: 0 };
    const total = filteredCars.length;
    const open = filteredCars.filter(c => c.status !== 'Closed').length;
    const closed = filteredCars.filter(c => c.status === 'Closed').length;
    const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    return { total, open, closed, resolutionRate };
  }, [filteredCars]);

  const form = useForm<z.infer<typeof carSchema>>({
    resolver: zodResolver(carSchema),
    defaultValues: { 
        source: 'Audit Finding', 
        natureOfFinding: 'NC', 
        status: 'Open',
        requestDate: format(new Date(), 'yyyy-MM-dd'),
        actionSteps: [],
        evidences: [],
        verificationRecords: []
    }
  });

  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({
    control: form.control,
    name: "actionSteps"
  });

  const { fields: evidenceFields, append: appendEvidence, remove: removeEvidence } = useFieldArray({
    control: form.control,
    name: "evidences"
  });

  const { fields: verificationFields, append: appendVerification, remove: removeVerification } = useFieldArray({
    control: form.control,
    name: "verificationRecords"
  });

  const watchCarNumber = form.watch('carNumber');
  const watchNcReportNumber = form.watch('ncReportNumber');

  const handlePrint = (car: CorrectiveActionRequest) => {
    const uName = unitMap.get(car.unitId) || 'Unknown Unit';
    const cName = campusMap.get(car.campusId) || 'Unknown Campus';

    try {
        const reportHtml = renderToStaticMarkup(
            <CARPrintTemplate car={car} unitName={uName} campusName={cName} signatories={signatories || undefined} />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>CAR - ${car.carNumber}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print { 
                            body { margin: 0; padding: 0; background: white; } 
                            .no-print { display: none !important; }
                        }
                        body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Official CAR Form</button>
                    </div>
                    <div id="print-content">
                        ${reportHtml}
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print error:", err);
        toast({ title: "Print Failed", description: "Could not generate printable form.", variant: "destructive" });
    }
  };

  const onSubmit = async (values: z.infer<typeof carSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const carData: any = {
        carNumber: values.carNumber,
        ncReportNumber: values.ncReportNumber || '',
        source: values.source,
        procedureTitle: values.procedureTitle,
        initiator: values.initiator,
        natureOfFinding: values.natureOfFinding,
        concerningClause: values.concerningClause,
        concerningTopManagementName: values.concerningTopManagementName,
        timeLimitForReply: Timestamp.fromDate(new Date(values.timeLimitForReply)),
        unitId: values.unitId,
        campusId: values.campusId,
        unitHead: values.unitHead,
        descriptionOfNonconformance: values.descriptionOfNonconformance,
        requestDate: Timestamp.fromDate(new Date(values.requestDate)),
        preparedBy: values.preparedBy,
        approvedBy: values.approvedBy,
        rootCauseAnalysis: values.rootCauseAnalysis || '',
        status: values.status,
        actionSteps: (values.actionSteps || []).map(step => ({
            description: step.description || '',
            type: step.type,
            completionDate: Timestamp.fromDate(new Date(step.completionDate)),
            status: step.status || 'Pending'
        })),
        evidences: values.evidences || [],
        verificationRecords: (values.verificationRecords || []).map(rec => ({
            result: rec.result || '',
            resultVerifiedBy: rec.resultVerifiedBy || '',
            resultVerificationDate: Timestamp.fromDate(new Date(rec.resultVerificationDate)),
            effectivenessResult: rec.effectivenessResult || '',
            effectivenessVerifiedBy: rec.effectivenessVerifiedBy || '',
            effectivenessVerificationDate: Timestamp.fromDate(new Date(rec.effectivenessVerificationDate)),
            remarks: rec.remarks || '',
        })),
        updatedAt: serverTimestamp(),
      };

      if (editingCar) {
        await updateDoc(doc(firestore, 'correctiveActionRequests', editingCar.id), carData);
        toast({ title: 'Success', description: 'CAR record updated.' });
      } else {
        await addDoc(collection(firestore, 'correctiveActionRequests'), {
          ...carData,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'New CAR registered in system.' });
      }
      setIsDialogOpen(false);
      form.reset();
      setEditingCar(null);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to save CAR record.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteDoc(doc(firestore, 'correctiveActionRequests', id));
      toast({ title: 'Success', description: 'Report deleted.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' });
    }
  };

  const handleEdit = (car: CorrectiveActionRequest) => {
    setEditingCar(car);
    const safeDate = (d: any) => d?.toDate ? format(d.toDate(), 'yyyy-MM-dd') : (d ? format(new Date(d), 'yyyy-MM-dd') : '');
    
    form.reset({
      ...car,
      requestDate: safeDate(car.requestDate),
      timeLimitForReply: safeDate(car.timeLimitForReply),
      actionSteps: (car.actionSteps || []).map(step => ({
          ...step,
          completionDate: safeDate(step.completionDate)
      })),
      evidences: car.evidences || [],
      verificationRecords: (car.verificationRecords || []).map(rec => ({
          ...rec,
          resultVerificationDate: safeDate(rec.resultVerificationDate),
          effectivenessVerificationDate: safeDate(rec.effectivenessVerificationDate)
      })),
    } as any);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black uppercase tracking-tight">Corrective Action Registry</h3>
        {canManage && (
          <Button onClick={() => setIsDialogOpen(true)} size="sm" className="shadow-lg shadow-primary/20">
            <PlusCircle className="mr-2 h-4 w-4" /> Issue New CAR
          </Button>
        )}
      </div>

      <Card className="shadow-sm border-primary/10 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-[10px] uppercase pl-6">CAR No. & Unit</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase">Procedure / Findings</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase">Deadline</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-center">Status</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCars.map((car) => (
                  <TableRow key={car.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-black text-xs text-primary">{car.carNumber}</span>
                        <span className="text-[10px] font-bold text-slate-700 mt-0.5">{unitMap.get(car.unitId) || '...'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold truncate">{car.procedureTitle}</span>
                            <span className="text-[10px] text-muted-foreground line-clamp-1 italic">"{car.descriptionOfNonconformance}"</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-[10px] font-black uppercase text-slate-600">
                        {safeFormatDate(car.timeLimitForReply)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={car.status === 'Open' ? 'destructive' : car.status === 'In Progress' ? 'secondary' : 'default'} className="text-[9px] font-black uppercase">
                        {car.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6 space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handlePrint(car)} className="h-8 text-[10px] font-bold">
                        PRINT
                      </Button>
                      <Button variant="default" size="sm" onClick={() => handleEdit(car)} className="h-8 text-[10px] font-bold">
                        {canManage ? 'MANAGE' : 'VIEW'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <DialogTitle>Issue Corrective Action Request (CAR)</DialogTitle>
            <DialogDescription>Capture non-conformance details and monitor the correction cycle.</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 bg-white">
            <div className="p-8">
                <Form {...form}>
                    <form id="car-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="carNumber" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-bold uppercase">CAR Number</FormLabel><FormControl><Input {...field} placeholder="e.g. 2025-001" className="bg-slate-50" /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="ncReportNumber" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-bold uppercase">NC Report No.</FormLabel><FormControl><Input {...field} placeholder="e.g. 2025-NC-01" className="bg-slate-50" /></FormControl></FormItem>
                            )} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField control={form.control} name="source" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-bold uppercase">Source</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent><SelectItem value="Audit Finding">Audit Finding</SelectItem><SelectItem value="Legal Non-compliance">Legal Non-compliance</SelectItem><SelectItem value="Non-conforming Service">Non-conforming Service</SelectItem><SelectItem value="Others">Others</SelectItem></SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="initiator" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-bold uppercase">Initiator</FormLabel><FormControl><Input {...field} className="bg-slate-50" /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="natureOfFinding" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-bold uppercase">Nature of Finding</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent><SelectItem value="NC">NC</SelectItem><SelectItem value="OFI">OFI</SelectItem></SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </div>

                        <FormField control={form.control} name="descriptionOfNonconformance" render={({ field }) => (
                            <FormItem><FormLabel className="text-sm font-black text-slate-800">Statement of Non-Conformance</FormLabel><FormControl><Textarea {...field} rows={4} className="bg-slate-50 italic" /></FormControl></FormItem>
                        )} />

                        <div className="pt-6 border-t space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Corrective Action Registry</h4>
                            {actionFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg border bg-muted/5 items-end relative group">
                                    <FormField control={form.control} name={`actionSteps.${index}.type`} render={({ field: inputField }) => (
                                        <FormItem><FormLabel className="text-[9px] uppercase font-bold">Action Type</FormLabel><Select onValueChange={inputField.onChange} value={inputField.value}><FormControl><SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Immediate Correction">Immediate Correction</SelectItem><SelectItem value="Long-term Corrective Action">Long-term Action</SelectItem></SelectContent></Select></FormItem>
                                    )} />
                                    <FormField control={form.control} name={`actionSteps.${index}.description`} render={({ field: inputField }) => (
                                        <FormItem className="md:col-span-2"><FormLabel className="text-[9px] uppercase font-bold">Action Taken</FormLabel><FormControl><Input {...inputField} className="h-8 text-[10px]" /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name={`actionSteps.${index}.completionDate`} render={({ field: inputField }) => (
                                        <FormItem><FormLabel className="text-[9px] uppercase font-bold">Target Date</FormLabel><FormControl><Input type="date" {...inputField} className="h-8 text-[10px]" /></FormControl></FormItem>
                                    )} />
                                    {canManage && <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAction(index)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                                </div>
                            ))}
                            {canManage && <Button type="button" variant="outline" size="sm" onClick={() => appendAction({ description: '', type: 'Immediate Correction', completionDate: format(new Date(), 'yyyy-MM-dd'), status: 'Pending' })} className="h-8 font-black text-[10px] uppercase"><PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Step</Button>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                            <FormField control={form.control} name="campusId" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-bold uppercase">Responsible Campus</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl><SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></FormItem>
                            )} />
                            <FormField control={form.control} name="unitId" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-bold uppercase">Responsible Unit</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select Unit" /></SelectTrigger></FormControl><SelectContent>{units.filter(u => u.campusIds?.includes(form.watch('campusId'))).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></FormItem>
                            )} />
                        </div>
                    </form>
                </Form>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Discard</Button>
            <Button type="submit" form="car-form" disabled={isSubmitting} className="min-w-[150px] shadow-xl shadow-primary/20 font-black">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
                {editingCar ? 'Update Registry' : 'Issue Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function safeFormatDate(d: any) {
    if (!d) return '--';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '--' : format(date, 'MMM dd, yyyy');
}
