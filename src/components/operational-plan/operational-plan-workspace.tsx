'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from '@/firebase/firestore-wrapper';
import { useYear } from '@/lib/year-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { printQualityObjectivesMonitoringForm } from './print-quality-objectives-monitoring';
import { printOperationalPlanForm } from './print-qao-01-025';
import { getUserVpContext } from '@/lib/utils';
import { VpStrategicGoalsDialog } from './vp-strategic-goals-dialog';
import type {
  OperationalPlanDocument,
  OperationalPlanItem,
  QualityObjectiveItem,
  MonthlyAccomplishmentEntry,
  VpStrategicGoal,
  Unit,
  Campus,
} from '@/lib/types';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Plus,
  Trash2,
  Edit,
  Save,
  Send,
  FileSpreadsheet,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Calendar,
  CalendarCheck2,
  CalendarDays,
  TrendingUp,
  Settings,
  Sparkles,
  Check,
  Target,
  Search,
  Filter,
  Layers,
  FileCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

const MONTH_NAMES = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May.', 'Jun.', 'Jul.', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
const MONTH_ABBRS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export interface OperationalPlanWorkspaceProps {
  onNavigateToWizard?: (step: 1 | 2 | 3 | 4 | 5 | 6, itemId?: string, month?: number) => void;
}

