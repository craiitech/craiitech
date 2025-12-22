
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Campus, Unit, Submission, User as AppUser } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, School, Users, FileCheck2, Printer } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  const { userProfile, isAdmin, isUserLoading, isSupervisor } = useUser();
  const firestore = useFirestore();

  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);

  const canViewReports = isAdmin || isSupervisor;

  useEffect(() => {
    if (!isAdmin && userProfile?.campusId) {
      setSelectedCampusId(userProfile.campusId);
    }
  }, [isAdmin, userProfile]);

  const campusesQuery = useMemoFirebase(
    () => {
        if (!firestore || !canViewReports) return null;
        if (isAdmin) {
            return collection(firestore, 'campuses');
        }
        if (userProfile?.campusId) {
            return query(collection(firestore, 'campuses'), where('id', '==', userProfile.campusId));
        }
        return null;
    },
    [firestore, canViewReports, isAdmin, userProfile]
  );
  const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(
    () => (firestore && canViewReports ? collection(firestore, 'units') : null),
    [firestore, canViewReports]
  );
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const submissionsQuery = useMemoFirebase(
    () => {
        if (!firestore || !canViewReports) return null;
        if (isAdmin) {
            return collection(firestore, 'submissions');
        }
        if (userProfile?.campusId) {
            return query(collection(firestore, 'submissions'), where('campusId', '==', userProfile.campusId));
        }
        return null;
    },
    [firestore, canViewReports, isAdmin, userProfile]
  );
  const { data: allSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const usersQuery = useMemoFirebase(
    () => {
        if (!firestore || !canViewReports) return null;
        if (isAdmin) {
            return collection(firestore, 'users');
        }
        if (userProfile?.campusId) {
            return query(collection(firestore, 'users'), where('campusId', '==', userProfile.campusId));
        }
        return null;
    },
    [firestore, canViewReports, isAdmin, userProfile]
  );
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);

  const unitsInSelectedCampus = useMemo(() => {
    if (!selectedCampusId || !allUnits) return [];
    return allUnits.filter(unit => unit.campusIds?.includes(selectedCampusId));
  }, [selectedCampusId, allUnits]);

  const submittedUnits = useMemo(() => {
    if (!allSubmissions || !allUnits) return [];
    const submittedUnitIds = new Set(allSubmissions.map(s => s.unitId));
    return allUnits.filter(unit => submittedUnitIds.has(unit.id));
  }, [allSubmissions, allUnits]);

  const campusMap = useMemo(() => {
    if (!allCampuses) return new Map();
    return new Map(allCampuses.map(c => [c.id, c.name]));
  }, [allCampuses]);

  const isLoading = isUserLoading || isLoadingCampuses || isLoadingUnits || isLoadingSubmissions || isLoadingUsers;

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!canViewReports) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 print:space-y-8">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">Generate and view system-wide reports.</p>
        </div>
        <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
        </Button>
      </div>
      
      <div className="hidden print:block text-center mb-8">
          <h1 className="text-3xl font-bold">RSU EOMS - System Report</h1>
          <p className="text-muted-foreground">Generated on: {new Date().toLocaleDateString()}</p>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-1">
        {/* Campus and Units Report */}
        <Card className="lg:col-span-1 print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Campuses and Units
            </CardTitle>
            <CardDescription>Select a campus to view its assigned units.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select onValueChange={setSelectedCampusId} value={selectedCampusId || ''} disabled={!isAdmin}>
              <SelectTrigger className="print:hidden">
                <SelectValue placeholder="Select a campus..." />
              </SelectTrigger>
              <SelectContent>
                {allCampuses?.map(campus => (
                  <SelectItem key={campus.id} value={campus.id}>
                    {campus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ScrollArea className="h-72 rounded-md border print:h-auto print:border-none">
              <div className="hidden print:block mb-2">
                  <p className="font-semibold">Viewing Units for: {selectedCampusId ? campusMap.get(selectedCampusId) : 'All Campuses'}</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Units in {campusMap.get(selectedCampusId!) || 'Selected Campus'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCampusId && unitsInSelectedCampus.length > 0 ? (
                    unitsInSelectedCampus.map(unit => (
                      <TableRow key={unit.id}>
                        <TableCell>{unit.name}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-center text-muted-foreground">
                        {selectedCampusId ? 'No units found for this campus.' : 'Please select a campus.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Submitted Units and All Users Reports */}
        <div className="lg:col-span-2 space-y-6 print:col-span-1">
          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5" />
                Units With Submissions
              </CardTitle>
              <CardDescription>A list of all units that have made at least one submission.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48 rounded-md border print:h-auto print:border-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit Name</TableHead>
                      <TableHead>Campuses</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submittedUnits.length > 0 ? (
                      submittedUnits.map(unit => (
                        <TableRow key={unit.id}>
                          <TableCell>{unit.name}</TableCell>
                          <TableCell>{unit.campusIds?.map(id => campusMap.get(id)).join(', ') || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No units have submitted reports yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Registered Users
              </CardTitle>
              <CardDescription>A complete list of all users in the system.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 rounded-md border print:h-auto print:border-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Campus / Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers?.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>
                                {user.firstName?.charAt(0)}
                                {user.lastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.firstName} {user.lastName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                            <div className="text-sm">{campusMap.get(user.campusId) || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{allUnits?.find(u => u.id === user.unitId)?.name || ''}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
