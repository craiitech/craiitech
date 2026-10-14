'use client';

import React, { useState, useMemo } from 'react';
import type { EomsPolicyManual } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Chart3DDefs } from '@/components/ui/chart-3d-defs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Layers,
  FileCheck,
  Eye,
  ShieldCheck,
  Search,
  ExternalLink,
  Award,
  Calendar,
  Hash,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Printer,
  Compass,
  LayoutGrid,
  Table as TableIcon,
  Info,
  Building2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface IsoClauseMeta {
  sectionId: string;
  number: number;
  clauseCode: string;
  standardTitle: string;
  domain: 'Context & Direction' | 'Leadership' | 'Planning' | 'Support' | 'Operation' | 'Evaluation & Improvement';
  description: string;
  keyRequirements: string[];
  suggestedLead: string;
  defaultPageCount: number;
}

export const ISO_21001_CLAUSES: IsoClauseMeta[] = [
  {
    sectionId: 'section-1',
    number: 1,
    clauseCode: 'Clause 1',
    standardTitle: 'Scope of the EOMS',
    domain: 'Context & Direction',
    description:
      'Establishes the boundary, applicability, and core educational services covered by the RSU Educational Organization Management System.',
    keyRequirements: [
      'Applicability across all RSU university campuses and academic units',
      'Commitment to learner satisfaction, inclusivity, and educational excellence',
      'Integration of statutory, regulatory, and CHED compliance requirements',
    ],
    suggestedLead: 'Quality Assurance Office / Office of the University President',
    defaultPageCount: 8,
  },
  {
    sectionId: 'section-2',
    number: 2,
    clauseCode: 'Clause 2',
    standardTitle: 'Normative References',
    domain: 'Context & Direction',
    description:
      'Cites mandatory statutory, regulatory guidelines, CHED memoranda, and ISO reference standards applicable to RSU.',
    keyRequirements: [
      'ISO 21001:2018 Standard for Educational Organizations',
      'CHED Memorandum Orders (CMOs) and RA 8292 (Higher Education Modernization Act)',
      'Philippine Quality Award (PQA) and Civil Service Commission mandates',
    ],
    suggestedLead: 'Legal Office / Quality Assurance Office',
    defaultPageCount: 6,
  },
  {
    sectionId: 'section-3',
    number: 3,
    clauseCode: 'Clause 3',
    standardTitle: 'Terms and Definitions',
    domain: 'Context & Direction',
    description:
      'Defines educational terminology, special needs education concepts, and quality assurance nomenclature used throughout RSU.',
    keyRequirements: [
      'Harmonized definitions of Learners, Beneficiaries, and Interested Parties',
      'Curriculum, Competency, and Learning Outcomes definitions',
      'Special Educational Needs (SEN) and accessibility guidelines',
    ],
    suggestedLead: 'Academic Affairs / Quality Management System Unit',
    defaultPageCount: 12,
  },
  {
    sectionId: 'section-4',
    number: 4,
    clauseCode: 'Clause 4',
    standardTitle: 'Context of the Organization',
    domain: 'Context & Direction',
    description:
      'Analyzes internal and external factors, requirements of learners and other beneficiaries, and the university organizational profile.',
    keyRequirements: [
      'Comprehensive PESTLE & SWOT analysis of RSU operating environment',
      'Needs and expectations matrix for students, alumni, faculty, and industry partners',
      'Formally documented boundary and scope of the RSU EOMS',
    ],
    suggestedLead: 'Planning and Development Office / VPAA',
    defaultPageCount: 24,
  },
  {
    sectionId: 'section-5',
    number: 5,
    clauseCode: 'Clause 5',
    standardTitle: 'Leadership & Commitment',
    domain: 'Leadership',
    description:
      'Governs University Board of Regents and Executive Management commitment, Quality Policy, and organizational roles & ethics.',
    keyRequirements: [
      'University President and Executive Council quality commitments',
      'Institutional EOMS Quality Policy statement dissemination',
      'Organizational structure, authority matrices, and accountability assignments',
    ],
    suggestedLead: 'Office of the President / Board of Regents Secretariat',
    defaultPageCount: 22,
  },
  {
    sectionId: 'section-6',
    number: 6,
    clauseCode: 'Clause 6',
    standardTitle: 'Planning & Risk Management',
    domain: 'Planning',
    description:
      'Details institutional risk and opportunity management, educational quality objectives, and management of systemic changes.',
    keyRequirements: [
      'Institutional Risk & Opportunities Register (ROR) methodology',
      'SMART educational and operational quality objectives with KPI targets',
      'Systematic change management and continuity protocols',
    ],
    suggestedLead: 'Risk Management Committee / QAO Director',
    defaultPageCount: 26,
  },
  {
    sectionId: 'section-7',
    number: 7,
    clauseCode: 'Clause 7',
    standardTitle: 'Support & Resource Management',
    domain: 'Support',
    description:
      'Covers human resources, learning infrastructure, digital work environment, competence, awareness, and documented information.',
    keyRequirements: [
      'Faculty & administrative staff recruitment, onboarding, and competence tracking',
      'Classrooms, research laboratories, library, and ICT infrastructure adequacy',
      'Institutional Documented Information Control (Document Masterlist & Archiving)',
    ],
    suggestedLead: 'HRMO / ICT Center / Physical Plant and Facilities Office',
    defaultPageCount: 34,
  },
  {
    sectionId: 'section-8',
    number: 8,
    clauseCode: 'Clause 8',
    standardTitle: 'Educational Operational Delivery',
    domain: 'Operation',
    description:
      'The core pedagogical engine: curriculum design, admission, instruction, learner assessment, student support, and graduation.',
    keyRequirements: [
      'Outcomes-Based Education (OBE) curriculum design and review protocols',
      'Fair, transparent admission, grading, and graduation evaluation criteria',
      'Safeguarding intellectual property and ethical educational delivery',
    ],
    suggestedLead: 'Vice President for Academic Affairs / University Deans',
    defaultPageCount: 48,
  },
  {
    sectionId: 'section-9',
    number: 9,
    clauseCode: 'Clause 9',
    standardTitle: 'Performance Evaluation & Audit',
    domain: 'Evaluation & Improvement',
    description:
      'Monitors learner satisfaction, customer feedback, internal quality audits, KPI tracking, and Management Review Meetings.',
    keyRequirements: [
      'Client Satisfaction Measurement (CSM) across all colleges and service units',
      'Annual Internal Quality Audit (IQA) schedules, findings, and auditor rosters',
      'Annual Executive Management Review agenda, inputs, and decision records',
    ],
    suggestedLead: 'Lead Internal Auditor / Quality Assurance Office',
    defaultPageCount: 30,
  },
  {
    sectionId: 'section-10',
    number: 10,
    clauseCode: 'Clause 10',
    standardTitle: 'Continual Improvement & CAPA',
    domain: 'Evaluation & Improvement',
    description:
      'Defines handling of nonconformities, Corrective and Preventive Actions (CAPA), root cause analysis, and continual improvement initiatives.',
    keyRequirements: [
      'Corrective Action Plan (CAP) issuance, verification, and closure protocols',
      'Root-cause investigation methodologies (5-Whys, Ishikawa diagrams)',
      'Institutionalization of best practices and innovation pipelines',
    ],
    suggestedLead: 'Quality Management System Unit / University QAO',
    defaultPageCount: 18,
  },
];

