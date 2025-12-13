
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
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { CampusSetting } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


interface EditAnnouncementDialogProps {
  announcement: CampusSetting;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const editAnnouncementSchema = z.object({
  announcement: z.string().min(1, 'Announcement message cannot be empty.').max(500),
});

export function EditAnnouncementDialog({
  announcement,
  isOpen,
  onOpenChange,
}: EditAnnouncementDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof editAnnouncementSchema>>({
    resolver: zodResolver(editAnnouncementSchema),
    defaultValues: {
      announcement: '',
    },
  });

  useEffect(() => {
    if (announcement) {
      form.reset({
        announcement: announcement.announcement || '',
      });
    }
  }, [announcement, form]);

  const onSubmit = async (values: z.infer<typeof editAnnouncementSchema>) => {
    if (!firestore) return;

    setIsSubmitting(true);
    
    const docRef = doc(firestore, 'campusSettings', announcement.id);
    
    const updateData = {
        announcement: values.announcement,
    };

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Announcement</DialogTitle>
          <DialogDescription>
            Modify the announcement message.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="announcement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={5} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
