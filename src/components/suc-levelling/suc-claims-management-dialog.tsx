'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, setDoc, deleteDoc } from '@/firebase/firestore-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  GraduationCap,
  PlusCircle,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  FolderOpen,
  Edit,
  Trash2,
  ShieldCheck,
  Building2,
  Search,
} from 'lucide-react';
import type { SucLevellingCycle, SucIndicatorSubmission, SucMovDriveLink, Campus, Unit } from '@/lib/types';
import { DEFAULT_SUC_INDICATORS } from '@/lib/suc-levelling-engine';

interface SucClaimsManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campuses: Campus[];
  units: Unit[];
  activeYear: number;
}

export function SucClaimsManagementDialog({
  open,
  onOpenChange,
  campuses,
  units,
  activeYear,
}: SucClaimsManagementDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, userProfile, isAdmin } = useUser();

  // Firestore Collections
  const cyclesCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sucLevellingCycles') : null),
    [firestore],
  );
  const { data: cycles } = useCollection<SucLevellingCycle>(cyclesCollectionRef);

  const submissionsCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sucLevellingSubmissions') : null),
    [firestore],
  );
  const { data: rawSubmissions, isLoading: submissionsLoading } =
    useCollection<SucIndicatorSubmission>(submissionsCollectionRef);

  // Active Cycle Selection
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');

  const activeCycle = useMemo(() => {
    if (!cycles || cycles.length === 0) return null;
    if (selectedCycleId) {
      return cycles.find((c) => c.id === selectedCycleId) || cycles[0];
    }
    return cycles[0];
  }, [cycles, selectedCycleId]);

  // Tab State: 'list' or 'form'
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');

  // Filter Submissions by selected cycle
  const currentSubmissions = useMemo(() => {
    if (!rawSubmissions || !activeCycle) return [];
    return rawSubmissions.filter((s) => s.cycleId === activeCycle.id);
  }, [rawSubmissions, activeCycle]);

  // Search & Filter in list
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKra, setFilterKra] = useState('ALL');

  const filteredSubmissions = useMemo(() => {
    return currentSubmissions.filter((sub) => {
      const ind = DEFAULT_SUC_INDICATORS.find((i) => i.id === sub.indicatorId);
      const matchesKra = filterKra === 'ALL' || (ind && ind.kraId === filterKra);
      const matchesSearch =
        !searchTerm ||
        (ind &&
          (ind.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ind.title.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (sub.unitName && sub.unitName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sub.campusName && sub.campusName.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesKra && matchesSearch;
    });
  }, [currentSubmissions, filterKra, searchTerm]);

  // Form State
  const [editingSubmission, setEditingSubmission] = useState<SucIndicatorSubmission | null>(null);
  const [indicatorId, setIndicatorId] = useState<string>(DEFAULT_SUC_INDICATORS[0].id);
  const [unitId, setUnitId] = useState<string>(userProfile?.unitId || '');
  const [campusId, setCampusId] = useState<string>(userProfile?.campusId || '');
  const [academicYear, setAcademicYear] = useState<number>(activeYear);
  const [numeratorValue, setNumeratorValue] = useState<number>(1);
  const [denominatorValue, setDenominatorValue] = useState<number>(1);
  const [selfAwardedPoints, setSelfAwardedPoints] = useState<number>(0);
  const [movDriveUrl, setMovDriveUrl] = useState<string>('');
  const [movTitle, setMovTitle] = useState<string>('');
  const [validationStatus, setValidationStatus] = useState<'Pending' | 'Verified' | 'Flagged' | 'Rejected'>('Pending');
  const [validatedPoints, setValidatedPoints] = useState<number>(0);
  const [validatorRemarks, setValidatorRemarks] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Selected indicator details
  const selectedIndicator = useMemo(() => {
    return DEFAULT_SUC_INDICATORS.find((i) => i.id === indicatorId) || DEFAULT_SUC_INDICATORS[0];
  }, [indicatorId]);

  // Auto-calculate suggested self-points when indicator or inputs change
  const handleAutoCalcPoints = (num: number, den: number, indId: string) => {
    const ind = DEFAULT_SUC_INDICATORS.find((i) => i.id === indId);
    if (!ind) return;

    if (ind.calculationType === 'RATIO_PERCENT' && den > 0) {
      const ratio = Math.min(1, Math.max(0, num / den));
      const pts = Math.round(ratio * ind.maxAllowablePoints * 10) / 10;
      setSelfAwardedPoints(pts);
    } else if (ind.calculationType === 'DIRECT_VALUE') {
      setSelfAwardedPoints(Math.min(ind.maxAllowablePoints, num));
    } else {
      setSelfAwardedPoints(Math.min(ind.maxAllowablePoints, num));
    }
  };

  const handleOpenNewClaim = () => {
    setEditingSubmission(null);
    setIndicatorId(DEFAULT_SUC_INDICATORS[0].id);
    setUnitId(userProfile?.unitId || units[0]?.id || '');
    setCampusId(userProfile?.campusId || campuses[0]?.id || '');
    setAcademicYear(activeYear);
    setNumeratorValue(1);
    setDenominatorValue(1);
    setSelfAwardedPoints(DEFAULT_SUC_INDICATORS[0].maxAllowablePoints);
    setMovDriveUrl('');
    setMovTitle('');
    setValidationStatus('Pending');
    setValidatedPoints(0);
    setValidatorRemarks('');
    setActiveTab('form');
  };

  const handleEditClaim = (sub: SucIndicatorSubmission) => {
    setEditingSubmission(sub);
    setIndicatorId(sub.indicatorId);
    setUnitId(sub.unitId);
    setCampusId(sub.campusId);
    setAcademicYear(sub.academicYear || activeYear);
    setNumeratorValue(sub.numeratorValue || 1);
    setDenominatorValue(sub.denominatorValue || 1);
    setSelfAwardedPoints(sub.selfAwardedPoints || 0);
    setMovDriveUrl(sub.movDriveLinks?.[0]?.driveFolderUrl || '');
    setMovTitle(sub.movDriveLinks?.[0]?.title || '');
    setValidationStatus(sub.validationStatus || 'Pending');
    setValidatedPoints(sub.validatedPoints || 0);
    setValidatorRemarks(sub.validatorRemarks || '');
    setActiveTab('form');
  };

  const handleSaveClaim = async () => {
    if (!activeCycle) {
      toast({
        title: 'No Assessment Cycle',
        description: 'Please create an assessment cycle first in Settings > SUC Levelling.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedIndicator.requiresDriveEvidence && !movDriveUrl.trim()) {
      toast({
        title: 'Means of Verification Required',
        description: 'This DBM-CHED indicator requires a Google Drive folder or file link as documentary evidence.',
        variant: 'destructive',
      });
      return;
    }

    if (!firestore) return;
    setIsSaving(true);
    try {
      const claimId = editingSubmission ? editingSubmission.id : `claim_${Date.now()}`;
      const claimRef = doc(firestore, 'sucLevellingSubmissions', claimId);

      const campusObj = campuses.find((c) => c.id === campusId);
      const unitObj = units.find((u) => u.id === unitId);

      const movLinks: SucMovDriveLink[] = movDriveUrl.trim()
        ? [
            {
              title: movTitle.trim() || `${selectedIndicator.code} Verification Evidence`,
              driveFolderUrl: movDriveUrl.trim(),
            },
          ]
        : [];

      const rawMetric =
        denominatorValue > 0 ? Math.round((numeratorValue / denominatorValue) * 1000) / 10 : numeratorValue;

      const claimData: Partial<SucIndicatorSubmission> = {
        id: claimId,
        cycleId: activeCycle.id,
        indicatorId,
        unitId,
        unitName: unitObj?.name || 'Academic Unit',
        campusId,
        campusName: campusObj?.name || 'Main Campus',
        academicYear: Number(academicYear),
        numeratorValue: Number(numeratorValue),
        denominatorValue: Number(denominatorValue),
        rawMetricValue: rawMetric,
        selfAwardedPoints: Number(selfAwardedPoints),
        movDriveLinks: movLinks,
        validationStatus,
        validatedPoints:
          validationStatus === 'Verified' ? Number(validatedPoints || selfAwardedPoints) : Number(validatedPoints),
        validatorRemarks: validatorRemarks.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (!editingSubmission) {
        claimData.createdAt = new Date().toISOString();
      }

      if (validationStatus === 'Verified' && !claimData.validatedByName) {
        const vName = userProfile
          ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()
          : user?.displayName || 'Internal QA Task Force';
        claimData.validatedByName = vName || 'Internal QA Task Force';
        claimData.validatedById = userProfile?.id || user?.uid || 'taskforce';
        claimData.validatedAt = new Date().toISOString();
      }

      await setDoc(claimRef, claimData, { merge: true });

      toast({
        title: editingSubmission ? 'Claim Updated' : 'Indicator Claim Submitted',
        description: `Successfully filed claim for indicator ${selectedIndicator.code}.`,
      });

      setActiveTab('list');
    } catch (err: any) {
      toast({
        title: 'Error Saving Claim',
        description: err.message || 'Failed to record indicator claim.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClaim = async (sub: SucIndicatorSubmission) => {
    if (!firestore) return;
    if (!confirm(`Delete claim for indicator ${sub.indicatorId}?`)) return;
    try {
      const claimRef = doc(firestore, 'sucLevellingSubmissions', sub.id);
      await deleteDoc(claimRef);
      toast({
        title: 'Claim Deleted',
        description: 'Indicator claim and evidence link removed.',
      });
    } catch (err: any) {
      toast({
        title: 'Deletion Failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white p-5 border-b border-amber-500/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-amber-500/20 text-amber-400">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <DialogTitle className="text-lg font-black tracking-tight text-white">
                  SUC Levelling Delivery Unit Indicator Claims & MOV Hub
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-300">
                Official institutional portal for encoding performance metrics, uploading Google Drive audit evidence,
                and task force validation.
              </DialogDescription>
            </div>

            {/* Cycle Selector */}
            {cycles && cycles.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cycle:</span>
                <Select value={activeCycle?.id} onValueChange={(val) => setSelectedCycleId(val)}>
                  <SelectTrigger className="h-7 text-xs bg-transparent border-0 font-bold text-amber-300">
                    <SelectValue placeholder="Select Cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.cycleName} ({c.targetYearStart}–{c.targetYearEnd})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('list')}
                className="text-xs font-bold h-7"
              >
                Submitted Claims ({currentSubmissions.length})
              </Button>
              <Button
                variant={activeTab === 'form' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={handleOpenNewClaim}
                className="text-xs font-bold h-7 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Encode New Indicator Claim
              </Button>
            </div>

            {activeTab === 'list' && (
              <div className="flex items-center gap-2">
                <Select value={filterKra} onValueChange={setFilterKra}>
                  <SelectTrigger className="h-7 text-xs w-36 bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue placeholder="Filter KRA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All KRAs</SelectItem>
                    <SelectItem value="KRA_1">KRA 1: Education</SelectItem>
                    <SelectItem value="KRA_2">KRA 2: Research</SelectItem>
                    <SelectItem value="KRA_3">KRA 3: Resources</SelectItem>
                    <SelectItem value="KRA_4">KRA 4: Governance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'list' ? (
            <div className="space-y-3">
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl border-border/60">
                  <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="font-bold text-sm text-foreground">No indicator claims found for this cycle</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                    Delivery units have not logged any indicator data yet. Click "Encode New Indicator Claim" to file an
                    accomplishment with Google Drive verification links.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleOpenNewClaim}
                    className="mt-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                  >
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                    Encode First Indicator Claim
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs font-bold">Indicator</TableHead>
                      <TableHead className="text-xs font-bold">Delivery Unit</TableHead>
                      <TableHead className="text-xs font-bold">Metric / Ratio</TableHead>
                      <TableHead className="text-xs font-bold text-center">Self Pts</TableHead>
                      <TableHead className="text-xs font-bold text-center">Verified Pts</TableHead>
                      <TableHead className="text-xs font-bold">Status</TableHead>
                      <TableHead className="text-xs font-bold">MOV Evidence</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((sub) => {
                      const ind = DEFAULT_SUC_INDICATORS.find((i) => i.id === sub.indicatorId);
                      return (
                        <TableRow key={sub.id} className="hover:bg-muted/20">
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge className="font-mono text-[10px] font-black bg-slate-900 text-white">
                                {ind?.code || 'IND'}
                              </Badge>
                              <span className="font-bold text-xs line-clamp-1">{ind?.title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium">{sub.unitName || 'Academic Unit'}</div>
                            <div className="text-[10px] text-muted-foreground">{sub.campusName || 'Main Campus'}</div>
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {sub.numeratorValue} / {sub.denominatorValue} ({sub.rawMetricValue}%)
                          </TableCell>
                          <TableCell className="text-xs font-bold text-center text-amber-600 dark:text-amber-400">
                            {sub.selfAwardedPoints?.toFixed(1) || '0.0'}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-center text-emerald-600 dark:text-emerald-400">
                            {sub.validationStatus === 'Verified'
                              ? (sub.validatedPoints || sub.selfAwardedPoints)?.toFixed(1)
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-[9px] font-bold ${
                                sub.validationStatus === 'Verified'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : sub.validationStatus === 'Flagged'
                                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                                    : sub.validationStatus === 'Rejected'
                                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                                      : 'bg-slate-100 text-slate-800 border-slate-200'
                              }`}
                            >
                              {sub.validationStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sub.movDriveLinks && sub.movDriveLinks.length > 0 ? (
                              <a
                                href={sub.movDriveLinks[0].driveFolderUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Drive Dossier
                              </a>
                            ) : (
                              <span className="text-[10px] text-rose-500 font-medium">No MOV</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClaim(sub)}
                                className="h-7 w-7 text-blue-600 hover:text-blue-700"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClaim(sub)}
                                className="h-7 w-7 text-rose-600 hover:text-rose-700"
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
              )}
            </div>
          ) : (
            /* Encoding Form */
            <div className="space-y-4 max-w-3xl mx-auto">
              {/* Indicator Selector */}
              <div className="space-y-1.5 bg-muted/30 p-3.5 rounded-lg border">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                  <span>DBM-CHED Performance Indicator</span>
                  <Badge variant="outline" className="font-mono text-xs font-bold text-amber-600">
                    Max: {selectedIndicator.maxAllowablePoints} pts
                  </Badge>
                </label>
                <Select
                  value={indicatorId}
                  onValueChange={(val) => {
                    setIndicatorId(val);
                    handleAutoCalcPoints(numeratorValue, denominatorValue, val);
                  }}
                >
                  <SelectTrigger className="font-bold text-sm">
                    <SelectValue placeholder="Select Indicator" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {DEFAULT_SUC_INDICATORS.map((ind) => (
                      <SelectItem key={ind.id} value={ind.id} className="text-xs">
                        [{ind.code}] {ind.title} ({ind.maxAllowablePoints} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground pt-1 leading-relaxed">{selectedIndicator.description}</p>
                <div className="text-[11px] bg-amber-500/10 text-amber-800 dark:text-amber-300 p-2 rounded mt-2 border border-amber-500/20">
                  <span className="font-bold">Required MOV: </span>
                  {selectedIndicator.movDescription}
                </div>
              </div>

              {/* Delivery Unit & Campus */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Campus</label>
                  <Select value={campusId} onValueChange={setCampusId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select Campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {campuses.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Delivery Unit / College
                  </label>
                  <Select value={unitId} onValueChange={setUnitId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Evaluation Year
                  </label>
                  <Input
                    type="number"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Metric Values & Self-Awarded Points */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/20 p-3 rounded-lg border">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Numerator (Compliant / Earned)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={numeratorValue}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNumeratorValue(val);
                      handleAutoCalcPoints(val, denominatorValue, indicatorId);
                    }}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Denominator (Total Universe / Base)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={denominatorValue}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDenominatorValue(val);
                      handleAutoCalcPoints(numeratorValue, val, indicatorId);
                    }}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Self-Awarded Points
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    max={selectedIndicator.maxAllowablePoints}
                    value={selfAwardedPoints}
                    onChange={(e) => setSelfAwardedPoints(Number(e.target.value))}
                    className="font-mono font-bold text-sm bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  />
                </div>
              </div>

              {/* MOV Google Drive Evidence */}
              <div className="space-y-3 bg-blue-500/5 p-3.5 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Means of Verification (MOV) Drive Repository Link
                  </h4>
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="https://drive.google.com/drive/folders/... or authenticated link"
                    value={movDriveUrl}
                    onChange={(e) => setMovDriveUrl(e.target.value)}
                    className="text-xs font-mono"
                  />
                  <Input
                    placeholder="Evidence Dossier Title (e.g. 2024 PRC Board Licensure Certificates)"
                    value={movTitle}
                    onChange={(e) => setMovTitle(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Internal Task Force Validation Section */}
              <div className="space-y-3 bg-purple-500/5 p-3.5 rounded-lg border border-purple-500/20">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    Internal QA Task Force Assessment & Validation
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Verification Status
                    </label>
                    <Select value={validationStatus} onValueChange={(val) => setValidationStatus(val as any)}>
                      <SelectTrigger className="text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending QA Review</SelectItem>
                        <SelectItem value="Verified">Verified & Validated</SelectItem>
                        <SelectItem value="Flagged">Flagged (Lacking MOV)</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Validated Points (Official Score)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      max={selectedIndicator.maxAllowablePoints}
                      value={validatedPoints}
                      onChange={(e) => setValidatedPoints(Number(e.target.value))}
                      className="font-mono font-bold text-sm bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Validator Remarks & Audit Notes
                  </label>
                  <Textarea
                    rows={2}
                    value={validatorRemarks}
                    onChange={(e) => setValidatorRemarks(e.target.value)}
                    placeholder="Enter audit remarks or deficiency instructions for the delivery unit..."
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setActiveTab('list')} className="text-xs font-bold">
                  Back to List
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSaveClaim}
                    disabled={isSaving}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                  >
                    {isSaving ? 'Saving...' : editingSubmission ? 'Update Claim' : 'Submit Indicator Claim'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
