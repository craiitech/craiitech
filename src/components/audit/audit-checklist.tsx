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
import type { AuditFinding, ISOClause, CorrectiveActionRequest, Submission, Risk } from '@/lib/types';
import { doc, setDoc, serverTimestamp, collection, addDoc, updateDoc, Timestamp, deleteDoc } from '@/firebase/firestore-wrapper';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, AlertTriangle, History, ShieldCheck, Clock, CheckCircle2, Scale, CloudUpload, CloudDownload, ExternalLink, CheckCircle, AlertCircle, ArrowRight, TrendingUp, FileText, PlusCircle } from 'lucide-react';
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
  onFindingDeleted?: (findingId: string, clauseId: string) => void;
  unitCars: CorrectiveActionRequest[];
  unitSubmissions: Submission[];
  isIqaUnit?: boolean;
  previousYearOfis?: AuditFinding[];
  scheduleTargetId?: string;
  scheduleCampusId?: string;
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
  findingId,
  onSave,
  onDelete,
  clauseCars,
  clauseSubmissions,
  isIqaUnit = false,
  previousYearOfis = [],
  scheduleTargetId,
  scheduleCampusId
}: { 
  scheduleId: string; 
  clause: ISOClause; 
  finding: AuditFinding | undefined, 
  findingId: string,
  onSave: (data: any) => void,
  onDelete?: (findingId: string) => void,
  clauseCars: CorrectiveActionRequest[],
  clauseSubmissions: Submission[],
  isIqaUnit?: boolean;
  previousYearOfis?: AuditFinding[];
  scheduleTargetId?: string;
  scheduleCampusId?: string;
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

  const handleDelete = async () => {
    if (!firestore || !finding?.id) return;
    if (!window.confirm(`Are you sure you want to remove this finding result for Clause ${clause.id}?`)) return;
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSubmitting(true);
    const findingRef = doc(firestore, 'auditFindings', finding.id);
    try {
      await deleteDoc(findingRef);
      onDelete?.(finding.id);
      form.reset({
        evidence: '',
        description: '',
        ncStatement: '',
        type: '',
      });
      setLastSaved(null);
      toast({ title: "Result Removed", description: `Audit result for Clause ${clause.id} has been deleted.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to delete audit result.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
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

  const handleVerifyImplemented = async (ofi: AuditFinding) => {
    if (!firestore || !user) return;
    
    try {
      // 1. Update the previous OFI finding with verification status
      const ofiRef = doc(firestore, 'auditFindings', ofi.id);
      await updateDoc(ofiRef, {
        verification: {
          status: 'Implemented',
          verifiedBy: user.uid,
          verifiedAt: serverTimestamp(),
          evidence: `Verified during current audit (${new Date().toLocaleDateString()})`,
        },
        updatedAt: serverTimestamp(),
      });

      // 2. Create a new Compliance finding for current audit linking to this OFI
      const currentFindingId = `${scheduleId}-${clause.id}-ofi-${ofi.id}`;
      const currentFindingRef = doc(firestore, 'auditFindings', currentFindingId);
      await setDoc(currentFindingRef, {
        id: currentFindingId,
        auditScheduleId: scheduleId,
        isoClause: clause.id,
        type: 'Compliance',
        description: `Previous OFI Implemented: ${ofi.description || ofi.evidence || 'N/A'}`,
        evidence: `Verified implementation of previous year OFI (${ofi.id}). ${ofi.description || ofi.evidence || ''}`,
        authorId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        linkedPreviousOFI: ofi.id,
      });

      // 3. Trigger sync to update the form
      onSave({
        type: 'Compliance',
        description: `Previous OFI Implemented: ${ofi.description || ofi.evidence || 'N/A'}`,
        evidence: `Verified implementation of previous year OFI (${ofi.id}).`,
        isoClause: clause.id,
      });

      toast({ 
        title: "OFI Verified Implemented", 
        description: `Previous OFI ${ofi.id} marked as implemented and linked to current audit.`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error verifying OFI:', error);
      toast({ 
        title: "Error", 
        description: "Failed to verify OFI implementation.", 
        variant: "destructive" 
      });
    }
  };

  const handleCarryForward = async (ofi: AuditFinding) => {
    if (!firestore || !user || !scheduleTargetId || !scheduleCampusId) return;
    
    try {
      // 1. Update the previous OFI finding with verification status
      const ofiRef = doc(firestore, 'auditFindings', ofi.id);
      await updateDoc(ofiRef, {
        verification: {
          status: 'Carried Forward',
          verifiedBy: user.uid,
          verifiedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      // 2. Create a Risk entry (Opportunity) for tracking
      const riskId = `risk-${scheduleId}-ofi-${ofi.id}`;
      const riskRef = doc(firestore, 'risks', riskId);
      
      // Get unit and campus info from passed props
      const unitId = scheduleTargetId;
      const campusId = scheduleCampusId;
      const year = new Date().getFullYear();
      
      await setDoc(riskRef, {
        id: riskId,
        userId: user.uid,
        unitId,
        campusId,
        year,
        objective: `Address previous audit OFI: ${ofi.description || ofi.evidence || 'N/A'}`,
        type: 'Opportunity',
        description: `Carried forward from previous year audit (Clause 10.3). Original OFI: ${ofi.id}. ${ofi.description || ofi.evidence || ''}`,
        currentControls: 'Previous audit identified this as an Opportunity for Improvement.',
        preTreatment: {
          likelihood: 3,
          consequence: 3,
          magnitude: 9,
          rating: 'Medium',
        },
        treatmentAction: `Implement improvements to address OFI from previous audit: ${ofi.description || ofi.evidence || 'N/A'}`,
        responsiblePersonId: user.uid,
        responsiblePersonName: `${user.displayName || 'Current User'}`,
        targetDate: Timestamp.fromDate(new Date(year + 1, 0, 1)), // Next year
        status: 'Open',
        oapNo: `OAP-${riskId}`,
        resourcesNeeded: 'To be determined during implementation planning',
        updates: `Created from carried-forward OFI ${ofi.id} on ${new Date().toLocaleDateString()}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        linkedPreviousOFI: ofi.id,
      });

      // Update the OFI with the risk ID
      await updateDoc(ofiRef, {
        'verification.carriedToRiskId': riskId,
      });

      toast({ 
        title: "OFI Carried Forward", 
        description: `Previous OFI ${ofi.id} added to Risk Register as Opportunity for tracking.`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error carrying forward OFI:', error);
      toast({ 
        title: "Error", 
        description: "Failed to carry forward OFI.", 
        variant: "destructive" 
      });
    }
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

        {/* Previous Year OFIs for Clause 10.3 */}
        {clause.id === '10.3' && previousYearOfis.length > 0 && (
          <div className="space-y-3 p-5 rounded-2xl border-amber-200 bg-amber-50/40 animate-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700">
                <TrendingUp className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Previous Year OFIs (Clause 10.3) - {previousYearOfis.length} Found
                </span>
              </div>
              <Badge variant="outline" className="h-5 text-[8px] font-black bg-white border-amber-200 text-amber-700">ISO 10.3 REQUIREMENT</Badge>
            </div>
            <p className="text-[9px] text-amber-600 font-medium italic mt-2">
              Verify if previous year Opportunities for Improvement have been implemented or carried forward.
            </p>
            <div className="space-y-2 mt-3">
              {previousYearOfis.map((ofi) => (
                <div key={ofi.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-amber-800 uppercase tracking-wide">OFI Reference: {ofi.id}</p>
                      <p className="text-[9px] text-slate-700 italic leading-relaxed mt-1">"{ofi.description || ofi.evidence || 'No description available'}"</p>
                      {ofi.verification && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="h-4 text-[7px] font-black bg-amber-50 border-amber-200 text-amber-700">
                            Status: {ofi.verification.status}
                          </Badge>
                          {ofi.verification.evidence && (
                            <span className="text-[8px] text-amber-600 font-medium">Evidence: {ofi.verification.evidence}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {!ofi.verification || ofi.verification.status !== 'Implemented' ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 px-3 text-[8px] font-black uppercase gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          onClick={() => handleVerifyImplemented(ofi)}
                        >
                          <CheckCircle className="h-3 w-3" /> Verified Implemented
                        </Button>
                      ) : (
                        <div className="h-8 px-3 text-[8px] font-black uppercase gap-1 bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <CheckCircle className="h-3 w-3" /> Implemented
                        </div>
                      )}
                      {!ofi.verification || ofi.verification.status !== 'Carried Forward' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-[8px] font-black uppercase gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                          onClick={() => handleCarryForward(ofi)}
                        >
                          <ArrowRight className="h-3 w-3" /> Open for Implementation
                        </Button>
                      ) : (
                        <div className="h-8 px-3 text-[8px] font-black uppercase gap-1 bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                          <TrendingUp className="h-3 w-3" /> Carried Forward
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                    {(finding?.id || findingId !== `${scheduleId}-${clause.id}`) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        className="h-10 px-4 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/5"
                      >
                        Delete Result
                      </Button>
                    )}
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

export function AuditChecklist({ 
  scheduleId, 
  clausesToAudit, 
  existingFindings, 
  onFindingSaved, 
  onFindingDeleted,
  unitCars, 
  unitSubmissions = [], 
  isIqaUnit = false,
  previousYearOfis = [],
  scheduleTargetId,
  scheduleCampusId
}: AuditChecklistProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const sortedClauses = useMemo(() => [...clausesToAudit].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })), [clausesToAudit]);

  const handleAddAdditionalResult = async (clauseId: string) => {
    if (!firestore || !user) {
      toast({ title: "Error", description: "You must be authenticated to add results.", variant: "destructive" });
      return;
    }
    const newFindingId = `${scheduleId}-${clauseId}-${Date.now()}`;
    const newFindingRef = doc(firestore, 'auditFindings', newFindingId);
    
    const newFindingData = {
      id: newFindingId,
      auditScheduleId: scheduleId,
      isoClause: clauseId,
      type: '', // Empty draft finding
      description: '',
      evidence: '',
      ncStatement: '',
      authorId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(newFindingRef, newFindingData);
      toast({ title: "Additional Result Added", description: `A new result entry has been prepared for Clause ${clauseId}.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to add additional audit result.", variant: "destructive" });
    }
  };

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
            const clauseFindings = existingFindings.filter(f => f.isoClause === clause.id);
            const activeFindings = clauseFindings.filter(f => f.type);
            const relevantCars = clause.id === '10.1' ? unitCars : unitCars.filter(c => String(c.concerningClause || '').toLowerCase().includes(String(clause.id).toLowerCase()));
            const requiredDocs = CLAUSE_EOMS_MAPPING[clause.id] || [];
            const relevantSubmissions = unitSubmissions.filter(s => requiredDocs.includes(s.reportType));

            // Default to rendering one blank form if there are no existing findings in the DB
            const findingsToRender = clauseFindings.length > 0 ? clauseFindings : [{
              id: `${scheduleId}-${clause.id}`,
              auditScheduleId: scheduleId,
              isoClause: clause.id,
              type: '' as any,
              description: '',
              evidence: '',
              ncStatement: '',
              authorId: '',
              createdAt: null
            }];

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
                    {activeFindings.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 ml-4">
                        {Array.from(new Set(activeFindings.map(f => f.type))).map(type => (
                          <Badge 
                            key={type} 
                            className={cn(
                              "h-5 text-[8px] font-black uppercase shadow-none border-none transition-all scale-105", 
                              type === 'Compliance' ? 'bg-emerald-600 text-white' : 
                              type === 'Non-Conformance' ? 'bg-destructive text-white' : 
                              type === 'Not Applicable' ? 'bg-slate-500 text-white' : 
                              'bg-amber-500 text-white'
                            )}
                          >
                            {type === 'Compliance' ? 'C' : type === 'Non-Conformance' ? 'NC' : type === 'Not Applicable' ? 'N/A' : 'OFI'} RECORDED
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-8">
                  <div className="space-y-6">
                    {findingsToRender.map((f, index) => (
                      <div key={f.id} className={cn("rounded-xl border bg-white p-8 shadow-sm ring-1 ring-slate-200/50 relative", index > 0 && "mt-6 border-t-2 border-dashed")}>
                        {findingsToRender.length > 1 && (
                          <Badge className="absolute -top-3 left-4 bg-primary text-white text-[10px] font-black uppercase px-2.5 py-0.5 shadow-sm">
                            Audit Result #{index + 1}
                          </Badge>
                        )}
                        <ClauseForm 
                          scheduleId={scheduleId} 
                          clause={clause} 
                          finding={f.type === '' && !f.authorId ? undefined : f} 
                          findingId={f.id}
                          onSave={(data) => onFindingSaved?.(data)} 
                          onDelete={(id) => onFindingDeleted?.(id, clause.id)}
                          clauseCars={relevantCars} 
                          clauseSubmissions={relevantSubmissions} 
                          isIqaUnit={isIqaUnit} 
                          previousYearOfis={previousYearOfis} 
                          scheduleTargetId={scheduleTargetId} 
                          scheduleCampusId={scheduleCampusId} 
                        />
                      </div>
                    ))}
                    
                    {/* Add Additional Result Trigger */}
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddAdditionalResult(clause.id)}
                        className="font-black uppercase text-[10px] tracking-widest text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 gap-1.5 h-9 px-4"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Add Additional Audit Result
                      </Button>
                    </div>
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
