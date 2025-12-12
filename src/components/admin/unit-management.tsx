
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
import type { Campus, Unit } from '@/lib/types';


const unitSchema = z.object({
  name: z.string().min(3, 'Unit name must be at least 3 characters.'),
});

export function UnitManagement() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile, isAdmin } = useUser();

  const form = useForm<z.infer<typeof unitSchema>>({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: '' },
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

  const onSubmit = async (values: z.infer<typeof unitSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    
    try {
        const campusIdForNewUnit = isAdmin ? '' : userProfile.campusId;
        if (!isAdmin && !campusIdForNewUnit) {
            toast({ title: 'Error', description: 'You are not assigned to a campus.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }

        await addDoc(collection(firestore, 'units'), {
            name: values.name,
            campusId: campusIdForNewUnit,
            createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'New unit has been created.' });
        
        form.reset();
    } catch (error) {
        console.error('Error in unit management:', error);
        toast({
            title: 'Error',
            description: `Could not create unit.`,
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
  
  const cardTitle = isAdmin ? "Add New Unit" : "Add Unit to Your Campus";
  const cardDescription = isAdmin 
    ? "Create a new unit available for all campuses to assign." 
    : "Create a new unit for your campus.";
  const buttonText = 'Add Unit';


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
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
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
