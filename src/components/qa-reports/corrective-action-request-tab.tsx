'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp, where } from 'firebase/firestore';
import type { CorrectiveActionRequest, Campus, Unit, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
    Building2,
    Send,
    X,
    ThumbsUp,
    ThumbsDown,
    RefreshCcw
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
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { renderToStaticMarkup } from 'react-dom/server';
import { CARPrintTemplate } from './car-print-template';
import { CARControlRegisterTemplate } from './car-control-register-template';
import { Label } from '../ui/label';
import { getOfficialServerTime } from '@/lib/actions';
import { Checkbox } from '../ui/checkbox';

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
  const { userProfile, isAdmin, userRole } = useUser();
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

  const isInstitutionalViewer = isAdmin || (userRole && /auditor|quality assurance/i.test(userRole));

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
  }, [rawCars, searchTerm, yearFilter, campusFilter, sortConfig, activeSubTab, unitMap, userProfile, isAdmin, userRole, isInstitutionalViewer]);

  const carStats = useMemo(() => {
    if (!rawCars || !userProfile) return { total: 0, open: 0, inProgress: 0, closed: 0, needsVerification: 0, successRate: 0 };
    
    const isCampusSupervisor = userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president');

    const filteredForScope = rawCars.filter(car => {
        if (isInstitutionalViewer) return true;
        if (isCampusSupervisor) return car.campusId === userProfile.campusId;
        return car.unitId === userProfile.unitId;
    });

    const total = filteredForScope.length;
    const open = filteredForScope.filter(c => c.status === 'Open').length;
    const inProgress = filteredForScope.filter(c => c.status === 'In Progress').length;
    const closed = filteredForScope.filter(c => c.status === 'Closed').length;
    const needsVerification = filteredForScope.filter(c => c.needsVerification).length;
    const successRate = total > 0 ? Math.round((closed / total) * 100) : 100;

    return { total, open, inProgress, closed, needsVerification, successRate };
  }, [rawCars, userProfile, isAdmin, userRole, isInstitutionalViewer]);

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

  const handleEdit = (car: CorrectiveActionRequest) => {
    setEditingCar(car);
    const safeDate = (d: any) => {
        if (!d) return '';
        const date = d instanceof Timestamp ? d.toDate() : new Date(d);
        if (isNaN(date.getTime())) return '';
        return format(date, 'yyyy-MM-dd');
    };
    
    form.reset({
        ...car,
        timeLimitForReply: safeDate(car.timeLimitForReply),
        requestDate: safeDate(car.requestDate),
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
        }))
    });
    setIsDialogOpen(true);
  };

  const handlePrint = (car: CorrectiveActionRequest) => {
    const cName = campusMap.get(car.campusId) || 'Unknown Campus';
    const uName = unitMap.get(car.unitId) || 'Unknown Unit';

    try {
        const reportHtml = renderToStaticMarkup(
            <CARPrintTemplate 
                car={car} 
                unitName={uName} 
                campusName={cName} 
                signatories={signatories || undefined} 
            />
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
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print CAR</button>
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
        toast({ title: "Print Failed", description: "Could not generate the CAR report.", variant: "destructive" });
    }
  };

  const handlePrintRegistry = () => {
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
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>CAR Control Register - AY ${yearFilter}</title>
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
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Control Register</button>
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
        toast({ title: "Print Failed", description: "Could not generate the control register.", variant: "destructive" });
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

    try {
        if (editingCar) {
          const docRef = doc(firestore, 'correctiveActionRequests', editingCar.id);
          await updateDoc(docRef, carData);
          toast({ title: 'Success', description: 'CAR record updated.' });
        } else {
          const colRef = collection(firestore, 'correctiveActionRequests');
          await addDoc(colRef, { ...carData, createdAt: serverTimestamp() });
          toast({ title: 'Success', description: 'New CAR registered.' });
        }
        setIsDialogOpen(false);
        form.reset();
        setEditingCar(null);
    } catch (e) {
        toast({ title: 'Submission Error', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const isFieldReadOnly = (fieldName: string) => {
    if (isAdmin) return false;
    if (fieldName.startsWith('followUpLogs') || fieldName.startsWith('effectivenessAudits')) return !isInstitutionalViewer;
    const responderFields = ['rootCauseAnalysis', 'actionSteps'];
    if (responderFields.includes(fieldName)) return userProfile?.unitId !== form.getValues('unitId');
    if (fieldName === 'status') return !isInstitutionalViewer;
    return true; 
  };

  const isInvestigationStarted = !!form.watch('rootCauseAnalysis')?.trim();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 p-3 opacity-5"><FileText className="h-12 w-12" /></div>
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Issued Requests</CardTitle></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-primary tabular-nums">{carStats.total}</div><p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">Total CARs Logged</p></CardContent>
        </Card>
        <Card className="bg-rose-50 border-rose-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-700">Open Gaps</CardTitle></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-rose-600 tabular-nums">{carStats.open}</div><p className="text-[9px] font-bold text-rose-600/70 mt-1 uppercase">Open Status</p></CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">In-Progress</CardTitle></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-amber-600 tabular-nums">{carStats.inProgress}</div><p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase">Active Treatment</p></CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Verification Pending</CardTitle></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-blue-600 tabular-nums">{carStats.needsVerification}</div><p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase">Handed off by Units</p></CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Resolution Rate</CardTitle></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-emerald-600 tabular-nums">{carStats.total > 0 ? Math.round((carStats.closed / carStats.total) * 100) : 0}%</div><p className="text-[9px] font-bold text-green-600/70 mt-1 uppercase tracking-tighter">Effectiveness Score</p></CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Closure Maturity</CardTitle></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-emerald-600 tabular-nums">{carStats.successRate}%</div><p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase">Success Score</p></CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1 w-full space-y-1.5 md:space-y-0">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><Search className="h-2.5 w-2.5" /> Search Registry</label>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search CAR No, Unit, or Procedure..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 shadow-sm bg-background border-primary/10" /></div>
            </div>
            <div className="w-full md:w-48 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><School className="h-2.5 w-2.5" /> Campus / Site</label>
                <Select value={campusFilter} onValueChange={setCampusFilter}><SelectTrigger className="h-10 bg-background border-primary/10 font-bold shadow-sm"><SelectValue placeholder="All Sites" /></SelectTrigger><SelectContent><SelectItem value="all">All Sites</SelectItem>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="w-full md:w-48 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><Calendar className="h-2.5 w-2.5" /> Fiscal Year</label>
                <Select value={yearFilter} onValueChange={setYearFilter}><SelectTrigger className="h-10 bg-background border-primary/10 font-bold shadow-sm"><SelectValue placeholder="All Years" /></SelectTrigger><SelectContent><SelectItem value="all">All Years</SelectItem>{years.map(y => <SelectItem key={y} value={y}>AY {y}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-5">
            {isInstitutionalViewer && <Button variant="outline" onClick={handlePrintRegistry} disabled={processedCars.length === 0} className="h-10 bg-white border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest gap-2"><TableProperties className="h-4 w-4" /> Print Control Register</Button>}
            {isInstitutionalViewer && <Button onClick={() => { setEditingCar(null); setIsDialogOpen(true); }} className="h-10 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest px-6"><PlusCircle className="mr-2 h-4 w-4" /> Issue New CAR</Button>}
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="bg-muted p-1 border shadow-sm w-fit h-10 animate-tab-highlight rounded-md">
            <TabsTrigger value="all" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><ListChecks className="h-3.5 w-3.5" /> Full Registry</TabsTrigger>
            {isInstitutionalViewer && (
                <TabsTrigger value="verification" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8 data-[state=active]:bg-blue-600 data-[state=active]:text-white"><ShieldCheck className="h-3.5 w-3.5" /> Verification Queue {carStats.needsVerification > 0 && <Badge className="ml-2 bg-white text-blue-600 border-none h-4 px-1 text-[8px] font-black">{carStats.needsVerification}</Badge>}</TabsTrigger>
            )}
            {!isAdmin && <TabsTrigger value="my-unit" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><Building2 className="h-3.5 w-3.5" /> My Unit Gaps</TabsTrigger>}
        </TabsList>

        <TabsContent value={activeSubTab} className="mt-0 animate-in fade-in duration-500">
            <Card className="shadow-md border-primary/10 overflow-hidden">
                <CardContent className="p-0">
                {isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                            <TableHead className="py-4 pl-6"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('carNumber')}>CAR Number & Unit {getSortIcon('carNumber')}</Button></TableHead>
                            <TableHead className="py-4"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('unit')}>Responsible Office {getSortIcon('unit')}</Button></TableHead>
                            <TableHead className="py-4"><div className="text-[10px] font-black uppercase">Procedure / Context</div></TableHead>
                            <TableHead className="text-center py-4"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent mx-auto" onClick={() => requestSort('deadline')}>Deadline {getSortIcon('deadline')}</Button></TableHead>
                            <TableHead className="text-center py-4"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent mx-auto" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</Button></TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processedCars.map((car, index) => (
                                <TableRow key={car.id} className={cn("transition-colors group", car.needsVerification && "bg-blue-50/30")}>
                                <TableCell className="pl-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2"><span className="font-black text-sm text-primary leading-none group-hover:underline underline-offset-4">{car.carNumber}</span>{car.needsVerification && <Badge variant="outline" className="h-4 text-[7px] font-black border-blue-200 text-blue-700 bg-white animate-pulse">UNIT RESPONDED</Badge>}</div>
                                        <div className="flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest"><HistoryIcon className="h-2.5 w-2.5" />Logged: {format(car.requestDate instanceof Timestamp ? car.requestDate.toDate() : new Date(car.requestDate), 'MM/dd/yy')}</div>
                                    </div>
                                </TableCell>
                                <TableCell><div className="flex flex-col gap-1"><span className="text-xs font-bold text-slate-700 leading-tight">{unitMap.get(car.unitId) || '...'}</span><span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{campusMap.get(car.campusId) || '...'}</span></div></TableCell>
                                <TableCell className="max-w-xs font-bold text-xs"><p className="truncate text-slate-900 uppercase tracking-tighter">{car.procedureTitle}</p><p className="text-[10px] text-muted-foreground line-clamp-1 italic font-medium">"{car.descriptionOfNonconformance}"</p></TableCell>
                                <TableCell className="text-center"><div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-600 uppercase tracking-tighter tabular-nums bg-muted/30 py-1 px-2 rounded border border-slate-100"><Clock className="h-3 w-3 text-muted-foreground" />{format(car.timeLimitForReply instanceof Timestamp ? car.timeLimitForReply.toDate() : new Date(car.timeLimitForReply), 'MM/dd/yy')}</div></TableCell>
                                <TableCell className="text-center"><Badge className={cn("text-[9px] font-black uppercase border-none px-2 shadow-sm whitespace-nowrap", car.status === 'Open' ? "bg-rose-600 text-white" : car.status === 'In Progress' ? "bg-amber-50 text-amber-950" : "bg-emerald-600 text-white")}>{car.status}</Badge></TableCell>
                                <TableCell className="text-right pr-6 space-x-2 whitespace-nowrap">
                                    <Button variant="outline" size="sm" onClick={() => handlePrint(car)} className="h-8 text-[10px] font-bold bg-white shadow-sm gap-1.5"><Printer className="h-3 w-3" /> PRINT</Button>
                                    <Button variant="default" size="sm" onClick={() => handleEdit(car)} className="h-8 text-[10px] font-black uppercase tracking-widest bg-primary shadow-sm px-4">{isInstitutionalViewer || car.unitId === userProfile?.unitId ? 'MANAGE' : 'VIEW'}</Button>
                                </TableCell>
                                </TableRow>
                            ))}
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
            <div className="flex items-center gap-2 text-primary mb-1"><ShieldCheck className="h-5 w-5" /><span className="text-[10px] font-black uppercase tracking-widest">Institutional Document Control</span></div>
            <DialogTitle>{editingCar ? 'Modify' : 'Issue'} Corrective Action Request (CAR)</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex overflow-hidden bg-white">
            <div className="flex-1 flex flex-col min-w-0 border-r bg-background">
                <ScrollArea className="flex-1">
                    <Form {...form}>
                        <form id="car-form" onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-10 pb-20">
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
                                    <FormItem><FormLabel className="text-xs font-bold uppercase">Source</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly('source')}><FormControl><SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Audit Finding">Audit Finding</SelectItem><SelectItem value="Legal Non-compliance">Legal Non-compliance</SelectItem><SelectItem value="Non-conforming Service">Non-conforming Service</SelectItem><SelectItem value="Others">Others</SelectItem></SelectContent></Select></FormItem>
                                )} />
                                <FormField control={form.control} name="initiator" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-bold uppercase">Initiator</FormLabel><FormControl><Input {...field} className="bg-slate-50" disabled={isFieldReadOnly('initiator')} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="natureOfFinding" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-bold uppercase">Nature of Finding</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly('natureOfFinding')}><FormControl><SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="NC">NC</SelectItem><SelectItem value="OFI">OFI</SelectItem></SelectContent></Select></FormItem>
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

                            <FormField control={form.control} name="descriptionOfNonconformance" render={({ field }) => (
                                <FormItem><FormLabel className="text-sm font-black text-slate-800 uppercase tracking-tight">Statement of Non-Conformance</FormLabel><FormControl><Textarea {...field} rows={4} className="bg-slate-50 italic" disabled={isFieldReadOnly('descriptionOfNonconformance')} /></FormControl><FormMessage /></FormItem>
                            )} />

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
                                <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /><h4 className="text-sm font-black text-primary uppercase tracking-tight">Root Cause Analysis</h4></div>
                                <FormField control={form.control} name="rootCauseAnalysis" render={({ field }) => (
                                    <FormItem><FormControl><Textarea {...field} value={field.value || ''} rows={4} placeholder="Identify the systematic reason why this non-conformance occurred..." className="bg-primary/5 border-primary/10 shadow-inner italic" disabled={isFieldReadOnly('rootCauseAnalysis')} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>

                            <div className={cn("pt-6 border-t space-y-4 transition-all duration-500", !isInvestigationStarted && "opacity-50 pointer-events-none grayscale")}>
                                <div className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /><h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Corrective Action Registry</h4></div>
                                {actionFields.map((field, index) => (
                                    <div key={field.id} className="p-4 rounded-lg border bg-muted/5 relative group space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-3"><FormField control={form.control} name={`actionSteps.${index}.type`} render={({ field: inputField }) => (<FormItem><FormLabel className="text-[9px] uppercase font-bold">Action Type</FormLabel><Select onValueChange={inputField.onChange} value={inputField.value} disabled={isFieldReadOnly('actionSteps')}><FormControl><SelectTrigger className="h-8 text-[10px] bg-white"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Immediate Correction">Immediate Correction</SelectItem><SelectItem value="Long-term Corrective Action">Long-term Action</SelectItem></SelectContent></Select></FormItem>)} /></div>
                                            <div className="md:col-span-6"><FormField control={form.control} name={`actionSteps.${index}.description`} render={({ field: inputField }) => (<FormItem><FormLabel className="text-[9px] uppercase font-bold">Action Taken</FormLabel><FormControl><Input {...inputField} className="h-8 text-[10px] bg-white" disabled={isFieldReadOnly('actionSteps')} /></FormControl></FormItem>)} /></div>
                                            <div className="md:col-span-3"><FormField control={form.control} name={`actionSteps.${index}.completionDate`} render={({ field: inputField }) => (<FormItem><FormLabel className="text-[9px] uppercase font-bold">Target Date</FormLabel><FormControl><Input type="date" {...inputField} className="h-8 text-[10px] bg-white" disabled={isFieldReadOnly('actionSteps')} /></FormControl></FormItem>)} /></div>
                                        </div>
                                        <FormField control={form.control} name={`actionSteps.${index}.evidenceLink`} render={({ field: inputField }) => (
                                            <FormItem><FormLabel className="text-[9px] font-black uppercase text-blue-600 flex items-center gap-1"><LinkIcon className="h-2 w-2" /> Evidence Link (Google Drive)</FormLabel>
                                                <FormControl><div className="flex gap-2"><Input {...inputField} value={inputField.value || ''} placeholder="https://drive.google.com/..." className="h-8 text-[10px] bg-blue-50/30 border-blue-100 flex-1" disabled={isFieldReadOnly('actionSteps')} />{inputField.value?.startsWith('https://drive.google.com/') && <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-[9px] font-black bg-white gap-1.5" asChild><a href={inputField.value} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /> VIEW</a></Button>}</div></FormControl>
                                            </FormItem>
                                        )} />
                                        {!isFieldReadOnly('actionSteps') && <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAction(index)} disabled={actionFields.length === 1}><Trash2 className="h-4 w-4" /></Button>}
                                    </div>
                                ))}
                                {!isFieldReadOnly('actionSteps') && <Button type="button" variant="outline" size="sm" onClick={() => appendAction({ description: '', type: 'Immediate Correction', completionDate: format(new Date(), 'yyyy-MM-dd'), status: 'Pending', evidenceLink: '' })} className="w-full border-dashed h-10 font-black text-[10px] uppercase gap-2"><PlusCircle className="h-3.5 w-3.5" /> Add Corrective Step</Button>}
                            </div>

                            <div className="space-y-10 pt-10 border-t border-dashed">
                                <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><Gavel className="h-6 w-6" /></div><div className="space-y-0.5"><h4 className="text-sm font-black uppercase text-indigo-900 tracking-tight">Institutional Oversight & Verification</h4><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Internal Auditor / Quality Assurance Office Use Only</p></div></div>{isInstitutionalViewer && <div className="flex gap-2"><Button type="button" variant="outline" size="sm" className="h-8 font-black text-[10px] uppercase" onClick={() => appendFollowUp({ result: '', verifiedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '', date: format(new Date(), 'yyyy-MM-dd'), remarks: '' })}><PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Follow-up Log</Button><Button type="button" variant="outline" size="sm" className="h-8 font-black text-[10px] uppercase border-indigo-200 text-indigo-700 bg-indigo-50" onClick={() => appendEffectiveness({ result: '', verifiedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '', date: format(new Date(), 'yyyy-MM-dd'), action: 'Continue Monitoring the NC', remarks: '' })}><PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Final Verification</Button></div>}</div>
                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">III. Follow-up Result Registry</h5>
                                    {followUpFields.map((field, index) => (
                                        <div key={field.id} className="p-6 rounded-2xl border bg-slate-50/50 relative group space-y-6">
                                            {isAdmin && (
                                                <div className="space-y-3 p-4 rounded-xl border-2 border-primary/20 bg-white shadow-sm animate-in slide-in-from-top-2 duration-300">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><ListChecks className="h-4 w-4" /> Action Verification Workspace</p>
                                                    <div className="space-y-2">
                                                        {form.getValues('actionSteps')?.map((step, sIdx) => (
                                                            <div key={sIdx} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-slate-50 transition-all">
                                                                <span className="font-bold text-[11px] text-slate-800 truncate flex-1">{step.description}</span>
                                                                <div className="flex gap-2 shrink-0"><Button type="button" variant="secondary" size="sm" className="h-7 text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 gap-1" onClick={() => { const cur = form.getValues(`followUpLogs.${index}.result`) || ''; form.setValue(`followUpLogs.${index}.result`, `${cur}${cur ? '\n' : ''}[VERIFIED]: ${step.description}`); }}><Check className="h-3 w-3" /> Verified</Button><Button type="button" variant="secondary" size="sm" className="h-7 text-[9px] font-black uppercase bg-rose-100 text-rose-700 gap-1" onClick={() => { const cur = form.getValues(`followUpLogs.${index}.result`) || ''; form.setValue(`followUpLogs.${index}.result`, `${cur}${cur ? '\n' : ''}[GAP]: ${step.description}`); }}><X className="h-3 w-3" /> Not Met</Button></div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name={`followUpLogs.${index}.result`} render={({ field: inputField }) => (<FormItem className="md:col-span-2"><FormLabel className="text-[9px] font-black uppercase">Official Auditor Observation</FormLabel><FormControl><Textarea {...inputField} rows={4} className="bg-white text-xs italic" disabled={isFieldReadOnly(`followUpLogs.${index}.result`)} /></FormControl></FormItem>)} />
                                                <FormField control={form.control} name={`followUpLogs.${index}.verifiedBy`} render={({ field: inputField }) => (<FormItem><FormLabel className="text-[9px] font-black uppercase">Verified By</FormLabel><FormControl><Input {...inputField} className="h-8 text-xs bg-white" disabled={isFieldReadOnly(`followUpLogs.${index}.verifiedBy`)} /></FormControl></FormItem>)} />
                                                <FormField control={form.control} name={`followUpLogs.${index}.date`} render={({ field: inputField }) => (<FormItem><FormLabel className="text-[9px] font-black uppercase">Date</FormLabel><FormControl><Input type="date" {...inputField} className="h-8 text-xs bg-white" disabled={isFieldReadOnly(`followUpLogs.${index}.date`)} /></FormControl></FormItem>)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-black uppercase text-indigo-700 tracking-widest border-b pb-1">IV. Verification of Effectiveness Audit</h5>
                                    {effectivenessFields.map((field, index) => (
                                        <div key={field.id} className="p-6 rounded-2xl border-2 border-indigo-100 bg-indigo-50/20 relative group space-y-6">
                                            <FormField control={form.control} name={`effectivenessAudits.${index}.result`} render={({ field: inputField }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase text-indigo-900">Final Determination & Evidence</FormLabel><FormControl><Textarea {...inputField} rows={4} className="bg-white border-indigo-100 text-sm shadow-inner" disabled={isFieldReadOnly(`effectivenessAudits.${index}.result`)} /></FormControl></FormItem>)} />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <FormField control={form.control} name={`effectivenessAudits.${index}.action`} render={({ field: inputField }) => (<FormItem className="md:col-span-2"><FormLabel className="text-[10px] font-black uppercase text-primary">Final Verification Action</FormLabel><Select onValueChange={inputField.onChange} value={inputField.value} disabled={isFieldReadOnly(`effectivenessAudits.${index}.action`)}><FormControl><SelectTrigger className="bg-white font-black h-11"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Close the NC" className="font-black text-emerald-600">1. Close the NC</SelectItem><SelectItem value="Continue Monitoring the NC">2. Continue Monitoring</SelectItem><SelectItem value="Provide More Actions to Address the NC">3. Provide More Actions</SelectItem></SelectContent></Select></FormItem>)} />
                                                <FormField control={form.control} name={`effectivenessAudits.${index}.verifiedBy`} render={({ field: inputField }) => (<FormItem><FormLabel className="text-[9px] font-black uppercase">Verified By</FormLabel><FormControl><Input {...inputField} className="h-8 text-xs bg-white" disabled={isFieldReadOnly(`effectivenessAudits.${index}.verifiedBy`)} /></FormControl></FormItem>)} />
                                                <FormField control={form.control} name={`effectivenessAudits.${index}.date`} render={({ field: inputField }) => (<FormItem><FormLabel className="text-[9px] font-black uppercase">Date</FormLabel><FormControl><Input type="date" {...inputField} className="h-8 text-xs bg-white" disabled={isFieldReadOnly(`effectivenessAudits.${index}.date`)} /></FormControl></FormItem>)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>
                    </Form>
                </ScrollArea>
            </div>

            <div className="hidden lg:flex w-[420px] flex-col bg-muted/10 shrink-0 border-l overflow-hidden">
                <div className="p-4 border-b font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 bg-white"><Info className="h-4 w-4" /> Response Protocol & Guidance</div>
                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-8">
                        <section className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><Building2 className="h-4 w-4" /> Unit Responsibilities</h4>
                            <div className="space-y-4">
                                {[
                                    { step: '1', title: 'Investigation', desc: 'Perform a root cause analysis to identify systematic failures.', icon: <Search className="h-4 w-4" /> },
                                    { step: '2', title: 'Correction', desc: 'Identify immediate steps to fix the issue and mitigate impact.', icon: <CheckCircle2 className="h-4 w-4" /> },
                                    { step: '3', title: 'Action Plan', desc: 'Define long-term corrective actions to prevent recurrence.', icon: <ListChecks className="h-4 w-4" /> },
                                    { step: '4', title: 'Submit', desc: 'Upload evidence and notify QA for final verification.', icon: <Send className="h-4 w-4" /> }
                                ].map((s, idx) => (
                                    <div key={idx} className="flex gap-4 group"><div className="flex flex-col items-center"><div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-[10px] group-hover:bg-primary group-hover:text-white transition-colors">{s.step}</div>{idx < 3 && <div className="w-0.5 h-full bg-slate-100 my-1" />}</div><div className="space-y-1 pb-4"><p className="text-xs font-black uppercase tracking-tight text-slate-800">{s.title}</p><p className="text-[10px] text-muted-foreground leading-relaxed italic">{s.desc}</p></div></div>
                                ))}
                            </div>
                        </section>
                        <Separator />
                        <section className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700 flex items-center gap-2"><Gavel className="h-4 w-4" /> Institutional Oversight</h4>
                            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-2"><p className="text-[10px] text-indigo-800 leading-relaxed font-medium">Part III & IV are reserved for QA Office. Auditors will verify implementation effectiveness based on your digital evidence.</p></div>
                        </section>
                    </div>
                </ScrollArea>
                <div className="p-4 bg-muted/10 border-t mt-auto"><p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest text-center">RSU EOMS Portal v2.5.0</p></div>
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Discard</Button>
            <Button type="submit" form="car-form" disabled={isSubmitting} className="min-w-[180px] shadow-xl shadow-primary/20 font-black uppercase text-xs">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 mr-1.5" />}{editingCar ? 'Update Registry' : 'Issue Record'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}