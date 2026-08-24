'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from '@/firebase/firestore-wrapper';
import type { ProcedureManual, Unit, ProcedureRevisionRequest, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  Search,
  BookOpen,
  Building,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Hash,
  Calendar,
  Layers,
  Info,
  ListChecks,
  FilePlus,
  Inbox,
  History,
  Edit,
  ExternalLink,
  PlusCircle,
  School,
  CheckCircle,
  Settings,
  ShieldCheck,
  Bookmark,
  FileText,
  CalendarCheck,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProcedureRevisionDialog } from '@/components/manuals/procedure-revision-dialog';
import { ProcedureRevisionReviewDialog } from '@/components/manuals/procedure-revision-review-dialog';
import { ProcedureManualProcessSlider } from '@/components/manuals/procedure-manual-process-slider';
import { renderToStaticMarkup } from 'react-dom/server';
import { Printer } from 'lucide-react';
import {
  ProcedureManualsPrintTemplate,
  type ProcedureManualReportRow,
} from '@/components/manuals/procedure-manuals-print-template';

const SHARED_ACADEMIC_ID = 'academic-shared';

const statusColors: Record<string, string> = {
  Submitted: 'bg-blue-100 text-blue-700',
  'Returned for Revision': 'bg-amber-100 text-amber-700',
  Rejected: 'bg-rose-100 text-rose-700',
  'Awaiting Presidential Approval': 'bg-indigo-100 text-indigo-700',
  'Approved & Registered': 'bg-emerald-100 text-emerald-700',
};

