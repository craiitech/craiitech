'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from '@/firebase/firestore-wrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  PlusCircle,
  Inbox,
  Wrench,
  Eye,
  ScrollText,
  LayoutDashboard,
  Settings2,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';
import { RepairRequestForm } from '@/components/fiamo/repair-request/repair-request-form';
import { RepairRequestInbox } from '@/components/fiamo/repair-request/repair-request-inbox';
import { RepairRequestOversight } from '@/components/fiamo/repair-request/repair-request-oversight';
import { RepairRequestMyTasks } from '@/components/fiamo/repair-request/repair-request-my-tasks';
import { RepairRequestList } from '@/components/fiamo/repair-request/repair-request-list';
import { FiamoActivityLog } from '@/components/fiamo/activity-log/fiamo-activity-log';
import { FiamoSettingsManagement } from '@/components/fiamo/settings/fiamo-settings-management';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RepairRequestDetail } from '@/components/fiamo/repair-request/repair-request-detail';
import { FiamoStatusBadge } from '@/components/fiamo/shared/fiamo-status-badge';
import { useFiamoScope } from '@/lib/fiamo-scope';
import { format } from 'date-fns';
import type { RepairRequest, Campus } from '@/lib/types';

export default function FiamoPage() {
  const { isUnitCoordinator, isUnitOdimo, isVpaf, isFiamoStaff, can } = useUser();
  const { scopeCampusId, isMainCampusMonitor } = useFiamoScope();
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

  const defaultTab = useMemo(() => {
    if (isFiamoStaff) return 'my-tasks';
    if (isUnitCoordinator) return 'inbox';
    if (isUnitOdimo) return 'oversight';
    if (isVpaf) return 'dashboard';
    return 'requests';
  }, [isFiamoStaff, isUnitCoordinator, isUnitOdimo, isVpaf]);

  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const canSubmit = can('fiamo.repair_request.create');

  const showDashboard = can('fiamo.dashboard.view');
  const showInbox = can('fiamo.repair_request.review');
  const showOversight = can('fiamo.oversight.view');
  const showMyTasks = can('fiamo.repair_request.execute');
  const showLog = can('fiamo.activity_log.view');
  const showSettings = can('fiamo.settings.manage');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="sticky top-0 z-30 pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 space-y-4 institutional-header">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary mb-1">
                <Building2 className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Facilities, Infrastructure & Auxiliary Management Office
                </span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                FIAMO Monitoring
              </h2>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                Repair requests, maintenance plans, and facility oversight for the university.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canSubmit && (
                <Button
                  size="sm"
                  onClick={() => setIsNewRequestOpen(true)}
                  className="h-9 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> New Repair Request
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="w-full">
            <TabsList className="bg-muted p-1 border shadow-sm w-max min-w-max h-auto grid grid-cols-2 md:inline-flex animate-tab-highlight rounded-md">
              {showDashboard && (
                <TabsTrigger
                  value="dashboard"
                  className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </TabsTrigger>
              )}
              <TabsTrigger value="requests" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                <ClipboardCheck className="h-4 w-4" /> Requests
              </TabsTrigger>
              {showInbox && (
                <TabsTrigger value="inbox" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                  <Inbox className="h-4 w-4" /> Coordinator Inbox
                </TabsTrigger>
              )}
              {showOversight && (
                <TabsTrigger
                  value="oversight"
                  className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"
                >
                  <Eye className="h-4 w-4" /> Oversight
                </TabsTrigger>
              )}
              {showMyTasks && (
                <TabsTrigger
                  value="my-tasks"
                  className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"
                >
                  <Wrench className="h-4 w-4" /> My Tasks
                </TabsTrigger>
              )}
              {showLog && (
                <TabsTrigger value="log" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                  <ScrollText className="h-4 w-4" /> Activity Log
                </TabsTrigger>
              )}
              {showSettings && (
                <TabsTrigger
                  value="settings"
                  className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"
                >
                  <Settings2 className="h-4 w-4" /> Settings
                </TabsTrigger>
              )}
            </TabsList>
          </ScrollArea>
        </div>

        <div className="pt-2">
          {showDashboard && (
            <TabsContent value="dashboard" className="animate-in fade-in duration-500">
              <FiamoDashboard scopeCampusId={scopeCampusId || undefined} isMainCampusMonitor={isMainCampusMonitor} />
            </TabsContent>
          )}
          <TabsContent value="requests" className="animate-in fade-in duration-500">
            <RepairRequestList onSelect={setSelectedRequest} campusId={scopeCampusId || undefined} />
          </TabsContent>
          {showInbox && (
            <TabsContent value="inbox" className="animate-in fade-in duration-500">
              <RepairRequestInbox campusId={scopeCampusId || undefined} />
            </TabsContent>
          )}
          {showOversight && (
            <TabsContent value="oversight" className="animate-in fade-in duration-500">
              <RepairRequestOversight campusId={scopeCampusId || undefined} />
            </TabsContent>
          )}
          {showMyTasks && (
            <TabsContent value="my-tasks" className="animate-in fade-in duration-500">
              <RepairRequestMyTasks />
            </TabsContent>
          )}
          {showLog && (
            <TabsContent value="log" className="animate-in fade-in duration-500">
              <FiamoActivityLog campusId={scopeCampusId || undefined} />
            </TabsContent>
          )}
          {showSettings && (
            <TabsContent value="settings" className="animate-in fade-in duration-500">
              <FiamoSettingsManagement />
            </TabsContent>
          )}
        </div>
      </Tabs>

      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Repair Request</DialogTitle>
            <DialogDescription>Report a facility issue that needs repair by the FIAMO.</DialogDescription>
          </DialogHeader>
          <RepairRequestForm onCreated={() => setIsNewRequestOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <RepairRequestDetail request={selectedRequest} onClose={() => setSelectedRequest(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FiamoDashboard({
  scopeCampusId,
  isMainCampusMonitor,
}: {
  scopeCampusId?: string;
  isMainCampusMonitor?: boolean;
}) {
  const firestore = useFirestore();
  const { userProfile } = useUser();

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const requestsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'repairRequests') : null),
    [firestore],
  );
  const { data: requests, isLoading } = useCollection<RepairRequest>(requestsQuery);

  const stats = useMemo(() => {
    const list = requests || [];
    const myCampus = scopeCampusId ? list.filter((r) => r.campusId === scopeCampusId) : list;
    const byStatus: Record<string, number> = {};
    myCampus.forEach((r) => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });
    return {
      total: myCampus.length,
      byStatus,
      pending: myCampus.filter((r) => r.status === 'Submitted').length,
      active: myCampus.filter((r) => ['Assigned', 'InProgress', 'Reviewed'].includes(r.status)).length,
      completed: myCampus.filter((r) => ['Completed', 'Filed'].includes(r.status)).length,
    };
  }, [requests, scopeCampusId]);

  const campusBreakdown = useMemo(() => {
    if (!isMainCampusMonitor || !campuses) return null;
    const list = requests || [];
    const byCampus: { campusName: string; total: number; pending: number; active: number; completed: number }[] = [];
    campuses.forEach((c) => {
      const cList = list.filter((r) => r.campusId === c.id);
      if (cList.length === 0) return;
      byCampus.push({
        campusName: c.name,
        total: cList.length,
        pending: cList.filter((r) => r.status === 'Submitted').length,
        active: cList.filter((r) => ['Assigned', 'InProgress', 'Reviewed'].includes(r.status)).length,
        completed: cList.filter((r) => ['Completed', 'Filed'].includes(r.status)).length,
      });
    });
    return byCampus.sort((a, b) => b.total - a.total);
  }, [isMainCampusMonitor, campuses, requests]);

  const recent = useMemo(() => {
    const list = requests || [];
    const myCampus = scopeCampusId ? list.filter((r) => r.campusId === scopeCampusId) : list;
    return [...myCampus].sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0)).slice(0, 8);
  }, [requests, scopeCampusId]);

  const campusName = (campusId?: string) => campuses?.find((c) => c.id === campusId)?.name || 'Unknown Campus';

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-slate-500 mb-2">
        {isMainCampusMonitor ? (
          <span className="text-[10px] font-black uppercase tracking-widest">
            Monitoring all campuses · {userProfile?.firstName} {userProfile?.lastName}
          </span>
        ) : (
          <span className="text-[10px] font-black uppercase tracking-widest">
            Scope: {campusName(scopeCampusId)} · {userProfile?.firstName} {userProfile?.lastName}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <p className="text-3xl font-black text-primary">{stats.total}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-4">
            <p className="text-3xl font-black text-amber-700">{stats.pending}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="p-4">
            <p className="text-3xl font-black text-blue-700">{stats.active}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Active Work</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="p-4">
            <p className="text-3xl font-black text-green-700">{stats.completed}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Completed / Filed</p>
          </CardContent>
        </Card>
      </div>

      {campusBreakdown && campusBreakdown.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
              Campus Breakdown (All Campuses)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground uppercase tracking-wider text-[10px]">
                    <th className="py-2 pr-3">Campus</th>
                    <th className="py-2 pr-3">Total</th>
                    <th className="py-2 pr-3">Pending</th>
                    <th className="py-2 pr-3">Active</th>
                    <th className="py-2 pr-3">Completed/Filed</th>
                  </tr>
                </thead>
                <tbody>
                  {campusBreakdown.map((c) => (
                    <tr key={c.campusName} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-bold">{c.campusName}</td>
                      <td className="py-2 pr-3 font-black text-primary">{c.total}</td>
                      <td className="py-2 pr-3">{c.pending}</td>
                      <td className="py-2 pr-3">{c.active}</td>
                      <td className="py-2 pr-3">{c.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Status Distribution</p>
          <div className="flex flex-wrap gap-2">
            {(['Submitted', 'Reviewed', 'Assigned', 'InProgress', 'Completed', 'Filed'] as const).map((s) => (
              <Badge key={s} variant="outline" className="px-3 py-1.5 text-xs">
                {s}: <span className="font-black ml-1">{stats.byStatus[s] || 0}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 border-b bg-muted/10">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Recent Activity</p>
          </div>
          <div className="divide-y">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 hover:bg-muted/20">
                <div className="min-w-0">
                  <p className="text-sm font-bold line-clamp-1">{r.description}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {campusName(r.campusId)} · {r.location} · {r.requestedByName}
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
            {recent.length === 0 && (
              <p className="text-center py-8 text-sm text-muted-foreground">No repair requests yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
