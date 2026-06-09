'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, deleteDoc, doc, addDoc, serverTimestamp, updateDoc, Timestamp, arrayUnion, orderBy } from 'firebase/firestore';
import type { CorrectiveActionRequest, Campus, Unit, Signatories, Comment, AuditFinding, AuditSchedule } from '@/lib/types';
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
    X,
    FileWarning,
    ArrowUpRight,
    MessageCircle,
    Info,
    School
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
    verificationStatus: z.enum(['Accepted', 'Not Accepted', 'Pending']).optional(),
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

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');

  const isInstitutionalViewer = isAdmin || isAuditor || userRole?.toLowerCase().includes('president') || userRole?.toLowerCase().includes('quality management') || userRole?.toLowerCase().includes('qms');

  const carQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'correctiveActionRequests'), orderBy('createdAt', 'desc')) : null), [firestore]);
  const { data: rawCars, isLoading: isLoadingCars } = useCollection<CorrectiveActionRequest>(carQuery);

  const findingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditFindings') : null), [firestore]);
  const { data: findings } = useCollection<AuditFinding>(findingsQuery);

  const schedulesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditSchedules') : null), [firestore]);
  const { data: schedules } = useCollection<AuditSchedule>(schedulesQuery);

  const liveCar = useMemo(() => {
    if (!editingCar || !rawCars) return editingCar;
    return rawCars.find(c => c.id === editingCar.id) || editingCar;
  }, [editingCar, rawCars]);

  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
  const { data: currentSignatories } = useDoc<Signatories>(signatoryRef);

  const filteredCars = useMemo(() => {
    if (!rawCars) return [];
    return rawCars.filter(car => {
        if (!isInstitutionalViewer) {
            const isCampusSupervisor = userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president');
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
  }, [rawCars, campusFilter, searchTerm, unitMap, isInstitutionalViewer, userRole, userProfile]);

  const carsForAction = useMemo(() => {
    return filteredCars.filter(car => car.status !== 'Open' && car.status !== 'Closed');
  }, [filteredCars]);

  const ncGapsCount = useMemo(() => {
    if (!findings || !schedules) return 0;
    return findings.filter(f => {
        if (f.type !== 'Non-Conformance') return false;
        const schedule = schedules.find(s => s.id === f.auditScheduleId);
        if (!schedule) return false;
        if (!isInstitutionalViewer) {
            if (userRole?.includes('Director') || userRole?.includes('ODIMO')) {
                if (schedule.campusId !== userProfile?.campusId) return false;
            } else {
                if (schedule.targetId !== userProfile?.unitId) return false;
            }
        }
        if (campusFilter !== 'all' && schedule.campusId !== campusFilter) return false;
        const lowerSearch = searchTerm.toLowerCase();
        if (searchTerm) {
            const matches = schedule.targetName.toLowerCase().includes(lowerSearch) ||
                          (schedule.auditorName || '').toLowerCase().includes(lowerSearch) ||
                          f.isoClause.toLowerCase().includes(lowerSearch);
            if (!matches) return false;
        }
        return true;
    }).length;
  }, [findings, schedules, isInstitutionalViewer, userRole, userProfile, campusFilter, searchTerm]);

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
        approvedBy: currentSignatories?.qaoDirector || '',
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

  const currentActionSteps = form.watch('actionSteps') || [];

  const renderActionVerificationArea = (sectionType: 'follow-up' | 'final') => {
    if (currentActionSteps.length === 0) {
      return (
        <div className="mt-4 p-4 border border-dashed rounded-lg bg-slate-50 text-center w-full">
          <p className="text-xs text-muted-foreground italic">No Action Steps submitted by the unit yet.</p>
        </div>
      );
    }

    return (
      <div className="mt-4 border rounded-xl overflow-hidden bg-white shadow-sm w-full">
        <div className="p-3 bg-slate-50 border-b flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Unit Action Steps & Evidence Verification</span>
          </div>
          {isInstitutionalViewer && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[9px] font-black uppercase bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary gap-1.5"
              onClick={() => {
                appendAction({
                  description: '',
                  type: 'Long-term Corrective Action',
                  completionDate: format(new Date(), 'yyyy-MM-dd'),
                  status: 'Pending',
                  evidenceLink: '',
                  verificationStatus: 'Pending'
                });
                form.setValue('status', 'Awaiting Response/Update');
                toast({
                  title: "Action Requested",
                  description: "Added a new action step and set CAR status to 'Awaiting Response/Update'."
                });
              }}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add More Action & Return to Unit
            </Button>
          )}
        </div>
        <div className="divide-y">
          {currentActionSteps.map((step, i) => (
            <div key={i} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors w-full">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn(
                    "text-[8px] font-black uppercase",
                    step.type === 'Immediate Correction' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"
                  )}>
                    {step.type}
                  </Badge>
                  {sectionType === 'follow-up' ? (
                    <Badge className={cn(
                      "text-[8px] font-black uppercase",
                      step.status === 'Completed' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    )}>
                      {step.status}
                    </Badge>
                  ) : (
                    <Badge className={cn(
                      "text-[8px] font-black uppercase",
                      step.verificationStatus === 'Accepted' ? "bg-emerald-100 text-emerald-800" :
                      step.verificationStatus === 'Not Accepted' ? "bg-rose-100 text-rose-800" :
                      "bg-amber-100 text-amber-800"
                    )}>
                      {step.verificationStatus === 'Accepted' ? 'Verified Effective' :
                       step.verificationStatus === 'Not Accepted' ? 'Not Effective' :
                       'Awaiting Effectiveness Check'}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Target: {step.completionDate ? format(new Date(step.completionDate), 'yyyy-MM-dd') : 'No Date'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-700 break-words leading-relaxed">
                  {step.description || <span className="text-rose-500 italic">No description entered yet (please fill in Section 3)</span>}
                </p>
                {step.evidenceLink ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <LinkIcon className="h-3 w-3 text-primary" />
                    <a
                      href={step.evidenceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1"
                    >
                      Open Submitted Evidence Link
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic mt-1">No evidence link provided by unit</p>
                )}
              </div>

              {isInstitutionalViewer && (
                <div className="flex items-center gap-2 shrink-0">
                  {sectionType === 'follow-up' ? (
                    <>
                      {step.status !== 'Completed' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 font-black text-[9px] uppercase border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80"
                          onClick={() => {
                            form.setValue(`actionSteps.${i}.status`, 'Completed');
                            toast({ title: "Step Verified", description: "Action step status set to Completed." });
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          Verify Correct
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 font-black text-[9px] uppercase border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100/80"
                          onClick={() => {
                            form.setValue(`actionSteps.${i}.status`, 'Pending');
                            toast({ title: "Step Reset", description: "Action step status set back to Pending." });
                          }}
                        >
                          <Undo2 className="h-3.5 w-3.5 mr-1 text-amber-600" />
                          Mark Pending
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {step.verificationStatus !== 'Accepted' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 font-black text-[9px] uppercase border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80"
                          onClick={() => {
                            form.setValue(`actionSteps.${i}.verificationStatus`, 'Accepted');
                            toast({ title: "Step Effective", description: "Action step verified as effective." });
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          Verified Effective
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 font-black text-[9px] uppercase border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100/80"
                          onClick={() => {
                            form.setValue(`actionSteps.${i}.verificationStatus`, 'Not Accepted');
                            toast({ title: "Step Not Effective", description: "Action step marked as not effective." });
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-1 text-rose-600" />
                          Not Effective
                        </Button>
                      )}
                    </>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 font-black text-[9px] uppercase border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100/80"
                    onClick={() => {
                      form.setValue('status', 'Awaiting Response/Update');
                      toast({
                        title: "Returned to Unit",
                        description: "CAR status set to 'Awaiting Response/Update'. Please click 'Commit Update' to save."
                      });
                    }}
                  >
                    <Undo2 className="h-3.5 w-3.5 mr-1 text-rose-600" />
                    Return CAR
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };


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
            evidenceLink: s.evidenceLink || '',
            verificationStatus: s.verificationStatus || 'Pending'
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
    if (responderFields.some(f => fieldName.startsWith(f))) {
      return !isInstitutionalViewer && userProfile?.unitId !== form.getValues('unitId');
    }
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
        updatedComments.push({
            text: `[QA OFFICE FEEDBACK]: ${values.adminFeedback.trim()}`,
            authorId: userProfile.id,
            authorName: `${userProfile.firstName} ${userProfile.lastName}`,
            authorRole: userRole || 'Admin',
            createdAt: new Date(),
        });
        form.setValue('adminFeedback', ''); 
    }

    if (isInstitutionalViewer && liveCar) {
        const hasVerificationData = (values.followUpLogs?.length || 0) > (liveCar.followUpLogs?.length || 0) || 
                                   (values.effectivenessAudits?.length || 0) > (liveCar.effectivenessAudits?.length || 0);
        if (hasVerificationData) nextStatus = 'For Final Verification';
        if (values.adminFeedback?.trim()) nextStatus = 'Awaiting Response/Update';
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
      actionSteps: (values.actionSteps || []).map(step => ({ ...step, completionDate: Timestamp.fromDate(new Date(step.completionDate)) })),
      followUpLogs: (values.followUpLogs || []).map(log => ({ ...log, date: Timestamp.fromDate(new Date(log.date)) })),
      effectivenessAudits: (values.effectivenessAudits || []).map(audit => ({ ...audit, date: Timestamp.fromDate(new Date(audit.date)) })),
      updatedAt: serverTimestamp(),
    };

    try {
        if (editingCar) {
          await updateDoc(doc(firestore, 'correctiveActionRequests', editingCar.id), carData);
        } else {
          await addDoc(collection(firestore, 'correctiveActionRequests'), { ...carData, createdAt: serverTimestamp() });
        }
        setIsDialogOpen(false);
        form.reset();
        setEditingCar(null);
        toast({ title: 'Success', description: 'Registry updated.' });
    } catch (e) {
        toast({ title: 'Error', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handlePrint = (car: CorrectiveActionRequest) => {
    const cName = campusMap.get(car.campusId) || 'Unknown Campus';
    const uName = unitMap.get(car.unitId) || 'Unknown Unit';
    try {
        const reportHtml = renderToStaticMarkup(<CARPrintTemplate car={car} unitName={uName} campusName={cName} signatories={currentSignatories || undefined} />);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`<html><head><title>CAR - ${car.carNumber}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@page { size: 8.5in 13in !important; margin: 0.5in !important; } @media print { body { margin: 0 !important; padding: 0 !important; background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } } body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print CAR</button></div><div id="print-content" style="padding: 0.1in;">${reportHtml}</div></body></html>`);
            printWindow.document.close();
        }
    } catch (err) { console.error(err); }
  };

  const handlePrintRegistry = () => {
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
              printWindow.document.write(`<html><head><title>CAR Control Register</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@page { size: 13in 8.5in; margin: 0.5in; } @media print { body { background: white; } .no-print { display: none !important; } } body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Control Register</button></div><div id="print-content">${reportHtml}</div></body></html>`);
              printWindow.document.close();
          }
      } catch (e) {}
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="registry" className="space-y-6">
          <TabsList className="bg-muted p-1 border shadow-sm w-fit h-10 animate-tab-highlight rounded-md">
              <TabsTrigger value="registry" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                  <ListChecks className="h-4 w-4" /> Full List ({filteredCars.length})
              </TabsTrigger>
              <TabsTrigger value="for-action" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                  <FileWarning className="h-4 w-4 text-rose-600" /> For Action
              </TabsTrigger>
              {isInstitutionalViewer && (
                  <TabsTrigger value="bridge" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                      <ShieldAlert className="h-4 w-4 text-rose-600" /> On Going for Management ({ncGapsCount})
                  </TabsTrigger>
              )}
          </TabsList>

          <TabsContent value="registry" className="space-y-6 animate-in fade-in duration-500">
              <Card className="border-primary/10 shadow-sm bg-muted/10">
                  <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                              <SelectTrigger className="h-10 bg-white text-xs font-bold"><SelectValue placeholder="All Sites" /></SelectTrigger>
                              <SelectContent modal={false}>
                                  <SelectItem value="all">All Sites</SelectItem>
                                  {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                      <Button variant="outline" className="h-10 bg-white border-primary/20 text-primary font-black text-[10px] uppercase gap-2" onClick={handlePrintRegistry}>
                          <Printer className="h-4 w-4" /> Print Control Register
                      </Button>
                  </CardContent>
              </Card>

              <Card className="shadow-md border-primary/10 overflow-hidden">
                <div className="overflow-x-auto">
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
                            {filteredCars.map(car => (
                                <TableRow key={car.id} className="hover:bg-muted/20 transition-colors group">
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-black text-xs text-primary">{car.carNumber}</span>
                                            <span className="text-[10px] font-bold text-slate-600 truncate max-w-[250px]">{car.procedureTitle}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                                <Building2 className="h-3.5 w-3.5 opacity-30" />
                                                {unitMap.get(car.unitId) || 'Unknown Unit'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-primary/60 uppercase tracking-tighter">
                                                <School className="h-2.5 w-2.5 ml-0.5" />
                                                {campusMap.get(car.campusId) || 'Institutional'}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-[10px] font-black text-rose-700 tabular-nums">
                                        {car.timeLimitForReply?.toDate ? format(car.timeLimitForReply.toDate(), 'MMM dd, yyyy') : '--'}
                                    </TableCell>
                                    <TableCell className="text-center"><Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5 text-primary">{car.status}</Badge></TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="outline" size="sm" className="h-8 text-[9px] font-bold bg-white gap-1.5" onClick={(e) => { e.stopPropagation(); handlePrint(car); }}><Printer className="h-3 w-3" /> PRINT</Button>
                                            <Button size="sm" variant="ghost" className="h-8 font-black uppercase text-[10px]" onClick={() => handleEdit(car)}>Manage Record</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
              </Card>
          </TabsContent>

          <TabsContent value="for-action" className="space-y-6 animate-in fade-in duration-500">
             <Card className="shadow-md border-primary/10 overflow-hidden">
                <div className="p-4 bg-muted/10 border-b flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <p className="text-xs font-black uppercase text-slate-800">Items Requiring Active Update or Closure Verification</p>
                </div>
                <div className="overflow-x-auto">
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
                            {carsForAction.map(car => (
                                <TableRow key={car.id} className="hover:bg-muted/20 transition-colors group">
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-black text-xs text-primary">{car.carNumber}</span>
                                            <span className="text-[10px] font-bold text-slate-600 truncate max-w-[250px]">{car.procedureTitle}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                                <Building2 className="h-3.5 w-3.5 opacity-30" />
                                                {unitMap.get(car.unitId) || 'Unknown Unit'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-primary/60 uppercase tracking-tighter">
                                                <School className="h-2.5 w-2.5 ml-0.5" />
                                                {campusMap.get(car.campusId) || 'Institutional'}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-[10px] font-black text-rose-700 tabular-nums">
                                        {car.timeLimitForReply?.toDate ? format(car.timeLimitForReply.toDate(), 'MMM dd, yyyy') : '--'}
                                    </TableCell>
                                    <TableCell className="text-center"><Badge className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 border-none px-2 h-5">{car.status}</Badge></TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button size="sm" className="h-8 font-black uppercase text-[10px] shadow-sm bg-indigo-600" onClick={() => handleEdit(car)}>Take Action</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
              </Card>
          </TabsContent>

          <TabsContent value="bridge" className="animate-in fade-in duration-500">
              <AuditorNCManager findings={findings || []} schedules={schedules || []} cars={rawCars || []} campuses={campuses} units={units} signatories={currentSignatories || undefined} campusFilter={campusFilter} searchTerm={searchTerm} />
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
                    <div className="flex items-center gap-3"><DialogTitle className="text-xl">{editingCar ? 'Modify' : 'Issue'} CAR</DialogTitle>{liveCar && <Badge className="h-6 px-4 font-black uppercase text-[10px] bg-primary text-white">{liveCar.status}</Badge>}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(false)} className="rounded-full h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </DialogHeader>
          
          <Form {...form}>
            <div className="flex-1 flex overflow-hidden bg-white">
                <div className="flex-1 flex flex-col min-w-0 border-r bg-background">
                    <ScrollArea className="flex-1">
                        <form id="car-form" onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-10">
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 border-b pb-2"><Info className="h-4 w-4 text-primary" /><h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">1. Administrative Context</h4></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="carNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">CAR Number</FormLabel>
                                            <FormControl>
                                                <Input {...field} className="bg-slate-50 font-black h-11" disabled={isFieldReadOnly('carNumber')} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="ncReportNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">NC Report No.</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} className="bg-slate-50 font-bold h-11" disabled={isFieldReadOnly('ncReportNumber')} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
                                    <FormField control={form.control} name="campusId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Campus</FormLabel>
                                            <Select onValueChange={(v) => { field.onChange(v); form.setValue('unitId', ''); }} value={field.value} disabled={isFieldReadOnly('campusId')}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-slate-50">
                                                        <SelectValue placeholder="Select Campus" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent modal={false}>
                                                    {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="unitId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Responsible Unit</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isFieldReadOnly('unitId') || !form.watch('campusId')}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-slate-50">
                                                        <SelectValue placeholder="Select Unit" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent modal={false}>
                                                    {units.filter(u => u.campusIds?.includes(form.watch('campusId'))).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="unitHead" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Head of Unit</FormLabel>
                                            <FormControl>
                                                <Input {...field} className="bg-slate-50 font-bold" disabled={isFieldReadOnly('unitHead')} />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="procedureTitle" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase">Procedure Affected</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="bg-slate-50 font-bold" disabled={isFieldReadOnly('procedureTitle')} />
                                        </FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="concerningClause" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase">Concerning ISO Clause</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="bg-slate-50 font-bold" disabled={isFieldReadOnly('concerningClause')} />
                                        </FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="timeLimitForReply" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase text-rose-600">Reply Deadline</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} className="bg-rose-50/30 border-rose-100 font-bold h-10" disabled={isFieldReadOnly('timeLimitForReply')} />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            </section>

                            <section className="space-y-6 pt-6 border-t border-dashed">
                                <div className="flex items-center gap-2 border-b pb-2"><AlertTriangle className="h-4 w-4 text-rose-600" /><h4 className="text-[10px] font-black uppercase tracking-widest text-rose-800">2. Statement of Non-Conformance</h4></div>
                                <FormField control={form.control} name="descriptionOfNonconformance" render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea {...field} rows={6} className="bg-rose-50/10 border-rose-100 italic text-sm leading-relaxed" placeholder="Clearly describe the gap identified against the ISO standard..." disabled={isFieldReadOnly('descriptionOfNonconformance')} />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            </section>

                            <section className="space-y-6 pt-6 border-t border-dashed">
                                <div className="flex items-center gap-2 border-b pb-2"><ShieldAlert className="h-5 w-5 text-primary" /><h4 className="text-[10px] font-black uppercase tracking-widest text-primary">3. Root Cause Analysis & Plan</h4></div>
                                <FormField control={form.control} name="rootCauseAnalysis" render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea {...field} value={field.value || ''} rows={4} placeholder="Identify systematic cause..." className="bg-primary/5 border-primary/10 shadow-inner italic" disabled={isFieldReadOnly('rootCauseAnalysis')} />
                                        </FormControl>
                                    </FormItem>
                                )} />
                                <div className="space-y-4">
                                    {actionFields.map((field, index) => (
                                        <div key={field.id} className="p-4 rounded-lg border bg-muted/5 relative group space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                <div className="md:col-span-3"><FormField control={form.control} name={`actionSteps.${index}.type`} render={({ field: iF }) => (<FormItem><Select onValueChange={iF.onChange} value={iF.value} disabled={isFieldReadOnly('actionSteps')}><FormControl><SelectTrigger className="bg-white text-[10px]"><SelectValue /></SelectTrigger></FormControl><SelectContent modal={false}><SelectItem value="Immediate Correction">Immediate Correction</SelectItem><SelectItem value="Long-term Corrective Action">Long-term Action</SelectItem></SelectContent></Select></FormItem>)} /></div>
                                                <div className="md:col-span-6"><FormField control={form.control} name={`actionSteps.${index}.description`} render={({ field: iF }) => (<FormItem><FormControl><Input {...iF} className="h-8 text-[10px] bg-white" disabled={isFieldReadOnly('actionSteps')} /></FormControl></FormItem>)} /></div>
                                                <div className="md:col-span-3"><FormField control={form.control} name={`actionSteps.${index}.completionDate`} render={({ field: iF }) => (<FormItem><FormControl><Input type="date" {...iF} className="h-8 text-[10px] bg-white" disabled={isFieldReadOnly('actionSteps')} /></FormControl></FormItem>)} /></div>
                                            </div>
                                            <FormField control={form.control} name={`actionSteps.${index}.evidenceLink`} render={({ field: iF }) => (
                                                <FormItem className="mt-2">
                                                    <FormLabel className="text-[9px] uppercase font-bold flex items-center gap-1">
                                                        <LinkIcon className="h-2.5 w-2.5 text-primary" /> Evidence Link (Google Drive)
                                                    </FormLabel>
                                                    <div className="flex gap-2">
                                                        <FormControl>
                                                            <Input {...iF} value={iF.value || ''} placeholder="https://drive.google.com/..." className="h-8 text-[10px] bg-white flex-1" disabled={isFieldReadOnly('actionSteps')} />
                                                        </FormControl>
                                                        {iF.value && iF.value.startsWith('http') && (
                                                            <Button type="button" variant="outline" size="icon" className="h-8 w-8 text-primary shrink-0" onClick={() => window.open(iF.value, '_blank')}>
                                                                <ExternalLink className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            {!isFieldReadOnly('actionSteps') && (
                                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAction(index)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {!isFieldReadOnly('actionSteps') && <Button type="button" variant="outline" size="sm" onClick={() => appendAction({ description: '', type: 'Immediate Correction', completionDate: format(new Date(), 'yyyy-MM-dd'), status: 'Pending', evidenceLink: '' })} className="w-full border-dashed h-10 font-black text-[10px] uppercase gap-2"><PlusCircle className="h-3.5 w-3.5" /> Add Corrective Step</Button>}
                                </div>
                            </section>

                            <section className="space-y-8 pt-8 border-t border-dashed">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <Gavel className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="text-sm font-black uppercase text-indigo-900 tracking-tight">Institutional Oversight & Verification</h4>
                                        </div>
                                    </div>
                                    {isInstitutionalViewer && (
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" size="sm" className="h-8 font-black text-[10px] uppercase" onClick={() => appendFollowUp({ result: '', verifiedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '', date: format(new Date(), 'yyyy-MM-dd'), remarks: '' })}>
                                                <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Follow-up
                                            </Button>
                                            <Button type="button" variant="outline" size="sm" className="h-8 font-black text-[10px] uppercase border-indigo-200 text-indigo-700 bg-indigo-50" onClick={() => appendEffectiveness({ result: '', verifiedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '', date: format(new Date(), 'yyyy-MM-dd'), action: 'Effective', remarks: '' })}>
                                                <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Final Entry
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">I. Follow-up Result</h5>
                                    {followUpFields.map((field, index) => (
                                        <div key={field.id} className="p-6 rounded-2xl border bg-slate-50/50 relative group space-y-6">
                                            {renderActionVerificationArea('follow-up')}
                                            <FormField control={form.control} name={`followUpLogs.${index}.result`} render={({ field: iF }) => (
                                                <FormItem className="md:col-span-2">
                                                    <FormLabel className="text-[9px] font-black uppercase">Official Auditor Observation</FormLabel>
                                                    <FormControl>
                                                        <Textarea {...iF} rows={4} className="bg-white text-xs italic" disabled={isFieldReadOnly(`followUpLogs.${index}.result`)} />
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name={`followUpLogs.${index}.verifiedBy`} render={({ field: iF }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[9px] font-black uppercase">Verified By</FormLabel>
                                                        <FormControl>
                                                            <Input {...iF} className="h-8 text-xs bg-white" disabled={isFieldReadOnly(`followUpLogs.${index}.verifiedBy`)} />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name={`followUpLogs.${index}.date`} render={({ field: iF }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[9px] font-black uppercase">Date</FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...iF} className="h-8 text-xs bg-white" disabled={isFieldReadOnly(`followUpLogs.${index}.date`)} />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <FormField control={form.control} name={`followUpLogs.${index}.remarks`} render={({ field: iF }) => (
                                                <FormItem className="md:col-span-2">
                                                    <FormLabel className="text-[9px] font-black uppercase">Remarks / Comments (Printed in Report)</FormLabel>
                                                    <FormControl>
                                                        <Textarea {...iF} value={iF.value || ''} rows={2} className="bg-white text-xs italic" placeholder="Add comments/remarks for report..." disabled={isFieldReadOnly(`followUpLogs.${index}.remarks`)} />
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                            {isInstitutionalViewer && (
                                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeFollowUp(index)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {followUpFields.length === 0 && (
                                        <div className="py-6 text-center border border-dashed rounded-lg bg-muted/10">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No Follow-up Logs Recorded</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-black uppercase text-emerald-700 tracking-widest border-b pb-1">II. Final Verification</h5>
                                    {effectivenessFields.map((field, idx) => (
                                        <div key={field.id} className="p-6 rounded-2xl border bg-emerald-50/20 space-y-6 group relative">
                                            {renderActionVerificationArea('final')}
                                            <FormField control={form.control} name={`effectivenessAudits.${idx}.result`} render={({ field: iF }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase text-emerald-900">Audit Verification Outcome</FormLabel>
                                                    <FormControl>
                                                        <Textarea {...iF} rows={3} className="bg-white border-emerald-100 text-sm shadow-inner" disabled={isFieldReadOnly(`effectivenessAudits.${idx}.result`)} />
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                            <div className="grid grid-cols-2 gap-6">
                                                <FormField control={form.control} name={`effectivenessAudits.${idx}.action`} render={({ field: iF }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[9px] font-black uppercase text-emerald-600">Decision</FormLabel>
                                                        <Select onValueChange={iF.onChange} value={iF.value} disabled={isFieldReadOnly(`effectivenessAudits.${idx}.action`)}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-10 font-bold bg-white">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent modal={false}>
                                                                <SelectItem value="Effective">Effective (NC Closed)</SelectItem>
                                                                <SelectItem value="Not Effective">Not Effective</SelectItem>
                                                                <SelectItem value="Close the NC">Close the NC</SelectItem>
                                                                <SelectItem value="Continue Monitoring the NC">Continue Monitoring</SelectItem>
                                                                <SelectItem value="Provide More Actions to Address the NC">Provide More Actions</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name={`effectivenessAudits.${idx}.date`} render={({ field: iF }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[9px] font-black uppercase text-emerald-600">Verification Date</FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...iF} className="h-10 font-bold bg-white" disabled={isFieldReadOnly(`effectivenessAudits.${idx}.date`)} />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <FormField control={form.control} name={`effectivenessAudits.${idx}.remarks`} render={({ field: iF }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[9px] font-black uppercase text-emerald-600">Remarks / Comments (Printed in Report)</FormLabel>
                                                    <FormControl>
                                                        <Textarea {...iF} value={iF.value || ''} rows={2} className="bg-white border-emerald-100 text-xs italic" placeholder="Add comments/remarks for report..." disabled={isFieldReadOnly(`effectivenessAudits.${idx}.remarks`)} />
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                            {isInstitutionalViewer && (
                                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeEffectiveness(idx)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {effectivenessFields.length === 0 && (
                                        <div className="py-6 text-center border border-dashed rounded-lg bg-muted/10">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No Final Verification Records</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </form>
                    </ScrollArea>
                    
                    <div className="h-32 border-t bg-slate-50 p-4 shrink-0">
                        <ScrollArea className="h-full">
                            <div className="space-y-2">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><ListChecks className="h-3.5 w-3.5" /> Corrective Action Protocol</h5>
                                <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal pl-4 font-medium italic">
                                    <li><strong>Root Cause Analysis:</strong> Units must identify the actual systemic reason why the NC occurred.</li>
                                    <li><strong>Correction:</strong> Immediate action taken to contain the issue (Fix the error).</li>
                                    <li><strong>Corrective Action:</strong> Long-term changes implemented to prevent recurrence (Change the process).</li>
                                    <li><strong>Verification:</strong> QA Office will audit the evidence to ensure the actions were effective before closing the record.</li>
                                </ol>
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                <div className="w-[400px] flex flex-col bg-slate-50/50 shrink-0">
                    <div className="p-4 border-b font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2 bg-white">
                        <MessageSquare className="h-4 w-4" /> Conversation History
                    </div>
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6">
                            {liveCar?.comments && liveCar.comments.length > 0 ? (
                                liveCar.comments.map((comment, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex items-center justify-between gap-2 border-b pb-1 mb-1">
                                            <span className="text-[10px] font-black uppercase text-primary truncate max-w-[150px]">{comment.authorName}</span>
                                            <span className="text-[8px] font-mono text-muted-foreground">{format(comment.createdAt instanceof Date ? comment.createdAt : (comment.createdAt as any).toDate(), 'MMM dd, p')}</span>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-primary/5 shadow-sm text-[11px] leading-relaxed italic text-slate-700">
                                            "{comment.text}"
                                        </div>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase text-right">{comment.authorRole}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center opacity-10 flex flex-col items-center gap-3">
                                    <History className="h-12 w-12" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No history logged</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    {isInstitutionalViewer && (
                        <div className="p-6 border-t bg-white space-y-4">
                            <FormField control={form.control} name="adminFeedback" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-primary">Post Feedback / Directive</FormLabel>
                                    <FormControl><Textarea {...field} placeholder="Add a review note..." className="text-xs italic bg-slate-50 min-h-[80px]" /></FormControl>
                                </FormItem>
                            )} />
                        </div>
                    )}
                </div>
            </div>
          </Form>

          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0">
            <div className="flex w-full items-center justify-between">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-[10px] font-black uppercase">Cancel</Button>
                <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting} className="min-w-[180px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] h-10 px-8">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 mr-1.5" />} 
                    Commit Update
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
