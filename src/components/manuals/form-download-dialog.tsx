
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
    DialogTitle 
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, 
    Download, 
    ShieldCheck, 
    User, 
    Calendar,
    FileText,
    Hash
} from 'lucide-react';
import { format } from 'date-fns';
import type { UnitForm } from '@/lib/types';

interface FormDownloadDialogProps {
  form: UnitForm;
  unitId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const downloadSchema = z.object({
  requesterName: z.string().min(3, 'Please provide your full institutional name.'),
  requestDate: z.string().min(1, 'Date is required.'),
});

export function FormDownloadDialog({ form, unitId, isOpen, onOpenChange }: FormDownloadDialogProps) {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const downloadForm = useForm<z.infer<typeof downloadSchema>>({
    resolver: zodResolver(downloadSchema),
    defaultValues: {
      requesterName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '',
      requestDate: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  useEffect(() => {
      if (userProfile && isOpen) {
          downloadForm.setValue('requesterName', `${userProfile.firstName} ${userProfile.lastName}`);
      }
  }, [userProfile, isOpen, downloadForm]);

  const onSubmit = async (values: z.infer<typeof downloadSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      // 1. Log the download request
      const logData = {
        unitId,
        formId: form.id,
        formName: form.formName,
        formCode: form.formCode,
        requesterName: values.requesterName,
        requestDate: values.requestDate,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, 'formDownloadLogs'), logData);
      
      // 2. Open the link
      window.open(form.googleDriveLink, '_blank');
      
      toast({ title: 'Link Authorized', description: 'Institutional form link has been opened in a new tab.' });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Request Failed', description: 'Could not authorize the download link.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/20 shadow-2xl">
        <DialogHeader className="bg-slate-50 p-6 border-b -m-6 mb-6">
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Access Control</span>
          </div>
          <DialogTitle className="text-xl">Form Download Authorization</DialogTitle>
          <DialogDescription className="text-xs">Provide your details to log this access request for quality auditing.</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
            <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{form.formName}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                        <Hash className="h-3 w-3" /> {form.formCode}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                        <ShieldCheck className="h-3 w-3" /> Rev {form.revision}
                    </div>
                </div>
            </div>

            <Form {...downloadForm}>
                <form id="download-form" onSubmit={downloadForm.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={downloadForm.control} name="requesterName" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-black uppercase text-slate-700 flex items-center gap-2">
                                <User className="h-3.5 w-3.5" /> Full Name of Requester
                            </FormLabel>
                            <FormControl><Input {...field} placeholder="Institutional name..." className="h-10 text-sm font-bold" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={downloadForm.control} name="requestDate" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-black uppercase text-slate-700 flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" /> Date of Request
                            </FormLabel>
                            <FormControl><Input type="date" {...field} className="h-10 text-sm" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </form>
            </Form>
        </div>

        <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="font-bold text-[10px] uppercase">Cancel</Button>
            <Button type="submit" form="download-form" disabled={isSubmitting} className="min-w-[160px] font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 h-10">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Authorize Link
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
