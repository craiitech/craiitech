
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Submission, Unit, User as AppUser, Signatories, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
    Loader2, 
    Building, 
    Eye, 
    Calendar as CalendarIcon, 
    Filter, 
    FileWarning, 
    CheckCircle2, 
    PieChart as PieIcon, 
    AlertTriangle, 
    Printer, 
    FileText,
    Info,
    ShieldCheck,
    ChevronLeft,
    TrendingUp
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
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { renderToStaticMarkup } from 'react-dom/server';
import { NoticeOfCompliance, NoticeOfNonCompliance } from './notices-print-templates';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
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
      final: 'bg-amber-100/40 hover:bg-blue-200/50' 
    },
    2027: { 
      first: 'bg-purple-50/20 hover:bg-purple-100/40', 
      final: 'bg-purple-100/40 hover:bg-blue-200/50' 
    },
    2028: { 
      first: 'bg-rose-50/20 hover:bg-rose-100/40', 
      final: 'bg-rose-100/40 hover:bg-blue-200/50' 
    },
  };
  
  const yearColor = colors[year] || { 
    first: 'bg-slate-50/20 hover:bg-slate-100/40', 
    final: 'bg-slate-100/40 hover:bg-slate-200/50' 
  };
  
  return isFinal ? yearColor.final : yearColor.first;
};

interface UnitSubmissionsViewProps {
  allSubmissions: Submission[] | null;
  allUnits: Unit[] | null;
  allCampuses: Campus[] | null;
  userProfile: AppUser | null;
  isLoading: boolean;
  selectedYear: string;
}

