'use client';

import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, collection, query, where, setDoc, updateDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import type { AuditSchedule, AuditFinding, ISOClause, CorrectiveActionPlan } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { AuditChecklist } from '@/components/audit/audit-checklist';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

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
  summaryCommendablePractices: z.string().optional(),
  summaryOFI: z.string().optional(),
  summaryNC: z.string().optional(),
});

export default function AuditExecutionPage() {
  const { scheduleId } = useParams();
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  const scheduleDocRef = useMemoFirebase(
    () => (firestore && scheduleId ? doc(firestore, 'auditSchedules', scheduleId as string) : null),
    [firestore, scheduleId]
  );
  const { data: schedule, isLoading: isLoadingSchedule } = useDoc<AuditSchedule>(scheduleDocRef);

  const findingsQuery = useMemoFirebase(
    () => (firestore && scheduleId ? query(collection(firestore, 'auditFindings'), where('auditScheduleId', '==', scheduleId)) : null),
    [firestore, scheduleId]
  );
  const { data: findings, isLoading: isLoadingFindings } = useCollection<AuditFinding>(findingsQuery);
  
  const isoClausesQuery = useMemoFirebase(() => {
      if (!firestore || !schedule || !schedule.isoClausesToAudit || schedule.isoClausesToAudit.length === 0) return null;
      return query(collection(firestore, 'isoClauses'), where('id', 'in', schedule.isoClausesToAudit));
  }, [firestore, schedule]);
  const { data: isoClauses, isLoading: isLoadingClauses } = useCollection<ISOClause>(isoClausesQuery);

  const form = useForm<z.infer<typeof summarySchema>>({
    resolver: zodResolver(summarySchema),
    defaultValues: {
      summaryCommendablePractices: schedule?.summaryCommendablePractices || '',
      summaryOFI: schedule?.summaryOFI || '',
      summaryNC: schedule?.summaryNC || '',
    },
  });

  useState(() => {
      if (schedule) {
          form.reset({
            summaryCommendablePractices: schedule.summaryCommendablePractices || '',
            summaryOFI: schedule.summaryOFI || '',
            summaryNC: schedule.summaryNC || '',
          });
      }
  }, [schedule, form]);


  const handleSaveSummary = async (values: z.infer<typeof summarySchema>) => {
    if (!scheduleDocRef) return;
    setIsSavingSummary(true);
    try {
        await updateDoc(scheduleDocRef, values);
        toast({ title: "Success", description: "Audit summary has been saved." });
    } catch(error) {
        console.error("Error saving summary:", error);
        toast({ title: "Error", description: "Could not save summary.", variant: 'destructive' });
    } finally {
        setIsSavingSummary(false);
    }
  };

  const isLoading = isLoadingSchedule || isLoadingFindings || isLoadingClauses;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!schedule) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Audit Schedule Not Found</h2>
        <p className="text-muted-foreground">The schedule you are looking for does not exist.</p>
        <Button asChild className="mt-4" onClick={() => router.back()}>
          <span>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">IQA - Evidence Log Sheet</h2>
          <p className="text-muted-foreground">
            {schedule.targetName} &bull; {format(schedule.scheduledDate.toDate(), 'PPP')}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <AuditChecklist 
                scheduleId={schedule.id}
                clausesToAudit={isoClauses || []}
                existingFindings={findings || []}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Audit Summary</CardTitle>
                    <CardDescription>Consolidate your findings into a high-level summary.</CardDescription>
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSaveSummary)}>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="summaryCommendablePractices"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>List of Commendable Practices (C)</FormLabel>
                                        <FormControl><Textarea {...field} rows={4} placeholder="Summarize all commendable practices..." /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="summaryOFI"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Opportunities for Improvement (OFI)</FormLabel>
                                        <FormControl><Textarea {...field} rows={4} placeholder="Summarize all opportunities for improvement..."/></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="summaryNC"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Non-Compliance / Non-Conformance (NC)</FormLabel>
                                        <FormControl><Textarea {...field} rows={4} placeholder="Summarize all non-conformances..."/></FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSavingSummary}>
                                {isSavingSummary && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <Save className="mr-2 h-4 w-4"/>
                                Save Audit Summary
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>

        </div>
        <div className="lg:col-span-1">
            <Card className="sticky top-20">
                <CardHeader>
                    <CardTitle>Audit Details</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-2 text-sm">
                    <p><strong className="font-medium">Auditor:</strong> {schedule.auditorName || 'Not Assigned'}</p>
                    <p><strong className="font-medium">Auditee:</strong> {schedule.targetName}</p>
                    <p><strong className="font-medium">Date:</strong> {format(schedule.scheduledDate.toDate(), 'PPP')}</p>
                    <p><strong className="font-medium">Status:</strong> {schedule.status}</p>
                    <div>
                        <strong className="font-medium">Clauses in Scope:</strong>
                        <ul className="list-disc pl-5 mt-1">
                            {schedule.isoClausesToAudit.map(clauseId => <li key={clauseId}>{clauseId}</li>)}
                        </ul>
                    </div>
                 </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
