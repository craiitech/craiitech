
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Unit, Role, Campus } from '@/lib/types';

const formSchema = z.object({
  name: z.string().optional(),
  unitId: z.string().optional(),
});

type UnitFormValues = z.infer<typeof formSchema>;

export function UnitManagement() {
  const { userProfile, isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rolesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'roles') : null),
    [firestore]
  );
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);

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

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', unitId: '' },
  });

  const userRole = useMemo(() => {
    if (isAdmin) return 'Admin';
    if (!userProfile || !roles) return null;
    return roles.find((r) => r.id === userProfile.roleId)?.name;
  }, [isAdmin, userProfile, roles]);

  const isCampusDirector = userRole === 'Campus Director';

  const unassignedUnits = useMemo(
    () => allUnits?.filter((unit) => !unit.campusId) || [],
    [allUnits]
  );
  
   const campusMap = useMemo(() => {
    if (!allCampuses) return {};
    return Object.fromEntries(allCampuses.map(c => [c.id, c.name]));
   }, [allCampuses])

  const visibleUnits = useMemo(
    () =>
      allUnits?.filter((unit) => {
        if (isAdmin) return true; // Admins see all units
        if (isCampusDirector) return unit.campusId === userProfile?.campusId; // Directors see their campus's units
        return false;
      }) || [],
    [allUnits, isAdmin, isCampusDirector, userProfile]
  );

  const isLoading = isLoadingRoles || isLoadingUnits || isLoadingCampuses;

  const onSubmit = async (values: UnitFormValues) => {
    if (!firestore) return;

    if (isAdmin) {
      if (!values.name || values.name.length < 3) {
        form.setError('name', { message: 'Unit name must be at least 3 characters.' });
        return;
      }
    } else if (isCampusDirector) {
      if (!values.unitId) {
        form.setError('unitId', { message: 'Please select a unit to assign.' });
        return;
      }
    }


    setIsSubmitting(true);

    try {
      if (isAdmin && values.name) {
        await addDoc(collection(firestore, 'units'), {
          name: values.name,
          createdAt: serverTimestamp(),
          campusId: '',
        });
        toast({ title: 'Success', description: 'New unit created.' });
        form.reset({ name: '' });
      } else if (isCampusDirector && values.unitId && userProfile?.campusId) {
        const unitRef = doc(firestore, 'units', values.unitId);
        await updateDoc(unitRef, {
          campusId: userProfile.campusId,
        });
        toast({ title: 'Success', description: 'Unit has been assigned to your campus.' });
        form.reset({ unitId: '' });
      }
    } catch (error: any) {
      console.error('Error managing unit:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not save unit.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAdminForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Add New Unit</CardTitle>
        <CardDescription>Create a new global unit for assignment.</CardDescription>
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
                    <Input placeholder="e.g., College of Engineering" {...field} value={field.value ?? ''} />
                  </FormControl>
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
  );

  const renderDirectorForm = () => (
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
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {isAdmin && renderAdminForm()}
      {isCampusDirector && renderDirectorForm()}

      <Card className={!isAdmin && !isCampusDirector ? 'col-span-2' : ''}>
        <CardHeader>
          <CardTitle>Existing Units</CardTitle>
          <CardDescription>
            {isAdmin ? 'A list of all units in the system.' : 'A list of units assigned to your campus.'}
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
                  {isAdmin && <TableHead>Assigned Campus</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUnits.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>{unit.name}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        {unit.campusId ? (
                           campusMap[unit.campusId] || 'Unknown Campus'
                        ) : <span className="text-muted-foreground">Unassigned</span>}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && visibleUnits.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              {isAdmin ? 'No units found.' : 'No units assigned to your campus.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    