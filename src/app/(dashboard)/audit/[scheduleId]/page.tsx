'use client';

import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, collection, query, where, updateDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import type { AuditSchedule, AuditFinding, ISOClause } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Loader2, ArrowLeft, Save, Clock, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { AuditChecklist } from '@/components/audit/audit-checklist';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
        await updateDoc(scheduleDocRef, { ...values, status: 'Completed' });
        toast({ title: "Success", description: "Audit summary saved and marked as Completed." });
    } catch(error) {
        console.error("Error saving summary:", error);
        toast({ title: "Error", description: "Could not save summary.", variant: 'destructive' });
    } finally {
        setIsSavingSummary(false);
    }
  };

  const isLoading = isLoadingSchedule || isLoadingFindings || isLoadingClauses;

  // Ensure sidebar clauses are sorted numerically
  const sortedClausesInScope = useMemo(() => {
    if (!schedule?.isoClausesToAudit) return [];
    return [...schedule.isoClausesToAudit].sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [schedule?.isoClausesToAudit]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!schedule) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Audit Schedule Not Found</h2>
        <p className="text-muted-foreground">The schedule you are looking for does not exist.</p>
        <Button className="mt-4" onClick={() => router.back()}>
          <span>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </span>
        </Button>
      </div>
    );
  }

  const conductDate = schedule.scheduledDate.toDate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
            <h2 className="text-2xl font-bold tracking-tight">IQA - Evidence Log Sheet</h2>
            <p className="text-muted-foreground flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                {schedule.targetName} &bull; {format(conductDate, 'PPP')} @ {format(conductDate, 'hh:mm a')}
            </p>
            </div>
        </div>
        <Badge variant={schedule.status === 'Completed' ? 'default' : 'secondary'} className="h-7 px-4 font-black uppercase">
            {schedule.status}
        </Badge>
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
                    <CardTitle>Audit Summary & Final Report</CardTitle>
                    <CardDescription>Consolidate your findings into a high-level summary. Saving this will mark the audit as Completed.</CardDescription>
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSaveSummary)}>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="summaryCommendablePractices"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black uppercase text-emerald-700">List of Commendable Practices (C)</FormLabel>
                                        <FormControl><Textarea {...field} rows={4} placeholder="Summarize all commendable practices..." /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="summaryOFI"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black uppercase text-amber-700">Opportunities for Improvement (OFI)</FormLabel>
                                        <FormControl><Textarea {...field} rows={4} placeholder="Summarize all opportunities for improvement..."/></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="summaryNC"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black uppercase text-destructive">Non-Compliance / Non-Conformance (NC)</FormLabel>
                                        <FormControl><Textarea {...field} rows={4} placeholder="Summarize all non-conformances..."/></FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSavingSummary} className="shadow-lg shadow-primary/20 font-black uppercase tracking-widest">
                                {isSavingSummary && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <Save className="mr-2 h-4 w-4"/>
                                Finalize Audit Report
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>

        </div>
        <div className="lg:col-span-1">
            <Card className="sticky top-20 shadow-md border-primary/10">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Session Dossier</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-6 pt-6">
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Assigned Auditor</p>
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                <span className="text-sm font-bold">{schedule.auditorName || 'Not Assigned'}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Target Auditee</p>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="text-sm font-bold">{schedule.targetName}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Conduct Schedule</p>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                <span className="text-sm font-bold">{format(conductDate, 'PPp')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <Separator />

                    <div>
                        <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-3">Clauses in Scope</p>
                        <div className="flex flex-wrap gap-1.5">
                            {sortedClausesInScope.map(clauseId => (
                                <Badge key={clauseId} variant="outline" className="font-mono text-[10px] border-primary/20 px-2">Clause {clauseId}</Badge>
                            ))}
                        </div>
                    </div>
                 </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
