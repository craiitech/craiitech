'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3, TrendingUp, Award, ShieldCheck, 
  AlertTriangle, ChevronDown, ChevronUp, Building2, 
  CalendarDays, LayoutList, GraduationCap, Search,
  ExternalLink, CheckCircle2, Clock, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChedProgramMonitoringTableProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
}

export function ChedProgramMonitoringTable({ 
  programs, compliances, campuses, units, selectedYear 
}: ChedProgramMonitoringTableProps) {
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  const [detailSearch, setDetailSearch] = useState('');
  const [detailCampusFilter, setDetailCampusFilter] = useState('all');
  const [detailUnitFilter, setDetailUnitFilter] = useState('all');
  const [detailSortBy, setDetailSortBy] = useState<string>('name');

  const activePrograms = useMemo(() => programs.filter(p => p.isActive), [programs]);

  const yearlySummary = useMemo(() => {
    const yearMap = new Map<number, {
      total: number;
      withCopc: number;
      inProgress: number;
      noCopc: number;
      accredited: number;
      nonAccredited: number;
      levelIV: number;
      levelIII: number;
      levelII: number;
      levelI: number;
      candidate: number;
      totalWithRecord: number;
    }>();

    activePrograms.forEach(p => {
      const programCompliances = compliances.filter(c => c.programId === p.id);
      programCompliances.forEach(c => {
        const yr = c.academicYear;
        if (!yearMap.has(yr)) {
          yearMap.set(yr, { total: 0, withCopc: 0, inProgress: 0, noCopc: 0, accredited: 0, nonAccredited: 0, levelIV: 0, levelIII: 0, levelII: 0, levelI: 0, candidate: 0, totalWithRecord: 0 });
        }
        const entry = yearMap.get(yr)!;
        entry.total++;
        entry.totalWithRecord++;

        const copc = c.ched?.copcStatus || 'No COPC';
        if (copc === 'With COPC') entry.withCopc++;
        else if (copc === 'In Progress') entry.inProgress++;
        else entry.noCopc++;

        const accRecords = c.accreditationRecords || [];
        const current = accRecords.find(r => r.lifecycleStatus === 'Current') || accRecords[accRecords.length - 1];
        const level = current?.level || 'Non Accredited';

        if (current && level !== 'Non Accredited' && !level.includes('PSV') && level !== 'AWAITING RESULT') {
          entry.accredited++;
          if (level.includes('Level IV')) entry.levelIV++;
          else if (level.includes('Level III')) entry.levelIII++;
          else if (level.includes('Level II')) entry.levelII++;
          else if (level.includes('Level I')) entry.levelI++;
          else if (level.toLowerCase().includes('candidate') || level.includes('PSV')) entry.candidate++;
        } else {
          entry.nonAccredited++;
        }
      });
    });

    return Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        ...data,
        copcRate: data.total > 0 ? Math.round((data.withCopc / data.total) * 100) : 0,
        accreditationRate: data.total > 0 ? Math.round((data.accredited / data.total) * 100) : 0,
        withoutRecord: data.total - data.totalWithRecord,
      }))
      .sort((a, b) => b.year - a.year);
  }, [activePrograms, compliances]);

  const programDetailData = useMemo(() => {
    const currentYearCompliances = compliances.filter(c => c.academicYear === selectedYear);
    const complianceMap = new Map(currentYearCompliances.map(c => [c.programId, c]));

    return activePrograms
      .map(p => {
        const c = complianceMap.get(p.id);
        const accRecords = c?.accreditationRecords || [];
        const current = accRecords.find(r => r.lifecycleStatus === 'Current') || accRecords[accRecords.length - 1];
        const level = current?.level || 'Non Accredited';
        const lifecycle = current?.lifecycleStatus || 'N/A';
        const validity = current?.statusValidityDate || (c?.ched?.copcAwardDate ? `COPC: ${c.ched.copcAwardDate}` : 'N/A');
        const openRecs = accRecords.reduce((count, r) => {
          return count + (r.recommendations?.filter(rec => rec.type === 'Mandatory' && rec.status !== 'Closed').length || 0);
        }, 0);
        const copcStatus = c?.ched?.copcStatus || 'No COPC';
        const campusName = campusMap.get(p.campusId) || 'Unknown';
        const unitName = unitMap.get(p.collegeId) || 'Unknown';
        const copcAwardDate = c?.ched?.copcAwardDate || '—';

        const isAccredited = current && level !== 'Non Accredited' && !level.includes('PSV') && level !== 'AWAITING RESULT';

        return {
          id: p.id,
          name: p.name,
          abbreviation: p.abbreviation,
          level: p.level,
          campusId: p.campusId,
          campus: campusName,
          unitId: p.collegeId,
          unit: unitName,
          hasRecord: !!c,
          copcStatus,
          copcAwardDate,
          accreditationLevel: isAccredited ? level : (p.isNewProgram ? 'New Offering' : level),
          isAccredited,
          lifecycle,
          validityDate: validity,
          openRecs,
        };
      })
      .filter(item => {
        if (detailCampusFilter !== 'all' && item.campusId !== detailCampusFilter) return false;
        if (detailUnitFilter !== 'all' && item.unitId !== detailUnitFilter) return false;
        if (detailSearch) {
          const s = detailSearch.toLowerCase();
          if (!item.name.toLowerCase().includes(s) && !item.abbreviation.toLowerCase().includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (detailSortBy === 'name') return a.name.localeCompare(b.name);
        if (detailSortBy === 'campus') return a.campus.localeCompare(b.campus);
        if (detailSortBy === 'copc') return b.copcStatus.localeCompare(a.copcStatus);
        if (detailSortBy === 'accreditation') return b.accreditationLevel.localeCompare(a.accreditationLevel);
        return a.name.localeCompare(b.name);
      });
  }, [activePrograms, compliances, selectedYear, campusMap, unitMap, detailSearch, detailCampusFilter, detailUnitFilter, detailSortBy]);

  const copcBadge = (status: string) => {
    switch (status) {
      case 'With COPC':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] font-black"><CheckCircle2 className="h-3 w-3 mr-1" /> With COPC</Badge>;
      case 'In Progress':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] font-black"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-800 border-red-200 text-[9px] font-black"><XCircle className="h-3 w-3 mr-1" /> No COPC</Badge>;
    }
  };

  const accreditationBadge = (level: string) => {
    if (level.includes('Level IV')) return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[8px] font-black">{level}</Badge>;
    if (level.includes('Level III')) return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[8px] font-black">{level}</Badge>;
    if (level.includes('Level II')) return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[8px] font-black">{level}</Badge>;
    if (level.includes('Level I')) return <Badge className="bg-green-100 text-green-800 border-green-200 text-[8px] font-black">{level}</Badge>;
    if (level.toLowerCase().includes('candidate') || level.includes('PSV')) return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[8px] font-black">{level}</Badge>;
    if (level === 'New Offering') return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[8px] font-black">{level}</Badge>;
    return <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[8px] font-black">{level}</Badge>;
  };

  if (yearlySummary.length === 0) {
    return (
      <Card className="border-primary/10 shadow-lg">
        <CardContent className="py-16 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-sm font-black text-muted-foreground uppercase tracking-wider">No compliance data available</p>
          <p className="text-xs text-muted-foreground mt-2">Submit program compliance records to populate the decision support table.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/10 shadow-lg overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border-b py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white shadow-sm border border-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                CHED Program Monitoring — Decision Support
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Year-over-year COPC &amp; Accreditation performance summary
              </CardDescription>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">
                {yearlySummary.length} Years Tracked
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="yearly-summary" className="flex flex-col lg:flex-row">
          <div className="bg-slate-50/50 border-b lg:border-b-0 lg:border-r px-3 py-4 lg:py-0 flex items-center justify-center">
            <TabsList className="bg-transparent h-auto flex-row lg:flex-col gap-1 w-full">
              <TabsTrigger value="yearly-summary" className="text-[9px] font-black uppercase tracking-widest px-4 py-2 h-auto data-[state=active]:bg-white data-[state=active]:shadow-sm w-full justify-center">
                <CalendarDays className="h-3.5 w-3.5 lg:mr-0 lg:mb-1.5" />
                <span className="hidden lg:inline">Yearly Trend</span>
                <span className="lg:hidden">Yearly Trend Summary</span>
              </TabsTrigger>
              <TabsTrigger value="program-detail" className="text-[9px] font-black uppercase tracking-widest px-4 py-2 h-auto data-[state=active]:bg-white data-[state=active]:shadow-sm w-full justify-center">
                <LayoutList className="h-3.5 w-3.5 lg:mr-0 lg:mb-1.5" />
                <span className="hidden lg:inline">Program Detail</span>
                <span className="lg:hidden">Program Detail (AY {selectedYear})</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex-1 min-w-0">

          <TabsContent value="yearly-summary" className="m-0">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="pl-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider w-[120px]">Academic Year</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">Active Programs</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-emerald-700 tracking-wider text-center" colSpan={3}>
                      <div className="flex items-center justify-center gap-1"><ShieldCheck className="h-3 w-3" /> COPC Status</div>
                    </TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">COPC Rate</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-indigo-700 tracking-wider text-center" colSpan={2}>
                      <div className="flex items-center justify-center gap-1"><Award className="h-3 w-3" /> Accreditation</div>
                    </TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">Accred. Rate</TableHead>
                    <TableHead className="text-right pr-6 text-[9px] font-black uppercase text-slate-500 tracking-wider">Level Distribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearlySummary.map((row) => {
                    const prevYear = yearlySummary.find(y => y.year === row.year - 1);
                    const copcChange = prevYear ? row.copcRate - prevYear.copcRate : null;
                    const accredChange = prevYear ? row.accreditationRate - prevYear.accreditationRate : null;

                    return (
                      <TableRow key={row.year} className="hover:bg-slate-50/80 transition-all border-b group">
                        <TableCell className="pl-6 py-4">
                          <span className="font-black text-sm text-slate-900 dark:text-slate-100">AY {row.year}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-black text-sm text-slate-800">{row.total}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-black text-emerald-600 text-sm">{row.withCopc}</span>
                            <span className="text-[7px] font-bold text-emerald-500 uppercase tracking-wider">COPC</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-black text-amber-600 text-sm">{row.inProgress}</span>
                            <span className="text-[7px] font-bold text-amber-500 uppercase tracking-wider">IN PROG</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-black text-red-600 text-sm">{row.noCopc}</span>
                            <span className="text-[7px] font-bold text-red-500 uppercase tracking-wider">NO COPC</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn(
                              "text-sm font-black tabular-nums",
                              row.copcRate >= 80 ? "text-emerald-600" : row.copcRate >= 50 ? "text-amber-600" : "text-red-600"
                            )}>
                              {row.copcRate}%
                            </span>
                            {copcChange !== null && (
                              <span className={cn(
                                "text-[8px] font-bold",
                                copcChange > 0 ? "text-emerald-500" : copcChange < 0 ? "text-red-500" : "text-slate-400"
                              )}>
                                {copcChange > 0 ? '+' : ''}{copcChange}pp
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-black text-indigo-600 text-sm">{row.accredited}</span>
                            <span className="text-[7px] font-bold text-indigo-500 uppercase tracking-wider">ACCRED</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-black text-slate-500 text-sm">{row.nonAccredited}</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">NON</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn(
                              "text-sm font-black tabular-nums",
                              row.accreditationRate >= 80 ? "text-emerald-600" : row.accreditationRate >= 50 ? "text-amber-600" : "text-red-600"
                            )}>
                              {row.accreditationRate}%
                            </span>
                            {accredChange !== null && (
                              <span className={cn(
                                "text-[8px] font-bold",
                                accredChange > 0 ? "text-emerald-500" : accredChange < 0 ? "text-red-500" : "text-slate-400"
                              )}>
                                {accredChange > 0 ? '+' : ''}{accredChange}pp
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {row.levelIV > 0 && (
                              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[7px] font-black px-1.5 py-0">
                                IV:{row.levelIV}
                              </Badge>
                            )}
                            {row.levelIII > 0 && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[7px] font-black px-1.5 py-0">
                                III:{row.levelIII}
                              </Badge>
                            )}
                            {row.levelII > 0 && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[7px] font-black px-1.5 py-0">
                                II:{row.levelII}
                              </Badge>
                            )}
                            {row.levelI > 0 && (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-[7px] font-black px-1.5 py-0">
                                I:{row.levelI}
                              </Badge>
                            )}
                            {row.candidate > 0 && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[7px] font-black px-1.5 py-0">
                                C:{row.candidate}
                              </Badge>
                            )}
                            {row.nonAccredited > 0 && (
                              <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[7px] font-black px-1.5 py-0">
                                NA:{row.nonAccredited}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="program-detail" className="m-0">
            <div className="p-4 border-b bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search program..."
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    className="pl-9 h-8 text-xs bg-white border-slate-200"
                  />
                </div>
                <Select value={detailCampusFilter} onValueChange={setDetailCampusFilter}>
                  <SelectTrigger className="h-8 w-[150px] text-xs bg-white border-slate-200">
                    <SelectValue placeholder="All Campuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[10px] font-bold">All Campuses</SelectItem>
                    {campuses.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-[10px] font-medium">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={detailUnitFilter} onValueChange={setDetailUnitFilter}>
                  <SelectTrigger className="h-8 w-[150px] text-xs bg-white border-slate-200">
                    <SelectValue placeholder="All Units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[10px] font-bold">All Units</SelectItem>
                    {units.filter(u => u.category === 'Academic').map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-[10px] font-medium">{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={detailSortBy} onValueChange={setDetailSortBy}>
                  <SelectTrigger className="h-8 w-[130px] text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name" className="text-[10px] font-bold">Sort: Name</SelectItem>
                    <SelectItem value="campus" className="text-[10px] font-bold">Sort: Campus</SelectItem>
                    <SelectItem value="copc" className="text-[10px] font-bold">Sort: COPC</SelectItem>
                    <SelectItem value="accreditation" className="text-[10px] font-bold">Sort: Accreditation</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-slate-400 font-medium ml-auto">
                  {programDetailData.length} program{programDetailData.length !== 1 ? 's' : ''} shown
                </span>
              </div>
            </div>
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="pl-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider">Program</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Campus</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Level</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">
                      <div className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> COPC</div>
                    </TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-indigo-700 tracking-wider">
                      <div className="flex items-center gap-1"><Award className="h-3 w-3" /> Accreditation</div>
                    </TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Lifecycle</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Validity / Award</TableHead>
                    <TableHead className="text-right pr-6 text-[9px] font-black uppercase text-slate-500 tracking-wider">Open Recs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programDetailData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16">
                        <GraduationCap className="h-8 w-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                        <p className="text-xs font-bold text-slate-500">No programs match your filters</p>
                        <p className="text-[10px] text-slate-400 mt-1">Try adjusting the search or filter criteria.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    programDetailData.map(item => (
                      <TableRow key={item.id} className="hover:bg-slate-50/80 transition-all border-b group">
                        <TableCell className="pl-6 py-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">{item.name}</span>
                            <span className="text-[9px] text-slate-400 font-mono font-bold">{item.abbreviation}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                            {item.campus}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] font-black text-slate-600 border-slate-300 bg-white">
                            {item.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.hasRecord ? copcBadge(item.copcStatus) : (
                            <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[8px] font-black">
                              <Clock className="h-3 w-3 mr-1" /> No Data
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.hasRecord ? accreditationBadge(item.accreditationLevel) : (
                            <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[8px] font-black">No Data</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "text-[8px] font-black",
                            item.lifecycle === 'Current' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            item.lifecycle === 'Undergoing' ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-slate-100 text-slate-500 border-slate-200"
                          )}>
                            {item.lifecycle}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono font-bold text-slate-500 tabular-nums whitespace-nowrap">
                          {item.validityDate}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {item.hasRecord ? (
                            item.openRecs > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600">
                                <AlertTriangle className="h-3 w-3" /> {item.openRecs}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600">
                                <CheckCircle2 className="h-3 w-3" /> 0
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-300 font-black">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
