'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import type { Unit, ProcedureManual } from '@/lib/types';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

const manualSchema = z.object({
  procedureNumber: z.string().optional().default(''),
  manualTitle: z.string().optional().default(''),
  numberOfProcesses: z.string().optional().default(''),
  revisionNumber: z.string().min(1, 'Revision number is required.').default('00'),
  revisionDate: z.string().optional().default(''),
  dateImplemented: z.string().optional().default(''),
  pageCount: z.string().optional().default(''),
  googleDriveLink: z.string().optional().default(''),
});

type VirtualUnit = { id: string; name: string; isShared?: boolean };

export function ProcedureManualManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<VirtualUnit | null>(null);

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
    form.reset({
      procedureNumber: existingManual?.procedureNumber || '',
      manualTitle: existingManual?.manualTitle || '',
      numberOfProcesses:
        existingManual?.numberOfProcesses !== undefined ? String(existingManual.numberOfProcesses) : '',
      revisionNumber: existingManual?.revisionNumber || '00',
      revisionDate: existingManual?.revisionDate || existingManual?.dateImplemented || '',
      dateImplemented: existingManual?.dateImplemented || existingManual?.revisionDate || '',
      pageCount: existingManual?.pageCount !== undefined ? String(existingManual.pageCount) : '',
      googleDriveLink: existingManual?.googleDriveLink || '',
    });
  };

  const handleCloseDialog = () => {
    setSelectedUnit(null);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof manualSchema>) => {
    if (!firestore || !selectedUnit) return;
    setIsSubmitting(true);

    const manualRef = doc(firestore, 'procedureManuals', selectedUnit.id);
    const manualData: Partial<ProcedureManual> = {
      id: selectedUnit.id,
      unitName: selectedUnit.name,
      procedureNumber: values.procedureNumber?.trim() || '',
      manualTitle: values.manualTitle?.trim() || '',
      numberOfProcesses: values.numberOfProcesses ? Number(values.numberOfProcesses) : 0,
      revisionNumber: values.revisionNumber?.trim() || '00',
      revisionDate: values.revisionDate?.trim() || values.dateImplemented?.trim() || '',
      dateImplemented: values.dateImplemented?.trim() || values.revisionDate?.trim() || '',
      pageCount: values.pageCount ? Number(values.pageCount) : 0,
      googleDriveLink: values.googleDriveLink?.trim() || '',
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(manualRef, manualData, { merge: true });
      toast({ title: 'Success', description: `Manual configuration saved for ${selectedUnit.name}.` });
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving manual:', error);
      toast({ title: 'Error', description: 'Could not save the manual.', variant: 'destructive' });
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
  const configuredCount = manageableUnits.filter((u) => {
    const m = manualMap.get(u.id);
    return m && (m.procedureNumber || m.manualTitle || m.googleDriveLink);
  }).length;
  const missingCount = totalUnitsCount - configuredCount;

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
                Configure procedure manual metadata (Procedure Number, Title, Processes, Revision, Pages, Drive Link)
                for all university units.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="h-7 text-xs font-black uppercase px-3 bg-emerald-50 text-emerald-800 border-emerald-300"
              >
                {configuredCount} Configured
              </Badge>
              <Badge
                variant="outline"
                className="h-7 text-xs font-black uppercase px-3 bg-amber-50 text-amber-800 border-amber-300"
              >
                {missingCount} Needs Update
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
                    <TableHead className="text-center text-[10px] font-black uppercase py-3">Status</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase pr-6 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manageableUnits.map((unit) => {
                    const manual = manualMap.get(unit.id);
                    const hasData = Boolean(
                      manual && (manual.procedureNumber || manual.manualTitle || manual.googleDriveLink),
                    );

                    return (
                      <TableRow
                        key={unit.id}
                        className={cn(
                          'transition-colors',
                          !hasData && 'bg-amber-50/70 dark:bg-amber-950/20 border-l-4 border-l-amber-500',
                        )}
                      >
                        <TableCell className="font-bold text-xs pl-6 py-3.5">
                          <div className="flex items-center gap-2">
                            {hasData ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            )}
                            <span className="text-slate-900 dark:text-slate-100">{unit.name}</span>
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
                          {hasData ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black text-[9px] uppercase">
                              Configured
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-400 text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/40 font-black text-[9px] uppercase"
                            >
                              Needs Update
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6 space-x-1 whitespace-nowrap">
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

      {/* EDIT / ADD PROCEDURE MANUAL DIALOG */}
      <Dialog open={!!selectedUnit} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-xl p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
          <DialogHeader className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Procedure Manual Configuration</span>
            </div>
            <DialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
              {selectedUnit?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure the official procedure manual metadata and process inventory for this unit.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-3">
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
                        <Input placeholder="e.g., RSU-PM-01" className="h-9 text-xs font-bold font-mono" {...field} />
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
                          className="h-9 text-xs font-bold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="numberOfProcesses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        No. of Processes
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g., 4"
                          className="h-9 text-xs font-bold"
                          {...field}
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
                        <Input placeholder="e.g., 00 or 01" className="h-9 text-xs font-bold font-mono" {...field} />
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
                          className="h-9 text-xs font-bold"
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
                          className="h-9 text-xs font-bold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="googleDriveLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Google Drive Link (PDF / Preview)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://drive.google.com/..." className="h-9 text-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 gap-2 sm:justify-end">
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
