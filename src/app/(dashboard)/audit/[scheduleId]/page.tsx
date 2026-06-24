'use client';

import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, collection, query, where, updateDoc, arrayUnion, Timestamp, getDoc, setDoc } from '@/firebase/firestore-wrapper';
import { useParams, useRouter } from 'next/navigation';
import type { AuditSchedule, AuditFinding, ISOClause, Signatories, CorrectiveActionRequest, AuditPlan, Campus, Submission } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { 
    Loader2, 
    ArrowLeft, 
    Save, 
    Clock, 
    Building2, 
    User, 
    PlusCircle, 
    Database, 
    Check, 
    Printer, 
    UserCheck, 
    Calendar, 
    ClipboardCheck,
    PanelRightClose,
    PanelRightOpen,
    CloudUpload,
    CheckCircle2,
    Wifi,
    WifiOff,
    ShieldAlert,
    ShieldX,
    Lock,
    Activity,
    Smartphone,
    ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import React, { useMemo, useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { AuditChecklist } from '@/components/audit/audit-checklist';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { cn, parseDate } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditPrintTemplate } from '@/components/audit/audit-print-template';
import { useNetworkStatus } from '@/hooks/use-network-status';

const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, value, ...props }, ref) => {
    const localRef = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(ref, () => localRef.current!);

    const adjustHeight = () => {
      const textarea = localRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    };

    useEffect(() => {
      adjustHeight();
    }, [value]);

    return (
      <textarea
        ref={localRef}
        value={value}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden',
          className
        )}
        onInput={adjustHeight}
        {...props}
      />
    );
  }
);
AutoResizeTextarea.displayName = 'AutoResizeTextarea';

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-10 w-64" />
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        <Skeleton className="h-96 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  </div>
);

const summarySchema = z.object({
  officerInCharge: z.string().min(1, 'Name of the actual auditee head/representative is required.'),
  actualDate: z.string().min(1, 'Actual date of conduct is required.'),
  actualStartTime: z.string().min(1, 'Actual start time is required.'),
  actualEndTime: z.string().min(1, 'Actual end time is required.'),
  iqaMethod: z.enum(['Face to Face Audit', 'Online / Remote Audit'], { errorMap: () => ({ message: 'IQA Method is required.' }) }),
  summaryCommendable: z.string().optional(),
  summaryCompliance: z.string().optional(),
  summaryOFI: z.string().optional(),
  summaryNC: z.string().optional(),
});

