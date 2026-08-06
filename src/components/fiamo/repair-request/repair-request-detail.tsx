'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FiamoStatusBadge } from '@/components/fiamo/shared/fiamo-status-badge';
import { MapPin, User, CalendarClock, FileCheck2, X } from 'lucide-react';
import { format } from 'date-fns';
import type { RepairRequest } from '@/lib/types';

interface RepairRequestDetailProps {
  request: RepairRequest;
  onClose?: () => void;
}

type TimestampLike = { toDate?: () => Date } | Date | string | number | null | undefined;

export function RepairRequestDetail({ request, onClose }: RepairRequestDetailProps) {
  const getDate = (v: TimestampLike): Date | null => {
    if (!v) return null;
    if (typeof v === 'object' && 'toDate' in v && v.toDate) return v.toDate();
    if (typeof v === 'object') return v instanceof Date ? v : null;
    return new Date(v);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[9px] font-bold uppercase">
              {request.category}
            </Badge>
            <FiamoStatusBadge status={request.status} />
          </div>
          <h3 className="text-lg font-bold mt-2">{request.description}</h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" /> {request.location}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" /> {request.requestedByName}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          {request.createdAt?.toDate ? format(request.createdAt.toDate(), 'PP') : 'N/A'}
        </div>
        {request.assignedStaffName && (
          <div className="flex items-center gap-2 text-blue-700">
            <User className="h-4 w-4" /> Assigned: {request.assignedStaffName}
          </div>
        )}
        {request.assignedWorkerTypeName && (
          <div className="flex items-center gap-2 text-blue-700">
            <User className="h-4 w-4" /> Worker Type: {request.assignedWorkerTypeName}
          </div>
        )}
        {request.programOfWorkRef && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileCheck2 className="h-4 w-4" /> POW Ref: {request.programOfWorkRef}
          </div>
        )}
      </div>

      {request.completionNotes && (
        <Card className="bg-green-50/40 border-green-200">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-green-700 mb-1">Completion Notes</p>
            <p className="text-sm">{request.completionNotes}</p>
          </CardContent>
        </Card>
      )}

      {request.evidenceSubmitted && request.evidenceSubmitted.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCheck2 className="h-4 w-4" /> Submitted Evidence ({request.evidenceSubmitted.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {request.evidenceSubmitted.map((ev, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border bg-muted/10 text-sm">
                <div>
                  <p className="font-semibold">{ev.evidenceTypeLabel}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {ev.submittedByName || 'Staff'}{' '}
                    {ev.submittedAt ? `· ${format(new Date(ev.submittedAt), 'PP')}` : ''}
                  </p>
                </div>
                {ev.fileUrl && (
                  <a href={ev.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">
                    View Attachment
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {request.photos && request.photos.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Photos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {request.photos.map((p, i) => (
              <a key={i} href={p} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">
                Photo {i + 1}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-1 text-xs text-muted-foreground">
          <p className="text-[10px] font-black uppercase tracking-widest">Timeline</p>
          {request.reviewedAt && getDate(request.reviewedAt) && (
            <p>Reviewed: {format(getDate(request.reviewedAt)!, 'PP')}</p>
          )}
          {request.assignedAt && getDate(request.assignedAt) && (
            <p>Assigned: {format(getDate(request.assignedAt)!, 'PP')}</p>
          )}
          {request.startedAt && getDate(request.startedAt) && (
            <p>Started: {format(getDate(request.startedAt)!, 'PP')}</p>
          )}
          {request.completedAt && getDate(request.completedAt) && (
            <p>Completed: {format(getDate(request.completedAt)!, 'PP')}</p>
          )}
          {request.filedAt && getDate(request.filedAt) && <p>Filed: {format(getDate(request.filedAt)!, 'PP')}</p>}
          {request.approvedByName && <p className="text-green-700">Approved by: {request.approvedByName}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
