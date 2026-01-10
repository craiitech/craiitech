
'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { AuditSchedule, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AuditorScheduleList } from './auditor-schedule-list';

export function AuditorAuditView() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const schedulesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'auditSchedules'), where('auditorId', '==', user.uid));
  }, [firestore, user]);
  
  const { data: schedules, isLoading: isLoadingSchedules } = useCollection<AuditSchedule>(schedulesQuery);

  const campusesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'campuses')) : null, [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);
  
  const unitsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'units')) : null, [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const isLoading = isUserLoading || isLoadingSchedules || isLoadingCampuses || isLoadingUnits;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Audits</h2>
        <p className="text-muted-foreground">A list of all internal quality audits assigned to you.</p>
      </div>
       <Card>
        <CardHeader>
            <CardTitle>Assigned Audit Schedules</CardTitle>
            <CardDescription>Select an audit to begin recording your findings.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <AuditorScheduleList 
                    schedules={schedules || []}
                    campuses={campuses || []}
                    units={units || []}
                />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
