
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
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


const registrationSchema = z.object({
  campusId: z.string().min(1, { message: 'Please select a campus.' }),
  roleId: z.string().min(1, { message: 'Please select a role.' }),
  unitId: z.string().optional(),
});

export default function CompleteRegistrationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses'): null, [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units'): null, [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const rolesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roles'): null, [firestore]);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);

  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      campusId: '',
      unitId: '',
      roleId: '',
    },
  });

  const selectedRoleId = form.watch('roleId');
  
  const isUnitRequired = useMemo(() => {
    if (!selectedRoleId || !roles) return true; // Default to required until roles are loaded and a role is selected
    const selectedRole = roles.find(r => r.id === selectedRoleId);
    if (!selectedRole) return true; // Role not found, assume unit is required
    const campusLevelRoles = ['Campus Director', 'Campus ODIMO'];
    // It's required if the role's name is NOT in the campusLevelRoles array
    return !campusLevelRoles.includes(selectedRole.name);
  }, [selectedRoleId, roles]);

  // When isUnitRequired changes, we might need to clear errors or values
  useEffect(() => {
    if (!isUnitRequired) {
      form.setValue('unitId', ''); // Use empty string to clear it
      form.clearErrors('unitId');
    }
  }, [isUnitRequired, form]);
  
  const onSubmit = async (values: z.infer<typeof registrationSchema>) => {
    if (!user || !firestore) {
      toast({
        title: 'Error',
        description: 'You must be logged in to complete registration.',
        variant: 'destructive',
      });
      return;
    }
    
    // Manual validation for unitId based on role
    if (isUnitRequired && !values.unitId) {
        form.setError('unitId', { type: 'manual', message: 'Please select a unit.' });
        return;
    }

    setIsSubmitting(true);
    try {
       // --- Role Uniqueness Validation ---
      const usersCollection = collection(firestore, 'users');
      const queryConstraints = [
        where('campusId', '==', values.campusId),
        where('roleId', '==', values.roleId),
      ];
      
      // Only check unitId if it's required for the role and has a value
      if (isUnitRequired && values.unitId) {
        queryConstraints.push(where('unitId', '==', values.unitId));
      }

      const q = query(usersCollection, ...queryConstraints);

      const querySnapshot = await getDocs(q);

      // Check if any user found is not the current user
      const isRoleTaken = !querySnapshot.empty && querySnapshot.docs.some(doc => doc.id !== user.uid);

      if (isRoleTaken) {
        toast({
          title: 'Role Taken',
          description:
            'The selected role is already assigned to another user in this campus and unit. Please choose a different role or contact an administrator.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      // --- End Validation ---

      const userDocRef = doc(firestore, 'users', user.uid);
      const selectedRole = roles?.find(r => r.id === values.roleId);

      await updateDoc(userDocRef, {
        campusId: values.campusId,
        unitId: values.unitId || '', // Store empty string if not applicable
        roleId: values.roleId,
        role: selectedRole ? selectedRole.name : '',
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
  
  const isLoading = isLoadingCampuses || isLoadingRoles || isLoadingUnits;

  if (isLoading) {
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              {isUnitRequired && (
                <FormField
                    control={form.control}
                    name="unitId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            Unit
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder={"Select your unit"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {units?.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                {unit.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}>
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
