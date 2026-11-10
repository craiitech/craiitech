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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, arrayUnion, collection, doc, serverTimestamp, updateDoc } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import { createTrackingHistoryEntry } from '@/lib/tracking-history';
import { format } from 'date-fns';
import { AlertTriangle, BookOpen, ExternalLink, Eye, FileText, Loader2, Pencil, Send, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EomsPolicyManual, EomsPolicyRevisionRequest } from '@/lib/types';
import { ISO_21001_CLAUSES } from '@/components/manuals/eoms-manual-visualization';

const revisionSchema = z.object({
  sectionId: z.string().min(1, 'Please select a manual section.'),
  contextOfChanges: z.string().trim().min(10, 'Please describe the context of the changes (at least 10 characters).'),
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

function toPreviewUrl(url?: string) {
  if (!url) return '';
  return url.replace('/view', '/preview').replace('?usp=sharing', '');
}

function toEditorUrl(url?: string) {
  if (!url) return '';
  const base = url.replace('/view', '/edit').replace('?usp=sharing', '');
  return base.includes('?') ? `${base}&embedded=true` : `${base}?embedded=true`;
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
  const [docMode, setDocMode] = useState<'edit' | 'preview'>('edit');

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

  const selectedSectionId = form.watch('sectionId');
  const contextOfChanges = form.watch('contextOfChanges') || '';
  const selectedManual = selectedSectionId ? manuals.get(selectedSectionId) : undefined;
  const previewUrl = toPreviewUrl(selectedManual?.googleDriveLink);
  const editorUrl = toEditorUrl(selectedManual?.editableDocLink);
  const activeDocUrl = docMode === 'edit' && editorUrl ? editorUrl : previewUrl;
  const hasValidContext = contextOfChanges.trim().length >= 10;

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      sectionId: request?.sectionId || '',
      contextOfChanges: request?.contextOfChanges || '',
      revisedDocLink: request?.revisedDocLink || '',
    });
    setDocMode('edit');
  }, [isOpen, request, form]);

  const onSubmit = async (values: RevisionFormValues) => {
    if (!firestore || !userProfile) return;
    if (values.contextOfChanges.trim().length < 10) {
      toast({
        title: 'Context of changes required',
        description: 'Describe the context of the change before submitting the revision request.',
        variant: 'destructive',
      });
      return;
    }
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
      <DialogContent className="w-[96vw] max-w-[1400px] h-[94dvh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">EOMS Document Control</span>
          </div>
          <DialogTitle className="text-xl">
            {request ? 'Edit & Resubmit Revision Request' : 'Apply for EOMS Manual Revision'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review and update the source document on this screen, then provide the context of the changes before
            submitting.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
              {/* DOCUMENT PANEL */}
              <div className="flex-1 min-w-0 flex flex-col border-b lg:border-b-0 lg:border-r bg-slate-100 dark:bg-slate-900 min-h-[42dvh] lg:min-h-0">
                <div className="px-4 py-2.5 border-b bg-white dark:bg-slate-950 flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Document to be changed
                      </p>
                      <p className="text-xs font-bold truncate">
                        {selectedManual
                          ? `${selectedManual.sectionNumber}. ${selectedManual.title}`
                          : 'Select a manual section to load the document'}
                      </p>
                    </div>
                  </div>

                  {selectedManual && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex rounded-md border bg-muted p-0.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={docMode === 'preview' ? 'secondary' : 'ghost'}
                          className="h-7 px-2.5 text-[9px] font-black uppercase tracking-widest"
                          onClick={() => setDocMode('preview')}
                          disabled={!previewUrl}
                        >
                          <Eye className="mr-1 h-3 w-3" /> Preview
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={docMode === 'edit' ? 'secondary' : 'ghost'}
                          className="h-7 px-2.5 text-[9px] font-black uppercase tracking-widest"
                          onClick={() => setDocMode('edit')}
                          disabled={!editorUrl}
                        >
                          <Pencil className="mr-1 h-3 w-3" /> Edit
                        </Button>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[9px] font-black uppercase tracking-widest"
                        asChild
                      >
                        <a
                          href={
                            docMode === 'edit' && selectedManual.editableDocLink
                              ? selectedManual.editableDocLink
                              : selectedManual.googleDriveLink
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-1 h-3 w-3" /> Open Full
                        </a>
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex-1 relative">
                  {!selectedManual ? (
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                      <div className="max-w-sm text-center space-y-3 text-muted-foreground">
                        <BookOpen className="h-12 w-12 mx-auto opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest">No document loaded</p>
                        <p className="text-xs">
                          Choose the manual section on the right to display the document that needs to be changed.
                        </p>
                      </div>
                    </div>
                  ) : activeDocUrl ? (
                    <>
                      <iframe
                        key={activeDocUrl}
                        src={activeDocUrl}
                        className="absolute inset-0 h-full w-full border-none bg-white"
                        title={`${selectedManual.title} ${docMode === 'edit' ? 'Editor' : 'Preview'}`}
                        allow="autoplay"
                      />
                      <div className="absolute right-2 bottom-2 rounded-md bg-background/90 border px-2 py-1 text-[9px] font-bold text-muted-foreground shadow-sm">
                        {docMode === 'edit'
                          ? 'Editing in Google Drive — save there, then submit the request.'
                          : 'Read-only preview'}
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                      <div className="max-w-md text-center space-y-3">
                        <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
                        <p className="text-xs font-black uppercase tracking-widest">No document link configured</p>
                        <p className="text-xs text-muted-foreground">
                          This section does not yet have a document link. You can still submit the revision request with
                          the context of changes, or ask the Quality Assurance Office to configure the document link.
                        </p>
                        {selectedManual.googleDriveLink && (
                          <Button type="button" size="sm" variant="outline" asChild>
                            <a href={selectedManual.googleDriveLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open Document
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {selectedManual && !editorUrl && (
                  <div className="px-4 py-2 border-t bg-amber-50 text-amber-800 text-[10px] font-bold flex items-center gap-2 shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Editable document link is not configured for this section. Preview mode is available.
                  </div>
                )}
                {selectedManual && editorUrl && docMode === 'edit' && (
                  <div className="px-4 py-1.5 border-t bg-muted/30 text-[9px] font-bold text-muted-foreground shrink-0">
                    If the Google editor does not load inside this panel, click &quot;Open Full&quot; to edit in a new
                    tab, then return here to submit the context of changes.
                  </div>
                )}
              </div>

              {/* REQUEST FORM PANEL */}
              <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 flex flex-col min-h-0 bg-background">
                <ScrollArea className="flex-1">
                  <div className="p-5 space-y-5">
                    <FormField
                      control={form.control}
                      name="sectionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                            Manual Section
                          </FormLabel>
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
                          <div className="flex items-center justify-between gap-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                              Context of Changes
                            </FormLabel>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[8px] font-black uppercase',
                                hasValidContext
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                  : 'border-rose-300 bg-rose-50 text-rose-700',
                              )}
                            >
                              {hasValidContext ? 'Provided' : 'Required'}
                            </Badge>
                          </div>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={9}
                              placeholder="Describe what needs to change, why it needs to change, and the affected clause provisions..."
                              className="resize-none"
                            />
                          </FormControl>
                          <FormDescription className="text-[10px]">
                            Required before submitting. Provide enough detail for the Quality Assurance Office to
                            evaluate and process the revision.
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
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                            Revised Document Link (Optional)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                              <Input {...field} placeholder="https://drive.google.com/file/d/..." className="pl-9" />
                            </div>
                          </FormControl>
                          <FormDescription className="text-[10px]">
                            Paste the Google Drive link of the updated file if you saved a separate copy. Set sharing to
                            &apos;Anyone with the link can view&apos;.
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

                    {selectedManual && (
                      <div className="rounded-lg border bg-muted/10 p-3 text-[10px] font-bold text-muted-foreground space-y-1">
                        <p className="uppercase tracking-widest">Document metadata</p>
                        <p>Revision: {selectedManual.revisionNumber || '--'}</p>
                        <p>Execution: {selectedManual.executionDate || 'Not set'}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[10px] font-bold text-muted-foreground">
                {hasValidContext
                  ? 'Context of changes is provided. You may submit the revision request.'
                  : 'Context of changes is required before submitting the revision request.'}
              </p>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !hasValidContext || !selectedSectionId}
                  className="flex-1 sm:flex-none"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {request ? 'Resubmit Request' : 'Submit Revision Request'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
