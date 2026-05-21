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
import type { AuditFinding, ISOClause, CorrectiveActionRequest } from '@/lib/types';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, AlertTriangle, History, ShieldCheck, Clock, CheckCircle2, Scale, CloudUpload, CloudDownload } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { clauseQuestions } from '@/lib/audit-questions';
import { format } from 'date-fns';
import { useNetworkStatus } from '@/hooks/use-network-status';

interface AuditChecklistProps {
  scheduleId: string;
  clausesToAudit: ISOClause[];
  existingFindings: AuditFinding[];
  onFindingSaved?: (finding: any) => void;
  unitCars: CorrectiveActionRequest[];
}

interface ClauseFormData {
  evidence: string;
  description: string;
  ncStatement: string;
  type: 'Compliance' | 'Observation for Improvement' | 'Non-Conformance' | '';
}

function ClauseForm({ 
  scheduleId, 
  clause, 
  finding, 
  onSave,
  clauseCars
}: { 
  scheduleId: string; 
  clause: ISOClause; 
  finding: AuditFinding | undefined, 
  onSave: (data: any) => void,
  clauseCars: CorrectiveActionRequest[]
}) {
  const { user, userRole } = useUser();
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

  useEffect(() => {
    if (watchType === 'Non-Conformance' && !form.getValues('ncStatement')) {
        const template = `It was observed that ISO 21001:2018 Clause ${clause.id} requirement regarding [Specific Requirement Name] was not fully implemented in the [Unit Name]. \n\nSpecifically, the unit [Description of the Gap/Failure]. \n\nThis resulted in [Impact/Risk to the Management System].`;
        form.setValue('ncStatement', template);
    }
  }, [watchType, clause.id, form]);

  useEffect(() => {
    if (!watchAll.type || !firestore || !user) return;

    const hasChanged = 
        watchAll.evidence !== (finding?.evidence || '') ||
        watchAll.description !== (finding?.description || '') ||
        watchAll.ncStatement !== (finding?.ncStatement || '') ||
        watchAll.type !== (finding?.type || '');

    if (hasChanged) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        
        // Extended auto-save timeout to 8 seconds
        saveTimeoutRef.current = setTimeout(() => {
            performSave(watchAll);
        }, 8000); 
    }

    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [watchAll, finding, firestore, user]);

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
        description: values.description || (values.type === 'Non-Conformance' ? values.ncStatement : ''),
        evidence: values.evidence,
        authorId: user.uid,
        createdAt: finding?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    if (values.type === 'Non-Conformance') {
        findingData.ncStatement = values.ncStatement;
    }

    try {
        await setDoc(findingRef, findingData, { merge: true });
        setLastSaved(new Date());
        onSave(findingData); 
    } catch(error) {
        console.error("Error auto-saving finding: ", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const onSubmit = async (values: ClauseFormData) => {
      await performSave(values);
      toast({ title: isOnline ? "Audit Progress Synced" : "Saved Locally", description: `Finding for clause ${clause.id} has been recorded.`});
  };

  return (
    <div className="space-y-8">
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
            
            <p className="text-[9px] text-primary/60 font-medium italic leading-tight pt-1">
                <strong>Auditor Guideline (10.1.d):</strong> Verify if previous actions taken for any findings are still effective and prevent recurrence.
            </p>
        </div>

        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
                <Label className="font-black text-[10px] uppercase tracking-widest text-primary mb-3 block">RSU Institutional Audit Guide</Label>
                <ul className="list-disc space-y-2 pl-5 mt-2 text-xs text-muted-foreground font-medium leading-relaxed bg-primary/5 p-4 rounded-lg border border-primary/10 italic">
                    {(clauseQuestions[clause.id] || []).map((q, i) => <li key={i}>{q}</li>)}
                </ul>
            </div>

            {/* FIELD 1: OBJECTIVE AUDIT EVIDENCE (Moved to top per request) */}
            <FormField
            control={form.control}
            name="evidence"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="font-black text-xs uppercase tracking-wider text-slate-800">1. Objective Audit Evidence / Verified Observations</FormLabel>
                <FormControl>
                    <Textarea {...field} rows={4} placeholder="Record verifiable observations (documents reviewed, RSU forms examined, interviews, site inspections)..." className="bg-white border-slate-200 shadow-inner text-xs" disabled={isSubmitting} />
                </FormControl>
                <FormDescription className="text-[9px]">Document the specific evidence that supports the finding before determining the result.</FormDescription>
                </FormItem>
            )}
            />

            {/* FIELD 2: AUDIT VERIFICATION RESULT (Now between Evidence and Description) */}
            <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
                <FormItem className="space-y-3 bg-muted/20 p-4 rounded-xl border border-dashed">
                    <FormLabel className="font-black text-xs uppercase tracking-wider text-primary">2. Audit Verification Result</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-4 pt-2" disabled={isSubmitting}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Compliance" id={`c-${clause.id}`} />
                                <Label htmlFor={`c-${clause.id}`} className="font-bold text-[10px] uppercase tracking-tighter cursor-pointer">Compliance (C)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Observation for Improvement" id={`ofi-${clause.id}`} />
                                <Label htmlFor={`ofi-${clause.id}`} className="font-bold text-[10px] uppercase tracking-tighter cursor-pointer">Observation for Improvement (OFI)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Non-Conformance" id={`nc-${clause.id}`} />
                                <Label htmlFor={`nc-${clause.id}`} className="font-bold text-[10px] uppercase tracking-tighter text-destructive cursor-pointer">Non-Conformance (NC)</Label>
                            </div>
                        </RadioGroup>
                    </FormControl>
                </FormItem>
            )}
            />

            {/* FIELD 3: DETAILED DESCRIPTION / NC STATEMENT (Conditional based on Result) */}
            {watchType === 'Non-Conformance' && (
                <FormField
                    control={form.control}
                    name="ncStatement"
                    render={({ field }) => (
                        <FormItem className="animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                                <FormLabel className="font-black text-[10px] uppercase text-destructive tracking-widest">3. Detailed Description of Finding (NC Statement)</FormLabel>
                            </div>
                            <FormControl>
                                <Textarea 
                                    {...field} 
                                    rows={6} 
                                    placeholder="Edit the template below to reflect your findings..." 
                                    className="bg-destructive/5 border-destructive/20 text-xs font-medium leading-relaxed italic" 
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                            <FormDescription className="text-[9px]">The template above is pre-populated. Please edit the bracketed [ ] sections to specify the gap.</FormDescription>
                        </FormItem>
                    )}
                />
            )}

            {watchType !== 'Non-Conformance' && watchType !== '' && (
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem className="animate-in fade-in duration-300">
                            <FormLabel className="font-black text-xs uppercase tracking-wider text-slate-800">3. Detailed Description of Finding</FormLabel>
                            <FormControl>
                                <Textarea {...field} rows={3} placeholder="Provide further context or notes regarding this finding..." className="bg-white border-slate-200 text-xs" disabled={isSubmitting} />
                            </FormControl>
                        </FormItem>
                    )}
                />
            )}

            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                    {isSubmitting ? (
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-600 animate-pulse">
                            <CloudUpload className="h-3 w-3" />
                            {isOnline ? 'Synchronizing Registry...' : 'Caching locally...'}
                        </div>
                    ) : lastSaved ? (
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            {isOnline ? `Registry Logged (${format(lastSaved, 'HH:mm:ss')})` : `Saved to Device (${format(lastSaved, 'HH:mm:ss')})`}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground opacity-40">
                            <CloudDownload className="h-3 w-3" />
                            Awaiting verification entry
                        </div>
                    )}
                </div>
                <Button type="submit" disabled={isSubmitting || !watchType} className="h-9 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                    {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin"/>}
                    {lastSaved ? 'Force Sync Finding' : `Commit Clause ${clause.id}`}
                </Button>
            </div>
        </form>
        </Form>
    </div>
  );
}


