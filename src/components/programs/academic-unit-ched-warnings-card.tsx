'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { AcademicProgram, ProgramComplianceRecord, Unit } from '@/lib/types';
import {
  getUnitProgramsChedWarnings,
  type ProgramChedWarningSummary,
  type ProgramChedWarningItem,
} from '@/lib/ched-compliance-warnings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  GraduationCap,
  Award,
  ShieldAlert,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Info,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AcademicUnitChedWarningsCardProps {
  unit?: Unit | null;
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  selectedYear: number;
  className?: string;
  onOpenBatchHub?: () => void;
}

type WarningFilterMode =
  'all_warnings' | 'all_programs' | 'missing_enrollment' | 'missing_graduation' | 'missing_board' | 'missing_docs';

export function AcademicUnitChedWarningsCard({
  unit,
  programs,
  compliances,
  selectedYear,
  className,
  onOpenBatchHub,
}: AcademicUnitChedWarningsCardProps) {
  const [filterMode, setFilterMode] = useState<WarningFilterMode>('all_warnings');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);

  const stats = useMemo(() => {
    return getUnitProgramsChedWarnings(programs, compliances, selectedYear);
  }, [programs, compliances, selectedYear]);

  const filteredSummaries = useMemo(() => {
    return stats.summaries.filter((s) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.program.name.toLowerCase().includes(q);
        const matchesAbbr = (s.program.abbreviation || '').toLowerCase().includes(q);
        if (!matchesName && !matchesAbbr) return false;
      }

      // 2. Filter mode
      if (filterMode === 'all_programs') return true;
      if (filterMode === 'all_warnings') return s.hasWarnings;
      if (filterMode === 'missing_enrollment') return s.missingEnrollment;
      if (filterMode === 'missing_graduation') return s.missingGraduation;
      if (filterMode === 'missing_board') return s.missingBoard;
      if (filterMode === 'missing_docs') return s.missingOtherChed;
      return true;
    });
  }, [stats, filterMode, searchQuery]);

  if (programs.length === 0) {
    return null;
  }

  const isAllClean = stats.warningProgramsCount === 0;

  return (
    <Card
      className={cn(
        'shadow-md border-2 transition-all overflow-hidden',
        isAllClean
          ? 'border-emerald-300 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/20 to-transparent'
          : 'border-amber-300 dark:border-amber-800 bg-gradient-to-br from-amber-50/25 via-background to-rose-50/15',
        className,
      )}
    >
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'p-2 rounded-xl flex items-center justify-center border',
                  isAllClean
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300',
                )}
              >
                {isAllClean ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse" />
                )}
              </div>
              <div>
                <CardTitle className="text-base font-black tracking-tight flex items-center gap-2">
                  CHED Program Monitoring — Student Data &amp; Compliance Integrity
                  <Badge variant="outline" className="text-[10px] font-bold">
                    AY {selectedYear}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {unit ? `Supervised Academic Programs under ${unit.name}` : 'Academic Programs CHED Regulatory Audit'}
                  {' • '}
                  Validation of Enrollment per Semester, Graduation, Board Licensure Performance, and Required
                  Regulatory Documents.
                </CardDescription>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/academic-programs?tab=batch-hub&year=${selectedYear}`}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold gap-1.5 shadow-xs border-indigo-200 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
              >
                <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                Batch Data Entry Hub
              </Button>
            </Link>
          </div>
        </div>

        {/* Aggregate KPI Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          <button
            type="button"
            onClick={() => setFilterMode('missing_enrollment')}
            className={cn(
              'p-2.5 rounded-xl border text-left transition-all',
              filterMode === 'missing_enrollment'
                ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-300'
                : 'bg-background hover:bg-muted/50 border-border',
            )}
          >
            <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-rose-600" /> 1. Enrollment
              </span>
              <span
                className={cn(
                  'font-mono font-black',
                  stats.missingEnrollmentCount > 0 ? 'text-rose-600' : 'text-emerald-600',
                )}
              >
                {stats.missingEnrollmentCount}
              </span>
            </div>
            <div className="text-xs font-bold text-foreground mt-0.5">
              {stats.missingEnrollmentCount > 0 ? 'Missing Semestral Data' : 'All Enrolled Logged'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('missing_graduation')}
            className={cn(
              'p-2.5 rounded-xl border text-left transition-all',
              filterMode === 'missing_graduation'
                ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-300'
                : 'bg-background hover:bg-muted/50 border-border',
            )}
          >
            <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase">
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-amber-600" /> 2. Graduation
              </span>
              <span
                className={cn(
                  'font-mono font-black',
                  stats.missingGraduationCount > 0 ? 'text-amber-600' : 'text-emerald-600',
                )}
              >
                {stats.missingGraduationCount}
              </span>
            </div>
            <div className="text-xs font-bold text-foreground mt-0.5">
              {stats.missingGraduationCount > 0 ? 'Zero / Missing Counts' : 'Graduates Logged'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('missing_board')}
            className={cn(
              'p-2.5 rounded-xl border text-left transition-all',
              filterMode === 'missing_board'
                ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-300'
                : 'bg-background hover:bg-muted/50 border-border',
            )}
          >
            <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase">
              <span className="flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-purple-600" /> 3. Board Exams
              </span>
              <span
                className={cn(
                  'font-mono font-black',
                  stats.missingBoardCount > 0 ? 'text-purple-600' : 'text-emerald-600',
                )}
              >
                {stats.missingBoardCount}
              </span>
            </div>
            <div className="text-xs font-bold text-foreground mt-0.5">
              {stats.missingBoardCount > 0 ? 'No Licensure Results' : 'Board Data Complete'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('missing_docs')}
            className={cn(
              'p-2.5 rounded-xl border text-left transition-all',
              filterMode === 'missing_docs'
                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-300'
                : 'bg-background hover:bg-muted/50 border-border',
            )}
          >
            <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase">
              <span className="flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-blue-600" /> 4. CHED Docs
              </span>
              <span
                className={cn(
                  'font-mono font-black',
                  stats.missingChedDocCount > 0 ? 'text-blue-600' : 'text-emerald-600',
                )}
              >
                {stats.missingChedDocCount}
              </span>
            </div>
            <div className="text-xs font-bold text-foreground mt-0.5">
              {stats.missingChedDocCount > 0 ? 'COPC/CMO/BOR Deficits' : 'Documents Verified'}
            </div>
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant={filterMode === 'all_warnings' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterMode('all_warnings')}
              className={cn(
                'h-7 text-[11px] font-bold',
                filterMode === 'all_warnings' && 'bg-amber-600 hover:bg-amber-700 text-white',
              )}
            >
              ⚠️ With Warnings ({stats.warningProgramsCount})
            </Button>
            <Button
              type="button"
              variant={filterMode === 'all_programs' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterMode('all_programs')}
              className="h-7 text-[11px] font-bold"
            >
              All Programs ({stats.totalPrograms})
            </Button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search program or acronym..."
              className="h-7 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* Program Cards / Rows with Specific Missing Warnings */}
        {filteredSummaries.length === 0 ? (
          <div className="p-6 text-center border rounded-xl bg-background/50 space-y-1">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-foreground">No Programs Match Filter</div>
            <div className="text-xs text-muted-foreground">
              {filterMode === 'all_warnings'
                ? 'All academic programs under this unit have compliant student enrollment, graduation, and board records.'
                : 'Try adjusting your search query or filter selection.'}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredSummaries.map((summary) => {
              const p = summary.program;
              const isExpanded = expandedProgramId === p.id;

              return (
                <div
                  key={p.id}
                  className={cn(
                    'border rounded-xl p-3.5 transition-all bg-background',
                    summary.hasCritical
                      ? 'border-rose-300 dark:border-rose-900 shadow-xs'
                      : summary.hasWarnings
                        ? 'border-amber-300 dark:border-amber-900 shadow-xs'
                        : 'border-emerald-200 dark:border-emerald-950/60 opacity-90',
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          {p.abbreviation ? `[${p.abbreviation}] ` : ''}
                          {p.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {p.level}
                        </Badge>
                        {p.isBoardProgram && (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 text-[9px] font-bold">
                            PRC Board Exam
                          </Badge>
                        )}
                        {p.isNewProgram && (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 text-[9px] font-bold">
                            New Program
                          </Badge>
                        )}
                        {summary.compliance?.ched?.copcStatus && (
                          <Badge
                            className={cn(
                              'text-[9px] font-bold',
                              summary.compliance.ched.copcStatus === 'With COPC'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : summary.compliance.ched.copcStatus === 'In Progress'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
                            )}
                          >
                            {summary.compliance.ched.copcStatus}
                          </Badge>
                        )}
                      </div>

                      {/* Quick Snapshot Metrics */}
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          Enrollment: 1st Sem:{' '}
                          <strong
                            className={cn(
                              summary.enrollmentSummary.firstSemCount === 0 ? 'text-rose-600' : 'text-foreground',
                            )}
                          >
                            {summary.enrollmentSummary.firstSemCount}
                          </strong>
                          , 2nd Sem:{' '}
                          <strong
                            className={cn(
                              summary.enrollmentSummary.secondSemCount === 0 ? 'text-rose-600' : 'text-foreground',
                            )}
                          >
                            {summary.enrollmentSummary.secondSemCount}
                          </strong>
                        </span>

                        <span className="flex items-center gap-1 font-medium">
                          <GraduationCap className="h-3 w-3 text-muted-foreground" />
                          Graduates:{' '}
                          <strong
                            className={cn(
                              summary.graduationSummary.totalGraduates === 0 && !p.isNewProgram
                                ? 'text-amber-600'
                                : 'text-foreground',
                            )}
                          >
                            {summary.graduationSummary.totalGraduates}
                          </strong>
                        </span>

                        {p.isBoardProgram && (
                          <span className="flex items-center gap-1 font-medium">
                            <Award className="h-3 w-3 text-muted-foreground" />
                            Board Pass Rate:{' '}
                            <strong
                              className={cn(
                                summary.boardSummary.latestPassRate === null ? 'text-purple-600' : 'text-foreground',
                              )}
                            >
                              {summary.boardSummary.latestPassRate !== null
                                ? `${summary.boardSummary.latestPassRate}%`
                                : 'No Exam Data'}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Link href={`/academic-programs/${p.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-[11px] font-bold gap-1">
                          View Details <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedProgramId(isExpanded ? null : p.id)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {summary.warnings.length} Issue{summary.warnings.length !== 1 ? 's' : ''}{' '}
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 ml-1" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 ml-1" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Warning Pill Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 mt-2 border-t border-border/40">
                    {summary.warnings.map((w, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border',
                          w.severity === 'critical'
                            ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300',
                        )}
                      >
                        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                        {w.title}
                      </span>
                    ))}
                  </div>

                  {/* Expandable Accordion with Actionable Descriptions */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2 bg-muted/20 p-3 rounded-lg animate-in fade-in duration-200">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Info className="h-3.5 w-3.5 text-primary" />
                        Detailed Required Data Deficits for CHED Compliance:
                      </div>
                      <div className="space-y-1.5">
                        {summary.warnings.map((w, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs p-2 rounded-md bg-background border border-border/60"
                          >
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 mt-0.5',
                                w.severity === 'critical' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white',
                              )}
                            >
                              {w.severity}
                            </span>
                            <div className="space-y-0.5">
                              <div className="font-bold text-foreground">{w.title}</div>
                              <div className="text-muted-foreground text-[11px] leading-relaxed">{w.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2">
                        <Link href={`/academic-programs?tab=batch-hub&year=${selectedYear}&program=${p.id}`}>
                          <Button
                            size="sm"
                            className="h-7 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Log Student &amp; Compliance Data
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
