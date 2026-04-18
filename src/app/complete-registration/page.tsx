'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
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
import { Loader2, Users } from 'lucide-react';
import type { Campus, Unit, Role } from '@/lib/types';


const registrationSchema = z.object({
  campusId: z.string().min(1, { message: 'Please select a campus.' }),
  roleId: z.string().min(1, { message: 'Please select a role.' }),
  unitId: z.string().optional(),
  sex: z.enum(['Male', 'Female', 'Others (LGBTQI++)'], { required_error: 'Please select your sex identification.' }),
});

export default function CompleteRegistrationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user, userProfile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses'): null, [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units'): null, [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const rolesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roles'): null, [firestore]);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);
  
  const assignableRoles = useMemo(() => {
    if (!roles) return [];
    const forbiddenRoles = ['admin', 'vice president'];
    return roles.filter(role => 
        !forbiddenRoles.includes(role.name.toLowerCase())
    );
  }, [roles]);


  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      campusId: '',
      unitId: '',
      roleId: '',
      sex: undefined,
    },
  });

  const isLoading = isLoadingCampuses || isLoadingRoles || isLoadingUnits || isUserLoading;

  useEffect(() => {
    if (userProfile && !isUserLoading) {
      form.reset({
        campusId: userProfile.campusId || '',
        roleId: userProfile.roleId || '',
        unitId: userProfile.unitId || '',
        sex: (userProfile.sex as any) || undefined,
      });
    }
  }, [userProfile, isUserLoading, form]);

  const selectedRoleId = form.watch('roleId');
  const selectedCampusId = form.watch('campusId');
  const sexValue = form.watch('sex');
  
  const isUnitRequired = useMemo(() => {
    if (!selectedRoleId || !roles) return false; 
    const selectedRole = roles.find((r) => r.id === selectedRoleId);
    if (!selectedRole) return false;

    const campusLevelRoles = ['campus director', 'campus odimo', 'auditor'];
    return !campusLevelRoles.includes(selectedRole.name.toLowerCase());
  }, [selectedRoleId, roles]);

  const unitsForSelectedCampus = useMemo(() => {
    if (!selectedCampusId || !allUnits) return [];
    return allUnits.filter(unit => unit.campusIds?.includes(selectedCampusId));
  }, [selectedCampusId, allUnits]);


  useEffect(() => {
    if (!isUnitRequired) {
      form.setValue('unitId', '');
      form.clearErrors('unitId');
    }
  }, [isUnitRequired, form]);
  
  const onSubmit = async (values: z.infer<typeof registrationSchema>) => {
    if (!user || !firestore || !roles) {
      toast({
        title: 'Error',
        description: 'You must be logged in to complete registration.',
        variant: 'destructive',
      });
      return;
    }
    
    if (isUnitRequired && !values.unitId) {
        form.setError('unitId', { type: 'manual', message: 'Please select a unit.' });
        return;
    }

    setIsSubmitting(true);
    try {
      const selectedRoleObject = roles.find(r => r.id === values.roleId);
      const isAdminEmail = user.email === 'admin@eoms.com';
      
      const batch = writeBatch(firestore);
      const userDocRef = doc(firestore, 'users', user.uid);
      
      // CRITICAL: Preserve current verified status from userProfile
      const currentVerified = userProfile?.verified || false;
      const currentNda = userProfile?.ndaAccepted || false;

      const updateData: any = {
        campusId: values.campusId,
        unitId: isUnitRequired ? values.unitId : '',
        roleId: isAdminEmail ? 'admin' : values.roleId,
        role: isAdminEmail ? 'Admin' : (selectedRoleObject ? selectedRoleObject.name : ''),
        sex: values.sex,
        ndaAccepted: isAdminEmail || currentNda,
        verified: isAdminEmail || currentVerified,
      };

      batch.update(userDocRef, updateData);

      if (isAdminEmail) {
        const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
        batch.set(adminRoleRef, { isAdmin: true, assignedAt: serverTimestamp() });
      }

      await batch.commit();

      if (updateData.verified) {
        toast({ title: 'Profile Updated', description: 'Institutional details synchronized.' });
        router.push('/dashboard');
      } else {
        toast({ title: 'Registration Details Submitted', description: 'Your account is now pending administrator verification.' });
        router.push('/awaiting-verification');
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

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
                    <Select key={field.value} onValueChange={field.onChange} value={field.value || ''}>
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
                    <Select key={field.value} onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignableRoles.map((role) => (
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
                        <FormLabel>Unit</FormLabel>
                        <Select 
                            key={field.value}
                            onValueChange={field.onChange} 
                            value={field.value || ""} 
                            disabled={!selectedCampusId}
                        >
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder={selectedCampusId ? "Select your unit" : "Select a campus first"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {unitsForSelectedCampus.map((unit) => (
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

              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sex Identification (GAD Standard)</FormLabel>
                    <Select 
                      key={field.value || 'sex-selector'}
                      onValueChange={field.onChange} 
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <SelectValue placeholder="Select sex" />
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Others (LGBTQI++)">Others (LGBTQI++)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-[10px]">Required for institutional Gender and Development reporting.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
