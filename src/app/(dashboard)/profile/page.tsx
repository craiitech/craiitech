
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Building, Briefcase } from 'lucide-react';
import type { Campus, Unit, Role } from '@/lib/types';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { Label } from '@/components/ui/label';

const profileSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required.' }),
  lastName: z.string().min(1, { message: 'Last name is required.' }),
});

export default function ProfilePage() {
  const { user, userProfile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logSessionActivity } = useSessionActivity();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
      });
    }
  }, [userProfile, form]);
  
  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses'): null, [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units'): null, [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);
  
  const campusName = useMemo(() => {
    if (!campuses || !userProfile?.campusId) return '...';
    return campuses.find(c => c.id === userProfile.campusId)?.name || 'N/A';
  }, [campuses, userProfile]);

  const unitName = useMemo(() => {
    if (!allUnits || !userProfile?.unitId) return '...';
    return allUnits.find(u => u.id === userProfile.unitId)?.name || 'N/A';
  }, [allUnits, userProfile]);


  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update your profile.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        firstName: values.firstName,
        lastName: values.lastName,
      });

      logSessionActivity('User updated their profile name', { action: 'update_profile' });

      toast({
        title: 'Profile Updated',
        description: 'Your name has been successfully updated.',
      });

      router.push('/dashboard');

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isLoading = isUserLoading || isLoadingCampuses || isLoadingUnits;

  return (
    <div className="space-y-4">
       <div>
        <h2 className="text-2xl font-bold tracking-tight">My Profile</h2>
        <p className="text-muted-foreground">
          View and update your personal information.
        </p>
      </div>
      
       <Card className="max-w-2xl">
        <CardHeader>
            <CardTitle>Edit Your Profile</CardTitle>
            <CardDescription>Only your first and last name can be changed.</CardDescription>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                <Input placeholder="John" {...field} />
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
                                <Input placeholder="Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                          <Mail className="mr-2 h-4 w-4" />
                          {userProfile?.email}
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                              <Briefcase className="mr-2 h-4 w-4" />
                              {userProfile?.role}
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label>Campus</Label>
                             <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                              <Building className="mr-2 h-4 w-4" />
                              {isLoading ? '...' : campusName}
                            </div>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Unit</Label>
                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                          <Building className="mr-2 h-4 w-4" />
                          {isLoading ? '...' : unitName}
                        </div>
                    </div>

                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting || isLoading}>
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Save Changes
                    </Button>
                </CardFooter>
            </form>
        </Form>
       </Card>
    </div>
  );
}
