'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc } from '@/firebase/firestore-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  GraduationCap,
  PlusCircle,
  Edit,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building,
  Info,
  Award,
  ExternalLink,
  Target,
  ShieldCheck,
  TrendingUp,
  FileText,
  Clock,
  Compass,
} from 'lucide-react';
import type {
  SucLevellingCycle,
  SucLevellingCycleStatus,
  SucIndicator,
  SucInstitutionalProfile,
  SucOfficialLevel,
  SystemSettings,
} from '@/lib/types';
import { DEFAULT_SUC_INDICATORS, SUC_LEVEL_THRESHOLDS } from '@/lib/suc-levelling-engine';

const SUC_LEVEL_DETAILS: Record<
  SucOfficialLevel,
  {
    title: string;
    salaryGrade: string;
    badgeClass: string;
    description: string;
    minTotal: number;
  }
> = {
  'Level V': {
    title: 'Top-Tier National Research University',
    salaryGrade: 'SG 31 (Highest Executive Tier)',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300',
    description:
      'Autonomous research institution with expanded international patents, specialized doctoral programs, and highest executive funding.',
    minTotal: 85.0,
  },
  'Level IV': {
    title: 'High-Performing Regional University',
    salaryGrade: 'SG 30 (Flagship Executive Tier)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
    description:
      'Regional flagship university qualifying for expanded vice presidential items, higher capital outlay, and specialized research centers.',
    minTotal: 65.0,
  },
  'Level III': {
    title: 'Established State University',
    salaryGrade: 'SG 29 (Established Institutional Tier)',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300',
    description:
      'Established multi-campus state university with stable institutional accreditation across primary colleges and programs.',
    minTotal: 45.0,
  },
  'Level II': {
    title: 'Developing State University',
    salaryGrade: 'SG 28 (Developing Institutional Tier)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
    description:
      'Developing state higher education institution building foundational research output, faculty credentials, and program accreditation.',
    minTotal: 25.0,
  },
  'Level I': {
    title: 'Foundational State University',
    salaryGrade: 'SG 27 (Foundational Tier)',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
    description: 'Base tier for emerging state colleges and nascent state university operations.',
    minTotal: 0.0,
  },
};

