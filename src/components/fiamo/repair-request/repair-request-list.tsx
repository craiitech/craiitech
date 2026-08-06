'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from '@/firebase/firestore-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FiamoStatusBadge } from '@/components/fiamo/shared/fiamo-status-badge';
import { Loader2, MapPin, User, Wrench, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import type { RepairRequest } from '@/lib/types';

interface RepairRequestListProps {
  onSelect: (request: RepairRequest) => void;
  filterStatus?: string;
  campusId?: string;
}

export function RepairRequestList({ onSelect, filterStatus, campusId }: RepairRequestListProps) {
  const firestore = useFirestore();
  const { userProfile, isFiamoStaff, isUnitHead, isUnitCoordinator, isUnitOdimo, isAdmin } = useUser();

  const repairRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const baseRef = collection(firestore, 'repairRequests');
    const constraints = [];
    if (campusId) constraints.push(where('campusId', '==', campusId));
    return query(baseRef, ...constraints);
  }, [firestore, userProfile, campusId]);

  const { data: requests, isLoading } = useCollection<RepairRequest>(repairRequestsQuery);

  const filtered = useMemo(() => {
    if (!requests) return [];
    let list = [...requests];
    // Role-based filtering
    if (isFiamoStaff && !isAdmin) {
      list = list.filter((r) => r.assignedStaffId === userProfile?.id);
    } else if (isUnitHead && !isAdmin && !isUnitCoordinator && !isUnitOdimo) {
      list = list.filter((r) => r.requestedBy === userProfile?.id);
    }
    if (filterStatus && filterStatus !== 'all') {
      list = list.filter((r) => r.status === filterStatus);
    }
    return list.sort((a, b) => {
      const ta = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const tb = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return tb.getTime() - ta.getTime();
    });
  }, [requests, isFiamoStaff, isUnitHead, isUnitCoordinator, isUnitOdimo, isAdmin, userProfile, filterStatus]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground">
        <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm font-bold">No repair requests found</p>
        <p className="text-xs">Try adjusting your filters or check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((req) => (
        <Card key={req.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(req)}>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary h-10 w-10 rounded-lg flex items-center justify-center shrink-0">
                  <Wrench className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[9px] font-bold uppercase">
                      {req.category}
                    </Badge>
                    <FiamoStatusBadge status={req.status} />
                  </div>
                  <p className="font-bold text-sm mt-1 line-clamp-1">{req.description}</p>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {req.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {req.requestedByName}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />{' '}
                      {format(req.createdAt?.toDate?.() || new Date(req.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {req.assignedStaffName && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Assigned to: <span className="font-semibold">{req.assignedStaffName}</span>
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0">
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