export interface ClauseRegistryItem extends IsoClauseMeta {
  live?: EomsPolicyManual;
  isConfigured: boolean;
  title: string;
  revision: string;
  pageCount: number;
  executionDate: string;
  googleDriveLink: string;
  hasDriveLink: boolean;
  status: 'Active' | 'Pending';
}

interface EomsManualVisualizationProps {
  manualsMap: Map<string, EomsPolicyManual>;
  onViewSection?: (sectionId: string) => void;
  isLoading?: boolean;
}

export function EomsManualVisualization({
  manualsMap,
  onViewSection,
  isLoading = false,
}: EomsManualVisualizationProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedDetailClause, setSelectedDetailClause] = useState<ClauseRegistryItem | null>(null);

  // Combined Clause Records
  const clausesRegistry = useMemo((): ClauseRegistryItem[] => {
    return ISO_21001_CLAUSES.map((meta) => {
      const live = manualsMap.get(meta.sectionId);
      const isConfigured = Boolean(live && live.title);
      const title = live?.title || meta.standardTitle;
      const revision = live?.revisionNumber ? `Rev ${live.revisionNumber}` : 'Rev 00';
      const pageCount = live?.pageCount ? Number(live.pageCount) : meta.defaultPageCount;
      const executionDate = live?.executionDate || 'Approved Policy';
      const googleDriveLink = live?.googleDriveLink || '';
      const hasDriveLink = Boolean(googleDriveLink);

      return {
        ...meta,
        live,
        isConfigured,
        title,
        revision,
        pageCount,
        executionDate,
        googleDriveLink,
        hasDriveLink,
        status: isConfigured ? ('Active' as const) : ('Pending' as const),
      };
    });
  }, [manualsMap]);

  // Executive KPI Metrics
  const metrics = useMemo(() => {
    const totalClauses = clausesRegistry.length;
    const activeCount = clausesRegistry.filter((c) => c.isConfigured).length;
    const pendingCount = totalClauses - activeCount;
    const coveragePct = Math.round((activeCount / totalClauses) * 100);

    const totalPages = clausesRegistry.reduce((acc, c) => acc + c.pageCount, 0);
    const avgPagesPerClause = Math.round(totalPages / totalClauses);

    const withDriveCount = clausesRegistry.filter((c) => c.hasDriveLink).length;
    const driveCoveragePct = Math.round((withDriveCount / totalClauses) * 100);

    const revisionsCount = clausesRegistry.filter((c) => c.revision !== 'Rev 00').length;

    return {
      totalClauses,
      activeCount,
      pendingCount,
      coveragePct,
      totalPages,
      avgPagesPerClause,
      withDriveCount,
      driveCoveragePct,
      revisionsCount,
    };
  }, [clausesRegistry]);

  // Chart 1: Page Count Density per Clause (3D Bar Chart)
  const clausePageData = useMemo(() => {
    return clausesRegistry.map((c) => ({
      code: `Cl ${c.number}`,
      fullTitle: `${c.clauseCode}: ${c.title}`,
      pages: c.pageCount,
      domain: c.domain,
      status: c.status,
    }));
  }, [clausesRegistry]);

  // Chart 2: Domain Share & Clause Weight (3D Donut Chart)
  const domainShareData = useMemo(() => {
    const domainPages: Record<string, number> = {
      'Context & Direction': 0,
      Leadership: 0,
      Planning: 0,
      Support: 0,
      Operation: 0,
      'Evaluation & Improvement': 0,
    };

    clausesRegistry.forEach((c) => {
      domainPages[c.domain] = (domainPages[c.domain] || 0) + c.pageCount;
    });

    const colors: Record<string, string> = {
      'Context & Direction': 'url(#eoms3d-grad-sky)',
      Leadership: 'url(#eoms3d-grad-indigo)',
      Planning: 'url(#eoms3d-grad-amber)',
      Support: 'url(#eoms3d-grad-purple)',
      Operation: 'url(#eoms3d-grad-emerald)',
      'Evaluation & Improvement': 'url(#eoms3d-grad-rose)',
    };

    return Object.entries(domainPages).map(([name, pages]) => ({
      name,
      value: pages,
      fill: colors[name] || 'url(#eoms3d-grad-indigo)',
    }));
  }, [clausesRegistry]);

  // Chart 3: Revision Level Distribution (Maturity)
  const revisionMaturityData = useMemo(() => {
    const revCounts: Record<string, number> = { 'Rev 00': 0, 'Rev 01': 0, 'Rev 02+': 0 };

    clausesRegistry.forEach((c) => {
      const rev = c.revision.toUpperCase();
      if (rev.includes('01')) revCounts['Rev 01']++;
      else if (rev.includes('02') || rev.includes('03')) revCounts['Rev 02+']++;
      else revCounts['Rev 00']++;
    });

    return [
      { name: 'Rev 00 (Initial Edition)', count: revCounts['Rev 00'], fill: 'url(#eoms3d-grad-sky)' },
      { name: 'Rev 01 (1st Revision)', count: revCounts['Rev 01'], fill: 'url(#eoms3d-grad-emerald)' },
      { name: 'Rev 02+ (Continuous Improvement)', count: revCounts['Rev 02+'], fill: 'url(#eoms3d-grad-indigo)' },
    ];
  }, [clausesRegistry]);

  // Filtered registry list
  const filteredClauses = useMemo(() => {
    return clausesRegistry.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.clauseCode.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.revision.toLowerCase().includes(q);

      const matchesDomain = selectedDomain === 'All' || item.domain === selectedDomain;
      const matchesStatus =
        selectedStatus === 'All' ||
        (selectedStatus === 'Active' && item.isConfigured) ||
        (selectedStatus === 'Pending' && !item.isConfigured);

      return matchesSearch && matchesDomain && matchesStatus;
    });
  }, [clausesRegistry, searchTerm, selectedDomain, selectedStatus]);

  // Print Summary Handler
  const handlePrintSummary = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = clausesRegistry
      .map(
        (c) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-weight: 800; font-size: 11px; text-transform: uppercase;">${c.clauseCode}</td>
          <td style="padding: 10px 12px; font-size: 11px;">
            <div style="font-weight: 700; color: #0f172a;">${c.title}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${c.domain} • Lead: ${c.suggestedLead}</div>
          </td>
          <td style="padding: 10px 12px; text-align: center; font-size: 11px; font-weight: 700;">${c.revision}</td>
          <td style="padding: 10px 12px; text-align: center; font-size: 11px; font-weight: 700;">${c.pageCount} pgs</td>
          <td style="padding: 10px 12px; text-align: center; font-size: 10px;">${c.executionDate}</td>
          <td style="padding: 10px 12px; text-align: center; font-size: 10px; font-weight: 800; color: ${c.isConfigured ? '#16a34a' : '#d97706'};">
            ${c.isConfigured ? 'PUBLISHED' : 'INCOMPLETE'}
          </td>
        </tr>
      `,
      )
      .join('');

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>RSU EOMS Policy Manual - 10-Clause Institutional Architecture</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { font-size: 16px; margin: 0 0 4px 0; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px; }
            .header h2 { font-size: 13px; margin: 0 0 4px 0; font-weight: 800; color: #1e3a8a; }
            .header p { font-size: 10px; margin: 0; color: #475569; text-transform: uppercase; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th { background-color: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 800; border-bottom: 2px solid #cbd5e1; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 10px; border-top: 1px solid #cbd5e1; padding-top: 15px; }
            .sig-block { width: 45%; }
            .sig-line { margin-top: 40px; border-top: 1px solid #0f172a; font-weight: 800; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="header">
            <p>Republic of the Philippines</p>
            <h1>Romblon State University</h1>
            <h2>Educational Organization Management System (ISO 21001:2018)</h2>
            <p>Official 10-Clause Institutional Policy Manual Inventory & Status Report</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 12%;">Clause</th>
                <th style="width: 44%;">Title & Scope</th>
                <th style="width: 10%; text-align: center;">Revision</th>
                <th style="width: 10%; text-align: center;">Pages</th>
                <th style="width: 12%; text-align: center;">Execution</th>
                <th style="width: 12%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            <div class="sig-block">
              <div>Prepared & Certified Correct:</div>
              <div class="sig-line">Director, Quality Assurance Office</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Romblon State University</div>
            </div>
            <div class="sig-block" style="text-align: right;">
              <div>Approved by:</div>
              <div class="sig-line" style="margin-left: auto;">University President</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Office of the President</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* 3D Gradient Definitions for Recharts */}
      <Chart3DDefs idPrefix="eoms3d" />

      {/* HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary/90 text-white font-mono text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 border border-primary/40 shadow-xs">
                Romblon State University
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 border border-emerald-500/30">
                ISO 21001:2018 EOMS
              </Badge>
              <Badge className="bg-amber-500/20 text-amber-300 font-mono text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 border border-amber-500/30">
                PQA Institutional Criteria
              </Badge>
            </div>

            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-primary" />
              RSU EOMS Policy Manual Visualization
            </h1>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
              Official institutional intelligence on the 10 core policy clauses of the RSU Educational Organization
              Management System (EOMS), governing institutional direction, curriculum delivery, learner support, and
              continual quality improvement.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end justify-center bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 shrink-0 shadow-inner">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              EOMS Standards Codification
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-400">{metrics.coveragePct}%</span>
              <span className="text-xs font-bold text-slate-300">Published</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {metrics.activeCount} of {metrics.totalClauses} ISO Clauses Active
            </p>
          </div>
        </div>
      </div>

      {/* EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <Card className="shadow-md hover:shadow-lg transition-all border-primary/10 rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Clause Coverage
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">
              {metrics.activeCount}{' '}
              <span className="text-xs font-bold text-muted-foreground">/ {metrics.totalClauses} Clauses</span>
            </div>
            <div className="mt-2 w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${metrics.coveragePct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">
              100% Alignment with ISO 21001:2018 Clauses 1-10
            </p>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card className="shadow-md hover:shadow-lg transition-all border-primary/10 rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Policy Volume
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">
              {metrics.totalPages} <span className="text-xs font-bold text-muted-foreground">Documented Pages</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">
              Avg. ~{metrics.avgPagesPerClause} pages per ISO clause manual section
            </p>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card className="shadow-md hover:shadow-lg transition-all border-primary/10 rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Cloud Availability
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
              <ExternalLink className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">
              {metrics.driveCoveragePct}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">
              {metrics.withDriveCount} of {metrics.totalClauses} clauses with direct Google Drive repository links
            </p>
          </CardContent>
        </Card>

        {/* Card 4 */}
        <Card className="shadow-md hover:shadow-lg transition-all border-primary/10 rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Policy Currency
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Award className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">Approved</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">
              Formally executed under RSU Board of Regents & Executive Governance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3D CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Clause Page Volume Breakdown (3D Bar Chart) */}
        <Card className="lg:col-span-2 shadow-lg border-primary/10 rounded-2xl flex flex-col bg-white dark:bg-slate-900">
          <CardHeader className="border-b bg-muted/20 py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Documentation Depth by ISO 21001 Clause (Pages)
              </CardTitle>
              <CardDescription className="text-[10px]">
                Page count allocation across all 10 core clauses of the RSU EOMS Manual.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="text-[9px] font-mono uppercase bg-primary/5 text-primary border-primary/20"
            >
              3D Render
            </Badge>
          </CardHeader>
          <CardContent className="pt-6 flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={clausePageData} margin={{ top: 15, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.3} />
                <XAxis
                  dataKey="code"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  domain={[0, 'auto']}
                />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1">
                        <p className="font-black text-indigo-300">{d.fullTitle}</p>
                        <p className="text-[10px] text-slate-300 font-bold uppercase">{d.domain}</p>
                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 text-[11px]">
                          <span className="text-slate-400">Page Count:</span>
                          <span className="font-mono font-black text-emerald-400">{d.pages} Pages</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="pages"
                  radius={[6, 6, 0, 0]}
                  fill="url(#eoms3d-grad-indigo)"
                  filter="url(#eoms3d-elevation-shadow)"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          <CardFooter className="border-t bg-muted/10 py-2.5 px-4 text-[10px] text-muted-foreground flex justify-between items-center">
            <span>Core concentration: Clause 8 (Educational Operational Delivery) & Clause 7 (Support)</span>
            <span className="font-black text-primary font-mono">{metrics.totalPages} Total Pages</span>
          </CardFooter>
        </Card>

        {/* Chart 2: Domain Share Donut Chart */}
        <Card className="shadow-lg border-primary/10 rounded-2xl flex flex-col bg-white dark:bg-slate-900">
          <CardHeader className="border-b bg-muted/20 py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-emerald-600" />
                ISO High-Level Structure Share
              </CardTitle>
              <CardDescription className="text-[10px]">
                Page allocation across ISO 21001 architecture domains.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={domainShareData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  filter="url(#eoms3d-soft-depth)"
                >
                  {domainShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const pct = Math.round((d.value / (metrics.totalPages || 1)) * 100);
                    return (
                      <div className="bg-slate-900 text-white border border-slate-700 rounded-xl p-2.5 shadow-xl text-xs">
                        <p className="font-black text-indigo-300">{d.name}</p>
                        <p className="font-mono text-[11px] text-emerald-400 mt-1">
                          {d.value} Pages ({pct}% of Manual)
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 w-full text-[9px] uppercase font-bold text-muted-foreground mt-2 border-t pt-3">
              {domainShareData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 truncate">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.fill }} />
                  <span className="truncate">{d.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & EXPLORER CONTROLS TOOLBAR */}
      <Card className="shadow-md border-primary/10 rounded-2xl bg-white dark:bg-slate-900">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clauses by number (e.g. 'Clause 4'), title, scope, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl border-primary/20"
              />
            </div>

            {/* Domain Filter */}
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger className="w-full md:w-[220px] h-10 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <SelectValue placeholder="All Domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All ISO Domains</SelectItem>
                <SelectItem value="Context & Direction">Context & Direction (Cl 1-4)</SelectItem>
                <SelectItem value="Leadership">Leadership (Clause 5)</SelectItem>
                <SelectItem value="Planning">Planning & Risk (Clause 6)</SelectItem>
                <SelectItem value="Support">Support & Resources (Clause 7)</SelectItem>
                <SelectItem value="Operation">Educational Delivery (Clause 8)</SelectItem>
                <SelectItem value="Evaluation & Improvement">Evaluation & Improvement (Cl 9-10)</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-[160px] h-10 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Active">Published & Active</SelectItem>
                <SelectItem value="Pending">Drafting / Pending</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle and Print Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-primary/10">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 px-3 rounded-lg text-xs gap-1.5"
                  title="Cards Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 px-3 rounded-lg text-xs gap-1.5"
                  title="Detailed Table View"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintSummary}
                className="h-10 px-3.5 rounded-xl border-primary/20 text-primary font-bold uppercase text-[10px] tracking-wider hover:bg-primary/5"
              >
                <Printer className="h-4 w-4 mr-1.5" />
                Print Inventory
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CLAUSES EXPLORER - CARDS VIEW */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClauses.map((clause) => {
            const hasDrive = Boolean(clause.googleDriveLink);

            return (
              <Card
                key={clause.sectionId}
                className="group relative overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border-primary/15 rounded-2xl flex flex-col justify-between bg-white dark:bg-slate-900"
              >
                {/* Accent top stripe based on Domain */}
                <div
                  className={cn(
                    'h-1.5 w-full',
                    clause.domain === 'Context & Direction' && 'bg-sky-500',
                    clause.domain === 'Leadership' && 'bg-indigo-600',
                    clause.domain === 'Planning' && 'bg-amber-500',
                    clause.domain === 'Support' && 'bg-purple-600',
                    clause.domain === 'Operation' && 'bg-emerald-500',
                    clause.domain === 'Evaluation & Improvement' && 'bg-rose-500',
                  )}
                />

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="font-mono text-[9px] uppercase font-bold px-2 py-0.5 border-primary/30 bg-primary/5 text-primary"
                        >
                          ISO 21001:2018 • {clause.clauseCode}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5"
                        >
                          {clause.domain}
                        </Badge>
                      </div>

                      <CardTitle className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors pt-1">
                        {clause.title}
                      </CardTitle>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] font-mono font-black uppercase px-2 py-0.5',
                          clause.isConfigured
                            ? 'border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full mr-1.5 inline-block',
                            clause.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500',
                          )}
                        />
                        {clause.isConfigured ? 'Active Policy' : 'Pending Setting'}
                      </Badge>
                    </div>
                  </div>

                  <CardDescription className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 pt-2 leading-relaxed">
                    {clause.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pb-3">
                  {/* Meta stats badges */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Revision</p>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                        {clause.revision}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Volume</p>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                        {clause.pageCount} pgs
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Executed</p>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                        {clause.executionDate}
                      </p>
                    </div>
                  </div>

                  {/* Sample key standard requirements */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" /> Key Quality Deliverables
                    </p>
                    <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      {clause.keyRequirements.slice(0, 2).map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 pb-4 border-t bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDetailClause(clause)}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-primary gap-1"
                  >
                    <Info className="h-3.5 w-3.5" />
                    <span>Clause Specs</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    {hasDrive && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-8 px-3 text-xs border-primary/20 hover:bg-primary/5"
                      >
                        <a href={clause.googleDriveLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1 text-primary" />
                          Cloud
                        </a>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      onClick={() => onViewSection?.(clause.sectionId)}
                      className="h-8 px-3.5 text-xs font-bold gap-1.5 shadow-sm"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Read Clause
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        /* DETAILED TABLE VIEW */
        <Card className="shadow-lg border-primary/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[110px] text-xs font-black uppercase">Clause Code</TableHead>
                <TableHead className="text-xs font-black uppercase">Title & Scope</TableHead>
                <TableHead className="w-[180px] text-xs font-black uppercase">HLS Domain</TableHead>
                <TableHead className="w-[90px] text-center text-xs font-black uppercase">Revision</TableHead>
                <TableHead className="w-[90px] text-center text-xs font-black uppercase">Pages</TableHead>
                <TableHead className="w-[120px] text-center text-xs font-black uppercase">Execution</TableHead>
                <TableHead className="w-[110px] text-center text-xs font-black uppercase">Status</TableHead>
                <TableHead className="w-[160px] text-right text-xs font-black uppercase">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClauses.map((clause) => (
                <TableRow key={clause.sectionId} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono font-black text-xs text-primary">{clause.clauseCode}</TableCell>
                  <TableCell>
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{clause.title}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1">{clause.description}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] font-bold uppercase">
                      {clause.domain}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono font-black text-xs">{clause.revision}</TableCell>
                  <TableCell className="text-center font-mono font-black text-xs text-slate-700 dark:text-slate-300">
                    {clause.pageCount} pgs
                  </TableCell>
                  <TableCell className="text-center text-[10px] text-muted-foreground font-medium">
                    {clause.executionDate}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] font-mono font-black uppercase',
                        clause.isConfigured
                          ? 'border-emerald-500/40 bg-emerald-50 text-emerald-800'
                          : 'border-amber-500/40 bg-amber-50 text-amber-800',
                      )}
                    >
                      {clause.isConfigured ? 'Active' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDetailClause(clause)}
                        className="h-8 px-2 text-xs"
                        title="View Requirements & Metadata"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onViewSection?.(clause.sectionId)}
                        className="h-8 px-3 text-xs font-bold gap-1"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Read</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* CLAUSE REQUIREMENTS & SCOPE DETAILS MODAL */}
      <Dialog open={Boolean(selectedDetailClause)} onOpenChange={(open) => !open && setSelectedDetailClause(null)}>
        <DialogContent className="max-w-xl rounded-2xl">
          {selectedDetailClause && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className="font-mono text-[9px] uppercase font-bold text-primary border-primary/30"
                  >
                    ISO 21001:2018 • {selectedDetailClause.clauseCode}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] uppercase font-bold">
                    {selectedDetailClause.domain}
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {selectedDetailClause.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Official operational scope and audit requirements under the RSU EOMS.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Description */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="font-black uppercase tracking-wider text-[10px] text-slate-500 mb-1">
                    Standard Scope & Purpose
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                    {selectedDetailClause.description}
                  </p>
                </div>

                {/* Key Deliverables */}
                <div className="space-y-2">
                  <p className="font-black uppercase tracking-wider text-[10px] text-slate-500">
                    Key Quality Assurance Deliverables
                  </p>
                  <div className="space-y-1.5">
                    {selectedDetailClause.keyRequirements.map((req, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-muted/30 p-2 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{req}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lead Office */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[9px] uppercase font-black text-muted-foreground">Lead Responsible Office</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {selectedDetailClause.suggestedLead}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" size="sm" onClick={() => setSelectedDetailClause(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const id = selectedDetailClause.sectionId;
                    setSelectedDetailClause(null);
                    onViewSection?.(id);
                  }}
                  className="font-bold gap-1.5"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Read Section Document
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
