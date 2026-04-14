'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp, where } from 'firebase/firestore';
import type { CorrectiveActionRequest, Campus, Unit, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
    ExternalLink,
    ArrowUpDown,
    TableProperties,
    ListChecks,
    ChevronRight,
    Gavel,
    BookOpen
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
import { CARControlRegisterTemplate } from './car-control-register-template';
import { cn } from '@/lib/utils';
import { MultiSelector } from './multi-selector';

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
  rootCauseAnalysis: z.string().optional().or(z.literal('')),
  actionSteps: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    type: z.enum(['Immediate Correction', 'Long-term Corrective Action']),
    completionDate: z.string().min(1, 'Date is required'),
    status: z.enum(['Pending', 'Completed']),
    evidenceLink: z.string().url('Invalid URL').optional().or(z.literal('')),
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

type SortKey = 'carNumber' | 'unit' | 'deadline' | 'status';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

export function CorrectiveActionRequestTab({ campuses, units, canManage: initialCanManage }: CorrectiveActionRequestTabProps) {
  const { userProfile, isAdmin, userRole, isAuditor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<CorrectiveActionRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'carNumber', direction: 'desc' });

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

  const processedCars = useMemo(() => {
    if (!rawCars || !userProfile) return [];

    const isInstitutionalViewer = isAdmin || isAuditor || (userRole && /auditor/i.test(userRole));
    const isCampusSupervisor = userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president');

    let result = rawCars.filter(car => {
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
        
        if (!matchesSearch) return false;

        const reqDate = car.requestDate instanceof Timestamp ? car.requestDate.toDate() : new Date(car.requestDate);
        const matchesYear = yearFilter === 'all' || reqDate.getFullYear().toString() === yearFilter;

        return matchesYear;
    });

    if (sortConfig) {
        const { key, direction } = sortConfig;
        result.sort((a, b) => {
            let valA: any, valB: any;
            
            switch(key) {
                case 'carNumber': valA = a.carNumber; valB = b.carNumber; break;
                case 'unit': valA = unitMap.get(a.unitId) || ''; valB = unitMap.get(b.unitId) || ''; break;
                case 'status': valA = a.status; valB = b.status; break;
                case 'deadline':
                    valA = a.timeLimitForReply?.toMillis?.() || new Date(a.timeLimitForReply).getTime();
                    valB = b.timeLimitForReply?.toMillis?.() || new Date(b.timeLimitForReply).getTime();
                    break;
                default: valA = ''; valB = '';
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return result;
  }, [rawCars, searchTerm, yearFilter, sortConfig, unitMap, userProfile, isAdmin, isAuditor, userRole]);

  const carStats = useMemo(() => {
    const total = processedCars.length;
    const open = processedCars.filter(c => c.status === 'Open').length;
    const inProgress = processedCars.filter(c => c.status === 'In Progress').length;
    const closed = processedCars.filter(c => c.status === 'Closed').length;
    const successRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    return { total, open, inProgress, closed, successRate };
  }, [processedCars]);

  const years = useMemo(() => {
    if (!rawCars) return [];
    const yrs = new Set<string>();
    rawCars.forEach(car => {
        const date = car.requestDate instanceof Timestamp ? car.requestDate.toDate() : new Date(car.requestDate);
        yrs.add(date.getFullYear().toString());
    });
    return Array.from(yrs).sort((a,b) => b.localeCompare(a));
  }, [rawCars]);

  const form = useForm<z.infer<typeof carSchema>>({
    resolver: zodResolver(carSchema),
    defaultValues: { 
        carNumber: '',
        ncReportNumber: '',
        source: 'Audit Finding', 
        natureOfFinding: 'NC', 
        procedureTitle: '',
        initiator: '',
        concerningClause: '',
        concerningTopManagementName: '',
        timeLimitForReply: '',
        unitId: '',
        campusId: '',
        unitHead: '',
        descriptionOfNonconformance: '',
        rootCauseAnalysis: '',
        preparedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '',
        approvedBy: signatories?.qaoDirector || '',
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

  const { fields: verificationFields, append: appendVerification, remove: removeVerification } = useFieldArray({
    control: form.control,
    name: "verificationRecords"
  });

  const watchRootCause = form.watch('rootCauseAnalysis');
  const isInvestigationComplete = !!watchRootCause && watchRootCause.trim().length > 10;

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    return <ArrowUpDown className={cn("h-3 w-3 ml-1.5 transition-colors", sortConfig?.key === key ? "text-primary opacity-100" : "opacity-20")} />;
  };

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
            printWindow.document.write(`<html><head><title>CAR - ${car.carNumber}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print { body { margin: 0; padding: 0; background: white; } .no-print { display: none !important; } } body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Official CAR Form</button></div><div id="print-content">${reportHtml}</div></body></html>`);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print error:", err);
        toast({ title: "Print Failed", description: "Could not generate printable form.", variant: "destructive" });
    }
  };

  const handlePrintRegistry = () => {
    if (!processedCars.length) return;

    try {
        const reportHtml = renderToStaticMarkup(
            <CARControlRegisterTemplate 
                cars={processedCars} 
                unitMap={unitMap} 
                year={yearFilter} 
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>CAR Control Register - ${yearFilter}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print { 
                            @page { size: landscape; margin: 0.5in; }
                            body { margin: 0; padding: 0; background: white; } 
                            .no-print { display: none !important; }
                        }
                        body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print" style="padding: 20px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: center;">
                        <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                            Click to Print Matrix
                        </button>
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
        toast({ title: "Print Failed", description: "Could not generate control register.", variant: "destructive" });
    }
  };

  const onSubmit = async (values: z.infer<typeof carSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const carData: any = {
        ...values,
        ncReportNumber: values.ncReportNumber || '',
        concerningTopManagementName: values.concerningTopManagementName || '',
        rootCauseAnalysis: values.rootCauseAnalysis || '',
        timeLimitForReply: Timestamp.fromDate(new Date(values.timeLimitForReply)),
        requestDate: Timestamp.fromDate(new Date(values.requestDate)),
        actionSteps: (values.actionSteps || []).map(step => ({
            ...step,
            evidenceLink: step.evidenceLink || '',
            completionDate: Timestamp.fromDate(new Date(step.completionDate))
        })),
        verificationRecords: (values.verificationRecords || []).map(rec => ({
            ...rec,
            remarks: rec.remarks || '',
            resultVerificationDate: Timestamp.fromDate(new Date(rec.resultVerificationDate)),
            effectivenessVerificationDate: Timestamp.fromDate(new Date(rec.effectivenessVerificationDate))
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
      ncReportNumber: car.ncReportNumber || '',
      concerningTopManagementName: car.concerningTopManagementName || '',
      rootCauseAnalysis: car.rootCauseAnalysis || '',
      requestDate: safeDate(car.requestDate),
      timeLimitForReply: safeDate(car.timeLimitForReply),
      actionSteps: (car.actionSteps || []).map(step => ({
          ...step,
          evidenceLink: step.evidenceLink || '',
          completionDate: safeDate(step.completionDate)
      })),
      verificationRecords: (car.verificationRecords || []).map(rec => ({
          ...rec,
          remarks: rec.remarks || '',
          resultVerificationDate: safeDate(rec.resultVerificationDate),
          effectivenessVerificationDate: safeDate(rec.effectivenessVerificationDate)
      })),
    } as any);
    setIsDialogOpen(true);
  };

  const safeFormatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return format(d, 'PP');
  };

  const isInstitutionalViewer = isAdmin || isAuditor || (userRole && /auditor/i.test(userRole));
  const canIssueNew = isInstitutionalViewer;

  const isFieldReadOnly = (fieldName: string) => {
    if (isAdmin) return false;
    
    if (fieldName.startsWith('verificationRecords')) {
        return !isInstitutionalViewer;
    }

    const responderFields = ['rootCauseAnalysis', 'actionSteps', 'status'];
    if (responderFields.includes(fieldName)) {
        return userProfile?.unitId !== form.getValues('unitId');
    }
    
    return true; 
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Issued Requests</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-primary tabular-nums">{carStats.total}</div>
                <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">Total CARs Logged</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><FileText className="h-12 w-12" /></div>
        </Card>

        <Card className="bg-rose-50 border-rose-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-700">Outstanding Gaps</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-rose-600 tabular-nums">{carStats.open}</div>
                <p className="text-[9px] font-bold text-rose-600/70 mt-1 uppercase">Open Status</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><ShieldAlert className="h-12 w-12 text-rose-600" /></div>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Implementation</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-amber-600 tabular-nums">{carStats.inProgress}</div>
                <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase">In Progress</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><Clock className="h-12 w-12 text-amber-600" /></div>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Verified Closure</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-emerald-600 tabular-nums">
                    {carStats.total > 0 ? Math.round((carStats.closed / carStats.total) * 100) : 0}%
                </div>
                <p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase">Resolved Non-Conformances</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><CheckCircle2 className="h-12 w-12 text-emerald-600" /></div>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Success Rate</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-blue-600 tabular-nums">{carStats.successRate}%</div>
                <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase">Closure Maturity</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><TrendingUp className="h-12 w-12 text-blue-600" /></div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1 flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                    <Search className="h-2.5 w-2.5" /> Search Registry
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search CAR No, Unit, or Procedure..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-10 shadow-sm bg-background border-primary/10"
                    />
                </div>
            </div>
            <div className="w-full md:w-48 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                    <Calendar className="h-2.5 w-2.5" /> Fiscal Year
                </label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="h-10 bg-background border-primary/10 font-bold shadow-sm">
                        <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All recorded years</SelectItem>
                        {years.map(y => <SelectItem key={y} value={y}>AY {y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                onClick={handlePrintRegistry} 
                disabled={processedCars.length === 0}
                className="h-10 bg-white border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest gap-2"
            >
                <TableProperties className="h-4 w-4" />
                Print Control Register
            </Button>
            {canIssueNew && (
            <Button onClick={() => {
                setEditingCar(null);
                form.reset({
                    carNumber: '',
                    ncReportNumber: '',
                    source: 'Audit Finding', 
                    natureOfFinding: 'NC', 
                    procedureTitle: '',
                    initiator: '',
                    concerningClause: '',
                    concerningTopManagementName: '',
                    timeLimitForReply: '',
                    unitId: '',
                    campusId: '',
                    unitHead: '',
                    descriptionOfNonconformance: '',
                    rootCauseAnalysis: '',
                    preparedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '',
                    approvedBy: signatories?.qaoDirector || '',
                    status: 'Open',
                    requestDate: format(new Date(), 'yyyy-MM-dd'),
                    actionSteps: [],
                    evidences: [],
                    verificationRecords: []
                });
                setIsDialogOpen(true);
            }} className="h-10 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest px-6">
                <PlusCircle className="mr-2 h-4 w-4" /> Issue New CAR
            </Button>
            )}
        </div>
      </div>

      <Card className="shadow-md border-primary/10 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                    <TableHead className="py-4 pl-6">
                        <Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('carNumber')}>
                            CAR Number & Unit {getSortIcon('carNumber')}
                        </Button>
                    </TableHead>
                    <TableHead className="py-4">
                        <Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('unit')}>
                            Responsible Office {getSortIcon('unit')}
                        </Button>
                    </TableHead>
                    <TableHead className="py-4">
                        <div className="text-[10px] font-black uppercase">Procedure / Findings Context</div>
                    </TableHead>
                    <TableHead className="text-center py-4">
                        <Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent mx-auto" onClick={() => requestSort('deadline')}>
                            Deadline {getSortIcon('deadline')}
                        </Button>
                    </TableHead>
                    <TableHead className="text-center py-4">
                        <Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent mx-auto" onClick={() => requestSort('status')}>
                            Status {getSortIcon('status')}
                        </Button>
                    </TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase pr-6">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {processedCars.map((car) => {
                    const isMyCar = car.unitId === userProfile?.unitId;
                    const canEditThis = isInstitutionalViewer || isMyCar;
                    return (
                        <TableRow key={car.id} className="hover:bg-muted/20 transition-colors group">
                        <TableCell className="pl-6 py-4">
                            <div className="flex flex-col gap-1">
                            <span className="font-black text-sm text-primary leading-none group-hover:underline underline-offset-4">{car.carNumber}</span>
                            <div className="flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                <HistoryIcon className="h-2.5 w-2.5" />
                                Logged: {safeFormatDate(car.requestDate)}
                            </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-700 leading-tight">{unitMap.get(car.unitId) || '...'}</span>
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{campusMap.get(car.campusId) || '...'}</span>
                            </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-black truncate text-slate-900 uppercase tracking-tighter">{car.procedureTitle}</span>
                                <p className="text-[10px] text-muted-foreground line-clamp-1 italic font-medium">"{car.descriptionOfNonconformance}"</p>
                            </div>
                        </TableCell>
                        <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-600 uppercase tracking-tighter tabular-nums bg-muted/30 py-1 px-2 rounded border border-slate-100">
                                <Clock className="h-3 w-3" />
                                {safeFormatDate(car.timeLimitForReply)}
                            </div>
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge 
                            className={cn(
                                "text-[9px] font-black uppercase border-none px-2 shadow-sm whitespace-nowrap",
                                car.status === 'Open' ? "bg-rose-600 text-white" : 
                                car.status === 'In Progress' ? "bg-amber-50 text-amber-950" : 
                                "bg-emerald-600 text-white"
                            )}
                            >
                            {car.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6 space-x-2 whitespace-nowrap">
                            <Button variant="outline" size="sm" onClick={() => handlePrint(car)} className="h-8 text-[10px] font-bold bg-white shadow-sm gap-1.5">
                            <Printer className="h-3 w-3" />
                            PRINT
                            </Button>
                            <Button variant="default" size="sm" onClick={() => handleEdit(car)} className="h-8 text-[10px] font-black uppercase tracking-widest bg-primary shadow-sm px-4">
                            {canEditThis ? 'MANAGE' : 'VIEW'}
                            </Button>
                        </TableCell>
                        </TableRow>
                    );
                    })}
                    {processedCars.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                <div className="flex flex-col items-center gap-3 opacity-20">
                                    <ClipboardCheck className="h-12 w-12" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-black uppercase tracking-widest">No matching records</p>
                                        <p className="text-xs font-medium">Adjust your search or year filter to browse the registry.</p>
                                    </div>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/5 border-t py-3 px-6">
            <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                    <strong>Standard Requirement:</strong> This registry tracks all non-conformities identified during audits or operations. Per ISO 21001:2018 Clause 10.1, units must establish root causes and execute corrective actions within the specified time limits to ensure management system integrity.
                </p>
            </div>
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] lg:max-w-[1400px] h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Institutional Oversight</span>
            </div>
            <DialogTitle>{editingCar ? 'Manage' : 'Issue'} Corrective Action Request (CAR)</DialogTitle>
            <DialogDescription className="text-xs">Formal documentation of non-conformance findings and resolution tracking.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 flex overflow-hidden bg-white">
            <div className="flex-1 flex flex-col min-w-0 border-r">
                <ScrollArea className="flex-1">
                    <div className="p-8">
                        <Form {...form}>
                            <form id="car-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 pb-20">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="carNumber" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">CAR Number</FormLabel><FormControl><Input {...field} placeholder="e.g. 2025-001" className="bg-slate-50" disabled={isFieldReadOnly('carNumber')} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="ncReportNumber" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">NC Report No.</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="e.g. 2025-NC-01" className="bg-slate-50" disabled={isFieldReadOnly('ncReportNumber')} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormField control={form.control} name="source" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">Source</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly('source')}><FormControl><SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent><SelectItem value="Audit Finding">Audit Finding</SelectItem><SelectItem value="Legal Non-compliance">Legal Non-compliance</SelectItem><SelectItem value="Non-conforming Service">Non-conforming Service</SelectItem><SelectItem value="Others">Others</SelectItem></SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="initiator" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">Initiator</FormLabel><FormControl><Input {...field} className="bg-slate-50" disabled={isFieldReadOnly('initiator')} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="natureOfFinding" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">Nature of Finding</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly('natureOfFinding')}><FormControl><SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent><SelectItem value="NC">NC</SelectItem><SelectItem value="OFI">OFI</SelectItem></SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                                    <FormField control={form.control} name="procedureTitle" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">Title of Procedure</FormLabel><FormControl><Input {...field} placeholder="Name of relevant procedure" className="bg-slate-50" disabled={isFieldReadOnly('procedureTitle')} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="concerningClause" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">Concerning ISO Clause</FormLabel><FormControl><Input {...field} placeholder="e.g. 7.5.3" className="bg-slate-50" disabled={isFieldReadOnly('concerningClause')} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                <div className="space-y-6 pt-6 border-t">
                                    <FormField control={form.control} name="descriptionOfNonconformance" render={({ field }) => (
                                        <FormItem><FormLabel className="text-sm font-black text-slate-800">Statement of Non-Conformance</FormLabel><FormControl><Textarea {...field} rows={4} className="bg-slate-50 italic" disabled={isFieldReadOnly('descriptionOfNonconformance')} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                                    <FormField control={form.control} name="concerningTopManagementName" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">Concerning Top Management</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="Role or Person" className="bg-slate-50" disabled={isFieldReadOnly('concerningTopManagementName')} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="timeLimitForReply" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">Time Limit for Reply</FormLabel><FormControl><Input type="date" {...field} className="bg-slate-50" disabled={isFieldReadOnly('timeLimitForReply')} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
                                    <FormField control={form.control} name="campusId" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">Responsible Campus</FormLabel><Select onValueChange={(v) => { field.onChange(v); form.setValue('unitId', ''); }} value={field.value} disabled={isFieldReadOnly('campusId')}><FormControl><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl><SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="unitId" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">Responsible Unit</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly('unitId') || !form.watch('campusId')}><FormControl><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select Unit" /></SelectTrigger></FormControl><SelectContent>{units.filter(u => u.campusIds?.includes(form.watch('campusId'))).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="unitHead" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">Head of Unit</FormLabel><FormControl><Input {...field} placeholder="Full Name" className="bg-slate-50" disabled={isFieldReadOnly('unitHead')} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                <div className="pt-6 border-t space-y-4">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="h-5 w-5 text-primary" />
                                        <h4 className="text-sm font-black text-primary uppercase tracking-tight">Root Cause Analysis (Investigate the Cause of the Nonconformity)</h4>
                                    </div>
                                    <FormField control={form.control} name="rootCauseAnalysis" render={({ field }) => (
                                        <FormItem>
                                            <FormControl><Textarea {...field} value={field.value || ''} rows={4} placeholder="Identify the systematic reason why this non-conformance occurred..." className="bg-primary/5 border-primary/10 shadow-inner italic" disabled={isFieldReadOnly('rootCauseAnalysis')} /></FormControl>
                                            <FormDescription className="text-[10px] font-bold text-slate-500">
                                                Mandatory Step: The unit must complete the investigation into the root cause before the Action Registry is enabled.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className={cn("pt-6 border-t space-y-4 transition-all duration-500", !isInvestigationComplete && "opacity-50 pointer-events-none grayscale")}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ListChecks className="h-5 w-5 text-primary" />
                                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Corrective Action Registry</h4>
                                        </div>
                                        {!isInvestigationComplete && (
                                            <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-amber-200 text-amber-700 bg-amber-50">
                                                Awaiting Investigation Results
                                            </Badge>
                                        )}
                                    </div>
                                    {actionFields.map((field, index) => (
                                        <div key={field.id} className="space-y-4 p-4 rounded-lg border bg-muted/5 relative group">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                                <FormField control={form.control} name={`actionSteps.${index}.type`} render={({ field: inputField }) => (
                                                    <FormItem><FormLabel className="text-[9px] uppercase font-bold">Action Type</FormLabel><Select onValueChange={inputField.onChange} value={inputField.value} disabled={isFieldReadOnly('actionSteps')}><FormControl><SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Immediate Correction">Immediate Correction</SelectItem><SelectItem value="Long-term Corrective Action">Long-term Action</SelectItem></SelectContent></Select></FormItem>
                                                )} />
                                                <FormField control={form.control} name={`actionSteps.${index}.description`} render={({ field: inputField }) => (
                                                    <FormItem className="md:col-span-2"><FormLabel className="text-[9px] uppercase font-bold">Action Taken</FormLabel><FormControl><Input {...inputField} className="h-8 text-[10px]" disabled={isFieldReadOnly('actionSteps')} /></FormControl></FormItem>
                                                )} />
                                                <FormField control={form.control} name={`actionSteps.${index}.completionDate`} render={({ field: inputField }) => (
                                                    <FormItem><FormLabel className="text-[9px] uppercase font-bold">Target Date</FormLabel><FormControl><Input type="date" {...inputField} className="h-8 text-[10px]" disabled={isFieldReadOnly('actionSteps')} /></FormControl></FormItem>
                                                )} />
                                            </div>
                                            <FormField control={form.control} name={`actionSteps.${index}.evidenceLink`} render={({ field: inputField }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[9px] uppercase font-bold flex items-center gap-1">
                                                        <LinkIcon className="h-2.5 w-2.5 text-primary" /> Evidence Link (Google Drive)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input {...inputField} value={inputField.value || ''} placeholder="https://drive.google.com/..." className="h-8 text-[10px] bg-white" disabled={isFieldReadOnly('actionSteps')} />
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                            {!isFieldReadOnly('actionSteps') && <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAction(index)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                                        </div>
                                    ))}
                                    {!isFieldReadOnly('actionSteps') && (
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => appendAction({ description: '', type: 'Immediate Correction', completionDate: format(new Date(), 'yyyy-MM-dd'), status: 'Pending', evidenceLink: '' })} 
                                            className="w-full border-dashed h-10 font-black text-[10px] uppercase gap-2 hover:bg-primary/5 hover:text-primary"
                                            disabled={!isInvestigationComplete}
                                        >
                                            <PlusCircle className="h-3.5 w-3.5" /> Add Corrective Step
                                        </Button>
                                    )}
                                </div>

                                <div className="space-y-10 pt-10 border-t border-dashed">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                <Gavel className="h-6 w-6" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <h4 className="text-sm font-black uppercase text-indigo-900 tracking-tight">Institutional Audit Verification</h4>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Internal Auditor / Quality Assurance Office Use Only</p>
                                            </div>
                                        </div>
                                        {isInstitutionalViewer && (
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 font-black text-[10px] uppercase border-indigo-200 text-indigo-700 bg-indigo-50"
                                                onClick={() => appendVerification({ result: '', resultVerifiedBy: '', resultVerificationDate: format(new Date(), 'yyyy-MM-dd'), effectivenessResult: '', effectivenessVerifiedBy: '', effectivenessVerificationDate: format(new Date(), 'yyyy-MM-dd'), remarks: '' })}
                                            >
                                                <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Verification Entry
                                            </Button>
                                        )}
                                    </div>

                                    {verificationFields.map((field, index) => (
                                        <div key={field.id} className="space-y-8 p-6 rounded-2xl border bg-indigo-50/10 border-indigo-100 relative group animate-in slide-in-from-bottom-2 duration-500">
                                            {isInstitutionalViewer && (
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="absolute top-3 right-3 text-destructive h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" 
                                                    onClick={() => removeVerification(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <HistoryIcon className="h-4 w-4 text-indigo-600" />
                                                    <h5 className="text-[10px] font-black uppercase text-indigo-800 tracking-widest">III. Follow-up Result of Correction & Corrective Action</h5>
                                                </div>
                                                <FormField control={form.control} name={`verificationRecords.${index}.result`} render={({ field: inputField }) => (
                                                    <FormItem>
                                                        <FormControl><Textarea {...inputField} rows={3} placeholder="Describe the implementation findings during the follow-up visit..." className="bg-white border-indigo-100 italic text-xs" disabled={isFieldReadOnly(`verificationRecords.${index}.result`)} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField control={form.control} name={`verificationRecords.${index}.resultVerifiedBy`} render={({ field: inputField }) => (
                                                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Verified By</FormLabel><FormControl><Input {...inputField} className="h-8 text-xs bg-white border-indigo-100" placeholder="Auditor Name" disabled={isFieldReadOnly(`verificationRecords.${index}.resultVerifiedBy`)} /></FormControl></FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`verificationRecords.${index}.resultVerificationDate`} render={({ field: inputField }) => (
                                                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Verification Date</FormLabel><FormControl><Input type="date" {...inputField} className="h-8 text-xs bg-white border-indigo-100" disabled={isFieldReadOnly(`verificationRecords.${index}.resultVerificationDate`)} /></FormControl></FormItem>
                                                    )} />
                                                </div>
                                            </div>

                                            <Separator className="bg-indigo-100" />

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                    <h5 className="text-[10px] font-black uppercase text-emerald-800 tracking-widest">IV. Verification of Effectiveness of the Action Taken</h5>
                                                </div>
                                                <FormField control={form.control} name={`verificationRecords.${index}.effectivenessResult`} render={({ field: inputField }) => (
                                                    <FormItem>
                                                        <FormControl><Textarea {...inputField} rows={3} placeholder="Record objective evidence that the non-conformity has been eliminated and recurrence prevented..." className="bg-white border-emerald-100 italic text-xs" disabled={isFieldReadOnly(`verificationRecords.${index}.effectivenessResult`)} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField control={form.control} name={`verificationRecords.${index}.effectivenessVerifiedBy`} render={({ field: inputField }) => (
                                                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Effectiveness Verified By</FormLabel><FormControl><Input {...inputField} className="h-8 text-xs bg-white border-emerald-100" placeholder="QA/Admin Name" disabled={isFieldReadOnly(`verificationRecords.${index}.effectivenessVerifiedBy`)} /></FormControl></FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`verificationRecords.${index}.effectivenessVerificationDate`} render={({ field: inputField }) => (
                                                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Verification Date</FormLabel><FormControl><Input type="date" {...inputField} className="h-8 text-xs bg-white border-emerald-100" disabled={isFieldReadOnly(`verificationRecords.${index}.effectivenessVerificationDate`)} /></FormControl></FormItem>
                                                    )} />
                                                </div>
                                            </div>

                                            <FormField control={form.control} name={`verificationRecords.${index}.remarks`} render={({ field: inputField }) => (
                                                <FormItem className="pt-2">
                                                    <FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Final Remarks / Closure Summary</FormLabel>
                                                    <FormControl><Input {...inputField} value={inputField.value || ''} className="h-8 text-[10px] bg-white" placeholder="Optional audit notes..." disabled={isFieldReadOnly(`verificationRecords.${index}.remarks`)} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                    ))}

                                    {verificationFields.length === 0 && (
                                        <div className="py-12 border border-dashed rounded-2xl bg-muted/5 flex flex-col items-center justify-center text-center space-y-2 opacity-30">
                                            <ShieldCheck className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">No Institutional Verification Logged</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t">
                                    <FormField control={form.control} name="requestDate" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">Request Date</FormLabel><FormControl><Input type="date" {...field} className="bg-slate-50" disabled={isFieldReadOnly('requestDate')} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="preparedBy" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">Prepared By</FormLabel><FormControl><Input {...field} placeholder="Full Name" className="bg-slate-50" disabled={isFieldReadOnly('preparedBy')} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="approvedBy" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase">Approved By (QA Director)</FormLabel><FormControl><Input {...field} placeholder="Full Name" className="bg-slate-50" disabled={isFieldReadOnly('approvedBy')} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                            </form>
                        </Form>
                    </div>
                </ScrollArea>
            </div>

            <div className="hidden lg:flex w-[380px] flex-col bg-muted/10 shrink-0 border-l">
                <div className="p-4 border-b font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 bg-white">
                    <BookOpen className="h-4 w-4 text-primary" /> Unit Compliance Guide
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-6">
                        <section className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">1</span>
                                Investigation Phase
                            </h4>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                                The unit must first <strong>Provide the Root Cause Analysis</strong>. Investigate why the non-conformity occurred (manpower, method, machine, etc.). documenting this is mandatory before the Action Registry is enabled.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">2</span>
                                Action Strategy
                            </h4>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                                Units must provide the <strong>Corrective Action Registry</strong> steps. Ensure both <strong>Immediate Correction</strong> (short-term fix) and <strong>Long-term Corrective Action</strong> (prevention) are logged.
                            </p>
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex gap-2">
                                <LinkIcon className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-blue-800 font-bold">A valid Google Drive link to the PDF evidence is required for every action step.</p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">3</span>
                                QA Monitoring
                            </h4>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                                <strong>Auditors and QA Officers</strong> will conduct a formal follow-up of the implementation on the prescribed target dates. Ensure all evidence logs are accessible.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">4</span>
                                Verification
                            </h4>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                                Final <strong>Verification of Effectiveness</strong> will be conducted by the QA team. Only after successful verification will the CAR status be marked as "Closed".
                            </p>
                        </section>

                        <div className="pt-6 border-t">
                            <Card className="bg-primary/5 border-primary/20">
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-primary">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span className="text-[9px] font-black uppercase">Standard: ISO 21001:2018</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic leading-tight">
                                        Compliance with CARs is a vital component of the university's continual improvement cycle.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </ScrollArea>
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Discard</Button>
            <Button type="submit" form="car-form" disabled={isSubmitting || (userProfile?.unitId !== form.getValues('unitId') && !isAdmin)} className="min-w-[150px] shadow-xl shadow-primary/20 font-black uppercase text-xs tracking-widest">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4 mr-1.5" />}
                {editingCar ? 'Update Registry' : 'Issue Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
