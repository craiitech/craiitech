
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Unit } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Input } from '../ui/input';

const formSchema = z.object({
  name: z.string().min(3, 'Unit name must be at least 3 characters.'),
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
    defaultValues: { name: '' },
  });

  const unitsInCampus = useMemo(
    () => allUnits?.filter((unit) => unit.campusId === userProfile?.campusId) || [],
    [allUnits, userProfile]
  );

  const isLoading = isLoadingUnits;

  const onSubmit = async (values: UnitFormValues) => {
    if (!firestore || !userProfile?.campusId) {
      toast({
        title: 'Error',
        description: 'Cannot create unit. Campus information is missing.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const newUnitData = {
      name: values.name,
      campusId: userProfile.campusId,
      createdAt: serverTimestamp(),
    };

    const unitsCollectionRef = collection(firestore, 'units');

    addDoc(unitsCollectionRef, newUnitData)
      .then(() => {
        toast({ title: 'Success', description: `New unit "${values.name}" created.` });
        form.reset({ name: '' });
      })
      .catch((error) => {
        console.error('Error creating unit:', error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: unitsCollectionRef.path,
            operation: 'create',
            requestResourceData: newUnitData,
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
          <CardTitle>Add New Unit</CardTitle>
          <CardDescription>Create a new unit for your campus.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., College of Arts and Sciences" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Unit
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
              No units have been added to your campus yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
