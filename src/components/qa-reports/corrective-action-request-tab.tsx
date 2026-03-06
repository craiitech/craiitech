'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import type { CorrectiveActionRequest, Campus, Unit, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Trash2, Edit, ShieldCheck, FileText, ClipboardCheck, Clock, UserCheck, Printer, Search, Filter, TrendingUp, AlertTriangle, CheckCircle2, Hash, Eye, ListTodo, Info } from 'lucide-react';
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
        verificationRecords: []
    }
  });

  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({
    control: form.control,
    name: "actionSteps"
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
      verificationRecords: (car.verificationRecords || []).map(rec => ({
          ...rec,
          resultVerificationDate: safeDate(rec.resultVerificationDate),
          effectivenessVerificationDate: safeDate(rec.effectivenessVerificationDate)
      })),
    } as any);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><ClipboardCheck className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contextual CARs</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-primary tabular-nums">{stats.total}</div>
                <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">Requests in your scope</p>
            </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><CheckCircle2 className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Resolution Rate</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-emerald-600 tabular-nums">{stats.resolutionRate}%</div>
                <p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase tracking-tighter">Correction Closure</p>
            </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><TrendingUp className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-700">Open Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-amber-600 tabular-nums">{stats.open}</div>
                <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase tracking-tighter">Awaiting Implementation</p>
            </CardContent>
        </Card>
        <Card className="bg-rose-50 border-rose-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><AlertTriangle className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-rose-700">Non-Conformities</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-rose-600 tabular-nums">{filteredCars.filter(c => c.natureOfFinding === 'NC').length}</div>
                <p className="text-[9px] font-bold text-rose-600/70 mt-1 uppercase tracking-tighter">Critical gaps found</p>
            </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1 flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-72 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                    <Search className="h-2.5 w-2.5" /> Search My Scope
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search CAR No., Unit, or Procedure..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 text-xs"
                    />
                </div>
            </div>
            <div className="w-full md:w-40 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                    <Filter className="h-2.5 w-2.5" /> Request Year
                </label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
        {canManage && (
          <Button onClick={() => { setEditingCar(null); form.reset({ source: 'Audit Finding', natureOfFinding: 'NC', status: 'Open', requestDate: format(new Date(), 'yyyy-MM-dd'), actionSteps: [], verificationRecords: [] }); setIsDialogOpen(true); }} size="sm" className="h-9 shadow-lg shadow-primary/20 font-bold uppercase text-[10px] tracking-widest">
            <PlusCircle className="mr-2 h-4 w-4" /> Issue New CAR
          </Button>
        )}
      </div>

      <Card className="shadow-md border-primary/10 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase pl-6">CAR No. & Unit</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase">Procedure / Findings</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase">Oversight</TableHead>
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
                            <span className="text-[10px] font-bold text-slate-700 mt-0.5 truncate max-w-[150px]">{unitMap.get(car.unitId) || '...'}</span>
                            <span className="text-[9px] text-muted-foreground uppercase">{campusMap.get(car.campusId) || '...'}</span>
                        </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold truncate">{car.procedureTitle}</span>
                                <span className="text-[10px] text-muted-foreground line-clamp-1 italic">"{car.descriptionOfNonconformance}"</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="text-[10px] border-primary/20 text-primary font-bold w-fit">{car.concerningClause}</Badge>
                                <span className="text-[9px] font-bold text-slate-500 uppercase truncate max-w-[120px]">{car.concerningTopManagementName || 'Not Assigned'}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-center">
                        <Badge variant={car.status === 'Open' ? 'destructive' : car.status === 'In Progress' ? 'secondary' : 'default'} className="text-[9px] font-black uppercase shadow-sm border-none">
                            {car.status}
                        </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handlePrint(car)} 
                                    className="h-8 text-[10px] font-bold uppercase tracking-widest gap-1.5"
                                >
                                    <Printer className="h-3.5 w-3.5" /> PRINT
                                </Button>
                                <Button variant="default" size="sm" onClick={() => handleEdit(car)} className="h-8 text-[10px] font-bold uppercase tracking-widest bg-primary shadow-sm">
                                    {canManage ? 'MANAGE' : 'VIEW'}
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                    ))}
                    {!isLoading && filteredCars.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2 opacity-20">
                                <ClipboardCheck className="h-10 w-10" />
                                <p className="text-xs font-bold uppercase tracking-widest">No authorized CAR records found</p>
                            </div>
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary mb-1">
                    <FileText className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Form QAO-00-018</span>
                </div>
                {(watchCarNumber || watchNcReportNumber) && (
                    <div className="flex items-center gap-3">
                        {watchCarNumber && (
                            <Badge variant="outline" className="font-mono text-primary border-primary/30 h-6 px-2 text-[10px] font-black uppercase bg-primary/5">
                                CAR NO: {watchCarNumber}
                            </Badge>
                        )}
                        {watchNcReportNumber && (
                            <Badge variant="outline" className="font-mono text-muted-foreground border-slate-300 h-6 px-2 text-[10px] font-black uppercase bg-white">
                                NC NO: {watchNcReportNumber}
                            </Badge>
                        )}
                    </div>
                )}
            </div>
            <DialogTitle className="text-xl font-bold">{editingCar ? 'Manage' : 'Issue'} Corrective Action Request</DialogTitle>
            <DialogDescription className="text-xs">Formalized tracking of non-conformities and institutional improvements.</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 bg-white">
            <div className="p-8">
                <Form {...form}>
                    <form id="car-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                        <Tabs defaultValue="identification" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 h-12 bg-slate-100 p-1 mb-8">
                                <TabsTrigger value="identification" className="text-xs font-bold uppercase"><Info className="h-3.5 w-3.5 mr-2" /> Identification</TabsTrigger>
                                <TabsTrigger value="nonconformance" className="text-xs font-bold uppercase"><ShieldCheck className="h-3.5 w-3.5 mr-2" /> Statement</TabsTrigger>
                                <TabsTrigger value="investigation" className="text-xs font-bold uppercase"><History className="h-3.5 w-3.5 mr-2" /> Action Registry</TabsTrigger>
                                <TabsTrigger value="verification" className="text-xs font-bold uppercase"><ClipboardCheck className="h-3.5 w-3.5 mr-2" /> Verification</TabsTrigger>
                            </TabsList>

                            <TabsContent value="identification" className="space-y-6 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="carNumber" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">CAR Number</FormLabel><FormControl><Input {...field} placeholder="e.g. 2021-124" className="bg-slate-50 font-black text-primary" disabled={!canManage} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="ncReportNumber" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">NC Report No.</FormLabel><FormControl><Input {...field} placeholder="e.g. 2021-179" className="bg-slate-50" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                    <FormField control={form.control} name="concerningTopManagementName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-primary flex items-center gap-2">
                                                <UserCheck className="h-3.5 w-3.5" /> Concerning (Top Management / VP)
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter name of VP or Director" className="bg-primary/5 border-primary/20 h-10 font-bold" disabled={!canManage} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="timeLimitForReply" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5" /> Time Limit for Reply (Deadline)
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} className="bg-slate-50 h-10" disabled={!canManage} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                    <FormField control={form.control} name="source" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Source of Finding</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!canManage}>
                                                <FormControl><SelectTrigger className="bg-slate-50 font-medium"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Audit Finding">Audit Finding</SelectItem>
                                                    <SelectItem value="Legal Non-compliance">Legal Non-compliance</SelectItem>
                                                    <SelectItem value="Non-conforming Service">Non-conforming Service</SelectItem>
                                                    <SelectItem value="Others">Others</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="procedureTitle" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Title of Procedure</FormLabel><FormControl><Input {...field} placeholder="e.g. Conduct of BOR Meeting" className="bg-slate-50 font-medium" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormField control={form.control} name="initiator" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Initiator</FormLabel><FormControl><Input {...field} className="bg-slate-50" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="natureOfFinding" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Nature of Finding</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!canManage}>
                                                <FormControl><SelectTrigger className="bg-slate-50 font-medium"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent><SelectItem value="NC">Non-Conformance (NC)</SelectItem><SelectItem value="OFI">Opportunity for Improvement (OFI)</SelectItem></SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="concerningClause" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Concerning ISO Clause</FormLabel><FormControl><Input {...field} placeholder="e.g. 7.5.3.1" className="bg-slate-50" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                    <FormField control={form.control} name="campusId" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Responsible Campus</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!canManage}>
                                                <FormControl><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                                                <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="unitId" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Responsible Unit</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!canManage}>
                                                <FormControl><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select Unit" /></SelectTrigger></FormControl>
                                                <SelectContent>{units.filter(u => u.campusIds?.includes(form.watch('campusId'))).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>
                            </TabsContent>

                            <TabsContent value="nonconformance" className="space-y-6 animate-in fade-in duration-300">
                                <FormField control={form.control} name="descriptionOfNonconformance" render={({ field }) => (
                                    <FormItem><FormLabel className="text-sm font-black text-slate-800">Statement of Non-Conformance</FormLabel><FormControl><Textarea {...field} rows={6} className="bg-slate-50 text-xs italic font-medium leading-relaxed" disabled={!canManage} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                    <FormField control={form.control} name="requestDate" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold text-muted-foreground uppercase">Request Date</FormLabel><FormControl><Input type="date" {...field} className="bg-slate-50" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="preparedBy" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold text-muted-foreground uppercase">Prepared By</FormLabel><FormControl><Input {...field} className="bg-slate-50" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="approvedBy" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold text-muted-foreground uppercase">Approved By (QA Head)</FormLabel><FormControl><Input {...field} className="bg-slate-50" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                </div>
                            </TabsContent>

                            <TabsContent value="investigation" className="space-y-8 animate-in fade-in duration-300">
                                <FormField control={form.control} name="rootCauseAnalysis" render={({ field }) => (
                                    <FormItem><FormLabel className="text-sm font-black text-slate-800">Root Cause Analysis (Investigate cause of Non-Conformity)</FormLabel><FormControl><Textarea {...field} rows={4} className="bg-primary/5 border-primary/20" /></FormControl></FormItem>
                                )} />
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Proposed Action Strategy Registry</h4>
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => appendAction({ description: '', type: 'Immediate Correction', completionDate: format(new Date(), 'yyyy-MM-dd'), status: 'Pending' })}
                                            className="h-7 text-[9px] font-black uppercase bg-white shadow-sm"
                                        >
                                            <PlusCircle className="h-3 w-3 mr-1.5" /> Add Action Step
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {actionFields.map((field, index) => (
                                            <Card key={field.id} className="relative overflow-hidden group">
                                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAction(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                                    <FormField control={form.control} name={`actionSteps.${index}.type`} render={({ field: inputField }) => (
                                                        <FormItem className="md:col-span-1">
                                                            <FormLabel className="text-[9px] uppercase font-bold">Action Type</FormLabel>
                                                            <Select onValueChange={inputField.onChange} value={inputField.value}>
                                                                <FormControl><SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="Immediate Correction">Immediate Correction</SelectItem>
                                                                    <SelectItem value="Long-term Corrective Action">Long-term Action</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`actionSteps.${index}.description`} render={({ field: inputField }) => (
                                                        <FormItem className="md:col-span-1">
                                                            <FormLabel className="text-[9px] uppercase font-bold">Action Description</FormLabel>
                                                            <FormControl><Input {...inputField} className="h-8 text-[10px]" /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`actionSteps.${index}.completionDate`} render={({ field: inputField }) => (
                                                        <FormItem className="md:col-span-1">
                                                            <FormLabel className="text-[9px] uppercase font-bold">Target Completion</FormLabel>
                                                            <FormControl><Input type="date" {...inputField} className="h-8 text-[10px]" /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`actionSteps.${index}.status`} render={({ field: inputField }) => (
                                                        <FormItem className="md:col-span-1">
                                                            <FormLabel className="text-[9px] uppercase font-bold">Execution Status</FormLabel>
                                                            <Select onValueChange={inputField.onChange} value={inputField.value}>
                                                                <FormControl><SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="Pending">Pending</SelectItem>
                                                                    <SelectItem value="Completed">Completed</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )} />
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {actionFields.length === 0 && (
                                            <div className="py-10 text-center border border-dashed rounded-lg bg-muted/10">
                                                <ListTodo className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No specific action steps defined</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-6 border-t">
                                    <FormField control={form.control} name="unitHead" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Head of Unit Signature (Typed)</FormLabel><FormControl><Input {...field} className="bg-slate-50 font-bold" /></FormControl></FormItem>
                                    )} />
                                </div>
                            </TabsContent>

                            <TabsContent value="verification" className="space-y-8 animate-in fade-in duration-300">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Verification & Follow-up History</h4>
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            onClick={() => appendVerification({ 
                                                result: '', 
                                                resultVerifiedBy: '', 
                                                resultVerificationDate: format(new Date(), 'yyyy-MM-dd'),
                                                effectivenessResult: '', 
                                                effectivenessVerifiedBy: '', 
                                                effectivenessVerificationDate: format(new Date(), 'yyyy-MM-dd'),
                                                remarks: '' 
                                            })}
                                            className="h-7 text-[9px] font-black uppercase shadow-lg shadow-primary/20"
                                        >
                                            <UserPlus className="h-3 w-3 mr-1.5" /> Add Verification Record
                                        </Button>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        {verificationFields.map((field, index) => (
                                            <Card key={field.id} className="relative border-primary/10 overflow-hidden group shadow-md">
                                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeVerification(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <CardHeader className="bg-muted/30 py-3 border-b">
                                                    <CardTitle className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                                                        <ClipboardCheck className="h-3.5 w-3.5" />
                                                        Verification Cycle #{index + 1}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-6 space-y-8">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-primary opacity-60" />
                                                            <h5 className="text-[11px] font-black uppercase text-slate-700 tracking-tight">Part 1: Verification Findings / Result</h5>
                                                        </div>
                                                        <FormField control={form.control} name={`verificationRecords.${index}.result`} render={({ field: inputField }) => (
                                                            <FormItem>
                                                                <FormControl><Textarea {...inputField} rows={3} placeholder="Record the actual observations and findings..." className="text-xs bg-slate-50 border-slate-200" /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <FormField control={form.control} name={`verificationRecords.${index}.resultVerifiedBy`} render={({ field: inputField }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground">Result Verified By</FormLabel>
                                                                    <FormControl>
                                                                        <div className="relative">
                                                                            <User className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                                                                            <Input {...inputField} placeholder="Verifier Name" className="h-8 text-[10px] pl-7" />
                                                                        </div>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )} />
                                                            <FormField control={form.control} name={`verificationRecords.${index}.resultVerificationDate`} render={({ field: inputField }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground">Date Verified</FormLabel>
                                                                    <FormControl>
                                                                        <div className="relative">
                                                                            <Calendar className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                                                                            <Input type="date" {...inputField} className="h-8 text-[10px] pl-7" />
                                                                        </div>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )} />
                                                        </div>
                                                    </div>

                                                    <Separator />

                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2">
                                                            <ShieldCheck className="h-4 w-4 text-emerald-600 opacity-60" />
                                                            <h5 className="text-[11px] font-black uppercase text-emerald-800 tracking-tight">Part 2: Verification of Effectiveness</h5>
                                                        </div>
                                                        <FormField control={form.control} name={`verificationRecords.${index}.effectivenessResult`} render={({ field: inputField }) => (
                                                            <FormItem>
                                                                <FormControl><Textarea {...inputField} rows={3} placeholder="Describe how effective the implemented actions were in preventing recurrence..." className="text-xs bg-emerald-50/20 border-emerald-100" /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <FormField control={form.control} name={`verificationRecords.${index}.effectivenessVerifiedBy`} render={({ field: inputField }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[9px] font-bold uppercase text-emerald-700/70">Effectiveness Verified By</FormLabel>
                                                                    <FormControl>
                                                                        <div className="relative">
                                                                            <User className="absolute left-2 top-2.5 h-3 w-3 text-emerald-400" />
                                                                            <Input {...inputField} placeholder="Verifier Name" className="h-8 text-[10px] pl-7 border-emerald-100" />
                                                                        </div>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )} />
                                                            <FormField control={form.control} name={`verificationRecords.${index}.effectivenessVerificationDate`} render={({ field: inputField }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[9px] font-bold uppercase text-emerald-700/70">Date of Effectiveness Verification</FormLabel>
                                                                    <FormControl>
                                                                        <div className="relative">
                                                                            <Calendar className="absolute left-2 top-2.5 h-3 w-3 text-emerald-400" />
                                                                            <Input type="date" {...inputField} className="h-8 text-[10px] pl-7 border-emerald-100" />
                                                                        </div>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )} />
                                                        </div>
                                                    </div>

                                                    <FormField control={form.control} name={`verificationRecords.${index}.remarks`} render={({ field: inputField }) => (
                                                        <FormItem className="pt-2">
                                                            <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground">General Remarks (Optional)</FormLabel>
                                                            <FormControl><Input {...inputField} placeholder="Any other observations..." className="h-8 text-[10px]" /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {verificationFields.length === 0 && (
                                            <div className="py-16 text-center border border-dashed rounded-lg bg-muted/10">
                                                <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-2" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Awaiting initial verification</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-6 border-t space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Closure Determination</h4>
                                    <FormField control={form.control} name="status" render={({ field }) => (
                                        <FormItem className="max-w-xs">
                                            <FormLabel className="text-[10px] font-black uppercase text-primary">Current Lifecycle Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="bg-primary/5 border-primary/20 font-black h-10"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Open">Open</SelectItem>
                                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                                    <SelectItem value="Closed">Closed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="p-6 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-3">
                                    <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                                        As per ISO 21001 requirements, verification of effectiveness should ideally occur at regular intervals after implementation to ensure long-term stability of the correction. Multiple verification records help demonstrate sustainable improvement.
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </form>
                </Form>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0">
            <div className="flex w-full items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">RSU Quality Management System | Registry v2.0</p>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Discard</Button>
                    <Button type="submit" form="car-form" disabled={isSubmitting} className="min-w-[150px] shadow-xl shadow-primary/20 font-black">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
                        {editingCar ? 'Update Registry' : 'Issue Record'}
                    </Button>
                </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
