'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Campus, Unit, Submission, User as AppUser, Cycle } from '@/lib/types';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ReactDOMServer from 'react-dom/server';
import { AdminReport } from '@/components/reports/admin-report';
import { SubmissionMatrixReport } from '@/components/reports/submission-matrix-report';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';

const cycles = ['first', 'final'] as const;

export default function ReportsPage() {
  const { userProfile, isAdmin, isUserLoading, isSupervisor } = useUser();
  const firestore = useFirestore();

  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [selectedMatrixYear, setSelectedMatrixYear] = useState<number>(new Date().getFullYear());


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
    () => {
        if (!firestore || !canViewReports) return null;
        if (isAdmin) {
            return collection(firestore, 'units');
        }
        if (isSupervisor && userProfile?.campusId) {
            return query(collection(firestore, 'units'), where('campusIds', 'array-contains', userProfile.campusId));
        }
        return null;
    },
    [firestore, canViewReports, isAdmin, isSupervisor, userProfile]
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
        if (!firestore || !canViewReports || !userProfile) return null;
        if (isAdmin) {
            return collection(firestore, 'users');
        }
        if (isSupervisor) {
            if (!userProfile.campusId) return null;
            return query(collection(firestore, 'users'), where('campusId', '==', userProfile.campusId));
        }
        return null;
    },
    [firestore, canViewReports, isAdmin, isSupervisor, userProfile]
  );
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);
  
  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: allCycles, isLoading: isLoadingCycles } = useCollection<Cycle>(cyclesQuery);


  const unitsInSelectedCampus = useMemo(() => {
    if (!selectedCampusId || !allUnits) return [];
    return allUnits.filter(unit => unit.campusIds?.includes(selectedCampusId));
  }, [selectedCampusId, allUnits]);

  const submittedUnitsByCampus = useMemo(() => {
    if (!allSubmissions || !allUnits || !allCampuses) return [];

    const campusMap = new Map(allCampuses.map(c => [c.id, c.name]));
    
    // Create a map where each entry is a campus ID, and the value is a Set of unit names that have submitted under that campus
    const grouped = allSubmissions.reduce((acc, submission) => {
        const campusId = submission.campusId;
        const unitId = submission.unitId;

        if (campusId && unitId) {
            if (!acc[campusId]) {
                acc[campusId] = new Set<string>();
            }
            acc[campusId].add(unitId);
        }
        return acc;
    }, {} as Record<string, Set<string>>);

    const unitMap = new Map(allUnits.map(u => [u.id, u.name]));
    
    // Convert to a sorted array structure for rendering
    return Object.entries(grouped)
        .map(([campusId, unitIdSet]) => {
            const campusName = campusMap.get(campusId);
            if (!campusName) return null;
            
            const units = Array.from(unitIdSet)
              .map(id => unitMap.get(id))
              .filter(Boolean) as string[];

            return {
                campusName,
                units: units.sort(),
            }
        })
        .filter(Boolean)
        .sort((a, b) => a!.campusName.localeCompare(b!.campusName));

  }, [allSubmissions, allUnits, allCampuses]);

  const campusMap = useMemo(() => {
    if (!allCampuses) return new Map();
    return new Map(allCampuses.map(c => [c.id, c.name]));
  }, [allCampuses]);

  // Moved from submission-matrix-report
  const matrixData = useMemo(() => {
    if (!allSubmissions || !allCampuses || !allUnits) {
      return [];
    }

    const submissionsForYear = allSubmissions.filter(s => s.year === selectedMatrixYear);

    const submissionLookup = new Set(
      submissionsForYear.map(s =>
        `${s.campusId}-${s.unitId}-${s.reportType}-${s.cycleId}`
      )
    );
    
    return allCampuses.map(campus => {
      const campusUnits = allUnits.filter(unit => unit.campusIds?.includes(campus.id));
      
      if (campusUnits.length === 0) {
        return null;
      }
      
      const unitStatuses = campusUnits.map(unit => {
        const statuses: Record<string, boolean> = {};
        
        submissionTypes.forEach(reportType => {
          cycles.forEach(cycleId => {
            const submissionKey = `${campus.id}-${unit.id}-${reportType}-${cycleId}`;
            statuses[submissionKey] = submissionLookup.has(submissionKey);
          });
        });
  
        return {
          unitId: unit.id,
          unitName: unit.name,
          statuses,
        };
      }).sort((a,b) => a.unitName.localeCompare(b.unitName));

      return {
        campusId: campus.id,
        campusName: campus.name,
        units: unitStatuses,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => a.campusName.localeCompare(b.campusName));

  }, [allSubmissions, allCampuses, allUnits, selectedMatrixYear]);

  const isLoading = isUserLoading || isLoadingCampuses || isLoadingUnits || isLoadingSubmissions || isLoadingUsers || isLoadingCycles;

  const handlePrint = () => {
    if (!isAdmin || !allSubmissions || !allCampuses || !allUnits) return;
    
    const reportProps = {
      submissions: allSubmissions,
      campuses: allCampuses,
      units: allUnits
    };

    const reportHtml = ReactDOMServer.renderToStaticMarkup(<AdminReport {...reportProps} />);
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Admin Submission Report</title>
            <style>
              body { font-family: sans-serif; margin: 2rem; }
              table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; font-size: 10px; }
              th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
              th { background-color: #f2f2f2; }
              h1, h2, h3 { margin: 0; }
              .header { text-align: center; margin-bottom: 2rem; }
              .footer { margin-top: 2rem; font-style: italic; color: #555; font-size: 10px; }
              .report-title { margin-top: 1rem; text-align: center; font-weight: bold; text-transform: uppercase; }
            </style>
          </head>
          <body>
            ${reportHtml}
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); }
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
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
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">Generate and view system-wide reports.</p>
        </div>
        {isAdmin && (
          <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print Report
          </Button>
        )}
      </div>
      
      <div className="printable-area space-y-8">
        <div className="hidden print:block text-center mb-8">
            <h1 className="text-3xl font-bold">RSU EOMS - System Report</h1>
            <p className="text-muted-foreground">Generated on: ${new Date().toLocaleDateString()}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-1 print:space-y-8">
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
                <CardDescription>A list of all units that have made at least one submission, grouped by campus.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48 rounded-md border print:h-auto print:border-none">
                  {submittedUnitsByCampus.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                      {submittedUnitsByCampus.map(campus => (
                        <AccordionItem value={campus!.campusName} key={campus!.campusName}>
                          <AccordionTrigger>{campus!.campusName}</AccordionTrigger>
                          <AccordionContent>
                            <ul className="list-disc pl-5 text-sm text-muted-foreground">
                              {campus!.units.map(unitName => (
                                <li key={unitName}>{unitName}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No units have submitted reports yet.
                    </div>
                  )}
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

        {(isAdmin || isSupervisor) && (
            <SubmissionMatrixReport 
                matrixData={matrixData}
                allCycles={allCycles}
                selectedYear={selectedMatrixYear}
                onYearChange={setSelectedMatrixYear}
            />
        )}

      </div>
    </div>
  );
}
