'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp, where } from 'firebase/firestore';
import type { CorrectiveActionRequest, Campus, Unit, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    BookOpen,
    School,
    Save,
    Undo2,
    Check,
    Building2
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
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { renderToStaticMarkup } from 'react-dom/server';
import { CARPrintTemplate } from './car-print-template';
import { CARControlRegisterTemplate } from './car-control-register-template';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  followUpLogs: z.array(z.object({
    result: z.string().min(1, 'Result is required'),
    verifiedBy: z.string().min(1, 'Required'),
    date: z.string().min(1, 'Required'),
    remarks: z.string().optional(),
  })).optional(),
  effectivenessAudits: z.array(z.object({
    result: z.string().min(1, 'Effectiveness result is required'),
    verifiedBy: z.string().min(1, 'Required'),
    date: z.string().min(1, 'Required'),
    action: z.enum(['Close the NC', 'Continue Monitoring the NC', 'Provide More Actions to Address the NC']),
    remarks: z.string().optional(),
  })).optional(),
  status: z.enum(['Open', 'In Progress', 'Closed']),
});

type SortKey = 'carNumber' | 'unit' | 'deadline' | 'status' | 'updatedAt';
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
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<string>('all');
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

  const isInstitutionalViewer = isAdmin || isAuditor || (userRole && /auditor|quality assurance/i.test(userRole));
  const canPrintRegistry = isAdmin || userRole === 'Quality Assurance Office';

  const processedCars = useMemo(() => {
    if (!rawCars || !userProfile) return [];

    const isCampusSupervisor = userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president');

    let result = rawCars.filter(car => {
        if (!isInstitutionalViewer) {
            if (isCampusSupervisor) {
                if (car.campusId !== userProfile.campusId) return false;
            } else {
                if (car.unitId !== userProfile.unitId) return false;
            }
        }

        if (activeSubTab === 'verification' && !car.needsVerification) return false;
        if (activeSubTab === 'my-unit' && car.unitId !== userProfile.unitId) return false;

        const matchesSearch = 
            car.carNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            car.procedureTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (unitMap.get(car.unitId) || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        const reqDate = car.requestDate instanceof Timestamp ? car.requestDate.toDate() : new Date(car.requestDate);
        const matchesYear = yearFilter === 'all' || reqDate.getFullYear().toString() === yearFilter;
        if (!matchesYear) return false;

        const matchesCampus = campusFilter === 'all' || car.campusId === campusFilter;
        return matchesCampus;
    });

    if (sortConfig) {
        const { key, direction } = sortConfig;
        result.sort((a, b) => {
            let valA: any, valB: any;
            
            switch(key) {
                case 'carNumber': valA = a.carNumber; valB = b.carNumber; break;
                case 'unit': valA = unitMap.get(a.unitId) || ''; valB = unitMap.get(b.unitId) || ''; break;
                case 'status': valA = a.status; valB = b.status; break;
                case 'updatedAt':
                    valA = a.updatedAt?.toMillis?.() || new Date(a.updatedAt).getTime();
                    valB = b.updatedAt?.toMillis?.() || new Date(b.updatedAt).getTime();
                    break;
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
  }, [rawCars, searchTerm, yearFilter, campusFilter, sortConfig, activeSubTab, unitMap, userProfile, isAdmin, isAuditor, userRole, isInstitutionalViewer]);

  const carStats = useMemo(() => {
    const total = processedCars.length;
    const open = processedCars.filter(c => c.status === 'Open').length;
    const inProgress = processedCars.filter(c => c.status === 'In Progress').length;
    const closed = processedCars.filter(c => c.status === 'Closed').length;
    const needsVerification = processedCars.filter(c => c.needsVerification).length;
    const successRate = total > 0 ? Math.round((closed / total) * 100) : 100;

    return { total, open, inProgress, closed, needsVerification, successRate };
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
        followUpLogs: [],
        effectivenessAudits: []
    }
  });

  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({
    control: form.control,
    name: "actionSteps"
  });

  const { fields: followUpFields, append: appendFollowUp, remove: removeFollowUp } = useFieldArray({
    control: form.control,
    name: "followUpLogs"
  });

  const { fields: effectivenessFields, append: appendEffectiveness, remove: removeEffectiveness } = useFieldArray({
    control: form.control,
    name: "effectivenessAudits"
  });

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

  const watchRootCause = form.watch('rootCauseAnalysis');
  const isInvestigationComplete = !!watchRootCause && watchRootCause.trim().length > 10;

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
            printWindow.document.write(`<html><head><title>CAR - ${car.carNumber}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print { body { margin: 0; padding: 0; background: white; } .no-print { display: none !important; } } body { font-family: serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Official CAR Form</button></div><div id="print-content">${reportHtml}</div></body></html>`);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print error:", err);
    }
  };

  const handlePrintRegistry = () => {
    if (!processedCars.length) return;

    try {
        const reportHtml = renderToStaticMarkup(
            <CARControlRegisterTemplate 
                cars={processedCars} 
                unitMap={unitMap} 
                campusMap={campusMap}
                year={yearFilter} 
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`<html><head><title>CAR Control Register</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print { body { margin: 0; padding: 0; background: white; } .no-print { display: none !important; } @page { size: landscape; margin: 1cm; } } body { font-family: serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Print Control Registry Matrix</button></div><div id="print-content">${reportHtml}</div></body></html>`);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print registry error:", err);
    }
  };

  const onSubmit = async (values: z.infer<typeof carSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    
    const isUnitResponding = userProfile.unitId === values.unitId && !isAdmin;
    let nextStatus = values.status;
    let needsVerification = editingCar?.needsVerification || false;

    const finalAudit = values.effectivenessAudits?.[values.effectivenessAudits.length - 1];
    if (finalAudit && finalAudit.action === 'Close the NC') {
        nextStatus = 'Closed';
        needsVerification = false;
    } else if (finalAudit) {
        nextStatus = 'In Progress';
        needsVerification = false;
    } else if (isUnitResponding) {
        nextStatus = 'In Progress';
        needsVerification = true;
    }

    const carData: any = {
      ...values,
      status: nextStatus,
      needsVerification,
      timeLimitForReply: Timestamp.fromDate(new Date(values.timeLimitForReply)),
      requestDate: Timestamp.fromDate(new Date(values.requestDate)),
      actionSteps: (values.actionSteps || []).map(step => ({
          ...step,
          completionDate: Timestamp.fromDate(new Date(step.completionDate))
      })),
      followUpLogs: (values.followUpLogs || []).map(log => ({
          ...log,
          date: Timestamp.fromDate(new Date(log.date))
      })),
      effectivenessAudits: (values.effectivenessAudits || []).map(audit => ({
          ...audit,
          date: Timestamp.fromDate(new Date(audit.date))
      })),
      updatedAt: serverTimestamp(),
    };

    if (editingCar) {
      const docRef = doc(firestore, 'correctiveActionRequests', editingCar.id);
      updateDoc(docRef, carData)
        .then(() => {
          toast({ title: 'Success', description: 'CAR record updated.' });
          setIsDialogOpen(false);
          form.reset();
          setEditingCar(null);
        })
        .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: carData
          }));
        })
        .finally(() => setIsSubmitting(false));
    } else {
      const colRef = collection(firestore, 'correctiveActionRequests');
      const dataWithTimestamp = { ...carData, createdAt: serverTimestamp() };
      addDoc(colRef, dataWithTimestamp)
        .then(() => {
          toast({ title: 'Success', description: 'New CAR registered.' });
          setIsDialogOpen(false);
          form.reset();
          setEditingCar(null);
        })
        .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: colRef.path,
            operation: 'create',
            requestResourceData: dataWithTimestamp
          }));
        })
        .finally(() => setIsSubmitting(false));
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
      followUpLogs: (car.followUpLogs || []).map(log => ({
          ...log,
          date: safeDate(log.date)
      })),
      effectivenessAudits: (car.effectivenessAudits || []).map(audit => ({
          ...audit,
          date: safeDate(audit.date)
      })),
    } as any);
    setIsDialogOpen(true);
  };

  const isFieldReadOnly = (fieldName: string) => {
    if (isAdmin) return false;
    
    if (fieldName.startsWith('followUpLogs') || fieldName.startsWith('effectivenessAudits')) {
        return !isInstitutionalViewer;
    }

    const responderFields = ['rootCauseAnalysis', 'actionSteps'];
    if (responderFields.includes(fieldName)) {
        return userProfile?.unitId !== form.getValues('unitId');
    }

    if (fieldName === 'status') {
        return !isInstitutionalViewer;
    }
    
    const metadataFields = ['carNumber', 'ncReportNumber', 'source', 'initiator', 'natureOfFinding', 'procedureTitle', 'concerningClause', 'concerningTopManagementName', 'timeLimitForReply', 'unitId', 'campusId', 'unitHead', 'descriptionOfNonconformance', 'requestDate', 'preparedBy', 'approvedBy'];
    if (metadataFields.includes(fieldName)) {
        return !isInstitutionalViewer;
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
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">In-Progress</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-amber-600 tabular-nums">{carStats.inProgress}</div>
                <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase">Active Treatment</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><Clock className="h-12 w-12 text-amber-600" /></div>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Verification Pending</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-blue-600 tabular-nums">{carStats.needsVerification}</div>
                <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase">Handed off by Units</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><ClipboardCheck className="h-12 w-12 text-blue-600" /></div>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Closure Maturity</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-emerald-600 tabular-nums">{carStats.successRate}%</div>
                <p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase">Resolved Items</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><TrendingUp className="h-12 w-12 text-emerald-600" /></div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1 w-full space-y-1.5 md:space-y-0">
          <div className="flex flex-col md:flex-row gap-4">
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
                    <School className="h-2.5 w-2.5" /> Campus / Site
                </label>
                <Select value={campusFilter} onValueChange={setCampusFilter}>
                    <SelectTrigger className="h-10 bg-background border-primary/10 font-bold shadow-sm">
                        <SelectValue placeholder="All Sites" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sites</SelectItem>
                        {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
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
                        <SelectItem value="all">All Years</SelectItem>
                        {years.map(y => <SelectItem key={y} value={y}>AY {y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-5">
            {(isAdmin || userRole === 'Quality Assurance Office') && (
                <Button 
                    variant="outline" 
                    onClick={handlePrintRegistry} 
                    disabled={processedCars.length === 0}
                    className="h-10 bg-white border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest gap-2"
                >
                    <TableProperties className="h-4 w-4" />
                    Print Control Register
                </Button>
            )}
            {isInstitutionalViewer && (
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
                        followUpLogs: [],
                        effectivenessAudits: []
                    });
                    setIsDialogOpen(true);
                }} className="h-10 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest px-6">
                    <PlusCircle className="mr-2 h-4 w-4" /> Issue New CAR
                </Button>
            )}
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="bg-muted p-1 border shadow-sm w-fit h-10 animate-tab-highlight rounded-md">
            <TabsTrigger value="all" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                <ListChecks className="h-3.5 w-3.5" /> Full Registry
            </TabsTrigger>
            {isInstitutionalViewer && (
                <TabsTrigger value="verification" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verification Queue
                    {carStats.needsVerification > 0 && <Badge className="ml-2 bg-white text-blue-600 border-none h-4 px-1 text-[8px] font-black">{carStats.needsVerification}</Badge>}
                </TabsTrigger>
            )}
            {!isAdmin && (
                <TabsTrigger value="my-unit" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                    <Building2 className="h-3.5 w-3.5" /> My Unit Gaps
                </TabsTrigger>
            )}
        </TabsList>

        <TabsContent value="all" className="animate-in fade-in slide-in-from-left-2 duration-300">
            <Card className="shadow-md border-primary/10 overflow-hidden">
                <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader className="bg-muted/30">
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
                            const dateMatch = car.requestDate instanceof Timestamp ? car.requestDate.toDate() : new Date(car.requestDate);
                            const limitMatch = car.timeLimitForReply instanceof Timestamp ? car.timeLimitForReply.toDate() : new Date(car.timeLimitForReply);

                            return (
                                <TableRow key={car.id} className={cn("transition-colors group", car.needsVerification && "bg-blue-50/30")}>
                                <TableCell className="pl-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-sm text-primary leading-none group-hover:underline underline-offset-4">{car.carNumber}</span>
                                            {car.needsVerification && <Badge variant="outline" className="h-4 text-[7px] font-black border-blue-200 text-blue-700 bg-white animate-pulse">UNIT RESPONDED</Badge>}
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                            <HistoryIcon className="h-2.5 w-2.5" />
                                            Logged: {format(dateMatch, 'MM/dd/yy')}
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
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        {format(limitMatch, 'MM/dd/yy')}
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
                        </TableBody>
                        </Table>
                    </div>
                )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] lg:max-w-[1400px] h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Institutional Document Control</span>
            </div>
            <DialogTitle>{editingCar ? 'Modify' : 'Issue'} Corrective Action Request (CAR)</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex overflow-hidden bg-white">
            <div className="flex-1 flex flex-col min-w-0 border-r">
                <ScrollArea className="flex-1">
                    <div className="p-8">
                        <Form {...form}>
                            <form id="car-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 pb-20">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="carNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">CAR Number</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g. 2025-001" className="bg-slate-50" disabled={isFieldReadOnly('carNumber')} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="ncReportNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">NC Report No.</FormLabel>
                                            <FormControl><Input {...field} value={field.value || ''} placeholder="e.g. 2025-NC-01" className="bg-slate-50" disabled={isFieldReadOnly('ncReportNumber')} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormField control={form.control} name="source" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Source</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly('source')}>
                                                <FormControl><SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Audit Finding">Audit Finding</SelectItem>
                                                    <SelectItem value="Legal Non-compliance">Legal Non-compliance</SelectItem>
                                                    <SelectItem value="Non-conforming Service">Non-conforming Service</SelectItem>
                                                    <SelectItem value="Others">Others</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="initiator" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Initiator</FormLabel>
                                            <FormControl><Input {...field} className="bg-slate-50" disabled={isFieldReadOnly('initiator')} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="natureOfFinding" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Nature of Finding</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly('natureOfFinding')}>
                                                <FormControl><SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="NC">NC</SelectItem>
                                                    <SelectItem value="OFI">OFI</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                                    <FormField control={form.control} name="procedureTitle" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Title of Procedure</FormLabel>
                                            <FormControl><Input {...field} placeholder="Name of relevant procedure" className="bg-slate-50" disabled={isFieldReadOnly('procedureTitle')} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="concerningClause" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Concerning ISO Clause</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g. 7.5.3" className="bg-slate-50" disabled={isFieldReadOnly('concerningClause')} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <FormField control={form.control} name="descriptionOfNonconformance" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-black text-slate-800 uppercase tracking-tight">Statement of Non-Conformance</FormLabel>
                                        <FormControl><Textarea {...field} rows={4} className="bg-slate-50 italic" disabled={isFieldReadOnly('descriptionOfNonconformance')} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
                                    <FormField control={form.control} name="campusId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Responsible Campus</FormLabel>
                                            <Select onValueChange={(v) => { field.onChange(v); form.setValue('unitId', ''); }} value={field.value} disabled={isFieldReadOnly('campusId')}>
                                                <FormControl><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                                                <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="unitId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Responsible Unit</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly('unitId') || !form.watch('campusId')}>
                                                <FormControl><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select Unit" /></SelectTrigger></FormControl>
                                                <SelectContent>{units.filter(u => u.campusIds?.includes(form.watch('campusId'))).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="unitHead" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Head of Unit</FormLabel>
                                            <FormControl><Input {...field} placeholder="Full Name" className="bg-slate-50" disabled={isFieldReadOnly('unitHead')} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="pt-6 border-t space-y-4">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="h-5 w-5 text-primary" />
                                        <h4 className="text-sm font-black text-primary uppercase tracking-tight">Root Cause Analysis</h4>
                                    </div>
                                    <FormField control={form.control} name="rootCauseAnalysis" render={({ field }) => (
                                        <FormItem>
                                            <FormControl><Textarea {...field} value={field.value || ''} rows={4} placeholder="Identify the systematic reason why this non-conformance occurred..." className="bg-primary/5 border-primary/10 shadow-inner italic" disabled={isFieldReadOnly('rootCauseAnalysis')} /></FormControl>
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
                                            {!isFieldReadOnly('actionSteps') && <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAction(index)}><Trash2 className="h-4 w-4" /></Button>}
                                        </div>
                                    ))}
                                    {!isFieldReadOnly('actionSteps') && (
                                        <Button type="button" variant="outline" size="sm" onClick={() => appendAction({ description: '', type: 'Immediate Correction', completionDate: format(new Date(), 'yyyy-MM-dd'), status: 'Pending' })} className="w-full border-dashed h-10 font-black text-[10px] uppercase gap-2">
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
                                                <h4 className="text-sm font-black uppercase text-indigo-900 tracking-tight">Institutional Oversight & Verification</h4>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Internal Auditor / Quality Assurance Office Use Only</p>
                                            </div>
                                        </div>
                                        {isInstitutionalViewer && (
                                            <div className="flex gap-2">
                                                <Button type="button" variant="outline" size="sm" className="h-8 font-black text-[10px] uppercase" onClick={() => appendFollowUp({ result: '', verifiedBy: '', date: format(new Date(), 'yyyy-MM-dd'), remarks: '' })}>
                                                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Follow-up Log
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" className="h-8 font-black text-[10px] uppercase border-indigo-200 text-indigo-700 bg-indigo-50" onClick={() => appendEffectiveness({ result: '', verifiedBy: '', date: format(new Date(), 'yyyy-MM-dd'), action: 'Continue Monitoring the NC', remarks: '' })}>
                                                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Conduct Final Verification
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">III. Follow-up Result Registry</h5>
                                        {followUpFields.map((field, index) => (
                                            <div key={field.id} className="p-5 rounded-2xl border bg-slate-50/50 relative group">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    <FormField control={form.control} name={`followUpLogs.${index}.result`} render={({ field: inputField }) => (
                                                        <FormItem className="md:col-span-2"><FormLabel className="text-[9px] font-black uppercase">Follow-up Observation</FormLabel><FormControl><Textarea {...inputField} rows={3} className="bg-white text-xs italic" disabled={isFieldReadOnly(`followUpLogs.${index}.result`)} /></FormControl></FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`followUpLogs.${index}.verifiedBy`} render={({ field: inputField }) => (
                                                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Verified By</FormLabel><FormControl><Input {...inputField} className="h-8 text-xs bg-white" disabled={isFieldReadOnly(`followUpLogs.${index}.verifiedBy`)} /></FormControl></FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`followUpLogs.${index}.date`} render={({ field: inputField }) => (
                                                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Date of Follow-up</FormLabel><FormControl><Input type="date" {...inputField} className="h-8 text-xs bg-white" disabled={isFieldReadOnly(`followUpLogs.${index}.date`)} /></FormControl></FormItem>
                                                    )} />
                                                </div>
                                                {isInstitutionalViewer && <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeFollowUp(index)}><Trash2 className="h-4 w-4" /></Button>}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-4">
                                        <h5 className="text-[10px] font-black uppercase text-indigo-700 tracking-widest border-b pb-1">IV. Verification of Effectiveness Audit</h5>
                                        {effectivenessFields.map((field, index) => (
                                            <div key={field.id} className="p-6 rounded-2xl border-2 border-indigo-100 bg-indigo-50/20 relative group space-y-6">
                                                <FormField control={form.control} name={`effectivenessAudits.${index}.result`} render={({ field: inputField }) => (
                                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-indigo-900">Final Verification Result & Evidence</FormLabel><FormControl><Textarea {...inputField} rows={4} className="bg-white border-indigo-100 italic text-sm" disabled={isFieldReadOnly(`effectivenessAudits.${index}.result`)} /></FormControl></FormItem>
                                                )} />
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <FormField control={form.control} name={`effectivenessAudits.${index}.action`} render={({ field: inputField }) => (
                                                        <FormItem className="md:col-span-2">
                                                            <FormLabel className="text-[10px] font-black uppercase text-primary">Verification Determination (Action)</FormLabel>
                                                            <Select onValueChange={inputField.onChange} value={inputField.value} disabled={isFieldReadOnly(`effectivenessAudits.${index}.action`)}>
                                                                <FormControl><SelectTrigger className="bg-white font-bold h-11 border-primary/20"><SelectValue /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="Close the NC" className="font-black text-emerald-600">1. Close the NC (Full Compliance Verified)</SelectItem>
                                                                    <SelectItem value="Continue Monitoring the NC" className="font-bold">2. Continue Monitoring the NC</SelectItem>
                                                                    <SelectItem value="Provide More Actions to Address the NC" className="font-bold text-rose-600">3. Provide More Actions to Address the NC</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormDescription className="text-[9px] font-medium text-slate-500 italic">Only "Close the NC" will formally set this CAR to Closed status.</FormDescription>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`effectivenessAudits.${index}.verifiedBy`} render={({ field: inputField }) => (
                                                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Verified By</FormLabel><FormControl><Input {...inputField} className="h-8 text-xs bg-white border-indigo-100" disabled={isFieldReadOnly(`effectivenessAudits.${index}.verifiedBy`)} /></FormControl></FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`effectivenessAudits.${index}.date`} render={({ field: inputField }) => (
                                                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Date of Final Visit</FormLabel><FormControl><Input type="date" {...inputField} className="h-8 text-xs bg-white border-indigo-100" disabled={isFieldReadOnly(`effectivenessAudits.${index}.date`)} /></FormControl></FormItem>
                                                    )} />
                                                </div>
                                                {isInstitutionalViewer && <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeEffectiveness(index)}><Trash2 className="h-4 w-4" /></Button>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </Form>
                    </div>
                </ScrollArea>
            </div>

            <div className="hidden lg:flex w-[380px] flex-col bg-muted/10 shrink-0 border-l p-6 space-y-6">
                <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Process Standard Registry</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed italic">
                        All corrective actions must be supported by objective evidence logged in the RSU Digital repository.
                    </p>
                </div>
                <Separator />
                <div className="space-y-4">
                    <Badge variant="outline" className="h-5 text-[9px] font-black uppercase bg-white">Standard: ISO 21001:2018</Badge>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Administrators use Part III and IV to close the verification loop. Follow-ups ensure unit progression, while the final Effectiveness Audit determines if the NC can be formally closed.
                    </p>
                </div>
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Discard</Button>
            <Button type="submit" form="car-form" disabled={isSubmitting} className="min-w-[150px] shadow-xl shadow-primary/20 font-black uppercase text-xs">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 mr-1.5" />}
                {editingCar ? 'Update Registry' : 'Issue Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
