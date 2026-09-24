'use client';

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  doc,
  addDoc,
  serverTimestamp,
  where,
  Timestamp,
  updateDoc,
  deleteDoc,
} from '@/firebase/firestore-wrapper';
import type { ManagementReview, ManagementReviewOutput, Campus, Unit, MRAgendaPart, MRAttendee } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  Users,
  FolderOpen,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Edit,
  Trash2,
  Printer,
  ShieldCheck,
  Send,
  Eye,
  RefreshCw,
  Copy,
  Check,
  Search,
  Sparkles,
  BookOpen,
  Building2,
  Video,
  MapPin,
  CheckCircle,
  ChevronRight,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDefaultIso21001Parts, DEFAULT_SUGGESTED_ATTENDEES } from './iso-21001-template';

interface CurrentYearManagementReviewProps {
  campuses: Campus[];
  units: Unit[];
  canManage: boolean;
  onSelectReviewInArchive?: (review: ManagementReview) => void;
}

const UNIVERSITY_WIDE_ID = 'university-wide';

export function CurrentYearManagementReview({
  campuses,
  units,
  canManage,
  onSelectReviewInArchive,
}: CurrentYearManagementReviewProps) {
  const firestore = useFirestore();
  const { userProfile, isAdmin } = useUser();
  const { toast } = useToast();

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Sub-tabs: 'apply' | 'previous' | 'reports'
  const [subTab, setSubTab] = useState<'apply' | 'previous' | 'reports'>('apply');

  // Query all MRs to find the current year MR and previous MRs
  const reviewsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'managementReviews'), orderBy('startDate', 'desc')) : null),
    [firestore],
  );
  const { data: allReviews, isLoading: isLoadingReviews } = useCollection<ManagementReview>(reviewsQuery);

  // Active current year MR: find one matching current year or latest one
  const currentMr = useMemo(() => {
    if (!allReviews || allReviews.length === 0) return null;
    const matchThisYear = allReviews.find((r) => {
      if (r.year && Number(r.year) === currentYear) return true;
      if (r.startDate) {
        const d = r.startDate instanceof Timestamp ? r.startDate.toDate() : new Date(r.startDate);
        return d.getFullYear() === currentYear;
      }
      return false;
    });
    return matchThisYear || allReviews[0];
  }, [allReviews, currentYear]);

  // Previous reviews for "View Previous MR" (any MR older than current or previous calendar years)
  const previousReviews = useMemo(() => {
    if (!allReviews) return [];
    if (!currentMr) return allReviews;
    return allReviews.filter((r) => r.id !== currentMr.id);
  }, [allReviews, currentMr]);

  const [selectedPrevMrId, setSelectedPrevMrId] = useState<string>('');

  // Selected previous MR
  const selectedPrevMr = useMemo(() => {
    if (selectedPrevMrId) {
      return previousReviews.find((r) => r.id === selectedPrevMrId) || previousReviews[0] || null;
    }
    return previousReviews[0] || null;
  }, [previousReviews, selectedPrevMrId]);

  // Query outputs for the selected previous MR
  const prevOutputsQuery = useMemoFirebase(
    () =>
      firestore && selectedPrevMr
        ? query(collection(firestore, 'managementReviewOutputs'), where('mrId', '==', selectedPrevMr.id))
        : null,
    [firestore, selectedPrevMr],
  );
  const { data: prevOutputs, isLoading: isLoadingPrevOutputs } =
    useCollection<ManagementReviewOutput>(prevOutputsQuery);

  // Query outputs for the current MR (for Reports tab)
  const currentOutputsQuery = useMemoFirebase(
    () =>
      firestore && currentMr
        ? query(collection(firestore, 'managementReviewOutputs'), where('mrId', '==', currentMr.id))
        : null,
    [firestore, currentMr],
  );
  const { data: currentOutputs, isLoading: isLoadingCurrentOutputs } =
    useCollection<ManagementReviewOutput>(currentOutputsQuery);

  // State for Create/Edit MR Dialog
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [isSubmittingMr, setIsSubmittingMr] = useState(false);
  const [applyForm, setApplyForm] = useState<{
    title: string;
    year: number;
    academicYear: string;
    startDate: string;
    endDate: string;
    campusId: string;
    modality: 'Face-to-Face' | 'Online' | 'Hybrid';
    venue: string;
    meetingLink: string;
    masterDriveLink: string;
    minutesLink: string;
    theme: string;
    conductNotes: string;
  }>({
    title: `CY ${currentYear} Annual EOMS Management Review`,
    year: currentYear,
    academicYear: `AY ${currentYear - 1}-${currentYear}`,
    startDate: `${currentYear}-10-15`,
    endDate: `${currentYear}-10-16`,
    campusId: UNIVERSITY_WIDE_ID,
    modality: 'Hybrid',
    venue: 'Executive Boardroom / Virtual Session',
    meetingLink: '',
    masterDriveLink: '',
    minutesLink: '',
    theme: 'Sustaining Educational Excellence & ISO 21001:2018 EOMS Compliance',
    conductNotes: '',
  });

  // State for Edit Agenda Part Dialog
  const [editingPart, setEditingPart] = useState<MRAgendaPart | null>(null);
  const [isPartDialogOpen, setIsPartDialogOpen] = useState(false);
  const [isAddingNewPart, setIsAddingNewPart] = useState(false);
  const [partForm, setPartForm] = useState<{
    title: string;
    clause: string;
    description: string;
    assignedReporters: string;
    driveFolderLink: string;
    durationMinutes: number;
    status: 'Pending' | 'Uploaded' | 'Presented';
  }>({
    title: '',
    clause: '',
    description: '',
    assignedReporters: '',
    driveFolderLink: '',
    durationMinutes: 30,
    status: 'Pending',
  });

  // State for Add/Edit Attendee Dialog
  const [isAttendeeDialogOpen, setIsAttendeeDialogOpen] = useState(false);
  const [editingAttendeeIndex, setEditingAttendeeIndex] = useState<number | null>(null);
  const [attendeeForm, setAttendeeForm] = useState<MRAttendee>({
    id: '',
    name: '',
    role: '',
    unitId: '',
    campusId: UNIVERSITY_WIDE_ID,
    email: '',
    status: 'Invited',
  });

  // Copied link toast state
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    toast({ title: 'Copied', description: 'Drive folder link copied to clipboard.' });
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Helper date formatter
  const formatDateSafe = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return isNaN(d.getTime()) ? 'N/A' : format(d, 'MMM dd, yyyy');
  };

  // Campus & Unit mapping
  const campusMap = useMemo(() => {
    const map = new Map(campuses.map((c) => [c.id, c.name]));
    map.set(UNIVERSITY_WIDE_ID, 'University-Wide (Institutional)');
    return map;
  }, [campuses]);

  const unitMap = useMemo(() => {
    return new Map(units.map((u) => [u.id, u.name]));
  }, [units]);

  // Handle open apply/create MR dialog
  const handleOpenApplyDialog = (isEdit = false) => {
    if (isEdit && currentMr) {
      const sDate = currentMr.startDate?.toDate
        ? format(currentMr.startDate.toDate(), 'yyyy-MM-dd')
        : currentMr.startDate
          ? format(new Date(currentMr.startDate), 'yyyy-MM-dd')
          : '';
      const eDate = currentMr.endDate?.toDate
        ? format(currentMr.endDate.toDate(), 'yyyy-MM-dd')
        : currentMr.endDate
          ? format(new Date(currentMr.endDate), 'yyyy-MM-dd')
          : '';

      setApplyForm({
        title: currentMr.title || '',
        year: currentMr.year || currentYear,
        academicYear: currentMr.academicYear || `AY ${currentYear - 1}-${currentYear}`,
        startDate: sDate,
        endDate: eDate,
        campusId: currentMr.campusId || UNIVERSITY_WIDE_ID,
        modality: currentMr.modality || 'Hybrid',
        venue: currentMr.venue || 'Executive Boardroom',
        meetingLink: currentMr.meetingLink || '',
        masterDriveLink: currentMr.masterDriveLink || '',
        minutesLink: currentMr.minutesLink || '',
        theme: currentMr.theme || '',
        conductNotes: currentMr.conductNotes || '',
      });
    } else {
      setApplyForm({
        title: `CY ${currentYear} Annual EOMS Management Review`,
        year: currentYear,
        academicYear: `AY ${currentYear - 1}-${currentYear}`,
        startDate: `${currentYear}-10-15`,
        endDate: `${currentYear}-10-16`,
        campusId: UNIVERSITY_WIDE_ID,
        modality: 'Hybrid',
        venue: 'Executive Boardroom / Hybrid Session',
        meetingLink: '',
        masterDriveLink: '',
        minutesLink: '',
        theme: 'Sustaining Educational Excellence & ISO 21001:2018 EOMS Compliance',
        conductNotes: '',
      });
    }
    setIsApplyDialogOpen(true);
  };

  // Submit Apply MR Form
  const handleApplyMrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setIsSubmittingMr(true);
    try {
      const dataToSave = {
        ...applyForm,
        startDate: Timestamp.fromDate(new Date(applyForm.startDate)),
        endDate: Timestamp.fromDate(new Date(applyForm.endDate)),
        minutesLink: applyForm.minutesLink || applyForm.masterDriveLink || 'https://drive.google.com',
        masterDriveLink: applyForm.masterDriveLink || '',
        status: (currentMr?.status || 'Scheduled') as any,
        updatedAt: serverTimestamp(),
      };

      if (currentMr) {
        // Update existing current MR
        await updateDoc(doc(firestore, 'managementReviews', currentMr.id), dataToSave);
        toast({ title: 'Updated', description: 'Management Review session setup updated.' });
      } else {
        // Create new MR with default ISO 21001 parts & default attendees
        const defaultParts = getDefaultIso21001Parts();
        const defaultAttendees: MRAttendee[] = DEFAULT_SUGGESTED_ATTENDEES.map((a, idx) => ({
          ...a,
          id: `att-${idx + 1}-${Date.now()}`,
          campusId: UNIVERSITY_WIDE_ID,
        }));

        await addDoc(collection(firestore, 'managementReviews'), {
          ...dataToSave,
          agendaParts: defaultParts,
          attendees: defaultAttendees,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'New Management Review session successfully scheduled.' });
      }
      setIsApplyDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to save MR session.', variant: 'destructive' });
    } finally {
      setIsSubmittingMr(false);
    }
  };

  // Load / Reset ISO 21001:2018 Default Agenda Parts
  const handleLoadDefaultIsoParts = async () => {
    if (!firestore || !currentMr) return;
    if (
      !confirm(
        'This will load all 10 ISO 21001:2018 standard agenda parts. Any custom parts will be replaced. Proceed?',
      )
    ) {
      return;
    }
    try {
      const defaultParts = getDefaultIso21001Parts();
      await updateDoc(doc(firestore, 'managementReviews', currentMr.id), {
        agendaParts: defaultParts,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'ISO 21001:2018 Agenda Loaded', description: '10 Standard Clause 9.3 input parts configured.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load ISO agenda parts.', variant: 'destructive' });
    }
  };

  // Open Edit Agenda Part
  const handleOpenEditPart = (part: MRAgendaPart) => {
    setEditingPart(part);
    setIsAddingNewPart(false);
    setPartForm({
      title: part.title,
      clause: part.clause,
      description: part.description,
      assignedReporters: part.assignedReporters,
      driveFolderLink: part.driveFolderLink || '',
      durationMinutes: part.durationMinutes || 30,
      status: part.status || 'Pending',
    });
    setIsPartDialogOpen(true);
  };

  // Open Add New Agenda Part
  const handleOpenAddPart = () => {
    setEditingPart(null);
    setIsAddingNewPart(true);
    const nextNum = (currentMr?.agendaParts?.length || 0) + 1;
    setPartForm({
      title: `Part ${nextNum}: Institutional Assessment & Review`,
      clause: 'ISO 21001:2018 Clause 9.3.2',
      description: 'Educational organization performance and operational review.',
      assignedReporters: '',
      driveFolderLink: '',
      durationMinutes: 30,
      status: 'Pending',
    });
    setIsPartDialogOpen(true);
  };

  // Save Agenda Part
  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !currentMr) return;

    try {
      const currentParts = [...(currentMr.agendaParts || [])];

      if (isAddingNewPart) {
        const newPart: MRAgendaPart = {
          id: `part-${Date.now()}`,
          partNumber: currentParts.length + 1,
          ...partForm,
        };
        currentParts.push(newPart);
      } else if (editingPart) {
        const index = currentParts.findIndex((p) => p.id === editingPart.id);
        if (index !== -1) {
          currentParts[index] = {
            ...currentParts[index],
            ...partForm,
          };
        }
      }

      await updateDoc(doc(firestore, 'managementReviews', currentMr.id), {
        agendaParts: currentParts,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'Agenda part updated successfully.' });
      setIsPartDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to update agenda part.', variant: 'destructive' });
    }
  };

  // Delete Agenda Part
  const handleDeletePart = async (partId: string) => {
    if (!firestore || !currentMr) return;
    if (!confirm('Are you sure you want to remove this agenda part?')) return;
    try {
      const updatedParts = (currentMr.agendaParts || [])
        .filter((p) => p.id !== partId)
        .map((p, idx) => ({ ...p, partNumber: idx + 1 }));
      await updateDoc(doc(firestore, 'managementReviews', currentMr.id), {
        agendaParts: updatedParts,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Removed', description: 'Agenda part deleted.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete part.', variant: 'destructive' });
    }
  };

  // Open Attendee Dialog
  const handleOpenAddAttendee = () => {
    setEditingAttendeeIndex(null);
    setAttendeeForm({
      id: `att-${Date.now()}`,
      name: '',
      role: '',
      unitId: '',
      campusId: UNIVERSITY_WIDE_ID,
      email: '',
      status: 'Invited',
    });
    setIsAttendeeDialogOpen(true);
  };

  const handleOpenEditAttendee = (attendee: MRAttendee, index: number) => {
    setEditingAttendeeIndex(index);
    setAttendeeForm({ ...attendee });
    setIsAttendeeDialogOpen(true);
  };

  const handleSaveAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !currentMr) return;

    try {
      const attendees = [...(currentMr.attendees || [])];
      if (editingAttendeeIndex !== null && editingAttendeeIndex >= 0) {
        attendees[editingAttendeeIndex] = attendeeForm;
      } else {
        attendees.push(attendeeForm);
      }

      await updateDoc(doc(firestore, 'managementReviews', currentMr.id), {
        attendees,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Saved', description: 'Attendee roster updated.' });
      setIsAttendeeDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save attendee.', variant: 'destructive' });
    }
  };

  const handleDeleteAttendee = async (index: number) => {
    if (!firestore || !currentMr) return;
    if (!confirm('Remove this attendee from the roster?')) return;
    try {
      const attendees = [...(currentMr.attendees || [])];
      attendees.splice(index, 1);
      await updateDoc(doc(firestore, 'managementReviews', currentMr.id), {
        attendees,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Removed', description: 'Attendee removed.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to remove attendee.', variant: 'destructive' });
    }
  };

  // Readiness Metrics for current MR
  const agendaParts = currentMr?.agendaParts || [];
  const totalParts = agendaParts.length;
  const partsWithDriveLink = agendaParts.filter((p) => p.driveFolderLink && p.driveFolderLink.trim().length > 5).length;
  const partsReady = agendaParts.filter((p) => p.status === 'Uploaded' || p.status === 'Presented').length;
  const driveReadinessPercentage = totalParts > 0 ? Math.round((partsWithDriveLink / totalParts) * 100) : 0;

  // Attendees summary
  const attendeesList = currentMr?.attendees || [];
  const confirmedAttendees = attendeesList.filter((a) => a.status === 'Confirmed' || a.status === 'Attended').length;

  // Previous MR Stats
  const prevStats = useMemo(() => {
    if (!prevOutputs || prevOutputs.length === 0) {
      return { total: 0, open: 0, ongoing: 0, verification: 0, closed: 0, closureRate: 0 };
    }
    const total = prevOutputs.length;
    const open = prevOutputs.filter((o) => o.status === 'Open').length;
    const ongoing = prevOutputs.filter((o) => o.status === 'On-going').length;
    const verification = prevOutputs.filter((o) => o.status === 'Submit for Closure Verification').length;
    const closed = prevOutputs.filter((o) => o.status === 'Closed').length;
    const closureRate = Math.round((closed / total) * 100);
    return { total, open, ongoing, verification, closed, closureRate };
  }, [prevOutputs]);

  // Previous decisions search filter
  const [prevSearch, setPrevSearch] = useState('');
  const [prevStatusFilter, setPrevStatusFilter] = useState<string>('all');

  const filteredPrevOutputs = useMemo(() => {
    if (!prevOutputs) return [];
    return prevOutputs.filter((output) => {
      const matchesStatus = prevStatusFilter === 'all' || output.status === prevStatusFilter;
      const matchesQuery =
        !prevSearch ||
        output.description.toLowerCase().includes(prevSearch.toLowerCase()) ||
        output.initiator.toLowerCase().includes(prevSearch.toLowerCase()) ||
        (output.lineNumber && output.lineNumber.includes(prevSearch));
      return matchesStatus && matchesQuery;
    });
  }, [prevOutputs, prevStatusFilter, prevSearch]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation for the New MR Workspace */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 shadow-sm">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 shadow-sm">
              CY {currentMr?.year || currentYear} Active Review
            </Badge>
            <Badge
              variant="outline"
              className="border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest bg-white"
            >
              ISO 21001:2018 EOMS Clause 9.3
            </Badge>
            {currentMr?.modality && (
              <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                {currentMr.modality}
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
            {currentMr?.title || `CY ${currentYear} Educational Organizations Management Review`}
          </h2>
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
            <span>{currentMr?.theme || 'Fulfilling ISO 21001:2018 Clause 9.3 Management Review Requirements'}</span>
            {currentMr?.startDate && (
              <>
                <span className="opacity-40">•</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatDateSafe(currentMr.startDate)}{' '}
                  {currentMr.endDate ? `– ${formatDateSafe(currentMr.endDate)}` : ''}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentMr?.masterDriveLink && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3.5 text-xs font-bold bg-white border-primary/30 text-primary hover:bg-primary/5 shadow-sm gap-2"
              asChild
            >
              <a href={currentMr.masterDriveLink} target="_blank" rel="noopener noreferrer">
                <FolderOpen className="h-4 w-4 text-primary" />
                <span>Master Drive Folder</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </Button>
          )}

          {canManage && (
            <Button
              onClick={() => handleOpenApplyDialog(Boolean(currentMr))}
              size="sm"
              className="h-9 px-4 font-black uppercase text-[10px] tracking-widest shadow-md shadow-primary/20 gap-2"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {currentMr ? 'Configure Session' : 'Apply / Plan New MR'}
            </Button>
          )}
        </div>
      </div>

      {/* Sub-Tabs: 1. Apply A New MR | 2. View Previous MR | 3. Reports */}
      <Tabs value={subTab} onValueChange={(val: any) => setSubTab(val)} className="space-y-6">
        <div className="border-b pb-1">
          <TabsList className="bg-muted/60 p-1 border grid grid-cols-3 max-w-xl h-11">
            <TabsTrigger value="apply" className="text-xs font-black uppercase tracking-wider gap-2">
              <Calendar className="h-4 w-4" /> 1. Apply A New MR
            </TabsTrigger>
            <TabsTrigger value="previous" className="text-xs font-black uppercase tracking-wider gap-2">
              <BookOpen className="h-4 w-4" /> 2. View Previous MR
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs font-black uppercase tracking-wider gap-2">
              <FileText className="h-4 w-4" /> 3. Reports
            </TabsTrigger>
          </TabsList>
        </div>

        {/* -------------------------------------------------------------------------- */}
        {/* SUB-TAB 1: APPLY A NEW MR (Session Scheduling, Attendees, Agenda & Drive Links) */}
        {/* -------------------------------------------------------------------------- */}
        <TabsContent value="apply" className="space-y-6 animate-in fade-in duration-300">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-primary/10 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-primary" /> Session Status
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-slate-800 dark:text-slate-100">
                    {currentMr?.status || 'Scheduled'}
                  </span>
                  <Badge className="bg-emerald-500 text-white text-[9px] font-black uppercase">Active Cycle</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-blue-500" /> Invited Attendees
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-slate-800 dark:text-slate-100">
                    {attendeesList.length} Person(s)
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">{confirmedAttendees} Confirmed</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <FolderOpen className="h-3 w-3 text-amber-500" /> Drive Folders Uploaded
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-slate-800 dark:text-slate-100">
                    {partsWithDriveLink} / {totalParts} Parts
                  </span>
                  <span className="text-[10px] font-black text-primary">{driveReadinessPercentage}%</span>
                </div>
                <Progress value={driveReadinessPercentage} className="h-1.5 mt-2" />
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" /> ISO 21001:2018 Inputs
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-slate-800 dark:text-slate-100">
                    {totalParts} Clause Parts
                  </span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-700 bg-emerald-50 text-[8px] font-black"
                  >
                    Clause 9.3 Complete
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Logistics & Scope Summary Card */}
          <Card className="border-primary/15 shadow-sm">
            <CardHeader className="py-4 border-b bg-muted/10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wide">
                  Management Review Logistics & Venue
                </CardTitle>
                <CardDescription className="text-xs">
                  Modality, venue details, and master Drive repository for the current year.
                </CardDescription>
              </div>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenApplyDialog(true)}
                  className="h-8 text-xs font-bold gap-1.5"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit Details
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Venue / Room
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {currentMr?.venue || 'Executive Boardroom'}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  Scope: {campusMap.get(currentMr?.campusId || UNIVERSITY_WIDE_ID)}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-blue-500" /> Modality & Meeting Link
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {currentMr?.modality || 'Face-to-Face'}
                  </Badge>
                  {currentMr?.meetingLink ? (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs font-bold text-primary" asChild>
                      <a href={currentMr.meetingLink} target="_blank" rel="noopener noreferrer">
                        Join Virtual Session <ExternalLink className="h-2.5 w-2.5 ml-1 inline" />
                      </a>
                    </Button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">No virtual link set</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5 text-amber-500" /> Master Drive Folder
                </span>
                {currentMr?.masterDriveLink ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold gap-1" asChild>
                      <a href={currentMr.masterDriveLink} target="_blank" rel="noopener noreferrer">
                        <FolderOpen className="h-3 w-3 text-amber-500" /> Open Folder
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px]"
                      onClick={() => handleCopyLink(currentMr.masterDriveLink!)}
                    >
                      {copiedLink === currentMr.masterDriveLink ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">Master folder link not yet provided</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ISO 21001:2018 Management Review Parts & Assigned Reporters (Clause 9.3.2 Inputs) */}
          <Card className="border-primary/15 shadow-sm">
            <CardHeader className="py-4 border-b bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-black uppercase tracking-wide">
                    ISO 21001:2018 Conduct Agenda Parts & Assigned Reporters
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Each part maps directly to ISO 21001:2018 Clause 9.3.2 mandatory review inputs with dedicated Google
                  Drive folder links for presentations and evidence.
                </CardDescription>
              </div>

              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] font-bold uppercase tracking-wider"
                    onClick={handleLoadDefaultIsoParts}
                    title="Reset or initialize all 10 standard ISO 21001:2018 Clause 9.3 agenda parts"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Load ISO 21001 Template
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-[10px] font-bold uppercase tracking-wider shadow-sm"
                    onClick={handleOpenAddPart}
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add Custom Part
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[50px] text-center text-[10px] font-black uppercase">Part</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Agenda Item & ISO 21001 Clause</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Assigned Reporter(s) / Office</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Google Drive Folder Link</TableHead>
                    <TableHead className="w-[80px] text-center text-[10px] font-black uppercase">Time</TableHead>
                    <TableHead className="w-[100px] text-center text-[10px] font-black uppercase">Status</TableHead>
                    {canManage && (
                      <TableHead className="w-[80px] text-right text-[10px] font-black uppercase pr-4">
                        Action
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agendaParts.map((part) => (
                    <TableRow key={part.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-center font-black text-xs text-primary">#{part.partNumber}</TableCell>
                      <TableCell className="py-3 max-w-sm">
                        <div className="space-y-1">
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{part.title}</p>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-[8px] font-black uppercase border-primary/30 text-primary bg-primary/5"
                            >
                              {part.clause}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">{part.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {part.assignedReporters || 'Unassigned'}
                          </p>
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase">
                            Designated Presenter
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {part.driveFolderLink ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-[10px] font-bold bg-white border-primary/20 text-primary hover:bg-primary/5 gap-1.5"
                              asChild
                            >
                              <a href={part.driveFolderLink} target="_blank" rel="noopener noreferrer">
                                <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                                <span>Open Folder</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => handleCopyLink(part.driveFolderLink!)}
                              title="Copy Drive folder link"
                            >
                              {copiedLink === part.driveFolderLink ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 italic font-medium flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Pending link
                            </span>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[9px] font-black uppercase text-primary underline"
                                onClick={() => handleOpenEditPart(part)}
                              >
                                Set Link
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs text-muted-foreground">
                        {part.durationMinutes ? `${part.durationMinutes}m` : '30m'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            'text-[8px] font-black uppercase border-none px-2 shadow-sm',
                            part.status === 'Presented'
                              ? 'bg-emerald-600 text-white'
                              : part.status === 'Uploaded'
                                ? 'bg-blue-600 text-white'
                                : 'bg-amber-100 text-amber-900 border border-amber-300',
                          )}
                        >
                          {part.status || 'Pending'}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:bg-primary/5"
                              onClick={() => handleOpenEditPart(part)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeletePart(part.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {agendaParts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 7 : 6} className="h-32 text-center text-muted-foreground">
                        <div className="space-y-2">
                          <ShieldCheck className="h-8 w-8 mx-auto opacity-30 text-primary" />
                          <p className="text-xs font-bold uppercase">No agenda parts configured yet</p>
                          {canManage && (
                            <Button size="sm" onClick={handleLoadDefaultIsoParts} className="h-8 text-xs font-bold">
                              Load ISO 21001:2018 Standard Agenda Parts
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Attendees / Delegation Table ("Who Will Join") */}
          <Card className="border-primary/15 shadow-sm">
            <CardHeader className="py-4 border-b bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-black uppercase tracking-wide">
                    Attendees & Stakeholder Delegations ("Who Will Join")
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Official roster of Top Management, Vice Presidents, Deans, Quality Management Representatives, and
                  Learner Beneficiary delegates.
                </CardDescription>
              </div>

              {canManage && (
                <Button
                  size="sm"
                  className="h-8 text-[10px] font-bold uppercase tracking-wider"
                  onClick={handleOpenAddAttendee}
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add Attendee
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[40px] text-center text-[10px] font-black uppercase">#</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Name / Designee</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">
                      Institutional Role / Stakeholder Group
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Campus / Unit</TableHead>
                    <TableHead className="w-[120px] text-center text-[10px] font-black uppercase">Status</TableHead>
                    {canManage && (
                      <TableHead className="w-[80px] text-right text-[10px] font-black uppercase pr-4">
                        Action
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendeesList.map((attendee, idx) => (
                    <TableRow key={attendee.id || idx} className="hover:bg-muted/20">
                      <TableCell className="text-center font-bold text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {attendee.name}
                        {attendee.email && (
                          <span className="block text-[10px] font-normal text-muted-foreground">{attendee.email}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {attendee.role}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {campusMap.get(attendee.campusId || UNIVERSITY_WIDE_ID)}
                        {attendee.unitId && ` • ${unitMap.get(attendee.unitId) || attendee.unitId}`}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            'text-[9px] font-black uppercase border-none px-2 shadow-sm',
                            attendee.status === 'Attended'
                              ? 'bg-emerald-600 text-white'
                              : attendee.status === 'Confirmed'
                                ? 'bg-blue-600 text-white'
                                : attendee.status === 'Excused'
                                  ? 'bg-slate-400 text-white'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300',
                          )}
                        >
                          {attendee.status}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:bg-primary/5"
                              onClick={() => handleOpenEditAttendee(attendee, idx)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteAttendee(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {attendeesList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 6 : 5} className="h-24 text-center text-muted-foreground">
                        <p className="text-xs">No attendees added to the roster yet.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------------------------------- */}
        {/* SUB-TAB 2: VIEW PREVIOUS MR (ISO 21001:2018 Clause 9.3.2.a Action Status) */}
        {/* -------------------------------------------------------------------------- */}
        <TabsContent value="previous" className="space-y-6 animate-in fade-in duration-300">
          <Card className="border-primary/15 shadow-sm">
            <CardHeader className="py-4 border-b bg-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-primary/30 text-primary text-[9px] font-black uppercase bg-primary/5"
                  >
                    ISO 21001:2018 Clause 9.3.2.a
                  </Badge>
                  <CardTitle className="text-sm font-black uppercase tracking-wide">
                    Status of Actions from Previous Management Reviews
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Mandatory EOMS review of past decisions, CAR follow-ups, and closure verifications from previous
                  review cycles.
                </CardDescription>
              </div>

              {/* Review Selector */}
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold uppercase shrink-0">Previous Session:</Label>
                <Select value={selectedPrevMr?.id || ''} onValueChange={(val) => setSelectedPrevMrId(val)}>
                  <SelectTrigger className="w-[280px] bg-white text-xs font-bold">
                    <SelectValue placeholder="Select Previous MR Session" />
                  </SelectTrigger>
                  <SelectContent>
                    {previousReviews.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title} ({r.year || 'Archive'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {selectedPrevMr ? (
                <>
                  {/* Previous MR Header & Resolution Scorecard */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2 p-4 rounded-xl border bg-muted/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Selected Review Details
                        </span>
                        {selectedPrevMr.minutesLink && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] font-bold text-primary gap-1"
                            asChild
                          >
                            <a href={selectedPrevMr.minutesLink} target="_blank" rel="noopener noreferrer">
                              Minutes <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">{selectedPrevMr.title}</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Conducted: {formatDateSafe(selectedPrevMr.startDate)} • Scope:{' '}
                        {campusMap.get(selectedPrevMr.campusId)}
                      </p>
                      {onSelectReviewInArchive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] font-black uppercase text-primary border-primary/20 hover:bg-primary/5 mt-1"
                          onClick={() => onSelectReviewInArchive(selectedPrevMr)}
                        >
                          Open in Meeting Log Archive
                        </Button>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                        Closure Rate
                      </span>
                      <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300">
                        {prevStats.closureRate}%
                      </div>
                      <Progress value={prevStats.closureRate} className="h-1.5" />
                      <span className="text-[9px] text-muted-foreground font-semibold">
                        {prevStats.closed} of {prevStats.total} closed
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                        Ongoing / In Progress
                      </span>
                      <div className="text-2xl font-black text-amber-800 dark:text-amber-300">{prevStats.ongoing}</div>
                      <span className="text-[9px] text-muted-foreground font-semibold">Under execution</span>
                    </div>

                    <div className="p-4 rounded-xl border bg-rose-500/5 border-rose-500/20 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">
                        Open / Unresolved
                      </span>
                      <div className="text-2xl font-black text-rose-800 dark:text-rose-300">{prevStats.open}</div>
                      <span className="text-[9px] text-muted-foreground font-semibold">
                        Requires top management follow-up
                      </span>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                      <Input
                        placeholder="Search decisions, line #, or initiator..."
                        value={prevSearch}
                        onChange={(e) => setPrevSearch(e.target.value)}
                        className="pl-9 h-9 text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Label className="text-xs font-bold uppercase shrink-0 text-muted-foreground">Status:</Label>
                      <Select value={prevStatusFilter} onValueChange={setPrevStatusFilter}>
                        <SelectTrigger className="h-9 w-44 text-xs font-bold bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Lifecycle Statuses</SelectItem>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="On-going">On-going</SelectItem>
                          <SelectItem value="Submit for Closure Verification">Submit for Verification</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Previous Outputs Table */}
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="w-[50px] text-center text-[10px] font-black uppercase">Line</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">
                            Decision Statement & Initiator
                          </TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Assigned Unit(s) Concerned</TableHead>
                          <TableHead className="w-[120px] text-center text-[10px] font-black uppercase">
                            Follow-up Date
                          </TableHead>
                          <TableHead className="w-[140px] text-center text-[10px] font-black uppercase">
                            Lifecycle Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingPrevOutputs ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-40" />
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPrevOutputs.map((output, idx) => (
                            <TableRow key={output.id} className="hover:bg-muted/20">
                              <TableCell className="text-center font-mono text-xs text-primary font-bold">
                                {output.lineNumber ? `#${output.lineNumber}` : `${idx + 1}`}
                              </TableCell>
                              <TableCell className="py-3 max-w-md">
                                <div className="space-y-1">
                                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                    {output.description}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span className="font-bold">Initiator:</span> {output.initiator}
                                    {output.actionPlan && (
                                      <>
                                        <span>•</span>
                                        <span className="italic line-clamp-1">Plan: {output.actionPlan}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {(output.assignments || []).map((a, i) => (
                                    <Badge key={i} variant="secondary" className="text-[8px] uppercase">
                                      {campusMap.get(a.campusId)} • {unitMap.get(a.unitId) || a.unitId}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-semibold text-xs text-slate-700 dark:text-slate-300">
                                {formatDateSafe(output.followUpDate)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  className={cn(
                                    'text-[9px] font-black uppercase border-none px-2 shadow-sm',
                                    output.status === 'Open'
                                      ? 'bg-rose-600 text-white'
                                      : output.status === 'On-going'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : output.status === 'Submit for Closure Verification'
                                          ? 'bg-blue-600 text-white animate-pulse'
                                          : 'bg-emerald-600 text-white',
                                  )}
                                >
                                  {output.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                        {!isLoadingPrevOutputs && filteredPrevOutputs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                              <p className="text-xs">No recorded actionable decisions found for this filter.</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="text-center py-16 space-y-2 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto opacity-30 text-primary" />
                  <p className="text-xs font-bold uppercase">No previous management review sessions recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------------------------------- */}
        {/* SUB-TAB 3: REPORTS (ISO 21001:2018 EOMS Compliance, Drive Directory, Roster) */}
        {/* -------------------------------------------------------------------------- */}
        <TabsContent value="reports" className="space-y-6 animate-in fade-in duration-300">
          {/* Action Bar for Reports */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/10">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Management Review Official Reports
              </h3>
              <p className="text-xs text-muted-foreground">
                Documented evidence retained under ISO 21001:2018 Clause 9.3.3 ready for Governing Board and Auditor
                inspection.
              </p>
            </div>
            <Button
              onClick={() => window.print()}
              size="sm"
              className="h-9 px-4 font-black uppercase text-[10px] tracking-widest shadow-md gap-2"
            >
              <Printer className="h-4 w-4" /> Print / Export Official Report
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Report 1: ISO 21001:2018 Clause 9.3.2 Inputs Readiness Matrix */}
            <Card className="border-primary/15 shadow-sm">
              <CardHeader className="py-4 border-b bg-muted/10">
                <CardTitle className="text-xs font-black uppercase tracking-wide flex items-center justify-between">
                  <span>1. ISO 21001:2018 Clause 9.3.2 Input Audit</span>
                  <Badge variant="outline" className="text-[8px] font-black border-primary/30 text-primary">
                    Audit Matrix
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Verification that all mandatory inputs have assigned presenters and evidence repositories.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-[9px] font-black uppercase">Part # & Clause</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">Input Topic</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-center">Reporter</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-center">Drive Evidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agendaParts.map((part) => (
                      <TableRow key={part.id}>
                        <TableCell className="font-mono text-xs text-primary font-bold">
                          #{part.partNumber}
                          <span className="block text-[8px] text-muted-foreground">{part.clause}</span>
                        </TableCell>
                        <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {part.title}
                        </TableCell>
                        <TableCell className="text-center">
                          {part.assignedReporters ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {part.driveFolderLink ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-rose-500 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Report 2: Google Drive Presentation & Evidence Repository Directory */}
            <Card className="border-primary/15 shadow-sm">
              <CardHeader className="py-4 border-b bg-muted/10">
                <CardTitle className="text-xs font-black uppercase tracking-wide flex items-center justify-between">
                  <span>2. Master Google Drive Directory</span>
                  <Badge
                    variant="outline"
                    className="text-[8px] font-black border-amber-500/40 text-amber-700 bg-amber-50"
                  >
                    Drive Registry
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Consolidated directory of all cloud repositories linked to each agenda segment.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[380px]">
                  <Table>
                    <TableHeader className="bg-muted/30 sticky top-0">
                      <TableRow>
                        <TableHead className="text-[9px] font-black uppercase">Part</TableHead>
                        <TableHead className="text-[9px] font-black uppercase">Agenda Section</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-right pr-4">Drive Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentMr?.masterDriveLink && (
                        <TableRow className="bg-primary/5">
                          <TableCell className="font-black text-xs text-primary">Master</TableCell>
                          <TableCell className="font-bold text-xs text-primary">
                            Master Management Review Archive
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <Button variant="outline" size="sm" className="h-7 text-[9px] font-bold gap-1" asChild>
                              <a href={currentMr.masterDriveLink} target="_blank" rel="noopener noreferrer">
                                <FolderOpen className="h-3 w-3 text-amber-500" /> Open Folder
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                      {agendaParts.map((part) => (
                        <TableRow key={part.id}>
                          <TableCell className="font-black text-xs text-primary">#{part.partNumber}</TableCell>
                          <TableCell className="font-bold text-xs max-w-[200px] truncate">{part.title}</TableCell>
                          <TableCell className="text-right pr-4">
                            {part.driveFolderLink ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px] font-bold text-primary gap-1"
                                asChild
                              >
                                <a href={part.driveFolderLink} target="_blank" rel="noopener noreferrer">
                                  <FolderOpen className="h-3 w-3 text-amber-500" /> Drive Folder
                                </a>
                              </Button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">Not set</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Report 3: Current Session Outputs & Actionable Decisions Registry */}
          <Card className="border-primary/15 shadow-sm">
            <CardHeader className="py-4 border-b bg-muted/10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-wide">
                  3. Recorded Outputs & Strategic Decisions (Clause 9.3.3)
                </CardTitle>
                <CardDescription className="text-xs">
                  Decisions and action plans logged during the CY {currentMr?.year || currentYear} Management Review.
                </CardDescription>
              </div>
              <Badge className="bg-primary text-white text-[9px] font-black uppercase">
                {currentOutputs?.length || 0} Decisions Logged
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[50px] text-center text-[10px] font-black uppercase">Line</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Decision Statement</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Responsible Party</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Target Follow-up</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right pr-4">Initial Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingCurrentOutputs ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-40" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentOutputs?.map((out, idx) => (
                      <TableRow key={out.id}>
                        <TableCell className="text-center font-mono text-xs text-primary font-bold">
                          {out.lineNumber ? `#${out.lineNumber}` : `${idx + 1}`}
                        </TableCell>
                        <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {out.description}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{out.initiator}</TableCell>
                        <TableCell className="text-xs font-semibold">{formatDateSafe(out.followUpDate)}</TableCell>
                        <TableCell className="text-right pr-4">
                          <Badge className="text-[8px] font-black uppercase border-none">{out.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {(!currentOutputs || currentOutputs.length === 0) && !isLoadingCurrentOutputs && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-xs">
                        No actionable decisions logged yet for this review. Log outputs in the "Meeting Log Archive"
                        tab.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* -------------------------------------------------------------------------- */}
      {/* DIALOG: APPLY / CONFIGURE MANAGEMENT REVIEW SESSION                         */}
      {/* -------------------------------------------------------------------------- */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Calendar className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {currentMr ? 'Configure Existing Review' : 'Register New Review'}
              </span>
            </div>
            <DialogTitle>Management Review Session Setup</DialogTitle>
            <DialogDescription>
              Configure the schedule, modality, venue, and master Drive repository under ISO 21001:2018.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplyMrSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Session Title</Label>
              <Input
                value={applyForm.title}
                onChange={(e) => setApplyForm({ ...applyForm, title: e.target.value })}
                required
                className="font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Calendar Year</Label>
                <Input
                  type="number"
                  value={applyForm.year}
                  onChange={(e) => setApplyForm({ ...applyForm, year: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Academic Year</Label>
                <Input
                  value={applyForm.academicYear}
                  onChange={(e) => setApplyForm({ ...applyForm, academicYear: e.target.value })}
                  placeholder="e.g. AY 2025-2026"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Start Date</Label>
                <Input
                  type="date"
                  value={applyForm.startDate}
                  onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">End Date</Label>
                <Input
                  type="date"
                  value={applyForm.endDate}
                  onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Modality</Label>
                <Select
                  value={applyForm.modality}
                  onValueChange={(val: any) => setApplyForm({ ...applyForm, modality: val })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Face-to-Face">Face-to-Face</SelectItem>
                    <SelectItem value="Online">Online / Virtual</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Scope</Label>
                <Select
                  value={applyForm.campusId}
                  onValueChange={(val) => setApplyForm({ ...applyForm, campusId: val })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNIVERSITY_WIDE_ID} className="font-bold text-primary">
                      University-Wide (Institutional)
                    </SelectItem>
                    {campuses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Venue / Physical Location</Label>
              <Input
                value={applyForm.venue}
                onChange={(e) => setApplyForm({ ...applyForm, venue: e.target.value })}
                placeholder="e.g. Executive Boardroom, Admin Building"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Meeting Link (Zoom / Google Meet)</Label>
              <Input
                value={applyForm.meetingLink}
                onChange={(e) => setApplyForm({ ...applyForm, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/... or Zoom link"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Master Google Drive Folder Link</Label>
              <Input
                value={applyForm.masterDriveLink}
                onChange={(e) => setApplyForm({ ...applyForm, masterDriveLink: e.target.value })}
                placeholder="https://drive.google.com/drive/folders/..."
              />
              <span className="text-[10px] text-muted-foreground">
                Central cloud folder where meeting presentations, working sheets, and annexes are organized.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Theme / Main Directive</Label>
              <Input
                value={applyForm.theme}
                onChange={(e) => setApplyForm({ ...applyForm, theme: e.target.value })}
                placeholder="Strategic focus for this review cycle"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsApplyDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingMr} className="min-w-[140px] font-black uppercase text-xs">
                {isSubmittingMr ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {currentMr ? 'Update Session' : 'Register Review'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------------- */}
      {/* DIALOG: EDIT / ADD AGENDA PART                                             */}
      {/* -------------------------------------------------------------------------- */}
      <Dialog open={isPartDialogOpen} onOpenChange={setIsPartDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isAddingNewPart ? 'New Agenda Part' : 'Edit Agenda Part'}
              </span>
            </div>
            <DialogTitle>{isAddingNewPart ? 'Add Agenda Part' : 'Edit Agenda Part'}</DialogTitle>
            <DialogDescription>
              Assign the reporting office/person and set the dedicated Google Drive folder link.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePart} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Part Title</Label>
              <Input
                value={partForm.title}
                onChange={(e) => setPartForm({ ...partForm, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">ISO 21001:2018 Clause Citation</Label>
              <Input
                value={partForm.clause}
                onChange={(e) => setPartForm({ ...partForm, clause: e.target.value })}
                placeholder="e.g. ISO 21001:2018 Clause 9.3.2.c.1"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Assigned Reporter(s) / Presenting Office</Label>
              <Input
                value={partForm.assignedReporters}
                onChange={(e) => setPartForm({ ...partForm, assignedReporters: e.target.value })}
                placeholder="e.g. VP Academic Affairs / QA Director"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Google Drive Folder Link for this Part</Label>
              <Input
                value={partForm.driveFolderLink}
                onChange={(e) => setPartForm({ ...partForm, driveFolderLink: e.target.value })}
                placeholder="https://drive.google.com/drive/folders/..."
              />
              <span className="text-[10px] text-muted-foreground">
                Specific folder where reporters upload presentation slides, reports, and evidence.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Allocated Time (Mins)</Label>
                <Input
                  type="number"
                  value={partForm.durationMinutes}
                  onChange={(e) => setPartForm({ ...partForm, durationMinutes: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Status</Label>
                <Select value={partForm.status} onValueChange={(val: any) => setPartForm({ ...partForm, status: val })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending Upload</SelectItem>
                    <SelectItem value="Uploaded">Uploaded / Ready</SelectItem>
                    <SelectItem value="Presented">Presented</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Description / Scope Notes</Label>
              <Textarea
                rows={3}
                value={partForm.description}
                onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsPartDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="font-black uppercase text-xs">
                Save Agenda Part
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------------- */}
      {/* DIALOG: ADD / EDIT ATTENDEE                                                */}
      {/* -------------------------------------------------------------------------- */}
      <Dialog open={isAttendeeDialogOpen} onOpenChange={setIsAttendeeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Users className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {editingAttendeeIndex !== null ? 'Edit Attendee' : 'Add Attendee'}
              </span>
            </div>
            <DialogTitle>{editingAttendeeIndex !== null ? 'Edit Attendee' : 'Add Attendee'}</DialogTitle>
            <DialogDescription>Register a participant for the Management Review session.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAttendee} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Name / Designee</Label>
              <Input
                value={attendeeForm.name}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, name: e.target.value })}
                placeholder="e.g. Dr. Maria Santos"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Institutional Role / Stakeholder Title</Label>
              <Input
                value={attendeeForm.role}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, role: e.target.value })}
                placeholder="e.g. Vice President for Academic Affairs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Email Address (Optional)</Label>
              <Input
                type="email"
                value={attendeeForm.email || ''}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, email: e.target.value })}
                placeholder="maria.santos@institution.edu"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Campus Scope</Label>
              <Select
                value={attendeeForm.campusId || UNIVERSITY_WIDE_ID}
                onValueChange={(val) => setAttendeeForm({ ...attendeeForm, campusId: val })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNIVERSITY_WIDE_ID}>University-Wide (Institutional)</SelectItem>
                  {campuses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Attendance Status</Label>
              <Select
                value={attendeeForm.status}
                onValueChange={(val: any) => setAttendeeForm({ ...attendeeForm, status: val })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Invited">Invited</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Attended">Attended</SelectItem>
                  <SelectItem value="Excused">Excused</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAttendeeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="font-black uppercase text-xs">
                Save Attendee
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
