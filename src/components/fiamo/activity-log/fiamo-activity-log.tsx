'use client';

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from '@/firebase/firestore-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ScrollText, Search, Wrench, Settings2, FileCheck2 } from 'lucide-react';
import { format } from 'date-fns';
import type { FiamoActivityLog } from '@/lib/types';

const MODULE_ICONS: Record<string, typeof Wrench> = {
  RepairRequest: Wrench,
  WorkerType: Settings2,
  EvidenceType: FileCheck2,
};

export function FiamoActivityLog({ campusId }: { campusId?: string }) {
  const firestore = useFirestore();
  const [moduleFilter, setModuleFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const logsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const baseRef = collection(firestore, 'fiamoActivityLogs');
    if (campusId) return query(baseRef, where('campusId', '==', campusId));
    return query(baseRef);
  }, [firestore, campusId]);
  const { data: logs, isLoading } = useCollection<FiamoActivityLog>(logsQuery);

  const filtered = useMemo(() => {
    let list = logs || [];
    if (moduleFilter !== 'all') list = list.filter((l) => l.module === moduleFilter);
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(
        (l) =>
          l.userName?.toLowerCase().includes(t) ||
          l.description?.toLowerCase().includes(t) ||
          l.type?.toLowerCase().includes(t),
      );
    }
    return [...list].sort((a, b) => (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0)).slice(0, 100);
  }, [logs, moduleFilter, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
            <Search className="h-3 w-3" /> Search Log
          </label>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by user, action, description..."
            className="h-9 text-xs bg-white"
          />
        </div>
        <div className="w-full md:w-52 space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Module</label>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="h-9 text-xs bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="RepairRequest">Repair Requests</SelectItem>
              <SelectItem value="WorkerType">Worker Types</SelectItem>
              <SelectItem value="EvidenceType">Evidence Types</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle className="text-sm flex items-center gap-2">
            <ScrollText className="h-4 w-4" /> Immutable FIAMO Activity Log
            <Badge variant="secondary" className="text-[9px]">
              Audit Trail
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {filtered.map((log) => {
              const Icon = MODULE_ICONS[log.module] || Wrench;
              return (
                <div key={log.id} className="flex items-start gap-3 p-3 hover:bg-muted/20">
                  <div className="bg-primary/10 text-primary h-8 w-8 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{log.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {log.userName} ({log.userRole}) ·{' '}
                      {format(log.timestamp?.toDate?.() || new Date(), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase shrink-0">
                    {log.type}
                  </Badge>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center py-10 text-sm text-muted-foreground">No activity logged yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
