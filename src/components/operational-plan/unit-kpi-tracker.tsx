'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { useYear } from '@/lib/year-provider';
import { collection, query, where, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import type {
  OperationalPlanItem,
  QualityObjectiveItem,
  Unit,
  Campus,
  OperationalPlanDocument,
  Risk,
  MonthlyAccomplishmentEntry,
} from '@/lib/types';
import { getAgendaList } from '@/lib/constants';
import { formatRiskTargetDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Calendar,
  CalendarCheck2,
  FileSpreadsheet,
  Printer,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Filter,
  Search,
  Award,
  Layers,
  BarChart3,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Info,
  Loader2,
  Shield,
  FileCheck,
  CalendarDays,
  FileText,
  AlertCircle,
  Check,
  ChevronRight,
} from 'lucide-react';
import { printQualityObjectivesForm } from '@/components/wizard/print-quality-objectives';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function UnitKpiTracker() {
  const firestore = useFirestore();
  const { userProfile, isAdmin, isSupervisor } = useUser();
  const { toast } = useToast();
  const { selectedYear } = useYear();

  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedCycle, setSelectedCycle] = useState<'first' | 'final'>('first');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, warning, completed, ongoing
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKraFilter, setSelectedKraFilter] = useState<string>('all');

  // Modal State for Updating Monthly Activity & Progress
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedQomItem, setSelectedQomItem] = useState<QualityObjectiveItem | null>(null);
  const [updateMonth, setUpdateMonth] = useState<number>(new Date().getMonth() + 1);
  const [updateImplemented, setUpdateImplemented] = useState<boolean>(true);
  const [updateAttainment, setUpdateAttainment] = useState<number>(0);
  const [updateStatus, setUpdateStatus] = useState<'Pending' | 'Ongoing' | 'Achieved' | 'Delayed'>('Ongoing');
  const [updateActivityNotes, setUpdateActivityNotes] = useState('');
  const [updateOutput, setUpdateOutput] = useState('');
  const [updateMovLink, setUpdateMovLink] = useState('');
  const [updateEvidenceName, setUpdateEvidenceName] = useState('');
  const [updateRemarks, setUpdateRemarks] = useState('');
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);

  // Risk Register filters
  const [riskFilterType, setRiskFilterType] = useState<'all' | 'Risk' | 'Opportunity'>('all');

  // Current calendar month (1 = Jan, 10 = Oct, etc.)
  const currentCalendarMonth = useMemo(() => new Date().getMonth() + 1, []);
  const nextCalendarMonth = useMemo(
    () => (currentCalendarMonth === 12 ? 1 : currentCalendarMonth + 1),
    [currentCalendarMonth],
  );

  // Fetch Units and Campuses
  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits } = useCollection<Unit>(unitsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: allCampuses } = useCollection<Campus>(campusesQuery);

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

  // Operational Plan Doc ID (Standard system format: op_${year}_${cycle}_${unitId})
  const planDocId = useMemo(() => {
    if (!selectedUnitId || !selectedYear) return '';
    return `op_${selectedYear}_${selectedCycle}_${selectedUnitId}`;
  }, [selectedUnitId, selectedYear, selectedCycle]);

  // Backward-compatible fallback plan ID
  const altPlanDocId = useMemo(() => {
    if (!selectedUnitId || !selectedYear) return '';
    return `${selectedYear}-${selectedUnitId}-${selectedCycle}`;
  }, [selectedUnitId, selectedYear, selectedCycle]);

  // Fetch Operational Plan Document to check VP approval status (checks both doc IDs)
  const planDocRef = useMemoFirebase(() => {
    if (!firestore || !planDocId) return null;
    return doc(firestore, 'operationalPlans', planDocId);
  }, [firestore, planDocId]);
  const { data: primaryPlanDoc } = useDoc<OperationalPlanDocument>(planDocRef);

  const altPlanDocRef = useMemoFirebase(() => {
    if (!firestore || !altPlanDocId) return null;
    return doc(firestore, 'operationalPlans', altPlanDocId);
  }, [firestore, altPlanDocId]);
  const { data: altPlanDoc } = useDoc<OperationalPlanDocument>(altPlanDocRef);

  const planDoc = primaryPlanDoc || altPlanDoc;
  const isPlanApproved = planDoc?.status === 'Approved';

  // Fetch Quality Objectives Monitoring (QOM) items
  const qomQuery = useMemoFirebase(() => {
    if (!firestore || !planDocId) return null;
    return query(collection(firestore, 'qualityObjectives'), where('planId', 'in', [planDocId, altPlanDocId]));
  }, [firestore, planDocId, altPlanDocId]);
  const { data: qomItems, isLoading: isLoadingQom } = useCollection<QualityObjectiveItem>(qomQuery);

  // Fetch Operational Plan Items (QAO-01-025)
  const opItemsQuery = useMemoFirebase(() => {
    if (!firestore || !planDocId) return null;
    return query(collection(firestore, 'operationalPlanItems'), where('planId', 'in', [planDocId, altPlanDocId]));
  }, [firestore, planDocId, altPlanDocId]);
  const { data: opItems } = useCollection<OperationalPlanItem>(opItemsQuery);

  // Unified Deliverables List: ensures all operational plan items and quality objectives are synchronized and tracked
  const unifiedQomItems = useMemo(() => {
    const list: QualityObjectiveItem[] = [...(qomItems || [])];

    // For every opItem, check if a matching qomItem already exists
    (opItems || []).forEach((op) => {
      const match = list.find(
        (q) =>
          (q.opItemId && q.opItemId === op.id) ||
          (q.objectiveText?.trim() === op.objective?.trim() && q.taskText?.trim() === op.tasks?.trim()),
      );

      if (!match) {
        // Synthesize a QualityObjectiveItem from opItem so it is immediately visible and actionable!
        const calcAttain =
          typeof op.attainmentPercentage === 'number'
            ? op.attainmentPercentage
            : op.isCompleted
              ? 100
              : op.actualMetricValue !== undefined && op.targetMetricValue && op.targetMetricValue > 0
                ? Math.min(100, Math.round((op.actualMetricValue / op.targetMetricValue) * 100))
                : 0;

        const syntheticItem: QualityObjectiveItem = {
          id: `op-synced-${op.id}`,
          planId: op.planId || planDocId,
          unitId: op.unitId || selectedUnitId,
          year: op.year || selectedYear,
          cycleId: selectedCycle,
          objectiveText: op.objective,
          taskText: op.tasks,
          archipelagicPillar: op.archipelagicPillar,
          sucLevellingKra: op.sucLevellingKra,
          tenPointAgenda: op.tenPointAgenda,
          tenPointAgendas: op.tenPointAgendas,
          qualityObjective: op.qualityObjective,
          targetIndicator: op.successIndicator,
          activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          responsiblePerson: op.personsResponsible || '',
          status: op.isCompleted ? 'Achieved' : op.progressUpdates ? 'Ongoing' : 'Pending',
          attainmentPercentage: calcAttain,
          actualOutput: op.progressUpdates || '',
          movLink: op.movDriveLink || '',
          remarks: op.remarks || '',
          opItemId: op.id,
          createdAt: op.createdAt,
        };
        list.push(syntheticItem);
      } else {
        // If match exists, associate opItemId if not set
        if (!match.opItemId) {
          match.opItemId = op.id;
        }
      }
    });

    return list;
  }, [qomItems, opItems, planDocId, selectedUnitId, selectedYear, selectedCycle]);

  // Fetch Unit Risks & Opportunities (ROAP)
  const risksQuery = useMemoFirebase(() => {
    if (!firestore || !selectedUnitId || !selectedYear) return null;
    return query(
      collection(firestore, 'risks'),
      where('unitId', '==', selectedUnitId),
      where('year', '==', selectedYear),
    );
  }, [firestore, selectedUnitId, selectedYear]);
  const { data: unitRisks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

  // 1. Current Month Planned Activities
  const currentMonthItems = useMemo(() => {
    if (!unifiedQomItems) return [];
    return unifiedQomItems.filter((item) => item.activeMonths?.includes(currentCalendarMonth));
  }, [unifiedQomItems, currentCalendarMonth]);

  // 2. Next Month Planned Activities
  const nextMonthItems = useMemo(() => {
    if (!unifiedQomItems) return [];
    return unifiedQomItems.filter((item) => item.activeMonths?.includes(nextCalendarMonth));
  }, [unifiedQomItems, nextCalendarMonth]);

  // 3. Past Due / Unimplemented Months Warnings
  // Items that had scheduled months < currentCalendarMonth where monthlyAccomplishment was NOT logged or implemented
  const missedPastMonthAlerts = useMemo(() => {
    if (!unifiedQomItems) return [];
    const alerts: Array<{
      item: QualityObjectiveItem;
      missedMonths: number[];
    }> = [];

    unifiedQomItems.forEach((item) => {
      const pastActiveMonths = (item.activeMonths || []).filter((m) => m < currentCalendarMonth);
      const missed = pastActiveMonths.filter((m) => {
        const log = item.monthlyAccomplishments?.[m];
        return !log || (!log.implemented && !log.completed && (log.attainment || 0) < 100);
      });
      if (missed.length > 0) {
        alerts.push({ item, missedMonths: missed });
      }
    });

    return alerts;
  }, [unifiedQomItems, currentCalendarMonth]);

  // Helper: compute attainment % for an item
  const getItemAttainment = (item: QualityObjectiveItem): number => {
    // 1. Check if item has monthlyAccomplishments with attainment
    const accomplishments = item.monthlyAccomplishments;
    if (accomplishments && Object.keys(accomplishments).length > 0) {
      const values = Object.values(accomplishments).map((a) => (typeof a?.attainment === 'number' ? a.attainment : 0));
      if (values.length > 0) {
        const maxVal = Math.max(...values);
        if (maxVal > 0) return maxVal;
      }
    }

    if (typeof item.attainmentPercentage === 'number' && item.attainmentPercentage > 0) {
      return item.attainmentPercentage;
    }
    if (item.status === 'Achieved') return 100;

    // Check if matched in opItems
    const matchedOp = opItems?.find(
      (op) =>
        (item.opItemId && op.id === item.opItemId) ||
        (op.objective?.trim() === item.objectiveText?.trim() && op.tasks?.trim() === item.taskText?.trim()),
    );
    if (matchedOp) {
      if (typeof matchedOp.attainmentPercentage === 'number' && matchedOp.attainmentPercentage > 0) {
        return matchedOp.attainmentPercentage;
      }
      if (matchedOp.isCompleted) return 100;
      if (matchedOp.actualMetricValue !== undefined && matchedOp.targetMetricValue && matchedOp.targetMetricValue > 0) {
        return Math.min(100, Math.round((matchedOp.actualMetricValue / matchedOp.targetMetricValue) * 100));
      }
    }
    if (typeof item.attainmentPercentage === 'number') return item.attainmentPercentage;
    if (item.status === 'Ongoing') return 50;
    return 0;
  };

  // Helper: Determine if item has a 100% Implementation Warning
  const isItemUnderWarning = (item: QualityObjectiveItem): boolean => {
    const attainment = getItemAttainment(item);
    if (attainment >= 100) return false;
    // Warning conditions:
    // 1. If any scheduled month in past/current is NOT implemented
    const hasPastOrCurrentMonthUnimplemented = item.activeMonths?.some((m) => {
      if (m > currentCalendarMonth) return false;
      const log = item.monthlyAccomplishments?.[m];
      return !log || (!log.implemented && !log.completed && (log.attainment || 0) < 100);
    });
    if (hasPastOrCurrentMonthUnimplemented) return true;
    // 2. If status is explicitly marked Delayed
    if (item.status === 'Delayed') return true;
    // 3. If in final cycle and not 100%
    if (selectedCycle === 'final' && attainment < 100) return true;
    return false;
  };

  // Metric Aggregations
  const stats = useMemo(() => {
    if (!unifiedQomItems || unifiedQomItems.length === 0) {
      return {
        total: 0,
        averageAttainment: 0,
        fullyCompleted: 0,
        inProgress: 0,
        pending: 0,
        underWarning: 0,
        kraBreakdown: {} as Record<string, { total: number; completed: number }>,
      };
    }

    let sumAttainment = 0;
    let completed = 0;
    let ongoing = 0;
    let pending = 0;
    let warnings = 0;
    const kraMap: Record<string, { total: number; completed: number }> = {};

    unifiedQomItems.forEach((item) => {
      const attainment = getItemAttainment(item);
      sumAttainment += attainment;

      if (attainment >= 100) {
        completed += 1;
      } else if (attainment > 0 || item.status === 'Ongoing') {
        ongoing += 1;
      } else {
        pending += 1;
      }

      if (isItemUnderWarning(item)) {
        warnings += 1;
      }

      // KRA breakdown
      const kra = item.sucLevellingKra || 'General Services';
      if (!kraMap[kra]) kraMap[kra] = { total: 0, completed: 0 };
      kraMap[kra].total += 1;
      if (attainment >= 100) kraMap[kra].completed += 1;
    });

    const avg = Math.round(sumAttainment / unifiedQomItems.length);

    return {
      total: unifiedQomItems.length,
      averageAttainment: avg,
      fullyCompleted: completed,
      inProgress: ongoing,
      pending,
      underWarning: warnings,
      kraBreakdown: kraMap,
    };
  }, [unifiedQomItems, opItems, currentCalendarMonth, selectedCycle]);

  // Filtered Items List
  const filteredItems = useMemo(() => {
    if (!unifiedQomItems) return [];
    return unifiedQomItems.filter((item) => {
      const attainment = getItemAttainment(item);
      const underWarning = isItemUnderWarning(item);

      if (filterStatus === 'warning' && !underWarning) return false;
      if (filterStatus === 'completed' && attainment < 100) return false;
      if (filterStatus === 'ongoing' && (attainment >= 100 || attainment === 0)) return false;
      if (filterStatus === 'pending' && (attainment > 0 || item.status === 'Achieved')) return false;

      if (selectedKraFilter !== 'all' && item.sucLevellingKra !== selectedKraFilter) return false;

      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const inObj = item.objectiveText?.toLowerCase().includes(queryLower);
        const inTask = item.taskText?.toLowerCase().includes(queryLower);
        const inIndicator = item.targetIndicator?.toLowerCase().includes(queryLower);
        if (!inObj && !inTask && !inIndicator) return false;
      }

      return true;
    });
  }, [unifiedQomItems, filterStatus, selectedKraFilter, searchQuery, opItems, currentCalendarMonth, selectedCycle]);

  // Helper to load specific month's recorded accomplishment into modal state
  const loadMonthData = (item: QualityObjectiveItem, month: number) => {
    const existing = item.monthlyAccomplishments?.[month];
    if (existing) {
      setUpdateImplemented(existing.implemented !== false);
      setUpdateActivityNotes(existing.notes || '');
      setUpdateOutput(existing.output || '');
      setUpdateAttainment(existing.attainment ?? getItemAttainment(item));
      setUpdateMovLink(existing.evidenceLink || item.movLink || '');
      setUpdateEvidenceName(existing.evidenceName || '');
    } else {
      // Default initial values for new month report
      setUpdateImplemented(true);
      setUpdateActivityNotes('');
      setUpdateOutput('');
      setUpdateAttainment(getItemAttainment(item));
      setUpdateMovLink(item.movLink || '');
      setUpdateEvidenceName('');
    }
  };

  // Open Update Monthly Progress Modal
  const handleOpenUpdateModal = (item: QualityObjectiveItem, defaultMonth?: number) => {
    setSelectedQomItem(item);
    const targetMonth = defaultMonth || currentCalendarMonth;
    setUpdateMonth(targetMonth);
    setUpdateStatus(item.status || 'Ongoing');
    setUpdateRemarks(item.remarks || '');
    loadMonthData(item, targetMonth);
    setIsUpdateModalOpen(true);
  };

  // Save Monthly Progress & Accomplishment
  const handleSaveProgress = async () => {
    if (!firestore || !selectedQomItem) return;

    setIsSavingUpdate(true);
    try {
      const isAchieved = updateAttainment >= 100 || updateStatus === 'Achieved';
      const finalStatus = isAchieved ? 'Achieved' : updateStatus;
      const reporterName = userProfile
        ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()
        : 'Unit Staff';

      const updatedMonthEntry: MonthlyAccomplishmentEntry = {
        implemented: updateImplemented,
        completed: isAchieved,
        notes: updateActivityNotes.trim(),
        output: updateOutput.trim(),
        attainment: updateAttainment,
        evidenceLink: updateMovLink.trim(),
        evidenceName: updateEvidenceName.trim(),
        reportedBy: reporterName,
        date: new Date().toISOString(),
      };

      const monthlyAccomplishments = {
        ...(selectedQomItem.monthlyAccomplishments || {}),
        [updateMonth]: updatedMonthEntry,
      };

      // 1. Update or create qualityObjectives document
      if (selectedQomItem.id.startsWith('op-synced-')) {
        await addDoc(collection(firestore, 'qualityObjectives'), {
          planId: planDocId,
          unitId: selectedUnitId,
          year: selectedYear,
          cycleId: selectedCycle,
          objectiveText: selectedQomItem.objectiveText,
          taskText: selectedQomItem.taskText,
          archipelagicPillar: selectedQomItem.archipelagicPillar || '',
          sucLevellingKra: selectedQomItem.sucLevellingKra || '',
          tenPointAgenda: selectedQomItem.tenPointAgenda || '',
          tenPointAgendas: selectedQomItem.tenPointAgendas || [],
          qualityObjective: selectedQomItem.qualityObjective || '',
          targetIndicator: selectedQomItem.targetIndicator,
          activeMonths: selectedQomItem.activeMonths || [1, 2, 3, 4],
          responsiblePerson: selectedQomItem.responsiblePerson || '',
          status: finalStatus,
          attainmentPercentage: updateAttainment,
          actualOutput: updateOutput.trim(),
          movLink: updateMovLink.trim(),
          remarks: updateRemarks.trim(),
          monthlyAccomplishments,
          opItemId: selectedQomItem.opItemId || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(firestore, 'qualityObjectives', selectedQomItem.id), {
          attainmentPercentage: updateAttainment,
          status: finalStatus,
          actualOutput: updateOutput.trim() || selectedQomItem.actualOutput || '',
          movLink: updateMovLink.trim() || selectedQomItem.movLink || '',
          remarks: updateRemarks.trim(),
          monthlyAccomplishments,
          updatedAt: serverTimestamp(),
        });
      }

      // 2. Also synchronize corresponding operationalPlanItems if exists
      const targetOpId =
        selectedQomItem.opItemId ||
        opItems?.find(
          (op) =>
            op.objective?.trim() === selectedQomItem.objectiveText?.trim() &&
            op.tasks?.trim() === selectedQomItem.taskText?.trim(),
        )?.id;

      if (targetOpId) {
        await updateDoc(doc(firestore, 'operationalPlanItems', targetOpId), {
          attainmentPercentage: updateAttainment,
          actualMetricValue: updateAttainment,
          isCompleted: isAchieved,
          progressUpdates: updateActivityNotes.trim() || updateOutput.trim() || '',
          remarks: updateRemarks.trim(),
          movDriveLink: updateMovLink.trim(),
          updatedAt: serverTimestamp(),
        });
      }

      toast({
        title: isAchieved ? '100% Deliverable Accomplished! 🎉' : 'Monthly Accomplishment Saved',
        description: `Month ${updateMonth} (${MONTH_NAMES[updateMonth - 1]}) report saved (${
          updateImplemented ? 'Implemented' : 'Not Implemented'
        }) at ${updateAttainment}% implementation.`,
      });
      setIsUpdateModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error Saving Progress',
        description: error.message || 'Could not update accomplishment record.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingUpdate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <Card className="border shadow-xs bg-linear-to-r from-blue-50/50 via-background to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10">
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-blue-100/70 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-mono text-[10px]"
                >
                  ISO 21001 Clause 9.1 &amp; SUC Levelling
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-emerald-100/70 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-mono text-[10px]"
                >
                  AY {selectedYear}
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold tracking-tight mt-1 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Unit KPI &amp; 100% Deliverables Implementation Tracker
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Real-time performance cockpit tracking operational deliverables, monthly milestone execution, and audit
                compliance.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  printQualityObjectivesForm(
                    qomItems || [],
                    currentUnit?.name || 'Unit',
                    currentCampus,
                    selectedYear,
                    selectedCycle,
                    `${userProfile?.firstName} ${userProfile?.lastName}`,
                  )
                }
                className="text-xs font-bold gap-1.5 shadow-2xs"
              >
                <Printer className="h-3.5 w-3.5 text-blue-600" />
                Print QOM Form (RSU-QAO-QOM-001)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3 rounded-lg bg-background/80 border">
            {/* Unit Selector */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Campus / Unit</Label>
              {isAdmin || isSupervisor ? (
                <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                  <SelectTrigger className="text-xs font-semibold h-8">
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
                <div className="text-xs font-bold py-1.5 px-3 bg-muted/40 border rounded-md">
                  {currentUnit?.name || userProfile?.unitName || 'Office'}
                </div>
              )}
            </div>

            {/* Cycle Selector */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Cycle</Label>
              <Select value={selectedCycle} onValueChange={(val: any) => setSelectedCycle(val)}>
                <SelectTrigger className="text-xs font-semibold h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first" className="text-xs">
                    First Cycle (Baseline)
                  </SelectItem>
                  <SelectItem value="final" className="text-xs">
                    Final Cycle (Accomplishment)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Current Calendar Monitoring Period */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Active Calendar Period</Label>
              <div className="text-xs font-mono font-bold py-1.5 px-3 bg-blue-50/60 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900 rounded-md flex items-center justify-between">
                <span>
                  Month {currentCalendarMonth}: {MONTH_NAMES[currentCalendarMonth - 1]}
                </span>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                  Active
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VP In-Charge Approval Priority Banner */}
      {isPlanApproved ? (
        <Card className="border-emerald-300 dark:border-emerald-800 bg-linear-to-r from-emerald-500/10 via-emerald-500/5 to-transparent shadow-xs">
          <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mt-0.5">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">EOMS Plan Approved by VP</Badge>
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Official VP in Charge: {planDoc?.approvedByName || 'Vice President'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground mt-0.5">
                  Monthly Quality Objectives Monitoring Active
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your unit&apos;s operational plan has been officially approved. Focus is now centered on monthly
                  implementation, logging milestone achievements, and attaching verifiable Means of Verification (MOV).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className="border-emerald-300 text-emerald-700 dark:text-emerald-300 font-mono text-xs"
              >
                ISO Clause 9.1 Monitoring View
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs">
          <CardContent className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong className="text-amber-900 dark:text-amber-200">
                  Plan Status: {planDoc?.status || 'Draft'}
                </strong>{' '}
                &mdash; Once approved by the Vice President in charge, this dashboard becomes the unit&apos;s primary
                monthly execution cockpit. You can currently log periodic milestones and verify documents.
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] border-amber-300 text-amber-800 dark:text-amber-300 shrink-0"
            >
              {planDoc?.status === 'Submitted' ? 'Awaiting VP Approval' : 'Preliminary Monitoring'}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* 2. Visual KPI Metrics Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Implementation Gauge */}
        <Card className="shadow-xs border-l-4 border-l-blue-600">
          <CardHeader className="py-3 px-4 pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Overall Implementation
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardDescription>
            <div className="flex items-baseline gap-2 mt-1">
              <div className="text-3xl font-extrabold font-mono text-blue-600 dark:text-blue-400">
                {stats.averageAttainment}%
              </div>
              <span className="text-xs text-muted-foreground font-medium">towards 100% target</span>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <Progress value={stats.averageAttainment} className="h-2 mt-1" />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
              <span>0%</span>
              <span>Target: 100%</span>
            </div>
          </CardContent>
        </Card>

        {/* 100% Fully Accomplished */}
        <Card className="shadow-xs border-l-4 border-l-emerald-600">
          <CardHeader className="py-3 px-4 pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              100% Implemented
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardDescription>
            <div className="flex items-baseline gap-2 mt-1">
              <div className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {stats.fullyCompleted}
              </div>
              <span className="text-xs text-muted-foreground font-medium">of {stats.total} deliverables</span>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Audit Ready
              </Badge>
              <span>Verified with MOV output</span>
            </div>
          </CardContent>
        </Card>

        {/* In Progress / Active Execution */}
        <Card className="shadow-xs border-l-4 border-l-indigo-600">
          <CardHeader className="py-3 px-4 pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Active / In Progress
              <Clock className="h-4 w-4 text-indigo-600" />
            </CardDescription>
            <div className="flex items-baseline gap-2 mt-1">
              <div className="text-3xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                {stats.inProgress}
              </div>
              <span className="text-xs text-muted-foreground font-medium">ongoing deliverables</span>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="text-[11px] text-muted-foreground">
              {stats.pending > 0 ? `${stats.pending} pending milestone startup` : 'All tasks underway'}
            </div>
          </CardContent>
        </Card>

        {/* 100% Implementation Warning Card */}
        <Card
          className={`shadow-xs border-l-4 ${stats.underWarning > 0 ? 'border-l-rose-500 bg-rose-50/20 dark:bg-rose-950/10' : 'border-l-slate-300'}`}
        >
          <CardHeader className="py-3 px-4 pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              100% Target Warning
              <AlertTriangle
                className={`h-4 w-4 ${stats.underWarning > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}
              />
            </CardDescription>
            <div className="flex items-baseline gap-2 mt-1">
              <div
                className={`text-3xl font-extrabold font-mono ${stats.underWarning > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600'}`}
              >
                {stats.underWarning}
              </div>
              <span className="text-xs text-muted-foreground font-medium">behind 100% target</span>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {stats.underWarning > 0 ? (
              <Button
                variant="link"
                size="sm"
                onClick={() => setFilterStatus('warning')}
                className="text-[11px] font-bold text-rose-600 p-0 h-auto hover:underline"
              >
                View Lagging Deliverables &rarr;
              </Button>
            ) : (
              <span className="text-[11px] text-emerald-600 font-medium">No lagging deliverables</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Missed Past Planned Months Warning Banner */}
      {missedPastMonthAlerts.length > 0 && (
        <Alert
          variant="destructive"
          className="border-rose-400 bg-rose-50/90 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 shadow-xs"
        >
          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <AlertTitle className="font-bold flex items-center justify-between text-sm flex-wrap gap-2">
            <span>
              Implementation Warning: {missedPastMonthAlerts.length} Deliverable(s) Were Planned in Past Months but Not
              Implemented / Logged
            </span>
            <Badge variant="destructive" className="text-[10px] font-mono">
              ISO 21001 Clause 9.1 Alert
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-xs mt-1.5 space-y-2.5">
            <p>
              The following quality objectives had activities scheduled in prior months of AY {selectedYear} that have
              no recorded implementation or remain under 100%. Click &quot;Log Catch-Up&quot; to submit execution
              evidence or enter a justified catch-up report:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {missedPastMonthAlerts.slice(0, 4).map(({ item, missedMonths }) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-md bg-background/90 border border-rose-200 dark:border-rose-900 flex items-start justify-between gap-2 shadow-2xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-bold text-foreground text-xs line-clamp-1">{item.objectiveText}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">{item.taskText}</div>
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                        Missed Month(s):
                      </span>
                      {missedMonths.map((m) => (
                        <Badge key={m} variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-mono font-bold">
                          {MONTH_SHORT[m - 1]} (Month {m})
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenUpdateModal(item, missedMonths[0])}
                    className="text-[10px] h-6 px-2 font-bold shrink-0 border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                  >
                    Log Catch-Up
                  </Button>
                </div>
              ))}
            </div>
            {missedPastMonthAlerts.length > 4 && (
              <p className="text-[11px] text-muted-foreground italic">
                + {missedPastMonthAlerts.length - 4} more deliverables have missed past month milestones. Filter by
                &quot;Below 100%&quot; below to review all.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 4. SUC Levelling & 10-Point Agenda Alignment Strip */}
      <Card className="shadow-xs">
        <CardHeader className="py-3 px-4 border-b bg-muted/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            SUC Levelling KRAs Implementation Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((kraNum) => {
              const kraKey =
                Object.keys(stats.kraBreakdown).find((k) => k.includes(`KRA ${kraNum}`)) || `KRA ${kraNum}`;
              const kraData = stats.kraBreakdown[kraKey] || { total: 0, completed: 0 };
              const percent = kraData.total > 0 ? Math.round((kraData.completed / kraData.total) * 100) : 0;

              return (
                <div key={kraNum} className="p-3 bg-muted/30 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold font-mono text-blue-700 dark:text-blue-300">KRA {kraNum}</span>
                    <Badge variant="secondary" className="text-[9px] font-mono">
                      {kraData.completed}/{kraData.total} (100%)
                    </Badge>
                  </div>
                  <Progress value={percent} className="h-1.5" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="truncate max-w-[120px]">
                      {kraNum === 1
                        ? 'Education'
                        : kraNum === 2
                          ? 'Research'
                          : kraNum === 3
                            ? 'Extension'
                            : kraNum === 4
                              ? 'Resources'
                              : 'Governance'}
                    </span>
                    <span className="font-bold">{percent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="bg-muted/5 border-t py-3 px-6 flex items-start gap-2.5">
          <Layers className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
            This progress matrix monitors operational deliverable attainment across the five SUC Levelling Key Result
            Areas (KRAs), translating unit-level activity execution into institutional accreditation readiness and
            performance-based bonus compliance under DBM-CHED Joint Circular guidelines.
          </p>
        </CardFooter>
      </Card>

      {/* 5. Monthly Activity Execution Horizon (Current & Next Succeeding Month Activities) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Month Planned Activities */}
        <Card className="shadow-xs border-l-4 border-l-blue-600 bg-linear-to-br from-blue-50/30 to-background dark:from-blue-950/10">
          <CardHeader className="py-3 px-4 pb-2 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                  Current Month Activities &bull; {MONTH_NAMES[currentCalendarMonth - 1]} (Month {currentCalendarMonth})
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {currentMonthItems.length} Scheduled
              </Badge>
            </div>
            <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
              Deliverables planned for immediate implementation during the ongoing active calendar month.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            {currentMonthItems.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">
                No deliverables were specifically scheduled for Month {currentCalendarMonth} (
                {MONTH_NAMES[currentCalendarMonth - 1]}).
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {currentMonthItems.map((item) => {
                  const monthLog = item.monthlyAccomplishments?.[currentCalendarMonth];
                  const isLogged = !!monthLog;
                  const isImplemented = monthLog?.implemented !== false && (monthLog?.attainment || 0) > 0;

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-md border bg-background/80 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-semibold text-foreground line-clamp-1">{item.objectiveText}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1">{item.taskText}</div>
                        <div className="flex items-center gap-2 pt-0.5">
                          {isLogged ? (
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 h-4 font-semibold ${
                                isImplemented
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {isImplemented ? '✓ Implemented' : 'Reported (Not Implemented)'} &bull;{' '}
                              {monthLog.attainment || 0}%
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                            >
                              Pending Log for {MONTH_SHORT[currentCalendarMonth - 1]}
                            </Badge>
                          )}
                          {monthLog?.evidenceLink && (
                            <a
                              href={monthLog.evidenceLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              <ExternalLink className="h-2.5 w-2.5" /> Evidence
                            </a>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isLogged ? 'outline' : 'default'}
                        onClick={() => handleOpenUpdateModal(item, currentCalendarMonth)}
                        className={`text-[10px] h-7 px-2 font-bold shrink-0 ${
                          !isLogged ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                        }`}
                      >
                        {isLogged ? 'Edit Report' : 'Log Month Progress'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Succeeding Month Planned Activities */}
        <Card className="shadow-xs border-l-4 border-l-indigo-500 bg-linear-to-br from-indigo-50/30 to-background dark:from-indigo-950/10">
          <CardHeader className="py-3 px-4 pb-2 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-indigo-600" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                  Next Succeeding Month Pipeline &bull; {MONTH_NAMES[nextCalendarMonth - 1]} (Month {nextCalendarMonth})
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {nextMonthItems.length} Scheduled
              </Badge>
            </div>
            <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
              Advance visibility for activities scheduled next month to coordinate budget, venues, and logistics.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            {nextMonthItems.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">
                No deliverables are scheduled for next month ({MONTH_NAMES[nextCalendarMonth - 1]}).
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {nextMonthItems.map((item) => {
                  const nextLog = item.monthlyAccomplishments?.[nextCalendarMonth];
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-md border bg-background/80 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-semibold text-foreground line-clamp-1">{item.objectiveText}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1">{item.taskText}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Target Indicator: <span className="font-medium text-foreground">{item.targetIndicator}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenUpdateModal(item, nextCalendarMonth)}
                        className="text-[10px] h-7 px-2 font-bold shrink-0 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                      >
                        {nextLog ? 'Edit Pre-Log' : 'Prepare / Early Log'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Main Interactive Deliverables & Monthly Activity Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="py-4 border-b bg-muted/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CalendarCheck2 className="h-4 w-4 text-primary" />
                Unit Deliverables &amp; Monthly Activity Accomplishments
              </CardTitle>
              <CardDescription className="text-xs">
                Click &quot;Update Progress&quot; on any deliverable to log monthly activities, adjust implementation %
                towards 100%, and record evidence.
              </CardDescription>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                className="text-xs h-7 font-bold px-2.5"
              >
                All ({stats.total})
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'warning' ? 'destructive' : 'outline'}
                onClick={() => setFilterStatus('warning')}
                className="text-xs h-7 font-bold px-2.5 gap-1"
              >
                <AlertTriangle className="h-3 w-3" />
                Below 100% ({stats.underWarning})
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'completed' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('completed')}
                className="text-xs h-7 font-bold px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3 w-3" />
                100% Completed ({stats.fullyCompleted})
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'ongoing' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('ongoing')}
                className="text-xs h-7 font-bold px-2.5"
              >
                In Progress ({stats.inProgress})
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="pt-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search by objective, task, or success indicator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8 bg-background max-w-md"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingQom ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading unit deliverables...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2 bg-muted/10">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-bold text-muted-foreground">
                {filterStatus === 'warning'
                  ? 'No deliverables currently below 100% target under this filter! 🎉'
                  : 'No deliverables match the selected filters.'}
              </p>
              {filterStatus !== 'all' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFilterStatus('all')}
                  className="text-xs font-bold h-7"
                >
                  Reset Filter
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader className="bg-blue-50/70 dark:bg-blue-950/40 border-b">
                  <TableRow>
                    <TableHead className="w-10 text-center font-bold">#</TableHead>
                    <TableHead className="min-w-[220px] font-bold">Objective &amp; Deliverable Task</TableHead>
                    <TableHead className="min-w-[180px] font-bold">100% Implementation Progress</TableHead>
                    <TableHead className="min-w-[160px] font-bold text-center">Active Scheduled Months</TableHead>
                    <TableHead className="min-w-[140px] font-bold">Success Indicator</TableHead>
                    <TableHead className="min-w-[100px] font-bold text-center">Status</TableHead>
                    <TableHead className="w-28 text-center font-bold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, idx) => {
                    const attainment = getItemAttainment(item);
                    const is100Percent = attainment >= 100;
                    const underWarning = isItemUnderWarning(item);

                    return (
                      <TableRow
                        key={item.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          underWarning ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <TableCell className="text-center font-mono font-semibold text-muted-foreground align-top">
                          {idx + 1}
                        </TableCell>

                        {/* Objective & Deliverable Task */}
                        <TableCell className="align-top space-y-1">
                          <div className="font-bold text-foreground text-xs leading-snug">{item.objectiveText}</div>
                          <div className="text-[11px] text-muted-foreground">{item.taskText}</div>

                          {/* Alignment Badges */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {item.archipelagicPillar && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300"
                              >
                                Archipelagic (AQ): {item.archipelagicPillar}
                              </Badge>
                            )}
                            {item.sucLevellingKra && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                              >
                                SUC: {item.sucLevellingKra}
                              </Badge>
                            )}
                            {getAgendaList(item.tenPointAgenda, item.tenPointAgendas).map((agenda, aIdx) => (
                              <Badge
                                key={aIdx}
                                variant="outline"
                                className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                              >
                                Agenda: {agenda}
                              </Badge>
                            ))}
                            {item.qualityObjective && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                              >
                                ISO: {item.qualityObjective}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* 100% Implementation Progress */}
                        <TableCell className="align-top space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-foreground">{attainment}% / 100%</span>
                            {is100Percent ? (
                              <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4 gap-0.5">
                                <CheckCircle className="h-2.5 w-2.5" /> 100% Achieved
                              </Badge>
                            ) : underWarning ? (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 animate-pulse">
                                <AlertTriangle className="h-2.5 w-2.5" /> Below Target
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-blue-600">
                                In Progress
                              </Badge>
                            )}
                          </div>

                          <Progress
                            value={attainment}
                            className={`h-2 ${
                              is100Percent
                                ? 'bg-emerald-100 dark:bg-emerald-950 [&>div]:bg-emerald-600'
                                : underWarning
                                  ? 'bg-rose-100 dark:bg-rose-950 [&>div]:bg-rose-600'
                                  : 'bg-blue-100 dark:bg-blue-950 [&>div]:bg-blue-600'
                            }`}
                          />

                          {/* Last Monthly Update note */}
                          {item.actualOutput && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                              Output: {item.actualOutput}
                            </div>
                          )}
                        </TableCell>

                        {/* Active Scheduled Months Matrix Chips */}
                        <TableCell className="align-top text-center">
                          <div className="flex flex-wrap justify-center gap-1 max-w-[160px] mx-auto">
                            {MONTH_SHORT.map((mShort, mIdx) => {
                              const mNum = mIdx + 1;
                              const isActive = item.activeMonths?.includes(mNum);
                              const log = item.monthlyAccomplishments?.[mNum];
                              const isLogged = !!log;
                              const isImplemented = log?.implemented !== false && (log?.attainment || 0) > 0;
                              const isCurrent = mNum === currentCalendarMonth;
                              const isMissed =
                                mNum < currentCalendarMonth &&
                                (!isLogged || (!log.implemented && !log.completed && (log.attainment || 0) < 100));

                              if (!isActive) return null;

                              return (
                                <button
                                  key={mNum}
                                  type="button"
                                  onClick={() => handleOpenUpdateModal(item, mNum)}
                                  title={`Month ${mNum} (${mShort}): ${
                                    isLogged
                                      ? isImplemented
                                        ? `Implemented (${log.attainment || 0}%) - Click to edit`
                                        : `Reported: Not Implemented - Click to edit`
                                      : isMissed
                                        ? `WARNING: Planned but not implemented/logged - Click to action`
                                        : 'Click to update monthly activity'
                                  }`}
                                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                    isLogged
                                      ? isImplemented
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 font-bold'
                                        : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 font-bold'
                                      : isMissed
                                        ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-200 font-bold animate-pulse'
                                        : isCurrent
                                          ? 'bg-blue-600 text-white ring-1 ring-blue-400 font-bold'
                                          : 'bg-muted text-muted-foreground border'
                                  }`}
                                >
                                  {mShort} {isLogged ? (isImplemented ? '✓' : '✗') : isMissed ? '⚠️' : ''}
                                </button>
                              );
                            })}
                          </div>
                          <div className="text-[9px] text-muted-foreground mt-1">
                            {item.activeMonths?.length || 0} scheduled months
                          </div>
                        </TableCell>

                        {/* Success Indicator & Evidence */}
                        <TableCell className="align-top space-y-1">
                          <div className="font-medium text-foreground">{item.targetIndicator}</div>
                          {item.movLink && (
                            <a
                              href={item.movLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
                            >
                              <ExternalLink className="h-2.5 w-2.5" /> General MOV Drive
                            </a>
                          )}
                          {/* If any monthly accomplishments have evidence links */}
                          {Object.entries(item.monthlyAccomplishments || {}).some(
                            ([_, entry]) => !!entry.evidenceLink,
                          ) && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {Object.entries(item.monthlyAccomplishments || {})
                                .filter(([_, entry]) => !!entry.evidenceLink)
                                .map(([mKey, entry]) => (
                                  <a
                                    key={mKey}
                                    href={entry.evidenceLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 rounded px-1 py-0.5 flex items-center gap-0.5 hover:underline"
                                    title={`Evidence for ${MONTH_SHORT[Number(mKey) - 1]}: ${entry.evidenceName || 'Document'}`}
                                  >
                                    <FileCheck className="h-2.5 w-2.5 text-blue-600" />
                                    {MONTH_SHORT[Number(mKey) - 1]} Evidence
                                  </a>
                                ))}
                            </div>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="align-top text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              item.status === 'Achieved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : item.status === 'Delayed'
                                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                                  : item.status === 'Ongoing'
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : 'bg-slate-50 text-slate-700'
                            }`}
                          >
                            {item.status || 'Pending'}
                          </Badge>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="align-top text-center">
                          <Button
                            size="sm"
                            variant={underWarning ? 'default' : 'outline'}
                            onClick={() => handleOpenUpdateModal(item)}
                            className={`text-[11px] font-bold h-7 gap-1 shadow-2xs ${
                              underWarning ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''
                            }`}
                          >
                            Update Progress
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Modal: Update Monthly Activity & Implementation Progress */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Update Monthly Activity &amp; Implementation Progress
            </DialogTitle>
            <DialogDescription className="text-xs">
              Log periodic accomplishments, milestone outputs, and adjust attainment towards the 100% implementation
              target.
            </DialogDescription>
          </DialogHeader>

          {selectedQomItem && (
            <div className="space-y-4 py-2 text-xs">
              {/* Deliverable summary card */}
              <div className="p-3 bg-muted/40 border rounded-lg space-y-1">
                <div className="font-bold text-foreground">{selectedQomItem.objectiveText}</div>
                <div className="text-muted-foreground">{selectedQomItem.taskText}</div>
                <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium pt-1">
                  Target: {selectedQomItem.targetIndicator}
                </div>
              </div>

              {/* Month Selector & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-bold">Reporting Month *</Label>
                  <Select
                    value={String(updateMonth)}
                    onValueChange={(val) => {
                      const m = Number(val);
                      setUpdateMonth(m);
                      loadMonthData(selectedQomItem, m);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, idx) => (
                        <SelectItem key={idx + 1} value={String(idx + 1)} className="text-xs">
                          Month {idx + 1}: {name} {idx + 1 === currentCalendarMonth ? '(Current Active)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">Deliverable Status *</Label>
                  <Select value={updateStatus} onValueChange={(val: any) => setUpdateStatus(val)}>
                    <SelectTrigger className="h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ongoing">Ongoing / In Progress</SelectItem>
                      <SelectItem value="Achieved">Achieved (100% Completed)</SelectItem>
                      <SelectItem value="Delayed">Delayed / Needs Catch-up</SelectItem>
                      <SelectItem value="Pending">Pending Milestone Startup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Monthly Implementation Toggle */}
              <div className="p-3 bg-muted/40 border rounded-lg flex items-center justify-between">
                <div>
                  <Label className="font-bold text-foreground">
                    Activity Implemented for {MONTH_NAMES[updateMonth - 1]}?
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {updateImplemented
                      ? 'Yes — The unit executed planned tasks / milestone activities for this month.'
                      : 'No — Activity was not implemented this month (please document justification below).'}
                  </p>
                </div>
                <Switch checked={updateImplemented} onCheckedChange={setUpdateImplemented} />
              </div>

              {/* Implementation Attainment Slider & % Input */}
              <div className="space-y-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-blue-900 dark:text-blue-200">
                    Implementation Attainment Rate (%)
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-base text-blue-700 dark:text-blue-300">
                      {updateAttainment}%
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUpdateAttainment(100);
                        setUpdateStatus('Achieved');
                        setUpdateImplemented(true);
                      }}
                      className="text-[10px] h-6 px-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-0 cursor-pointer"
                    >
                      Set 100% Done
                    </Button>
                  </div>
                </div>

                <Slider
                  value={[updateAttainment]}
                  onValueChange={(val) => {
                    const v = val[0];
                    setUpdateAttainment(v);
                    if (v >= 100) {
                      setUpdateStatus('Achieved');
                      setUpdateImplemented(true);
                    }
                  }}
                  max={100}
                  step={5}
                  className="py-1"
                />

                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>0% (Not Started)</span>
                  <span>50% (Midway)</span>
                  <span className="font-bold text-emerald-600">100% (Fully Implemented)</span>
                </div>
              </div>

              {/* Monthly Activity / Accomplishment Notes */}
              <div className="space-y-1.5">
                <Label className="font-bold">Monthly Implementation Report for {MONTH_NAMES[updateMonth - 1]} *</Label>
                <Textarea
                  placeholder={`Detail the specific activities, programs, meetings, or milestone actions executed for ${MONTH_NAMES[updateMonth - 1]}...`}
                  value={updateActivityNotes}
                  onChange={(e) => setUpdateActivityNotes(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>

              {/* Actual Output */}
              <div className="space-y-1.5">
                <Label className="font-bold">Actual Deliverable Output Produced for this Month</Label>
                <Input
                  placeholder="e.g. Conducted review workshop; 140 participants certified"
                  value={updateOutput}
                  onChange={(e) => setUpdateOutput(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Evidence Document Title & Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-bold">Evidence Document Name / Title</Label>
                  <Input
                    placeholder="e.g. Special Order & Activity Attendance"
                    value={updateEvidenceName}
                    onChange={(e) => setUpdateEvidenceName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold">Means of Verification (MOV) Drive Link</Label>
                  <Input
                    placeholder="https://drive.google.com/..."
                    value={updateMovLink}
                    onChange={(e) => setUpdateMovLink(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <Label className="font-bold">Remarks / Recommendations / Catch-Up Plan</Label>
                <Input
                  placeholder="Notes on constraints, catch-up plans, or continuous improvement adjustments"
                  value={updateRemarks}
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Recorded Monthly History Timeline for this Deliverable */}
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                    Recorded Monthly Reports History ({
                      Object.keys(selectedQomItem.monthlyAccomplishments || {}).length
                    }{' '}
                    Logged)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Each month retains its unique report</span>
                </div>

                {Object.keys(selectedQomItem.monthlyAccomplishments || {}).length === 0 ? (
                  <div className="text-[11px] text-muted-foreground p-3 bg-muted/20 border rounded-md text-center">
                    No monthly accomplishments have been recorded yet for this deliverable.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {MONTH_NAMES.map((name, idx) => {
                      const mNum = idx + 1;
                      const log = selectedQomItem.monthlyAccomplishments?.[mNum];
                      if (!log) return null;

                      return (
                        <div
                          key={mNum}
                          className="p-2.5 rounded-md border bg-background text-xs space-y-1 hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-[10px] font-bold">
                                Month {mNum}: {name}
                              </Badge>
                              <Badge
                                className={`text-[9px] px-1 py-0 h-4 ${
                                  log.implemented !== false ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                                }`}
                              >
                                {log.implemented !== false ? 'Implemented' : 'Not Implemented'}
                              </Badge>
                              {log.attainment !== undefined && (
                                <span className="font-mono font-bold text-[11px] text-blue-600 dark:text-blue-400">
                                  {log.attainment}% Attainment
                                </span>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUpdateMonth(mNum);
                                loadMonthData(selectedQomItem, mNum);
                              }}
                              className="text-[10px] h-5 px-1.5 text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              Edit Month {mNum}
                            </Button>
                          </div>
                          {log.notes && (
                            <p className="text-[11px] text-muted-foreground italic">&quot;{log.notes}&quot;</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
                            {log.output && (
                              <span>
                                Output: <strong className="text-foreground">{log.output}</strong>
                              </span>
                            )}
                            {log.evidenceLink && (
                              <a
                                href={log.evidenceLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                                {log.evidenceName || 'View Evidence Document'}
                              </a>
                            )}
                            {log.reportedBy && <span>Reported by: {log.reportedBy}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUpdateModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveProgress}
              disabled={isSavingUpdate}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs cursor-pointer"
            >
              {isSavingUpdate ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Save Monthly Accomplishment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Unit Risks and Opportunities Register (ROAP) — Aligned with ISO 21001 Clause 6.1 */}
      <Card className="shadow-xs border-t-4 border-t-amber-500 overflow-hidden">
        <CardHeader className="py-4 border-b bg-muted/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-base font-bold">Unit Risks and Opportunities Register (ROAP)</CardTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                >
                  ISO Clause 6.1
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Monitoring unit risks, opportunities, treatment action plans, and mitigation commitments side-by-side
                with operational objectives.
              </CardDescription>
            </div>

            {/* Risk filter buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={riskFilterType === 'all' ? 'default' : 'outline'}
                onClick={() => setRiskFilterType('all')}
                className="text-xs h-7 font-bold px-2.5"
              >
                All ({unitRisks?.length || 0})
              </Button>
              <Button
                size="sm"
                variant={riskFilterType === 'Risk' ? 'default' : 'outline'}
                onClick={() => setRiskFilterType('Risk')}
                className="text-xs h-7 font-bold px-2.5 text-rose-700 border-rose-300 hover:bg-rose-50"
              >
                Risks Only ({unitRisks?.filter((r) => r.type === 'Risk').length || 0})
              </Button>
              <Button
                size="sm"
                variant={riskFilterType === 'Opportunity' ? 'default' : 'outline'}
                onClick={() => setRiskFilterType('Opportunity')}
                className="text-xs h-7 font-bold px-2.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                Opportunities ({unitRisks?.filter((r) => r.type === 'Opportunity').length || 0})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingRisks ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading Unit Risk Register...
            </div>
          ) : !unitRisks || unitRisks.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <Shield className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <div className="font-semibold text-foreground">
                No Registered Risks or Opportunities for AY {selectedYear}
              </div>
              <p className="max-w-md mx-auto">
                No risk or opportunity items have been added to this unit yet. Go to the Risk Register module to
                identify risks, evaluate severity, and formulate treatment action plans.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="text-[11px] font-bold">
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="min-w-[160px]">Operational Objective</TableHead>
                    <TableHead className="min-w-[200px]">Risk / Opportunity Description</TableHead>
                    <TableHead className="w-24 text-center">Rating</TableHead>
                    <TableHead className="min-w-[200px]">Treatment Action Plan</TableHead>
                    <TableHead className="w-28">Target Date</TableHead>
                    <TableHead className="w-24 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {unitRisks
                    .filter((r) => (riskFilterType === 'all' ? true : r.type === riskFilterType))
                    .map((risk) => (
                      <TableRow key={risk.id} className="hover:bg-muted/20">
                        <TableCell className="align-top">
                          <Badge
                            className={`text-[10px] font-bold ${
                              risk.type === 'Risk'
                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                            variant="outline"
                          >
                            {risk.type || 'Risk'}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top font-medium text-foreground">
                          {risk.objective || 'General Operations'}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="font-semibold text-foreground">{risk.description}</div>
                          {risk.currentControls && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              Controls: {risk.currentControls}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              risk.preTreatment?.rating === 'High' || risk.preTreatment?.rating === 'Very High'
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : risk.preTreatment?.rating === 'Medium'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : 'bg-slate-50 text-slate-700'
                            }`}
                          >
                            {risk.preTreatment?.rating || 'Medium'}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="font-medium text-foreground">
                            {risk.treatmentAction || 'Continuous monitoring & operational controls'}
                          </div>
                          {risk.responsiblePersonName && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Lead: {risk.responsiblePersonName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top font-mono text-[11px] text-muted-foreground">
                          {formatRiskTargetDate(risk.targetDate)}
                        </TableCell>
                        <TableCell className="align-top text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              risk.status === 'Closed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : risk.status === 'In Progress'
                                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                                  : 'bg-slate-50 text-slate-700'
                            }`}
                          >
                            {risk.status || 'Open'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