export function AuditChecklist({ scheduleId, clausesToAudit, existingFindings, onFindingSaved, unitCars }: AuditChecklistProps) {
  const findingsMap = useMemo(() => new Map(existingFindings.map(f => [f.isoClause, f])), [existingFindings]);

  const sortedClauses = useMemo(() => {
    return [...clausesToAudit].sort((a, b) => 
        a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [clausesToAudit]);

  return (
    <Card className="shadow-2xl border-primary/10 overflow-hidden">
      <CardHeader className="bg-muted/30 border-b py-6">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Institutional Audit Evidence Log</CardTitle>
                <CardDescription className="font-medium">
                Sequentially verify RSU compliance against ISO 21001:2018 standards.
                </CardDescription>
            </div>
            <Badge variant="outline" className="h-6 font-black text-[10px] border-primary/20 bg-primary/5 text-primary uppercase">
                {sortedClauses.length} CLAUSES IN SCOPE
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          {sortedClauses.map((clause) => {
            const hasFinding = findingsMap.has(clause.id);
            const findingType = findingsMap.get(clause.id)?.type;
            
            const relevantCars = clause.id === '10.1' 
                ? unitCars 
                : unitCars.filter(c => {
                    const concerning = String(c.concerningClause || '').toLowerCase().trim();
                    const currentId = String(clause.id).toLowerCase().trim();
                    return concerning === currentId || concerning.includes(`clause ${currentId}`);
                });

            return (
              <AccordionItem value={clause.id} key={clause.id} className="px-8 border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center justify-between w-full pr-6 text-left">
                    <div className="flex items-center gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-black text-primary text-[10px]">
                            {clause.id}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">
                                {clause.title}
                            </span>
                            {relevantCars.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-1">
                                    <History className="h-3 w-3 text-amber-600" />
                                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">
                                        {clause.id === '10.1' ? 'Unit Total:' : 'Clause History:'} {relevantCars.length} findings detected
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    {hasFinding && (
                        <Badge 
                            className={cn(
                                "h-5 text-[9px] font-black uppercase shadow-none border-none ml-4 transition-all scale-110",
                                findingType === 'Compliance' ? 'bg-emerald-600 text-white' : 
                                findingType === 'Non-Conformance' ? 'bg-destructive text-white' : 
                                'bg-amber-50 text-amber-950'
                            )}
                        >
                            {findingType === 'Compliance' ? 'C' : findingType === 'Non-Conformance' ? 'NC' : 'OFI'} RECORDED
                        </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-8">
                  <div className="rounded-xl border bg-white p-8 shadow-sm ring-1 ring-slate-200/50">
                    <ClauseForm 
                        scheduleId={scheduleId}
                        clause={clause}
                        finding={findingsMap.get(clause.id)}
                        onSave={(data) => onFindingSaved?.(data)}
                        clauseCars={relevantCars}
                    />
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
