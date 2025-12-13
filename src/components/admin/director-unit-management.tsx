
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
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
import { Loader2, PlusCircle } from 'lucide-react';
import type { Unit } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ScrollArea } from '../ui/scroll-area';

export function DirectorUnitManagement() {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allUnitsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'units') : null),
    [firestore]
  );
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(allUnitsQuery);

  const { unitsInCampus, availableUnits } = useMemo(() => {
    if (!allUnits || !userProfile?.campusId) {
      return { unitsInCampus: [], availableUnits: [] };
    }
    const unitsInCampus = allUnits.filter((unit) => unit.campusId === userProfile.campusId);
    const unassigned = allUnits.filter((unit) => !unit.campusId);
    
    return { unitsInCampus, availableUnits: unassigned };
  }, [allUnits, userProfile]);

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
    setIsSubmitting(true);
    
    const unitRef = doc(firestore, 'units', unit.id);
    const updateData = { campusId: userProfile.campusId };

    updateDoc(unitRef, updateData)
      .then(() => {
          toast({
              title: 'Unit Assigned',
              description: `"${unit.name}" has been added to your campus.`,
          });
      })
      .catch((error) => {
          console.error('Error assigning unit:', error);
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: unitRef.path,
              operation: 'update',
              requestResourceData: updateData,
          }));
      })
      .finally(() => {
          setIsSubmitting(false);
      });
  };

  return (
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {unitsInCampus.map((unit) => (
                        <TableRow key={unit.id}>
                            <TableCell>{unit.name}</TableCell>
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
          <CardTitle>Available System Units</CardTitle>
          <CardDescription>Assign official, unassigned units to your campus.</CardDescription>
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
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {availableUnits.map((unit) => (
                        <TableRow key={unit.id}>
                            <TableCell>{unit.name}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddUnitToCampus(unit)}
                                    disabled={isSubmitting}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add to Campus
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                )}
                {!isLoading && availableUnits.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        No unassigned units are available. Please contact an admin.
                    </div>
                )}
           </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
