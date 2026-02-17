
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { AcademicProgram, Campus, ProgramComplianceRecord, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, GraduationCap, Filter, BarChart3, Layers, ShieldCheck } from 'lucide-react';
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
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Role Detection for Scoping
  const isGlobalViewer = isAdmin || isVp;
  const isCampusViewer = userRole === 'Campus Director' || userRole === 'Campus ODIMO';
  const isUnitViewer = userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO';

  const canManage = isAdmin || userRole === 'Campus Director' || userRole === 'Campus ODIMO';

  /**
   * SCOPED PROGRAM QUERY
   * Restricts data fetch based on the user's role to ensure privacy and focus.
   * Removed orderBy to avoid Firestore Composite Index requirements.
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
   * Syncs the compliance records with the user's authorized scope.
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
        // Compliance records don't have collegeId directly, but we can filter programs first or rely on programId
        // For simplicity and security alignment, we fetch by campus if unit-level, then filter in-memory.
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
      return matchesSearch && matchesCampus;
    });
  }, [programs, searchTerm, campusFilter]);

  // Contextual Header Subtitle
  const scopeDescription = useMemo(() => {
    if (isGlobalViewer) return "University-wide Monitoring Registry";
    if (isCampusViewer) return `Monitoring Programs for your assigned Campus`;
    if (isUnitViewer) return `Monitoring Programs for your Academic Unit`;
    return "Academic Program Monitoring";
  }, [isGlobalViewer, isCampusViewer, isUnitViewer]);

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
            {scopeDescription}
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

        <TabsContent value="registry">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="md:col-span-1 h-fit">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <Filter className="h-3 w-3" /> Filter Scoped View
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Search Registry</label>
                            <Input
                                placeholder="e.g. BSIT"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {isGlobalViewer && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Campus Site</label>
                                <Select value={campusFilter} onValueChange={setCampusFilter}>
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
                    </CardContent>
                </Card>

                <div className="md:col-span-3">
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
