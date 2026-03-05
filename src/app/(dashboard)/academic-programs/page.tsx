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
    Filter, 
    BarChart3, 
    Layers, 
    ShieldCheck, 
    Search, 
    Building, 
    Trash2,
    Award,
    CheckCircle2,
    Briefcase,
    ShieldAlert
} from 'lucide-react';
import { ProgramRegistry } from '@/components/programs/program-registry';
import { ProgramDialog } from '@/components/programs/program-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgramAnalytics } from '@/components/programs/program-analytics';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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
  const { user, userProfile, isAdmin, isAuditor, userRole, isUserLoading, isVp } = useUser();
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

  const canManage = isAdmin || userRole === 'Campus Director' || userRole === 'Campus ODIMO';

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
        const programIds = rawPrograms?.filter(p => p.collegeId === userProfile.unitId).map(p => p.id) || [];
        // If program list is loaded, scope compliance strictly to these unit programs
        if (programIds.length > 0) {
            return query(baseRef, where('academicYear', '==', selectedYear), where('programId', 'in', programIds.slice(0, 10)));
        }
        return query(baseRef, where('academicYear', '==', selectedYear), where('campusId', '==', userProfile.campusId));
    }
    return null;
  }, [firestore, isUserLoading, userProfile, selectedYear, isGlobalViewer, isCampusViewer, isUnitViewer, rawPrograms]);

  const { data: rawCompliances, isLoading: isLoadingCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  // In-Memory Sorting and Search Filtering
  const programs = useMemo(() => {
    if (!rawPrograms) return [];
    return [...rawPrograms].sort((a, b) => a.name.localeCompare(b.name));
  }, [rawPrograms]);

  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      // Strict Gate check
      if (!isGlobalViewer && p.campusId !== userProfile?.campusId) return false;
      if (isUnitViewer && p.collegeId !== userProfile?.unitId) return false;

      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCampus = campusFilter === 'all' || p.campusId === campusFilter;
      const matchesUnit = unitFilter === 'all' || p.collegeId === unitFilter;
      return matchesSearch && matchesCampus && matchesUnit;
    });
  }, [programs, searchTerm, campusFilter, unitFilter, isGlobalViewer, isUnitViewer, userProfile]);

  /**
   * CALCULATE REGISTRY SUMMARY STATS
   * Disaggregates stats for Active and Inactive programs.
   */
  const summaryStats = useMemo(() => {
    const total = filteredPrograms.length;
    if (total === 0) return { total: 0, activeCount: 0, inactiveCount: 0, accreditedRate: 0, copcRate: 0, boardCount: 0, activeAccredited: 0, inactiveAccredited: 0, activeCopc: 0, inactiveCopc: 0 };

    let activeCount = 0;
    let inactiveCount = 0;
    let activeAccredited = 0;
    let inactiveAccredited = 0;
    let activeCopc = 0;
    let inactiveCopc = 0;
    let boardCount = 0;

    filteredPrograms.forEach(p => {
        if (p.isActive) activeCount++;
        else inactiveCount++;

        if (p.isBoardProgram) boardCount++;
        
        const record = rawCompliances?.find(c => c.programId === p.id);
        const isAccredited = (rec: ProgramComplianceRecord | undefined) => {
            if (!rec || !rec.accreditationRecords || rec.accreditationRecords.length === 0) return false;
            const milestones = rec.accreditationRecords;
            const current = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
            return current && current.level !== 'Non Accredited' && !current.level.includes('PSV');
        };
        const hasCopc = (rec: ProgramComplianceRecord | undefined) => rec?.ched?.copcStatus === 'With COPC';

        if (p.isActive) {
            if (isAccredited(record)) activeAccredited++;
            if (hasCopc(record)) activeCopc++;
        } else {
            if (isAccredited(record)) inactiveAccredited++;
            if (hasCopc(record)) inactiveCopc++;
        }
    });

    return {
        total,
        activeCount,
        inactiveCount,
        accreditedRate: Math.round((activeAccredited / (activeCount || 1)) * 100),
        copcRate: Math.round((activeCopc / (activeCount || 1)) * 100),
        boardCount,
        activeAccredited,
        inactiveAccredited,
        activeCopc,
        inactiveCopc
    };
  }, [filteredPrograms, rawCompliances]);

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

  const isLoading = isUserLoading || isLoadingPrograms || isLoadingCampuses || isLoadingCompliances || isLoadingUnits;
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
            {canManage && (
            <div className="pt-4">
                <Button onClick={handleNewProgram} size="sm" className="h-9 font-bold uppercase tracking-tight">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Register Program
                </Button>
            </div>
            )}
        </div>
      </div>

      {/* Global Filter Bar */}
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
        <TabsList className="bg-muted p-1 border shadow-sm">
            <TabsTrigger value="analytics" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
                <BarChart3 className="h-4 w-4" /> Decision Support
            </TabsTrigger>
            <TabsTrigger value="registry" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
                <Layers className="h-4 w-4" /> Program Registry
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

        <TabsContent value="registry" className="space-y-6 animate-in fade-in duration-500">
            {/* Dynamic Summary Cards with Differentiation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Scope Portfolio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-primary tabular-nums">{summaryStats.activeCount} Active</div>
                        <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tight">Current Academic Offerings</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[8px] h-4 border-slate-200 text-slate-500 font-bold bg-white">
                                {summaryStats.inactiveCount} SUBJECT FOR CLOSURE
                            </Badge>
                        </div>
                    </CardContent>
                    <div className="absolute top-0 right-0 p-2 opacity-5"><Layers className="h-12 w-12" /></div>
                </Card>

                <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Accreditation Maturity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-600 tabular-nums">{summaryStats.accreditedRate}%</div>
                        <p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase tracking-tight">Active Level I or Higher</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[8px] h-4 border-emerald-200 text-emerald-600 font-bold bg-white uppercase">
                                {summaryStats.inactiveAccredited} Inactive Accredited
                            </Badge>
                        </div>
                    </CardContent>
                    <div className="absolute top-0 right-0 p-2 opacity-5"><Award className="h-12 w-12 text-emerald-600" /></div>
                </Card>

                <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">COPC Compliance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-blue-600 tabular-nums">{summaryStats.copcRate}%</div>
                        <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase tracking-tight">Active Operating Authorities</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[8px] h-4 border-blue-200 text-blue-600 font-bold bg-white uppercase">
                                {summaryStats.inactiveCopc} Inactive COPC
                            </Badge>
                        </div>
                    </CardContent>
                    <div className="absolute top-0 right-0 p-2 opacity-5"><CheckCircle2 className="h-12 w-12 text-blue-600" /></div>
                </Card>

                <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Professional Readiness</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-amber-600 tabular-nums">{summaryStats.boardCount}</div>
                        <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase tracking-tight">Board-Regulated Programs</p>
                    </CardContent>
                    <div className="absolute top-0 right-0 p-2 opacity-5"><Briefcase className="h-12 w-12 text-amber-600" /></div>
                </Card>
            </div>

            <Tabs defaultValue="active" className="space-y-4">
                <div className="flex items-center justify-between">
                    <TabsList className="bg-muted/50 p-1 border shadow-sm h-9">
                        <TabsTrigger value="active" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-7 data-[state=active]:bg-white">
                            <ShieldCheck className="h-3 w-3" /> Active Offerings
                        </TabsTrigger>
                        <TabsTrigger value="inactive" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-7 data-[state=active]:bg-white data-[state=active]:text-destructive">
                            <ShieldAlert className="h-3 w-3" /> Subject for Closure
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="active" className="animate-in slide-in-from-left-2 duration-300">
                    {isLoading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                        </div>
                    ) : (
                        <ProgramRegistry 
                            programs={filteredPrograms.filter(p => p.isActive)} 
                            compliances={rawCompliances || []}
                            campuses={campuses || []} 
                            units={units || []} 
                            onEdit={handleEditProgram}
                            onDelete={setDeletingProgram}
                            canManage={canManage}
                        />
                    )}
                </TabsContent>

                <TabsContent value="inactive" className="animate-in slide-in-from-right-2 duration-300">
                    {isLoading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                        </div>
                    ) : (
                        <ProgramRegistry 
                            programs={filteredPrograms.filter(p => !p.isActive)} 
                            compliances={rawCompliances || []}
                            campuses={campuses || []} 
                            units={units || []} 
                            onEdit={handleEditProgram}
                            onDelete={setDeletingProgram}
                            canManage={canManage}
                        />
                    )}
                </TabsContent>
            </Tabs>
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
                    You are about to delete <strong>{deletingProgram?.name}</strong>. This action is irreversible and will orphan any existing compliance records for this program.
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
