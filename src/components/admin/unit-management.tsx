
'use client';

import { useState, useMemo } from 'react';
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
import type { Campus, Unit, Role } from '@/lib/types';


const unitSchema = z.object({
  name: z.string().optional(),
  unitId: z.string().optional(),
  campusId: z.string().optional(),
}).superRefine((data, ctx) => {
    const isAdmin = (window as any).__isAdmin; // Access role from window
    if (isAdmin) {
        if (!data.name || data.name.length < 3) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Unit name must be at least 3 characters.",
                path: ['name'],
            });
        }
    } else {
         if (!data.unitId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please select a unit to assign.",
                path: ['unitId'],
            });
        }
    }
});


export function UnitManagement() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile, isAdmin } = useUser();
  
  // Set role on window for Zod refinement
  if (typeof window !== 'undefined') {
    (window as any).__isAdmin = isAdmin;
  }

  const form = useForm<z.infer<typeof unitSchema>>({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: '', campusId: '', unitId: '' },
  });


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

  const rolesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'roles') : null), [firestore]);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);


  const onSubmit = async (values: z.infer<typeof unitSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    
    try {
        if (isAdmin) {
             await addDoc(collection(firestore, 'units'), {
                name: values.name,
                campusId: values.campusId || '', 
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'New unit has been created.' });
        } else { 
            if (!values.unitId) {
                toast({ title: 'Error', description: 'No unit selected.', variant: 'destructive' });
                setIsSubmitting(false);
                return;
            }
            const unitRef = doc(firestore, 'units', values.unitId);
            await updateDoc(unitRef, {
                campusId: userProfile.campusId,
            });
            toast({ title: 'Success', description: 'Unit has been assigned to your campus.' });
        }
        form.reset();
    } catch (error) {
        console.error('Error in unit management:', error);
        toast({
            title: 'Error',
            description: isAdmin ? 'Could not create unit.' : 'Could not assign unit.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const getCampusName = (campusId: string) => {
    return campuses?.find((c) => c.id === campusId)?.name || 'N/A';
  }
  
  const unassignedUnits = useMemo(() => {
      if (!allUnits) return [];
      return allUnits.filter(u => !u.campusId);
  }, [allUnits]);

  const visibleUnits = useMemo(() => {
    if (isAdmin) return allUnits;
    if (!userProfile?.campusId || !allUnits) return [];
    return allUnits.filter(u => u.campusId === userProfile.campusId);
  }, [allUnits, isAdmin, userProfile]);

  const isLoading = isLoadingCampuses || isLoadingUnits || isLoadingRoles;
  
  const cardTitle = isAdmin ? "Manage Units" : "Assign Unit to Your Campus";
  const cardDescription = isAdmin 
    ? "Create new units and optionally assign them to a campus." 
    : "Assign a centrally-registered unit to your campus.";
  const buttonText = isAdmin ? 'Create Unit' : 'Assign Unit';


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
                <>
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
                <FormField
                  control={form.control}
                  name="campusId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Campus (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a campus" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingCampuses ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : (
                            campuses?.map((campus) => (
                              <SelectItem key={campus.id} value={campus.id}>
                                {campus.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </>
              ) : (
                // Campus Director View
                <FormField
                    control={form.control}
                    name="unitId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Unassigned Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a unit to assign" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {isLoadingUnits ? (
                                    <SelectItem value="loading" disabled>Loading units...</SelectItem>
                                ) : unassignedUnits.length > 0 ? (
                                    unassignedUnits.map((unit) => (
                                        <SelectItem key={unit.id} value={unit.id}>
                                            {unit.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="none" disabled>No unassigned units available</SelectItem>
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
                    Submitting...
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
                    {isAdmin && <TableCell>{getCampusName(unit.campusId) || <span className="text-muted-foreground">Unassigned</span>}</TableCell>}
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