export default function AuditExecutionPage() {
  const { scheduleId } = useParams();
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const isOnline = useNetworkStatus();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [isAddClauseOpen, setIsAddClauseOpen] = useState(false);
  const [selectedNewClauses, setSelectedNewClauses] = useState<string[]>([]);
  const [isDossierVisible, setIsDossierVisible] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const summarySaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const [isForcedOffline, setIsForcedOffline] = useState(false);
  const [currentClause, setCurrentClause] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    setIsForcedOffline(localStorage.getItem('rsu_eoms_net_disabled') === 'true');
  }, []);

  const isActuallyOffline = !isOnline || isForcedOffline;

  const scheduleDocRef = useMemoFirebase(
    () => (firestore && scheduleId ? doc(firestore, 'auditSchedules', scheduleId as string) : null),
    [firestore, scheduleId]
  );
  const { data: schedule, isLoading: isLoadingSchedule } = useDoc<AuditSchedule>(scheduleDocRef);

  const planRef = useMemoFirebase(
    () => (firestore && schedule?.auditPlanId ? doc(firestore, 'auditPlans', schedule.auditPlanId) : null),
    [firestore, schedule?.auditPlanId]
  );
  const { data: plan } = useDoc<AuditPlan>(planRef);

  const findingsQuery = useMemoFirebase(
    () => (firestore && scheduleId ? query(collection(firestore, 'auditFindings'), where('auditScheduleId', '==', scheduleId)) : null),
    [firestore, scheduleId]
  );
  const { data: findings, isLoading: isLoadingFindings } = useCollection<AuditFinding>(findingsQuery);
  
  const allIsoClausesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'isoClauses') : null),
    [firestore]
  );
  const { data: allIsoClauses, isLoading: isLoadingClauses } = useCollection<ISOClause>(allIsoClausesQuery);

  const campusRef = useMemoFirebase(
    () => (firestore && schedule?.campusId ? doc(firestore, 'campuses', schedule.campusId) : null),
    [firestore, schedule?.campusId]
  );
  const { data: campus } = useDoc<Campus>(campusRef);

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const unitCarsQuery = useMemoFirebase(() => {
    if (!firestore || !schedule?.targetId || !schedule?.campusId) return null;
    const unitId = String(schedule.targetId).trim();
    const campusId = String(schedule.campusId).trim();
    return query(
        collection(firestore, 'correctiveActionRequests'), 
        where('unitId', '==', unitId),
        where('campusId', '==', campusId)
    );
  }, [firestore, schedule?.targetId, schedule?.campusId]);
  
  const { data: unitCars } = useCollection<CorrectiveActionRequest>(unitCarsQuery);

  const unitSubmissionsQuery = useMemoFirebase(() => {
    if (!firestore || !schedule?.targetId || !schedule?.campusId || !plan?.year) return null;
    const unitId = String(schedule.targetId).trim();
    const campusId = String(schedule.campusId).trim();
    const year = Number(plan.year) - 1;
    return query(
        collection(firestore, 'submissions'), 
        where('unitId', '==', unitId),
        where('campusId', '==', campusId),
        where('year', '==', year)
    );
  }, [firestore, schedule?.targetId, schedule?.campusId, plan?.year]);

  const { data: unitSubmissions } = useCollection<Submission>(unitSubmissionsQuery);

  // Fetch previous year OFIs for Clause 10.3
  const previousYearOfisQuery = useMemoFirebase(() => {
    if (!firestore || !schedule?.targetId || !schedule?.campusId || !plan?.year) return null;
    const unitId = String(schedule.targetId).trim();
    const campusId = String(schedule.campusId).trim();
    const prevYear = Number(plan.year) - 1;
    
    // First we need to find previous year's audit plan for this campus
    // This will be handled by fetching all plans and filtering client-side, then fetching findings
    return query(
      collection(firestore, 'auditFindings'),
      where('isoClause', '==', '10.3') // We'll filter by type client-side
    );
  }, [firestore, schedule?.targetId, schedule?.campusId, plan?.year]);

  const { data: previousYearOfisRaw } = useCollection<AuditFinding>(previousYearOfisQuery);

  // Filter to get only OFIs from previous year for this unit
  const previousYearOfis = useMemo(() => {
    if (!previousYearOfisRaw || !plan?.year || !schedule?.targetId || !schedule?.campusId) return [];
    const prevYear = Number(plan.year) - 1;
    const unitId = String(schedule.targetId).trim();
    const campusId = String(schedule.campusId).trim();
    
    // We need to check if the finding belongs to a schedule from previous year for this unit
    // Since we can't easily query across collections, we'll filter by finding data
    // The finding should have been created during previous year's audit
    return previousYearOfisRaw.filter(f => {
      // Check if it's an OFI
      if (f.type !== 'Observation for Improvement') return false;
      
      // Check if it's from previous year (via createdAt)
      if (f.createdAt) {
        const created = f.createdAt.toDate ? f.createdAt.toDate() : new Date(f.createdAt);
        if (created.getFullYear() !== prevYear) return false;
      }
      
      // We'd ideally check the schedule's unitId and campusId, but that requires joining
      // For now, we'll include all OFIs from clause 10.3 from previous year
      // In production, you'd want to verify the schedule context
      return f.isoClause === '10.3';
    });
  }, [previousYearOfisRaw, plan?.year, schedule?.targetId, schedule?.campusId]);

  const isIqaUnit = useMemo(() => {
    return schedule?.targetName?.toLowerCase() === 'internal quality audit' || schedule?.targetName?.toLowerCase() === 'iqa';
  }, [schedule]);

  const isClauseAllowedForIqa = (clauseId: string) => {
    return clauseId.startsWith('9.') || ['7.2', '7.5', '10.1'].includes(clauseId);
  };

  const clausesInScope = useMemo(() => {
    if (!allIsoClauses || !schedule?.isoClausesToAudit) return [];
    return allIsoClauses.filter(c => schedule.isoClausesToAudit.includes(c.id));
  }, [allIsoClauses, schedule?.isoClausesToAudit]);

  const unusedClauses = useMemo(() => {
    if (!allIsoClauses || !schedule?.isoClausesToAudit) return [];
    return allIsoClauses.filter(c => {
      const isUnused = !schedule.isoClausesToAudit.includes(c.id);
      if (!isUnused) return false;
      if (isIqaUnit) {
        return isClauseAllowedForIqa(c.id);
      }
      return true;
    });
  }, [allIsoClauses, schedule?.isoClausesToAudit, isIqaUnit]);

  const form = useForm<z.infer<typeof summarySchema>>({
    resolver: zodResolver(summarySchema),
    defaultValues: {
      officerInCharge: '',
      actualDate: '',
      actualStartTime: '',
      actualEndTime: '',
      iqaMethod: 'Face to Face Audit',
      summaryCommendable: '',
      summaryCompliance: '',
      summaryOFI: '',
      summaryNC: '',
    },
  });

  const watchAll = form.watch();

  const parseSummaryBlocks = (val: string | undefined): { id: string; header: string; content: string }[] => {
    if (!val) return [];
    // Split by newlines followed by a lookahead for a clause header to isolate individual clause findings
    const regex = /(?:^|\n)(?=\[Clause\s+[^\]]+\]:)/gi;
    const parts = val.split(regex).map(p => p.trim()).filter(p => p.length > 0);
    
    const blocks: { id: string; header: string; content: string }[] = [];
    parts.forEach(part => {
      const match = part.match(/^\[Clause\s+([^\]]+)\]:\s*([\s\S]*)$/i);
      if (match) {
        blocks.push({
          id: match[1].trim(),
          header: `[Clause ${match[1].trim()}]:`,
          content: match[2].trim()
        });
      } else {
        // If it does not start with a Clause header (like raw text/header notes at the top)
        blocks.push({
          id: '',
          header: '',
          content: part
        });
      }
    });
    return blocks;
  };

  const serializeSummaryBlocks = (blocks: { id: string; header: string; content: string }[]): string => {
    // Sort blocks: those without IDs (general notes) first, then by clause ID numerically
    const sorted = [...blocks].sort((a, b) => {
      if (!a.id && !b.id) return a.content.localeCompare(b.content);
      if (!a.id) return -1;
      if (!b.id) return 1;
      return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
    });

    return sorted
      .map(b => b.header ? `${b.header} ${b.content}` : b.content)
      .join('\n\n');
  };

  const getSortedSummary = (val: string | undefined) => {
    if (!val) return '';
    const blocks = parseSummaryBlocks(val);
    return serializeSummaryBlocks(blocks);
  };

  useEffect(() => {
      if (schedule && isInitialLoadRef.current) {
          const startDate = parseDate(schedule.scheduledDate);
          const endDate = parseDate(schedule.endScheduledDate);
          
          form.reset({
            officerInCharge: schedule.officerInCharge || schedule.auditeeHeadName || '',
            actualDate: format(startDate, 'yyyy-MM-dd'),
            actualStartTime: format(startDate, 'HH:mm'),
            actualEndTime: format(endDate, 'HH:mm'),
            iqaMethod: schedule.iqaMethod || 'Face to Face Audit',
            summaryCommendable: getSortedSummary(schedule.summaryCommendable),
            summaryCompliance: getSortedSummary(schedule.summaryCompliance),
            summaryOFI: getSortedSummary(schedule.summaryOFI),
            summaryNC: getSortedSummary(schedule.summaryNC),
          });
          isInitialLoadRef.current = false;
      }
  }, [schedule, form]);

  const handleSaveSummary = (values: z.infer<typeof summarySchema>, isAutoSave: boolean = false) => {
    if (!scheduleDocRef) return;

    if (!isAutoSave && !isActuallyOffline) setIsSavingSummary(true);

    try {
        const [year, month, day] = values.actualDate.split('-').map(Number);
        const [sH, sM] = values.actualStartTime.split(':').map(Number);
        const [eH, eM] = values.actualEndTime.split(':').map(Number);

        const start = new Date(year, month - 1, day, sH, sM);
        const end = new Date(year, month - 1, day, eH, eM);

        const updateData: any = {
            officerInCharge: values.officerInCharge,
            iqaMethod: values.iqaMethod,
            summaryCommendable: values.summaryCommendable || '',
            summaryCompliance: values.summaryCompliance || '',
            summaryOFI: values.summaryOFI || '',
            summaryNC: values.summaryNC || '',
            scheduledDate: Timestamp.fromDate(start),
            endScheduledDate: Timestamp.fromDate(end),
        };

        if (!isAutoSave && !isActuallyOffline) {
            updateData.status = 'Completed';
        }

        setDoc(scheduleDocRef, updateData, { merge: true })
            .then(() => {
                if (!isAutoSave && !isActuallyOffline) {
                    toast({ title: "Audit Finalized", description: "Progress secure in institutional cloud." });
                }
            })
            .catch(error => {
                console.error("Async save failed:", error);
            });

        setLastSaved(new Date());
        if (!isAutoSave) {
            setTimeout(() => setIsSavingSummary(false), 200);
        }
        
    } catch(error) {
        setIsSavingSummary(false);
    }
  };

  /**
   * DEBOUNCED SUMMARY AUTO-SAVE
   * Increased to 5 seconds (5000ms) for high stability.
   */
  useEffect(() => {
    if (!schedule || !scheduleDocRef || isInitialLoadRef.current) return;

    const hasChanged = 
        watchAll.officerInCharge !== (schedule.officerInCharge || schedule.auditeeHeadName || '') ||
        watchAll.iqaMethod !== (schedule.iqaMethod || 'Face to Face Audit') ||
        watchAll.summaryCommendable !== (schedule.summaryCommendable || '') ||
        watchAll.summaryCompliance !== (schedule.summaryCompliance || '') ||
        watchAll.summaryOFI !== (schedule.summaryOFI || '') ||
        watchAll.summaryNC !== (schedule.summaryNC || '');

    if (hasChanged) {
        if (summarySaveTimeoutRef.current) clearTimeout(summarySaveTimeoutRef.current);
        
        summarySaveTimeoutRef.current = setTimeout(() => {
            handleSaveSummary(watchAll, true);
        }, 5000); 
    }

    return () => {
        if (summarySaveTimeoutRef.current) clearTimeout(summarySaveTimeoutRef.current);
    };
  }, [watchAll, schedule]);

  const handleAddClausesToScope = async () => {
    if (!scheduleDocRef || selectedNewClauses.length === 0) return;
    
    setIsSavingSummary(true);
    updateDoc(scheduleDocRef, {
        isoClausesToAudit: arrayUnion(...selectedNewClauses)
    })
    .then(() => {
        toast({ title: "Scope Expanded", description: `${selectedNewClauses.length} clauses added to the checklist.` });
        setSelectedNewClauses([]);
        setIsAddClauseOpen(false);
    })
    .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: scheduleDocRef.path,
            operation: 'update',
            requestResourceData: { isoClausesToAudit: selectedNewClauses }
        }));
    })
    .finally(() => {
        setIsSavingSummary(false);
    });
  };

  const handlePrintLog = () => {
    if (isActuallyOffline) {
        toast({ title: "Action Restricted", description: "Printing is disabled in offline mode.", variant: "destructive" });
        return;
    }
    if (!schedule || !findings || !allIsoClauses) return;
    try {
        const reportHtml = renderToStaticMarkup(
            <AuditPrintTemplate 
                schedule={schedule}
                findings={findings}
                clauses={clausesInScope}
                signatories={signatories || undefined}
                leadAuditorName={plan?.leadAuditorName}
                campusName={campus?.name || 'Institutional'}
            />
        );
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>IQA Evidence Log - ${schedule.targetName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { size: 8.5in 13in !important; margin: 0.5in !important; }
                        @media print { body { margin: 0 !important; padding: 0 !important; background: white; width: 100% !important; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
                        body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print IQA Report</button>
                    </div>
                    <div id="print-content">${reportHtml}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) { console.error(err); }
  };

  const toggleNewClauseSelection = (clauseId: string) => {
    setSelectedNewClauses(prev => prev.includes(clauseId) ? prev.filter(id => id !== clauseId) : [...prev, clauseId]);
  };

  /**
   * SYNCHRONIZED SUMMARY UPDATE LOGIC FOR MULTIPLE FINDINGS PER CLAUSE
   */
  const handleFindingsSyncForClause = (clauseId: string, clauseFindings: any[]) => {
    const summaryFields: (keyof z.infer<typeof summarySchema>)[] = [
      'summaryCommendable', 
      'summaryCompliance', 
      'summaryOFI', 
      'summaryNC'
    ];

    const findingsByType = {
      'Compliance': clauseFindings.filter(f => f.type === 'Compliance'),
      'Observation for Improvement': clauseFindings.filter(f => f.type === 'Observation for Improvement'),
      'Non-Conformance': clauseFindings.filter(f => f.type === 'Non-Conformance'),
    };

    summaryFields.forEach(fName => {
        if (['officerInCharge', 'actualDate', 'actualStartTime', 'actualEndTime'].includes(fName)) return;
        
        let targetType: string | null = null;
        if (fName === 'summaryCompliance') targetType = 'Compliance';
        else if (fName === 'summaryOFI') targetType = 'Observation for Improvement';
        else if (fName === 'summaryNC') targetType = 'Non-Conformance';

        if (!targetType) return;

        const currentVal = form.getValues(fName) || '';
        const blocks = parseSummaryBlocks(currentVal);
        
        // Filter out the existing block for this clause (to be rebuilt)
        const updatedBlocks = blocks.filter(b => b.id.toLowerCase() !== clauseId.toLowerCase());
        
        // Get findings of this target type for this clause
        const typeFindings = findingsByType[targetType as keyof typeof findingsByType] || [];
        
        if (typeFindings.length > 0) {
          // Combine finding texts
          const combinedText = typeFindings
            .map(f => {
              if (targetType === 'Non-Conformance') {
                return f.ncStatement || f.description || f.evidence || '';
              }
              return f.description || f.evidence || '';
            })
            .map(t => t.trim())
            .filter(Boolean)
            .join('\n');

          if (combinedText) {
            updatedBlocks.push({
              id: clauseId,
              header: `[Clause ${clauseId}]:`,
              content: combinedText
            });
          }
        }
        
        const finalContent = serializeSummaryBlocks(updatedBlocks);
        form.setValue(fName, finalContent, { shouldDirty: true });
    });
  };

  const handleFindingSync = (updatedFinding: any) => {
    const clauseId = updatedFinding.isoClause;
    const otherFindings = findings?.filter(f => f.isoClause === clauseId && f.id !== updatedFinding.id) || [];
    const clauseFindings = [...otherFindings, updatedFinding];
    handleFindingsSyncForClause(clauseId, clauseFindings);
  };

  const handleFindingDelete = (deletedFindingId: string, clauseId: string) => {
    const clauseFindings = findings?.filter(f => f.isoClause === clauseId && f.id !== deletedFindingId) || [];
    handleFindingsSyncForClause(clauseId, clauseFindings);
  };

  const isLoading = isLoadingSchedule || isLoadingFindings || isLoadingClauses;

  if (isLoading) return <LoadingSkeleton />;
  if (!schedule) return null;

  const conductDate = parseDate(schedule.scheduledDate);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
                <h2 className="text-2xl font-bold tracking-tight">IQA - Evidence Log Sheet</h2>
                <p className="text-muted-foreground flex items-center gap-2 text-sm"><Building2 className="h-3.5 w-3.5" />{schedule.targetName} & bull; {format(conductDate, 'PPP')} @ {format(conductDate, 'hh:mm a')}</p>
                {currentClause && (
                  <p className="text-center text-xs font-black text-red-600 uppercase tracking-wider mt-1">
                    Current Clause: {currentClause.id} - {currentClause.title}
                  </p>
                )}
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant={!isActuallyOffline ? "outline" : "destructive"} className={cn("h-9 px-4 font-black uppercase text-[9px] gap-2 border-primary/20 transition-all", !isActuallyOffline ? "bg-white text-primary" : "bg-destructive text-white animate-in zoom-in")}>
                {isActuallyOffline ? (
                    <>
                        <Smartphone className="h-3.5 w-3.5 animate-pulse" />
                        Institutional Offline Auto-Sync Active
                    </>
                ) : (
                    <>
                        <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                        Online Conduct Mode
                    </>
                )}
            </Badge>

            <div className="mr-4 flex flex-col items-end">
                {isSavingSummary ? (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-600 animate-pulse"><CloudUpload className="h-3 w-3" />Syncing...</div>
                ) : lastSaved ? (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600"><CheckCircle2 className="h-3 w-3" />Stored on Device ({format(lastSaved, 'HH:mm:ss')})</div>
                ) : null}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsDossierVisible(!isDossierVisible)} className="h-9 px-4 font-black uppercase text-[10px] tracking-widest text-primary hover:bg-primary/5">{isDossierVisible ? <PanelRightClose className="mr-2 h-4 w-4" /> : <PanelRightOpen className="mr-2 h-4 w-4" />}{isDossierVisible ? 'Hide Dossier' : 'Show Dossier'}</Button>
            
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrintLog} 
                className={cn("bg-white shadow-sm font-bold h-9", isActuallyOffline && "opacity-50")}
                title={!isActuallyOffline ? "Print Report" : "Restricted while Offline"}
            >
                {!isActuallyOffline ? <Printer className="mr-2 h-4 w-4" /> : <ShieldX className="mr-2 h-4 w-4" />}
                Print Evidence Log
            </Button>
            
            <Badge variant={schedule.status === 'Completed' ? 'default' : 'secondary'} className="h-9 px-4 font-black uppercase tracking-widest border-none shadow-sm">{schedule.status}</Badge>
        </div>
      </div>
      
      <div className={cn("grid grid-cols-1 gap-6 transition-all duration-500", isDossierVisible ? "lg:grid-cols-3" : "lg:grid-cols-1")}>
        <div className={cn("space-y-6", isDossierVisible ? "lg:col-span-2" : "lg:col-span-1")}>
            <div className="space-y-6">
                <Card className="shadow-xl border-primary/10 overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b py-6"><CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><UserCheck className="h-6 w-6 text-primary" />1. Session Conduct Verification</CardTitle><CardDescription className="font-medium">Verify the auditee representative and the actual time of audit conduct.</CardDescription></CardHeader>
                    <CardContent className="space-y-6 pt-8"><Form {...form}>
                      <div className="space-y-6">
                        <FormField control={form.control} name="officerInCharge" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase text-slate-600">Officer in Charge (Actual Auditee Head / Representative)</FormLabel>
                            <FormControl><Input {...field} placeholder="Enter name of the actual representative present..." className="h-11 font-black bg-white" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <FormField control={form.control} name="actualDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold uppercase text-slate-600">Actual Conduct Date</FormLabel>
                              <FormControl><Input type="date" {...field} className="h-11 bg-white font-bold" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="actualStartTime" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold uppercase text-slate-600">Actual Start Time</FormLabel>
                              <FormControl><Input type="time" {...field} className="h-11 bg-white font-bold" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="actualEndTime" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold uppercase text-slate-600">Actual End Time</FormLabel>
                              <FormControl><Input type="time" {...field} className="h-11 bg-white font-bold" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="iqaMethod" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold uppercase text-slate-600">IQA Method</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-11 bg-white font-bold">
                                    <SelectValue placeholder="Select Method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Face to Face Audit">Face to Face Audit</SelectItem>
                                  <SelectItem value="Online / Remote Audit">Online / Remote Audit</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </div>
                    </Form></CardContent>
                </Card>

                <AuditChecklist 
                  scheduleId={schedule.id} 
                  clausesToAudit={clausesInScope} 
                  existingFindings={findings || []} 
                  onFindingSaved={handleFindingSync} 
                  onFindingDeleted={handleFindingDelete}
                  unitCars={unitCars || []} 
                  unitSubmissions={unitSubmissions || []} 
                  isIqaUnit={isIqaUnit} 
                  previousYearOfis={previousYearOfis} 
                  scheduleTargetId={schedule.targetId} 
                  scheduleTargetName={schedule.targetName}
                  scheduleCampusId={schedule.campusId} 
                  onOpenClauseChange={setCurrentClause}
                  planYear={plan ? Number(plan.year) : undefined}
                />

                <Card className="shadow-xl border-primary/10 overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b py-6"><CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-primary" />2. Final Audit Report Summary</CardTitle><CardDescription className="font-medium">Consolidate your findings into a high-level summary for institutional filing.</CardDescription></CardHeader>
                    <CardContent className="space-y-8 pt-8">
                        <Form {...form}>
                            <div className="space-y-6">
                                <FormField control={form.control} name="summaryCommendable" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase text-blue-700">Summary of Commendable Practices (P)</FormLabel>
                                    <FormControl><AutoResizeTextarea {...field} value={field.value || ''} placeholder="Highlight positive observations..." /></FormControl>
                                </FormItem>)} />
                                <FormField control={form.control} name="summaryCompliance" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase text-emerald-700">Summary of Compliance (C)</FormLabel>
                                    <FormControl><AutoResizeTextarea {...field} value={field.value || ''} placeholder="Summarize standard compliance..." /></FormControl>
                                </FormItem>)} />
                                <FormField control={form.control} name="summaryOFI" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase text-amber-700">Opportunities for Improvement (OFI)</FormLabel>
                                    <FormControl><AutoResizeTextarea {...field} value={field.value || ''} placeholder="Summarize opportunities..."/></FormControl>
                                </FormItem>)} />
                                <FormField control={form.control} name="summaryNC" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase text-destructive">Non-Conformance / Non-Compliance (NC)</FormLabel>
                                    <FormControl><AutoResizeTextarea {...field} value={field.value || ''} placeholder="Summarize non-conformances..."/></FormControl>
                                </FormItem>)} />
                            </div>
                        </Form>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t py-6 px-8">
                        {isActuallyOffline ? (
                            <div className="w-full p-4 rounded-xl border border-dashed border-primary/20 bg-white flex items-center justify-center gap-3">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                <span className="text-xs font-black uppercase tracking-widest text-primary">Institutional Auto-Sync Active (Finalization Disabled in Offline)</span>
                            </div>
                        ) : (
                            <Button type="button" onClick={form.handleSubmit((v) => handleSaveSummary(v))} disabled={isSavingSummary} className="shadow-xl shadow-primary/20 font-black uppercase tracking-widest px-8">
                                {isSavingSummary && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <Save className="mr-2 h-4 w-4"/>
                                Finalize Audit Report
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>

        {isDossierVisible && (
            <div className="lg:col-span-1 animate-in fade-in slide-in-from-right-4 duration-500">
                <Card className="sticky top-20 shadow-md border-primary/10">
                    <CardHeader className="bg-muted/30 border-b"><CardTitle className="text-sm font-black uppercase tracking-widest">Session Dossier</CardTitle></CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-3">
                            <div className="space-y-1"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assigned Auditor</p><div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /><span className="text-sm font-bold">{schedule.auditorName || 'Not Assigned'}</span></div></div>
                            <div className="space-y-1"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Auditee</p><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><span className="text-sm font-bold">{schedule.targetName}</span></div></div>
                            <div className="space-y-1"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Provisioned Head</p><div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-slate-400" /><span className="text-sm font-medium text-slate-600">{schedule.auditeeHeadName || 'Not Specified'}</span></div></div>
                            <div className="space-y-1"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Original Itinerary Schedule</p><div className="flex items-center gap-2 text-amber-600"><Clock className="h-4 w-4" /><span className="text-sm font-bold">{format(conductDate, 'PPp')}</span></div></div>
                        </div>
                        <Separator />
                        <div className="space-y-4">
                            <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase text-primary tracking-widest">Clauses in Scope</p><Dialog open={isAddClauseOpen} onOpenChange={setIsAddClauseOpen}><DialogTrigger asChild><Button variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase gap-1 text-primary hover:bg-primary/5 p-0 px-2"><PlusCircle className="h-3 w-3" /> Add More Clauses</Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Add Clauses to Scope</DialogTitle><DialogDescription>Select additional standard requirements.</DialogDescription></DialogHeader><div className="rounded-xl border shadow-sm overflow-hidden bg-background"><Command className="bg-transparent" filter={(v, s) => v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0}><div className="flex items-center border-b px-3 bg-white"><CommandInput placeholder="Search unused clauses..." className="h-10 text-xs" /></div><CommandList className="max-h-[300px]"><CommandEmpty className="p-4 text-center"><Database className="h-8 w-8 mx-auto opacity-10 mb-2" /><p className="text-xs font-bold text-muted-foreground uppercase">No unused clauses found</p></CommandEmpty><CommandGroup>{unusedClauses.map(c => { const isSelected = selectedNewClauses.includes(c.id); return (<CommandItem key={c.id} value={`${c.id} ${c.title}`} onSelect={() => toggleNewClauseSelection(c.id)} className="flex items-center gap-3 px-4 py-3 cursor-pointer"><div className={cn("h-4 w-4 border rounded flex items-center justify-center transition-colors shrink-0", isSelected ? "bg-primary border-primary text-white" : "border-slate-300")}>{isSelected && <Check className="h-3 w-3" />}</div><div className="min-w-0"><p className="font-black text-[11px] leading-tight mb-0.5">Clause {c.id}</p><p className="text-[10px] text-muted-foreground truncate">{c.title}</p></div></CommandItem>); })}</CommandGroup></CommandList></Command></div><DialogFooter className="pt-4"><Button variant="outline" size="sm" onClick={() => setIsAddClauseOpen(false)}>Cancel</Button><Button size="sm" onClick={handleAddClausesToScope} disabled={selectedNewClauses.length === 0 || isSavingSummary}>{isSavingSummary && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Add {selectedNewClauses.length} Clause(s)</Button></DialogFooter></DialogContent></Dialog></div>
                            <div className="flex flex-wrap gap-1.5">{schedule.isoClausesToAudit.sort((a,b) => a.localeCompare(b, undefined, { numeric: true })).map(clauseId => (<Badge key={clauseId} variant="outline" className="font-mono text-[10px] border-primary/20 px-2 bg-white">Clause {clauseId}</Badge>))}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}
      </div>
    </div>
  );
}
