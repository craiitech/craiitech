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
import { Loader2, Folder, ExternalLink, CheckCircle2, HelpCircle, Building2, Sparkles, RefreshCw } from 'lucide-react';
import type { Campus, CampusSetting } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { cn, extractDriveFolderId } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const settingsSchema = z.object({
  announcement: z.string().max(500, 'Announcement must be 500 characters or less.').optional(),
  announcementEndsAt: z.string().optional(),
  announcement2: z.string().max(500, 'Announcement must be 500 characters or less.').optional(),
  announcement2EndsAt: z.string().optional(),
  submissionDriveFolderUrl: z.string().url('Please enter a valid Google Drive URL').optional().or(z.literal('')),
  googleScriptWebhookUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

export function CampusSettingsManagement() {
  const { userProfile, isAdmin, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingScript, setIsTestingScript] = useState(false);

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

  // Also read global settings for fallback values
  const globalSettingsDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'campusSettings', 'global') : null),
    [firestore],
  );
  const { data: globalSetting } = useDoc<CampusSetting>(globalSettingsDocRef);

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
      submissionDriveFolderUrl: '',
      googleScriptWebhookUrl: '',
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
        submissionDriveFolderUrl: campusSetting.submissionDriveFolderUrl || '',
        googleScriptWebhookUrl:
          campusSetting.googleScriptWebhookUrl ||
          (campusSetting.id !== 'global' ? globalSetting?.googleScriptWebhookUrl || '' : ''),
      });
    } else {
      form.reset({
        announcement: '',
        announcementEndsAt: '',
        announcement2: '',
        announcement2EndsAt: '',
        submissionDriveFolderUrl: '',
        googleScriptWebhookUrl: globalSetting?.googleScriptWebhookUrl || '',
      });
    }
  }, [campusSetting, globalSetting, form]);

  const watchedFolderUrl = form.watch('submissionDriveFolderUrl');
  const extractedFolderId = useMemo(() => {
    return extractDriveFolderId(watchedFolderUrl);
  }, [watchedFolderUrl]);

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
        if (values.googleScriptWebhookUrl !== undefined) {
          updateData.googleScriptWebhookUrl = values.googleScriptWebhookUrl.trim();
        }
      } else {
        const folderUrl = (values.submissionDriveFolderUrl || '').trim();
        updateData.submissionDriveFolderUrl = folderUrl;
        updateData.submissionDriveFolderId = extractDriveFolderId(folderUrl);
        updateData.submissionDriveUpdatedAt = new Date().toISOString();
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

  const handleTestWebhook = async () => {
    const scriptUrl =
      form.getValues('googleScriptWebhookUrl') ||
      'https://script.google.com/macros/s/AKfycbww5SZCg_SUIBP9x-gcuUlTmjiirEPuxgpUKdSYhv-_2j_7hBMPMyR2n7OvmraMfZIRuA/exec';
    setIsTestingScript(true);
    try {
      const res = await fetch('/api/upload-to-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: 'ping-test',
          fileName: 'ping.txt',
          fileBase64: 'dGVzdA==', // 'test' in base64
          scriptUrl,
        }),
      });
      const data = await res.json();
      if (res.status === 403) {
        toast({
          title: 'Permission Adjustment Required',
          description: data.error,
          variant: 'destructive',
        });
      } else if (res.status === 400 && data.error && !data.error.includes('authorization')) {
        // If the script responded with a folder error or JSON, it means communication succeeded!
        toast({
          title: 'Connection Successful!',
          description: 'Google Apps Script bridge is accessible and receiving requests.',
        });
      } else if (data.success) {
        toast({
          title: 'Connection Successful!',
          description: 'Google Apps Script bridge is connected.',
        });
      } else {
        toast({
          title: 'Script Response',
          description: data.error || 'Connected to script.',
        });
      }
    } catch (e: any) {
      toast({
        title: 'Connection Error',
        description: e.message || 'Failed to ping Google Apps Script.',
        variant: 'destructive',
      });
    } finally {
      setIsTestingScript(false);
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

            <Separator className="my-6" />

            {activeCampusId !== 'global' ? (
              <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Folder className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-primary">
                        Campus Submission Google Drive Repository
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        All units under this campus will upload their EOMS documents into this designated folder.
                      </p>
                    </div>
                  </div>
                  {extractedFolderId && (
                    <Badge
                      variant="outline"
                      className="bg-white/80 border-primary/30 text-primary text-[10px] font-mono"
                    >
                      Folder ID: {extractedFolderId}
                    </Badge>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="submissionDriveFolderUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">
                        Google Drive Folder Link
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://drive.google.com/drive/folders/1ABC..."
                            className="h-10 text-xs bg-white font-mono"
                            {...field}
                            disabled={isSubmitting || !canSubmit}
                          />
                          {field.value && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10 px-3 shrink-0 text-xs"
                              asChild
                            >
                              <a href={field.value} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                Open Drive
                              </a>
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription className="text-[11px] leading-relaxed">
                        Create a folder in Google Drive, set its sharing access to{' '}
                        <strong>&quot;Anyone with the link&quot;</strong> as <strong>&quot;Editor&quot;</strong> (or
                        share with your Google account), and paste the link here.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-lg bg-white/70 border border-primary/15 p-3 text-[11px] text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>How This Protects Institutional Documents:</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-5">
                    When units under this site submit SWOT, OpPlan, or Risk Registries, the files are uploaded directly
                    into this site repository. The system captures the resulting file link automatically so documents
                    are never lost.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border border-primary/20 bg-muted/30 p-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-primary">
                        Google Apps Script Webhook Bridge
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Central Google Apps Script web app URL that processes document uploads across all campuses.
                      </p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="googleScriptWebhookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">
                        Google Apps Script Web App URL
                      </FormLabel>
                      <FormControl>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            placeholder="https://script.google.com/macros/s/.../exec"
                            className="h-10 text-xs bg-white font-mono flex-1"
                            {...field}
                            disabled={isSubmitting || !canSubmit}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-10 text-xs font-bold uppercase tracking-wider shrink-0"
                            onClick={handleTestWebhook}
                            disabled={isTestingScript || !canSubmit}
                          >
                            {isTestingScript ? (
                              <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                Test Connection
                              </>
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription className="text-[11px]">
                        Default deployed script: <code>https://script.google.com/macros/s/AKfycb.../exec</code>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-lg bg-amber-50/80 border border-amber-200/60 p-3 text-[11px] text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Deployment Permission Checklist:</span>
                  </div>
                  <p className="text-[10px] text-amber-800/90 pl-5">
                    In your Google Apps Script editor, ensure{' '}
                    <strong>Deploy &gt; Manage deployments &gt; Who has access</strong> is set to{' '}
                    <strong>&quot;Anyone&quot;</strong> so the system can transfer files to your Drive folders.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between items-center bg-muted/10 border-t py-4">
            <span className="text-[11px] text-muted-foreground italic">
              Target:{' '}
              {activeCampusId === 'global'
                ? 'All Campuses (Global Settings)'
                : campuses?.find((c) => c.id === activeCampusId)?.name || activeCampusId}
            </span>
            <Button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="shadow-lg font-black uppercase text-xs tracking-wider"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
