
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal } from 'lucide-react';
import type { Unit, Campus, User } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { EditUnitDialog } from './edit-unit-dialog';


const formSchema = z.object({
  name: z.string().min(3, 'Unit name must be at least 3 characters.'),
  campusId: z.string().min(1, 'Please select a campus for the unit.'),
});

type UnitFormValues = z.infer<typeof formSchema>;

export function AdminUnitManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);


  const allUnitsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'units') : null),
    [firestore]
  );
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(allUnitsQuery);

  const allCampusesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'campuses') : null),
    [firestore]
  );
  const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(allCampusesQuery);
  
  const usersQuery = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'users') : null),
    [firestore, isAdmin]
  );
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const vicePresidents = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(user => user.role?.toLowerCase().includes('vice president'));
  }, [allUsers]);

  const campusMap = useMemo(() => {
    if (!allCampuses) return {};
    return Object.fromEntries(allCampuses.map(c => [c.id, c.name]));
  }, [allCampuses]);

  const isLoading = isLoadingUnits || isLoadingCampuses || isLoadingUsers;

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', campusId: '' },
  });


  const onSubmit = async (values: UnitFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    // Admin creates a unit and assigns it to an initial campus
    const newUnitData = {
        name: values.name,
        createdAt: serverTimestamp(),
        campusIds: [values.campusId],
    };
    
    const unitsCollectionRef = collection(firestore, 'units');

    addDoc(unitsCollectionRef, newUnitData)
        .then(() => {
            toast({ title: 'Success', description: 'New unit created.' });
            form.reset({ name: '', campusId: '' });
        })
        .catch((error) => {
            console.error('Error creating unit:', error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: unitsCollectionRef.path,
                operation: 'create',
                requestResourceData: newUnitData
            }));
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  const handleDeleteUnit = async () => {
    if (!firestore || !deletingUnit) return;
    setIsSubmitting(true);
    const unitRef = doc(firestore, 'units', deletingUnit.id);
    try {
        await deleteDoc(unitRef);
        toast({
            title: "Unit Deleted",
            description: `The unit "${deletingUnit.name}" has been permanently removed.`,
        });
        setDeletingUnit(null);
    } catch (error) {
        console.error("Error deleting unit:", error);
        toast({
            title: "Error",
            description: "Could not delete unit.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <>
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add New Unit</CardTitle>
          <CardDescription>Create a new official system unit and assign it to an initial campus.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., College of Engineering" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="campusId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Initial Campus</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a campus" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allCampuses?.map((campus) => (
                          <SelectItem key={campus.id} value={campus.id}>
                            {campus.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Unit
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>All System Units</CardTitle>
          <CardDescription>A list of all units and their campus assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Assigned Campuses</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUnits?.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>{unit.name}</TableCell>
                    <TableCell>
                      {unit.campusIds && unit.campusIds.length > 0 ? (
                        unit.campusIds.map(id => <span key={id}>{campusMap[id] || 'Unknown'}</span>).reduce((prev, curr) => <>{prev}, {curr}</>)
                      ) : <span className="text-muted-foreground">Unassigned</span>}
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setEditingUnit(unit)}>
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeletingUnit(unit)}>
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && allUnits?.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              No units found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {editingUnit && allCampuses && (
        <EditUnitDialog
            unit={editingUnit}
            allCampuses={allCampuses}
            vicePresidents={vicePresidents}
            isOpen={!!editingUnit}
            onOpenChange={() => setEditingUnit(null)}
        />
    )}

    <AlertDialog open={!!deletingUnit} onOpenChange={() => setDeletingUnit(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the unit "{deletingUnit?.name}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUnit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
