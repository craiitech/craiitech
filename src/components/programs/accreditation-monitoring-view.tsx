'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus, Unit, AccreditationRecommendation } from '@/lib/types';
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
  CalendarClock,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const complianceMap = useMemo(() => {
    const currentYearCompliances = compliances.filter((c) => c.academicYear === selectedYear);
    return new Map(currentYearCompliances.map((c) => [c.programId, c]));
  }, [compliances, selectedYear]);

  const [detailSearch, setDetailSearch] = useState('');
  const [detailCampusFilter, setDetailCampusFilter] = useState('all');
  const [detailUnitFilter, setDetailUnitFilter] = useState('all');
  const [detailLevelFilter, setDetailLevelFilter] = useState<string>('all');
  const [detailLifecycleFilter, setDetailLifecycleFilter] = useState<string>('all');
  const [detailSortBy, setDetailSortBy] = useState<string>('name');
  const [accredYearFilter, setAccredYearFilter] = useState<number | 'all'>('all');
  const [upcomingAccredYear, setUpcomingAccredYear] = useState<number | null>(null);
  const [recommendationsTypeFilter, setRecommendationsTypeFilter] = useState<string>('all');
  const [recommendationsStatusFilter, setRecommendationsStatusFilter] = useState<string>('all');
  const [isLevelBreakdownOpen, setIsLevelBreakdownOpen] = useState(false);
  const [recommendationsCampusFilter, setRecommendationsCampusFilter] = useState<string>('all');

  const currentCalendarYear = new Date().getFullYear();
  // Upcoming accreditation year options: current year + 1 through current year + 10
  const upcomingYearOptions = useMemo(
    () => Array.from({ length: 10 }, (_, i) => currentCalendarYear + 1 + i),
    [currentCalendarYear],
  );

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

  // ── Upcoming Accreditation: programs whose validity expires in the selected upcoming year ──
  const upcomingAccredPrograms = useMemo(() => {
    if (!upcomingAccredYear) return [];
    const programMap = new Map(programs.map((p) => [p.id, p]));
    const results: {
      programId: string;
      programName: string;
      abbreviation: string;
      campus: string;
      campusId: string;
      degreeLevel: string;
      accreditationLevel: string;
      validityDate: string;
      surveyDate: string;
      lifecycleStatus: string;
    }[] = [];

    compliances.forEach((c) => {
      const p = programMap.get(c.programId);
      if (!p) return;
      const accRecords = c.accreditationRecords || [];
      accRecords.forEach((rec) => {
        const validity = rec.statusValidityDate || '';
        if (!validity) return;
        const match = validity.match(/(\d{4})/);
        if (!match) return;
        const expYear = parseInt(match[1]);
        if (expYear !== upcomingAccredYear) return;
        // Only include records that are current or still active (not phased out)
        if (rec.lifecycleStatus === 'Completed') return;
        results.push({
          programId: c.programId,
          programName: p.name,
          abbreviation: p.abbreviation,
          campus: campusMap.get(c.campusId) || 'Unknown',
          campusId: c.campusId,
          degreeLevel: p.level,
          accreditationLevel: rec.level,
          validityDate: validity,
          surveyDate: rec.dateOfSurvey || '—',
          lifecycleStatus: rec.lifecycleStatus || 'N/A',
        });
      });
    });

    // Deduplicate by programId — keep the most relevant record
    const seen = new Map<string, (typeof results)[0]>();
    results.forEach((r) => {
      if (!seen.has(r.programId)) seen.set(r.programId, r);
    });

    return Array.from(seen.values()).sort(
      (a, b) => a.campus.localeCompare(b.campus) || a.programName.localeCompare(b.programName),
    );
  }, [upcomingAccredYear, compliances, programs, campusMap]);

  // Campus breakdown for upcoming accreditation visualization
  const upcomingCampusBreakdown = useMemo(() => {
    const campusCount = new Map<string, { name: string; count: number }>();
    upcomingAccredPrograms.forEach((p) => {
      if (!campusCount.has(p.campusId)) {
        campusCount.set(p.campusId, { name: p.campus, count: 0 });
      }
      campusCount.get(p.campusId)!.count++;
    });
    return Array.from(campusCount.values()).sort((a, b) => b.count - a.count);
  }, [upcomingAccredPrograms]);

  const handlePrintUpcomingAccreditation = () => {
    if (!upcomingAccredYear) return;
    const data = upcomingAccredPrograms;
    if (data.length === 0) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const generatedTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const docRef = `RSU-QAO-AMR-${upcomingAccredYear}-${new Date().getFullYear()}`;

    // Campus breakdown bars
    const maxCount = Math.max(...upcomingCampusBreakdown.map((c) => c.count), 1);
    const totalPrograms = data.length;
    const campusBarsHtml = upcomingCampusBreakdown
      .map((c) => {
        const pct = Math.round((c.count / maxCount) * 100);
        const overallPct = Math.round((c.count / totalPrograms) * 100);
        return `
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
            <span style="width:200px; font-size:11px; font-weight:700; color:#1e293b; text-align:right; flex-shrink:0;">${c.name}</span>
            <div style="flex:1; background:#f1f5f9; border-radius:999px; overflow:hidden; height:18px; border:1px solid #e2e8f0;">
              <div style="width:${pct}%; background:linear-gradient(90deg,#0284c7,#2563eb); height:100%; border-radius:999px; display:flex; align-items:center; padding-left:8px;">
                <span style="color:white; font-size:9.5px; font-weight:800; white-space:nowrap;">${c.count} program${c.count !== 1 ? 's' : ''} (${overallPct}%)</span>
              </div>
            </div>
            <span style="font-size:11px; font-weight:800; color:#1e293b; width:45px; text-align:right;">${c.count}</span>
          </div>
        `;
      })
      .join('');

    const rowsHtml = data
      .map(
        (p, idx) => `
          <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}">
            <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:center; font-weight:700; font-size:11px; color:#64748b;">${idx + 1}</td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1;">
              <div style="font-weight:800; font-size:12px; color:#0f172a;">${p.programName}</div>
              <div style="font-size:10px; color:#64748b; font-weight:600; margin-top:1px;">
                ${p.abbreviation ? `${p.abbreviation} &bull; ` : ''}${p.degreeLevel || 'Undergraduate'}
              </div>
            </td>
            <td style="padding:8px 12px; border:1px solid #cbd5e1; font-weight:700; font-size:11.5px; color:#334155;">${p.campus}</td>
            <td style="padding:8px 12px; text-align:center; border:1px solid #cbd5e1; font-weight:800; font-size:11px; color:#1e293b;">
              <span style="display:inline-block; padding:2px 8px; border-radius:4px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">
                ${p.accreditationLevel}
              </span>
            </td>
            <td style="padding:8px 12px; text-align:center; border:1px solid #cbd5e1; font-weight:600; font-size:11px; color:#475569;">${p.surveyDate}</td>
            <td style="padding:8px 12px; text-align:center; border:1px solid #cbd5e1; font-weight:600; font-size:11px; color:#475569;">${p.lifecycleStatus}</td>
            <td style="padding:8px 12px; text-align:center; border:1px solid #cbd5e1; font-weight:800; font-size:11.5px; color:#b91c1c;">
              <span style="display:inline-block; padding:2px 8px; border-radius:4px; background:#fef2f2; border:1px solid #fecaca;">
                ${p.validityDate}
              </span>
            </td>
          </tr>
        `,
      )
      .join('');

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${origin}/" />
          <meta charset="utf-8" />
          <title>Upcoming Accreditation Report — CY ${upcomingAccredYear}</title>
          <style>
            @page {
              size: landscape;
              margin: 0.4in;
            }
            @media print {
              body {
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              tr {
                page-break-inside: avoid;
              }
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              background: #f1f5f9;
              padding: 24px;
              color: #0f172a;
              margin: 0;
            }
            .document-sheet {
              max-width: 1200px;
              margin: 0 auto;
              background: #ffffff;
              padding: 32px 36px;
              border: 1px solid #cbd5e1;
              box-shadow: 0 4px 16px rgba(0,0,0,0.08);
            }
            @media print {
              body {
                padding: 0 !important;
                background: white !important;
              }
              .document-sheet {
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                max-width: 100% !important;
              }
            }
            .summary-box {
              display: flex;
              gap: 16px;
              margin-bottom: 20px;
            }
            .summary-card {
              flex: 1;
              background: #f8fafc;
              border-radius: 6px;
              padding: 12px 16px;
              border: 1px solid #cbd5e1;
              text-align: center;
            }
            .summary-card .num {
              font-size: 24px;
              font-weight: 900;
              color: #0f172a;
              line-height: 1.1;
            }
            .summary-card .lbl {
              font-size: 9.5px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
              margin-top: 4px;
            }
            .viz-card {
              background: #ffffff;
              border-radius: 6px;
              padding: 16px 20px;
              border: 1px solid #cbd5e1;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              background: white;
            }
            th {
              background: #f1f5f9;
              padding: 10px 12px;
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #1e293b;
              border: 1px solid #cbd5e1;
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: center; margin-bottom: 20px;">
            <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 12px 32px; border-radius: 6px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);">
              🖨️ Print Upcoming Report
            </button>
          </div>

          <div class="document-sheet">
            <!-- Institutional Letterhead -->
            <header style="width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 14px;">
                  <img src="/rsulogo.png" alt="RSU Seal" style="height: 52px; width: 52px; object-fit: contain;" />
                  <img src="/qa_logo.png" alt="QAO Logo" style="height: 50px; width: 50px; object-fit: contain;" />
                  <div>
                    <p style="font-size: 8pt; text-transform: uppercase; letter-spacing: 0.12em; color: #475569; margin: 0; font-weight: 700;">
                      Republic of the Philippines
                    </p>
                    <h1 style="font-size: 13.5pt; font-weight: 900; text-transform: uppercase; letter-spacing: -0.01em; color: #0f172a; margin: 2px 0 0; font-family: Georgia, Cambria, serif;">
                      ROMBLON STATE UNIVERSITY
                    </h1>
                    <h2 style="font-size: 9.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #1e293b; margin: 2px 0 0;">
                      QUALITY ASSURANCE OFFICE
                    </h2>
                    <p style="font-size: 7pt; color: #64748b; margin: 3px 0 0; line-height: 1.3;">
                      Liwanag, Odiongan, Romblon 5505 | Telephone: (042) 567-2201 | Email: qao@rsu.edu.ph | Website: rsu.edu.ph
                    </p>
                  </div>
                </div>
                <div style="display: flex; align-items: center;">
                  <img src="/ISOlogo.jpg" alt="ISO 9001:2015 TÜV Rheinland Certified" style="height: 48px; width: auto; object-fit: contain;" />
                </div>
              </div>
            </header>

            <!-- Document Title Banner -->
            <div style="border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a; background: #f8fafc; padding: 10px 16px; margin-bottom: 12px; text-align: center;">
              <h3 style="font-size: 11pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #0f172a; margin: 0;">
                UPCOMING RE-ACCREDITATION MONITORING REPORT
              </h3>
              <p style="font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 3px 0 0;">
                Programs with AACCUP Accreditation Validity Expiring in CY ${upcomingAccredYear}
              </p>
            </div>

            <!-- Metadata Strip -->
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 7.5pt; color: #475569; padding: 0 4px 10px; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px;">
              <div><strong>DOC REF:</strong> <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${docRef}</span></div>
              <div><strong>MONITORING SCOPE:</strong> Institutional Accreditation Validity Expiration Pipeline</div>
              <div><strong>DATE GENERATED:</strong> <span style="font-weight: 700; color: #0f172a;">${generatedDate}</span></div>
            </div>

            <!-- Summary KPI Strip -->
            <div class="summary-box">
              <div class="summary-card">
                <div class="num" style="color: #0284c7;">${data.length}</div>
                <div class="lbl">Programs for Re-Accreditation</div>
              </div>
              <div class="summary-card">
                <div class="num" style="color: #475569;">${upcomingCampusBreakdown.length}</div>
                <div class="lbl">Campuses Affected</div>
              </div>
              <div class="summary-card">
                <div class="num" style="color: #b91c1c;">${upcomingAccredYear}</div>
                <div class="lbl">Target Expiration Year</div>
              </div>
            </div>

            <!-- Visualization: Programs per Campus -->
            <div class="viz-card">
              <h4 style="margin: 0 0 12px 0; font-size: 10.5pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #1e293b;">
                Distribution of Expiring Programs by Campus
              </h4>
              ${campusBarsHtml}
            </div>

            <!-- Master Programs Table -->
            <h4 style="margin: 20px 0 10px 0; font-size: 10.5pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #1e293b;">
              Schedule of Academic Programs for Re-Accreditation (${upcomingAccredYear})
            </h4>
            <table>
              <thead>
                <tr>
                  <th style="width: 35px; text-align: center;">#</th>
                  <th style="text-align: left;">Academic Program</th>
                  <th style="text-align: left; width: 170px;">Campus</th>
                  <th style="text-align: center; width: 140px;">Current Level</th>
                  <th style="text-align: center; width: 110px;">Last Survey</th>
                  <th style="text-align: center; width: 100px;">Lifecycle</th>
                  <th style="text-align: center; width: 110px;">Validity Expires</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <!-- Machine Generated Notice Footer -->
            <div style="margin-top: 28px; border-top: 2px solid #cbd5e1; padding-top: 14px; text-align: center;">
              <div style="display: inline-block; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 20px; margin-bottom: 6px;">
                <p style="font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #0f172a; margin: 0;">
                  THIS IS A MACHINE GENERATED REPORT. NO SIGNATURE IS REQUIRED.
                </p>
              </div>
              <p style="font-size: 7.5pt; color: #64748b; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
                Romblon State University &bull; Quality Assurance Office (QAO) &bull; EOMS Decision Support System
              </p>
              <p style="font-size: 7pt; color: #94a3b8; margin: 2px 0 0;">
                Report Timestamp: ${generatedDate} ${generatedTime} &bull; Total Programs Listed: ${data.length}
              </p>
            </div>
          </div>
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

  // All Recommendations across all programs for the selected year
  const allRecommendations = useMemo(() => {
    const currentYearCompliances = compliances.filter((c) => c.academicYear === selectedYear);
    const complianceMap = new Map(currentYearCompliances.map((c) => [c.programId, c]));

    const recommendations: Array<{
      programId: string;
      programName: string;
      programAbbreviation: string;
      campus: string;
      campusId: string;
      unit: string;
      unitId: string;
      accreditationLevel: string;
      accreditationRecordId: string;
      surveyDate: string;
      validityDate: string;
      lifecycleStatus: string;
      recommendation: AccreditationRecommendation;
    }> = [];

    activePrograms.forEach((p) => {
      const c = complianceMap.get(p.id);
      const accRecords = c?.accreditationRecords || [];
      const campusName = campusMap.get(p.campusId) || 'Unknown';
      const unitName = unitMap.get(p.collegeId) || 'Unknown';

      accRecords.forEach((record) => {
        if (record.recommendations && record.recommendations.length > 0) {
          record.recommendations.forEach((rec) => {
            recommendations.push({
              programId: p.id,
              programName: p.name,
              programAbbreviation: p.abbreviation,
              campus: campusName,
              campusId: p.campusId,
              unit: unitName,
              unitId: p.collegeId,
              accreditationLevel: record.level,
              accreditationRecordId: record.id,
              surveyDate: record.dateOfSurvey || '—',
              validityDate: record.statusValidityDate || 'N/A',
              lifecycleStatus: record.lifecycleStatus || 'N/A',
              recommendation: rec,
            });
          });
        }
      });
    });

    return recommendations.sort((a, b) => {
      // Sort by: mandatory first, then by status (Open first), then by program name
      if (a.recommendation.type !== b.recommendation.type) {
        return a.recommendation.type === 'Mandatory' ? -1 : 1;
      }
      if (a.recommendation.status !== b.recommendation.status) {
        const statusOrder = { Open: 0, 'In Progress': 1, 'Move to the Official Current Level': 2, Closed: 3 };
        return (
          (statusOrder[a.recommendation.status as keyof typeof statusOrder] || 99) -
          (statusOrder[b.recommendation.status as keyof typeof statusOrder] || 99)
        );
      }
      return a.programName.localeCompare(b.programName);
    });
  }, [activePrograms, compliances, selectedYear, campusMap, unitMap]);

  // Filtered recommendations based on selected filters
  const filteredRecommendations = useMemo(() => {
    return allRecommendations.filter((item) => {
      // Filter by academic year
      if (accredYearFilter !== 'all') {
        const yearMatch = item.surveyDate.match(/\d{4}/);
        if (!yearMatch || parseInt(yearMatch[0]) !== accredYearFilter) {
          return false;
        }
      }
      // Filter by type
      if (recommendationsTypeFilter !== 'all' && item.recommendation.type !== recommendationsTypeFilter) {
        return false;
      }
      // Filter by status
      if (recommendationsStatusFilter !== 'all' && item.recommendation.status !== recommendationsStatusFilter) {
        return false;
      }
      // Filter by campus
      if (recommendationsCampusFilter !== 'all' && item.campusId !== recommendationsCampusFilter) {
        return false;
      }
      return true;
    });
  }, [
    allRecommendations,
    accredYearFilter,
    recommendationsTypeFilter,
    recommendationsStatusFilter,
    recommendationsCampusFilter,
  ]);

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
      {/* Level breakdown trigger inside AlertDialog */}
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

      {/* Level Breakdown Alert Dialog */}
      <AlertDialog open={isLevelBreakdownOpen} onOpenChange={setIsLevelBreakdownOpen}>
        <AlertDialogTrigger asChild>
          <div
            className="flex items-center gap-2 flex-wrap p-3 bg-muted/20 border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setIsLevelBreakdownOpen(true)}
          >
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
        </AlertDialogTrigger>

        <AlertDialogHeader>
          <AlertDialogTitle>Level Breakdown Analysis — AY {selectedYear}</AlertDialogTitle>
          <AlertDialogDescription>
            Distribution of programs by accreditation level with 4D visualization and program/campus listing
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Left: Visualization & Graphs */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4">Level Distribution</h3>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Level Distribution Chart
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-indigo-100 text-indigo-800 flex items-center justify-center text-[9px] font-black">
                      Level IV
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700">{stats.levelIV}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center text-[9px] font-black">
                      Level III
                    </div>
                    <span className="text-[10px] font-bold text-blue-700">{stats.levelIII}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-[9px] font-black">
                      Level II
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700">{stats.levelII}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-green-100 text-green-800 flex items-center justify-center text-[9px] font-black">
                      Level I
                    </div>
                    <span className="text-[10px] font-bold text-green-700">{stats.levelI}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center text-[9px] font-black">
                      Candidate
                    </div>
                    <span className="text-[10px] font-bold text-amber-700">{stats.candidate}</span>
                  </div>
                  {stats.newPrograms > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center text-[9px] font-black">
                        New Offering
                      </div>
                      <span className="text-[10px] font-bold text-purple-700">{stats.newPrograms}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: 4D Presentation */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4">4D Presentation</h3>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-violet-600" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                    4D Temporal View
                  </span>
                </div>
                <div className="relative h-64 w-full rounded-xl overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-50">
                  {/* 4D Donut Chart - simulating the executive display pattern */}
                  <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-indigo-600">
                    <svg viewBox="0 0 100 100" className="w-32 h-32">
                      <circle cx="50" cy="50" r="40" stroke="url(#grad)" stroke-width="15" fill="none" />
                      <circle cx="50" cy="50" r="40" stroke="url(#grad2)" stroke-width="15" fill="none" />
                      <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#8b5cf6" />
                          <stop offset="100%" stop-color="#ec4899" />
                        </linearGradient>
                        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#a78bfa" />
                          <stop offset="100%" stop-color="#f472b6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 opacity-20 bg-indigo-500/50 rounded-full" />
                    <span className="relative text-indigo-600 text-2xl font-black">
                      {stats.levelIV +
                        stats.levelIII +
                        stats.levelII +
                        stats.levelI +
                        stats.candidate +
                        (stats.newPrograms > 0 ? stats.newPrograms : 0)}
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                      Total Programs
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center pt-8">
                    <span className="text-2xl font-black text-indigo-600">
                      {stats.levelIV +
                        stats.levelIII +
                        stats.levelII +
                        stats.levelI +
                        stats.candidate +
                        (stats.newPrograms > 0 ? stats.newPrograms : 0)}
                    </span>
                    <span className="text-sm text-slate-500">Total Programs</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { name: 'Level IV', count: stats.levelIV, color: 'indigo' },
                    { name: 'Level III', count: stats.levelIII, color: 'blue' },
                    { name: 'Level II', count: stats.levelII, color: 'emerald' },
                    { name: 'Level I', count: stats.levelI, color: 'green' },
                    { name: 'Candidate', count: stats.candidate, color: 'amber' },
                  ].map((item, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-white/50 border border-opacity-30 text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        color:
                          item.color === 'indigo'
                            ? '#6366f1'
                            : item.color === 'blue'
                              ? '#3b82f6'
                              : item.color === 'emerald'
                                ? '#10b981'
                                : item.color === 'green'
                                  ? '#22c55e'
                                  : '#f59e0b',
                      }}
                    >
                      {item.name}: {item.count}
                    </span>
                  ))}
                  {stats.newPrograms > 0 && (
                    <span
                      key={6}
                      className="px-2 py-0.5 rounded bg-white/50 border border-opacity-30 text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: '#a78bfa' }}
                    >
                      New Offering: {stats.newPrograms}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Program and Campus List */}
          <div className="mt-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4">
              Program & Campus Listing
            </h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="pl-4 py-2 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                      Program
                    </TableHead>
                    <TableHead className="pl-4 py-2 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                      Campus
                    </TableHead>
                    <TableHead className="pl-4 py-2 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                      Level
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePrograms.slice(0, 10).map((p) => {
                    const c = complianceMap.get(p.id);
                    const accRecords = c?.accreditationRecords || [];
                    const current =
                      accRecords.find((r) => r.lifecycleStatus === 'Current') || accRecords[accRecords.length - 1];
                    const level = current?.level || 'N/A';
                    const campusName = campusMap.get(p.campusId) || 'Unknown';

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="pl-4 py-3 text-[10px]">{p.name}</TableCell>
                        <TableCell className="pl-4 py-3 text-[10px]">{campusName}</TableCell>
                        <TableCell className="pl-4 py-3 text-[10px]">{level}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 text-xs text-slate-500">Showing 10 of {activePrograms.length} programs</div>
          </div>
        </AlertDialogContent>

        <AlertDialogFooter>
          <AlertDialogCancel className="w-full">Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialog>

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
                <TabsTrigger
                  value="recommendations"
                  className="text-[9px] font-black uppercase tracking-widest px-4 h-7 gap-1.5"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600" /> Accreditor's Recommendations & Compliance
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
              <div className="p-4 border-b bg-slate-50/50 flex flex-wrap items-center gap-3 justify-between">
                {/* Row 1: Historical survey year filter */}
                <div className="flex flex-wrap items-center gap-3">
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

                  {/* Divider */}
                  <div className="h-5 w-px bg-slate-200 mx-1" />

                  {/* Upcoming accreditation filter */}
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      Upcoming Re-Accreditation Year:
                    </span>
                    <Select
                      value={upcomingAccredYear ? String(upcomingAccredYear) : 'none'}
                      onValueChange={(v) => setUpcomingAccredYear(v === 'none' ? null : Number(v))}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs bg-white border-rose-200 text-rose-700">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-[10px] font-bold">
                          — Select Year —
                        </SelectItem>
                        {upcomingYearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)} className="text-[10px] font-bold">
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {upcomingAccredYear && (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[9px] font-black">
                        {upcomingAccredPrograms.length} program{upcomingAccredPrograms.length !== 1 ? 's' : ''} expiring
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {upcomingAccredYear && upcomingAccredPrograms.length > 0 && (
                    <Button
                      onClick={handlePrintUpcomingAccreditation}
                      variant="outline"
                      size="sm"
                      className="h-8 bg-white border-rose-200 text-rose-700 font-black uppercase text-[9px] tracking-widest gap-1.5 shadow-sm hover:bg-rose-50"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Upcoming Report
                    </Button>
                  )}
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
              </div>

              {/* ── Upcoming Accreditation Panel ── */}
              {upcomingAccredYear && (
                <div className="border-b bg-gradient-to-br from-rose-50/60 to-orange-50/40 p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarClock className="h-4 w-4 text-rose-600" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-rose-800">
                      Programs for Re-Accreditation in {upcomingAccredYear}
                    </h3>
                    <Badge className="bg-rose-600 text-white text-[9px] font-black">
                      {upcomingAccredPrograms.length} program{upcomingAccredPrograms.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {upcomingAccredPrograms.length === 0 ? (
                    <div className="py-8 text-center">
                      <CalendarClock className="h-8 w-8 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-500">
                        No programs found with accreditation expiring in {upcomingAccredYear}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Programs will appear here when their validity dates match the selected year.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Summary KPI row */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-white rounded-xl border border-rose-200 p-3 shadow-sm">
                          <p className="text-[9px] font-black uppercase text-rose-700 tracking-wider">
                            Programs Expiring
                          </p>
                          <p className="text-2xl font-black text-rose-700 mt-1">{upcomingAccredPrograms.length}</p>
                          <p className="text-[9px] text-rose-500 font-semibold">
                            Need re-accreditation in {upcomingAccredYear}
                          </p>
                        </div>
                        <div className="bg-white rounded-xl border border-orange-200 p-3 shadow-sm">
                          <p className="text-[9px] font-black uppercase text-orange-700 tracking-wider">
                            Campuses Affected
                          </p>
                          <p className="text-2xl font-black text-orange-700 mt-1">{upcomingCampusBreakdown.length}</p>
                          <p className="text-[9px] text-orange-500 font-semibold">
                            Out of {campuses.length} total campuses
                          </p>
                        </div>
                        <div className="bg-white rounded-xl border border-amber-200 p-3 shadow-sm">
                          <p className="text-[9px] font-black uppercase text-amber-700 tracking-wider">
                            Years Until Expiry
                          </p>
                          <p className="text-2xl font-black text-amber-700 mt-1">
                            {upcomingAccredYear - currentCalendarYear}
                          </p>
                          <p className="text-[9px] text-amber-500 font-semibold">From {currentCalendarYear}</p>
                        </div>
                      </div>

                      {/* Campus Breakdown Bar Chart */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <BarChart3 className="h-4 w-4 text-indigo-600" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                            Programs per Campus — Expiring in {upcomingAccredYear}
                          </span>
                        </div>
                        <div className="space-y-2.5">
                          {upcomingCampusBreakdown.map((c) => {
                            const maxCount = Math.max(...upcomingCampusBreakdown.map((x) => x.count));
                            const pct = Math.round((c.count / maxCount) * 100);
                            return (
                              <div key={c.name} className="flex items-center gap-3">
                                <div className="w-36 text-[10px] font-bold text-slate-600 text-right shrink-0 leading-tight">
                                  {c.name}
                                </div>
                                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full flex items-center px-2.5 transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  >
                                    <span className="text-[9px] font-black text-white whitespace-nowrap">
                                      {c.count} program{c.count !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-sm font-black text-indigo-700 w-6 text-right">{c.count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Programs Table */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 border-b px-4 py-2 flex items-center gap-2">
                          <ListChecks className="h-3.5 w-3.5 text-rose-600" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                            Program Listing — Accreditation Expires in {upcomingAccredYear}
                          </span>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          <Table>
                            <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                              <TableRow>
                                <TableHead className="pl-5 py-3 text-[9px] font-black uppercase text-slate-500 tracking-wider">
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
                                  Last Survey
                                </TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">
                                  Lifecycle
                                </TableHead>
                                <TableHead className="text-right pr-5 text-[9px] font-black uppercase text-rose-600 tracking-wider">
                                  Validity Expires
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {upcomingAccredPrograms.map((item, idx) => (
                                <TableRow
                                  key={`${item.programId}-upcoming-${idx}`}
                                  className="hover:bg-rose-50/40 transition-all border-b"
                                >
                                  <TableCell className="pl-5 py-2.5">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-black text-slate-800 leading-tight">
                                        {item.programName}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-mono font-bold">
                                        {item.abbreviation} &bull; {item.degreeLevel}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <div className="flex items-center gap-1">
                                      <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                                      <span className="text-xs text-slate-600 font-medium">{item.campus}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    {accreditationBadge(item.accreditationLevel)}
                                  </TableCell>
                                  <TableCell className="py-2.5 text-center text-xs text-slate-600 font-medium">
                                    {item.surveyDate}
                                  </TableCell>
                                  <TableCell className="py-2.5 text-center">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-[8px] font-black',
                                        item.lifecycleStatus === 'Current'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : item.lifecycleStatus === 'Undergoing'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : 'bg-slate-100 text-slate-500 border-slate-200',
                                      )}
                                    >
                                      {item.lifecycleStatus}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right pr-5 py-2.5">
                                    <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                      {item.validityDate}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

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

            {/* SUB-TAB 3: Accreditor's Recommendations & Compliance Status */}
            <TabsContent value="recommendations" className="m-0">
              <div className="p-4 border-b bg-slate-50/50 flex flex-wrap items-center gap-3 justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Academic Year:</span>
                  <Select
                    value={accredYearFilter === 'all' ? 'all' : String(accredYearFilter)}
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
                  <div className="h-5 w-px bg-slate-200 mx-1" />
                  <Select value={recommendationsTypeFilter} onValueChange={setRecommendationsTypeFilter}>
                    <SelectTrigger className="h-8 w-[160px] text-xs bg-white border-slate-200">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[10px] font-bold">
                        All Types
                      </SelectItem>
                      <SelectItem value="Mandatory" className="text-[10px] font-bold text-rose-600">
                        Mandatory
                      </SelectItem>
                      <SelectItem value="Enhancement" className="text-[10px] font-bold text-blue-600">
                        Enhancement
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={recommendationsStatusFilter} onValueChange={setRecommendationsStatusFilter}>
                    <SelectTrigger className="h-8 w-[180px] text-xs bg-white border-slate-200">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[10px] font-bold">
                        All Status
                      </SelectItem>
                      <SelectItem value="Open" className="text-[10px] font-bold text-rose-600">
                        Open
                      </SelectItem>
                      <SelectItem value="In Progress" className="text-[10px] font-bold text-amber-600">
                        In Progress
                      </SelectItem>
                      <SelectItem
                        value="Move to the Official Current Level"
                        className="text-[10px] font-bold text-blue-600"
                      >
                        Move to Current Level
                      </SelectItem>
                      <SelectItem value="Closed" className="text-[10px] font-bold text-emerald-600">
                        Closed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={recommendationsCampusFilter} onValueChange={setRecommendationsCampusFilter}>
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
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {filteredRecommendations.length} recommendation{filteredRecommendations.length !== 1 ? 's' : ''}{' '}
                    shown
                  </span>
                </div>
              </div>

              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="pl-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Program
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Campus
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-indigo-700 tracking-wider">
                        <div className="flex items-center gap-1">
                          <Award className="h-3 w-3" /> Level
                        </div>
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Type
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-rose-600 tracking-wider">
                        Status
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Survey Date
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Validity Expires
                      </TableHead>
                      <TableHead className="pr-6 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Assigned Units
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecommendations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16">
                          <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                          <p className="text-xs font-bold text-slate-500">No recommendations found</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            No accreditation recommendations match the selected filters.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecommendations.map((item, idx) => (
                        <TableRow
                          key={`${item.programId}-${item.accreditationRecordId}-${item.recommendation.id}-${idx}`}
                          className="hover:bg-slate-50/80 transition-all border-b group"
                        >
                          <TableCell className="pl-6 py-3">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">
                                {item.programName}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] text-slate-400 font-mono font-bold">
                                  {item.programAbbreviation}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium">{item.unit}</span>
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
                          <TableCell className="text-center">
                            <Badge
                              className={cn(
                                'text-[8px] font-black px-2 py-0.5',
                                item.recommendation.type === 'Mandatory'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : 'bg-blue-100 text-blue-800 border-blue-200',
                              )}
                              variant="outline"
                            >
                              {item.recommendation.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[8px] font-black',
                                item.recommendation.status === 'Open'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : item.recommendation.status === 'In Progress'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : item.recommendation.status === 'Move to the Official Current Level'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200',
                              )}
                            >
                              {item.recommendation.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs text-slate-600 font-medium">
                            {item.surveyDate}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-1.5 whitespace-nowrap justify-center">
                              <span className="text-[10px] font-mono font-bold text-slate-600 tabular-nums">
                                {item.validityDate}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {item.recommendation.assignedUnitIds && item.recommendation.assignedUnitIds.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {item.recommendation.assignedUnitIds.map((unitId: string) => (
                                  <Badge
                                    key={unitId}
                                    variant="outline"
                                    className="text-[7px] font-black px-1.5 py-0 bg-slate-100 text-slate-600 border-slate-200"
                                  >
                                    {unitMap.get(unitId) || unitId}
                                  </Badge>
                                ))}
                              </div>
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