export function SucLevellingSettingsManagement() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userProfile, isAdmin, systemSettings } = useUser();

  // System Settings Document Query for Current SUC Levelling Standing Profile
  const settingsDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'settings') : null), [firestore]);
  const { data: systemSettingsDoc } = useDoc<SystemSettings>(settingsDocRef);
  const currentProfile: SucInstitutionalProfile | undefined =
    systemSettingsDoc?.sucLevellingProfile || systemSettings?.sucLevellingProfile;

  // Profile Dialog State & Form Fields
  const currentYear = new Date().getFullYear();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [profileCurrentLevel, setProfileCurrentLevel] = useState<SucOfficialLevel>('Level III');
  const [profileOfficialPoints, setProfileOfficialPoints] = useState<string>('45.0');
  const [profileConferredYear, setProfileConferredYear] = useState<number>(currentYear - 2);
  const [profileValidityPeriod, setProfileValidityPeriod] = useState<string>('AY 2022–2025');
  const [profileLegalBasis, setProfileLegalBasis] = useState<string>('DBM-CHED Joint Circular No. 1, s. 2016');
  const [profileConferredBy, setProfileConferredBy] = useState<string>(
    'DBM-CHED Joint Evaluation Committee (JREC / NREC)',
  );
  const [profileTargetNextLevel, setProfileTargetNextLevel] = useState<SucOfficialLevel>('Level IV');
  const [profileTargetYear, setProfileTargetYear] = useState<number>(currentYear + 2);
  const [profileEvidenceDriveUrl, setProfileEvidenceDriveUrl] = useState<string>('');
  const [profileStrategicVision, setProfileStrategicVision] = useState<string>('');

  // Firestore Collections for Cycles
  const cyclesCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sucLevellingCycles') : null),
    [firestore],
  );
  const { data: rawCycles, isLoading: cyclesLoading } = useCollection<SucLevellingCycle>(cyclesCollectionRef);

  const cycles = useMemo(() => {
    if (!rawCycles) return [];
    return [...rawCycles].sort((a, b) => (b.targetYearStart || 0) - (a.targetYearStart || 0));
  }, [rawCycles]);

  const handleOpenEditProfile = () => {
    if (currentProfile) {
      setProfileCurrentLevel(currentProfile.currentLevel || 'Level III');
      setProfileOfficialPoints(
        currentProfile.officialPoints !== undefined ? currentProfile.officialPoints.toString() : '',
      );
      setProfileConferredYear(currentProfile.conferredYear || currentYear - 2);
      setProfileValidityPeriod(currentProfile.validityPeriod || 'AY 2022–2025');
      setProfileLegalBasis(currentProfile.legalBasis || 'DBM-CHED Joint Circular No. 1, s. 2016');
      setProfileConferredBy(currentProfile.conferredBy || 'DBM-CHED Joint Evaluation Committee (JREC / NREC)');
      setProfileTargetNextLevel(currentProfile.targetNextLevel || 'Level IV');
      setProfileTargetYear(currentProfile.targetYear || currentYear + 2);
      setProfileEvidenceDriveUrl(currentProfile.evidenceDriveUrl || '');
      setProfileStrategicVision(currentProfile.strategicVision || '');
    } else {
      setProfileCurrentLevel('Level III');
      setProfileOfficialPoints('45.0');
      setProfileConferredYear(currentYear - 2);
      setProfileValidityPeriod('AY 2022–2025');
      setProfileLegalBasis('DBM-CHED Joint Circular No. 1, s. 2016');
      setProfileConferredBy('DBM-CHED Joint Evaluation Committee (JREC / NREC)');
      setProfileTargetNextLevel('Level IV');
      setProfileTargetYear(currentYear + 2);
      setProfileEvidenceDriveUrl('');
      setProfileStrategicVision('');
    }
    setIsProfileDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!firestore || !settingsDocRef) return;
    setIsSavingProfile(true);
    try {
      const parsedPoints = profileOfficialPoints.trim() ? parseFloat(profileOfficialPoints) : undefined;
      const profileData: SucInstitutionalProfile = {
        currentLevel: profileCurrentLevel,
        officialPoints: parsedPoints !== undefined && !isNaN(parsedPoints) ? parsedPoints : undefined,
        conferredYear: Number(profileConferredYear) || undefined,
        validityPeriod: profileValidityPeriod.trim() || undefined,
        legalBasis: profileLegalBasis.trim() || undefined,
        conferredBy: profileConferredBy.trim() || undefined,
        targetNextLevel: profileTargetNextLevel || undefined,
        targetYear: Number(profileTargetYear) || undefined,
        evidenceDriveUrl: profileEvidenceDriveUrl.trim() || undefined,
        strategicVision: profileStrategicVision.trim() || undefined,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.id || '',
        updatedByName: userProfile
          ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.email
          : 'Administrator',
      };

      await setDoc(
        settingsDocRef,
        { sucLevellingProfile: profileData, updatedAt: new Date().toISOString() },
        { merge: true },
      );

      toast({
        title: 'Current SUC Level Updated',
        description: `Institutional baseline successfully recorded as ${profileCurrentLevel}.`,
      });
      setIsProfileDialogOpen(false);
    } catch (err: any) {
      toast({
        title: 'Error Saving Profile',
        description: err.message || 'Failed to update SUC Levelling standing.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Dialog States
  const [isCycleDialogOpen, setIsCycleDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<SucLevellingCycle | null>(null);
  const [cycleToDelete, setCycleToDelete] = useState<SucLevellingCycle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [cycleName, setCycleName] = useState('');
  const [targetYearStart, setTargetYearStart] = useState(currentYear);
  const [targetYearEnd, setTargetYearEnd] = useState(currentYear + 3);
  const [status, setStatus] = useState<SucLevellingCycleStatus>('DataCollection');
  const [notes, setNotes] = useState('');

  // Active indicator inspection tab
  const [activeKraTab, setActiveKraTab] = useState<string>('ALL');

  const filteredIndicators = useMemo(() => {
    if (activeKraTab === 'ALL') return DEFAULT_SUC_INDICATORS;
    return DEFAULT_SUC_INDICATORS.filter((ind) => ind.kraId === activeKraTab);
  }, [activeKraTab]);

  const handleOpenAddCycle = () => {
    setEditingCycle(null);
    setCycleName(`AY ${currentYear}–${currentYear + 3} SUC Levelling Assessment`);
    setTargetYearStart(currentYear);
    setTargetYearEnd(currentYear + 3);
    setStatus('DataCollection');
    setNotes('');
    setIsCycleDialogOpen(true);
  };

  const handleOpenEditCycle = (cycle: SucLevellingCycle) => {
    setEditingCycle(cycle);
    setCycleName(cycle.cycleName);
    setTargetYearStart(cycle.targetYearStart);
    setTargetYearEnd(cycle.targetYearEnd);
    setStatus(cycle.status || 'DataCollection');
    setNotes(cycle.notes || '');
    setIsCycleDialogOpen(true);
  };

  const handleSaveCycle = async () => {
    if (!cycleName.trim()) {
      toast({
        title: 'Cycle Name Required',
        description: 'Please provide a clear title for this assessment period.',
        variant: 'destructive',
      });
      return;
    }

    if (!firestore) return;
    setIsSaving(true);
    try {
      const cycleId = editingCycle ? editingCycle.id : `cycle_${Date.now()}`;
      const cycleRef = doc(firestore, 'sucLevellingCycles', cycleId);

      const cycleData: Partial<SucLevellingCycle> = {
        id: cycleId,
        cycleName: cycleName.trim(),
        targetYearStart: Number(targetYearStart),
        targetYearEnd: Number(targetYearEnd),
        status,
        isFinalized: status === 'Finalized',
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (!editingCycle) {
        cycleData.createdAt = new Date().toISOString();
        cycleData.scoringCeilings = {
          kra1Max: 35.0,
          kra2Max: 30.0,
          kra3Max: 20.0,
          kra4Max: 15.0,
        };
      }

      await setDoc(cycleRef, cycleData, { merge: true });

      toast({
        title: editingCycle ? 'Cycle Updated' : 'Cycle Created',
        description: `Assessment cycle "${cycleName}" is now saved.`,
      });
      setIsCycleDialogOpen(false);
    } catch (err: any) {
      toast({
        title: 'Error Saving Cycle',
        description: err.message || 'Failed to save SUC Levelling cycle.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCycle = async () => {
    if (!firestore || !cycleToDelete) return;
    setIsDeleting(true);
    try {
      const cycleRef = doc(firestore, 'sucLevellingCycles', cycleToDelete.id);
      await deleteDoc(cycleRef);
      toast({
        title: 'Cycle Deleted',
        description: `Cycle "${cycleToDelete.cycleName}" has been removed.`,
      });
      setCycleToDelete(null);
    } catch (err: any) {
      toast({
        title: 'Deletion Failed',
        description: err.message || 'Failed to remove cycle.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleFinalized = async (cycle: SucLevellingCycle) => {
    if (!firestore) return;
    try {
      const cycleRef = doc(firestore, 'sucLevellingCycles', cycle.id);
      const newFinalized = !cycle.isFinalized;
      await updateDoc(cycleRef, {
        isFinalized: newFinalized,
        status: newFinalized ? 'Finalized' : 'DataCollection',
        updatedAt: new Date().toISOString(),
      });
      toast({
        title: newFinalized ? 'Cycle Finalized' : 'Cycle Reopened',
        description: `Cycle status updated to ${newFinalized ? 'Finalized' : 'DataCollection'}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Status Update Failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-amber-900/10 via-amber-800/5 to-transparent p-5 rounded-xl border border-amber-500/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <GraduationCap className="h-5 w-5" />
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              SUC Levelling Institutional Configuration
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Configure DBM-CHED multi-year assessment cycles, manage institutional evaluation windows, and oversee the 15
            standard performance indicators across all 4 Key Result Areas (KRAs).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAddCycle}
            className="font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Assessment Cycle
          </Button>
        </div>
      </div>

      {/* Current Official Institutional SUC Level Standing Card */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-background shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Award className="h-6 w-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                    Current Institutional SUC Levelling Standing
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] text-amber-700 dark:text-amber-300 border-amber-400/40 bg-amber-500/10"
                  >
                    Official Baseline
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Official DBM-CHED Joint Evaluation standing conferred on the university, establishing the
                  institutional baseline for executive salary grades, regional funding ceilings, and accreditation
                  thresholds.
                </CardDescription>
              </div>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEditProfile}
                className="font-bold border-amber-500/30 text-amber-800 dark:text-amber-200 hover:bg-amber-500/10 self-start sm:self-auto shrink-0"
              >
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                {currentProfile ? 'Update Standing' : 'Set Current SUC Level'}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {currentProfile ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Pillar 1: Official Conferred Level */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Conferred Level
                    </span>
                    <Badge
                      className={`text-xs font-black uppercase tracking-wider ${
                        SUC_LEVEL_DETAILS[currentProfile.currentLevel]?.badgeClass || ''
                      }`}
                    >
                      {currentProfile.currentLevel}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {SUC_LEVEL_DETAILS[currentProfile.currentLevel]?.title || currentProfile.currentLevel}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {SUC_LEVEL_DETAILS[currentProfile.currentLevel]?.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Presidential Tier:</span>
                    <span className="font-bold text-foreground">
                      {SUC_LEVEL_DETAILS[currentProfile.currentLevel]?.salaryGrade || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Official Points:</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 font-mono">
                      {currentProfile.officialPoints !== undefined
                        ? `${currentProfile.officialPoints.toFixed(2)} pts`
                        : 'Conferred'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pillar 2: Legal Authority & Concurrence */}
              <div className="p-4 rounded-xl border border-border/60 bg-card flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Accreditation & Legal Basis
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Concurrence Authority:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 leading-tight block">
                        {currentProfile.conferredBy || 'DBM-CHED Joint Evaluation Committee (JREC / NREC)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Legal Circular / BOR Res.:</span>
                      <span className="font-mono text-[11px] text-foreground font-medium block">
                        {currentProfile.legalBasis || 'DBM-CHED Joint Circular No. 1, s. 2016'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Year & Validity:</span>
                      <span className="font-medium text-foreground">
                        {currentProfile.conferredYear ? `Conferred: ${currentProfile.conferredYear}` : ''}
                        {currentProfile.validityPeriod ? ` (${currentProfile.validityPeriod})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {currentProfile.evidenceDriveUrl && (
                  <div className="pt-2 border-t border-border/40">
                    <a
                      href={currentProfile.evidenceDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Concurrence Document (Drive)
                    </a>
                  </div>
                )}
              </div>

              {/* Pillar 3: Institutional Trajectory */}
              <div className="p-4 rounded-xl border border-border/60 bg-card flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Elevation Goal
                    </span>
                    {currentProfile.targetNextLevel && (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400/30 text-xs font-bold">
                        Target: {currentProfile.targetNextLevel}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs space-y-1">
                    {currentProfile.targetYear && (
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Target Assessment Horizon:{' '}
                        <span className="font-bold text-foreground">AY {currentProfile.targetYear}</span>
                      </p>
                    )}
                    {currentProfile.targetNextLevel && (
                      <p className="text-muted-foreground text-[11px]">
                        Minimum Point Threshold:{' '}
                        <span className="font-mono font-bold text-foreground">
                          {SUC_LEVEL_DETAILS[currentProfile.targetNextLevel]?.minTotal.toFixed(1)} pts
                        </span>
                      </p>
                    )}
                  </div>
                  {currentProfile.strategicVision && (
                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border/40 text-xs text-muted-foreground italic leading-relaxed">
                      "{currentProfile.strategicVision}"
                    </div>
                  )}
                </div>

                {currentProfile.updatedAt && (
                  <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                    Last updated {new Date(currentProfile.updatedAt).toLocaleDateString()}{' '}
                    {currentProfile.updatedByName ? `by ${currentProfile.updatedByName}` : ''}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    No Official Baseline SUC Level Profile Recorded Yet
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Record Romblon State University's current official DBM-CHED SUC Level (e.g. Level III), official
                    conferred points, circular reference, and elevation targets.
                  </p>
                </div>
              </div>
              {isAdmin && (
                <Button
                  onClick={handleOpenEditProfile}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0"
                >
                  <PlusCircle className="mr-1.5 h-4 w-4" />
                  Establish Current SUC Level
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cycle List Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                Assessment Cycles & Institutional Windows
              </CardTitle>
              <CardDescription>
                Multi-year assessment horizons for DBM-CHED Joint Regional Evaluation Committee (JREC) submission.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {cycles.length} Cycles Configured
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-bold text-xs">Cycle Name</TableHead>
                <TableHead className="font-bold text-xs">Assessment Horizon</TableHead>
                <TableHead className="font-bold text-xs">Workflow Status</TableHead>
                <TableHead className="font-bold text-xs">Scoring Ceilings</TableHead>
                <TableHead className="font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cyclesLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading SUC Levelling cycles...
                  </TableCell>
                </TableRow>
              ) : cycles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <GraduationCap className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="font-medium text-sm">No assessment cycles created yet.</p>
                      <p className="text-xs text-muted-foreground max-w-sm mt-1">
                        Click "New Assessment Cycle" to establish the official DBM-CHED multi-year assessment period for
                        Romblon State University.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                cycles.map((cycle) => (
                  <TableRow key={cycle.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{cycle.cycleName}</div>
                      {cycle.notes && <div className="text-xs text-muted-foreground line-clamp-1">{cycle.notes}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {cycle.targetYearStart} – {cycle.targetYearEnd}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[10px] font-bold ${
                          cycle.status === 'Finalized'
                            ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                            : cycle.status === 'InternalReview'
                              ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                              : cycle.status === 'Submitted'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {cycle.status || 'DataCollection'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      KRA1: 35 | KRA2: 30 | KRA3: 20 | KRA4: 15
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFinalized(cycle)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {cycle.isFinalized ? 'Reopen' : 'Finalize'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditCycle(cycle)}
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCycleToDelete(cycle)}
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Indicator Matrix Explorer */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                DBM-CHED Master Indicator Catalog & Means of Verification (MOV)
              </CardTitle>
              <CardDescription>
                Full specification of the 15 evaluation points, ceiling allocations, target units, and required Google
                Drive audit documents.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              100.0 Maximum Institutional Points
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs value={activeKraTab} onValueChange={setActiveKraTab} className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/60">
              <TabsTrigger value="ALL" className="text-xs font-bold py-1.5">
                All KRAs (15)
              </TabsTrigger>
              <TabsTrigger value="KRA_1" className="text-xs font-bold py-1.5 text-blue-700 dark:text-blue-300">
                KRA 1: Education (35 pts)
              </TabsTrigger>
              <TabsTrigger value="KRA_2" className="text-xs font-bold py-1.5 text-purple-700 dark:text-purple-300">
                KRA 2: Research (30 pts)
              </TabsTrigger>
              <TabsTrigger value="KRA_3" className="text-xs font-bold py-1.5 text-emerald-700 dark:text-emerald-300">
                KRA 3: Resources (20 pts)
              </TabsTrigger>
              <TabsTrigger value="KRA_4" className="text-xs font-bold py-1.5 text-amber-700 dark:text-amber-300">
                KRA 4: Governance (15 pts)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {filteredIndicators.map((ind) => (
              <div
                key={ind.id}
                className="p-4 rounded-lg border bg-card hover:border-amber-400/50 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="font-mono text-xs font-black bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                        {ind.code}
                      </Badge>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                        {ind.title}
                      </h4>
                    </div>
                    <Badge
                      variant="outline"
                      className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 shrink-0"
                    >
                      {ind.maxAllowablePoints.toFixed(1)} pts
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ind.description}</p>
                </div>

                <div className="bg-muted/40 p-2.5 rounded-md text-[11px] space-y-1 border border-border/50">
                  <div className="flex items-center justify-between text-muted-foreground font-medium">
                    <span>
                      Calculation: <strong className="text-foreground">{ind.calculationType}</strong>
                    </span>
                    <span>
                      Target: <strong className="text-foreground">{ind.targetUnit}</strong>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-border/40">
                    <span className="font-bold text-amber-600 dark:text-amber-400">Required MOV: </span>
                    {ind.movDescription}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cycle Edit / Create Dialog */}
      <Dialog open={isCycleDialogOpen} onOpenChange={setIsCycleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCycle ? 'Edit SUC Levelling Cycle' : 'Create SUC Levelling Cycle'}</DialogTitle>
            <DialogDescription>Define the assessment scope, evaluation window, and workflow stage.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cycle Title</label>
              <Input
                value={cycleName}
                onChange={(e) => setCycleName(e.target.value)}
                placeholder="e.g. AY 2024–2027 SUC Levelling Assessment"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Year</label>
                <Input
                  type="number"
                  value={targetYearStart}
                  onChange={(e) => setTargetYearStart(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Year</label>
                <Input type="number" value={targetYearEnd} onChange={(e) => setTargetYearEnd(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Workflow Stage</label>
              <Select value={status} onValueChange={(val) => setStatus(val as SucLevellingCycleStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft (Setup Phase)</SelectItem>
                  <SelectItem value="DataCollection">Data Collection (Delivery Units Submitting)</SelectItem>
                  <SelectItem value="InternalReview">Internal QA Task Force Review</SelectItem>
                  <SelectItem value="Submitted">Submitted to DBM-CHED JREC</SelectItem>
                  <SelectItem value="Finalized">Finalized & Conferred</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Notes & Executive Directives
              </label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Administrative directives, BOR resolution references, or evaluation team notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCycleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCycle}
              disabled={isSaving}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {isSaving ? 'Saving...' : editingCycle ? 'Update Cycle' : 'Create Cycle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!cycleToDelete} onOpenChange={() => setCycleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment Cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{cycleToDelete?.cycleName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCycle}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeleting ? 'Deleting...' : 'Delete Cycle'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* SUC Levelling Institutional Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Award className="h-5 w-5" />
              </span>
              <DialogTitle className="text-lg font-bold">Configure Current SUC Levelling Standing</DialogTitle>
            </div>
            <DialogDescription>
              Record Romblon State University's current official DBM-CHED SUC Level, conferred score, legal basis, and
              institutional elevation targets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Section 1: Official Conferred Level & Score */}
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                <ShieldCheck className="h-4 w-4" />
                1. Official Conferred Standing
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Current Official SUC Level <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={profileCurrentLevel}
                    onValueChange={(val) => setProfileCurrentLevel(val as SucOfficialLevel)}
                  >
                    <SelectTrigger className="font-bold">
                      <SelectValue placeholder="Select official SUC level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Level V">Level V — Top-Tier National Research University (SG 31)</SelectItem>
                      <SelectItem value="Level IV">Level IV — High-Performing Regional University (SG 30)</SelectItem>
                      <SelectItem value="Level III">Level III — Established State University (SG 29)</SelectItem>
                      <SelectItem value="Level II">Level II — Developing State University (SG 28)</SelectItem>
                      <SelectItem value="Level I">Level I — Foundational State University (SG 27)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Official Points Awarded (0.00 – 100.00)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={profileOfficialPoints}
                    onChange={(e) => setProfileOfficialPoints(e.target.value)}
                    placeholder="e.g. 48.50"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Year Conferred
                  </label>
                  <Input
                    type="number"
                    value={profileConferredYear}
                    onChange={(e) => setProfileConferredYear(Number(e.target.value))}
                    placeholder="e.g. 2022"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Validity Horizon / Effective Period
                  </label>
                  <Input
                    value={profileValidityPeriod}
                    onChange={(e) => setProfileValidityPeriod(e.target.value)}
                    placeholder="e.g. AY 2022–2025 or Active"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Legal Basis & Authority */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                <FileText className="h-4 w-4 text-blue-600" />
                2. Legal Basis & Authority
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Concurrence Authority
                  </label>
                  <Input
                    value={profileConferredBy}
                    onChange={(e) => setProfileConferredBy(e.target.value)}
                    placeholder="e.g. DBM-CHED Joint Evaluation Committee (JREC / NREC)"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Joint Circular / BOR Resolution
                  </label>
                  <Input
                    value={profileLegalBasis}
                    onChange={(e) => setProfileLegalBasis(e.target.value)}
                    placeholder="e.g. DBM-CHED Joint Circular No. 1, s. 2016"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Official Concurrence Document Link (Google Drive)
                </label>
                <Input
                  value={profileEvidenceDriveUrl}
                  onChange={(e) => setProfileEvidenceDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                />
                <p className="text-[11px] text-muted-foreground">
                  Attach official PDF certificate, DBM notice of salary grade adjustment, or Board of Regents
                  resolution.
                </p>
              </div>
            </div>

            {/* Section 3: Institutional Elevation Target */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                <Target className="h-4 w-4" />
                3. Institutional Elevation Target
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Target SUC Level
                  </label>
                  <Select
                    value={profileTargetNextLevel}
                    onValueChange={(val) => setProfileTargetNextLevel(val as SucOfficialLevel)}
                  >
                    <SelectTrigger className="font-bold">
                      <SelectValue placeholder="Select target level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Level V">Level V — 85.0+ Points (Research Flagship)</SelectItem>
                      <SelectItem value="Level IV">Level IV — 65.0+ Points (Regional Flagship)</SelectItem>
                      <SelectItem value="Level III">Level III — 45.0+ Points (Established)</SelectItem>
                      <SelectItem value="Level II">Level II — 25.0+ Points (Developing)</SelectItem>
                      <SelectItem value="Level I">Level I — Foundational Tier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Target Assessment Horizon (Year)
                  </label>
                  <Input
                    type="number"
                    value={profileTargetYear}
                    onChange={(e) => setProfileTargetYear(Number(e.target.value))}
                    placeholder="e.g. 2027"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Strategic Vision & Focal Directives
                </label>
                <Textarea
                  rows={2}
                  value={profileStrategicVision}
                  onChange={(e) => setProfileStrategicVision(e.target.value)}
                  placeholder="e.g. Elevating RSU to SUC Level IV by intensifying faculty research publications (KRA 2), achieving 100% CHED COPC compliance, and commercializing patents."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {isSavingProfile ? 'Saving...' : 'Save SUC Level Standing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
