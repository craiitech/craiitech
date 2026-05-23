
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { AuditSchedule, Campus, Unit, ISOClause, AuditPlan, AuditFinding, CorrectiveActionRequest } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CalendarCheck, CalendarSearch, Search, Building, LayoutList, ShieldAlert, ClipboardCheck, Lock, WifiOff, School } from 'lucide-react';
import { AuditorScheduleList } from './auditor-schedule-list';
import { AuditResultsView } from './audit-results-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { cn } from '@/lib/utils';

/**
 * AUDITOR AUDIT VIEW v13.0
 * The primary workspace for internal auditors.
 * Hardened: Implements Selective Site Locking during offline conduct.
 */
export function AuditorAuditView() {
  const { user, userProfile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isOnline = useNetworkStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [isForcedOffline, setIsForcedOffline] = useState(false);
  const [siteLock, setSiteLock] = useState<string | null>(null);

  useEffect(() => {
    const checkState = () => {
        setIsForcedOffline(localStorage.getItem('rsu_eoms_net_disabled') === 'true');
        const lock = localStorage.getItem('rsu_offline_site_lock');
        setSiteLock(lock === 'university-wide' ? null : lock);
    };
    checkState();
    window.addEventListener('storage', checkState);
    return () => window.removeEventListener('storage', checkState);
  }, []);

  const isActuallyOffline = !isOnline || isForcedOffline;

  const allSchedulesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'auditSchedules'));
  }, [firestore]);
  
  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection<AuditSchedule>(allSchedulesQuery);

  const findingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'auditFindings');
  }, [firestore]);
  const { data: findings, isLoading: isLoadingFindings } = useCollection<AuditFinding>(findingsQuery);

  const carsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'correctiveActionRequests');
  }, [firestore]);
  const { data: cars, isLoading: isLoadingCars } = useCollection<CorrectiveActionRequest>(carsQuery);

  const plansQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditPlans') : null), [firestore]);
  const { data: plans } = useCollection<AuditPlan>(plansQuery);

  const campusesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'campuses')) : null, [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);
  
  const unitsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'units')) : null, [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const isoClausesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'isoClauses') : null), [firestore]);
  const { data: isoClauses, isLoading: isLoadingClauses } = useCollection<ISOClause>(isoClausesQuery);

  /**
   * SITE LOCK FILTERING
   * When offline and a site-lock is present, restrict visibility to that specific campus.
   */
  const filterSchedules = (list: AuditSchedule[]) => {
    return list.filter(s => {
        // Enforce Site Lock
        if (isActuallyOffline && siteLock && s.campusId !== siteLock) return false;

        const matchesSearch = 
            s.targetName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (s.procedureDescription || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCampus = campusFilter === 'all' || s.campusId === campusFilter;
        return matchesSearch && matchesCampus;
    });
  };

  const mySchedulesRaw = useMemo(() => allSchedules?.filter(s => s.auditorId === user?.uid) || [], [allSchedules, user?.uid]);
  const availableSchedulesRaw = useMemo(() => allSchedules?.filter(s => s.auditorId === null) || [], [allSchedules]);

  const mySchedulesFiltered = useMemo(() => filterSchedules(mySchedulesRaw), [mySchedulesRaw, searchTerm, campusFilter, isActuallyOffline, siteLock]);
  const availableSchedulesFiltered = useMemo(() => filterSchedules(availableSchedulesRaw), [availableSchedulesRaw, searchTerm, campusFilter, isActuallyOffline, siteLock]);

  const handleClaimAudit = async (scheduleId: string) => {
    if (!firestore || !user || !userProfile) return;
    const scheduleRef = doc(firestore, 'auditSchedules', scheduleId);
    try {
        await updateDoc(scheduleRef, {
            auditorId: user.uid,
            auditorName: `${userProfile.firstName} ${userProfile.lastName}`,
            status: 'In Progress'
        });
        toast({ title: 'Success', description: isActuallyOffline ? 'Audit claimed locally. Syncing when online.' : 'Audit claimed successfully.' });
    } catch(error) {
        console.error("Error claiming audit:", error);
        toast({ title: 'Error', description: 'Could not claim the audit.', variant: 'destructive'});
    }
  };

  const handleUnclaimAudit = async (scheduleId: string) => {
      if (!firestore) return;
      const scheduleRef = doc(firestore, 'auditSchedules', scheduleId);
      try {
          await updateDoc(scheduleRef, {
              auditorId: null,
              auditorName: null,
              status: 'Scheduled'
          });
          toast({ title: 'Unit Removed', description: isActuallyOffline ? 'Removed locally. Sync pending.' : 'Audit has been released back to the available pool.' });
      } catch (error) {
          toast({ title: 'Error', description: 'Could not remove audit.', variant: 'destructive' });
      }
  };

  const isLoading = isUserLoading || isLoadingSchedules || isLoadingCampuses || isLoadingUnits || isLoadingClauses || isLoadingFindings || isLoadingCars;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="my-audits" className="space-y-6">
        {/* Sticky Header with Filters and Tabs */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <LayoutList className="h-6 w-6 text-primary" />
                    IQA Conduct Workspace
                  </h2>
                  <div className="flex items-center gap-2">
                      <p className="text-muted-foreground text-sm font-medium">Manage your assignments and record on-site evidence logs.</p>
                      {isActuallyOffline && siteLock && (
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-primary/30 text-primary bg-primary/5">
                            <School className="h-2 w-2 mr-1" />
                            Site Lock: {campuses?.find(c => c.id === siteLock)?.name || 'Local Cache'}
                          </Badge>
                      )}
                  </div>
                </div>
                {isActuallyOffline && (
                    <Badge variant="destructive" className="h-9 px-4 font-black uppercase text-[9px] gap-2 animate-in zoom-in">
                        <WifiOff className="h-3.5 w-3.5" />
                        Conduct Mode: Offline Recording & Claiming Active
                    </Badge>
                )}
            </div>

            <ScrollArea className="w-full">
                <TabsList className="bg-muted p-1 border shadow-sm w-full md:auto h-auto flex animate-tab-highlight rounded-md">
                    <TabsTrigger value="my-audits" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                        <CalendarCheck className="h-4 w-4"/> My Audits ({mySchedulesRaw.length})
                    </TabsTrigger>
                    <TabsTrigger value="available-audits" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                        <CalendarSearch className="h-4 w-4"/> Available Pool ({availableSchedulesRaw.length})
                    </TabsTrigger>
                    <TabsTrigger 
                        value="results" 
                        disabled={isActuallyOffline}
                        className={cn(
                            "gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8 data-[state=active]:bg-indigo-600 data-[state=active]:text-white",
                            isActuallyOffline && "opacity-30 grayscale cursor-not-allowed"
                        )}
                    >
                        <ClipboardCheck className="h-4 w-4" /> 
                        {isActuallyOffline ? <Lock className="h-3 w-3 mr-1" /> : null}
                        Audit Results Hub
                    </TabsTrigger>
                </TabsList>
            </ScrollArea>
        </div>

        <Card className="border-primary/10 shadow-md">
          <CardContent className="pt-6">
              {isLoading ? (
                  <div className="flex flex-col justify-center items-center h-48 gap-3 opacity-20">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-xs font-black uppercase tracking-widest">Synchronizing Registry...</p>
                  </div>
              ) : (
                  <>
                    <TabsContent value="my-audits" className="animate-in fade-in slide-in-from-left-2 duration-300 m-0 space-y-6">
                        <Card className="border-primary/10 bg-muted/10">
                            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                                        <Search className="h-2.5 w-2.5" /> Search My Itinerary
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by auditee or focus..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 h-10 shadow-sm bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                                        <Building className="h-2.5 w-2.5" /> Site Location
                                    </label>
                                    <Select value={campusFilter} onValueChange={setCampusFilter} disabled={!!siteLock && isActuallyOffline}>
                                        <SelectTrigger className="h-10 bg-white shadow-sm font-bold">
                                            <SelectValue placeholder="All Campuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Institutional View</SelectItem>
                                            {campuses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                        <AuditorScheduleList 
                            schedules={mySchedulesFiltered}
                            plans={plans || []}
                            campuses={campuses || []}
                            units={units || []}
                            isoClauses={isoClauses || []}
                            findings={findings || []}
                            isClaimView={false}
                            onUnclaimAudit={handleUnclaimAudit}
                        />
                    </TabsContent>

                    <TabsContent value="available-audits" className="animate-in fade-in slide-in-from-right-2 duration-300 m-0 space-y-6">
                         <Card className="border-primary/10 bg-muted/10">
                            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                                        <Search className="h-2.5 w-2.5" /> Search Pool
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search available units..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 h-10 shadow-sm bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                                        <Building className="h-2.5 w-2.5" /> Campus Selection
                                    </label>
                                    <Select value={campusFilter} onValueChange={setCampusFilter} disabled={!!siteLock && isActuallyOffline}>
                                        <SelectTrigger className="h-10 bg-white shadow-sm font-bold">
                                            <SelectValue placeholder="All Campuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Institutional View</SelectItem>
                                            {campuses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                        <AuditorScheduleList 
                            schedules={availableSchedulesFiltered}
                            plans={plans || []}
                            campuses={campuses || []}
                            units={units || []}
                            isoClauses={isoClauses || []}
                            findings={findings || []}
                            isClaimView={true}
                            onClaimAudit={handleClaimAudit}
                        />
                    </TabsContent>

                    <TabsContent value="results" className="animate-in fade-in slide-in-from-bottom-2 duration-300 m-0">
                         <AuditResultsView 
                            selectedYear={new Date().getFullYear()} 
                            plans={plans || []}
                            schedules={allSchedules || []}
                            findings={findings || []}
                            units={units || []}
                            campuses={campuses || []}
                            cars={cars || []}
                            isLoading={isLoading}
                         />
                    </TabsContent>
                  </>
              )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
