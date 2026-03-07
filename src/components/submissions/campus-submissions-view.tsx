
'use client';

import { useState, useMemo } from 'react';
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
    Calendar as CalendarIcon, 
    PieChart as PieIcon, 
    AlertTriangle, 
    CheckCircle2, 
    ShieldCheck, 
    Printer, 
    LayoutList,
    ChevronLeft,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen,
    Info,
    TrendingUp,
    Filter,
    FileWarning
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { renderToStaticMarkup } from 'react-dom/server';
import { NoticeOfCompliance, NoticeOfNonCompliance } from './notices-print-templates';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';

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
  const { userProfile } = useUser();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const unitMap = useMemo(() => new Map(allUnits?.map(u => [u.id, u.name])), [allUnits]);

  const campusGroups = useMemo(() => {
    if (!allCampuses || !allUnits) return [];
    
    return allCampuses.map(campus => ({
        ...campus,
        units: allUnits.filter(u => u.campusIds?.includes(campus.id)).sort((a,b) => a.name.localeCompare(b.name))
    })).filter(c => c.units.length > 0).sort((a,b) => a.name.localeCompare(b.name));
  }, [allCampuses, allUnits]);

  const unitData = useMemo(() => {
    if (!selectedUnitId || !allSubmissions) return null;
    
    const unitSubmissions = allSubmissions.filter(s => s.unitId === selectedUnitId && s.year.toString() === selectedYear);
    
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

    return { firstCycle: firstSubs, finalCycle: finalSubs, isFirstActionPlanNA, isFinalActionPlanNA, missingFirst, missingFinal, chartData, score, totalPossible, approved };
  }, [selectedUnitId, allSubmissions, selectedYear]);

  const handlePrintNotice = (type: 'Compliance' | 'Non-Compliance') => {
    if (!unitData || !selectedUnitId || !allUnits || !allCampuses) return;

    const unit = allUnits.find(u => u.id === selectedUnitId);
    const campus = allCampuses.find(c => unit?.campusIds?.includes(c.id));

    const props = {
        unitName: unit?.name || 'Unknown Unit',
        campusName: campus?.name || 'Institutional Campus',
        year: Number(selectedYear),
        missingFirst: unitData.missingFirst,
        missingFinal: unitData.missingFinal,
        totalApproved: unitData.approved,
        totalPossible: unitData.totalPossible,
        qaoDirector: signatories?.qaoDirector || 'DR. MARVIN RICK G. FORCADO',
        qmsHead: signatories?.qmsHead || 'QMS Head'
    };

    try {
        const reportHtml = renderToStaticMarkup(type === 'Compliance' ? <NoticeOfCompliance {...props} /> : <NoticeOfNonCompliance {...props} />);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`<html><head><title>QA Notice</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print { body { margin: 0; padding: 0; background: white; } .no-print { display: none !important; } } body { font-family: serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Print Official Notice</button></div><div id="print-content">${reportHtml}</div></body></html>`);
            printWindow.document.close();
        }
    } catch (err) { console.error("Print error:", err); }
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

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
          {isSidebarVisible ? 'Hide Units' : 'Show Units'}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-16rem)]">
        <div className={cn(
          "transition-all duration-300 overflow-hidden flex flex-col gap-2",
          isSidebarVisible ? "w-full lg:w-1/4 opacity-100" : "w-0 opacity-0 lg:-mr-6"
        )}>
          <Card className="flex flex-col h-full shadow-sm border-primary/10">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Institutional Scope</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <Accordion type="multiple" className="w-full" defaultValue={campusGroups.map(c => c.id)}>
                  {campusGroups.map(campus => (
                    <AccordionItem key={campus.id} value={campus.id} className="border-none">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 text-[11px] font-black uppercase tracking-tight text-primary">
                        <div className="flex items-center gap-2">
                          <School className="h-3.5 w-3.5" />
                          {campus.name}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="flex flex-col">
                          {campus.units.map(unit => (
                            <Button
                              key={unit.id}
                              variant="ghost"
                              onClick={() => setSelectedUnitId(unit.id)}
                              className={cn(
                                "w-full justify-start text-left h-auto py-2.5 px-8 text-xs rounded-none border-l-2",
                                selectedUnitId === unit.id 
                                  ? "bg-primary/5 text-primary border-primary font-bold" 
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
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 min-w-0 flex flex-col relative">
          <Button
            variant="secondary"
            size="icon"
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full border shadow-md hidden lg:flex hover:bg-primary hover:text-white transition-colors"
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            title={isSidebarVisible ? "Hide Units" : "Show Units"}
          >
            {isSidebarVisible ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          {selectedUnitId && unitData ? (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                    <div className="space-y-1">
                        <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">{unitMap.get(selectedUnitId)}</h3>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><CalendarIcon className="h-3 w-3" /> AY {selectedYear}</span>
                        </div>
                    </div>
                    <Button size="sm" variant="outline" className={cn("h-9 text-[10px] font-black uppercase shadow-sm bg-white", unitData.score >= 100 ? "text-emerald-600 border-emerald-200" : "text-rose-600 border-rose-200")} onClick={() => handlePrintNotice(unitData.score >= 100 ? 'Compliance' : 'Non-Compliance')}>
                        <Printer className="h-4 w-4 mr-2" /> Print {unitData.score >= 100 ? 'Compliance' : 'Non-Compliance'} Notice
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-1 flex flex-col items-center justify-center bg-background rounded-2xl border-primary/10 shadow-lg p-8">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 text-center">Unit Verified Maturity</span>
                        <ChartContainer config={{}} className="h-[180px] w-[180px]">
                            <ResponsiveContainer>
                                <PieChart>
                                    <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                    <Pie data={unitData.chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                        {unitData.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#cbd5e1'} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                        <div className="mt-6 text-center space-y-1">
                            <span className="text-5xl font-black tabular-nums tracking-tighter text-primary">{unitData.score}%</span>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.1em]">Goal Fulfilment</p>
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

                        {(unitData.missingFirst.length > 0 || unitData.missingFinal.length > 0) && (
                            <div className="space-y-4 bg-rose-50/30 p-5 rounded-xl border border-rose-100">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-rose-600"><FileWarning className="h-4 w-4" /> Compliance Gap Audit</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {unitData.missingFirst.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase text-rose-600 border-b border-rose-200 pb-1">1st Cycle Registry</p>
                                            <ul className="space-y-1.5">{unitData.missingFirst.map(doc => <li key={doc} className="flex items-center gap-2 text-[11px] font-bold text-slate-700"><div className="h-1 w-1 rounded-full bg-rose-400" /> {doc}</li>)}</ul>
                                        </div>
                                    )}
                                    {unitData.missingFinal.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase text-slate-500 underline mb-1">Missing (Final Cycle):</p>
                                            <ul className="list-disc pl-4 text-[10px] space-y-0.5">
                                                {unitData.missingFinal.map((m, i) => <li key={i}>{m}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b pb-2"><CalendarIcon className="h-5 w-5 text-primary" /><h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Submission History Logs</h4></div>
                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3"><Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-4 h-6 font-black text-[9px] uppercase">1st Cycle Logs</Badge><UnitTable cycleSubs={unitData.firstCycle} onView={(id) => router.push(`/submissions/${id}`)} isAdmin={isGlobalAdmin} onDeleteClick={onDeleteClick} /></div>
                        <div className="space-y-3"><Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-4 h-6 font-black text-[9px] uppercase">Final Cycle Logs</Badge><UnitTable cycleSubs={unitData.finalCycle} onView={(id) => router.push(`/submissions/${id}`)} isAdmin={isGlobalAdmin} onDeleteClick={onDeleteClick} /></div>
                    </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-muted-foreground border-dashed border-2 rounded-2xl bg-muted/5 animate-in fade-in duration-500">
                <Building className="h-12 w-12 opacity-10 mb-2" />
                <p className="text-sm font-bold uppercase tracking-widest">Select a Unit to Audit</p>
                <p className="text-xs max-w-xs">Browse the institutional directory on the left to view specific unit documentation profiles.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UnitTable({ cycleSubs, onView, isAdmin, onDeleteClick }: { cycleSubs: Submission[], onView: (id: string) => void, isAdmin: boolean, onDeleteClick: (sub: Submission) => void }) {
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
                            <TableCell className="text-center"><Badge className={cn("capitalize font-black text-[9px] px-2 py-0.5 border-none shadow-sm", sub.statusId === 'approved' && "bg-emerald-600 text-white", sub.statusId === 'rejected' && "bg-rose-600 text-white", sub.statusId === 'submitted' && "bg-amber-500 text-amber-950")}>{sub.statusId === 'submitted' ? 'AWAITING' : sub.statusId.toUpperCase()}</Badge></TableCell>
                            <TableCell className="text-right pr-6 space-x-2">
                                <Button variant="default" size="sm" onClick={() => onView(sub.id)} className="h-8 text-[10px] font-bold bg-primary shadow-sm">VIEW RECORD</Button>
                                {isAdmin && (
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
