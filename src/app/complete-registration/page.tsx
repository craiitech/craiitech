'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, writeBatch, serverTimestamp } from '@/firebase/firestore-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DataPrivacyDialog } from '@/components/auth/data-privacy-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, FileText, Mail, ShieldCheck } from 'lucide-react';
import type { Campus, Unit, Role } from '@/lib/types';

const registrationSchema = z.object({
  firstName: z.string().trim().min(1, { message: 'Please enter your first name.' }),
  lastName: z.string().trim().min(1, { message: 'Please enter your last name.' }),
  campusId: z.string().min(1, { message: 'Please select a campus.' }),
  roleId: z.string().min(1, { message: 'Please select a role.' }),
  unitId: z.string().optional(),
  sex: z.enum(['Male', 'Female', 'Others (LGBTQI++)'], { required_error: 'Please select your sex identification.' }),
  privacyPolicyAgreed: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Data Privacy Statement to proceed.',
  }),
});

export default function CompleteRegistrationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrivacyDialogOpen, setIsPrivacyDialogOpen] = useState(false);
  const router = useRouter();
  const { user, userProfile, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Ensure we only fetch campuses once we have an auth user to avoid permission errors
  const campusesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'campuses') : null),
    [firestore, user],
  );
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'units') : null),
    [firestore, user],
  );
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const rolesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'roles') : null),
    [firestore, user],
  );
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);

  const assignableRoles = useMemo(() => {
    if (!roles) return [];
    const forbiddenRoles = ['admin', 'vice president'];
    return roles.filter((role) => !forbiddenRoles.includes(role.name.toLowerCase()));
  }, [roles]);

  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      campusId: '',
      unitId: '',
      roleId: '',
      sex: undefined,
      privacyPolicyAgreed: false,
    },
  });

  const isLoading = isLoadingCampuses || isLoadingRoles || isLoadingUnits || isAuthLoading;

  useEffect(() => {
    if (!isAuthLoading && (userProfile || user)) {
      const displayParts = (user?.displayName || '').trim().split(/\s+/).filter(Boolean);
      const defaultFirst =
        userProfile?.firstName && userProfile.firstName !== 'User' ? userProfile.firstName : displayParts[0] || '';
      const defaultLast = userProfile?.lastName || (displayParts.length > 1 ? displayParts.slice(1).join(' ') : '');

      form.reset({
        firstName: defaultFirst,
        lastName: defaultLast,
        campusId: userProfile?.campusId || '',
        roleId: userProfile?.roleId || '',
        unitId: userProfile?.unitId || '',
        sex: (userProfile?.sex as any) || undefined,
        privacyPolicyAgreed: Boolean(userProfile?.privacyPolicyAgreed || userProfile?.ndaAccepted),
      });
    }
  }, [userProfile, user, isAuthLoading, form]);

  const selectedRoleId = form.watch('roleId');
  const selectedCampusId = form.watch('campusId');
  const privacyAgreed = form.watch('privacyPolicyAgreed');

  const isUnitRequired = useMemo(() => {
    if (!selectedRoleId || !roles) return false;
    const selectedRole = roles.find((r) => r.id === selectedRoleId);
    if (!selectedRole) return false;

    // Admin and Auditor do not pick a campus unit (Auditor is assigned to IQA)
    const nonCampusUnitRoles = ['admin', 'auditor'];
    return !nonCampusUnitRoles.includes(selectedRole.name.toLowerCase());
  }, [selectedRoleId, roles]);

  const unitsForSelectedCampus = useMemo(() => {
    if (!selectedCampusId || !allUnits) return [];
    return allUnits.filter((unit) => unit.campusIds?.includes(selectedCampusId));
  }, [selectedCampusId, allUnits]);

  const campusDirectorUnit = useMemo(() => {
    if (!selectedCampusId || !allUnits) return null;
    return (
      allUnits.find(
        (u) =>
          u.campusIds?.includes(selectedCampusId) &&
          (u.name.toLowerCase().includes('campus director') ||
            u.name.toLowerCase().includes('office of the campus director')),
      ) || null
    );
  }, [selectedCampusId, allUnits]);

  // When campus or role changes, auto-default Campus ODIMO & Campus Director to the campus director unit
  useEffect(() => {
    if (!selectedRoleId || !roles || !selectedCampusId) return;
    const selectedRole = roles.find((r) => r.id === selectedRoleId);
    if (!selectedRole) return;
    const roleLower = selectedRole.name.toLowerCase();

    if (roleLower.includes('campus odimo') || roleLower.includes('campus director')) {
      const currentUnitId = form.getValues('unitId');
      const isCurrentUnitInCampus = unitsForSelectedCampus.some((u) => u.id === currentUnitId);
      if ((!currentUnitId || !isCurrentUnitInCampus) && campusDirectorUnit) {
        form.setValue('unitId', campusDirectorUnit.id);
        form.clearErrors('unitId');
      }
    }
  }, [selectedRoleId, selectedCampusId, roles, unitsForSelectedCampus, campusDirectorUnit, form]);

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

    const selectedRoleObject = roles.find((r) => r.id === values.roleId);
    const roleLower = selectedRoleObject?.name?.toLowerCase() || '';
    const selectedUnitObject = allUnits?.find((u) => u.id === values.unitId);
    const isAdminEmail = user.email === 'admin@eoms.com';

    let assignedUnitId = values.unitId || '';
    let assignedUnitName = selectedUnitObject ? selectedUnitObject.name : '';

    if (roleLower === 'auditor') {
      const iqaUnit = allUnits?.find(
        (u) => u.name.toLowerCase() === 'internal quality audit' || u.name.toLowerCase() === 'iqa',
      );
      assignedUnitId = iqaUnit ? iqaUnit.id : '';
      assignedUnitName = iqaUnit ? iqaUnit.name : 'Internal Quality Audit';
    } else if (roleLower.includes('campus odimo') || roleLower.includes('campus director')) {
      if (values.unitId && selectedUnitObject) {
        assignedUnitId = selectedUnitObject.id;
        assignedUnitName = selectedUnitObject.name;
      } else if (campusDirectorUnit) {
        assignedUnitId = campusDirectorUnit.id;
        assignedUnitName = campusDirectorUnit.name;
      } else {
        assignedUnitId = values.unitId || '';
        assignedUnitName = selectedUnitObject ? selectedUnitObject.name : 'Office of the Campus Director';
      }
    } else if (isAdminEmail || roleLower === 'admin') {
      assignedUnitId = '';
      assignedUnitName = '';
    }

    if (
      isUnitRequired &&
      !assignedUnitId &&
      !roleLower.includes('campus odimo') &&
      !roleLower.includes('campus director')
    ) {
      form.setError('unitId', { type: 'manual', message: 'Please select a unit.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(firestore);
      const userDocRef = doc(firestore, 'users', user.uid);

      const updateData: any = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        campusId: values.campusId,
        unitId: assignedUnitId,
        unitName: assignedUnitName,
        roleId: isAdminEmail ? 'admin' : values.roleId,
        role: isAdminEmail ? 'Admin' : selectedRoleObject ? selectedRoleObject.name : '',
        sex: values.sex,
        privacyPolicyAgreed: true,
        privacyConsentAt: serverTimestamp(),
        ndaAccepted: true,
        verified: Boolean(isAdminEmail || userProfile?.verified),
      };

      batch.set(userDocRef, updateData, { merge: true });

      if (isAdminEmail) {
        const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
        batch.set(adminRoleRef, { isAdmin: true, assignedAt: serverTimestamp() });
      }

      await batch.commit();

      if (isAdminEmail || userProfile?.verified) {
        toast({ title: 'Profile Updated', description: 'Institutional details synchronized.' });
        router.push('/dashboard');
      } else {
        toast({
          title: 'Registration Details Submitted',
          description: 'Your RSU EOMS account is now pending administrator verification.',
        });
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
    <>
      <Card className="w-full max-w-lg bg-white/95 dark:bg-slate-900/90 backdrop-blur shadow-2xl border border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FileText className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-bold">Complete Your RSU Registration</CardTitle>
          </div>
          <CardDescription>
            Confirm your name, Sex Identification (GAD Standard), unit assignment, and Data Privacy consent.
          </CardDescription>
          {user?.email && (
            <div className="pt-2 flex justify-center">
              <Badge
                variant="outline"
                className="gap-1.5 px-3 py-1 text-xs font-bold border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              >
                <Mail className="h-3.5 w-3.5" />
                Connected RSU Google: {user.email}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Dela Cruz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sex Identification (CMO No. 1, s. 2015 GAD SDD Standard) */}
              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sex Identification (GAD Standard — CMO No. 1, s. 2015)</FormLabel>
                    <Select
                      key={field.value || 'sex-selector-initial'}
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <SelectValue placeholder="Select sex identification" />
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Others (LGBTQI++)">Others (LGBTQI++)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-[10px]">
                      Required for institutional Gender and Development (GAD) Sex-Disaggregated Data reporting.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campus & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="campusId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campus</FormLabel>
                      <Select
                        key={field.value || 'campus-selector'}
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
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
                      <Select
                        key={field.value || 'role-selector'}
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
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
              </div>

              {isUnitRequired && (
                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit / Office</FormLabel>
                      <Select
                        key={field.value || 'unit-selector'}
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        disabled={!selectedCampusId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={selectedCampusId ? 'Select your unit' : 'Select a campus first'}
                            />
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

              {/* Data Privacy Statement Agreement (RA 10173) */}
              <FormField
                control={form.control}
                name="privacyPolicyAgreed"
                render={({ field }) => (
                  <FormItem className="rounded-xl border p-3.5 bg-muted/30">
                    <div className="flex items-start space-x-2.5">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-xs font-bold leading-snug cursor-pointer">
                          I have read and agree to the{' '}
                          <button
                            type="button"
                            onClick={() => setIsPrivacyDialogOpen(true)}
                            className="text-primary underline font-black hover:opacity-80"
                          >
                            RSU EOMS Data Privacy Statement (RA 10173)
                          </button>
                          .
                        </FormLabel>
                        <FormDescription className="text-[10px]">
                          Consent to the collection and processing of your institutional profile and GAD SDD
                          information.
                        </FormDescription>
                        <FormMessage />
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full font-bold" disabled={isSubmitting || !privacyAgreed}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Save Profile &amp; Proceed
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <DataPrivacyDialog
        isOpen={isPrivacyDialogOpen}
        onOpenChange={setIsPrivacyDialogOpen}
        onAccept={() => {
          form.setValue('privacyPolicyAgreed', true, { shouldValidate: true });
          setIsPrivacyDialogOpen(false);
        }}
      />
    </>
  );
}
