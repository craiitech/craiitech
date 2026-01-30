
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UnitMonitoringRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Calendar, Building, School } from 'lucide-react';
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
  const { isAdmin, isUserLoading, user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UnitMonitoringRecord | null>(null);

  const monitoringRecordsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'unitMonitoringRecords'), orderBy('visitDate', 'desc')) : null),
    [firestore, user]
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

  const isLoading = isUserLoading || isLoadingRecords || isLoadingCampuses || isLoadingUnits;

  if (!isUserLoading && !isAdmin) {
    return (
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
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
          <Button onClick={handleNewVisit}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Visit Record
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Monitoring History</CardTitle>
            <CardDescription>A log of all past unit monitoring visits.</CardDescription>
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
                            {format(record.visitDate.toDate(), 'PPP')}
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
                        <TableCell>{record.monitorName}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewRecord(record); }}>
                            View / Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
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