export function OperationalPlanWorkspace({ onNavigateToWizard }: OperationalPlanWorkspaceProps = {}) {
  const firestore = useFirestore();
  const { userProfile, isAdmin, isSupervisor, userRole } = useUser();
  const { toast } = useToast();
  const { selectedYear } = useYear();

  const [selectedCycle, setSelectedCycle] = useState<'first' | 'final'>('first');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);

  // VP Strategic Goals Management Dialog State
  const [isVpGoalsDialogOpen, setIsVpGoalsDialogOpen] = useState(false);

  // Metadata Dialog State
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
  const [metaBaselineData, setMetaBaselineData] = useState('');
  const [metaPolicyIndicator, setMetaPolicyIndicator] = useState('');
  const [metaUnitQualityObjective, setMetaUnitQualityObjective] = useState('');
  const [metaPreparedByName, setMetaPreparedByName] = useState('');
  const [metaPreparedByTitle, setMetaPreparedByTitle] = useState('');
  const [metaReviewedByName, setMetaReviewedByName] = useState('');
  const [metaReviewedByTitle, setMetaReviewedByTitle] = useState('');
  const [metaApprovedByName, setMetaApprovedByName] = useState('');
  const [metaApprovedByTitle, setMetaApprovedByTitle] = useState('');

  // Row Dialog State (Add / Edit Action Plan)
  const [isActionPlanDialogOpen, setIsActionPlanDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QualityObjectiveItem | null>(null);
  const [formObjectiveText, setFormObjectiveText] = useState('');
  const [formTaskText, setFormTaskText] = useState('');
  const [formVpGoalId, setFormVpGoalId] = useState('none');
  const [formInCharge, setFormInCharge] = useState('QA UNIT');
  const [formResourcesNeeded, setFormResourcesNeeded] = useState('Human Resource / Budget / Supplies & Materials');
  const [formBudget, setFormBudget] = useState<number>(0);
  const [formTargetIndicator, setFormTargetIndicator] = useState('');
  const [formStatus, setFormStatus] = useState<'Pending' | 'Ongoing' | 'Achieved' | 'Delayed'>('Ongoing');
  const [formRemarks, setFormRemarks] = useState('');
  const [formActiveMonths, setFormActiveMonths] = useState<number[]>([1, 2, 3]);

  // Monthly Accomplishment Modal State (Actual Month Log)
  const [isMonthlyLogDialogOpen, setIsMonthlyLogDialogOpen] = useState(false);
  const [loggingItem, setLoggingItem] = useState<QualityObjectiveItem | null>(null);
  const [selectedLogMonth, setSelectedLogMonth] = useState<number>(1);
  const [logImplemented, setLogImplemented] = useState<boolean>(true);
  const [logOutput, setLogOutput] = useState<string>('');
  const [logAttainment, setLogAttainment] = useState<number>(100);
  const [logEvidenceLink, setLogEvidenceLink] = useState<string>('');
  const [logNotes, setLogNotes] = useState<string>('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  // Analysis & Problems Encountered State
  const [analysisBelowTarget, setAnalysisBelowTarget] = useState('');
  const [problemsEncountered, setProblemsEncountered] = useState('');
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);

  // Executive Triage, Filter & Header Presentation State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs-update' | 'overdue' | 'this-month' | 'achieved'>(
    'all',
  );
  const [inChargeFilter, setInChargeFilter] = useState<string>('all');
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(false);

  // Fetch Units and Campuses for Superusers
  const allUnitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits } = useCollection<Unit>(allUnitsQuery);

  const allCampusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: allCampuses } = useCollection<Campus>(allCampusesQuery);

  // Set default selected unit
  useEffect(() => {
    if (userProfile?.unitId && !selectedUnitId) {
      setSelectedUnitId(userProfile.unitId);
    } else if (!selectedUnitId && allUnits && allUnits.length > 0) {
      setSelectedUnitId(allUnits[0].id);
    }
  }, [userProfile?.unitId, allUnits, selectedUnitId]);

  const currentUnit = useMemo(() => {
    return allUnits?.find((u) => u.id === selectedUnitId) || null;
  }, [allUnits, selectedUnitId]);

  const currentCampus = useMemo(() => {
    if (!currentUnit?.campusIds || !allCampuses) return 'Main Campus';
    const c = allCampuses.find((camp) => currentUnit.campusIds?.includes(camp.id));
    return c?.name || 'Main Campus';
  }, [currentUnit, allCampuses]);

  // Fetch VP Strategic Goals for the Year
  const goalsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'vpStrategicGoals'), where('year', '==', selectedYear));
  }, [firestore, selectedYear]);
  const { data: vpGoals } = useCollection<VpStrategicGoal>(goalsQuery);

  // Fetch or Create OperationalPlan Document
  const planDocId = useMemo(() => {
    if (!selectedUnitId) return null;
    return `op_${selectedYear}_${selectedCycle}_${selectedUnitId}`;
  }, [selectedYear, selectedCycle, selectedUnitId]);

  const altPlanDocId = useMemo(() => {
    if (!selectedUnitId) return null;
    return `${selectedYear}-${selectedUnitId}-${selectedCycle}`;
  }, [selectedYear, selectedCycle, selectedUnitId]);

  const planRef = useMemoFirebase(() => {
    if (!firestore || !planDocId) return null;
    return doc(firestore, 'operationalPlans', planDocId);
  }, [firestore, planDocId]);
  const { data: primaryPlanDoc } = useDoc<OperationalPlanDocument>(planRef);

  const altPlanRef = useMemoFirebase(() => {
    if (!firestore || !altPlanDocId) return null;
    return doc(firestore, 'operationalPlans', altPlanDocId);
  }, [firestore, altPlanDocId]);
  const { data: altPlanDoc } = useDoc<OperationalPlanDocument>(altPlanRef);

  const planDoc = primaryPlanDoc || altPlanDoc;

  // Sync Analysis & Problems from planDoc
  useEffect(() => {
    if (planDoc) {
      setAnalysisBelowTarget(planDoc.analysisBelowTarget || '');
      setProblemsEncountered(planDoc.problemsEncountered || '');
      setMetaBaselineData(planDoc.baselineData || '2021: 100%');
      setMetaPolicyIndicator(
        planDoc.policyIndicator ||
          'Relevant and quality tertiary education is ensured and inclusive growth and access of deserving but poor students to quality tertiary education are increased',
      );
      setMetaUnitQualityObjective(
        planDoc.unitQualityObjective ||
          'To ensure that institutional systems are fully certified by National and International Assessment Bodies',
      );
      setMetaPreparedByName(
        planDoc.preparedByName || `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim(),
      );
      setMetaPreparedByTitle(planDoc.preparedByTitle || 'Accreditation Head / Unit Head');
      setMetaReviewedByName(planDoc.reviewedByName || '');
      setMetaReviewedByTitle(planDoc.reviewedByTitle || 'Supervising Official');
      setMetaApprovedByName(planDoc.approvedByName || 'DR. MERIAN P. CATAJAY-MANI');
      setMetaApprovedByTitle(planDoc.approvedByTitle || 'University President');
    }
  }, [planDoc, userProfile]);

  // Query Quality Objectives
  const qomQuery = useMemoFirebase(() => {
    if (!firestore || !planDocId) return null;
    const planIds = altPlanDocId ? [planDocId, altPlanDocId] : [planDocId];
    return query(collection(firestore, 'qualityObjectives'), where('planId', 'in', planIds));
  }, [firestore, planDocId, altPlanDocId]);
  const { data: rawQomItems, isLoading: isLoadingQom } = useCollection<QualityObjectiveItem>(qomQuery);

  // Query Operational Plan Items
  const opQuery = useMemoFirebase(() => {
    if (!firestore || !planDocId) return null;
    const planIds = altPlanDocId ? [planDocId, altPlanDocId] : [planDocId];
    return query(collection(firestore, 'operationalPlanItems'), where('planId', 'in', planIds));
  }, [firestore, planDocId, altPlanDocId]);
  const { data: rawOpItems, isLoading: isLoadingOp } = useCollection<OperationalPlanItem>(opQuery);

  // Unified items list merging QualityObjectives and OperationalPlanItems
  const unifiedMonitoringItems = useMemo<QualityObjectiveItem[]>(() => {
    const qoms = rawQomItems ? [...rawQomItems] : [];
    const ops = rawOpItems ? [...rawOpItems] : [];

    const result: QualityObjectiveItem[] = [...qoms];

    ops.forEach((op) => {
      const alreadyLinked = result.some(
        (q) =>
          q.opItemId === op.id ||
          (q.taskText?.trim() === op.tasks?.trim() && q.objectiveText?.trim() === op.objective?.trim()),
      );

      if (!alreadyLinked) {
        // Synthesize QOM entry for this OP item
        let activeM = [1, 2, 3];
        if (op.timelineStart && op.timelineEnd) {
          const s = op.timelineStart.toLowerCase();
          const e = op.timelineEnd.toLowerCase();
          const mList: number[] = [];
          MONTH_ABBRS.forEach((m, idx) => {
            if (s.includes(m.toLowerCase()) || e.includes(m.toLowerCase())) {
              mList.push(idx + 1);
            }
          });
          if (mList.length > 0) activeM = mList;
        }

        result.push({
          id: `syn_${op.id}`,
          planId: planDocId || op.planId,
          unitId: selectedUnitId || op.unitId,
          year: selectedYear,
          cycleId: selectedCycle,
          objectiveText: op.objective || 'Unit Quality Objective',
          taskText: op.tasks || 'Action Plan Task',
          targetIndicator: op.successIndicator || '100% completion',
          activeMonths: activeM,
          inCharge: op.personsResponsible || 'QA UNIT',
          resourcesNeeded:
            op.resources ||
            (op.budget
              ? `₱${op.budget.toLocaleString()} / Materials`
              : 'Human Resource / Budget / Supplies & Materials'),
          responsiblePerson: op.personsResponsible || 'Unit Head',
          status:
            op.status === 'Approved' || op.status === 'Achieved' || op.isCompleted
              ? 'Achieved'
              : op.progressUpdates
                ? 'Ongoing'
                : 'Pending',
          actualOutput: op.progressUpdates || '',
          movLink: op.movDriveLink || '',
          remarks: op.remarks || '',
          attainmentPercentage: op.actualMetricValue ?? op.attainmentPercentage ?? 0,
          opItemId: op.id,
          createdAt: op.createdAt,
        });
      }
    });

    return result;
  }, [rawQomItems, rawOpItems, planDocId, selectedUnitId, selectedYear, selectedCycle]);

  const isApproved = planDoc?.status === 'Approved';
  const isSubmitted = planDoc?.status === 'Submitted';
  const isNeedsRevision = planDoc?.status === 'NeedsRevision';
  const isDraft = !planDoc || planDoc.status === 'Draft' || isNeedsRevision;

  const canApprove = isAdmin || isSupervisor || userRole === 'Vice President' || userRole === 'Campus Director';
  const canEditBaseline = isDraft;
  const canEditAccomplishment = isApproved || isDraft;

  // VP Office Context detection & permissions
  const userVpContext = useMemo(() => getUserVpContext(userProfile, allUnits), [userProfile, allUnits]);
  const canManageVpGoals = isAdmin || isSupervisor || userVpContext.isVpOffice;

  // Monthly Data Calculations for Data Information Table & Illustration Chart
  const monthlyStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      let planCount = 0;
      let actualCount = 0;

      unifiedMonitoringItems.forEach((item) => {
        const isPlanned = item.activeMonths?.includes(monthNum);
        const isActual =
          Boolean(item.monthlyAccomplishments?.[monthNum]?.implemented) ||
          Boolean(item.actualMonths?.includes(monthNum));

        if (isPlanned) planCount++;
        if (isActual) actualCount++;
      });

      const percent = planCount > 0 ? Math.round((actualCount / planCount) * 100) : actualCount > 0 ? 100 : 0;

      return {
        monthNum,
        name: MONTH_ABBRS[i],
        fullName: MONTH_NAMES[i],
        plan: planCount,
        actual: actualCount,
        accomplishment: percent,
      };
    });
  }, [unifiedMonitoringItems]);

  const totalPlan = useMemo(() => monthlyStats.reduce((acc, curr) => acc + curr.plan, 0), [monthlyStats]);
  const totalActual = useMemo(() => monthlyStats.reduce((acc, curr) => acc + curr.actual, 0), [monthlyStats]);
  const totalAccomplishment = useMemo(() => {
    if (totalPlan > 0) return Math.round((totalActual / totalPlan) * 100);
    return totalActual > 0 ? 100 : 0;
  }, [totalPlan, totalActual]);

  const chartData = useMemo(() => {
    return [
      ...monthlyStats.map((s) => ({
        name: s.name,
        plan: s.plan,
        actual: s.actual,
        accomplishment: s.accomplishment,
      })),
      {
        name: 'TOTAL',
        plan: totalPlan,
        actual: totalActual,
        accomplishment: totalAccomplishment,
      },
    ];
  }, [monthlyStats, totalPlan, totalActual, totalAccomplishment]);

  const currentMonthNum = useMemo(() => new Date().getMonth() + 1, []);

  // Executive High-Level Performance Metrics
  const executiveMetrics = useMemo(() => {
    const totalItems = unifiedMonitoringItems.length;
    let achievedCount = 0;
    let overdueCount = 0;
    let thisMonthPlannedCount = 0;
    let thisMonthConductedCount = 0;
    let needsUpdateCount = 0;
    let movCount = 0;

    unifiedMonitoringItems.forEach((item) => {
      const activeMonths = item.activeMonths || [];
      const actualMonths =
        item.actualMonths ||
        Object.keys(item.monthlyAccomplishments || {})
          .filter((m) => item.monthlyAccomplishments?.[Number(m)]?.implemented)
          .map(Number);

      const plannedCount = activeMonths.length;
      const conductedPlannedCount = activeMonths.filter((m) => actualMonths.includes(m)).length;
      const isAchieved =
        item.status === 'Achieved' || (plannedCount > 0 && conductedPlannedCount === plannedCount && plannedCount > 0);
      const isOverdue = activeMonths.some((m) => m < currentMonthNum && !actualMonths.includes(m)) && !isAchieved;
      const isThisMonth = activeMonths.includes(currentMonthNum);
      const isThisMonthConducted = actualMonths.includes(currentMonthNum);

      const accomplishmentEntries = Object.entries(item.monthlyAccomplishments || {}).filter(
        ([_, val]) => val && (val.implemented || val.notes || val.output || val.attainment !== undefined),
      );
      const hasUpdate =
        accomplishmentEntries.length > 0 ||
        Boolean(item.actualOutput && item.actualOutput.trim()) ||
        (item.attainmentPercentage !== undefined && item.attainmentPercentage > 0) ||
        Boolean(item.remarks && item.remarks.trim());

      const hasMov =
        Boolean(item.movLink && item.movLink.trim()) ||
        Object.values(item.monthlyAccomplishments || {}).some((a) => Boolean(a?.evidenceLink));

      if (isAchieved) achievedCount++;
      if (isOverdue) overdueCount++;
      if (isThisMonth) {
        thisMonthPlannedCount++;
        if (isThisMonthConducted) thisMonthConductedCount++;
      }
      if (hasMov) movCount++;

      if (!isAchieved && (isOverdue || (isThisMonth && !isThisMonthConducted) || !hasUpdate)) {
        needsUpdateCount++;
      }
    });

    const ongoingCount = Math.max(0, totalItems - achievedCount);
    const overallProgressPercent = totalItems > 0 ? Math.round((achievedCount / totalItems) * 100) : 0;

    return {
      totalItems,
      achievedCount,
      ongoingCount,
      overdueCount,
      thisMonthPlannedCount,
      thisMonthConductedCount,
      needsUpdateCount,
      movCount,
      overallProgressPercent,
    };
  }, [unifiedMonitoringItems, currentMonthNum]);

  // Distinct in-charge personnel for filter dropdown
  const distinctInChargeList = useMemo(() => {
    const set = new Set<string>();
    unifiedMonitoringItems.forEach((i) => {
      const name = (i.inCharge || i.responsiblePerson || '').trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [unifiedMonitoringItems]);

  // Filtered monitoring items according to active triage filters & search
  const filteredMonitoringItems = useMemo(() => {
    return unifiedMonitoringItems.filter((item) => {
      const activeMonths = item.activeMonths || [];
      const actualMonths =
        item.actualMonths ||
        Object.keys(item.monthlyAccomplishments || {})
          .filter((m) => item.monthlyAccomplishments?.[Number(m)]?.implemented)
          .map(Number);

      const plannedCount = activeMonths.length;
      const conductedPlannedCount = activeMonths.filter((m) => actualMonths.includes(m)).length;
      const isAchieved =
        item.status === 'Achieved' || (plannedCount > 0 && conductedPlannedCount === plannedCount && plannedCount > 0);
      const isOverdue = activeMonths.some((m) => m < currentMonthNum && !actualMonths.includes(m)) && !isAchieved;
      const isThisMonth = activeMonths.includes(currentMonthNum);
      const isThisMonthConducted = actualMonths.includes(currentMonthNum);

      const accomplishmentEntries = Object.entries(item.monthlyAccomplishments || {}).filter(
        ([_, val]) => val && (val.implemented || val.notes || val.output || val.attainment !== undefined),
      );
      const hasUpdate =
        accomplishmentEntries.length > 0 ||
        Boolean(item.actualOutput && item.actualOutput.trim()) ||
        (item.attainmentPercentage !== undefined && item.attainmentPercentage > 0) ||
        Boolean(item.remarks && item.remarks.trim());

      const needsUpdate = !isAchieved && (isOverdue || (isThisMonth && !isThisMonthConducted) || !hasUpdate);

      // Status Filter
      if (statusFilter === 'achieved' && !isAchieved) return false;
      if (statusFilter === 'overdue' && !isOverdue) return false;
      if (statusFilter === 'this-month' && !isThisMonth) return false;
      if (statusFilter === 'needs-update' && !needsUpdate) return false;

      // In-charge filter
      if (inChargeFilter !== 'all') {
        const itemPerson = (item.inCharge || item.responsiblePerson || '').toLowerCase();
        if (!itemPerson.includes(inChargeFilter.toLowerCase())) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textToMatch =
          `${item.taskText || ''} ${item.objectiveText || ''} ${item.targetIndicator || ''} ${item.inCharge || ''} ${item.responsiblePerson || ''} ${item.actualOutput || ''} ${item.remarks || ''}`.toLowerCase();
        if (!textToMatch.includes(q)) return false;
      }

      return true;
    });
  }, [unifiedMonitoringItems, statusFilter, inChargeFilter, searchQuery, currentMonthNum]);

  // Ensure parent OperationalPlan document exists
  const ensureParentPlanDoc = async () => {
    if (!firestore || !planDocId || !selectedUnitId || !userProfile) return;
    if (!planDoc) {
      await setDoc(doc(firestore, 'operationalPlans', planDocId), {
        id: planDocId,
        unitId: selectedUnitId,
        unitName: currentUnit?.name || userProfile.unitName || 'Unit',
        campusId: currentUnit?.campusIds?.[0] || userProfile.campusId || 'Main',
        year: selectedYear,
        cycleId: selectedCycle,
        status: 'Draft',
        opControlNumber: `QAO-01-025-${selectedYear}-${selectedUnitId.slice(0, 5).toUpperCase()}`,
        baselineData: metaBaselineData || '2021: 100%',
        policyIndicator: metaPolicyIndicator,
        unitQualityObjective: metaUnitQualityObjective,
        preparedById: userProfile.id,
        preparedByName: metaPreparedByName || `${userProfile.firstName} ${userProfile.lastName}`,
        preparedByTitle: metaPreparedByTitle,
        reviewedByName: metaReviewedByName,
        reviewedByTitle: metaReviewedByTitle,
        approvedByName: metaApprovedByName,
        approvedByTitle: metaApprovedByTitle,
        analysisBelowTarget: analysisBelowTarget || '',
        problemsEncountered: problemsEncountered || '',
        preparedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  // Open Add / Edit Action Plan Dialog
  const handleOpenActionPlanDialog = (item?: QualityObjectiveItem) => {
    if (item) {
      setEditingItem(item);
      setFormObjectiveText(item.objectiveText || '');
      setFormTaskText(item.taskText || '');
      setFormInCharge(item.inCharge || item.responsiblePerson || 'QA UNIT');
      setFormResourcesNeeded(item.resourcesNeeded || 'Human Resource / Budget / Supplies & Materials');
      setFormBudget(0);
      setFormTargetIndicator(item.targetIndicator || '');
      setFormStatus(item.status || 'Ongoing');
      setFormRemarks(item.remarks || '');
      setFormActiveMonths(item.activeMonths || [1, 2, 3]);
      setFormVpGoalId('none');
    } else {
      setEditingItem(null);
      setFormObjectiveText(metaUnitQualityObjective || 'To ensure institutional compliance and quality objectives');
      setFormTaskText('');
      setFormInCharge(currentUnit?.name || 'QA UNIT');
      setFormResourcesNeeded('Human Resource / Budget / Supplies & Materials');
      setFormBudget(0);
      setFormTargetIndicator('100% implementation of planned activities');
      setFormStatus('Ongoing');
      setFormRemarks('');
      setFormActiveMonths([new Date().getMonth() + 1]);
      setFormVpGoalId('none');
    }
    setIsActionPlanDialogOpen(true);
  };

  // Save Action Plan (Writes to qualityObjectives AND operationalPlanItems)
  const handleSaveActionPlan = async () => {
    if (!firestore || !planDocId || !selectedUnitId || !userProfile) return;
    if (!formTaskText.trim()) {
      toast({
        title: 'Action Plan Required',
        description: 'Please enter the Action Plan / Program title.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await ensureParentPlanDoc();

      const vpGoal = vpGoals?.find((g) => g.id === formVpGoalId);
      const startMonthName = formActiveMonths.length > 0 ? MONTH_NAMES[Math.min(...formActiveMonths) - 1] : 'Jan.';
      const endMonthName = formActiveMonths.length > 0 ? MONTH_NAMES[Math.max(...formActiveMonths) - 1] : 'Dec.';

      if (editingItem && !editingItem.id.startsWith('syn_')) {
        // Update existing QualityObjective
        await updateDoc(doc(firestore, 'qualityObjectives', editingItem.id), {
          objectiveText: formObjectiveText.trim(),
          taskText: formTaskText.trim(),
          targetIndicator: formTargetIndicator.trim(),
          inCharge: formInCharge.trim(),
          resourcesNeeded: formResourcesNeeded.trim(),
          responsiblePerson: formInCharge.trim(),
          activeMonths: formActiveMonths,
          status: formStatus,
          remarks: formRemarks.trim(),
          updatedAt: serverTimestamp(),
        });

        // Sync with Operational Plan Item
        if (editingItem.opItemId) {
          await updateDoc(doc(firestore, 'operationalPlanItems', editingItem.opItemId), {
            objective: formObjectiveText.trim(),
            tasks: formTaskText.trim(),
            timelineStart: `${startMonthName} ${selectedYear}`,
            timelineEnd: `${endMonthName} ${selectedYear}`,
            personsResponsible: formInCharge.trim(),
            resources: formResourcesNeeded.trim(),
            budget: Number(formBudget) || 0,
            successIndicator: formTargetIndicator.trim(),
            remarks: formRemarks.trim(),
            status: formStatus,
            updatedAt: serverTimestamp(),
          });
        }
        toast({ title: 'Monitoring Updated', description: 'Action Plan and Operational Plan synchronized.' });
      } else {
        // Create new item in both collections
        const newOpRef = await addDoc(collection(firestore, 'operationalPlanItems'), {
          planId: planDocId,
          unitId: selectedUnitId,
          year: selectedYear,
          sortOrder: unifiedMonitoringItems.length + 1,
          objective: formObjectiveText.trim(),
          vpObjectiveId: formVpGoalId === 'none' ? '' : formVpGoalId,
          vpObjectiveTitle: vpGoal?.title || '',
          tasks: formTaskText.trim(),
          timelineStart: `${startMonthName} ${selectedYear}`,
          timelineEnd: `${endMonthName} ${selectedYear}`,
          personsResponsible: formInCharge.trim(),
          resources: formResourcesNeeded.trim(),
          budget: Number(formBudget) || 0,
          successIndicator: formTargetIndicator.trim(),
          targetMetricValue: 100,
          targetMetricUnit: '%',
          isBaselineLocked: false,
          progressUpdates: '',
          remarks: formRemarks.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await addDoc(collection(firestore, 'qualityObjectives'), {
          planId: planDocId,
          unitId: selectedUnitId,
          year: selectedYear,
          cycleId: selectedCycle,
          objectiveText: formObjectiveText.trim(),
          taskText: formTaskText.trim(),
          targetIndicator: formTargetIndicator.trim(),
          activeMonths: formActiveMonths,
          inCharge: formInCharge.trim(),
          resourcesNeeded: formResourcesNeeded.trim(),
          responsiblePerson: formInCharge.trim(),
          status: formStatus,
          remarks: formRemarks.trim(),
          opItemId: newOpRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        toast({
          title: 'Action Plan Created',
          description: 'Item added to Quality Objectives Monitoring and Operational Plan.',
        });
      }

      setIsActionPlanDialogOpen(false);
    } catch (e: any) {
      console.error('Error saving action plan:', e);
      toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
    }
  };

  // Toggle Planned Month (Red Bar)
  const handleTogglePlanMonth = async (item: QualityObjectiveItem, month: number) => {
    if (!firestore || !planDocId) return;
    if (isApproved && !canApprove) {
      toast({
        title: 'Plan Locked',
        description: 'Baseline schedule is approved. Request revision from VP to modify planned months.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await ensureParentPlanDoc();
      const currentMonths = item.activeMonths || [];
      const newMonths = currentMonths.includes(month)
        ? currentMonths.filter((m) => m !== month)
        : [...currentMonths, month].sort((a, b) => a - b);

      let targetQomId = item.id;
      if (item.id.startsWith('syn_')) {
        const addedDoc = await addDoc(collection(firestore, 'qualityObjectives'), {
          planId: planDocId,
          unitId: selectedUnitId,
          year: selectedYear,
          cycleId: selectedCycle,
          objectiveText: item.objectiveText,
          taskText: item.taskText,
          targetIndicator: item.targetIndicator,
          activeMonths: newMonths,
          inCharge: item.inCharge || item.responsiblePerson || 'QA UNIT',
          resourcesNeeded: item.resourcesNeeded || 'Human Resource / Budget / Supplies & Materials',
          responsiblePerson: item.responsiblePerson || 'Unit Head',
          status: item.status || 'Ongoing',
          opItemId: item.opItemId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        targetQomId = addedDoc.id;
      } else {
        await updateDoc(doc(firestore, 'qualityObjectives', targetQomId), {
          activeMonths: newMonths,
          updatedAt: serverTimestamp(),
        });
      }

      // Sync timeline in Operational Plan Item
      if (item.opItemId && newMonths.length > 0) {
        const sM = MONTH_NAMES[Math.min(...newMonths) - 1];
        const eM = MONTH_NAMES[Math.max(...newMonths) - 1];
        await updateDoc(doc(firestore, 'operationalPlanItems', item.opItemId), {
          timelineStart: `${sM} ${selectedYear}`,
          timelineEnd: `${eM} ${selectedYear}`,
          updatedAt: serverTimestamp(),
        });
      }

      toast({
        title: 'Planned Schedule Updated',
        description: `${item.taskText}: ${newMonths.includes(month) ? 'Added' : 'Removed'} ${MONTH_NAMES[month - 1]} from plan schedule.`,
      });
    } catch (e: any) {
      console.error('Error toggling plan month:', e);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // Open Log Accomplishment Modal for Actual Month (Blue Bar)
  const handleOpenMonthlyLogDialog = (item: QualityObjectiveItem, month: number) => {
    setLoggingItem(item);
    setSelectedLogMonth(month);

    const existingAcc = item.monthlyAccomplishments?.[month];
    if (existingAcc) {
      setLogImplemented(existingAcc.implemented ?? true);
      setLogOutput(existingAcc.output || '');
      setLogAttainment(existingAcc.attainment ?? 100);
      setLogEvidenceLink(existingAcc.evidenceLink || '');
      setLogNotes(existingAcc.notes || '');
    } else {
      const isConducted = item.actualMonths?.includes(month);
      setLogImplemented(isConducted ? true : true);
      setLogOutput(item.actualOutput || '');
      setLogAttainment(item.attainmentPercentage || 100);
      setLogEvidenceLink(item.movLink || '');
      setLogNotes(item.remarks || '');
    }

    setIsMonthlyLogDialogOpen(true);
  };

  // Save Monthly Accomplishment Entry
  const handleSaveMonthlyAccomplishment = async () => {
    if (!firestore || !loggingItem || !planDocId || !userProfile) return;
    setIsSavingLog(true);

    try {
      await ensureParentPlanDoc();

      const currentAcc = loggingItem.monthlyAccomplishments || {};
      const newAcc: Record<number, MonthlyAccomplishmentEntry> = {
        ...currentAcc,
        [selectedLogMonth]: {
          implemented: logImplemented,
          completed: logAttainment >= 100,
          output: logOutput.trim(),
          attainment: Number(logAttainment),
          evidenceLink: logEvidenceLink.trim(),
          notes: logNotes.trim(),
          reportedBy: `${userProfile.firstName} ${userProfile.lastName} (${userProfile.email})`,
          date: new Date().toISOString(),
        },
      };

      // Determine all actual conducted months
      const actualMonths = Object.keys(newAcc)
        .filter((m) => newAcc[Number(m)]?.implemented)
        .map(Number)
        .sort((a, b) => a - b);

      // Overall attainment is highest reported attainment or average of conducted months
      const reportedAttainments = Object.values(newAcc)
        .map((e) => e.attainment ?? 0)
        .filter((v) => v > 0);
      const overallAttainment = reportedAttainments.length > 0 ? Math.max(...reportedAttainments) : logAttainment;
      const computedStatus = overallAttainment >= 100 ? 'Achieved' : overallAttainment > 0 ? 'Ongoing' : 'Pending';

      let targetQomId = loggingItem.id;
      if (loggingItem.id.startsWith('syn_')) {
        const addedDoc = await addDoc(collection(firestore, 'qualityObjectives'), {
          planId: planDocId,
          unitId: selectedUnitId,
          year: selectedYear,
          cycleId: selectedCycle,
          objectiveText: loggingItem.objectiveText,
          taskText: loggingItem.taskText,
          targetIndicator: loggingItem.targetIndicator,
          activeMonths: loggingItem.activeMonths || [selectedLogMonth],
          actualMonths,
          monthlyAccomplishments: newAcc,
          inCharge: loggingItem.inCharge || loggingItem.responsiblePerson || 'QA UNIT',
          resourcesNeeded: loggingItem.resourcesNeeded || 'Human Resource / Budget / Supplies & Materials',
          responsiblePerson: loggingItem.responsiblePerson || 'Unit Head',
          status: computedStatus,
          actualOutput: logOutput.trim() || loggingItem.actualOutput || '',
          movLink: logEvidenceLink.trim() || loggingItem.movLink || '',
          remarks: logNotes.trim() || loggingItem.remarks || '',
          attainmentPercentage: overallAttainment,
          opItemId: loggingItem.opItemId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        targetQomId = addedDoc.id;
      } else {
        await updateDoc(doc(firestore, 'qualityObjectives', targetQomId), {
          monthlyAccomplishments: newAcc,
          actualMonths,
          attainmentPercentage: overallAttainment,
          status: computedStatus,
          actualOutput: logOutput.trim() || loggingItem.actualOutput || '',
          movLink: logEvidenceLink.trim() || loggingItem.movLink || '',
          remarks: logNotes.trim() || loggingItem.remarks || '',
          updatedAt: serverTimestamp(),
        });
      }

      // Synchronize back to Operational Plan Item
      if (loggingItem.opItemId) {
        await updateDoc(doc(firestore, 'operationalPlanItems', loggingItem.opItemId), {
          progressUpdates: logOutput.trim() || `Conducted in ${MONTH_NAMES[selectedLogMonth - 1]}: ${logNotes.trim()}`,
          actualMetricValue: overallAttainment,
          attainmentPercentage: overallAttainment,
          movDriveLink: logEvidenceLink.trim() || loggingItem.movLink || '',
          remarks: logNotes.trim() || loggingItem.remarks || '',
          isCompleted: overallAttainment >= 100,
          status: computedStatus,
          updatedAt: serverTimestamp(),
        });
      }

      // Update parent operational plan document timestamp
      await updateDoc(doc(firestore, 'operationalPlans', planDocId), {
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Monthly Accomplishment Saved',
        description: `Recorded actual accomplishment for ${MONTH_NAMES[selectedLogMonth - 1]}. Operational Plan synchronized.`,
      });
      setIsMonthlyLogDialogOpen(false);
    } catch (e: any) {
      console.error('Error saving monthly accomplishment:', e);
      toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsSavingLog(false);
    }
  };

  // Delete Action Plan
  const handleDeleteActionPlan = async (item: QualityObjectiveItem) => {
    if (!firestore) return;
    if (isApproved && !canApprove) {
      toast({
        title: 'Document is Locked',
        description: 'Approved quality objectives cannot be removed without VP revision authorization.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (!item.id.startsWith('syn_')) {
        await deleteDoc(doc(firestore, 'qualityObjectives', item.id));
      }
      if (item.opItemId) {
        await deleteDoc(doc(firestore, 'operationalPlanItems', item.opItemId));
      }
      toast({
        title: 'Item Removed',
        description: 'Action plan removed from Quality Objectives and Operational Plan.',
      });
    } catch (e: any) {
      console.error('Error deleting action plan:', e);
      toast({ title: 'Delete Failed', description: e.message, variant: 'destructive' });
    }
  };

  // Save Form Metadata (Baseline Data, Policy Indicator, Unit Quality Objective, Signatories)
  const handleSaveMetadata = async () => {
    if (!firestore || !planDocId) return;
    try {
      await ensureParentPlanDoc();
      await updateDoc(doc(firestore, 'operationalPlans', planDocId), {
        baselineData: metaBaselineData.trim(),
        policyIndicator: metaPolicyIndicator.trim(),
        unitQualityObjective: metaUnitQualityObjective.trim(),
        preparedByName: metaPreparedByName.trim(),
        preparedByTitle: metaPreparedByTitle.trim(),
        reviewedByName: metaReviewedByName.trim(),
        reviewedByTitle: metaReviewedByTitle.trim(),
        approvedByName: metaApprovedByName.trim(),
        approvedByTitle: metaApprovedByTitle.trim(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: 'Metadata Saved', description: 'Form header, baseline data, and signatories updated.' });
      setIsMetadataDialogOpen(false);
    } catch (e: any) {
      console.error('Error saving metadata:', e);
      toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
    }
  };

  // Save Narrative Analysis & Problems Encountered
  const handleSaveAnalysis = async () => {
    if (!firestore || !planDocId) return;
    setIsSavingAnalysis(true);
    try {
      await ensureParentPlanDoc();
      await updateDoc(doc(firestore, 'operationalPlans', planDocId), {
        analysisBelowTarget: analysisBelowTarget.trim(),
        problemsEncountered: problemsEncountered.trim(),
        updatedAt: serverTimestamp(),
      });
      toast({
        title: 'Analysis Saved',
        description: 'Performance rating analysis and problems encountered have been recorded.',
      });
    } catch (e: any) {
      console.error('Error saving analysis:', e);
      toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsSavingAnalysis(false);
    }
  };

  // Workflow Actions (Submit, Approve, Reject)
  const handleSubmitPlan = async () => {
    if (!firestore || !planDocId) return;
    setIsSubmitting(true);
    try {
      await ensureParentPlanDoc();
      await updateDoc(doc(firestore, 'operationalPlans', planDocId), {
        status: 'Submitted',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({
        title: 'Submitted to VP',
        description: 'Your Quality Objectives Monitoring is now queued for supervisor review.',
      });
    } catch (e: any) {
      toast({ title: 'Submission Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!firestore || !planDocId) return;
    setIsApproving(true);
    try {
      await ensureParentPlanDoc();
      await updateDoc(doc(firestore, 'operationalPlans', planDocId), {
        status: 'Approved',
        approvedById: userProfile?.id,
        approvedByName: `${userProfile?.firstName} ${userProfile?.lastName}`,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Approved & Locked', description: 'Quality Objectives Monitoring baseline locked.' });
    } catch (e: any) {
      toast({ title: 'Approval Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectPlan = async () => {
    if (!firestore || !planDocId) return;
    setIsRejecting(true);
    try {
      await ensureParentPlanDoc();
      await updateDoc(doc(firestore, 'operationalPlans', planDocId), {
        status: 'NeedsRevision',
        feedbackNotes: feedbackNote.trim(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Revision Requested', description: 'Feedback returned to unit head.' });
      setIsFeedbackDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Action Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsRejecting(false);
    }
  };

  // Print Official Monitoring Form (Landscape matching uploaded image)
  const handlePrintMonitoring = () => {
    printQualityObjectivesMonitoringForm(
      planDoc || {
        unitName: currentUnit?.name || userProfile?.unitName,
        year: selectedYear,
        baselineData: metaBaselineData,
        policyIndicator: metaPolicyIndicator,
        unitQualityObjective: metaUnitQualityObjective,
        preparedByName: metaPreparedByName,
        preparedByTitle: metaPreparedByTitle,
        reviewedByName: metaReviewedByName,
        reviewedByTitle: metaReviewedByTitle,
        approvedByName: metaApprovedByName,
        approvedByTitle: metaApprovedByTitle,
        analysisBelowTarget,
        problemsEncountered,
      },
      unifiedMonitoringItems,
      currentCampus,
    );
  };

  // Print Operational Plan Form (QAO-01-025)
  const handlePrintOpPlan = () => {
    if (!planDoc) {
      toast({
        title: 'No Plan Found',
        description: 'Please save at least one task before printing Form QAO-01-025.',
        variant: 'destructive',
      });
      return;
    }
    printOperationalPlanForm(planDoc, rawOpItems || [], currentCampus);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar & Controls */}
      <Card className="shadow-xs border-2">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-xl font-black uppercase tracking-tight">
                  QUALITY OBJECTIVES MONITORING
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Official University ISO 9001:2015 &amp; ISO 21001:2018 matrix for tracking monthly action plan
                implementation, actual accomplishments, and performance rating.
              </CardDescription>
            </div>

            {/* Print and Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintMonitoring}
                className="font-bold text-xs gap-1.5 shadow-xs border-blue-600/30 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                <Printer className="h-4 w-4 text-blue-600" /> Print Quality Objectives Monitoring
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintOpPlan}
                className="font-bold text-xs gap-1.5 shadow-xs"
              >
                <Printer className="h-4 w-4 text-muted-foreground" /> Print Form QAO-01-025
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMetadataDialogOpen(true)}
                className="font-bold text-xs gap-1.5 shadow-xs"
              >
                <Settings className="h-3.5 w-3.5" /> Form Metadata
              </Button>

              {canManageVpGoals && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsVpGoalsDialogOpen(true)}
                  className="font-bold text-xs gap-1.5 shadow-xs border-indigo-200 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  <Target className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  {userVpContext.isVpOffice ? `Manage ${userVpContext.vpCode || 'VP'} Goals` : 'VP Strategic Goals'}
                </Button>
              )}

              {isDraft && (
                <Button
                  size="sm"
                  onClick={handleSubmitPlan}
                  disabled={isSubmitting || unifiedMonitoringItems.length === 0}
                  className="font-bold text-xs gap-1.5 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit to VP
                </Button>
              )}

              {isSubmitted && canApprove && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setIsFeedbackDialogOpen(true)}
                    disabled={isRejecting}
                    className="text-xs font-bold"
                  >
                    Request Revision
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApprovePlan}
                    disabled={isApproving}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                  >
                    {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    Approve &amp; Lock Baseline
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40 border">
            {/* Unit Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Campus / Unit</Label>
              {isAdmin || isSupervisor ? (
                <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                  <SelectTrigger className="bg-background text-xs font-semibold">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {allUnits?.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-xs font-bold py-2 px-3 bg-background border rounded-md">
                  {currentUnit?.name || userProfile?.unitName || 'Office'}
                </div>
              )}
            </div>

            {/* Cycle Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Monitoring Cycle</Label>
              <Select value={selectedCycle} onValueChange={(val: any) => setSelectedCycle(val)}>
                <SelectTrigger className="bg-background text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first" className="text-xs font-semibold">
                    First Cycle (Baseline Planning)
                  </SelectItem>
                  <SelectItem value="final" className="text-xs font-semibold">
                    Final Cycle (Accomplishment &amp; Learnings)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fiscal Year Display */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Fiscal Year</Label>
              <div className="text-xs font-mono font-bold py-2 px-3 bg-background border rounded-md">
                AY {selectedYear}
              </div>
            </div>

            {/* Document Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Document Status</Label>
              <div>
                {isApproved ? (
                  <Badge className="bg-emerald-600 text-white font-bold gap-1 text-[11px] py-1 px-2.5">
                    <Lock className="h-3 w-3" /> Approved &amp; Locked
                  </Badge>
                ) : isSubmitted ? (
                  <Badge className="bg-amber-500 text-white font-bold gap-1 text-[11px] py-1 px-2.5">
                    <Clock className="h-3 w-3" /> Submitted (Under Review)
                  </Badge>
                ) : isNeedsRevision ? (
                  <Badge variant="destructive" className="font-bold gap-1 text-[11px] py-1 px-2.5">
                    <AlertCircle className="h-3 w-3" /> Needs Revision
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-blue-600/50 text-blue-600 font-bold gap-1 text-[11px] py-1 px-2.5"
                  >
                    <Unlock className="h-3 w-3" /> Draft (Editable)
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Executive Performance & Quality Objectives Health Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overall Attainment */}
        <Card className="border shadow-xs bg-linear-to-br from-card to-muted/20">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Attainment</span>
            <div
              className={`p-1.5 rounded-md ${
                totalAccomplishment >= 100
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : totalAccomplishment >= 75
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : totalAccomplishment >= 50
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black tracking-tight">{totalAccomplishment}%</div>
              <Badge
                className={`text-[10px] font-bold ${
                  totalAccomplishment >= 100
                    ? 'bg-emerald-600 text-white'
                    : totalAccomplishment >= 75
                      ? 'bg-blue-600 text-white'
                      : totalAccomplishment >= 50
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-600 text-white'
                }`}
              >
                {totalAccomplishment >= 100
                  ? 'Exceeding Target'
                  : totalAccomplishment >= 75
                    ? 'On Track'
                    : totalAccomplishment >= 50
                      ? 'Moderate'
                      : 'Action Needed'}
              </Badge>
            </div>
            <Progress value={Math.min(totalAccomplishment, 100)} className="h-1.5" />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>
                {totalActual} of {totalPlan} month activities
              </span>
              <span className="font-semibold">{metaBaselineData || 'Target: 100%'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Action Plans Pipeline */}
        <Card className="border shadow-xs bg-linear-to-br from-card to-muted/20">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Action Plans Pipeline
            </span>
            <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black tracking-tight">{executiveMetrics.totalItems}</div>
              <span className="text-xs text-muted-foreground font-medium">Deliverables</span>
            </div>
            <div className="grid grid-cols-3 gap-1 pt-1 text-center">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-md py-1 px-1">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {executiveMetrics.achievedCount}
                </div>
                <div className="text-[9px] font-medium text-emerald-600/80">Done</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-md py-1 px-1">
                <div className="text-xs font-bold text-blue-700 dark:text-blue-400">
                  {executiveMetrics.ongoingCount}
                </div>
                <div className="text-[9px] font-medium text-blue-600/80">On-Going</div>
              </div>
              <div
                className={`border rounded-md py-1 px-1 ${
                  executiveMetrics.overdueCount > 0
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40'
                    : 'bg-muted/40 border-muted'
                }`}
              >
                <div
                  className={`text-xs font-bold ${executiveMetrics.overdueCount > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-muted-foreground'}`}
                >
                  {executiveMetrics.overdueCount}
                </div>
                <div
                  className={`text-[9px] font-medium ${executiveMetrics.overdueCount > 0 ? 'text-rose-600/80 font-bold' : 'text-muted-foreground'}`}
                >
                  Overdue
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Current Month Milestone */}
        <Card className="border shadow-xs bg-linear-to-br from-card to-muted/20">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {MONTH_NAMES[currentMonthNum - 1]} Milestones
            </span>
            <div className="p-1.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <CalendarDays className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black tracking-tight">
                {executiveMetrics.thisMonthConductedCount} / {executiveMetrics.thisMonthPlannedCount}
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  executiveMetrics.thisMonthPlannedCount === 0
                    ? 'text-muted-foreground'
                    : executiveMetrics.thisMonthConductedCount >= executiveMetrics.thisMonthPlannedCount
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-blue-50 text-blue-700 border-blue-300'
                }`}
              >
                {executiveMetrics.thisMonthPlannedCount === 0
                  ? 'No Tasks Sched.'
                  : executiveMetrics.thisMonthConductedCount >= executiveMetrics.thisMonthPlannedCount
                    ? 'Month Complete'
                    : 'In Progress'}
              </Badge>
            </div>
            <Progress
              value={
                executiveMetrics.thisMonthPlannedCount > 0
                  ? Math.round(
                      (executiveMetrics.thisMonthConductedCount / executiveMetrics.thisMonthPlannedCount) * 100,
                    )
                  : 100
              }
              className="h-1.5"
            />
            <div className="text-[11px] text-muted-foreground pt-0.5 truncate">
              {executiveMetrics.thisMonthPlannedCount > executiveMetrics.thisMonthConductedCount
                ? `${executiveMetrics.thisMonthPlannedCount - executiveMetrics.thisMonthConductedCount} scheduled tasks pending accomplishment`
                : 'All scheduled activities for this month logged'}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Audit & Evidence Health */}
        <Card className="border shadow-xs bg-linear-to-br from-card to-muted/20">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Audit &amp; MOV Health
            </span>
            <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <FileCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black tracking-tight">{executiveMetrics.movCount}</div>
              <span className="text-xs text-muted-foreground font-medium">Verified MOVs</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted-foreground">Needs Update:</span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  executiveMetrics.needsUpdateCount > 0
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'text-muted-foreground'
                }`}
              >
                {executiveMetrics.needsUpdateCount} {executiveMetrics.needsUpdateCount === 1 ? 'item' : 'items'}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">ISO 9001:2015 Clause 9.1 Readiness</div>
          </CardContent>
        </Card>
      </div>

      {/* 2b. Feedback Notification if Revision Requested */}
      {isNeedsRevision && planDoc?.feedbackNotes && (
        <Alert variant="destructive" className="border-rose-400 bg-rose-50 dark:bg-rose-950/20">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-bold">Revision Requested by Supervising Office</AlertTitle>
          <AlertDescription className="text-xs mt-1">{planDoc.feedbackNotes}</AlertDescription>
        </Alert>
      )}

      {/* 3. Official Form Header Table (Collapsible) */}
      <Card className="border shadow-xs overflow-hidden">
        <div
          onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
          className="border-b bg-amber-500/10 hover:bg-amber-500/15 transition-colors px-4 py-2.5 flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
              University Quality Objectives Header &amp; Signatories
            </span>
            <Badge
              variant="outline"
              className="border-amber-500/40 text-amber-800 dark:text-amber-300 text-[10px] font-semibold py-0 px-2"
            >
              {currentUnit?.name || userProfile?.unitName || 'Quality Assurance Office'} • AY {selectedYear}
            </Badge>
            {!isHeaderExpanded && metaUnitQualityObjective && (
              <span className="text-[11px] text-muted-foreground hidden xl:inline truncate max-w-md">
                — {metaUnitQualityObjective}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setIsMetadataDialogOpen(true);
              }}
              className="h-6 text-[11px] font-bold text-amber-800 dark:text-amber-300 gap-1 hover:bg-amber-500/20"
            >
              <Edit className="h-3 w-3" /> Edit Fields
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-amber-800 dark:text-amber-300">
              {isHeaderExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isHeaderExpanded && (
          <div className="overflow-x-auto border-t animate-in fade-in duration-150">
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="border-b">
                  <td className="w-1/6 bg-amber-100 dark:bg-amber-950/40 p-2.5 font-bold border-r">Campus / Unit</td>
                  <td className="w-1/4 bg-amber-100 dark:bg-amber-950/40 p-2.5 font-bold text-primary border-r">
                    {currentUnit?.name || userProfile?.unitName || 'Quality Assurance Office'}
                  </td>
                  <td className="w-1/4 p-2.5 border-r text-center">
                    <div className="font-bold text-muted-foreground text-[10px] uppercase">Baseline Data</div>
                    <div className="font-semibold text-sm mt-0.5">{metaBaselineData || '2021: 100%'}</div>
                  </td>
                  <td className="w-1/3 p-2.5" rowSpan={3}>
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b">
                      <div>
                        <div className="text-[10px] text-muted-foreground font-bold">Prepared by:</div>
                        <div className="font-bold text-xs mt-1 truncate border-b border-foreground/30 pb-0.5">
                          {metaPreparedByName || 'Accreditation Head'}
                        </div>
                        <div className="text-[9.5px] text-muted-foreground">{metaPreparedByTitle || 'Unit Head'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground font-bold">Reviewed by:</div>
                        <div className="font-bold text-xs mt-1 truncate border-b border-foreground/30 pb-0.5">
                          {metaReviewedByName || '—'}
                        </div>
                        <div className="text-[9.5px] text-muted-foreground">
                          {metaReviewedByTitle || 'Supervising Official'}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2">
                      <div className="text-[10px] text-muted-foreground font-bold">Approved by:</div>
                      <div className="font-bold text-xs mt-1 truncate border-b border-foreground/30 pb-0.5">
                        {metaApprovedByName || 'DR. MERIAN P. CATAJAY-MANI'}
                      </div>
                      <div className="text-[9.5px] text-muted-foreground">
                        {metaApprovedByTitle || 'University President'}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="bg-muted/40 p-2.5 font-bold border-r">
                    Policy Indicator
                    <div className="text-[9.5px] text-muted-foreground font-normal">
                      (University Quality Objectives)
                    </div>
                  </td>
                  <td colSpan={2} className="p-2.5 border-r text-muted-foreground">
                    {metaPolicyIndicator ||
                      'Relevant and quality tertiary education is ensured and inclusive growth and access of deserving but poor students to quality tertiary education are increased'}
                  </td>
                </tr>
                <tr>
                  <td className="bg-muted/40 p-2.5 font-bold border-r">Unit Quality Objective</td>
                  <td colSpan={2} className="p-2.5 border-r font-medium">
                    {metaUnitQualityObjective ||
                      'To ensure that institutional systems are fully certified by National and International Assessment Bodies'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 4. Main Quality Objectives Monitoring Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="py-3 bg-muted/20 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              Action Plans / Programs Monitoring Matrix ({filteredMonitoringItems.length} of{' '}
              {unifiedMonitoringItems.length} Deliverables)
            </CardTitle>
            <CardDescription className="text-xs">
              Directly monitor planned (Red) and actual conducted (Blue) activities month-by-month. Every update
              automatically synchronizes with the Operational Plan.
            </CardDescription>
          </div>
          {(canEditBaseline || canEditAccomplishment) && (
            <Button
              size="sm"
              onClick={() => handleOpenActionPlanDialog()}
              className="text-xs font-bold gap-1 shadow-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Add Action Plan / Program
            </Button>
          )}
        </CardHeader>

        {/* Triage & Filter Toolbar */}
        <div className="p-3 bg-muted/15 border-b flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Left: Quick Status Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
              className={`h-7 text-xs font-bold ${statusFilter === 'all' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              All ({unifiedMonitoringItems.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'needs-update' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('needs-update')}
              className={`h-7 text-xs font-bold gap-1 ${
                statusFilter === 'needs-update'
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/60'
              }`}
            >
              <Clock className="h-3 w-3" /> Needs Update ({executiveMetrics.needsUpdateCount})
            </Button>
            {executiveMetrics.overdueCount > 0 && (
              <Button
                size="sm"
                variant={statusFilter === 'overdue' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('overdue')}
                className={`h-7 text-xs font-bold gap-1 ${
                  statusFilter === 'overdue'
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800/60'
                }`}
              >
                <AlertCircle className="h-3 w-3" /> Overdue ({executiveMetrics.overdueCount})
              </Button>
            )}
            <Button
              size="sm"
              variant={statusFilter === 'this-month' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('this-month')}
              className={`h-7 text-xs font-bold gap-1 ${
                statusFilter === 'this-month'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800/60'
              }`}
            >
              <Calendar className="h-3 w-3" /> {MONTH_NAMES[currentMonthNum - 1]} (
              {executiveMetrics.thisMonthPlannedCount})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'achieved' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('achieved')}
              className={`h-7 text-xs font-bold gap-1 ${
                statusFilter === 'achieved'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/60'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" /> Done ({executiveMetrics.achievedCount})
            </Button>
          </div>

          {/* Right: In-Charge Filter & Search Input */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {distinctInChargeList.length > 1 && (
              <Select value={inChargeFilter} onValueChange={setInChargeFilter}>
                <SelectTrigger className="h-7 w-[150px] text-xs">
                  <SelectValue placeholder="All In-charge" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all" className="text-xs font-bold">
                    All Personnel
                  </SelectItem>
                  {distinctInChargeList.map((name) => (
                    <SelectItem key={name} value={name} className="text-xs">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plan, indicator..."
                className="h-7 pl-8 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground text-xs"
                >
                  &times;
                </button>
              )}
            </div>

            {(statusFilter !== 'all' || inChargeFilter !== 'all' || searchQuery) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStatusFilter('all');
                  setInChargeFilter('all');
                  setSearchQuery('');
                }}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                title="Reset filters"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          {isLoadingQom || isLoadingOp ? (
            <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading Quality Objectives Monitoring matrix...
            </div>
          ) : unifiedMonitoringItems.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-muted/10">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-muted-foreground">No action plans created yet.</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Click &quot;Add Action Plan / Program&quot; to begin building your unit&apos;s Quality Objectives
                  Monitoring.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenActionPlanDialog()}
                className="text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add First Action Plan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs border-collapse">
                <TableHeader className="bg-muted/60 border-b">
                  <TableRow>
                    <TableHead rowSpan={2} className="w-10 text-center font-bold border-r">
                      #
                    </TableHead>
                    <TableHead rowSpan={2} className="min-w-[220px] font-bold border-r">
                      Action Plans / Programs
                      <div className="text-[10px] font-normal text-muted-foreground">(from Operational Plan)</div>
                    </TableHead>
                    <TableHead colSpan={12} className="text-center font-bold border-r py-1">
                      {selectedYear} Monthly Implementation Schedule
                    </TableHead>
                    <TableHead rowSpan={2} className="min-w-[110px] font-bold text-center border-r">
                      In-charge
                    </TableHead>
                    <TableHead rowSpan={2} className="min-w-[140px] font-bold border-r">
                      Resources Needed
                    </TableHead>
                    <TableHead rowSpan={2} className="min-w-[130px] font-bold text-center border-r">
                      Status / Remarks
                      <div className="text-[9px] font-normal text-muted-foreground flex items-center justify-center gap-0.5">
                        (Click to Update)
                      </div>
                    </TableHead>
                    <TableHead rowSpan={2} className="w-20 text-center font-bold">
                      Actions
                    </TableHead>
                  </TableRow>
                  <TableRow className="border-b">
                    {MONTH_NAMES.map((m, idx) => (
                      <TableHead
                        key={idx}
                        className="w-9 min-w-[34px] max-w-[42px] p-1 text-center font-mono text-[10px] font-semibold border-r"
                      >
                        {m}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMonitoringItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={18} className="py-12 text-center">
                        <div className="space-y-2 max-w-sm mx-auto">
                          <Filter className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                          <p className="text-xs font-bold text-muted-foreground">
                            No action plans match the selected filter criteria.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setStatusFilter('all');
                              setInChargeFilter('all');
                              setSearchQuery('');
                            }}
                            className="text-xs font-bold gap-1"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMonitoringItems.map((item, idx) => {
                      const activeMonths = item.activeMonths || [];
                      const actualMonths =
                        item.actualMonths ||
                        Object.keys(item.monthlyAccomplishments || {})
                          .filter((m) => item.monthlyAccomplishments?.[Number(m)]?.implemented)
                          .map(Number);

                      const plannedCount = activeMonths.length;
                      const conductedPlannedCount = activeMonths.filter((m) => actualMonths.includes(m)).length;
                      const progressPercent =
                        plannedCount > 0 ? Math.round((conductedPlannedCount / plannedCount) * 100) : 0;
                      const isOverdue =
                        activeMonths.some((m) => m < currentMonthNum && !actualMonths.includes(m)) &&
                        item.status !== 'Achieved';
                      const isThisMonth = activeMonths.includes(currentMonthNum);

                      const accomplishmentEntries = Object.entries(item.monthlyAccomplishments || {}).filter(
                        ([_, val]) =>
                          val && (val.implemented || val.notes || val.output || val.attainment !== undefined),
                      );
                      const hasUpdate =
                        accomplishmentEntries.length > 0 ||
                        Boolean(item.actualOutput && item.actualOutput.trim()) ||
                        (item.attainmentPercentage !== undefined && item.attainmentPercentage > 0) ||
                        Boolean(item.remarks && item.remarks.trim());

                      const handleOpenUpdateInWizard = () => {
                        const mNum = new Date().getMonth() + 1;
                        if (onNavigateToWizard) {
                          onNavigateToWizard(4, item.id, mNum);
                        } else {
                          handleOpenMonthlyLogDialog(item, mNum);
                        }
                      };

                      return (
                        <TableRow key={item.id} className="border-t hover:bg-muted/10 transition-colors">
                          {/* Index */}
                          <TableCell className="text-center font-mono font-bold text-muted-foreground border-r align-middle py-2">
                            {idx + 1}
                          </TableCell>

                          {/* Action Plans / Programs */}
                          <TableCell className="align-middle border-r py-2">
                            <div className="font-bold text-xs">{item.taskText || item.objectiveText}</div>
                            {item.objectiveText && item.taskText && item.objectiveText !== item.taskText && (
                              <div className="text-[10.5px] text-muted-foreground mt-0.5">
                                Obj: {item.objectiveText}
                              </div>
                            )}
                            {item.targetIndicator && (
                              <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                                Indicator: {item.targetIndicator}
                              </div>
                            )}

                            {/* Informative Progress & Context Badges */}
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              <div className="inline-flex items-center gap-1.5 bg-muted/60 dark:bg-muted/30 px-2 py-0.5 rounded-sm border text-[10px]">
                                <span className="font-semibold text-muted-foreground">Milestones:</span>
                                <span className="font-bold font-mono">
                                  {conductedPlannedCount} / {plannedCount} Mos
                                </span>
                                <span className="text-muted-foreground">({progressPercent}%)</span>
                              </div>
                              {isOverdue && (
                                <Badge
                                  variant="outline"
                                  className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30 text-[9px] font-bold gap-1 px-1.5 py-0.5"
                                >
                                  <AlertCircle className="h-2.5 w-2.5" /> Past Month Pending
                                </Badge>
                              )}
                              {isThisMonth && (
                                <Badge
                                  variant="outline"
                                  className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30 text-[9px] font-bold gap-1 px-1.5 py-0.5"
                                >
                                  <Calendar className="h-2.5 w-2.5" /> Due This Month
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* 12 Month Implementation Cells - Strictly 50/50 Distributed (Plan / Actual) */}
                          {MONTH_NAMES.map((_, mIdx) => {
                            const monthNum = mIdx + 1;
                            const isPlanned = activeMonths.includes(monthNum);
                            const isActual = actualMonths.includes(monthNum);
                            const accEntry = item.monthlyAccomplishments?.[monthNum];

                            return (
                              <TableCell
                                key={`month-${monthNum}`}
                                className="p-0 border-r text-center align-middle h-px w-9 min-w-[34px] max-w-[42px]"
                              >
                                <div className="flex flex-col h-full w-full min-h-[58px]">
                                  {/* Upper Half: Planned Schedule (P - Red) */}
                                  <div
                                    onClick={() => handleTogglePlanMonth(item, monthNum)}
                                    title={
                                      isPlanned
                                        ? `Planned for ${MONTH_NAMES[mIdx]} (Click to toggle)`
                                        : `Not planned in ${MONTH_NAMES[mIdx]} (Click to add)`
                                    }
                                    className={`flex-1 min-h-[28px] flex items-center justify-center cursor-pointer border-b border-slate-200 dark:border-slate-800 transition-colors ${
                                      isPlanned
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold'
                                        : 'hover:bg-muted/60'
                                    }`}
                                  >
                                    {isPlanned ? <span className="text-[9px] select-none font-bold">P</span> : null}
                                  </div>

                                  {/* Lower Half: Actual Accomplished Schedule (A - Blue) */}
                                  <div
                                    onClick={() => handleOpenMonthlyLogDialog(item, monthNum)}
                                    title={
                                      isActual
                                        ? `Actual Conducted in ${MONTH_NAMES[mIdx]}: ${accEntry?.output || 'Implemented'} (Click to view/edit)`
                                        : `Click to log actual accomplishment for ${MONTH_NAMES[mIdx]}`
                                    }
                                    className={`flex-1 min-h-[28px] flex items-center justify-center cursor-pointer transition-colors ${
                                      isActual
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold'
                                        : 'hover:bg-blue-50 dark:hover:bg-blue-950/30'
                                    }`}
                                  >
                                    {isActual ? <span className="text-[9px] select-none font-bold">A</span> : null}
                                  </div>
                                </div>
                              </TableCell>
                            );
                          })}

                          {/* In-charge */}
                          <TableCell className="align-middle text-center border-r font-medium text-[11px] py-2">
                            {item.inCharge || item.responsiblePerson || 'QA UNIT'}
                          </TableCell>

                          {/* Resources Needed */}
                          <TableCell className="align-middle border-r text-muted-foreground text-[11px] py-2">
                            {item.resourcesNeeded || 'Human Resource / Budget / Supplies & Materials'}
                          </TableCell>

                          {/* Clickable Status / Remarks TableCell with Tag for Update */}
                          <TableCell
                            onClick={handleOpenUpdateInWizard}
                            className="align-middle text-center border-r cursor-pointer hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-all group p-2 relative"
                            title="Click to update monthly progress and implementation in Compliance Wizard Step 4"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                className={`text-[10px] font-bold ${
                                  item.status === 'Achieved'
                                    ? 'bg-emerald-600 text-white'
                                    : item.status === 'Ongoing'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-amber-500 text-white'
                                }`}
                              >
                                {item.status === 'Achieved'
                                  ? 'Done'
                                  : item.status === 'Ongoing'
                                    ? 'On-Going'
                                    : item.status || 'On-Going'}
                              </Badge>

                              {/* TAG FOR UPDATE: prominently added when an update has been added */}
                              {hasUpdate && (
                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 gap-1 shadow-2xs animate-in fade-in">
                                  <Sparkles className="h-2.5 w-2.5 text-amber-200" />
                                  Updated
                                  {accomplishmentEntries.length > 0
                                    ? ` (${accomplishmentEntries.length} Mo)`
                                    : item.attainmentPercentage
                                      ? ` (${item.attainmentPercentage}%)`
                                      : ''}
                                </Badge>
                              )}

                              {/* Action Affordance */}
                              <div className="pt-1 mt-0.5 border-t border-dashed border-slate-200 dark:border-slate-800 w-full">
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                                  <CalendarCheck2 className="h-3 w-3" />
                                  Update in Wizard 4 &rarr;
                                </span>
                              </div>

                              {item.actualOutput && (
                                <div className="text-[10px] text-slate-700 dark:text-slate-300 font-medium mt-1 line-clamp-2 italic">
                                  &ldquo;{item.actualOutput}&rdquo;
                                </div>
                              )}
                              {item.remarks && (
                                <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                                  {item.remarks}
                                </div>
                              )}
                              {item.movLink && (
                                <a
                                  href={item.movLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 mt-1"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" /> MOV
                                </a>
                              )}
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="align-middle text-center py-2">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary hover:bg-primary/10"
                                onClick={() => handleOpenActionPlanDialog(item)}
                                title="Edit Action Plan"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              {!item.id.startsWith('syn_') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteActionPlan(item)}
                                  title="Delete Action Plan"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="py-2.5 px-4 bg-muted/20 border-t flex items-center justify-between text-xs">
          {/* Legend Matching Official Form */}
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="text-muted-foreground uppercase text-[11px]">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span>Plan</span>
              <span className="inline-block w-8 h-3.5 bg-rose-600 border rounded-xs" />
            </div>
            <div className="flex items-center gap-1.5">
              <span>Actual</span>
              <span className="inline-block w-8 h-3.5 bg-blue-600 border rounded-xs" />
            </div>
          </div>
          <div className="text-muted-foreground text-[11px]">
            Tip: Click <span className="font-semibold text-rose-600">upper row (Plan)</span> to toggle scheduled months.
            Click <span className="font-semibold text-blue-600">lower row (Actual)</span> to log evidence &amp; monthly
            accomplishment.
          </div>
        </CardFooter>
      </Card>

      {/* 5. Bottom Section: Data Information Table & Illustration Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Data Information [current year] Table */}
        <div className="lg:col-span-5 space-y-2">
          <Card className="shadow-xs overflow-hidden h-full flex flex-col justify-between">
            <CardHeader className="py-3 bg-muted/30 border-b">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-center">
                Data Information [{selectedYear}]
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold text-center border-r">Month</TableHead>
                    <TableHead className="font-bold text-center border-r text-[10.5px]">
                      Plan and activities to be conducted
                    </TableHead>
                    <TableHead className="font-bold text-center border-r text-[10.5px]">
                      Actual Activity Conducted
                    </TableHead>
                    <TableHead className="font-bold text-center text-[10.5px]">% Accomplishment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyStats.map((s) => (
                    <TableRow key={s.monthNum} className="hover:bg-muted/30">
                      <TableCell className="text-center font-bold font-mono border-r py-1.5">{s.name}</TableCell>
                      <TableCell className="text-center border-r py-1.5">{s.plan}</TableCell>
                      <TableCell className="text-center border-r py-1.5 font-semibold text-blue-600">
                        {s.actual}
                      </TableCell>
                      <TableCell className="text-center font-bold py-1.5">
                        <span
                          className={
                            s.accomplishment >= 100
                              ? 'text-emerald-600'
                              : s.accomplishment > 0
                                ? 'text-blue-600'
                                : 'text-muted-foreground'
                          }
                        >
                          {s.accomplishment}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/60 border-t-2">
                    <TableCell className="text-center font-mono border-r">TOTAL</TableCell>
                    <TableCell className="text-center border-r">{totalPlan}</TableCell>
                    <TableCell className="text-center border-r text-blue-600">{totalActual}</TableCell>
                    <TableCell className="text-center text-emerald-600 font-extrabold">
                      {totalAccomplishment}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right: Illustration Chart */}
        <div className="lg:col-span-7 space-y-2">
          <Card className="shadow-xs overflow-hidden h-full flex flex-col justify-between">
            <CardHeader className="py-3 bg-muted/30 border-b text-center">
              <CardTitle className="text-xs font-bold uppercase tracking-wider">Illustration</CardTitle>
              <CardDescription className="text-xs font-bold text-foreground">
                [{currentUnit?.name || 'Unit'}] Performance Rating
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 120]}
                      tickFormatter={(val) => `${val}%`}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        borderRadius: '8px',
                        fontSize: '11px',
                        border: '1px solid var(--border)',
                      }}
                      formatter={(val: any, name: any) => [name === '% Accomplishment' ? `${val}%` : val, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '8px' }} />
                    <Bar
                      yAxisId="left"
                      dataKey="plan"
                      name="Plan and activities to be conducted"
                      fill="#fb7185"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="actual"
                      name="Actual Activity Conducted"
                      fill="#38bdf8"
                      radius={[3, 3, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="accomplishment"
                      name="% Accomplishment"
                      stroke="#22c55e"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#22c55e' }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-3 px-6 flex items-start gap-2.5">
              <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                This dual-axis illustration benchmarks planned operational activities against actual conducted outputs
                per quarter alongside the resulting accomplishment percentage. Sustained accomplishment curves at or
                above 100% validate departmental operational efficiency and verify that quality objectives established
                under ISO 9001:2015 Clause 6.2 are being systematically realized.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* 6. Narrative Analysis of Performance & Problems Encountered */}
      {executiveMetrics.overdueCount > 0 && (
        <Alert className="border-amber-400 bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="font-bold text-xs uppercase tracking-wider">
            ISO 9001:2015 Clause 9.1 Compliance Notice
          </AlertTitle>
          <AlertDescription className="text-xs mt-0.5">
            {executiveMetrics.overdueCount}{' '}
            {executiveMetrics.overdueCount === 1 ? 'action plan has' : 'action plans have'} planned months in the past
            without logged accomplishments. Please ensure root causes and corrective actions are documented in the
            narrative analysis below before supervisor review.
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-xs border">
        <CardHeader className="py-3 bg-muted/20 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold uppercase tracking-wider">
              Quality Review &amp; Continuous Improvement Analysis
            </CardTitle>
            <CardDescription className="text-xs">
              Document root causes, mitigation, and problems encountered as required by ISO 9001:2015 Clause 9.1.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={handleSaveAnalysis}
            disabled={isSavingAnalysis}
            className="text-xs font-bold gap-1 shadow-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSavingAnalysis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Monitoring Notes
          </Button>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Analysis of why performance is below the target</Label>
            <Textarea
              rows={4}
              value={analysisBelowTarget}
              onChange={(e) => setAnalysisBelowTarget(e.target.value)}
              placeholder="Detail reasons if actual activities conducted fell below the planned targets (e.g. procurement delays, typhoon interruptions, calendar rescheduling)..."
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Problems encountered</Label>
            <Textarea
              rows={4}
              value={problemsEncountered}
              onChange={(e) => setProblemsEncountered(e.target.value)}
              placeholder="Record operational roadblocks, resource limitations, or risk issues encountered during implementation..."
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* 7. Dialog: Add / Edit Action Plan Modal */}
      <Dialog open={isActionPlanDialogOpen} onOpenChange={setIsActionPlanDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingItem ? 'Edit Action Plan / Program' : 'Add Action Plan / Program'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action plan will be added to the Quality Objectives Monitoring matrix and synchronized into the
              unit&apos;s Operational Plan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Align with Institutional Goal (Optional)</Label>
                {canManageVpGoals && (
                  <button
                    type="button"
                    onClick={() => setIsVpGoalsDialogOpen(true)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <Plus className="h-3 w-3" /> Manage Goals
                  </button>
                )}
              </div>
              <Select value={formVpGoalId} onValueChange={setFormVpGoalId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Institutional Goal" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="none" className="text-xs">
                    -- Standalone Unit Action Plan --
                  </SelectItem>
                  {vpGoals?.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="text-xs">
                      {g.vpCluster ? `[${g.vpCluster}] ` : ''}
                      {g.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                Unit Quality Objective <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formObjectiveText}
                onChange={(e) => setFormObjectiveText(e.target.value)}
                placeholder="e.g. To ensure institutional systems are certified by assessment bodies"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                Action Plan / Program Title <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={2}
                value={formTaskText}
                onChange={(e) => setFormTaskText(e.target.value)}
                placeholder="e.g. ROR & Quality Objective Monitoring, Surveillance Audit, IQA Training"
                className="text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">In-charge (Office / Person)</Label>
                <Input
                  value={formInCharge}
                  onChange={(e) => setFormInCharge(e.target.value)}
                  placeholder="e.g. QA UNIT, Dean, Registrar"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Target Success Indicator</Label>
                <Input
                  value={formTargetIndicator}
                  onChange={(e) => setFormTargetIndicator(e.target.value)}
                  placeholder="e.g. 100% completed with audit report"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Resources Needed</Label>
                <Input
                  value={formResourcesNeeded}
                  onChange={(e) => setFormResourcesNeeded(e.target.value)}
                  placeholder="e.g. Human Resource / Budget / Supplies & Materials"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Budget Allocation (₱)</Label>
                <Input
                  type="number"
                  value={formBudget || ''}
                  onChange={(e) => setFormBudget(Number(e.target.value))}
                  placeholder="0"
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Planned Months Checkbox Selection */}
            <div className="space-y-2 pt-1 border-t">
              <Label className="text-xs font-bold">Scheduled Implementation Months (Red Bar)</Label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {MONTH_NAMES.map((m, idx) => {
                  const mNum = idx + 1;
                  const isChecked = formActiveMonths.includes(mNum);
                  return (
                    <Button
                      key={mNum}
                      type="button"
                      variant={isChecked ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (isChecked) {
                          setFormActiveMonths(formActiveMonths.filter((x) => x !== mNum));
                        } else {
                          setFormActiveMonths([...formActiveMonths, mNum].sort((a, b) => a - b));
                        }
                      }}
                      className={`text-xs h-7 ${isChecked ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold' : ''}`}
                    >
                      {m}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Status</Label>
                <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ongoing" className="text-xs">
                      On-Going
                    </SelectItem>
                    <SelectItem value="Achieved" className="text-xs">
                      Done / Achieved
                    </SelectItem>
                    <SelectItem value="Pending" className="text-xs">
                      Pending
                    </SelectItem>
                    <SelectItem value="Delayed" className="text-xs">
                      Delayed
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Remarks / Notes</Label>
                <Input
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="e.g. Conducted as planned"
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsActionPlanDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveActionPlan} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Action Plan &amp; Sync Operational Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Dialog: Monthly Accomplishment Modal (Actual Month - Blue Bar) */}
      <Dialog open={isMonthlyLogDialogOpen} onOpenChange={setIsMonthlyLogDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Log Monthly Accomplishment — {MONTH_NAMES[selectedLogMonth - 1]} {selectedYear}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record the actual output, attainment %, and evidence for this action plan during{' '}
              {MONTH_NAMES[selectedLogMonth - 1]}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg border space-y-1">
              <div className="text-[11px] text-muted-foreground font-bold">Action Plan:</div>
              <div className="text-xs font-bold text-foreground">
                {loggingItem?.taskText || loggingItem?.objectiveText}
              </div>
              <div className="text-[10px] text-muted-foreground">
                In-charge: {loggingItem?.inCharge || loggingItem?.responsiblePerson || 'QA UNIT'}
              </div>
            </div>

            {/* Implemented Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold">Activity Conducted in {MONTH_NAMES[selectedLogMonth - 1]}</Label>
                <div className="text-[11px] text-muted-foreground">
                  Mark whether this deliverable was actually implemented this month.
                </div>
              </div>
              <Switch checked={logImplemented} onCheckedChange={setLogImplemented} />
            </div>

            {logImplemented && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Actual Output / Milestone Produced</Label>
                  <Textarea
                    rows={2}
                    value={logOutput}
                    onChange={(e) => setLogOutput(e.target.value)}
                    placeholder="e.g. Conducted internal quality audit for 14 academic programs..."
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">% Accomplishment for this Month</Label>
                    <span className="font-mono font-bold text-xs text-blue-600">{logAttainment}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[logAttainment]}
                    onValueChange={(val) => setLogAttainment(val[0])}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">MOV / Evidence Drive Link</Label>
                  <Input
                    value={logEvidenceLink}
                    onChange={(e) => setLogEvidenceLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Monthly Remarks / Notes</Label>
                  <Input
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    placeholder="e.g. On schedule, complete attendance sheets attached"
                    className="text-xs"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsMonthlyLogDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveMonthlyAccomplishment}
              disabled={isSavingLog}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSavingLog ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save Accomplishment &amp; Sync Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. Dialog: Form Metadata & Signatories */}
      <Dialog open={isMetadataDialogOpen} onOpenChange={setIsMetadataDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Quality Objectives Monitoring Header &amp; Signatories
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure baseline metrics, policy indicators, and formal signatories for official printouts and audits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Baseline Data</Label>
              <Input
                value={metaBaselineData}
                onChange={(e) => setMetaBaselineData(e.target.value)}
                placeholder="2021: 100%"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Policy Indicator (University Quality Objectives)</Label>
              <Textarea
                rows={2}
                value={metaPolicyIndicator}
                onChange={(e) => setMetaPolicyIndicator(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Unit Quality Objective</Label>
              <Textarea
                rows={2}
                value={metaUnitQualityObjective}
                onChange={(e) => setMetaUnitQualityObjective(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Prepared by (Name)</Label>
                <Input
                  value={metaPreparedByName}
                  onChange={(e) => setMetaPreparedByName(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Prepared by (Title / Position)</Label>
                <Input
                  value={metaPreparedByTitle}
                  onChange={(e) => setMetaPreparedByTitle(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Reviewed by (Name)</Label>
                <Input
                  value={metaReviewedByName}
                  onChange={(e) => setMetaReviewedByName(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Reviewed by (Title / Position)</Label>
                <Input
                  value={metaReviewedByTitle}
                  onChange={(e) => setMetaReviewedByTitle(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Approved by (Name)</Label>
                <Input
                  value={metaApprovedByName}
                  onChange={(e) => setMetaApprovedByName(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Approved by (Title / Position)</Label>
                <Input
                  value={metaApprovedByTitle}
                  onChange={(e) => setMetaApprovedByTitle(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsMetadataDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveMetadata} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Header Metadata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 10. Dialog: Request Revision Feedback */}
      <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Request Document Revision</DialogTitle>
            <DialogDescription className="text-xs">
              Provide feedback and instructions for the unit head explaining what needs adjustment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold">Revision Instructions / Feedback</Label>
            <Textarea
              rows={4}
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="e.g. Please adjust the timeline for the IQA training and align the indicator with ISO 21001 requirements..."
              className="text-xs"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsFeedbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRejectPlan}
              disabled={isRejecting || !feedbackNote.trim()}
            >
              Submit Revision Request
            </Button>
          </DialogFooter>
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