export default function ProcedureManualsPage() {
  const { userProfile, isAdmin, userRole, isUserLoading, isSupervisor } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get('tab') || 'view';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Revisions Modal state
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ProcedureRevisionRequest | null>(null);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [isInboxLoaded, setIsInboxLoaded] = useState(false);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const manualsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'procedureManuals') : null),
    [firestore],
  );
  const { data: manuals, isLoading: isLoadingManuals } = useCollection<ProcedureManual>(manualsQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);
  const campusMap = useMemo(() => new Map(campuses?.map((c) => [c.id, c.name])), [campuses]);

  const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
  const { data: signatories } = useDoc<{ qaoDirector?: string; qmsHead?: string }>(signatoryRef);

  const handlePrintManualsInventory = () => {
    if (!allUnits) return;

    const manualMap = new Map((manuals || []).map((m) => [m.id, m]));

    const rows: ProcedureManualReportRow[] = allUnits
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((unit) => {
        const manual = manualMap.get(unit.id);
        const hasData = Boolean(manual && (manual.procedureNumber || manual.manualTitle || manual.googleDriveLink));

        return {
          unitId: unit.id,
          unitName: unit.name,
          procedureNumber: manual?.procedureNumber || '',
          manualTitle: manual?.manualTitle || '',
          numberOfProcesses:
            manual?.numberOfProcesses !== undefined && manual?.numberOfProcesses !== 0 ? manual.numberOfProcesses : '',
          revisionNumber: manual?.revisionNumber ? `Rev ${manual.revisionNumber}` : '',
          revisionDate: manual?.revisionDate || manual?.dateImplemented || '',
          pageCount: manual?.pageCount !== undefined && manual?.pageCount !== 0 ? manual.pageCount : '',
          status: manual?.status || (hasData ? 'Updated' : 'Not Submitted'),
          copiedFromUnitName: manual?.copiedFromUnitName,
          hasData,
        };
      });

    const reportHtml = renderToStaticMarkup(
      <ProcedureManualsPrintTemplate
        rows={rows}
        qaoDirector={signatories?.qaoDirector || 'Director, Quality Assurance Office'}
        qmsHead={signatories?.qmsHead || 'Head, Quality Management System Unit'}
      />,
    );

    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Unit Procedure Manuals Inventory - RSU Quality Assurance</title>
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
              <style>
                @page { 
                  size: 13in 8.5in landscape !important; 
                  margin: 0.4in !important; 
                }
                @media print { 
                  body { background: white; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
                  .no-print { display: none !important; } 
                } 
                body { font-family: serif; background: #f9fafb; padding: 24px; color: black; font-size: 9.5pt; }
              </style>
            </head>
            <body>
              <div class="no-print mb-6 flex justify-center">
                <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg shadow-xl font-black uppercase text-xs tracking-widest transition-all cursor-pointer">
                  Click to Print Procedure Manuals Inventory
                </button>
              </div>
              <div id="print-content">
                ${reportHtml}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Print error:', err);
    }
  };

  // Query revision requests for active unit
  const revisionRequestsQuery = useMemoFirebase(
    () =>
      firestore && selectedUnitId
        ? query(collection(firestore, 'procedureRevisionRequests'), where('unitId', '==', selectedUnitId))
        : null,
    [firestore, selectedUnitId],
  );
  const { data: unitRequests, isLoading: isLoadingUnitRequests } =
    useCollection<ProcedureRevisionRequest>(revisionRequestsQuery);

  const sortedUnitRequests = useMemo(() => {
    if (!unitRequests) return [];
    return [...unitRequests].sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || new Date(a.createdAt).getTime();
      const dateB = b.createdAt?.toMillis?.() || new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [unitRequests]);

  // Query all revision requests for admin inbox
  const allRevisionRequestsQuery = useMemoFirebase(
    () => (firestore && isAdmin && isInboxLoaded ? collection(firestore, 'procedureRevisionRequests') : null),
    [firestore, isAdmin, isInboxLoaded],
  );
  const { data: allRequests, isLoading: isLoadingAllRequests } =
    useCollection<ProcedureRevisionRequest>(allRevisionRequestsQuery);

  const sortedAllRequests = useMemo(() => {
    if (!allRequests) return [];
    return [...allRequests].sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || new Date(a.createdAt).getTime();
      const dateB = b.createdAt?.toMillis?.() || new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [allRequests]);

  const myUnit = useMemo(() => {
    return allUnits?.find((u) => u.id === userProfile?.unitId) || null;
  }, [allUnits, userProfile]);

  const isAcademicUser = useMemo(() => {
    return myUnit?.category === 'Academic';
  }, [myUnit]);

  const isViewingOwnUnit = useMemo(() => {
    if (!userProfile || !selectedUnitId) return false;
    if (selectedUnitId === SHARED_ACADEMIC_ID) {
      return isAcademicUser;
    }
    return selectedUnitId === userProfile.unitId;
  }, [userProfile, selectedUnitId, isAcademicUser]);

  const sidebarItems = useMemo(() => {
    if (!allUnits || !userProfile || isUserLoading) return [];

    let filtered = allUnits.filter((u) => u.category !== 'Academic');

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((u) => u.name.toLowerCase().includes(lower));
    }

    const items = filtered.map((u) => ({
      id: u.id,
      name: u.name,
      isShared: false,
      isOwnUnit: u.id === userProfile.unitId,
    }));

    const hasAcademic = allUnits.some((u) => u.category === 'Academic');
    if (hasAcademic) {
      const matchesSearch =
        !searchTerm ||
        'academic units (shared manual)'.toLowerCase().includes(searchTerm.toLowerCase()) ||
        'academic'.includes(searchTerm.toLowerCase());

      if (matchesSearch) {
        items.unshift({
          id: SHARED_ACADEMIC_ID,
          name: 'Academic Units (Shared Manual)',
          isShared: true,
          isOwnUnit: isAcademicUser,
        });
      }
    }

    return items.sort((a, b) => (a.isShared ? -1 : b.isShared ? 1 : a.name.localeCompare(b.name)));
  }, [allUnits, userProfile, isAcademicUser, isUserLoading, searchTerm]);

  useEffect(() => {
    if (userProfile && !selectedUnitId && !isUserLoading && allUnits && allUnits.length > 0) {
      const unit = allUnits.find((u) => u.id === userProfile.unitId);
      if (unit?.category === 'Academic') {
        setSelectedUnitId(SHARED_ACADEMIC_ID);
      } else if (userProfile.unitId && allUnits.some((u) => u.id === userProfile.unitId)) {
        setSelectedUnitId(userProfile.unitId);
      } else if (allUnits.some((u) => u.category === 'Academic')) {
        setSelectedUnitId(SHARED_ACADEMIC_ID);
      } else {
        setSelectedUnitId(allUnits[0]?.id || null);
      }
    }
  }, [userProfile, allUnits, selectedUnitId, isUserLoading]);

  const selectedUnit = useMemo(() => {
    if (selectedUnitId === SHARED_ACADEMIC_ID) {
      return {
        id: SHARED_ACADEMIC_ID,
        name: 'Academic Units (Shared Manual)',
        category: 'Academic' as const,
        isShared: true,
      };
    }
    return allUnits?.find((u) => u.id === selectedUnitId) || null;
  }, [allUnits, selectedUnitId]);

  const selectedManual = useMemo(() => {
    return manuals?.find((m) => m.id === selectedUnitId) || null;
  }, [manuals, selectedUnitId]);

  const canApplyRevision = useMemo(() => {
    if (!userProfile) return false;
    if (isAdmin) return true;
    if (userRole !== 'Unit Coordinator' && userRole !== 'Unit ODIMO') return false;
    if (!selectedUnit) return false;

    if (selectedUnitId === userProfile.unitId) return true;
    if (selectedUnitId === SHARED_ACADEMIC_ID) {
      const myUnitObj = allUnits?.find((u) => u.id === userProfile.unitId);
      return myUnitObj?.category === 'Academic';
    }
    return false;
  }, [userProfile, isAdmin, userRole, selectedUnit, selectedUnitId, allUnits]);

  const previewUrl = selectedManual?.googleDriveLink
    ? selectedManual.googleDriveLink.replace('/view', '/preview').replace('?usp=sharing', '')
    : '';

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
      {/* Header tab switcher */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
              Procedure Manuals Hub
            </h2>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
              Access official operating procedures and apply for revisions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 font-black uppercase text-[10px] tracking-widest bg-white dark:bg-slate-900 border-primary/30 text-primary hover:bg-primary/5 shadow-sm"
              onClick={handlePrintManualsInventory}
              disabled={isLoadingUnits || isLoadingManuals || !allUnits}
            >
              <Printer className="mr-2 h-4 w-4 text-primary" />
              Print Procedure Manuals
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 font-black uppercase text-[10px] tracking-widest bg-white dark:bg-slate-900 border-primary/30 text-primary hover:bg-primary/5 shadow-sm"
                onClick={() => router.push('/settings?tab=procedure-manuals')}
              >
                <Settings className="mr-2 h-4 w-4 text-primary" />
                Update Manual Settings
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            >
              {isSidebarVisible ? (
                <PanelLeftClose className="mr-2 h-4 w-4" />
              ) : (
                <PanelLeftOpen className="mr-2 h-4 w-4" />
              )}
              {isSidebarVisible ? 'Hide Index' : 'Show Index'}
            </Button>
          </div>
        </div>

        <ScrollArea className="w-full">
          <TabsList className="bg-muted p-1 border shadow-sm w-max min-w-max h-auto grid grid-cols-2 md:inline-flex animate-tab-highlight rounded-md">
            <TabsTrigger
              onClick={() => handleTabChange('view')}
              value="view"
              className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"
            >
              <BookOpen className="h-3.5 w-3.5" /> View Manual
            </TabsTrigger>
            <TabsTrigger
              onClick={() => handleTabChange('revisions')}
              value="revisions"
              className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"
            >
              <History className="h-3.5 w-3.5" /> New and Revision Request
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                onClick={() => handleTabChange('inbox')}
                value="inbox"
                className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"
              >
                <Inbox className="h-3.5 w-3.5" /> New and Revision Inbox
              </TabsTrigger>
            )}
          </TabsList>
        </ScrollArea>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-h-0 lg:h-[calc(100dvh-16rem)]">
        {/* Sidebar Index */}
        <div
          className={cn(
            'transition-all duration-300 overflow-hidden flex flex-col gap-2 shrink-0',
            isSidebarVisible ? 'w-full lg:w-1/4 opacity-100' : 'w-0 opacity-0 lg:-mr-6',
          )}
        >
          <Card className="flex flex-col h-[300px] lg:h-full shadow-sm border-primary/10">
            <CardHeader className="pb-4 bg-muted/30 border-b shrink-0">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Manual Index
              </CardTitle>
              <div className="relative pt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              {isLoadingManuals || isLoadingUnits ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="flex flex-col">
                    {sidebarItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedUnitId(item.id)}
                        className={cn(
                          'w-full text-left py-2.5 px-3.5 text-xs border-l-2 transition-all flex items-center justify-between gap-2 group',
                          selectedUnitId === item.id
                            ? item.isOwnUnit
                              ? 'bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500 font-bold shadow-inner'
                              : 'bg-primary/5 text-primary border-primary font-bold shadow-inner'
                            : item.isOwnUnit
                              ? 'border-amber-400/60 bg-amber-500/5 hover:bg-amber-500/10 text-slate-900 dark:text-slate-100 font-medium'
                              : 'border-transparent text-muted-foreground hover:bg-muted/30',
                        )}
                      >
                        <div className="flex items-center min-w-0 pr-1">
                          {item.isShared ? (
                            <Layers
                              className={cn(
                                'mr-2.5 h-3.5 w-3.5 flex-shrink-0',
                                item.isOwnUnit ? 'text-amber-600 dark:text-amber-400' : 'text-primary',
                              )}
                            />
                          ) : item.isOwnUnit ? (
                            <Building className="mr-2.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <Building className="mr-2.5 h-3.5 w-3.5 flex-shrink-0 opacity-40 group-hover:opacity-70" />
                          )}
                          <span className={cn('truncate', item.isShared && 'font-black uppercase tracking-tighter')}>
                            {item.name}
                          </span>
                        </div>
                        {item.isOwnUnit && (
                          <Badge
                            variant="outline"
                            className="text-[8px] font-black uppercase px-1.5 py-0 h-4 border-amber-400/70 bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0"
                          >
                            Your Unit
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Content Pane */}
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

          {selectedUnit ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between border-b pb-2 shrink-0 px-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-6 font-black text-[10px] uppercase max-w-full truncate',
                      isViewingOwnUnit
                        ? 'border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                        : 'border-primary/20 bg-primary/5 text-primary',
                    )}
                  >
                    Active Context: {selectedUnit.name}
                  </Badge>
                  {isViewingOwnUnit && (
                    <Badge className="h-6 font-black text-[9px] uppercase px-2 bg-amber-500 hover:bg-amber-600 text-white border-none shadow-xs flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      Your Unit Manual
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-hidden pt-4">
                <div className="h-full m-0">
                  {/* TAB 1: VIEW MANUAL */}
                  <TabsContent value="view" className="h-full m-0 animate-in fade-in duration-300">
                    <Card className="h-full flex flex-col shadow-md border-primary/10 overflow-hidden bg-white dark:bg-slate-900">
                      <CardHeader className="border-b bg-muted/10 py-3.5 px-6 space-y-3 shrink-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-sm md:text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 truncate max-w-[500px]">
                                {selectedManual?.manualTitle ||
                                  selectedManual?.unitName ||
                                  (selectedUnitId === SHARED_ACADEMIC_ID
                                    ? 'Academic Procedure Manual'
                                    : 'Procedure Manual')}
                              </CardTitle>
                              {isViewingOwnUnit && (
                                <Badge className="bg-amber-500 text-white font-black text-[9px] uppercase px-2 py-0.5 border-none shadow-xs flex items-center gap-1">
                                  <UserCheck className="h-2.5 w-2.5" />
                                  Your Unit
                                </Badge>
                              )}
                              {selectedManual?.procedureNumber && (
                                <Badge
                                  variant="outline"
                                  className="font-mono font-black text-[10px] uppercase bg-primary/5 text-primary border-primary/30"
                                >
                                  {selectedManual.procedureNumber}
                                </Badge>
                              )}
                              {selectedManual?.status && (
                                <Badge
                                  className={cn(
                                    'text-[9px] font-black uppercase px-2 py-0.5 border-none shadow-xs',
                                    selectedManual.status === 'Updated'
                                      ? 'bg-emerald-600 text-white'
                                      : selectedManual.status === 'Needs Revision'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-rose-600 text-white',
                                  )}
                                >
                                  {selectedManual.status}
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                              <span>Official Operational Reference Log</span>
                              {selectedManual?.unitName && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-700 dark:text-slate-300 font-black">
                                    {selectedManual.unitName}
                                  </span>
                                </>
                              )}
                            </CardDescription>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {selectedManual && (
                              <Badge
                                variant="secondary"
                                className="h-6 font-mono font-black text-xs px-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border"
                              >
                                Rev {selectedManual.revisionNumber || '00'}
                              </Badge>
                            )}
                            {selectedManual?.googleDriveLink && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] font-bold uppercase tracking-wider gap-1.5 bg-white dark:bg-slate-900 border-primary/20 hover:bg-primary/5 text-primary"
                                onClick={() => window.open(selectedManual.googleDriveLink, '_blank')}
                                title="Open manual in Google Drive"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Open Drive</span>
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* PROCESS SLIDER IN HEADER */}
                        {selectedManual && (
                          <ProcedureManualProcessSlider
                            processes={selectedManual.processes}
                            numberOfProcesses={selectedManual.numberOfProcesses}
                            procedureNumber={selectedManual.procedureNumber}
                            unitName={selectedManual.unitName || selectedUnit.name}
                            className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60"
                          />
                        )}
                      </CardHeader>

                      <CardContent className="flex-1 p-0 bg-slate-100 dark:bg-slate-700 relative shadow-inner">
                        {previewUrl ? (
                          <iframe
                            src={previewUrl}
                            className="absolute inset-0 h-full w-full border-none bg-white"
                            allow="autoplay"
                            title={`${selectedManual?.unitName} Manual Preview`}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground p-8">
                            <div className="text-center max-w-xs">
                              <BookOpen className="mx-auto h-16 w-16 opacity-10 mb-4" />
                              <p className="font-bold uppercase text-sm tracking-widest text-slate-400">No Selection</p>
                              <p className="text-[10px] mt-2 leading-relaxed">
                                No manual configured for this unit context yet.
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>

                      {/* COMPLETE METADATA FOOTER */}
                      {selectedManual && (
                        <CardFooter className="border-t bg-slate-50/90 dark:bg-slate-900/90 py-3 px-6 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 w-full items-center">
                            {/* 1. Revision Number */}
                            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                              <Hash className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                                  Revision
                                </p>
                                <p className="font-black text-slate-900 dark:text-slate-100 truncate">
                                  Rev {selectedManual.revisionNumber || '00'}
                                </p>
                              </div>
                            </div>

                            {/* 2. Number of Pages */}
                            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                                  Total Pages
                                </p>
                                <p className="font-black text-slate-900 dark:text-slate-100 truncate">
                                  {selectedManual.pageCount !== undefined &&
                                  selectedManual.pageCount !== null &&
                                  selectedManual.pageCount !== 0
                                    ? `${selectedManual.pageCount} ${Number(selectedManual.pageCount) === 1 ? 'Page' : 'Pages'}`
                                    : '—'}
                                </p>
                              </div>
                            </div>

                            {/* 3. Date of Revision */}
                            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                              <History className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                                  Revision Date
                                </p>
                                <p className="font-black text-slate-900 dark:text-slate-100 truncate">
                                  {selectedManual.revisionDate || selectedManual.dateImplemented || '—'}
                                </p>
                              </div>
                            </div>

                            {/* 4. Date Implemented */}
                            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                              <CalendarCheck className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                                  Implemented
                                </p>
                                <p className="font-black text-slate-900 dark:text-slate-100 truncate">
                                  {selectedManual.dateImplemented || '—'}
                                </p>
                              </div>
                            </div>

                            {/* 5. Procedure Code */}
                            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                              <Bookmark className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                                  Procedure Code
                                </p>
                                <p className="font-mono font-black text-slate-900 dark:text-slate-100 truncate">
                                  {selectedManual.procedureNumber || 'PM-RSU'}
                                </p>
                              </div>
                            </div>

                            {/* 6. Controlled Document Compliance */}
                            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-primary/5 border border-primary/20 shadow-2xs">
                              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                                  Controlled QMS
                                </p>
                                <p className="font-black text-slate-900 dark:text-slate-100 truncate flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  ISO 21001:2018
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardFooter>
                      )}
                    </Card>
                  </TabsContent>

                  {/* TAB 2: REVISIONS */}
                  <TabsContent value="revisions" className="h-full m-0 animate-in fade-in duration-300">
                    <ScrollArea className="h-full pr-4">
                      <div className="space-y-6 pb-10">
                        <div className="flex justify-between items-center bg-muted/10 border p-4 rounded-xl">
                          <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                              Apply for New or Procedure Revision Request
                            </h4>
                            <p className="text-[10px] text-muted-foreground italic">
                              Submit a signed Document Registration and Revision Form (DRRF) to register new manuals or
                              request updates.
                            </p>
                          </div>
                          {canApplyRevision && (
                            <Button
                              onClick={() => setIsRevisionOpen(true)}
                              size="sm"
                              className="font-black uppercase text-[10px] tracking-widest h-9 gap-2 shadow-lg shadow-primary/10"
                            >
                              <PlusCircle className="h-4 w-4" /> Apply for New / Revision
                            </Button>
                          )}
                        </div>

                        <Card className="shadow-sm border-primary/10 overflow-hidden">
                          <CardHeader className="bg-muted/15 border-b py-4">
                            <CardTitle className="text-xs font-black uppercase tracking-tight">
                              New & Revision Logs & History
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <Table>
                              <TableHeader className="bg-muted/20">
                                <TableRow>
                                  <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Date</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase">Control No.</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase">Type</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase">
                                    Revised Parts Count
                                  </TableHead>
                                  <TableHead className="text-[10px] font-black uppercase text-center">Status</TableHead>
                                  <TableHead className="text-right text-[10px] font-black uppercase pr-6">
                                    Action
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {isLoadingUnitRequests ? (
                                  <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center">
                                      <Loader2 className="h-6 w-6 animate-spin text-primary opacity-20 mx-auto" />
                                    </TableCell>
                                  </TableRow>
                                ) : sortedUnitRequests.length > 0 ? (
                                  sortedUnitRequests.map((req) => (
                                    <TableRow
                                      key={req.id}
                                      className="hover:bg-muted/20 transition-colors group cursor-pointer"
                                      onClick={() => setReviewRequestId(req.id)}
                                    >
                                      <TableCell className="pl-6 font-mono text-xs">
                                        {req.createdAt?.toDate ? format(req.createdAt.toDate(), 'MM/dd/yyyy') : '--'}
                                      </TableCell>
                                      <TableCell className="font-mono text-xs font-bold text-primary">
                                        {req.controlNumber || 'RSU-REV-...'}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            'text-[8px] font-black uppercase h-4 px-1.5',
                                            req.requestType === 'New'
                                              ? 'border-blue-400 bg-blue-50 text-blue-800'
                                              : 'border-purple-400 bg-purple-50 text-purple-800',
                                          )}
                                        >
                                          {req.requestType === 'New' ? 'NEW' : 'REVISION'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        {req.revisedParts.length} Parts Modified
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Badge
                                          className={cn(
                                            'text-[8px] font-black uppercase h-4 px-1.5 border-none',
                                            statusColors[req.status],
                                          )}
                                        >
                                          {req.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-1.5">
                                          {req.status === 'Returned for Revision' && canApplyRevision && (
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                              onClick={() => {
                                                setEditingRequest(req);
                                                setIsRevisionOpen(true);
                                              }}
                                              title="Edit & Resubmit"
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground"
                                            onClick={() => setReviewRequestId(req.id)}
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
                                      className="h-32 text-center text-[10px] font-bold text-muted-foreground uppercase opacity-20 italic"
                                    >
                                      No applications found.
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* TAB 3: ADMIN REVISION INBOX */}
                  {isAdmin && (
                    <TabsContent value="inbox" className="h-full m-0 animate-in fade-in duration-300">
                      <ScrollArea className="h-full pr-4">
                        <div className="space-y-6 pb-10">
                          <div className="flex items-center justify-between bg-muted/10 border p-4 rounded-xl">
                            <div className="space-y-1">
                              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                                New and Revision Review Inbox
                              </h4>
                              <p className="text-[10px] text-muted-foreground italic">
                                Review and process new manual submissions and revision applications from all units.
                              </p>
                            </div>
                            {!isInboxLoaded && (
                              <Button
                                onClick={() => setIsInboxLoaded(true)}
                                size="sm"
                                className="font-black uppercase text-[10px] tracking-widest h-9 gap-2 shadow-lg shadow-primary/10"
                              >
                                <Inbox className="h-4 w-4" /> Load Inbox
                              </Button>
                            )}
                          </div>

                          {isInboxLoaded && (
                            <Card className="shadow-md border-primary/10 overflow-hidden">
                              <CardHeader className="bg-primary/5 border-b py-4">
                                <CardTitle className="text-sm font-black uppercase tracking-tight">
                                  Manual New & Revision Applications Inbox
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-0">
                                <Table>
                                  <TableHeader className="bg-muted/30">
                                    <TableRow>
                                      <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Date</TableHead>
                                      <TableHead className="text-[10px] font-black uppercase">Unit & Campus</TableHead>
                                      <TableHead className="text-[10px] font-black uppercase">Submitter</TableHead>
                                      <TableHead className="text-[10px] font-black uppercase">Type</TableHead>
                                      <TableHead className="text-[10px] font-black uppercase">Modified Parts</TableHead>
                                      <TableHead className="text-[10px] font-black uppercase text-center">
                                        Status
                                      </TableHead>
                                      <TableHead className="text-right text-[10px] font-black uppercase pr-6">
                                        Action
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {isLoadingAllRequests ? (
                                      <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center">
                                          <Loader2 className="h-6 w-6 animate-spin text-primary opacity-20 mx-auto" />
                                        </TableCell>
                                      </TableRow>
                                    ) : sortedAllRequests.length > 0 ? (
                                      sortedAllRequests.map((req) => (
                                        <TableRow key={req.id} className="hover:bg-muted/20">
                                          <TableCell className="pl-6 py-4 font-mono text-xs">
                                            {req.createdAt?.toDate
                                              ? format(req.createdAt.toDate(), 'MM/dd/yyyy')
                                              : '--'}
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex flex-col">
                                              <span className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200">
                                                {req.unitName}
                                              </span>
                                              <span className="text-[9px] font-black text-primary/60 uppercase tracking-tighter mt-0.5 flex items-center gap-1">
                                                <School className="h-2.5 w-2.5" />
                                                {campusMap.get(req.campusId) || 'Site Context'}
                                              </span>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-xs">{req.submitterName}</TableCell>
                                          <TableCell>
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                'text-[8px] font-black uppercase h-4 px-1.5',
                                                req.requestType === 'New'
                                                  ? 'border-blue-400 bg-blue-50 text-blue-800'
                                                  : 'border-purple-400 bg-purple-50 text-purple-800',
                                              )}
                                            >
                                              {req.requestType === 'New' ? 'NEW' : 'REVISION'}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            {req.revisedParts.length} Sections
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <Badge
                                              className={cn(
                                                'text-[8px] font-black uppercase h-4',
                                                statusColors[req.status],
                                              )}
                                            >
                                              {req.status}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-right pr-6">
                                            <Button
                                              size="sm"
                                              onClick={() => setReviewRequestId(req.id)}
                                              className="h-7 text-[9px] font-black uppercase tracking-widest"
                                            >
                                              Review
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    ) : (
                                      <TableRow>
                                        <TableCell
                                          colSpan={7}
                                          className="h-32 text-center text-xs text-muted-foreground italic"
                                        >
                                          No applications pending in inbox.
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border border-dashed rounded-2xl bg-muted/5 text-muted-foreground p-12">
              <Building className="h-12 w-12 opacity-10 mb-4" />
              <h4 className="font-black text-xs uppercase tracking-[0.2em]">Procedure Manual Hub</h4>
              <p className="text-[10px] mt-2 max-w-[250px] text-center leading-relaxed">
                Select a unit from the index to access its operational manuals and revision workflows.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals & Dialogs */}
      {selectedUnit && (
        <ProcedureRevisionDialog
          isOpen={isRevisionOpen}
          onOpenChange={(open) => {
            setIsRevisionOpen(open);
            if (!open) setEditingRequest(null);
          }}
          unit={selectedUnit as any}
          request={editingRequest}
        />
      )}

      {reviewRequestId && (
        <ProcedureRevisionReviewDialog
          requestId={reviewRequestId}
          isOpen={!!reviewRequestId}
          onOpenChange={(open) => !open && setReviewRequestId(null)}
          onEditClick={(req) => {
            setEditingRequest(req);
            setIsRevisionOpen(true);
          }}
        />
      )}
    </Tabs>
  );
}
