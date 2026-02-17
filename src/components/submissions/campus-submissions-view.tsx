'use client';

import { useState, useMemo } from 'react';
import type { Submission, Unit, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Building, Eye, School, Trash2, Download, Filter, Calendar as CalendarIcon, PieChart as PieIcon, AlertTriangle, CheckCircle2, FileWarning } from 'lucide-react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
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
      final: 'bg-amber-100/40 hover:bg-blue-200/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/30' 
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

interface CampusSubmissionsViewProps {
  allSubmissions: Submission[] | null;
  allCampuses: Campus[] | null;
  allUnits: Unit[] | null;
  isLoading: boolean;
  isAdmin: boolean;
  onDeleteClick: (submission: Submission) => void;
}

export function CampusSubmissionsView({
  allSubmissions,
  allCampuses,
  allUnits,
  isLoading,
  isAdmin,
  onDeleteClick,
}: CampusSubmissionsViewProps) {
  const router = useRouter();
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const availableYears = useMemo(() => {
    if (!allSubmissions) return [new Date().getFullYear().toString()];
    const years = Array.from(new Set(allSubmissions.map(s => s.year.toString())));
    if (years.length === 0) return [new Date().getFullYear().toString()];
    return years.sort((a,b) => b.localeCompare(a));
  }, [allSubmissions]);

  const campusesToShow = useMemo(() => {
    if (!allCampuses) return [];
    return [...allCampuses].sort((a,b) => a.name.localeCompare(b.name));
  }, [allCampuses]);
  
  const unitsInSelectedCampus = useMemo(() => {
    if (!selectedCampusId || !allUnits) return [];
    const targetCid = String(selectedCampusId).trim();
    return allUnits
        .filter(unit => unit.campusIds?.some(cid => String(cid).trim() === targetCid))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCampusId, allUnits]);


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

    const getMissing = (cycleSubs: Submission[], isActionPlanNA: boolean) => {
        const submitted = new Set(cycleSubs.map(s => s.reportType));
        return submissionTypes.filter(type => {
            if (submitted.has(type)) return false;
            if (type === 'Risk and Opportunity Action Plan' && isActionPlanNA) return false;
            return true;
        });
    };

    const missingFirst = getMissing(firstSubs, isFirstActionPlanNA);
    const missingFinal = getMissing(finalSubs, isFinalActionPlanNA);

    // Performance Data for Chart
    const approved = unitSubmissions.filter(s => s.statusId === 'approved').length;
    const pending = unitSubmissions.filter(s => s.statusId === 'submitted').length;
    const rejected = unitSubmissions.filter(s => s.statusId === 'rejected').length;
    const missingTotal = missingFirst.length + missingFinal.length;

    const chartData = [
        { name: 'Approved', value: approved },
        { name: 'Awaiting Approval', value: pending },
        { name: 'Rejected', value: rejected },
        { name: 'Missing', value: missingTotal }
    ].filter(d => d.value > 0);

    const totalPossible = (submissionTypes.length * 2) - (isFirstActionPlanNA ? 1 : 0) - (isFinalActionPlanNA ? 1 : 0);
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
  
  const handleCampusSelect = (campusId: string) => {
    setSelectedCampusId(prev => (prev === campusId ? null : campusId));
    setSelectedUnitId(null);
  }
  
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
    <TooltipProvider>
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <CardTitle>Campus Submissions</CardTitle>
            <CardDescription>
            Select a campus and unit to view their complete submission history and performance analytics for the selected year.
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
                 {campusesToShow.length > 0 ? (
                    <Accordion type="single" collapsible value={selectedCampusId || ''} onValueChange={handleCampusSelect}>
                        {campusesToShow.map(campus => (
                            <AccordionItem value={campus.id} key={campus.id} className="border-b-0">
                                <AccordionTrigger 
                                    className="px-4 py-3 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/20"
                                >
                                    <div className="flex items-center gap-3">
                                        <School className="h-4 w-4 text-primary shrink-0" />
                                        <span className="font-bold text-xs uppercase tracking-tight">{campus.name}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-0 bg-background/50">
                                    <div className="flex flex-col">
                                    {unitsInSelectedCampus.map(unit => (
                                        <Button
                                            key={unit.id}
                                            variant="ghost"
                                            onClick={() => handleUnitSelect(unit.id)}
                                            className={cn(
                                                "w-full justify-start text-left h-auto py-2.5 px-8 text-xs rounded-none border-l-2",
                                                selectedUnitId === unit.id 
                                                    ? "bg-primary/5 text-primary border-primary font-bold" 
                                                    : "border-transparent text-muted-foreground"
                                            )}
                                        >
                                            <Building className="mr-3 h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{unit.name}</span>
                                        </Button>
                                    ))}
                                    {selectedCampusId === campus.id && unitsInSelectedCampus.length === 0 && (
                                        <div className="p-4 text-[10px] text-center text-muted-foreground italic">No units assigned to this campus.</div>
                                    )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-2">
                        <Filter className="h-8 w-8 text-muted-foreground opacity-20" />
                        <p className="text-xs text-muted-foreground font-medium">No campuses registered.</p>
                    </div>
                 )}
            </ScrollArea>
          </div>

          <div className="md:col-span-2">
            <ScrollArea className="h-[75vh] rounded-md border p-4 bg-muted/5">
                {selectedUnitId && unitData ? (
                    <div className="space-y-8 pb-10">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="space-y-1">
                                <h3 className="font-black text-lg uppercase tracking-tight text-primary">
                                    {allUnits?.find(u => u.id === selectedUnitId)?.name}
                                </h3>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                                    <CalendarIcon className="h-3 w-3" />
                                    Reporting Year: {selectedYear}
                                </div>
                            </div>
                        </div>

                        {/* --- UNIT PERFORMANCE SCORECARD --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-1 flex flex-col items-center justify-center bg-background rounded-lg border shadow-sm p-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-5"><PieIcon className="h-12 w-12" /></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Maturity Index</span>
                                <ChartContainer config={{}} className="h-[120px] w-[120px]">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
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
                                        <p className="text-[10px] text-muted-foreground leading-tight">Total verified and approved documents.</p>
                                    </CardContent>
                                </Card>
                                <Card className={cn("shadow-none border-dashed", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200")}>
                                    <CardHeader className="p-4 pb-2">
                                        <CardDescription className={cn("text-[9px] font-black uppercase tracking-widest", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "text-red-700" : "text-green-700")}>Action Required</CardDescription>
                                        <CardTitle className={cn("text-xl font-black", unitData.missingFirst.length + unitData.missingFinal.length > 0 ? "text-red-600" : "text-green-600")}>
                                            {unitData.missingFirst.length + unitData.missingFinal.length} Missing
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <p className="text-[10px] text-muted-foreground leading-tight">Reports yet to be submitted for this year.</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* --- CRITICAL GAPS SECTION --- */}
                        {(unitData.missingFirst.length > 0 || unitData.missingFinal.length > 0) && (
                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-destructive">
                                    <FileWarning className="h-4 w-4" /> 
                                    Institutional Gaps
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {unitData.missingFirst.length > 0 && (
                                        <div className="bg-destructive/5 rounded-lg p-4 border border-destructive/10">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-destructive mb-3">1st Cycle Gaps</p>
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
                                            <p className="text-[10px] font-black uppercase tracking-widest text-destructive mb-3">Final Cycle Gaps</p>
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
                                <p className="text-xs text-green-700/70 max-w-xs mx-auto">This unit has achieved 100% submission coverage for the Academic Year {selectedYear}.</p>
                            </div>
                        )}
                        
                        <div className="space-y-6 pt-4">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                                <CalendarIcon className="h-4 w-4" /> 
                                Submission History
                            </h4>
                            <div className="space-y-3">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[9px] font-black">First Submission Cycle</Badge>
                                <SubmissionTableForCycle 
                                    submissions={unitData.firstCycle} 
                                    onEyeClick={(id) => router.push(`/submissions/${id}`)}
                                    isAdmin={isAdmin}
                                    onDeleteClick={onDeleteClick}
                                />
                            </div>
                            
                            <div className="space-y-3">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[9px] font-black">Final Submission Cycle</Badge>
                                <SubmissionTableForCycle 
                                    submissions={unitData.finalCycle} 
                                    onEyeClick={(id) => router.push(`/submissions/${id}`)}
                                    isAdmin={isAdmin}
                                    onDeleteClick={onDeleteClick}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-muted-foreground">
                        <Building className="h-12 w-12 opacity-10" />
                        <p className="text-sm font-medium">Select a unit from the site tree to view report history and performance metrics.</p>
                    </div>
                )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
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
                    <TableHead className="text-[10px] font-bold uppercase text-right">Actions</TableHead>
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
                                <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[200px]">{sub.controlNumber}</span>
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
                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                             <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => onEyeClick(sub.id)} 
                                className="h-7 text-[9px] font-bold bg-primary shadow-sm"
                            >
                                VIEW SUBMISSION
                            </Button>
                            {isAdmin && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="destructive" 
                                            size="sm" 
                                            className="h-7 text-[9px] font-bold shadow-sm"
                                            onClick={() => onDeleteClick(sub)}
                                        >
                                            DELETE SUBMISSION
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Permanently remove record</p></TooltipContent>
                                </Tooltip>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
