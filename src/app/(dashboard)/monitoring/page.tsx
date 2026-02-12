'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import type { UnitMonitoringRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Calendar, Building, School, ShieldAlert, DoorOpen } from 'lucide-react';
import { format } from 'date-fns';
import { MonitoringFormDialog } from '@/components/monitoring/monitoring-form-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';

export default function MonitoringPage() {
  const { isAdmin, isUserLoading, user, userProfile, isSupervisor, userRole } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UnitMonitoringRecord | null>(null);

  const canViewMonitoring = isAdmin || isSupervisor || userRole === 'Auditor';

  const monitoringRecordsQuery = useMemoFirebase(
    () => {
        if (!firestore || !user || !userProfile || !canViewMonitoring) return null;
        const colRef = collection(firestore, 'unitMonitoringRecords');
        
        if (isAdmin) {
            return query(colRef, orderBy('visitDate', 'desc'));
        }
        
        if (isSupervisor) {
             if (userProfile.campusId) {
                 return query(colRef, where('campusId', '==', userProfile.campusId), orderBy('visitDate', 'desc'));
             }
             return null;
        }

        return query(colRef, orderBy('visitDate', 'desc'));
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

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Unit Monitoring</h2>
            <p className="text-muted-foreground">Record and review on-site monitoring visit findings.</p>
          </div>
          {isAdmin && (
            <Button onClick={handleNewVisit}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Visit Record
            </Button>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Monitoring History</CardTitle>
            <CardDescription>
                {isAdmin ? 'A log of all past unit monitoring visits across all sites.' : 'Findings from on-site monitoring visits for your unit.'}
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
                    <TableHead>Campus</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Monitor</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records && records.length > 0 ? (
                    records.map(record => (
                      <TableRow key={record.id} className="cursor-pointer" onClick={() => handleViewRecord(record)}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {safeFormatDate(record.visitDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                             <School className="h-4 w-4 text-muted-foreground" />
                             {campusMap.get(record.campusId) || '...'}
                           </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                             <Building className="h-4 w-4 text-muted-foreground" />
                             {unitMap.get(record.unitId) || '...'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DoorOpen className="h-4 w-4 text-muted-foreground" />
                            {record.roomNumber || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>{record.monitorName}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewRecord(record); }}>
                            {isAdmin ? 'View / Edit' : 'View Details'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No monitoring records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
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