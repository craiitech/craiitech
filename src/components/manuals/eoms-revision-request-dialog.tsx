'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, arrayUnion, collection, doc, serverTimestamp, updateDoc } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import { createTrackingHistoryEntry } from '@/lib/tracking-history';
import { format } from 'date-fns';
import { BookOpen, FileText, Loader2, Send, ShieldCheck } from 'lucide-react';
import type { EomsPolicyManual, EomsPolicyRevisionRequest } from '@/lib/types';
import { ISO_21001_CLAUSES } from '@/components/manuals/eoms-manual-visualization';

const revisionSchema = z.object({
  sectionId: z.string().min(1, 'Please select a manual section.'),
  contextOfChanges: z.string().min(10, 'Please describe the context of the changes (at least 10 characters).'),
  revisedDocLink: z
    .string()
    .url('Please provide a valid Google Drive / Google Docs link.')
    .optional()
    .or(z.literal('')),
});

type RevisionFormValues = z.infer<typeof revisionSchema>;

interface EomsRevisionRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  manuals: Map<string, EomsPolicyManual>;
  request?: EomsPolicyRevisionRequest | null;
  onSuccess?: () => void;
}

export function EomsRevisionRequestDialog({
  isOpen,
  onOpenChange,
  manuals,
  request,
  onSuccess,
}: EomsRevisionRequestDialogProps) {
  const { userProfile, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sectionOptions = useMemo(
    () =>
      ISO_21001_CLAUSES.map((meta) => ({
        id: meta.sectionId,
        number: meta.number,
        title: manuals.get(meta.sectionId)?.title || meta.standardTitle,
      })),
    [manuals],
  );

  const form = useForm<RevisionFormValues>({
    resolver: zodResolver(revisionSchema),
    defaultValues: {
      sectionId: '',
      contextOfChanges: '',
      revisedDocLink: '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      sectionId: request?.sectionId || '',
      contextOfChanges: request?.contextOfChanges || '',
      revisedDocLink: request?.revisedDocLink || '',
    });
  }, [isOpen, request, form]);

  const onSubmit = async (values: RevisionFormValues) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);

    const selectedSection = sectionOptions.find((section) => section.id === values.sectionId);
    const displayName =
      `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.email || 'Unit User';

    try {
      if (request) {
        await updateDoc(doc(firestore, 'eomsPolicyRevisionRequests', request.id), {
          sectionId: values.sectionId,
          sectionNumber: selectedSection?.number || request.sectionNumber,
          sectionTitle: selectedSection?.title || request.sectionTitle,
          contextOfChanges: values.contextOfChanges.trim(),
          revisedDocLink: values.revisedDocLink?.trim() || '',
          status: 'Submitted',
          updatedAt: serverTimestamp(),
          trackingHistory: arrayUnion(
            createTrackingHistoryEntry({
              action: 'EOMS manual revision application resubmitted',
              fromStatus: request.status,
              toStatus: 'Submitted',
              remarks: 'Updated revision request resubmitted for Quality Assurance review.',
              actorId: userProfile.id,
              actorName: displayName,
              actorRole: userRole || 'Unit User',
              unitId: request.unitId,
            }),
          ),
        });
        toast({ title: 'Application Resubmitted', description: 'Your revision request has been sent for review.' });
      } else {
        const controlNumber = `RSU-EOMS-REV-${format(new Date(), 'yyyyMMdd-HHmmss')}`;
        await addDoc(collection(firestore, 'eomsPolicyRevisionRequests'), {
          controlNumber,
          sectionId: values.sectionId,
          sectionNumber: selectedSection?.number || 0,
          sectionTitle: selectedSection?.title || 'EOMS Manual Section',
          contextOfChanges: values.contextOfChanges.trim(),
          revisedDocLink: values.revisedDocLink?.trim() || '',
          requestedBy: userProfile.id,
          requestedByName: displayName,
          requestedByRole: userRole || 'Unit User',
          unitId: userProfile.unitId || '',
          unitName: userProfile.unitName || 'Unassigned Unit',
          campusId: userProfile.campusId || '',
          status: 'Submitted',
          comments: [],
          trackingHistory: [
            createTrackingHistoryEntry({
              action: 'EOMS manual revision requested',
              toStatus: 'Submitted',
              remarks: 'Unit submitted a request to revise the RSU EOMS Manual.',
              actorId: userProfile.id,
              actorName: displayName,
              actorRole: userRole || 'Unit User',
              unitId: userProfile.unitId,
            }),
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Revision Request Submitted', description: `Application ${controlNumber} is now for review.` });
      }

      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('EOMS revision request error:', error);
      toast({
        title: 'Submission Failed',
        description: 'Could not save the revision request.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">EOMS Document Control</span>
          </div>
          <DialogTitle>{request ? 'Edit & Resubmit Revision Request' : 'Apply for EOMS Manual Revision'}</DialogTitle>
          <DialogDescription>
            Specify the manual section and the context of the proposed changes for Quality Assurance review.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
            <FormField
              control={form.control}
              name="sectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manual Section</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!request}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the ISO 21001 clause / section to revise" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sectionOptions.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          <span className="font-mono text-xs mr-2">{section.number}.</span>
                          {section.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contextOfChanges"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context of Changes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder="Describe what needs to change, why it needs to change, and the affected clause provisions..."
                      className="resize-none"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Provide enough detail for the Quality Assurance Office to evaluate and process the revision.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="revisedDocLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposed Revised Document Link (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                      <Input {...field} placeholder="https://drive.google.com/file/d/..." className="pl-9" />
                    </div>
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Attach a Google Drive link to a draft or supporting file. Set sharing to &apos;Anyone with the link
                    can view&apos;.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {request && (
              <div className="rounded-lg border bg-muted/20 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Current status
                </div>
                <Badge variant="outline">{request.status}</Badge>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {request ? 'Resubmit Request' : 'Submit Revision Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
