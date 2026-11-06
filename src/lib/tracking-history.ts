import type { TrackingHistoryEntry } from '@/lib/types';

type TrackingHistoryEntryInput = Omit<TrackingHistoryEntry, 'createdAt'> & {
  createdAt?: TrackingHistoryEntry['createdAt'];
};

export function createTrackingHistoryEntry(entry: TrackingHistoryEntryInput): TrackingHistoryEntry {
  return {
    ...(entry.id !== undefined && { id: entry.id }),
    ...(entry.action !== undefined && { action: entry.action }),
    ...(entry.status !== undefined && { status: entry.status }),
    ...(entry.fromStatus !== undefined && { fromStatus: entry.fromStatus }),
    ...(entry.toStatus !== undefined && { toStatus: entry.toStatus }),
    ...(entry.remarks !== undefined && { remarks: entry.remarks }),
    ...(entry.actorId !== undefined && { actorId: entry.actorId }),
    ...(entry.actorName !== undefined && { actorName: entry.actorName }),
    ...(entry.actorRole !== undefined && { actorRole: entry.actorRole }),
    ...(entry.processOwner !== undefined && { processOwner: entry.processOwner }),
    ...(entry.unitId !== undefined && { unitId: entry.unitId }),
    createdAt: entry.createdAt ?? new Date(),
  };
}
