'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import type { AuditFinding, ISOClause, CorrectiveActionRequest, Submission } from '@/lib/types';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, AlertTriangle, History, ShieldCheck, Clock, CheckCircle2, Scale, CloudUpload, CloudDownload, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { clauseQuestions } from '@/lib/audit-questions';
import { format } from 'date-fns';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface AuditChecklistProps {
  scheduleId: string;
  clausesToAudit: ISOClause[];
  existingFindings: AuditFinding[];
  onFindingSaved?: (finding: any) => void;
  unitCars: CorrectiveActionRequest[];
  unitSubmissions: Submission[];
  isIqaUnit?: boolean;
}

const CLAUSE_EOMS_MAPPING: Record<string, string[]> = {
  '4.1': ['SWOT Analysis'],
  '4.2': ['Needs and Expectation of Interested Parties'],
  '6.1': ['Risk and Opportunity Registry', 'Risk and Opportunity Action Plan'],
  '6.2': ['Quality Objectives Monitoring'],
  '8.1': ['Operational Plan'],
};

interface ClauseFormData {
  evidence: string;
  description: string;
  ncStatement: string;
  type: 'Compliance' | 'Observation for Improvement' | 'Non-Conformance' | 'Not Applicable' | '';
}

function ClauseForm({ 
  scheduleId, 
  clause, 
  finding, 
  onSave,
  clauseCars,
  clauseSubmissions,
  isIqaUnit = false
}: { 
  scheduleId: string; 
  clause: ISOClause; 
  finding: AuditFinding | undefined, 
  onSave: (data: any) => void,
  clauseCars: CorrectiveActionRequest[],
  clauseSubmissions: Submission[],
  isIqaUnit?: boolean;
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isOnline = useNetworkStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  const form = useForm<ClauseFormData>({
    defaultValues: {
      evidence: finding?.evidence || '',
      description: finding?.description || '',
      ncStatement: finding?.ncStatement || '',
      type: finding?.type || '',
    },
  });

  const watchAll = form.watch();
  const watchType = form.watch('type');

  useEffect(() => {
      if (isInitialLoadRef.current || (finding && finding.isoClause !== clause.id)) {
          form.reset({
            evidence: finding?.evidence || '',
            description: finding?.description || '',
            ncStatement: finding?.ncStatement || '',
            type: finding?.type || '',
          });
          isInitialLoadRef.current = false;
      }
  }, [finding, form, clause.id]);

  /**
   * NC STATEMENT TEMPLATE GENERATOR
   */
  useEffect(() => {
    if (watchType === 'Non-Conformance' && !form.getValues('ncStatement')) {
        const template = `It was observed that ISO 21001:2018 Clause ${clause.id} requirement regarding [Specific Requirement Name] was not fully implemented in the [Unit Name]. \n\nSpecifically, the unit [Description of the Gap/Failure]. \n\nThis resulted in [Impact/Risk to the Management System].`;
        form.setValue('ncStatement', template);
    }
  }, [watchType, clause.id, form]);

  const performSave = async (values: ClauseFormData) => {
    if (!firestore || !user || !values.type) return;
    
    setIsSubmitting(true);
    const findingId = `${scheduleId}-${clause.id}`;
    const findingRef = doc(firestore, 'auditFindings', findingId);

    const findingData: any = {
        id: findingId,
        auditScheduleId: scheduleId,
        isoClause: clause.id,
        type: values.type,
        description: values.type === 'Non-Conformance' ? values.ncStatement : values.description,
        ncStatement: values.type === 'Non-Conformance' ? values.ncStatement : '',
        evidence: values.evidence,
        authorId: user.uid,
        createdAt: finding?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    setDoc(findingRef, findingData, { merge: true })
        .then(() => {
            onSave(findingData); 
            setLastSaved(new Date());
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: findingRef.path,
                operation: 'write',
                requestResourceData: findingData
            }));
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  /**
   * AUTOMATED DEBOUNCED PERSISTENCE
   * Timer increased to 5000ms (5 seconds) as requested for institutional stability.
   */
  useEffect(() => {
    if (isInitialLoadRef.current) return;

    const hasChanged = 
        watchAll.type !== (finding?.type || '') ||
        watchAll.evidence !== (finding?.evidence || '') ||
        watchAll.description !== (finding?.description || '') ||
        watchAll.ncStatement !== (finding?.ncStatement || '');

    if (hasChanged && watchAll.type) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        
        saveTimeoutRef.current = setTimeout(() => {
            performSave(watchAll);
        }, 5000); 
    }

    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [watchAll, finding]);

  const onSubmit = (values: ClauseFormData) => {
      performSave(values);
      toast({ title: isOnline ? "Record Verified" : "Stored Locally", description: `Audit results for Clause ${clause.id} have been registered.`});
  };

  const requiredDocs = CLAUSE_EOMS_MAPPING[clause.id] || [];
  const hasRequiredDocs = requiredDocs.length > 0;

  return (
    <div className="space-y-8">
        {!isIqaUnit && hasRequiredDocs && (
            <div className="space-y-3 p-5 rounded-2xl border-indigo-200 bg-indigo-50/40 animate-in slide-in-from-top-2 duration-500">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-700">
                        <ShieldCheck className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            EOMS Document Submissions
                        </span>
                    </div>
                    <Badge variant="outline" className="h-5 text-[8px] font-black bg-white border-indigo-200 text-indigo-700">ISO REQUIRED EVIDENCE</Badge>
                </div>
                
                <div className="space-y-3">
                    {requiredDocs.map(docType => {
                        const docSubmissions = clauseSubmissions.filter(s => s.reportType === docType);
                        
                        if (docSubmissions.length > 0) {
                            return (
                                <div key={docType} className="space-y-2">
                                    <p className="text-[10px] font-black text-indigo-950 uppercase tracking-wide">{docType}</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {docSubmissions.map(sub => {
                                            let statusColor = "bg-slate-500 text-white";
                                            let statusLabel = sub.statusId || "Pending";
                                            
                                            const statusLower = String(sub.statusId || "").toLowerCase();
                                            if (statusLower === 'approved') {
                                                statusColor = "bg-emerald-600 text-white";
                                                statusLabel = "Approved";
                                            } else if (statusLower === 'rejected') {
                                                statusColor = "bg-rose-600 text-white";
                                                statusLabel = "Rejected";
                                            } else if (statusLower === 'submitted') {
                                                statusColor = "bg-indigo-600 text-white";
                                                statusLabel = "Submitted";
                                            } else if (statusLower === 'pending' || statusLower === 'awaiting approval') {
                                                statusColor = "bg-amber-500 text-white";
                                                statusLabel = "Pending";
                                            }

                                            return (
                                                <div key={sub.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge className={cn("h-4 text-[8px] font-black uppercase border-none", statusColor)}>
                                                                {statusLabel}
                                                            </Badge>
                                                            <Badge variant="outline" className="h-4 text-[8px] font-bold text-slate-500 capitalize bg-slate-50/50">
                                                                {sub.cycleId || "First"} Cycle
                                                            </Badge>
                                                            <span className="text-[9px] font-mono font-medium text-slate-400">
                                                                Rev {String(sub.revision || 0).padStart(2, '0')}
                                                            </span>
                                                        </div>
                                                        <p className="text-[9px] font-mono text-slate-400 truncate leading-none">
                                                            {sub.controlNumber}
                                                        </p>
                                                    </div>
                                                    {sub.googleDriveLink ? (
                                                        <Button 
                                                            asChild
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-7 text-[9px] font-black uppercase gap-1 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-100 shrink-0 ml-4"
                                                        >
                                                            <a href={sub.googleDriveLink} target="_blank" rel="noopener noreferrer">
                                                                View Document <ExternalLink className="h-3 w-3" />
                                                            </a>
                                                        </Button>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-400 italic shrink-0 ml-4">No Link Available</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        } else {
                            return (
                                <div key={docType} className="flex items-center gap-3 bg-rose-50/60 p-4 rounded-xl border border-rose-100 shadow-inner">
                                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-rose-800 uppercase">Missing EOMS Submission</p>
                                        <p className="text-[9px] text-rose-600 font-medium italic">
                                            "{docType}" has not been uploaded for this academic year.
                                        </p>
                                    </div>
                                </div>
                            );
                        }
                    })}
                </div>
            </div>
        )}

        <div className="space-y-3 p-5 rounded-2xl border-primary/20 bg-primary/5 animate-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                    <Scale className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        Auditor Foresight: {clause.id === '10.1' ? 'Unit Non-Conformance History' : `Clause ${clause.id} History`}
                    </span>
                </div>
                <Badge variant="outline" className="h-5 text-[8px] font-black bg-white border-primary/20 text-primary">CLAUSE 10.1 REQUIREMENT</Badge>
            </div>
            
            {clauseCars.length > 0 ? (
                <div className="space-y-2">
                    {clauseCars.map(car => (
                        <div key={car.id} className="flex items-center justify-between bg-white/80 p-3 rounded-xl border border-primary/5 shadow-sm">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-slate-900 uppercase">CAR NO: {car.carNumber}</p>
                                <p className="text-[10px] text-muted-foreground truncate italic">"{car.descriptionOfNonconformance}"</p>
                            </div>
                            <Badge className={cn(
                                "h-5 text-[8px] font-black uppercase border-none ml-4",
                                car.status === 'Open' ? "bg-rose-600 text-white" : 
                                car.status === 'In Progress' ? "bg-amber-50 text-amber-950" : 
                                "bg-emerald-600 text-white"
                            )}>
                                {car.status}
                            </Badge>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center gap-3 bg-white/60 p-4 rounded-xl border border-emerald-100 shadow-inner">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-emerald-800 uppercase">Clean Compliance History</p>
                        <p className="text-[9px] text-emerald-600 font-medium italic">This unit has no recorded non-conformities from previous audits {clause.id !== '10.1' ? 'associated with this clause' : ''}.</p>
                    </div>
                </div>
            )}
        </div>

        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
                <Label className="font-black text-[10px] uppercase tracking-widest text-primary mb-3 block">RSU Institutional Audit Guide</Label>
                <ul className="list-disc space-y-2 pl-5 mt-2 text-xs text-muted-foreground font-medium leading-relaxed bg-primary/5 p-4 rounded-lg border border-primary/10 italic">
                    {(clauseQuestions[clause.id] || []).map((q, i) => <li key={i}>{q}</li>)}
                </ul>
            </div>

            <FormField
            control={form.control}
            name="evidence"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="font-black text-xs uppercase tracking-wider text-slate-800">1. Objective Audit Evidence / Verified Observations</FormLabel>
                <FormControl>
                    <Textarea 
                      {...field} 
                      rows={4} 
                      placeholder="Record verifiable observations..." 
                      className="bg-white border-slate-200 shadow-inner text-xs" 
                    />
                </FormControl>
                </FormItem>
            )}
            />

            <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
                <FormItem className="space-y-3 bg-muted/20 p-4 rounded-xl border border-dashed">
                    <FormLabel className="font-black text-xs uppercase tracking-wider text-primary">2. Audit Verification Result</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-4 pt-2">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Compliance" id={`c-${clause.id}`} />
                                <Label htmlFor={`c-${clause.id}`} className="font-bold text-[10px] uppercase tracking-tighter cursor-pointer">Compliance (C)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Observation for Improvement" id={`ofi-${clause.id}`} />
                                <Label htmlFor={`ofi-${clause.id}`} className="font-bold text-[10px] uppercase tracking-tighter cursor-pointer">OFI</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Non-Conformance" id={`nc-${clause.id}`} />
                                <Label htmlFor={`nc-${clause.id}`} className="font-bold text-[10px] uppercase tracking-tighter text-destructive cursor-pointer">Non-Conformance (NC)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Not Applicable" id={`na-${clause.id}`} />
                                <Label htmlFor={`na-${clause.id}`} className="font-bold text-[10px] uppercase tracking-tighter text-muted-foreground cursor-pointer">N/A</Label>
                            </div>
                        </RadioGroup>
                    </FormControl>
                </FormItem>
            )}
            />

            {watchType === 'Non-Conformance' && (
                <FormField control={form.control} name="ncStatement" render={({ field }) => (
                    <FormItem className="animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-destructive" /><FormLabel className="font-black text-[10px] uppercase text-destructive tracking-widest">3. Detailed Description of Finding (NC Statement)</FormLabel></div>
                        <FormControl><Textarea {...field} rows={6} placeholder="Edit the template below..." className="bg-destructive/5 border-destructive/20 text-xs font-medium leading-relaxed italic" /></FormControl>
                    </FormItem>
                )} />
            )}

            {watchType !== 'Non-Conformance' && watchType !== '' && (
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem className="animate-in fade-in duration-300">
                        <FormLabel className="font-black text-xs uppercase tracking-wider text-slate-800">3. Detailed Description of Finding</FormLabel>
                        <FormControl><Textarea {...field} rows={3} placeholder="Provide further context..." className="bg-white border-slate-200 text-xs" /></FormControl>
                    </FormItem>
                )} />
            )}

            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                    {isSubmitting ? (
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-600 animate-pulse"><CloudUpload className="h-3 w-3" />Committing...</div>
                    ) : lastSaved ? (
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600"><CheckCircle2 className="h-3 w-3" />Stored & Synced ({format(lastSaved, 'HH:mm:ss')})</div>
                    ) : null}
                </div>
                <Button type="submit" disabled={isSubmitting || !watchType} className="h-10 px-8 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                    {lastSaved ? 'Re-Commit Finding' : `Commit Clause ${clause.id}`}
                </Button>
            </div>
        </form>
        </Form>
    </div>
  );
}

export function AuditChecklist({ scheduleId, clausesToAudit, existingFindings, onFindingSaved, unitCars, unitSubmissions = [], isIqaUnit = false }: AuditChecklistProps) {
  const findingsMap = useMemo(() => new Map(existingFindings.map(f => [f.isoClause, f])), [existingFindings]);
  const sortedClauses = useMemo(() => [...clausesToAudit].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })), [clausesToAudit]);

  return (
    <Card className="shadow-2xl border-primary/10 overflow-hidden">
      <CardHeader className="bg-muted/30 border-b py-6">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Institutional Audit Evidence Log</CardTitle>
                <CardDescription className="font-medium">Verify RSU compliance against ISO 21001:2018 standards.</CardDescription>
            </div>
            <Badge variant="outline" className="h-6 px-4 font-black text-[10px] border-primary/20 bg-primary/5 text-primary uppercase">{sortedClauses.length} CLAUSES IN SCOPE</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          {sortedClauses.map((clause) => {
            const hasFinding = findingsMap.has(clause.id);
            const findingType = findingsMap.get(clause.id)?.type;
            const relevantCars = clause.id === '10.1' ? unitCars : unitCars.filter(c => String(c.concerningClause || '').toLowerCase().includes(String(clause.id).toLowerCase()));
            const requiredDocs = CLAUSE_EOMS_MAPPING[clause.id] || [];
            const relevantSubmissions = unitSubmissions.filter(s => requiredDocs.includes(s.reportType));

            return (
              <AccordionItem value={clause.id} key={clause.id} className="px-8 border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center justify-between w-full pr-6 text-left">
                    <div className="flex items-center gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-black text-primary text-[10px]">{clause.id}</div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">{clause.title}</span>
                            {relevantCars.length > 0 && <div className="flex items-center gap-1.5 mt-1"><History className="h-3 w-3 text-amber-600" /><span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">{relevantCars.length} history detected</span></div>}
                        </div>
                    </div>
                    {hasFinding && <Badge className={cn("h-5 text-[9px] font-black uppercase shadow-none border-none ml-4 transition-all scale-110", findingType === 'Compliance' ? 'bg-emerald-600 text-white' : findingType === 'Non-Conformance' ? 'bg-destructive text-white' : findingType === 'Not Applicable' ? 'bg-slate-500 text-white' : 'bg-amber-50 text-amber-950')}>{findingType?.charAt(0)} RECORDED</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-8">
                  <div className="rounded-xl border bg-white p-8 shadow-sm ring-1 ring-slate-200/50">
                    <ClauseForm scheduleId={scheduleId} clause={clause} finding={findingsMap.get(clause.id)} onSave={(data) => onFindingSaved?.(data)} clauseCars={relevantCars} clauseSubmissions={relevantSubmissions} isIqaUnit={isIqaUnit} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
