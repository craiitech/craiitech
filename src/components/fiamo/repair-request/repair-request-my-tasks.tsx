'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FiamoStatusBadge } from '@/components/fiamo/shared/fiamo-status-badge';
import { EvidenceSelector } from '@/components/fiamo/shared/evidence-selector';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, PlayCircle, ClipboardCheck, Wrench, FileCheck2 } from 'lucide-react';
import { logFiamoActivity } from '@/lib/fiamo-activity-log';
import { format } from 'date-fns';
import type { RepairRequest, FiamoWorkerType, FiamoEvidenceType, RepairCompletionEvidence } from '@/lib/types';

export function RepairRequestMyTasks() {
  const firestore = useFirestore();
  const { userProfile, userRole } = useUser();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [evidence, setEvidence] = useState<RepairCompletionEvidence[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const myTasksQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(collection(firestore, 'repairRequests'), where('assignedStaffId', '==', userProfile.id));
  }, [firestore, userProfile]);
  const { data: myTasks, isLoading } = useCollection<RepairRequest>(myTasksQuery);

  const workerTypeRef = useMemoFirebase(
    () =>
      firestore && userProfile?.workerTypeId ? doc(firestore, 'fiamoWorkerTypes', userProfile.workerTypeId) : null,
    [firestore, userProfile?.workerTypeId],
  );
  const { data: myWorkerType } = useDoc<FiamoWorkerType>(workerTypeRef);

  const evidenceTypesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'fiamoEvidenceTypes') : null),
    [firestore],
  );
  const { data: allEvidenceTypes } = useCollection<FiamoEvidenceType>(evidenceTypesQuery);

  const allowedEvidenceTypes = useMemo(() => {
    if (!allEvidenceTypes || !myWorkerType?.requiredEvidenceTypeIds) return [];
    return allEvidenceTypes.filter((et) => myWorkerType.requiredEvidenceTypeIds.includes(et.id));
  }, [allEvidenceTypes, myWorkerType]);

  const activeTasks = useMemo(
    () => (myTasks || []).filter((t) => ['Assigned', 'InProgress'].includes(t.status)),
    [myTasks],
  );
  const completedTasks = useMemo(
    () => (myTasks || []).filter((t) => ['Completed', 'Filed'].includes(t.status)),
    [myTasks],
  );

  const openRequest = (req: RepairRequest) => {
    setSelectedRequest(req);
    setCompletionNotes(req.completionNotes || '');
    setEvidence(req.evidenceSubmitted || []);
  };

  const startWork = async (req: RepairRequest) => {
    if (!firestore || !userProfile) return;
    try {
      await updateDoc(doc(firestore, 'repairRequests', req.id), {
        status: 'InProgress',
        startedAt: serverTimestamp(),
      });
      await logFiamoActivity({
        firestore,
        type: 'repair_request_started',
        module: 'RepairRequest',
        recordId: req.id,
        userId: userProfile.id,
        userName: `${userProfile.firstName} ${userProfile.lastName}`,
        userRole: userRole || 'FIAMO Staff',
        description: `Started work on ${req.description?.slice(0, 50)}`,
        campusId: req.campusId,
        unitId: req.unitId,
      });
      toast({ title: 'Work Started' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to start', variant: 'destructive' });
    }
  };

  const submitCompletion = async (req: RepairRequest) => {
    if (!firestore || !userProfile) return;
    // Enforce required evidence
    const requiredTypes = allowedEvidenceTypes.filter((et) => et.isRequired).map((et) => et.id);
    const submittedTypes = evidence.map((ev) => ev.evidenceTypeId);
    const missingRequired = requiredTypes.filter((id) => !submittedTypes.includes(id));

    if (missingRequired.length > 0) {
      const missingLabels = allowedEvidenceTypes.filter((et) => missingRequired.includes(et.id)).map((et) => et.label);
      toast({
        title: 'Required Evidence Missing',
        description: `Please provide: ${missingLabels.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const enrichedEvidence = evidence.map((ev) => ({
        ...ev,
        submittedBy: userProfile.id,
        submittedByName: `${userProfile.firstName} ${userProfile.lastName}`,
        submittedAt: new Date(),
      }));
      await updateDoc(doc(firestore, 'repairRequests', req.id), {
        status: 'Completed',
        completionNotes,
        evidenceSubmitted: enrichedEvidence,
        completedAt: serverTimestamp(),
      });
      await logFiamoActivity({
        firestore,
        type: 'repair_request_completed',
        module: 'RepairRequest',
        recordId: req.id,
        userId: userProfile.id,
        userName: `${userProfile.firstName} ${userProfile.lastName}`,
        userRole: userRole || 'FIAMO Staff',
        description: `Submitted completion for ${req.description?.slice(0, 50)} with ${enrichedEvidence.length} evidence item(s)`,
        details: { evidenceCount: enrichedEvidence.length },
        campusId: req.campusId,
        unitId: req.unitId,
      });
      setSelectedRequest(null);
      toast({ title: 'Completion Submitted', description: 'Awaiting Unit Coordinator approval.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Submit Failed', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
      </div>
    );
  }

  const renderTaskCard = (req: RepairRequest) => (
    <Card
      key={req.id}
      className={`cursor-pointer transition-all hover:shadow-md ${selectedRequest?.id === req.id ? 'ring-2 ring-primary' : ''}`}
      onClick={() => openRequest(req)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
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
        {req.evidenceSubmitted && req.evidenceSubmitted.length > 0 && (
          <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
            <FileCheck2 className="h-3 w-3" /> {req.evidenceSubmitted.length} evidence item(s) submitted
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-black uppercase tracking-widest text-xs text-blue-700 flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Active Tasks ({activeTasks.length})
          </h3>
          <div className="mt-2 space-y-2">
            {activeTasks.length === 0 && (
              <p className="text-xs text-muted-foreground italic">You have no active tasks assigned.</p>
            )}
            {activeTasks.map(renderTaskCard)}
          </div>
        </div>
        <div>
          <h3 className="font-black uppercase tracking-widest text-xs text-green-700">
            Submitted / Completed ({completedTasks.length})
          </h3>
          <div className="mt-2 space-y-2">
            {completedTasks.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No completed tasks yet.</p>
            )}
            {completedTasks.map(renderTaskCard)}
          </div>
        </div>
      </div>

      <div>
        {!selectedRequest ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">Select a task to work on</p>
              <p className="text-xs">Choose a task from your list to start work or submit completion.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="h-4 w-4" /> Task Details
                <FiamoStatusBadge status={selectedRequest.status} />
              </CardTitle>
              <CardDescription>{selectedRequest.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-bold">{selectedRequest.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-bold">{selectedRequest.location}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Requested by</p>
                  <p className="font-bold">{selectedRequest.requestedByName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Worker Type</p>
                  <p className="font-bold">{selectedRequest.assignedWorkerTypeName || 'N/A'}</p>
                </div>
              </div>

              {selectedRequest.status === 'Assigned' && (
                <Button
                  onClick={() => startWork(selectedRequest)}
                  className="w-full font-black uppercase tracking-widest text-[10px]"
                >
                  <PlayCircle className="mr-2 h-4 w-4" /> Start Work
                </Button>
              )}

              {selectedRequest.status === 'InProgress' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Completion Notes</label>
                    <Textarea
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      rows={3}
                      placeholder="Describe what was done..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Evidence of Action Taken (select from system types)
                    </label>
                    <EvidenceSelector evidenceTypes={allowedEvidenceTypes} value={evidence} onChange={setEvidence} />
                    {myWorkerType?.requiredEvidenceTypeIds?.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic">
                        Your worker type has no required evidence types configured.
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => submitCompletion(selectedRequest)}
                    disabled={isSubmitting}
                    className="w-full font-black uppercase tracking-widest text-[10px]"
                    variant="default"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Submit Completion for Approval
                  </Button>
                </div>
              )}

              {selectedRequest.status === 'Completed' && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-green-700">Submitted for approval. Awaiting Unit Coordinator.</p>
                  {selectedRequest.completionNotes && (
                    <p className="text-xs text-muted-foreground">{selectedRequest.completionNotes}</p>
                  )}
                  {selectedRequest.evidenceSubmitted?.map((ev, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/20 text-xs">
                      <span className="font-semibold">{ev.evidenceTypeLabel}</span>
                      {ev.fileUrl && (
                        <a href={ev.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
