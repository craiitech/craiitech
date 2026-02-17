'use client';

import { useState, useMemo } from 'react';
import type { Submission, Unit, User as AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Building, Eye, Calendar as CalendarIcon, Filter, FileWarning, CheckCircle2, PieChart as PieIcon, AlertTriangle } from 'lucide-react';
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

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline'
};

const COLORS: Record<string, string> = {
    Approved: 'hsl(var(--chart-2))',
    'Awaiting Approval': 'hsl(var(--chart-1))',
    Missing: 'hsl(var(--destructive))',
    Rejected: 'hsl(var(--chart-3))',
};

const getYearCycleRowColor = (year: number, cycle: string) => {
  const isFinal = cycle.toLowerCase() === 'final';
  const colors: Record<number, { first: string, final: string }> = {
    2024: { 
      first: 'bg-blue-50/20 hover:bg-blue-100/40 dark:bg-blue-900/5 dark:hover:bg-blue-900/10', 
      final: 'bg-blue-100/40 hover:bg-blue-200/50 dark:bg-blue-900/20 dark:hover:bg-blue-900/30' 
    },
    2025: { 
      first: 'bg-green-50/20 hover:bg-green-100/40 dark:bg-green-900/5 dark:hover:bg-green-900/10', 
      final: 'bg-green-100/40 hover:bg-green-200/50 dark:bg-green-900/20 dark:hover:bg-green-900/30' 
    },
    2026: { 
      first: 'bg-amber-50/20 hover:bg-amber-100/40 dark:bg-amber-900/5 dark:hover:bg-amber-900/10', 
      final: 'bg-amber-100/40 hover:bg-amber-200/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/30' 
    },
    2027: { 
      first: 'bg-purple-50/20 hover:bg-purple-100/40 dark:bg-purple-900/5 dark:hover:bg-purple-900/10', 
      final: 'bg-purple-100/40 hover:bg-purple-200/50 dark:bg-purple-900/20 dark:hover:bg-purple-900/30' 
    },
    2028: { 
      first: 'bg-rose-50/20 hover:bg-rose-100/40 dark:bg-rose-900/5 dark:hover:bg-rose-900/10', 
      final: 'bg-rose-100/40 hover:bg-rose-200/50 dark:bg-rose-900/20 dark:hover:bg-rose-900/30' 
    },
  };
  
  const yearColor = colors[year] || { 
    first: 'bg-slate-50/20 hover:bg-slate-100/40 dark:bg-slate-900/5 dark:hover:bg-slate-900/10', 
    final: 'bg-slate-100/40 hover:bg-slate-200/50 dark:bg-slate-900/20 dark:hover:bg-slate-900/30' 
  };
  
  return isFinal ? yearColor.final : yearColor.first;
};


interface UnitSubmissionsViewProps {
  allSubmissions: Submission[] | null;
  allUnits: Unit[] | null;
  userProfile: AppUser | null;
  isLoading: boolean;
}

