'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Award, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccreditationPerformanceTabProps {
  academicPrograms: AcademicProgram[];
  allCompliances: ProgramComplianceRecord[];
  campuses: Campus[];
  selectedYear: number;
}

export function AccreditationPerformanceTab({
  academicPrograms,
  allCompliances,
  campuses,
  selectedYear,
}: AccreditationPerformanceTabProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [campusFilter, setCampusFilter] = useState('all');

  const complianceMap = useMemo(() => {
    const map = new Map<string, ProgramComplianceRecord>();
    allCompliances.forEach(c => map.set(c.programId, c));
    return map;
  }, [allCompliances]);

  const programsWithAccreditation = useMemo(() => {
    return academicPrograms
      .filter(p => p.isActive)
      .map(p => {
        const compliance = complianceMap.get(p.id);
        const records = compliance?.accreditationRecords || [];
        const current = records.find(r => r.lifecycleStatus === 'Current') || records[records.length - 1];
        const level = current?.level || 'Non Accredited';
        const lifecycle = current?.lifecycleStatus || 'N/A';
        const nextSurvey = current?.nextSchedule || 'N/A';
        const lastResult = current?.result || 'N/A';
        const descriptiveRating = current?.ratingsSummary?.descriptiveRating || '';
        const openRecs = records.reduce((count, r) => {
          return count + (r.recommendations?.filter(rec => rec.type === 'Mandatory' && rec.status !== 'Closed').length || 0);
        }, 0);
        const campusName = campuses.find(c => c.id === p.campusId)?.name || 'N/A';
        return { program: p, compliance, level, lifecycle, nextSurvey, lastResult, descriptiveRating, openRecs, campusName };
      })
      .filter(item => {
        if (levelFilter !== 'all') {
          const l = item.level.toLowerCase();
          if (levelFilter === 'non-accredited' && l !== 'non accredited' && !l.includes('candidate') && !l.includes('psv') && l !== 'awaiting result') return false;
          if (levelFilter === 'candidate' && !l.includes('candidate') && !l.includes('psv')) return false;
          if (levelFilter === 'level-i' && !l.includes('level i')) return false;
          if (levelFilter === 'level-ii' && !l.includes('level ii')) return false;
          if (levelFilter === 'level-iii' && !l.includes('level iii')) return false;
          if (levelFilter === 'level-iv' && !l.includes('level iv')) return false;
        }
        if (campusFilter !== 'all' && item.program.campusId !== campusFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          if (!item.program.name.toLowerCase().includes(s) && !item.program.abbreviation.toLowerCase().includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const order = ['Level IV', 'Level III', 'Level II', 'Level I', 'Candidate', 'Non Accredited', 'AWAITING RESULT'];
        const ai = order.findIndex(o => a.level.includes(o));
        const bi = order.findIndex(o => b.level.includes(o));
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
  }, [academicPrograms, complianceMap, campuses, search, levelFilter, campusFilter]);

  const stats = useMemo(() => {
    const active = academicPrograms.filter(p => p.isActive).length;
    const withCompliance = allCompliances.filter(c => academicPrograms.some(p => p.id === c.programId && p.isActive)).length;
    const levels: Record<string, number> = {};
    let openRecs = 0;
    programsWithAccreditation.forEach(item => {
      const key = item.level.includes('Level IV') ? 'Level IV' :
                  item.level.includes('Level III') ? 'Level III' :
                  item.level.includes('Level II') ? 'Level II' :
                  item.level.includes('Level I') ? 'Level I' :
                  item.level.toLowerCase().includes('candidate') || item.level.includes('PSV') ? 'Candidate' :
                  'Non Accredited';
      levels[key] = (levels[key] || 0) + 1;
      openRecs += item.openRecs;
    });
    return { active, withCompliance, levels, openRecs, displayed: programsWithAccreditation.length };
  }, [academicPrograms, allCompliances, programsWithAccreditation]);

  const levelColor = (level: string) => {
    if (level.includes('Level IV')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (level.includes('Level III')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (level.includes('Level II')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (level.includes('Level I')) return 'bg-green-100 text-green-800 border-green-200';
    if (level.toLowerCase().includes('candidate') || level.includes('PSV')) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
  };

  const lifecycleBadge = (status: string) => {
    if (status === 'Current') return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[8px] font-black">Current</Badge>;
    if (status === 'Undergoing') return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[8px] font-black">Undergoing</Badge>;
    if (status === 'Completed') return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[8px] font-black">Completed</Badge>;
    if (status === 'Waiting for Official Result') return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[8px] font-black">Awaiting Result</Badge>;
    return <Badge variant="outline" className="bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-700 text-[8px] font-black">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-500">Active Programs</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.active}</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">{stats.withCompliance} with records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-500">Accredited</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-black text-emerald-700">{Object.entries(stats.levels).filter(([k]) => k !== 'Non Accredited' && k !== 'Candidate').reduce((s, [, v]) => s + v, 0)}</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">{stats.levels['Level IV'] || 0} at Level IV</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-500">Candidate / PSV</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-black text-amber-700">{stats.levels['Candidate'] || 0}</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">Pending survey result</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-500">Non-Accredited</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-black text-slate-600 dark:text-slate-400">{stats.levels['Non Accredited'] || 0}</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">No active accreditation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-500">Open Recs</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className={cn("text-2xl font-black", stats.openRecs > 0 ? "text-rose-600" : "text-slate-900 dark:text-slate-100")}>{stats.openRecs}</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">Mandatory recommendations</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search program name or abbreviation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-white border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500 rounded-xl"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="h-9 w-[160px] text-xs bg-white border-slate-200 dark:border-slate-700 rounded-xl">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs font-bold">All Levels</SelectItem>
            <SelectItem value="level-iv" className="text-xs font-medium">Level IV</SelectItem>
            <SelectItem value="level-iii" className="text-xs font-medium">Level III</SelectItem>
            <SelectItem value="level-ii" className="text-xs font-medium">Level II</SelectItem>
            <SelectItem value="level-i" className="text-xs font-medium">Level I</SelectItem>
            <SelectItem value="candidate" className="text-xs font-medium">Candidate / PSV</SelectItem>
            <SelectItem value="non-accredited" className="text-xs font-medium">Non-Accredited</SelectItem>
          </SelectContent>
        </Select>
        <Select value={campusFilter} onValueChange={setCampusFilter}>
          <SelectTrigger className="h-9 w-[160px] text-xs bg-white border-slate-200 dark:border-slate-700 rounded-xl">
            <SelectValue placeholder="All Campuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs font-bold">All Campuses</SelectItem>
            {campuses.map(c => (
              <SelectItem key={c.id} value={c.id} className="text-xs font-medium">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[10px] text-slate-400 font-medium">{stats.displayed} program{stats.displayed !== 1 ? 's' : ''} shown</span>
      </div>

      {/* Table */}
      <Card className="shadow-md border-slate-200/60 dark:border-slate-700/60 overflow-hidden bg-white rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-800/70 border-b">
              <TableRow>
                <TableHead className="pl-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Program</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Campus</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Accreditation Level</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Lifecycle</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Next Survey</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Rating</TableHead>
                <TableHead className="text-right pr-6 text-[10px] font-black uppercase text-slate-500 tracking-wider">Open Recs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programsWithAccreditation.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <Award className="h-8 w-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                    <p className="text-xs font-bold text-slate-500">No programs match your filters</p>
                    <p className="text-[10px] text-slate-400 mt-1">Try adjusting the search or filter criteria.</p>
                  </TableCell>
                </TableRow>
              ) : (
                programsWithAccreditation.map(item => (
                  <TableRow key={item.program.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-all border-b">
                    <TableCell className="pl-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">{item.program.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono font-bold">{item.program.abbreviation}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium">{item.campusName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[9px] font-black px-2 py-0.5 rounded-full", levelColor(item.level))}>
                        {item.level}
                      </Badge>
                    </TableCell>
                    <TableCell>{lifecycleBadge(item.lifecycle)}</TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium tabular-nums">{item.nextSurvey}</TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-[160px] truncate" title={item.descriptiveRating}>
                      {item.descriptiveRating || <span className="text-slate-300 italic text-[10px]">N/A</span>}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {item.openRecs > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600">
                          <AlertTriangle className="h-3 w-3" /> {item.openRecs}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> 0
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
