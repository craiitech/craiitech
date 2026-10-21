'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
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
} from 'lucide-react';
import type { SucLevellingCycle, SucLevellingCycleStatus, SucIndicator } from '@/lib/types';
import { DEFAULT_SUC_INDICATORS } from '@/lib/suc-levelling-engine';

export function SucLevellingSettingsManagement() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userProfile, isAdmin } = useUser();

  // Firestore Collections
  const cyclesCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sucLevellingCycles') : null),
    [firestore],
  );
  const { data: rawCycles, isLoading: cyclesLoading } = useCollection<SucLevellingCycle>(cyclesCollectionRef);

  const cycles = useMemo(() => {
    if (!rawCycles) return [];
    return [...rawCycles].sort((a, b) => (b.targetYearStart || 0) - (a.targetYearStart || 0));
  }, [rawCycles]);

  // Dialog States
  const [isCycleDialogOpen, setIsCycleDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<SucLevellingCycle | null>(null);
  const [cycleToDelete, setCycleToDelete] = useState<SucLevellingCycle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const currentYear = new Date().getFullYear();
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
    </div>
  );
}
