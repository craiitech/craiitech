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
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  FilePlus,
  Pencil,
  Trash2,
  Hash,
  FileText,
  Calendar,
  Link as LinkIcon,
  ShieldCheck,
  Building2,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import type { UnitForm } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ManageUnitFormDialogProps {
  form: UnitForm | null; // null if adding new form, UnitForm if editing
  unit: { id: string; name: string; campusIds?: string[] } | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const unitFormSchema = z.object({
  formCode: z.string().min(2, 'Form Code is required (e.g. RSU-ACC-001)'),
  formName: z.string().min(3, 'Form Name / Title is required'),
  revision: z.string().min(1, 'Revision number is required (e.g. 00)'),
  revisionDate: z.string().min(1, 'Revision date is required'),
  googleDriveLink: z.string().url('Please enter a valid Google Drive or Docs link'),
});

export function ManageUnitFormDialog({ form, unit, isOpen, onOpenChange, onSuccess }: ManageUnitFormDialogProps) {
  const { userProfile, isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEditing = !!form;

  const formMethods = useForm<z.infer<typeof unitFormSchema>>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      formCode: '',
      formName: '',
      revision: '00',
      revisionDate: format(new Date(), 'yyyy-MM-dd'),
      googleDriveLink: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (form) {
        formMethods.reset({
          formCode: form.formCode || '',
          formName: form.formName || '',
          revision: form.revision || '00',
          revisionDate: form.revisionDate || format(new Date(), 'yyyy-MM-dd'),
          googleDriveLink: form.googleDriveLink || '',
        });
      } else {
        formMethods.reset({
          formCode: '',
          formName: '',
          revision: '00',
          revisionDate: format(new Date(), 'yyyy-MM-dd'),
          googleDriveLink: '',
        });
      }
    }
  }, [form, isOpen, formMethods]);

  const onSubmit = async (values: z.infer<typeof unitFormSchema>) => {
    if (!firestore || !unit) return;
    setIsSubmitting(true);

    try {
      if (isEditing && form) {
        // Update existing form
        const docRef = doc(firestore, 'unitForms', form.id);
        await updateDoc(docRef, {
          formCode: values.formCode.trim(),
          formName: values.formName.trim(),
          revision: values.revision.trim(),
          revisionDate: values.revisionDate,
          googleDriveLink: values.googleDriveLink.trim(),
          updatedAt: serverTimestamp(),
        });

        toast({
          title: 'Form Updated',
          description: `${values.formCode} was successfully updated.`,
        });
      } else {
        // Create new form in this unit's roster
        await addDoc(collection(firestore, 'unitForms'), {
          unitId: unit.id,
          campusId: unit.campusIds?.[0] || userProfile?.campusId || '',
          formCode: values.formCode.trim(),
          formName: values.formName.trim(),
          revision: values.revision.trim(),
          revisionDate: values.revisionDate,
          googleDriveLink: values.googleDriveLink.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        toast({
          title: 'Form Registered',
          description: `${values.formCode} (${values.formName}) is now enrolled in your unit forms registry.`,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Operation Failed',
        description: 'Failed to save the form details. Please check your network and permissions.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || !form) return;
    setIsDeleting(true);

    try {
      await deleteDoc(doc(firestore, 'unitForms', form.id));
      toast({
        title: 'Form Deleted',
        description: `${form.formCode} has been removed from this unit registry.`,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Delete Failed',
        description: 'Could not remove this form.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!unit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-primary/20 shadow-2xl">
        <DialogHeader className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b -m-6 mb-6">
          <div className="flex items-center gap-2 text-primary mb-1">
            {isEditing ? <Pencil className="h-4 w-4" /> : <FilePlus className="h-4 w-4" />}
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Unit Forms Setup & Registry</span>
          </div>
          <DialogTitle className="text-lg font-black uppercase tracking-tight">
            {isEditing ? `Edit Form: ${form?.formCode}` : 'Register New Controlled Form'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? `Update the official code, name, revision, date, or drive link for ${unit.name}.`
              : `Enroll a new operational form for ${unit.name} so other units can download it.`}
          </DialogDescription>
        </DialogHeader>

        <Form {...formMethods}>
          <form id="manage-unit-form" onSubmit={formMethods.handleSubmit(onSubmit)} className="space-y-4 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={formMethods.control}
                name="formCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 text-primary" /> Form Code
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. RSU-VPAF-001"
                        className="h-9 text-xs font-mono font-bold uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={formMethods.control}
                name="revision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Revision Number
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 00, 01, 02" className="h-9 text-xs font-bold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={formMethods.control}
              name="formName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Official Form Title / Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Property Acknowledgement Receipt Form"
                      className="h-9 text-xs font-semibold"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={formMethods.control}
              name="revisionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Revision / Effective Date
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="h-9 text-xs" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={formMethods.control}
              name="googleDriveLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-primary" /> Google Drive Link
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://drive.google.com/file/d/... or shareable link"
                      className="h-9 text-xs font-mono"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Direct download or view link on Google Drive. Make sure permission is set to &quot;Anyone with the
                    link can view&quot;.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="pt-4 border-t flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
          {isEditing ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 h-9 font-bold text-[10px] uppercase gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Form
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-base font-black uppercase">
                    Delete {form?.formCode}?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    This action will remove <strong>{form?.formName}</strong> from this unit&apos;s active roster. Other
                    units will no longer be able to request or download it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-xs uppercase font-bold">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase"
                  >
                    Confirm Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-bold text-[10px] uppercase h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="manage-unit-form"
              disabled={isSubmitting || isDeleting}
              className="min-w-[150px] font-black uppercase text-[10px] tracking-widest shadow-md h-9 gap-1.5"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {isEditing ? 'Save Changes' : 'Register Form'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
