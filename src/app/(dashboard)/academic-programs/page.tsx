
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import type { AcademicProgram, Campus, ProgramComplianceRecord, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    PlusCircle, 
    Loader2, 
    GraduationCap, 
    BarChart3, 
    Layers, 
    ShieldCheck, 
    Search, 
    Building, 
    Trash2,
    Database
} from 'lucide-react';
import { ProgramRegistry } from '@/components/programs/program-registry';
import { ProgramDialog } from '@/components/programs/program-dialog';
import { BatchDataHub } from '@/components/programs/batch-data-hub';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgramAnalytics } from '@/components/programs/program-analytics';
import { MaturityStrengths } from '@/components/programs/maturity-strengths';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const currentYear = new Date().getFullYear();

export default function AcademicProgramsPage() {
  const { userProfile, isAdmin, userRole, isUserLoading, isVp, isAuditor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<AcademicProgram | null>(null);
  const [deletingProgram, setDeletingProgram] = useState<AcademicProgram | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Institutional Oversight roles see everything.
  const isGlobalViewer = isAdmin || isVp || isAuditor;
  const isCampusViewer = userRole === 'Campus Director' || userRole === 'Campus ODIMO';
  const isUnitViewer = userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO';

  const canManage = isAdmin || userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('coordinator');

  // Role-based initial filter setup & strict locking
  useEffect(() => {
    if (userProfile && !isUserLoading) {
        if (isGlobalViewer) {
            // Global roles can see everything
        } else if (isCampusViewer) {
            setCampusFilter(userProfile.campusId);
        } else if (isUnitViewer) {
            setCampusFilter(userProfile.campusId);
            setUnitFilter(userProfile.unitId);
        }
    }
  }, [userProfile, isGlobalViewer, isCampusViewer, isUnitViewer, isUserLoading]);

  /**
   * SCOPED PROGRAM QUERY
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
    
    return query(baseRef, where('campusId', '==', userProfile.campusId));
  }, [firestore, isUserLoading, userProfile, isGlobalViewer, isCampusViewer, isUnitViewer]);

  const { data: rawPrograms, isLoading: isLoadingPrograms } = useCollection<AcademicProgram>(programsQuery);

  /**
   * SCOPED COMPLIANCE QUERY
   * Fetches data for the selected academic year.
   */
  const compliancesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !userProfile) return null;
    const baseRef = collection(firestore, 'programCompliances');
    return query(baseRef, where('academicYear', '==', selectedYear));
  }, [firestore, isUserLoading, userProfile, selectedYear]);

  const { data: rawCompliances, isLoading: isLoadingCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  const programs = useMemo(() => {
    if (!rawPrograms) return [];
    return [...rawPrograms].sort((a, b) => a.name.localeCompare(b.name));
  }, [rawPrograms]);

  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      if (!isGlobalViewer && p.campusId !== userProfile?.campusId) return false;
      if (isUnitViewer && p.collegeId !== userProfile?.unitId) return false;

      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCampus = campusFilter === 'all' || p.campusId === campusFilter;
      const matchesUnit = unitFilter === 'all' || p.collegeId === unitFilter;
      return matchesSearch && matchesCampus && matchesUnit;
    });
  }, [programs, searchTerm, campusFilter, unitFilter, isGlobalViewer, isUnitViewer, userProfile]);

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

  const handleDeleteProgram = async () => {
    if (!firestore || !deletingProgram) return;
    setIsDeleting(true);
    try {
        await deleteDoc(doc(firestore, 'academicPrograms', deletingProgram.id));
        toast({ title: 'Program Deleted', description: 'The academic program has been removed from the registry.' });
        setDeletingProgram(null);
    } catch (e) {
        toast({ title: 'Error', description: 'Could not delete program.', variant: 'destructive' });
    } finally {
        setIsDeleting(false);
    }
  };

  const isLoading = isUserLoading || isLoadingPrograms || isLoadingCampuses || isLoadingUnits || isLoadingCompliances;
  const academicYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            CHED Programs Monitoring
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-3 w-3" />
            Decision Support System
          </p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1.5">Compliance Year</label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {academicYears.map(y => <SelectItem key={y} value={String(y)}>AY {y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {isAdmin && (
            <div className="pt-4">
                <Button onClick={handleNewProgram} size="sm" className="h-9 font-bold uppercase tracking-tight">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Register Program
                </Button>
            </div>
            )}
        </div>
      </div>

      <Card className="shadow-md border-primary/10">
          <CardContent className="p-4 flex flex-col md:flex-row items-end gap-4 bg-muted/10">
              <div className="flex-1 w-full space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                      <Search className="h-2.5 w-2.5" /> Search Registry
                  </label>
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Search by name or initials..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9 h-9 text-xs bg-white"
                      />
                  </div>
              </div>
              
              <div className="w-full md:w-64 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                      <Building className="h-2.5 w-2.5" /> Campus Site
                  </label>
                  <Select 
                      value={campusFilter} 
                      onValueChange={(val) => { setCampusFilter(val); setUnitFilter('all'); }}
                      disabled={!isGlobalViewer}
                  >
                      <SelectTrigger className="h-9 text-xs bg-white">
                          <SelectValue placeholder="All Campuses" />
                      </SelectTrigger>
                      <SelectContent>
                          {isGlobalViewer && <SelectItem value="all">All Campuses</SelectItem>}
                          {campuses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>

              <div className="w-full md:w-64 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                      <Layers className="h-2.5 w-2.5" /> Academic Unit
                  </label>
                  <Select 
                      value={unitFilter} 
                      onValueChange={setUnitFilter}
                      disabled={!isGlobalViewer && !isCampusViewer}
                  >
                      <SelectTrigger className="h-9 text-xs bg-white">
                          <SelectValue placeholder="All Units" />
                      </SelectTrigger>
                      <SelectContent>
                          {(isGlobalViewer || isCampusViewer) && <SelectItem value="all">All Units</SelectItem>}
                          {filteredUnitsList.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
          </CardContent>
      </Card>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="bg-muted p-1 border shadow-sm animate-tab-highlight rounded-md h-10 w-fit">
            <TabsTrigger value="analytics" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                <BarChart3 className="h-4 w-4" /> Decision Support
            </TabsTrigger>
            <TabsTrigger value="batch-hub" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                <Database className="h-4 w-4 text-indigo-600" /> Batch Data Hub
            </TabsTrigger>
            <TabsTrigger value="registry" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                <Layers className="h-4 w-4" /> Program Registry
            </TabsTrigger>
            <TabsTrigger value="strengths" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Quality Profile
            </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="animate-in fade-in duration-500">
            <ProgramAnalytics 
                programs={filteredPrograms}
                compliances={rawCompliances || []}
                campuses={campuses || []}
                units={units || []}
                isLoading={isLoading}
                selectedYear={selectedYear}
            />
        </TabsContent>

        <TabsContent value="batch-hub" className="animate-in fade-in duration-500">
            <BatchDataHub 
                programs={filteredPrograms}
                compliances={rawCompliances || []}
                campuses={campuses || []}
                units={units || []}
                selectedYear={selectedYear}
                isLoading={isLoading}
                canEdit={canManage}
            />
        </TabsContent>

        <TabsContent value="strengths" className="animate-in fade-in duration-500">
            <MaturityStrengths 
                programs={filteredPrograms}
                compliances={rawCompliances || []}
                campuses={campuses || []}
                units={units || []}
                isLoading={isLoading}
                selectedYear={selectedYear}
            />
        </TabsContent>

        <TabsContent value="registry" className="space-y-6 animate-in fade-in duration-500">
            <ProgramRegistry 
                programs={filteredPrograms} 
                compliances={rawCompliances || []}
                campuses={campuses || []} 
                units={units || []} 
                onEdit={handleEditProgram}
                onDelete={setDeletingProgram}
                canManage={canManage}
            />
        </TabsContent>
      </Tabs>

      <ProgramDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        program={editingProgram}
        campuses={campuses || []}
        existingPrograms={rawPrograms || []}
      />

      <AlertDialog open={!!deletingProgram} onOpenChange={(open) => !open && setDeletingProgram(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Remove Program from Registry?</AlertDialogTitle>
                <AlertDialogDescription>
                    You are about to delete <strong>{deletingProgram?.name}</strong>. This action is irreversible.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProgram} className="bg-destructive text-white" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Delete Program
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
