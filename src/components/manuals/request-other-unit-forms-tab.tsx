'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc } from '@/firebase/firestore-wrapper';
import type { Unit, UnitForm, Campus, CrossUnitFormRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Building2,
  Download,
  Share2,
  ExternalLink,
  ShieldCheck,
  Hash,
  FileText,
  FolderKanban,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  Layers,
  Filter,
  X,
  Pencil,
  AlertCircle,
  FileSpreadsheet,
  Link as LinkIcon,
  Loader2,
  Sparkles,
  School,
  Info,
  PlusCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CrossUnitFormRequestDialog } from './cross-unit-form-request-dialog';
import { EditFormDriveLinkDialog } from './edit-form-drive-link-dialog';
import { ManageUnitFormDialog } from './manage-unit-form-dialog';

interface RequestOtherUnitFormsTabProps {
  units: Unit[];
  campuses: Campus[];
  userUnitId?: string;
  isAdmin?: boolean;
}

export function RequestOtherUnitFormsTab({
  units,
  campuses,
  userUnitId,
  isAdmin = false,
}: RequestOtherUnitFormsTabProps) {
  const { userProfile, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'browse' | 'outgoing' | 'incoming'>('browse');

  // Browse state
  const [targetUnitId, setTargetUnitId] = useState<string>('');
  const [unitSearch, setUnitSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [formSearch, setFormSearch] = useState('');

  // Log search states
  const [outgoingSearch, setOutgoingSearch] = useState('');
  const [incomingSearch, setIncomingSearch] = useState('');

  // Modals state
  const [requestingForm, setRequestingForm] = useState<
    | UnitForm
    | {
        id: string;
        formCode: string;
        formName: string;
        googleDriveLink: string;
        revision?: string;
      }
    | null
  >(null);

  const [editingForm, setEditingForm] = useState<UnitForm | null>(null);
  const [formToManage, setFormToManage] = useState<UnitForm | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);

  // Determine current user unit object
  const myUnit = useMemo(() => units.find((u) => u.id === userUnitId), [units, userUnitId]);

  // Filter available other units for browsing
  const filteredUnits = useMemo(() => {
    let list = units;

    if (categoryFilter !== 'all') {
      list = list.filter((u) => u.category === categoryFilter);
    }

    if (campusFilter !== 'all') {
      list = list.filter((u) => u.campusIds?.includes(campusFilter));
    }

    if (unitSearch.trim()) {
      const lower = unitSearch.toLowerCase();
      list = list.filter(
        (u) => u.name.toLowerCase().includes(lower) || (u.category && u.category.toLowerCase().includes(lower)),
      );
    }

    // Sort: other units first, current unit marked
    return [...list].sort((a, b) => {
      if (a.id === userUnitId) return 1;
      if (b.id === userUnitId) return -1;
      return a.name.localeCompare(b.name);
    });
  }, [units, categoryFilter, campusFilter, unitSearch, userUnitId]);

  // Default target unit selection if none selected
  const effectiveTargetUnitId = useMemo(() => {
    if (targetUnitId && units.some((u) => u.id === targetUnitId)) {
      return targetUnitId;
    }
    // pick first unit that is not user's own unit, or first unit
    const firstOther = filteredUnits.find((u) => u.id !== userUnitId) || filteredUnits[0];
    return firstOther ? firstOther.id : '';
  }, [targetUnitId, units, filteredUnits, userUnitId]);

  const selectedTargetUnit = useMemo(
    () => units.find((u) => u.id === effectiveTargetUnitId) || null,
    [units, effectiveTargetUnitId],
  );

  // Query forms of the selected target unit
  const formsQuery = useMemoFirebase(
    () =>
      firestore && effectiveTargetUnitId
        ? query(collection(firestore, 'unitForms'), where('unitId', '==', effectiveTargetUnitId))
        : null,
    [firestore, effectiveTargetUnitId],
  );
  const { data: targetForms, isLoading: isLoadingForms } = useCollection<UnitForm>(formsQuery);

  // Filter forms within selected unit
  const filteredTargetForms = useMemo(() => {
    if (!targetForms) return [];
    if (!formSearch.trim()) return targetForms;
    const lower = formSearch.toLowerCase();
    return targetForms.filter(
      (f) => f.formCode.toLowerCase().includes(lower) || f.formName.toLowerCase().includes(lower),
    );
  }, [targetForms, formSearch]);

  // Query cross-unit logs
  // 1. Outgoing: Forms our unit requested
  const outgoingQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isAdmin) {
      return collection(firestore, 'crossUnitFormRequests');
    }
    if (!userUnitId) return null;
    return query(collection(firestore, 'crossUnitFormRequests'), where('requesterUnitId', '==', userUnitId));
  }, [firestore, isAdmin, userUnitId]);
  const { data: outgoingLogsRaw, isLoading: isLoadingOutgoing } = useCollection<CrossUnitFormRequest>(outgoingQuery);

  // 2. Incoming: Forms other units requested from our unit
  const incomingQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isAdmin) {
      return collection(firestore, 'crossUnitFormRequests');
    }
    if (!userUnitId) return null;
    return query(collection(firestore, 'crossUnitFormRequests'), where('ownerUnitId', '==', userUnitId));
  }, [firestore, isAdmin, userUnitId]);
  const { data: incomingLogsRaw, isLoading: isLoadingIncoming } = useCollection<CrossUnitFormRequest>(incomingQuery);

  // Sort outgoing requests by date descending
  const sortedOutgoingLogs = useMemo(() => {
    if (!outgoingLogsRaw) return [];
    return [...outgoingLogsRaw].sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
      const dateB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [outgoingLogsRaw]);

  // Filter outgoing
  const filteredOutgoingLogs = useMemo(() => {
    if (!outgoingSearch.trim()) return sortedOutgoingLogs;
    const lower = outgoingSearch.toLowerCase();
    return sortedOutgoingLogs.filter(
      (log) =>
        log.formCode?.toLowerCase().includes(lower) ||
        log.formName?.toLowerCase().includes(lower) ||
        log.ownerUnitName?.toLowerCase().includes(lower) ||
        log.requesterName?.toLowerCase().includes(lower) ||
        log.purpose?.toLowerCase().includes(lower),
    );
  }, [sortedOutgoingLogs, outgoingSearch]);

  // Sort incoming requests by date descending
  const sortedIncomingLogs = useMemo(() => {
    if (!incomingLogsRaw) return [];
    return [...incomingLogsRaw].sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
      const dateB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [incomingLogsRaw]);

  // Filter incoming
  const filteredIncomingLogs = useMemo(() => {
    if (!incomingSearch.trim()) return sortedIncomingLogs;
    const lower = incomingSearch.toLowerCase();
    return sortedIncomingLogs.filter(
      (log) =>
        log.formCode?.toLowerCase().includes(lower) ||
        log.formName?.toLowerCase().includes(lower) ||
        log.requesterUnitName?.toLowerCase().includes(lower) ||
        log.requesterName?.toLowerCase().includes(lower) ||
        log.purpose?.toLowerCase().includes(lower),
    );
  }, [sortedIncomingLogs, incomingSearch]);

  // Check if current user can manage drive links for the selected target unit
  const canManageSelectedUnit = useMemo(() => {
    if (!userProfile) return false;
    if (isAdmin) return true;
    return userProfile.unitId === selectedTargetUnit?.id;
  }, [userProfile, isAdmin, selectedTargetUnit]);

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-indigo-400">
              <Share2 className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">
                Inter-Unit Controlled Forms Exchange
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">
              Request Other Unit Forms
            </h3>
            <p className="text-xs text-indigo-200/80 leading-relaxed font-normal">
              Directly view, request, and download official quality forms from verified university units. All forms are
              pre-authorized via each unit&apos;s registered Google Drive repository and transactions are instantly
              logged for mutual audit accountability.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-500/30 font-mono text-[10px] uppercase px-3 py-1.5">
              Active Unit: {myUnit?.name || 'Authorized Personnel'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Sub navigation for Browse, Outgoing Logs, and Incoming Logs */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <TabsList className="bg-muted p-1 border shadow-xs h-auto grid grid-cols-3 sm:inline-flex rounded-lg">
            <TabsTrigger value="browse" className="gap-2 text-[10px] font-black uppercase tracking-wider px-4 py-2">
              <Search className="h-3.5 w-3.5" /> Browse & Request
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="gap-2 text-[10px] font-black uppercase tracking-wider px-4 py-2">
              <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
              Forms Requested by Us ({filteredOutgoingLogs.length})
            </TabsTrigger>
            <TabsTrigger value="incoming" className="gap-2 text-[10px] font-black uppercase tracking-wider px-4 py-2">
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
              Forms Provided by Us ({filteredIncomingLogs.length})
            </TabsTrigger>
          </TabsList>

          {isAdmin && (
            <Badge
              variant="outline"
              className="text-[9px] font-black uppercase border-indigo-200 text-indigo-700 bg-indigo-50/50 w-fit"
            >
              Admin Oversight Mode: Viewing Cross-Unit Exchanges
            </Badge>
          )}
        </div>

        {/* TAB 1: BROWSE & REQUEST OTHER UNIT FORMS */}
        <TabsContent value="browse" className="space-y-6 m-0 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Unit Selector & Filter List */}
            <Card className="lg:col-span-4 shadow-sm border-primary/10 flex flex-col h-[650px]">
              <CardHeader className="bg-muted/30 border-b pb-4 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                      University Units
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-[9px] font-black uppercase">
                    {filteredUnits.length} Units
                  </Badge>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search unit name or category..."
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-white"
                  />
                  {unitSearch && (
                    <button
                      onClick={() => setUnitSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-7 text-[10px] bg-white font-bold">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Academic">Academic</SelectItem>
                      <SelectItem value="Administrative">Administrative</SelectItem>
                      <SelectItem value="Research">Research</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={campusFilter} onValueChange={setCampusFilter}>
                    <SelectTrigger className="h-7 text-[10px] bg-white font-bold">
                      <SelectValue placeholder="Campus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campuses</SelectItem>
                      {campuses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUnits.map((unit) => {
                      const isCurrent = unit.id === userUnitId;
                      const isSelected = unit.id === effectiveTargetUnitId;
                      const hasDrive = !!unit.formsDriveLink;

                      return (
                        <button
                          key={unit.id}
                          onClick={() => setTargetUnitId(unit.id)}
                          className={cn(
                            'w-full text-left p-3.5 transition-all flex flex-col gap-1.5 border-l-4',
                            isSelected
                              ? 'bg-primary/5 border-primary shadow-xs'
                              : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                'text-xs font-bold leading-snug line-clamp-2',
                                isSelected ? 'text-primary' : 'text-slate-900 dark:text-slate-100',
                              )}
                            >
                              {unit.name}
                            </span>
                            {isCurrent && (
                              <Badge className="bg-slate-200 text-slate-700 border-none text-[8px] font-black uppercase shrink-0">
                                Your Unit
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {unit.category && (
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                {unit.category}
                              </span>
                            )}
                            <span className="text-[9px] text-muted-foreground">•</span>
                            <span className="text-[9px] text-muted-foreground flex items-center gap-1 font-mono">
                              <School className="h-2.5 w-2.5" />
                              {unit.campusIds?.[0] ? campusMap.get(unit.campusIds[0]) || 'Campus' : 'Institutional'}
                            </span>
                            {hasDrive ? (
                              <span className="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded ml-auto">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Drive Set
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded ml-auto">
                                Pending Drive
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right: Selected Unit Forms & Drive Repository Access */}
            <div className="lg:col-span-8 space-y-6">
              {selectedTargetUnit ? (
                <>
                  {/* Selected Unit Profile Card */}
                  <Card className="shadow-md border-primary/20 overflow-hidden bg-gradient-to-br from-white via-slate-50 to-indigo-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20">
                    <CardHeader className="border-b pb-4 bg-muted/10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[9px] font-black uppercase text-primary border-primary/20 bg-primary/5"
                            >
                              {selectedTargetUnit.category || 'Institutional'} Unit
                            </Badge>
                            {selectedTargetUnit.id === userUnitId && (
                              <Badge className="bg-amber-100 text-amber-800 border-none text-[8px] font-black uppercase">
                                Your Home Unit
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                            {selectedTargetUnit.name}
                          </CardTitle>
                          <CardDescription className="text-xs text-muted-foreground flex items-center gap-2">
                            <School className="h-3 w-3" />
                            {selectedTargetUnit.campusIds?.[0]
                              ? campusMap.get(selectedTargetUnit.campusIds[0])
                              : 'University Wide System'}
                          </CardDescription>
                        </div>

                        {/* Roster Folder Direct Access */}
                        <div className="flex items-center gap-2 shrink-0">
                          {selectedTargetUnit.formsDriveLink ? (
                            <Button
                              onClick={() =>
                                setRequestingForm({
                                  id: 'roster-folder',
                                  formCode: 'ROSTER-FOLDER',
                                  formName: `${selectedTargetUnit.name} - Complete Official Forms Roster`,
                                  googleDriveLink: selectedTargetUnit.formsDriveLink!,
                                  revision: selectedTargetUnit.formsDriveRevision || '00',
                                })
                              }
                              className="h-9 font-black uppercase text-[10px] tracking-widest shadow-md shadow-primary/20 gap-1.5"
                            >
                              <FolderKanban className="h-3.5 w-3.5" /> Request Roster Folder
                            </Button>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold py-1.5 px-3"
                            >
                              Drive Folder Pending Unit Setup
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {/* Drive Repository Info Bar */}
                    <CardContent className="p-4 bg-white/70 dark:bg-slate-900/70 border-b flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          <span>Roster Revision: {selectedTargetUnit.formsDriveRevision || '00'}</span>
                        </div>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Updated: {selectedTargetUnit.formsDriveUpdatedAt || 'Verified Registry'}</span>
                        </div>
                      </div>

                      {selectedTargetUnit.masterlistPdfLink && (
                        <a
                          href={selectedTargetUnit.masterlistPdfLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-primary hover:underline"
                        >
                          <FileText className="h-3 w-3" /> View Masterlist PDF
                        </a>
                      )}
                    </CardContent>
                  </Card>

                  {/* Controlled Forms Catalog */}
                  <Card className="shadow-sm border-primary/10 overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b py-3.5 px-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
                            Available Controlled Forms ({filteredTargetForms.length})
                          </CardTitle>
                          <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">
                            Select any form to download a direct copy for your unit.
                          </CardDescription>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative w-full sm:w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Filter form code or title..."
                              value={formSearch}
                              onChange={(e) => setFormSearch(e.target.value)}
                              className="pl-8 h-8 text-xs bg-white"
                            />
                            {formSearch && (
                              <button
                                onClick={() => setFormSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {canManageSelectedUnit && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setFormToManage(null);
                                setIsManageDialogOpen(true);
                              }}
                              className="h-8 text-[9px] font-black uppercase tracking-widest gap-1 shadow-sm shrink-0"
                            >
                              <PlusCircle className="h-3.5 w-3.5" /> Register Form
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Code</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Official Form Title</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-center">Rev. & Date</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-center">Drive Status</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingForms ? (
                            <TableRow>
                              <TableCell colSpan={5} className="h-40 text-center">
                                <Loader2 className="h-7 w-7 animate-spin text-primary opacity-20 mx-auto" />
                              </TableCell>
                            </TableRow>
                          ) : filteredTargetForms.length > 0 ? (
                            filteredTargetForms.map((form) => {
                              const hasDriveLink = !!form.googleDriveLink;

                              return (
                                <TableRow key={form.id} className="hover:bg-muted/15 transition-colors">
                                  <TableCell className="pl-6 font-mono text-xs font-bold text-primary">
                                    {form.formCode}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        {form.formName}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center whitespace-nowrap">
                                    <div className="flex flex-col items-center">
                                      <Badge variant="secondary" className="h-4 text-[9px] font-bold uppercase">
                                        {form.revision || '00'}
                                      </Badge>
                                      {form.revisionDate && (
                                        <span className="text-[8px] font-mono text-muted-foreground mt-0.5">
                                          {form.revisionDate}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {hasDriveLink ? (
                                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[8px] font-bold gap-1 shadow-none">
                                        <CheckCircle2 className="h-2.5 w-2.5" /> Ready
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-amber-700 bg-amber-50/50 border-amber-200 text-[8px] font-bold"
                                      >
                                        Pending Link
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right pr-6">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {hasDriveLink ? (
                                        <Button
                                          size="sm"
                                          onClick={() => setRequestingForm(form)}
                                          className="h-7 text-[9px] font-black uppercase tracking-widest gap-1"
                                        >
                                          <Download className="h-3 w-3" /> Request & Download
                                        </Button>
                                      ) : canManageSelectedUnit ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setFormToManage(form);
                                            setIsManageDialogOpen(true);
                                          }}
                                          className="h-7 text-[9px] font-black uppercase text-amber-700 border-amber-300 hover:bg-amber-50 gap-1"
                                        >
                                          <LinkIcon className="h-3 w-3" /> Set Drive Link
                                        </Button>
                                      ) : (
                                        <span className="text-[10px] text-muted-foreground italic font-semibold">
                                          Unavailable
                                        </span>
                                      )}

                                      {/* Quick edit drive link and details for owners or admins */}
                                      {canManageSelectedUnit && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => {
                                            setFormToManage(form);
                                            setIsManageDialogOpen(true);
                                          }}
                                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                                          title="Edit form code, title, revision, date, or drive link"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                <div className="flex flex-col items-center justify-center gap-1.5 opacity-40">
                                  <FileText className="h-6 w-6" />
                                  <p className="text-[11px] font-bold uppercase tracking-wider">
                                    No individual forms enrolled for this unit yet
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-2xl bg-muted/5 text-muted-foreground p-12">
                  <Building2 className="h-10 w-10 opacity-15 mb-2" />
                  <p className="text-xs font-black uppercase tracking-widest">Select a Unit to Browse</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: OUTGOING REQUESTS (FORMS REQUESTED BY US) */}
        <TabsContent value="outgoing" className="space-y-6 m-0 animate-in fade-in duration-300">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/60 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Total Forms Requested
                  </p>
                  <p className="text-2xl font-black text-blue-950 dark:text-blue-100 mt-1">
                    {sortedOutgoingLogs.length}
                  </p>
                </div>
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-700">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/60 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    Units Consulted
                  </p>
                  <p className="text-2xl font-black text-indigo-950 dark:text-indigo-100 mt-1">
                    {new Set(sortedOutgoingLogs.map((l) => l.ownerUnitId)).size}
                  </p>
                </div>
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-700">
                  <Building2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 dark:bg-slate-800/40 border-slate-200 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Latest Request Date
                  </p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-2 font-mono">
                    {sortedOutgoingLogs[0]?.downloadDate || 'No requests yet'}
                  </p>
                </div>
                <div className="p-2.5 bg-slate-200/60 dark:bg-slate-700 rounded-xl text-slate-600">
                  <Calendar className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Outgoing Log Table */}
          <Card className="shadow-sm border-primary/10 overflow-hidden">
            <CardHeader className="bg-muted/15 border-b py-3.5 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest">
                    Outgoing Inter-Unit Form Requests
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase text-muted-foreground">
                    Audit trail of all forms requested and downloaded by your unit from other university units.
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by form or unit..."
                    value={outgoingSearch}
                    onChange={(e) => setOutgoingSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-white"
                  />
                  {outgoingSearch && (
                    <button
                      onClick={() => setOutgoingSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Form Code & Title</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Owner / Provider Unit</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Requested By</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Purpose / Use</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingOutgoing ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary opacity-20 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredOutgoingLogs.length > 0 ? (
                    filteredOutgoingLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/15 transition-colors">
                        <TableCell className="pl-6 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {log.downloadDate ||
                            format(new Date(log.createdAt?.toMillis?.() || Date.now()), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-primary">{log.formCode}</span>
                            <span className="text-xs text-slate-800 dark:text-slate-200 line-clamp-1">
                              {log.formName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <Building2 className="h-3 w-3 text-primary shrink-0" />
                            <span>{log.ownerUnitName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {log.requesterName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{log.purpose}</TableCell>
                        <TableCell className="text-right pr-6 whitespace-nowrap">
                          {log.googleDriveLink ? (
                            <a
                              href={log.googleDriveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
                            >
                              <ExternalLink className="h-3 w-3" /> Re-open File
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">--</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-36 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-1 opacity-30">
                          <ArrowUpRight className="h-7 w-7" />
                          <p className="text-[10px] font-black uppercase tracking-widest">
                            No outgoing requests recorded
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: INCOMING REQUESTS (FORMS PROVIDED BY US) */}
        <TabsContent value="incoming" className="space-y-6 m-0 animate-in fade-in duration-300">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Forms Provided to Others
                  </p>
                  <p className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                    {sortedIncomingLogs.length}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-700">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-teal-50/50 dark:bg-teal-950/20 border-teal-200/60 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300">
                    Inquiring Units
                  </p>
                  <p className="text-2xl font-black text-teal-950 dark:text-teal-100 mt-1">
                    {new Set(sortedIncomingLogs.map((l) => l.requesterUnitId)).size}
                  </p>
                </div>
                <div className="p-2.5 bg-teal-100 dark:bg-teal-900/50 rounded-xl text-teal-700">
                  <Building2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 dark:bg-slate-800/40 border-slate-200 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Latest Request Received
                  </p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-2 font-mono">
                    {sortedIncomingLogs[0]?.downloadDate || 'No requests received'}
                  </p>
                </div>
                <div className="p-2.5 bg-slate-200/60 dark:bg-slate-700 rounded-xl text-slate-600">
                  <Calendar className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Incoming Log Table */}
          <Card className="shadow-sm border-primary/10 overflow-hidden">
            <CardHeader className="bg-muted/15 border-b py-3.5 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest">
                    Incoming Form Download Log (Provided Forms)
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase text-muted-foreground">
                    Log of other university units that accessed and downloaded your unit&apos;s quality forms.
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by form or requester..."
                    value={incomingSearch}
                    onChange={(e) => setIncomingSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-white"
                  />
                  {incomingSearch && (
                    <button
                      onClick={() => setIncomingSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Requesting Unit</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Requesting Personnel</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Form Code & Title</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Purpose / Remarks</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingIncoming ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary opacity-20 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredIncomingLogs.length > 0 ? (
                    filteredIncomingLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/15 transition-colors">
                        <TableCell className="pl-6 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {log.downloadDate ||
                            format(new Date(log.createdAt?.toMillis?.() || Date.now()), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <Building2 className="h-3 w-3 text-indigo-600 shrink-0" />
                            <span>{log.requesterUnitName}</span>
                          </div>
                          {log.requesterCampusName && (
                            <span className="text-[9px] font-mono text-muted-foreground pl-4.5 block">
                              {log.requesterCampusName}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {log.requesterName}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-primary">{log.formCode}</span>
                            <span className="text-xs text-slate-800 dark:text-slate-200 line-clamp-1">
                              {log.formName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{log.purpose}</TableCell>
                        <TableCell className="text-right pr-6 whitespace-nowrap">
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[8px] font-bold gap-1 shadow-none">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Fulfilled
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-36 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-1 opacity-30">
                          <ArrowDownLeft className="h-7 w-7" />
                          <p className="text-[10px] font-black uppercase tracking-widest">
                            No incoming requests recorded yet
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Request Other Unit Form Download Dialog */}
      {requestingForm && selectedTargetUnit && (
        <CrossUnitFormRequestDialog
          form={requestingForm}
          ownerUnit={selectedTargetUnit}
          campuses={campuses}
          isOpen={!!requestingForm}
          onOpenChange={(open) => !open && setRequestingForm(null)}
        />
      )}

      {/* Modal: Edit Form Drive Link Dialog */}
      {editingForm && (
        <EditFormDriveLinkDialog
          form={editingForm}
          isOpen={!!editingForm}
          onOpenChange={(open) => !open && setEditingForm(null)}
        />
      )}

      {/* Modal: Register / Edit Unit Form Dialog */}
      {isManageDialogOpen && selectedTargetUnit && (
        <ManageUnitFormDialog
          form={formToManage}
          unit={selectedTargetUnit}
          isOpen={isManageDialogOpen}
          onOpenChange={setIsManageDialogOpen}
        />
      )}
    </div>
  );
}
