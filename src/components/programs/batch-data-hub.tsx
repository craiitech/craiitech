'use client';

/**
 * @fileOverview A component for batch data entry of program metrics.
 */

import { useState, useMemo } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, TrendingUp, BarChart3, Edit, Info, School, CheckCircle2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BatchEntryDialog } from './batch-entry-dialog';
import { BatchXlsxImport } from './batch-xlsx-import';
import { Bar, BarChart, CartesianGrid, Legend, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

interface BatchDataHubProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
  isLoading: boolean;
  canEdit: boolean;
}

type DataMode = 'enrollment' | 'graduation' | 'board' | 'tracer';

type TermTotals = {
  male: number;
  female: number;
  total: number;
};

const ENROLLMENT_LEVELS = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear', 'fifthYear'] as const;

const emptyTotals = (): TermTotals => ({ male: 0, female: 0, total: 0 });

const addTotals = (a: TermTotals, b: TermTotals): TermTotals => ({
  male: a.male + b.male,
  female: a.female + b.female,
  total: a.total + b.total,
});

/**
 * Sums a semester's year-level breakdown. Handles both the disaggregated
 * (per-level male/female) and legacy (per-level total) storage formats.
 */
function sumYearLevels(term: any): TermTotals {
  if (!term) return emptyTotals();

  return ENROLLMENT_LEVELS.reduce<TermTotals>((totals, level) => {
    const levelData = term[level];
    if (!levelData) return totals;

    const male = Number(levelData.male) || 0;
    const female = Number(levelData.female) || 0;
    const reportedTotal = Number(levelData.total) || 0;

    return {
      male: totals.male + male,
      female: totals.female + female,
      total: totals.total + Math.max(male + female, reportedTotal),
    };
  }, emptyTotals());
}

function totalsFromOverall(overall: any, fallback: TermTotals): TermTotals {
  if (!overall) return fallback;

  const male = Number(overall.male ?? fallback.male) || 0;
  const female = Number(overall.female ?? fallback.female) || 0;

  return {
    male,
    female,
    total: Math.max(Number(overall.total) || 0, male + female),
  };
}

