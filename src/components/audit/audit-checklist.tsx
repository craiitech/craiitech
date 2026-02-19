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
import { useState, useEffect } from 'react';
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
    "5.3": ["Is there evidence that responsibilities and authorities for relevant roles are assigned and communicated?", "Are these responsibilities and authorities understood within the organization?"],
    "6.1": ["Does the planning process for the EOMS consider internal and external issues (4.1)?", "Does it consider the requirements of interested parties (4.2)?", "Is there a process to determine and address risks and opportunities?"],
    "6.2": ["Are EOMS objectives established at relevant functions and levels?", "Are the objectives measurable and consistent with the EOMS policy?", "Is there planning in place to achieve these objectives?"],
    "7.1": ["Are necessary resources for the EOMS determined and provided?", "Does this include resources for establishment, implementation, maintenance, and improvement?"],
    "7.2": ["Has the organization determined the necessary competence for persons affecting EOMS performance?", "Are actions taken to acquire and evaluate the effectiveness of this competence?"],
    "7.3": ["Are persons doing work under the organization’s control aware of the EOMS policy and objectives?", "Do they understand their contribution and the implications of non-conformance?"],
    "7.4": ["Has the organization determined the internal and external communications relevant to the EOMS?", "Is it clear what, when, with whom, and how to communicate?"],
    "7.5": ["Does the EOMS include all documented information required by the ISO 21001 standard?", "Is there a process for creating, updating, and controlling documented information?"],
    "8.1": ["Are processes for providing educational products and services planned, implemented, and controlled?", "Are criteria for the processes and acceptance of products/services established?"],
    "8.2": ["Is there a process for communicating with interested parties about products, services, and feedback?", "Are requirements for products and services determined and reviewed?"],
    "8.3": ["Is there a design and development process for educational products/services?", "Are there controls for design and development planning, inputs, outputs, and changes?"],
    "8.4": ["Are externally provided processes, products, and services controlled?", "Is the type and extent of control defined and applied?"],
    "8.5": ["Is the provision of educational products and services implemented under controlled conditions?", "Does this include control of infrastructure, monitoring, and release of products/services?"],
    "8.6": ["Are planned arrangements in place to verify that requirements have been met before release?", "Is there documented information on the release of products/services?"],
    "8.7": ["Are nonconforming outputs identified and controlled to prevent unintended use?", "Is there documented information on nonconformities and actions taken?"],
    "9.1": ["Has the organization determined what needs to be monitored and measured?", "Are methods for monitoring, measurement, analysis, and evaluation established and used?"],
    "10.1": ["Is there a process to react to nonconformities, correct them, and deal with consequences?", "Does the organization evaluate the need for action to eliminate the cause of the nonconformity?"],
    "10.2": ["Does the organization continually improve the suitability, adequacy, and effectiveness of the EOMS?"],
    "10.3": ["Does the organization actively seek and identify opportunities for improvement?"]
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
            evidence: values.evidence, // Using description as evidence for now
            authorId: user.uid,
            createdAt: serverTimestamp(),
        }, { merge: true });

        toast({ title: "Saved", description: `Finding for clause ${clause.id} has been saved.`});
        onSave(); // Notify parent to refetch
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
            <Label className="font-semibold">Audit Questions / Checklist</Label>
            <ul className="list-disc space-y-1 pl-5 mt-2 text-sm text-muted-foreground">
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
                <FormLabel className="font-semibold">Finding</FormLabel>
                 <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Commendation" /></FormControl>
                            <Label className="font-normal">Commendation (C)</Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Observation for Improvement" /></FormControl>
                            <Label className="font-normal">Opportunity for Improvement (OFI)</Label>
                        </FormItem>
                         <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="Non-Conformance" /></FormControl>
                            <Label className="font-normal">Non-Conformance (NC)</Label>
                        </FormItem>
                    </RadioGroup>
                </FormControl>
            </FormItem>
          )}
        />
         <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
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

  // This function would be called to refetch the findings from the parent.
  // For now, we'll just simulate an update.
  const handleSave = () => {
    // In a real app, you would trigger a refetch here.
    // For now, we don't need to do anything as the form state is self-contained.
  }
  
  const findingsMap = new Map(findings.map(f => [f.isoClause, f]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Checklist & Evidence Log</CardTitle>
        <CardDescription>
          Record your findings for each required clause. Your progress is saved as you go.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {clausesToAudit.map((clause) => (
            <AccordionItem value={clause.id} key={clause.id}>
              <AccordionTrigger className="text-base font-semibold">
                Clause {clause.id}: {clause.title}
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-muted/20">
                <ClauseForm 
                    scheduleId={scheduleId}
                    clause={clause}
                    finding={findingsMap.get(clause.id)}
                    onSave={handleSave}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
