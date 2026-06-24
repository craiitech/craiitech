'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  announcement2: z.string().max(500, 'Announcement must be 500 characters or less.').optional(),
});

export function EditAnnouncementDialog({
  announcement,
  isOpen,
  onOpenChange,
}: EditAnnouncementDialogProps) {
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
      announcement2: '',
    },
  });

  useEffect(() => {
    if (announcement && isOpen) {
      form.reset({
        announcement: announcement.announcement || '',
        announcement2: (announcement as any).announcement2 || '',
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
    };
    if (activeAnn.id === 'global') {
        updateData.announcement2 = values.announcement2 || '';
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
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: updateData
            }));
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", activeAnn?.id === 'global' && "sm:max-w-4xl")}>
        {activeAnn && (
          <>
            <DialogHeader>
              <DialogTitle>Edit Announcement</DialogTitle>
              <DialogDescription>
                Modify the announcement message.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className={cn("grid grid-cols-1 gap-4", activeAnn.id === 'global' && "md:grid-cols-2")}>
                  <FormField
                    control={form.control}
                    name="announcement"
                    render={({ field }) => (
                      <FormItem className={activeAnn.id !== 'global' ? 'md:col-span-2' : ''}>
                        <FormLabel>{activeAnn.id === 'global' ? 'Primary Global Announcement' : 'Message'}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={5} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {activeAnn.id === 'global' && (
                    <FormField
                      control={form.control}
                      name="announcement2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secondary Global Announcement</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={5} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
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