'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc, setDoc } from '@/firebase/firestore-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Campus, CampusSetting } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';

const settingsSchema = z.object({
  announcement: z.string().max(500, 'Announcement must be 500 characters or less.').optional(),
  announcementEndsAt: z.string().optional(),
  announcement2: z.string().max(500, 'Announcement must be 500 characters or less.').optional(),
  announcement2EndsAt: z.string().optional(),
});

export function CampusSettingsManagement() {
  const { userProfile, isAdmin, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State to hold the selected campus ID for Admins
  const [selectedCampusId, setSelectedCampusId] = useState<string | undefined>(
    isAdmin ? undefined : userProfile?.campusId,
  );

  const isCampusSupervisor = userProfile?.role === 'Campus Director' || userProfile?.role === 'Campus ODIMO';

  // Determine the active campusId
  const activeCampusId = isAdmin ? selectedCampusId : userProfile?.campusId;

  const campusSettingsDocRef = useMemoFirebase(
    () => (firestore && activeCampusId ? doc(firestore, 'campusSettings', activeCampusId) : null),
    [firestore, activeCampusId],
  );

  const { data: campusSetting, isLoading: isLoadingSettings } = useDoc<CampusSetting>(campusSettingsDocRef);

  const campusesQuery = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'campuses') : null),
    [firestore, isAdmin],
  );
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      announcement: '',
      announcementEndsAt: '',
      announcement2: '',
      announcement2EndsAt: '',
    },
  });

  // Effect to sync form with fetched data
  useEffect(() => {
    if (campusSetting) {
      form.reset({
        announcement: campusSetting.announcement || '',
        announcementEndsAt: campusSetting.announcementEndsAt || '',
        announcement2: (campusSetting as any).announcement2 || '',
        announcement2EndsAt: (campusSetting as any).announcement2EndsAt || '',
      });
    } else {
      form.reset({
        announcement: '',
        announcementEndsAt: '',
        announcement2: '',
        announcement2EndsAt: '',
      });
    }
  }, [campusSetting, form]);

  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    if (!firestore || !activeCampusId) return;
    setIsSubmitting(true);
    try {
      const settingRef = doc(firestore, 'campusSettings', activeCampusId);
      const updateData: any = {
        id: activeCampusId,
        announcement: values.announcement || '',
        announcementEndsAt: values.announcementEndsAt || '',
      };
      if (activeCampusId === 'global') {
        updateData.announcement2 = values.announcement2 || '';
        updateData.announcement2EndsAt = values.announcement2EndsAt || '';
      }
      await setDoc(settingRef, updateData, { merge: true });
      toast({ title: 'Success', description: 'Campus settings updated.' });
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

  const isLoading = isUserLoading || isLoadingSettings || (isAdmin && isLoadingCampuses);
  const canSubmit = activeCampusId && (isAdmin || isCampusSupervisor);

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>Campus Announcement</CardTitle>
        <CardDescription>
          Set an announcement that will appear on the Home page for all users in
          {isAdmin ? ' the selected campus or all campuses' : ' your campus'}.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {isAdmin && (
              <FormItem>
                <FormLabel>Select Target</FormLabel>
                <Select
                  onValueChange={(value) => {
                    setSelectedCampusId(value);
                    form.reset({
                      announcement: '',
                      announcementEndsAt: '',
                      announcement2: '',
                      announcement2EndsAt: '',
                    }); // Reset form when campus changes
                  }}
                  defaultValue={selectedCampusId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a campus or global" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingCampuses ? (
                      <div className="p-4 text-sm text-muted-foreground">Loading...</div>
                    ) : (
                      <>
                        <SelectItem value="global">Global Announcement (Send to All)</SelectItem>
                        {campuses?.map((campus) => (
                          <SelectItem key={campus.id} value={campus.id}>
                            {campus.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </FormItem>
            )}

            {isLoading ? (
              <div className="space-y-2 pt-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={cn('space-y-3', activeCampusId !== 'global' ? 'md:col-span-2' : '')}>
                  <FormField
                    control={form.control}
                    name="announcement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {activeCampusId === 'global' ? 'Primary Global Announcement' : 'Announcement Message'}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., The deadline for the first cycle is approaching. Leave blank to clear the announcement."
                            {...field}
                            disabled={isSubmitting || !canSubmit}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="announcementEndsAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Schedule Until (Auto-Expiration Date & Time)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            className="h-9 text-xs bg-white border-slate-200"
                            {...field}
                            value={field.value || ''}
                            disabled={isSubmitting || !canSubmit}
                          />
                        </FormControl>
                        <FormDescription className="text-[10px]">
                          Optional. When set, this announcement will automatically expire and stop displaying after this
                          date and time.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {activeCampusId === 'global' && (
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="announcement2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secondary Global Announcement</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g., Additional global announcement or directive. Leave blank to clear."
                              {...field}
                              disabled={isSubmitting || !canSubmit}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="announcement2EndsAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Schedule Until (Auto-Expiration Date & Time)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              className="h-9 text-xs bg-white border-slate-200"
                              {...field}
                              value={field.value || ''}
                              disabled={isSubmitting || !canSubmit}
                            />
                          </FormControl>
                          <FormDescription className="text-[10px]">
                            Optional. Auto-expiration date and time for secondary global announcement.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
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
