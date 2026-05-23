'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, serverTimestamp, deleteDoc, updateDoc, Timestamp, where, arrayUnion } from 'firebase/firestore';
import type { CorrectiveActionRequest, Campus, Unit, Signatories, Comment, CARActionStep } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Loader2, 
    PlusCircle, 
    Calendar, 
    ExternalLink, 
    Trash2, 
    ListChecks, 
    History as HistoryIcon, 
    Info, 
    User, 
    ShieldCheck, 
    Hash, 
    ChevronRight, 
    Eye, 
    LayoutList, 
    Target, 
    Filter, 
    BarChart3, 
    List,
    Search,
    ArrowUpDown,
    ClipboardList,
    Undo2,
    Check,
    Activity,
    Printer,
    Edit,
    Gavel,
    MessageSquare,
    School,
    Save,
    AlertTriangle,
    Link as LinkIcon,
    ShieldAlert,
    Clock,
    UserMinus,
    CheckCircle2,
    XCircle,
    RotateCw,
    X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { renderToStaticMarkup } from 'react-dom/server';
import { CARPrintTemplate } from './car-print-template';

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
  adminFeedback: z.string().optional().or(z.literal('')),
  nextVerificationDate: z.string().optional().or(z.literal('')),
  actionSteps: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    type: z.enum(['Immediate Correction', 'Long-term Corrective Action']),
    completionDate: z.string().min(1, 'Date is required'),
    status: z.enum(['Pending', 'Completed']),
    evidenceLink: z.string().url('Invalid URL').optional().or(z.literal('')),
    verificationStatus: z.enum(['Accepted', 'Not Accepted', 'Pending']).optional(),
    verificationRemarks: z.string().optional().or(z.literal('')),
  })).optional(),
  effectivenessAudits: z.array(z.object({
    result: z.string().min(1, 'Effectiveness result is required'),
    verifiedBy: z.string().min(1, 'Required'),
    date: z.string().min(1, 'Required'),
    action: z.enum(['Effective', 'Not Effective', 'Close the NC', 'Continue Monitoring the NC', 'Provide More Actions to Address the NC']),
    remarks: z.string().optional().or(z.literal('')),
  })).optional(),
  status: z.enum(['Open', 'In Progress', 'Awaiting Response/Update', 'For Final Verification', 'Closed']),
  findingId: z.string().optional(),
});

type SortKey = 'carNumber' | 'unit' | 'status' | 'updatedAt' | 'deadline';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