export function UnitSubmissionsView({
  allSubmissions,
  allUnits,
  userProfile,
  isLoading,
}: UnitSubmissionsViewProps) {
  const router = useRouter();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const availableYears = useMemo(() => {
    if (!allSubmissions) return [new Date().getFullYear().toString()];
    const years = Array.from(new Set(allSubmissions.map(s => s.year.toString())));
    if (years.length === 0) return [new Date().getFullYear().toString()];
    return years.sort((a,b) => b.localeCompare(a));
  }, [allSubmissions]);

  const unitsToShow = useMemo(() => {
    if (!allUnits || !userProfile?.campusId) {
      return [];
    }
    return allUnits
        .filter(u => u.campusIds?.includes(userProfile.campusId))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUnits, userProfile]);

  const unitData = useMemo(() => {
    if (!selectedUnitId || !allSubmissions || !userProfile?.campusId) {
      return null;
    }
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

    // Performance Data for Chart
    const approved = yearSubmissions.filter(s => s.statusId === 'approved').length;
    const pending = yearSubmissions.filter(s => s.statusId === 'submitted').length;
    const rejected = yearSubmissions.filter(s => s.statusId === 'rejected').length;
    
    // Denominator exclusion logic: Only count things that are NOT N/A
    const totalPossible = (submissionTypes.length * 2) - (isFirstActionPlanNA ? 1 : 0) - (isFinalActionPlanNA ? 1 : 0);
    const missingTotal = Math.max(0, totalPossible - approved - pending - rejected);

    const chartData = [
        { name: 'Approved', value: approved },
        { name: 'Awaiting Approval', value: pending },
        { name: 'Rejected', value: rejected },
        { name: 'Missing', value: missingTotal }
    ].filter(d => d.value > 0);

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
    };
  }, [selectedUnitId, allSubmissions, userProfile, selectedYear]);
  
  const handleUnitSelect = (unitId: string) => {
    setSelectedUnitId(unitId);
  }

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <CardTitle>Unit Submissions Monitoring</CardTitle>
            <CardDescription>
            Performance is calculated based on <strong>Approved</strong> documents. N/A reports are excluded from the score.
            </CardDescription>
        </div>
        <div className="flex items-center gap-2">
            <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground block">View Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <ScrollArea className="h-[75vh] rounded-md border bg-muted/5">
                 {unitsToShow.length > 0 ? (
                    <div className="p-2 space-y-1">
                        {unitsToShow.map(unit => (
                        <Button
                            key={unit.id}
                            variant="ghost"
                            onClick={() => handleUnitSelect(unit.id)}
                            className={cn(
                                "w-full justify-start text-left h-auto py-2.5 px-4 text-xs",
                                selectedUnitId === unit.id && "bg-primary/10 text-primary font-bold shadow-sm"
                            )}
                        >
                            <Building className="mr-3 h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{unit.name}</span>
                        </Button>
                    ))}
                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-2">
                        <Filter className="h-8 w-8 text-muted-foreground opacity-20" />
                        <p className="text-xs text-muted-foreground font-medium">No units found assigned to your site.</p>
                    </div>
                 )}
            </ScrollArea>
          </div>

          <div className="md:col-span-2">
            <ScrollArea className="h-[75vh] rounded-md border p-4 bg-muted/5">
                {selectedUnitId && unitData ? (
                    <div className="space-y-8 pb-10">
                        {/* --- UNIT PERFORMANCE SCORECARD --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 border-b pb-6">
                            <div className="lg:col-span-1 flex flex-col items-center justify-center bg-background rounded-lg border shadow-sm p-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-5"><PieIcon className="h-12 w-12" /></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Verified Maturity</span>
                                <ChartContainer config={{}} className="h-[120px] w-[120px]">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                                            <Pie
                                                data={unitData.chartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={35}
                                                outerRadius={50}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {unitData.chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#cbd5e1'} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                                <div className="mt-2 text-center">
                                    <span className="text-2xl font-black tabular-nums tracking-tighter">{unitData.score}%</span>
                                    <p className="text-[9px] font-bold text-green-600 uppercase">Target: 100%</p>
                                </div>
                            </div>

                            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                                <Card className="shadow-none border-dashed bg-muted/20">
                                    <CardHeader className="p-4 pb-2">
                                        <CardDescription className="text-[9px] font-black uppercase tracking-widest">Compliance Status</CardDescription>
                                        <CardTitle className="text-xl font-black text-primary">
                                            {unitData.approved} / {unitData.totalPossible}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <p className="text-[10px] text-muted-foreground leading-tight">Total verified and <strong>Approved</strong> documents for {selectedYear}.</p>
                                    </CardContent>
                                </Card>
                                <Card className={cn("shadow-none border-dashed", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200")}>
                                    <CardHeader className="p-4 pb-2">
                                        <CardDescription className={cn("text-[9px] font-black uppercase tracking-widest", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "text-red-700" : "text-green-700")}>Action Items</CardDescription>
                                        <CardTitle className={cn("text-xl font-black", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "text-red-600" : "text-green-600")}>
                                            {unitData.missingFirst.length + unitData.missingFinal.length} Required
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <p className="text-[10px] text-muted-foreground leading-tight">Documents awaiting upload or final approval.</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* --- CRITICAL GAPS SECTION --- */}
                        {(unitData.missingFirst.length > 0 || unitData.missingFinal.length > 0) && (
                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-destructive">
                                    <FileWarning className="h-4 w-4" /> 
                                    Institutional Compliance Gaps
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {unitData.missingFirst.length > 0 && (
                                        <div className="bg-destructive/5 rounded-lg p-4 border border-destructive/10">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-destructive mb-3">1st Cycle To-Do</p>
                                            <ul className="space-y-1.5">
                                                {unitData.missingFirst.map(doc => (
                                                    <li key={doc} className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                                                        <AlertTriangle className="h-3 w-3 text-amber-500" /> {doc}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {unitData.missingFinal.length > 0 && (
                                        <div className="bg-destructive/5 rounded-lg p-4 border border-destructive/10">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-destructive mb-3">Final Cycle To-Do</p>
                                            <ul className="space-y-1.5">
                                                {unitData.missingFinal.map(doc => (
                                                    <li key={doc} className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                                                        <AlertTriangle className="h-3 w-3 text-amber-500" /> {doc}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {unitData.missingFirst.length === 0 && unitData.missingFinal.length === 0 && (
                            <div className="bg-green-50 p-6 rounded-lg border border-green-100 text-center space-y-2">
                                <div className="mx-auto h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                </div>
                                <h4 className="font-black text-sm uppercase text-green-800">Operational Excellence</h4>
                                <p className="text-xs text-green-700/70 max-w-xs mx-auto">This unit has achieved 100% verified compliance for Academic Year {selectedYear}.</p>
                            </div>
                        )}

                        {/* --- DETAILED LOG TABLES --- */}
                        <div className="space-y-6 pt-4">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                                <CalendarIcon className="h-4 w-4" /> 
                                Submission History
                            </h4>
                            <div className="space-y-3">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[9px] font-black">First Submission Cycle</Badge>
                                <SubmissionTableForCycle submissions={unitData.firstCycle} onEyeClick={(id) => router.push(`/submissions/${id}`)} />
                            </div>
                            
                            <div className="space-y-3">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[9px] font-black">Final Submission Cycle</Badge>
                                <SubmissionTableForCycle submissions={unitData.finalCycle} onEyeClick={(id) => router.push(`/submissions/${id}`)} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-muted-foreground">
                        <Building className="h-12 w-12 opacity-10" />
                        <p className="text-sm font-medium">Select a unit from the site tree to see their performance summary.</p>
                    </div>
                )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function SubmissionTableForCycle({ submissions, onEyeClick }: { submissions: Submission[], onEyeClick: (id: string) => void }) {
    if (submissions.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center bg-muted/10">
                <p className="text-xs text-muted-foreground font-medium">No documents uploaded for this cycle.</p>
            </div>
        );
    }
    return (
         <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase">Report</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-center">Status</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {submissions.map(sub => (
                    <TableRow 
                      key={sub.id}
                      className={cn("transition-colors", getYearCycleRowColor(sub.year, sub.cycleId))}
                    >
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="font-bold text-xs">{sub.reportType}</span>
                                <span className="text-[9px] text-muted-foreground font-mono">{sub.controlNumber}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge 
                                className={cn(
                                    "capitalize font-black text-[9px] px-2 py-0 border-none shadow-sm",
                                    sub.statusId === 'approved' && "bg-emerald-600 text-white",
                                    sub.statusId === 'rejected' && "bg-rose-600 text-white",
                                    sub.statusId === 'submitted' && "bg-amber-500 text-amber-950",
                                )}
                            >
                                {sub.statusId === 'submitted' ? 'AWAITING' : sub.statusId.toUpperCase()}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                             <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => onEyeClick(sub.id)} 
                                className="h-7 text-[9px] font-bold bg-primary shadow-sm"
                            >
                                VIEW SUBMISSION
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
