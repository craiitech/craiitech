'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from '@/firebase/firestore-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FiamoStatusBadge } from '@/components/fiamo/shared/fiamo-status-badge';
import { Loader2, Eye, BarChart3, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import type { RepairRequest } from '@/lib/types';

export function RepairRequestOversight({ campusId }: { campusId?: string }) {
  const firestore = useFirestore();
  const requestsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'repairRequests') : null),
    [firestore],
  );
  const { data: requests, isLoading } = useCollection<RepairRequest>(requestsQuery);

  const stats = useMemo(() => {
    const list = requests || [];
    const campusList = campusId ? list.filter((r) => r.campusId === campusId) : list;
    const byStatus: Record<string, number> = {};
    campusList.forEach((r) => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });
    return {
      total: campusList.length,
      byStatus,
      completed: campusList.filter((r) => ['Completed', 'Filed'].includes(r.status)).length,
      pending: campusList.filter((r) => r.status === 'Submitted').length,
      inProgress: campusList.filter((r) => ['Assigned', 'InProgress'].includes(r.status)).length,
    };
  }, [requests, campusId]);

  const recent = useMemo(() => {
    const list = requests || [];
    const campusList = campusId ? list.filter((r) => r.campusId === campusId) : list;
    return [...campusList].sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0)).slice(0, 15);
  }, [requests, campusId]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-blue-700 mb-2">
        <Eye className="h-4 w-4" />
        <p className="text-xs font-black uppercase tracking-widest">Read-only Oversight View — No Approval Actions</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="p-4">
            <p className="text-2xl font-black text-blue-800">{stats.total}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-4">
            <p className="text-2xl font-black text-amber-700">{stats.pending}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="p-4">
            <p className="text-2xl font-black text-blue-700">{stats.inProgress}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="p-4">
            <p className="text-2xl font-black text-green-700">{stats.completed}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Completed/Filed</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {(['Submitted', 'Reviewed', 'Assigned', 'InProgress', 'Completed', 'Filed'] as const).map((s) => (
              <Badge key={s} variant="outline" className="px-3 py-1.5 text-xs">
                {s}: <span className="font-black ml-1">{stats.byStatus[s] || 0}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Recent Repair Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 hover:bg-muted/20">
                <div className="min-w-0">
                  <p className="text-sm font-bold line-clamp-1">{r.description}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.location} · {r.requestedByName}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {format(r.createdAt?.toDate?.() || new Date(r.createdAt), 'MMM d')}
                  </span>
                  <FiamoStatusBadge status={r.status} />
                </div>
              </div>
            ))}
            {recent.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No requests yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
