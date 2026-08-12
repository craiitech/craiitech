'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { CampusSetting } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

interface EditAnnouncementDialogProps {
  announcement: CampusSetting | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const editAnnouncementSchema = z.object({
  announcement: z.string().max(500, 'Announcement must be 500 characters or less.').optional(),
  announcementEndsAt: z.string().optional(),
  announcement2: z.string().max(500, 'Announcement must be 500 characters or less.').optional(),
  announcement2EndsAt: z.string().optional(),
});

export function EditAnnouncementDialog({ announcement, isOpen, onOpenChange }: EditAnnouncementDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sticky state
  const [stickyAnn, setStickyAnn] = useState<CampusSetting | null>(null);
  useEffect(() => {
    if (announcement) setStickyAnn(announcement);
  }, [announcement]);

  const activeAnn = announcement || stickyAnn;

  const form = useForm<z.infer<typeof editAnnouncementSchema>>({
    resolver: zodResolver(editAnnouncementSchema),
    defaultValues: {
      announcement: '',
      announcementEndsAt: '',
      announcement2: '',
      announcement2EndsAt: '',
    },
  });

  useEffect(() => {
    if (announcement && isOpen) {
      form.reset({
        announcement: announcement.announcement || '',
        announcementEndsAt: announcement.announcementEndsAt || '',
        announcement2: (announcement as any).announcement2 || '',
        announcement2EndsAt: (announcement as any).announcement2EndsAt || '',
      });
    }
  }, [announcement, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof editAnnouncementSchema>) => {
    if (!firestore || !activeAnn) return;

    if (!values.announcement && !values.announcement2) {
      toast({
        title: 'Validation Error',
        description: 'At least one announcement message must be provided.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const docRef = doc(firestore, 'campusSettings', activeAnn.id);

    const updateData: any = {
      announcement: values.announcement || '',
      announcementEndsAt: values.announcementEndsAt || '',
    };
    if (activeAnn.id === 'global') {
      updateData.announcement2 = values.announcement2 || '';
      updateData.announcement2EndsAt = values.announcement2EndsAt || '';
    }

    updateDoc(docRef, updateData)
      .then(() => {
        toast({
          title: 'Announcement Updated',
          description: 'The announcement has been successfully updated.',
        });
        onOpenChange(false);
      })
      .catch((error) => {
        console.error('Error updating announcement:', error);
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updateData,
          }),
        );
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md', activeAnn?.id === 'global' && 'sm:max-w-4xl')}>
        {activeAnn && (
          <>
            <DialogHeader>
              <DialogTitle>Edit Announcement</DialogTitle>
              <DialogDescription>
                Modify the announcement message and set optional auto-expiration date/time schedule.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className={cn('grid grid-cols-1 gap-6', activeAnn.id === 'global' && 'md:grid-cols-2')}>
                  <div className={cn('space-y-3', activeAnn.id !== 'global' && 'md:col-span-2')}>
                    <FormField
                      control={form.control}
                      name="announcement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{activeAnn.id === 'global' ? 'Primary Global Announcement' : 'Message'}</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={4} />
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
                            />
                          </FormControl>
                          <FormDescription className="text-[10px]">
                            Optional. Announcement will automatically expire after this date and time.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {activeAnn.id === 'global' && (
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="announcement2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secondary Global Announcement</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={4} />
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
                              />
                            </FormControl>
                            <FormDescription className="text-[10px]">
                              Optional. Secondary announcement will automatically expire after this date and time.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
