
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc, addDoc, serverTimestamp, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Search, CheckCircle, MoreHorizontal } from 'lucide-react';
import type { Unit } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


const newUnitSchema = z.object({
  name: z.string().min(3, 'Unit name must be at least 3 characters.'),
});

export function DirectorUnitManagement() {
  const { userProfile, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unitToRemove, setUnitToRemove] = useState<Unit | null>(null);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');


  const allUnitsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'units') : null),
    [firestore]
  );
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(allUnitsQuery);

  const { unitsInCampus, allOtherUnits } = useMemo(() => {
    if (!allUnits || !userProfile?.campusId) {
      return { unitsInCampus: [], allOtherUnits: [] };
    }
    const unitsInCampus = allUnits.filter((unit) => unit.campusIds?.includes(userProfile.campusId));
    // Show all units in the 'add' list
    const allOther = allUnits.filter(unit => unit.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return { unitsInCampus, allOtherUnits: allOther };
  }, [allUnits, userProfile, searchTerm]);
  

  const form = useForm<z.infer<typeof newUnitSchema>>({
    resolver: zodResolver(newUnitSchema),
    defaultValues: { name: '' },
  });

  const isLoading = isLoadingUnits;

  const handleAddUnitToCampus = async (unit: Unit) => {
    if (!firestore || !userProfile?.campusId) {
      toast({
        title: 'Error',
        description: 'Your campus information is not available.',
        variant: 'destructive',
      });
      return;
    }
    // Prevent re-adding
    if (unit.campusIds?.includes(userProfile.campusId)) return;

    setIsSubmitting(true);

    const unitRef = doc(firestore, 'units', unit.id);
    const updateData = { campusIds: arrayUnion(userProfile.campusId) };

    try {
      await updateDoc(unitRef, updateData);
      toast({
        title: 'Unit Assigned',
        description: `"${unit.name}" has been added to your campus.`,
      });
    } catch (error) {
      console.error('Error assigning unit:', error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: unitRef.path,
        operation: 'update',
        requestResourceData: updateData,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveUnitFromCampus = async () => {
    if (!firestore || !unitToRemove || !userProfile?.campusId) {
      return;
    }
    setIsSubmitting(true);

    const unitRef = doc(firestore, 'units', unitToRemove.id);
    const updateData = { campusIds: arrayRemove(userProfile.campusId) }; 

    try {
      await updateDoc(unitRef, updateData);
      toast({
        title: 'Unit Unassigned',
        description: `"${unitToRemove.name}" has been removed from your campus.`,
      });
    } catch (error) {
      console.error('Error removing unit:', error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: unitRef.path,
        operation: 'update',
        requestResourceData: updateData,
      }));
    } finally {
      setIsSubmitting(false);
      setUnitToRemove(null);
    }
  };
  
  const handleCreateNewUnit = async (values: z.infer<typeof newUnitSchema>) => {
    if (!firestore || !userProfile?.campusId) {
        toast({
            title: 'Error',
            description: 'Your campus information is not available.',
            variant: 'destructive',
        });
        return;
    }
    setIsSubmitting(true);

    const newUnitData = {
        name: values.name,
        campusIds: [userProfile.campusId], // Assign to current campus on creation
        createdAt: serverTimestamp(),
    };

    try {
        const unitsCollection = collection(firestore, 'units');
        await addDoc(unitsCollection, newUnitData);
        toast({
            title: 'Unit Created',
            description: `The unit "${values.name}" has been created and assigned to your campus.`
        });
        form.reset();
    } catch (error) {
        console.error('Error creating new unit:', error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'units',
            operation: 'create',
            requestResourceData: newUnitData,
        }));
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!firestore || !unitToDelete) return;
    setIsSubmitting(true);
    try {
        await deleteDoc(doc(firestore, 'units', unitToDelete.id));
        toast({ title: 'Success', description: 'Unit deleted successfully.' });
    } catch(error) {
        console.error("Error deleting unit:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `units/${unitToDelete.id}`,
            operation: 'delete',
        }));
    } finally {
        setIsSubmitting(false);
        setUnitToDelete(null);
    }
  }


  if (userRole !== 'Campus Director') {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Permission Denied</CardTitle>
                <CardDescription>Only Campus Directors can manage units for their campus.</CardDescription>
            </CardHeader>
         </Card>
    );
  }

  return (
    <>
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Units in Your Campus</CardTitle>
          <CardDescription>A list of all units currently assigned to your campus.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unitsInCampus.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell>{unit.name}</TableCell>
                      <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setUnitToRemove(unit)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Unassign from Campus
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setUnitToDelete(unit)}
                                className="text-destructive"
                                disabled={(unit.campusIds?.length ?? 0) > 1}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Unit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!isLoading && unitsInCampus.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                No units have been assigned to your campus yet.
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Units</CardTitle>
          <CardDescription>Assign an official system unit or create a new unit unique to your campus.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="add-existing">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add-existing">Add Existing Unit</TabsTrigger>
              <TabsTrigger value="create-new">Create New Unit</TabsTrigger>
            </TabsList>
            <TabsContent value="add-existing" className="pt-4 space-y-4">
               <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search all university units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-80">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>University Units / Offices</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allOtherUnits.map((unit) => {
                        const isAssigned = unit.campusIds?.includes(userProfile?.campusId ?? '');
                        return (
                            <TableRow key={unit.id} className={isAssigned ? 'bg-muted/50' : ''}>
                              <TableCell>{unit.name}</TableCell>
                              <TableCell className="text-right">
                                {isAssigned ? (
                                    <span className="flex items-center justify-end gap-2 text-sm text-green-600">
                                        <CheckCircle className="h-4 w-4" /> Assigned
                                    </span>
                                ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddUnitToCampus(unit)}
                                      disabled={isSubmitting}
                                    >
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Add
                                    </Button>
                                )}
                              </TableCell>
                            </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
                {!isLoading && allOtherUnits.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                     {searchTerm ? 'No units match your search.' : 'No other units available.'}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="create-new">
               <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateNewUnit)} className="space-y-6 pt-4">
                     <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Unit Name</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Institute of Marine Sciences" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create and Add Unit
                    </Button>
                  </form>
                </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    
    <AlertDialog open={!!unitToRemove} onOpenChange={(isOpen) => !isOpen && setUnitToRemove(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will remove the unit "{unitToRemove?.name}" from your campus. Other campuses will not be affected.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemoveUnitFromCampus} disabled={isSubmitting}>
                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!unitToDelete} onOpenChange={(isOpen) => !isOpen && setUnitToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Unit Permanently?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the unit "{unitToDelete?.name}". This is only allowed if the unit is not assigned to any other campus.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUnit} disabled={isSubmitting}>
                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete Permanently
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
