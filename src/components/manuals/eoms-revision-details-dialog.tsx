'use client';

import { Loader2, ExternalLink, FileText, Calendar, Building2, User, MessageSquare, ClipboardEdit } from 'lucide-react';
import { format } from 'date-fns';
import type { EomsPolicyRevisionRequest } from '@/lib/types';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from '@/firebase/firestore-wrapper';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface EomsRevisionDetailsDialogProps {
  requestId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
  onEditClick?: (request: EomsPolicyRevisionRequest) => void;
  onOpenWorkspace?: (request: EomsPolicyRevisionRequest) => void;
}

const statusClasses: Record<string, string> = {
  Submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  'Returned for Revision': 'bg-amber-100 text-amber-700 border-amber-200',
  Rejected: 'bg-rose-100 text-rose-700 border-rose-200',
  'In Revision': 'bg-purple-100 text-purple-700 border-purple-200',
  'Approved & Published': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

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

export function EomsRevisionDetailsDialog({
  requestId,
  isOpen,
  onOpenChange,
  isAdmin,
  onEditClick,
  onOpenWorkspace,
}: EomsRevisionDetailsDialogProps) {
  const firestore = useFirestore();
  const requestRef = useMemoFirebase(
    () => (firestore && requestId ? doc(firestore, 'eomsPolicyRevisionRequests', requestId) : null),
    [firestore, requestId],
  );
  const { data: request, isLoading } = useDoc<EomsPolicyRevisionRequest>(requestRef);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90dvh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-2 text-primary mb-1">
            <ClipboardEdit className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">EOMS Revision Request</span>
          </div>
          <DialogTitle className="text-lg">{request ? request.sectionTitle : 'Revision Request Details'}</DialogTitle>
          <DialogDescription className="text-xs">
            {request?.controlNumber || 'Document control record'} • Section {request?.sectionNumber || '--'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !request ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary opacity-30" />
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusClasses[request.status] || ''}>
                    {request.status}
                  </Badge>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {request.controlNumber || 'No control number'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2 rounded-lg border bg-muted/10 p-3">
                    <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        Requesting Unit
                      </p>
                      <p className="font-bold mt-0.5">{request.unitName || 'Unassigned Unit'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border bg-muted/10 p-3">
                    <User className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        Requested By
                      </p>
                      <p className="font-bold mt-0.5">{request.requestedByName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border bg-muted/10 p-3">
                    <Calendar className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        Date Requested
                      </p>
                      <p className="font-bold mt-0.5">{formatDate(request.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border bg-muted/10 p-3">
                    <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Section</p>
                      <p className="font-bold mt-0.5">
                        {request.sectionNumber}. {request.sectionTitle}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Context of Changes
                  </p>
                  <div className="rounded-lg border bg-background p-4 text-sm leading-relaxed whitespace-pre-wrap">
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

                {request.adminChangeContext && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Quality Assurance Change Context
                    </p>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                      {request.adminChangeContext}
                    </div>
                  </div>
                )}

                {request.status === 'Approved & Published' && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs space-y-1">
                    <p className="font-black uppercase tracking-widest text-emerald-700">Published Revision</p>
                    <p>
                      Revision No.{' '}
                      <span className="font-mono font-bold">{request.publishedRevisionNumber || '--'}</span>
                    </p>
                    <p>Execution Date: {request.publishedExecutionDate || '--'}</p>
                  </div>
                )}

                {request.comments?.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5" /> Review Comments
                      </p>
                      {request.comments.map((comment, index) => (
                        <div key={index} className="rounded-lg border p-3 text-xs">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold">{comment.authorName}</span>
                            <span className="text-[10px] text-muted-foreground">{formatDate(comment.createdAt)}</span>
                          </div>
                          <p className="text-muted-foreground whitespace-pre-wrap">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="p-4 border-t bg-muted/20 gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {isAdmin && onOpenWorkspace && (
                <Button onClick={() => onOpenWorkspace(request)}>
                  <ClipboardEdit className="mr-2 h-4 w-4" /> Open Revision Workspace
                </Button>
              )}
              {!isAdmin && request.status === 'Returned for Revision' && onEditClick && (
                <Button onClick={() => onEditClick(request)}>
                  <ClipboardEdit className="mr-2 h-4 w-4" /> Edit & Resubmit
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
