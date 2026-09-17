'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Award,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Building2,
  CalendarDays,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  Printer,
  ListChecks,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface AccreditationMonitoringViewProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
}

export function AccreditationMonitoringView({
  programs,
  compliances,
  campuses,
  units,
  selectedYear,
}: AccreditationMonitoringViewProps) {
  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);

  const [detailSearch, setDetailSearch] = useState('');
  const [detailCampusFilter, setDetailCampusFilter] = useState('all');
  const [detailUnitFilter, setDetailUnitFilter] = useState('all');
  const [detailLevelFilter, setDetailLevelFilter] = useState<string>('all');
  const [detailLifecycleFilter, setDetailLifecycleFilter] = useState<string>('all');
  const [detailSortBy, setDetailSortBy] = useState<string>('name');
  const [accredYearFilter, setAccredYearFilter] = useState<number | 'all'>('all');

  const activePrograms = useMemo(() => programs.filter((p) => p.isActive), [programs]);

  // Historical / per-year accreditation surveys
  const accreditationPerYear = useMemo(() => {
    const programMap = new Map(programs.map((p) => [p.id, p]));

    const rows: {
      year: number;
      programId: string;
      programName: string;
      abbreviation: string;
      campus: string;
      level: string;
      dateOfSurvey: string;
      lifecycleStatus: string;
    }[] = [];

    compliances.forEach((c) => {
      const p = programMap.get(c.programId);
      if (!p) return;

      const accRecords = c.accreditationRecords || [];
      accRecords.forEach((rec) => {
        const surveyYear = rec.dateOfSurvey ? parseInt(rec.dateOfSurvey.match(/\d{4}/)?.[0] || '0') : 0;
        if (!surveyYear) return;
        rows.push({
          year: surveyYear,
          programId: c.programId,
          programName: p.name,
          abbreviation: p.abbreviation,
          campus: campusMap.get(c.campusId) || 'Unknown',
          level: rec.level,
          dateOfSurvey: rec.dateOfSurvey || '—',
          lifecycleStatus: rec.lifecycleStatus || 'N/A',
        });
      });
    });

    return rows.sort((a, b) => b.year - a.year || a.programName.localeCompare(b.programName));
  }, [compliances, programs, campusMap]);

  const accredYears = useMemo(() => {
    const years = new Set(accreditationPerYear.map((r) => r.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [accreditationPerYear]);

  const filteredAccredPerYear = useMemo(() => {
    if (accredYearFilter === 'all') return accreditationPerYear;
    return accreditationPerYear.filter((r) => r.year === accredYearFilter);
  }, [accreditationPerYear, accredYearFilter]);

  // Current AY Program Accreditation details
  const programDetailData = useMemo(() => {
    const currentYearCompliances = compliances.filter((c) => c.academicYear === selectedYear);
    const complianceMap = new Map(currentYearCompliances.map((c) => [c.programId, c]));

    return activePrograms
      .map((p) => {
        const c = complianceMap.get(p.id);
        const accRecords = c?.accreditationRecords || [];
        const current = accRecords.find((r) => r.lifecycleStatus === 'Current') || accRecords[accRecords.length - 1];
        const level = current?.level || 'Non Accredited';
        const lifecycle = current?.lifecycleStatus || 'N/A';
        const validity = current?.statusValidityDate || 'N/A';
        const surveyDate = current?.dateOfSurvey || '—';
        const openRecs = accRecords.reduce((count, r) => {
          return (
            count +
            (r.recommendations?.filter((rec) => rec.type === 'Mandatory' && rec.status !== 'Closed').length || 0)
          );
        }, 0);
        const campusName = campusMap.get(p.campusId) || 'Unknown';
        const unitName = unitMap.get(p.collegeId) || 'Unknown';

        const isAccredited =
          current && level !== 'Non Accredited' && !level.includes('PSV') && level !== 'AWAITING RESULT';

        // Check if validity date is expiring or expired
        let validityStatus: 'valid' | 'expiring' | 'expired' | 'unknown' = 'unknown';
        if (validity && validity !== 'N/A') {
          const matchYear = validity.match(/\d{4}/);
          if (matchYear) {
            const expYear = parseInt(matchYear[0]);
            const currentYear = new Date().getFullYear();
            if (expYear < currentYear) {
              validityStatus = 'expired';
            } else if (expYear === currentYear) {
              validityStatus = 'expiring';
            } else {
              validityStatus = 'valid';
            }
          }
        }

        return {
          id: p.id,
          name: p.name,
          abbreviation: p.abbreviation,
          degreeLevel: p.level,
          campusId: p.campusId,
          campus: campusName,
          unitId: p.collegeId,
          unit: unitName,
          hasRecord: !!c,
          accreditationLevel: isAccredited ? level : p.isNewProgram ? 'New Offering' : level,
          isAccredited,
          lifecycle,
          surveyDate,
          validityDate: validity,
          validityStatus,
          openRecs,
          isNewProgram: p.isNewProgram,
        };
      })
      .filter((item) => {
        if (detailCampusFilter !== 'all' && item.campusId !== detailCampusFilter) return false;
        if (detailUnitFilter !== 'all' && item.unitId !== detailUnitFilter) return false;
        if (detailLevelFilter !== 'all') {
          if (detailLevelFilter === 'Accredited' && !item.isAccredited) return false;
          if (detailLevelFilter === 'Non Accredited' && item.isAccredited) return false;
          if (
            detailLevelFilter !== 'Accredited' &&
            detailLevelFilter !== 'Non Accredited' &&
            !item.accreditationLevel.includes(detailLevelFilter)
          ) {
            return false;
          }
        }
        if (detailLifecycleFilter !== 'all' && item.lifecycle !== detailLifecycleFilter) return false;
        if (detailSearch) {
          const s = detailSearch.toLowerCase();
          if (!item.name.toLowerCase().includes(s) && !item.abbreviation.toLowerCase().includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (detailSortBy === 'name') return a.name.localeCompare(b.name);
        if (detailSortBy === 'campus') return a.campus.localeCompare(b.campus);
        if (detailSortBy === 'level') return b.accreditationLevel.localeCompare(a.accreditationLevel);
        if (detailSortBy === 'recs') return b.openRecs - a.openRecs;
        return a.name.localeCompare(b.name);
      });
  }, [
    activePrograms,
    compliances,
    selectedYear,
    campusMap,
    unitMap,
    detailSearch,
    detailCampusFilter,
    detailUnitFilter,
    detailLevelFilter,
    detailLifecycleFilter,
    detailSortBy,
  ]);

  // Overall KPIs for Accreditation
  const stats = useMemo(() => {
    const total = programDetailData.length;
    const newPrograms = programDetailData.filter((p) => p.isNewProgram).length;
    const accreditable = total - newPrograms;
    const accredited = programDetailData.filter((p) => p.isAccredited).length;
    const nonAccredited = programDetailData.filter((p) => !p.isAccredited && !p.isNewProgram).length;
    const rate = accreditable > 0 ? Math.round((accredited / accreditable) * 100) : 0;

    let levelIV = 0;
    let levelIII = 0;
    let levelII = 0;
    let levelI = 0;
    let candidate = 0;
    let openRecsTotal = 0;
    let expiringOrExpired = 0;

    programDetailData.forEach((p) => {
      const lvl = p.accreditationLevel;
      if (lvl.includes('Level IV')) levelIV++;
      else if (lvl.includes('Level III')) levelIII++;
      else if (lvl.includes('Level II')) levelII++;
      else if (lvl.includes('Level I')) levelI++;
      else if (lvl.toLowerCase().includes('candidate') || lvl.includes('PSV')) candidate++;

      openRecsTotal += p.openRecs;
      if (p.validityStatus === 'expiring' || p.validityStatus === 'expired') expiringOrExpired++;
    });

    return {
      total,
      accreditable,
      accredited,
      nonAccredited,
      newPrograms,
      rate,
      levelIV,
      levelIII,
      levelII,
      levelI,
      candidate,
      openRecsTotal,
      expiringOrExpired,
    };
  }, [programDetailData]);

  const accreditationBadge = (level: string) => {
    if (level.includes('Level IV'))
      return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[9px] font-black">{level}</Badge>;
    if (level.includes('Level III'))
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[9px] font-black">{level}</Badge>;
    if (level.includes('Level II'))
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] font-black">{level}</Badge>
      );
    if (level.includes('Level I'))
      return <Badge className="bg-green-100 text-green-800 border-green-200 text-[9px] font-black">{level}</Badge>;
    if (level.toLowerCase().includes('candidate') || level.includes('PSV'))
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] font-black">{level}</Badge>;
    if (level === 'New Offering')
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[9px] font-black">{level}</Badge>;
    return <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[9px] font-black">{level}</Badge>;
  };

  const handlePrintAccredPerYear = () => {
    const data = filteredAccredPerYear;
    const yearGroups: Record<number, typeof data> = {};
    data.forEach((row) => {
      if (!yearGroups[row.year]) yearGroups[row.year] = [];
      yearGroups[row.year].push(row);
    });
    const sortedYears = Object.keys(yearGroups)
      .map(Number)
      .sort((a, b) => b - a);

    const rowsHtml = sortedYears
      .map((year) => {
        const rows = yearGroups[year];
        return rows
          .map(
            (row, idx) => `
          <tr>
            <td style="padding: 10px 16px; font-weight: 900; font-size: 14px; border-bottom: 1px solid #e2e8f0;${idx !== 0 ? ' border-top: 1px solid #e2e8f0;' : ''}">${idx === 0 ? `AY ${row.year}` : ''}</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0;"><span style="font-weight: 900; font-size: 13px;">${row.programName}</span><br><span style="font-size: 10px; color: #94a3b8; font-weight: 700;">${row.abbreviation}</span></td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">${row.campus}</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${row.level}</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${row.dateOfSurvey}</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0;${idx === 0 ? ' font-weight: 900;' : ''}">${idx === 0 ? `<span style="display:inline-block; background:#4f46e5; color:white; font-size:11px; font-weight:900; padding:4px 14px; border-radius:999px;">${rows.length} program${rows.length !== 1 ? 's' : ''}</span>` : ''}</td>
          </tr>
        `,
          )
          .join('');
      })
      .join('');

    const printHtml = `
      <html>
        <head>
          <title>Programs Undergone Accreditation per Year</title>
          <style>
            @page { size: 14in 8.5in landscape !important; margin: 0.5in !important; }
            @media print { body { background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
            body { font-family: 'Inter', -apple-system, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin-bottom: 4px; }
            p.subtitle { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            th { background: #f1f5f9; padding: 12px 16px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0; }
            th:nth-child(5), th:nth-child(6) { text-align: center; }
            .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align:center; margin-bottom: 20px;">
            <button onclick="window.print()" style="background:#4f46e5; color:white; border:none; padding:12px 32px; border-radius:8px; font-weight:900; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer;">Print Accreditation Survey Report</button>
          </div>
          <h1>Programs that Undergone Accreditation per Year</h1>
          <p class="subtitle">Romblon State University • Quality Assurance & Institutional Accreditation (AACCUP)</p>
          <table>
            <thead>
              <tr>
                <th>Academic Year</th>
                <th>Program Title</th>
                <th>Campus</th>
                <th>Accreditation Level</th>
                <th style="text-align:center;">Date of Survey</th>
                <th style="text-align:center;">Total Group</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">Generated from RSU EOMS Decision Support System</div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
  };

  const handlePrintProgramDetails = () => {
    const rowsHtml = programDetailData
      .map(
        (p) => `
          <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0;">
              <span style="font-weight: 900; font-size: 13px;">${p.name}</span><br>
              <span style="font-size: 10px; color: #94a3b8; font-weight: 700;">${p.abbreviation} &bull; ${p.degreeLevel}</span>
            </td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">${p.campus}</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">${p.unit}</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 800;">${p.accreditationLevel}</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 11px;">${p.surveyDate}</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 11px;">${p.lifecycle}</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 11px;">${p.validityDate}</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 900; color: ${p.openRecs > 0 ? '#dc2626' : '#059669'};">${p.openRecs}</td>
          </tr>
        `,
      )
      .join('');

    const printHtml = `
      <html>
        <head>
          <title>Program Accreditation Status Details — AY ${selectedYear}</title>
          <style>
            @page { size: 14in 8.5in landscape !important; margin: 0.5in !important; }
            @media print { body { background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
            body { font-family: 'Inter', -apple-system, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin-bottom: 4px; }
            p.subtitle { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            th { background: #f1f5f9; padding: 12px 16px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; text-align: center; border-bottom: 2px solid #e2e8f0; }
            th:first-child, th:nth-child(2), th:nth-child(3) { text-align: left; }
            td:first-child, td:nth-child(2), td:nth-child(3) { text-align: left; }
            .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align:center; margin-bottom: 20px;">
            <button onclick="window.print()" style="background:#4f46e5; color:white; border:none; padding:12px 32px; border-radius:8px; font-weight:900; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer;">Print Accreditation Details</button>
          </div>
          <h1>Program Accreditation Status — AY ${selectedYear}</h1>
          <p class="subtitle">Romblon State University • Accreditation Agency Registry</p>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;">Program Title</th>
                <th style="text-align:left;">Campus</th>
                <th style="text-align:left;">Academic Unit</th>
                <th>Accreditation Level</th>
                <th>Survey Date</th>
                <th>Lifecycle</th>
                <th>Validity Expiration</th>
                <th>Open Recs</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">Generated from RSU EOMS Decision Support System • Total: ${programDetailData.length} programs</div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Highlight KPI Cards for Accreditation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-indigo-200 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-indigo-900 tracking-wider">Accredited Programs</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-indigo-700">{stats.accredited}</h3>
                <span className="text-xs font-black text-indigo-600">({stats.rate}%)</span>
              </div>
              <p className="text-[9px] font-semibold text-indigo-600 mt-0.5">
                of {stats.accreditable} accreditable programs
              </p>
            </div>
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
              <Award className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Non-Accredited / Ineligible
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-slate-800">{stats.nonAccredited}</h3>
                {stats.newPrograms > 0 && (
                  <span className="text-[10px] font-bold text-purple-600">+{stats.newPrograms} New</span>
                )}
              </div>
              <p className="text-[9px] font-semibold text-slate-500 mt-0.5">Awaiting eligibility/survey</p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">High Maturity Levels</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-emerald-700">{stats.levelIV + stats.levelIII}</h3>
                <span className="text-xs font-bold text-emerald-600">
                  (IV: {stats.levelIV} &bull; III: {stats.levelIII})
                </span>
              </div>
              <p className="text-[9px] font-semibold text-emerald-600 mt-0.5">Level III & IV Re-accredited</p>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Action Items & Recs</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-amber-700">{stats.openRecsTotal}</h3>
                {stats.expiringOrExpired > 0 && (
                  <span className="text-[10px] font-bold text-rose-600">({stats.expiringOrExpired} Expiring)</span>
                )}
              </div>
              <p className="text-[9px] font-semibold text-amber-600 mt-0.5">Open Mandatory Recommendations</p>
            </div>
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Badges Quick Summary */}
      <div className="flex items-center gap-2 flex-wrap p-3 bg-muted/20 border rounded-xl">
        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider mr-2">
          Level Breakdown (AY {selectedYear}):
        </span>
        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[9px] font-black">
          Level IV: {stats.levelIV}
        </Badge>
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[9px] font-black">
          Level III: {stats.levelIII}
        </Badge>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] font-black">
          Level II: {stats.levelII}
        </Badge>
        <Badge className="bg-green-100 text-green-800 border-green-200 text-[9px] font-black">
          Level I: {stats.levelI}
        </Badge>
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] font-black">
          Candidate: {stats.candidate}
        </Badge>
        {stats.newPrograms > 0 && (
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[9px] font-black">
            New Offering: {stats.newPrograms}
          </Badge>
        )}
      </div>

      {/* Main Accreditation Monitoring Tabs Card */}
      <Card className="border-primary/10 shadow-lg overflow-hidden bg-white">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border-b py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white shadow-sm border border-indigo-200">
                <Award className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Accreditation Monitoring Dashboard
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  AACCUP Survey Schedules, Program Levels, Validity, and Recommendations
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrintProgramDetails}
                variant="outline"
                size="sm"
                className="h-8 bg-white border-indigo-200 text-indigo-700 font-black uppercase text-[9px] tracking-widest gap-1.5 shadow-sm hover:bg-indigo-50"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Status Report
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="program-detail" className="flex flex-col">
            <div className="bg-slate-50/80 border-b px-4 py-2.5 flex items-center justify-between">
              <TabsList className="bg-white border shadow-sm h-8 p-0.5">
                <TabsTrigger
                  value="program-detail"
                  className="text-[9px] font-black uppercase tracking-widest px-4 h-7 gap-1.5"
                >
                  <Award className="h-3.5 w-3.5 text-indigo-600" /> Program Levels & Validity (AY {selectedYear})
                </TabsTrigger>
                <TabsTrigger
                  value="per-year"
                  className="text-[9px] font-black uppercase tracking-widest px-4 h-7 gap-1.5"
                >
                  <ListChecks className="h-3.5 w-3.5 text-blue-600" /> Programs Surveyed per Year
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                Institutional Quality Assurance
              </div>
            </div>

            {/* SUB-TAB 1: Program Levels & Validity (Current AY) */}
            <TabsContent value="program-detail" className="m-0">
              <div className="p-4 border-b bg-slate-50/50">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search program by name or acronym..."
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      className="pl-9 h-8 text-xs bg-white border-slate-200"
                    />
                  </div>
                  <Select value={detailCampusFilter} onValueChange={setDetailCampusFilter}>
                    <SelectTrigger className="h-8 w-[140px] text-xs bg-white border-slate-200">
                      <SelectValue placeholder="All Campuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[10px] font-bold">
                        All Campuses
                      </SelectItem>
                      {campuses.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-[10px] font-medium">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={detailUnitFilter} onValueChange={setDetailUnitFilter}>
                    <SelectTrigger className="h-8 w-[140px] text-xs bg-white border-slate-200">
                      <SelectValue placeholder="All Units" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[10px] font-bold">
                        All Units
                      </SelectItem>
                      {units
                        .filter((u) => u.category === 'Academic')
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-[10px] font-medium">
                            {u.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select value={detailLevelFilter} onValueChange={setDetailLevelFilter}>
                    <SelectTrigger className="h-8 w-[140px] text-xs bg-white border-slate-200">
                      <SelectValue placeholder="Level Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[10px] font-bold">
                        All Levels
                      </SelectItem>
                      <SelectItem value="Accredited" className="text-[10px] font-bold text-indigo-600">
                        Accredited Only
                      </SelectItem>
                      <SelectItem value="Level IV" className="text-[10px] font-bold">
                        Level IV
                      </SelectItem>
                      <SelectItem value="Level III" className="text-[10px] font-bold">
                        Level III
                      </SelectItem>
                      <SelectItem value="Level II" className="text-[10px] font-bold">
                        Level II
                      </SelectItem>
                      <SelectItem value="Level I" className="text-[10px] font-bold">
                        Level I
                      </SelectItem>
                      <SelectItem value="Candidate" className="text-[10px] font-bold">
                        Candidate
                      </SelectItem>
                      <SelectItem value="Non Accredited" className="text-[10px] font-bold text-slate-500">
                        Non-Accredited
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={detailLifecycleFilter} onValueChange={setDetailLifecycleFilter}>
                    <SelectTrigger className="h-8 w-[130px] text-xs bg-white border-slate-200">
                      <SelectValue placeholder="Lifecycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[10px] font-bold">
                        All Lifecycle
                      </SelectItem>
                      <SelectItem value="Current" className="text-[10px] font-bold text-emerald-600">
                        Current
                      </SelectItem>
                      <SelectItem value="Undergoing" className="text-[10px] font-bold text-amber-600">
                        Undergoing
                      </SelectItem>
                      <SelectItem value="Phased Out" className="text-[10px] font-bold text-rose-600">
                        Phased Out
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={detailSortBy} onValueChange={setDetailSortBy}>
                    <SelectTrigger className="h-8 w-[130px] text-xs bg-white border-slate-200">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name" className="text-[10px] font-bold">
                        Sort: Name
                      </SelectItem>
                      <SelectItem value="campus" className="text-[10px] font-bold">
                        Sort: Campus
                      </SelectItem>
                      <SelectItem value="level" className="text-[10px] font-bold">
                        Sort: Level
                      </SelectItem>
                      <SelectItem value="recs" className="text-[10px] font-bold">
                        Sort: Open Recs
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {programDetailData.length} program{programDetailData.length !== 1 ? 's' : ''} shown
                    </span>
                  </div>
                </div>
              </div>

              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="pl-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Program Name
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Campus
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-indigo-700 tracking-wider">
                        <div className="flex items-center gap-1">
                          <Award className="h-3 w-3" /> Current Level
                        </div>
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Survey Date
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Lifecycle Status
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Validity Expiration
                      </TableHead>
                      <TableHead className="text-right pr-6 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Mandatory Recs
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programDetailData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <Award className="h-8 w-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                          <p className="text-xs font-bold text-slate-500">No programs match the selected filters</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Try adjusting the level, campus, or search query.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      programDetailData.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/80 transition-all border-b group">
                          <TableCell className="pl-6 py-3">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] text-slate-400 font-mono font-bold">
                                  {item.abbreviation}
                                </span>
                                {item.isNewProgram && (
                                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[7px] font-black py-0 px-1">
                                    New Offering
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                              {item.campus}
                            </div>
                          </TableCell>
                          <TableCell>{accreditationBadge(item.accreditationLevel)}</TableCell>
                          <TableCell className="text-xs text-slate-600 font-medium">{item.surveyDate}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[8px] font-black',
                                item.lifecycle === 'Current'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : item.lifecycle === 'Undergoing'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200',
                              )}
                            >
                              {item.lifecycle}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="text-[10px] font-mono font-bold text-slate-600 tabular-nums">
                                {item.validityDate}
                              </span>
                              {item.validityStatus === 'expired' && (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[7px] font-black py-0 px-1">
                                  Expired
                                </Badge>
                              )}
                              {item.validityStatus === 'expiring' && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[7px] font-black py-0 px-1">
                                  Expiring
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {item.hasRecord ? (
                              item.openRecs > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                  <AlertTriangle className="h-3 w-3" /> {item.openRecs} open
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3" /> 0 open
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

            {/* SUB-TAB 2: Programs Surveyed per Year */}
            <TabsContent value="per-year" className="m-0">
              <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Survey Academic Year:
                  </span>
                  <Select
                    value={String(accredYearFilter)}
                    onValueChange={(v) => setAccredYearFilter(v === 'all' ? 'all' : Number(v))}
                  >
                    <SelectTrigger className="h-8 w-[130px] text-xs bg-white border-slate-200">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[10px] font-bold">
                        All Years
                      </SelectItem>
                      {accredYears.map((y) => (
                        <SelectItem key={y} value={String(y)} className="text-[10px] font-bold">
                          AY {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handlePrintAccredPerYear}
                  variant="outline"
                  size="sm"
                  className="h-8 bg-white border-indigo-200 text-indigo-700 font-black uppercase text-[9px] tracking-widest gap-1.5 shadow-sm hover:bg-indigo-50"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Survey Report
                </Button>
              </div>

              {filteredAccredPerYear.length === 0 ? (
                <div className="py-16 text-center">
                  <Award className="h-10 w-10 mx-auto text-slate-300 mb-3 stroke-[1.5]" />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    No accreditation survey records found
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">No survey records match the selected year filter.</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="pl-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                          Academic Year
                        </TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                          Program Title
                        </TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                          Campus
                        </TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-indigo-700 tracking-wider">
                          <div className="flex items-center gap-1">
                            <Award className="h-3 w-3" /> Accreditation Level
                          </div>
                        </TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">
                          Survey Date
                        </TableHead>
                        <TableHead className="text-right pr-6 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const yearGroups: Record<number, typeof filteredAccredPerYear> = {};
                        filteredAccredPerYear.forEach((row) => {
                          if (!yearGroups[row.year]) yearGroups[row.year] = [];
                          yearGroups[row.year].push(row);
                        });
                        const sortedYears = Object.keys(yearGroups)
                          .map(Number)
                          .sort((a, b) => b - a);
                        return sortedYears.flatMap((year) => {
                          const rows = yearGroups[year];
                          return rows.map((row, idx) => (
                            <TableRow
                              key={`${row.programId}-${row.year}-${idx}`}
                              className="hover:bg-slate-50/80 transition-all border-b group"
                            >
                              <TableCell className="pl-6 py-3 align-top">
                                {idx === 0 ? (
                                  <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                                    AY {row.year}
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">
                                    {row.programName}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono font-bold">
                                    {row.abbreviation}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                    {row.campus}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">{accreditationBadge(row.level)}</TableCell>
                              <TableCell className="py-3 text-center text-xs text-slate-600 font-medium">
                                {row.dateOfSurvey}
                              </TableCell>
                              <TableCell className="text-right pr-6 py-3 align-top">
                                {idx === 0 ? (
                                  <Badge className="bg-indigo-600 text-white text-[9px] font-black px-3 py-1">
                                    {rows.length} program{rows.length !== 1 ? 's' : ''}
                                  </Badge>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          ));
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
