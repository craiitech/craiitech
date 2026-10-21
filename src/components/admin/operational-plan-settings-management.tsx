'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from '@/firebase/firestore-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useYear } from '@/lib/year-provider';
import type { VpStrategicGoal, OperationalPlanSubmissionMode, User, Unit, TenPointAgendaSettings } from '@/lib/types';
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Settings2,
  Sparkles,
  Layers,
  Link as LinkIcon,
  FileSpreadsheet,
  Building2,
  UserCheck,
  Compass,
} from 'lucide-react';
import {
  UNIVERSITY_QUALITY_OBJECTIVES,
  SUC_LEVELLING_KRAS,
  UNIVERSITY_TEN_POINT_AGENDA,
  ARCHIPELAGIC_PILLARS,
  getAgendaList,
} from '@/lib/constants';
import { getUserVpContext } from '@/lib/utils';

const DEFAULT_STRATEGIC_GOALS = [
  {
    vpCluster: 'VPAA',
    vpOfficeName: 'Office of the Vice President for Academic Affairs',
    title: 'Excellence in Instruction & Program Quality',
    description: '100% compliance with CHED Minimum Standards (COPC) and AACCUP accreditation attainment.',
    targetMetric: '>= 90% accredited programs',
    qualityObjective: 'QO 3: Program Accreditation & Quality Standards',
    sucLevellingKra: 'KRA 1: Higher and Advanced Education Services',
    archipelagicPillar: 'Pillar 01: Multi-Island Responsive Education',
    tenPointAgenda: 'Point 1: Academic Excellence & Quality Curricular Delivery',
    tenPointAgendas: [
      'Point 1: Academic Excellence & Quality Curricular Delivery',
      'Point 2: Faculty Competency & Professional Advancement',
    ],
  },
  {
    vpCluster: 'VPREDI',
    vpOfficeName: 'Office of the Vice President for Research, Extension, Development, and Innovation',
    title: 'High-Impact Research & Archipelagic Extension',
    description: 'Scopus/WoS indexed research outputs and active community extension partnerships per college.',
    targetMetric: '>= 50 published papers / year',
    qualityObjective: 'QO 4: Research Production & Technology Transfer',
    sucLevellingKra: 'KRA 2: Research Services & Innovation',
    archipelagicPillar: 'Pillar 02: Island-Centric Research & Innovation',
    tenPointAgenda: 'Point 4: High-Impact Research & Extension Partnerships',
    tenPointAgendas: [
      'Point 4: High-Impact Research & Extension Partnerships',
      'Point 7: Sustainable Island Development & Ecological Stewardship',
    ],
  },
  {
    vpCluster: 'VPAF',
    vpOfficeName: 'Office of the Vice President for Administration and Finance',
    title: 'Fiscal Transparency & Infrastructure Modernization',
    description: '100% budget utilization rate, clean COA audit findings, and completed smart-campus facilities.',
    targetMetric: '100% BUR & Unqualified COA Opinion',
    qualityObjective: 'QO 6: Efficient Financial Management & Resource Stewardship',
    sucLevellingKra: 'KRA 4: Management of Resources',
    archipelagicPillar: 'Pillar 04: Archipelagic Leadership and Governance',
    tenPointAgenda: 'Point 5: Transparent Governance, Prudent Fiscal Stewardship & Digital Systems',
    tenPointAgendas: [
      'Point 5: Transparent Governance, Prudent Fiscal Stewardship & Digital Systems',
      'Point 8: Infrastructure Modernization & Smart Multi-Campus Facilities',
    ],
  },
  {
    vpCluster: 'OVPSAS',
    vpOfficeName: 'Office of the Vice President for Student Affairs and Services',
    title: 'Holistic Student Welfare & Industry-Ready Employability',
    description:
      'Comprehensive student development services, mental wellness support, and licensure examination performance.',
    targetMetric: '>= 75% licensure examination passing rate',
    qualityObjective: 'QO 1: Student Satisfaction & Comprehensive Support Services',
    sucLevellingKra: 'KRA 1: Higher and Advanced Education Services',
    archipelagicPillar: 'Pillar 05: Multi-Island Quality Assurance & Internationalization',
    tenPointAgenda: 'Point 6: Student Development, Welfare Services & Inclusive Education',
    tenPointAgendas: ['Point 6: Student Development, Welfare Services & Inclusive Education'],
  },
];

