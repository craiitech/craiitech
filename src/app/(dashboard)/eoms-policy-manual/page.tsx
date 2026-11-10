'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, getDoc, collection, query, where } from '@/firebase/firestore-wrapper';
import type { EomsPolicyManual, EomsPolicyRevisionRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  BookOpen,
  Hash,
  FileText,
  Calendar,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Info,
  BarChart3,
  Settings,
  Layers,
  ArrowUpRight,
  ExternalLink,
  History,
  Inbox,
  PlusCircle,
  Edit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { EomsManualVisualization, ISO_21001_CLAUSES } from '@/components/manuals/eoms-manual-visualization';
import { EomsRevisionRequestDialog } from '@/components/manuals/eoms-revision-request-dialog';
import { EomsRevisionDetailsDialog } from '@/components/manuals/eoms-revision-details-dialog';
import { TrackingHistoryDialog } from '@/components/common/tracking-history-dialog';

const sections = Array.from({ length: 10 }, (_, i) => ({
  id: `section-${i + 1}`,
  number: i + 1,
}));

const revisionStatusColors: Record<string, string> = {
  Submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  'Returned for Revision': 'bg-amber-100 text-amber-700 border-amber-200',
  Rejected: 'bg-rose-100 text-rose-700 border-rose-200',
  'In Revision': 'bg-purple-100 text-purple-700 border-purple-200',
  'Approved & Published': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default function EomsPolicyManualPage() {
  const { isAdmin, userProfile, userRole } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get('tab') || 'view';
  const [selectedManual, setSelectedManual] = useState<EomsPolicyManual | null>(null);
  const [manuals, setManuals] = useState<Map<string, EomsPolicyManual>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<EomsPolicyRevisionRequest | null>(null);
  const [detailsRequestId, setDetailsRequestId] = useState<string | null>(null);

  const myRequestsQuery = useMemoFirebase(
    () =>
      firestore && userProfile && currentTab === 'revisions'
        ? query(collection(firestore, 'eomsPolicyRevisionRequests'), where('requestedBy', '==', userProfile.id))
        : null,
    [firestore, userProfile, currentTab],
  );
  const { data: myRequestsData, isLoading: isLoadingMyRequests } =
    useCollection<EomsPolicyRevisionRequest>(myRequestsQuery);

  const allRequestsQuery = useMemoFirebase(
    () => (firestore && isAdmin && currentTab === 'inbox' ? collection(firestore, 'eomsPolicyRevisionRequests') : null),
    [firestore, isAdmin, currentTab],
  );
  const { data: allRequestsData, isLoading: isLoadingAllRequests } =
    useCollection<EomsPolicyRevisionRequest>(allRequestsQuery);

  const sortByNewest = (requests?: EomsPolicyRevisionRequest[] | null) => {
    if (!requests) return [];
    return [...requests].sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || new Date(a.createdAt).getTime();
      const dateB = b.createdAt?.toMillis?.() || new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  };

  const myRequests = useMemo(() => sortByNewest(myRequestsData), [myRequestsData]);
  const allRequests = useMemo(() => sortByNewest(allRequestsData), [allRequestsData]);

  const canApplyRevision = useMemo(() => {
    if (!userProfile) return false;
    if (isAdmin) return true;
    const roleLower = (userRole || '').toLowerCase();
    return !roleLower.includes('student');
  }, [userProfile, isAdmin, userRole]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const fetchManuals = async () => {
      if (!firestore) return;
      setIsLoading(true);
      try {
        const manualPromises = sections.map((section) => getDoc(doc(firestore, 'eomsPolicyManuals', section.id)));
        const manualSnapshots = await Promise.all(manualPromises);

        const fetchedManuals = manualSnapshots
          .filter((snap) => snap.exists())
          .map((snap) => snap.data() as EomsPolicyManual);

        const map = new Map<string, EomsPolicyManual>();
        fetchedManuals.forEach((m) => map.set(m.id, m));
        setManuals(map);

        if (fetchedManuals.length > 0) {
          const firstAvailable = sections.map((s) => map.get(s.id)).find(Boolean);
          if (firstAvailable) {
            setSelectedManual(firstAvailable);
          }
        }
      } catch (error) {
        console.error('EOMS Policy Manual fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchManuals();
  }, [firestore]);

  const previewUrl = selectedManual?.googleDriveLink
    ? selectedManual.googleDriveLink.replace('/view', '/preview').replace('?usp=sharing', '')
    : '';

  // Quick stats computed from manuals map
  const quickStats = useMemo(() => {
    const totalClauses = 10;
    const activeCount = Array.from(manuals.values()).filter((m) => Boolean(m.title)).length;
    let totalPages = Array.from(manuals.values()).reduce((sum, m) => sum + (Number(m.pageCount) || 0), 0);
    if (totalPages === 0) {
      totalPages = ISO_21001_CLAUSES.reduce((sum, c) => sum + c.defaultPageCount, 0);
    }
    const coveragePct = Math.round((activeCount / totalClauses) * 100);

    return {
      totalClauses,
      activeCount,
      totalPages,
      coveragePct,
    };
  }, [manuals]);

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
      {/* STICKY HEADER WITH TAB SWITCHER & KPI BADGE */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                RSU EDUCATIONAL ORGANIZATIONS MANAGEMENT SYSTEM MANUAL (ISO 21001:2018 STANDARD)
              </h2>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                Official Institutional Policy Documentation Aligned with ISO 21001:2018 Standards.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 font-black uppercase text-[10px] tracking-widest bg-white dark:bg-slate-900 border-primary/30 text-primary hover:bg-primary/5 shadow-xs"
                onClick={() => router.push('/settings?tab=eoms-policy-manual')}
              >
                <Settings className="mr-2 h-4 w-4 text-primary" />
                Update Manual Settings
              </Button>
            )}
            {canApplyRevision && (
              <Button
                size="sm"
                className="h-9 px-4 font-black uppercase text-[10px] tracking-widest shadow-xs"
                onClick={() => {
                  setEditingRequest(null);
                  setIsRevisionDialogOpen(true);
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Apply for Revision
              </Button>
            )}
            {currentTab === 'view' && (
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden h-9 px-3 text-xs"
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
              >
                {isSidebarVisible ? (
                  <PanelLeftClose className="mr-1.5 h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="mr-1.5 h-4 w-4" />
                )}
                {isSidebarVisible ? 'Hide Index' : 'Show Index'}
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <TabsList className="bg-muted p-1 border shadow-xs w-max min-w-max h-auto inline-flex rounded-lg">
            <TabsTrigger
              onClick={() => handleTabChange('view')}
              value="view"
              className="gap-2 text-[10px] font-black uppercase tracking-widest px-5 h-8"
            >
              <BookOpen className="h-3.5 w-3.5" /> View Manual
            </TabsTrigger>
            <TabsTrigger
              onClick={() => handleTabChange('revisions')}
              value="revisions"
              className="gap-2 text-[10px] font-black uppercase tracking-widest px-5 h-8"
            >
              <History className="h-3.5 w-3.5" /> Revision Requests
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                onClick={() => handleTabChange('inbox')}
                value="inbox"
                className="gap-2 text-[10px] font-black uppercase tracking-widest px-5 h-8"
              >
                <Inbox className="h-3.5 w-3.5" /> Revision Inbox
              </TabsTrigger>
            )}
            <TabsTrigger
              onClick={() => handleTabChange('visualization')}
              value="visualization"
              className="gap-2 text-[10px] font-black uppercase tracking-widest px-5 h-8 text-primary font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <BarChart3 className="h-3.5 w-3.5 text-primary" /> EOMS Manual Visualization
            </TabsTrigger>
          </TabsList>

          {/* Visualization Snapshot Button in Tabs Bar */}
          <div
            onClick={() => handleTabChange('visualization')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleTabChange('visualization');
              }
            }}
            title="Click to view full RSU EOMS Policy Manual Visualization"
            className={cn(
              'cursor-pointer group flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all shadow-xs shrink-0',
              currentTab === 'visualization'
                ? 'bg-primary/10 border-primary text-primary font-bold shadow-inner'
                : 'bg-gradient-to-r from-primary/5 via-indigo-500/5 to-emerald-500/5 hover:from-primary/10 hover:via-indigo-500/10 hover:to-emerald-500/10 border-primary/20',
            )}
          >
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                Clauses Coverage:
              </span>
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-[9px] font-mono font-black border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
              >
                {quickStats.coveragePct}% ({quickStats.activeCount}/{quickStats.totalClauses})
              </Badge>
            </div>

            <span className="text-slate-300 dark:text-slate-700 font-bold hidden sm:inline">•</span>

            <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
              <Layers className="h-3 w-3 text-indigo-500" />
              <span>{quickStats.totalPages} Pages</span>
            </div>

            <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>

            <span className="text-[9px] font-black uppercase tracking-wider text-primary group-hover:underline flex items-center gap-0.5">
              <span>View Visualization</span>
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>

      {/* TAB 1: VISUALIZATION */}
      {currentTab === 'visualization' ? (
        <TabsContent value="visualization" className="flex-1 min-h-0 m-0 animate-in fade-in duration-300 flex flex-col">
          <EomsManualVisualization
            manualsMap={manuals}
            onViewSection={(sectionId) => {
              const target = manuals.get(sectionId);
              if (target) {
                setSelectedManual(target);
              } else {
                const secNum = Number(sectionId.replace('section-', ''));
                const fallbackMeta = ISO_21001_CLAUSES.find((c) => c.sectionId === sectionId);
                setSelectedManual({
                  id: sectionId,
                  sectionNumber: secNum,
                  title: fallbackMeta?.standardTitle || `Section ${secNum}`,
                  googleDriveLink: '',
                  revisionNumber: '00',
                  pageCount: fallbackMeta?.defaultPageCount || 10,
                  executionDate: 'Approved Policy',
                  updatedAt: null,
                });
              }
              handleTabChange('view');
            }}
            isLoading={isLoading}
          />
        </TabsContent>
      ) : currentTab === 'revisions' ? (
        /* TAB: UNIT REVISION REQUESTS */
        <TabsContent value="revisions" className="m-0 animate-in fade-in duration-300">
          <div className="space-y-4 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10 border p-4 rounded-xl">
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                  Apply for EOMS Manual Revision
                </h4>
                <p className="text-[10px] text-muted-foreground italic">
                  Select the manual section and describe the context of the changes for Quality Assurance review.
                </p>
              </div>
              {canApplyRevision && (
                <Button
                  onClick={() => {
                    setEditingRequest(null);
                    setIsRevisionDialogOpen(true);
                  }}
                  size="sm"
                  className="font-black uppercase text-[10px] tracking-widest h-9 gap-2 shadow-lg shadow-primary/10"
                >
                  <PlusCircle className="h-4 w-4" /> Apply for Revision
                </Button>
              )}
            </div>

            <Card className="shadow-sm border-primary/10 overflow-hidden">
              <CardHeader className="bg-muted/15 border-b py-4">
                <CardTitle className="text-xs font-black uppercase tracking-tight">My Revision Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/20">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Date</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Control No.</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Section</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Context of Changes</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Status</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingMyRequests ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary opacity-20 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : myRequests.length > 0 ? (
                      myRequests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="pl-6 font-mono text-xs">
                            {request.createdAt?.toDate ? format(request.createdAt.toDate(), 'MM/dd/yyyy') : '--'}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {request.controlNumber || 'RSU-EOMS-REV-...'}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">
                            {request.sectionNumber}. {request.sectionTitle}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                            {request.contextOfChanges}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[8px] font-black uppercase h-4 px-1.5',
                                revisionStatusColors[request.status],
                              )}
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-1.5">
                              {request.status === 'Returned for Revision' && canApplyRevision && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => {
                                    setEditingRequest(request);
                                    setIsRevisionDialogOpen(true);
                                  }}
                                  title="Edit & Resubmit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              <TrackingHistoryDialog
                                title={`EOMS Manual Revision — ${request.controlNumber || request.sectionTitle}`}
                                status={request.status}
                                events={request.trackingHistory || []}
                                createdAt={request.createdAt}
                                submittedBy={request.requestedByName}
                                size="sm"
                                className="h-8 w-8 px-0"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                onClick={() => setDetailsRequestId(request.id)}
                                title="View details"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center text-[10px] font-bold text-muted-foreground uppercase opacity-40 italic"
                        >
                          No revision requests submitted yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      ) : currentTab === 'inbox' && isAdmin ? (
        /* TAB: ADMIN REVISION INBOX */
        <TabsContent value="inbox" className="m-0 animate-in fade-in duration-300">
          <div className="space-y-4 pb-10">
            <div className="flex items-center justify-between bg-muted/10 border p-4 rounded-xl">
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                  EOMS Manual Revision Inbox
                </h4>
                <p className="text-[10px] text-muted-foreground italic">
                  Review unit revision applications, edit the source Google Drive file, and publish approved revisions.
                </p>
              </div>
            </div>

            <Card className="shadow-md border-primary/10 overflow-hidden">
              <CardHeader className="bg-primary/5 border-b py-4">
                <CardTitle className="text-sm font-black uppercase tracking-tight">
                  Revision Applications From All Units
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Date</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Section</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Requesting Unit</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Context of Changes</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Status</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAllRequests ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary opacity-20 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : allRequests.length > 0 ? (
                      allRequests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-muted/20">
                          <TableCell className="pl-6 py-4 font-mono text-xs">
                            {request.createdAt?.toDate ? format(request.createdAt.toDate(), 'MM/dd/yyyy') : '--'}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">
                            {request.sectionNumber}. {request.sectionTitle}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200">
                                {request.unitName || 'Unassigned Unit'}
                              </span>
                              <span className="text-[9px] font-black text-primary/60 uppercase tracking-tighter mt-0.5">
                                {request.requestedByName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                            {request.contextOfChanges}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[8px] font-black uppercase h-4 px-1.5',
                                revisionStatusColors[request.status],
                              )}
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-1.5">
                              <TrackingHistoryDialog
                                title={`EOMS Manual Revision — ${request.controlNumber || request.sectionTitle}`}
                                status={request.status}
                                events={request.trackingHistory || []}
                                createdAt={request.createdAt}
                                submittedBy={request.requestedByName}
                                size="sm"
                                className="h-8 w-8 px-0"
                              />
                              <Button
                                size="sm"
                                onClick={() => router.push(`/eoms-policy-manual/revision/${request.id}`)}
                                className="h-7 text-[9px] font-black uppercase tracking-widest"
                              >
                                Review
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground italic">
                          No revision applications pending in inbox.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      ) : (
        /* TAB 2: VIEW MANUAL DUAL-PANE */
        <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100dvh-15rem)]">
          {/* Table of Contents Sidebar */}
          <div
            className={cn(
              'transition-all duration-300 overflow-hidden flex flex-col',
              isSidebarVisible ? 'w-full lg:w-1/4 opacity-100 shrink-0' : 'w-0 opacity-0 lg:-mr-6',
            )}
          >
            <Card className="flex flex-col h-[350px] lg:h-full shadow-md border-primary/10">
              <CardHeader className="bg-muted/30 border-b py-3 px-4">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Table of Contents
                </CardTitle>
                <CardDescription className="text-[10px]">Select an ISO 21001 clause section.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-2">
                <ScrollArea className="h-full">
                  <div className="space-y-1 pr-4">
                    {sections.map((section) => {
                      if (isLoading) {
                        return <Skeleton key={section.id} className="h-12 w-full mb-2" />;
                      }
                      const manual = manuals.get(section.id);
                      const fallbackMeta = ISO_21001_CLAUSES.find((c) => c.sectionId === section.id);
                      const isSelected = selectedManual?.id === section.id;

                      return (
                        <Button
                          key={section.id}
                          variant="ghost"
                          onClick={() => {
                            if (manual) {
                              setSelectedManual(manual);
                            } else if (fallbackMeta) {
                              setSelectedManual({
                                id: section.id,
                                sectionNumber: section.number,
                                title: fallbackMeta.standardTitle,
                                googleDriveLink: '',
                                revisionNumber: '00',
                                pageCount: fallbackMeta.defaultPageCount,
                                executionDate: 'Approved Policy',
                                updatedAt: null,
                              });
                            }
                          }}
                          className={cn(
                            'w-full justify-start text-left h-auto p-3 transition-all rounded-xl',
                            isSelected
                              ? 'bg-primary/10 text-primary border-primary font-bold shadow-xs'
                              : 'hover:bg-muted font-medium',
                          )}
                        >
                          <span className="opacity-60 mr-2.5 font-mono text-xs w-4">{section.number}.</span>
                          <span className="flex-1 truncate text-xs">
                            {manual?.title || fallbackMeta?.standardTitle || `Section ${section.number}`}
                          </span>
                          {!manual?.title && (
                            <Badge variant="outline" className="ml-2 text-[9px] opacity-60">
                              Draft
                            </Badge>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Document Preview & Details */}
          <div className="flex-1 min-w-0 flex flex-col relative">
            <Button
              variant="secondary"
              size="icon"
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full border shadow-md hidden lg:flex hover:bg-primary hover:text-white transition-colors"
              onClick={() => setIsSidebarVisible(!isSidebarVisible)}
              title={isSidebarVisible ? 'Hide Index' : 'Show Index'}
            >
              {isSidebarVisible ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            <Card className="h-full flex flex-col shadow-md border-primary/10 overflow-hidden">
              <CardHeader className="border-b bg-muted/10 py-3.5 px-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base font-black uppercase tracking-tight truncate">
                      {isLoading ? (
                        <Skeleton className="h-6 w-48" />
                      ) : (
                        selectedManual?.title || 'Select an ISO 21001 Section'
                      )}
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <span>Official Institutional Policy Document</span>
                      <span>•</span>
                      <span>ISO 21001:2018</span>
                    </CardDescription>
                  </div>
                  {selectedManual && (
                    <div className="flex items-center gap-2">
                      {selectedManual.googleDriveLink && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-7 px-2.5 text-[10px] font-bold border-primary/20 text-primary hover:bg-primary/5"
                        >
                          <a href={selectedManual.googleDriveLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open Cloud Link
                          </a>
                        </Button>
                      )}
                      <Badge variant="secondary" className="font-mono h-7 text-xs font-bold shadow-xs px-2.5">
                        Rev {selectedManual.revisionNumber}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-0 bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                  </div>
                ) : previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="absolute inset-0 h-full w-full border-none bg-white shadow-inner"
                    allow="autoplay"
                    title={`${selectedManual?.title} Manual Preview`}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground p-8">
                    <div className="text-center max-w-sm space-y-3">
                      <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary/40">
                        <BookOpen className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300">
                          {selectedManual ? 'Cloud Link Pending' : 'No Section Selected'}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {selectedManual
                            ? 'This policy clause is cataloged, but a verified Google Drive document preview link has not yet been attached in settings.'
                            : 'Choose a policy section from the Table of Contents or click the EOMS Manual Visualization tab.'}
                        </p>
                      </div>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push('/settings?tab=eoms-policy-manual')}
                          className="text-xs border-primary/30 text-primary font-bold"
                        >
                          <Settings className="h-3.5 w-3.5 mr-1.5" />
                          Configure in Settings
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>

              {selectedManual && (
                <CardFooter className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 text-[10px] border-t bg-card py-2.5 px-6 uppercase tracking-widest font-bold text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3 w-3 text-primary" />
                    <span>Revision: {selectedManual.revisionNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-primary" />
                    <span>Pages: {selectedManual.pageCount || 'Unspecified'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-primary" />
                    <span className="truncate">Executed: {selectedManual.executionDate || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="h-3 w-3 text-primary" />
                    <span>ISO 21001:2018 Policy</span>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      )}

      <EomsRevisionRequestDialog
        isOpen={isRevisionDialogOpen}
        onOpenChange={(open) => {
          setIsRevisionDialogOpen(open);
          if (!open) setEditingRequest(null);
        }}
        manuals={manuals}
        request={editingRequest}
      />

      <EomsRevisionDetailsDialog
        requestId={detailsRequestId}
        isOpen={!!detailsRequestId}
        onOpenChange={(open) => !open && setDetailsRequestId(null)}
        isAdmin={isAdmin}
        onEditClick={(request) => {
          setDetailsRequestId(null);
          setEditingRequest(request);
          setIsRevisionDialogOpen(true);
        }}
        onOpenWorkspace={(request) => {
          setDetailsRequestId(null);
          router.push(`/eoms-policy-manual/revision/${request.id}`);
        }}
      />
    </Tabs>
  );
}
