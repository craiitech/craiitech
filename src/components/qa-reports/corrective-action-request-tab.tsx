'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  updateDoc,
  Timestamp,
  arrayUnion,
  orderBy,
} from '@/firebase/firestore-wrapper';
import type {
  CorrectiveActionRequest,
  Campus,
  Unit,
  Signatories,
  Comment,
  AuditFinding,
  AuditSchedule,
} from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  PlusCircle,
  Plus,
  Calendar,
  ExternalLink,
  Trash2,
  ListChecks,
  History,
  User,
  ShieldCheck,
  Hash,
  ChevronRight,
  Edit,
  Gavel,
  MessageSquare,
  Search,
  ArrowUpDown,
  ClipboardList,
  Undo2,
  Printer,
  Target,
  Filter,
  Building2,
  Activity,
  Link as LinkIcon,
  Save,
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Send,
  X,
  FileWarning,
  ArrowUpRight,
  MessageCircle,
  Info,
  School,
  Bell,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/use-notifications';
import { format } from 'date-fns';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditorNCManager } from '@/components/audit/auditor-nc-manager';
import { renderToStaticMarkup } from 'react-dom/server';
import { CARPrintTemplate } from './car-print-template';
import { CARControlRegisterTemplate } from './car-control-register-template';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CorrectiveActionRequestTabProps {
  campuses: Campus[];
  units: Unit[];
  canManage: boolean;
  auditTypeFilter?: 'IQA' | 'EQA' | 'ALL';
}

const carSchema = z.object({
  carNumber: z.string().min(1, 'CAR Number is required'),
  ncReportNumber: z.string().optional(),
  source: z.enum(['Audit Finding', 'Legal Non-compliance', 'Non-conforming Service', 'Others']),
  procedureTitle: z.string().min(1, 'Title of Procedure is required'),
  initiator: z.string().min(1, 'Initiator is required'),
  natureOfFinding: z.enum(['NC', 'OFI']),
  concerningClause: z.string().min(1, 'ISO Clause is required'),
  concerningTopManagementName: z.string().min(1, 'Top Management reference is required'),
  timeLimitForReply: z.string().min(1, 'Time limit for reply is required.'),
  unitId: z.string().optional(),
  campusId: z.string().optional(),
  unitHead: z.string().optional(),
  assignedUnits: z
    .array(
      z.object({
        id: z.string(),
        campusId: z.string().min(1, 'Campus is required'),
        unitId: z.string().min(1, 'Responsible unit is required'),
        unitName: z.string().optional(),
        unitHead: z.string().min(1, 'Head of Unit is required'),
      }),
    )
    .min(1, 'Add at least one target campus and unit.'),
  descriptionOfNonconformance: z.string().min(1, 'Description is required'),
  requestDate: z.string().min(1, 'Request date is required'),
  preparedBy: z.string().min(1, 'Prepared by is required'),
  approvedBy: z.string().min(1, 'Approved by is required'),
  rootCauseAnalysis: z.string().optional().or(z.literal('')),
  adminFeedback: z.string().optional().or(z.literal('')),
  actionSteps: z
    .array(
      z.object({
        description: z.string().min(1, 'Description is required'),
        type: z.enum(['Immediate Correction', 'Long-term Corrective Action']),
        completionDate: z.string().min(1, 'Date is required'),
        status: z.enum(['Pending', 'Completed']),
        evidenceLink: z.string().url('Invalid URL').optional().or(z.literal('')),
        verificationStatus: z.enum(['Accepted', 'Not Accepted', 'Pending']).optional(),
      }),
    )
    .optional(),
  followUpLogs: z
    .array(
      z.object({
        result: z.string().min(1, 'Result is required'),
        verifiedBy: z.string().min(1, 'Required'),
        date: z.string().min(1, 'Required'),
        remarks: z.string().optional().or(z.literal('')),
      }),
    )
    .optional(),
  effectivenessAudits: z
    .array(
      z.object({
        result: z.string().min(1, 'Effectiveness result is required'),
        verifiedBy: z.string().min(1, 'Required'),
        date: z.string().min(1, 'Required'),
        action: z.enum([
          'Effective',
          'Not Effective',
          'Close the NC',
          'Continue Monitoring the NC',
          'Provide More Actions to Address the NC',
        ]),
        remarks: z.string().optional().or(z.literal('')),
      }),
    )
    .optional(),
  status: z.enum(['Open', 'In Progress', 'Awaiting Response/Update', 'For Final Verification', 'Closed']),
  findingId: z.string().optional(),
});

const genCarId = () => Math.random().toString(36).substr(2, 9);

/**
 * Returns the next sequential CAR number for the given year and prefix.
 * Scans existing CARs to find the highest sequence number already used,
 * then returns prefix-YYYY-NNN where NNN = highest + 1 (minimum 001).
 */
function getNextCarNumber(
  rawCars: CorrectiveActionRequest[] | null | undefined,
  yr: number,
  prefix: 'CAR' | 'EQA-CAR',
): string {
  const pattern = new RegExp(`^${prefix}-${yr}-(\\d+)$`);
  let highest = 0;
  (rawCars || []).forEach((car) => {
    const match = car.carNumber?.match(pattern);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > highest) highest = seq;
    }
  });
  const next = String(highest + 1).padStart(3, '0');
  return `${prefix}-${yr}-${next}`;
}

