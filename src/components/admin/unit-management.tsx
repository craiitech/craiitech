
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { Campus, Unit } from '@/lib/types';

// Schema for Admins creating a new unit
const adminUnitSchema = z.object({
  name: z.string().min(3, 'Unit name must be at least 3 characters.'),
  campusId: z.string().optional(), // For admin, campusId is optional at creation
});

// Schema for Campus Directors assigning an existing unit
const directorUnitSchema = z.object({
  unitId: z.string().min(1, 'Please select a unit to assign.'),
});


export function UnitManagement() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile, isAdmin } = useUser();

  const campusesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'campuses') : null),
    [firestore]
  );
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'units') : null),
    [firestore]
  );
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  // Determine the correct schema based on the user's role
  const form = useForm({
    resolver: zodResolver(isAdmin ? adminUnitSchema : directorUnitSchema),
  });

  const unassignedUnits = useMemo(() => {
    if (!allUnits) return [];
    return allUnits.filter(u => !u.campusId);
  }, [allUnits]);

  const onSubmit = async (values: any) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    
    try {
        if (isAdmin) {
            // Admin logic: Create a new unit (unassigned)
            await addDoc(collection(firestore, 'units'), {
                name: values.name,
                campusId: '', // Admins create unassigned units
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'New unit created and is available for assignment.' });
        } else {
            // Campus Director logic: Assign an existing unit to their campus
            if (!userProfile.campusId) {
                 toast({ title: 'Error', description: 'You are not assigned to a campus.', variant: 'destructive' });
                 return;
            }
            const unitRef = doc(firestore, 'units', values.unitId);
            await updateDoc(unitRef, {
                campusId: userProfile.campusId
            });
            toast({ title: 'Success', description: 'Unit has been assigned to your campus.' });
        }
        form.reset();
    } catch (error) {
        console.error('Error in unit management:', error);
        toast({
            title: 'Error',
            description: `Could not ${isAdmin ? 'create' : 'assign'} unit.`,
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const getCampusName = (campusId: string) => {
    return campuses?.find((c) => c.id === campusId)?.name || 'N/A';
  }
  
  const visibleUnits = useMemo(() => {
    if (isAdmin) return allUnits;
    if (!userProfile?.campusId || !allUnits) return [];
    return allUnits.filter(u => u.campusId === userProfile.campusId);
  }, [allUnits, isAdmin, userProfile]);

  const isLoading = isLoadingCampuses || isLoadingUnits;
  
  const cardTitle = isAdmin ? "Add New Unit" : "Assign Unit to Your Campus";
  const cardDescription = isAdmin 
    ? "Create a new unit available for all campuses to assign." 
    : "Assign a pre-registered unit to your campus from the list below.";
  const buttonText = isAdmin ? 'Add Unit' : 'Assign Unit';


  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{cardTitle}</CardTitle>
          <CardDescription>{cardDescription}</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {isAdmin ? (
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Unit Name</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., College of Engineering" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unassigned Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a unit to assign" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingUnits ? (
                             <SelectItem value="loading" disabled>Loading...</SelectItem></SelectItem>
                          ) : unassignedUnits.length > 0 ? (
                            unassignedUnits.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                {unit.name}
                                </SelectItem>
                            ))
                          ) : (
                             <SelectItem value="none" disabled>No unassigned units available</SelectItem></SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isAdmin ? 'Adding...' : 'Assigning...'}
                  </>
                ) : (
                  buttonText
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Existing Units</CardTitle>
          <CardDescription>
            A list of units in {isAdmin ? 'the system' : 'your campus'}.
          </CardDescription>
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
                  {isAdmin && <TableHead>Campus</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUnits?.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>{unit.name}</TableCell>
                    {isAdmin && <TableCell>{getCampusName(unit.campusId) || 'Unassigned'}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           {(!isLoading && (!visibleUnits || visibleUnits.length === 0)) && (
              <div className="text-center py-10 text-muted-foreground">
                No units found.
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

    