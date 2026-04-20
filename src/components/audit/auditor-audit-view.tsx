
'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { AuditSchedule, Campus, Unit, ISOClause, Signatories, AuditPlan } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CalendarCheck, CalendarSearch, Check, Search, Building } from 'lucide-react';
import { AuditorScheduleList } from './auditor-schedule-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function AuditorAuditView() {
  const { user, userProfile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState<string>('all');

  const allSchedulesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'auditSchedules'));
  }, [firestore]);
  
  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection<AuditSchedule>(allSchedulesQuery);

  const plansQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditPlans') : null), [firestore]);
  const { data: plans } = useCollection<AuditPlan>(plansQuery);

  const campusesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'campuses')) : null, [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);
  
  const unitsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'units')) : null, [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const isoClausesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'isoClauses') : null), [firestore]);
  const { data: isoClauses, isLoading: isLoadingClauses } = useCollection<ISOClause>(isoClausesQuery);

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const filterSchedules = (list: AuditSchedule[]) => {
    return list.filter(s => {
        const matchesSearch = 
            s.targetName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (s.procedureDescription || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCampus = campusFilter === 'all' || s.campusId === campusFilter;
        return matchesSearch && matchesCampus;
    });
  };

  const mySchedules = useMemo(() => {
    const list = allSchedules?.filter(s => s.auditorId === user?.uid) || [];
    return filterSchedules(list);
  }, [allSchedules, user?.uid, searchTerm, campusFilter]);

  const availableSchedules = useMemo(() => {
    const list = allSchedules?.filter(s => s.auditorId === null) || [];
    return filterSchedules(list);
  }, [allSchedules, searchTerm, campusFilter]);

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

  const isLoading = isUserLoading || isLoadingSchedules || isLoadingCampuses || isLoadingUnits || isLoadingClauses;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Internal Quality Audits</h2>
          <p className="text-muted-foreground">Manage audits assigned to you and claim new audits from the available pool.</p>
        </div>
      </div>

      <Card className="border-primary/10 shadow-md">
        <CardHeader className="bg-muted/10 border-b pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                        <Search className="h-2.5 w-2.5" /> Search Registry
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by auditee or procedure..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 shadow-sm bg-white"
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                        <Building className="h-2.5 w-2.5" /> Filter by Campus
                    </label>
                    <Select value={campusFilter} onValueChange={setCampusFilter}>
                        <SelectTrigger className="h-10 bg-white shadow-sm font-bold">
                            <SelectValue placeholder="All Campuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Institutional (All Campuses)</SelectItem>
                            {campuses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
            {isLoading ? (
                <div className="flex flex-col justify-center items-center h-48 gap-3 opacity-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs font-black uppercase tracking-widest">Synchronizing Registry...</p>
                </div>
            ) : (
                <Tabs defaultValue="my-audits" className="space-y-6">
                    <TabsList className="bg-muted p-1 border shadow-sm w-full md:w-auto h-auto grid grid-cols-2 md:inline-flex animate-tab-highlight rounded-md">
                        <TabsTrigger value="my-audits" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
                            <CalendarCheck className="h-4 w-4"/> My Audits
                        </TabsTrigger>
                        <TabsTrigger value="available-audits" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
                            <CalendarSearch className="h-4 w-4"/> Available Pool
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="my-audits" className="animate-in fade-in slide-in-from-left-2 duration-300">
                        <AuditorScheduleList 
                            schedules={mySchedules}
                            plans={plans || []}
                            campuses={campuses || []}
                            units={units || []}
                            isoClauses={isoClauses || []}
                            signatories={signatories || undefined}
                            isClaimView={false}
                        />
                    </TabsContent>

                    <TabsContent value="available-audits" className="animate-in fade-in slide-in-from-right-2 duration-300">
                         <AuditorScheduleList 
                            schedules={availableSchedules}
                            plans={plans || []}
                            campuses={campuses || []}
                            units={units || []}
                            isoClauses={isoClauses || []}
                            signatories={signatories || undefined}
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
