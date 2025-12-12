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
  useDoc,
} from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Campus, CampusSetting } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Skeleton } from '../ui/skeleton';

const settingsSchema = z.object({
  announcement: z.string().max(500, 'Announcement must be 500 characters or less.').optional(),
});

export function CampusSettingsManagement() {
  const { userProfile, isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State to hold the selected campus ID for Admins
  const [selectedCampusId, setSelectedCampusId] = useState<string | undefined>(
    isAdmin ? undefined : userProfile?.campusId
  );
  
  const isCampusSupervisor = userProfile?.role === 'Campus Director' || userProfile?.role === 'Campus ODIMO';

  // Determine the active campusId
  const activeCampusId = isAdmin ? selectedCampusId : userProfile?.campusId;

  const campusSettingsDocRef = useMemoFirebase(
    () => (firestore && activeCampusId ? doc(firestore, 'campusSettings', activeCampusId) : null),
    [firestore, activeCampusId]
  );
  
  const { data: campusSetting, isLoading: isLoadingSettings } = useDoc<CampusSetting>(campusSettingsDocRef);

  const campusesQuery = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'campuses') : null),
    [firestore, isAdmin]
  );
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      announcement: '',
    },
  });

  // Effect to sync form with fetched data
  useEffect(() => {
    if (campusSetting) {
      form.reset({ announcement: campusSetting.announcement || '' });
    } else {
      form.reset({ announcement: '' });
    }
  }, [campusSetting, form]);


  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    if (!firestore || !activeCampusId) return;
    setIsSubmitting(true);
    try {
      const settingRef = doc(firestore, 'campusSettings', activeCampusId);
      await setDoc(settingRef, {
        id: activeCampusId,
        announcement: values.announcement || '',
      }, { merge: true });
      toast({ title: 'Success', description: 'Campus announcement updated.' });
    } catch (error) {
      console.error('Error updating campus settings:', error);
      toast({
        title: 'Error',
        description: 'Could not update settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingSettings || (isAdmin && isLoadingCampuses);
  const canSubmit = activeCampusId && (isAdmin || isCampusSupervisor);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Campus Announcement</CardTitle>
        <CardDescription>
          Set an announcement that will appear on the dashboard for all users in
          {isAdmin ? ' the selected campus' : ' your campus'}.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {isAdmin && (
              <FormItem>
                <FormLabel>Select Campus</FormLabel>
                <Select
                  onValueChange={(value) => {
                    setSelectedCampusId(value);
                    form.reset({ announcement: '' }); // Reset form when campus changes
                  }}
                  defaultValue={selectedCampusId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a campus to manage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingCampuses ? (
                        <div className="p-4 text-sm text-muted-foreground">Loading...</div>
                    ) : (
                        campuses?.map((campus) => (
                          <SelectItem key={campus.id} value={campus.id}>
                            {campus.name}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </FormItem>
            )}

            {isLoading && activeCampusId ? (
                <div className="space-y-2 pt-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-24 w-full" />
                </div>

            ) : (
                <FormField
                  control={form.control}
                  name="announcement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Announcement Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., The deadline for the first cycle is approaching. Leave blank to clear the announcement."
                          {...field}
                          disabled={!canSubmit}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Announcement'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