export function CorrectiveActionRequestTab({
  campuses,
  units,
  canManage,
  auditTypeFilter = 'ALL',
}: CorrectiveActionRequestTabProps) {
  const { userProfile, isAdmin, userRole, isAuditor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { triggerLocalNotification } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Prevents the URL-param effect from double-firing for the same param value
  const lastConsumedParamKey = useRef<string>('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<CorrectiveActionRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [notifyingCarId, setNotifyingCarId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IQA' | 'EQA'>('IQA');

  // When a specific audit type is enforced by the parent (e.g. the EQA tab), use it;
  // otherwise fall back to the in-page IQA/EQA/All toggle.
  const effectiveTypeFilter: 'IQA' | 'EQA' | 'ALL' = auditTypeFilter !== 'ALL' ? auditTypeFilter : typeFilter;

  const handleNotifyCar = async (car: CorrectiveActionRequest) => {
    if (!firestore) return;
    setNotifyingCarId(car.id);
    try {
      const unitName = unitMap.get(car.unitId) || car.unitId || 'Accountable Unit';
      const campusName = campusMap.get(car.campusId) || car.campusId || 'Campus';
      const formattedRecipient = `${unitName} (${campusName})`;
      const deadlineStr = car.timeLimitForReply?.toDate
        ? format(car.timeLimitForReply.toDate(), 'MMM dd, yyyy')
        : car.timeLimitForReply || 'N/A';
      const senderName = userProfile
        ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.email
        : 'QA Administrator';

      const carRef = doc(firestore, 'correctiveActionRequests', car.id);
      await updateDoc(carRef, {
        lastNotifiedAt: serverTimestamp(),
        lastNotifiedBy: senderName,
      });

      triggerLocalNotification(
        `[CAR Notice] CAR ${car.carNumber} — ${car.procedureTitle || 'Non-conformance Notice'}`,
        {
          body: `Corrective action notice sent to: ${formattedRecipient}. Reply deadline: ${deadlineStr}.`,
          category: 'car',
          link: '/qa-reports?tab=car',
        },
      );

      toast({
        title: 'Accountable Unit Notified!',
        description: `On-device notification and toast dispatched to ${formattedRecipient} for CAR ${car.carNumber}. Direct link provided to access CAR Registry (/qa-reports?tab=car).`,
      });
    } catch (err: any) {
      console.error('Error notifying accountable unit for CAR:', err);
      toast({
        title: 'Notification Failed',
        description: err?.message || 'Could not send notification to accountable unit.',
        variant: 'destructive',
      });
    } finally {
      setNotifyingCarId(null);
    }
  };

  const isInstitutionalViewer =
    isAdmin ||
    isAuditor ||
    userRole?.toLowerCase().includes('president') ||
    userRole?.toLowerCase().includes('quality management') ||
    userRole?.toLowerCase().includes('qms');

  const carQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'correctiveActionRequests'), orderBy('createdAt', 'desc')) : null),
    [firestore],
  );
  const { data: rawCars, isLoading: isLoadingCars } = useCollection<CorrectiveActionRequest>(carQuery);

  const findingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditFindings') : null), [firestore]);
  const { data: findings } = useCollection<AuditFinding>(findingsQuery);

  const schedulesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'auditSchedules') : null),
    [firestore],
  );
  const { data: schedules } = useCollection<AuditSchedule>(schedulesQuery);

  const liveCar = useMemo(() => {
    if (!editingCar || !rawCars) return editingCar;
    return rawCars.find((c) => c.id === editingCar.id) || editingCar;
  }, [editingCar, rawCars]);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);
  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);

  const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
  const { data: currentSignatories } = useDoc<Signatories>(signatoryRef);

  // ── URL-param consumer: fires when data is ready ──
  useEffect(() => {
    if (!rawCars || !findings || !schedules) return;

    const action = searchParams.get('action');
    const findingId = searchParams.get('findingId');
    const carId = searchParams.get('id');

    // Build a signature for the current relevant params
    const paramKey = carId ? `id:${carId}` : action === 'new' && findingId ? `new:${findingId}` : '';

    // Nothing to consume, or already consumed this exact param set
    if (!paramKey || lastConsumedParamKey.current === paramKey) return;
    lastConsumedParamKey.current = paramKey;

    // ── MANAGE: open an existing CAR's Modify dialog ──
    if (carId) {
      const targetCar = rawCars.find((c) => c.id === carId);
      if (targetCar) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('id');
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        setTimeout(() => {
          const safeDate = (d: any) =>
            d?.toDate ? format(d.toDate(), 'yyyy-MM-dd') : d ? format(new Date(d), 'yyyy-MM-dd') : '';
          setEditingCar(targetCar);
          const assignedUnits = (targetCar.assignedUnits || []).map((a) => ({
            id: a.id,
            campusId: a.campusId,
            unitId: a.unitId,
            unitName: a.unitName || '',
            unitHead: a.unitHead || '',
          }));
          const defaultActiveIndex = Math.max(
            0,
            assignedUnits.findIndex((a) => a.unitId === userProfile?.unitId),
          );
          setActiveUnitIndex(defaultActiveIndex);
          const active = targetCar.assignedUnits?.[defaultActiveIndex];
          form.reset({
            ...targetCar,
            unitId: active?.unitId || targetCar.unitId || '',
            campusId: active?.campusId || targetCar.campusId || '',
            unitHead: active?.unitHead || targetCar.unitHead || '',
            assignedUnits:
              assignedUnits.length > 0
                ? assignedUnits
                : [
                    {
                      id: genCarId(),
                      campusId: targetCar.campusId || '',
                      unitId: targetCar.unitId || '',
                      unitName: unitMap.get(targetCar.unitId || '') || '',
                      unitHead: targetCar.unitHead || '',
                    },
                  ],
            adminFeedback: '',
            requestDate: safeDate(targetCar.requestDate),
            timeLimitForReply: safeDate(targetCar.timeLimitForReply),
            rootCauseAnalysis: active?.rootCauseAnalysis || targetCar.rootCauseAnalysis || '',
            actionSteps: (active?.actionSteps || targetCar.actionSteps || []).map((s) => ({
              ...s,
              completionDate: safeDate(s.completionDate),
              evidenceLink: s.evidenceLink || '',
              verificationStatus: s.verificationStatus || 'Pending',
            })),
            followUpLogs: (active?.followUpLogs || targetCar.followUpLogs || []).map((log) => ({
              ...log,
              date: safeDate(log.date),
              remarks: log.remarks || '',
            })),
            effectivenessAudits: (active?.effectivenessAudits || targetCar.effectivenessAudits || []).map((av) => ({
              ...av,
              date: safeDate(av.date),
              remarks: av.remarks || '',
            })),
          });
          setIsDialogOpen(true);
        }, 0);
      }
      return;
    }

    // ── ISSUE CAR: open a new CAR form pre-filled from the NC finding ──
    if (action === 'new' && findingId) {
      const finding = findings.find((f) => f.id === findingId);
      if (!finding) {
        // Finding not loaded yet — reset signature so we retry on next render
        lastConsumedParamKey.current = '';
        return;
      }
      const schedule = schedules.find((s) => s.id === finding.auditScheduleId);

      const params = new URLSearchParams(searchParams.toString());
      params.delete('action');
      params.delete('findingId');
      params.delete('scheduleId');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      const yr = new Date().getFullYear();
      const autoCarNumber = getNextCarNumber(rawCars, yr, 'CAR');
      const defaultReplyDate = format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const defaultRequestDate = format(new Date(), 'yyyy-MM-dd');

      const targetUnitId = schedule?.targetId || units[0]?.id || '';
      const targetCampusId = schedule?.campusId || campuses[0]?.id || '';
      const targetUnitName = unitMap.get(targetUnitId) || '';

      setEditingCar(null);
      unitResponseCacheRef.current = {};
      form.reset({
        carNumber: autoCarNumber,
        ncReportNumber: schedule?.auditNumber || '',
        source: 'Audit Finding',
        procedureTitle: schedule?.procedureDescription || finding.ncStatement || finding.description || '',
        initiator: userProfile
          ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()
          : 'Quality Assurance Office',
        natureOfFinding: 'NC',
        concerningClause: finding.isoClause || '4.1',
        concerningTopManagementName: 'Unit Head',
        timeLimitForReply: defaultReplyDate,
        unitId: targetUnitId,
        campusId: targetCampusId,
        unitHead: '',
        assignedUnits: [
          {
            id: genCarId(),
            campusId: targetCampusId,
            unitId: targetUnitId,
            unitName: targetUnitName,
            unitHead: '',
          },
        ],
        descriptionOfNonconformance: finding.ncStatement || finding.description || '',
        requestDate: defaultRequestDate,
        preparedBy: userProfile ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() : 'QA Auditor',
        approvedBy: currentSignatories?.qaoDirector || 'Director, QAO',
        rootCauseAnalysis: '',
        adminFeedback: '',
        actionSteps: [],
        followUpLogs: [],
        effectivenessAudits: [],
        status: 'Open',
        findingId: finding.id,
      });
      setActiveUnitIndex(0);
      setIsDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawCars, findings, schedules, searchParams]);

  const filteredCars = useMemo(() => {
    if (!rawCars) return [];
    return rawCars.filter((car) => {
      if (effectiveTypeFilter === 'EQA' && car.auditType !== 'EQA') return false;
      if (effectiveTypeFilter === 'IQA' && car.auditType === 'EQA') return false;
      if (!isInstitutionalViewer) {
        const isCampusSupervisor =
          userRole === 'Campus Director' ||
          userRole === 'Campus ODIMO' ||
          userRole?.toLowerCase().includes('vice president');
        if (isCampusSupervisor) {
          const campusAccess = car.campusId === userProfile?.campusId;
          const campusInAssignments = (car.assignedUnits || []).some((a) => a.campusId === userProfile?.campusId);
          if (!campusAccess && !campusInAssignments) return false;
        } else {
          const unitOwn = car.unitId === userProfile?.unitId;
          const unitInAssignments = (car.assignedUnits || []).some((a) => a.unitId === userProfile?.unitId);
          if (!unitOwn && !unitInAssignments) return false;
        }
      }

      const matchesCampus =
        campusFilter === 'all' ||
        car.campusId === campusFilter ||
        (car.assignedUnits || []).some((a) => a.campusId === campusFilter);
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch =
        car.carNumber.toLowerCase().includes(lowerSearch) ||
        unitMap.get(car.unitId)?.toLowerCase().includes(lowerSearch);
      return matchesCampus && matchesSearch;
    });
  }, [rawCars, campusFilter, searchTerm, unitMap, isInstitutionalViewer, userRole, userProfile, effectiveTypeFilter]);

  const carsForAction = useMemo(() => {
    return filteredCars.filter((car) => car.status !== 'Open' && car.status !== 'Closed');
  }, [filteredCars]);

  const needsVerificationCars = useMemo(() => {
    return filteredCars.filter((car) => car.needsVerification);
  }, [filteredCars]);

  const openOngoingCars = useMemo(() => {
    return filteredCars.filter((car) => car.status === 'Open' || car.status === 'In Progress');
  }, [filteredCars]);

  const closedCars = useMemo(() => {
    return filteredCars.filter((car) => car.status === 'Closed');
  }, [filteredCars]);

  const yearlyPerformance = useMemo(() => {
    if (!filteredCars) return [];
    const stats: Record<number, { year: number; NC: number; Open: number; 'On-Going': number; Closed: number }> = {};
    filteredCars.forEach((car) => {
      const year = parseInt(car.carNumber?.substring(0, 4), 10);
      const validYear =
        !isNaN(year) && year >= 2000 && year <= 2100
          ? year
          : car.createdAt?.toDate
            ? car.createdAt.toDate().getFullYear()
            : new Date().getFullYear();
      if (!stats[validYear]) stats[validYear] = { year: validYear, NC: 0, Open: 0, 'On-Going': 0, Closed: 0 };
      stats[validYear].NC++;
      if (car.status === 'Open') stats[validYear].Open++;
      else if (car.status === 'Closed') stats[validYear].Closed++;
      else stats[validYear]['On-Going']++;
    });
    return Object.values(stats).sort((a, b) => a.year - b.year);
  }, [filteredCars]);

  const chartConfig = {
    Open: { label: 'Open', color: 'hsl(var(--destructive))' },
    'On-Going': { label: 'On-Going', color: 'hsl(48 96% 53%)' },
    Closed: { label: 'Closed', color: 'hsl(142 71% 45%)' },
  };

  const ncGapsCount = useMemo(() => {
    if (!findings || !schedules) return 0;
    return findings.filter((f) => {
      if (f.type !== 'Non-Conformance') return false;
      const schedule = schedules.find((s) => s.id === f.auditScheduleId);
      if (!schedule) return false;
      if (!isInstitutionalViewer) {
        if (userRole?.includes('Director') || userRole?.includes('ODIMO')) {
          if (schedule.campusId !== userProfile?.campusId) return false;
        } else {
          if (schedule.targetId !== userProfile?.unitId) return false;
        }
      }
      if (campusFilter !== 'all' && schedule.campusId !== campusFilter) return false;
      const lowerSearch = searchTerm.toLowerCase();
      if (searchTerm) {
        const matches =
          schedule.targetName.toLowerCase().includes(lowerSearch) ||
          (schedule.auditorName || '').toLowerCase().includes(lowerSearch) ||
          f.isoClause.toLowerCase().includes(lowerSearch);
        if (!matches) return false;
      }
      return true;
    }).length;
  }, [findings, schedules, isInstitutionalViewer, userRole, userProfile, campusFilter, searchTerm]);

  const form = useForm<z.infer<typeof carSchema>>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      carNumber: '',
      ncReportNumber: '',
      source: 'Audit Finding',
      natureOfFinding: 'NC',
      procedureTitle: '',
      initiator: '',
      concerningClause: '',
      concerningTopManagementName: 'Unit Head',
      timeLimitForReply: '',
      unitId: '',
      campusId: '',
      unitHead: '',
      assignedUnits: [],
      descriptionOfNonconformance: '',
      rootCauseAnalysis: '',
      adminFeedback: '',
      preparedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '',
      approvedBy: currentSignatories?.qaoDirector || '',
      status: 'Open',
      requestDate: format(new Date(), 'yyyy-MM-dd'),
      actionSteps: [],
      followUpLogs: [],
      effectivenessAudits: [],
    },
  });

  const {
    fields: actionFields,
    append: appendAction,
    remove: removeAction,
  } = useFieldArray({ control: form.control, name: 'actionSteps' });
  const {
    fields: followUpFields,
    append: appendFollowUp,
    remove: removeFollowUp,
  } = useFieldArray({ control: form.control, name: 'followUpLogs' });
  const {
    fields: effectivenessFields,
    append: appendEffectiveness,
    remove: removeEffectiveness,
  } = useFieldArray({ control: form.control, name: 'effectivenessAudits' });

  const {
    fields: assignmentFields,
    append: appendAssignment,
    remove: removeAssignment,
  } = useFieldArray({ control: form.control, name: 'assignedUnits' });

  // Which assigned unit's response is currently being viewed/edited.
  const [activeUnitIndex, setActiveUnitIndex] = useState(0);

  // Per-assignment response pasestaged while the user switches the active unit.
  const unitResponseCacheRef = useRef<Record<string, any>>({});

  const currentActionSteps = form.watch('actionSteps') || [];

  const renderActionVerificationArea = (sectionType: 'follow-up' | 'final') => {
    if (currentActionSteps.length === 0) {
      return (
        <div className="mt-4 p-4 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center w-full">
          <p className="text-xs text-muted-foreground italic">No Action Steps submitted by the unit yet.</p>
        </div>
      );
    }

    return (
      <div className="mt-4 border rounded-xl overflow-hidden bg-white shadow-sm w-full">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Unit Action Steps & Evidence Verification
            </span>
          </div>
          {isInstitutionalViewer && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[9px] font-black uppercase bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary gap-1.5"
              onClick={() => {
                appendAction({
                  description: '',
                  type: 'Long-term Corrective Action',
                  completionDate: format(new Date(), 'yyyy-MM-dd'),
                  status: 'Pending',
                  evidenceLink: '',
                  verificationStatus: 'Pending',
                });
                form.setValue('status', 'Awaiting Response/Update');
                toast({
                  title: 'Action Requested',
                  description: "Added a new action step and set CAR status to 'Awaiting Response/Update'.",
                });
              }}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add More Action & Return to Unit
            </Button>
          )}
        </div>
        <div className="divide-y">
          {currentActionSteps.map((step, i) => (
            <div
              key={i}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors w-full"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[8px] font-black uppercase',
                      step.type === 'Immediate Correction'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    )}
                  >
                    {step.type}
                  </Badge>
                  {sectionType === 'follow-up' ? (
                    <Badge
                      className={cn(
                        'text-[8px] font-black uppercase',
                        step.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800',
                      )}
                    >
                      {step.status}
                    </Badge>
                  ) : (
                    <Badge
                      className={cn(
                        'text-[8px] font-black uppercase',
                        step.verificationStatus === 'Accepted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : step.verificationStatus === 'Not Accepted'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800',
                      )}
                    >
                      {step.verificationStatus === 'Accepted'
                        ? 'Verified Effective'
                        : step.verificationStatus === 'Not Accepted'
                          ? 'Not Effective'
                          : 'Awaiting Effectiveness Check'}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Target: {step.completionDate ? format(new Date(step.completionDate), 'yyyy-MM-dd') : 'No Date'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 break-words leading-relaxed">
                  {step.description || (
                    <span className="text-rose-500 italic">No description entered yet (please fill in Section 3)</span>
                  )}
                </p>
                {step.evidenceLink ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <LinkIcon className="h-3 w-3 text-primary" />
                    <a
                      href={step.evidenceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1"
                    >
                      Open Submitted Evidence Link
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic mt-1">No evidence link provided by unit</p>
                )}
              </div>

              {isInstitutionalViewer && (
                <div className="flex items-center gap-2 shrink-0">
                  {sectionType === 'follow-up' ? (
                    <>
                      {step.status !== 'Completed' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 font-black text-[9px] uppercase border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80"
                          onClick={() => {
                            form.setValue(`actionSteps.${i}.status`, 'Completed');
                            toast({ title: 'Step Verified', description: 'Action step status set to Completed.' });
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          Verify Correct
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 font-black text-[9px] uppercase border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100/80"
                          onClick={() => {
                            form.setValue(`actionSteps.${i}.status`, 'Pending');
                            toast({ title: 'Step Reset', description: 'Action step status set back to Pending.' });
                          }}
                        >
                          <Undo2 className="h-3.5 w-3.5 mr-1 text-amber-600" />
                          Mark Pending
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {step.verificationStatus !== 'Accepted' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 font-black text-[9px] uppercase border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80"
                          onClick={() => {
                            form.setValue(`actionSteps.${i}.verificationStatus`, 'Accepted');
                            toast({ title: 'Step Effective', description: 'Action step verified as effective.' });
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          Verified Effective
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 font-black text-[9px] uppercase border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100/80"
                          onClick={() => {
                            form.setValue(`actionSteps.${i}.verificationStatus`, 'Not Accepted');
                            toast({ title: 'Step Not Effective', description: 'Action step marked as not effective.' });
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-1 text-rose-600" />
                          Not Effective
                        </Button>
                      )}
                    </>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 font-black text-[9px] uppercase border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100/80"
                    onClick={() => {
                      form.setValue('status', 'Awaiting Response/Update');
                      toast({
                        title: 'Returned to Unit',
                        description:
                          "CAR status set to 'Awaiting Response/Update'. Please click 'Commit Update' to save.",
                      });
                    }}
                  >
                    <Undo2 className="h-3.5 w-3.5 mr-1 text-rose-600" />
                    Return CAR
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleEdit = (car: CorrectiveActionRequest) => {
    setEditingCar(car);
    const safeDate = (d: any) =>
      d?.toDate ? format(d.toDate(), 'yyyy-MM-dd') : d ? format(new Date(d), 'yyyy-MM-dd') : '';

    // Rebuild per-assignment cache from the saved CAR so each unit's response is retained.
    unitResponseCacheRef.current = {};
    const assignedUnits = (car.assignedUnits || []).map((a) => {
      unitResponseCacheRef.current[a.id] = {
        status: a.status || 'Open',
        needsVerification: !!a.needsVerification,
        rootCauseAnalysis: a.rootCauseAnalysis || '',
        actionSteps: (a.actionSteps || []).map((s) => ({
          ...s,
          completionDate: safeDate(s.completionDate),
          evidenceLink: s.evidenceLink || '',
          verificationStatus: s.verificationStatus || 'Pending',
        })),
        followUpLogs: (a.followUpLogs || []).map((log) => ({
          ...log,
          date: safeDate(log.date),
          remarks: log.remarks || '',
        })),
        effectivenessAudits: (a.effectivenessAudits || []).map((av) => ({
          ...av,
          date: safeDate(av.date),
          remarks: av.remarks || '',
        })),
      };
      return {
        id: a.id,
        campusId: a.campusId,
        unitId: a.unitId,
        unitName: a.unitName || '',
        unitHead: a.unitHead || '',
      };
    });

    // Prefer the current user's own assignment; otherwise the primary row.
    const defaultActiveIndex = Math.max(
      0,
      assignedUnits.findIndex((a) => a.unitId === userProfile?.unitId),
    );
    setActiveUnitIndex(defaultActiveIndex);

    // Load the active assignment's saved response into the flat response form.
    const active = car.assignedUnits?.[defaultActiveIndex];
    form.reset({
      ...car,
      unitId: active?.unitId || car.unitId || '',
      campusId: active?.campusId || car.campusId || '',
      unitHead: active?.unitHead || car.unitHead || '',
      assignedUnits:
        assignedUnits.length > 0
          ? assignedUnits
          : [
              {
                id: genCarId(),
                campusId: car.campusId || '',
                unitId: car.unitId || '',
                unitName: unitMap.get(car.unitId || '') || '',
                unitHead: car.unitHead || '',
              },
            ],
      adminFeedback: '',
      requestDate: safeDate(car.requestDate),
      timeLimitForReply: safeDate(car.timeLimitForReply),
      rootCauseAnalysis: active?.rootCauseAnalysis || car.rootCauseAnalysis || '',
      actionSteps: (active?.actionSteps || car.actionSteps || []).map((s) => ({
        ...s,
        completionDate: safeDate(s.completionDate),
        evidenceLink: s.evidenceLink || '',
        verificationStatus: s.verificationStatus || 'Pending',
      })),
      followUpLogs: (active?.followUpLogs || car.followUpLogs || []).map((log) => ({
        ...log,
        date: safeDate(log.date),
        remarks: log.remarks || '',
      })),
      effectivenessAudits: (active?.effectivenessAudits || car.effectivenessAudits || []).map((a) => ({
        ...a,
        date: safeDate(a.date),
        remarks: a.remarks || '',
      })),
    });
    setIsDialogOpen(true);
  };

  const isFieldReadOnly = (fieldName: string) => {
    if (isAdmin) return false;
    if (fieldName.startsWith('assignedUnits')) return !isInstitutionalViewer;
    if (fieldName.startsWith('followUpLogs') || fieldName.startsWith('effectivenessAudits'))
      return !isInstitutionalViewer;
    if (fieldName === 'adminFeedback') return !isInstitutionalViewer;
    const activeAssigned = (form.getValues('assignedUnits') || [])[activeUnitIndex] as any;
    const isActiveMyUnit = activeAssigned?.unitId === userProfile?.unitId;
    const responderFields = ['rootCauseAnalysis', 'actionSteps'];
    if (responderFields.some((f) => fieldName.startsWith(f))) {
      return !isInstitutionalViewer && !isActiveMyUnit;
    }
    if (fieldName === 'status') return !isInstitutionalViewer;
    return true;
  };

  const onSubmit = async (values: z.infer<typeof carSchema>) => {
    if (!firestore || !userProfile) return;

    const isUnitResponding =
      (values.unitId === userProfile.unitId ||
        (values.assignedUnits || []).some((a) => a.unitId === userProfile.unitId)) &&
      !isAdmin &&
      (userRole !== 'Auditor' || !isInstitutionalViewer);

    // ── Unit-side gate: require root cause + both action types + evidence links ──
    if (isUnitResponding) {
      const missingFields: string[] = [];

      if (!values.rootCauseAnalysis?.trim()) {
        missingFields.push('Root Cause Analysis');
      }

      const steps = values.actionSteps || [];
      const hasImmediate = steps.some((s) => s.type === 'Immediate Correction' && s.description?.trim());
      const hasLongTerm = steps.some((s) => s.type === 'Long-term Corrective Action' && s.description?.trim());

      if (!hasImmediate) missingFields.push('Immediate Correction (with description)');
      if (!hasLongTerm) missingFields.push('Long-Term Corrective Action (with description)');

      // Every action step must have an evidence link
      const stepsWithoutEvidence = steps
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => !s.evidenceLink?.trim())
        .map(({ s, i }) => `Step ${i + 1} (${s.type}) — Evidence Link (Google Drive)`);
      missingFields.push(...stepsWithoutEvidence);

      if (missingFields.length > 0) {
        toast({
          title: 'Incomplete Response',
          description: `Please complete the following before committing: ${missingFields.join('; ')}.`,
          variant: 'destructive',
        });
        return;
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    setIsSubmitting(true);

    let nextStatus = values.status;
    let needsVerification = liveCar?.needsVerification || false;

    const updatedComments = liveCar?.comments ? [...liveCar.comments] : [];
    if (isInstitutionalViewer && values.adminFeedback?.trim()) {
      updatedComments.push({
        text: `[QA OFFICE FEEDBACK]: ${values.adminFeedback.trim()}`,
        authorId: userProfile.id,
        authorName: `${userProfile.firstName} ${userProfile.lastName}`,
        authorRole: userRole || 'Admin',
        createdAt: new Date(),
      });
      form.setValue('adminFeedback', '');
    }

    if (isInstitutionalViewer && liveCar) {
      const hasVerificationData =
        (values.followUpLogs?.length || 0) > (liveCar.followUpLogs?.length || 0) ||
        (values.effectivenessAudits?.length || 0) > (liveCar.effectivenessAudits?.length || 0);
      // QA office has acknowledged/responded to a unit submission — clear its verify flag.
      needsVerification = false;
      if (hasVerificationData) nextStatus = 'For Final Verification';
      if (values.adminFeedback?.trim()) nextStatus = 'Awaiting Response/Update';
    }

    if (isUnitResponding) {
      nextStatus = 'In Progress';
      needsVerification = true;
    }

    const finalAudit = values.effectivenessAudits?.[values.effectivenessAudits.length - 1];
    if (finalAudit && (finalAudit.action === 'Close the NC' || finalAudit.action === 'Effective')) {
      nextStatus = 'Closed';
      needsVerification = false;
    }

    // Stage the currently-edited assignment's response into its cache entry.
    const activeAssignment = (values.assignedUnits || [])[activeUnitIndex] as any;
    if (activeAssignment && activeAssignment.id) {
      unitResponseCacheRef.current[activeAssignment.id] = {
        status: nextStatus,
        needsVerification,
        rootCauseAnalysis: values.rootCauseAnalysis || '',
        actionSteps: (values.actionSteps || []).map((step) => ({
          ...step,
          completionDate: Timestamp.fromDate(new Date(step.completionDate)),
        })),
        followUpLogs: (values.followUpLogs || []).map((log) => ({
          ...log,
          date: Timestamp.fromDate(new Date(log.date)),
        })),
        effectivenessAudits: (values.effectivenessAudits || []).map((audit) => ({
          ...audit,
          date: Timestamp.fromDate(new Date(audit.date)),
        })),
      };
    }

    // Build the final per-assignment list with each unit's own staged response.
    const assignedUnits = (values.assignedUnits || [])
      .map((a, i) => {
        const cached = unitResponseCacheRef.current[a.id];
        return {
          id: a.id,
          campusId: a.campusId,
          unitId: a.unitId,
          unitName: a.unitName || unitMap.get(a.unitId) || '',
          unitHead: a.unitHead || '',
          status: cached?.status || 'Open',
          needsVerification: !!cached?.needsVerification,
          rootCauseAnalysis: cached?.rootCauseAnalysis || '',
          actionSteps: cached?.actionSteps || [],
          followUpLogs: cached?.followUpLogs || [],
          effectivenessAudits: cached?.effectivenessAudits || [],
          adminFeedback:
            i === activeUnitIndex && isInstitutionalViewer
              ? values.adminFeedback || ''
              : liveCar?.assignedUnits?.[i]?.adminFeedback || '',
        };
      })
      .filter((a) => a.unitId);

    // Compatibility for filters/print/table: mirror the primary (first) assignment.
    const primaryUnit = assignedUnits[0] || {
      unitId: values.unitId || '',
      campusId: values.campusId || '',
      unitHead: values.unitHead || '',
    };

    const carData = {
      ...values,
      unitId: primaryUnit.unitId,
      campusId: primaryUnit.campusId,
      unitHead: primaryUnit.unitHead,
      assignedUnits,
      auditType: editingCar?.auditType || (effectiveTypeFilter === 'EQA' ? 'EQA' : 'IQA'),
      status: nextStatus,
      needsVerification,
      comments: updatedComments,
      timeLimitForReply: Timestamp.fromDate(new Date(values.timeLimitForReply)),
      requestDate: Timestamp.fromDate(new Date(values.requestDate)),
      actionSteps: (values.actionSteps || []).map((step) => ({
        ...step,
        completionDate: Timestamp.fromDate(new Date(step.completionDate)),
      })),
      followUpLogs: (values.followUpLogs || []).map((log) => ({
        ...log,
        date: Timestamp.fromDate(new Date(log.date)),
      })),
      effectivenessAudits: (values.effectivenessAudits || []).map((audit) => ({
        ...audit,
        date: Timestamp.fromDate(new Date(audit.date)),
      })),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingCar) {
        await updateDoc(doc(firestore, 'correctiveActionRequests', editingCar.id), carData);
      } else {
        await addDoc(collection(firestore, 'correctiveActionRequests'), { ...carData, createdAt: serverTimestamp() });
      }
      setIsDialogOpen(false);
      form.reset();
      setEditingCar(null);
      toast({ title: 'Success', description: 'Registry updated.' });
    } catch (e) {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = (car: CorrectiveActionRequest) => {
    const cName = campusMap.get(car.campusId) || 'Unknown Campus';
    const uName = unitMap.get(car.unitId) || 'Unknown Unit';
    try {
      const reportHtml = renderToStaticMarkup(
        <CARPrintTemplate
          car={car}
          unitName={uName}
          campusName={cName}
          signatories={currentSignatories || undefined}
        />,
      );
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(
          `<html><head><title>CAR - ${car.carNumber}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@page { size: 8.5in 13in !important; margin: 0.5in !important; } @media print { body { margin: 0 !important; padding: 0 !important; background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } } body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print CAR</button></div><div id="print-content" style="padding: 0.1in;">${reportHtml}</div></body></html>`,
        );
        printWindow.document.close();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreateNew = () => {
    setEditingCar(null);
    const yr = new Date().getFullYear();
    const autoCarNumber =
      effectiveTypeFilter === 'EQA' ? getNextCarNumber(rawCars, yr, 'EQA-CAR') : getNextCarNumber(rawCars, yr, 'CAR');
    const defaultReplyDate = format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    const defaultRequestDate = format(new Date(), 'yyyy-MM-dd');

    form.reset({
      carNumber: autoCarNumber,
      ncReportNumber: '',
      source: effectiveTypeFilter === 'EQA' ? 'Others' : 'Audit Finding',
      procedureTitle: '',
      initiator: userProfile
        ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()
        : 'Quality Assurance Office',
      natureOfFinding: 'NC',
      concerningClause: '4.1',
      concerningTopManagementName: 'Top Management',
      timeLimitForReply: defaultReplyDate,
      unitId: units[0]?.id || '',
      campusId: campuses[0]?.id || '',
      unitHead: '',
      assignedUnits: [
        {
          id: genCarId(),
          campusId: campuses[0]?.id || '',
          unitId: units[0]?.id || '',
          unitName: unitMap.get(units[0]?.id || '') || '',
          unitHead: '',
        },
      ],
      descriptionOfNonconformance: '',
      requestDate: defaultRequestDate,
      preparedBy: userProfile ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() : 'QA Auditor',
      approvedBy: currentSignatories?.qaoDirector || 'Director, QAO',
      rootCauseAnalysis: '',
      adminFeedback: '',
      actionSteps: [],
      followUpLogs: [],
      effectivenessAudits: [],
      status: 'Open',
    });
    setActiveUnitIndex(0);
    unitResponseCacheRef.current = {};
    setIsDialogOpen(true);
  };

  const handlePrintRegistry = () => {
    try {
      const reportHtml = renderToStaticMarkup(
        <CARControlRegisterTemplate cars={filteredCars} unitMap={unitMap} campusMap={campusMap} year="all" />,
      );
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(
          `<html><head><title>CAR Control Register</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@page { size: 13in 8.5in; margin: 0.5in; } @media print { body { background: white; } .no-print { display: none !important; } } body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Control Register</button></div><div id="print-content">${reportHtml}</div></body></html>`,
        );
        printWindow.document.close();
      }
    } catch (e) {
      // Ignore error opening print window (e.g. popup blocked)
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {auditTypeFilter === 'EQA'
              ? 'External Quality Audit (EQA) CAR Registry'
              : 'Corrective Action Request (CAR) Registry'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {auditTypeFilter === 'EQA'
              ? 'Central institutional management and issuance of Corrective Action Requests for External Quality Audits.'
              : 'Central institutional management and tracking for Non-Conformance findings and Corrective Action Requests.'}
          </p>
        </div>
        {(canManage || isInstitutionalViewer) && (
          <Button
            onClick={handleOpenCreateNew}
            size="sm"
            className="shadow-lg shadow-primary/20 shrink-0 font-black uppercase text-[10px] tracking-widest"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {effectiveTypeFilter === 'EQA' ? 'Issue New EQA CAR' : 'Issue New CAR'}
          </Button>
        )}
      </div>

      {auditTypeFilter === 'ALL' && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-muted p-1 border shadow-sm rounded-lg w-fit">
            <Button
              type="button"
              size="sm"
              onClick={() => setTypeFilter('IQA')}
              className={cn(
                'h-7 px-4 text-[10px] font-black uppercase tracking-widest gap-1.5',
                typeFilter === 'IQA'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'bg-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> IQA CAR Registry
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setTypeFilter('EQA')}
              className={cn(
                'h-7 px-4 text-[10px] font-black uppercase tracking-widest gap-1.5',
                typeFilter === 'EQA'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'bg-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-violet-600" /> EQA CAR Registry
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setTypeFilter('ALL')}
              className={cn(
                'h-7 px-4 text-[10px] font-black uppercase tracking-widest gap-1.5',
                typeFilter === 'ALL'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'bg-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" /> All CARs
            </Button>
          </div>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">
            {effectiveTypeFilter === 'EQA'
              ? 'Showing External Quality Audit CARs only'
              : effectiveTypeFilter === 'IQA'
                ? 'Showing Internal Quality Audit CARs only'
                : 'Showing all CARs with audit type badges'}
          </span>
        </div>
      )}

      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Yearly NC &amp; CAR Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Year</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">NC</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-rose-600">Open</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-amber-600">
                      On-Going
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-emerald-600">
                      Closed
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearlyPerformance.map((row) => (
                    <TableRow key={row.year} className="hover:bg-muted/20">
                      <TableCell className="font-black text-xs">{row.year}</TableCell>
                      <TableCell className="text-right font-bold text-xs">{row.NC}</TableCell>
                      <TableCell className="text-right font-bold text-xs text-rose-600">{row.Open}</TableCell>
                      <TableCell className="text-right font-bold text-xs text-amber-600">{row['On-Going']}</TableCell>
                      <TableCell className="text-right font-bold text-xs text-emerald-600">{row.Closed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ResponsiveContainer>
                  <BarChart data={yearlyPerformance} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 12, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Legend
                      wrapperStyle={{
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    />
                    <Bar dataKey="Open" stackId="a" fill="hsl(var(--destructive))" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="On-Going" stackId="a" fill="hsl(48 96% 53%)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Closed" stackId="a" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="registry" className="space-y-6">
        <TabsList className="bg-muted p-1 border shadow-sm w-fit h-10 animate-tab-highlight rounded-md">
          <TabsTrigger value="registry" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
            <ClipboardList className="h-4 w-4" /> Complete List ({filteredCars.length})
          </TabsTrigger>
          <TabsTrigger value="open-ongoing" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
            <Activity className="h-4 w-4 text-amber-600" /> Open & On-going CAR ({openOngoingCars.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Closed NC ({closedCars.length})
          </TabsTrigger>
          <TabsTrigger value="for-action" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
            <FileWarning className="h-4 w-4 text-rose-600" /> For Action
            {carsForAction.length > 0 && <span className="text-rose-600 tabular-nums">({carsForAction.length})</span>}
            {isInstitutionalViewer && needsVerificationCars.length > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[8px] font-black text-white bg-rose-600"
                title="Unit submissions awaiting verification"
              >
                {needsVerificationCars.length}
              </span>
            )}
          </TabsTrigger>
          {isInstitutionalViewer && (
            <TabsTrigger value="bridge" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
              <ShieldAlert className="h-4 w-4 text-rose-600" /> On Going for Management ({ncGapsCount})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="registry" className="space-y-6 animate-in fade-in duration-500">
          <Card className="border-primary/10 shadow-sm bg-muted/10">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Search Registry</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by CAR number or Unit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 text-xs bg-white"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Campus Filter</label>
                <Select value={campusFilter} onValueChange={setCampusFilter}>
                  <SelectTrigger className="h-10 bg-white text-xs font-bold">
                    <SelectValue placeholder="All Sites" />
                  </SelectTrigger>
                  <SelectContent modal={false}>
                    <SelectItem value="all">All Sites</SelectItem>
                    {campuses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                className="h-10 bg-white border-primary/20 text-primary font-black text-[10px] uppercase gap-2"
                onClick={handlePrintRegistry}
              >
                <Printer className="h-4 w-4" /> Print Control Register
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-md border-primary/10 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase pl-6 py-4">CAR No. & Procedure</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Accountable Unit</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase">Reply Deadline</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase">Status</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCars.map((car) => (
                    <TableRow key={car.id} className="hover:bg-muted/20 transition-colors group">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs text-primary">{car.carNumber}</span>
                            {car.auditType === 'EQA' ? (
                              <Badge className="text-[8px] font-black uppercase bg-violet-100 text-violet-800 border-violet-200">
                                EQA
                              </Badge>
                            ) : (
                              <Badge className="text-[8px] font-black uppercase bg-primary/10 text-primary border-primary/20">
                                IQA
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[250px]">
                            {car.procedureTitle}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <Building2 className="h-3.5 w-3.5 opacity-30" />
                            {unitMap.get(car.unitId) || 'Unknown Unit'}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] font-black text-primary/60 uppercase tracking-tighter">
                            <School className="h-2.5 w-2.5 ml-0.5" />
                            {campusMap.get(car.campusId) || 'Institutional'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-[10px] font-black text-rose-700 tabular-nums">
                        {car.timeLimitForReply?.toDate ? format(car.timeLimitForReply.toDate(), 'MMM dd, yyyy') : '--'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-black uppercase border-primary/20 bg-primary/5 text-primary"
                        >
                          {car.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={notifyingCarId === car.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotifyCar(car);
                              }}
                              className="h-8 text-[9px] font-bold bg-white gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                              title="Notify Accountable Unit"
                            >
                              {notifyingCarId === car.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Bell className="h-3 w-3" />
                              )}
                              NOTIFY
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-[9px] font-bold bg-white gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrint(car);
                            }}
                          >
                            <Printer className="h-3 w-3" /> PRINT
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 font-black uppercase text-[10px]"
                            onClick={() => handleEdit(car)}
                          >
                            Manage Record
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="open-ongoing" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-md border-amber-200/30 overflow-hidden">
            <div className="p-4 bg-amber-50/50 border-b flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                Open & On-going Corrective Action Requests
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase pl-6 py-4">CAR No. & Procedure</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Accountable Unit</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase">Reply Deadline</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase">Status</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openOngoingCars.map((car) => (
                    <TableRow key={car.id} className="hover:bg-muted/20 transition-colors group">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs text-primary">{car.carNumber}</span>
                            {car.auditType === 'EQA' ? (
                              <Badge className="text-[8px] font-black uppercase bg-violet-100 text-violet-800 border-violet-200">
                                EQA
                              </Badge>
                            ) : (
                              <Badge className="text-[8px] font-black uppercase bg-primary/10 text-primary border-primary/20">
                                IQA
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[250px]">
                            {car.procedureTitle}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <Building2 className="h-3.5 w-3.5 opacity-30" />
                            {unitMap.get(car.unitId) || 'Unknown Unit'}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] font-black text-primary/60 uppercase tracking-tighter">
                            <School className="h-2.5 w-2.5 ml-0.5" />
                            {campusMap.get(car.campusId) || 'Institutional'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-[10px] font-black text-rose-700 tabular-nums">
                        {car.timeLimitForReply?.toDate ? format(car.timeLimitForReply.toDate(), 'MMM dd, yyyy') : '--'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="text-[9px] font-black uppercase bg-amber-50 text-amber-700 border-amber-200 px-2 h-5">
                          {car.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={notifyingCarId === car.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotifyCar(car);
                              }}
                              className="h-8 text-[9px] font-bold bg-white gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                              title="Notify Accountable Unit"
                            >
                              {notifyingCarId === car.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Bell className="h-3 w-3" />
                              )}
                              NOTIFY
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-[9px] font-bold bg-white gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrint(car);
                            }}
                          >
                            <Printer className="h-3 w-3" /> PRINT
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 font-black uppercase text-[10px] shadow-sm bg-amber-600"
                            onClick={() => handleEdit(car)}
                          >
                            Manage
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="closed" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-md border-emerald-200/30 overflow-hidden">
            <div className="p-4 bg-emerald-50/50 border-b flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                Closed Non-Conformance Records
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase pl-6 py-4">CAR No. & Procedure</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Accountable Unit</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase">Reply Deadline</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase">Status</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedCars.map((car) => (
                    <TableRow key={car.id} className="hover:bg-muted/20 transition-colors group">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs text-primary">{car.carNumber}</span>
                            {car.auditType === 'EQA' ? (
                              <Badge className="text-[8px] font-black uppercase bg-violet-100 text-violet-800 border-violet-200">
                                EQA
                              </Badge>
                            ) : (
                              <Badge className="text-[8px] font-black uppercase bg-primary/10 text-primary border-primary/20">
                                IQA
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[250px]">
                            {car.procedureTitle}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <Building2 className="h-3.5 w-3.5 opacity-30" />
                            {unitMap.get(car.unitId) || 'Unknown Unit'}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] font-black text-primary/60 uppercase tracking-tighter">
                            <School className="h-2.5 w-2.5 ml-0.5" />
                            {campusMap.get(car.campusId) || 'Institutional'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-[10px] font-black text-rose-700 tabular-nums">
                        {car.timeLimitForReply?.toDate ? format(car.timeLimitForReply.toDate(), 'MMM dd, yyyy') : '--'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border-emerald-200 px-2 h-5">
                          {car.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={notifyingCarId === car.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotifyCar(car);
                              }}
                              className="h-8 text-[9px] font-bold bg-white gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                              title="Notify Accountable Unit"
                            >
                              {notifyingCarId === car.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Bell className="h-3 w-3" />
                              )}
                              NOTIFY
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-[9px] font-bold bg-white gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrint(car);
                            }}
                          >
                            <Printer className="h-3 w-3" /> PRINT
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 font-black uppercase text-[10px]"
                            onClick={() => handleEdit(car)}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="for-action" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-md border-primary/10 overflow-hidden">
            <div className="p-4 bg-muted/10 border-b flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                Items Requiring Active Update or Closure Verification
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase pl-6 py-4">CAR No. & Procedure</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Accountable Unit</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase">Reply Deadline</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase">Status</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carsForAction.map((car) => (
                    <TableRow key={car.id} className="hover:bg-muted/20 transition-colors group">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs text-primary">{car.carNumber}</span>
                            {car.auditType === 'EQA' ? (
                              <Badge className="text-[8px] font-black uppercase bg-violet-100 text-violet-800 border-violet-200">
                                EQA
                              </Badge>
                            ) : (
                              <Badge className="text-[8px] font-black uppercase bg-primary/10 text-primary border-primary/20">
                                IQA
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[250px]">
                            {car.procedureTitle}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <Building2 className="h-3.5 w-3.5 opacity-30" />
                            {unitMap.get(car.unitId) || 'Unknown Unit'}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] font-black text-primary/60 uppercase tracking-tighter">
                            <School className="h-2.5 w-2.5 ml-0.5" />
                            {campusMap.get(car.campusId) || 'Institutional'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-[10px] font-black text-rose-700 tabular-nums">
                        {car.timeLimitForReply?.toDate ? format(car.timeLimitForReply.toDate(), 'MMM dd, yyyy') : '--'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 border-none px-2 h-5">
                          {car.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={notifyingCarId === car.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotifyCar(car);
                              }}
                              className="h-8 text-[9px] font-bold bg-white gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                              title="Notify Accountable Unit"
                            >
                              {notifyingCarId === car.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Bell className="h-3 w-3" />
                              )}
                              NOTIFY
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-[9px] font-bold bg-white gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrint(car);
                            }}
                          >
                            <Printer className="h-3 w-3" /> PRINT
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 font-black uppercase text-[10px] shadow-sm bg-indigo-600"
                            onClick={() => handleEdit(car)}
                          >
                            Take Action
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="bridge" className="animate-in fade-in duration-500">
          <AuditorNCManager
            findings={findings || []}
            schedules={schedules || []}
            cars={filteredCars}
            campuses={campuses}
            units={units}
            signatories={currentSignatories || undefined}
            campusFilter={campusFilter}
            searchTerm={searchTerm}
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingCar(null);
        }}
      >
        <DialogContent className="max-w-[95vw] lg:max-w-[1400px] h-[95dvh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 border-b bg-slate-50 dark:bg-slate-800/50 shrink-0">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    Institutional Document Control
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <DialogTitle className="text-xl">
                    {editingCar
                      ? isAdmin ||
                        isInstitutionalViewer ||
                        (userProfile?.unitId &&
                          (userProfile.unitId === form.getValues('unitId') ||
                            (form.getValues('assignedUnits') || []).some((a) => a.unitId === userProfile.unitId)))
                        ? 'Modify CAR'
                        : 'View CAR Record'
                      : 'Issue CAR'}
                  </DialogTitle>
                  {liveCar && (
                    <Badge className="h-6 px-4 font-black uppercase text-[10px] bg-primary text-white">
                      {liveCar.status}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-full h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <Form {...form}>
            <div className="flex-1 flex overflow-hidden bg-white">
              <div className="flex-1 flex flex-col min-w-0 border-r bg-background">
                <ScrollArea className="flex-1">
                  <form id="car-form" onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-10">
                    <section className="space-y-6">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <Info className="h-4 w-4 text-primary" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                          1. Administrative Context
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="carNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase">CAR Number</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="bg-slate-50 dark:bg-slate-800/50 font-black h-11"
                                  disabled={isFieldReadOnly('carNumber')}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="ncReportNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase">NC Report No.</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value || ''}
                                  className="bg-slate-50 dark:bg-slate-800/50 font-bold h-11"
                                  disabled={isFieldReadOnly('ncReportNumber')}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="space-y-4 pt-6 border-t">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <FormLabel className="text-xs font-bold uppercase">
                              Release To (Campuses, Unit &amp; Head)
                            </FormLabel>
                            <p className="text-[10px] text-muted-foreground">
                              The NC can be released to one or more campus/unit/unit-head recipients. Each assigned unit
                              responds with its own corrective action plan.
                            </p>
                          </div>
                          {!isFieldReadOnly('assignedUnits') && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 font-black text-[10px] uppercase gap-1.5"
                              onClick={() =>
                                appendAssignment({
                                  id: genCarId(),
                                  campusId: '',
                                  unitId: '',
                                  unitName: '',
                                  unitHead: '',
                                })
                              }
                            >
                              <Plus className="h-3.5 w-3.5" /> Add Campus &amp; Unit
                            </Button>
                          )}
                        </div>

                        {assignmentFields.map((afield, aindex) => {
                          const isActive = aindex === activeUnitIndex;
                          return (
                            <div
                              key={afield.id}
                              className={`rounded-xl border p-4 space-y-3 transition-all ${
                                isActive ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/10'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={`h-6 text-[9px] font-black uppercase tracking-widest ${
                                    isActive ? 'text-primary' : 'text-muted-foreground'
                                  }`}
                                  onClick={() => {
                                    // Save current active response into cache before switching.
                                    const cache = unitResponseCacheRef.current;
                                    const cur = assignmentFields[activeUnitIndex] as any;
                                    if (cur && cur.id) {
                                      cache[cur.id] = {
                                        rootCauseAnalysis: form.getValues('rootCauseAnalysis'),
                                        actionSteps: form.getValues('actionSteps'),
                                        status: form.getValues('status'),
                                      };
                                    }
                                    const target = assignmentFields[aindex] as any;
                                    if (target && target.id) {
                                      const saved = cache[target.id];
                                      form.setValue('rootCauseAnalysis', saved?.rootCauseAnalysis || '');
                                      form.setValue('status', saved?.status || 'Open');
                                    }
                                    setActiveUnitIndex(aindex);
                                  }}
                                >
                                  <CheckCircle2
                                    className={`h-3 w-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                                  />
                                  {isActive ? 'Active Unit Being Edited' : `Load Unit #${aindex + 1}`}
                                </Button>
                                {isInstitutionalViewer && assignmentFields.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      removeAssignment(aindex);
                                      if (activeUnitIndex >= aindex && activeUnitIndex > 0) {
                                        setActiveUnitIndex(activeUnitIndex - 1);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`assignedUnits.${aindex}.campusId`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[9px] font-black uppercase">Campus</FormLabel>
                                      <Select
                                        onValueChange={(v) => {
                                          field.onChange(v);
                                          form.setValue(`assignedUnits.${aindex}.unitId`, '');
                                        }}
                                        value={field.value}
                                        disabled={isFieldReadOnly('assignedUnits')}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="bg-slate-50 dark:bg-slate-800/50">
                                            <SelectValue placeholder="Select Campus" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent modal={false}>
                                          {campuses.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                              {c.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`assignedUnits.${aindex}.unitId`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[9px] font-black uppercase">
                                        Responsible Unit
                                      </FormLabel>
                                      <Select
                                        onValueChange={(v) => {
                                          field.onChange(v);
                                          form.setValue(`assignedUnits.${aindex}.unitName`, unitMap.get(v) || '');
                                        }}
                                        value={field.value}
                                        disabled={isFieldReadOnly('assignedUnits')}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="bg-slate-50 dark:bg-slate-800/50">
                                            <SelectValue placeholder="Select Unit" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent modal={false}>
                                          {units
                                            .filter((u) =>
                                              u.campusIds?.includes(form.watch(`assignedUnits.${aindex}.campusId`)),
                                            )
                                            .map((u) => (
                                              <SelectItem key={u.id} value={u.id}>
                                                {u.name}
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`assignedUnits.${aindex}.unitHead`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[9px] font-black uppercase">Head of Unit</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          className="bg-slate-50 dark:bg-slate-800/50 font-bold"
                                          disabled={isFieldReadOnly('assignedUnits')}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {form.formState.errors.assignedUnits?.message && (
                          <p className="text-xs text-destructive font-medium">
                            {form.formState.errors.assignedUnits.message}
                          </p>
                        )}
                      </div>
                      <FormField
                        control={form.control}
                        name="procedureTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase">Procedure Affected</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="bg-slate-50 dark:bg-slate-800/50 font-bold"
                                disabled={isFieldReadOnly('procedureTitle')}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="concerningClause"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase">Concerning ISO Clause</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="bg-slate-50 dark:bg-slate-800/50 font-bold"
                                disabled={isFieldReadOnly('concerningClause')}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="timeLimitForReply"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase text-rose-600">Reply Deadline</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                className="bg-rose-50/30 border-rose-100 font-bold h-10"
                                disabled={isFieldReadOnly('timeLimitForReply')}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </section>

                    <section className="space-y-6 pt-6 border-t border-dashed">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-800">
                          2. Statement of Non-Conformance
                        </h4>
                      </div>
                      <FormField
                        control={form.control}
                        name="descriptionOfNonconformance"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={6}
                                className="bg-rose-50/10 border-rose-100 italic text-sm leading-relaxed"
                                placeholder="Clearly describe the gap identified against the ISO standard..."
                                disabled={isFieldReadOnly('descriptionOfNonconformance')}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </section>

                    <section className="space-y-6 pt-6 border-t border-dashed">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <ShieldAlert className="h-5 w-5 text-primary" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">
                          3. Root Cause Analysis & Plan
                        </h4>
                      </div>

                      {/* ── Instruction banner for unit responders ─────────── */}
                      {!isFieldReadOnly('rootCauseAnalysis') && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5" /> Instructions for Unit Response
                          </p>
                          <ol className="text-[11px] text-amber-900 dark:text-amber-200 list-decimal pl-4 space-y-1 font-medium">
                            <li>
                              <strong>Root Cause Analysis</strong> — Explain the systemic reason why this
                              non-conformance occurred. Be specific and factual.
                            </li>
                            <li>
                              <strong>Immediate Correction</strong> — Describe the immediate action your unit already
                              took (or is taking) to fix the current problem, then set the implementation date.
                            </li>
                            <li>
                              <strong>Long-Term Corrective Action</strong> — Describe the permanent process change or
                              preventive measure your unit will implement to stop recurrence, then set the target
                              completion date.
                            </li>
                            <li className="font-black text-amber-800 dark:text-amber-300">
                              Both Immediate Correction and Long-Term Corrective Action entries (with description and
                              date) are <span className="underline">required</span>.
                            </li>
                            <li className="font-black text-amber-800 dark:text-amber-300">
                              Each corrective step must have a{' '}
                              <span className="underline">Google Drive Evidence Link</span> attached — you cannot commit
                              an update without it.
                            </li>
                          </ol>
                        </div>
                      )}

                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                          Root Cause Analysis
                          {!isFieldReadOnly('rootCauseAnalysis') && <span className="text-destructive ml-1">*</span>}
                        </p>
                        <FormField
                          control={form.control}
                          name="rootCauseAnalysis"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  value={field.value || ''}
                                  rows={4}
                                  placeholder="Identify the systematic root cause: e.g., lack of process documentation, inadequate training, unclear responsibility..."
                                  className="bg-primary/5 border-primary/10 shadow-inner italic"
                                  disabled={isFieldReadOnly('rootCauseAnalysis')}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4">
                        {actionFields.map((field, index) => {
                          const watchedType = form.watch(`actionSteps.${index}.type`);
                          const isImmediate = watchedType === 'Immediate Correction';
                          const actionLabel = isImmediate ? 'Immediate Correction' : 'Long-Term Corrective Action';
                          const descriptionPlaceholder = isImmediate
                            ? 'Describe what your unit did RIGHT NOW to address the problem (e.g., re-trained staff, corrected the document, pulled the non-conforming items)...'
                            : 'Describe the permanent process change/preventive measure to stop this from happening again (e.g., updated SOP, scheduled regular audits, added a review step)...';
                          const dateLabel = isImmediate ? 'Date Implemented' : 'Target Completion Date';
                          const evidenceValue = form.watch(`actionSteps.${index}.evidenceLink`) || '';
                          const isMissingEvidence = !isFieldReadOnly('actionSteps') && !evidenceValue.trim();

                          return (
                            <div
                              key={field.id}
                              className={`p-4 rounded-lg border relative group space-y-3 ${
                                isMissingEvidence
                                  ? 'border-rose-200 bg-rose-50/30 dark:bg-rose-900/10'
                                  : 'border-border bg-muted/5'
                              }`}
                            >
                              {/* Dynamic action type badge */}
                              {!isFieldReadOnly('actionSteps') && (
                                <div
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                    isImmediate
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  }`}
                                >
                                  {isImmediate ? (
                                    <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                      <path
                                        fillRule="evenodd"
                                        d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  ) : (
                                    <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                  {actionLabel}
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                <div className="md:col-span-3">
                                  <FormField
                                    control={form.control}
                                    name={`actionSteps.${index}.type`}
                                    render={({ field: iF }) => (
                                      <FormItem>
                                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                          Action Type <span className="text-destructive">*</span>
                                        </p>
                                        <Select
                                          onValueChange={iF.onChange}
                                          value={iF.value}
                                          disabled={isFieldReadOnly('actionSteps')}
                                        >
                                          <FormControl>
                                            <SelectTrigger className="bg-white text-[10px]">
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent modal={false}>
                                            <SelectItem value="Immediate Correction">Immediate Correction</SelectItem>
                                            <SelectItem value="Long-term Corrective Action">
                                              Long-term Action
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="md:col-span-6">
                                  <FormField
                                    control={form.control}
                                    name={`actionSteps.${index}.description`}
                                    render={({ field: iF }) => (
                                      <FormItem>
                                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                          {isImmediate ? 'Action Taken' : 'Action Planned'}{' '}
                                          <span className="text-destructive">*</span>
                                          {!isFieldReadOnly('actionSteps') && (
                                            <span className="normal-case font-normal text-muted-foreground ml-1">
                                              —{' '}
                                              {isImmediate
                                                ? 'explain what was done to immediately fix the problem'
                                                : 'explain the long-term preventive measure to stop recurrence'}
                                            </span>
                                          )}
                                        </p>
                                        <FormControl>
                                          <Input
                                            {...iF}
                                            placeholder={!isFieldReadOnly('actionSteps') ? descriptionPlaceholder : ''}
                                            className="h-8 text-[10px] bg-white"
                                            disabled={isFieldReadOnly('actionSteps')}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="md:col-span-3">
                                  <FormField
                                    control={form.control}
                                    name={`actionSteps.${index}.completionDate`}
                                    render={({ field: iF }) => (
                                      <FormItem>
                                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                          {!isFieldReadOnly('actionSteps') ? dateLabel : 'Date'}{' '}
                                          <span className="text-destructive">*</span>
                                        </p>
                                        <FormControl>
                                          <Input
                                            type="date"
                                            {...iF}
                                            className="h-8 text-[10px] bg-white"
                                            disabled={isFieldReadOnly('actionSteps')}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              <FormField
                                control={form.control}
                                name={`actionSteps.${index}.evidenceLink`}
                                render={({ field: iF }) => (
                                  <FormItem className="mt-2">
                                    <FormLabel
                                      className={`text-[9px] uppercase font-bold flex items-center gap-1 ${
                                        isMissingEvidence ? 'text-rose-600' : ''
                                      }`}
                                    >
                                      <LinkIcon className="h-2.5 w-2.5 text-primary" />
                                      Evidence Link (Google Drive)
                                      {!isFieldReadOnly('actionSteps') && (
                                        <span className="text-destructive ml-0.5">*</span>
                                      )}
                                      {isMissingEvidence && (
                                        <span className="ml-1 text-rose-500 font-normal normal-case">
                                          — required to commit update
                                        </span>
                                      )}
                                    </FormLabel>
                                    <div className="flex gap-2">
                                      <FormControl>
                                        <Input
                                          {...iF}
                                          value={iF.value || ''}
                                          placeholder="https://drive.google.com/... (paste the shared Google Drive link to your evidence)"
                                          className={`h-8 text-[10px] bg-white flex-1 ${
                                            isMissingEvidence ? 'border-rose-300 focus-visible:ring-rose-400' : ''
                                          }`}
                                          disabled={isFieldReadOnly('actionSteps')}
                                        />
                                      </FormControl>
                                      {iF.value && iF.value.startsWith('http') && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 text-primary shrink-0"
                                          onClick={() => window.open(iF.value, '_blank')}
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {!isFieldReadOnly('actionSteps') && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-1 right-1 text-destructive h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removeAction(index)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                        {!isFieldReadOnly('actionSteps') && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              appendAction({
                                description: '',
                                type: 'Immediate Correction',
                                completionDate: format(new Date(), 'yyyy-MM-dd'),
                                status: 'Pending',
                                evidenceLink: '',
                              })
                            }
                            className="w-full border-dashed h-10 font-black text-[10px] uppercase gap-2"
                          >
                            <PlusCircle className="h-3.5 w-3.5" /> Add Corrective Step
                          </Button>
                        )}
                      </div>
                    </section>

                    <section className="space-y-8 pt-8 border-t border-dashed">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Gavel className="h-6 w-6" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-black uppercase text-indigo-900 tracking-tight">
                              Institutional Oversight & Verification
                            </h4>
                          </div>
                        </div>
                        {isInstitutionalViewer && (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 font-black text-[10px] uppercase"
                              onClick={() =>
                                appendFollowUp({
                                  result: '',
                                  verifiedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '',
                                  date: format(new Date(), 'yyyy-MM-dd'),
                                  remarks: '',
                                })
                              }
                            >
                              <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Follow-up
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 font-black text-[10px] uppercase border-indigo-200 text-indigo-700 bg-indigo-50"
                              onClick={() =>
                                appendEffectiveness({
                                  result: '',
                                  verifiedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '',
                                  date: format(new Date(), 'yyyy-MM-dd'),
                                  action: 'Effective',
                                  remarks: '',
                                })
                              }
                            >
                              <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Final Entry
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-6">
                        <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">
                          I. Follow-up Result
                        </h5>
                        {followUpFields.map((field, index) => (
                          <div
                            key={field.id}
                            className="p-6 rounded-2xl border bg-slate-50/50 dark:bg-slate-800/50 relative group space-y-6"
                          >
                            {renderActionVerificationArea('follow-up')}
                            <FormField
                              control={form.control}
                              name={`followUpLogs.${index}.result`}
                              render={({ field: iF }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel className="text-[9px] font-black uppercase">
                                    Official Auditor Observation
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea
                                      {...iF}
                                      rows={4}
                                      className="bg-white text-xs italic"
                                      disabled={isFieldReadOnly(`followUpLogs.${index}.result`)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`followUpLogs.${index}.verifiedBy`}
                                render={({ field: iF }) => (
                                  <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase">Verified By</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...iF}
                                        className="h-8 text-xs bg-white"
                                        disabled={isFieldReadOnly(`followUpLogs.${index}.verifiedBy`)}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`followUpLogs.${index}.date`}
                                render={({ field: iF }) => (
                                  <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase">Date</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...iF}
                                        className="h-8 text-xs bg-white"
                                        disabled={isFieldReadOnly(`followUpLogs.${index}.date`)}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name={`followUpLogs.${index}.remarks`}
                              render={({ field: iF }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel className="text-[9px] font-black uppercase">
                                    Remarks / Comments (Printed in Report)
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea
                                      {...iF}
                                      value={iF.value || ''}
                                      rows={2}
                                      className="bg-white text-xs italic"
                                      placeholder="Add comments/remarks for report..."
                                      disabled={isFieldReadOnly(`followUpLogs.${index}.remarks`)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            {isInstitutionalViewer && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 text-destructive h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeFollowUp(index)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {followUpFields.length === 0 && (
                          <div className="py-6 text-center border border-dashed rounded-lg bg-muted/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              No Follow-up Logs Recorded
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-6">
                        <h5 className="text-[10px] font-black uppercase text-emerald-700 tracking-widest border-b pb-1">
                          II. Final Verification
                        </h5>
                        {effectivenessFields.map((field, idx) => (
                          <div
                            key={field.id}
                            className="p-6 rounded-2xl border bg-emerald-50/20 space-y-6 group relative"
                          >
                            {renderActionVerificationArea('final')}
                            <FormField
                              control={form.control}
                              name={`effectivenessAudits.${idx}.result`}
                              render={({ field: iF }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-emerald-900">
                                    Audit Verification Outcome
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea
                                      {...iF}
                                      rows={3}
                                      className="bg-white border-emerald-100 text-sm shadow-inner"
                                      disabled={isFieldReadOnly(`effectivenessAudits.${idx}.result`)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-6">
                              <FormField
                                control={form.control}
                                name={`effectivenessAudits.${idx}.action`}
                                render={({ field: iF }) => (
                                  <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase text-emerald-600">
                                      Decision
                                    </FormLabel>
                                    <Select
                                      onValueChange={iF.onChange}
                                      value={iF.value}
                                      disabled={isFieldReadOnly(`effectivenessAudits.${idx}.action`)}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="h-10 font-bold bg-white">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent modal={false}>
                                        <SelectItem value="Effective">Effective (NC Closed)</SelectItem>
                                        <SelectItem value="Not Effective">Not Effective</SelectItem>
                                        <SelectItem value="Close the NC">Close the NC</SelectItem>
                                        <SelectItem value="Continue Monitoring the NC">Continue Monitoring</SelectItem>
                                        <SelectItem value="Provide More Actions to Address the NC">
                                          Provide More Actions
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`effectivenessAudits.${idx}.date`}
                                render={({ field: iF }) => (
                                  <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase text-emerald-600">
                                      Verification Date
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...iF}
                                        className="h-10 font-bold bg-white"
                                        disabled={isFieldReadOnly(`effectivenessAudits.${idx}.date`)}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name={`effectivenessAudits.${idx}.remarks`}
                              render={({ field: iF }) => (
                                <FormItem>
                                  <FormLabel className="text-[9px] font-black uppercase text-emerald-600">
                                    Remarks / Comments (Printed in Report)
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea
                                      {...iF}
                                      value={iF.value || ''}
                                      rows={2}
                                      className="bg-white border-emerald-100 text-xs italic"
                                      placeholder="Add comments/remarks for report..."
                                      disabled={isFieldReadOnly(`effectivenessAudits.${idx}.remarks`)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            {isInstitutionalViewer && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 text-destructive h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeEffectiveness(idx)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {effectivenessFields.length === 0 && (
                          <div className="py-6 text-center border border-dashed rounded-lg bg-muted/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              No Final Verification Records
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  </form>
                </ScrollArea>

                <div className="h-32 border-t bg-slate-50 dark:bg-slate-800/50 p-4 shrink-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <ListChecks className="h-3.5 w-3.5" /> Corrective Action Protocol
                      </h5>
                      <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal pl-4 font-medium italic">
                        <li>
                          <strong>Root Cause Analysis:</strong> Units must identify the actual systemic reason why the
                          NC occurred.
                        </li>
                        <li>
                          <strong>Correction:</strong> Immediate action taken to contain the issue (Fix the error).
                        </li>
                        <li>
                          <strong>Corrective Action:</strong> Long-term changes implemented to prevent recurrence
                          (Change the process).
                        </li>
                        <li>
                          <strong>Verification:</strong> QA Office will audit the evidence to ensure the actions were
                          effective before closing the record.
                        </li>
                      </ol>
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <div className="w-[400px] flex flex-col bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                <div className="p-4 border-b font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2 bg-white">
                  <MessageSquare className="h-4 w-4" /> Conversation History
                </div>
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6">
                    {liveCar?.comments && liveCar.comments.length > 0 ? (
                      liveCar.comments.map((comment, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between gap-2 border-b pb-1 mb-1">
                            <span className="text-[10px] font-black uppercase text-primary truncate max-w-[150px]">
                              {comment.authorName}
                            </span>
                            <span className="text-[8px] font-mono text-muted-foreground">
                              {(() => {
                                const c = comment.createdAt;
                                if (!c) return '';
                                const d = c instanceof Date ? c : (c as any).toDate?.();
                                return d && !isNaN(d.getTime()) ? format(d, 'MMM dd, p') : '';
                              })()}
                            </span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-primary/5 shadow-sm text-[11px] leading-relaxed italic text-slate-700 dark:text-slate-300">
                            "{comment.text}"
                          </div>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase text-right">
                            {comment.authorRole}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center opacity-10 flex flex-col items-center gap-3">
                        <History className="h-12 w-12" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No history logged</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                {isInstitutionalViewer && (
                  <div className="p-6 border-t bg-white space-y-4">
                    <FormField
                      control={form.control}
                      name="adminFeedback"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-primary">
                            Post Feedback / Directive
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Add a review note..."
                              className="text-xs italic bg-slate-50 dark:bg-slate-800/50 min-h-[80px]"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          </Form>

          <DialogFooter className="p-6 border-t bg-slate-50 dark:bg-slate-800/50 shrink-0">
            <div className="flex w-full items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="text-[10px] font-black uppercase"
              >
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                {(editingCar || liveCar) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePrint((editingCar || liveCar)!)}
                    className="h-10 text-[10px] font-black uppercase bg-white border-primary/20 text-primary hover:bg-primary/5 gap-1.5"
                  >
                    <Printer className="h-4 w-4" /> Print CAR
                  </Button>
                )}
                {(isAdmin ||
                  isInstitutionalViewer ||
                  (userProfile?.unitId &&
                    (userProfile.unitId === form.getValues('unitId') ||
                      (form.getValues('assignedUnits') || []).some((a) => a.unitId === userProfile.unitId)))) && (
                  <Button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                    className="min-w-[180px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] h-10 px-8"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4 mr-1.5" />
                    )}
                    Commit Update
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
