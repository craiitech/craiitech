'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Unit } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formSchema = z.object({
  unitId: z.string().min(1, 'Please select a unit to assign.'),
});

type UnitFormValues = z.infer<typeof formSchema>;

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

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { unitId: '' },
  });

  const unassignedUnits = useMemo(
    () => allUnits?.filter((unit) => !unit.campusId) || [],
    [allUnits]
  );

  const visibleUnits = useMemo(
    () => allUnits?.filter((unit) => unit.campusId === userProfile?.campusId) || [],
    [allUnits, userProfile]
  );

  const isLoading = isLoadingUnits;

  const onSubmit = async (values: UnitFormValues) => {
    if (!firestore || !userProfile?.campusId) return;

    setIsSubmitting(true);
    const unitRef = doc(firestore, 'units', values.unitId);
    const updateData = { campusId: userProfile.campusId };

    updateDoc(unitRef, updateData)
      .then(() => {
        toast({ title: 'Success', description: 'Unit has been assigned to your campus.' });
        form.reset({ unitId: '' });
      })
      .catch((error) => {
        console.error('Error assigning unit:', error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: unitRef.path,
            operation: 'update',
            requestResourceData: updateData
        }));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Assign Unit to Your Campus</CardTitle>
          <CardDescription>Select a unit to make it available for your campus.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unassigned Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an unassigned unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unassignedUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                        {unassignedUnits.length === 0 && (
                          <div className="p-4 text-sm text-muted-foreground">
                            No unassigned units available.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting || !form.watch('unitId')}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Unit
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Campus Units</CardTitle>
          <CardDescription>A list of units currently assigned to your campus.</CardDescription>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUnits.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>{unit.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && visibleUnits.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              No units assigned to your campus.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
