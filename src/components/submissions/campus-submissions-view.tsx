'use client';

import { useState, useMemo } from 'react';
import type { 
    Submission, 
    Unit, 
    Campus, 
    Signatories, 
    Risk, 
    UnitMonitoringRecord,
    ProgramComplianceRecord,
    AuditFinding,
    AuditSchedule,
    CorrectiveActionRequest,
    ManagementReviewOutput,
    Cycle
} from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
    Loader2, 
    Building, 
    Eye, 
    School, 
    Trash2, 
    Calendar as CalendarIcon, 
    PieChart as PieIcon, 
    AlertTriangle, 
    CheckCircle2, 
    ShieldCheck, 
    ShieldAlert,
    Printer, 
    LayoutList,
    ChevronLeft,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen,
    Info,
    TrendingUp,
    Filter,
    FileWarning,
    Target,
    Activity,
    Trophy,
    ListChecks,
    Search,
    X,
    Check,
    Monitor,
    Building2
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn, isCycleActive } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { renderToStaticMarkup } from 'react-dom/server';
import { NoticeOfCompliance, NoticeOfNonCompliance, CampusNoticeOfCompliance, CampusNoticeOfNonCompliance } from './notices-print-templates';
import { useUser, useFirestore, useMemoFirebase, useDoc, useCollection } from '@/firebase';
import { doc, Timestamp, collection, query, where } from '@/firebase/firestore-wrapper';
import { StrategicSwotAnalysis } from './strategic-swot-analysis';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TOTAL_REPORTS_PER_CYCLE, submissionTypes } from '@/lib/constants';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const STATUS_COLORS: Record<string, string> = {
    Approved: 'hsl(142 71% 45%)',
    'Awaiting Approval': 'hsl(var(--chart-1))',
    Missing: 'hsl(var(--destructive))',
    Rejected: 'hsl(var(--chart-3))',
};

const getYearCycleRowColor = (year: number, cycle: string) => {
  const isFinal = cycle.toLowerCase() === 'final';
  const colors: Record<number, { first: string, final: string }> = {
    2024: { 
      first: 'bg-blue-50/20 hover:bg-blue-100/40', 
      final: 'bg-blue-100/40 hover:bg-blue-200/50' 
    },
    2025: { 
      first: 'bg-green-50/20 hover:bg-green-100/40', 
      final: 'bg-green-100/40 hover:bg-blue-200/50' 
    },
    2026: { 
      first: 'bg-amber-50/20 hover:bg-amber-100/40', 
      final: 'bg-amber-100/40 hover:bg-blue-200/50' 
    },
    2027: { 
      first: 'bg-purple-50/20 hover:bg-purple-100/40', 
      final: 'bg-purple-100/40 hover:bg-blue-200/50' 
    },
    2028: { 
      first: 'bg-rose-50/20 hover:bg-rose-100/40', 
      final: 'bg-rose-100/40 hover:bg-rose-200/50' 
    },
  };
  
  const yearColor = colors[year] || { 
    first: 'bg-slate-50/20 hover:bg-slate-100/40', 
    final: 'bg-slate-100/40 hover:bg-blue-200/50' 
  };
  
  return isFinal ? yearColor.final : yearColor.first;
};

interface CampusSubmissionsViewProps {
  allSubmissions: Submission[] | null;
  allCampuses: Campus[] | null;
  allUnits: Unit[] | null;
  isLoading: boolean;
  isAdmin: boolean;
  onDeleteClick: (submission: Submission) => void;
  selectedYear: string;
}

