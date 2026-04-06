
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Loader2, CalendarSearch, BarChart3, List, Search, Building, Layers, Filter, Shield, TrendingUp, Printer, Activity, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import type { 
    Risk, 
    User as AppUser, 
    Unit, 
    Campus, 
    Signatories, 
    Submission, 
    UnitMonitoringRecord, 
    ProgramComplianceRecord, 
    AuditFinding, 
    CorrectiveActionRequest, 
    ManagementReviewOutput 
} from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { RiskFormDialog } from '@/components/risk/risk-form-dialog';
import { RiskTable } from '@/components/risk/risk-table';
import { RiskDashboard } from '@/components/risk/risk-dashboard';
import { useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { renderToStaticMarkup } from 'react-dom/server';
import { RORPrintTemplate } from '@/components/risk/ror-print-template';
import { useToast } from '@/hooks/use-toast';
import { StrategicSwotAnalysis } from '@/components/submissions/strategic-swot-analysis';
import { ScrollArea } from '@/components/ui/scroll-area';

const currentYear = new Date().getFullYear();
const yearsList = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

export default function RiskRegisterPage() {
    const { userProfile, isAdmin, isUserLoading, firestore, isSupervisor } = useUser();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
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
        const openFormParam = searchParams.get('openForm') === 'true';
        const yearParam = searchParams.get('year');
        
        if (yearParam) {
            setSelectedYear(Number(yearParam));
        }

        if (openFormParam) {
            setIsMandatory(searchParams.get('mandatory') === 'true');
            setRegistryLink(searchParams.get('link'));
            handleNewRisk();
        }
    }, [searchParams]);

    // Role-based initial filter setup & strict locking
    useEffect(() => {
        if (userProfile && !isUserLoading) {
            if (isAdmin) {
                // Admin can see everything, defaults are fine
            } else if (isSupervisor) {
                // Supervisors are locked to their campus
                setCampusFilter(userProfile.campusId);
            } else {
                // Unit Coordinators are locked to their site and unit
                setCampusFilter(userProfile.campusId);
                setUnitFilter(userProfile.unitId);
            }
        }
    }, [userProfile, isAdmin, isSupervisor, isUserLoading]);

    // Handle campus change: reset unit (only for Admins)
    useEffect(() => {
        if (isAdmin) setUnitFilter('all');
    }, [campusFilter, isAdmin]);
    
    const risksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        
        const baseRef = collection(firestore, 'risks');
        
        // Strict Scoping in Fetching
        if (isAdmin) {
            return query(baseRef, where('year', '==', selectedYear));
        }
        
        if (isSupervisor) {
            return query(baseRef, where('year', '==', selectedYear), where('campusId', '==', userProfile.campusId));
        }

        // Unit Coordinator / Unit ODIMO
        return query(baseRef, where('year', '==', selectedYear), where('unitId', '==', userProfile.unitId));
    }, [firestore, userProfile, selectedYear, isAdmin, isSupervisor]);

    const { data: allRisks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

    /**
     * CONTEXTUAL DATA HARVESTING FOR SWOT
     */
    const submissionsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        const baseRef = collection(firestore, 'submissions');
        if (isAdmin) return query(baseRef, where('year', '==', selectedYear));
        if (isSupervisor) return query(baseRef, where('year', '==', selectedYear), where('campusId', '==', userProfile.campusId));
        return query(baseRef, where('year', '==', selectedYear), where('unitId', '==', userProfile.unitId));
    }, [firestore, userProfile, selectedYear, isAdmin, isSupervisor]);
    const { data: harvestedSubmissions } = useCollection<Submission>(submissionsQuery);

    const monitoringQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        const baseRef = collection(firestore, 'unitMonitoringRecords');
        if (isAdmin) return baseRef;
        if (isSupervisor) return query(baseRef, where('campusId', '==', userProfile.campusId));
        return query(baseRef, where('unitId', '==', userProfile.unitId));
    }, [firestore, userProfile, isAdmin, isSupervisor]);
    const { data: harvestedMonitoring } = useCollection<UnitMonitoringRecord>(monitoringQuery);

    const compliancesQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        const baseRef = collection(firestore, 'programCompliances');
        if (isAdmin) return query(baseRef, where('academicYear', '==', selectedYear));
        if (isSupervisor) return query(baseRef, where('academicYear', '==', selectedYear), where('campusId', '==', userProfile.campusId));
        return query(baseRef, where('academicYear', '==', selectedYear), where('unitId', '==', userProfile.unitId));
    }, [firestore, userProfile, selectedYear, isAdmin, isSupervisor]);
    const { data: harvestedCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

    const carQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        const baseRef = collection(firestore, 'correctiveActionRequests');
        if (isAdmin) return baseRef;
        if (isSupervisor) return query(baseRef, where('campusId', '==', userProfile.campusId));
        return query(baseRef, where('unitId', '==', userProfile.unitId));
    }, [firestore, userProfile, isAdmin, isSupervisor]);
    const { data: harvestedCars } = useCollection<CorrectiveActionRequest>(carQuery);

    const findingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditFindings') : null), [firestore]);
    const { data: harvestedFindings } = useCollection<AuditFinding>(findingsQuery);

    const mrOutputsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'managementReviewOutputs') : null), [firestore]);
    const { data: harvestedMrOutputs } = useCollection<ManagementReviewOutput>(mrOutputsQuery);
    
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

    const signatoryRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'system', 'signatories') : null),
        [firestore]
    );
    const { data: signatories } = useDoc<Signatories>(signatoryRef);

    /**
     * GLOBAL FILTER LOGIC
     */
    const filteredRisks = useMemo(() => {
        if (!allRisks) return [];
        
        return allRisks.filter(risk => {
            // 1. Final Gate Authorization Check
            const isUnitUser = !isAdmin && !isSupervisor;
            if (isUnitUser && risk.unitId !== userProfile?.unitId) return false;
            if (isSupervisor && !isAdmin && risk.campusId !== userProfile?.campusId) return false;

            // 2. Local Filters
            if (isAdmin && campusFilter !== 'all' && risk.campusId !== campusFilter) return false;
            if ((isAdmin || isSupervisor) && unitFilter !== 'all' && risk.unitId !== unitFilter) return false;

            // 3. Search Filter
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

    const handlePrintROR = () => {
        if (!filteredRisks.length || !userProfile) return;

        const risksByUnit: Record<string, Risk[]> = {};
        filteredRisks.forEach(risk => {
            if (!risksByUnit[risk.unitId]) {
                risksByUnit[risk.unitId] = [];
            }
            risksByUnit[risk.unitId].push(risk);
        });

        try {
            const reportsHtml = Object.entries(risksByUnit).map(([uId, uRisks]) => {
                const uName = unitMap.get(uId) || 'Unknown Unit';
                const cId = uRisks[0]?.campusId;
                const cName = campusMap.get(cId) || 'Institutional';
                
                return renderToStaticMarkup(
                    <div className="print-page-break mb-12">
                        <RORPrintTemplate 
                            risks={uRisks} 
                            unitName={uName} 
                            campusName={cName} 
                            year={selectedYear}
                            signatories={signatories || undefined}
                        />
                    </div>
                );
            }).join('');

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>ROR Units Batch - ${selectedYear}</title>
                        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                        <style>
                            @media print { 
                                @page { size: 13in 11in; margin: 0.5in; }
                                body { margin: 0; padding: 0; background: white; } 
                                .no-print { display: none !important; }
                                .print-page-break { page-break-after: always; }
                                .print-page-break:last-child { page-break-after: auto; }
                            }
                            body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                        </style>
                    </head>
                    <body>
                        <div class="no-print mb-8 flex justify-center">
                            <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Unit Forms (11x13)</button>
                        </div>
                        <div id="print-content">
                            ${reportsHtml}
                        </div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            }
        } catch (err) {
            console.error("Print error:", err);
            toast({ title: "Print Error", description: "Could not generate batch unit forms.", variant: "destructive" });
        }
    };
    
    const isLoading = isUserLoading || isLoadingRisks || isLoadingUsers || isLoadingUnits || isLoadingCampuses;

    const currentScopeName = useMemo(() => {
        if (unitFilter !== 'all') return unitMap.get(unitFilter) || 'Selected Unit';
        if (campusFilter !== 'all') return campusMap.get(campusFilter) || 'Selected Campus';
        return "University-Wide";
    }, [unitFilter, campusFilter, unitMap, campusMap]);

    const currentScopeType = unitFilter !== 'all' ? 'unit' : 'campus';

  return (
    <>
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Risk & Opportunity Registry</h2>
            <p className="text-muted-foreground text-sm">
              A centralized module for logging, tracking, and monitoring institutional risks and opportunities.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="space-y-1 w-full sm:w-auto">
                <label className="text-[10px] font-bold uppercase text-muted-foreground block sm:text-right">Monitoring Year</label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-full sm:w-[120px] h-9 bg-white font-bold shadow-sm">
                        <CalendarSearch className="h-4 w-4 mr-2 opacity-50" />
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-2 pt-0 sm:pt-5 w-full sm:w-auto">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrintROR} 
                    disabled={isLoading || filteredRisks.length === 0}
                    className="flex-1 sm:flex-none h-9 bg-white shadow-sm font-bold uppercase text-[10px] tracking-widest"
                >
                    <Printer className="mr-2 h-4 w-4" />
                    Print Registry
                </Button>
                {!isSupervisor && (
                    <Button onClick={handleNewRisk} className="flex-1 sm:flex-none h-9 shadow-lg shadow-primary/20 font-bold uppercase text-[10px] tracking-widest">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Log New Entry
                    </Button>
                )}
            </div>
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
              
              <div className="w-full md:w-64 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                      <Building className="h-2.5 w-2.5" /> Campus Site
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

              <div className="w-full md:w-64 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                      <Layers className="h-2.5 w-2.5" /> Unit / Office
                  </label>
                  <Select 
                      value={unitFilter} 
                      onValueChange={setUnitFilter}
                      disabled={!isAdmin && !isSupervisor}
                  >
                      <SelectTrigger className="h-9 text-xs bg-white">
                          <SelectValue placeholder="All Units" />
                      </SelectTrigger>
                      <SelectContent>
                          {(isAdmin || isSupervisor) && <SelectItem value="all">All Units</SelectItem>}
                          {filteredUnitsList.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
          </CardContent>
      </Card>

      {/* STRATEGIC STRENGTHS & GAPS */}
      {!isLoading && (
          <StrategicSwotAnalysis 
            submissions={harvestedSubmissions || []}
            risks={allRisks || []}
            monitoringRecords={harvestedMonitoring || []}
            programCompliances={harvestedCompliances || []}
            auditFindings={harvestedFindings || []}
            correctiveActionRequests={harvestedCars || []}
            mrOutputs={harvestedMrOutputs || []}
            scope={currentScopeType}
            name={currentScopeName}
            selectedYear={selectedYear}
          />
      )}

      <Tabs defaultValue="visual-insights" className="space-y-4">
        <ScrollArea className="w-full">
            <TabsList className="flex md:inline-flex bg-muted/50 p-1 border animate-tab-highlight rounded-md whitespace-nowrap">
                <TabsTrigger value="visual-insights" className="gap-2 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6">
                    <BarChart3 className="h-4 w-4" /> Visual Insights
                </TabsTrigger>
                <TabsTrigger value="detailed-register" className="gap-2 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6">
                    <List className="h-4 w-4" /> Detailed Register
                </TabsTrigger>
            </TabsList>
        </ScrollArea>

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
                    <TabsList className="bg-muted/30 p-1 border shadow-sm h-9 animate-tab-highlight rounded-md">
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
                                <div className="overflow-x-auto">
                                    <RiskTable 
                                        risks={filteredRisks.filter(r => r.type === 'Risk')}
                                        usersMap={usersMap}
                                        onEdit={handleEditRisk}
                                        isAdmin={isAdmin}
                                        isSupervisor={isSupervisor}
                                        campusMap={campusMap}
                                        unitMap={unitMap}
                                    />
                                </div>
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
                                <div className="overflow-x-auto">
                                    <RiskTable 
                                        risks={filteredRisks.filter(r => r.type === 'Opportunity')}
                                        usersMap={usersMap}
                                        onEdit={handleEditRisk}
                                        isAdmin={isAdmin}
                                        isSupervisor={isSupervisor}
                                        campusMap={campusMap}
                                        unitMap={unitMap}
                                    />
                                </div>
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
