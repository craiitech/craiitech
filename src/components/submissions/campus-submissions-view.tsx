
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Submission, Unit, Campus, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
    Loader2, 
    Building, 
    Eye, 
    School, 
    Trash2, 
    Download, 
    Filter, 
    Calendar as CalendarIcon, 
    PieChart as PieIcon, 
    AlertTriangle, 
    CheckCircle2, 
    FileWarning, 
    Printer, 
    LayoutList,
    ChevronLeft,
    ChevronRight,
    Info,
    ShieldCheck,
    Search,
    TrendingUp,
    Check
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { renderToStaticMarkup } from 'react-dom/server';
import { NoticeOfCompliance, NoticeOfNonCompliance, CampusNoticeOfCompliance, CampusNoticeOfNonCompliance } from './notices-print-templates';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline'
};

const COLORS: Record<string, string> = {
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
      final: 'bg-amber-100/40 hover:bg-amber-200/50' 
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
    final: 'bg-slate-100/40 hover:bg-slate-200/50' 
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
  const { userProfile, isAuditor, isVp } = useUser();
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const isInstitutionalViewer = isGlobalAdmin || isAuditor || isVp;

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  useEffect(() => {
    if (userProfile?.campusId && !isInstitutionalViewer && !selectedCampusId) {
        setSelectedCampusId(userProfile.campusId);
    }
  }, [userProfile, isInstitutionalViewer, selectedCampusId]);

  const campusesToShow = useMemo(() => {
    if (!allCampuses || !userProfile) return [];
    if (isInstitutionalViewer) return [...allCampuses].sort((a,b) => a.name.localeCompare(b.name));
    return allCampuses.filter(c => c.id === userProfile.campusId);
  }, [allCampuses, userProfile, isInstitutionalViewer]);
  
  const unitsInSelectedCampus = useMemo(() => {
    if (!selectedCampusId || !allUnits) return [];
    const targetCid = String(selectedCampusId).trim();
    return allUnits
        .filter(unit => unit.campusIds?.some(cid => String(cid).trim() === targetCid))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCampusId, allUnits]);

  /**
   * CAMPUS OVERVIEW DATA
   * Generates a summary of all units in the selected campus.
   */
  const campusSummary = useMemo(() => {
    if (!selectedCampusId || !allSubmissions || unitsInSelectedCampus.length === 0) return null;

    return unitsInSelectedCampus.map(unit => {
        const unitSubs = allSubmissions.filter(s => s.unitId === unit.id && s.campusId === selectedCampusId && s.year.toString() === selectedYear);
        
        const firstRegistry = unitSubs.find(s => s.reportType === 'Risk and Opportunity Registry' && s.cycleId === 'first');
        const finalRegistry = unitSubs.find(s => s.reportType === 'Risk and Opportunity Registry' && s.cycleId === 'final');
        const isFirstNA = firstRegistry?.riskRating === 'low';
        const isFinalNA = finalRegistry?.riskRating === 'low';

        const approvedCount = unitSubs.filter(s => s.statusId === 'approved').length;
        const totalPossible = (submissionTypes.length * 2) - (isFirstNA ? 1 : 0) - (isFinalNA ? 1 : 0);
        const score = Math.round((approvedCount / (totalPossible || 1)) * 100);

        return {
            id: unit.id,
            name: unit.name,
            score,
            approvedCount,
            totalPossible
        };
    });
  }, [selectedCampusId, allSubmissions, unitsInSelectedCampus, selectedYear]);

  const unitData = useMemo(() => {
    if (!selectedUnitId || !selectedCampusId || !allSubmissions) {
      return null;
    }
    const unitSubmissions = allSubmissions.filter(s => 
        s.unitId === selectedUnitId && 
        s.campusId === selectedCampusId && 
        s.year.toString() === selectedYear
    );

    const firstSubs = unitSubmissions.filter(s => s.cycleId === 'first');
    const finalSubs = unitSubmissions.filter(s => s.cycleId === 'final');

    const firstRegistry = firstSubs.find(s => s.reportType === 'Risk and Opportunity Registry');
    const isFirstActionPlanNA = firstRegistry?.riskRating === 'low';

    const finalRegistry = finalSubs.find(s => s.reportType === 'Risk and Opportunity Registry');
    const isFinalActionPlanNA = finalRegistry?.riskRating === 'low';

    const getMissingOrUnapproved = (cycleSubs: Submission[], isActionPlanNA: boolean) => {
        const approvedSet = new Set(cycleSubs.filter(s => s.statusId === 'approved').map(s => s.reportType));
        return submissionTypes.filter(type => {
            if (approvedSet.has(type)) return false;
            if (type === 'Risk and Opportunity Action Plan' && isActionPlanNA) return false;
            return true;
        });
    };

    const missingFirst = getMissingOrUnapproved(firstSubs, isFirstActionPlanNA);
    const missingFinal = getMissingOrUnapproved(finalSubs, isFinalActionPlanNA);

    const approved = unitSubmissions.filter(s => s.statusId === 'approved').length;
    const pending = unitSubmissions.filter(s => s.statusId === 'submitted').length;
    const rejected = unitSubmissions.filter(s => s.statusId === 'rejected').length;
    
    const totalPossible = (submissionTypes.length * 2) - (isFirstActionPlanNA ? 1 : 0) - (isFinalActionPlanNA ? 1 : 0);
    const missingTotal = Math.max(0, totalPossible - approved - pending - rejected);

    const chartData = [
        { name: 'Approved', value: approved },
        { name: 'Awaiting Approval', value: pending },
        { name: 'Rejected', value: rejected },
        { name: 'Missing', value: missingTotal }
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
        approved
    }
  }, [selectedUnitId, selectedCampusId, allSubmissions, selectedYear]);

  const handlePrintNotice = (type: 'Compliance' | 'Non-Compliance') => {
    if (!unitData || !selectedUnitId || !allUnits || !selectedCampusId || !allCampuses) return;

    const unit = allUnits.find(u => u.id === selectedUnitId);
    const campus = allCampuses.find(c => c.id === selectedCampusId);

    const props = {
        unitName: unit?.name || 'Unknown Unit',
        campusName: campus?.name || 'Unknown Campus',
        year: Number(selectedYear),
        missingFirst: unitData.missingFirst,
        missingFinal: unitData.missingFinal,
        totalApproved: unitData.approved,
        totalPossible: unitData.totalPossible,
        qaoDirector: signatories?.qaoDirector || 'DR. MARVIN RICK G. FORCADO',
        qmsHead: signatories?.qmsHead || 'QMS Head'
    };

    try {
        const reportHtml = renderToStaticMarkup(
            type === 'Compliance' ? <NoticeOfCompliance {...props} /> : <NoticeOfNonCompliance {...props} />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>QA Notice - ${props.unitName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print { body { margin: 0; padding: 0; background: white; } .no-print { display: none !important; } }
                        body { font-family: serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Official Notice</button>
                    </div>
                    <div id="print-content">${reportHtml}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print error:", err);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Top Selector Card - Strictly Horizontal and Full Width */}
      <Card className="border-primary/10 shadow-sm bg-muted/10 overflow-hidden">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest ml-1 flex items-center gap-1.5">
                        <School className="h-3 w-3" /> Step 1: Select Site / Campus
                    </label>
                    <Select value={selectedCampusId || ""} onValueChange={(val) => { setSelectedCampusId(val); setSelectedUnitId(null); }} disabled={!isInstitutionalViewer}>
                        <SelectTrigger className="bg-white h-10 font-bold">
                            <SelectValue placeholder="Select Campus..." />
                        </SelectTrigger>
                        <SelectContent>
                            {campusesToShow.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest ml-1 flex items-center gap-1.5">
                        <Building className="h-3 w-3" /> Step 2: Select Unit / Office (Optional)
                    </label>
                    <Select value={selectedUnitId || "none"} onValueChange={(val) => setSelectedUnitId(val === "none" ? null : val)} disabled={!selectedCampusId}>
                        <SelectTrigger className="bg-white h-10 font-bold">
                            <SelectValue placeholder="View Campus Summary" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none" className="italic text-muted-foreground">-- View Campus Summary Table --</SelectItem>
                            {unitsInSelectedCampus.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {selectedCampusId && (
                <div className="shrink-0 pt-5">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedCampusId(null); setSelectedUnitId(null); }} className="h-10 text-[10px] font-bold border-dashed uppercase">
                        Clear Filters
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>

      {/* Main Workspace Area */}
      {!selectedCampusId ? (
          <Card className="border-dashed py-24 flex flex-col items-center justify-center text-center bg-muted/5">
              <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mb-4">
                  <Filter className="h-10 w-10 text-muted-foreground opacity-20" />
              </div>
              <h3 className="font-black text-lg uppercase tracking-tight text-slate-900">Institutional Audit Hub</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto font-medium">Please select a campus site above to view consolidated compliance data or drill down into individual unit records.</p>
          </Card>
      ) : !selectedUnitId ? (
          /* --- CAMPUS SUMMARY VIEW --- */
          <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                      <h3 className="text-xl font-black uppercase tracking-tight text-primary flex items-center gap-3">
                          <TrendingUp className="h-6 w-6" />
                          {campusesToShow.find(c => c.id === selectedCampusId)?.name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Consolidated Compliance Overview &bull; AY {selectedYear}</p>
                  </div>
                  <Button variant="default" className="shadow-lg shadow-primary/20 h-10 font-black uppercase text-[10px] tracking-widest" onClick={() => router.push('/reports')}>
                      <LayoutList className="h-4 w-4 mr-2" />
                      Open Full Site Matrix
                  </Button>
              </div>

              <Card className="shadow-md border-primary/10 overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b py-4">
                      <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-primary" />
                              Unit Maturity Index
                          </CardTitle>
                          <Badge variant="outline" className="bg-white border-primary/20 text-primary font-black text-[10px] h-5">{campusSummary?.length || 0} UNITS RECORDED</Badge>
                      </div>
                  </CardHeader>
                  <CardContent className="p-0">
                      <Table>
                          <TableHeader className="bg-muted/50">
                              <TableRow>
                                  <TableHead className="font-black text-[10px] uppercase pl-8 py-3 w-[350px]">Academic / Administrative Unit</TableHead>
                                  <TableHead className="font-black text-[10px] uppercase text-center py-3">Maturity Score</TableHead>
                                  <TableHead className="font-black text-[10px] uppercase py-3">Verified Progress</TableHead>
                                  <TableHead className="text-right font-black text-[10px] uppercase pr-8 py-3">Action</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {campusSummary?.map(unit => (
                                  <TableRow key={unit.id} className="hover:bg-muted/20 transition-colors group">
                                      <TableCell className="pl-8 py-4">
                                          <div className="flex items-center gap-3">
                                              <Building className="h-4 w-4 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                                              <span className="text-sm font-bold text-slate-800">{unit.name}</span>
                                          </div>
                                      </TableCell>
                                      <TableCell className="text-center">
                                          <div className="flex flex-col items-center gap-1">
                                              <span className={cn("text-lg font-black tabular-nums leading-none", unit.score >= 80 ? "text-emerald-600" : unit.score >= 50 ? "text-amber-600" : "text-rose-600")}>
                                                  {unit.score}%
                                              </span>
                                              <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground">INDEX</span>
                                          </div>
                                      </TableCell>
                                      <TableCell className="w-[300px]">
                                          <div className="space-y-1.5">
                                              <Progress value={unit.score} className="h-1.5" />
                                              <p className="text-[9px] font-bold text-muted-foreground uppercase">{unit.approvedCount} of {unit.totalPossible} Documents Verified</p>
                                          </div>
                                      </TableCell>
                                      <TableCell className="text-right pr-8">
                                          <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest bg-white" onClick={() => setSelectedUnitId(unit.id)}>
                                              DRILL DOWN
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </CardContent>
              </Card>
          </div>
      ) : (
          /* --- INDIVIDUAL UNIT DRILL-DOWN --- */
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                  <div className="space-y-1">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUnitId(null)} className="h-6 -ml-2 text-[10px] font-black uppercase text-muted-foreground gap-1 hover:text-primary">
                          <ChevronLeft className="h-3 w-3" /> Back to Campus Summary
                      </Button>
                      <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">
                          {allUnits?.find(u => u.id === selectedUnitId)?.name}
                      </h3>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          <span className="flex items-center gap-1.5 text-primary"><School className="h-3 w-3" /> {campusMap.get(selectedCampusId) || '...'}</span>
                          <span className="flex items-center gap-1.5"><CalendarIcon className="h-3 w-3" /> AY {selectedYear}</span>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className={cn("h-9 text-[10px] font-black uppercase shadow-sm bg-white", unitData.score >= 100 ? "text-emerald-600 border-emerald-200" : "text-rose-600 border-rose-200")} onClick={() => handlePrintNotice(unitData.score >= 100 ? 'Compliance' : 'Non-Compliance')}>
                          <Printer className="h-4 w-4 mr-2" /> Print {unitData.score >= 100 ? 'Compliance' : 'Non-Compliance'} Notice
                      </Button>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1 flex flex-col items-center justify-center bg-background rounded-2xl border-primary/10 shadow-lg p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5"><PieIcon className="h-20 w-20" /></div>
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Unit Verified Maturity</span>
                      <ChartContainer config={{}} className="h-[180px] w-[180px]">
                          <ResponsiveContainer>
                              <PieChart>
                                  <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                  <Pie
                                      data={unitData.chartData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={45}
                                      outerRadius={65}
                                      paddingAngle={5}
                                      dataKey="value"
                                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                  >
                                      {unitData.chartData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#cbd5e1'} />
                                      ))}
                                  </Pie>
                              </PieChart>
                          </ResponsiveContainer>
                      </ChartContainer>
                      <div className="mt-6 text-center space-y-1">
                          <span className="text-5xl font-black tabular-nums tracking-tighter text-primary">{unitData.score}%</span>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.1em]">Quality Goal Met</p>
                      </div>
                  </Card>

                  <div className="lg:col-span-2 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Card className="shadow-none border-dashed bg-primary/5 flex flex-col h-full border-primary/20">
                              <CardHeader className="p-5 pb-2">
                                  <div className="flex items-center gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-primary" />
                                      <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary/70">Verified Archive</CardDescription>
                                  </div>
                                  <CardTitle className="text-3xl font-black text-primary pt-1">
                                      {unitData.approved} / {unitData.totalPossible}
                                  </CardTitle>
                              </CardHeader>
                              <CardContent className="p-5 pt-0">
                                  <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                                      Total number of documents successfully reviewed and approved by the Quality Assurance Office for the current monitoring cycle.
                                  </p>
                              </CardContent>
                          </Card>
                          
                          <Card className={cn("shadow-none border-dashed flex flex-col h-full", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200")}>
                              <CardHeader className="p-5 pb-2">
                                  <div className="flex items-center gap-2">
                                      {unitData.missingFirst.length + unitData.missingFinal.length > 0 ? <AlertTriangle className="h-4 w-4 text-rose-600" /> : <ShieldCheck className="h-4 w-4 text-emerald-600" />}
                                      <CardDescription className={cn("text-[10px] font-black uppercase tracking-widest", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "text-rose-700" : "text-emerald-700")}>Outstanding Gaps</CardDescription>
                                  </div>
                                  <CardTitle className={cn("text-3xl font-black pt-1", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "text-rose-600" : "text-emerald-600")}>
                                      {unitData.missingFirst.length + unitData.missingFinal.length} Items
                                  </CardTitle>
                              </CardHeader>
                              <CardContent className="p-5 pt-0">
                                  <p className={cn("text-[11px] leading-relaxed font-medium", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "text-rose-800/70" : "text-emerald-800/70")}>
                                      Documents either missing from the digital registry or currently rejected and requiring institutional correction.
                                  </p>
                              </CardContent>
                          </Card>
                      </div>

                      {/* --- GAP AUDIT PANEL --- */}
                      {(unitData.missingFirst.length > 0 || unitData.missingFinal.length > 0) && (
                          <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-rose-600">
                                  <FileWarning className="h-4 w-4" /> 
                                  Detailed Documentation Gap Audit
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {unitData.missingFirst.length > 0 && (
                                      <div className="bg-rose-50/50 rounded-xl p-5 border border-rose-100 shadow-inner">
                                          <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-4 bg-white w-fit px-2 py-0.5 rounded border border-rose-100">1st Submission Cycle</p>
                                          <ul className="space-y-2">
                                              {unitData.missingFirst.map(doc => (
                                                  <li key={doc} className="flex items-start gap-3 text-[11px] font-bold text-slate-700">
                                                      <div className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" /> {doc}
                                                  </li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}
                                  {unitData.missingFinal.length > 0 && (
                                      <div className="bg-rose-50/50 rounded-xl p-5 border border-rose-100 shadow-inner">
                                          <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-4 bg-white w-fit px-2 py-0.5 rounded border border-rose-100">Final Submission Cycle</p>
                                          <ul className="space-y-2">
                                              {unitData.missingFinal.map(doc => (
                                                  <li key={doc} className="flex items-start gap-3 text-[11px] font-bold text-slate-700">
                                                      <div className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" /> {doc}
                                                  </li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b pb-2">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Digital Registry Logs</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-8">
                      <div className="space-y-3">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 px-4 h-6 font-black text-[9px] uppercase tracking-widest">First Cycle Submissions</Badge>
                          <SubmissionTableForCycle submissions={unitData.firstCycle} onEyeClick={(id) => router.push(`/submissions/${id}`)} isAdmin={isGlobalAdmin} onDeleteClick={onDeleteClick} />
                      </div>
                      <div className="space-y-3">
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-4 h-6 font-black text-[9px] uppercase tracking-widest">Final Cycle Submissions</Badge>
                          <SubmissionTableForCycle submissions={unitData.finalCycle} onEyeClick={(id) => router.push(`/submissions/${id}`)} isAdmin={isGlobalAdmin} onDeleteClick={onDeleteClick} />
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
    </TooltipProvider>
  );
}


function SubmissionTableForCycle({ 
    submissions, 
    onEyeClick, 
    isAdmin, 
    onDeleteClick 
}: { 
    submissions: Submission[], 
    onEyeClick: (id: string) => void,
    isAdmin: boolean,
    onDeleteClick: (submission: Submission) => void
}) {
    if (submissions.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed p-12 text-center bg-muted/5">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-40">No Documentation Registry entries found</p>
            </div>
        );
    }
    return (
         <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Report Type & Control No.</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center py-3">Status</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase pr-6 py-3 w-[200px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {submissions.map(sub => (
                        <TableRow key={sub.id} className={cn("transition-colors group", getYearCycleRowColor(sub.year, sub.cycleId))}>
                            <TableCell className="pl-6 py-4">
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">{sub.reportType}</span>
                                    <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter truncate max-w-[250px]">{sub.controlNumber}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge 
                                    className={cn(
                                        "capitalize font-black text-[9px] px-2 py-0.5 border-none shadow-sm",
                                        sub.statusId === 'approved' && "bg-emerald-600 text-white",
                                        sub.statusId === 'rejected' && "bg-rose-600 text-white",
                                        sub.statusId === 'submitted' && "bg-amber-500 text-amber-950",
                                    )}
                                >
                                    {sub.statusId === 'submitted' ? 'AWAITING' : sub.statusId.toUpperCase()}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6 space-x-2 whitespace-nowrap">
                                <Button variant="outline" size="sm" onClick={() => onEyeClick(sub.id)} className="h-8 text-[10px] font-black bg-white shadow-sm border-primary/20 text-primary">
                                    VIEW RECORD
                                </Button>
                                {isAdmin && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onDeleteClick(sub)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
         </div>
    )
}
