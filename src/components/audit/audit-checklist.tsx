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
        "Has the organization determined external and internal issues that are relevant to its purpose and strategic direction?",
        "Is there evidence of regular monitoring and review of these issues?"
    ],
    "4.2": [
        "Has the organization determined the interested parties (learners, staff, government, etc.) relevant to the EOMS?",
        "Are the requirements of these interested parties identified and reviewed?"
    ],
    "4.3": [
        "Is the scope of the EOMS clearly defined and available as documented information?",
        "Does the scope cover all educational products and services offered?"
    ],
    "4.4": [
        "Are the EOMS processes established, implemented, maintained, and continually improved?",
        "Are the inputs, outputs, and sequence of these processes determined?"
    ],
    "5.1": [
        "Does top management demonstrate leadership by ensuring the EOMS policy and objectives are established?",
        "Is there commitment to the integration of EOMS requirements into business processes?"
    ],
    "5.2": [
        "Is the EOMS policy appropriate to the purpose and context of the university?",
        "Is the policy communicated, understood, and applied within the unit?"
    ],
    "5.3": [
        "Are responsibilities and authorities for relevant roles assigned and communicated?",
        "Are these responsibilities and authorities understood within the organization?"
    ],
    "6.1": [
        "Does the planning process for the EOMS consider internal and external issues (4.1)?",
        "Does it consider the requirements of interested parties (4.2)?",
        "Is there a process to determine and address risks and opportunities?"
    ],
    "6.2": [
        "Are EOMS objectives established at relevant functions and levels?",
        "Are the objectives measurable and consistent with the EOMS policy?",
        "Is there planning in place to achieve these objectives?"
    ],
    "6.3": [
        "Are changes to the EOMS carried out in a planned manner?",
        "Is the integrity of the EOMS maintained during changes?"
    ],
    "7.1": [
        "Are necessary resources (human, infrastructure, environment) for the EOMS determined and provided?",
        "Is there evidence of maintenance and monitoring of these resources?"
    ],
    "7.2": [
        "Has the organization determined the necessary competence for persons affecting EOMS performance?",
        "Are actions taken to acquire competence (training, hiring) and evaluate its effectiveness?"
    ],
    "7.3": [
        "Are persons doing work under the organization’s control aware of the EOMS policy and objectives?",
        "Do they understand their contribution and the implications of non-conformance?"
    ],
    "7.4": [
        "Has the organization determined the internal and external communications relevant to the EOMS?",
        "Is it clear what, when, with whom, and how to communicate?"
    ],
    "7.5": [
        "Does the EOMS include all documented information required by the ISO 21001 standard?",
        "Is there a process for creating, updating, and controlling documented information?"
    ],
    "8.1": [
        "Are processes for providing educational products and services planned, implemented, and controlled?",
        "Are criteria for the processes and acceptance of products/services established?"
    ],
    "8.2": [
        "Is there a process for communicating with interested parties about products, services, and feedback?",
        "Are requirements for products and services determined and reviewed before commitment?"
    ],
    "8.3": [
        "Is there a design and development process for educational products/services (curriculum development)?",
        "Are there controls for design and development planning, inputs, outputs, and changes?"
    ],
    "8.4": [
        "Are externally provided processes, products, and services (outsourcing) controlled?",
        "Is the type and extent of control defined and applied to suppliers?"
    ],
    "8.5": [
        "Is the provision of educational products and services implemented under controlled conditions?",
        "Does this include control of infrastructure, monitoring, and release of products/services?"
    ],
    "8.6": [
        "Are planned arrangements in place to verify that requirements have been met before release?",
        "Is there documented information on the release of products/services?"
    ],
    "8.7": [
        "Are nonconforming outputs identified and controlled to prevent unintended use?",
        "Is there documented information on nonconformities and actions taken?"
    ],
    "9.1": [
        "Has the organization determined what needs to be monitored and measured?",
        "Are methods for monitoring, measurement, analysis, and evaluation established and used?",
        "Is learner and other beneficiary satisfaction monitored?"
    ],
    "9.2": [
        "Are internal audits conducted at planned intervals?",
        "Are audit results reported to relevant management?"
    ],
    "9.3": [
        "Does top management review the organization’s EOMS at planned intervals?",
        "Does the review consider changes in issues, performance, and opportunities for improvement?"
    ],
    "10.1": [
        "Is there a process to react to nonconformities, correct them, and deal with consequences?",
        "Does the organization evaluate the need for action to eliminate the cause of the nonconformity?"
    ],
    "10.2": [
        "Does the organization continually improve the suitability, adequacy, and effectiveness of the EOMS?"
    ],
    "10.3": [
        "Does the organization actively seek and identify opportunities for improvement?"
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
            <Label className="font-semibold text-primary">Audit Questions / Guide</Label>
            <ul className="list-disc space-y-1 pl-5 mt-2 text-xs text-muted-foreground italic leading-relaxed">
                {(clauseQuestions[clause.id] || []).map((q, i) => <li key={i}>{q}</li>)}
            </ul>
        </div>
        <FormField
          control={form.control}
          name="evidence"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">Audit Evidence / Findings</FormLabel>
              <FormControl>
                <Textarea {...field} rows={5} placeholder="Record objective, verifiable observations here (documents reviewed, interviews, records examined)..." />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
                <FormLabel className="font-semibold">Verification Finding</FormLabel>
                 <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Commendation" /></FormControl>
                            <Label className="font-normal text-xs">Commendation (C)</Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Observation for Improvement" /></FormControl>
                            <Label className="font-normal text-xs">Opportunity for Improvement (OFI)</Label>
                        </FormItem>
                         <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Non-Conformance" /></FormControl>
                            <Label className="font-normal text-xs">Non-Conformance (NC)</Label>
                        </FormItem>
                    </RadioGroup>
                </FormControl>
            </FormItem>
          )}
        />
         <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="h-8 text-xs">
                {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin"/>}
                Save Finding for Clause {clause.id}
            </Button>
        </div>
      </form>
    </Form>
  );
}


export function AuditChecklist({ scheduleId, clausesToAudit, existingFindings }: AuditChecklistProps) {
  const [findings, setFindings] = useState(existingFindings);

  useEffect(() => {
    setFindings(existingFindings);
  }, [existingFindings]);

  const handleSave = () => {
    // Parent components handle state synchronization via real-time hooks
  }
  
  const findingsMap = new Map(findings.map(f => [f.isoClause, f]));

  const sortedClauses = useMemo(() => {
    return [...clausesToAudit].sort((a, b) => 
        a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [clausesToAudit]);

  return (
    <Card className="shadow-md">
      <CardHeader className="bg-primary/5 border-b">
        <CardTitle className="text-lg">Audit Checklist & Evidence Log</CardTitle>
        <CardDescription>
          Sequentially verify each clause. Progress is automatically synchronized with the institutional registry.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          {sortedClauses.map((clause) => {
            const hasFinding = findingsMap.has(clause.id);
            const findingType = findingsMap.get(clause.id)?.type;

            return (
              <AccordionItem value={clause.id} key={clause.id} className="px-6 border-b last:border-0">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4 text-left">
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      Clause {clause.id}: {clause.title}
                    </span>
                    {hasFinding && (
                        <Badge 
                            variant={findingType === 'Non-Conformance' ? 'destructive' : 'secondary'}
                            className="h-5 text-[9px] font-black uppercase shadow-none border-none ml-4"
                        >
                            {findingType === 'Commendation' ? 'C' : findingType === 'Non-Conformance' ? 'NC' : 'OFI'} RECORDED
                        </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="rounded-lg border bg-muted/10 p-6">
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
