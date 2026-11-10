'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardEdit,
  ExternalLink,
  FileText,
  Loader2,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { EomsPolicyManual, EomsPolicyRevisionRequest, EomsRevisionRequestStatus } from '@/lib/types';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { arrayUnion, doc, serverTimestamp, updateDoc, writeBatch } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import { createTrackingHistoryEntry } from '@/lib/tracking-history';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface EomsRevisionWorkspaceProps {
  requestId: string;
}

function formatDate(value: unknown) {
  if (!value) return 'N/A';
  try {
    if (typeof value === 'object' && value !== null) {
      const timestamp = value as { toDate?: () => Date; seconds?: number };
      if (typeof timestamp.toDate === 'function') return format(timestamp.toDate(), 'MMM dd, yyyy h:mm a');
      if (typeof timestamp.seconds === 'number')
        return format(new Date(timestamp.seconds * 1000), 'MMM dd, yyyy h:mm a');
    }
    const date = value instanceof Date ? value : new Date(value as string | number);
    return Number.isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd, yyyy h:mm a');
  } catch {
    return 'N/A';
  }
}

function nextRevisionNumber(current?: string) {
  const numeric = Number.parseInt(current || '0', 10);
  if (Number.isNaN(numeric)) return '01';
  return String(numeric + 1).padStart(2, '0');
}

