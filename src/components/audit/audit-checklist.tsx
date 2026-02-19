'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import type { AuditFinding, ISOClause } from '@/lib/types';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';

interface AuditChecklistProps {
  scheduleId: string;
  clausesToAudit: ISOClause[];
  existingFindings: AuditFinding[];
}

interface ClauseFormData {
  evidence: string;
  type: 'Commendation' | 'Observation for Improvement' | 'Non-Conformance' | '';
}

const clauseQuestions: Record<string, string[]> = {
    "4.1": [
        "Has the unit/office determined external and internal issues relevant to Romblon State University's purpose and strategic direction?",
        "Is there evidence that these issues are regularly reviewed during unit planning or RSU Management Reviews?",
        "Are context-related issues aligned with the University's current Strategic Plan?"
    ],
    "4.2": [
        "Are RSU's interested parties (students, faculty, alumni, CHED, DBM, local government) correctly identified for this unit?",
        "Does the unit maintain records of the requirements and expectations of these RSU stakeholders?",
        "Is there evidence that stakeholder needs are monitored and addressed in the unit's operational plan?"
    ],
    "4.3": [
        "Is the scope of the EOMS within the unit clearly defined and consistent with the University’s institutional scope?",
        "Are all educational services or administrative supports offered by the unit covered in the EOMS scope?"
    ],
    "4.4": [
        "Has the unit established and maintained the processes required for the RSU EOMS?",
        "Are the inputs, outputs, and sequence of university-level processes within the unit documented?",
        "Are risks and opportunities associated with these unit processes determined and addressed?"
    ],
    "5.1": [
        "Does the Unit Head/Director demonstrate leadership by establishing the unit’s quality objectives?",
        "Is there evidence of active unit participation in RSU Management Reviews and QMS orientations?",
        "Does the unit ensure the integration of RSU EOMS requirements into its daily operations?"
    ],
    "5.2": [
        "Is the Romblon State University Quality Policy understood and applied within the unit?",
        "Is the RSU Quality Policy visible in key areas of the unit (postings, logbooks, official docs)?",
        "Can personnel explain how their work contributes to the RSU EOMS Policy?"
    ],
    "5.3": [
        "Are the roles, responsibilities, and authorities for the RSU EOMS assigned and communicated within the unit?",
        "Is the unit's organizational structure updated and officially approved by University management?",
        "Do staff members understand their specific accountabilities in the EOMS hierarchy?"
    ],
    "6.1": [
        "Does the unit utilize the RSU Risk and Opportunity Register to plan for potential issues?",
        "Are the actions taken to address risks appropriate to the potential impact on the quality of university services?",
        "Is there evidence of follow-up on the effectiveness of implemented risk treatments?"
    ],
    "6.2": [
        "Are the unit's quality objectives measurable and aligned with RSU's institutional performance targets?",
        "Is there a clear plan (Operational Plan) on how the unit will achieve these objectives?",
        "Are the objectives regularly monitored and updated based on actual performance data?"
    ],
    "6.3": [
        "Are changes to the unit’s processes or structure carried out in a planned manner as per RSU protocols?",
        "Is the integrity of the EOMS maintained whenever changes occur within the unit?"
    ],
    "7.1": [
        "Has the unit determined and provided the human resources needed for effective EOMS implementation?",
        "Are classroom facilities, offices, and IT infrastructure (e.g., RSU portal access) maintained and fit for purpose?",
        "Is there evidence of regular inventory and maintenance of unit equipment?"
    ],
    "7.2": [
        "Are personnel in the unit competent based on appropriate education, training, and experience (aligned with RSU HR policies)?",
        "Are faculty/staff credentials updated and on file within the unit/HRMO?",
        "Is there evidence of training or professional development provided to address competency gaps?"
    ],
    "7.3": [
        "Are unit employees aware of the RSU Vision, Mission, and Quality Policy?",
        "Do employees understand the implications of not conforming to EOMS requirements in their specific tasks?"
    ],
    "7.4": [
        "Are internal and external communications relevant to the RSU EOMS established (e.g., unit meetings, official RSU emails)?",
        "Does the unit effectively communicate performance results to students and relevant stakeholders?"
    ],
    "7.5": [
        "Does the unit use official RSU EOMS forms and templates for its records?",
        "Is there a controlled system for creating, updating, and storing documented information within the unit?",
        "Are records easily retrievable and protected from unauthorized access or damage?"
    ],
    "8.1": [
        "Does the unit plan and control its operational processes to meet RSU service requirements?",
        "Is there evidence of Complete Staff Work (CSW) in the planning and execution of unit activities?",
        "Are criteria for process performance and service acceptance established and followed?"
    ],
    "8.2": [
        "Are learner/beneficiary requirements for RSU services clearly determined before service delivery?",
        "Is there a mechanism for communicating with RSU students regarding course requirements or service updates?"
    ],
    "8.3": [
        "Does the development of new curricula or academic programs follow CHED and RSU BOR standards?",
        "Are the inputs, controls, and outputs of the design process documented (e.g., syllabus review, curriculum mapping)?",
        "Are changes to program designs reviewed and approved by the RSU Academic Council/BOR?"
    ],
    "8.4": [
        "Are externally provided services (e.g., outsourced security, janitorial, or IT tools) controlled by the unit as per RSU standards?",
        "Is the performance of external providers monitored and evaluated by the unit?"
    ],
    "8.5": [
        "Is the provision of instruction or administrative support implemented under controlled conditions (e.g., class observations, service logs)?",
        "Is there evidence of the implementation of the RSU Student Handbook and Student Manual in unit operations?"
    ],
    "8.6": [
        "Are arrangements in place to verify that service requirements have been met before the release of final results (e.g., grade verification)?",
        "Is documented information on the release of RSU products/services maintained?"
    ],
    "8.7": [
        "Are nonconforming services (e.g., late grading, service delays) identified and controlled?",
        "Does the unit take appropriate action to correct nonconformities and prevent their unintended delivery?"
    ],
    "9.1": [
        "Does the unit measure and monitor student/client satisfaction through the RSU Client Satisfaction Measurement (CSM)?",
        "Are methods for monitoring, measurement, analysis, and evaluation established and used by the unit?",
        "Is the data analyzed to determine the effectiveness of the unit’s EOMS performance?"
    ],
    "9.2": [
        "Are internal quality audits conducted at planned intervals within the unit as per the RSU IQA Plan?",
        "Are the results of previous IQA findings addressed and verified for closure by the unit?"
    ],
    "9.3": [
        "Is data from the unit's performance presented during RSU Management Reviews?",
        "Does the unit head review the unit's EOMS at planned intervals to ensure its continuing suitability?"
    ],
    "10.1": [
        "Does the unit react to nonconformities and take immediate actions to control or correct them?",
        "Is there evidence of root cause analysis for significant nonconformities identified in the unit?",
        "Are corrective actions taken to prevent the recurrence of issues?"
    ],
    "10.2": [
        "Is there evidence of continual improvement activities within the unit's operations?",
        "Does the unit use audit findings, CSM results, and risk registry data to drive improvement?"
    ],
    "10.3": [
        "Does the unit proactively seek and identify opportunities for improvement in RSU services?",
        "Are innovative practices or new efficiency measures implemented and documented by the unit?"
    ]
};


