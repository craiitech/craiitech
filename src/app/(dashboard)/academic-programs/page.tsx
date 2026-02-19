'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { AcademicProgram, Campus, ProgramComplianceRecord, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, GraduationCap, Filter, BarChart3, Layers, ShieldCheck, Search, Building } from 'lucide-react';
import { ProgramRegistry } from '@/components/programs/program-registry';
import { ProgramDialog } from '@/components/programs/program-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgramAnalytics } from '@/components/programs/program-analytics';

export default function AcademicProgramsPage() {
  const { user, userProfile, isAdmin, userRole, isUserLoading, isVp } = useUser();
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<AcademicProgram | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Role Detection for Scoping
  const isGlobalViewer = isAdmin || isVp;
  const isCampusViewer = userRole === 'Campus Director' || userRole === 'Campus ODIMO';
  const isUnitViewer = userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO';

  const canManage = isAdmin || userRole === 'Campus Director' || userRole === 'Campus ODIMO';

  /**
   * SCOPED PROGRAM QUERY
   * Restricts data fetch based on the user's role to ensure privacy and focus.
   */
  const programsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !userProfile) return null;
    const baseRef = collection(firestore, 'academicPrograms');
    
    if (isGlobalViewer) return query(baseRef);
    if (isCampusViewer && userProfile.campusId) {
        return query(baseRef, where('campusId', '==', userProfile.campusId));
    }
    if (isUnitViewer && userProfile.unitId) {
        return query(baseRef, where('collegeId', '==', userProfile.unitId));
    }
    return null;
  }, [firestore, isUserLoading, userProfile, isGlobalViewer, isCampusViewer, isUnitViewer]);

  const { data: rawPrograms, isLoading: isLoadingPrograms } = useCollection<AcademicProgram>(programsQuery);

  /**
   * SCOPED COMPLIANCE QUERY
   */
  const compliancesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !userProfile) return null;
    const baseRef = collection(firestore, 'programCompliances');
    const baseQuery = query(baseRef, where('academicYear', '==', selectedYear));

    if (isGlobalViewer) return baseQuery;
    if (isCampusViewer && userProfile.campusId) {
        return query(baseRef, where('academicYear', '==', selectedYear), where('campusId', '==', userProfile.campusId));
    }
    if (isUnitViewer && userProfile.unitId) {
        return query(baseRef, where('academicYear', '==', selectedYear), where('campusId', '==', userProfile.campusId));
    }
    return null;
  }, [firestore, isUserLoading, userProfile, selectedYear, isGlobalViewer, isCampusViewer, isUnitViewer]);

  const { data: rawCompliances, isLoading: isLoadingCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  // In-Memory Sorting and Search Filtering
  const programs = useMemo(() => {
    if (!rawPrograms) return [];
    return [...rawPrograms].sort((a, b) => a.name.localeCompare(b.name));
  }, [rawPrograms]);

  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCampus = campusFilter === 'all' || p.campusId === campusFilter;
      const matchesUnit = unitFilter === 'all' || p.collegeId === unitFilter;
      return matchesSearch && matchesCampus && matchesUnit;
    });
  }, [programs, searchTerm, campusFilter, unitFilter]);

  const campusesQuery = useMemoFirebase(
    () => (firestore && !isUserLoading && userProfile ? collection(firestore, 'campuses') : null),
    [firestore, isUserLoading, userProfile]
  );
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(
    () => (firestore && !isUserLoading && userProfile ? collection(firestore, 'units') : null),
    [firestore, isUserLoading, userProfile]
  );
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const filteredUnitsList = useMemo(() => {
    if (!units) return [];
    if (campusFilter === 'all') return units.filter(u => u.category === 'Academic');
    return units.filter(u => u.category === 'Academic' && u.campusIds?.includes(campusFilter));
  }, [units, campusFilter]);

  const handleNewProgram = () => {
    setEditingProgram(null);
    setIsDialogOpen(true);
  };

  const handleEditProgram = (program: AcademicProgram) => {
    setEditingProgram(program);
    setIsDialogOpen(true);
  };

  const isLoading = isUserLoading || isLoadingPrograms || isLoadingCampuses || isLoadingCompliances || isLoadingUnits;
  const academicYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            Program Monitoring
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-3 w-3" />
            Decision Support System
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[140px] h-10">
                    <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                    {academicYears.map(y => <SelectItem key={y} value={String(y)}>AY {y}</SelectItem>)}
                </SelectContent>
            </Select>
            {canManage && (
            <Button onClick={handleNewProgram}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Register Program
            </Button>
            )}
        </div>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList>
            <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="h-4 w-4" /> Decision Support</TabsTrigger>
            <TabsTrigger value="registry" className="gap-2"><Layers className="h-4 w-4" /> Program Registry</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
            <ProgramAnalytics 
                programs={programs}
                compliances={rawCompliances || []}
                campuses={campuses || []}
                isLoading={isLoading}
                selectedYear={selectedYear}
            />
        </TabsContent>

        <TabsContent value="registry" className="space-y-4">
            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1 w-full space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Search Registry</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or initials..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    {isGlobalViewer && (
                        <div className="w-full md:w-64 space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Campus Site Filter</label>
                            <Select value={campusFilter} onValueChange={(val) => { setCampusFilter(val); setUnitFilter('all'); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Campuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Campuses</SelectItem>
                                    {campuses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {(isGlobalViewer || isCampusViewer) && (
                        <div className="w-full md:w-64 space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Academic Unit Filter</label>
                            <Select value={unitFilter} onValueChange={setUnitFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Units" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Units</SelectItem>
                                    {filteredUnitsList.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div>
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <ProgramRegistry 
                        programs={filteredPrograms} 
                        campuses={campuses || []}
                        units={units || []}
                        onEdit={handleEditProgram}
                        canManage={canManage}
                    />
                )}
            </div>
        </TabsContent>
      </Tabs>

      <ProgramDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        program={editingProgram}
        campuses={campuses || []}
      />
    </div>
  );
}
