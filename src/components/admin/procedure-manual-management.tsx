'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import type { Unit, ProcedureManual } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Edit, Trash2, FileText, Calendar, Layers, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

const manualSchema = z.object({
  googleDriveLink: z.string().url('Please enter a valid Google Drive link.'),
  revisionNumber: z.string().min(1, 'Revision number is required.'),
  dateImplemented: z.string().min(1, 'Implementation date is required.'),
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
    [firestore]
  );
  const { data: revisionConfig, isLoading: isLoadingConfig } = useDoc<{ parts: string[] }>(configRef);

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPart.trim() || !firestore || !configRef) return;
    const currentParts = revisionConfig?.parts || [];
    if (currentParts.includes(newPart.trim())) {
      toast({ title: 'Already Exists', description: 'This process part is already in the list.', variant: 'destructive' });
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
      await setDoc(configRef, { parts: currentParts.filter(p => p !== partToDelete) }, { merge: true });
      toast({ title: 'Success', description: 'Process part removed.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove process part.', variant: 'destructive' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const manualsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'procedureManuals') : null), [firestore]);
  const { data: manuals, isLoading: isLoadingManuals } = useCollection<ProcedureManual>(manualsQuery);
  
  const manualMap = useMemo(() => {
    if (!manuals) return new Map();
    return new Map(manuals.map(m => [m.id, m]));
  }, [manuals]);

  const manageableUnits = useMemo(() => {
    if (!units) return [];
    
    return units
        .map(u => ({ id: u.id, name: u.name, isShared: false }))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [units]);

  const form = useForm<z.infer<typeof manualSchema>>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
        googleDriveLink: '',
        revisionNumber: '00',
        dateImplemented: '',
    }
  });
  
  const handleOpenDialog = (unit: VirtualUnit) => {
    setSelectedUnit(unit);
    const existingManual = manualMap.get(unit.id);
    form.reset({ 
        googleDriveLink: existingManual?.googleDriveLink || '',
        revisionNumber: existingManual?.revisionNumber || '00',
        dateImplemented: existingManual?.dateImplemented || '',
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
    const manualData = {
      id: selectedUnit.id,
      unitName: selectedUnit.name,
      googleDriveLink: values.googleDriveLink,
      revisionNumber: values.revisionNumber,
      dateImplemented: values.dateImplemented,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(manualRef, manualData, { merge: true });
      toast({ title: 'Success', description: `Manual configuration saved.` });
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
        console.error("Error deleting manual:", error);
        toast({ title: 'Error', description: 'Could not remove the entry.', variant: 'destructive' });
    }
  };
  
  const isLoading = isLoadingUnits || isLoadingManuals;

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Procedure Manuals Administration</CardTitle>
        <CardDescription>
          Manage institutional operating procedures for all units.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-[60dvh] pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target Unit / Group</TableHead>
                  <TableHead>Revision</TableHead>
                  <TableHead>Implemented</TableHead>
                  <TableHead>Manual Link</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manageableUnits.map((unit) => {
                  const manual = manualMap.get(unit.id);
                  return (
                    <TableRow key={unit.id} className={cn(unit.isShared && "bg-primary/5")}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            {unit.isShared ? <Layers className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-muted-foreground opacity-40" />}
                            <span className={cn(unit.isShared && "font-black uppercase text-primary")}>{unit.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {manual ? <Badge variant="secondary">Rev {manual.revisionNumber || '00'}</Badge> : '--'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {manual?.dateImplemented || '--'}
                      </TableCell>
                      <TableCell>
                        {manual ? (
                          <a href={manual.googleDriveLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate block max-w-[150px]">
                            {manual.googleDriveLink}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Not set</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(unit)}>
                          <Edit className="mr-2 h-4 w-4" /> {manual ? 'Edit' : 'Add'}
                        </Button>
                        {manual && (
                            <Button variant="ghost" size="sm" className="text-destructive ml-2" onClick={() => handleDelete(unit.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
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
          <Button type="submit" disabled={isSavingConfig || !newPart.trim()} size="sm" className="h-9 font-black uppercase text-[10px]">
            {isSavingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <PlusCircle className="h-3.5 w-3.5 mr-1" />}
            Add Part
          </Button>
        </form>

        {isLoadingConfig ? (
          <div className="flex py-4 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary opacity-20" /></div>
        ) : (
          <div className="border rounded-xl overflow-hidden max-w-2xl bg-white shadow-inner">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase py-2 pl-4">Procedure Part / Section Title</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase py-2 pr-4 w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revisionConfig?.parts && revisionConfig.parts.length > 0 ? (
                  revisionConfig.parts.map((part, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs font-bold text-slate-700 py-3 pl-4">{part}</TableCell>
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

    <Dialog open={!!selectedUnit} onOpenChange={(open) => !open && handleCloseDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            {selectedUnit?.isShared ? <Layers className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            <span className="text-xs font-bold uppercase tracking-widest">Manual Configuration</span>
          </div>
          <DialogTitle>Manage: "{selectedUnit?.name}"</DialogTitle>
          <DialogDescription>
            Configure the specific procedure manual details for this unit.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="googleDriveLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Drive Link</FormLabel>
                  <FormControl>
                    <Input placeholder="https://drive.google.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="revisionNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Revision No.</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. 01" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="dateImplemented"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Date Implemented</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Oct 2024" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
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
