'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link as LinkIcon, ShieldCheck, FileText, Hash, Check } from 'lucide-react';
import type { UnitForm } from '@/lib/types';

interface EditFormDriveLinkDialogProps {
  form: UnitForm | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const formDriveSchema = z.object({
  googleDriveLink: z.string().url('Please enter a valid URL (e.g. Google Drive link)').min(5, 'URL is required'),
  revision: z.string().min(1, 'Revision is required'),
});

export function EditFormDriveLinkDialog({ form, isOpen, onOpenChange, onSuccess }: EditFormDriveLinkDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editForm = useForm<z.infer<typeof formDriveSchema>>({
    resolver: zodResolver(formDriveSchema),
    defaultValues: {
      googleDriveLink: '',
      revision: '00',
    },
  });

  useEffect(() => {
    if (form && isOpen) {
      editForm.reset({
        googleDriveLink: form.googleDriveLink || '',
        revision: form.revision || '00',
      });
    }
  }, [form, isOpen, editForm]);

  const onSubmit = async (values: z.infer<typeof formDriveSchema>) => {
    if (!firestore || !form) return;
    setIsSubmitting(true);

    try {
      const formDocRef = doc(firestore, 'unitForms', form.id);
      await updateDoc(formDocRef, {
        googleDriveLink: values.googleDriveLink,
        revision: values.revision,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Form Drive Link Saved',
        description: `Drive repository link for ${form.formCode} was successfully updated.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Update Failed',
        description: 'Could not update the form Google Drive link.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!form) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/20 shadow-2xl">
        <DialogHeader className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b -m-6 mb-6">
          <div className="flex items-center gap-2 text-primary mb-1">
            <LinkIcon className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Form Repository Configuration</span>
          </div>
          <DialogTitle className="text-lg font-black uppercase tracking-tight">Set Form Google Drive Link</DialogTitle>
          <DialogDescription className="text-xs">
            Configure or update the direct Google Drive download link for this controlled form. Units and admins can
            manage this.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight line-clamp-1">
                {form.formName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase font-mono">
                <Hash className="h-3 w-3" /> {form.formCode}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                <ShieldCheck className="h-3 w-3" /> Current Rev: {form.revision || '00'}
              </div>
            </div>
          </div>

          <Form {...editForm}>
            <form id="edit-form-drive" onSubmit={editForm.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="googleDriveLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                      Google Drive Link / URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://drive.google.com/file/d/... or shareable link"
                        className="h-9 text-xs font-mono"
                      />
                    </FormControl>
                    <FormDescription className="text-[10px]">
                      Make sure the Google Drive link has view/download permissions set appropriately.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="revision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                      Revision Number
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 00, 01, 02" className="h-9 text-xs font-bold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-bold text-[10px] uppercase"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-form-drive"
            disabled={isSubmitting}
            className="min-w-[140px] font-black uppercase text-[10px] tracking-widest shadow-md h-9"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-2 h-3.5 w-3.5" />
            )}
            Save Drive Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