export interface OperationalPlanSettingsManagementProps {
  forcedVpCode?: string | null;
  hideSystemModeToggle?: boolean;
  isDialogMode?: boolean;
  onCloseDialog?: () => void;
}

export function OperationalPlanSettingsManagement({
  forcedVpCode,
  hideSystemModeToggle = false,
  isDialogMode = false,
  onCloseDialog,
}: OperationalPlanSettingsManagementProps = {}) {
  const firestore = useFirestore();
  const { userProfile, systemSettings, isAdmin } = useUser();
  const { toast } = useToast();
  const { selectedYear } = useYear();

  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<VpStrategicGoal | null>(null);

  // New / Edit Goal State
  const [goalCluster, setGoalCluster] = useState<string>('VPAA');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalTargetMetric, setGoalTargetMetric] = useState('');
  const [goalArchipelagicPillar, setGoalArchipelagicPillar] = useState<string>('none');
  const [goalSucLevellingKra, setGoalSucLevellingKra] = useState<string>('none');
  const [goalQualityObjective, setGoalQualityObjective] = useState<string>('none');
  const [goalTenPointAgendas, setGoalTenPointAgendas] = useState<string[]>(['none']);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [filterCluster, setFilterCluster] = useState<string>('all');

  const currentMode: OperationalPlanSubmissionMode = systemSettings?.operationalPlanMode || 'structured_data';

  // 1. Fetch Users to dynamically discover actual VP accounts and exact office titles
  const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  // 2. Fetch Units to inspect official unit names
  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits } = useCollection<Unit>(unitsQuery);

  // 3. User VP Context Detection
  const userVpContext = useMemo(() => {
    return getUserVpContext(userProfile, allUnits);
  }, [userProfile, allUnits]);

  // Determine effective VP code for non-admins
  const effectiveVpCode = forcedVpCode || (!isAdmin && userVpContext.isVpOffice ? userVpContext.vpCode : null);

  useEffect(() => {
    if (effectiveVpCode) {
      setGoalCluster(effectiveVpCode);
      setFilterCluster(effectiveVpCode);
    }
  }, [effectiveVpCode]);

  // 4. Dynamically resolve VP offices from real users & units data
  const vpOptions = useMemo(() => {
    const baseOffices = [
      {
        code: 'VPAA',
        title: 'Office of the Vice President for Academic Affairs',
      },
      {
        code: 'VPAF',
        title: 'Office of the Vice President for Administration and Finance',
      },
      {
        code: 'VPREDI',
        title: 'Office of the Vice President for Research, Extension, Development, and Innovation',
      },
      {
        code: 'OVPSAS',
        title: 'Office of the Vice President for Student Affairs and Services',
      },
      {
        code: 'OP',
        title: 'Office of the President',
      },
    ];

    const result = new Map<
      string,
      {
        code: string;
        officeTitle: string;
        vpUserName?: string;
        vpUserId?: string;
      }
    >();

    baseOffices.forEach((b) => {
      result.set(b.code, {
        code: b.code,
        officeTitle: b.title,
      });
    });

    if (allUsers) {
      allUsers.forEach((u) => {
        const roleLower = (u.role || '').toLowerCase();
        const unitLower = (u.unitName || '').toLowerCase();
        const isVpRole = roleLower.includes('vice president') || roleLower.includes('vp');
        const isVpUnit = unitLower.includes('vice president') || unitLower.includes('ovp') || unitLower.includes('vp');

        if (isVpRole || isVpUnit) {
          let code = '';
          if (roleLower.includes('academic') || unitLower.includes('academic') || unitLower.includes('vpaa')) {
            code = 'VPAA';
          } else if (
            roleLower.includes('admin') ||
            roleLower.includes('finance') ||
            unitLower.includes('admin') ||
            unitLower.includes('finance') ||
            unitLower.includes('vpaf')
          ) {
            code = 'VPAF';
          } else if (
            roleLower.includes('research') ||
            roleLower.includes('extension') ||
            roleLower.includes('innovation') ||
            roleLower.includes('development') ||
            unitLower.includes('vpredi')
          ) {
            code = 'VPREDI';
          } else if (
            roleLower.includes('student') ||
            roleLower.includes('service') ||
            roleLower.includes('affair') ||
            unitLower.includes('student') ||
            unitLower.includes('ovpsas') ||
            unitLower.includes('vpsas') ||
            unitLower.includes('vsas')
          ) {
            code = 'OVPSAS';
          } else if (roleLower.includes('president') && !roleLower.includes('vice')) {
            code = 'OP';
          } else if (u.unitName) {
            code =
              u.unitName
                .replace(/[^A-Za-z0-9]/g, '')
                .slice(0, 8)
                .toUpperCase() || 'VP';
          }

          if (code) {
            const existing = result.get(code);
            const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
            const officeTitle = u.unitName && u.unitName.length > 5 ? u.unitName : existing?.officeTitle || u.role;

            result.set(code, {
              code,
              officeTitle,
              vpUserName: fullName ? `${fullName} (${u.role})` : undefined,
              vpUserId: u.id,
            });
          }
        }
      });
    }

    if (allUnits) {
      allUnits.forEach((unit) => {
        const lower = unit.name.toLowerCase();
        if (
          lower.includes('student') &&
          (lower.includes('vice president') ||
            lower.includes('ovpsas') ||
            lower.includes('vpsas') ||
            lower.includes('affairs'))
        ) {
          const entry = result.get('OVPSAS');
          if (entry) entry.officeTitle = unit.name;
        } else if (lower.includes('academic') && (lower.includes('vice president') || lower.includes('ovpaa'))) {
          const entry = result.get('VPAA');
          if (entry) entry.officeTitle = unit.name;
        } else if (
          (lower.includes('admin') || lower.includes('finance')) &&
          (lower.includes('vice president') || lower.includes('ovpaf'))
        ) {
          const entry = result.get('VPAF');
          if (entry) entry.officeTitle = unit.name;
        } else if (lower.includes('research') && (lower.includes('vice president') || lower.includes('ovpredi'))) {
          const entry = result.get('VPREDI');
          if (entry) entry.officeTitle = unit.name;
        }
      });
    }

    const list = Array.from(result.values());
    list.push({
      code: 'General',
      officeTitle: 'General University-Wide Strategic Objectives',
    });

    return list;
  }, [allUsers, allUnits]);

  // Fetch VP Strategic Goals for the Year
  const goalsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'vpStrategicGoals'), where('year', '==', selectedYear));
  }, [firestore, selectedYear]);

  const { data: goals, isLoading: isLoadingGoals } = useCollection<VpStrategicGoal>(goalsQuery);

  // Dynamic 10-Point Agenda Settings (AQ)
  const agendaSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'tenPointAgenda') : null),
    [firestore],
  );
  const { data: agendaSettings } = useDoc<TenPointAgendaSettings>(agendaSettingsRef);

  const activeAgendaList = useMemo(() => {
    if (agendaSettings?.items && Array.isArray(agendaSettings.items) && agendaSettings.items.length > 0) {
      return agendaSettings.items;
    }
    return UNIVERSITY_TEN_POINT_AGENDA;
  }, [agendaSettings]);

  const handleToggleMode = async (checked: boolean) => {
    if (!firestore || !userProfile || !isAdmin) return;
    setIsUpdatingMode(true);
    const newMode: OperationalPlanSubmissionMode = checked ? 'structured_data' : 'legacy_link';
    try {
      await setDoc(
        doc(firestore, 'system', 'settings'),
        {
          operationalPlanMode: newMode,
          updatedAt: serverTimestamp(),
          updatedBy: userProfile.id,
        },
        { merge: true },
      );
      toast({
        title: 'Operational Plan Mode Updated',
        description: checked
          ? 'Interactive Form QAO-01-025 Data Entry mode is now ACTIVE for all units.'
          : 'Reverted to Legacy Google Drive Link submission mode.',
      });
    } catch (error: any) {
      console.error('Failed to update operational plan mode:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Could not update system settings.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingMode(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingGoal(null);
    setGoalCluster(effectiveVpCode || 'VPAA');
    setGoalTitle('');
    setGoalDescription('');
    setGoalTargetMetric('');
    setGoalArchipelagicPillar('none');
    setGoalSucLevellingKra('none');
    setGoalQualityObjective('none');
    setGoalTenPointAgendas(['none']);
    setIsDialogOpen(true);
  };

  const handleOpenEditModal = (goal: VpStrategicGoal) => {
    setEditingGoal(goal);
    setGoalCluster(goal.vpCluster || effectiveVpCode || 'VPAA');
    setGoalTitle(goal.title || '');
    setGoalDescription(goal.description || '');
    setGoalTargetMetric(goal.targetMetric || '');
    setGoalArchipelagicPillar(goal.archipelagicPillar || 'none');
    setGoalSucLevellingKra(goal.sucLevellingKra || 'none');
    setGoalQualityObjective(goal.qualityObjective || 'none');
    const agendas = getAgendaList(goal.tenPointAgenda, goal.tenPointAgendas);
    setGoalTenPointAgendas(agendas.length > 0 ? agendas : ['none']);
    setIsDialogOpen(true);
  };

  const handleSaveGoal = async () => {
    if (!firestore || !userProfile || !goalTitle.trim()) return;
    setIsSavingGoal(true);
    const selectedOption = vpOptions.find((opt) => opt.code === goalCluster);
    const archipelagicPillar = goalArchipelagicPillar === 'none' ? '' : goalArchipelagicPillar;
    const sucLevellingKra = goalSucLevellingKra === 'none' ? '' : goalSucLevellingKra;
    const qualityObjective = goalQualityObjective === 'none' ? '' : goalQualityObjective;
    const validAgendas = goalTenPointAgendas.filter((a) => a && a !== 'none');
    const primaryAgenda = validAgendas[0] || '';

    try {
      if (editingGoal) {
        await updateDoc(doc(firestore, 'vpStrategicGoals', editingGoal.id), {
          vpCluster: goalCluster,
          vpOfficeName: selectedOption?.officeTitle || '',
          vpUserId: selectedOption?.vpUserId || '',
          vpUserName: selectedOption?.vpUserName || '',
          title: goalTitle.trim(),
          description: goalDescription.trim(),
          targetMetric: goalTargetMetric.trim(),
          archipelagicPillar,
          sucLevellingKra,
          qualityObjective,
          tenPointAgenda: primaryAgenda,
          tenPointAgendas: validAgendas,
          updatedAt: serverTimestamp(),
          updatedBy: userProfile.id,
        });
        toast({
          title: 'Strategic Goal Updated',
          description: 'The changes have been saved and cascaded across the system.',
        });
      } else {
        await addDoc(collection(firestore, 'vpStrategicGoals'), {
          year: selectedYear,
          vpCluster: goalCluster,
          vpOfficeName: selectedOption?.officeTitle || '',
          vpUserId: selectedOption?.vpUserId || '',
          vpUserName: selectedOption?.vpUserName || '',
          title: goalTitle.trim(),
          description: goalDescription.trim(),
          targetMetric: goalTargetMetric.trim(),
          archipelagicPillar,
          sucLevellingKra,
          qualityObjective,
          tenPointAgenda: primaryAgenda,
          tenPointAgendas: validAgendas,
          isActive: true,
          createdBy: userProfile.id,
          createdByName: `${userProfile.firstName} ${userProfile.lastName}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({
          title: 'Strategic Goal Added',
          description: 'Units can now link their operational plan objectives to this goal.',
        });
      }

      setGoalTitle('');
      setGoalDescription('');
      setGoalTargetMetric('');
      setGoalArchipelagicPillar('none');
      setGoalSucLevellingKra('none');
      setGoalQualityObjective('none');
      setGoalTenPointAgendas(['none']);
      setEditingGoal(null);
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving strategic goal:', error);
      toast({
        title: 'Failed to save goal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'vpStrategicGoals', id));
      toast({ title: 'Goal Deleted', description: 'The strategic goal was removed.' });
    } catch (error: any) {
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleSeedDefaultGoals = async () => {
    if (!firestore || !userProfile || !isAdmin) return;
    setIsSeeding(true);
    try {
      for (const item of DEFAULT_STRATEGIC_GOALS) {
        await addDoc(collection(firestore, 'vpStrategicGoals'), {
          year: selectedYear,
          vpCluster: item.vpCluster,
          vpOfficeName: item.vpOfficeName,
          title: item.title,
          description: item.description,
          targetMetric: item.targetMetric,
          archipelagicPillar: item.archipelagicPillar || '',
          sucLevellingKra: item.sucLevellingKra,
          qualityObjective: item.qualityObjective,
          tenPointAgenda: item.tenPointAgendas?.[0] || item.tenPointAgenda || '',
          tenPointAgendas: item.tenPointAgendas || (item.tenPointAgenda ? [item.tenPointAgenda] : []),
          isActive: true,
          createdBy: userProfile.id,
          createdByName: `${userProfile.firstName} ${userProfile.lastName}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      toast({
        title: 'Default Institutional Goals Seeded',
        description: `Added ${DEFAULT_STRATEGIC_GOALS.length} baseline strategic goals for AY ${selectedYear}.`,
      });
    } catch (error: any) {
      toast({ title: 'Seeding Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSeeding(false);
    }
  };

  const canModifyGoal = (goal: VpStrategicGoal) => {
    if (isAdmin) return true;
    if (userVpContext.isVpOffice) {
      if (effectiveVpCode && (goal.vpCluster || '').toUpperCase() === effectiveVpCode.toUpperCase()) return true;
      if (userVpContext.vpCode && (goal.vpCluster || '').toUpperCase() === userVpContext.vpCode.toUpperCase())
        return true;
      return true;
    }
    return false;
  };

  const filteredGoals = useMemo(() => {
    if (!goals) return [];
    if (filterCluster === 'all') return goals;
    return goals.filter((g) => (g.vpCluster || '').toUpperCase() === filterCluster.toUpperCase());
  }, [goals, filterCluster]);

  return (
    <div className="space-y-6">
      {/* 1. Dual Mode Master Toggle Card (Shown only to System Admins when not forced hidden) */}
      {!hideSystemModeToggle && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-sm overflow-hidden">
          <CardHeader className="bg-primary/5 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-bold">
                    Archipelagic Intelligence (AQ) Settings &amp; Engine
                  </CardTitle>
                </div>
                <CardDescription>
                  Configure the Archipelagic Intelligence (AQ) operational cascade, Form QAO-01-025 interactive
                  workspace, and Vice Presidential strategic objectives.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 bg-background border px-4 py-2 rounded-xl shadow-xs">
                <Label htmlFor="op-mode-toggle" className="text-xs font-bold uppercase tracking-wider cursor-pointer">
                  {currentMode === 'structured_data' ? (
                    <span className="text-emerald-600 flex items-center gap-1.5 font-black">
                      <CheckCircle2 className="h-4 w-4" /> Interactive Workspace (Active)
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <LinkIcon className="h-4 w-4" /> Legacy Link Mode
                    </span>
                  )}
                </Label>
                <Switch
                  id="op-mode-toggle"
                  checked={currentMode === 'structured_data'}
                  onCheckedChange={handleToggleMode}
                  disabled={isUpdatingMode || !isAdmin}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div
                className={`p-4 rounded-xl border transition-colors ${currentMode === 'structured_data' ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-300' : 'bg-muted/40 opacity-70'}`}
              >
                <div className="flex items-center gap-2 font-bold mb-1 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Structured Data Entry Mode (Recommended)
                </div>
                <p className="leading-relaxed">
                  Units enter their tasks, timelines, budgets, success indicators, and progress directly into an
                  interactive Form QAO-01-025 table. Once approved by the VP, baseline targets are locked and immutable.
                  Automatically calculates KPIs.
                </p>
              </div>
              <div
                className={`p-4 rounded-xl border transition-colors ${currentMode === 'legacy_link' ? 'bg-amber-50/50 border-amber-200 text-amber-950 dark:bg-amber-950/20 dark:text-amber-300' : 'bg-muted/40 opacity-70'}`}
              >
                <div className="flex items-center gap-2 font-bold mb-1 text-sm">
                  <LinkIcon className="h-4 w-4 text-amber-600" />
                  Legacy Google Drive Link Mode
                </div>
                <p className="leading-relaxed">
                  Units upload an offline document (Word/Excel/PDF) to Google Drive and paste the shareable link in the
                  portal. Approvers review the document directly via the external link.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Institutional Strategic Goals (VP Objectives) */}
      <Card className="shadow-xs">
        <CardHeader>
          {/* User VP Office Status Banner */}
          {userVpContext.isVpOffice && (
            <div className="mb-3 p-3 rounded-xl border bg-primary/5 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-semibold text-foreground">
                  Supervising Office:{' '}
                  <strong className="text-primary">{userVpContext.officeTitle || userVpContext.vpCode}</strong>
                </span>
                <Badge variant="outline" className="text-[10px] font-bold bg-background">
                  {userProfile?.role || 'VP Staff'}
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground italic">
                You have permission to create and manage institutional strategic goals for this office.
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Institutional Strategic Objectives (AY {selectedYear})
              </CardTitle>
              <CardDescription>
                Define the university-wide goals set by the Vice Presidents. Units will select from these objectives
                when creating their Operational Plans.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/settings?tab=ten-point-agenda">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
                >
                  <Compass className="h-3.5 w-3.5 text-cyan-600" />
                  10-Point Agenda Settings (AQ)
                </Button>
              </Link>
              {isAdmin && (!goals || goals.length === 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedDefaultGoals}
                  disabled={isSeeding}
                  className="text-xs"
                >
                  {isSeeding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
                  )}
                  Seed Default Goals
                </Button>
              )}
              <Button size="sm" onClick={handleOpenCreateModal} className="text-xs font-bold gap-1 shadow-sm">
                <Plus className="h-3.5 w-3.5" /> Add Strategic Goal
              </Button>
            </div>
          </div>

          {/* Cluster Filter Tabs */}
          <div className="flex items-center gap-1.5 pt-3 overflow-x-auto">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 uppercase">Filter:</span>
            <Button
              variant={filterCluster === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCluster('all')}
              className="text-[11px] h-7 px-2.5 font-bold"
            >
              All Offices ({goals?.length || 0})
            </Button>
            {vpOptions.map((opt) => {
              const count = (goals || []).filter(
                (g) => (g.vpCluster || '').toUpperCase() === opt.code.toUpperCase(),
              ).length;
              return (
                <Button
                  key={opt.code}
                  variant={filterCluster === opt.code ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterCluster(opt.code)}
                  className="text-[11px] h-7 px-2.5 font-bold"
                >
                  {opt.code} ({count})
                </Button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingGoals ? (
            <div className="py-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading institutional goals...
            </div>
          ) : !filteredGoals || filteredGoals.length === 0 ? (
            <div className="text-center py-8 border rounded-xl bg-muted/20 space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">
                No institutional strategic goals found for{' '}
                {filterCluster === 'all' ? `AY ${selectedYear}` : `${filterCluster} cluster`}.
              </p>
              <p className="text-xs text-muted-foreground">
                Click &quot;Add Strategic Goal&quot; to define goals for your office.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-36">Supervising Office</TableHead>
                    <TableHead>Strategic Objective</TableHead>
                    <TableHead>Target Metric</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGoals.map((goal) => {
                    const isEditable = canModifyGoal(goal);
                    return (
                      <TableRow key={goal.id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <Badge variant="outline" className="font-mono text-[10px] font-bold">
                              {goal.vpCluster}
                            </Badge>
                            {goal.vpOfficeName && (
                              <div
                                className="text-[10px] text-muted-foreground truncate max-w-[200px]"
                                title={goal.vpOfficeName}
                              >
                                {goal.vpOfficeName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-xs">{goal.title}</div>
                          {goal.description && (
                            <div className="text-[11px] text-muted-foreground line-clamp-1">{goal.description}</div>
                          )}
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {goal.archipelagicPillar && (
                              <Badge
                                variant="outline"
                                className="bg-purple-50/80 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 text-[9px] font-bold px-1.5 py-0 h-4"
                              >
                                Archipelagic (AQ): {goal.archipelagicPillar.split(':')[0]}
                              </Badge>
                            )}
                            {goal.sucLevellingKra && (
                              <Badge
                                variant="outline"
                                className="bg-blue-50/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 text-[9px] font-bold px-1.5 py-0 h-4"
                              >
                                {goal.sucLevellingKra.split(':')[0]}
                              </Badge>
                            )}
                            {getAgendaList(goal.tenPointAgenda, goal.tenPointAgendas).map((agenda, aIdx) => (
                              <Badge
                                key={aIdx}
                                variant="outline"
                                className="bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 text-[9px] font-bold px-1.5 py-0 h-4"
                              >
                                {agenda.split(':')[0]}
                              </Badge>
                            ))}
                            {goal.qualityObjective && (
                              <Badge
                                variant="outline"
                                className="bg-amber-50/80 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 text-[9px] font-bold px-1.5 py-0 h-4"
                              >
                                {goal.qualityObjective.split(':')[0]}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                          {goal.targetMetric || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => handleOpenEditModal(goal)}
                              disabled={!isEditable}
                              title={isEditable ? 'Edit Goal' : 'View only (Requires office authorization)'}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteGoal(goal.id)}
                              disabled={!isEditable}
                              title={isEditable ? 'Delete Goal' : 'View only (Requires office authorization)'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      {/* Goal Creation / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGoal ? 'Edit Institutional Strategic Goal' : 'Add Institutional Strategic Goal'}
            </DialogTitle>
            <DialogDescription>
              {editingGoal
                ? 'Update strategic indicators, targets, and framework alignment.'
                : 'This objective will appear in the dropdown menu for all units under the chosen VP cluster.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Supervising VP Office / Cluster</Label>
              {!isAdmin && effectiveVpCode ? (
                <div className="p-2.5 rounded-lg border bg-muted/40 text-xs font-semibold flex items-center justify-between">
                  <span>
                    [{effectiveVpCode}]{' '}
                    {vpOptions.find((o) => o.code === effectiveVpCode)?.officeTitle || userVpContext.officeTitle}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    Your Office
                  </Badge>
                </div>
              ) : (
                <Select value={goalCluster} onValueChange={(val: any) => setGoalCluster(val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Supervising VP Office" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {vpOptions.map((opt) => (
                      <SelectItem key={opt.code} value={opt.code}>
                        <div className="flex flex-col text-left py-0.5 max-w-md">
                          <span className="font-semibold text-xs">
                            [{opt.code}] {opt.officeTitle}
                          </span>
                          {opt.vpUserName && (
                            <span className="text-[10.5px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <UserCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                              {opt.vpUserName}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Goal Title / Objective Statement</Label>
              <Input
                placeholder="e.g., Attain 100% Certificate of Program Compliance (COPC)"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target Metric (Optional)</Label>
              <Input
                placeholder="e.g., 100% compliance, >= 85% passing rate"
                value={goalTargetMetric}
                onChange={(e) => setGoalTargetMetric(e.target.value)}
              />
            </div>

            {/* 1. Archipelagic Pillar */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-bold text-xs">
                <span className="h-2 w-2 rounded-full bg-purple-600 inline-block" />
                1. Archipelagic Pillar (AQ Framework)
              </Label>
              <Select value={goalArchipelagicPillar} onValueChange={setGoalArchipelagicPillar}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Select Archipelagic Pillar..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none" className="text-xs text-muted-foreground">
                    -- None / General Objective --
                  </SelectItem>
                  {ARCHIPELAGIC_PILLARS.map((pillar) => (
                    <SelectItem key={pillar.code} value={pillar.title} className="text-xs">
                      <span className="font-semibold">{pillar.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. SUC Levelling KRA */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-bold text-xs">
                <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
                2. SUC Levelling Key Result Area (KRA)
              </Label>
              <Select value={goalSucLevellingKra} onValueChange={setGoalSucLevellingKra}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Select SUC Levelling KRA..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none" className="text-xs text-muted-foreground">
                    -- None / General Objective --
                  </SelectItem>
                  {SUC_LEVELLING_KRAS.map((kra) => (
                    <SelectItem key={kra.code} value={kra.title} className="text-xs">
                      <span className="font-semibold">{kra.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. ISO Quality Objective */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-bold text-xs">
                <span className="h-2 w-2 rounded-full bg-amber-600 inline-block" />
                3. ISO Quality Objective (Baseline)
              </Label>
              <Select value={goalQualityObjective} onValueChange={setGoalQualityObjective}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Select Quality Objective..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none" className="text-xs text-muted-foreground">
                    -- None / General Priority --
                  </SelectItem>
                  {UNIVERSITY_QUALITY_OBJECTIVES.map((qo) => (
                    <SelectItem key={qo.code} value={qo.title} className="text-xs">
                      <span className="font-semibold">{qo.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. University 10-Point Agenda (Dynamic) */}
            <div className="space-y-2 pt-1 border-t">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" />
                  4. University 10-Point Agenda (AQ) (Can select multiple)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setGoalTenPointAgendas((prev) => [...prev, 'none'])}
                  className="text-[10px] h-6 px-2 font-bold text-emerald-700 dark:text-emerald-300 gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Agenda
                </Button>
              </div>
              <div className="space-y-1.5">
                {goalTenPointAgendas.map((agendaVal, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Select
                      value={agendaVal}
                      onValueChange={(val) => {
                        setGoalTenPointAgendas((prev) => {
                          const updated = [...prev];
                          updated[idx] = val;
                          return updated;
                        });
                      }}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Select 10-Point Agenda..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="none" className="text-xs text-muted-foreground">
                          -- None / General Priority --
                        </SelectItem>
                        {activeAgendaList.map((agenda) => (
                          <SelectItem key={agenda.code} value={agenda.title} className="text-xs">
                            <span className="font-semibold">{agenda.title}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {goalTenPointAgendas.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => setGoalTenPointAgendas((prev) => prev.filter((_, i) => i !== idx))}
                        title="Remove this agenda"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description / Context</Label>
              <Textarea
                placeholder="Brief details or scope of this institutional priority..."
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGoal} disabled={isSavingGoal || !goalTitle.trim()}>
              {isSavingGoal ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : editingGoal ? (
                'Update Objective'
              ) : (
                'Save Objective'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