export function CampusSubmissionsView({
  allSubmissions,
  allCampuses,
  allUnits,
  isLoading,
  isAdmin: isGlobalAdmin,
  onDeleteClick,
  selectedYear,
}: CampusSubmissionsViewProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const cyclesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'cycles') : null),
    [firestore]
  );
  const { data: allCycles } = useCollection<Cycle>(cyclesQuery);
  
  // ADMIN FILTER STATES
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarCampusFilter, setSidebarCampusFilter] = useState('all');

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const risksQuery = useMemoFirebase(() => {
    if (!firestore || !selectedCampusId || !selectedYear) return null;
    return query(collection(firestore, 'risks'), where('campusId', '==', selectedCampusId), where('year', '==', Number(selectedYear)));
  }, [firestore, selectedCampusId, selectedYear]);
  const { data: campusRisks } = useCollection<Risk>(risksQuery);

  const monitoringQuery = useMemoFirebase(() => {
    if (!firestore || !selectedCampusId) return null;
    return query(collection(firestore, 'unitMonitoringRecords'), where('campusId', '==', selectedCampusId));
  }, [firestore, selectedCampusId]);
  const { data: campusMonitoring } = useCollection<UnitMonitoringRecord>(monitoringQuery);

  const compliancesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedCampusId || !selectedYear) return null;
    return query(collection(firestore, 'programCompliances'), where('campusId', '==', selectedCampusId), where('academicYear', '==', Number(selectedYear)));
  }, [firestore, selectedCampusId, selectedYear]);
  const { data: campusCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  const carQuery = useMemoFirebase(() => {
    if (!firestore || !selectedCampusId) return null;
    return query(collection(firestore, 'correctiveActionRequests'), where('campusId', '==', selectedCampusId));
  }, [firestore, selectedCampusId]);
  const { data: campusCars } = useCollection<CorrectiveActionRequest>(carQuery);

  const mrOutputsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedCampusId) return null;
    return collection(firestore, 'managementReviewOutputs');
  }, [firestore, selectedCampusId]);
  const { data: mrOutputs } = useCollection<ManagementReviewOutput>(mrOutputsQuery);

  const auditFindingsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedCampusId) return null;
    return collection(firestore, 'auditFindings');
  }, [firestore, selectedCampusId]);
  const { data: auditFindings } = useCollection<AuditFinding>(auditFindingsQuery);

  const campusSchedulesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedCampusId) return null;
    return query(collection(firestore, 'auditSchedules'), where('campusId', '==', selectedCampusId));
  }, [firestore, selectedCampusId]);
  const { data: campusSchedules } = useCollection<AuditSchedule>(campusSchedulesQuery);

  const campusMap = useMemo(() => {
    const map = new Map(allCampuses?.map(c => [c.id, c.name]));
    map.set('university-wide', 'University-Wide');
    return map;
  }, [allCampuses]);

  const unitMap = useMemo(() => new Map(allUnits?.map(u => [u.id, u.name])), [allUnits]);

  const campusScopeFindings = useMemo(() => {
    if (!campusSchedules || !auditFindings) return [];
    const campusScheduleIds = new Set(campusSchedules.map(s => s.id));
    return auditFindings.filter(f => campusScheduleIds.has(f.auditScheduleId));
  }, [campusSchedules, auditFindings]);

  const unitScopeFindings = useMemo(() => {
    if (!campusSchedules || !auditFindings || !selectedUnitId) return [];
    const unitScheduleIds = new Set(
      campusSchedules.filter(s => s.targetType === 'Unit' && s.targetId === selectedUnitId).map(s => s.id)
    );
    return auditFindings.filter(f => unitScheduleIds.has(f.auditScheduleId));
  }, [campusSchedules, auditFindings, selectedUnitId]);

  /**
   * FILTERED CAMPUS GROUPS
   * Respects both the Sidebar Search and the Campus Dropdown Filter.
   */
  const campusGroups = useMemo(() => {
    if (!allCampuses || !allUnits) return [];
    
    let filteredCampuses = [...allCampuses];

    // 1. Campus Filter
    if (sidebarCampusFilter !== 'all') {
        filteredCampuses = filteredCampuses.filter(c => c.id === sidebarCampusFilter);
    }

    return filteredCampuses.map(campus => {
        let campusUnits = allUnits.filter(u => u.campusIds?.includes(campus.id));

        // 2. Unit Search Filter
        if (sidebarSearch) {
            const lowerSearch = sidebarSearch.toLowerCase();
            campusUnits = campusUnits.filter(u => u.name.toLowerCase().includes(lowerSearch));
        }

        return {
            ...campus,
            units: campusUnits.sort((a,b) => a.name.localeCompare(b.name))
        };
    }).filter(c => c.units.length > 0).sort((a,b) => a.name.localeCompare(b.name));
  }, [allCampuses, allUnits, sidebarSearch, sidebarCampusFilter]);

  const campusSummary = useMemo(() => {
    if (!selectedCampusId || !allSubmissions || !allUnits) return null;

    const campusUnits = allUnits.filter(u => u.campusIds?.includes(selectedCampusId));
    const yearSubmissions = allSubmissions.filter(s => s.campusId === selectedCampusId && s.year.toString() === selectedYear);

    const unitPerformance = campusUnits.map(unit => {
        const unitSubs = yearSubmissions.filter(s => s.unitId === unit.id);
        
        const ror = unitSubs.find(s => s.reportType === 'Risk and Opportunity Registry');
        const isActionPlanNA = ror?.riskRating === 'low';
        
        const approved = unitSubs.filter(s => s.statusId === 'approved').length;
        
        const isFirstActive = isCycleActive('first', selectedYear, allCycles);
        const isFinalActive = isCycleActive('final', selectedYear, allCycles);
        let totalPossible = 0;
        if (isFirstActive) totalPossible += submissionTypes.length - (isActionPlanNA ? 1 : 0);
        if (isFinalActive) totalPossible += submissionTypes.length - (isActionPlanNA ? 1 : 0);
        
        const getMissing = (cycleId: 'first' | 'final') => {
            if (!isCycleActive(cycleId, selectedYear, allCycles)) return [];
            const approvedSet = new Set(unitSubs.filter(s => s.cycleId === cycleId && s.statusId === 'approved').map(s => s.reportType));
            return submissionTypes.filter(type => {
                if (approvedSet.has(type)) return false;
                if (type === 'Risk and Opportunity Action Plan' && isActionPlanNA) return false;
                return true;
            });
        };

        return {
            id: unit.id,
            name: unit.name,
            score: Math.round((approved / (totalPossible || 1)) * 100),
            approvedCount: approved,
            totalPossible,
            missingFirst: getMissing('first'),
            missingFinal: getMissing('final'),
            allUnitSubmissions: unitSubs
        };
    });

    const avgScore = Math.round(unitPerformance.reduce((acc, u) => acc + u.score, 0) / (unitPerformance.length || 1));
    const fullyCompliant = unitPerformance.filter(u => u.score === 100).length;

    return {
        avgScore,
        totalUnits: unitPerformance.length,
        fullyCompliant,
        unitPerformance: unitPerformance.sort((a,b) => b.score - a.score),
        allCampusSubmissions: yearSubmissions
    };
  }, [selectedCampusId, allSubmissions, allUnits, selectedYear, allCycles]);

  const unitData = useMemo(() => {
    if (!selectedUnitId || !allSubmissions || !selectedCampusId) return null;
    
    const unitSubmissions = allSubmissions.filter(s => s.unitId === selectedUnitId && s.campusId === selectedCampusId && s.year.toString() === selectedYear);
    
    const firstSubs = unitSubmissions.filter(s => s.cycleId === 'first');
    const finalSubs = unitSubmissions.filter(s => s.cycleId === 'final');

    const firstRegistry = firstSubs.find(s => s.reportType === 'Risk and Opportunity Registry');
    const isFirstActionPlanNA = firstRegistry?.riskRating === 'low';

    const finalRegistry = finalSubs.find(s => s.reportType === 'Risk and Opportunity Registry');
    const isFinalActionPlanNA = finalRegistry?.riskRating === 'low';

    const getMissingOrUnapproved = (cycleSubs: Submission[], isActionPlanNA: boolean, cycleId: 'first' | 'final') => {
        if (!isCycleActive(cycleId, selectedYear, allCycles)) return [];
        const approvedSet = new Set(cycleSubs.filter(s => s.statusId === 'approved').map(s => s.reportType));
        return submissionTypes.filter(type => {
            if (approvedSet.has(type)) return false;
            if (type === 'Risk and Opportunity Action Plan' && isActionPlanNA) return false;
            return true;
        });
    };

    const missingFirst = getMissingOrUnapproved(firstSubs, isFirstActionPlanNA, 'first');
    const missingFinal = getMissingOrUnapproved(finalSubs, isFinalActionPlanNA, 'final');

    const approved = unitSubmissions.filter(s => s.statusId === 'approved').length;
    const pending = unitSubmissions.filter(s => s.statusId === 'submitted').length;
    const rejected = unitSubmissions.filter(s => s.statusId === 'rejected').length;
    
    const isFirstActive = isCycleActive('first', selectedYear, allCycles);
    const isFinalActive = isCycleActive('final', selectedYear, allCycles);
    let totalPossible = 0;
    if (isFirstActive) totalPossible += submissionTypes.length - (isFirstActionPlanNA ? 1 : 0);
    if (isFinalActive) totalPossible += submissionTypes.length - (isFinalActionPlanNA ? 1 : 0);
    
    const missingTotal = Math.max(0, totalPossible - approved - pending - rejected);

    const chartData = [
        { name: 'Approved', value: approved, fill: STATUS_COLORS.Approved },
        { name: 'Awaiting Approval', value: pending, fill: STATUS_COLORS['Awaiting Approval'] },
        { name: 'Rejected', value: rejected, fill: STATUS_COLORS.Rejected },
        { name: 'Missing', value: missingTotal, fill: STATUS_COLORS.Missing }
    ].filter(d => d.value >= 0);

    const score = Math.round((approved / (totalPossible || 1)) * 100);

    return { 
        firstCycle: firstSubs, 
        finalCycle: finalSubs, 
        isFirstActionPlanNA, 
        isFinalActionPlanNA, 
        missingFirst, 
        missingFinal, 
        chartData, 
        score, 
        totalPossible, 
        approved,
        allUnitSubmissions: unitSubmissions
    };
  }, [selectedUnitId, selectedCampusId, allSubmissions, selectedYear, allCycles]);

  const handlePrintUnitNotice = (type: 'Compliance' | 'Non-Compliance') => {
    if (!unitData || !selectedUnitId || !allUnits || !selectedCampusId || !allCampuses) return;

    const unit = allUnits.find(u => u.id === selectedUnitId);
    const campus = allCampuses.find(c => c.id === selectedCampusId);

    const props = {
        unitName: unit?.name || 'Unknown Unit',
        campusName: campus?.name || 'Institutional Campus',
        year: Number(selectedYear),
        missingFirst: unitData.missingFirst,
        missingFinal: unitData.missingFinal,
        totalApproved: unitData.approved,
        totalPossible: unitData.totalPossible,
        qaoDirector: signatories?.qaoDirector || '____________________',
        qmsHead: signatories?.qmsHead || 'QMS Head'
    };

    try {
        const reportHtml = renderToStaticMarkup(type === 'Compliance' ? <NoticeOfCompliance {...props} /> : <NoticeOfNonCompliance {...props} />);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <html>
                    <head>
                        <title>QA Unit Notice - ${unit?.name}</title>
                        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                        <style>
                            @page { 
                                size: 8.5in 13in !important; 
                                margin: 0.5in !important; 
                            }
                            @media print { 
                                body { background: white; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; } 
                                .no-print { display: none !important; } 
                            } 
                            body { font-family: serif; background: #f9fafb; padding: 40px; color: black; font-size: 11pt; }
                        </style>
                    </head>
                    <body>
                        <div class="no-print mb-8 flex justify-center">
                            <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl font-black uppercase text-xs tracking-widest transition-all">Click to Print Folio Notice</button>
                        </div>
                        <div id="print-content">
                            ${reportHtml}
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) { console.error("Print error:", err); }
  };

  const handlePrintCampusNotice = (type: 'Compliance' | 'Non-Compliance') => {
    if (!campusSummary || !selectedCampusId || !allCampuses) return;

    const campus = allCampuses.find(c => c.id === selectedCampusId);
    const props = {
        campusName: campus?.name || 'Institutional Campus',
        year: Number(selectedYear),
        qaoDirector: signatories?.qaoDirector || '____________________',
        qmsHead: signatories?.qmsHead || 'QMS Head',
        units: campusSummary.unitPerformance
    };

    try {
        const reportHtml = renderToStaticMarkup(type === 'Compliance' ? <CampusNoticeOfCompliance {...props} /> : <CampusNoticeOfNonCompliance {...props} />);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <html>
                    <head>
                        <title>QA Campus Notice - ${campus?.name}</title>
                        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                        <style>
                            @page { 
                                size: 8.5in 13in !important; 
                                margin: 0.5in !important; 
                            }
                            @media print { 
                                body { background: white; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; } 
                                .no-print { display: none !important; } 
                            } 
                            body { font-family: serif; background: #f9fafb; padding: 40px; color: black; font-size: 11pt; }
                        </style>
                    </head>
                    <body>
                        <div class="no-print mb-8 flex justify-center">
                            <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl font-black uppercase text-xs tracking-widest transition-all">Click to Print Folio Notice</button>
                        </div>
                        <div id="print-content">
                            ${reportHtml}
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) { console.error("Print error:", err); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-tight">Institutional Site Matrix</h3>
            <p className="text-xs text-muted-foreground">Comprehensive documentation tracking across all university campuses.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 px-4 font-black uppercase text-[10px] tracking-widest bg-white border-primary/20 text-primary hover:bg-primary/5"
          onClick={() => setIsSidebarVisible(!isSidebarVisible)}
        >
          {isSidebarVisible ? <PanelLeftClose className="mr-2 h-4 w-4" /> : <PanelLeftOpen className="mr-2 h-4 w-4" />}
          {isSidebarVisible ? 'Hide Directory' : 'Show Directory'}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-16rem)]">
        <div className={cn(
          "transition-all duration-300 overflow-hidden flex flex-col gap-2",
          isSidebarVisible ? "w-full lg:w-1/4 opacity-100" : "w-0 opacity-0 lg:-mr-6"
        )}>
          <Card className="flex flex-col h-full shadow-sm border-primary/10 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-4 shrink-0 space-y-4">
              <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Institutional Scope</CardTitle>
                  <Info className="h-4 w-4 text-primary opacity-40" />
              </div>
              
              {/* ADMIN SIDEBAR FILTERS */}
              <div className="space-y-3">
                  <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        placeholder="Search unit name..." 
                        value={sidebarSearch}
                        onChange={(e) => setSidebarSearch(e.target.value)}
                        className="h-8 pl-8 text-[10px] bg-white border-primary/10"
                      />
                  </div>
                  <Select value={sidebarCampusFilter} onValueChange={setSidebarCampusFilter}>
                      <SelectTrigger className="h-8 text-[10px] font-black uppercase bg-white border-primary/10">
                          <div className="flex items-center gap-1.5"><Filter className="h-3 w-3 opacity-50" /><SelectValue placeholder="All Sites" /></div>
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all" className="text-[10px] font-black">All Campuses</SelectItem>
                          {allCampuses?.map(c => <SelectItem key={c.id} value={c.id} className="text-[10px] font-bold">{c.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <Accordion type="multiple" className="w-full" defaultValue={campusGroups.map(c => c.id)}>
                  {campusGroups.map(campus => (
                    <AccordionItem key={campus.id} value={campus.id} className="border-none">
                      <AccordionTrigger 
                        className="px-4 py-3 hover:no-underline hover:bg-muted/50 text-[11px] font-black uppercase tracking-tight text-primary"
                        onClick={() => { setSelectedCampusId(campus.id); setSelectedUnitId(null); }}
                      >
                        <div className="flex items-center gap-2">
                          <School className="h-3.5 w-3.5" />
                          {campus.name}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="flex flex-col">
                          <Button
                            variant="ghost"
                            onClick={() => { setSelectedCampusId(campus.id); setSelectedUnitId(null); }}
                            className={cn(
                                "w-full justify-start text-left h-auto py-2.5 px-8 text-[10px] font-black uppercase rounded-none border-l-2 mb-1",
                                selectedCampusId === campus.id && !selectedUnitId
                                    ? "bg-primary/10 text-primary border-primary"
                                    : "border-transparent text-primary/60 hover:text-primary"
                            )}
                          >
                            <TrendingUp className="h-3 w-3 mr-3" />
                            Site Performance Overview
                          </Button>

                          {campus.units.map(unit => (
                            <Button
                              key={unit.id}
                              variant="ghost"
                              onClick={() => { setSelectedCampusId(campus.id); setSelectedUnitId(unit.id); }}
                              className={cn(
                                "w-full justify-start text-left h-auto py-2.5 px-8 text-xs rounded-none border-l-2",
                                selectedUnitId === unit.id 
                                  ? "bg-primary/5 text-primary border-primary font-bold shadow-inner" 
                                  : "border-transparent text-muted-foreground"
                              )}
                            >
                              <Building className="h-3 w-3 mr-3 opacity-40" />
                              <span className="truncate">{unit.name}</span>
                            </Button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {campusGroups.length === 0 && (
                    <div className="p-10 text-center text-muted-foreground opacity-40">
                        <Search className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase">No matching units</p>
                    </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 min-0 flex flex-col relative">
          <Button
            variant="secondary"
            size="icon"
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full border shadow-md hidden lg:flex hover:bg-primary hover:text-white transition-colors"
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            title={isSidebarVisible ? "Hide Directory" : "Show Directory"}
          >
            {isSidebarVisible ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          {selectedUnitId && unitData && unitMap.get(selectedUnitId) ? (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                    <div className="space-y-1">
                        <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">{unitMap.get(selectedUnitId)}</h3>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5" /> AY {selectedYear}</span>
                        </div>
                    </div>
                    <Button size="sm" variant="outline" className={cn("h-9 text-[10px] font-black uppercase shadow-sm bg-white", unitData.score >= 100 ? "text-emerald-600 border-emerald-200" : "text-rose-600 border-rose-200")} onClick={() => handlePrintUnitNotice(unitData.score >= 100 ? 'Compliance' : 'Non-Compliance')}>
                        <Printer className="h-4 w-4 mr-2" /> Print {unitData.score >= 100 ? 'Compliance' : 'Non-Compliance'} Notice
                    </Button>
                </div>

                <StrategicSwotAnalysis 
                    submissions={unitData.allUnitSubmissions}
                    risks={campusRisks?.filter(r => r.unitId === selectedUnitId) || []}
                    monitoringRecords={campusMonitoring?.filter(r => r.unitId === selectedUnitId) || []}
                    programCompliances={campusCompliances?.filter(c => c.unitId === selectedUnitId) || []}
                    auditFindings={unitScopeFindings}
                    correctiveActionRequests={campusCars?.filter(c => c.unitId === selectedUnitId) || []}
                    mrOutputs={mrOutputs?.filter(o => o.assignments?.some(a => a.unitId === selectedUnitId)) || []}
                    scope="unit"
                    name={unitMap.get(selectedUnitId) || 'Unit'}
                    selectedYear={Number(selectedYear)}
                    cycles={allCycles}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 flex flex-col items-center justify-center bg-background rounded-2xl border-primary/10 shadow-lg p-8">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 text-center">Unit Verified Maturity</span>
                        <ChartContainer config={{}} className="h-[180px] w-[180px]">
                            <ResponsiveContainer>
                                <PieChart>
                                    <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                    <Pie data={unitData.chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                        {unitData.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill || '#cbd5e1'} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                        <div className="mt-6 text-center space-y-1">
                            <span className="text-5xl font-black tabular-nums tracking-tighter text-primary">{unitData.score}%</span>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.1em]">Quality Achievement Index</p>
                        </div>
                    </Card>

                    <div className="md:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Card className="shadow-none border-dashed bg-primary/5 border-primary/20 p-5">
                                <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-primary" /><span className="text-[10px] font-black uppercase text-primary/70">Verified Archive</span></div>
                                <p className="text-3xl font-black text-primary">{unitData.approved} / {unitData.totalPossible}</p>
                                <p className="text-[11px] text-muted-foreground mt-2 font-medium">Documents approved for this cycle.</p>
                            </Card>
                            <Card className={cn("shadow-none border-dashed p-5", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200")}>
                                <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-rose-600" /><span className="text-[10px] font-black uppercase text-rose-700">Outstanding Gaps</span></div>
                                <p className="text-3xl font-black text-rose-600">{unitData.missingFirst.length + unitData.missingFinal.length} Items</p>
                                <p className="text-[11px] text-muted-foreground mt-2 font-medium">Requirements missing or rejected.</p>
                            </Card>
                        </div>
                        <div className="p-4 bg-muted/10 border rounded-xl flex items-start gap-3">
                            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-[10px] text-muted-foreground italic leading-tight">
                                <strong>Analytical Perspecive:</strong> Data roll-up for {selectedYear}.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-4 h-6 font-black text-[10px] uppercase">1st Cycle Submission Registry</Badge>
                        </div>
                        <UnitTable 
                            cycleSubs={unitData.firstCycle} 
                            onView={(id) => router.push(`/submissions/${id}`)}
                            isAdmin={isGlobalAdmin}
                            onDeleteClick={onDeleteClick}
                        />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-4 h-6 font-black text-[10px] uppercase">Final Cycle Submission Registry</Badge>
                        </div>
                        <UnitTable 
                            cycleSubs={unitData.finalCycle} 
                            onView={(id) => router.push(`/submissions/${id}`)}
                            isAdmin={isGlobalAdmin}
                            onDeleteClick={onDeleteClick}
                        />
                    </div>
                </div>
              </div>
            </ScrollArea>
          ) : selectedCampusId && campusSummary ? (
            <ScrollArea className="h-full pr-4">
                <div className="space-y-8 animate-in fade-in duration-500 pb-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                        <div className="space-y-1">
                            <h3 className="font-black text-2xl uppercase tracking-tight text-primary">{campusMap.get(selectedCampusId)}</h3>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Site Performance Dashboard & bull; AY {selectedYear}</p>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 text-[10px] font-black uppercase bg-white border-primary/20 text-primary shadow-sm"
                            onClick={() => handlePrintCampusNotice(campusSummary.avgScore >= 100 ? 'Compliance' : 'Non-Compliance')}
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Print Consolidated Notice
                        </Button>
                    </div>

                    <StrategicSwotAnalysis 
                        submissions={campusSummary.allCampusSubmissions}
                        risks={campusRisks || []}
                        monitoringRecords={campusMonitoring || []}
                        programCompliances={campusCompliances || []}
                        auditFindings={campusScopeFindings}
                        correctiveActionRequests={campusCars || []}
                        mrOutputs={mrOutputs?.filter(o => o.assignments?.some(a => a.campusId === selectedCampusId)) || []}
                        scope="campus"
                        name={campusMap.get(selectedCampusId) || 'Campus'}
                        selectedYear={Number(selectedYear)}
                        cycles={allCycles}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-1 border-primary/10 shadow-lg p-8 bg-gradient-to-br from-primary/10 to-background flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="h-20 w-20" /></div>
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/60 mb-6">Site Maturity Index</span>
                            <div className="relative h-40 w-40">
                                <svg className="h-full w-full" viewBox="0 0 100 100">
                                    <circle className="text-muted stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                                    <circle className="text-primary stroke-current" strokeWidth="8" strokeDasharray={`${campusSummary.avgScore * 2.51} 251.2`} strokeLinecap="round" fill="transparent" r="40" cx="50" cy="50" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
                                    <text x="50" y="55" fontFamily="sans-serif" fontWeight="900" fontSize="20" textAnchor="middle" fill="currentColor" className="text-primary">{campusSummary.avgScore}%</text>
                                </svg>
                            </div>
                            <p className="mt-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Average Across {campusSummary.totalUnits} Units</p>
                        </Card>
                    </div>
                </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-muted-foreground border-dashed border-2 rounded-2xl bg-muted/5 animate-in fade-in duration-500">
                <School className="h-12 w-12 opacity-10 mb-2" />
                <p className="text-sm font-bold uppercase tracking-widest">Select an Institutional Site</p>
                <p className="text-xs max-w-xs">Browse the campus directory on the left to view comprehensive site performance SWOT.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UnitTable({ cycleSubs, onView, isAdmin, onDeleteClick }: { cycleSubs: Submission[], onView: (id: string) => void, isAdmin?: boolean, onDeleteClick?: (sub: Submission) => void }) {
    if (cycleSubs.length === 0) return <div className="rounded-xl border border-dashed p-8 text-center bg-muted/5"><p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-40">No entries recorded</p></div>;
    return (
        <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow><TableHead className="text-[10px] font-black uppercase pl-6 py-3">Report Details</TableHead><TableHead className="text-center text-[10px] font-black uppercase py-3">Status</TableHead><TableHead className="text-right text-[10px] font-black uppercase pr-6 py-3">Action</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                    {cycleSubs.map(sub => (
                        <TableRow key={sub.id} className={cn("transition-colors group", getYearCycleRowColor(sub.year, sub.cycleId))}>
                            <TableCell className="pl-6 py-4"><div className="flex flex-col gap-1"><span className="font-bold text-sm text-slate-900">{sub.reportType}</span><span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">{sub.controlNumber}</span></div></TableCell>
                            <TableCell className="text-center"><Badge className={cn("capitalize font-black text-[9px] px-2 py-0.5 border-none shadow-sm", sub.statusId === 'approved' && "bg-emerald-600 text-white", sub.statusId === 'rejected' && "bg-rose-600 text-white", sub.statusId === 'submitted' && "bg-amber-50 text-amber-950")}>{sub.statusId === 'submitted' ? 'AWAITING' : sub.statusId.toUpperCase()}</Badge></TableCell>
                            <TableCell className="text-right pr-6 space-x-2">
                                <Button variant="default" size="sm" onClick={() => onView(sub.id)} className="h-8 text-[10px] font-bold bg-primary shadow-sm">VIEW RECORD</Button>
                                {isAdmin && onDeleteClick && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDeleteClick(sub)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
