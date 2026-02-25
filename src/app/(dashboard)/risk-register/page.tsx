'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Loader2, CalendarSearch, BarChart3, List, Search, Building, Layers, Filter, Shield, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Risk, User as AppUser, Unit, Campus } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { RiskFormDialog } from '@/components/risk/risk-form-dialog';
import { RiskTable } from '@/components/risk/risk-table';
import { RiskDashboard } from '@/components/risk/risk-dashboard';
import { useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

export default function RiskRegisterPage() {
    const { userProfile, isAdmin, userRole, isUserLoading, firestore, isSupervisor } = useUser();
    const searchParams = useSearchParams();
    
    // UI States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
    const [isMandatory, setIsMandatory] = useState(false);
    const [registryLink, setRegistryLink] = useState<string | null>(null);
    
    // Filtering States
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [campusFilter, setCampusFilter] = useState<string>('all');
    const [unitFilter, setUnitFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (searchParams.get('openForm') === 'true') {
            setIsMandatory(searchParams.get('mandatory') === 'true');
            setRegistryLink(searchParams.get('link'));
            handleNewRisk();
        }
    }, [searchParams]);

    // Role-based initial filter setup
    useEffect(() => {
        if (isSupervisor && !isAdmin && userProfile?.campusId) {
            setCampusFilter(userProfile.campusId);
        }
    }, [isSupervisor, isAdmin, userProfile?.campusId]);

    // Handle campus change: reset unit
    useEffect(() => {
        setUnitFilter('all');
    }, [campusFilter]);
    
    const risksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        
        // Base fetch is by year to ensure we have the full dataset for the period
        return query(
            collection(firestore, 'risks'), 
            where('year', '==', selectedYear)
        );
    }, [firestore, userProfile, selectedYear]);

    const { data: allRisks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);
    
    const campusDataQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
    const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusDataQuery);
    
    const campusMap = useMemo(() => {
        if (!allCampuses) return new Map<string, string>();
        return new Map(allCampuses.map(c => [c.id, c.name]));
    }, [allCampuses]);

    const unitsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'units');
    }, [firestore]);
    const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

    const unitMap = useMemo(() => {
        if (!allUnits) return new Map<string, string>();
        return new Map(allUnits.map(u => [u.id, u.name]));
    }, [allUnits]);

    const filteredUnitsList = useMemo(() => {
        if (!allUnits) return [];
        if (campusFilter === 'all') return allUnits;
        return allUnits.filter(u => u.campusIds?.includes(campusFilter));
    }, [allUnits, campusFilter]);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        if (isAdmin || isSupervisor) {
            return collection(firestore, 'users');
        }
        if (userProfile.unitId) {
            return query(collection(firestore, 'users'), where('unitId', '==', userProfile.unitId));
        }
        return null;
    }, [firestore, isAdmin, isSupervisor, userProfile]);

    const { data: users, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);

    const usersMap = useMemo(() => {
        if (!users) return new Map();
        return new Map(users.map(u => [u.id, u]));
    }, [users]);

    /**
     * GLOBAL FILTER LOGIC
     * Applies Campus, Unit, and Search filters to the retrieved dataset.
     */
    const filteredRisks = useMemo(() => {
        if (!allRisks) return [];
        
        return allRisks.filter(risk => {
            // 1. Authorization Gate (Ensure unit users only see their own even if data is cached)
            const isUnitUser = !isAdmin && !isSupervisor;
            if (isUnitUser && risk.unitId !== userProfile?.unitId) return false;

            // 2. Campus Filter
            if (campusFilter !== 'all' && risk.campusId !== campusFilter) return false;

            // 3. Unit Filter
            if (unitFilter !== 'all' && risk.unitId !== unitFilter) return false;

            // 4. Search Filter
            if (searchTerm) {
                const lowerSearch = searchTerm.toLowerCase();
                const uName = unitMap.get(risk.unitId)?.toLowerCase() || '';
                const cName = campusMap.get(risk.campusId)?.toLowerCase() || '';
                const matches = 
                    risk.description.toLowerCase().includes(lowerSearch) ||
                    risk.objective.toLowerCase().includes(lowerSearch) ||
                    risk.responsiblePersonName?.toLowerCase().includes(lowerSearch) ||
                    uName.includes(lowerSearch) ||
                    cName.includes(lowerSearch);
                
                if (!matches) return false;
            }

            return true;
        });
    }, [allRisks, campusFilter, unitFilter, searchTerm, isAdmin, isSupervisor, userProfile, unitMap, campusMap]);
    
    const handleNewRisk = () => {
        setEditingRisk(null);
        setIsFormOpen(true);
    };

    const handleEditRisk = (risk: Risk) => {
        setIsMandatory(false);
        setEditingRisk(risk);
        setIsFormOpen(true);
    };
    
    const isLoading = isUserLoading || isLoadingRisks || isLoadingUsers || isLoadingUnits || isLoadingCampuses;

    const canLogRisk = isAdmin || !isSupervisor;
    const isInstitutionalViewer = isAdmin || isSupervisor;

  return (
    <>
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Risk & Opportunity Register</h2>
            <p className="text-muted-foreground">
              A centralized module for logging, tracking, and monitoring risks and opportunities for your unit.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground block text-right">Monitoring Year</label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[120px] h-9">
                        <CalendarSearch className="h-4 w-4 mr-2 opacity-50" />
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {canLogRisk && (
                <div className="pt-5">
                    <Button onClick={handleNewRisk} className="h-9 shadow-lg shadow-primary/20 font-bold uppercase text-[10px] tracking-widest">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Log New Entry
                    </Button>
                </div>
            )}
          </div>
      </div>

      {/* Global Filter Bar */}
      <Card className="border-primary/10 shadow-sm bg-muted/10">
          <CardContent className="p-4 flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 w-full space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                      <Search className="h-2.5 w-2.5" /> Search Register
                  </label>
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Search description, objective, or person..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9 h-9 text-xs bg-white"
                      />
                  </div>
              </div>
              
              {isInstitutionalViewer && (
                  <div className="w-full md:w-64 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                          <Building className="h-2.5 w-2.5" /> Campus Site Filter
                      </label>
                      <Select 
                          value={campusFilter} 
                          onValueChange={(val) => { setCampusFilter(val); }}
                          disabled={!isAdmin}
                      >
                          <SelectTrigger className="h-9 text-xs bg-white">
                              <SelectValue placeholder="All Campuses" />
                          </SelectTrigger>
                          <SelectContent>
                              {isAdmin && <SelectItem value="all">All Campuses</SelectItem>}
                              {allCampuses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
              )}

              {isInstitutionalViewer && (
                  <div className="w-full md:w-64 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                          <Layers className="h-2.5 w-2.5" /> Unit / Office Filter
                      </label>
                      <Select 
                          value={unitFilter} 
                          onValueChange={setUnitFilter}
                          disabled={campusFilter === 'all' && isAdmin}
                      >
                          <SelectTrigger className="h-9 text-xs bg-white">
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

      <Tabs defaultValue="visual-insights" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 border">
            <TabsTrigger value="visual-insights" className="gap-2 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6">
                <BarChart3 className="h-4 w-4" /> Visual Insights
            </TabsTrigger>
            <TabsTrigger value="detailed-register" className="gap-2 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6">
                <List className="h-4 w-4" /> Detailed Register
            </TabsTrigger>
        </TabsList>

        <TabsContent value="visual-insights" className="animate-in fade-in duration-500">
            <RiskDashboard 
                risks={filteredRisks} 
                isLoading={isLoading} 
                selectedYear={selectedYear}
            />
        </TabsContent>

        <TabsContent value="detailed-register" className="animate-in fade-in duration-500">
            <Tabs defaultValue="risks" className="space-y-4">
                <div className="flex items-center justify-between">
                    <TabsList className="bg-muted/30 p-1 border shadow-sm h-9">
                        <TabsTrigger value="risks" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-7 data-[state=active]:bg-white data-[state=active]:text-destructive">
                            <Shield className="h-3.5 w-3.5" /> Risks
                        </TabsTrigger>
                        <TabsTrigger value="opportunities" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-7 data-[state=active]:bg-white data-[state=active]:text-emerald-600">
                            <TrendingUp className="h-3.5 w-3.5" /> Opportunities
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="risks" className="mt-0 animate-in slide-in-from-left-2 duration-300">
                    <Card className="shadow-md border-primary/10 overflow-hidden">
                        <CardHeader className="bg-rose-50/30 border-b py-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg uppercase font-black tracking-tight text-slate-900">Risk Registry: {selectedYear}</CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Displaying {filteredRisks.filter(r => r.type === 'Risk').length} risk entries.
                                    </CardDescription>
                                </div>
                                <Shield className="h-10 w-10 text-rose-600/10" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                                </div>
                            ) : (
                                <RiskTable 
                                    risks={filteredRisks.filter(r => r.type === 'Risk')}
                                    usersMap={usersMap}
                                    onEdit={handleEditRisk}
                                    isAdmin={isAdmin}
                                    isSupervisor={isSupervisor}
                                    campusMap={campusMap}
                                    unitMap={unitMap}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="opportunities" className="mt-0 animate-in slide-in-from-right-2 duration-300">
                    <Card className="shadow-md border-primary/10 overflow-hidden">
                        <CardHeader className="bg-emerald-50/30 border-b py-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg uppercase font-black tracking-tight text-slate-900">Opportunity Registry: {selectedYear}</CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Displaying {filteredRisks.filter(r => r.type === 'Opportunity').length} opportunity entries.
                                    </CardDescription>
                                </div>
                                <TrendingUp className="h-10 w-10 text-emerald-600/10" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                                </div>
                            ) : (
                                <RiskTable 
                                    risks={filteredRisks.filter(r => r.type === 'Opportunity')}
                                    usersMap={usersMap}
                                    onEdit={handleEditRisk}
                                    isAdmin={isAdmin}
                                    isSupervisor={isSupervisor}
                                    campusMap={campusMap}
                                    unitMap={unitMap}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </TabsContent>
      </Tabs>
    </div>
    <RiskFormDialog 
        key={editingRisk?.id || 'new'}
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        risk={editingRisk}
        unitUsers={users || []}
        allUnits={allUnits || []}
        allCampuses={allCampuses || []}
        isMandatory={isMandatory}
        registryLink={registryLink}
        defaultYear={selectedYear}
    />
    </>
  );
}
