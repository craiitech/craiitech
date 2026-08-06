'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FiamoStatusBadge } from '@/components/fiamo/shared/fiamo-status-badge';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, UserCheck, FileSearch, ClipboardCheck, XCircle, FileCheck2 } from 'lucide-react';
import { logFiamoActivity } from '@/lib/fiamo-activity-log';
import { format } from 'date-fns';
import type { RepairRequest, FiamoWorkerType, User } from '@/lib/types';
import { useSessionActivity } from '@/lib/activity-log-provider';

interface RepairRequestInboxProps {
  campusId?: string;
}

export function RepairRequestInbox({ campusId }: RepairRequestInboxProps) {
  const firestore = useFirestore();
  const { userProfile, userRole } = useUser();
  const { toast } = useToast();
  const { logSessionActivity } = useSessionActivity();
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [selectedWorkerType, setSelectedWorkerType] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [programOfWorkRef, setProgramOfWorkRef] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const baseRef = collection(firestore, 'repairRequests');
    if (campusId) return query(baseRef, where('campusId', '==', campusId));
    return query(baseRef);
  }, [firestore, campusId]);
  const { data: requests, isLoading } = useCollection<RepairRequest>(requestsQuery);

  const workerTypesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'fiamoWorkerTypes') : null),
    [firestore],
  );
  const { data: workerTypes } = useCollection<FiamoWorkerType>(workerTypesQuery);

  const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: users } = useCollection<User>(usersQuery);

  const pendingReviews = useMemo(
    () =>
      (requests || [])
        .filter((r) => r.status === 'Submitted')
        .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0)),
    [requests],
  );

  const inProgress = useMemo(
    () => (requests || []).filter((r) => ['Assigned', 'InProgress', 'Completed'].includes(r.status)),
    [requests],
  );

  const staffForWorkerType = useMemo(() => {
    if (!selectedWorkerType) return [];
    const wt = workerTypes?.find((w) => w.id === selectedWorkerType);
    if (!wt) return [];
    return (users || []).filter((u) => u.workerTypeId === wt.id || u.fiamoRole === 'FIAMO Staff');
  }, [selectedWorkerType, workerTypes, users]);

  const executeAction = async (action: 'review' | 'assign' | 'approve' | 'file' | 'reject', request: RepairRequest) => {
    if (!firestore || !userProfile) return;
    setActionInProgress(true);
    try {
      const updateData: Record<string, unknown> = {};

      if (action === 'review') {
        updateData.status = 'Reviewed';
        updateData.reviewedAt = serverTimestamp();
      } else if (action === 'assign') {
        if (!selectedStaffId) {
          toast({ title: 'Select Staff', variant: 'destructive' });
          setActionInProgress(false);
          return;
        }
        const staff = users?.find((u) => u.id === selectedStaffId);
        const wt = workerTypes?.find((w) => w.id === selectedWorkerType);
        updateData.status = 'Assigned';
        updateData.assignedStaffId = selectedStaffId;
        updateData.assignedStaffName = staff ? `${staff.firstName} ${staff.lastName}` : '';
        updateData.assignedWorkerTypeId = selectedWorkerType;
        updateData.assignedWorkerTypeName = wt?.name || '';
        updateData.programOfWorkRef = programOfWorkRef || undefined;
        updateData.assignedAt = serverTimestamp();
      } else if (action === 'approve') {
        updateData.status = 'Completed';
        updateData.approvedBy = userProfile.id;
        updateData.approvedByName = `${userProfile.firstName} ${userProfile.lastName}`;
        updateData.approvedAt = serverTimestamp();
        updateData.completedAt = serverTimestamp();
      } else if (action === 'file') {
        updateData.status = 'Filed';
        updateData.filedAt = serverTimestamp();
      } else if (action === 'reject') {
        updateData.status = 'Submitted';
        updateData.completionNotes = request.completionNotes + ' [REJECTED - please redo evidence]';
      }

      await updateDoc(doc(firestore, 'repairRequests', request.id), updateData);

      await logFiamoActivity({
        firestore,
        type:
          action === 'review'
            ? 'repair_request_reviewed'
            : action === 'assign'
              ? 'repair_request_assigned'
              : action === 'approve'
                ? 'repair_request_approved'
                : action === 'file'
                  ? 'repair_request_filed'
                  : 'repair_request_rejected',
        module: 'RepairRequest',
        recordId: request.id,
        userId: userProfile.id,
        userName: `${userProfile.firstName} ${userProfile.lastName}`,
        userRole: userRole || 'Unit Coordinator',
        description: `${action === 'review' ? 'Reviewed' : action === 'assign' ? 'Assigned to ' + updateData.assignedStaffName : action === 'approve' ? 'Approved completion of' : action === 'file' ? 'Filed' : 'Rejected'} repair request ${request.description?.slice(0, 50)}`,
        details: updateData,
        campusId: request.campusId,
        unitId: request.unitId,
      });

      logSessionActivity(`FIAMO repair request ${action}`, {
        action: `fiamo_repair_${action}`,
        details: { requestId: request.id },
      });

      toast({ title: 'Updated', description: `Repair request ${action} successful.` });
      setSelectedRequest(null);
      setSelectedWorkerType('');
      setSelectedStaffId('');
      setProgramOfWorkRef('');
    } catch (error) {
      console.error('Error in repair request action:', error);
      toast({ title: 'Action Failed', variant: 'destructive' });
    } finally {
      setActionInProgress(false);
    }
  };

  const renderActionPanel = () => {
    if (!selectedRequest) return null;

    if (selectedRequest.status === 'Submitted') {
      return (
        <Card className="border-amber-300 bg-amber-50/40 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileSearch className="h-4 w-4" /> Review Request
            </CardTitle>
            <CardDescription className="text-xs">{selectedRequest.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Requested by</p>
                <p className="font-bold">{selectedRequest.requestedByName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-bold">{selectedRequest.category}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-bold">{selectedRequest.location}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-bold">
                  {format(selectedRequest.createdAt?.toDate?.() || new Date(selectedRequest.createdAt), 'PP')}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                Program of Work Reference (optional)
              </label>
              <Input
                value={programOfWorkRef}
                onChange={(e) => setProgramOfWorkRef(e.target.value)}
                placeholder="e.g. POW-2024-001"
                className="h-9 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => executeAction('reject', selectedRequest)}
                disabled={actionInProgress}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Send Back
              </Button>
              <Button size="sm" onClick={() => executeAction('review', selectedRequest)} disabled={actionInProgress}>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Review & Proceed
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (selectedRequest.status === 'Reviewed') {
      return (
        <Card className="border-blue-300 bg-blue-50/40 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Assign to Staff
            </CardTitle>
            <CardDescription className="text-xs">
              Select a worker type and staff member for this repair.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Worker Type (Trade)</label>
              <Select value={selectedWorkerType} onValueChange={setSelectedWorkerType}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue placeholder="Select worker type..." />
                </SelectTrigger>
                <SelectContent>
                  {workerTypes
                    ?.filter((w) => w.isActive)
                    .map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Assign Staff</label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId} disabled={!selectedWorkerType}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue placeholder={selectedWorkerType ? 'Select staff member...' : 'Pick worker type first'} />
                </SelectTrigger>
                <SelectContent>
                  {staffForWorkerType.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </SelectItem>
                  ))}
                  {staffForWorkerType.length === 0 && (
                    <SelectItem value="__none" disabled>
                      No staff with this worker type
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={() => executeAction('assign', selectedRequest)}
              disabled={actionInProgress || !selectedStaffId}
            >
              {actionInProgress && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Assign & Notify
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (selectedRequest.status === 'Completed') {
      return (
        <Card className="border-green-300 bg-green-50/40 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCheck2 className="h-4 w-4" /> Verify & File
            </CardTitle>
            <CardDescription className="text-xs">Review the evidence submitted by staff before filing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedRequest.evidenceSubmitted?.length ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Submitted Evidence ({selectedRequest.evidenceSubmitted.length})
                </p>
                {selectedRequest.evidenceSubmitted.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-white border text-xs">
                    <span className="font-semibold">{ev.evidenceTypeLabel}</span>
                    {ev.fileUrl ? (
                      <a
                        href={ev.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline text-[10px]"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">No attachment</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No evidence submitted yet.</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => executeAction('file', selectedRequest)} disabled={actionInProgress}>
                <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> File Completed
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => executeAction('reject', selectedRequest)}
                disabled={actionInProgress}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Return for Redo
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderRequestCard = (req: RepairRequest) => (
    <Card
      key={req.id}
      className={`cursor-pointer transition-all hover:shadow-md ${selectedRequest?.id === req.id ? 'ring-2 ring-primary' : ''}`}
      onClick={() => setSelectedRequest(req)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[9px] uppercase">
              {req.category}
            </Badge>
            <FiamoStatusBadge status={req.status} />
          </div>
          <span className="text-[10px] text-muted-foreground">
            {format(req.createdAt?.toDate?.() || new Date(req.createdAt), 'MMM d')}
          </span>
        </div>
        <p className="text-sm font-bold mt-2 line-clamp-1">{req.description}</p>
        <p className="text-[10px] text-muted-foreground">
          {req.location} · {req.requestedByName}
        </p>
        {req.assignedStaffName && <p className="text-[10px] text-blue-700 mt-1">→ {req.assignedStaffName}</p>}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-black uppercase tracking-widest text-xs text-amber-700">
            Pending Review ({pendingReviews.length})
          </h3>
          <div className="mt-2 space-y-2">
            {pendingReviews.length === 0 && <p className="text-xs text-muted-foreground italic">No new requests.</p>}
            {pendingReviews.map(renderRequestCard)}
          </div>
        </div>
        <div>
          <h3 className="font-black uppercase tracking-widest text-xs text-blue-700">
            In Progress ({inProgress.length})
          </h3>
          <div className="mt-2 space-y-2">
            {inProgress.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No in-progress requests.</p>
            )}
            {inProgress.map(renderRequestCard)}
          </div>
        </div>
      </div>
      <div>
        {renderActionPanel() || (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">Select a request to review</p>
              <p className="text-xs">Choose a request from the list to review, assign, or file it.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