function ClauseForm({ scheduleId, clause, finding, onSave }: { scheduleId: string; clause: ISOClause; finding: AuditFinding | undefined, onSave: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClauseFormData>({
    defaultValues: {
      evidence: finding?.description || '',
      type: finding?.type || '',
    },
  });

  useEffect(() => {
      form.reset({
        evidence: finding?.description || '',
        type: finding?.type || '',
      })
  }, [finding, form]);

  const onSubmit = async (values: ClauseFormData) => {
    if (!firestore || !user || !values.type) {
      toast({ title: "Incomplete", description: "Please select a finding type (C, OFI, or NC).", variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    
    const findingId = `${scheduleId}-${clause.id}`;
    const findingRef = doc(firestore, 'auditFindings', findingId);

    try {
        await setDoc(findingRef, {
            id: findingId,
            auditScheduleId: scheduleId,
            isoClause: clause.id,
            type: values.type,
            description: values.evidence,
            evidence: values.evidence, 
            authorId: user.uid,
            createdAt: serverTimestamp(),
        }, { merge: true });

        toast({ title: "Saved", description: `Finding for clause ${clause.id} has been saved.`});
        onSave(); 
    } catch(error) {
        console.error("Error saving finding: ", error);
        toast({ title: "Error", description: "Could not save finding.", variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <FormLabel className="font-bold text-xs uppercase tracking-wider">Objective Audit Evidence / Verified Observations</FormLabel>
              <FormControl>
                <Textarea {...field} rows={6} placeholder="Record verifiable observations (documents reviewed, RSU forms examined, interviews, site inspections)..." className="bg-white border-slate-200 shadow-inner" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
                <FormLabel className="font-bold text-xs uppercase tracking-wider">Audit Verification Result</FormLabel>
                 <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-4 pt-2">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Commendation" /></FormControl>
                            <Label className="font-bold text-[10px] uppercase tracking-tighter cursor-pointer">Commendation (C)</Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Observation for Improvement" /></FormControl>
                            <Label className="font-bold text-[10px] uppercase tracking-tighter cursor-pointer">Opportunity for Improvement (OFI)</Label>
                        </FormItem>
                         <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Non-Conformance" /></FormControl>
                            <Label className="font-bold text-[10px] uppercase tracking-tighter text-destructive cursor-pointer">Non-Conformance (NC)</Label>
                        </FormItem>
                    </RadioGroup>
                </FormControl>
            </FormItem>
          )}
        />
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


export function AuditChecklist({ scheduleId, clausesToAudit, existingFindings }: AuditChecklistProps) {
  const findingsMap = useMemo(() => new Map(existingFindings.map(f => [f.isoClause, f])), [existingFindings]);

  const sortedClauses = useMemo(() => {
    return [...clausesToAudit].sort((a, b) => 
        a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [clausesToAudit]);

  const handleSave = () => {
    // Parent components handle state synchronization via real-time hooks
  }

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
                                findingType === 'Commendation' ? 'bg-emerald-600 text-white' : 
                                findingType === 'Non-Conformance' ? 'bg-destructive text-white' : 
                                'bg-amber-500 text-amber-950'
                            )}
                        >
                            {findingType === 'Commendation' ? 'C' : findingType === 'Non-Conformance' ? 'NC' : 'OFI'} RECORDED
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
                        onSave={handleSave}
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
