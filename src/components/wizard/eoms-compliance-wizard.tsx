'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { printSwotAnalysisForm } from './print-swot-form';
import { printInterestedPartiesForm } from './print-interested-parties';
import { printOperationalPlanForm } from '@/components/operational-plan/print-qao-01-025';
import { printQualityObjectivesForm } from './print-quality-objectives';
import { printRiskActionPlanForm } from './print-roap-form';
import type {
  OperationalPlanDocument,
  OperationalPlanItem,
  QualityObjectiveItem,
  Risk,
  VpStrategicGoal,
  SwotAnalysisItem,
  SwotMetadata,
  InterestedPartyItem,
  NeedExpectationPair,
  Unit,
  Campus,
} from '@/lib/types';
import { cn, formatRiskTargetDate } from '@/lib/utils';
import { ARCHIPELAGIC_PILLARS, getAgendaList } from '@/lib/constants';
import { DIGITAL_SUITE_REPORT_TYPES, syncDigitalPlanToSubmissions } from '@/lib/digital-submission-sync';
import {
  Compass,
  Users2,
  FileSpreadsheet,
  CalendarCheck2,
  ShieldAlert,
  Printer,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  Lock,
  Sparkles,
  Loader2,
  Layers,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ListChecks,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const MONTHS_LIST = [
  { num: 1, name: 'Jan' },
  { num: 2, name: 'Feb' },
  { num: 3, name: 'Mar' },
  { num: 4, name: 'Apr' },
  { num: 5, name: 'May' },
  { num: 6, name: 'Jun' },
  { num: 7, name: 'Jul' },
  { num: 8, name: 'Aug' },
  { num: 9, name: 'Sep' },
  { num: 10, name: 'Oct' },
  { num: 11, name: 'Nov' },
  { num: 12, name: 'Dec' },
];

export interface EomsComplianceWizardProps {
  initialStep?: 1 | 2 | 3 | 4 | 5 | 6;
  targetItemId?: string;
  targetMonth?: number;
  onClearTarget?: () => void;
  onNavigateBackToMonitoring?: () => void;
}

export function EomsComplianceWizard({
  initialStep = 1,
  targetItemId,
  targetMonth,
  onClearTarget,
  onNavigateBackToMonitoring,
}: EomsComplianceWizardProps = {}) {
  const firestore = useFirestore();
  const { userProfile, isAdmin, isSupervisor, userRole } = useUser();
  const { toast } = useToast();
  const { selectedYear } = useYear();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(initialStep);
  const [selectedCycle, setSelectedCycle] = useState<'first' | 'final'>('first');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  useEffect(() => {
    if (initialStep && initialStep !== currentStep) {
      setCurrentStep(initialStep);
    }
  }, [initialStep]);

  // Step 1: SWOT State & Status Inquiry
  const [swotStatusState, setSwotStatusState] = useState<'updated' | 'retained' | null>(null);
  const [isSwotModalOpen, setIsSwotModalOpen] = useState(false);
  const [swotFocusArea, setSwotFocusArea] = useState('');
  const [swotStrengths, setSwotStrengths] = useState('');
  const [swotWeaknesses, setSwotWeaknesses] = useState('');
  const [swotOpportunities, setSwotOpportunities] = useState('');
  const [swotThreats, setSwotThreats] = useState('');

  // Step 2: Interested Parties State & Status Inquiry
  const [nedStatusState, setNedStatusState] = useState<'updated' | 'retained' | null>(null);
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [ipPartyName, setIpPartyName] = useState('');
  const [ipPairs, setIpPairs] = useState<NeedExpectationPair[]>([{ need: '', expectation: '' }]);

  const handleAddIpPair = () => {
    setIpPairs((prev) => [...prev, { need: '', expectation: '' }]);
  };

  const handleRemoveIpPair = (index: number) => {
    setIpPairs((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleUpdateIpPair = (index: number, field: 'need' | 'expectation', value: string) => {
    setIpPairs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  // Step 3: Operational Plan Task Modal
  const [isOpModalOpen, setIsOpModalOpen] = useState(false);
  const [opObjectiveMode, setOpObjectiveMode] = useState<'new' | 'existing'>('new');
  const [opObjective, setOpObjective] = useState('');
  const [opVpGoalId, setOpVpGoalId] = useState('none');

  // Step 4: Monthly Progress Update Modal
  const [isQomModalOpen, setIsQomModalOpen] = useState(false);
  const [editingQomItem, setEditingQomItem] = useState<QualityObjectiveItem | null>(null);
  const [qomUpdateMonth, setQomUpdateMonth] = useState<number>(new Date().getMonth() + 1);
  const [qomUpdateAttainment, setQomUpdateAttainment] = useState<number>(0);
  const [qomUpdateStatus, setQomUpdateStatus] = useState<'Pending' | 'Ongoing' | 'Achieved' | 'Delayed'>('Ongoing');
  const [qomUpdateNotes, setQomUpdateNotes] = useState('');
  const [qomUpdateOutput, setQomUpdateOutput] = useState('');
  const [qomUpdateMov, setQomUpdateMov] = useState('');
  const [qomUpdateRemarks, setQomUpdateRemarks] = useState('');
  const [isSavingQomProgress, setIsSavingQomProgress] = useState(false);
  const [opTaskList, setOpTaskList] = useState<
    Array<{
      tasks: string;
      timelineStart: string;
      timelineEnd: string;
      personsResponsible: string;
      resources?: string;
      budget: number;
      successIndicator: string;
      targetMetricValue?: number;
      targetMetricUnit?: string;
      isCollapsed?: boolean;
    }>
  >([
    {
      tasks: '',
      timelineStart: '',
      timelineEnd: '',
      personsResponsible: '',
      resources: '',
      budget: 0,
      successIndicator: '',
      targetMetricValue: 100,
      targetMetricUnit: '%',
      isCollapsed: false,
    },
  ]);

  const handleAddOpTask = () => {
    setOpTaskList((prev) => [
      ...prev.map((t) => ({ ...t, isCollapsed: true })),
      {
        tasks: '',
        timelineStart: '',
        timelineEnd: '',
        personsResponsible: '',
        resources: '',
        budget: 0,
        successIndicator: '',
        targetMetricValue: 100,
        targetMetricUnit: '%',
        isCollapsed: false,
      },
    ]);
  };

  const handleToggleCollapseOpTask = (index: number) => {
    setOpTaskList((prev) => prev.map((t, i) => (i === index ? { ...t, isCollapsed: !t.isCollapsed } : t)));
  };

  const handleCollapseAllOpTasks = (collapsed: boolean) => {
    setOpTaskList((prev) => prev.map((t) => ({ ...t, isCollapsed: collapsed })));
  };

  const handleRemoveOpTask = (index: number) => {
    setOpTaskList((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleUpdateOpTask = (index: number, field: string, value: any) => {
    setOpTaskList((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const handleOpenAddOpModal = (prefilledObjective?: string, prefilledVpGoalId?: string) => {
    if (prefilledObjective) {
      setOpObjective(prefilledObjective);
      setOpVpGoalId(prefilledVpGoalId || 'none');
      setOpObjectiveMode('existing');
    } else {
      setOpObjective('');
      setOpVpGoalId('none');
      setOpObjectiveMode('new');
    }
    setOpTaskList([
      {
        tasks: '',
        timelineStart: '',
        timelineEnd: '',
        personsResponsible: '',
        resources: '',
        budget: 0,
        successIndicator: '',
        targetMetricValue: 100,
        targetMetricUnit: '%',
        isCollapsed: false,
      },
    ]);
    setIsOpModalOpen(true);
  };

  // Step 5: Risk Modal State
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [riskObjective, setRiskObjective] = useState('');
  const [riskType, setRiskType] = useState<'Risk' | 'Opportunity'>('Risk');
  const [riskDescription, setRiskDescription] = useState('');
  const [riskControls, setRiskControls] = useState('');
  const [riskLikelihood, setRiskLikelihood] = useState<number>(3);
  const [riskConsequence, setRiskConsequence] = useState<number>(3);
  const [riskTreatment, setRiskTreatment] = useState('');
  const [riskResources, setRiskResources] = useState('');
  const [riskResponsible, setRiskResponsible] = useState('');
  const [riskTargetDate, setRiskTargetDate] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Units and Campuses
  const allUnitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits } = useCollection<Unit>(allUnitsQuery);

  const allCampusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: allCampuses } = useCollection<Campus>(allCampusesQuery);

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

  // VP Strategic Goals
  const goalsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'vpStrategicGoals'), where('year', '==', selectedYear));
  }, [firestore, selectedYear]);
  const { data: vpGoals } = useCollection<VpStrategicGoal>(goalsQuery);

  // Plan ID key
  const planDocId = useMemo(() => {
    if (!selectedUnitId) return null;
    return `op_${selectedYear}_${selectedCycle}_${selectedUnitId}`;
  }, [selectedYear, selectedCycle, selectedUnitId]);

  const planRef = useMemoFirebase(() => {
    if (!firestore || !planDocId) return null;
    return doc(firestore, 'operationalPlans', planDocId);
  }, [firestore, planDocId]);
  const { data: planDoc } = useDoc<OperationalPlanDocument>(planRef);

  // 1. SWOT items
  const swotQuery = useMemoFirebase(() => {
    if (!firestore || !planDocId) return null;
    return query(collection(firestore, 'swotItems'), where('planId', '==', planDocId));
  }, [firestore, planDocId]);
  const { data: swotItems } = useCollection<SwotAnalysisItem>(swotQuery);

  // 2. Interested Parties items
  const ipQuery = useMemoFirebase(() => {
    if (!firestore || !planDocId) return null;
    return query(collection(firestore, 'interestedPartyItems'), where('planId', '==', planDocId));
  }, [firestore, planDocId]);
  const { data: ipItems } = useCollection<InterestedPartyItem>(ipQuery);

  // 3. Operational Plan items
  const opItemsQuery = useMemoFirebase(() => {
    if (!firestore || !planDocId) return null;
    return query(collection(firestore, 'operationalPlanItems'), where('planId', '==', planDocId));
  }, [firestore, planDocId]);
  const { data: opItems } = useCollection<OperationalPlanItem>(opItemsQuery);

  const sortedOpItems = useMemo(() => {
    if (!opItems) return [];
    return [...opItems].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [opItems]);

  const existingObjectives = useMemo(() => {
    if (!sortedOpItems) return [];
    const map = new Map<string, { objective: string; vpObjectiveId?: string; vpObjectiveTitle?: string }>();
    sortedOpItems.forEach((item) => {
      const obj = item.objective?.trim();
      if (obj && !map.has(obj)) {
        map.set(obj, {
          objective: obj,
          vpObjectiveId: item.vpObjectiveId,
          vpObjectiveTitle: item.vpObjectiveTitle,
        });
      }
    });
    return Array.from(map.values());
  }, [sortedOpItems]);

  const groupedOpItems = useMemo(() => {
    if (!sortedOpItems) return [];
    const groups: Array<{
      objective: string;
      vpObjectiveTitle?: string;
      vpObjectiveId?: string;
      archipelagicPillar?: string;
      sucLevellingKra?: string;
      tenPointAgenda?: string;
      tenPointAgendas?: string[];
      qualityObjective?: string;
      tasks: typeof sortedOpItems;
    }> = [];
    const map = new Map<string, (typeof groups)[0]>();

    sortedOpItems.forEach((item) => {
      const key = item.objective?.trim() || 'General Objective';
      let group = map.get(key);
      if (!group) {
        const goal = vpGoals?.find((g) => g.id === item.vpObjectiveId);
        group = {
          objective: key,
          vpObjectiveTitle: item.vpObjectiveTitle,
          vpObjectiveId: item.vpObjectiveId,
          archipelagicPillar: item.archipelagicPillar || goal?.archipelagicPillar,
          sucLevellingKra: item.sucLevellingKra || goal?.sucLevellingKra,
          tenPointAgenda: item.tenPointAgenda || goal?.tenPointAgenda,
          tenPointAgendas:
            item.tenPointAgendas ||
            goal?.tenPointAgendas ||
            (item.tenPointAgenda ? [item.tenPointAgenda] : goal?.tenPointAgenda ? [goal.tenPointAgenda] : []),
          qualityObjective: item.qualityObjective || goal?.qualityObjective,
          tasks: [],
        };
        map.set(key, group);
        groups.push(group);
      }
      group.tasks.push(item);
    });

    return groups;
  }, [sortedOpItems, vpGoals]);

  // 4. Quality Objectives items
  const qomQuery = useMemoFirebase(() => {
    if (!firestore || !planDocId) return null;
    return query(collection(firestore, 'qualityObjectives'), where('planId', '==', planDocId));
  }, [firestore, planDocId]);
  const { data: qomItems } = useCollection<QualityObjectiveItem>(qomQuery);

  // 5. Risks items
  const risksQuery = useMemoFirebase(() => {
    if (!firestore || !selectedUnitId) return null;
    return query(
      collection(firestore, 'risks'),
      where('unitId', '==', selectedUnitId),
      where('year', '==', selectedYear),
    );
  }, [firestore, selectedUnitId, selectedYear]);
  const { data: allRisks } = useCollection<Risk>(risksQuery);

  const isApproved = planDoc?.status === 'Approved';

  const swotItemsCount = swotItems?.length || 0;
  const ipItemsCount = ipItems?.length || 0;

  // Sync saved status from planDoc
  useEffect(() => {
    if (planDoc?.swotStatus) {
      setSwotStatusState(planDoc.swotStatus);
    }
    if (planDoc?.nedStatus) {
      setNedStatusState(planDoc.nedStatus);
    }
  }, [planDoc?.swotStatus, planDoc?.nedStatus]);

  // If 0 items are on file, the system strictly enforces 'updated' (mandatory data entry)
  const effectiveSwotStatus: 'updated' | 'retained' =
    swotItemsCount === 0 ? 'updated' : swotStatusState || (planDoc?.swotStatus as 'updated' | 'retained') || 'retained';

  const effectiveNedStatus: 'updated' | 'retained' =
    ipItemsCount === 0 ? 'updated' : nedStatusState || (planDoc?.nedStatus as 'updated' | 'retained') || 'retained';

  // Step Navigation Guard
  const navigateToStep = (targetStep: 1 | 2 | 3 | 4 | 5 | 6) => {
    if (targetStep > 1 && swotItemsCount === 0) {
      toast({
        title: 'SWOT Analysis Required',
        description:
          'Under ISO 21001:2018 Clause 4.1, your unit must have at least one SWOT Focus Area recorded before proceeding.',
        variant: 'destructive',
      });
      setCurrentStep(1);
      setIsSwotModalOpen(true);
      return;
    }
    if (targetStep > 2 && ipItemsCount === 0) {
      toast({
        title: 'Interested Parties (NED) Required',
        description:
          'Under ISO 21001:2018 Clause 4.2, your unit must register at least one Stakeholder Group before proceeding to the Operational Plan.',
        variant: 'destructive',
      });
      setCurrentStep(2);
      setIsIpModalOpen(true);
      return;
    }
    setCurrentStep(targetStep);
  };

  // --- Handlers: Step 1 SWOT Status & Entry ---
  const handleSetSwotStatus = async (status: 'updated' | 'retained') => {
    if (status === 'retained' && swotItemsCount === 0) {
      toast({
        title: 'Mandatory Data Entry Required',
        description:
          'No prior SWOT records found on file for this unit. You must encode at least one focus area before selecting "No Changes".',
        variant: 'destructive',
      });
      setIsSwotModalOpen(true);
      return;
    }
    setSwotStatusState(status);
    if (!firestore || !planDocId || !userProfile || !selectedUnitId) return;
    try {
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
          preparedById: userProfile.id,
          preparedByName: `${userProfile.firstName} ${userProfile.lastName}`,
          preparedAt: serverTimestamp(),
          swotStatus: status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(firestore, 'operationalPlans', planDocId), {
          swotStatus: status,
          updatedAt: serverTimestamp(),
        });
      }
      toast({
        title: status === 'updated' ? 'SWOT Update Mode Active' : 'SWOT Baseline Retained',
        description:
          status === 'updated'
            ? 'You can now encode new or updated focus areas below.'
            : `Retaining ${swotItemsCount} existing focus areas for AY ${selectedYear}.`,
      });
    } catch (err: any) {
      console.error('Failed to update SWOT status:', err);
    }
  };

  const handleSaveSwot = async () => {
    if (!firestore || !userProfile || !planDocId || !selectedUnitId) return;
    if (!swotFocusArea.trim()) {
      toast({ title: 'Focus Area Required', description: 'Please provide a focus area name.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
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
          preparedById: userProfile.id,
          preparedByName: `${userProfile.firstName} ${userProfile.lastName}`,
          preparedAt: serverTimestamp(),
          swotStatus: 'updated',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (planDoc.swotStatus !== 'updated') {
        await updateDoc(doc(firestore, 'operationalPlans', planDocId), {
          swotStatus: 'updated',
          updatedAt: serverTimestamp(),
        });
      }

      await addDoc(collection(firestore, 'swotItems'), {
        planId: planDocId,
        unitId: selectedUnitId,
        year: selectedYear,
        focusArea: swotFocusArea.trim(),
        strengths: swotStrengths.trim(),
        weaknesses: swotWeaknesses.trim(),
        opportunities: swotOpportunities.trim(),
        threats: swotThreats.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSwotStatusState('updated');
      toast({ title: 'SWOT Focus Area Added', description: 'Internal & external factors saved.' });
      setIsSwotModalOpen(false);
      setSwotFocusArea('');
      setSwotStrengths('');
      setSwotWeaknesses('');
      setSwotOpportunities('');
      setSwotThreats('');
    } catch (e: any) {
      toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSwot = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'swotItems', id));
      toast({ title: 'SWOT Area Removed' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // --- Handlers: Step 2 Interested Parties Status & Entry ---
  const handleSetNedStatus = async (status: 'updated' | 'retained') => {
    if (status === 'retained' && ipItemsCount === 0) {
      toast({
        title: 'Mandatory Data Entry Required',
        description:
          'No prior Interested Parties found on file for this unit. You must register at least one stakeholder group before selecting "No Changes".',
        variant: 'destructive',
      });
      setIsIpModalOpen(true);
      return;
    }
    setNedStatusState(status);
    if (!firestore || !planDocId || !userProfile || !selectedUnitId) return;
    try {
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
          preparedById: userProfile.id,
          preparedByName: `${userProfile.firstName} ${userProfile.lastName}`,
          preparedAt: serverTimestamp(),
          nedStatus: status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(firestore, 'operationalPlans', planDocId), {
          nedStatus: status,
          updatedAt: serverTimestamp(),
        });
      }
      toast({
        title: status === 'updated' ? 'NED Update Mode Active' : 'NED Baseline Retained',
        description:
          status === 'updated'
            ? 'You can now encode new or updated stakeholder requirements below.'
            : `Retaining ${ipItemsCount} registered stakeholder groups for AY ${selectedYear}.`,
      });
    } catch (err: any) {
      console.error('Failed to update NED status:', err);
    }
  };

  const handleSaveIp = async () => {
    if (!firestore || !userProfile || !planDocId || !selectedUnitId) return;
    if (!ipPartyName.trim()) {
      toast({
        title: 'Party Name Required',
        description: 'Please specify the stakeholder group.',
        variant: 'destructive',
      });
      return;
    }

    const validPairs = ipPairs
      .map((p) => ({ need: p.need.trim(), expectation: p.expectation.trim() }))
      .filter((p) => p.need.length > 0 || p.expectation.length > 0);

    if (validPairs.length === 0) {
      toast({
        title: 'Needs & Expectations Required',
        description: 'Please input at least 1 Need and Expectation pair.',
        variant: 'destructive',
      });
      return;
    }

    const formattedNeeds = validPairs
      .map((p, i) => (validPairs.length > 1 ? `${i + 1}. ${p.need}` : p.need))
      .join('\n');
    const formattedExpectations = validPairs
      .map((p, i) => (validPairs.length > 1 ? `${i + 1}. ${p.expectation}` : p.expectation))
      .join('\n');

    setIsSaving(true);
    try {
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
          preparedById: userProfile.id,
          preparedByName: `${userProfile.firstName} ${userProfile.lastName}`,
          preparedAt: serverTimestamp(),
          nedStatus: 'updated',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (planDoc.nedStatus !== 'updated') {
        await updateDoc(doc(firestore, 'operationalPlans', planDocId), {
          nedStatus: 'updated',
          updatedAt: serverTimestamp(),
        });
      }

      await addDoc(collection(firestore, 'interestedPartyItems'), {
        planId: planDocId,
        unitId: selectedUnitId,
        year: selectedYear,
        partyName: ipPartyName.trim(),
        needs: formattedNeeds,
        expectations: formattedExpectations,
        pairs: validPairs,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNedStatusState('updated');
      toast({ title: 'Stakeholder Added', description: `${validPairs.length} paired needs & expectations recorded.` });
      setIsIpModalOpen(false);
      setIpPartyName('');
      setIpPairs([{ need: '', expectation: '' }]);
    } catch (e: any) {
      toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteIp = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'interestedPartyItems', id));
      toast({ title: 'Stakeholder Removed' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteOpItem = async (id: string) => {
    if (!firestore || isApproved) return;
    try {
      await deleteDoc(doc(firestore, 'operationalPlanItems', id));
      toast({ title: 'Task Removed' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // --- Handlers: Step 3 Operational Plan ---
  const handleSaveOpItem = async (closeModal: boolean = true) => {
    if (!firestore || !userProfile || !planDocId || !selectedUnitId) return;
    if (!opObjective.trim()) {
      toast({
        title: 'Objective Statement Required',
        description: 'Please provide or select an Objective Statement.',
        variant: 'destructive',
      });
      return;
    }

    const validTasks = opTaskList
      .map((t) => ({
        ...t,
        tasks: t.tasks.trim(),
        timelineStart: t.timelineStart.trim(),
        timelineEnd: t.timelineEnd.trim(),
        personsResponsible: t.personsResponsible.trim(),
        resources: t.resources?.trim() || '',
        budget: Number(t.budget) || 0,
        successIndicator: t.successIndicator.trim(),
        targetMetricValue: Number(t.targetMetricValue) || 100,
        targetMetricUnit: t.targetMetricUnit?.trim() || '%',
      }))
      .filter((t) => t.tasks.length > 0 || t.successIndicator.length > 0);

    if (validTasks.length === 0) {
      toast({
        title: 'Task Details Missing',
        description: 'Please input at least 1 Task/Activity and Success Indicator.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const vpGoal = vpGoals?.find((g) => g.id === opVpGoalId);

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
          preparedById: userProfile.id,
          preparedByName: `${userProfile.firstName} ${userProfile.lastName}`,
          preparedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      let currentOrder = sortedOpItems.length || 0;
      const goalAgendas =
        vpGoal?.tenPointAgendas && vpGoal.tenPointAgendas.length > 0
          ? vpGoal.tenPointAgendas
          : vpGoal?.tenPointAgenda
            ? [vpGoal.tenPointAgenda]
            : [];

      for (const t of validTasks) {
        currentOrder += 1;
        await addDoc(collection(firestore, 'operationalPlanItems'), {
          planId: planDocId,
          unitId: selectedUnitId,
          year: selectedYear,
          sortOrder: currentOrder,
          objective: opObjective.trim(),
          vpObjectiveId: opVpGoalId === 'none' ? '' : opVpGoalId,
          vpObjectiveTitle: vpGoal?.title || '',
          archipelagicPillar: vpGoal?.archipelagicPillar || '',
          sucLevellingKra: vpGoal?.sucLevellingKra || '',
          tenPointAgenda: vpGoal?.tenPointAgenda || goalAgendas[0] || '',
          tenPointAgendas: goalAgendas,
          qualityObjective: vpGoal?.qualityObjective || '',
          tasks: t.tasks,
          timelineStart: t.timelineStart,
          timelineEnd: t.timelineEnd,
          personsResponsible: t.personsResponsible,
          resources: t.resources,
          budget: t.budget,
          successIndicator: t.successIndicator,
          targetMetricValue: t.targetMetricValue,
          targetMetricUnit: t.targetMetricUnit,
          isBaselineLocked: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Synchronize with Quality Objectives Monitoring
        await addDoc(collection(firestore, 'qualityObjectives'), {
          planId: planDocId,
          unitId: selectedUnitId,
          year: selectedYear,
          cycleId: selectedCycle,
          objectiveText: opObjective.trim(),
          taskText: t.tasks,
          archipelagicPillar: vpGoal?.archipelagicPillar || '',
          sucLevellingKra: vpGoal?.sucLevellingKra || '',
          tenPointAgenda: vpGoal?.tenPointAgenda || goalAgendas[0] || '',
          tenPointAgendas: goalAgendas,
          qualityObjective: vpGoal?.qualityObjective || '',
          targetIndicator: t.successIndicator,
          activeMonths: [1, 2, 3, 4],
          responsiblePerson: t.personsResponsible || userProfile.firstName,
          status: 'Pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (closeModal) {
        toast({
          title: 'Operational Tasks Saved',
          description: `Successfully added ${validTasks.length} task(s) for objective: "${opObjective.trim()}".`,
        });
        setIsOpModalOpen(false);
        setOpObjective('');
        setOpVpGoalId('none');
        setOpTaskList([
          {
            tasks: '',
            timelineStart: '',
            timelineEnd: '',
            personsResponsible: '',
            resources: '',
            budget: 0,
            successIndicator: '',
            targetMetricValue: 100,
            targetMetricUnit: '%',
            isCollapsed: false,
          },
        ]);
      } else {
        toast({
          title: 'Task Saved to Database',
          description: `Saved ${validTasks.length} task(s). You can enter another task below without exiting the dialog.`,
        });
        // Stay in modal! Switch to existing objective mode with current objective retained
        setOpObjectiveMode('existing');
        setOpTaskList([
          {
            tasks: '',
            timelineStart: '',
            timelineEnd: '',
            personsResponsible: '',
            resources: '',
            budget: 0,
            successIndicator: '',
            targetMetricValue: 100,
            targetMetricUnit: '%',
            isCollapsed: false,
          },
        ]);
      }
    } catch (e: any) {
      toast({ title: 'Error Saving Task', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Handlers: Step 4 Month Toggle ---
  const handleToggleMonth = async (qomId: string, currentMonths: number[], monthNum: number) => {
    if (!firestore || isApproved) return;
    const updated = currentMonths.includes(monthNum)
      ? currentMonths.filter((m) => m !== monthNum)
      : [...currentMonths, monthNum].sort((a, b) => a - b);
    try {
      await updateDoc(doc(firestore, 'qualityObjectives', qomId), {
        activeMonths: updated,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleOpenQomModal = (item: QualityObjectiveItem, defaultMonth?: number) => {
    setEditingQomItem(item);
    const m = defaultMonth || new Date().getMonth() + 1;
    setQomUpdateMonth(m);
    setQomUpdateAttainment(item.attainmentPercentage || (item.status === 'Achieved' ? 100 : 0));
    setQomUpdateStatus(item.status || 'Ongoing');
    const existingLog = item.monthlyAccomplishments?.[m];
    setQomUpdateNotes(existingLog?.notes || item.remarks || '');
    setQomUpdateOutput(existingLog?.output || item.actualOutput || '');
    setQomUpdateMov(item.movLink || '');
    setQomUpdateRemarks(item.remarks || '');
    setIsQomModalOpen(true);
  };

  // Auto-open modal when navigating from Quality Objectives Monitoring tab with a target item
  const hasTriggeredTargetModalRef = useRef(false);

  useEffect(() => {
    if (!targetItemId) {
      hasTriggeredTargetModalRef.current = false;
      return;
    }
    if (hasTriggeredTargetModalRef.current) return;

    // 1. Direct match in qomItems
    const directMatch = qomItems?.find(
      (q) =>
        q.id === targetItemId ||
        q.opItemId === targetItemId ||
        `syn_${q.opItemId}` === targetItemId ||
        `syn_${q.id}` === targetItemId ||
        targetItemId.includes(q.id),
    );

    if (directMatch) {
      hasTriggeredTargetModalRef.current = true;
      setCurrentStep(4);
      handleOpenQomModal(directMatch, targetMonth);
      if (onClearTarget) onClearTarget();
      return;
    }

    // 2. Match in sortedOpItems (synthesizing / initializing doc in Firestore if needed)
    if (sortedOpItems && sortedOpItems.length > 0) {
      const opMatch = sortedOpItems.find(
        (op) => op.id === targetItemId || `syn_${op.id}` === targetItemId || targetItemId.includes(op.id),
      );

      if (opMatch && firestore && planDocId && selectedUnitId) {
        hasTriggeredTargetModalRef.current = true;
        setCurrentStep(4);
        (async () => {
          try {
            const newDocRef = await addDoc(collection(firestore, 'qualityObjectives'), {
              planId: planDocId,
              unitId: selectedUnitId,
              year: selectedYear,
              cycleId: selectedCycle,
              objectiveText: opMatch.objective || 'Unit Quality Objective',
              taskText: opMatch.tasks || 'Action Plan Task',
              targetIndicator: opMatch.successIndicator || '100% completion',
              activeMonths: [1, 2, 3, 4],
              responsiblePerson: opMatch.personsResponsible || userProfile?.firstName || 'QA Unit',
              status: opMatch.isCompleted ? 'Achieved' : 'Ongoing',
              opItemId: opMatch.id,
              attainmentPercentage: opMatch.attainmentPercentage || 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            const newItem: QualityObjectiveItem = {
              id: newDocRef.id,
              planId: planDocId,
              unitId: selectedUnitId,
              year: selectedYear,
              cycleId: selectedCycle,
              objectiveText: opMatch.objective || 'Unit Quality Objective',
              taskText: opMatch.tasks || 'Action Plan Task',
              targetIndicator: opMatch.successIndicator || '100% completion',
              activeMonths: [1, 2, 3, 4],
              responsiblePerson: opMatch.personsResponsible || userProfile?.firstName || 'QA Unit',
              status: opMatch.isCompleted ? 'Achieved' : 'Ongoing',
              opItemId: opMatch.id,
              attainmentPercentage: opMatch.attainmentPercentage || 0,
              createdAt: new Date().toISOString(),
            };

            handleOpenQomModal(newItem, targetMonth);
            if (onClearTarget) onClearTarget();
          } catch (err) {
            console.error('Error auto-initializing Quality Objective for target item:', err);
          }
        })();
      }
    }
  }, [
    targetItemId,
    qomItems,
    sortedOpItems,
    firestore,
    planDocId,
    selectedUnitId,
    selectedYear,
    selectedCycle,
    targetMonth,
    onClearTarget,
    userProfile,
  ]);

  const handleSaveQomProgress = async () => {
    if (!firestore || !editingQomItem) return;
    setIsSavingQomProgress(true);
    try {
      const isAchieved = qomUpdateAttainment >= 100 || qomUpdateStatus === 'Achieved';
      const finalStatus = isAchieved ? 'Achieved' : qomUpdateStatus;
      const reporterName = userProfile
        ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()
        : 'Unit Staff';

      const monthlyAccomplishments = {
        ...(editingQomItem.monthlyAccomplishments || {}),
        [qomUpdateMonth]: {
          implemented: true,
          completed: isAchieved,
          notes: qomUpdateNotes.trim(),
          output: qomUpdateOutput.trim(),
          attainment: qomUpdateAttainment,
          evidenceLink: qomUpdateMov.trim(),
          reportedBy: reporterName,
          date: new Date().toISOString(),
        },
      };

      await updateDoc(doc(firestore, 'qualityObjectives', editingQomItem.id), {
        attainmentPercentage: qomUpdateAttainment,
        status: finalStatus,
        actualOutput: qomUpdateOutput.trim() || editingQomItem.actualOutput || '',
        movLink: qomUpdateMov.trim() || editingQomItem.movLink || '',
        remarks: qomUpdateRemarks.trim(),
        monthlyAccomplishments,
        updatedAt: serverTimestamp(),
      });

      // Synchronize operationalPlanItems row if found
      const matchedOp = sortedOpItems?.find(
        (op) =>
          (editingQomItem.opItemId && op.id === editingQomItem.opItemId) ||
          (op.objective?.trim() === editingQomItem.objectiveText?.trim() &&
            op.tasks?.trim() === editingQomItem.taskText?.trim()),
      );
      if (matchedOp) {
        await updateDoc(doc(firestore, 'operationalPlanItems', matchedOp.id), {
          attainmentPercentage: qomUpdateAttainment,
          actualMetricValue: qomUpdateAttainment,
          isCompleted: isAchieved,
          progressUpdates: qomUpdateNotes.trim() || qomUpdateOutput.trim() || matchedOp.progressUpdates || '',
          remarks: qomUpdateRemarks.trim() || matchedOp.remarks || '',
          movDriveLink: qomUpdateMov.trim() || matchedOp.movDriveLink || '',
          updatedAt: serverTimestamp(),
        });
      }

      toast({
        title: isAchieved ? '100% Attained!' : 'Progress Saved',
        description: `Month ${qomUpdateMonth} updated to ${qomUpdateAttainment}% implementation. The "Updated" tag has been added to the Quality Objectives Monitoring Matrix.`,
      });
      setIsQomModalOpen(false);
    } catch (e: any) {
      toast({ title: 'Error Saving Progress', description: e.message, variant: 'destructive' });
    } finally {
      setIsSavingQomProgress(false);
    }
  };

  // --- Handlers: Step 5 Risk & ROAP ---
  const calculatedMagnitude = riskLikelihood * riskConsequence;
  const calculatedRating = calculatedMagnitude >= 10 ? 'High' : calculatedMagnitude >= 5 ? 'Medium' : 'Low';
  const requiresRoap = calculatedRating === 'Medium' || calculatedRating === 'High';

  const handleSaveRisk = async () => {
    if (!firestore || !userProfile || !selectedUnitId) return;
    if (!riskObjective.trim() || !riskDescription.trim()) {
      toast({
        title: 'Required Fields Missing',
        description: 'Please select an Objective and enter Description.',
        variant: 'destructive',
      });
      return;
    }
    if (requiresRoap && !riskTreatment.trim()) {
      toast({
        title: 'Action Plan Required',
        description: `${calculatedRating} risks require a Treatment Action Plan under ISO Clause 6.1.`,
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'risks'), {
        userId: userProfile.id,
        unitId: selectedUnitId,
        campusId: currentUnit?.campusIds?.[0] || userProfile.campusId || 'Main',
        year: selectedYear,
        cycleId: selectedCycle,
        objective: riskObjective.trim(),
        type: riskType,
        description: riskDescription.trim(),
        currentControls: riskControls.trim() || 'Standard operational oversight',
        preTreatment: {
          likelihood: riskLikelihood,
          consequence: riskConsequence,
          magnitude: calculatedMagnitude,
          rating: calculatedRating,
        },
        treatmentAction: riskTreatment.trim(),
        resourcesNeeded: riskResources.trim(),
        responsiblePersonName: riskResponsible.trim() || `${userProfile.firstName} ${userProfile.lastName}`,
        targetDate: riskTargetDate.trim() || 'Q4',
        status: 'Open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Risk Evaluated & Saved' });
      setIsRiskModalOpen(false);
      setRiskDescription('');
      setRiskTreatment('');
    } catch (e: any) {
      toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Submit Complete Compliance Package ---
  const handleSubmitAll = async () => {
    if (!firestore || !userProfile || !planDocId) return;
    setIsSubmitting(true);
    try {
      const submittedAt = new Date();
      await updateDoc(doc(firestore, 'operationalPlans', planDocId), {
        status: 'Submitted',
        preparedById: userProfile.id,
        preparedByName: `${userProfile.firstName} ${userProfile.lastName}`,
        preparedAt: serverTimestamp(),
        submittedAt,
        updatedAt: serverTimestamp(),
      });

      await syncDigitalPlanToSubmissions({
        firestore,
        plan: {
          ...(planDoc || {}),
          id: planDocId,
          unitId: selectedUnitId,
          unitName: currentUnit?.name || userProfile.unitName || 'Unit',
          campusId: currentUnit?.campusIds?.[0] || userProfile.campusId || 'Main',
          year: selectedYear,
          cycleId: selectedCycle,
          status: 'Submitted',
          preparedById: userProfile.id,
          preparedByName: `${userProfile.firstName} ${userProfile.lastName}`,
          submittedAt,
        } as OperationalPlanDocument,
        reportTypes: DIGITAL_SUITE_REPORT_TYPES,
        status: 'submitted',
        effectiveDate: submittedAt,
        actor: {
          id: userProfile.id,
          name: `${userProfile.firstName} ${userProfile.lastName}`,
          role: userRole || 'User',
        },
      });

      toast({
        title: 'Full EOMS Suite Submitted!',
        description:
          'SWOT, Interested Parties, Operational Plan, Objectives Monitoring, and Risk Registry submitted for VP review.',
      });
    } catch (e: any) {
      toast({ title: 'Submission Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Stepper Header (6 Steps) */}
      <Card className="border-2 border-primary/20 shadow-xs">
        <CardHeader className="py-3.5 bg-primary/5 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-black uppercase tracking-tight">
                  Comprehensive EOMS Compliance Suite (ISO 21001:2018)
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Context (SWOT) ──&gt; Stakeholders (Interested Parties) ──&gt; Operational Plan ──&gt; Monitoring ──&gt;
                Risk &amp; ROAP
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-bold px-2.5 py-1 bg-background">
                AY {selectedYear}
              </Badge>
              <Select value={selectedCycle} onValueChange={(val: 'first' | 'final') => setSelectedCycle(val)}>
                <SelectTrigger className="w-[145px] h-8 text-xs font-bold bg-background">
                  <SelectValue placeholder="Cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first" className="text-xs font-semibold">
                    1st Cycle (Planning)
                  </SelectItem>
                  <SelectItem value="final" className="text-xs font-semibold">
                    Final Cycle (Terminal)
                  </SelectItem>
                </SelectContent>
              </Select>
              {isApproved && (
                <Badge className="bg-emerald-600 text-white font-bold gap-1 text-xs">
                  <Lock className="h-3 w-3" /> Approved &amp; Locked
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            {/* Step 1: SWOT */}
            <button
              onClick={() => navigateToStep(1)}
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all ${
                currentStep === 1
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                  : 'bg-muted/30 hover:bg-muted text-foreground'
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${currentStep === 1 ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/20'}`}
              >
                1
              </div>
              <div className="truncate flex-1">
                <div className="font-bold truncate flex items-center justify-between">
                  <span>1. SWOT</span>
                  {swotItemsCount === 0 && (
                    <span className="text-[8.5px] px-1 py-0 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold ml-1">
                      Req
                    </span>
                  )}
                </div>
                <div className="text-[9.5px] opacity-80">QAO-01-001</div>
              </div>
            </button>

            {/* Step 2: Interested Parties */}
            <button
              onClick={() => navigateToStep(2)}
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all ${
                currentStep === 2
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                  : 'bg-muted/30 hover:bg-muted text-foreground'
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${currentStep === 2 ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/20'}`}
              >
                2
              </div>
              <div className="truncate flex-1">
                <div className="font-bold truncate flex items-center justify-between">
                  <span>2. NED</span>
                  {ipItemsCount === 0 && (
                    <span className="text-[8.5px] px-1 py-0 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold ml-1">
                      Req
                    </span>
                  )}
                </div>
                <div className="text-[9.5px] opacity-80">QAO-01-003</div>
              </div>
            </button>

            {/* Step 3: Operational Plan */}
            <button
              onClick={() => navigateToStep(3)}
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all ${
                currentStep === 3
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                  : 'bg-muted/30 hover:bg-muted text-foreground'
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${currentStep === 3 ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/20'}`}
              >
                3
              </div>
              <div className="truncate flex-1">
                <div className="font-bold truncate">3. Oper. Plan</div>
                <div className="text-[9.5px] opacity-80">QAO-01-025</div>
              </div>
            </button>

            {/* Step 4: Monthly Setting */}
            <button
              onClick={() => navigateToStep(4)}
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all ${
                currentStep === 4
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                  : 'bg-muted/30 hover:bg-muted text-foreground'
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${currentStep === 4 ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/20'}`}
              >
                4
              </div>
              <div className="truncate flex-1">
                <div className="font-bold truncate">4. Objectives</div>
                <div className="text-[9.5px] opacity-80">12-Mo. Matrix</div>
              </div>
            </button>

            {/* Step 5: Risk & ROAP */}
            <button
              onClick={() => navigateToStep(5)}
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all ${
                currentStep === 5
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                  : 'bg-muted/30 hover:bg-muted text-foreground'
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${currentStep === 5 ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/20'}`}
              >
                5
              </div>
              <div className="truncate flex-1">
                <div className="font-bold truncate">5. Risk / ROAP</div>
                <div className="text-[9.5px] opacity-80">QAO-00-027</div>
              </div>
            </button>

            {/* Step 6: 6-in-1 Print Hub */}
            <button
              onClick={() => navigateToStep(6)}
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all ${
                currentStep === 6
                  ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                  : 'bg-muted/30 hover:bg-muted text-foreground'
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${currentStep === 6 ? 'bg-white text-emerald-700' : 'bg-muted-foreground/20'}`}
              >
                6
              </div>
              <div className="truncate flex-1">
                <div className="font-bold truncate">6. Official Forms</div>
                <div className="text-[9.5px] opacity-80">6-in-1 Print Hub</div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* STEP 1: SWOT ANALYSIS (FORM QAO-01-001)                  */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <Card className="shadow-xs animate-in fade-in duration-300">
          <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary" />
                Step 1: Context of the Organization — SWOT Analysis (Form QAO-01-001)
              </CardTitle>
              <CardDescription className="text-xs">
                Assess internal values, culture, and capabilities (Strengths &amp; Weaknesses) and external environments
                (Opportunities &amp; Threats).
              </CardDescription>
            </div>
            {!isApproved && (
              <Button size="sm" onClick={() => setIsSwotModalOpen(true)} className="text-xs font-bold gap-1 shadow-xs">
                <Plus className="h-3.5 w-3.5" /> Add Focus Area
              </Button>
            )}
          </CardHeader>

          {/* Status Inquiry & Validation Banner */}
          <div className="p-4 bg-muted/40 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-primary" />
                  SWOT Analysis Status Inquiry (ISO 21001:2018 Clause 4.1)
                </div>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  Does your unit have an updated SWOT Analysis for AY {selectedYear}?
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant={effectiveSwotStatus === 'updated' ? 'default' : 'outline'}
                  onClick={() => handleSetSwotStatus('updated')}
                  disabled={isApproved}
                  className="text-xs font-bold shadow-xs"
                >
                  Yes, We Have Updates to Encode
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={effectiveSwotStatus === 'retained' ? 'secondary' : 'outline'}
                  onClick={() => handleSetSwotStatus('retained')}
                  disabled={isApproved || swotItemsCount === 0}
                  className={`text-xs font-bold ${effectiveSwotStatus === 'retained' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                >
                  No Changes (Retain Existing Baseline)
                </Button>
              </div>
            </div>

            {/* Dynamic Status / Auto-Requirement Message */}
            {swotItemsCount === 0 ? (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-bold">Mandatory Data Entry Required:</span> No SWOT analysis entries are
                  recorded for your unit in AY {selectedYear}. Under ISO 21001:2018 Clause 4.1, you cannot select
                  &quot;No Changes&quot; without an initial baseline. Please encode at least one Focus Area below.
                </div>
              </div>
            ) : effectiveSwotStatus === 'retained' ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Baseline Confirmed:</strong> Your unit is retaining the{' '}
                    <strong>{swotItemsCount} existing focus areas</strong> on file for AY {selectedYear}. You may
                    proceed to Step 2, or switch to &quot;Yes, We Have Updates&quot; to add new entries.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200 text-xs">
                <span>
                  <strong>Data Entry Active:</strong> Review your internal (Strengths, Weaknesses) and external
                  (Opportunities, Threats) factors below. Click &quot;Add Focus Area&quot; to encode new items.
                </span>
                {!isApproved && (
                  <Button
                    size="sm"
                    onClick={() => setIsSwotModalOpen(true)}
                    className="h-7 text-xs font-bold gap-1 shrink-0 ml-2 shadow-xs"
                  >
                    <Plus className="h-3 w-3" /> Add Focus Area
                  </Button>
                )}
              </div>
            )}
          </div>

          <CardContent className="p-0">
            {!swotItems || swotItems.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-muted/10">
                <Compass className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-bold text-muted-foreground">No focus areas recorded yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsSwotModalOpen(true)}
                  className="text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Focus Area (e.g. Instruction, Research, Facilities)
                </Button>
              </div>
            ) : (
              <Table className="text-xs">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold min-w-[130px]">Focus Area</TableHead>
                    <TableHead className="font-bold min-w-[150px]">Strengths (Internal)</TableHead>
                    <TableHead className="font-bold min-w-[150px]">Weaknesses (Internal)</TableHead>
                    <TableHead className="font-bold min-w-[150px]">Opportunities (External)</TableHead>
                    <TableHead className="font-bold min-w-[150px]">Threats (External)</TableHead>
                    <TableHead className="w-12 text-center font-bold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {swotItems.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-bold align-top bg-muted/10">{s.focusArea}</TableCell>
                      <TableCell className="align-top text-emerald-800 dark:text-emerald-300">
                        {s.strengths || '—'}
                      </TableCell>
                      <TableCell className="align-top text-rose-800 dark:text-rose-300">
                        {s.weaknesses || '—'}
                      </TableCell>
                      <TableCell className="align-top text-blue-800 dark:text-blue-300">
                        {s.opportunities || '—'}
                      </TableCell>
                      <TableCell className="align-top text-amber-800 dark:text-amber-300">{s.threats || '—'}</TableCell>
                      <TableCell className="text-center align-top">
                        {!isApproved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => handleDeleteSwot(s.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="py-3 px-4 bg-muted/20 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{swotItems?.length || 0} focus areas evaluated</span>
            <Button size="sm" onClick={() => navigateToStep(2)} className="text-xs font-bold gap-1 shadow-xs">
              Next: Step 2 Interested Parties <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ======================================================== */}
      {/* STEP 2: NEEDS OF INTERESTED PARTIES (FORM QAO-01-003)    */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <Card className="shadow-xs animate-in fade-in duration-300">
          <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users2 className="h-4 w-4 text-primary" />
                Step 2: Needs &amp; Expectations of Interested Parties (Form QAO-01-003)
              </CardTitle>
              <CardDescription className="text-xs">
                Identify key stakeholders (Students, Faculty, Regulators, Community) and map their Stated Needs vs.
                Implied Expectations.
              </CardDescription>
            </div>
            {!isApproved && (
              <Button size="sm" onClick={() => setIsIpModalOpen(true)} className="text-xs font-bold gap-1 shadow-xs">
                <Plus className="h-3.5 w-3.5" /> Add Stakeholder Group
              </Button>
            )}
          </CardHeader>

          {/* Status Inquiry & Validation Banner */}
          <div className="p-4 bg-muted/40 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-primary" />
                  NED Status Inquiry (ISO 21001:2018 Clause 4.2)
                </div>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  Does your unit have updated Needs &amp; Expectations of Interested Parties (NED) for AY {selectedYear}
                  ?
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant={effectiveNedStatus === 'updated' ? 'default' : 'outline'}
                  onClick={() => handleSetNedStatus('updated')}
                  disabled={isApproved}
                  className="text-xs font-bold shadow-xs"
                >
                  Yes, We Have Updates to Encode
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={effectiveNedStatus === 'retained' ? 'secondary' : 'outline'}
                  onClick={() => handleSetNedStatus('retained')}
                  disabled={isApproved || ipItemsCount === 0}
                  className={`text-xs font-bold ${effectiveNedStatus === 'retained' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                >
                  No Changes (Retain Existing Baseline)
                </Button>
              </div>
            </div>

            {/* Dynamic Status / Auto-Requirement Message */}
            {ipItemsCount === 0 ? (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-bold">Mandatory Data Entry Required:</span> No stakeholder groups or interested
                  parties are recorded for your unit in AY {selectedYear}. Under ISO 21001:2018 Clause 4.2, you cannot
                  select &quot;No Changes&quot; without an initial baseline. Please register at least one Stakeholder
                  Group below.
                </div>
              </div>
            ) : effectiveNedStatus === 'retained' ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Baseline Confirmed:</strong> Your unit is retaining the{' '}
                    <strong>{ipItemsCount} registered stakeholder groups</strong> on file for AY {selectedYear}. You may
                    proceed to Step 3, or switch to &quot;Yes, We Have Updates&quot; to add new entries.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200 text-xs">
                <span>
                  <strong>Data Entry Active:</strong> Review your stakeholders (Students, Faculty, Regulators,
                  Community) and their Stated Needs vs Implied Expectations.
                </span>
                {!isApproved && (
                  <Button
                    size="sm"
                    onClick={() => setIsIpModalOpen(true)}
                    className="h-7 text-xs font-bold gap-1 shrink-0 ml-2 shadow-xs"
                  >
                    <Plus className="h-3 w-3" /> Add Stakeholder Group
                  </Button>
                )}
              </div>
            )}
          </div>

          <CardContent className="p-0">
            {!ipItems || ipItems.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-muted/10">
                <Users2 className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-bold text-muted-foreground">No interested parties registered yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsIpModalOpen(true)}
                  className="text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add First Stakeholder (e.g. Learners / Students)
                </Button>
              </div>
            ) : (
              <Table className="text-xs">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-10 text-center font-bold">#</TableHead>
                    <TableHead className="font-bold min-w-[180px]">Interested Parties</TableHead>
                    <TableHead className="font-bold min-w-[220px]">Needs (Stated Services)</TableHead>
                    <TableHead className="font-bold min-w-[220px]">Expectations (Implied Requirements)</TableHead>
                    <TableHead className="w-12 text-center font-bold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ipItems.map((item, idx) => {
                    const pairs =
                      item.pairs && item.pairs.length > 0
                        ? item.pairs
                        : [{ need: item.needs, expectation: item.expectations }];

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/20">
                        <TableCell className="text-center font-mono font-semibold align-top pt-3">{idx + 1}</TableCell>
                        <TableCell className="font-bold align-top pt-3 min-w-[180px]">
                          <div className="text-foreground">{item.partyName}</div>
                          {pairs.length > 1 && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-mono mt-1 text-muted-foreground border-primary/20"
                            >
                              {pairs.length} paired items
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="align-top p-2" colSpan={2}>
                          <div className="divide-y divide-border/60">
                            {pairs.map((p, pIdx) => (
                              <div key={pIdx} className="grid grid-cols-2 gap-4 py-2 first:pt-1 last:pb-1 text-xs">
                                <div className="space-y-0.5">
                                  {pairs.length > 1 && (
                                    <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight block">
                                      Need #{pIdx + 1} (Stated Service)
                                    </span>
                                  )}
                                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{p.need || '—'}</p>
                                </div>
                                <div className="space-y-0.5 border-l pl-4 border-border/40">
                                  {pairs.length > 1 && (
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight block">
                                      Expectation #{pIdx + 1} (Implied Requirement)
                                    </span>
                                  )}
                                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                                    {p.expectation || '—'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-top pt-3">
                          {!isApproved && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteIp(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="py-3 px-4 bg-muted/20 border-t flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={() => navigateToStep(1)} className="text-xs font-bold gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Step 1 SWOT
            </Button>
            <Button size="sm" onClick={() => navigateToStep(3)} className="text-xs font-bold gap-1 shadow-xs">
              Next: Step 3 Operational Plan <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ======================================================== */}
      {/* STEP 3: OPERATIONAL PLAN (FORM QAO-01-025)               */}
      {/* ======================================================== */}
      {currentStep === 3 && (
        <Card className="shadow-xs animate-in fade-in duration-300">
          <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Step 3: Operational Plan Formulation (Form QAO-01-025)
              </CardTitle>
              <CardDescription className="text-xs">
                Translate the SWOT opportunities and stakeholder needs into concrete operational tasks, timelines,
                budgets, and success indicators.
              </CardDescription>
            </div>
            {!isApproved && (
              <Button size="sm" onClick={() => handleOpenAddOpModal()} className="text-xs font-bold gap-1 shadow-xs">
                <Plus className="h-3.5 w-3.5" /> Add Task / Objective
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {sortedOpItems.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-muted/10">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-bold text-muted-foreground">No operational tasks defined yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAddOpModal()}
                  className="text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add First Operational Task
                </Button>
              </div>
            ) : (
              <Table className="text-xs">
                <TableHeader className="bg-amber-100/60 dark:bg-amber-950/30">
                  <TableRow>
                    <TableHead className="w-10 text-center font-bold">#</TableHead>
                    <TableHead className="font-bold min-w-[190px]">Objective/s</TableHead>
                    <TableHead className="font-bold min-w-[200px]">Tasks / Activities</TableHead>
                    <TableHead className="font-bold text-center min-w-[110px]">Timeline</TableHead>
                    <TableHead className="font-bold min-w-[120px]">In-Charge</TableHead>
                    <TableHead className="font-bold min-w-[130px]">Resources</TableHead>
                    <TableHead className="font-bold text-right min-w-[95px]">Budget</TableHead>
                    <TableHead className="font-bold min-w-[150px]">Success Indicator</TableHead>
                    {!isApproved && <TableHead className="w-12 text-center font-bold">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedOpItems.map((group, gIdx) =>
                    group.tasks.map((item, tIdx) => (
                      <TableRow key={item.id} className="hover:bg-muted/40">
                        {tIdx === 0 && (
                          <TableCell
                            rowSpan={group.tasks.length}
                            className="text-center font-mono font-semibold text-muted-foreground align-top bg-muted/10 border-r"
                          >
                            {gIdx + 1}
                          </TableCell>
                        )}
                        {tIdx === 0 && (
                          <TableCell
                            rowSpan={group.tasks.length}
                            className="font-semibold align-top bg-muted/10 border-r"
                          >
                            <div className="space-y-1.5">
                              <div className="font-bold text-foreground leading-snug">{group.objective}</div>
                              {group.vpObjectiveTitle && (
                                <div className="text-[10px] text-muted-foreground bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded">
                                  VP Goal: {group.vpObjectiveTitle}
                                </div>
                              )}
                              {(group.archipelagicPillar ||
                                group.sucLevellingKra ||
                                group.tenPointAgenda ||
                                (group.tenPointAgendas && group.tenPointAgendas.length > 0) ||
                                group.qualityObjective) && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {group.archipelagicPillar && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300"
                                    >
                                      Archipelagic (AQ): {group.archipelagicPillar}
                                    </Badge>
                                  )}
                                  {group.sucLevellingKra && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                                    >
                                      SUC: {group.sucLevellingKra}
                                    </Badge>
                                  )}
                                  {getAgendaList(group.tenPointAgenda, group.tenPointAgendas).map((agenda, aIdx) => (
                                    <Badge
                                      key={aIdx}
                                      variant="outline"
                                      className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                                    >
                                      Agenda: {agenda}
                                    </Badge>
                                  ))}
                                  {group.qualityObjective && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                                    >
                                      ISO: {group.qualityObjective}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 pt-1">
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                                  {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                                </Badge>
                                {!isApproved && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-1.5 text-[10px] font-semibold text-primary hover:bg-primary/10 gap-0.5"
                                    onClick={() => handleOpenAddOpModal(group.objective, group.vpObjectiveId)}
                                    title="Add another task to this objective"
                                  >
                                    <Plus className="h-3 w-3" /> Add Task
                                  </Button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="align-top font-medium">{item.tasks}</TableCell>
                        <TableCell className="text-center font-mono text-[11px] align-top whitespace-nowrap">
                          {item.timelineStart && item.timelineEnd
                            ? `${item.timelineStart} – ${item.timelineEnd}`
                            : item.timelineStart || item.timelineEnd || '—'}
                        </TableCell>
                        <TableCell className="align-top">{item.personsResponsible || '—'}</TableCell>
                        <TableCell className="align-top text-muted-foreground">{item.resources || '—'}</TableCell>
                        <TableCell className="text-right font-mono font-bold align-top">
                          {item.budget ? `₱${Number(item.budget).toLocaleString()}` : '—'}
                        </TableCell>
                        <TableCell className="font-medium text-emerald-800 dark:text-emerald-300 align-top">
                          {item.successIndicator}
                        </TableCell>
                        {!isApproved && (
                          <TableCell className="text-center align-top">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteOpItem(item.id)}
                              title="Delete this task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    )),
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="py-3 px-4 bg-muted/20 border-t flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(2)} className="text-xs font-bold gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Step 2
            </Button>
            <Button size="sm" onClick={() => setCurrentStep(4)} className="text-xs font-bold gap-1 shadow-xs">
              Next: Step 4 Monthly Setting <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ======================================================== */}
      {/* STEP 4: MONTHLY SCHEDULE & OBJECTIVES MONITORING         */}
      {/* ======================================================== */}
      {currentStep === 4 &&
        (() => {
          const currentMonthNum = new Date().getMonth() + 1;
          const laggingItems =
            qomItems?.filter(
              (q) =>
                (q.attainmentPercentage || (q.status === 'Achieved' ? 100 : 0)) < 100 &&
                (q.activeMonths?.some((m) => m <= currentMonthNum) || q.status === 'Delayed'),
            ) || [];

          return (
            <Card className="shadow-xs animate-in fade-in duration-300">
              <CardHeader className="py-4 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <CalendarCheck2 className="h-4 w-4 text-primary" />
                      Step 4: Monthly Setting &amp; Objectives Monitoring (Form RSU-QAO-QOM-001)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Tasks from Step 3 are automatically populated. Click any month box to schedule active execution
                      periods, and click &quot;Update Progress&quot; to log monthly accomplishments towards 100% target.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                    {onNavigateBackToMonitoring && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onNavigateBackToMonitoring}
                        className="text-xs font-bold gap-1 text-blue-700 dark:text-blue-300 border-blue-300/60 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Return to Monitoring Matrix
                      </Button>
                    )}
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
                          planDoc?.approvedByName,
                        )
                      }
                      className="text-xs font-bold gap-1"
                    >
                      <Printer className="h-3.5 w-3.5 text-blue-600" /> Print QOM Form
                    </Button>
                  </div>
                </div>

                {/* 100% Implementation Warning Banner */}
                {laggingItems.length > 0 && (
                  <Alert
                    variant="destructive"
                    className="mt-3 border-rose-300 bg-rose-50/80 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200 py-2.5"
                  >
                    <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <AlertTitle className="font-bold text-xs flex items-center gap-1.5">
                      100% Implementation Warning: {laggingItems.length} Deliverable(s) Below Target
                    </AlertTitle>
                    <AlertDescription className="text-[11px] mt-0.5">
                      Scheduled milestone months have arrived or passed, but implementation is not yet at 100%. Please
                      log your monthly accomplishment notes or mark completed.
                    </AlertDescription>
                  </Alert>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {!qomItems || qomItems.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No tasks available. Please create at least one task in Step 3 first.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader className="bg-blue-50 dark:bg-blue-950/30">
                        <TableRow>
                          <TableHead className="w-10 text-center font-bold">#</TableHead>
                          <TableHead className="font-bold min-w-[200px]">Quality Objective &amp; Tasks</TableHead>
                          <TableHead className="font-bold min-w-[140px]">100% Progress</TableHead>
                          <TableHead className="font-bold min-w-[150px]">Target Indicator</TableHead>
                          <TableHead className="font-bold text-center" colSpan={12}>
                            Monthly Schedule Matrix (Click month to toggle)
                          </TableHead>
                          <TableHead className="font-bold text-center w-24">Status</TableHead>
                          <TableHead className="font-bold text-center w-28">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {qomItems.map((q, idx) => {
                          const attain = q.attainmentPercentage || (q.status === 'Achieved' ? 100 : 0);
                          const isUnderWarning =
                            attain < 100 &&
                            (q.activeMonths?.some((m) => m <= currentMonthNum) || q.status === 'Delayed');

                          return (
                            <TableRow key={q.id} className={isUnderWarning ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''}>
                              <TableCell className="text-center font-mono font-semibold align-top">{idx + 1}</TableCell>
                              <TableCell className="align-top space-y-1">
                                <div className="font-bold">{q.objectiveText}</div>
                                <div className="text-[10px] text-muted-foreground">{q.taskText}</div>
                                {(q.archipelagicPillar ||
                                  q.sucLevellingKra ||
                                  q.tenPointAgenda ||
                                  (q.tenPointAgendas && q.tenPointAgendas.length > 0) ||
                                  q.qualityObjective) && (
                                  <div className="flex flex-wrap gap-1 pt-0.5">
                                    {q.archipelagicPillar && (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200"
                                      >
                                        Archipelagic (AQ): {q.archipelagicPillar}
                                      </Badge>
                                    )}
                                    {q.sucLevellingKra && (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200"
                                      >
                                        SUC: {q.sucLevellingKra}
                                      </Badge>
                                    )}
                                    {getAgendaList(q.tenPointAgenda, q.tenPointAgendas).map((agenda, aIdx) => (
                                      <Badge
                                        key={aIdx}
                                        variant="outline"
                                        className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200"
                                      >
                                        Agenda: {agenda}
                                      </Badge>
                                    ))}
                                    {q.qualityObjective && (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200"
                                      >
                                        ISO: {q.qualityObjective}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </TableCell>

                              {/* 100% Implementation Progress Bar */}
                              <TableCell className="align-top space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                                  <span>{attain}%</span>
                                  {attain >= 100 ? (
                                    <span className="text-[9px] text-emerald-600 font-sans font-bold">100% Done</span>
                                  ) : isUnderWarning ? (
                                    <span className="text-[9px] text-rose-600 font-sans font-bold animate-pulse">
                                      Lagging
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-blue-600 font-sans">Active</span>
                                  )}
                                </div>
                                <Progress
                                  value={attain}
                                  className={`h-1.5 ${
                                    attain >= 100
                                      ? '[&>div]:bg-emerald-600'
                                      : isUnderWarning
                                        ? '[&>div]:bg-rose-600'
                                        : '[&>div]:bg-blue-600'
                                  }`}
                                />
                              </TableCell>

                              <TableCell className="align-top font-medium text-emerald-800 dark:text-emerald-300">
                                {q.targetIndicator}
                                {q.actualOutput && (
                                  <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-[150px]">
                                    Output: {q.actualOutput}
                                  </div>
                                )}
                              </TableCell>

                              {/* Monthly Schedule Matrix */}
                              {MONTHS_LIST.map((m) => {
                                const isChecked = q.activeMonths?.includes(m.num);
                                const hasLog = !!q.monthlyAccomplishments?.[m.num];
                                const isCurrent = m.num === currentMonthNum;

                                return (
                                  <TableCell
                                    key={m.num}
                                    onClick={() => handleToggleMonth(q.id, q.activeMonths || [], m.num)}
                                    className={`text-center font-bold cursor-pointer transition-colors p-1 text-[10px] border-x ${
                                      hasLog
                                        ? 'bg-emerald-100 text-emerald-800 font-bold'
                                        : isChecked
                                          ? isCurrent
                                            ? 'bg-blue-600 text-white font-bold'
                                            : 'bg-primary/20 text-primary hover:bg-primary/30'
                                          : 'hover:bg-muted text-muted-foreground/30'
                                    }`}
                                    title={`Month ${m.num} (${m.name}): Click to toggle schedule`}
                                  >
                                    {hasLog ? '✓' : isChecked ? '●' : m.name}
                                  </TableCell>
                                );
                              })}

                              <TableCell className="text-center align-top">
                                <Badge
                                  variant="outline"
                                  className={`font-bold text-[10px] ${
                                    q.status === 'Achieved'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                      : q.status === 'Delayed'
                                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                                        : q.status === 'Ongoing'
                                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                                          : ''
                                  }`}
                                >
                                  {q.status || 'Pending'}
                                </Badge>
                              </TableCell>

                              {/* Action: Update Progress Button */}
                              <TableCell className="text-center align-top">
                                <Button
                                  size="sm"
                                  variant={isUnderWarning ? 'default' : 'outline'}
                                  onClick={() => handleOpenQomModal(q)}
                                  className={`text-[10px] font-bold h-6 px-2 shadow-2xs ${
                                    isUnderWarning ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''
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
              <CardFooter className="py-3 px-4 bg-muted/20 border-t flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="text-xs font-bold gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Step 3
                </Button>
                <Button size="sm" onClick={() => setCurrentStep(5)} className="text-xs font-bold gap-1 shadow-xs">
                  Next: Step 5 Risk &amp; ROAP <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardFooter>
            </Card>
          );
        })()}

      {/* ======================================================== */}
      {/* STEP 5: RISK REGISTRY & CONDITIONAL ROAP                 */}
      {/* ======================================================== */}
      {currentStep === 5 && (
        <Card className="shadow-xs animate-in fade-in duration-300">
          <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                Step 5: Risk &amp; Opportunity Registry (ROR) &amp; Action Plan (ROAP)
              </CardTitle>
              <CardDescription className="text-xs">
                Test the Step 3 objectives against threats. Medium and High ratings automatically mandate a Treatment
                Action Plan (Form QAO-00-027).
              </CardDescription>
            </div>
            {!isApproved && (
              <Button
                size="sm"
                onClick={() => {
                  if (sortedOpItems.length > 0 && !riskObjective) setRiskObjective(sortedOpItems[0].objective);
                  setIsRiskModalOpen(true);
                }}
                className="text-xs font-bold gap-1 shadow-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add Risk / Opportunity
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {!allRisks || allRisks.length === 0 ? (
              <div className="py-12 text-center space-y-2 bg-muted/10">
                <ShieldAlert className="h-8 w-8 text-amber-500/40 mx-auto" />
                <p className="text-xs font-bold text-muted-foreground">No risks or opportunities evaluated yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsRiskModalOpen(true)}
                  className="text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Risk / Opportunity
                </Button>
              </div>
            ) : (
              <Table className="text-xs">
                <TableHeader className="bg-amber-50/60 dark:bg-amber-950/20">
                  <TableRow>
                    <TableHead className="w-10 text-center font-bold">#</TableHead>
                    <TableHead className="font-bold min-w-[150px]">Linked Objective</TableHead>
                    <TableHead className="font-bold min-w-[180px]">Risk / Opportunity</TableHead>
                    <TableHead className="font-bold text-center w-28">Pre-Rating</TableHead>
                    <TableHead className="font-bold min-w-[200px]">Action Plan (ROAP Treatment)</TableHead>
                    <TableHead className="font-bold w-24 text-center">Action Required?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRisks.map((r, idx) => {
                    const mag = r.preTreatment?.magnitude || 1;
                    const rating = r.preTreatment?.rating || (mag >= 10 ? 'High' : mag >= 5 ? 'Medium' : 'Low');
                    const isHighMed = rating === 'High' || rating === 'Medium';

                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-center font-mono font-semibold">{idx + 1}</TableCell>
                        <TableCell className="font-semibold">{r.objective}</TableCell>
                        <TableCell>
                          <div className="font-bold">
                            [{r.type}] {r.description}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Controls: {r.currentControls}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-mono text-[10px]">
                            L:{r.preTreatment?.likelihood} × C:{r.preTreatment?.consequence}
                          </div>
                          <Badge
                            className={`text-[10px] font-bold mt-0.5 ${
                              rating === 'High'
                                ? 'bg-rose-600 text-white'
                                : rating === 'Medium'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {mag} ({rating})
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.treatmentAction ? (
                            <div>
                              <div className="font-semibold text-amber-900 dark:text-amber-200">
                                {r.treatmentAction}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Target: {r.responsiblePersonName} ({formatRiskTargetDate(r.targetDate, 'Q4')})
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">
                              Routine oversight (No ROAP required)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isHighMed ? (
                            <Badge
                              variant="outline"
                              className="border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/20 font-bold text-[10px]"
                            >
                              ROAP Mandatory
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 font-bold text-[10px]"
                            >
                              Low Risk
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="py-3 px-4 bg-muted/20 border-t flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(4)} className="text-xs font-bold gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Step 4
            </Button>
            <Button
              size="sm"
              onClick={() => setCurrentStep(6)}
              className="text-xs font-bold gap-1 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Next: Step 6 Generate All 6 Forms <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ======================================================== */}
      {/* STEP 6: 6-IN-1 DOCUMENT GENERATION & SIGN-OFF HUB       */}
      {/* ======================================================== */}
      {currentStep === 6 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card className="shadow-xs border-2 border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10">
            <CardHeader className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Step 6: Complete 6-in-1 EOMS Official Document Hub
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Your complete compliance suite is generated automatically. Print, preview, or export all 6 official
                    ISO templates.
                  </CardDescription>
                </div>
                {!isApproved && (
                  <Button
                    onClick={handleSubmitAll}
                    disabled={isSubmitting || sortedOpItems.length === 0}
                    className="font-bold text-xs gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Submit Entire EOMS Package to VP
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Grid of the 6 Generated Official Documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. SWOT Analysis */}
            <Card className="shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      QAO-01-001
                    </Badge>
                    <CardTitle className="text-sm font-bold">1. SWOT Analysis</CardTitle>
                    <CardDescription className="text-xs">Internal &amp; external strategic context.</CardDescription>
                  </div>
                  <Compass className="h-6 w-6 text-primary shrink-0" />
                </div>
              </CardHeader>
              <CardFooter className="pt-2 border-t flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{swotItems?.length || 0} focus areas</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    printSwotAnalysisForm(
                      swotItems || [],
                      null,
                      currentUnit?.name || 'Unit',
                      currentCampus,
                      selectedYear,
                      `${userProfile?.firstName} ${userProfile?.lastName}`,
                      planDoc?.approvedByName,
                    )
                  }
                  className="text-xs font-bold gap-1"
                >
                  <Printer className="h-3.5 w-3.5 text-primary" /> Print QAO-01-001
                </Button>
              </CardFooter>
            </Card>

            {/* 2. Needs of Interested Parties */}
            <Card className="shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      QAO-01-003
                    </Badge>
                    <CardTitle className="text-sm font-bold">2. Interested Parties</CardTitle>
                    <CardDescription className="text-xs">Stated services &amp; implied requirements.</CardDescription>
                  </div>
                  <Users2 className="h-6 w-6 text-purple-600 shrink-0" />
                </div>
              </CardHeader>
              <CardFooter className="pt-2 border-t flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{ipItems?.length || 0} stakeholder groups</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    printInterestedPartiesForm(
                      ipItems || [],
                      currentUnit?.name || 'Unit',
                      currentCampus,
                      selectedYear,
                      `${userProfile?.firstName} ${userProfile?.lastName}`,
                      planDoc?.approvedByName,
                    )
                  }
                  className="text-xs font-bold gap-1"
                >
                  <Printer className="h-3.5 w-3.5 text-purple-600" /> Print QAO-01-003
                </Button>
              </CardFooter>
            </Card>

            {/* 3. Operational Plan */}
            <Card className="shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      QAO-01-025
                    </Badge>
                    <CardTitle className="text-sm font-bold">3. Operational Plan</CardTitle>
                    <CardDescription className="text-xs">Actionable tasks, budgets, and indicators.</CardDescription>
                  </div>
                  <FileSpreadsheet className="h-6 w-6 text-amber-600 shrink-0" />
                </div>
              </CardHeader>
              <CardFooter className="pt-2 border-t flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{sortedOpItems.length} planned tasks</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const mockPlan: OperationalPlanDocument = planDoc || {
                      id: planDocId || '',
                      unitId: selectedUnitId,
                      unitName: currentUnit?.name || 'Unit',
                      campusId: currentUnit?.campusIds?.[0] || 'Main',
                      year: selectedYear,
                      cycleId: selectedCycle,
                      status: 'Draft',
                      preparedById: userProfile?.id || '',
                      preparedByName: `${userProfile?.firstName} ${userProfile?.lastName}`,
                      preparedAt: new Date(),
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    };
                    printOperationalPlanForm(mockPlan, sortedOpItems, currentCampus);
                  }}
                  className="text-xs font-bold gap-1"
                >
                  <Printer className="h-3.5 w-3.5 text-amber-600" /> Print QAO-01-025
                </Button>
              </CardFooter>
            </Card>

            {/* 4. Objectives Monitoring Form */}
            <Card className="shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      RSU-QAO-QOM-001
                    </Badge>
                    <CardTitle className="text-sm font-bold">4. Objectives Monitoring</CardTitle>
                    <CardDescription className="text-xs">12-month schedule matrix &amp; progress.</CardDescription>
                  </div>
                  <CalendarCheck2 className="h-6 w-6 text-blue-600 shrink-0" />
                </div>
              </CardHeader>
              <CardFooter className="pt-2 border-t flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{qomItems?.length || 0} scheduled tasks</span>
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
                      planDoc?.approvedByName,
                    )
                  }
                  className="text-xs font-bold gap-1"
                >
                  <Printer className="h-3.5 w-3.5 text-blue-600" /> Print Objectives
                </Button>
              </CardFooter>
            </Card>

            {/* 5. Risk and Opportunity Register */}
            <Card className="shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      RSU-QAO-ROR-002
                    </Badge>
                    <CardTitle className="text-sm font-bold">5. Risk Register (ROR)</CardTitle>
                    <CardDescription className="text-xs">Institutional risk &amp; opportunity catalog.</CardDescription>
                  </div>
                  <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
                </div>
              </CardHeader>
              <CardFooter className="pt-2 border-t flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{allRisks?.length || 0} evaluated risks</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/risk-register?year=${selectedYear}&unitId=${selectedUnitId}`, '_blank')}
                  className="text-xs font-bold gap-1"
                >
                  <Printer className="h-3.5 w-3.5 text-emerald-600" /> View / Print ROR
                </Button>
              </CardFooter>
            </Card>

            {/* 6. Risk Action Plan (ROAP) */}
            <Card className="shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      QAO-00-027 (ROAP)
                    </Badge>
                    <CardTitle className="text-sm font-bold">6. Risk Action Plan</CardTitle>
                    <CardDescription className="text-xs">Treatment tool for Medium &amp; High risks.</CardDescription>
                  </div>
                  <ShieldAlert className="h-6 w-6 text-rose-600 shrink-0" />
                </div>
              </CardHeader>
              <CardFooter className="pt-2 border-t flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {allRisks?.filter((r) => (r.preTreatment?.magnitude || 0) >= 5 || Boolean(r.treatmentAction))
                    .length || 0}{' '}
                  action plans
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    printRiskActionPlanForm(
                      allRisks || [],
                      currentUnit?.name || 'Unit',
                      currentCampus,
                      selectedYear,
                      selectedCycle,
                      `${userProfile?.firstName} ${userProfile?.lastName}`,
                      planDoc?.approvedByName,
                    )
                  }
                  className="text-xs font-bold gap-1"
                >
                  <Printer className="h-3.5 w-3.5 text-rose-600" /> Print QAO-00-027
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(5)} className="text-xs font-bold gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Step 5
            </Button>
            <Button size="sm" onClick={() => setCurrentStep(1)} variant="secondary" className="text-xs font-bold">
              Review From Step 1
            </Button>
          </div>
        </div>
      )}

      {/* --- Step 1 Add SWOT Modal Dialog --- */}
      <Dialog open={isSwotModalOpen} onOpenChange={setIsSwotModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add SWOT Focus Area (Form QAO-01-001)</DialogTitle>
            <DialogDescription>
              Evaluate internal and external factors for a specific area of the unit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">Focus Area *</Label>
              <Input
                placeholder="e.g. Instruction & Curriculum, Faculty Competency, Physical Facilities, Research"
                value={swotFocusArea}
                onChange={(e) => setSwotFocusArea(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold text-emerald-700 dark:text-emerald-400">Internal: Strengths</Label>
                <Textarea
                  placeholder="Values, knowledge, high performance capabilities..."
                  value={swotStrengths}
                  onChange={(e) => setSwotStrengths(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-rose-700 dark:text-rose-400">Internal: Weaknesses</Label>
                <Textarea
                  placeholder="Resource constraints, culture gaps, bottlenecks..."
                  value={swotWeaknesses}
                  onChange={(e) => setSwotWeaknesses(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold text-blue-700 dark:text-blue-400">External: Opportunities</Label>
                <Textarea
                  placeholder="Technological, regional, market, partnership prospects..."
                  value={swotOpportunities}
                  onChange={(e) => setSwotOpportunities(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-amber-700 dark:text-amber-400">External: Threats</Label>
                <Textarea
                  placeholder="Regulatory changes, economic shifts, competitive pressures..."
                  value={swotThreats}
                  onChange={(e) => setSwotThreats(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSwotModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSwot} disabled={isSaving || !swotFocusArea.trim()} className="font-bold">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : 'Save Focus Area'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Step 2 Add Interested Party Modal Dialog --- */}
      <Dialog open={isIpModalOpen} onOpenChange={setIsIpModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Stakeholder / Interested Party (Form QAO-01-003)</DialogTitle>
            <DialogDescription>
              Record the stakeholder group with paired Stated Needs and Implied Expectations side by side.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">Interested Party (Stakeholder Group) *</Label>
              <Input
                placeholder="e.g. Learners / Students, Faculty & Staff, Regulators (CHED/PRC), Alumni, Industry Partners"
                value={ipPartyName}
                onChange={(e) => setIpPartyName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4 text-primary" />
                    Needs &amp; Expectations (Side by Side) *
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Define 1 Need and 1 Expectation per row. Click &quot;Add Another Pair&quot; to link additional
                    paired requirements.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddIpPair}
                  className="text-xs font-bold h-7 gap-1 text-primary border-primary/30 hover:bg-primary/5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Another Pair
                </Button>
              </div>

              <div className="space-y-2.5">
                {ipPairs.map((pair, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border bg-muted/20 hover:border-primary/30 transition-colors space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-background px-2 py-0.5 rounded border">
                        Pair #{index + 1}
                      </span>
                      {ipPairs.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveIpPair(index)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Remove this pair"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-foreground/90 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          Need #{index + 1} (Stated Service) *
                        </Label>
                        <Textarea
                          placeholder="e.g. Quality instruction, safe laboratory equipment, timely transcript release..."
                          value={pair.need}
                          onChange={(e) => handleUpdateIpPair(index, 'need', e.target.value)}
                          rows={2}
                          className="text-xs resize-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-foreground/90 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          Expectation #{index + 1} (Implied Requirement) *
                        </Label>
                        <Textarea
                          placeholder="e.g. High licensure pass rate, industry-relevant training, competent and ethical faculty..."
                          value={pair.expectation}
                          onChange={(e) => handleUpdateIpPair(index, 'expectation', e.target.value)}
                          rows={2}
                          className="text-xs resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddIpPair}
                className="w-full text-xs font-bold h-8 border-dashed border-primary/40 text-primary hover:bg-primary/5 gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Another Need &amp; Expectation Pair
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIpModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveIp} disabled={isSaving || !ipPartyName.trim()} className="font-bold">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : 'Save Stakeholder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Step 3 Add Task Modal Dialog --- */}
      <Dialog open={isOpModalOpen} onOpenChange={setIsOpModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Operational Task / Objective (Form QAO-01-025)</DialogTitle>
            <DialogDescription>
              Step 3: Define objectives and their corresponding tasks, timelines, persons responsible, budgets, and
              success indicators.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Objective Mode Selection (If existing objectives exist) */}
            {existingObjectives.length > 0 && (
              <div className="flex items-center gap-2 p-1 bg-muted rounded-md w-fit">
                <Button
                  type="button"
                  size="sm"
                  variant={opObjectiveMode === 'new' ? 'default' : 'ghost'}
                  className="h-7 text-xs font-semibold"
                  onClick={() => {
                    setOpObjectiveMode('new');
                    setOpObjective('');
                    setOpVpGoalId('none');
                  }}
                >
                  Create New Objective
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={opObjectiveMode === 'existing' ? 'default' : 'ghost'}
                  className="h-7 text-xs font-semibold"
                  onClick={() => {
                    setOpObjectiveMode('existing');
                    if (existingObjectives[0]) {
                      setOpObjective(existingObjectives[0].objective);
                      setOpVpGoalId(existingObjectives[0].vpObjectiveId || 'none');
                    }
                  }}
                >
                  Add to Existing Objective ({existingObjectives.length})
                </Button>
              </div>
            )}

            {/* Objective Selection / Input */}
            {opObjectiveMode === 'existing' && existingObjectives.length > 0 ? (
              <div className="space-y-1.5 p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40">
                <Label className="font-bold text-amber-900 dark:text-amber-200">Select Existing Objective *</Label>
                <Select
                  value={opObjective}
                  onValueChange={(val) => {
                    setOpObjective(val);
                    const match = existingObjectives.find((x) => x.objective === val);
                    if (match && match.vpObjectiveId) {
                      setOpVpGoalId(match.vpObjectiveId);
                    }
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Choose an existing objective..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingObjectives.map((obj, i) => (
                      <SelectItem key={i} value={obj.objective}>
                        {obj.objective}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  New tasks/activities added below will be grouped under this objective.
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <div className="space-y-1">
                  <Label className="font-bold">Supervising VP Strategic Objective (Optional)</Label>
                  <Select
                    value={opVpGoalId}
                    onValueChange={(val) => {
                      setOpVpGoalId(val);
                      const g = vpGoals?.find((x) => x.id === val);
                      if (g && !opObjective) setOpObjective(g.title);
                    }}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select institutional goal..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Custom Unit Objective --</SelectItem>
                      {vpGoals?.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          [{g.vpCluster}] {g.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {opVpGoalId !== 'none' &&
                    (() => {
                      const g = vpGoals?.find((x) => x.id === opVpGoalId);
                      if (
                        !g ||
                        (!g.archipelagicPillar &&
                          !g.sucLevellingKra &&
                          !g.tenPointAgenda &&
                          (!g.tenPointAgendas || g.tenPointAgendas.length === 0) &&
                          !g.qualityObjective)
                      )
                        return null;
                      const agendas = getAgendaList(g.tenPointAgenda, g.tenPointAgendas);
                      return (
                        <div className="p-2 bg-muted/40 border rounded space-y-1 mt-1.5">
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Strategic Framework Alignment (Auto-Inherited)
                          </div>
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {g.archipelagicPillar && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300"
                              >
                                Archipelagic (AQ): {g.archipelagicPillar}
                              </Badge>
                            )}
                            {g.sucLevellingKra && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                              >
                                SUC: {g.sucLevellingKra}
                              </Badge>
                            )}
                            {agendas.map((agenda, aIdx) => (
                              <Badge
                                key={aIdx}
                                variant="outline"
                                className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                              >
                                Agenda: {agenda}
                              </Badge>
                            ))}
                            {g.qualityObjective && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                              >
                                ISO: {g.qualityObjective}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                </div>
                <div className="space-y-1">
                  <Label className="font-bold">Objective Statement *</Label>
                  <Input
                    placeholder="e.g. Increase licensure exam passing rate to >= 85%"
                    value={opObjective}
                    onChange={(e) => setOpObjective(e.target.value)}
                    className="bg-background font-medium"
                  />
                </div>
              </div>
            )}

            {/* Task / Activities List for this Objective */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground">Tasks / Activities for this Objective</h4>
                  <p className="text-[11px] text-muted-foreground">
                    You can collapse/hide tasks to save space while entering new ones.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {opTaskList.length > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCollapseAllOpTasks(true)}
                        className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                        title="Hide/collapse all tasks"
                      >
                        Hide All
                      </Button>
                      <span className="text-muted-foreground/30 text-xs">|</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCollapseAllOpTasks(false)}
                        className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                        title="Display/expand all tasks"
                      >
                        Show All
                      </Button>
                    </div>
                  )}
                  <Badge variant="outline" className="font-mono text-xs">
                    {opTaskList.length} {opTaskList.length === 1 ? 'task' : 'tasks'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2.5">
                {opTaskList.map((taskItem, tIdx) => (
                  <div
                    key={tIdx}
                    className={cn(
                      'rounded-lg border transition-all duration-200',
                      taskItem.isCollapsed
                        ? 'p-2.5 bg-muted/20 hover:bg-muted/40 border-dashed border-border'
                        : 'p-3.5 bg-card/70 shadow-2xs space-y-3 border-solid',
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-between cursor-pointer select-none gap-2',
                        !taskItem.isCollapsed && 'pb-2 border-b',
                      )}
                      onClick={() => handleToggleCollapseOpTask(tIdx)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary font-mono text-[10px] shrink-0 font-bold">
                          {tIdx + 1}
                        </span>
                        <span className="font-bold text-xs text-primary shrink-0">Task / Activity #{tIdx + 1}</span>
                        {taskItem.isCollapsed && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[200px] sm:max-w-[320px]">
                            {taskItem.tasks?.trim() ? `— ${taskItem.tasks}` : '— (Click to enter details)'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {taskItem.isCollapsed && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 px-1.5 font-normal hidden sm:inline-flex"
                          >
                            {taskItem.budget ? `₱${Number(taskItem.budget).toLocaleString()}` : '₱0'}
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleCollapseOpTask(tIdx)}
                          className="h-6 px-2 text-[10px] font-semibold gap-0.5 text-muted-foreground hover:text-foreground"
                          title={taskItem.isCollapsed ? 'Display task details' : 'Hide task details'}
                        >
                          {taskItem.isCollapsed ? (
                            <>
                              <ChevronDown className="h-3 w-3" /> Show
                            </>
                          ) : (
                            <>
                              <ChevronUp className="h-3 w-3" /> Hide
                            </>
                          )}
                        </Button>
                        {opTaskList.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveOpTask(tIdx)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            title="Remove this task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {!taskItem.isCollapsed && (
                      <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                        <div className="space-y-1">
                          <Label className="font-semibold text-xs">Specific Tasks / Activities *</Label>
                          <Textarea
                            placeholder="Actionable work to be conducted (e.g. Conduct intensive review classes; mock exams)..."
                            value={taskItem.tasks}
                            onChange={(e) => handleUpdateOpTask(tIdx, 'tasks', e.target.value)}
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="font-semibold text-xs">Timeline Start</Label>
                            <Input
                              placeholder="e.g. Jan 15 or Q1"
                              value={taskItem.timelineStart}
                              onChange={(e) => handleUpdateOpTask(tIdx, 'timelineStart', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="font-semibold text-xs">Timeline End</Label>
                            <Input
                              placeholder="e.g. Apr 30 or Q2"
                              value={taskItem.timelineEnd}
                              onChange={(e) => handleUpdateOpTask(tIdx, 'timelineEnd', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="font-semibold text-xs">Persons / Offices Responsible</Label>
                          <Input
                            placeholder="e.g. Program Chair, Review Committee, Faculty"
                            value={taskItem.personsResponsible}
                            onChange={(e) => handleUpdateOpTask(tIdx, 'personsResponsible', e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="font-semibold text-xs">Resources (Materials, Venue, Facilities)</Label>
                            <Input
                              placeholder="e.g. Computer lab, review manuals, sound system"
                              value={taskItem.resources || ''}
                              onChange={(e) => handleUpdateOpTask(tIdx, 'resources', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="font-semibold text-xs">Budget (₱ PHP)</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={taskItem.budget || ''}
                              onChange={(e) => handleUpdateOpTask(tIdx, 'budget', Number(e.target.value))}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="font-semibold text-xs">Success Indicator (Measurable Target) *</Label>
                          <Input
                            placeholder="e.g. 100% review attendance; >= 85% passing rate"
                            value={taskItem.successIndicator}
                            onChange={(e) => handleUpdateOpTask(tIdx, 'successIndicator', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOpTask}
                className="w-full text-xs font-semibold gap-1.5 border-dashed border-primary/40 text-primary hover:bg-primary/5 py-2"
              >
                <Plus className="h-3.5 w-3.5" /> Add Another Task / Activity for this Objective
              </Button>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSaveOpItem(false)}
              disabled={isSaving || !opObjective.trim()}
              className="font-semibold gap-1 text-xs"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-0.5" />
              )}
              Save and Add New Task
            </Button>
            <Button
              onClick={() => handleSaveOpItem(true)}
              disabled={isSaving || !opObjective.trim()}
              className="font-bold gap-1 text-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Saving...
                </>
              ) : (
                `Save & Close`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Step 5 Add Risk Modal Dialog with Conditional ROAP --- */}
      <Dialog open={isRiskModalOpen} onOpenChange={setIsRiskModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Evaluate Risk or Opportunity</DialogTitle>
            <DialogDescription>
              Tied to your Step 3 objectives. High and Medium ratings automatically require an Action Plan (ROAP).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">Linked Unit Objective *</Label>
              <Select value={riskObjective} onValueChange={setRiskObjective}>
                <SelectTrigger>
                  <SelectValue placeholder="Select linked objective..." />
                </SelectTrigger>
                <SelectContent>
                  {sortedOpItems.map((item) => (
                    <SelectItem key={item.id} value={item.objective}>
                      {item.objective}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Category</Label>
                <Select value={riskType} onValueChange={(val: any) => setRiskType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Risk">Risk (Threat to Objective)</SelectItem>
                    <SelectItem value="Opportunity">Opportunity (Favorable Potential)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Calculated Pre-Rating</Label>
                <div className="p-2 border rounded-md font-bold flex items-center justify-between">
                  <span>Magnitude: {calculatedMagnitude}</span>
                  <Badge
                    className={
                      calculatedRating === 'High'
                        ? 'bg-rose-600 text-white'
                        : calculatedRating === 'Medium'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                    }
                  >
                    {calculatedRating} Rating
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="font-bold">Threat / Opportunity Statement *</Label>
              <Textarea
                placeholder="What could delay or disrupt the objective?"
                value={riskDescription}
                onChange={(e) => setRiskDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Likelihood (1 to 5)</Label>
                <Select value={String(riskLikelihood)} onValueChange={(val) => setRiskLikelihood(Number(val))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Rare</SelectItem>
                    <SelectItem value="2">2 - Unlikely</SelectItem>
                    <SelectItem value="3">3 - Possible</SelectItem>
                    <SelectItem value="4">4 - Likely</SelectItem>
                    <SelectItem value="5">5 - Almost Certain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Consequence (1 to 5)</Label>
                <Select value={String(riskConsequence)} onValueChange={(val) => setRiskConsequence(Number(val))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Insignificant</SelectItem>
                    <SelectItem value="2">2 - Minor</SelectItem>
                    <SelectItem value="3">3 - Moderate</SelectItem>
                    <SelectItem value="4">4 - Major</SelectItem>
                    <SelectItem value="5">5 - Catastrophic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {requiresRoap && (
              <div className="p-3.5 rounded-xl border-2 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 space-y-2.5 animate-in fade-in">
                <div className="font-bold text-xs uppercase text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  Mandatory Risk Action Plan (Form QAO-00-027 / ROAP)
                </div>
                <div className="space-y-1">
                  <Label className="font-bold">Treatment Action Plan *</Label>
                  <Textarea
                    placeholder="Specific actionable measures to mitigate or eliminate this risk..."
                    value={riskTreatment}
                    onChange={(e) => setRiskTreatment(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="font-bold">Resources Needed</Label>
                    <Input
                      placeholder="₱25,000 MOOE or Equipment"
                      value={riskResources}
                      onChange={(e) => setRiskResources(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold">Target Implementation Date</Label>
                    <Input
                      placeholder="End of Q2 or Nov 30"
                      value={riskTargetDate}
                      onChange={(e) => setRiskTargetDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="font-bold">Responsible Person</Label>
                  <Input
                    placeholder="Name or designation in charge of treatment"
                    value={riskResponsible}
                    onChange={(e) => setRiskResponsible(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRiskModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRisk}
              disabled={isSaving || !riskDescription.trim()}
              className="font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : 'Save Risk & Action Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 4 Monthly Progress Update Modal */}
      <Dialog open={isQomModalOpen} onOpenChange={setIsQomModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-blue-600" />
              Update Monthly Progress &amp; Implementation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Log progress notes, output, and attainment towards 100% implementation for Form RSU-QAO-QOM-001.
            </DialogDescription>
          </DialogHeader>

          {editingQomItem && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="p-2.5 bg-muted/40 border rounded-lg space-y-1">
                <div className="font-bold text-foreground">{editingQomItem.objectiveText}</div>
                <div className="text-muted-foreground">{editingQomItem.taskText}</div>
                <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                  Indicator: {editingQomItem.targetIndicator}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold">Month *</Label>
                  <Select value={String(qomUpdateMonth)} onValueChange={(val) => setQomUpdateMonth(Number(val))}>
                    <SelectTrigger className="h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS_LIST.map((m) => (
                        <SelectItem key={m.num} value={String(m.num)} className="text-xs">
                          Month {m.num}: {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="font-bold">Status *</Label>
                  <Select value={qomUpdateStatus} onValueChange={(val: any) => setQomUpdateStatus(val)}>
                    <SelectTrigger className="h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ongoing">Ongoing</SelectItem>
                      <SelectItem value="Achieved">Achieved (100%)</SelectItem>
                      <SelectItem value="Delayed">Delayed / Warning</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Attainment slider */}
              <div className="space-y-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-blue-900 dark:text-blue-200">Implementation Attainment</Label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-blue-700 dark:text-blue-300">
                      {qomUpdateAttainment}%
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setQomUpdateAttainment(100);
                        setQomUpdateStatus('Achieved');
                      }}
                      className="text-[10px] h-5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      100% Done
                    </Button>
                  </div>
                </div>
                <Slider
                  value={[qomUpdateAttainment]}
                  onValueChange={(val) => {
                    const v = val[0];
                    setQomUpdateAttainment(v);
                    if (v >= 100) setQomUpdateStatus('Achieved');
                  }}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">Activities Executed in Month {qomUpdateMonth} *</Label>
                <Textarea
                  placeholder="Describe program execution, meetings, or actions taken..."
                  value={qomUpdateNotes}
                  onChange={(e) => setQomUpdateNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">Actual Output Produced</Label>
                <Input
                  placeholder="e.g. Conducted review; 140 trainees certified"
                  value={qomUpdateOutput}
                  onChange={(e) => setQomUpdateOutput(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">Evidence / MOV Drive Link</Label>
                <Input
                  placeholder="https://drive.google.com/..."
                  value={qomUpdateMov}
                  onChange={(e) => setQomUpdateMov(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">Remarks / Corrective Action</Label>
                <Input
                  placeholder="Optional remarks"
                  value={qomUpdateRemarks}
                  onChange={(e) => setQomUpdateRemarks(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap sm:flex-row justify-between items-center">
            {onNavigateBackToMonitoring ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsQomModalOpen(false);
                  onNavigateBackToMonitoring();
                }}
                className="text-xs font-bold gap-1 text-blue-600 dark:text-blue-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Return to Monitoring Matrix
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsQomModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveQomProgress}
                disabled={isSavingQomProgress}
                className="font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1"
              >
                {isSavingQomProgress ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                Save Progress
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
