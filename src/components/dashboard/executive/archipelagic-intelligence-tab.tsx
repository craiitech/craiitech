'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from '@/firebase/firestore-wrapper';
import type {
  Campus,
  Unit,
  AcademicProgram,
  ProgramComplianceRecord,
  VpStrategicGoal,
  OperationalPlanItem,
  QualityObjectiveItem,
  TenPointAgendaSettings,
} from '@/lib/types';
import { ARCHIPELAGIC_PILLARS, SUC_LEVELLING_KRAS, UNIVERSITY_TEN_POINT_AGENDA, getAgendaList } from '@/lib/constants';
import { getUserVpContext } from '@/lib/utils';
import { VpStrategicGoalsDialog } from '@/components/operational-plan/vp-strategic-goals-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Compass,
  Award,
  Crown,
  Landmark,
  Building2,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Search,
  ExternalLink,
  Printer,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Zap,
  BarChart3,
  Layers,
  MapPin,
  Users,
  GraduationCap,
  BookOpen,
  Filter,
  Info,
} from 'lucide-react';
import { Chart3DDefs } from '@/components/ui/chart-3d-defs';

interface ArchipelagicIntelligenceTabProps {
  campuses: Campus[];
  allUnits: Unit[];
  academicPrograms?: AcademicProgram[];
  allCompliances?: ProgramComplianceRecord[];
  selectedYear: number;
}

type FunctionalRoleMode = 'president' | 'vp' | 'campus-director' | 'unit-head';

const PILLAR_COLORS = ['#0284c7', '#059669', '#d97706', '#7c3aed', '#e11d48'];
const KRA_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

// Helper to test if text matches a Pillar
function matchesPillar(itemPillar: string | undefined, pillarCode: string, pillarTitle: string): boolean {
  if (!itemPillar) return false;
  const pLower = itemPillar.toLowerCase();
  const cLower = pillarCode.toLowerCase();
  const num = pillarCode.split('-')[1]; // e.g. '01'
  const intNum = parseInt(num, 10);
  return (
    pLower.includes(cLower) ||
    pLower.includes(`pillar ${num}`) ||
    pLower.includes(`pillar 0${intNum}`) ||
    pLower.includes(`pillar ${intNum}`) ||
    pLower.includes(pillarTitle.toLowerCase().slice(0, 18))
  );
}

// Helper to test if text matches a SUC KRA
function matchesKra(itemKra: string | undefined, kraCode: string, kraTitle: string): boolean {
  if (!itemKra) return false;
  const kLower = itemKra.toLowerCase();
  const num = kraCode.split('-')[1]; // e.g. '1'
  return (
    kLower.includes(`kra ${num}`) ||
    kLower.includes(`kra-${num}`) ||
    kLower.includes(kraTitle.toLowerCase().slice(0, 16))
  );
}

// Helper to test if text matches a 10-Point Agenda
function matchesAgenda(itemAgendas: string[], pointCode: string, pointTitle: string): boolean {
  const pNum = pointCode.split('-')[1]; // e.g. '1'
  return itemAgendas.some((ag) => {
    const aLower = ag.toLowerCase();
    return (
      aLower.includes(`point ${pNum}:`) ||
      aLower.includes(`point ${pNum} `) ||
      aLower.includes(`point-${pNum}`) ||
      aLower.includes(pointTitle.toLowerCase().slice(0, 18))
    );
  });
}

