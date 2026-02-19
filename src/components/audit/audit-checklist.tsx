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
import type { AuditFinding, ISOClause } from '@/lib/types';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { clauseQuestions } from '@/lib/audit-questions';

interface AuditChecklistProps {
  scheduleId: string;
  clausesToAudit: ISOClause[];
  existingFindings: AuditFinding[];
  onFindingSaved?: (finding: any) => void;
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
  onSave 
}: { 
  scheduleId: string; 
  clause: ISOClause; 
  finding: AuditFinding | undefined, 
  onSave: (data: any) => void 
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClauseFormData>({
    defaultValues: {
      evidence: finding?.evidence || '',
      description: finding?.description || '',
      ncStatement: finding?.ncStatement || '',
      type: finding?.type || '',
    },
  });

  const watchType = form.watch('type');

  useEffect(() => {
      form.reset({
        evidence: finding?.evidence || '',
        description: finding?.description || '',
        ncStatement: finding?.ncStatement || '',
        type: finding?.type || '',
      })
  }, [finding, form]);

  // When NC is selected, auto-fill the template if empty
  useEffect(() => {
    if (watchType === 'Non-Conformance' && !form.getValues('ncStatement')) {
        const template = `It was observed that ISO 21001:2018 Clause ${clause.id} requirement regarding [Specific Requirement Name] was not fully implemented in the [Unit Name]. \n\nSpecifically, the unit [Description of the Gap/Failure]. \n\nThis resulted in [Impact/Risk to the Management System].`;
        form.setValue('ncStatement', template);
    }
  }, [watchType, clause.id, form]);

  const onSubmit = async (values: ClauseFormData) => {
    if (!firestore || !user || !values.type) {
      toast({ title: "Incomplete", description: "Please select a finding type (C, OFI, or NC).", variant: 'destructive' });
      return;
    }
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
        createdAt: serverTimestamp(),
    };

    if (values.type === 'Non-Conformance') {
        findingData.ncStatement = values.ncStatement;
    }

    try {
        await setDoc(findingRef, findingData, { merge: true });
        toast({ title: "Saved", description: `Finding for clause ${clause.id} has been saved.`});
        onSave(findingData); 
    } catch(error) {
        console.error("Error saving finding: ", error);
        toast({ title: "Error", description: "Could not save finding.", variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
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
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
                <FormLabel className="font-bold text-xs uppercase tracking-wider">Audit Verification Result</FormLabel>
                 <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-4 pt-2" disabled={isSubmitting}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Compliance" id={`c-${clause.id}`} />
                            <Label htmlFor={`c-${clause.id}`} className="font-bold text-[10px] uppercase tracking-tighter cursor-pointer">Compliance (C)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Observation for Improvement" id={`ofi-${clause.id}`} />
                            <Label htmlFor={`ofi-${clause.id}`} className="font-bold text-[10px] uppercase tracking-tighter cursor-pointer">Opportunity for Improvement (OFI)</Label>
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

        {watchType === 'Non-Conformance' && (
            <FormField
                control={form.control}
                name="ncStatement"
                render={({ field }) => (
                    <FormItem className="animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <FormLabel className="font-black text-[10px] uppercase text-destructive tracking-widest">Formal Non-Conformance Statement</FormLabel>
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

        <FormField
          control={form.control}
          name="evidence"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold text-xs uppercase tracking-wider">Objective Audit Evidence / Verified Observations</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} placeholder="Record verifiable observations (documents reviewed, RSU forms examined, interviews, site inspections)..." className="bg-white border-slate-200 shadow-inner text-xs" disabled={isSubmitting} />
              </FormControl>
              <FormDescription className="text-[9px]">Document the specific evidence that supports the finding.</FormDescription>
            </FormItem>
          )}
        />

        {watchType !== 'Non-Conformance' && watchType !== '' && (
            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold text-xs uppercase tracking-wider">Detailed Description of Finding</FormLabel>
                        <FormControl>
                            <Textarea {...field} rows={3} placeholder="Provide further context or notes regarding this finding..." className="bg-white border-slate-200 text-xs" disabled={isSubmitting} />
                        </FormControl>
                    </FormItem>
                )}
            />
        )}

         <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting} className="h-9 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/10">
                {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin"/>}
                Commit Finding for Clause {clause.id}
            </Button>
        </div>
      </form>
    </Form>
  );
}


export function AuditChecklist({ scheduleId, clausesToAudit, existingFindings, onFindingSaved }: AuditChecklistProps) {
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

            return (
              <AccordionItem value={clause.id} key={clause.id} className="px-8 border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center justify-between w-full pr-6 text-left">
                    <div className="flex items-center gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-black text-primary text-[10px]">
                            {clause.id}
                        </div>
                        <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">
                            {clause.title}
                        </span>
                    </div>
                    {hasFinding && (
                        <Badge 
                            className={cn(
                                "h-5 text-[9px] font-black uppercase shadow-none border-none ml-4 transition-all scale-110",
                                findingType === 'Compliance' ? 'bg-emerald-600 text-white' : 
                                findingType === 'Non-Conformance' ? 'bg-destructive text-white' : 
                                'bg-amber-500 text-amber-950'
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
