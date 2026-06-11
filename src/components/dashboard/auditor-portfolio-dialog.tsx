'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

const portfolioSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  googleDriveLink: z.string().url('Must be a valid Google Drive or web link.'),
  dateAcquired: z.string().min(1, 'Date acquired is required.'),
});

export type PortfolioFormValues = z.infer<typeof portfolioSchema>;

interface AuditorPortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: PortfolioFormValues) => Promise<void>;
}

export function AuditorPortfolioDialog({
  open,
  onOpenChange,
  onSave,
}: AuditorPortfolioDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      title: '',
      googleDriveLink: '',
      dateAcquired: '',
    },
  });

  const onSubmit = async (values: PortfolioFormValues) => {
    setIsSaving(true);
    try {
      await onSave(values);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving portfolio:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-[#D4AF37]/20 rounded-2xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase text-[#1B6535] tracking-tight">
            Add Qualification & Portfolio
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium text-xs mt-1">
            Host objective evidence of your training, seminars, or track record.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-[#1B6535]">
                    Certificate / Seminar / Document Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Lead Auditor Training on EOMS"
                      {...field}
                      disabled={isSaving}
                      className="font-bold text-xs"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="googleDriveLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-[#1B6535]">
                    Google Drive link / File URL
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://drive.google.com/..."
                      {...field}
                      disabled={isSaving}
                      className="font-bold text-xs"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateAcquired"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-[#1B6535]">
                    Date Acquired / Completed
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      disabled={isSaving}
                      className="font-bold text-xs"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2 border-t mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                className="font-bold text-xs uppercase rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="font-black text-xs uppercase tracking-wider rounded-xl"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add to Portfolio'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
