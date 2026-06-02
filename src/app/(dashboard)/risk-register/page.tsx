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
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    ShieldAlert,
    ChevronRight,
    Edit,
    Undo2
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
import { collection, query, where, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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
    const [deletingRisk, setDeletingRisk] = useState<Risk | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [isDuplicateAuditOpen, setIsDuplicateAuditOpen] = useState(false);
    
    // Inline Confirmation State for Duplicate Audit
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    
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
    
    /**
     * DUPLICATE AUDIT LOGIC
     */
    const duplicateGroups = useMemo(() => {
        const groups: Record<string, Risk[]> = {};
        filteredRisks.forEach(r => {
            const desc = r.description.trim().toLowerCase();
            if (!groups[desc]) groups[desc] = [];
            groups[desc].push(r);
        });
        return Object.entries(groups).filter(([_, list]) => list.length > 1);
    }, [filteredRisks]);

    const handleNewRisk = () => { setEditingRisk(null); setIsFormOpen(true); };
    const handleEditRisk = (risk: Risk) => { setEditingRisk(risk); setIsFormOpen(true); };

    /**
     * Optimized Delete Logic:
     * - Uses an explicit pointer-event reset to prevent freeze.
     * - Handles both inline (Audit) and global (Table) deletions.
     */
    const handleDeleteRisk = async (targetRiskId?: string) => {
        const riskId = targetRiskId || deletingRisk?.id;
        if (!firestore || !riskId) return;
        
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'risks', riskId));
            toast({ title: 'Record Removed', description: 'The entry has been successfully deleted from the registry.' });
            
            // Cleanup states
            setDeletingRisk(null);
            setConfirmDeleteId(null);
            
            // FAIL-SAFE: Force restore pointer events if Radix UI locks the body
            setTimeout(() => {
                document.body.style.pointerEvents = '';
            }, 100);
        } catch (e) {
            toast({ title: 'Error', description: 'Could not delete entry.', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };

    const signatoryRef = useMemoFirebase(
      () => (firestore ? doc(firestore, 'system', 'signatories') : null),
      [firestore]
    );
    const { data: signatories } = useDoc<Signatories>(signatoryRef);

    const handlePrintROR = () => {
        if (!filteredRisks.length || !userProfile) return;
        const risksByUnit: Record<string, Risk[]> = {};
        filteredRisks.forEach(risk => { if (!risksByUnit[risk.unitId]) risksByUnit[risk.unitId] = []; risksByUnit[risk.unitId].push(risk); });

        try {
            const reportsHtml = Object.entries(risksByUnit).map(([uId, uRisks]) => {
                const uName = unitMap.get(uId) || 'Unknown Unit';
                const cName = campusMap.get(uRisks[0]?.campusId) || 'Institutional';
                return renderToStaticMarkup(<div key={uId} className="print-page-break"><RORPrintTemplate risks={uRisks} unitName={uName} campusName={cName} year={selectedYear} signatories={signatories || undefined} /></div>);
            }).join('');

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>ROR Registry - ${selectedYear}</title>
                        <style>
                            @page { 
                                size: 13in 8.5in; 
                                margin: 0; 
                            }
                            @media print { 
                                html, body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; width: 13in; overflow: visible; } 
                                .no-print { display: none !important; } 
                                .print-page-break { page-break-after: always; width: 13in; min-height: 8.5in; padding: 0.25in; box-sizing: border-box; overflow: hidden; display: block; position: relative; } 
                            } 
                            body { font-family: sans-serif; background: #f9fafb; padding: 0; color: black; }
                            table { border-collapse: collapse !important; table-layout: fixed !important; width: 100% !important; }
                            td, th { overflow: hidden; word-wrap: break-word; }
                        </style>
                    </head>
                    <body>
                        <div class="no-print" style="padding: 20px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: center;">
                            <button onclick="window.print()" style="padding: 12px 30px; background: #1B6535; color: white; border: none; border-radius: 8px; font-weight: 900; text-transform: uppercase; cursor: pointer; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                                Click to Print Unit RORs (Landscape Folio)
                            </button>
                        </div>
                        <div id="print-content">
                            ${reportsHtml}
                        </div>
                    </body>
                    </html>
                `);
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
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
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
                <div className="flex items-center gap-2 pt-0 sm:pt-5 w-full sm:w-auto">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsDuplicateAuditOpen(true)}
                        className={cn(
                            "h-9 bg-white shadow-sm font-bold uppercase text-[10px] tracking-widest gap-2",
                            duplicateGroups.length > 0 ? "text-rose-600 border-rose-200 hover:bg-rose-50" : "text-primary border-primary/20"
                        )}
                    >
                        <Search className="h-4 w-4" />
                        Audit Duplicates
                        {duplicateGroups.length > 0 && (
                            <Badge variant="destructive" className="ml-1 h-4 px-1 min-w-[1.25rem] flex items-center justify-center text-[9px] font-black">
                                {duplicateGroups.length}
                            </Badge>
                        )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrintROR} disabled={isLoading || filteredRisks.length === 0} className="flex-1 sm:flex-none h-9 bg-white shadow-sm font-bold uppercase text-[10px] tracking-widest"><Printer className="mr-2 h-4 w-4" />Print Registry</Button>
                    {!isSupervisor && <Button onClick={handleNewRisk} className="flex-1 sm:flex-none h-9 shadow-lg shadow-primary/20 font-bold uppercase text-[10px] tracking-widest"><PlusCircle className="mr-2 h-4 w-4" />Log New Entry</Button>}
                </div>
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
                        onDelete={setDeletingRisk} 
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

      {/* --- DUPLICATE AUDIT DIALOG --- */}
      <Dialog open={isDuplicateAuditOpen} onOpenChange={setIsDuplicateAuditOpen}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
            <div className="p-6 border-b bg-slate-50 shrink-0">
                <div className="flex items-center gap-2 text-rose-600 mb-1">
                    <ShieldAlert className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Data Integrity</span>
                </div>
                <h3 className="text-lg font-bold">Duplicate Analysis: {unitMap.get(unitFilter) || 'Active Scope'}</h3>
                <p className="text-xs text-muted-foreground mt-1">Identified identical descriptions. Use the inline confirmation to resolve redundant records.</p>
            </div>

            <ScrollArea className="flex-1 bg-white">
                <div className="p-8 space-y-8">
                    {duplicateGroups.length > 0 ? (
                        <div className="space-y-6">
                            {duplicateGroups.map(([desc, list], idx) => (
                                <div key={idx} className="p-5 rounded-2xl border-2 border-rose-100 bg-rose-50/10 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-rose-700 tracking-widest">Conflicting Description</p>
                                            <p className="text-sm font-bold text-slate-900 leading-relaxed italic">"{desc}"</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 pl-8">
                                        {list.map(risk => {
                                            const isConfirming = confirmDeleteId === risk.id;
                                            return (
                                            <div key={risk.id} className={cn(
                                                "flex items-center justify-between p-3 rounded-lg border transition-all shadow-sm group",
                                                isConfirming ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-rose-200/50"
                                            )}>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="secondary" className={cn("h-5 text-[8px] font-black uppercase", isConfirming ? "bg-white/20 text-white" : "bg-primary/5 text-primary")}>{risk.type}</Badge>
                                                    <div className="flex flex-col">
                                                        <span className={cn("text-[10px] font-black uppercase tracking-tighter tabular-nums", isConfirming ? "text-white" : "text-slate-700")}>LOG ID: {risk.id.substring(0,8)}</span>
                                                        <span className={cn("text-[9px] font-medium italic", isConfirming ? "text-white/80" : "text-muted-foreground")}>Logged by: {risk.responsiblePersonName || 'Personnel'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {isConfirming ? (
                                                        <>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => setConfirmDeleteId(null)}
                                                                className="h-7 text-[8px] font-black uppercase text-white hover:bg-white/10"
                                                                disabled={isDeleting}
                                                            >
                                                                <Undo2 className="h-3 w-3 mr-1" />
                                                                Abort
                                                            </Button>
                                                            <Button 
                                                                variant="default" 
                                                                size="sm" 
                                                                onClick={() => handleDeleteRisk(risk.id)}
                                                                className="h-7 text-[8px] font-black uppercase bg-white text-rose-600 hover:bg-slate-50"
                                                                disabled={isDeleting}
                                                            >
                                                                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                                                Yes, Delete
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => { handleEditRisk(risk); setIsDuplicateAuditOpen(false); }}
                                                                className="h-7 text-[8px] font-black uppercase text-primary hover:bg-primary/5 opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                Modify
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => setConfirmDeleteId(risk.id)}
                                                                className="h-7 text-[8px] font-black uppercase text-destructive hover:bg-destructive/5 opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <Trash2 className="h-3 w-3 mr-1" />
                                                                Delete
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-lg font-black uppercase text-slate-800">Registry Integrity Verified</h4>
                                <p className="text-sm text-muted-foreground max-w-xs font-medium">No redundant descriptions detected for the current unit and fiscal year.</p>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <DialogFooter className="p-6 border-t bg-slate-50 shrink-0">
                <div className="flex w-full items-center justify-between">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic flex items-center gap-2">
                        <Info className="h-3.5 w-3.5" />
                        Audit Context: AY {selectedYear} | Unit: {unitMap.get(unitFilter) || 'All'}
                    </p>
                    <Button variant="outline" size="sm" className="h-9 px-6 font-black uppercase text-[10px] tracking-widest bg-white" onClick={() => setIsDuplicateAuditOpen(false)}>Close Audit</Button>
                </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <RiskFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} risk={editingRisk} unitUsers={[]} allUnits={allUnits || []} allCampuses={allCampuses || []} />

      <AlertDialog 
        open={!!deletingRisk} 
        onOpenChange={(open) => !open && setDeletingRisk(null)}
      >
        <AlertDialogContent 
            onPointerDownOutside={(e: any) => e.preventDefault()}
            onInteractOutside={(e: any) => e.preventDefault()}
        >
            <AlertDialogHeader>
                <div className="flex items-center gap-2 text-destructive mb-2">
                    <Trash2 className="h-6 w-6" />
                    <AlertDialogTitle>Delete Registry Entry?</AlertDialogTitle>
                </div>
                <AlertDialogDescription className="space-y-4">
                    <p className="text-sm font-bold text-slate-900 leading-relaxed">
                        You are about to remove the entry: <br/>
                        <strong className="text-destructive font-black">"{deletingRisk?.description}"</strong>
                    </p>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                        This action is irreversible and will remove the record from the AY {selectedYear} registry.
                    </p>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
                <AlertDialogCancel className="font-bold text-[10px] uppercase">Abort</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={(e) => {
                        e.preventDefault();
                        handleDeleteRisk();
                    }} 
                    className="bg-destructive hover:bg-destructive/90 text-white font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-destructive/20 h-10" 
                    disabled={isDeleting}
                >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Confirm Deletion
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
