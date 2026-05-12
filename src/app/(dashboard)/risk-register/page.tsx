'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
    PlusCircle, 
    Loader2, 
    CalendarSearch, 
    BarChart3, 
    List, 
    Search, 
    Building, 
    Layers, 
    Filter, 
    Shield, 
    TrendingUp, 
    Printer, 
    Activity, 
    Info, 
    FileSearch, 
    ExternalLink, 
    X, 
    ShieldCheck,
    Trash2,
    School,
    AlertCircle
} from 'lucide-react';
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
    Cycle
} from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, doc, getDocs, limit, orderBy, Timestamp, deleteDoc } from 'firebase/firestore';
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
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';

export default function RiskRegisterPage() {
    const { userProfile, isAdmin, isUserLoading, firestore, isSupervisor } = useUser();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    
    // Core Filters
    const [campusFilter, setCampusFilter] = useState<string>('all');
    const [unitFilter, setUnitFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [ratingFilter, setRatingFilter] = useState<string>('all');

    useEffect(() => {
        const openFormParam = searchParams.get('openForm') === 'true';
        const yearParam = searchParams.get('year');
        if (yearParam) setSelectedYear(Number(yearParam));
        if (openFormParam) {
            handleNewRisk();
        }
    }, [searchParams]);

    useEffect(() => {
        if (userProfile && !isUserLoading) {
            if (!isAdmin) setCampusFilter(userProfile.campusId);
            if (!isAdmin && !isSupervisor) setUnitFilter(userProfile.unitId);
        }
    }, [userProfile, isAdmin, isSupervisor, isUserLoading]);

    /**
     * ACADEMIC YEAR GENERATION
     */
    const allCyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
    const { data: allCycles } = useCollection<Cycle>(allCyclesQuery);

    const yearsList = useMemo(() => {
        const current = new Date().getFullYear();
        const yrSet = new Set<number>();
        for (let i = -2; i < 6; i++) yrSet.add(current - i);
        allCycles?.forEach(c => yrSet.add(Number(c.year)));
        return Array.from(yrSet).sort((a, b) => b - a);
    }, [allCycles]);

    const risksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        const baseRef = collection(firestore, 'risks');
        return query(baseRef, where('year', '==', selectedYear));
    }, [firestore, userProfile, selectedYear]);

    const { data: allRisks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

    const submissionsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        const baseRef = collection(firestore, 'submissions');
        return query(baseRef, where('year', '==', selectedYear));
    }, [firestore, userProfile, selectedYear]);
    const { data: harvestedSubmissions } = useCollection<Submission>(submissionsQuery);

    const monitoringQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        return collection(firestore, 'unitMonitoringRecords');
    }, [firestore, userProfile]);
    const { data: harvestedMonitoring } = useCollection<UnitMonitoringRecord>(monitoringQuery);

    const unitDataQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
    const { data: allUnits } = useCollection<Unit>(unitDataQuery);
    const unitMap = useMemo(() => new Map(allUnits?.map(u => [u.id, u.name])), [allUnits]);

    const campusDataQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
    const { data: allCampuses } = useCollection<Campus>(campusDataQuery);
    const campusMap = useMemo(() => new Map(allCampuses?.map(c => [c.id, c.name])), [allCampuses]);

    const filteredUnitsList = useMemo(() => {
        if (!allUnits) return [];
        if (campusFilter === 'all') return allUnits;
        return allUnits.filter(u => u.campusIds?.includes(campusFilter));
    }, [allUnits, campusFilter]);

    const filteredRisks = useMemo(() => {
        if (!allRisks) return [];
        return allRisks.filter(risk => {
            if (!isAdmin && !isSupervisor && risk.unitId !== userProfile?.unitId) return false;
            if (isSupervisor && !isAdmin && risk.campusId !== userProfile?.campusId) return false;
            if (searchTerm) {
                const lowerSearch = searchTerm.toLowerCase();
                const matchesSearch = risk.description.toLowerCase().includes(lowerSearch) || 
                                     risk.objective.toLowerCase().includes(lowerSearch) ||
                                     (risk.responsiblePersonName || '').toLowerCase().includes(lowerSearch);
                if (!matchesSearch) return false;
            }
            if (campusFilter !== 'all' && risk.campusId !== campusFilter) return false;
            if (unitFilter !== 'all' && risk.unitId !== unitFilter) return false;
            if (typeFilter !== 'all' && risk.type !== typeFilter) return false;
            if (ratingFilter !== 'all' && risk.preTreatment.rating !== ratingFilter) return false;
            return true;
        });
    }, [allRisks, campusFilter, unitFilter, typeFilter, ratingFilter, searchTerm, isAdmin, isSupervisor, userProfile]);
    
    const handleNewRisk = () => { setEditingRisk(null); setIsFormOpen(true); };
    const handleEditRisk = (risk: Risk) => { setEditingRisk(risk); setIsFormOpen(true); };

    const handlePrintROR = () => {
        if (!filteredRisks.length || !userProfile) return;
        const risksByUnit: Record<string, Risk[]> = {};
        filteredRisks.forEach(risk => { if (!risksByUnit[risk.unitId]) risksByUnit[risk.unitId] = []; risksByUnit[risk.unitId].push(risk); });

        try {
            const reportsHtml = Object.entries(risksByUnit).map(([uId, uRisks]) => {
                const uName = unitMap.get(uId) || 'Unknown Unit';
                const cName = campusMap.get(uRisks[0]?.campusId) || 'Institutional';
                return renderToStaticMarkup(<div key={uId} className="print-page-break mb-12"><RORPrintTemplate risks={uRisks} unitName={uName} campusName={cName} year={selectedYear} /></div>);
            }).join('');

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(`<html><head><title>ROR Registry - ${selectedYear}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print { @page { size: 13in 8.5in; margin: 0.5in; } body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } .print-page-break { page-break-after: always; } } body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl font-black uppercase text-xs tracking-widest transition-all">Click to Print Unit RORs (Landscape Folio)</button></div><div id="print-content">${reportsHtml}</div></body></html>`);
                printWindow.document.close();
            }
        } catch (err) { console.error(err); }
    };

    const isLoading = isUserLoading || isLoadingRisks;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="visual-insights" className="space-y-4">
        <div className="sticky top-0 z-30 pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 space-y-4 institutional-header">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div><h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Risk & Opportunity Registry</h2><p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Centralized module for institutional risk management.</p></div>
                <div className="flex flex-wrap items-center gap-2">
                <div className="space-y-1 w-full sm:w-auto">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block sm:text-right">Monitoring Year</label>
                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-full sm:w-[120px] h-9 bg-white font-bold shadow-sm">
                        <CalendarSearch className="h-4 w-4 mr-2 opacity-50" />
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {yearsList.map(y => <SelectItem key={y} value={String(y)}>AY {y}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 pt-0 sm:pt-5 w-full sm:w-auto"><Button variant="outline" size="sm" onClick={handlePrintROR} disabled={isLoading || filteredRisks.length === 0} className="flex-1 sm:flex-none h-9 bg-white shadow-sm font-bold uppercase text-[10px] tracking-widest"><Printer className="mr-2 h-4 w-4" />Print Registry</Button>{!isSupervisor && <Button onClick={handleNewRisk} className="flex-1 sm:flex-none h-9 shadow-lg shadow-primary/20 font-bold uppercase text-[10px] tracking-widest"><PlusCircle className="mr-2 h-4 w-4" />Log New Entry</Button>}</div>
                </div>
            </div>
            <ScrollArea className="w-full">
                <TabsList className="flex md:inline-flex bg-muted/50 p-1 border animate-tab-highlight rounded-md whitespace-nowrap min-w-max w-max">
                    <TabsTrigger value="visual-insights" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><BarChart3 className="h-4 w-4" /> Visual Insights</TabsTrigger>
                    <TabsTrigger value="detailed-register" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><List className="h-4 w-4" /> Detailed Register</TabsTrigger>
                </TabsList>
            </ScrollArea>
        </div>

        <Card className="border-primary/10 shadow-sm bg-muted/10">
            <CardContent className="p-4 space-y-4">
                <div className="flex-1 w-full space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><Search className="h-2.5 w-2.5" /> Search Registry</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search by description, objective, or personnel..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-11 shadow-sm bg-white border-primary/10 font-medium" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><School className="h-2.5 w-2.5" /> Campus Site</label>
                        <Select value={campusFilter} onValueChange={(val) => { setCampusFilter(val); setUnitFilter('all'); }} disabled={!isAdmin}>
                            <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue placeholder="All Campuses" />
                            </SelectTrigger>
                            <SelectContent>
                                {isAdmin && <SelectItem value="all">All Campuses</SelectItem>}
                                {allCampuses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><Building className="h-2.5 w-2.5" /> Unit / Office</label>
                        <Select value={unitFilter} onValueChange={setUnitFilter} disabled={!isAdmin && !isSupervisor}>
                            <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue placeholder="All Units" />
                            </SelectTrigger>
                            <SelectContent>
                                {(isAdmin || isSupervisor) && <SelectItem value="all">All Units</SelectItem>}
                                {filteredUnitsList.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><Shield className="h-2.5 w-2.5" /> Type</label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue placeholder="Both Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Both Types</SelectItem>
                                <SelectItem value="Risk">Risks Only</SelectItem>
                                <SelectItem value="Opportunity">Opportunities Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><TrendingUp className="h-2.5 w-2.5" /> Magnitude Rating</label>
                        <Select value={ratingFilter} onValueChange={setRatingFilter}>
                            <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue placeholder="All Ratings" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Ratings</SelectItem>
                                <SelectItem value="High">High (10-25)</SelectItem>
                                <SelectItem value="Medium">Medium (5-9)</SelectItem>
                                <SelectItem value="Low">Low (1-4)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>

        {!isLoading && <StrategicSwotAnalysis 
            submissions={harvestedSubmissions || []} 
            risks={filteredRisks || []} 
            monitoringRecords={harvestedMonitoring || []} 
            scope={unitFilter !== 'all' ? 'unit' : 'campus'} 
            name={unitMap.get(unitFilter) || campusMap.get(campusFilter) || "Contextual"} 
            selectedYear={selectedYear} 
        />}

        <TabsContent value="visual-insights" className="animate-in fade-in duration-500">
            <RiskDashboard risks={filteredRisks} isLoading={isLoading} selectedYear={selectedYear} />
        </TabsContent>
        <TabsContent value="detailed-register" className="animate-in fade-in duration-500 space-y-4">
            <Card className="shadow-md border-primary/10 overflow-hidden">
                <CardContent className="p-0">
                    <RiskTable 
                        risks={filteredRisks} 
                        usersMap={new Map()} 
                        onEdit={handleEditRisk} 
                        onDelete={() => {}} 
                        isAdmin={isAdmin} 
                        isSupervisor={isSupervisor} 
                        campusMap={campusMap} 
                        unitMap={unitMap} 
                    />
                </CardContent>
                <CardFooter className="bg-muted/5 border-t py-3 px-8">
                    <div className="flex items-start gap-3">
                        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-muted-foreground italic leading-tight">
                            Displaying <strong>{filteredRisks.length}</strong> entries matching the current criteria. Use the filters above to refine the list by campus, unit, risk magnitude, or type.
                        </p>
                    </div>
                </CardFooter>
            </Card>
        </TabsContent>
      </Tabs>
      <RiskFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} risk={editingRisk} unitUsers={[]} allUnits={allUnits || []} allCampuses={allCampuses || []} />
    </div>
  );
}