export function UnitSubmissionsView({
  allSubmissions,
  allUnits,
  allCampuses,
  userProfile,
  isLoading,
  selectedYear,
}: UnitSubmissionsViewProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  useEffect(() => {
    if (userProfile?.unitId && !selectedUnitId) {
        setSelectedUnitId(userProfile.unitId);
    }
  }, [userProfile, selectedUnitId]);

  const unitsToShow = useMemo(() => {
    if (!allUnits || !userProfile?.campusId) return [];
    let filtered = allUnits.filter(u => u.campusIds?.includes(userProfile.campusId));
    const isUnitLevelOnly = userProfile.role === 'Unit Coordinator' || userProfile.role === 'Unit ODIMO';
    if (isUnitLevelOnly && userProfile.unitId) {
        filtered = filtered.filter(u => u.id === userProfile.unitId);
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [allUnits, userProfile]);

  const unitData = useMemo(() => {
    if (!selectedUnitId || !allSubmissions || !userProfile?.campusId) return null;
    
    const yearSubmissions = allSubmissions.filter(s => 
        s.unitId === selectedUnitId && 
        s.campusId === userProfile.campusId && 
        s.year.toString() === selectedYear
    );

    const firstSubs = yearSubmissions.filter(s => s.cycleId === 'first');
    const finalSubs = yearSubmissions.filter(s => s.cycleId === 'final');

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

    const approved = yearSubmissions.filter(s => s.statusId === 'approved').length;
    const pending = yearSubmissions.filter(s => s.statusId === 'submitted').length;
    const rejected = yearSubmissions.filter(s => s.statusId === 'rejected').length;
    
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
  }, [selectedUnitId, allSubmissions, userProfile, selectedYear]);

  const handlePrintNotice = (type: 'Compliance' | 'Non-Compliance') => {
    if (!unitData || !selectedUnitId || !allUnits || !userProfile || !allCampuses) return;
    const unit = allUnits.find(u => u.id === selectedUnitId);
    const campus = allCampuses.find(c => c.id === userProfile.campusId);
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
            printWindow.document.write(`<html><head><title>QA Notice</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print { body { margin: 0; padding: 0; background: white; } .no-print { display: none !important; } } body { font-family: serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Print Notice</button></div><div id="print-content">${reportHtml}</div></body></html>`);
            printWindow.document.close();
        }
    } catch (err) { console.error("Print error:", err); }
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Searchable Header Dropdown */}
      <Card className="border-primary/10 shadow-sm bg-muted/10">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full space-y-1.5">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest ml-1 flex items-center gap-1.5">
                    <Building className="h-3 w-3" /> Select Unit / Office to View Profile
                </label>
                <Select value={selectedUnitId || ""} onValueChange={setSelectedUnitId}>
                    <SelectTrigger className="bg-white h-11 font-bold shadow-sm">
                        <SelectValue placeholder="Select Unit..." />
                    </SelectTrigger>
                    <SelectContent>
                        {unitsToShow.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      {selectedUnitId && unitData ? (
          <div className="space-y-8 pb-20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                  <div className="space-y-1">
                      <h3 className="font-black text-xl uppercase tracking-tight text-primary">{allUnits?.find(u => u.id === selectedUnitId)?.name}</h3>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><CalendarIcon className="h-3 w-3" /> Monitoring Cycle: {selectedYear}</span>
                      </div>
                  </div>
                  <Button size="sm" variant="outline" className={cn("h-9 text-[10px] font-black uppercase shadow-sm bg-white", unitData.score >= 100 ? "text-emerald-600 border-emerald-200" : "text-rose-600 border-rose-200")} onClick={() => handlePrintNotice(unitData.score >= 100 ? 'Compliance' : 'Non-Compliance')}>
                      <Printer className="h-4 w-4 mr-2" /> Print {unitData.score >= 100 ? 'Compliance' : 'Non-Compliance'} Notice
                  </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1 flex flex-col items-center justify-center bg-background rounded-2xl border-primary/10 shadow-lg p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5"><PieIcon className="h-20 w-20" /></div>
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Unit Verified Maturity</span>
                      <ChartContainer config={{}} className="h-[180px] w-[180px]">
                          <ResponsiveContainer>
                              <PieChart>
                                  <Tooltip content={<ChartTooltipContent hideLabel />} />
                                  <Pie data={unitData.chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                      {unitData.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#cbd5e1'} />)}
                                  </Pie>
                              </PieChart>
                          </ResponsiveContainer>
                      </ChartContainer>
                      <div className="mt-6 text-center space-y-1">
                          <span className="text-5xl font-black tabular-nums tracking-tighter text-primary">{unitData.score}%</span>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.1em]">Quality Achievement Index</p>
                      </div>
                  </Card>

                  <div className="lg:col-span-2 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Card className="shadow-none border-dashed bg-primary/5 border-primary/20 p-5">
                              <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-primary" /><span className="text-[10px] font-black uppercase text-primary/70">Verified Archive</span></div>
                              <p className="text-3xl font-black text-primary">{unitData.approved} / {unitData.totalPossible}</p>
                              <p className="text-[11px] text-muted-foreground mt-2 font-medium">Documents successfully reviewed and approved for this cycle.</p>
                          </Card>
                          <Card className={cn("shadow-none border-dashed p-5", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200")}>
                              <div className="flex items-center gap-2 mb-2">{unitData.missingFirst.length + unitData.missingFinal.length > 0 ? <AlertTriangle className="h-4 w-4 text-rose-600" /> : <ShieldCheck className="h-4 w-4 text-emerald-600" />}<span className={cn("text-[10px] font-black uppercase", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "text-rose-700" : "text-emerald-700")}>Outstanding Gaps</span></div>
                              <p className={cn("text-3xl font-black", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "text-rose-600" : "text-emerald-600")}>{unitData.missingFirst.length + unitData.missingFinal.length} Items</p>
                              <p className="text-[11px] text-muted-foreground mt-2 font-medium">Requirements either missing or requiring corrective resubmission.</p>
                          </Card>
                      </div>

                      {(unitData.missingFirst.length > 0 || unitData.missingFinal.length > 0) && (
                          <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-rose-600"><FileWarning className="h-4 w-4" /> Compliance Gap Audit</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {unitData.missingFirst.length > 0 && (
                                      <div className="bg-rose-50/50 rounded-xl p-5 border border-rose-100">
                                          <p className="text-[9px] font-black uppercase text-rose-600 mb-3 bg-white w-fit px-2 py-0.5 rounded border border-rose-100">1st Cycle To-Do</p>
                                          <ul className="space-y-1.5">{unitData.missingFirst.map(doc => <li key={doc} className="flex items-center gap-2 text-[11px] font-bold text-slate-700"><div className="h-1 w-1 rounded-full bg-rose-400" /> {doc}</li>)}</ul>
                                      </div>
                                  )}
                                  {unitData.missingFinal.length > 0 && (
                                      <div className="bg-rose-50/50 rounded-xl p-5 border border-rose-100">
                                          <p className="text-[9px] font-black uppercase text-rose-600 mb-3 bg-white w-fit px-2 py-0.5 rounded border border-rose-100">Final Cycle To-Do</p>
                                          <ul className="space-y-1.5">{unitData.missingFinal.map(doc => <li key={doc} className="flex items-center gap-2 text-[11px] font-bold text-slate-700"><div className="h-1 w-1 rounded-full bg-rose-400" /> {doc}</li>)}</ul>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b pb-2"><CalendarIcon className="h-5 w-5 text-primary" /><h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Submission Registry Logs</h4></div>
                  <div className="space-y-8">
                      <div className="space-y-3"><Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-4 h-6 font-black text-[9px] uppercase">1st Cycle Registry</Badge><UnitTable cycleSubs={unitData.firstCycle} onView={(id) => router.push(`/submissions/${id}`)} /></div>
                      <div className="space-y-3"><Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-4 h-6 font-black text-[9px] uppercase">Final Cycle Registry</Badge><UnitTable cycleSubs={unitData.finalCycle} onView={(id) => router.push(`/submissions/${id}`)} /></div>
                  </div>
              </div>
          </div>
      ) : (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-muted-foreground py-20 border-dashed border-2 rounded-2xl">
              <Building className="h-12 w-12 opacity-10" />
              <p className="text-sm font-medium">Select a unit from the dropdown above to view its compliance history.</p>
          </div>
      )}
    </div>
  );
}

function UnitTable({ cycleSubs, onView }: { cycleSubs: Submission[], onView: (id: string) => void }) {
    if (cycleSubs.length === 0) return <div className="rounded-xl border border-dashed p-10 text-center bg-muted/5"><p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-40">No entries recorded</p></div>;
    return (
        <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow><TableHead className="text-[10px] font-black uppercase pl-6 py-3">Report Details</TableHead><TableHead className="text-center text-[10px] font-black uppercase py-3">Status</TableHead><TableHead className="text-right text-[10px] font-black uppercase pr-6 py-3">Action</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                    {cycleSubs.map(sub => (
                        <TableRow key={sub.id} className={cn("transition-colors", getYearCycleRowColor(sub.year, sub.cycleId))}>
                            <TableCell className="pl-6 py-4"><div className="flex flex-col gap-1"><span className="font-bold text-sm text-slate-900">{sub.reportType}</span><span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">{sub.controlNumber}</span></div></TableCell>
                            <TableCell className="text-center"><Badge className={cn("capitalize font-black text-[9px] px-2 py-0.5 border-none shadow-sm", sub.statusId === 'approved' && "bg-emerald-600 text-white", sub.statusId === 'rejected' && "bg-rose-600 text-white", sub.statusId === 'submitted' && "bg-amber-500 text-amber-950")}>{sub.statusId === 'submitted' ? 'AWAITING' : sub.statusId.toUpperCase()}</Badge></TableCell>
                            <TableCell className="text-right pr-6"><Button variant="default" size="sm" onClick={() => onView(sub.id)} className="h-8 text-[10px] font-bold bg-primary shadow-sm">VIEW RECORD</Button></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