export function CorrectiveActionRequestTab({ campuses, units, canManage: initialCanManage }: CorrectiveActionRequestTabProps) {
  const { userProfile, isAdmin, userRole, isAuditor, isSupervisor } = useUser();
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

  const isInstitutionalViewer = isAdmin || isAuditor;
  const isTopManagement = isAdmin || isSupervisor || isAuditor;

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const yrs = [];
    for (let i = 0; i < 5; i++) yrs.push(String(current - i));
    return yrs;
  }, []);

  const carQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'correctiveActionRequests'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: rawCars, isLoading } = useCollection<CorrectiveActionRequest>(carQuery);

  const liveCar = useMemo(() => {
    if (!editingCar || !rawCars) return editingCar;
    return rawCars.find(c => c.id === editingCar.id) || editingCar;
  }, [editingCar, rawCars]);

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

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
        adminFeedback: '',
        nextVerificationDate: '',
        preparedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '',
        approvedBy: signatories?.qaoDirector || '',
        status: 'Open',
        requestDate: format(new Date(), 'yyyy-MM-dd'),
        actionSteps: [],
        effectivenessAudits: [],
        findingId: ''
    }
  });

  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({
    control: form.control,
    name: "actionSteps"
  });

  const { fields: effectivenessFields, append: appendEffectiveness, remove: removeEffectiveness } = useFieldArray({
    control: form.control,
    name: "effectivenessAudits"
  });

  const processedCars = useMemo(() => {
    if (!rawCars || !userProfile) return [];

    let result = rawCars.filter(car => {
        if (!isInstitutionalViewer) {
            if (isSupervisor) {
                if (car.campusId !== userProfile.campusId) return false;
            } else {
                if (car.unitId !== userProfile.unitId) return false;
            }
        }
        
        if (activeSubTab === 'verification') {
            const isAwaitingOversight = ['For Final Verification', 'Awaiting Response/Update'].includes(car.status);
            if (!isAwaitingOversight && !car.needsVerification) return false;
        }

        if (activeSubTab === 'my-unit' && car.unitId !== userProfile.unitId) return false;

        const matchesSearch = car.carNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             car.procedureTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (unitMap.get(car.unitId) || '').toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        const reqDate = car.requestDate instanceof Timestamp ? car.requestDate.toDate() : new Date(car.requestDate);
        const matchesYear = yearFilter === 'all' || reqDate.getFullYear().toString() === yearFilter;
        if (!matchesYear) return false;

        return campusFilter === 'all' || car.campusId === campusFilter;
    });

    if (sortConfig) {
        const { key, direction } = sortConfig;
        result.sort((a, b) => {
            let valA: any, valB: any;
            switch(key) {
                case 'carNumber': valA = a.carNumber; valB = b.carNumber; break;
                case 'unit': valA = unitMap.get(a.unitId) || ''; valB = unitMap.get(b.unitId) || ''; break;
                case 'status': valA = a.status; valB = b.status; break;
                case 'updatedAt': valA = a.updatedAt?.toMillis?.() || new Date(a.updatedAt).getTime(); valB = b.updatedAt?.toMillis?.() || new Date(b.updatedAt).getTime(); break;
                case 'deadline': valA = a.timeLimitForReply?.toMillis?.() || new Date(a.timeLimitForReply).getTime(); valB = b.timeLimitForReply?.toMillis?.() || new Date(b.timeLimitForReply).getTime(); break;
                default: valA = ''; valB = '';
            }
            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return result;
  }, [rawCars, searchTerm, yearFilter, campusFilter, sortConfig, activeSubTab, unitMap, userProfile, isInstitutionalViewer, isSupervisor]);

  const carStats = useMemo(() => {
    if (!rawCars || !userProfile) return { total: 0, open: 0, inProgress: 0, closed: 0, needsVerification: 0, myUnit: 0 };

    const scopedList = rawCars.filter(car => {
        if (isInstitutionalViewer) return true;
        if (isSupervisor) return car.campusId === userProfile.campusId;
        return car.unitId === userProfile.unitId;
    });

    return {
        total: scopedList.length,
        open: scopedList.filter(c => c.status === 'Open').length,
        inProgress: scopedList.filter(c => ['In Progress', 'Awaiting Response/Update'].includes(c.status)).length,
        closed: scopedList.filter(c => c.status === 'Closed').length,
        needsVerification: scopedList.filter(c => ['For Final Verification', 'Awaiting Response/Update'].includes(c.status) || c.needsVerification === true).length,
        myUnit: scopedList.filter(c => c.unitId === userProfile.unitId).length
    };
  }, [rawCars, userProfile, isInstitutionalViewer, isSupervisor]);

  const getSortIcon = (key: SortKey) => {
    return <ArrowUpDown className={cn("h-3 w-3 ml-1.5 transition-colors", sortConfig?.key === key ? "text-primary opacity-100" : "opacity-20")} />;
  };

  const handleEdit = (car: CorrectiveActionRequest) => {
    setEditingCar(car);
    const safeDate = (d: any) => {
        if (!d) return '';
        const date = d instanceof Timestamp ? d.toDate() : new Date(d);
        return isNaN(date.getTime()) ? '' : format(date, 'yyyy-MM-dd');
    };
    
    form.reset({
        ...car,
        adminFeedback: '',
        nextVerificationDate: safeDate(car.nextVerificationDate),
        timeLimitForReply: safeDate(car.timeLimitForReply),
        requestDate: safeDate(car.requestDate),
        actionSteps: (car.actionSteps || []).map(step => ({ 
            ...step, 
            completionDate: safeDate(step.completionDate),
            verificationStatus: step.verificationStatus || 'Pending',
            verificationRemarks: step.verificationRemarks || ''
        })),
        effectivenessAudits: (car.effectivenessAudits || []).map(audit => ({ ...audit, date: safeDate(audit.date), remarks: audit.remarks || '', action: audit.action as any }))
    });
    setIsDialogOpen(true);
  };

  const handlePrint = (car: CorrectiveActionRequest) => {
    const cName = campusMap.get(car.campusId) || 'Unknown Campus';
    const uName = unitMap.get(car.unitId) || 'Unknown Unit';
    try {
        const reportHtml = renderToStaticMarkup(<CARPrintTemplate car={car} unitName={uName} campusName={cName} signatories={signatories || undefined} />);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`<html><head><title>CAR - ${car.carNumber}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@page { size: 8.5in 13in !important; margin: 0.5in !important; } @media print { body { margin: 0 !important; padding: 0 !important; background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } } body { font-family: serif; background: #f9fafb; padding: 40px; color: black; font-size: 11pt; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl font-black uppercase text-xs tracking-widest transition-all">Click to Print CAR</button></div><div id="print-content" style="padding: 0.1in;">${reportHtml}</div></body></html>`);
            printWindow.document.close();
        }
    } catch (err) { console.error(err); }
  };

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const isFieldReadOnly = (fieldName: string) => {
    if (isAdmin) return false;
    if (fieldName.startsWith('effectivenessAudits') || fieldName === 'adminFeedback' || fieldName === 'nextVerificationDate') return !isInstitutionalViewer;
    if (fieldName.includes('verificationStatus') || fieldName.includes('verificationRemarks')) return !isInstitutionalViewer;
    if (['rootCauseAnalysis', 'actionSteps'].some(f => fieldName.startsWith(f))) return userProfile?.unitId !== form.getValues('unitId');
    if (fieldName === 'status') return !isInstitutionalViewer;
    return true; 
  };

  const onSubmit = async (values: z.infer<typeof carSchema>) => {
    if (!firestore || !userProfile || !liveCar) return;
    setIsSubmitting(true);
    
    const isUnitResponding = userProfile.unitId === values.unitId && !isAdmin;
    let nextStatus = values.status;
    let needsVerification = liveCar?.needsVerification || false;

    const updatedComments = liveCar?.comments ? [...liveCar.comments] : [];
    if (isInstitutionalViewer && values.adminFeedback?.trim()) {
        updatedComments.push({
            text: `[QA OFFICE FEEDBACK]: ${values.adminFeedback.trim()}`,
            authorId: userProfile.id,
            authorName: `${userProfile.firstName} ${userProfile.lastName}`,
            authorRole: userRole || 'Admin',
            createdAt: new Date(),
        });
        form.setValue('adminFeedback', ''); 
    }

    if (isInstitutionalViewer) {
        if (values.adminFeedback?.trim()) nextStatus = 'Awaiting Response/Update';
    }

    if (isUnitResponding) {
        nextStatus = 'For Final Verification';
        needsVerification = true;
    }

    const finalAudit = values.effectivenessAudits?.[values.effectivenessAudits.length - 1];
    if (finalAudit && (finalAudit.action === 'Close the NC' || finalAudit.action === 'Effective')) {
        nextStatus = 'Closed';
        needsVerification = false;
    }

    const carData: any = {
      ...values,
      status: nextStatus,
      needsVerification,
      comments: updatedComments,
      nextVerificationDate: values.nextVerificationDate ? Timestamp.fromDate(new Date(values.nextVerificationDate)) : null,
      timeLimitForReply: Timestamp.fromDate(new Date(values.timeLimitForReply)),
      requestDate: Timestamp.fromDate(new Date(values.requestDate)),
      actionSteps: (values.actionSteps || []).map(step => ({ ...step, completionDate: Timestamp.fromDate(new Date(step.completionDate)) })),
      effectivenessAudits: (values.effectivenessAudits || []).map(audit => ({ ...audit, date: Timestamp.fromDate(new Date(audit.date)) })),
      updatedAt: serverTimestamp(),
    };

    try {
        if (editingCar) {
          await updateDoc(doc(firestore, 'correctiveActionRequests', editingCar.id), carData);
          toast({ title: 'Success', description: 'CAR updated.' });
        } else {
          await addDoc(collection(firestore, 'correctiveActionRequests'), { ...carData, createdAt: serverTimestamp() });
          toast({ title: 'Success', description: 'New CAR registered.' });
        }
        setIsDialogOpen(false);
        setEditingCar(null);
    } catch (e) { toast({ title: 'Error', variant: 'destructive' }); } finally { setIsSubmitting(false); }
  };

  const renderRegistryTable = (data: CorrectiveActionRequest[]) => (
    <Card className="shadow-md border-primary/10 overflow-hidden">
        <CardContent className="p-0">
        {isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div> : (
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow>
                    <TableHead className="py-4 pl-6 text-[10px] font-black uppercase"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('carNumber')}>CAR & Dates {getSortIcon('carNumber')}</Button></TableHead>
                    <TableHead className="py-4 text-[10px] font-black uppercase"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('unit')}>Responsibility {getSortIcon('unit')}</Button></TableHead>
                    <TableHead className="py-4 text-[10px] font-black uppercase">Procedure / Context</TableHead>
                    <TableHead className="text-center py-4 text-[10px] font-black uppercase"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent mx-auto" onClick={() => requestSort('deadline')}>Reply Deadline {getSortIcon('deadline')}</Button></TableHead>
                    <TableHead className="text-center py-4 text-[10px] font-black uppercase"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent mx-auto" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</Button></TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase pr-6">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map(car => (
                        <TableRow key={car.id} className={cn("transition-colors cursor-pointer group", (car.status === 'For Final Verification' || car.needsVerification) && "bg-blue-50/30")} onClick={() => handleEdit(car)}>
                        <TableCell className="pl-6 py-4">
                            <div className="flex flex-col gap-1">
                                <span className="font-black text-sm text-primary leading-none">{car.carNumber}</span>
                                <div className="flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest"><Calendar className="h-2.5 w-2.5" />Issued: {format(car.requestDate instanceof Timestamp ? car.requestDate.toDate() : new Date(car.requestDate), 'MM/dd/yy')}</div>
                            </div>
                        </TableCell>
                        <TableCell><div className="flex flex-col gap-1"><span className="text-xs font-bold text-slate-700 leading-tight">{unitMap.get(car.unitId) || '...'}</span><span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{campusMap.get(car.campusId) || '...'}</span></div></TableCell>
                        <TableCell className="max-w-xs font-bold text-xs truncate">{car.procedureTitle}</TableCell>
                        <TableCell className="text-center"><div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-600 tabular-nums"><Clock className="h-3 w-3" />{format(car.timeLimitForReply instanceof Timestamp ? car.timeLimitForReply.toDate() : new Date(car.timeLimitForReply), 'MM/dd/yy')}</div></TableCell>
                        <TableCell className="text-center">
                            <Badge className={cn("text-[9px] font-black uppercase px-2 shadow-none border-none", car.status === 'Open' ? "bg-rose-600 text-white" : car.status === 'Closed' ? "bg-emerald-600 text-white" : "bg-amber-50 text-amber-950")}>{car.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button variant="outline" size="sm" onClick={() => handlePrint(car)} className="h-8 text-[9px] font-bold bg-white shadow-sm gap-1.5"><Printer className="h-3 w-3" /> PRINT</Button>
                                <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    onClick={() => handleEdit(car)} 
                                    className="h-8 text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 gap-1.5 shadow-sm"
                                >
                                    <Target className="h-3.5 w-3.5" /> MANAGE
                                </Button>
                            </div>
                        </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )}
        </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {[{ l: 'Issued', v: carStats.total, c: 'primary' }, { l: 'Open', v: carStats.open, c: 'rose' }, { l: 'In Progress', v: carStats.inProgress, c: 'amber' }, { l: 'Verification', v: carStats.needsVerification, c: 'blue' }, { l: 'Closed', v: carStats.closed, c: 'emerald' }, { l: 'Closure Rate', v: `${carStats.total > 0 ? Math.round((carStats.closed / carStats.total) * 100) : 0}%`, c: 'emerald' }].map((s, i) => (
            <Card key={i} className={cn("border-primary/10 shadow-sm relative overflow-hidden flex flex-col p-4", s.c === 'rose' && "bg-rose-50 border-rose-100", s.c === 'amber' && "bg-amber-50 border-amber-100", s.c === 'blue' && "bg-blue-50 border-blue-100", s.c === 'emerald' && "bg-emerald-50 border-emerald-100")}>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{s.l}</p>
                <div className="text-2xl font-black tabular-nums mt-1">{s.v}</div>
            </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5"><label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Search Registry</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search CAR No, Unit..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 shadow-sm" /></div></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Site Location</label><Select value={campusFilter} onValueChange={setCampusFilter} disabled={!isInstitutionalViewer}><SelectTrigger className="h-10 font-bold bg-white"><SelectValue placeholder="All Sites" /></SelectTrigger><SelectContent>{isInstitutionalViewer && <SelectItem value="all">All Sites</SelectItem>}{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Fiscal Year</label><Select value={yearFilter} onValueChange={setYearFilter}><SelectTrigger className="h-10 font-bold bg-white"><SelectValue placeholder="All Years" /></SelectTrigger><SelectContent><SelectItem value="all">All Years</SelectItem>{years.map(y => <SelectItem key={y} value={y}>AY {y}</SelectItem>)}</SelectContent></Select></div>
        </div>
        {isInstitutionalViewer && <Button onClick={() => { setEditingCar(null); setIsDialogOpen(true); }} className="h-10 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest px-6"><PlusCircle className="mr-2 h-4 w-4" /> Issue New CAR</Button>}
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <ScrollArea className="w-full">
            <TabsList className="bg-muted p-1 border shadow-sm w-max min-w-max h-10 animate-tab-highlight rounded-md">
                {isTopManagement && (
                    <TabsTrigger value="all" className="gap-3 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                        <ListChecks className="h-3.5 w-3.5" /> 
                        Full Registry
                        <Badge variant="secondary" className="h-4 px-1 text-[8px] font-black bg-white">{carStats.total}</Badge>
                    </TabsTrigger>
                )}
                {isInstitutionalViewer && (
                    <TabsTrigger value="verification" className="gap-3 text-[10px] font-black uppercase tracking-widest px-6 h-8 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <ShieldCheck className="h-3.5 w-3.5" /> 
                        Verification Queue
                        <Badge variant="outline" className="h-4 px-1 text-[8px] font-black border-none bg-blue-100 text-blue-700">{carStats.needsVerification}</Badge>
                    </TabsTrigger>
                )}
                {!isAdmin && (
                    <TabsTrigger value="my-unit" className="gap-3 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                        <Building2 className="h-3.5 w-3.5" /> 
                        My Unit Gaps
                        <Badge variant="outline" className="h-4 px-1 text-[8px] font-black border-none bg-rose-100 text-rose-700">{carStats.myUnit}</Badge>
                    </TabsTrigger>
                )}
            </TabsList>
        </ScrollArea>
        
        <TabsContent value="all" className="mt-0 animate-in fade-in duration-500">
            {renderRegistryTable(processedCars)}
        </TabsContent>
        <TabsContent value="verification" className="mt-0 animate-in fade-in duration-500">
            {renderRegistryTable(processedCars)}
        </TabsContent>
        <TabsContent value="my-unit" className="mt-0 animate-in fade-in duration-500">
            {renderRegistryTable(processedCars)}
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) setEditingCar(null); }}>
        <DialogContent className="max-w-[95vw] lg:max-w-[1400px] h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-black uppercase flex items-center gap-2"><ShieldCheck className="text-primary h-6 w-6" />{editingCar ? 'Manage' : 'Issue'} Corrective Action Request (CAR)</DialogTitle>
                <div className="flex gap-2">
                    {liveCar && <Badge className="h-7 px-4 font-black uppercase text-[10px] border-none shadow-sm">{liveCar.status}</Badge>}
                </div>
            </div>
          </DialogHeader>
          <div className="flex-1 flex overflow-hidden bg-white">
            <ScrollArea className="flex-1 border-r">
                <Form {...form}><form id="car-form" onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-10 pb-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="carNumber" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase">CAR Number</FormLabel>
                                <FormControl><Input {...field} className="bg-slate-50 font-black h-11" disabled={isFieldReadOnly('carNumber')} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="timeLimitForReply" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-rose-600">Time Limit for Reply (Response Deadline)</FormLabel>
                                <FormControl><Input type="date" {...field} className="bg-rose-50/30 border-rose-100 font-bold h-11" disabled={isFieldReadOnly('timeLimitForReply')} /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
                        <FormField control={form.control} name="procedureTitle" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel className="text-[10px] font-black uppercase">Procedure / Context</FormLabel>
                                <FormControl><Input {...field} className="bg-slate-50" disabled={isFieldReadOnly('procedureTitle')} /></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="concerningClause" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase">ISO Clause</FormLabel>
                                <FormControl><Input {...field} className="bg-slate-50 font-mono" disabled={isFieldReadOnly('concerningClause')} /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="descriptionOfNonconformance" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase">Statement of Non-Conformance</FormLabel>
                            <FormControl><Textarea {...field} rows={4} className="bg-slate-50 italic" disabled={isFieldReadOnly('descriptionOfNonconformance')} /></FormControl>
                        </FormItem>
                    )} />
                    
                    <Separator />
                    
                    <div className="pt-6 space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2"><Activity className="h-4 w-4" /> Root Cause & Unit Action Registry</h4>
                        <FormField control={form.control} name="rootCauseAnalysis" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500">Root Cause Analysis (RCA)</FormLabel>
                                <FormControl><Textarea {...field} value={field.value || ''} rows={4} placeholder="Identify systemic failure..." className="bg-muted/5 italic" disabled={isFieldReadOnly('rootCauseAnalysis')} /></FormControl>
                            </FormItem>
                        )} />
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Corrective Actions & Target Dates</Label>
                            {actionFields.map((field, idx) => (
                                <Card key={field.id} className="p-4 rounded-xl border bg-muted/5 shadow-sm space-y-4 group relative">
                                    {!isFieldReadOnly('actionSteps') && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAction(idx)} className="absolute top-1 right-1 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3.5 w-3.5" /></Button>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                        <div className="md:col-span-3">
                                            <FormField control={form.control} name={`actionSteps.${idx}.type`} render={({ field: iF }) => (
                                                <Select onValueChange={iF.onChange} value={iF.value} disabled={isFieldReadOnly('actionSteps')}>
                                                    <FormControl><SelectTrigger className="h-8 text-[10px] bg-white font-bold"><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Immediate Correction">Immediate</SelectItem>
                                                        <SelectItem value="Long-term Corrective Action">Long-term</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )} />
                                        </div>
                                        <div className="md:col-span-5">
                                            <FormField control={form.control} name={`actionSteps.${idx}.description`} render={({ field: iF }) => (
                                                <FormControl><Input {...iF} placeholder="Describe action step..." className="h-8 text-[10px] bg-white" disabled={isFieldReadOnly('actionSteps')} /></FormControl>
                                            )} />
                                        </div>
                                        <div className="md:col-span-4">
                                            <FormField control={form.control} name={`actionSteps.${idx}.completionDate`} render={({ field: iF }) => (
                                                <FormItem><FormLabel className="text-[8px] font-black uppercase text-muted-foreground">Target Date</FormLabel>
                                                <FormControl><Input type="date" {...iF} className="h-8 text-[10px] bg-white font-black" disabled={isFieldReadOnly('actionSteps')} /></FormControl></FormItem>
                                            )} />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name={`actionSteps.${idx}.evidenceLink`} render={({ field: iF }) => (
                                            <FormItem>
                                                <FormLabel className="text-[8px] font-black uppercase text-blue-700 flex items-center gap-1">
                                                    <LinkIcon className="h-2.5 w-2.5" /> Unit Evidence Link (Google Drive)
                                                </FormLabel>
                                                <div className="flex gap-2">
                                                    <FormControl><Input {...iF} value={iF.value || ''} placeholder="https://drive.google.com/..." className="h-8 text-[10px] bg-white border-blue-100" disabled={isFieldReadOnly('actionSteps')} /></FormControl>
                                                    {iF.value && (
                                                        <Button type="button" variant="outline" size="sm" className="h-8 bg-blue-50 text-blue-700 font-bold text-[9px]" asChild>
                                                            <a href={iF.value} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" /> View</a>
                                                        </Button>
                                                    )}
                                                </div>
                                            </FormItem>
                                        )} />

                                        {isInstitutionalViewer && (
                                            <div className="flex flex-col gap-2 p-3 rounded-lg border bg-primary/5">
                                                <Label className="text-[8px] font-black uppercase text-primary">Audit Action Verification</Label>
                                                <div className="flex gap-2">
                                                    <FormField control={form.control} name={`actionSteps.${idx}.verificationStatus`} render={({ field: iF }) => (
                                                        <Select onValueChange={iF.onChange} value={iF.value || 'Pending'}>
                                                            <FormControl><SelectTrigger className="h-7 text-[9px] font-black bg-white"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="Pending">Pending Audit</SelectItem>
                                                                <SelectItem value="Accepted">Accept Action</SelectItem>
                                                                <SelectItem value="Not Accepted">Not Accept Action</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )} />
                                                    <FormField control={form.control} name={`actionSteps.${idx}.verificationRemarks`} render={({ field: iF }) => (
                                                        <FormControl><Input {...iF} placeholder="Audit remarks..." className="h-7 text-[9px] bg-white" /></FormControl>
                                                    )} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                            {!isFieldReadOnly('actionSteps') && (
                                <Button type="button" variant="outline" size="sm" onClick={() => appendAction({ description: '', type: 'Immediate Correction', completionDate: format(new Date(), 'yyyy-MM-dd'), status: 'Pending', evidenceLink: '', verificationStatus: 'Pending', verificationRemarks: '' })} className="w-full h-10 border-dashed font-black text-[9px] uppercase">
                                    <PlusCircle className="h-3 w-3 mr-2" /> Add Correction Step
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="pt-10 border-t space-y-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600"><Gavel className="h-6 w-6" /></div>
                                <h4 className="text-sm font-black uppercase text-indigo-900 tracking-tight">Institutional Oversight & Verification</h4>
                            </div>
                            {isInstitutionalViewer && (
                                <FormField control={form.control} name="nextVerificationDate" render={({ field }) => (
                                    <FormItem className="w-64">
                                        <FormLabel className="text-[9px] font-black uppercase text-primary">Schedule Next Verification</FormLabel>
                                        <FormControl><Input type="date" {...field} className="h-9 font-bold bg-white border-primary/20 shadow-inner" /></FormControl>
                                        <FormDescription className="text-[8px]">Set a reminder for the follow-up audit.</FormDescription>
                                    </FormItem>
                                )} />
                            )}
                        </div>

                        <div className="space-y-6">
                            <h5 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest border-b pb-1">Final Verification of Effectiveness</h5>
                            {effectivenessFields.map((field, idx) => (
                                <div key={field.id} className="p-5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 space-y-4 relative group">
                                    {isInstitutionalViewer && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEffectiveness(idx)} className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></Button>
                                    )}
                                    <FormField control={form.control} name={`effectivenessAudits.${idx}.result`} render={({ field: iF }) => (
                                        <FormItem><FormLabel className="text-[9px] font-black uppercase text-emerald-700">Audit Determination Summary</FormLabel>
                                            <FormControl><Textarea {...iF} rows={3} className="bg-white text-xs italic" placeholder="Summarize overall effectiveness analysis..." disabled={isFieldReadOnly(`effectivenessAudits.${idx}.result`)} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField control={form.control} name={`effectivenessAudits.${idx}.action`} render={({ field: iF }) => (
                                            <FormItem><FormLabel className="text-[9px] font-black uppercase text-emerald-700">Determination</FormLabel>
                                                <Select onValueChange={iF.onChange} value={iF.value} disabled={isFieldReadOnly(`effectivenessAudits.${idx}.action`)}>
                                                    <FormControl><SelectTrigger className="h-9 text-[9px] bg-white font-bold"><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Effective">Verified Effective (Close NC)</SelectItem>
                                                        <SelectItem value="Not Effective">Not Effective (More Action Required)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name={`effectivenessAudits.${idx}.verifiedBy`} render={({ field: iF }) => (
                                            <FormItem><FormLabel className="text-[9px] font-black uppercase text-emerald-700">Verified by</FormLabel><FormControl><Input {...iF} className="h-9 text-10px] bg-white" disabled={isFieldReadOnly(`effectivenessAudits.${idx}.verifiedBy`)} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name={`effectivenessAudits.${idx}.date`} render={({ field: iF }) => (
                                            <FormItem><FormLabel className="text-[9px] font-black uppercase text-emerald-700">Date</FormLabel><FormControl><Input type="date" {...iF} className="h-9 text-[10px] bg-white font-black" disabled={isFieldReadOnly(`effectivenessAudits.${idx}.date`)} /></FormControl></FormItem>
                                        )} />
                                    </div>
                                </div>
                            ))}
                            {isInstitutionalViewer && (
                                <Button type="button" variant="outline" size="sm" onClick={() => appendEffectiveness({ result: '', verifiedBy: userProfile?.firstName + ' ' + userProfile?.lastName, date: format(new Date(), 'yyyy-MM-dd'), action: 'Effective', remarks: '' })} className="w-full border-dashed h-9 border-emerald-200 text-emerald-700 font-black text-[9px] uppercase hover:bg-emerald-50">
                                    Add Effectiveness Audit Result
                                </Button>
                            )}
                        </div>
                    </div>
                </form></Form>
            </ScrollArea>
            <div className="hidden lg:flex w-[400px] flex-col bg-muted/10 shrink-0 border-l overflow-hidden">
                <div className="p-4 bg-white border-b shrink-0 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /><h4 className="text-[10px] font-black uppercase text-slate-700">Auditor / Admin Registry Feedback</h4></div>
                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-4">
                        {isInstitutionalViewer && (
                            <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-3">
                                <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Internal Feedback Panel</Label>
                                <Textarea 
                                    placeholder="Add specific instructions for the unit coordinator..." 
                                    className="bg-white text-xs italic"
                                    value={form.watch('adminFeedback')}
                                    onChange={(e) => form.setValue('adminFeedback', e.target.value)}
                                />
                                <p className="text-[8px] text-muted-foreground">Feedback provided here will be stored in the permanent audit trail.</p>
                            </div>
                        )}

                        {liveCar?.comments?.map((c, i) => (
                            <div key={i} className="p-4 rounded-xl border bg-white shadow-sm space-y-2">
                                <div className="flex justify-between border-b pb-1 mb-1 text-[8px] font-black uppercase text-primary">
                                    <span>{c.authorName}</span>
                                    <span>{format(c.createdAt instanceof Date ? c.createdAt : (c.createdAt as any).toDate(), 'MMM dd, p')}</span>
                                </div>
                                <p className="text-[11px] text-slate-700 italic leading-relaxed whitespace-pre-wrap">"{c.text}"</p>
                                <p className="text-[7px] text-right text-muted-foreground uppercase font-black">{c.authorRole}</p>
                            </div>
                        ))}
                        {!liveCar?.comments?.length && (
                            <div className="py-20 text-center opacity-10 flex flex-col items-center gap-2">
                                <HistoryIcon className="h-10 w-10"/>
                                <p className="text-[10px] font-black uppercase">No history</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-6 border-t bg-slate-50/50">
                    <div className="flex items-start gap-3">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5"/>
                        <p className="text-[10px] text-muted-foreground leading-relaxed italic">Changes to CAR dates or status immediately trigger system notifications to all relevant unit heads and supervisors.</p>
                    </div>
                </div>
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Discard</Button>
            <Button type="submit" form="car-form" disabled={isSubmitting} className="min-w-[180px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] h-11">
                {(isSubmitting) ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4 mr-2"/>}{editingCar ? 'Update Registry' : 'Issue Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
