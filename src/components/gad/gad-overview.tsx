'use client';

import { useMemo } from 'react';
import type { GADInitiative, ProgramComplianceRecord, GADSector, GADPlan, GADActivity, GadSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ShieldCheck,
  CheckCircle2,
  HandHeart,
  Target,
  Landmark,
  Info,
  Activity,
  Users,
  PieChart as PieIcon,
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
  Sparkles,
  Layers,
  FileText,
  Lightbulb,
  Check,
  X,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Chart3DDefs, RenderBar3DLabel } from '@/components/ui/chart-3d-defs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface GADOverviewProps {
  initiatives: GADInitiative[];
  compliances: ProgramComplianceRecord[];
  gadPlans?: GADPlan[];
  gadActivities?: GADActivity[];
  gadSettings?: GadSettings;
  selectedYear: number;
  unitName?: string;
}

const GAD_SECTORS: GADSector[] = [
  'Solo Parent',
  'PWD',
  'Senior Citizen',
  'Youth/Student',
  'Employee',
  'LGBTQA++',
  'Indigenous People',
];

export function GADOverview({
  initiatives,
  compliances,
  gadPlans = [],
  gadActivities = [],
  gadSettings,
  selectedYear,
  unitName,
}: GADOverviewProps) {
  const analysis = useMemo(() => {
    // 1. Budget Metrics
    const initiativesBudget = initiatives.reduce((acc, i) => acc + (i.budget || 0), 0);
    const plansBudget = gadPlans.reduce((acc, p) => acc + (p.budget || 0), 0);
    const totalBudget = initiativesBudget > 0 ? initiativesBudget : plansBudget;

    const initiativesUtilized = initiatives.reduce((acc, i) => acc + (i.utilizedAmount || 0), 0);
    const activitiesSpent = gadActivities.reduce((acc, a) => acc + (a.actualBudgetUsed || 0), 0);
    const totalUtilized = initiativesUtilized > 0 ? initiativesUtilized : activitiesSpent;

    const utilizationRate = totalBudget > 0 ? Math.round((totalUtilized / totalBudget) * 100) : 0;

    const institutionalBase = gadSettings?.institutionalTotalBudget || 0;
    const target5Percent = institutionalBase > 0 ? institutionalBase * 0.05 : 0;
    const budgetShortfall = target5Percent > 0 && totalBudget < target5Percent ? target5Percent - totalBudget : 0;
    const mandateFulfillment = target5Percent > 0 ? Math.min(100, Math.round((totalBudget / target5Percent) * 100)) : 0;

    // 2. Project / Implementation Metrics
    const allProjectsCount = Math.max(initiatives.length, gadPlans.length, gadActivities.length);
    const completedInitiatives = initiatives.filter((i) => i.status === 'Completed').length;
    const completedPlans = gadPlans.filter((p) => p.implementationStatus === 'Done').length;
    const completedActivities = gadActivities.filter(
      (a) => a.implementationStatus === 'Done' || (a as any).status === 'Completed',
    ).length;
    const totalCompleted = Math.max(completedInitiatives, completedPlans, completedActivities);

    const completionRate = allProjectsCount > 0 ? Math.round((totalCompleted / allProjectsCount) * 100) : 0;
    const pendingCount = Math.max(0, allProjectsCount - totalCompleted);

    // 3. Beneficiaries & Gender Disaggregation
    let maleBen = initiatives.reduce((acc, i) => acc + (i.beneficiariesMale || 0), 0);
    let femaleBen = initiatives.reduce((acc, i) => acc + (i.beneficiariesFemale || 0), 0);

    if (maleBen === 0 && femaleBen === 0 && gadActivities.length > 0) {
      maleBen = gadActivities.reduce((acc, a) => acc + (a.participants?.male || 0), 0);
      femaleBen = gadActivities.reduce((acc, a) => acc + (a.participants?.female || 0), 0);
    }

    const totalBen = maleBen + femaleBen;
    const femaleRatio = totalBen > 0 ? Math.round((femaleBen / totalBen) * 100) : 0;
    const maleRatio = totalBen > 0 ? Math.round((maleBen / totalBen) * 100) : 0;
    const isGenderBalanced = totalBen > 0 && femaleRatio >= 40 && femaleRatio <= 70;

    // 4. Sectoral Coverage & Aggregation
    const sectoralStats: Record<string, { male: number; female: number }> = {};
    GAD_SECTORS.forEach((s) => (sectoralStats[s] = { male: 0, female: 0 }));

    compliances.forEach((rec) => {
      rec.enrollmentRecords?.forEach((enroll) => {
        const term = enroll.firstSemester;
        if (term) {
          ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].forEach((level) => {
            const lData = (term as any)[level];
            if (lData?.sectors) {
              Object.entries(lData.sectors).forEach(([sec, counts]: any) => {
                if (sectoralStats[sec]) {
                  sectoralStats[sec].male += Number(counts.male || 0);
                  sectoralStats[sec].female += Number(counts.female || 0);
                }
              });
            }
          });
        }
      });
    });

    gadActivities.forEach((act) => {
      if (act.participants?.sectors) {
        Object.entries(act.participants.sectors).forEach(([sec, counts]: any) => {
          if (sectoralStats[sec]) {
            sectoralStats[sec].male += Number(counts.male || 0);
            sectoralStats[sec].female += Number(counts.female || 0);
          }
        });
      }
    });

    const activeSectors: string[] = [];
    const unreachedSectors: string[] = [];
    GAD_SECTORS.forEach((sec) => {
      const tot = sectoralStats[sec].male + sectoralStats[sec].female;
      if (tot > 0) activeSectors.push(sec);
      else unreachedSectors.push(sec);
    });

    const sectoralChartData = Object.entries(sectoralStats)
      .map(([name, counts]) => ({
        name,
        total: counts.male + counts.female,
        male: counts.male,
        female: counts.female,
      }))
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total);

    // 5. Evidence & HGDG Attribution
    const plansWithHGDG = gadPlans.filter(
      (p) => (p.hgdgScore && p.hgdgScore > 0) || p.category === 'ATTRIBUTED PROGRAM',
    ).length;
    const totalHGDG = plansWithHGDG;

    const itemsWithDrive =
      gadPlans.filter((p) => Boolean(p.driveLink)).length + gadActivities.filter((a) => Boolean(a.driveLink)).length;
    const totalEvidenceItems = gadPlans.length + gadActivities.length;
    const evidenceRate = totalEvidenceItems > 0 ? Math.round((itemsWithDrive / totalEvidenceItems) * 100) : 0;

    // 6. FORMULATE DYNAMIC STRENGTHS
    const strengths: {
      title: string;
      desc: string;
      metric?: string;
      badgeText: string;
    }[] = [];

    if (utilizationRate >= 75) {
      strengths.push({
        title: 'High Budget Utilization Efficiency',
        desc: `Allocated funds are deployed actively with a ${utilizationRate}% utilization rate, minimizing the risk of unliquidated funds.`,
        metric: `${utilizationRate}% Utilized`,
        badgeText: 'Fiscal Health',
      });
    } else if (utilizationRate >= 50) {
      strengths.push({
        title: 'Steady Fund Disbursement Velocity',
        desc: `Over half of the allocated GAD budget (${utilizationRate}%) has been successfully expended toward approved GPB programs.`,
        metric: `${utilizationRate}% Utilized`,
        badgeText: 'Disbursement',
      });
    }

    if (completionRate >= 60) {
      strengths.push({
        title: 'Strong Project Delivery & Target Fulfillment',
        desc: `${completionRate}% of registered GAD interventions (${totalCompleted} of ${allProjectsCount || totalCompleted}) have attained full completion.`,
        metric: `${completionRate}% Closed`,
        badgeText: 'Execution',
      });
    } else if (totalCompleted > 0) {
      strengths.push({
        title: 'Active Output Realization',
        desc: `${totalCompleted} GAD project(s) have successfully concluded with verifiable operational outputs and accomplishment logs.`,
        metric: `${totalCompleted} Done`,
        badgeText: 'Execution',
      });
    }

    if (isGenderBalanced) {
      strengths.push({
        title: 'Equitable Gender Parity & Participation',
        desc: `Healthy balance in stakeholder engagement with ${femaleRatio}% female and ${maleRatio}% male reach across monitored programs.`,
        metric: `${femaleRatio}% F / ${maleRatio}% M`,
        badgeText: 'Gender Parity',
      });
    } else if (totalBen > 0) {
      strengths.push({
        title: 'Substantial Community Reach',
        desc: `Mobilized and documented ${totalBen.toLocaleString()} participants across academic and administrative interventions.`,
        metric: `${totalBen.toLocaleString()} Stakeholders`,
        badgeText: 'Reach',
      });
    }

    if (activeSectors.length >= 4) {
      strengths.push({
        title: 'Broad Marginalized Sector Inclusivity',
        desc: `Interventions actively support ${activeSectors.length} of 7 recognized vulnerable groups (${activeSectors.slice(0, 3).join(', ')}, etc.).`,
        metric: `${activeSectors.length}/7 Sectors`,
        badgeText: 'Inclusivity',
      });
    } else if (activeSectors.length > 0) {
      strengths.push({
        title: 'Targeted Sectoral Support Tracking',
        desc: `Maintained active disaggregated tracking for priority sectors: ${activeSectors.join(', ')}.`,
        metric: `${activeSectors.length} Active Sectors`,
        badgeText: 'SDD Tracking',
      });
    }

    if (totalHGDG > 0) {
      strengths.push({
        title: 'HGDG Tool Integration & Attribution',
        desc: `${totalHGDG} initiative(s) evaluated under the Harmonized Gender and Development Guidelines (HGDG) for gender mainstreaming.`,
        metric: `${totalHGDG} HGDG Scored`,
        badgeText: 'Compliance',
      });
    }

    if (evidenceRate >= 40) {
      strengths.push({
        title: 'Digital Means of Verification (MOV) Compliance',
        desc: `${evidenceRate}% of logged GAD plans and activities feature verified digital documentation and evidence links for institutional audits.`,
        metric: `${evidenceRate}% MOV Attached`,
        badgeText: 'Audit Ready',
      });
    }

    if (strengths.length === 0) {
      strengths.push({
        title: 'Established GAD Monitoring Infrastructure',
        desc: 'Institutional tracking and sex-disaggregated registries are established and ready for cycle execution.',
        metric: 'Ready',
        badgeText: 'Framework',
      });
    }

    // 7. FORMULATE DYNAMIC WEAKNESSES / VULNERABILITIES
    const weaknesses: {
      title: string;
      desc: string;
      severity: 'High' | 'Medium' | 'Low';
      category: string;
    }[] = [];

    if (utilizationRate < 50 && totalBudget > 0) {
      weaknesses.push({
        title: 'Slow Budget Disbursement Pace',
        desc: `Only ${utilizationRate}% of the allocated ₱${totalBudget.toLocaleString()} has been expended, signaling potential delays in procurement or activity execution.`,
        severity: utilizationRate < 25 ? 'High' : 'Medium',
        category: 'Budget Lag',
      });
    } else if (totalBudget === 0) {
      weaknesses.push({
        title: 'Zero GAD Appropriations Logged',
        desc: 'No dedicated GAD budget has been registered in the system for this active fiscal cycle.',
        severity: 'High',
        category: 'Budget Allocation',
      });
    }

    if (target5Percent > 0 && totalBudget < target5Percent) {
      weaknesses.push({
        title: '5% Statutory Appropriation Shortfall',
        desc: `Allocated GAD budget is below the statutory 5% institutional minimum (₱${target5Percent.toLocaleString()}) with a ₱${budgetShortfall.toLocaleString()} deficit.`,
        severity: 'High',
        category: 'Statutory Mandate',
      });
    }

    if (unreachedSectors.length >= 3) {
      weaknesses.push({
        title: `Unreached Marginalized Sectors (${unreachedSectors.length}/7)`,
        desc: `Zero recorded participation or targeted interventions for: ${unreachedSectors.join(', ')}.`,
        severity: 'Medium',
        category: 'Inclusivity Gap',
      });
    }

    if (allProjectsCount > 0 && completionRate < 50) {
      weaknesses.push({
        title: 'Project Execution Backlog',
        desc: `${pendingCount} project(s) (${100 - completionRate}%) remain ongoing, draft, or pending completion past scheduled milestones.`,
        severity: completionRate < 30 ? 'High' : 'Medium',
        category: 'Milestone Lag',
      });
    }

    if (totalBen > 0 && !isGenderBalanced) {
      weaknesses.push({
        title: 'Gender Ratio Skew in Project Participation',
        desc: `Participant demographics show a skew (${femaleRatio}% Female vs ${maleRatio}% Male), which may indicate unequal access across activities.`,
        severity: 'Low',
        category: 'Demographic Balance',
      });
    } else if (totalBen === 0 && allProjectsCount > 0) {
      weaknesses.push({
        title: 'Missing Sex-Disaggregated Data (SDD)',
        desc: 'No granular male and female attendance headcounts recorded for ongoing initiatives.',
        severity: 'High',
        category: 'Data Deficit',
      });
    }

    if (totalEvidenceItems > 0 && evidenceRate < 40) {
      weaknesses.push({
        title: 'Documentation Deficit (Low MOV Attachment)',
        desc: `Only ${evidenceRate}% of entries have verified evidence files or Drive links uploaded, creating audit vulnerability during COA/CHED reviews.`,
        severity: 'Medium',
        category: 'Audit Compliance',
      });
    }

    if (weaknesses.length === 0) {
      weaknesses.push({
        title: 'Continuous SDD Granularity Maintenance',
        desc: 'Ensure continuous updating of quarterly census and student sectoral tags to prevent data decay.',
        severity: 'Low',
        category: 'Maintenance',
      });
    }

    // 8. Calculate Overall Health Index (0-100)
    let score = 50;
    if (utilizationRate >= 75) score += 20;
    else if (utilizationRate >= 50) score += 10;
    else if (utilizationRate < 20 && totalBudget > 0) score -= 15;

    if (completionRate >= 70) score += 15;
    else if (completionRate >= 40) score += 8;
    else if (allProjectsCount > 0 && completionRate < 25) score -= 10;

    if (activeSectors.length >= 5) score += 10;
    else if (activeSectors.length >= 3) score += 5;
    else if (activeSectors.length === 0) score -= 10;

    if (isGenderBalanced) score += 5;
    if (evidenceRate >= 50) score += 5;
    if (totalHGDG > 0) score += 5;

    const healthScore = Math.max(10, Math.min(100, score));

    return {
      totalBudget,
      totalUtilized,
      utilizationRate,
      completionRate,
      completed: totalCompleted,
      total: allProjectsCount || totalCompleted,
      maleBen,
      femaleBen,
      sectoralChartData,
      activeSectors,
      unreachedSectors,
      strengths,
      weaknesses,
      healthScore,
      target5Percent,
      mandateFulfillment,
    };
  }, [initiatives, compliances, gadPlans, gadActivities, gadSettings]);

  return (
    <div className="space-y-6">
      {/* 1. TOP STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-primary/10 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Landmark className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Budget Registry
            </CardDescription>
            <CardTitle className="text-2xl font-black text-primary tabular-nums">
              ₱{analysis.totalBudget.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
              Allocated for FY {selectedYear}
            </p>
          </CardContent>
        </Card>

        {/* GAD 5% Budget Mandate Thermometer */}
        <Card className="shadow-sm border-indigo-100 bg-indigo-50/10 flex flex-col relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase text-indigo-700">
              Fiscal Mandate Track
            </CardDescription>
            <CardTitle className="text-2xl font-black text-indigo-600">5% Target</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-indigo-800/60">
                <span>Fulfillment</span>
                <span>{analysis.utilizationRate}%</span>
              </div>
              <Progress value={analysis.utilizationRate} className="h-2 bg-indigo-100" />
              <div className="flex items-center gap-1.5 pt-1">
                <Calculator className="h-3 w-3 text-indigo-400" />
                <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">
                  Based on institutional appropriations
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-blue-100 bg-blue-50/10 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-blue-700">
              Target Fulfillment
            </CardDescription>
            <CardTitle className="text-2xl font-black text-blue-600 tabular-nums">{analysis.completionRate}%</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-[10px] font-bold text-blue-800/60 uppercase tracking-tight">
              {analysis.completed} of {analysis.total} Projects Closed
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-purple-100 bg-purple-50/10 flex flex-col relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-purple-700">
              Project Reach
            </CardDescription>
            <CardTitle className="text-2xl font-black text-purple-600 tabular-nums">
              {(analysis.maleBen + analysis.femaleBen).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-[10px] font-bold text-purple-800/60 uppercase tracking-tight">
              M: {analysis.maleBen.toLocaleString()} | F: {analysis.femaleBen.toLocaleString()} Beneficiaries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. GAD STRENGTHS AND WEAKNESSES STRATEGIC DIAGNOSTICS */}
      <Card className="shadow-lg border-primary/15 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="bg-slate-50/80 dark:bg-slate-800/50 border-b py-4 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                  GAD Strategic Strengths & Weaknesses Analysis
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    'font-mono font-black text-[10px] uppercase px-2.5 py-0.5',
                    analysis.healthScore >= 75
                      ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : analysis.healthScore >= 50
                        ? 'border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'border-rose-500/40 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
                  )}
                >
                  Health Index: {analysis.healthScore}/100 •{' '}
                  {analysis.healthScore >= 75
                    ? 'Strong Performance'
                    : analysis.healthScore >= 50
                      ? 'Moderate Progress'
                      : 'Needs Strategic Focus'}
                </Badge>
              </div>
              <CardDescription className="text-xs font-medium text-muted-foreground">
                Data-driven diagnosis synthesized from live budget liquidations, project delivery rates,
                sex-disaggregated reach, and sectoral inclusion.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1">
                Context: {unitName || 'Institutional'}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* STRENGTHS COLUMN */}
            <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-emerald-200/50 dark:border-emerald-900/40 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-tight text-emerald-900 dark:text-emerald-200">
                      Operational Strengths
                    </h4>
                    <p className="text-[10px] font-medium text-emerald-700/80 dark:text-emerald-400">
                      Positive drivers and compliance benchmarks
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white font-black text-[9px] uppercase px-2 py-0.5 border-none shadow-xs">
                  {analysis.strengths.length} Detected
                </Badge>
              </div>

              <div className="space-y-3">
                {analysis.strengths.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-white dark:bg-slate-800/90 border border-emerald-100 dark:border-emerald-900/30 shadow-2xs space-y-1.5 transition-all hover:border-emerald-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="font-black text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                          {item.title}
                        </span>
                      </div>
                      {item.metric && (
                        <Badge
                          variant="outline"
                          className="text-[8px] font-mono font-black uppercase px-1.5 py-0 h-4 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shrink-0"
                        >
                          {item.metric}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pl-5.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* WEAKNESSES COLUMN */}
            <div className="rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-rose-200/50 dark:border-rose-900/40 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-tight text-rose-900 dark:text-rose-200">
                      Vulnerabilities & Weaknesses
                    </h4>
                    <p className="text-[10px] font-medium text-rose-700/80 dark:text-rose-400">
                      Gaps, bottlenecks, and compliance risk factors
                    </p>
                  </div>
                </div>
                <Badge className="bg-rose-600 text-white font-black text-[9px] uppercase px-2 py-0.5 border-none shadow-xs">
                  {analysis.weaknesses.length} Identified
                </Badge>
              </div>

              <div className="space-y-3">
                {analysis.weaknesses.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-white dark:bg-slate-800/90 border border-rose-100 dark:border-rose-900/30 shadow-2xs space-y-1.5 transition-all hover:border-rose-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <span className="font-black text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                          {item.title}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[8px] font-black uppercase px-1.5 py-0 h-4 shrink-0',
                          item.severity === 'High'
                            ? 'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : item.severity === 'Medium'
                              ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'border-slate-300 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                        )}
                      >
                        {item.severity} Severity
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pl-5.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTORAL INCLUSIVITY MATRIX & STRATEGIC RECOMMENDATIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {/* SECTOR INCLUSIVITY BREAKDOWN */}
            <div className="lg:col-span-1 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Marginalized Sector Coverage
                </h5>
                <span className="text-[10px] font-mono font-black text-primary">
                  {analysis.activeSectors.length}/7 Reached
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Institutional mainstreaming requires direct representation across all 7 identified vulnerable groups.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {GAD_SECTORS.map((sector) => {
                  const isReached = analysis.activeSectors.includes(sector);
                  return (
                    <Badge
                      key={sector}
                      variant="outline"
                      className={cn(
                        'text-[9px] font-bold py-1 px-2.5 flex items-center gap-1 transition-all',
                        isReached
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-black'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800 text-slate-400 dark:text-slate-500 line-through opacity-75',
                      )}
                    >
                      {isReached ? (
                        <Check className="h-2.5 w-2.5 text-emerald-600" />
                      ) : (
                        <X className="h-2.5 w-2.5 text-rose-400" />
                      )}
                      {sector}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* ACTIONABLE RECOMMENDATIONS */}
            <div className="lg:col-span-2 p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h5 className="text-[11px] font-black uppercase tracking-widest text-primary">
                  Recommended Policy & Operational Actions
                </h5>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-primary/10 space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-primary" />
                    Budget Acceleration
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Conduct mid-year fiscal re-alignments to fast-track procurement for pending Q3/Q4 GPB activities.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-primary/10 space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-primary" />
                    Targeted Sector Outreach
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Formulate client-focused programs dedicated to unreached groups (
                    {analysis.unreachedSectors.slice(0, 2).join(', ') || 'priority groups'}).
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-primary/10 space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-primary" />
                    Mandatory MOV Uploads
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Require verified Google Drive documentation links prior to marking activities as Completed in AR.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-primary/10 space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-primary" />
                    HGDG Attribution Expansion
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Apply Harmonized Gender and Development Guidelines (HGDG) box scoring to institutional major PAPs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. CHARTS & MAINSTREAMING CONTEXT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D SVG GRADIENTS & DEPTH FILTERS */}
        <Chart3DDefs idPrefix="gadover3d" />

        <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-all border-primary/10 rounded-2xl overflow-hidden flex flex-col h-full bg-white dark:bg-slate-900">
          <CardHeader className="bg-primary/5 border-b py-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">
                Institutional Sectoral Distribution Analysis (3D)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Consolidated reach across marginalized groups for AY {selectedYear}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 flex-1">
            {analysis.sectoralChartData.length > 0 ? (
              <ChartContainer config={{}} className="h-[350px] w-full">
                <ResponsiveContainer>
                  <BarChart data={analysis.sectoralChartData} layout="vertical" margin={{ left: 20, right: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.15} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 9, fontWeight: 900 }}
                      width={140}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="male"
                      stackId="a"
                      fill="url(#gadover3d-grad-indigo)"
                      filter="url(#gadover3d-soft-depth)"
                    />
                    <Bar
                      dataKey="female"
                      stackId="a"
                      fill="url(#gadover3d-grad-rose)"
                      radius={[0, 6, 6, 0]}
                      filter="url(#gadover3d-soft-depth)"
                    >
                      <LabelList
                        dataKey="total"
                        position="right"
                        style={{ fontSize: '11px', fontWeight: '900', fill: 'hsl(var(--primary))' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 opacity-20 py-10">
                <PieIcon className="h-12 w-12" />
                <p className="text-[10px] font-black uppercase tracking-widest mt-2">Zero Sectoral Hits Recorded</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/5 border-t py-3">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                <strong>Strategic Guide:</strong> This data aggregates student enrollment and employee census sectoral
                tags. It identifies groups that are under-represented or receiving high institutional support.
              </p>
            </div>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-1 shadow-lg border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">
                Mainstreaming Context: {unitName}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-muted/20 border border-dashed">
              <Info className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-sm">
                  Institutional Commitment: The 5% Mandate
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Following PCW guidelines, RSU integrates gender-responsive planning across all units. This dashboard
                  tracks the planning, execution, and disaggregated impact of GAD-aligned projects.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-primary border-b pb-1">
                Unit GAD Responsibilities
              </h5>
              <ul className="space-y-3">
                {[
                  {
                    title: 'Local SDD Maintenance',
                    desc: 'Accurate headcount of students and faculty by sex and sector.',
                  },
                  { title: 'Personnel Census', desc: 'Maintain current office employee sex-disaggregated data.' },
                  { title: 'Accomplishment Reporting', desc: 'Quarterly logs of utilized funds and reached targets.' },
                ].map((p, i) => (
                  <li key={i} className="flex items-start gap-3 group">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.title}</p>
                      <p className="text-[9px] text-muted-foreground leading-tight">{p.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
