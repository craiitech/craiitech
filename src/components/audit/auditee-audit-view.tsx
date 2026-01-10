
'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { AuditFinding, AuditSchedule, CorrectiveActionPlan } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { FindingsList } from './findings-list';

export function AuditeeAuditView() {
  const { userProfile, isUserLoading } = useUser();
  const firestore = useFirestore();

  const schedulesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(collection(firestore, 'auditSchedules'), where('targetId', '==', userProfile.unitId));
  }, [firestore, userProfile]);
  
  const { data: schedules, isLoading: isLoadingSchedules } = useCollection<AuditSchedule>(schedulesQuery);
  
  const scheduleIds = useMemo(() => schedules?.map(s => s.id) || [], [schedules]);

  const findingsQuery = useMemoFirebase(() => {
    if (!firestore || scheduleIds.length === 0) return null;
    return query(collection(firestore, 'auditFindings'), where('auditScheduleId', 'in', scheduleIds));
  }, [firestore, scheduleIds]);

  const { data: findings, isLoading: isLoadingFindings } = useCollection<AuditFinding>(findingsQuery);
  
  const findingIds = useMemo(() => findings?.map(f => f.id) || [], [findings]);

  const capsQuery = useMemoFirebase(() => {
    if (!firestore || findingIds.length === 0) return null;
    return query(collection(firestore, 'correctiveActionPlans'), where('findingId', 'in', findingIds));
  }, [firestore, findingIds]);

  const { data: caps, isLoading: isLoadingCaps } = useCollection<CorrectiveActionPlan>(capsQuery);

  const isLoading = isUserLoading || isLoadingSchedules || isLoadingFindings || isLoadingCaps;

  return (
    <div className="space-y-4">
       <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Findings</h2>
        <p className="text-muted-foreground">
            A record of all findings from internal quality audits for your unit.
        </p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Your Unit's Audit Results</CardTitle>
            <CardDescription>Review findings and submit corrective action plans for any non-conformances.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                 <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <FindingsList
                    findings={findings || []}
                    schedules={schedules || []}
                    correctiveActionPlans={caps || []}
                    isAuditor={false}
                />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
