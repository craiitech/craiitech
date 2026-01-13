
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';

const manualSchema = z.object({
  googleDriveLink: z.string().url('Please enter a valid Google Drive link.'),
});

export function ProcedureManualManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const manualsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'procedureManuals') : null), [firestore]);
  const { data: manuals, isLoading: isLoadingManuals } = useCollection<ProcedureManual>(manualsQuery);
  
  const manualMap = useMemo(() => {
    if (!manuals) return new Map();
    return new Map(manuals.map(m => [m.id, m]));
  }, [manuals]);

  const form = useForm<z.infer<typeof manualSchema>>({
    resolver: zodResolver(manualSchema),
  });
  
  const handleOpenDialog = (unit: Unit) => {
    setSelectedUnit(unit);
    const existingManual = manualMap.get(unit.id);
    form.reset({ googleDriveLink: existingManual?.googleDriveLink || '' });
  };
  
  const handleCloseDialog = () => {
    setSelectedUnit(null);
    form.reset({ googleDriveLink: '' });
  };

  const onSubmit = async (values: z.infer<typeof manualSchema>) => {
    if (!firestore || !selectedUnit) return;
    setIsSubmitting(true);
    
    const manualRef = doc(firestore, 'procedureManuals', selectedUnit.id);
    const manualData = {
      id: selectedUnit.id,
      unitName: selectedUnit.name,
      googleDriveLink: values.googleDriveLink,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(manualRef, manualData, { merge: true });
      toast({ title: 'Success', description: `Manual for ${selectedUnit.name} has been saved.` });
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving manual:', error);
      toast({ title: 'Error', description: 'Could not save the manual.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (unitId: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, 'procedureManuals', unitId));
        toast({ title: 'Success', description: 'Manual has been removed.' });
    } catch (error) {
        console.error("Error deleting manual:", error);
        toast({ title: 'Error', description: 'Could not remove the manual.', variant: 'destructive' });
    }
  };
  
  const isLoading = isLoadingUnits || isLoadingManuals;

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Procedure Manuals</CardTitle>
        <CardDescription>
          Manage the official procedure manuals for each university unit. These manuals will be accessible to all users of that unit type.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit Name</TableHead>
                  <TableHead>Manual Link</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units?.map((unit) => {
                  const manual = manualMap.get(unit.id);
                  return (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell>
                        {manual ? (
                          <a href={manual.googleDriveLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate block max-w-xs">
                            {manual.googleDriveLink}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(unit)}>
                          <Edit className="mr-2 h-4 w-4" /> {manual ? 'Edit' : 'Add'}
                        </Button>
                        {manual && (
                            <Button variant="ghost" size="sm" className="text-destructive ml-2" onClick={() => handleDelete(unit.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
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

    <Dialog open={!!selectedUnit} onOpenChange={(open) => !open && handleCloseDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Manual for "{selectedUnit?.name}"</DialogTitle>
          <DialogDescription>
            Enter the public Google Drive link for this unit's procedure manual.
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Manual
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}
