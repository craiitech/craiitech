'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Clock3, History } from 'lucide-react';
import type { TrackingHistoryEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface TrackingHistoryDialogProps {
  title: string;
  status?: string;
  events?: TrackingHistoryEntry[];
  createdAt?: unknown;
  submittedBy?: string;
  processOwner?: string;
  className?: string;
  size?: 'default' | 'sm';
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === 'object' && value !== null) {
    const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const seconds = timestamp.seconds ?? timestamp._seconds;
    if (typeof seconds === 'number') {
      const date = new Date(seconds * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEventStatus(event: TrackingHistoryEntry) {
  if (event.fromStatus && event.toStatus) return `${event.fromStatus} → ${event.toStatus}`;
  return event.toStatus || event.status || event.action || 'Update recorded';
}

export function TrackingHistoryDialog({
  title,
  status,
  events = [],
  createdAt,
  submittedBy,
  processOwner,
  className,
  size = 'default',
}: TrackingHistoryDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sortedEvents = useMemo(
    () =>
      events
        .map((event, index) => ({ event, index, date: toDate(event.createdAt) }))
        .sort((a, b) => {
          if (!a.date) return b.date ? -1 : a.index - b.index;
          if (!b.date) return 1;
          return a.date.getTime() - b.date.getTime();
        }),
    [events],
  );
  const hasLegacyRecord = sortedEvents.length === 0;
  const createdDate = toDate(createdAt);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          className={cn('gap-1.5', className)}
          aria-label={`View tracking history for ${title}`}
        >
          <History className="h-3.5 w-3.5" />
          Tracking / History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Tracking / History</DialogTitle>
          <DialogDescription className="truncate">{title}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock3 className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Current status</span>
          </div>
          <Badge variant="secondary">{status || 'Not recorded'}</Badge>
        </div>
        <div className="max-h-[55vh] overflow-auto">
          <div className="min-w-[700px] overflow-hidden rounded-md border">
            <div className="grid grid-cols-[1.1fr_1fr_2fr_1.2fr] gap-3 bg-slate-800 px-4 py-3 text-xs font-bold text-white">
              <span>Date / Time</span>
              <span>Status</span>
              <span>Remarks</span>
              <span>Process Owner</span>
            </div>
            {hasLegacyRecord ? (
              <div className="grid grid-cols-[1.1fr_1fr_2fr_1.2fr] gap-3 px-4 py-4 text-sm">
                <span>{createdDate ? format(createdDate, 'dd MMMM yyyy, hh:mm:ss a') : 'Date not recorded'}</span>
                <span>{status || 'Submitted'}</span>
                <span className="text-muted-foreground">
                  {submittedBy ? `Submitted by ${submittedBy}. ` : ''}
                  Detailed status history is available for activity recorded after tracking was enabled.
                </span>
                <span className="font-semibold">{processOwner || 'Not recorded'}</span>
              </div>
            ) : (
              sortedEvents.map(({ event, date }, index) => (
                <div
                  key={event.id || `${event.action || event.status || 'event'}-${index}`}
                  className={cn(
                    'grid grid-cols-[1.1fr_1fr_2fr_1.2fr] gap-3 px-4 py-4 text-sm',
                    index % 2 === 0 && 'bg-muted/40',
                  )}
                >
                  <span>{date ? format(date, 'dd MMMM yyyy, hh:mm:ss a') : 'Date not recorded'}</span>
                  <span className="font-semibold">{getEventStatus(event)}</span>
                  <span className="whitespace-pre-wrap text-muted-foreground">{event.remarks || '—'}</span>
                  <span className="font-semibold">
                    {event.actorName || event.processOwner || processOwner || 'Not recorded'}
                    {event.actorRole ? (
                      <span className="block text-xs font-normal text-muted-foreground">{event.actorRole}</span>
                    ) : null}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Older activity may not include a detailed status history if it was recorded before tracking was enabled.
        </p>
      </DialogContent>
    </Dialog>
  );
}
