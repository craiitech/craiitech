
'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { AuditSchedule, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CalendarCheck, CalendarSearch, Check } from 'lucide-react';
import { AuditorScheduleList } from './auditor-schedule-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '@/hooks/use-toast';

export function AuditorAuditView() {
  const { user, userProfile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const allSchedulesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'auditSchedules'));
  }, [firestore]);
  
  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection<AuditSchedule>(allSchedulesQuery);

  const campusesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'campuses')) : null, [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);
  
  const unitsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'units')) : null, [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const mySchedules = allSchedules?.filter(s => s.auditorId === user?.uid) || [];
  const availableSchedules = allSchedules?.filter(s => s.auditorId === null) || [];

  const handleClaimAudit = async (scheduleId: string) => {
    if (!firestore || !user || !userProfile) return;

    const scheduleRef = doc(firestore, 'auditSchedules', scheduleId);
    
    try {
        await updateDoc(scheduleRef, {
            auditorId: user.uid,
            auditorName: `${userProfile.firstName} ${userProfile.lastName}`,
            status: 'In Progress'
        });
        toast({ title: 'Success', description: 'Audit claimed successfully.' });
    } catch(error) {
        console.error("Error claiming audit:", error);
        toast({ title: 'Error', description: 'Could not claim the audit.', variant: 'destructive'});
    }
  }

  const isLoading = isUserLoading || isLoadingSchedules || isLoadingCampuses || isLoadingUnits;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Internal Quality Audits</h2>
        <p className="text-muted-foreground">Manage audits assigned to you and claim new audits from the available pool.</p>
      </div>
       <Card>
        <CardHeader>
            <CardTitle>Audit Dashboard</CardTitle>
            <CardDescription>Select an audit to begin recording your findings.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <Tabs defaultValue="my-audits">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="my-audits"><CalendarCheck className="mr-2 h-4 w-4"/>My Audits</TabsTrigger>
                        <TabsTrigger value="available-audits"><CalendarSearch className="mr-2 h-4 w-4"/>Available Audits</TabsTrigger>
                    </TabsList>
                    <TabsContent value="my-audits">
                        <AuditorScheduleList 
                            schedules={mySchedules}
                            campuses={campuses || []}
                            units={units || []}
                            isClaimView={false}
                        />
                    </TabsContent>
                    <TabsContent value="available-audits">
                         <AuditorScheduleList 
                            schedules={availableSchedules}
                            campuses={campuses || []}
                            units={units || []}
                            isClaimView={true}
                            onClaimAudit={handleClaimAudit}
                        />
                    </TabsContent>
                </Tabs>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
