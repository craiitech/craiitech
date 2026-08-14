'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import type { Unit, ProcedureManual, ManualProcess } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Layers,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Hash,
  BookOpen,
  Eye,
  ExternalLink,
  Copy,
  Plus,
  ListChecks,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ProcedureManualProcessSlider } from '@/components/manuals/procedure-manual-process-slider';

const manualSchema = z.object({
  procedureNumber: z.string().optional().default(''),
  manualTitle: z.string().optional().default(''),
  numberOfProcesses: z.string().optional().default(''),
  revisionNumber: z.string().min(1, 'Revision number is required.').default('00'),
  revisionDate: z.string().optional().default(''),
  dateImplemented: z.string().optional().default(''),
  pageCount: z.string().optional().default(''),
  googleDriveLink: z.string().optional().default(''),
  status: z.enum(['Updated', 'Needs Revision', 'Not Submitted']).default('Not Submitted'),
});

type VirtualUnit = { id: string; name: string; isShared?: boolean };

export function ProcedureManualManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<VirtualUnit | null>(null);
  const [viewingUnit, setViewingUnit] = useState<VirtualUnit | null>(null);
  const [useOtherUnitManual, setUseOtherUnitManual] = useState(false);
  const [sourceUnitId, setSourceUnitId] = useState('');
  const [processesList, setProcessesList] = useState<ManualProcess[]>([]);
  const [newProcessNumber, setNewProcessNumber] = useState('');
  const [newProcessTitle, setNewProcessTitle] = useState('');

  const [newPart, setNewPart] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const configRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'procedureRevisionConfig') : null),
    [firestore],
  );
  const { data: revisionConfig, isLoading: isLoadingConfig } = useDoc<{ parts: string[] }>(configRef);

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPart.trim() || !firestore || !configRef) return;
    const currentParts = revisionConfig?.parts || [];
    if (currentParts.includes(newPart.trim())) {
      toast({
        title: 'Already Exists',
        description: 'This process part is already in the list.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsSavingConfig(true);
      await setDoc(configRef, { parts: [...currentParts, newPart.trim()] }, { merge: true });
      setNewPart('');
      toast({ title: 'Success', description: 'Process part added successfully.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add process part.', variant: 'destructive' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleDeletePart = async (partToDelete: string) => {
    if (!firestore || !configRef || !window.confirm(`Delete part "${partToDelete}"?`)) return;
    const currentParts = revisionConfig?.parts || [];
    try {
      setIsSavingConfig(true);
      await setDoc(configRef, { parts: currentParts.filter((p) => p !== partToDelete) }, { merge: true });
      toast({ title: 'Success', description: 'Process part removed.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove process part.', variant: 'destructive' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const manualsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'procedureManuals') : null),
    [firestore],
  );
  const { data: manuals, isLoading: isLoadingManuals } = useCollection<ProcedureManual>(manualsQuery);

  const manualMap = useMemo(() => {
    if (!manuals) return new Map<string, ProcedureManual>();
    return new Map(manuals.map((m) => [m.id, m]));
  }, [manuals]);

  const viewingManual = useMemo(() => {
    if (!viewingUnit) return null;
    return manualMap.get(viewingUnit.id) || null;
  }, [viewingUnit, manualMap]);

  const manageableUnits = useMemo(() => {
    if (!units) return [];

    return units.map((u) => ({ id: u.id, name: u.name, isShared: false })).sort((a, b) => a.name.localeCompare(b.name));
  }, [units]);

  const form = useForm<z.infer<typeof manualSchema>>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      procedureNumber: '',
      manualTitle: '',
      numberOfProcesses: '',
      revisionNumber: '00',
      revisionDate: '',
      dateImplemented: '',
      pageCount: '',
      googleDriveLink: '',
    },
  });

  const handleOpenDialog = (unit: VirtualUnit) => {
    setSelectedUnit(unit);
    const existingManual = manualMap.get(unit.id);
    const isCopied = Boolean(existingManual?.copiedFromUnitId);
    setUseOtherUnitManual(isCopied);
    setSourceUnitId(existingManual?.copiedFromUnitId || '');

    const existingProcesses = existingManual?.processes || [];
    setProcessesList(existingProcesses);
    setNewProcessNumber('');
    setNewProcessTitle('');

    const defaultStatus =
      (existingManual?.status as 'Updated' | 'Needs Revision' | 'Not Submitted') ||
      (existingManual && (existingManual.procedureNumber || existingManual.googleDriveLink)
        ? 'Updated'
        : 'Not Submitted');

    const totalProcessesCount =
      existingProcesses.length > 0
        ? String(existingProcesses.length)
        : existingManual?.numberOfProcesses !== undefined
          ? String(existingManual.numberOfProcesses)
          : '';

    form.reset({
      procedureNumber: existingManual?.procedureNumber || '',
      manualTitle: existingManual?.manualTitle || '',
      numberOfProcesses: totalProcessesCount,
      revisionNumber: existingManual?.revisionNumber || '00',
      revisionDate: existingManual?.revisionDate || existingManual?.dateImplemented || '',
      dateImplemented: existingManual?.dateImplemented || existingManual?.revisionDate || '',
      pageCount: existingManual?.pageCount !== undefined ? String(existingManual.pageCount) : '',
      googleDriveLink: existingManual?.googleDriveLink || '',
      status: defaultStatus,
    });
  };

  const handleCloseDialog = () => {
    setSelectedUnit(null);
    setUseOtherUnitManual(false);
    setSourceUnitId('');
    setProcessesList([]);
    setNewProcessNumber('');
    setNewProcessTitle('');
    form.reset();
  };

  const handleAddProcess = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!newProcessNumber.trim() && !newProcessTitle.trim()) return;

    const newProc: ManualProcess = {
      processNumber: newProcessNumber.trim() || `6.${processesList.length + 1}`,
      processTitle: newProcessTitle.trim() || 'Untitled Process',
    };

    const updated = [...processesList, newProc];
    setProcessesList(updated);
    form.setValue('numberOfProcesses', String(updated.length));
    setNewProcessNumber('');
    setNewProcessTitle('');
  };

  const handleRemoveProcess = (index: number) => {
    const updated = processesList.filter((_, i) => i !== index);
    setProcessesList(updated);
    form.setValue('numberOfProcesses', String(updated.length));
  };

  const handleUpdateStatus = async (unit: VirtualUnit, newStatus: string) => {
    if (!firestore) return;
    try {
      const manualRef = doc(firestore, 'procedureManuals', unit.id);
      await setDoc(
        manualRef,
        {
          id: unit.id,
          unitName: unit.name,
          status: newStatus,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast({
        title: 'Status Updated',
        description: `Set status for ${unit.name} to "${newStatus}".`,
      });
    } catch (error) {
      console.error('Error updating manual status:', error);
      toast({
        title: 'Error',
        description: 'Could not update manual status.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof manualSchema>) => {
    if (!firestore || !selectedUnit) return;
    setIsSubmitting(true);

    const calculatedProcessesCount =
      processesList.length > 0 ? processesList.length : values.numberOfProcesses ? Number(values.numberOfProcesses) : 0;

    const cleanedProcesses = processesList.map((p) => ({
      processNumber: (p.processNumber || '').trim(),
      processTitle: (p.processTitle || '').trim(),
    }));

    const manualRef = doc(firestore, 'procedureManuals', selectedUnit.id);
    const manualData: Record<string, any> = {
      id: selectedUnit.id,
      unitName: selectedUnit.name || '',
      procedureNumber: values.procedureNumber?.trim() || '',
      manualTitle: values.manualTitle?.trim() || '',
      numberOfProcesses: calculatedProcessesCount,
      processes: cleanedProcesses,
      revisionNumber: values.revisionNumber?.trim() || '00',
      revisionDate: values.revisionDate?.trim() || values.dateImplemented?.trim() || '',
      dateImplemented: values.dateImplemented?.trim() || values.revisionDate?.trim() || '',
      pageCount: values.pageCount ? Number(values.pageCount) : 0,
      googleDriveLink: values.googleDriveLink?.trim() || '',
      status: values.status || 'Not Submitted',
      updatedAt: serverTimestamp(),
    };

    if (useOtherUnitManual && sourceUnitId) {
      manualData.copiedFromUnitId = sourceUnitId;
      const sourceUnit = manageableUnits.find((u) => u.id === sourceUnitId);
      manualData.copiedFromUnitName = sourceUnit?.name || '';
    } else {
      manualData.copiedFromUnitId = '';
      manualData.copiedFromUnitName = '';
    }

    try {
      await setDoc(manualRef, manualData, { merge: true });
      toast({ title: 'Success', description: `Manual configuration saved for ${selectedUnit.name}.` });
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving manual:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Could not save the manual.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (unitId: string) => {
    if (!firestore || !window.confirm('Delete this manual configuration?')) return;
    try {
      await deleteDoc(doc(firestore, 'procedureManuals', unitId));
      toast({ title: 'Success', description: 'Manual entry has been removed.' });
    } catch (error) {
      console.error('Error deleting manual:', error);
      toast({ title: 'Error', description: 'Could not remove the entry.', variant: 'destructive' });
    }
  };

  const isLoading = isLoadingUnits || isLoadingManuals;

  const totalUnitsCount = manageableUnits.length;
  const updatedCount = manageableUnits.filter((u) => {
    const m = manualMap.get(u.id);
    return m?.status === 'Updated' || (!m?.status && (m?.procedureNumber || m?.manualTitle || m?.googleDriveLink));
  }).length;
  const needsRevisionCount = manageableUnits.filter((u) => manualMap.get(u.id)?.status === 'Needs Revision').length;
  const notSubmittedCount = totalUnitsCount - updatedCount - needsRevisionCount;

  return (
    <>
      <Card className="shadow-md border-primary/10">
        <CardHeader className="bg-muted/10 border-b py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Procedure Manuals Administration
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Configure procedure manual metadata (Procedure Number, Title, Processes, Revision, Pages, Drive Link,
                Status) for all university units.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="h-7 text-xs font-black uppercase px-3 bg-emerald-50 text-emerald-800 border-emerald-300"
              >
                {updatedCount} Updated
              </Badge>
              <Badge
                variant="outline"
                className="h-7 text-xs font-black uppercase px-3 bg-amber-50 text-amber-800 border-amber-300"
              >
                {needsRevisionCount} Needs Revision
              </Badge>
              <Badge
                variant="outline"
                className="h-7 text-xs font-black uppercase px-3 bg-rose-50 text-rose-800 border-rose-300"
              >
                {notSubmittedCount} Not Submitted
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[65dvh]">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Unit / Group</TableHead>
                    <TableHead className="text-[10px] font-black uppercase py-3">Procedure No.</TableHead>
                    <TableHead className="text-[10px] font-black uppercase py-3">Manual Title</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase py-3">Processes</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase py-3">Rev</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase py-3">Rev Date</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase py-3">Pages</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase py-3 min-w-[140px]">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase pr-6 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manageableUnits.map((unit) => {
                    const manual = manualMap.get(unit.id);
                    const hasData = Boolean(
                      manual && (manual.procedureNumber || manual.manualTitle || manual.googleDriveLink),
                    );
                    const currentStatus = manual?.status || (hasData ? 'Updated' : 'Not Submitted');
                    const isNotSubmitted = currentStatus === 'Not Submitted';
                    const isNeedsRevision = currentStatus === 'Needs Revision';

                    return (
                      <TableRow
                        key={unit.id}
                        className={cn(
                          'transition-colors',
                          isNotSubmitted && 'bg-rose-50/40 dark:bg-rose-950/20 border-l-4 border-l-rose-500',
                          isNeedsRevision && 'bg-amber-50/40 dark:bg-amber-950/20 border-l-4 border-l-amber-500',
                        )}
                      >
                        <TableCell className="font-bold text-xs pl-6 py-3.5">
                          <div className="flex items-center gap-2">
                            {currentStatus === 'Updated' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : currentStatus === 'Needs Revision' ? (
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                            )}
                            <div>
                              <span className="text-slate-900 dark:text-slate-100">{unit.name}</span>
                              {manual?.copiedFromUnitName && (
                                <span className="block text-[10px] font-normal text-blue-600 dark:text-blue-400">
                                  ↳ Inherits: {manual.copiedFromUnitName}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          {manual?.procedureNumber || (
                            <span className="text-muted-foreground italic font-normal text-[11px]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[220px] truncate">
                          {manual?.manualTitle || <span className="text-muted-foreground italic text-[11px]">—</span>}
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs">
                          {manual?.numberOfProcesses !== undefined && manual?.numberOfProcesses !== 0 ? (
                            manual.numberOfProcesses
                          ) : (
                            <span className="text-muted-foreground italic font-normal text-[11px]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {manual?.revisionNumber ? (
                            <Badge variant="secondary" className="text-[10px] font-bold">
                              Rev {manual.revisionNumber}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {manual?.revisionDate || manual?.dateImplemented || '—'}
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs">
                          {manual?.pageCount !== undefined && manual?.pageCount !== 0 ? (
                            manual.pageCount
                          ) : (
                            <span className="text-muted-foreground italic font-normal text-[11px]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Select value={currentStatus} onValueChange={(val) => handleUpdateStatus(unit, val)}>
                            <SelectTrigger
                              className={cn(
                                'h-7 text-[10px] font-black uppercase tracking-wider px-2 border w-[130px] mx-auto transition-all',
                                currentStatus === 'Updated' &&
                                  'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
                                currentStatus === 'Needs Revision' &&
                                  'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
                                currentStatus === 'Not Submitted' &&
                                  'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Updated" className="text-xs font-bold text-emerald-700">
                                Updated
                              </SelectItem>
                              <SelectItem value="Needs Revision" className="text-xs font-bold text-amber-700">
                                Needs Revision
                              </SelectItem>
                              <SelectItem value="Not Submitted" className="text-xs font-bold text-rose-700">
                                Not Submitted
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right pr-6 space-x-1.5 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingUnit(unit)}
                            className="h-8 text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-slate-900 border-primary/30 text-primary hover:bg-primary/5 shadow-sm"
                            title="View Procedure Manual Details & Preview"
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5 text-primary" /> View Procedure
                          </Button>
                          <Button
                            variant={hasData ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => handleOpenDialog(unit)}
                            className={cn(
                              'h-8 text-[10px] font-bold uppercase tracking-wider',
                              !hasData && 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
                            )}
                          >
                            <Edit className="mr-1.5 h-3.5 w-3.5" /> {hasData ? 'Edit' : 'Add Info'}
                          </Button>
                          {manual && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(unit.id)}
                              title="Delete configuration"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 shadow-md border-primary/10">
        <CardHeader className="bg-primary/5 border-b py-4">
          <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Procedure Revision Dropdown Options
          </CardTitle>
          <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Manage the list of procedure parts that units can select when requesting a revision.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <form onSubmit={handleAddPart} className="flex gap-2">
            <Input
              placeholder="e.g., Section 1.0: Objectives"
              value={newPart}
              onChange={(e) => setNewPart(e.target.value)}
              disabled={isSavingConfig}
              className="max-w-md text-xs h-9 bg-white"
            />
            <Button
              type="submit"
              disabled={isSavingConfig || !newPart.trim()}
              size="sm"
              className="h-9 font-black uppercase text-[10px]"
            >
              {isSavingConfig ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
              )}
              Add Part
            </Button>
          </form>

          {isLoadingConfig ? (
            <div className="flex py-4 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary opacity-20" />
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden max-w-2xl bg-white shadow-inner">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase py-2 pl-4">
                      Procedure Part / Section Title
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase py-2 pr-4 w-[100px]">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisionConfig?.parts && revisionConfig.parts.length > 0 ? (
                    revisionConfig.parts.map((part, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-bold text-slate-700 dark:text-slate-300 py-3 pl-4">
                          {part}
                        </TableCell>
                        <TableCell className="text-right py-3 pr-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/5 hover:text-destructive animate-all"
                            onClick={() => handleDeletePart(part)}
                            disabled={isSavingConfig}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="h-20 text-center text-xs text-muted-foreground italic">
                        No custom dropdown parts configured yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VIEW PROCEDURE MANUAL PREVIEW DIALOG */}
      <Dialog open={!!viewingUnit} onOpenChange={(open) => !open && setViewingUnit(null)}>
        <DialogContent className="max-w-4xl p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
          <DialogHeader className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <BookOpen className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-widest">
                  {viewingManual?.procedureNumber ? `${viewingManual.procedureNumber} • ` : ''}Procedure Manual
                </span>
              </div>
              {viewingManual?.revisionNumber && (
                <Badge variant="secondary" className="font-mono text-xs font-bold">
                  Rev {viewingManual.revisionNumber}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
              {viewingManual?.manualTitle || viewingUnit?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Official operating procedure manual specifications for {viewingUnit?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* METADATA GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Procedure No.</p>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {viewingManual?.procedureNumber || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">No. of Processes</p>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {viewingManual?.numberOfProcesses !== undefined && viewingManual?.numberOfProcesses !== 0
                    ? viewingManual.numberOfProcesses
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revision Date</p>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {viewingManual?.revisionDate || viewingManual?.dateImplemented || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Pages</p>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {viewingManual?.pageCount !== undefined && viewingManual?.pageCount !== 0
                    ? viewingManual.pageCount
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                <p className="font-bold">
                  {viewingManual?.status === 'Updated' ? (
                    <span className="text-emerald-700 dark:text-emerald-400">Updated</span>
                  ) : viewingManual?.status === 'Needs Revision' ? (
                    <span className="text-amber-700 dark:text-amber-400">Needs Revision</span>
                  ) : (
                    <span className="text-rose-700 dark:text-rose-400">Not Submitted</span>
                  )}
                </p>
              </div>
            </div>

            {/* PROCESS SLIDER */}
            {viewingManual && (
              <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <ProcedureManualProcessSlider
                  processes={viewingManual.processes}
                  numberOfProcesses={viewingManual.numberOfProcesses}
                  procedureNumber={viewingManual.procedureNumber}
                  unitName={viewingUnit?.name}
                />
              </div>
            )}

            {/* PREVIEW CONTAINER */}
            <div className="h-[44vh] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 relative">
              {viewingManual?.googleDriveLink ? (
                <iframe
                  src={viewingManual.googleDriveLink.replace('/view', '/preview').replace('?usp=sharing', '')}
                  className="w-full h-full border-none bg-white"
                  allow="autoplay"
                  title={`${viewingUnit?.name} Procedure Manual Preview`}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 opacity-20 mb-3" />
                  <p className="text-sm font-bold uppercase tracking-wider">No Digital Document Attached</p>
                  <p className="text-xs max-w-xs mt-1">
                    This unit has not configured a Google Drive document link yet. Click "Edit" to configure the link.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 gap-2 sm:justify-between flex-row">
            <div>
              {viewingManual?.googleDriveLink && (
                <Button variant="outline" size="sm" asChild className="h-9 text-xs font-bold uppercase tracking-wider">
                  <a href={viewingManual.googleDriveLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open in Google Drive
                  </a>
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingUnit(null)}
                className="h-9 text-xs font-bold uppercase tracking-wider"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const targetUnit = viewingUnit;
                  setViewingUnit(null);
                  if (targetUnit) handleOpenDialog(targetUnit);
                }}
                className="h-9 text-xs font-black uppercase tracking-wider bg-primary"
              >
                <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Details
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT / ADD PROCEDURE MANUAL DIALOG */}
      <Dialog open={!!selectedUnit} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[92vh] flex flex-col p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <DialogHeader className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Procedure Manual Configuration</span>
            </div>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
              {selectedUnit?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure the official procedure manual specifications, process inventory, and document links for this
              unit.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto pr-1.5 space-y-4 py-3">
              {/* USE OTHER UNIT MANUAL OPTION */}
              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-850 rounded-xl space-y-3">
                <div className="flex items-center space-x-2.5">
                  <Checkbox
                    id="useOtherUnit"
                    checked={useOtherUnitManual}
                    onCheckedChange={(checked) => {
                      const isChecked = Boolean(checked);
                      setUseOtherUnitManual(isChecked);
                      if (!isChecked) {
                        setSourceUnitId('');
                      }
                    }}
                  />
                  <label
                    htmlFor="useOtherUnit"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none flex items-center gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Use / copy procedure manual from another unit
                  </label>
                </div>

                {useOtherUnitManual && (
                  <div className="space-y-2 pt-1 pl-6">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Select Source Procedure Manual
                    </label>
                    <Select
                      value={sourceUnitId}
                      onValueChange={(val) => {
                        setSourceUnitId(val);
                        const sourceManual = manualMap.get(val);
                        const sourceUnit = manageableUnits.find((u) => u.id === val);
                        if (sourceManual) {
                          const copiedProcs = sourceManual.processes || [];
                          setProcessesList(copiedProcs);
                          form.setValue(
                            'numberOfProcesses',
                            String(copiedProcs.length || sourceManual.numberOfProcesses || ''),
                          );
                          form.setValue('procedureNumber', sourceManual.procedureNumber || '');
                          form.setValue('manualTitle', sourceManual.manualTitle || '');
                          form.setValue('revisionNumber', sourceManual.revisionNumber || '00');
                          form.setValue(
                            'revisionDate',
                            sourceManual.revisionDate || sourceManual.dateImplemented || '',
                          );
                          form.setValue(
                            'dateImplemented',
                            sourceManual.dateImplemented || sourceManual.revisionDate || '',
                          );
                          form.setValue(
                            'pageCount',
                            sourceManual.pageCount !== undefined ? String(sourceManual.pageCount) : '',
                          );
                          form.setValue('googleDriveLink', sourceManual.googleDriveLink || '');
                          form.setValue(
                            'status',
                            (sourceManual.status as 'Updated' | 'Needs Revision' | 'Not Submitted') || 'Updated',
                          );
                          toast({
                            title: 'Manual Data Copied',
                            description: `Copied procedure manual specifications and ${copiedProcs.length} process(es) from ${sourceUnit?.name || 'source unit'}.`,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs font-bold bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-700">
                        <SelectValue placeholder="-- Choose unit manual to copy from --" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {manageableUnits
                          .filter((u) => u.id !== selectedUnit?.id)
                          .map((u) => {
                            const m = manualMap.get(u.id);
                            const hasSourceData = Boolean(
                              m && (m.procedureNumber || m.manualTitle || m.googleDriveLink),
                            );
                            return (
                              <SelectItem key={u.id} value={u.id} className="text-xs">
                                <span className="font-bold">{u.name}</span>
                                {m?.procedureNumber ? ` (${m.procedureNumber})` : ''}
                                {!hasSourceData ? ' [No Data]' : ''}
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                    <p className="text-[10.5px] text-muted-foreground italic">
                      Selecting a manual will automatically copy its Procedure Number, Title, Processes, Revision,
                      Pages, Drive Link, and Status.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="procedureNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Procedure Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., RSU-PM-01"
                          className="h-9 text-xs font-bold font-mono bg-white dark:bg-slate-900"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="manualTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Procedure Manual Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Instruction & Curriculum Manual"
                          className="h-9 text-xs font-bold bg-white dark:bg-slate-900"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* PROCESS INVENTORY SECTION */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-wider">
                    <ListChecks className="h-4 w-4" />
                    <span>Process List & Titles ({processesList.length} Processes)</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] font-bold bg-white dark:bg-slate-900">
                    Total: {processesList.length}
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Add individual process numbers (e.g. <strong>6.1</strong>) and process titles included in this manual.
                  The total number of processes will be automatically calculated.
                </p>

                {/* Add process input row */}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4 sm:col-span-3">
                    <Input
                      placeholder="No. (e.g., 6.1)"
                      value={newProcessNumber}
                      onChange={(e) => setNewProcessNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddProcess();
                        }
                      }}
                      className="h-9 text-xs font-bold font-mono bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="col-span-8 sm:col-span-6">
                    <Input
                      placeholder="Process Title (e.g., Admission & Enrollment)"
                      value={newProcessTitle}
                      onChange={(e) => setNewProcessTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddProcess();
                        }
                      }}
                      className="h-9 text-xs font-bold bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-3">
                    <Button
                      type="button"
                      onClick={handleAddProcess}
                      disabled={!newProcessNumber.trim() && !newProcessTitle.trim()}
                      className="h-9 w-full font-black uppercase text-[10px] tracking-wider bg-primary hover:bg-primary/90 text-white shadow-sm"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add Process
                    </Button>
                  </div>
                </div>

                {/* List of registered processes */}
                {processesList.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900 max-h-48 overflow-y-auto divide-y dark:divide-slate-800">
                    {processesList.map((proc, pIdx) => (
                      <div
                        key={pIdx}
                        className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="text-[10px] font-mono text-muted-foreground w-4 text-center">
                            {pIdx + 1}.
                          </span>
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] font-bold bg-primary/5 text-primary shrink-0"
                          >
                            {proc.processNumber}
                          </Badge>
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {proc.processTitle}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProcess(pIdx)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                          title="Remove process"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 border border-dashed rounded-lg text-center text-xs text-muted-foreground italic bg-white/50 dark:bg-slate-900/50">
                    No individual processes added yet. Enter process number and title above and click "+ Add Process".
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="numberOfProcesses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Total No. of Processes
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g., 4"
                          className="h-9 text-xs font-bold bg-white dark:bg-slate-900"
                          {...field}
                          value={processesList.length > 0 ? processesList.length : field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="revisionNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Revision No.
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 00 or 01"
                          className="h-9 text-xs font-bold font-mono bg-white dark:bg-slate-900"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pageCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Total No. of Pages
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g., 36"
                          className="h-9 text-xs font-bold bg-white dark:bg-slate-900"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="revisionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Revision Date / Implemented
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 2026-01-15 or Oct 2024"
                          className="h-9 text-xs font-bold bg-white dark:bg-slate-900"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Status
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-xs font-bold bg-white dark:bg-slate-900">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Updated" className="text-xs font-bold text-emerald-700">
                            Updated
                          </SelectItem>
                          <SelectItem value="Needs Revision" className="text-xs font-bold text-amber-700">
                            Needs Revision
                          </SelectItem>
                          <SelectItem value="Not Submitted" className="text-xs font-bold text-rose-700">
                            Not Submitted
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="googleDriveLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Google Drive Link (PDF / Preview)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://drive.google.com/..."
                        className="h-9 text-xs bg-white dark:bg-slate-900"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 gap-2 sm:justify-end shrink-0 sticky bottom-0 bg-white dark:bg-slate-900">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="h-9 text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 text-xs font-black uppercase tracking-wider bg-primary shadow-md"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Configuration
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
