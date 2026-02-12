'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import type { UnitMonitoringRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Calendar, School, ShieldAlert, DoorOpen, History, LayoutDashboard, User, ClipboardCheck, Building, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { MonitoringFormDialog } from '@/components/monitoring/monitoring-form-dialog';
import { MonitoringAnalytics } from '@/components/monitoring/monitoring-analytics';
import { MonitoringFindings } from '@/components/monitoring/monitoring-findings';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function MonitoringPage() {
  const { isAdmin, isUserLoading, user, userProfile, isSupervisor, userRole } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UnitMonitoringRecord | null>(null);

  const canViewMonitoring = !!userProfile;

  const monitoringRecordsQuery = useMemoFirebase(
    () => {
        if (!firestore || !user || !userProfile || !canViewMonitoring) return null;
        
        if (isAdmin) {
            return query(
                collection(firestore, 'unitMonitoringRecords'), 
                orderBy('visitDate', 'desc')
            );
        }
        
        if (isSupervisor) {
             if (userProfile.campusId) {
                 return query(
                    collection(firestore, 'unitMonitoringRecords'), 
                    where('campusId', '==', userProfile.campusId), 
                    orderBy('visitDate', 'desc')
                );
             }
             return null;
        }

        // Unit User: Only their own unit
        if (userProfile.unitId) {
            return query(
                collection(firestore, 'unitMonitoringRecords'), 
                where('unitId', '==', userProfile.unitId), 
                orderBy('visitDate', 'desc')
            );
        }

        return null;
    },
    [firestore, user, userProfile, isAdmin, isSupervisor, canViewMonitoring]
  );
  
  const { data: records, isLoading: isLoadingRecords } = useCollection<UnitMonitoringRecord>(monitoringRecordsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const campusMap = useMemo(() => new Map(campuses?.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units?.map(u => [u.id, u.name])), [units]);

  const handleNewVisit = () => {
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  const handleViewRecord = (record: UnitMonitoringRecord) => {
    setSelectedRecord(record);
    setIsFormOpen(true);
  };

  const calculateCompliance = (record: UnitMonitoringRecord) => {
    if (!record.observations || record.observations.length === 0) return 0;
    const applicable = record.observations.filter(o => o.status !== 'Not Applicable');
    if (applicable.length === 0) return 0;
    const available = applicable.filter(o => o.status === 'Available').length;
    return Math.round((available / applicable.length) * 100);
  };

  const getComplianceVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 50) return 'secondary';
    return 'destructive';
  };

  const safeFormatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return format(d, 'PPP');
  };

  const isLoading = isUserLoading || isLoadingRecords || isLoadingCampuses || isLoadingUnits;

  if (!isUserLoading && !canViewMonitoring) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <ShieldAlert className="h-16 w-16 text-destructive opacity-50" />
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to access the field monitoring module.</p>
        </div>
        <Button onClick={() => router.push('/dashboard')}>Return to Home</Button>
      </div>
    );
  }

  const isUnitOnlyView = !isAdmin && !isSupervisor && userRole !== 'Auditor';

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
                {isUnitOnlyView ? 'Unit Monitoring Status' : 'Unit Monitoring'}
            </h2>
            <p className="text-muted-foreground">
                {isUnitOnlyView ? 'View results from on-site QA monitoring visits.' : 'Record and review on-site monitoring visit findings.'}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={handleNewVisit}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Visit Record
            </Button>
          )}
        </div>

        {!isLoading && records?.length === 0 && isUnitOnlyView ? (
            <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center">
                <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mb-4">
                    <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl">Not Yet Monitored</CardTitle>
                <CardDescription className="max-w-md mx-auto mt-2">
                    Your unit has not yet been monitored by the Quality Assurance Office. 
                    Monitoring findings and compliance scores will appear here after your first scheduled on-site visit.
                </CardDescription>
                <Button variant="outline" className="mt-6" asChild>
                    <a href="/help/manual" target="_blank">Learn about QA Monitoring</a>
                </Button>
            </Card>
        ) : (
            <Tabs defaultValue="history" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="history">
                        <History className="mr-2 h-4 w-4" />
                        Monitoring History
                    </TabsTrigger>
                    <TabsTrigger value="performance">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {isUnitOnlyView ? 'Our Performance' : 'Overall Performance'}
                    </TabsTrigger>
                    <TabsTrigger value="findings">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Non-Compliance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Visit Log</CardTitle>
                            <CardDescription>
                                {isAdmin ? 'A record of all past unit monitoring visits across all sites.' : 'Findings from on-site monitoring visits for your scope.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                            ) : (
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Date of Visit</TableHead>
                                    {!isUnitOnlyView && <TableHead>Campus</TableHead>}
                                    {!isUnitOnlyView && <TableHead>Unit</TableHead>}
                                    <TableHead>Room</TableHead>
                                    <TableHead>Officer in Charge</TableHead>
                                    <TableHead>Monitor</TableHead>
                                    <TableHead>Compliance %</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {records && records.length > 0 ? (
                                    records.map(record => {
                                      const score = calculateCompliance(record);
                                      return (
                                        <TableRow key={record.id} className="cursor-pointer" onClick={() => handleViewRecord(record)}>
                                            <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                {safeFormatDate(record.visitDate)}
                                            </div>
                                            </TableCell>
                                            {!isUnitOnlyView && (
                                                <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <School className="h-4 w-4 text-muted-foreground" />
                                                    {campusMap.get(record.campusId) || '...'}
                                                </div>
                                                </TableCell>
                                            )}
                                            {!isUnitOnlyView && (
                                                <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Building className="h-4 w-4 text-muted-foreground" />
                                                    {unitMap.get(record.unitId) || '...'}
                                                </div>
                                                </TableCell>
                                            )}
                                            <TableCell>
                                            <div className="flex items-center gap-2 text-xs">
                                                <DoorOpen className="h-3 w-3 text-muted-foreground" />
                                                {record.roomNumber || 'N/A'}
                                            </div>
                                            </TableCell>
                                            <TableCell>
                                            <div className="flex items-center gap-2 text-xs">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                                {record.officerInCharge || 'N/A'}
                                            </div>
                                            </TableCell>
                                            <TableCell className="text-xs">{record.monitorName}</TableCell>
                                            <TableCell>
                                              <Badge 
                                                variant={getComplianceVariant(score)}
                                                className={cn(
                                                  score >= 80 && "bg-green-500 hover:bg-green-600 text-white",
                                                  (score < 80 && score >= 50) && "bg-amber-500 hover:bg-amber-600 text-white"
                                                )}
                                              >
                                                {score}%
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewRecord(record); }}>
                                                {isAdmin ? 'Edit' : 'View'}
                                            </Button>
                                            </TableCell>
                                        </TableRow>
                                      );
                                    })
                                ) : (
                                    <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No monitoring records found.
                                    </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="performance">
                    <MonitoringAnalytics 
                        records={records || []} 
                        campuses={campuses || []} 
                        units={units || []} 
                        isLoading={isLoading} 
                    />
                </TabsContent>

                <TabsContent value="findings">
                    <MonitoringFindings 
                        records={records || []} 
                        campuses={campuses || []} 
                        units={units || []} 
                        isLoading={isLoading} 
                    />
                </TabsContent>
            </Tabs>
        )}
      </div>

      <MonitoringFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        record={selectedRecord}
        campuses={campuses || []}
        units={units || []}
      />
    </>
  );
}
