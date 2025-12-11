'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { Loader2 } from 'lucide-react';
import type { Campus, Unit, Role } from '@/lib/types';


const campusRegistrationSchema = z.object({
  campusId: z.string().min(1, { message: 'Please select a campus.' }),
  unitId: z.string(),
  roleId: z.string().min(1, { message: 'Please select a role.' }),
}).refine((data) => {
    // These are temporary role names for the check.
    // In a real app, you'd want to use IDs or a more robust system.
    const campusLevelRoles = ['Campus Director', 'Campus ODIMO'];
    
    // Find the role object to get its name
    const roleName = (window as any).__roles?.find((r: Role) => r.id === data.roleId)?.name;

    if (roleName && campusLevelRoles.includes(roleName)) {
      return true; // If it's a campus-level role, unitId is not required.
    }
    
    // For all other roles, unitId is required.
    return data.unitId.length > 0;
}, {
    message: 'Please select a unit.',
    path: ['unitId'],
});

export default function CompleteRegistrationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user, isUserLoading } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof campusRegistrationSchema>>({
    resolver: zodResolver(campusRegistrationSchema),
    defaultValues: {
      campusId: '',
      unitId: '',
      roleId: '',
    },
  });
  
  const { campusId, roleId } = form.watch();

  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses'): null, [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units'): null, [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const rolesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roles'): null, [firestore]);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);
  
  // Store roles in a globally accessible way for the refiner
  if (typeof window !== 'undefined') {
    (window as any).__roles = roles;
  }

  const units = useMemo(() => {
    if (!allUnits || !campusId) return [];
    return allUnits.filter(unit => unit.campusId === campusId);
  }, [allUnits, campusId]);
  
  const isUnitRequired = useMemo(() => {
    if (!roleId || !roles) return true; // Default to required
    const selectedRole = roles.find(r => r.id === roleId);
    const campusLevelRoles = ['Campus Director', 'Campus ODIMO'];
    return !selectedRole || !campusLevelRoles.includes(selectedRole.name);
  }, [roleId, roles]);
  
  const onSubmit = async (values: z.infer<typeof campusRegistrationSchema>) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to complete registration.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        campusId: values.campusId,
        unitId: values.unitId || '', // Store empty string if not provided
        roleId: values.roleId,
        verified: false, // Ensure verification status is reset on profile update
      });

      toast({
        title: 'Registration Details Submitted',
        description: 'Your account is now pending administrator verification.',
      });

      router.push('/awaiting-verification');
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };
  
  const showNoUnitsMessage = campusId && !isLoadingUnits && units.length === 0;

  if (isUserLoading || isLoadingCampuses || isLoadingRoles) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
                <Logo className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold">Complete Your Registration</CardTitle>
            </div>
          <CardDescription>
            Please provide your campus, unit, and role details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="campusId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campus</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('unitId', ''); // Reset unit when campus changes
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your campus" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {campuses?.map((campus) => (
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
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles?.filter(r => r.name !== 'Admin').map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                        Unit {isUnitRequired ? '' : <span className="text-muted-foreground">(Optional)</span>}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!campusId || showNoUnitsMessage || !isUnitRequired}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!isUnitRequired ? "Not applicable for this role" : !campusId ? "Select a campus first" : "Select your unit"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingUnits ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (
                          units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {showNoUnitsMessage && isUnitRequired && (
                        <FormDescription className='text-destructive'>
                            NO UNITS REGISTERED TO THIS CAMPUS, please ask the administrator.
                        </FormDescription>
                    )}
                     <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting || (showNoUnitsMessage && isUnitRequired)}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Update and Proceed'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
  );
}
