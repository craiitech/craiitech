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
    Trash2
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
    ProgramComplianceRecord, 
    AuditFinding, 
    CorrectiveActionRequest, 
    ManagementReviewOutput 
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

const currentYear = new Date().getFullYear();
const yearsList = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

export default function RiskRegisterPage() {
    const { userProfile, isAdmin, isUserLoading, firestore, isSupervisor } = useUser();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
    const [isMandatory, setIsMandatory] = useState(false);
    const [registryLink, setRegistryLink] = useState<string | null>(null);
    const [deletingRisk, setDeletingRisk] = useState<Risk | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [previewSubmission, setPreviewSubmission] = useState<Submission | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [campusFilter, setCampusFilter] = useState<string>('all');
    const [unitFilter, setUnitFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const openFormParam = searchParams.get('openForm') === 'true';
        const yearParam = searchParams.get('year');
        if (yearParam) setSelectedYear(Number(yearParam));
        if (openFormParam) {
            setIsMandatory(searchParams.get('mandatory') === 'true');
            setRegistryLink(searchParams.get('link'));
            handleNewRisk();
        }
    }, [searchParams]);

    useEffect(() => {
        if (userProfile && !isUserLoading) {
            if (!isAdmin) setCampusFilter(userProfile.campusId);
            if (!isAdmin && !isSupervisor) setUnitFilter(userProfile.unitId);
        }
    }, [userProfile, isAdmin, isSupervisor, isUserLoading]);

    const risksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        const baseRef = collection(firestore, 'risks');
        if (isAdmin) return query(baseRef, where('year', '==', selectedYear));
        if (isSupervisor) return query(baseRef, where('year', '==', selectedYear), where('campusId', '==', userProfile.campusId));
        return query(baseRef, where('year', '==', selectedYear), where('unitId', '==', userProfile.unitId));
    }, [firestore, userProfile, selectedYear, isAdmin, isSupervisor]);

    const { data: allRisks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

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

    const unitDataQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
    const { data: allUnits } = useCollection<Unit>(unitDataQuery);
    const unitMap = useMemo(() => new Map(allUnits?.map(u => [u.id, u.name])), [allUnits]);

    const campusDataQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
    const { data: allCampuses } = useCollection<Campus>(campusDataQuery);
    const campusMap = useMemo(() => new Map(allCampuses?.map(c => [c.id, c.name])), [allCampuses]);

    const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
    const { data: signatories } = useDoc<Signatories>(signatoryRef);

    const filteredRisks = useMemo(() => {
        if (!allRisks) return [];
        return allRisks.filter(risk => {
            if (!isAdmin && !isSupervisor && risk.unitId !== userProfile?.unitId) return false;
            if (isSupervisor && !isAdmin && risk.campusId !== userProfile?.campusId) return false;
            if (isAdmin && campusFilter !== 'all' && risk.campusId !== campusFilter) return false;
            if ((isAdmin || isSupervisor) && unitFilter !== 'all' && risk.unitId !== unitFilter) return false;
            if (searchTerm) {
                const lowerSearch = searchTerm.toLowerCase();
                return risk.description.toLowerCase().includes(lowerSearch) || risk.objective.toLowerCase().includes(lowerSearch);
            }
            return true;
        });
    }, [allRisks, campusFilter, unitFilter, searchTerm, isAdmin, isSupervisor, userProfile]);
    
    const handleNewRisk = () => { setEditingRisk(null); setIsFormOpen(true); };
    const handleEditRisk = (risk: Risk) => { setIsMandatory(false); setEditingRisk(risk); setIsFormOpen(true); };

    const handlePrintROR = () => {
        if (!filteredRisks.length || !userProfile) return;
        const risksByUnit: Record<string, Risk[]> = {};
        filteredRisks.forEach(risk => { if (!risksByUnit[risk.unitId]) risksByUnit[risk.unitId] = []; risksByUnit[risk.unitId].push(risk); });

        try {
            const reportsHtml = Object.entries(risksByUnit).map(([uId, uRisks]) => {
                const uName = unitMap.get(uId) || 'Unknown Unit';
                const cName = campusMap.get(uRisks[0]?.campusId) || 'Institutional';
                return renderToStaticMarkup(<div className="print-page-break mb-12"><RORPrintTemplate risks={uRisks} unitName={uName} campusName={cName} year={selectedYear} signatories={signatories || undefined} /></div>);
            }).join('');

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(`<html><head><title>ROR Registry - ${selectedYear}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print { @page { size: 13in 11in; margin: 0.5in; } body { margin: 0; padding: 0; background: white; } .no-print { display: none !important; } .print-page-break { page-break-after: always; } } body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl font-black uppercase text-xs tracking-widest">Print Unit Forms (11x13)</button></div><div id="print-content">${reportsHtml}</div></body></html>`);
                printWindow.document.close();
            }
        } catch (err) { console.error(err); }
    };

    const isLoading = isUserLoading || isLoadingRisks;

  return (
    <Tabs defaultValue="visual-insights" className="space-y-4">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div><h2 className="text-2xl font-bold tracking-tight">Risk & Opportunity Registry</h2><p className="text-muted-foreground text-sm">Centralized module for institutional risk management.</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="space-y-1 w-full sm:w-auto"><label className="text-[10px] font-bold uppercase text-muted-foreground block sm:text-right">Monitoring Year</label><Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}><SelectTrigger className="w-full sm:w-[120px] h-9 bg-white font-bold shadow-sm"><CalendarSearch className="h-4 w-4 mr-2 opacity-50" /><SelectValue placeholder="Year" /></SelectTrigger><SelectContent>{yearsList.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex items-center gap-2 pt-0 sm:pt-5 w-full sm:w-auto"><Button variant="outline" size="sm" onClick={handlePrintROR} disabled={isLoading || filteredRisks.length === 0} className="flex-1 sm:flex-none h-9 bg-white shadow-sm font-bold uppercase text-[10px] tracking-widest"><Printer className="mr-2 h-4 w-4" />Print Registry</Button>{!isSupervisor && <Button onClick={handleNewRisk} className="flex-1 sm:flex-none h-9 shadow-lg shadow-primary/20 font-bold uppercase text-[10px] tracking-widest"><PlusCircle className="mr-2 h-4 w-4" />Log New Entry</Button>}</div>
            </div>
        </div>
        <ScrollArea className="w-full"><TabsList className="flex md:inline-flex bg-muted/50 p-1 border animate-tab-highlight rounded-md whitespace-nowrap"><TabsTrigger value="visual-insights" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><BarChart3 className="h-4 w-4" /> Visual Insights</TabsTrigger><TabsTrigger value="detailed-register" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><List className="h-4 w-4" /> Detailed Register</TabsTrigger></TabsList></ScrollArea>
      </div>

      <div className="space-y-4">
        <Card className="border-primary/10 shadow-sm bg-muted/10"><CardContent className="p-4 flex flex-col md:flex-row items-end gap-4"><div className="flex-1 w-full space-y-1.5"><label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><Search className="h-2.5 w-2.5" /> Search Register</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 text-xs bg-white" /></div></div></CardContent></Card>
        {!isLoading && <StrategicSwotAnalysis submissions={harvestedSubmissions || []} risks={allRisks || []} monitoringRecords={harvestedMonitoring || []} scope={unitFilter !== 'all' ? 'unit' : 'campus'} name={unitMap.get(unitFilter) || "Context"} selectedYear={selectedYear} />}
        <TabsContent value="visual-insights" className="animate-in fade-in duration-500"><RiskDashboard risks={filteredRisks} isLoading={isLoading} selectedYear={selectedYear} /></TabsContent>
        <TabsContent value="detailed-register" className="animate-in fade-in duration-500 space-y-4"><RiskTable risks={filteredRisks} usersMap={new Map()} onEdit={handleEditRisk} onDelete={() => {}} isAdmin={isAdmin} isSupervisor={isSupervisor} campusMap={campusMap} unitMap={unitMap} /></TabsContent>
      </div>
      <RiskFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} risk={editingRisk} unitUsers={[]} allUnits={[]} allCampuses={[]} />
    </Tabs>
  );
}