const enrollmentChartConfig = {
  firstSemester: { label: '1st Semester', color: 'hsl(var(--chart-1))' },
  secondSemester: { label: '2nd Semester', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

export function BatchDataHub({
  programs,
  compliances,
  campuses,
  units,
  selectedYear,
  isLoading,
  canEdit,
}: BatchDataHubProps) {
  const [dataMode, setDataMode] = useState<DataMode>('enrollment');
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);

  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);

  // STRICTOR FILTERING: Only show programs that are currently active in the University
  const activePrograms = useMemo(() => programs.filter((p) => p.isActive === true), [programs]);

  const stats = useMemo(() => {
    return activePrograms.map((p) => {
      const pId = String(p.id).toLowerCase().trim();
      const programRecords = compliances.filter(
        (c) =>
          String(c.programId || '')
            .toLowerCase()
            .trim() === pId,
      );

      // Prefer the record registered for the selected Academic Year, falling back
      // to the most recent available record so historical logs remain visible.
      const record =
        programRecords.find((c) => c.academicYear === selectedYear) ||
        programRecords.sort((a, b) => (b.academicYear || 0) - (a.academicYear || 0))[0];

      const allEnrollmentRecords = record?.enrollmentRecords || [];
      const yearEnrollmentRecords = allEnrollmentRecords.filter(
        (r) => !r.academicYear || String(r.academicYear).includes(String(selectedYear)),
      );
      const enrollmentRecords = yearEnrollmentRecords.length > 0 ? yearEnrollmentRecords : allEnrollmentRecords;

      const aggregateSemester = (termKey: 'firstSemester' | 'secondSemester'): TermTotals => {
        return enrollmentRecords.reduce<TermTotals>((acc, rec: any) => {
          const computed = sumYearLevels(rec?.[termKey]);
          const overall = rec?.overall?.[termKey];

          // "Overall only" records keep their headcount in `overall`, while
          // disaggregated records keep it in the year-level fields.
          const termTotals =
            rec?.overallOnly && overall
              ? totalsFromOverall(overall, computed)
              : computed.total > 0
                ? computed
                : totalsFromOverall(overall, computed);

          return addTotals(acc, termTotals);
        }, emptyTotals());
      };

      let sem1 = aggregateSemester('firstSemester');
      let sem2 = aggregateSemester('secondSemester');

      // Fallback to the legacy aggregate `stats.enrollment` if no records exist yet
      if (sem1.total === 0) {
        sem1 = sumYearLevels(record?.stats?.enrollment?.firstSemester);
      }
      if (sem2.total === 0) {
        sem2 = sumYearLevels(record?.stats?.enrollment?.secondSemester);
      }

      // Outcomes summary
      const graduationRecords = record?.graduationRecords || [];
      const grads =
        graduationRecords.reduce((acc, r) => acc + (Number(r.maleCount) || 0) + (Number(r.femaleCount) || 0), 0) ||
        Number(record?.stats?.graduationCount) ||
        0;
      const tracerCount = record?.tracerRecords?.length || 0;
      const boardExamCount = record?.boardPerformance?.length || 0;
      const latestBoard =
        record?.boardPerformance && record.boardPerformance.length > 0
          ? record.boardPerformance[record.boardPerformance.length - 1].overallPassRate
          : 0;

      return {
        id: p.id,
        name: p.name,
        abbreviation: p.abbreviation,
        campus: campusMap.get(p.campusId) || '...',
        sem1,
        sem2,
        grads,
        tracerCount,
        latestBoard,
        hasRecord: !!record,
        hasEnrollmentData: sem1.total > 0 || sem2.total > 0,
        hasGraduationData: grads > 0,
        hasBoardData: boardExamCount > 0,
        hasTracerData: tracerCount > 0,
      };
    });
  }, [activePrograms, compliances, campusMap, selectedYear]);

  const enrollmentSummary = useMemo(() => {
    const totals = stats.reduce(
      (acc, stat) => ({
        first: addTotals(acc.first, stat.sem1),
        second: addTotals(acc.second, stat.sem2),
      }),
      { first: emptyTotals(), second: emptyTotals() },
    );

    const programsWithData = stats.filter((stat) => stat.sem1.total > 0 || stat.sem2.total > 0).length;
    const male = totals.first.male + totals.second.male;
    const female = totals.first.female + totals.second.female;

    return {
      first: totals.first,
      second: totals.second,
      male,
      female,
      overall: male + female,
      programsWithData,
      coverage: stats.length > 0 ? Math.round((programsWithData / stats.length) * 100) : 0,
    };
  }, [stats]);

  const enrollmentChartData = useMemo(() => {
    return stats
      .filter((stat) => stat.sem1.total > 0 || stat.sem2.total > 0)
      .sort((a, b) => b.sem1.total + b.sem2.total - (a.sem1.total + a.sem2.total))
      .slice(0, 12)
      .map((stat) => ({
        name: stat.abbreviation || stat.name,
        fullName: stat.name,
        firstSemester: stat.sem1.total,
        secondSemester: stat.sem2.total,
      }));
  }, [stats]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex bg-muted p-1 rounded-lg border shadow-sm w-full md:w-auto overflow-x-auto">
          <Button
            variant={dataMode === 'enrollment' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDataMode('enrollment')}
            className="h-8 text-[10px] font-black uppercase px-4"
          >
            <Users className="h-3.5 w-3.5 mr-1.5" /> Enrollment
          </Button>
          <Button
            variant={dataMode === 'graduation' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDataMode('graduation')}
            className="h-8 text-[10px] font-black uppercase px-4"
          >
            <GraduationCap className="h-3.5 w-3.5 mr-1.5" /> Graduation
          </Button>
          <Button
            variant={dataMode === 'board' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDataMode('board')}
            className="h-8 text-[10px] font-black uppercase px-4"
          >
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Board Exam
          </Button>
          <Button
            variant={dataMode === 'tracer' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDataMode('tracer')}
            className="h-8 text-[10px] font-black uppercase px-4"
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Tracer Study
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <BatchXlsxImport
            programs={programs}
            compliances={compliances}
            campuses={campuses}
            selectedYear={selectedYear}
            canEdit={canEdit}
          />
          <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
            <Info className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-tighter">
              Context: AY {selectedYear} Registry
            </span>
          </div>
        </div>
      </div>

      <Card className="shadow-lg border-primary/10 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {dataMode === 'enrollment' && <Users className="h-5 w-5 text-primary" />}
              {dataMode === 'graduation' && <GraduationCap className="h-5 w-5 text-primary" />}
              {dataMode === 'board' && <TrendingUp className="h-5 w-5 text-primary" />}
              {dataMode === 'tracer' && <BarChart3 className="h-5 w-5 text-primary" />}
              <CardTitle className="text-sm font-black uppercase tracking-tight">
                Batch Data Entry: {dataMode.toUpperCase()}
              </CardTitle>
            </div>
            <Badge
              variant="secondary"
              className="h-5 text-[9px] font-black uppercase bg-primary/5 text-primary border-none"
            >
              {activePrograms.length} ACTIVE PROGRAMS
            </Badge>
          </div>
          {dataMode === 'enrollment' && (
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Semestral headcount registry with male and female breakdown per academic offering
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {dataMode === 'enrollment' && (
            <div className="p-5 border-b bg-gradient-to-br from-indigo-50/60 via-background to-emerald-50/40 dark:from-indigo-950/20 dark:via-background dark:to-emerald-950/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-700 dark:text-indigo-300" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-200">
                    Enrollment Headcount Overview — AY {selectedYear}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[9px] font-black uppercase border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    {enrollmentSummary.programsWithData}/{stats.length} Programs Logged
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-black uppercase border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    {enrollmentSummary.coverage}% Coverage
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-indigo-200/70 bg-background p-3.5 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                    1st Semester Total
                  </p>
                  <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                    {enrollmentSummary.first.total.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[9px] font-black uppercase">
                    <span className="text-indigo-600 dark:text-indigo-400">
                      Male {enrollmentSummary.first.male.toLocaleString()}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400">
                      Female {enrollmentSummary.first.female.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200/70 bg-background p-3.5 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                    2nd Semester Total
                  </p>
                  <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                    {enrollmentSummary.second.total.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[9px] font-black uppercase">
                    <span className="text-indigo-600 dark:text-indigo-400">
                      Male {enrollmentSummary.second.male.toLocaleString()}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400">
                      Female {enrollmentSummary.second.female.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-sky-200/70 bg-background p-3.5 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                    Total Male Headcount
                  </p>
                  <p className="text-2xl font-black tabular-nums text-sky-700 dark:text-sky-400 mt-1">
                    {enrollmentSummary.male.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-bold text-muted-foreground mt-1">Both semesters combined</p>
                </div>

                <div className="rounded-xl border border-rose-200/70 bg-background p-3.5 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                    Total Female Headcount
                  </p>
                  <p className="text-2xl font-black tabular-nums text-rose-700 dark:text-rose-400 mt-1">
                    {enrollmentSummary.female.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-bold text-muted-foreground mt-1">
                    Overall Headcount: {enrollmentSummary.overall.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-background p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                    Semester Headcount by Program
                  </p>
                  <span className="text-[9px] font-bold text-muted-foreground">Top 12 programs by headcount</span>
                </div>
                {enrollmentChartData.length > 0 ? (
                  <ChartContainer config={enrollmentChartConfig} className="h-[260px] w-full aspect-auto">
                    <BarChart data={enrollmentChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 9 }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9 }} width={36} />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar
                        dataKey="firstSemester"
                        name="1st Semester"
                        fill="var(--color-firstSemester)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="secondSemester"
                        name="2nd Semester"
                        fill="var(--color-secondSemester)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[160px] flex flex-col items-center justify-center gap-1 text-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-xs font-bold text-foreground">No enrollment headcount logged yet</p>
                    <p className="text-[10px] text-muted-foreground">
                      Use the entry wizard or XLSX import to populate AY {selectedYear} data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table className={cn(dataMode === 'enrollment' && 'min-w-[1080px]')}>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Academic Offering</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Campus Site</TableHead>

                  {dataMode === 'enrollment' && (
                    <>
                      <TableHead className="text-center text-[10px] font-black uppercase border-l border-border/60">
                        1st Sem Male
                      </TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase">1st Sem Female</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase text-primary">
                        1st Sem Total
                      </TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase border-l border-border/60">
                        2nd Sem Male
                      </TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase">2nd Sem Female</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase text-primary">
                        2nd Sem Total
                      </TableHead>
                    </>
                  )}

                  {dataMode === 'graduation' && (
                    <TableHead className="text-center text-[10px] font-black uppercase">Total Grads</TableHead>
                  )}

                  {dataMode === 'board' && (
                    <TableHead className="text-center text-[10px] font-black uppercase">Latest Pass Rate</TableHead>
                  )}

                  {dataMode === 'tracer' && (
                    <TableHead className="text-center text-[10px] font-black uppercase">Employment Data</TableHead>
                  )}

                  <TableHead className="text-center text-[10px] font-black uppercase border-l border-border/60">
                    Record Status
                  </TableHead>
                  <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => {
                  const modeStatus =
                    dataMode === 'enrollment'
                      ? {
                          logged: stat.hasEnrollmentData,
                          loggedLabel: 'ENROLLMENT LOGGED',
                          emptyLabel: 'NO ENROLLMENT DATA',
                        }
                      : dataMode === 'graduation'
                        ? {
                            logged: stat.hasGraduationData,
                            loggedLabel: 'GRADUATION LOGGED',
                            emptyLabel: 'NO GRADUATION DATA',
                          }
                        : dataMode === 'board'
                          ? {
                              logged: stat.hasBoardData,
                              loggedLabel: 'BOARD DATA LOGGED',
                              emptyLabel: 'NO BOARD DATA',
                            }
                          : {
                              logged: stat.hasTracerData,
                              loggedLabel: 'TRACER DATA LOGGED',
                              emptyLabel: 'NO TRACER DATA',
                            };

                  return (
                    <TableRow key={stat.id} className="hover:bg-muted/20 transition-colors group">
                      <TableCell className="pl-8 py-5">
                        <div className="flex flex-col">
                          <span className="font-black text-sm text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                            {stat.name}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">
                            {stat.abbreviation}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <School className="h-3.5 w-3.5 opacity-30" />
                          {stat.campus}
                        </div>
                      </TableCell>

                      {dataMode === 'enrollment' && (
                        <>
                          <TableCell className="text-center font-black tabular-nums text-indigo-600 dark:text-indigo-400 border-l border-border/40">
                            {stat.sem1.total > 0 ? stat.sem1.male.toLocaleString() : '--'}
                          </TableCell>
                          <TableCell className="text-center font-black tabular-nums text-rose-600 dark:text-rose-400">
                            {stat.sem1.total > 0 ? stat.sem1.female.toLocaleString() : '--'}
                          </TableCell>
                          <TableCell className="text-center font-black tabular-nums text-slate-900 dark:text-slate-100 bg-primary/5">
                            {stat.sem1.total > 0 ? stat.sem1.total.toLocaleString() : '--'}
                          </TableCell>
                          <TableCell className="text-center font-black tabular-nums text-indigo-600 dark:text-indigo-400 border-l border-border/40">
                            {stat.sem2.total > 0 ? stat.sem2.male.toLocaleString() : '--'}
                          </TableCell>
                          <TableCell className="text-center font-black tabular-nums text-rose-600 dark:text-rose-400">
                            {stat.sem2.total > 0 ? stat.sem2.female.toLocaleString() : '--'}
                          </TableCell>
                          <TableCell className="text-center font-black tabular-nums text-slate-900 dark:text-slate-100 bg-primary/5">
                            {stat.sem2.total > 0 ? stat.sem2.total.toLocaleString() : '--'}
                          </TableCell>
                        </>
                      )}

                      {dataMode === 'graduation' && (
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'font-black tabular-nums',
                              stat.hasGraduationData
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-rose-50 text-rose-600 border-rose-200',
                            )}
                          >
                            {stat.hasGraduationData ? `${stat.grads.toLocaleString()} GRADS` : 'NO DATA'}
                          </Badge>
                        </TableCell>
                      )}

                      {dataMode === 'board' && (
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              'font-black tabular-nums',
                              stat.latestBoard >= 70 ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300',
                            )}
                          >
                            {stat.latestBoard ? `${stat.latestBoard}%` : '--'}
                          </span>
                        </TableCell>
                      )}

                      {dataMode === 'tracer' && (
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[9px] font-black">
                            {stat.tracerCount} RECORDS
                          </Badge>
                        </TableCell>
                      )}

                      <TableCell className="text-center border-l border-border/40">
                        {modeStatus.logged ? (
                          <Badge
                            variant="secondary"
                            className="h-5 text-[8px] font-black uppercase bg-emerald-100 text-emerald-700 border-none"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> {modeStatus.loggedLabel}
                          </Badge>
                        ) : stat.hasRecord ? (
                          <Badge
                            variant="secondary"
                            className="h-5 text-[8px] font-black uppercase bg-amber-100 text-amber-700 border-none"
                          >
                            {modeStatus.emptyLabel}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="h-5 text-[8px] font-black uppercase text-rose-600 border-rose-200 bg-rose-50"
                          >
                            NO LOG FOUND
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right pr-8">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8 text-[9px] font-black uppercase tracking-widest bg-primary shadow-sm px-4"
                          onClick={() => setActiveProgramId(stat.id)}
                          disabled={!canEdit}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" /> {stat.hasRecord ? 'Update' : 'Start Log'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/5 border-t py-3 px-8">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[9px] text-muted-foreground italic leading-tight">
              <strong>Administrative Accelerator:</strong> This view is designed for rapid institutional data
              collection. Use the sub-tabs to switch between modules and the "Update" button to access a focused entry
              wizard for the Academic Year {selectedYear}.
            </p>
          </div>
        </CardFooter>
      </Card>

      <BatchEntryDialog
        isOpen={!!activeProgramId}
        onOpenChange={(open) => !open && setActiveProgramId(null)}
        program={programs.find((p) => p.id === activeProgramId) || null}
        mode={dataMode}
        selectedYear={selectedYear}
      />
    </div>
  );
}