export function ArchipelagicIntelligenceTab({
  campuses,
  allUnits,
  academicPrograms = [],
  allCompliances = [],
  selectedYear,
}: ArchipelagicIntelligenceTabProps) {
  const firestore = useFirestore();
  const { userProfile, userRole, isAdmin, isSupervisor, isVp } = useUser();

  // Role detection
  const roleLower = userRole?.toLowerCase() || '';
  const isPresident = roleLower.includes('president') && !roleLower.includes('vice');
  const isCampusDirector = roleLower.includes('campus director') || roleLower.includes('director');

  // Default functional lens based on user
  const initialRoleMode: FunctionalRoleMode =
    isPresident || isAdmin ? 'president' : isVp ? 'vp' : isCampusDirector ? 'campus-director' : 'unit-head';

  const [roleMode, setRoleMode] = useState<FunctionalRoleMode>(initialRoleMode);
  const [selectedVpCluster, setSelectedVpCluster] = useState<string>('all');
  const [selectedCampusId, setSelectedCampusId] = useState<string>(userProfile?.campusId || campuses[0]?.id || 'all');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(userProfile?.unitId || allUnits[0]?.id || 'all');
  const [activeAnalysisView, setActiveAnalysisView] = useState<'pillars' | 'suc' | 'agenda'>('pillars');
  const [searchQuery, setSearchQuery] = useState('');

  // Drilldown dialog state
  const [drilldownItem, setDrilldownItem] = useState<any | null>(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

  // VP Strategic Goals Management Dialog state & context
  const [isVpGoalsDialogOpen, setIsVpGoalsDialogOpen] = useState(false);
  const userVpContext = useMemo(() => getUserVpContext(userProfile, allUnits), [userProfile, allUnits]);
  const canManageVpGoals = isAdmin || isSupervisor || userVpContext.isVpOffice;

  // 1. Fetch VP Strategic Goals for the Year
  const goalsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'vpStrategicGoals'), where('year', '==', selectedYear));
  }, [firestore, selectedYear]);
  const { data: vpGoals } = useCollection<VpStrategicGoal>(goalsQuery);

  // 2. Fetch Operational Plan Items for the Year
  const opItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'operationalPlanItems'), where('year', '==', selectedYear));
  }, [firestore, selectedYear]);
  const { data: rawOpItems } = useCollection<OperationalPlanItem>(opItemsQuery);

  // 3. Fetch Quality Objectives for the Year
  const qomItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'qualityObjectives'), where('year', '==', selectedYear));
  }, [firestore, selectedYear]);
  const { data: rawQomItems } = useCollection<QualityObjectiveItem>(qomItemsQuery);

  // 4. Fetch Dynamic 10-Point Agenda Settings (AQ)
  const agendaSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'tenPointAgenda') : null),
    [firestore],
  );
  const { data: agendaSettings } = useDoc<TenPointAgendaSettings>(agendaSettingsRef);

  const activeTenPointAgenda = useMemo(() => {
    if (agendaSettings?.items && Array.isArray(agendaSettings.items) && agendaSettings.items.length > 0) {
      return agendaSettings.items;
    }
    return UNIVERSITY_TEN_POINT_AGENDA;
  }, [agendaSettings]);

  // Maps for fast lookups
  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(allUnits.map((u) => [u.id, u])), [allUnits]);

  // Unified Enriched Tasks List (merges OP Items & QOM Items and resolves VP goal inheritance)
  const allStrategicDeliverables = useMemo(() => {
    const list: Array<{
      id: string;
      source: 'operationalPlan' | 'qualityObjective';
      title: string;
      objective: string;
      unitId: string;
      unitName: string;
      campusId: string;
      campusName: string;
      vpCluster: string;
      archipelagicPillar: string;
      sucLevellingKra: string;
      tenPointAgendas: string[];
      timeline: string;
      budget: number;
      responsiblePerson: string;
      attainment: number;
      status: 'Achieved' | 'Ongoing' | 'Pending' | 'Delayed';
      movLink?: string;
      remarks?: string;
    }> = [];

    const goalMap = new Map((vpGoals || []).map((g) => [g.id, g]));

    // 1. Process Operational Plan Items
    (rawOpItems || []).forEach((item) => {
      const u = unitMap.get(item.unitId);
      const campId = u?.campusIds?.[0] || 'Main';
      const campName = campusMap.get(campId) || 'Main Campus';
      const vpGoal = item.vpObjectiveId ? goalMap.get(item.vpObjectiveId) : null;

      const pillar = item.archipelagicPillar || vpGoal?.archipelagicPillar || '';
      const kra = item.sucLevellingKra || vpGoal?.sucLevellingKra || '';
      const agendas =
        getAgendaList(item.tenPointAgenda, item.tenPointAgendas).length > 0
          ? getAgendaList(item.tenPointAgenda, item.tenPointAgendas)
          : getAgendaList(vpGoal?.tenPointAgenda, vpGoal?.tenPointAgendas);

      const attain =
        item.actualMetricValue !== undefined
          ? Math.min(100, Math.round(Number(item.actualMetricValue)))
          : (item.attainmentPercentage ?? (item.isCompleted ? 100 : 0));

      const computedStatus: 'Achieved' | 'Ongoing' | 'Pending' | 'Delayed' =
        attain >= 100 || item.isCompleted || item.status === 'Approved' || item.status === 'Achieved'
          ? 'Achieved'
          : item.status === 'Delayed'
            ? 'Delayed'
            : item.progressUpdates || attain > 0
              ? 'Ongoing'
              : 'Pending';

      list.push({
        id: item.id,
        source: 'operationalPlan',
        title: item.tasks || item.objective,
        objective: item.objective || '',
        unitId: item.unitId,
        unitName: u?.name || 'Unit',
        campusId: campId,
        campusName: campName,
        vpCluster: vpGoal?.vpCluster || 'General',
        archipelagicPillar: pillar,
        sucLevellingKra: kra,
        tenPointAgendas: agendas,
        timeline:
          item.timelineStart && item.timelineEnd
            ? `${item.timelineStart} – ${item.timelineEnd}`
            : item.timelineStart || 'Annual',
        budget: Number(item.budget) || 0,
        responsiblePerson: item.personsResponsible || 'Unit Head',
        attainment: attain,
        status: computedStatus,
        movLink: item.movDriveLink,
        remarks: item.remarks,
      });
    });

    // 2. Process Quality Objectives that might not be in operationalPlanItems
    (rawQomItems || []).forEach((q) => {
      const alreadyIncluded = list.some(
        (existing) =>
          existing.id === q.opItemId || (existing.title?.trim() === q.taskText?.trim() && existing.unitId === q.unitId),
      );

      if (!alreadyIncluded) {
        const u = unitMap.get(q.unitId);
        const campId = u?.campusIds?.[0] || 'Main';
        const campName = campusMap.get(campId) || 'Main Campus';

        const attain = q.attainmentPercentage ?? 0;
        const computedStatus: 'Achieved' | 'Ongoing' | 'Pending' | 'Delayed' =
          q.status === 'Achieved' || attain >= 100
            ? 'Achieved'
            : q.status === 'Delayed'
              ? 'Delayed'
              : q.status === 'Ongoing' || attain > 0
                ? 'Ongoing'
                : 'Pending';

        list.push({
          id: q.id,
          source: 'qualityObjective',
          title: q.taskText || q.objectiveText,
          objective: q.objectiveText || '',
          unitId: q.unitId,
          unitName: u?.name || 'Unit',
          campusId: campId,
          campusName: campName,
          vpCluster: 'General',
          archipelagicPillar: q.archipelagicPillar || '',
          sucLevellingKra: q.sucLevellingKra || '',
          tenPointAgendas: getAgendaList(q.tenPointAgenda, q.tenPointAgendas),
          timeline: 'Annual',
          budget: 0,
          responsiblePerson: q.responsiblePerson || 'QA UNIT',
          attainment: attain,
          status: computedStatus,
          movLink: q.movLink,
          remarks: q.remarks,
        });
      }
    });

    return list;
  }, [rawOpItems, rawQomItems, vpGoals, unitMap, campusMap]);

  // Filtered deliverables according to search & functional role lens
  const scopedDeliverables = useMemo(() => {
    let result = [...allStrategicDeliverables];

    // Filter by role lens:
    if (roleMode === 'vp') {
      if (selectedVpCluster !== 'all') {
        result = result.filter((d) => d.vpCluster?.toLowerCase() === selectedVpCluster.toLowerCase());
      }
    } else if (roleMode === 'campus-director') {
      if (selectedCampusId !== 'all') {
        result = result.filter((d) => d.campusId === selectedCampusId);
      }
    } else if (roleMode === 'unit-head') {
      if (selectedUnitId !== 'all') {
        result = result.filter((d) => d.unitId === selectedUnitId);
      }
    }

    // Filter by query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.objective.toLowerCase().includes(q) ||
          d.unitName.toLowerCase().includes(q) ||
          d.campusName.toLowerCase().includes(q) ||
          d.archipelagicPillar.toLowerCase().includes(q) ||
          d.sucLevellingKra.toLowerCase().includes(q) ||
          d.tenPointAgendas.some((a) => a.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [allStrategicDeliverables, roleMode, selectedVpCluster, selectedCampusId, selectedUnitId, searchQuery]);

  // ============================================================
  // 1. KPI OF THE 5 ARCHIPELAGIC PILLARS
  // ============================================================
  const pillarsAnalytics = useMemo(() => {
    return ARCHIPELAGIC_PILLARS.map((pillar, idx) => {
      const matched = scopedDeliverables.filter((d) => matchesPillar(d.archipelagicPillar, pillar.code, pillar.title));

      const total = matched.length;
      const completed = matched.filter((d) => d.status === 'Achieved').length;
      const ongoing = matched.filter((d) => d.status === 'Ongoing').length;
      const delayed = matched.filter((d) => d.status === 'Delayed').length;
      const budget = matched.reduce((acc, curr) => acc + curr.budget, 0);

      const attainments = matched.map((d) => d.attainment);
      const avgAttainment = total > 0 ? Math.round(attainments.reduce((acc, curr) => acc + curr, 0) / total) : 0;

      const unitsSet = new Set(matched.map((d) => d.unitId));
      const campusesSet = new Set(matched.map((d) => d.campusId));

      return {
        ...pillar,
        color: PILLAR_COLORS[idx % PILLAR_COLORS.length],
        totalTasks: total,
        completedTasks: completed,
        ongoingTasks: ongoing,
        delayedTasks: delayed,
        attainmentRate: avgAttainment,
        totalBudget: budget,
        contributingUnitsCount: unitsSet.size,
        contributingCampusesCount: campusesSet.size,
        deliverables: matched,
      };
    });
  }, [scopedDeliverables]);

  // Overall Archipelagic Health
  const overallPillarScore = useMemo(() => {
    const active = pillarsAnalytics.filter((p) => p.totalTasks > 0);
    if (active.length === 0) return 0;
    return Math.round(active.reduce((acc, curr) => acc + curr.attainmentRate, 0) / active.length);
  }, [pillarsAnalytics]);

  // ============================================================
  // 2. SUC LEVELLING KRAS
  // ============================================================
  const sucLevellingAnalytics = useMemo(() => {
    return SUC_LEVELLING_KRAS.map((kra, idx) => {
      const matched = scopedDeliverables.filter((d) => matchesKra(d.sucLevellingKra, kra.code, kra.title));

      const total = matched.length;
      const completed = matched.filter((d) => d.status === 'Achieved').length;
      const ongoing = matched.filter((d) => d.status === 'Ongoing').length;
      const budget = matched.reduce((acc, curr) => acc + curr.budget, 0);

      const attainments = matched.map((d) => d.attainment);
      const avgAttainment = total > 0 ? Math.round(attainments.reduce((acc, curr) => acc + curr, 0) / total) : 0;

      return {
        ...kra,
        color: KRA_COLORS[idx % KRA_COLORS.length],
        totalTasks: total,
        completedTasks: completed,
        ongoingTasks: ongoing,
        attainmentRate: avgAttainment,
        totalBudget: budget,
        deliverables: matched,
      };
    });
  }, [scopedDeliverables]);

  // SUC Level V Readiness score (weighted average)
  const sucLevelVReadiness = useMemo(() => {
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1]; // KRA 1 to 5 weights
    let score = 0;
    sucLevellingAnalytics.forEach((kra, idx) => {
      score += (kra.attainmentRate || 0) * (weights[idx] || 0.2);
    });
    return Math.round(score);
  }, [sucLevellingAnalytics]);

  // ============================================================
  // 3. 10-POINT STRATEGIC AGENDA
  // ============================================================
  const tenPointAgendaAnalytics = useMemo(() => {
    return activeTenPointAgenda.map((point) => {
      const matched = scopedDeliverables.filter((d) => matchesAgenda(d.tenPointAgendas, point.code, point.title));

      const total = matched.length;
      const completed = matched.filter((d) => d.status === 'Achieved').length;
      const budget = matched.reduce((acc, curr) => acc + curr.budget, 0);

      const attainments = matched.map((d) => d.attainment);
      const avgAttainment = total > 0 ? Math.round(attainments.reduce((acc, curr) => acc + curr, 0) / total) : 0;

      const vpClusters = Array.from(new Set(matched.map((d) => d.vpCluster).filter(Boolean)));

      return {
        ...point,
        totalTasks: total,
        completedTasks: completed,
        attainmentRate: avgAttainment,
        totalBudget: budget,
        vpClusters,
        deliverables: matched,
      };
    });
  }, [scopedDeliverables, activeTenPointAgenda]);

  // Agenda Execution Rate
  const agendaExecutionRate = useMemo(() => {
    const pointsWithTasks = tenPointAgendaAnalytics.filter((p) => p.totalTasks > 0);
    if (pointsWithTasks.length === 0) return 0;
    return Math.round(pointsWithTasks.reduce((acc, curr) => acc + curr.attainmentRate, 0) / pointsWithTasks.length);
  }, [tenPointAgendaAnalytics]);

  // ============================================================
  // Cross-Campus Parity Matrix (President's View)
  // ============================================================
  const campusParityMatrix = useMemo(() => {
    return campuses.map((campus) => {
      const campusTasks = allStrategicDeliverables.filter((d) => d.campusId === campus.id);
      const total = campusTasks.length;
      const completed = campusTasks.filter((d) => d.status === 'Achieved').length;
      const budget = campusTasks.reduce((acc, curr) => acc + curr.budget, 0);

      // Score per pillar
      const pillarScores = ARCHIPELAGIC_PILLARS.map((p) => {
        const pTasks = campusTasks.filter((d) => matchesPillar(d.archipelagicPillar, p.code, p.title));
        if (pTasks.length === 0) return 0;
        return Math.round(pTasks.reduce((acc, curr) => acc + curr.attainment, 0) / pTasks.length);
      });

      const overall = total > 0 ? Math.round(campusTasks.reduce((acc, curr) => acc + curr.attainment, 0) / total) : 0;

      return {
        campusId: campus.id,
        campusName: campus.name,
        totalTasks: total,
        completedTasks: completed,
        totalBudget: budget,
        overallAttainment: overall,
        pillarScores,
      };
    });
  }, [campuses, allStrategicDeliverables]);

  // VP Cluster Accountability (President's View)
  const vpAccountabilityList = useMemo(() => {
    const clusters = ['VPAA', 'VPREDI', 'VPAF', 'OVPSAS'];
    return clusters.map((cluster) => {
      const clusterTasks = allStrategicDeliverables.filter((d) => d.vpCluster?.toUpperCase() === cluster);
      const goals = (vpGoals || []).filter((g) => g.vpCluster?.toUpperCase() === cluster);
      const total = clusterTasks.length;
      const completed = clusterTasks.filter((d) => d.status === 'Achieved').length;
      const budget = clusterTasks.reduce((acc, curr) => acc + curr.budget, 0);
      const attainment =
        total > 0 ? Math.round(clusterTasks.reduce((acc, curr) => acc + curr.attainment, 0) / total) : 0;

      return {
        cluster,
        label:
          cluster === 'VPAA'
            ? 'Academic Affairs'
            : cluster === 'VPREDI'
              ? 'Research, Extension & Innovation'
              : cluster === 'VPAF'
                ? 'Administration & Finance'
                : 'Student Affairs & Services',
        goalsCount: goals.length,
        totalTasks: total,
        completedTasks: completed,
        totalBudget: budget,
        attainmentRate: attainment,
      };
    });
  }, [allStrategicDeliverables, vpGoals]);

  // Radar Data for Pillars & KRAs
  const pillarRadarData = useMemo(() => {
    return pillarsAnalytics.map((p) => ({
      subject: p.title.split(':')[0],
      score: p.attainmentRate,
      target: 100,
      fullMark: 100,
    }));
  }, [pillarsAnalytics]);

  // Print Executive Briefing
  const handlePrintBriefing = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <Chart3DDefs idPrefix="arch-intel" />

      {/* 1. Top Executive Control Bar */}
      <Card className="border-2 shadow-xs bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
                  <Compass className="h-6 w-6 animate-spin-slow" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                    ARCHIPELAGIC INTELLIGENCE (AQ) SYSTEM
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] font-bold">
                      AY {selectedYear}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-300 mt-0.5">
                    Strategic Executive Oversight across the 5 Archipelagic Pillars, SUC Levelling KRAs, and University
                    10-Point Agenda (AQ).
                  </CardDescription>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {canManageVpGoals && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsVpGoalsDialogOpen(true)}
                  className="text-xs font-bold gap-1.5 bg-cyan-500/20 text-cyan-200 border-cyan-400/40 hover:bg-cyan-500/30 hover:text-white"
                >
                  <Target className="h-4 w-4 text-cyan-300" />
                  {userVpContext.isVpOffice
                    ? `Manage ${userVpContext.vpCode || 'VP'} Strategic Goals`
                    : 'Manage VP Strategic Goals'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintBriefing}
                className="text-xs font-bold gap-1.5 bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <Printer className="h-4 w-4 text-cyan-300" /> Print Archipelagic (AQ) Brief
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-4">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5" /> Functional Role Lens (Executive Perspective):
              </div>
              <div className="text-[11px] text-slate-300 italic">
                Active view tailored for:{' '}
                <span className="font-bold text-white capitalize">{roleMode.replace('-', ' ')}</span>
              </div>
            </div>

            {/* Segmented Lens Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                type="button"
                variant={roleMode === 'president' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleMode('president')}
                className={`text-xs font-bold gap-1.5 h-9 justify-start ${
                  roleMode === 'president'
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <Crown className="h-3.5 w-3.5" /> University President
              </Button>

              <Button
                type="button"
                variant={roleMode === 'vp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleMode('vp')}
                className={`text-xs font-bold gap-1.5 h-9 justify-start ${
                  roleMode === 'vp'
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <Landmark className="h-3.5 w-3.5" /> Vice Presidents
              </Button>

              <Button
                type="button"
                variant={roleMode === 'campus-director' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleMode('campus-director')}
                className={`text-xs font-bold gap-1.5 h-9 justify-start ${
                  roleMode === 'campus-director'
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" /> Campus Directors
              </Button>

              <Button
                type="button"
                variant={roleMode === 'unit-head' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleMode('unit-head')}
                className={`text-xs font-bold gap-1.5 h-9 justify-start ${
                  roleMode === 'unit-head'
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <Target className="h-3.5 w-3.5" /> Unit Heads &amp; Deans
              </Button>
            </div>

            {/* Dynamic Scope Filter Dropdowns Based on Role Lens */}
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
              {roleMode === 'vp' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">
                    VP Portfolio:
                  </span>
                  <Select value={selectedVpCluster} onValueChange={setSelectedVpCluster}>
                    <SelectTrigger className="bg-slate-900 border-white/20 text-xs text-white h-8 w-full sm:w-56">
                      <SelectValue placeholder="All VP Clusters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        All VP Clusters (University-wide)
                      </SelectItem>
                      <SelectItem value="VPAA" className="text-xs">
                        VPAA (Academic Affairs)
                      </SelectItem>
                      <SelectItem value="VPREDI" className="text-xs">
                        VPREDI (Research &amp; Extension)
                      </SelectItem>
                      <SelectItem value="VPAF" className="text-xs">
                        VPAF (Admin &amp; Finance)
                      </SelectItem>
                      <SelectItem value="OVPSAS" className="text-xs">
                        OVPSAS (Student Services)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {canManageVpGoals && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsVpGoalsDialogOpen(true)}
                      className="bg-slate-900 border-white/20 text-xs text-cyan-300 hover:text-white hover:bg-slate-800 h-8 gap-1.5 whitespace-nowrap"
                    >
                      <Target className="h-3.5 w-3.5 text-cyan-400" />
                      {userVpContext.isVpOffice ? `Edit ${userVpContext.vpCode || 'VP'} Goals` : 'Edit Strategic Goals'}
                    </Button>
                  )}
                </div>
              )}

              {roleMode === 'campus-director' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">
                    Island Campus:
                  </span>
                  <Select value={selectedCampusId} onValueChange={setSelectedCampusId}>
                    <SelectTrigger className="bg-slate-900 border-white/20 text-xs text-white h-8 w-full sm:w-56">
                      <SelectValue placeholder="Select Campus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        All Campuses Overview
                      </SelectItem>
                      {campuses.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {roleMode === 'unit-head' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">
                    Specific Unit:
                  </span>
                  <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                    <SelectTrigger className="bg-slate-900 border-white/20 text-xs text-white h-8 w-full sm:w-64">
                      <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all" className="text-xs">
                        All Academic &amp; Admin Units
                      </SelectItem>
                      {allUnits.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quick Search */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter deliverables, keywords, pillars, or agendas..."
                  className="bg-slate-900/80 border-white/20 text-xs text-white pl-8 h-8 w-full"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Top Executive Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Archipelagic Attainment Score */}
        <Card className="border shadow-xs hover:border-cyan-500/50 transition-all">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Archipelagic (AQ) Attainment
              </span>
              <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400">
                <Compass className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black tracking-tight text-foreground">{overallPillarScore}%</span>
              <Badge variant="outline" className="text-[10px] font-bold text-cyan-600 border-cyan-300">
                5 Pillars Combined
              </Badge>
            </div>
            <Progress value={overallPillarScore} className="h-2" />
            <div className="text-[10.5px] text-muted-foreground flex justify-between">
              <span>Execution progress</span>
              <span className="font-bold">
                {pillarsAnalytics.filter((p) => p.attainmentRate >= 80).length} of 5 on track
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: SUC Level V Readiness */}
        <Card className="border shadow-xs hover:border-emerald-500/50 transition-all">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                SUC Level V Readiness
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black tracking-tight text-foreground">{sucLevelVReadiness}%</span>
              <Badge className="text-[10px] font-bold bg-emerald-600 text-white">Trajectory: Level V</Badge>
            </div>
            <Progress value={sucLevelVReadiness} className="h-2" />
            <div className="text-[10.5px] text-muted-foreground flex justify-between">
              <span>KRAs 1 – 5 Weighted</span>
              <span className="font-bold text-emerald-600">CHED / DBM SUC Model</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: 10-Point Agenda Execution Rate */}
        <Card className="border shadow-xs hover:border-amber-500/50 transition-all">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                10-Point Agenda Index
              </span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <Target className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black tracking-tight text-foreground">{agendaExecutionRate}%</span>
              <Badge variant="outline" className="text-[10px] font-bold text-amber-600 border-amber-300">
                Presidential Directives
              </Badge>
            </div>
            <Progress value={agendaExecutionRate} className="h-2" />
            <div className="text-[10.5px] text-muted-foreground flex justify-between">
              <span>Committed agendas</span>
              <span className="font-bold">
                {tenPointAgendaAnalytics.filter((a) => a.totalTasks > 0).length} of 10 Active
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Strategic Deliverables & Budget */}
        <Card className="border shadow-xs hover:border-purple-500/50 transition-all">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Strategic Commitments
              </span>
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black tracking-tight text-foreground">{scopedDeliverables.length}</span>
              <span className="text-xs font-mono font-bold text-purple-600">
                ₱{(scopedDeliverables.reduce((acc, curr) => acc + curr.budget, 0) / 1000000).toFixed(1)}M Budget
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {scopedDeliverables.filter((d) => d.status === 'Achieved').length}{' '}
                Done
              </span>
              <span className="text-blue-600 font-bold flex items-center gap-1">
                <Clock className="h-3 w-3" /> {scopedDeliverables.filter((d) => d.status === 'Ongoing').length}{' '}
                In-Progress
              </span>
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {scopedDeliverables.filter((d) => d.status === 'Delayed').length}{' '}
                Delayed
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Role-Specific Executive Dashboards */}
      {roleMode === 'president' && (
        <div className="space-y-6">
          {/* President's Radar & VP Scorecard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Archipelagic Radar Chart */}
            <div className="lg:col-span-5">
              <Card className="shadow-xs h-full flex flex-col justify-between">
                <CardHeader className="py-3 bg-muted/20 border-b">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Compass className="h-4 w-4 text-cyan-600" />
                    Archipelagic (AQ) Pillar Strategic Radar
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Institutional balance across all 5 Archipelagic Pillars against the 100% excellence target.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2 flex items-center justify-center">
                  <div className="w-full h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={pillarRadarData}>
                        <PolarGrid stroke="#cbd5e1" opacity={0.6} />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar
                          name="Current Attainment (%)"
                          dataKey="score"
                          stroke="#0284c7"
                          fill="#38bdf8"
                          fillOpacity={0.45}
                        />
                        <Radar
                          name="Institutional Target (100%)"
                          dataKey="target"
                          stroke="#94a3b8"
                          strokeDasharray="4 4"
                          fill="none"
                        />
                        <RechartsTooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/5 border-t py-3 px-6">
                  <div className="flex items-start gap-3">
                    <Compass className="h-4 w-4 text-cyan-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                      <strong>Pillar Attainment Interpretation:</strong> This radar chart benchmarks university
                      performance across all five Archipelagic Pillars (blue polygon) against the 100% excellence
                      ceiling (dashed gray perimeter). Deficits across any radius indicate strategic areas—such as
                      maritime heritage research or inter-island digital connectivity—requiring executive policy
                      intervention and vice-presidential resource reallocation.
                    </p>
                  </div>
                </CardFooter>
              </Card>
            </div>

            {/* Right: VP Accountability Scorecard */}
            <div className="lg:col-span-7">
              <Card className="shadow-xs h-full flex flex-col justify-between">
                <CardHeader className="py-3 bg-muted/20 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-indigo-600" />
                      Vice Presidential Cluster Accountability Scorecard
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Sectoral cascade from Vice Presidents down to operational colleges and service units.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManageVpGoals && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsVpGoalsDialogOpen(true)}
                        className="h-7 text-xs font-semibold gap-1.5 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                      >
                        <Target className="h-3.5 w-3.5 text-indigo-600" />
                        {userVpContext.isVpOffice ? `Manage ${userVpContext.vpCode || 'VP'} Goals` : 'Manage Goals'}
                      </Button>
                    )}
                    <Badge variant="outline" className="text-[10px] font-bold">
                      AY {selectedYear}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="font-bold">VP Cluster</TableHead>
                        <TableHead className="text-center font-bold">Strategic Goals</TableHead>
                        <TableHead className="text-center font-bold">Cascaded Deliverables</TableHead>
                        <TableHead className="text-right font-bold">Budget (₱)</TableHead>
                        <TableHead className="text-center font-bold">Attainment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vpAccountabilityList.map((vp) => (
                        <TableRow key={vp.cluster} className="hover:bg-muted/30">
                          <TableCell className="py-2.5">
                            <div className="font-bold text-xs">{vp.cluster}</div>
                            <div className="text-[10px] text-muted-foreground">{vp.label}</div>
                          </TableCell>
                          <TableCell className="text-center font-bold font-mono">{vp.goalsCount}</TableCell>
                          <TableCell className="text-center font-bold font-mono">
                            <span className="text-foreground">{vp.totalTasks}</span>
                            <span className="text-muted-foreground text-[10px] ml-1">({vp.completedTasks} done)</span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            ₱{vp.totalBudget.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Progress value={vp.attainmentRate} className="w-16 h-2" />
                              <span className="font-bold text-xs font-mono">{vp.attainmentRate}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Cross-Campus Parity Matrix Table */}
          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="py-3 bg-muted/20 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  Cross-Campus Parity Matrix across the 5 Archipelagic Pillars
                </CardTitle>
                <CardDescription className="text-xs">
                  Comparative performance of RSU island campuses ensuring equitable development and multi-island
                  inclusion.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="text-xs">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold min-w-[140px]">Campus</TableHead>
                    <TableHead className="text-center font-bold w-20">Deliverables</TableHead>
                    <TableHead className="text-center font-bold w-24">Pillar 1 (Educ)</TableHead>
                    <TableHead className="text-center font-bold w-24">Pillar 2 (Research)</TableHead>
                    <TableHead className="text-center font-bold w-24">Pillar 3 (Exten)</TableHead>
                    <TableHead className="text-center font-bold w-24">Pillar 4 (Gov)</TableHead>
                    <TableHead className="text-center font-bold w-24">Pillar 5 (Cross)</TableHead>
                    <TableHead className="text-center font-bold min-w-[120px]">Overall Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campusParityMatrix.map((camp) => (
                    <TableRow key={camp.campusId} className="hover:bg-muted/30">
                      <TableCell className="font-bold py-2.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {camp.campusName}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold">{camp.totalTasks}</TableCell>
                      {camp.pillarScores.map((score, pIdx) => (
                        <TableCell key={pIdx} className="text-center">
                          <span
                            className={`font-mono font-bold px-1.5 py-0.5 rounded-xs text-[11px] ${
                              score >= 80
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : score >= 50
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                  : score > 0
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                    : 'text-muted-foreground'
                            }`}
                          >
                            {score}%
                          </span>
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={camp.overallAttainment} className="w-16 h-2" />
                          <span className="font-bold font-mono text-xs">{camp.overallAttainment}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. Interactive Analytical Deep Dive Switcher (The 3 Core Prompt Requirements) */}
      <Tabs value={activeAnalysisView} onValueChange={(val: any) => setActiveAnalysisView(val)} className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="bg-muted p-1 rounded-xl">
            <TabsTrigger value="pillars" className="text-xs font-bold gap-1.5 px-4">
              <Compass className="h-3.5 w-3.5 text-blue-600" />
              1. 5 Archipelagic Pillars (AQ) ({pillarsAnalytics.length})
            </TabsTrigger>
            <TabsTrigger value="suc" className="text-xs font-bold gap-1.5 px-4">
              <Award className="h-3.5 w-3.5 text-emerald-600" />
              2. SUC Levelling KRAs ({sucLevellingAnalytics.length})
            </TabsTrigger>
            <TabsTrigger value="agenda" className="text-xs font-bold gap-1.5 px-4">
              <Target className="h-3.5 w-3.5 text-amber-600" />
              3. President&apos;s 10-Point Agenda (AQ) ({tenPointAgendaAnalytics.length})
            </TabsTrigger>
          </TabsList>

          <div className="text-xs text-muted-foreground hidden sm:block">
            Showing <strong className="text-foreground">{scopedDeliverables.length}</strong> strategic deliverables
          </div>
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: 5 ARCHIPELAGIC PILLARS EXPLORER                  */}
        {/* ======================================================== */}
        <TabsContent value="pillars" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pillarsAnalytics.map((pillar) => (
              <Card
                key={pillar.code}
                className="border shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="h-2 w-full" style={{ backgroundColor: pillar.color }} />
                <CardHeader className="pb-3 pt-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className="font-bold text-[10px]"
                      style={{ borderColor: pillar.color, color: pillar.color }}
                    >
                      {pillar.code}
                    </Badge>
                    <span className="font-mono font-bold text-sm text-foreground">{pillar.attainmentRate}%</span>
                  </div>
                  <CardTitle className="text-sm font-bold leading-snug">{pillar.title}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2 mt-1">{pillar.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pb-3">
                  <Progress value={pillar.attainmentRate} className="h-2" />
                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-muted/30 rounded-lg">
                    <div>
                      <div className="font-black text-sm">{pillar.totalTasks}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Tasks</div>
                    </div>
                    <div>
                      <div className="font-black text-sm text-emerald-600">{pillar.completedTasks}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Achieved</div>
                    </div>
                    <div>
                      <div className="font-black text-sm text-blue-600">₱{(pillar.totalBudget / 1000).toFixed(0)}k</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Budget</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex justify-between">
                    <span>
                      Contributing Units: <strong>{pillar.contributingUnitsCount}</strong>
                    </span>
                    <span>
                      Campuses: <strong>{pillar.contributingCampusesCount}</strong>
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="py-2.5 px-4 bg-muted/20 border-t flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDrilldownItem({
                        type: 'Pillar',
                        title: pillar.title,
                        description: pillar.description,
                        deliverables: pillar.deliverables,
                        attainment: pillar.attainmentRate,
                      });
                      setIsDrilldownOpen(true);
                    }}
                    className="text-xs font-bold gap-1 text-primary hover:bg-primary/10 h-7"
                  >
                    View Deliverables ({pillar.totalTasks}) <ChevronRight className="h-3 w-3" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* VIEW 2: SUC LEVELLING KRAS                               */}
        {/* ======================================================== */}
        <TabsContent value="suc" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {sucLevellingAnalytics.map((kra) => (
              <Card
                key={kra.code}
                className="border shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="h-2 w-full" style={{ backgroundColor: kra.color }} />
                <CardHeader className="pb-2 pt-3">
                  <Badge
                    variant="outline"
                    className="w-fit text-[10px] font-bold mb-1"
                    style={{ borderColor: kra.color, color: kra.color }}
                  >
                    {kra.code}
                  </Badge>
                  <CardTitle className="text-xs font-bold leading-tight">{kra.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-foreground">{kra.attainmentRate}%</span>
                    <span className="text-xs font-bold text-muted-foreground">{kra.totalTasks} Tasks</span>
                  </div>
                  <Progress value={kra.attainmentRate} className="h-1.5" />
                  <p className="text-[11px] text-muted-foreground line-clamp-3">{kra.description}</p>
                </CardContent>
                <CardFooter className="py-2 px-3 bg-muted/20 border-t flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDrilldownItem({
                        type: 'SUC Levelling KRA',
                        title: kra.title,
                        description: kra.description,
                        deliverables: kra.deliverables,
                        attainment: kra.attainmentRate,
                      });
                      setIsDrilldownOpen(true);
                    }}
                    className="text-[11px] font-bold gap-1 text-primary h-6 px-2"
                  >
                    Drill Down <ChevronRight className="h-3 w-3" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* VIEW 3: 10-POINT STRATEGIC AGENDA                        */}
        {/* ======================================================== */}
        <TabsContent value="agenda" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {tenPointAgendaAnalytics.map((point) => (
              <Card
                key={point.code}
                className="border shadow-xs hover:border-amber-400/50 transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-3 pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <Badge
                      variant="secondary"
                      className="font-bold text-[9px] bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    >
                      {point.code}
                    </Badge>
                    <span className="font-mono font-bold text-xs">{point.attainmentRate}%</span>
                  </div>
                  <CardTitle className="text-xs font-bold line-clamp-2 leading-snug">{point.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  <Progress value={point.attainmentRate} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{point.description}</p>
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground pt-1">
                    <span>{point.totalTasks} Deliverables</span>
                    <span className="text-emerald-600">{point.completedTasks} Done</span>
                  </div>
                </CardContent>
                <CardFooter className="py-1.5 px-3 bg-muted/20 border-t flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDrilldownItem({
                        type: '10-Point Agenda',
                        title: point.title,
                        description: point.description,
                        deliverables: point.deliverables,
                        attainment: point.attainmentRate,
                      });
                      setIsDrilldownOpen(true);
                    }}
                    className="text-[10px] font-bold gap-1 text-primary h-6 px-1.5"
                  >
                    Details <ChevronRight className="h-2.5 w-2.5" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 5. Comprehensive Deliverables Master Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="py-3 bg-muted/20 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Strategic Deliverables Matrix ({scopedDeliverables.length} Items)
            </CardTitle>
            <CardDescription className="text-xs">
              Every committed task mapped to Archipelagic Pillars, SUC Levelling, and the President&apos;s 10-Point
              Agenda.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {scopedDeliverables.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No strategic deliverables found matching the active lens and filter criteria.
            </div>
          ) : (
            <Table className="text-xs">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-10 text-center font-bold">#</TableHead>
                  <TableHead className="min-w-[200px] font-bold">Action Plan / Deliverable</TableHead>
                  <TableHead className="min-w-[140px] font-bold">Campus / Unit</TableHead>
                  <TableHead className="min-w-[140px] font-bold">Archipelagic Pillar</TableHead>
                  <TableHead className="min-w-[120px] font-bold">SUC KRA</TableHead>
                  <TableHead className="min-w-[120px] font-bold">10-Point Agenda</TableHead>
                  <TableHead className="text-center font-bold">Attainment</TableHead>
                  <TableHead className="text-center font-bold">Status</TableHead>
                  <TableHead className="w-16 text-center font-bold">MOV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopedDeliverables.slice(0, 50).map((item, idx) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="text-center font-mono font-bold text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="align-top font-medium">
                      <div className="font-bold text-xs">{item.title}</div>
                      {item.objective && item.objective !== item.title && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">Obj: {item.objective}</div>
                      )}
                      {item.budget > 0 && (
                        <div className="text-[9.5px] font-mono text-purple-600 mt-0.5">
                          Budget: ₱{item.budget.toLocaleString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="font-semibold text-xs">{item.unitName}</div>
                      <div className="text-[10px] text-muted-foreground">{item.campusName}</div>
                    </TableCell>
                    <TableCell className="align-top">
                      {item.archipelagicPillar ? (
                        <Badge
                          variant="outline"
                          className="text-[9.5px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                        >
                          {item.archipelagicPillar.split(':')[0]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[10px] italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {item.sucLevellingKra ? (
                        <Badge
                          variant="outline"
                          className="text-[9.5px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          {item.sucLevellingKra.split(':')[0]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[10px] italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {item.tenPointAgendas && item.tenPointAgendas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.tenPointAgendas.map((ag, aIdx) => (
                            <Badge
                              key={aIdx}
                              variant="outline"
                              className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                            >
                              {ag.split(':')[0]}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[10px] italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-center font-mono font-bold">{item.attainment}%</TableCell>
                    <TableCell className="align-top text-center">
                      <Badge
                        className={`text-[9.5px] font-bold ${
                          item.status === 'Achieved'
                            ? 'bg-emerald-600 text-white'
                            : item.status === 'Ongoing'
                              ? 'bg-blue-600 text-white'
                              : item.status === 'Delayed'
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-500 text-white'
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top text-center">
                      {item.movLink ? (
                        <a
                          href={item.movLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 inline-flex items-center gap-0.5"
                          title="Open MOV Evidence"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {scopedDeliverables.length > 50 && (
          <CardFooter className="py-2.5 px-4 bg-muted/20 border-t flex justify-between text-xs text-muted-foreground">
            <span>Showing top 50 of {scopedDeliverables.length} deliverables</span>
            <span>Use the search bar above to filter specific records</span>
          </CardFooter>
        )}
      </Card>

      {/* 6. Drilldown Modal */}
      <Dialog open={isDrilldownOpen} onOpenChange={setIsDrilldownOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-bold text-primary">
                {drilldownItem?.type}
              </Badge>
              <span className="text-xs font-mono font-bold text-emerald-600">
                {drilldownItem?.attainment}% Attainment
              </span>
            </div>
            <DialogTitle className="text-base font-bold mt-1">{drilldownItem?.title}</DialogTitle>
            <DialogDescription className="text-xs">{drilldownItem?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Committed Deliverables ({drilldownItem?.deliverables?.length || 0})
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table className="text-xs">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold">Deliverable Task</TableHead>
                    <TableHead className="font-bold">Unit / Campus</TableHead>
                    <TableHead className="text-center font-bold">Attainment</TableHead>
                    <TableHead className="text-center font-bold">Status</TableHead>
                    <TableHead className="w-16 text-center font-bold">Evidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(drilldownItem?.deliverables || []).map((d: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        <div>{d.title}</div>
                        {d.budget > 0 && (
                          <div className="text-[10px] text-purple-600 font-mono">
                            Budget: ₱{d.budget.toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{d.unitName}</div>
                        <div className="text-[10px] text-muted-foreground">{d.campusName}</div>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold">{d.attainment}%</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`text-[9px] font-bold ${
                            d.status === 'Achieved'
                              ? 'bg-emerald-600 text-white'
                              : d.status === 'Ongoing'
                                ? 'bg-blue-600 text-white'
                                : 'bg-amber-500 text-white'
                          }`}
                        >
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {d.movLink ? (
                          <a
                            href={d.movLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VP Strategic Goals Self-Service Management Dialog */}
      <VpStrategicGoalsDialog
        open={isVpGoalsDialogOpen}
        onOpenChange={setIsVpGoalsDialogOpen}
        forcedVpCode={userVpContext.isVpOffice && !isAdmin ? userVpContext.vpCode : undefined}
      />
    </div>
  );
}
