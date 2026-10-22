'use client';

import { useMemo, useState } from 'react';
import { collection, doc, serverTimestamp, updateDoc, writeBatch } from '@/firebase/firestore-wrapper';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { OfficeConnectionRequest, User, UserAssignment } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { Building2, CheckCircle2, Clock3, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { format } from 'date-fns';

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function OfficeConnectionRequestsManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile } = useUser();
  const { logSessionActivity } = useSessionActivity();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);

  const requestsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'officeConnectionRequests') : null),
    [firestore],
  );
  const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);

  const { data: requests, isLoading } = useCollection<OfficeConnectionRequest>(requestsQuery);
  const { data: users } = useCollection<User>(usersQuery);

  const pendingRequests = useMemo(
    () =>
      (requests || [])
        .filter((request) => request.status === 'pending')
        .sort((a, b) => {
          const aTime = toDate(a.createdAt)?.getTime() || 0;
          const bTime = toDate(b.createdAt)?.getTime() || 0;
          return bTime - aTime;
        }),
    [requests],
  );

  const reviewerName = userProfile
    ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()
    : 'Administrator';

  const handleApprove = async (request: OfficeConnectionRequest) => {
    if (!firestore) return;

    const targetUser = users?.find((candidate) => candidate.id === request.requesterId);
    if (!targetUser) {
      toast({
        title: 'User not found',
        description: 'The requesting user account no longer exists.',
        variant: 'destructive',
      });
      return;
    }

    setProcessingId(request.id);
    try {
      const existingAssignments = targetUser.assignments || [];
      const alreadyAssigned =
        (targetUser.unitId === request.unitId && targetUser.role === request.role) ||
        existingAssignments.some(
          (assignment) => assignment.unitId === request.unitId && assignment.role === request.role,
        );

      const batch = writeBatch(firestore);

      if (!alreadyAssigned) {
        const assignmentId = `asgn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const newAssignment: UserAssignment = {
          id: assignmentId,
          unitId: request.unitId,
          unitName: request.unitName,
          campusId: request.campusId,
          campusName: request.campusName,
          role: request.role,
          roleId: request.roleId || '',
          assignedAt: new Date().toISOString(),
          sourceRequestId: request.id,
        };

        const assignments = [...existingAssignments, newAssignment];
        const assignedUnitIds = Array.from(
          new Set(
            [targetUser.unitId, ...existingAssignments.map((assignment) => assignment.unitId), request.unitId].filter(
              Boolean,
            ),
          ),
        );

        batch.update(doc(firestore, 'users', targetUser.id), {
          assignments,
          assignedUnitIds,
        });
      }

      batch.update(doc(firestore, 'officeConnectionRequests', request.id), {
        status: 'approved',
        reviewedBy: userProfile?.id || '',
        reviewedByName: reviewerName,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(alreadyAssigned ? { reviewNote: 'This designation was already assigned.' } : {}),
      });

      await batch.commit();

      logSessionActivity(`Approved office connection for ${request.requesterEmail}: ${request.unitName}`, {
        action: 'approve_office_connection',
        details: {
          requesterId: request.requesterId,
          unitId: request.unitId,
          role: request.role,
          requestId: request.id,
        },
      });

      toast({
        title: 'Office connection approved',
        description: alreadyAssigned
          ? 'The request was approved, but the user already had this designation.'
          : `${request.requesterName} can now switch to ${request.unitName}.`,
      });
    } catch (error) {
      console.error('Error approving office connection request:', error);
      toast({
        title: 'Approval failed',
        description: 'Could not approve the office connection request.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: OfficeConnectionRequest) => {
    if (!firestore) return;
    setProcessingId(request.id);
    try {
      await updateDoc(doc(firestore, 'officeConnectionRequests', request.id), {
        status: 'rejected',
        reviewedBy: userProfile?.id || '',
        reviewedByName: reviewerName,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      logSessionActivity(`Rejected office connection for ${request.requesterEmail}: ${request.unitName}`, {
        action: 'reject_office_connection',
        details: { requesterId: request.requesterId, unitId: request.unitId, requestId: request.id },
      });

      toast({
        title: 'Request rejected',
        description: `${request.requesterName}'s request for ${request.unitName} was rejected.`,
      });
      setConfirmRejectId(null);
    } catch (error) {
      console.error('Error rejecting office connection request:', error);
      toast({
        title: 'Rejection failed',
        description: 'Could not reject the office connection request.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading || pendingRequests.length === 0) return null;

  return (
    <Card className="border-amber-500/30 shadow-md">
      <CardHeader className="bg-amber-500/5 border-b">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-amber-600" />
              Office Connection Requests
            </CardTitle>
            <CardDescription>
              Review additional office requests. Approving one adds it to the user's active designations.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-amber-500/40 text-amber-700">
            {pendingRequests.length} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        {pendingRequests.map((request) => {
          const isProcessing = processingId === request.id;
          const isConfirmingReject = confirmRejectId === request.id;
          const submittedAt = toDate(request.createdAt);

          return (
            <div key={request.id} className="rounded-lg border bg-muted/10 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{request.requesterName}</p>
                    <span className="text-xs text-muted-foreground">{request.requesterEmail}</span>
                    <Badge variant="outline" className="text-[9px] uppercase">
                      <Clock3 className="mr-1 h-3 w-3" />
                      Pending
                    </Badge>
                    {request.ndaAccepted && (
                      <Badge variant="secondary" className="text-[9px] uppercase">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        NDA Accepted
                      </Badge>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold">{request.unitName}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.role} • {request.campusName}
                    </p>
                  </div>

                  <div className="rounded-md border bg-background p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Request Message
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{request.message}</p>
                  </div>

                  {submittedAt && (
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Submitted {format(submittedAt, 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {isConfirmingReject ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmRejectId(null)}
                        disabled={isProcessing}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(request)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Confirm Reject
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmRejectId(request.id)}
                        disabled={isProcessing}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(request)} disabled={isProcessing}>
                        {isProcessing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Approve Connection
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
