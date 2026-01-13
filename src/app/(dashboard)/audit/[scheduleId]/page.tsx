'use client';

import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import type { AuditSchedule, AuditFinding, ISOClause, CorrectiveActionPlan } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FindingForm } from '@/components/audit/finding-form';
import { FindingsList } from '@/components/audit/findings-list';
import { useMemo } from 'react';

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

export default function AuditExecutionPage() {
  const { scheduleId } = useParams();
  const firestore = useFirestore();
  const router = useRouter();

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
  
  const findingIds = useMemoFirebase(() => findings?.map(f => f.id) || [], [findings]);

  const capsQuery = useMemoFirebase(() => {
    if (!firestore || findingIds.length === 0) return null;
    return query(collection(firestore, 'correctiveActionPlans'), where('findingId', 'in', findingIds));
  }, [firestore, findingIds]);
  const { data: caps, isLoading: isLoadingCaps } = useCollection<CorrectiveActionPlan>(capsQuery);


  const isoClausesQuery = useMemoFirebase(() => {
      if (!firestore || !schedule || schedule.isoClausesToAudit.length === 0) return null;
      return query(collection(firestore, 'isoClauses'), where('id', 'in', schedule.isoClausesToAudit));
  }, [firestore, schedule]);
  const { data: isoClauses, isLoading: isLoadingClauses } = useCollection<ISOClause>(isoClausesQuery);

  const isLoading = isLoadingSchedule || isLoadingFindings || isLoadingClauses || isLoadingCaps;

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
          <h2 className="text-2xl font-bold tracking-tight">Audit Execution</h2>
          <p className="text-muted-foreground">
            Recording findings for: {schedule.targetName}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Log New Finding</CardTitle>
                    <CardDescription>Use this form to record a Non-Conformance, Observation, or Commendation.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FindingForm scheduleId={schedule.id as string} clausesToAudit={isoClauses || []} />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Recorded Findings</CardTitle>
                    <CardDescription>A list of all findings recorded for this audit schedule.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FindingsList findings={findings || []} schedules={[schedule]} correctiveActionPlans={caps || []} isAuditor={true} />
                </CardContent>
            </Card>

        </div>
        <div className="lg:col-span-1">
            <Card className="sticky top-20">
                <CardHeader>
                    <CardTitle>Audit Details</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-2 text-sm">
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