export function EomsRevisionWorkspace({ requestId }: EomsRevisionWorkspaceProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { userProfile, userRole, isAdmin, isSupervisor } = useUser();
  const { toast } = useToast();

  const [changeContext, setChangeContext] = useState('');
  const [revisionNumber, setRevisionNumber] = useState('');
  const [executionDate, setExecutionDate] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const requestRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'eomsPolicyRevisionRequests', requestId) : null),
    [firestore, requestId],
  );
  const { data: request, isLoading: isRequestLoading } = useDoc<EomsPolicyRevisionRequest>(requestRef);

  const manualRef = useMemoFirebase(
    () => (firestore && request?.sectionId ? doc(firestore, 'eomsPolicyManuals', request.sectionId) : null),
    [firestore, request?.sectionId],
  );
  const { data: manual, isLoading: isManualLoading } = useDoc<EomsPolicyManual>(manualRef);

  useEffect(() => {
    if (!request) return;
    setChangeContext(request.adminChangeContext || '');
    setRevisionNumber(request.publishedRevisionNumber || nextRevisionNumber(manual?.revisionNumber));
    setExecutionDate(request.publishedExecutionDate || format(new Date(), 'MMMM dd, yyyy'));
  }, [request, manual?.revisionNumber]);

  const displayName =
    `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || userProfile?.email || 'Administrator';

  const actorRole = userRole || 'Administrator';
  const previewUrl = manual?.googleDriveLink
    ? manual.googleDriveLink.replace('/view', '/preview').replace('?usp=sharing', '')
    : '';
  const editableUrl = manual?.editableDocLink || '';
  const canManage = isAdmin || isSupervisor;

  const statusBadge = useMemo(() => {
    const status = request?.status || 'Submitted';
    const classes: Record<string, string> = {
      Submitted: 'bg-blue-100 text-blue-700 border-blue-200',
      'Returned for Revision': 'bg-amber-100 text-amber-700 border-amber-200',
      Rejected: 'bg-rose-100 text-rose-700 border-rose-200',
      'In Revision': 'bg-purple-100 text-purple-700 border-purple-200',
      'Approved & Published': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
    return (
      <Badge variant="outline" className={classes[status] || ''}>
        {status}
      </Badge>
    );
  }, [request?.status]);

  const updateStatus = async (newStatus: EomsRevisionRequestStatus, remarks: string, requireContext = false) => {
    if (!firestore || !request || !userProfile) return;
    if (requireContext && changeContext.trim().length < 5) {
      toast({
        title: 'Change context required',
        description: 'Enter the context of the changes before processing this request.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(firestore, 'eomsPolicyRevisionRequests', request.id), {
        status: newStatus,
        adminChangeContext: changeContext.trim(),
        updatedAt: serverTimestamp(),
        comments: arrayUnion({
          text: remarks,
          authorId: userProfile.id,
          authorName: displayName,
          authorRole: actorRole,
          createdAt: new Date(),
        }),
        trackingHistory: arrayUnion(
          createTrackingHistoryEntry({
            action: 'EOMS manual revision status updated',
            fromStatus: request.status,
            toStatus: newStatus,
            remarks,
            actorId: userProfile.id,
            actorName: displayName,
            actorRole,
            unitId: request.unitId,
          }),
        ),
      });
      toast({ title: 'Request updated', description: `Status changed to ${newStatus}.` });
    } catch (error) {
      console.error('EOMS revision status update failed:', error);
      toast({ title: 'Update failed', description: 'Could not update the request.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveContext = async () => {
    if (!firestore || !request || !userProfile) return;
    if (changeContext.trim().length < 5) {
      toast({ title: 'Context required', description: 'Describe the changes before saving.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, 'eomsPolicyRevisionRequests', request.id), {
        adminChangeContext: changeContext.trim(),
        status: request.status === 'Submitted' ? 'In Revision' : request.status,
        updatedAt: serverTimestamp(),
        trackingHistory: arrayUnion(
          createTrackingHistoryEntry({
            action: 'Revision change context recorded',
            status: request.status === 'Submitted' ? 'In Revision' : request.status,
            remarks: changeContext.trim(),
            actorId: userProfile.id,
            actorName: displayName,
            actorRole,
            unitId: request.unitId,
          }),
        ),
      });
      toast({ title: 'Context saved', description: 'The revision change context has been recorded.' });
    } catch (error) {
      console.error('EOMS change context save failed:', error);
      toast({ title: 'Save failed', description: 'Could not save the change context.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!firestore || !request || !userProfile || !manualRef) return;
    if (changeContext.trim().length < 5) {
      toast({
        title: 'Change context required',
        description: 'Document the context of the changes before publishing the revision.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(firestore);
      const publishedDate = executionDate || format(new Date(), 'MMMM dd, yyyy');

      batch.update(doc(firestore, 'eomsPolicyRevisionRequests', request.id), {
        status: 'Approved & Published' as EomsRevisionRequestStatus,
        adminChangeContext: changeContext.trim(),
        publishedRevisionNumber: revisionNumber,
        publishedExecutionDate: publishedDate,
        updatedAt: serverTimestamp(),
        comments: arrayUnion({
          text: reviewComment.trim() || `Revision ${revisionNumber} approved and published.`,
          authorId: userProfile.id,
          authorName: displayName,
          authorRole: actorRole,
          createdAt: new Date(),
        }),
        trackingHistory: arrayUnion(
          createTrackingHistoryEntry({
            action: 'EOMS manual revision approved and published',
            fromStatus: request.status,
            toStatus: 'Approved & Published',
            remarks: `Published revision ${revisionNumber}. ${changeContext.trim()}`,
            actorId: userProfile.id,
            actorName: displayName,
            actorRole,
            unitId: request.unitId,
          }),
        ),
      });

      batch.set(
        manualRef,
        {
          revisionNumber,
          executionDate: publishedDate,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await batch.commit();
      toast({ title: 'Revision Published', description: `Section revision ${revisionNumber} is now live.` });
    } catch (error) {
      console.error('EOMS revision publish failed:', error);
      toast({ title: 'Publish failed', description: 'Could not publish the revision.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isRequestLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!request) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <div>
            <h3 className="font-black uppercase tracking-tight">Revision request not found</h3>
            <p className="text-sm text-muted-foreground">The request may have been removed or you lack access.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/eoms-policy-manual?tab=inbox')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to inbox
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!canManage) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-4">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
          <div>
            <h3 className="font-black uppercase tracking-tight">Administrator access required</h3>
            <p className="text-sm text-muted-foreground">
              Only the Quality Assurance Office can edit and publish manual revisions.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/eoms-policy-manual')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to manual
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 -ml-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
            onClick={() => router.push('/eoms-policy-manual?tab=inbox')}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Revision Inbox
          </Button>
          <div className="flex items-center gap-2 text-primary">
            <ClipboardEdit className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">EOMS Revision Workspace</span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">
            {request.sectionNumber}. {request.sectionTitle}
          </h2>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            {request.controlNumber || 'Document Control Record'} • Requested {formatDate(request.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">{statusBadge}</div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <Card className="shadow-sm border-primary/10">
            <CardHeader className="py-4 border-b bg-muted/10">
              <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Requested Changes
              </CardTitle>
              <CardDescription className="text-xs">
                Submitted by {request.requestedByName} ({request.unitName || 'Unassigned Unit'})
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Context of Changes (from requesting unit)
                </Label>
                <div className="mt-2 rounded-lg border bg-muted/10 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {request.contextOfChanges}
                </div>
              </div>
              {request.revisedDocLink && (
                <Button variant="outline" size="sm" asChild className="gap-2">
                  <a href={request.revisedDocLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Open Proposed Revised Document
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/10">
            <CardHeader className="py-4 border-b bg-muted/10">
              <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <ClipboardEdit className="h-4 w-4 text-primary" /> Quality Assurance Change Context
              </CardTitle>
              <CardDescription className="text-xs">
                Record what was actually changed in the Word file / Google Doc before publishing.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <Textarea
                value={changeContext}
                onChange={(event) => setChangeContext(event.target.value)}
                rows={6}
                placeholder="Describe the final changes applied to the document, affected clauses, and rationale..."
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={handleSaveContext} disabled={isSaving || isProcessing}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Context
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/10">
            <CardHeader className="py-4 border-b bg-muted/10">
              <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Publish Revision
              </CardTitle>
              <CardDescription className="text-xs">
                Update the official revision metadata after editing the actual Google Drive file.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    New Revision Number
                  </Label>
                  <Input value={revisionNumber} onChange={(event) => setRevisionNumber(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Date of Execution
                  </Label>
                  <Input value={executionDate} onChange={(event) => setExecutionDate(event.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Review Comment (optional)
                </Label>
                <Textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  rows={3}
                  placeholder="Add a note for the requesting unit..."
                  className="resize-none"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    updateStatus('Returned for Revision', changeContext.trim() || 'Returned for revision.', true)
                  }
                  disabled={isProcessing || isSaving}
                  className="text-amber-700 border-amber-200 hover:bg-amber-50"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Return for Revision
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateStatus('Rejected', changeContext.trim() || 'Revision request rejected.', true)}
                  disabled={isProcessing || isSaving}
                  className="text-rose-700 border-rose-200 hover:bg-rose-50"
                >
                  <XCircle className="mr-2 h-4 w-4" /> Reject
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isProcessing || isSaving || request.status === 'Approved & Published'}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Approve & Publish Revision
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="shadow-sm border-primary/10">
            <CardHeader className="py-4 border-b bg-muted/10">
              <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" /> Editable Source Document
              </CardTitle>
              <CardDescription className="text-xs">
                The Google Docs / Word link configured by the administrator for editing.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {isManualLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : editableUrl ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Open the editor in a new page, apply the revisions, then return here to record the change context
                    and publish.
                  </p>
                  <Button asChild className="w-full">
                    <a href={editableUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> Open Google Drive Editor
                    </a>
                  </Button>
                  <p className="text-[10px] text-muted-foreground break-all">{editableUrl}</p>
                </>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
                  <p className="font-black uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Editable link not configured
                  </p>
                  <p>Set the Word file / Google Docs editing link for this section in the manual settings.</p>
                  <Button size="sm" variant="outline" asChild className="w-full">
                    <a href="/settings?tab=eoms-policy-manual">
                      <ShieldCheck className="mr-2 h-4 w-4" /> Open Manual Settings
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/10">
            <CardHeader className="py-4 border-b bg-muted/10">
              <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Current Document Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {previewUrl ? (
                <div className="relative aspect-[4/5] bg-muted/20">
                  <iframe
                    src={previewUrl}
                    className="absolute inset-0 h-full w-full border-none bg-white"
                    title={`${request.sectionTitle} Preview`}
                  />
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No published preview link available.
                </div>
              )}
            </CardContent>
            {manual && (
              <CardFooter className="border-t bg-muted/10 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex flex-wrap gap-4">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-primary" /> Rev {manual.revisionNumber || '--'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-primary" /> {manual.executionDate || 'Not set'}
                </span>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      {request.trackingHistory && request.trackingHistory.length > 0 && (
        <Card className="shadow-sm border-primary/10">
          <CardHeader className="py-4 border-b bg-muted/10">
            <CardTitle className="text-sm font-black uppercase tracking-tight">Revision Tracking History</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <ScrollArea className="max-h-64">
              <div className="space-y-3">
                {request.trackingHistory.map((entry, index) => (
                  <div key={index} className="flex gap-3 text-xs">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold">
                        {entry.action || 'Status update'}
                        {entry.toStatus ? ` — ${entry.toStatus}` : ''}
                      </p>
                      {entry.remarks && <p className="text-muted-foreground mt-0.5">{entry.remarks}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {entry.actorName || 'System'} • {formatDate(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
