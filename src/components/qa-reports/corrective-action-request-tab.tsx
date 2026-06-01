'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, deleteDoc, doc, addDoc, serverTimestamp, updateDoc, Timestamp, arrayUnion, orderBy } from 'firebase/firestore';
import type { CorrectiveActionRequest, Campus, Unit, Signatories, Comment } from '@/lib/types';
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
    History, 
    Info, 
    User, 
    ShieldCheck, 
    Hash, 
    ChevronRight, 
    Edit, 
    Gavel, 
    MessageSquare, 
    Search, 
    ArrowUpDown, 
    ClipboardList, 
    Undo2, 
    Printer, 
    Target, 
    Filter, 
    Building2, 
    Activity, 
    Link as LinkIcon,
    Save,
    Clock,
    ShieldAlert,
    AlertTriangle,
    CheckCircle2,
    Send,
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
import { AuditorNCManager } from '@/components/audit/auditor-nc-manager';
import { renderToStaticMarkup } from 'react-dom/server';
import { CARPrintTemplate } from './car-print-template';
import { CARControlRegisterTemplate } from './car-control-register-template';

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
    remarks: z.string().optional().or(z.literal('')),
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

export function CorrectiveActionRequestTab({ campuses, units, canManage }: CorrectiveActionRequestTabProps) {
  const { userProfile, isAdmin, userRole, isAuditor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<CorrectiveActionRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters for CAR registry
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');

  const isInstitutionalViewer = isAdmin || isAuditor;

  const carQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'correctiveActionRequests'), orderBy('createdAt', 'desc')) : null), [firestore]);
  const { data: rawCars, isLoading: isLoadingCars } = useCollection<CorrectiveActionRequest>(carQuery);

  const liveCar = useMemo(() => {
    if (!editingCar || !rawCars) return editingCar;
    return rawCars.find(c => c.id === editingCar.id) || editingCar;
  }, [editingCar, rawCars]);

  const findingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditFindings') : null), [firestore]);
  const { data: findings } = useCollection(findingsQuery);

  const schedulesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditSchedules') : null), [firestore]);
  const { data: schedules } = useCollection(schedulesQuery);

  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const filteredCars = useMemo(() => {
    if (!rawCars) return [];
    const isInstitutionalViewer = isAdmin || isAuditor;
    const isCampusSupervisor = userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president');

    return rawCars.filter(car => {
        // Authorization filter:
        if (!isInstitutionalViewer) {
            if (isCampusSupervisor) {
                if (car.campusId !== userProfile?.campusId) return false;
            } else {
                if (car.unitId !== userProfile?.unitId) return false;
            }
        }

        const matchesCampus = campusFilter === 'all' || car.campusId === campusFilter;
        const lowerSearch = searchTerm.toLowerCase();
        const matchesSearch = car.carNumber.toLowerCase().includes(lowerSearch) || 
                             unitMap.get(car.unitId)?.toLowerCase().includes(lowerSearch);
        return matchesCampus && matchesSearch;
    });
  }, [rawCars, campusFilter, searchTerm, unitMap, isAdmin, isAuditor, userRole, userProfile]);

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
                        @page { 
                            size: 8.5in 13in !important; 
                            margin: 0.5in !important; 
                        }
                        @media print { 
                            body { 
                                margin: 0 !important; 
                                padding: 0 !important; 
                                background: white; 
                                -webkit-print-color-adjust: exact;
                            } 
                            .no-print { display: none !important; }
                        }
                        body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print CAR</button>
                    </div>
                    <div id="print-content" style="padding: 0.1in;">
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
    if (!filteredCars.length) return;

    try {
        const reportHtml = renderToStaticMarkup(
            <CARControlRegisterTemplate 
                cars={filteredCars} 
                unitMap={unitMap} 
                campusMap={campusMap}
                year="all" 
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <html>
                <head>
                    <title>CAR Control Register</title>
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
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Print Control Register (Landscape)</button>
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
        concerningTopManagementName: 'Unit Head',
        timeLimitForReply: '',
        unitId: '',
        campusId: '',
        unitHead: '',
        descriptionOfNonconformance: '',
        rootCauseAnalysis: '',
        adminFeedback: '',
        preparedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '',
        approvedBy: signatories?.qaoDirector || '',
        status: 'Open',
        requestDate: format(new Date(), 'yyyy-MM-dd'),
        actionSteps: [],
        followUpLogs: [],
        effectivenessAudits: []
    }
  });

  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({ control: form.control, name: "actionSteps" });
  const { fields: followUpFields, append: appendFollowUp, remove: removeFollowUp } = useFieldArray({ control: form.control, name: "followUpLogs" });
  const { fields: effectivenessFields, append: appendEffectiveness, remove: removeEffectiveness } = useFieldArray({ control: form.control, name: "effectivenessAudits" });

  const handleEdit = (car: CorrectiveActionRequest) => {
    setEditingCar(car);
    const safeDate = (d: any) => d?.toDate ? format(d.toDate(), 'yyyy-MM-dd') : (d ? format(new Date(d), 'yyyy-MM-dd') : '');
    form.reset({
        ...car,
        adminFeedback: '',
        requestDate: safeDate(car.requestDate),
        timeLimitForReply: safeDate(car.timeLimitForReply),
        actionSteps: (car.actionSteps || []).map(s => ({ 
            ...s, 
            completionDate: safeDate(s.completionDate),
            evidenceLink: s.evidenceLink || '' 
        })),
        followUpLogs: (car.followUpLogs || []).map(log => ({
            ...log,
            date: safeDate(log.date),
            remarks: log.remarks || ''
        })),
        effectivenessAudits: (car.effectivenessAudits || []).map(a => ({ 
            ...a, 
            date: safeDate(a.date),
            remarks: a.remarks || ''
        }))
    });
    setIsDialogOpen(true);
  };

  const isFieldReadOnly = (fieldName: string) => {
    if (isAdmin) return false;
    if (fieldName.startsWith('followUpLogs') || fieldName.startsWith('effectivenessAudits')) return !isInstitutionalViewer;
    if (fieldName === 'adminFeedback') return !isInstitutionalViewer;
    
    const responderFields = ['rootCauseAnalysis', 'actionSteps'];
    if (responderFields.some(f => fieldName.startsWith(f))) return userProfile?.unitId !== form.getValues('unitId');
    if (fieldName === 'status') return !isInstitutionalViewer;
    return true; 
  };

  const onSubmit = async (values: z.infer<typeof carSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    
    const isUnitResponding = userProfile.unitId === values.unitId && !isAdmin;
    let nextStatus = values.status;
    let needsVerification = liveCar?.needsVerification || false;

    const updatedComments = liveCar?.comments ? [...liveCar.comments] : [];
    if (isInstitutionalViewer && values.adminFeedback?.trim()) {
        const feedbackComment: Comment = {
            text: `[QA OFFICE FEEDBACK]: ${values.adminFeedback.trim()}`,
            authorId: userProfile.id,
            authorName: `${userProfile.firstName} ${userProfile.lastName}`,
            authorRole: userRole || 'Admin',
            createdAt: new Date(),
        };
        updatedComments.push(feedbackComment);
        form.setValue('adminFeedback', ''); 
    }

    if (isInstitutionalViewer && liveCar) {
        const hasVerificationData = (values.followUpLogs?.length || 0) > (liveCar.followUpLogs?.length || 0) || 
                                   (values.effectivenessAudits?.length || 0) > (liveCar.effectivenessAudits?.length || 0);
        
        if (hasVerificationData) {
            nextStatus = 'For Final Verification';
        }

        if (values.adminFeedback?.trim()) {
            nextStatus = 'Awaiting Response/Update';
        }
    }

    if (isUnitResponding) {
        nextStatus = 'In Progress';
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
      timeLimitForReply: Timestamp.fromDate(new Date(values.timeLimitForReply)),
      requestDate: Timestamp.fromDate(new Date(values.requestDate)),
      actionSteps: (values.actionSteps || []).map(step => ({
          ...step,
          completionDate: Timestamp.fromDate(new Date(step.completionDate)),
          evidenceLink: step.evidenceLink || ''
      })),
      followUpLogs: (values.followUpLogs || []).map(log => ({
          ...log,
          date: Timestamp.fromDate(new Date(log.date)),
          remarks: log.remarks || ''
      })),
      effectivenessAudits: (values.effectivenessAudits || []).map(audit => ({
          ...audit,
          date: Timestamp.fromDate(new Date(audit.date)),
          remarks: audit.remarks || ''
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
            <h3 className="text-xl font-black uppercase text-slate-900">Corrective Action Framework</h3>
            <p className="text-xs text-muted-foreground">Formalizing and tracking the closure of non-conformities.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                onClick={handlePrintRegistry} 
                disabled={filteredCars.length === 0}
                className="h-9 bg-white border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest gap-2"
            >
                <Printer className="h-4 w-4" /> Print CAR Registry
            </Button>
            {(isAdmin || isAuditor) && (
                <Button onClick={() => { setEditingCar(null); form.reset(); setIsDialogOpen(true); }} size="sm" className="h-9 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest">
                    <PlusCircle className="mr-2 h-4 w-4" /> Issue New CAR
                </Button>
            )}
        </div>
      </div>

      <Tabs defaultValue="registry" className="space-y-6">
          <TabsList className="bg-muted p-1 border shadow-sm w-fit h-10 animate-tab-highlight rounded-md">
              <TabsTrigger value="registry" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                  <ListChecks className="h-4 w-4" /> Full List
              </TabsTrigger>
              {(isAdmin || isAuditor) && (
                  <TabsTrigger value="bridge" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                      <ShieldAlert className="h-4 w-4 text-rose-600" /> On Going for Management
                  </TabsTrigger>
              )}
          </TabsList>

          <TabsContent value="registry" className="space-y-6 animate-in fade-in duration-500">
              <Card className="border-primary/10 shadow-sm bg-muted/10">
                  <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Search Registry</label>
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="Search by CAR number or Unit..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 text-xs bg-white" />
                          </div>
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Campus Filter</label>
                          <Select value={campusFilter} onValueChange={setCampusFilter}>
                              <SelectTrigger className="h-10 text-xs bg-white font-bold"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Sites</SelectItem>
                                  {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                  </CardContent>
              </Card>

              <Card className="shadow-md border-primary/10 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="text-[10px] font-black uppercase pl-6 py-4">CAR No. & Procedure</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Accountable Unit</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase">Reply Deadline</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase">Status</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCars?.map(car => (
                            <TableRow key={car.id} className="hover:bg-muted/20 transition-colors group">
                                <TableCell className="pl-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-xs text-primary">{car.carNumber}</span>
                                        <span className="text-[10px] font-bold text-slate-600 truncate max-w-[250px]">{car.procedureTitle}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-xs font-bold">
                                        <Building2 className="h-3.5 w-3.5 opacity-30" />
                                        {unitMap.get(car.unitId)}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center text-[10px] font-black text-rose-700 tabular-nums">
                                    {car.timeLimitForReply?.toDate ? format(car.timeLimitForReply.toDate(), 'MMM dd, yyyy') : '--'}
                                </TableCell>
                                <TableCell className="text-center"><Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5 text-primary">{car.status}</Badge></TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-8 text-[10px] font-bold bg-white gap-1.5"
                                            onClick={(e) => { e.stopPropagation(); handlePrint(car); }}
                                        >
                                            <Printer className="h-3 w-3" /> PRINT
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 font-black uppercase text-[10px]" 
                                            onClick={() => handleEdit(car)}
                                        >
                                            Manage Record
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </Card>
          </TabsContent>

          <TabsContent value="bridge" className="animate-in fade-in duration-500">
              <AuditorNCManager 
                findings={findings || []}
                schedules={schedules || []}
                cars={rawCars || []}
                campuses={campuses}
                units={units}
                signatories={signatories || undefined}
                campusFilter={campusFilter}
                searchTerm={searchTerm}
              />
          </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) setEditingCar(null); }}>
        <DialogContent className="max-w-[95vw] lg:max-w-[1400px] h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Document Control</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <DialogTitle className="text-xl">
                            {editingCar ? 'Modify' : 'Issue'} Corrective Action Request (CAR)
                        </DialogTitle>
                        {liveCar && <Badge className="h-6 px-4 font-black uppercase text-[10px] bg-primary text-white border-none">{liveCar.status}</Badge>}
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(false)} className="rounded-full h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 flex overflow-hidden bg-white">
            <div className="flex-1 flex flex-col min-w-0 border-r bg-background">
                <ScrollArea className="flex-1">
                    <Form {...form}>
                        <form id="car-form" onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-10 pb-20">
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 border-b pb-2">
                                    <Info className="h-4 w-4 text-primary" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">1. Administrative Context</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="carNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">CAR Number</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g. 2025-001" className="bg-slate-50 font-black h-11" disabled={isFieldReadOnly('carNumber')} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="ncReportNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">NC Report No.</FormLabel>
                                            <FormControl><Input {...field} value={field.value || ''} placeholder="e.g. 2025-NC-01" className="bg-slate-50 font-bold h-11" disabled={isFieldReadOnly('ncReportNumber')} /></FormControl>
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
                                            <FormControl><Input {...field} className="bg-slate-50 font-bold" disabled={isFieldReadOnly('initiator')} /></FormControl>
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

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
                                    <FormField control={form.control} name="procedureTitle" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Title of Procedure Affected</FormLabel>
                                            <FormControl><Input {...field} placeholder="Name of relevant procedure" className="bg-slate-50 font-bold" disabled={isFieldReadOnly('procedureTitle')} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="concerningClause" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Concerning ISO Clause</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g. 7.5.3" className="bg-slate-50 font-bold" disabled={isFieldReadOnly('concerningClause')} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="timeLimitForReply" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-rose-600">Reply Deadline</FormLabel>
                                            <FormControl><Input type="date" {...field} className="bg-rose-50/30 border-rose-100 font-bold h-10" disabled={isFieldReadOnly('timeLimitForReply')} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
                                    <FormField control={form.control} name="campusId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Campus Site</FormLabel>
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
                                            <FormControl><Input {...field} placeholder="Full Name" className="bg-slate-50 font-bold" disabled={isFieldReadOnly('unitHead')} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </section>

                            <section className="space-y-6 pt-6 border-t border-dashed">
                                <div className="flex items-center gap-2 border-b pb-2">
                                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-800">2. Statement of Non-Conformance</h4>
                                </div>
                                <FormField control={form.control} name="descriptionOfNonconformance" render={({ field }) => (
                                    <FormItem>
                                        <FormControl><Textarea {...field} rows={5} className="bg-rose-50/10 border-rose-100 italic text-sm leading-relaxed" placeholder="Clearly describe the gap identified against the ISO standard..." disabled={isFieldReadOnly('descriptionOfNonconformance')} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </section>

                            <section className="space-y-6 pt-6 border-t border-dashed">
                                <div className="flex items-center gap-2 border-b pb-2">
                                    <ShieldAlert className="h-5 w-5 text-primary" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">3. Root Cause Analysis</h4>
                                </div>
                                <FormField control={form.control} name="rootCauseAnalysis" render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea 
                                                {...field} 
                                                value={field.value || ''} 
                                                rows={4} 
                                                placeholder="Identify the systematic reason why this non-conformance occurred (e.g. lack of training, process gap)..." 
                                                className="bg-primary/5 border-primary/10 shadow-inner italic" 
                                                disabled={isFieldReadOnly('rootCauseAnalysis')} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </section>

                            <section className="space-y-6 pt-6 border-t border-dashed">
                                <div className="flex items-center gap-2 border-b pb-2">
                                    <ListChecks className="h-5 w-5 text-primary" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">4. Actions Taken / Corrective Action Registry</h4>
                                </div>
                                <div className="space-y-4">
                                    {actionFields.map((field, index) => (
                                        <div key={field.id} className="p-4 rounded-lg border bg-muted/5 relative group space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                <div className="md:col-span-3">
                                                    <FormField control={form.control} name={`actionSteps.${index}.type`} render={({ field: inputField }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[9px] uppercase font-bold">Action Type</FormLabel>
                                                            <Select onValueChange={inputField.onChange} value={inputField.value} disabled={isFieldReadOnly('actionSteps')}>
                                                                <FormControl><SelectTrigger className="bg-white text-[10px]"><SelectValue /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="Immediate Correction">Immediate Correction</SelectItem>
                                                                    <SelectItem value="Long-term Corrective Action">Long-term Action</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <div className="md:col-span-6">
                                                    <FormField control={form.control} name={`actionSteps.${index}.description`} render={({ field: inputField }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[9px] uppercase font-bold">Action Taken / Planned</FormLabel>
                                                            <FormControl><Input {...inputField} className="h-8 text-[10px] bg-white" disabled={isFieldReadOnly('actionSteps')} /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <FormField control={form.control} name={`actionSteps.${index}.completionDate`} render={({ field: inputField }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[9px] uppercase font-bold">Target Date</FormLabel>
                                                            <FormControl><Input type="date" {...inputField} className="h-8 text-[10px] bg-white" disabled={isFieldReadOnly('actionSteps')} /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                </div>
                                            </div>
                                            <FormField control={form.control} name={`actionSteps.${index}.evidenceLink`} render={({ field: inputField }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[9px] font-black uppercase text-blue-600 flex items-center gap-1">
                                                        <LinkIcon className="h-2 w-2" /> Evidence Link (Google Drive)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="flex gap-2">
                                                            <Input {...inputField} value={inputField.value || ''} placeholder="https://drive.google.com/..." className="h-8 text-[10px] bg-blue-50/30 border-blue-100 flex-1" disabled={isFieldReadOnly('actionSteps')} />
                                                            {inputField.value?.startsWith('https://') && (
                                                                <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-[9px] font-black bg-white gap-1.5" asChild>
                                                                    <a href={inputField.value} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /> VIEW</a>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                            {!isFieldReadOnly('actionSteps') && (
                                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => removeAction(index)} disabled={actionFields.length === 1}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {!isFieldReadOnly('actionSteps') && (
                                        <Button type="button" variant="outline" size="sm" onClick={() => appendAction({ description: '', type: 'Immediate Correction', completionDate: format(new Date(), 'yyyy-MM-dd'), status: 'Pending', evidenceLink: '' })} className="w-full border-dashed h-10 font-black text-[10px] uppercase gap-2">
                                            <PlusCircle className="h-3.5 w-3.5" /> Add Corrective Step
                                        </Button>
                                    )}
                                </div>
                            </section>

                            <section className="space-y-8 pt-8 border-t border-dashed">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><Gavel className="h-6 w-6" /></div>
                                        <div className="space-y-0.5">
                                            <h4 className="text-sm font-black uppercase text-indigo-900 tracking-tight">Institutional Oversight & Verification</h4>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Internal Auditor / Quality Assurance Office Use Only</p>
                                        </div>
                                    </div>
                                    {isInstitutionalViewer && (
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" size="sm" className="h-8 font-black text-[10px] uppercase" onClick={() => appendFollowUp({ result: '', verifiedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '', date: format(new Date(), 'yyyy-MM-dd'), remarks: '' })}>
                                                <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Follow-up Log
                                            </Button>
                                            <Button type="button" variant="outline" size="sm" className="h-8 font-black text-[10px] uppercase border-indigo-200 text-indigo-700 bg-indigo-50" onClick={() => appendEffectiveness({ result: '', verifiedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '', date: format(new Date(), 'yyyy-MM-dd'), action: 'Effective', remarks: '' })}>
                                                <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Final Verification Entry
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {isInstitutionalViewer && (
                                    <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 space-y-4 animate-in slide-in-from-top-4 duration-500">
                                        <div className="flex items-center gap-2 text-primary">
                                            <MessageSquare className="h-5 w-5" />
                                            <h4 className="text-xs font-black uppercase tracking-widest">QA Office Feedback to Unit</h4>
                                        </div>
                                        <FormField control={form.control} name="adminFeedback" render={({ field }) => (
                                            <FormItem>
                                                <FormControl><Textarea {...field} rows={3} placeholder="Provide guidance or requests for further detail to the unit coordinator..." className="bg-white border-primary/10 italic text-xs leading-relaxed" /></FormControl>
                                            </FormItem>
                                        )} />
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">I. Follow-up Result Registry</h5>
                                    {followUpFields.map((field, index) => (
                                        <div key={field.id} className="p-6 rounded-2xl border bg-slate-50/50 relative group space-y-6">
                                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeFollowUp(index)}><Trash2 className="h-4 w-4" /></Button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name={`followUpLogs.${index}.result`} render={({ field: inputField }) => (
                                                    <FormItem className="md:col-span-2">
                                                        <FormLabel className="text-[9px] font-black uppercase">Official Auditor Observation</FormLabel>
                                                        <FormControl><Textarea {...inputField} rows={4} className="bg-white text-xs italic" disabled={isFieldReadOnly(`followUpLogs.${index}.result`)} /></FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name={`followUpLogs.${index}.remarks`} render={({ field: inputField }) => (
                                                    <FormItem className="md:col-span-2">
                                                        <FormLabel className="text-[9px] font-black uppercase">Follow-up Remarks</FormLabel>
                                                        <FormControl><Textarea {...inputField} value={inputField.value || ''} rows={2} className="bg-white text-xs" disabled={isFieldReadOnly(`followUpLogs.${index}.remarks`)} /></FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name={`followUpLogs.${index}.verifiedBy`} render={({ field: inputField }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[9px] font-black uppercase">Verified By</FormLabel>
                                                        <FormControl><Input {...inputField} className="h-8 text-xs bg-white" disabled={isFieldReadOnly(`followUpLogs.${index}.verifiedBy`)} /></FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name={`followUpLogs.${index}.date`} render={({ field: inputField }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[9px] font-black uppercase">Date</FormLabel>
                                                        <FormControl><Input type="date" {...inputField} className="h-8 text-xs bg-white" disabled={isFieldReadOnly(`followUpLogs.${index}.date`)} /></FormControl>
                                                    </FormItem>
                                                )} />
                                            </div>
                                        </div>
                                    ))}
                                    {followUpFields.length === 0 && (
                                        <p className="text-xs text-muted-foreground italic text-center py-4">No follow-up entries registered yet.</p>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-black uppercase text-emerald-700 tracking-widest border-b pb-1">II. Final Verification / Effectiveness Audit</h5>
                                    {effectivenessFields.map((field, idx) => (
                                        <div key={field.id} className="p-6 rounded-2xl border bg-emerald-50/20 space-y-6 group relative">
                                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeEffectiveness(idx)}><Trash2 className="h-4 w-4" /></Button>
                                            <FormField control={form.control} name={`effectivenessAudits.${idx}.result`} render={({ field: iF }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase text-emerald-900">Audit Verification Outcome</FormLabel>
                                                    <FormControl><Textarea {...iF} rows={3} className="bg-white border-emerald-100 text-sm shadow-inner" disabled={isFieldReadOnly(`effectivenessAudits.${idx}.result`)} /></FormControl>
                                                </FormItem>
                                            )} />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <FormField control={form.control} name={`effectivenessAudits.${idx}.action`} render={({ field: iF }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[9px] font-black uppercase text-emerald-600">Administrative Decision</FormLabel>
                                                        <Select onValueChange={iF.onChange} value={iF.value} disabled={isFieldReadOnly(`effectivenessAudits.${idx}.action`)}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-10 font-bold bg-white"><SelectValue /></SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="Effective">Effective (NC Closed)</SelectItem>
                                                                <SelectItem value="Not Effective">Not Effective (NC Stays Open)</SelectItem>
                                                                <SelectItem value="Close the NC">Close the NC</SelectItem>
                                                                <SelectItem value="Continue Monitoring the NC">Continue Monitoring the NC</SelectItem>
                                                                <SelectItem value="Provide More Actions to Address the NC">Provide More Actions to Address the NC</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name={`effectivenessAudits.${idx}.date`} render={({ field: iF }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[9px] font-black uppercase text-emerald-600">Verification Date</FormLabel>
                                                        <FormControl><Input type="date" {...iF} className="h-10 font-bold bg-white" disabled={isFieldReadOnly(`effectivenessAudits.${idx}.date`)} /></FormControl>
                                                    </FormItem>
                                                )} />
                                            </div>
                                        </div>
                                    ))}
                                    {effectivenessFields.length === 0 && (
                                        <p className="text-xs text-muted-foreground italic text-center py-4">No final verification entries registered yet.</p>
                                    )}
                                </div>
                            </section>
                        </form>
                    </Form>
                </ScrollArea>
            </div>

            <div className="hidden lg:flex w-[420px] flex-col bg-muted/10 shrink-0 border-l divide-y overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="p-4 bg-white border-b shrink-0 h-12 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Discussion Log</h4>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-4">
                            {liveCar?.comments?.length ? (
                                <div className="space-y-4">
                                    {liveCar.comments.slice().sort((a,b) => {
                                        const getMillis = (date: any) => {
                                            if (!date) return 0;
                                            if (date.toMillis) return date.toMillis();
                                            if (date instanceof Date) return date.getTime();
                                            return new Date(date).getTime();
                                        };
                                        return getMillis(b.createdAt) - getMillis(a.createdAt);
                                    }).map((c, i) => (
                                        <div key={i} className="p-4 rounded-xl border bg-white shadow-sm space-y-2">
                                            <div className="flex items-center justify-between gap-2 border-b pb-1 mb-1">
                                                <span className="text-[10px] font-black uppercase text-primary">{c.authorName}</span>
                                                <span className="text-[8px] font-mono text-muted-foreground">{format(c.createdAt instanceof Date ? c.createdAt : (c.createdAt as any).toDate(), 'MMM dd, p')}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-700 italic leading-relaxed whitespace-pre-wrap">"{c.text}"</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center opacity-10 flex flex-col items-center gap-3">
                                    <MessageSquare className="h-12 w-12" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">No history</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 p-6 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                        <Info className="h-4 w-4 text-primary" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Protocol Assist</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                        <strong>ISO 10.1:</strong> When a nonconformity occurs, the unit must react, evaluate the need for action, and implement any correction needed. This digital registry ensures full traceability of that lifecycle.
                    </p>
                </div>
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <div className="flex w-full items-center justify-between">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-[10px] font-black uppercase">Cancel</Button>
                <div className="flex gap-2">
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting} className="min-w-[180px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] h-10 px-8 tracking-widest">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 mr-1.5" />}
                        Commit CAR Registry Update
                    </Button>
                </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
