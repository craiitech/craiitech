'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from '@/firebase/firestore-wrapper';
import type { Campus, Unit, AttendanceActivity, DeviceBinding, ActivityAttendanceLog, ActivitySession, ActivityEvaluation } from '@/lib/types';
import { generatePayloadSignature, resolveActiveSession, parseSessionTime } from '@/lib/unit-activity-crypto';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Calendar, 
  Plus, 
  Camera, 
  Users, 
  Search, 
  FileSpreadsheet, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Loader2,
  Smartphone,
  ShieldAlert,
  Info,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowLeft,
  Building2,
  Check,
  Pencil,
  StopCircle,
  Star,
  MessageSquare,
  X,
  FileText,
  Printer,
  ClipboardCopy
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const pieLabel = ({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`;

export default function UnitActivityPage() {
  const { userProfile, isAdmin, isSupervisor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const hasAccessToAll = isAdmin || isSupervisor;

  // Active sub-tab state
  const [activeTab, setActiveTab] = useState('activities');

  // DB queries
  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  // Activities queries - Sort in memory to bypass composite index constraints for non-admin filters
  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const base = collection(firestore, 'unitActivities');
    if (hasAccessToAll) {
      return base;
    }
    return query(base, where('unitId', '==', userProfile.unitId));
  }, [firestore, userProfile, hasAccessToAll]);
  const { data: activities, isLoading: isLoadingActivities } = useCollection<AttendanceActivity>(activitiesQuery);

  const sortedActivities = useMemo(() => {
    if (!activities) return [];
    return [...activities].sort((a, b) => {
      const timeA = a.startDateTime?.toDate ? a.startDateTime.toDate().getTime() : (a.startDateTime?.seconds ? a.startDateTime.seconds * 1000 : new Date(a.startDateTime).getTime());
      const timeB = b.startDateTime?.toDate ? b.startDateTime.toDate().getTime() : (b.startDateTime?.seconds ? b.startDateTime.seconds * 1000 : new Date(b.startDateTime).getTime());
      return timeB - timeA;
    });
  }, [activities]);

  // Device bindings query - Sort in memory
  const bindingsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return collection(firestore, 'attendanceDeviceBindings');
  }, [firestore, userProfile]);
  const { data: deviceBindings, isLoading: isLoadingBindings } = useCollection<DeviceBinding>(bindingsQuery);

  // --- 1. ACTIVITY CREATION STATE ---
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityStart, setNewActivityStart] = useState('');
  const [newActivityEnd, setNewActivityEnd] = useState('');
  const [lateThreshold, setLateThreshold] = useState('15');
  const [newRequiresLogout, setNewRequiresLogout] = useState(false);
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);

  const [newActivitySessions, setNewActivitySessions] = useState<ActivitySession[]>([]);
  const [newActivityDocs, setNewActivityDocs] = useState<{ description: string; googleDriveLink: string }[]>([]);
  const [docDesc, setDocDesc] = useState('');
  const [docLink, setDocLink] = useState('');

  // --- EDIT ACTIVITY STATE ---
  const [editingActivity, setEditingActivity] = useState<AttendanceActivity | null>(null);
  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editThreshold, setEditThreshold] = useState('');
  const [editRequiresLogout, setEditRequiresLogout] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [editActivitySessions, setEditActivitySessions] = useState<ActivitySession[]>([]);
  const [editActivityDocs, setEditActivityDocs] = useState<{ description: string; googleDriveLink: string }[]>([]);
  const [editDocDesc, setEditDocDesc] = useState('');
  const [editDocLink, setEditDocLink] = useState('');

  // --- DELETE ACTIVITY STATE ---
  const [confirmDeleteActivityId, setConfirmDeleteActivityId] = useState<string | null>(null);
  const [isDeletingActivityId, setIsDeletingActivityId] = useState<string | null>(null);

  // --- EVALUATION STRATEGY STATE ---
  const [selectedEvalActivity, setSelectedEvalActivity] = useState<AttendanceActivity | null>(null);
  const [isEvalWizardOpen, setIsEvalWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [evalRequirePin, setEvalRequirePin] = useState(false);
  const [evalPinCode, setEvalPinCode] = useState('');
  const [evalFeedbackFocus, setEvalFeedbackFocus] = useState<string[]>(['perfQuality', 'perfTimeliness', 'perfStaff', 'venue', 'facility', 'food', 'materials', 'overall']);
  const [evalFormMode, setEvalFormMode] = useState<'open' | 'strict'>('open');
  const [isSavingStrategy, setIsSavingStrategy] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<ActivityEvaluation | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const openEvalWizard = (act: AttendanceActivity) => {
    setSelectedEvalActivity(act);
    setEvalRequirePin(act.evaluationStrategy?.requirePin ?? false);
    setEvalPinCode(act.evaluationStrategy?.pinCode ?? Math.floor(1000 + Math.random() * 9000).toString());
    setEvalFeedbackFocus(act.evaluationStrategy?.feedbackFocus ?? ['perfQuality', 'perfTimeliness', 'perfStaff', 'venue', 'facility', 'food', 'materials', 'overall']);
    setEvalFormMode(act.evaluationStrategy?.formMode ?? 'open');
    setWizardStep(1);
    setIsEvalWizardOpen(true);
  };

  const handleSaveStrategy = async () => {
    if (!firestore || !selectedEvalActivity) return;
    setIsSavingStrategy(true);
    try {
      const updatedStrategy = {
        requirePin: evalRequirePin,
        pinCode: evalPinCode.trim() || '1234',
        feedbackFocus: evalFeedbackFocus,
        formMode: evalFormMode
      };

      const docRef = doc(firestore, 'unitActivities', selectedEvalActivity.id);
      await setDoc(docRef, {
        ...selectedEvalActivity,
        evaluationStrategy: updatedStrategy
      });

      toast({
        title: 'Strategy Saved',
        description: 'Activity evaluation strategy has been updated successfully.'
      });
      setWizardStep(3);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error',
        description: 'Failed to save evaluation strategy.',
        variant: 'destructive'
      });
    } finally {
      setIsSavingStrategy(false);
    }
  };

  // --- SESSION HANDLERS ---
  const handleAddSession = () => {
    const nextDay = newActivitySessions.length + 1;
    setNewActivitySessions([
      ...newActivitySessions,
      {
        id: `SESS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: format(new Date(), 'yyyy-MM-dd'),
        label: `Day ${nextDay} Session`,
        sessionType: 'WHOLE_DAY',
        requiresLogout: false,
        startTime: '08:00',
        endTime: '17:00'
      }
    ]);
  };

  const handleRemoveSession = (id: string) => {
    setNewActivitySessions(newActivitySessions.filter(s => s.id !== id));
  };

  const handleUpdateSession = (id: string, field: keyof ActivitySession, value: any) => {
    setNewActivitySessions(newActivitySessions.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleAddEditSession = () => {
    const nextDay = editActivitySessions.length + 1;
    setEditActivitySessions([
      ...editActivitySessions,
      {
        id: `SESS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: format(new Date(), 'yyyy-MM-dd'),
        label: `Day ${nextDay} Session`,
        sessionType: 'WHOLE_DAY',
        requiresLogout: false,
        startTime: '08:00',
        endTime: '17:00'
      }
    ]);
  };

  const handleRemoveEditSession = (id: string) => {
    setEditActivitySessions(editActivitySessions.filter(s => s.id !== id));
  };

  const handleUpdateEditSession = (id: string, field: keyof ActivitySession, value: any) => {
    setEditActivitySessions(editActivitySessions.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const getSessionsRange = (sessList: ActivitySession[]) => {
    if (sessList.length === 0) {
      return { start: new Date(), end: new Date() };
    }
    const times = sessList.map(s => {
      const start = new Date(`${s.date}T${s.startTime}:00`).getTime();
      const end = new Date(`${s.date}T${s.endTime}:00`).getTime();
      return { start, end };
    });
    const minStart = Math.min(...times.map(t => t.start));
    const maxEnd = Math.max(...times.map(t => t.end));
    return { start: new Date(minStart), end: new Date(maxEnd) };
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !userProfile) return;
    if (!newActivityName.trim()) {
      toast({ title: 'Validation Error', description: 'Please complete all form fields.', variant: 'destructive' });
      return;
    }
    if (newActivitySessions.length === 0) {
      toast({ title: 'Validation Error', description: 'Please add at least one session to this activity.', variant: 'destructive' });
      return;
    }

    const range = getSessionsRange(newActivitySessions);
    const start = range.start;
    const end = range.end;

    setIsCreatingActivity(true);
    try {
      const activityId = `ACT-${Date.now()}`;
      const docRef = doc(firestore, 'unitActivities', activityId);
      const newAct: AttendanceActivity = {
        id: activityId,
        name: newActivityName.trim(),
        startDateTime: start,
        endDateTime: end,
        lateThresholdMinutes: Number(lateThreshold),
        requiresLogout: newRequiresLogout,
        status: 'ACTIVE',
        unitId: userProfile.unitId || 'all',
        campusId: userProfile.campusId || 'all',
        createdAt: new Date(),
        createdBy: userProfile.id,
        sessions: newActivitySessions,
        documents: newActivityDocs
      };

      await setDoc(docRef, newAct);
      toast({ title: 'Activity Created', description: `Successfully created "${newActivityName}"` });
      setNewActivityName('');
      setNewActivityStart('');
      setNewActivityEnd('');
      setNewRequiresLogout(false);
      setNewActivitySessions([]);
      setNewActivityDocs([]);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to create activity.', variant: 'destructive' });
    } finally {
      setIsCreatingActivity(false);
    }
  };

  // --- EDIT & END ACTIVITY HANDLERS ---
  const openEditModal = (act: AttendanceActivity) => {
    setEditingActivity(act);
    setEditName(act.name);
    
    // Parse times for datetime-local input (format: yyyy-MM-ddTHH:mm)
    const startVal = act.startDateTime?.toDate 
      ? act.startDateTime.toDate() 
      : (act.startDateTime?.seconds ? new Date(act.startDateTime.seconds * 1000) : new Date(act.startDateTime));
    const endVal = act.endDateTime?.toDate 
      ? act.endDateTime.toDate() 
      : (act.endDateTime?.seconds ? new Date(act.endDateTime.seconds * 1000) : new Date(act.endDateTime));

    setEditStart(format(startVal, "yyyy-MM-dd'T'HH:mm"));
    setEditEnd(format(endVal, "yyyy-MM-dd'T'HH:mm"));
    setEditThreshold(String(act.lateThresholdMinutes || 0));
    setEditRequiresLogout(act.requiresLogout === true);

    if (act.sessions && act.sessions.length > 0) {
      setEditActivitySessions(act.sessions);
    } else {
      setEditActivitySessions([{
        id: 'default',
        date: format(startVal, 'yyyy-MM-dd'),
        label: 'Default Session',
        sessionType: 'WHOLE_DAY',
        requiresLogout: act.requiresLogout === true,
        startTime: format(startVal, 'HH:mm'),
        endTime: format(endVal, 'HH:mm')
      }]);
    }

    if (act.documents) {
      setEditActivityDocs(act.documents);
    } else {
      setEditActivityDocs([]);
    }
  };

  const handleEditActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingActivity) return;

    if (!editName.trim()) {
      toast({ title: 'Validation Error', description: 'Please complete all form fields.', variant: 'destructive' });
      return;
    }

    if (editActivitySessions.length === 0) {
      toast({ title: 'Validation Error', description: 'Please add at least one session to this activity.', variant: 'destructive' });
      return;
    }

    const range = getSessionsRange(editActivitySessions);
    const start = range.start;
    const end = range.end;

    setIsSavingEdit(true);
    try {
      const docRef = doc(firestore, 'unitActivities', editingActivity.id);
      
      const updatedActivity: AttendanceActivity = {
        ...editingActivity,
        name: editName.trim(),
        startDateTime: start,
        endDateTime: end,
        lateThresholdMinutes: Number(editThreshold),
        requiresLogout: editRequiresLogout,
        sessions: editActivitySessions,
        documents: editActivityDocs
      };

      await setDoc(docRef, updatedActivity);
      toast({ title: 'Activity Updated', description: `Successfully updated "${editName}"` });
      setEditingActivity(null);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to update activity.', variant: 'destructive' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleEndActivity = async (act: AttendanceActivity) => {
    if (!firestore || !window.confirm(`Are you sure you want to end "${act.name}"? This will disable scanning and mark it as COMPLETED.`)) return;
    try {
      const docRef = doc(firestore, 'unitActivities', act.id);
      
      const updatedActivity: AttendanceActivity = {
        ...act,
        status: 'COMPLETED'
      };

      await setDoc(docRef, updatedActivity);
      toast({ title: 'Activity Ended', description: `Successfully completed "${act.name}"` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to end activity.', variant: 'destructive' });
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!firestore) return;
    setIsDeletingActivityId(activityId);
    try {
      // 1. Delete all attendance logs matching this activityId
      const logsCol = collection(firestore, 'unitActivityAttendanceLogs');
      const q = query(logsCol, where('activityId', '==', activityId));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(docSnap => 
        deleteDoc(doc(firestore, 'unitActivityAttendanceLogs', docSnap.id))
      );
      await Promise.all(deletePromises);

      // 2. Delete the activity document itself
      await deleteDoc(doc(firestore, 'unitActivities', activityId));

      // 3. Reset selected activity filter if deleted activity was active
      if (selectedActivityId === activityId) {
        setSelectedActivityId('all');
      }

      toast({ 
        title: 'Activity Deleted', 
        description: 'Activity and its attendance logs have been permanently deleted.' 
      });
    } catch (err) {
      console.error(err);
      toast({ 
        title: 'Error', 
        description: 'Failed to delete activity.', 
        variant: 'destructive' 
      });
    } finally {
      setConfirmDeleteActivityId(null);
      setIsDeletingActivityId(null);
    }
  };

  // --- 2. ATTENDANCE LOGS CORRELATION ---
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
  const [selectedSessionIdFilter, setSelectedSessionIdFilter] = useState<string>('all');

  useEffect(() => {
    setSelectedSessionIdFilter('all');
  }, [selectedActivityId]);

  const activeActivity = useMemo(() => {
    return sortedActivities?.find(a => a.id === selectedActivityId) || null;
  }, [sortedActivities, selectedActivityId]);

  const logsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'unitActivityAttendanceLogs');
    if (selectedActivityId === 'all') {
      return base;
    }
    return query(base, where('activityId', '==', selectedActivityId));
  }, [firestore, selectedActivityId]);
  const { data: attendanceLogs } = useCollection<ActivityAttendanceLog>(logsQuery);

  const sortedLogs = useMemo(() => {
    if (!attendanceLogs) return [];
    let logs = [...attendanceLogs];
    if (selectedSessionIdFilter !== 'all') {
      logs = logs.filter(l => l.sessionId === selectedSessionIdFilter);
    }
    return logs.sort((a, b) => {
      const timeA = a.scannedAt?.toDate ? a.scannedAt.toDate().getTime() : (a.scannedAt?.seconds ? a.scannedAt.seconds * 1000 : new Date(a.scannedAt).getTime());
      const timeB = b.scannedAt?.toDate ? b.scannedAt.toDate().getTime() : (b.scannedAt?.seconds ? b.scannedAt.seconds * 1000 : new Date(b.scannedAt).getTime());
      return timeB - timeA;
    });
  }, [attendanceLogs, selectedSessionIdFilter]);

  // Fetch evaluations
  const evaluationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'unitActivityEvaluations');
  }, [firestore]);
  const { data: evaluations } = useCollection<ActivityEvaluation>(evaluationsQuery);

  const filteredEvaluations = useMemo(() => {
    if (!evaluations) return [];
    if (selectedActivityId === 'all') return evaluations;
    return evaluations.filter(e => e.activityId === selectedActivityId);
  }, [evaluations, selectedActivityId]);

  const punctualityData = useMemo(() => {
    const counts = { ON_TIME: 0, LATE: 0, OUTSIDE_WINDOW: 0 };
    const logsToCount = selectedActivityId === 'all' 
      ? sortedLogs 
      : sortedLogs.filter(l => l.activityId === selectedActivityId);
    logsToCount.forEach(l => {
      if (l.status in counts) {
        counts[l.status as keyof typeof counts]++;
      }
    });
    return [
      { name: 'On Time', value: counts.ON_TIME, color: '#10b981' },
      { name: 'Late', value: counts.LATE, color: '#f59e0b' },
      { name: 'Outside Window', value: counts.OUTSIDE_WINDOW, color: '#ef4444' },
    ].filter(d => d.value > 0);
  }, [sortedLogs, selectedActivityId]);

  const genderData = useMemo(() => {
    const counts: Record<string, number> = {};
    const logsToCount = selectedActivityId === 'all' 
      ? sortedLogs 
      : sortedLogs.filter(l => l.activityId === selectedActivityId);
    logsToCount.forEach(l => {
      const sex = l.sex || 'Did not specify';
      counts[sex] = (counts[sex] || 0) + 1;
    });
    return Object.entries(counts || {}).map(([name, value]) => ({
      name,
      value,
      color: name === 'Male' ? '#3b82f6' : name === 'Female' ? '#ec4899' : '#8b5cf6'
    }));
  }, [sortedLogs, selectedActivityId]);

  const averageRatingsObj = useMemo(() => {
    if (filteredEvaluations.length === 0) {
      return { 
        objectives: 0, speaker: 0, topic: 0, 
        perfQuality: 0, perfTimeliness: 0, perfStaff: 0, 
        venue: 0, facility: 0, food: 0, materials: 0, overall: 0 
      };
    }
    let sumObj = 0, countObj = 0;
    let sumSpk = 0, countSpk = 0;
    let sumTop = 0, countTop = 0;
    let sumPQ = 0, countPQ = 0;
    let sumPT = 0, countPT = 0;
    let sumPS = 0, countPS = 0;
    let sumVen = 0, countVen = 0;
    let sumFac = 0, countFac = 0;
    let sumFood = 0, countFood = 0;
    let sumMat = 0, countMat = 0;
    let sumOvr = 0, countOvr = 0;

    filteredEvaluations.forEach(e => {
      if (e.ratingObjectives) { sumObj += e.ratingObjectives; countObj++; }
      if (e.ratingSpeaker) { sumSpk += e.ratingSpeaker; countSpk++; }
      if (e.ratingTopic) { sumTop += e.ratingTopic; countTop++; }
      if (e.ratingPerfQuality) { sumPQ += e.ratingPerfQuality; countPQ++; }
      if (e.ratingPerfTimeliness) { sumPT += e.ratingPerfTimeliness; countPT++; }
      if (e.ratingPerfStaff) { sumPS += e.ratingPerfStaff; countPS++; }
      if (e.ratingVenue) { sumVen += e.ratingVenue; countVen++; }
      if (e.ratingFacility) { sumFac += e.ratingFacility; countFac++; }
      if (e.ratingFood) { sumFood += e.ratingFood; countFood++; }
      if (e.ratingMaterials) { sumMat += e.ratingMaterials; countMat++; }
      if (e.ratingOverall) { sumOvr += e.ratingOverall; countOvr++; }
    });

    return {
      objectives: countObj > 0 ? parseFloat((sumObj / countObj).toFixed(2)) : 0,
      speaker: countSpk > 0 ? parseFloat((sumSpk / countSpk).toFixed(2)) : 0,
      topic: countTop > 0 ? parseFloat((sumTop / countTop).toFixed(2)) : 0,
      perfQuality: countPQ > 0 ? parseFloat((sumPQ / countPQ).toFixed(2)) : 0,
      perfTimeliness: countPT > 0 ? parseFloat((sumPT / countPT).toFixed(2)) : 0,
      perfStaff: countPS > 0 ? parseFloat((sumPS / countPS).toFixed(2)) : 0,
      venue: countVen > 0 ? parseFloat((sumVen / countVen).toFixed(2)) : 0,
      facility: countFac > 0 ? parseFloat((sumFac / countFac).toFixed(2)) : 0,
      food: countFood > 0 ? parseFloat((sumFood / countFood).toFixed(2)) : 0,
      materials: countMat > 0 ? parseFloat((sumMat / countMat).toFixed(2)) : 0,
      overall: countOvr > 0 ? parseFloat((sumOvr / countOvr).toFixed(2)) : 0,
    };
  }, [filteredEvaluations]);

  const focusList = useMemo(() => {
    return activeActivity?.evaluationStrategy?.feedbackFocus || ['perfQuality', 'perfTimeliness', 'perfStaff', 'venue', 'facility', 'food', 'materials', 'overall'];
  }, [activeActivity]);

  const averageRatings = useMemo(() => {
    if (filteredEvaluations.length === 0) return [];
    
    const { objectives, speaker, topic, perfQuality, perfTimeliness, perfStaff, venue, facility, food, materials, overall } = averageRatingsObj;
    const result = [];
    if (focusList.includes('perfQuality') && perfQuality > 0) result.push({ category: 'Quality of Service', rating: perfQuality });
    if (focusList.includes('perfTimeliness') && perfTimeliness > 0) result.push({ category: 'Timeliness of Service', rating: perfTimeliness });
    if (focusList.includes('perfStaff') && perfStaff > 0) result.push({ category: 'Staff Behavior', rating: perfStaff });
    if (focusList.includes('venue') && venue > 0) result.push({ category: 'Venue Quality', rating: venue });
    if (focusList.includes('facility') && facility > 0) result.push({ category: 'Facility Quality', rating: facility });
    if (focusList.includes('food') && food > 0) result.push({ category: 'Food Quality', rating: food });
    if (focusList.includes('materials') && materials > 0) result.push({ category: 'Material Quality', rating: materials });
    if (focusList.includes('overall') && overall > 0) result.push({ category: 'Overall Satisfaction', rating: overall });
    // Legacy support
    if (focusList.includes('objectives') && objectives > 0) result.push({ category: 'Objectives Met', rating: objectives });
    if (focusList.includes('speaker') && speaker > 0) result.push({ category: 'Speaker Delivery', rating: speaker });
    if (focusList.includes('speaker') && topic > 0) result.push({ category: 'Topic Relevance', rating: topic });

    return result;
  }, [filteredEvaluations, averageRatingsObj, focusList]);

  // --- 3. CAMERA QR SCANNING MODULE (CDN LOADED) ---
  const [isScannerLibLoaded, setIsScannerLibLoaded] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'warning' | 'error' | 'none';
    message: string;
    details?: {
      name: string;
      office: string;
      time: string;
      status: string;
    };
  }>({ status: 'none', message: 'Ready to scan QR codes.' });

  const html5QrCodeScannerRef = useRef<any>(null);

  // Load html5-qrcode library from CDN dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).Html5Qrcode) {
      setIsScannerLibLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode";
    script.async = true;
    script.onload = () => setIsScannerLibLoaded(true);
    document.body.appendChild(script);

    return () => {
      // Clean up script if component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const startScanning = () => {
    if (!isScannerLibLoaded || !(window as any).Html5Qrcode) return;
    if (selectedActivityId === 'all') {
      toast({
        title: "Scanning Locked",
        description: "Please select a specific active activity to scan against.",
        variant: "destructive"
      });
      return;
    }

    setScannerActive(true);
    setScanResult({ status: 'none', message: 'Initializing camera stream...' });

    setTimeout(() => {
      try {
        const scanner = new (window as any).Html5Qrcode("reader-container");

        scanner.start(
          { facingMode: "environment" },
          {
            fps: 24,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0
          },
          (decodedText: string) => {
            handleScanSuccess(decodedText);
          },
          (errorMessage: string) => {
            // standard polling camera logs can be ignored
          }
        ).then(() => {
          html5QrCodeScannerRef.current = scanner;
        }).catch((err: any) => {
          console.error("Camera Start Error:", err);
          setScanResult({ status: 'error', message: `Camera access failed: ${err.message || err}. Please ensure camera permission is granted and you are using a secure connection (HTTPS).` });
          setScannerActive(false);
        });
      } catch (err: any) {
        console.error("Camera Init Error:", err);
        setScanResult({ status: 'error', message: `Camera access failed: ${err.message || err}` });
        setScannerActive(false);
      }
    }, 100);
  };

  const stopScanning = () => {
    if (html5QrCodeScannerRef.current) {
      const scanner = html5QrCodeScannerRef.current;
      html5QrCodeScannerRef.current = null;
      try {
        scanner.stop().catch((e: any) => {
          console.warn("Scanner stop promise catch:", e);
        });
      } catch (e) {
        console.error("Scanner stop error:", e);
      }
    }
    setScannerActive(false);
    setScanResult({ status: 'none', message: 'Camera stream disconnected.' });
  };

  // Turn off scanner if tab changes
  useEffect(() => {
    if (activeTab !== 'scanner') {
      stopScanning();
    }
  }, [activeTab]);

  const handleScanError = (err: any) => {
    // Silent errors: standard polling camera logs can be ignored
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (!firestore || !activeActivity) return;

    try {
      // 1. Parse JSON payload
      let payload: any;
      try {
        payload = JSON.parse(decodedText);
      } catch (e) {
        setScanResult({ status: 'error', message: 'Rejected: Scanned content is not a valid RSU QR payload.' });
        return;
      }

      const isMinified = 'u' in payload && 'f' in payload && 't' in payload && 's' in payload;

      const userId = isMinified ? payload.u : payload.userId;
      const deviceFingerprint = isMinified ? payload.f : payload.deviceFingerprint;
      const timestamp = isMinified ? payload.t : payload.timestamp;
      const signature = isMinified ? payload.s : payload.signature;

      if (!userId || !deviceFingerprint || !timestamp || !signature) {
        setScanResult({ status: 'error', message: 'Rejected: Missing security properties in QR payload.' });
        return;
      }

      if (Date.now() - timestamp > 70000) {
        setScanResult({ status: 'error', message: 'Rejected: Expired QR token. Use the rotating code from the active phone app.' });
        return;
      }

      const computedSignature = await generatePayloadSignature(userId, timestamp, deviceFingerprint);
      if (signature !== computedSignature) {
        setScanResult({ status: 'error', message: 'Security Rejection: Invalid QR signature (tamper detected).' });
        return;
      }

      const bindingRef = doc(firestore, 'attendanceDeviceBindings', deviceFingerprint);
      const bindingSnap = await getDoc(bindingRef);

      if (!bindingSnap.exists()) {
        setScanResult({ status: 'error', message: 'Rejected: Untracked Device Fingerprint. Binding registration required.' });
        return;
      }

      const officialBinding = bindingSnap.data() as DeviceBinding;
      if (officialBinding.userId !== userId) {
        setScanResult({ status: 'error', message: 'Security Rejection: Device Lock active. This phone is locked to another user.' });
        return;
      }

      const userName = officialBinding.userName;
      const unitId = officialBinding.unitId;
      const unitName = officialBinding.unitName;
      const finalContact = officialBinding.contactNumber || 'N/A';
      const finalSex = officialBinding.sex || 'Did not specify';

      const session = resolveActiveSession(activeActivity);
      const scanTime = Date.now();
      const actStart = parseSessionTime(session.date, session.startTime);
      const actEnd = parseSessionTime(session.date, session.endTime);

      let logStatus: 'ON_TIME' | 'LATE' | 'OUTSIDE_WINDOW' = 'ON_TIME';
      if (activeActivity.lateThresholdMinutes === 0) {
        logStatus = scanTime <= actEnd ? 'ON_TIME' : 'OUTSIDE_WINDOW';
      } else {
        const lateCutoff = actStart + (activeActivity.lateThresholdMinutes * 60000);
        if (scanTime < actStart || scanTime <= lateCutoff) {
          logStatus = 'ON_TIME';
        } else if (scanTime <= actEnd) {
          logStatus = 'LATE';
        } else {
          logStatus = 'OUTSIDE_WINDOW';
        }
      }

      const logId = `${activeActivity.id}_${session.id}_${userId}`;
      const logRef = doc(firestore, 'unitActivityAttendanceLogs', logId);

      const existingLog = await getDoc(logRef);
      if (existingLog.exists()) {
        const existingData = existingLog.data() as ActivityAttendanceLog;
        if (activeActivity.requiresLogout && !existingData.logoutAt) {
          const logoutTime = new Date();
          await setDoc(logRef, { ...existingData, logoutAt: logoutTime });
          setScanResult({
            status: 'success',
            message: `Logout recorded for ${userName} (${session.label}).`,
            details: { name: userName, office: unitName, time: format(logoutTime, 'hh:mm a'), status: 'LOGOUT' }
          });
        } else if (activeActivity.requiresLogout && existingData.logoutAt) {
          setScanResult({
            status: 'warning',
            message: `${userName} has already logged in and out. Duplicate scan ignored.`,
            details: { name: userName, office: unitName, time: format(new Date(), 'hh:mm a'), status: 'DUPLICATE' }
          });
        } else {
          setScanResult({
            status: 'warning',
            message: `${userName} has already signed in for ${session.label}. Duplicate scan ignored.`,
            details: { name: userName, office: unitName, time: format(new Date(), 'hh:mm a'), status: 'DUPLICATE' }
          });
        }
        return;
      }

      const newLog: ActivityAttendanceLog = {
        id: logId,
        activityId: activeActivity.id,
        userId,
        userName,
        unitId,
        unitName,
        deviceFingerprint,
        scannedAt: new Date(),
        status: logStatus,
        contactNumber: finalContact,
        sex: finalSex,
        sessionId: session.id,
        sessionLabel: session.label
      };

      await setDoc(logRef, newLog);

      setScanResult({
        status: logStatus === 'ON_TIME' ? 'success' : 'warning',
        message: logStatus === 'ON_TIME'
          ? `Login verified! Signed in on time (${session.label}).${ activeActivity.requiresLogout ? ' Scan again to logout.' : '' }`
          : logStatus === 'LATE'
          ? `Late login recorded (${session.label}). Threshold was ${activeActivity.lateThresholdMinutes} mins.`
          : `Scan outside session window — recorded as OUTSIDE WINDOW.`,
        details: {
          name: userName,
          office: unitName,
          time: format(new Date(), 'hh:mm a'),
          status: logStatus === 'ON_TIME' ? 'LOGIN ON TIME' : logStatus === 'LATE' ? 'LOGIN LATE' : 'OUTSIDE WINDOW'
        }
      });

    } catch (err: any) {
      console.error(err);
      setScanResult({ status: 'error', message: `Internal Verification Error: ${err.message}` });
    }
  };

  // --- 4. EXPORT & RESET BINDINGS ACTIONS ---
  const handleResetBinding = async (fingerprint: string, userName: string) => {
    if (!firestore || !window.confirm(`Are you sure you want to reset the device binding lock for ${userName}?`)) return;
    try {
      const docRef = doc(firestore, 'attendanceDeviceBindings', fingerprint);
      await deleteDoc(docRef);
      toast({ title: 'Binding Reset', description: `Device lock for ${userName} cleared.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to reset device binding.', variant: 'destructive' });
    }
  };

  const handleExportCSV = () => {
    if (!sortedLogs || sortedLogs.length === 0) {
      toast({ title: 'No Data', description: 'There are no attendance records to export.', variant: 'destructive' });
      return;
    }

    const activityName = activeActivity?.name || 'All-Sessions';
    const hasLogout = activeActivity?.requiresLogout === true;
    const headers = ['Name', 'Unit/Office', 'Contact Number', 'Sex', 'Login Time', ...(hasLogout ? ['Logout Time'] : []), 'Attendance Status', 'Device Fingerprint'];
    const csvContent = [
      headers,
      ...sortedLogs.map(log => {
        const loginStr = log.scannedAt?.toDate 
          ? format(log.scannedAt.toDate(), 'MM/dd/yyyy hh:mm a') 
          : 'N/A';
        const logoutStr = log.logoutAt?.toDate
          ? format(log.logoutAt.toDate(), 'MM/dd/yyyy hh:mm a')
          : log.logoutAt ? format(new Date(log.logoutAt), 'MM/dd/yyyy hh:mm a') : 'Not logged out';
        return [
          log.userName, 
          log.unitName, 
          log.contactNumber || 'N/A', 
          log.sex || 'Did not specify', 
          loginStr,
          ...(hasLogout ? [logoutStr] : []),
          log.status, 
          log.deviceFingerprint
        ];
      })
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `RSU_Attendance_${activityName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintAttendanceSheet = () => {
    if (!activeActivity) {
      toast({ title: 'Print Error', description: 'Please select a specific active activity to print its attendance sheet.', variant: 'destructive' });
      return;
    }

    if (activeActivity.status !== 'COMPLETED') {
      toast({ title: 'Print Locked', description: 'Printing is only allowed once the activity attendance session has ended (status is COMPLETED).', variant: 'destructive' });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Pop-up Blocked', description: 'Please allow pop-ups to print the attendance sheet.', variant: 'destructive' });
      return;
    }

    const activityName = activeActivity.name;
    const unitName = activeActivity.unitId === 'all' ? 'University Wide' : (units?.find(u => u.id === activeActivity.unitId)?.name || 'Office/Unit');
    let startStr = activeActivity.startDateTime?.toDate 
      ? format(activeActivity.startDateTime.toDate(), 'MMMM dd, yyyy')
      : format(new Date(activeActivity.startDateTime), 'MMMM dd, yyyy');
    let timeStr = activeActivity.startDateTime?.toDate && activeActivity.endDateTime?.toDate
      ? `${format(activeActivity.startDateTime.toDate(), 'hh:mm a')} - ${format(activeActivity.endDateTime.toDate(), 'hh:mm a')}`
      : 'N/A';
    let printSessionLabel = '';

    if (selectedSessionIdFilter !== 'all' && activeActivity.sessions) {
      const activeSess = activeActivity.sessions.find(s => s.id === selectedSessionIdFilter);
      if (activeSess) {
        printSessionLabel = `(${activeSess.label})`;
        const sessDate = new Date(`${activeSess.date}T00:00:00`);
        startStr = format(sessDate, 'MMMM dd, yyyy');
        try {
          const tStart = format(new Date(`2000-01-01T${activeSess.startTime}:00`), 'hh:mm a');
          const tEnd = format(new Date(`2000-01-01T${activeSess.endTime}:00`), 'hh:mm a');
          timeStr = `${tStart} - ${tEnd}`;
        } catch (e) {}
      }
    }

    const logs = sortedLogs || [];
    const isLogoutMode = activeActivity.requiresLogout === true;
    const ROWS_PER_PAGE = 25;

    // Chunk logs into pages of ROWS_PER_PAGE
    const pages: ActivityAttendanceLog[][] = [];
    if (logs.length === 0) {
      pages.push([]);
    } else {
      for (let i = 0; i < logs.length; i += ROWS_PER_PAGE) {
        pages.push(logs.slice(i, i + ROWS_PER_PAGE));
      }
    }

    let htmlContent = '';

    pages.forEach((pageLogs, pageIdx) => {
      let tableRowsHtml = '';

      for (let i = 0; i < ROWS_PER_PAGE; i++) {
        const log = pageLogs[i];
        const overallIndex = pageIdx * ROWS_PER_PAGE + i + 1;

        if (log) {
          const checkInTime = log.scannedAt?.toDate 
            ? format(log.scannedAt.toDate(), 'hh:mm a') 
            : 'N/A';

          if (isLogoutMode) {
            const checkOutTime = log.logoutAt?.toDate
              ? format(log.logoutAt.toDate(), 'hh:mm a')
              : log.logoutAt ? format(new Date(log.logoutAt), 'hh:mm a') : 'Not logged out';

            tableRowsHtml += `
              <tr>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; font-size: 11px;">${overallIndex}</td>
                <td style="border: 1px solid black; padding: 6px; font-weight: bold; font-size: 11px; text-transform: uppercase; text-align: left;">${log.userName}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 11px; font-weight: bold;">${log.contactNumber || 'N/A'}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 11px;">${log.sex || 'Did not specify'}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 10px; font-weight: bold;">${checkInTime}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 10px; font-weight: bold;">${checkOutTime}</td>
              </tr>
            `;
          } else {
            tableRowsHtml += `
              <tr>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; font-size: 11px;">${overallIndex}</td>
                <td style="border: 1px solid black; padding: 6px; font-weight: bold; font-size: 11px; text-transform: uppercase; text-align: left;">${log.userName}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 11px; font-weight: bold;">${log.contactNumber || 'N/A'}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 11px;">${log.sex || 'Did not specify'}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center;">
                  <span style="font-family: 'Georgia', serif; font-style: italic; font-size: 10px; font-weight: normal; color: #111;">
                    ${log.userName}
                  </span>
                  <span style="font-size: 8px; color: #666; display: block; margin-top: 2px;">
                    ✓ Verified (${checkInTime})
                  </span>
                </td>
              </tr>
            `;
          }
        } else {
          tableRowsHtml += `
            <tr>
              <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; font-size: 11px; color: #ccc;">${overallIndex}</td>
              <td style="border: 1px solid black; padding: 6px;">&nbsp;</td>
              <td style="border: 1px solid black; padding: 6px;">&nbsp;</td>
              <td style="border: 1px solid black; padding: 6px;">&nbsp;</td>
              <td style="border: 1px solid black; padding: 6px;">&nbsp;</td>
              ${isLogoutMode ? '<td style="border: 1px solid black; padding: 6px;">&nbsp;</td>' : ''}
            </tr>
          `;
        }
      }

      const tableHeaderHtml = isLogoutMode ? `
        <thead>
          <tr>
            <th style="width: 6%;">No.</th>
            <th style="width: 34%;">Name</th>
            <th style="width: 20%;">Contact Number</th>
            <th style="width: 10%;">Sex</th>
            <th style="width: 15%;">Login Time</th>
            <th style="width: 15%;">Logout Time</th>
          </tr>
        </thead>
      ` : `
        <thead>
          <tr>
            <th style="width: 6%;">No.</th>
            <th style="width: 40%;">Name</th>
            <th style="width: 22%;">Contact Number</th>
            <th style="width: 12%;">Sex</th>
            <th style="width: 20%;">Signature</th>
          </tr>
        </thead>
      `;

      const pageBreakHtml = pageIdx < pages.length - 1 ? '<div class="page-break"></div>' : '';

      htmlContent += `
        <div class="print-page">
          <!-- Header -->
          <div class="header-container">
            <div class="header-logo-left">
              <img src="/rsulogo.png" />
            </div>
            <div class="header-text">
              <p>Republic of the Philippines</p>
              <h2>ROMBLON STATE UNIVERSITY</h2>
              <p>Romblon, Philippines</p>
            </div>
            <div class="header-logo-right">
              <img src="/ISOlogo.jpg" />
            </div>
          </div>

          <!-- Document Title -->
          <div class="title-box">
            <h3>ATTENDANCE SHEET</h3>
          </div>

          <!-- Metadata info lines -->
          <div class="metadata-container">
            <div class="metadata-row">
              <span>Unit:</span>
              <div class="metadata-line">${unitName}</div>
            </div>
            <div class="metadata-row">
              <span>Title of Activity:</span>
              <div class="metadata-line">${activityName} ${printSessionLabel}</div>
            </div>
            <div style="display: flex; gap: 20px;">
              <div class="metadata-row" style="flex: 2;">
                <span>Date of Activity:</span>
                <div class="metadata-line">${startStr}</div>
              </div>
              <div class="metadata-row" style="flex: 1.5;">
                <span>Time of Activity:</span>
                <div class="metadata-line">${timeStr}</div>
              </div>
            </div>
          </div>

          <!-- Data Privacy Statement Box -->
          <div class="privacy-box">
            <div class="privacy-title">Data Privacy Statement</div>
            Romblon State University respects your right to privacy and is committed to protecting the confidentiality of your personal information. By filling out this form, you are consenting to the collection, processing, and use of the information in accordance with this privacy notice. The information you have provided is used for any or all of the following: access provision, attendance, monitoring, evaluation, documentation, and communication purposes. The University shall only retain the said personal information until it serves its purpose, after which it shall be securely disposed of. Suppose you have concerns and queries on Data Privacy, email dpo@rsu.edu.ph. Rest assured that we will respect and protect the confidentiality and privacy of these data and information as required by the Data Privacy Act of 2012 (R.A 10173).
          </div>

          <!-- Main Table -->
          <table>
            ${tableHeaderHtml}
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <!-- Footer QAO template references -->
          <div class="footer-container">
            <div class="footer-left">
              <div>QAO-01-022</div>
              <div class="creation-date">Creation Date: 2021-02-14</div>
              <div class="revision-date">Revision Date: 2022-01-24</div>
            </div>
            <div style="flex: 1; text-align: center; font-size: 8.5px; font-weight: bold; color: #555;">
              Page ${pageIdx + 1} of ${pages.length}
            </div>
            <div class="footer-right">
              AT No. _________________
            </div>
          </div>
        </div>
        ${pageBreakHtml}
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Sheet - ${activityName}</title>
          <style>
            @media print {
              body { margin: 0; font-family: Arial, sans-serif; color: black; background-color: white; }
              .no-print { display: none !important; }
              @page {
                size: 8.5in 13in portrait;
                margin: 0.3in 0.4in 0.3in 0.4in;
              }
              .page-break {
                page-break-before: always;
                break-before: page;
              }
            }
            body { font-family: Arial, sans-serif; padding: 20px; color: black; background-color: white; line-height: 1.2; }
            .print-page {
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }
            .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 8px; margin-bottom: 15px; }
            .header-logo-left { width: 65px; text-align: left; }
            .header-logo-left img { height: 55px; object-fit: contain; }
            .header-text { text-align: center; flex: 1; margin: 0 1.1in; }
            .header-text p { margin: 0; font-size: 10px; text-transform: uppercase; font-weight: normal; letter-spacing: 0.5px; }
            .header-text h2 { margin: 2px 0; font-size: 14px; font-weight: bold; letter-spacing: 0.5px; }
            .header-logo-right { width: 95px; text-align: right; }
            .header-logo-right img { height: 55px; object-fit: contain; }
            
            .title-box { text-align: center; margin-bottom: 12px; }
            .title-box h3 { margin: 0; font-size: 14px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }

            .metadata-container { margin-bottom: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .metadata-row { margin-bottom: 6px; display: flex; align-items: flex-end; }
            .metadata-line { border-bottom: 1px solid black; flex: 1; padding-bottom: 2px; padding-left: 8px; font-weight: normal; text-transform: uppercase; }
            
            .privacy-box { 
              border: 1px solid black; 
              padding: 8px; 
              font-size: 8.5px; 
              text-align: justify; 
              margin-bottom: 12px; 
              background-color: #fcfcfc;
              line-height: 1.3;
            }
            .privacy-title {
              font-weight: bold;
              text-align: center;
              margin-bottom: 3px;
              text-transform: uppercase;
            }

            table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 11px; }
            th { 
              background-color: #e5e7eb; 
              border: 1px solid black; 
              padding: 6px; 
              text-align: center; 
              text-transform: uppercase; 
              font-size: 10px; 
              font-weight: bold; 
            }
            td { vertical-align: middle; height: 22px; }
            
            .footer-container { 
              margin-top: 15px; 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              font-size: 8.5px; 
              text-transform: uppercase; 
              font-weight: bold;
              line-height: 1.3;
            }
            .footer-left { text-align: left; }
            .footer-left .creation-date { font-weight: normal; text-transform: none; }
            .footer-left .revision-date { font-weight: normal; text-transform: none; }
            .footer-right { text-align: right; font-size: 9.5px; }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Search logic for device bindings
  const [bindingSearch, setBindingSearch] = useState('');
  const filteredBindings = useMemo(() => {
    if (!deviceBindings) return [];
    if (!bindingSearch.trim()) return deviceBindings;
    const q = bindingSearch.toLowerCase();
    return deviceBindings.filter(b => 
      b.userName.toLowerCase().includes(q) || 
      b.unitName.toLowerCase().includes(q) || 
      b.id.toLowerCase().includes(q)
    );
  }, [deviceBindings, bindingSearch]);

  return (
    <div className="space-y-6">
      <style>{`
        .recharts-text.recharts-label { font-size: 11px; font-weight: 700; fill: #64748b; }
        @media (max-width: 640px) { .recharts-text.recharts-label { font-size: 8px; } }
      `}</style>
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-5 bg-gradient-to-r from-emerald-800 to-[#1B6535] rounded-2xl shadow-lg border border-emerald-700 gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-400" />
            UNIT ACTIVITY ATTENDANCE MANAGER
          </h2>
          <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mt-0.5">
            RSU Device-Locked Event Check-in
          </p>
        </div>

        {/* Global Activity Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase text-emerald-100 tracking-wider">Active Activity:</span>
          <select 
            value={selectedActivityId} 
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="h-9 px-3 bg-white font-extrabold text-xs text-slate-800 border-none shadow-md rounded-xl outline-none"
          >
            <option value="all">📁 All activities / logs</option>
            {sortedActivities?.map(act => (
              <option key={act.id} value={act.id}>📍 {act.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border shadow-inner rounded-xl w-max flex gap-1 h-10">
          <TabsTrigger value="activities" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8">
            <Calendar className="h-3.5 w-3.5" /> Session Manager
          </TabsTrigger>
          <TabsTrigger value="scanner" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8">
            <Camera className="h-3.5 w-3.5" /> Live QR Scanner
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8">
            <Users className="h-3.5 w-3.5" /> Attendance Logs
          </TabsTrigger>
          <TabsTrigger value="registry" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8">
            <Smartphone className="h-3.5 w-3.5" /> Device Lock Registry
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8">
            <Sparkles className="h-3.5 w-3.5" /> Decision Support
          </TabsTrigger>
        </TabsList>

        {/* ==================== SUB-TAB 1: SESSION MANAGER ==================== */}
        <TabsContent value="activities" className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create Activity Form */}
            <Card className="shadow-md border-slate-200/80 lg:col-span-1">
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-xs font-black uppercase text-slate-700">Setup New Activity Session</CardTitle>
                <CardDescription className="text-[10px] text-slate-500">Configure cutoff time and threshold values.</CardDescription>
              </CardHeader>

              <form onSubmit={handleCreateActivity}>
                <CardContent className="space-y-4 pt-6">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Activity Name</label>
                    <Input 
                      placeholder="e.g. QMS Audit Briefing"
                      value={newActivityName}
                      onChange={(e) => setNewActivityName(e.target.value)}
                      className="h-10 text-xs font-bold bg-white border-slate-200"
                    />
                  </div>

                  {/* Threshold */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Late Threshold (minutes)</label>
                    <Input 
                      type="number"
                      min="0"
                      value={lateThreshold}
                      onChange={(e) => setLateThreshold(e.target.value)}
                      className="h-10 text-xs font-bold bg-white border-slate-200"
                    />
                  </div>

                  {/* Documents Section */}
                  <div className="space-y-2 pt-2 border-t border-slate-150">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Document Links (Google Drive)</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Description"
                        value={docDesc}
                        onChange={(e) => setDocDesc(e.target.value)}
                        className="text-xs h-9 bg-white"
                      />
                      <Input
                        placeholder="Google Drive Link"
                        value={docLink}
                        onChange={(e) => setDocLink(e.target.value)}
                        className="text-xs h-9 bg-white"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (!docDesc.trim() || !docLink.trim()) return;
                          setNewActivityDocs([...newActivityDocs, { description: docDesc.trim(), googleDriveLink: docLink.trim() }]);
                          setDocDesc('');
                          setDocLink('');
                        }}
                        className="h-9 px-3 bg-[#1B6535] hover:bg-[#154e29]"
                      >
                        +
                      </Button>
                    </div>
                    {newActivityDocs.length > 0 && (
                      <div className="p-2 border rounded-xl bg-slate-50 space-y-1">
                        {newActivityDocs.map((doc, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-slate-700">
                            <span className="truncate max-w-[180px]">{doc.description}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setNewActivityDocs(newActivityDocs.filter((_, i) => i !== idx))}
                              className="h-5 w-5 p-0 text-rose-600 hover:text-rose-800"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sessions Config Section */}
                  <div className="space-y-3 pt-2 border-t border-slate-150">
                    <div className="flex justify-between items-center">
                      <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Sessions ({newActivitySessions.length})</label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddSession}
                        className="h-7 text-[9px] font-black uppercase px-2.5 bg-white border-slate-200"
                      >
                        + Add Session
                      </Button>
                    </div>

                    {newActivitySessions.length === 0 ? (
                      <p className="text-[9.5px] text-slate-400 italic">No sessions added yet. Please add at least one session.</p>
                    ) : (
                      <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                        {newActivitySessions.map((session, idx) => (
                          <div key={session.id} className="p-3 border rounded-xl bg-slate-50 space-y-2 relative">
                            <button
                              type="button"
                              onClick={() => handleRemoveSession(session.id)}
                              className="absolute top-2 right-2 text-rose-500 hover:text-rose-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[8px] font-bold text-slate-500 uppercase">Label</label>
                                <Input
                                  value={session.label}
                                  onChange={(e) => handleUpdateSession(session.id, 'label', e.target.value)}
                                  className="h-8 text-xs font-bold bg-white"
                                  placeholder="Day 1 AM"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-bold text-slate-500 uppercase">Date</label>
                                <Input
                                  type="date"
                                  value={session.date}
                                  onChange={(e) => handleUpdateSession(session.id, 'date', e.target.value)}
                                  className="h-8 text-xs font-bold bg-white"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <label className="text-[8px] font-bold text-slate-500 uppercase">Start Time</label>
                                <Input
                                  type="time"
                                  value={session.startTime}
                                  onChange={(e) => handleUpdateSession(session.id, 'startTime', e.target.value)}
                                  className="h-8 text-xs font-bold bg-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-bold text-slate-500 uppercase">End Time</label>
                                <Input
                                  type="time"
                                  value={session.endTime}
                                  onChange={(e) => handleUpdateSession(session.id, 'endTime', e.target.value)}
                                  className="h-8 text-xs font-bold bg-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-bold text-slate-500 uppercase">Type</label>
                                <select
                                  value={session.sessionType}
                                  onChange={(e) => handleUpdateSession(session.id, 'sessionType', e.target.value)}
                                  className="h-8 px-2 bg-white text-xs font-bold border rounded-md w-full"
                                >
                                  <option value="AM">AM</option>
                                  <option value="PM">PM</option>
                                  <option value="WHOLE_DAY">Whole Day</option>
                                </select>
                              </div>
                            </div>
                            <label className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-slate-600 cursor-pointer pt-1">
                              <input
                                type="checkbox"
                                checked={session.requiresLogout}
                                onChange={(e) => handleUpdateSession(session.id, 'requiresLogout', e.target.checked)}
                                className="h-3.5 w-3.5 accent-[#1B6535]"
                              />
                              Requires Logout
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pb-6">
                  <Button 
                    type="submit" 
                    disabled={isCreatingActivity}
                    className="w-full h-10 bg-[#1B6535] hover:bg-[#154e29] border-none text-white font-black uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-2"
                  >
                    {isCreatingActivity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Generate Attendance Session
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Activities Table List */}
            <Card className="shadow-md border-slate-200/80 lg:col-span-2">
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-xs font-black uppercase text-slate-700">Registered Activities</CardTitle>
                <CardDescription className="text-[10px] text-slate-500">Scheduled attendance sessions for your unit.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-black text-[10px] uppercase pl-4">Session Name</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">Start Time</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">End Time</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-center">Threshold</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-center">Status</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingActivities ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2 block">Loading activities...</span>
                        </TableCell>
                      </TableRow>
                    ) : !sortedActivities || sortedActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16 text-slate-400 font-bold uppercase italic text-xs">
                          No activities generated yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedActivities.map(act => {
                        const isEnded = act.status === 'COMPLETED' || act.status === 'CANCELLED';
                        return (
                          <TableRow key={act.id} className="hover:bg-slate-50/50">
                            <TableCell className="pl-4 py-3 font-extrabold text-xs text-slate-800 max-w-[180px]">
                              <span className="block truncate">{act.name}</span>
                              {act.documents && act.documents.length > 0 && (
                                <div className="mt-1.5 flex flex-col gap-1">
                                  {act.documents.map((d, i) => (
                                    <a
                                      key={i}
                                      href={d.googleDriveLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-[9px] font-black uppercase text-blue-600 hover:text-blue-800 hover:underline truncate"
                                    >
                                      📄 {d.description}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-500">
                              {act.startDateTime?.toDate 
                                ? format(act.startDateTime.toDate(), 'MM/dd/yyyy hh:mm a') 
                                : format(new Date(act.startDateTime), 'MM/dd/yyyy hh:mm a')}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-500">
                              {act.endDateTime?.toDate 
                                ? format(act.endDateTime.toDate(), 'MM/dd/yyyy hh:mm a') 
                                : format(new Date(act.endDateTime), 'MM/dd/yyyy hh:mm a')}
                            </TableCell>
                            <TableCell className="text-center py-3 text-xs font-bold text-[#1B6535]">
                              {act.lateThresholdMinutes} mins
                            </TableCell>
                            {/* Status badge */}
                            <TableCell className="text-center py-3">
                              <Badge className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                                act.status === 'ACTIVE' || act.status === 'UPCOMING'
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                  : act.status === 'COMPLETED'
                                  ? 'bg-slate-100 text-slate-500 border border-slate-300'
                                  : 'bg-rose-100 text-rose-600 border border-rose-300'
                              }`}>
                                {act.status}
                              </Badge>
                            </TableCell>
                            {/* Action buttons */}
                            <TableCell className="text-right pr-4 py-3">
                              {confirmDeleteActivityId === act.id ? (
                                <div className="flex items-center justify-end gap-1.5 animate-in fade-in duration-200">
                                  <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider mr-1 animate-pulse">
                                    Confirm delete?
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={isDeletingActivityId === act.id}
                                    onClick={() => handleDeleteActivity(act.id)}
                                    className="h-8 text-[9px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white border-none flex items-center gap-1"
                                  >
                                    {isDeletingActivityId === act.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                    Yes, Delete
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isDeletingActivityId === act.id}
                                    onClick={() => setConfirmDeleteActivityId(null)}
                                    className="h-8 text-[9px] font-black uppercase tracking-widest text-slate-600 border-slate-300 hover:bg-slate-50 flex items-center gap-1"
                                  >
                                    <X className="h-3 w-3" />
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Open Scanner — disabled if ended */}
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    disabled={isEnded}
                                    onClick={() => {
                                      window.open(`/unit-activity-scanner?activityId=${act.id}`, '_blank');
                                    }}
                                    className="h-8 text-[9px] font-black uppercase tracking-widest text-[#1B6535] border-emerald-500/20 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    <Camera className="h-3 w-3 mr-1" />
                                    Scanner
                                  </Button>
                                  {/* Setup Evaluation Strategy */}
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEvalWizard(act)}
                                    className="h-8 text-[9px] font-black uppercase tracking-widest text-[#D4AF37] border-amber-500/20 hover:bg-amber-50"
                                  >
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Setup Eval
                                  </Button>
                                  {/* Launch Evaluation */}
                                  {act.evaluationStrategy && (
                                    <Button 
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        window.open(`/unit-activity/evaluate/kiosk?activityId=${act.id}`, '_blank');
                                      }}
                                      className="h-8 text-[9px] font-black uppercase tracking-widest text-[#D4AF37] bg-amber-500/10 border-amber-500/30 hover:bg-amber-100/50"
                                    >
                                      <Maximize2 className="h-3 w-3 mr-1 text-[#D4AF37]" />
                                      Launch Eval
                                    </Button>
                                  )}
                                  {/* Edit */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditModal(act)}
                                    className="h-8 text-[9px] font-black uppercase tracking-widest text-blue-600 border-blue-300/50 hover:bg-blue-50"
                                  >
                                    <Pencil className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  {/* End Activity — only if not already ended */}
                                  {!isEnded && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEndActivity(act)}
                                      className="h-8 text-[9px] font-black uppercase tracking-widest text-rose-600 border-rose-300/50 hover:bg-rose-50"
                                    >
                                      <StopCircle className="h-3 w-3 mr-1" />
                                      End
                                    </Button>
                                  )}
                                  {/* Delete */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setConfirmDeleteActivityId(act.id)}
                                    className="h-8 text-[9px] font-black uppercase tracking-widest text-rose-600 border-rose-300/50 hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== SUB-TAB 2: LIVE QR SCANNER ==================== */}
        <TabsContent value="scanner" className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Camera Viewport and Controller */}
            <Card className="shadow-md border-slate-200/80 lg:col-span-2 overflow-hidden flex flex-col justify-between">
              <CardHeader className="bg-slate-50/50 border-b py-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-black uppercase text-slate-700">Scan Session Camera</CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">
                    Active: <span className="font-extrabold text-[#1B6535]">{activeActivity ? activeActivity.name : "None selected"}</span>
                  </CardDescription>
                </div>
                {activeActivity && (
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[8.5px] uppercase font-black px-2 py-0.5">
                    Start time: {activeActivity.startDateTime?.toDate 
                      ? format(activeActivity.startDateTime.toDate(), 'hh:mm a') 
                      : 'N/A'}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col items-center justify-center p-6 min-h-[350px] bg-slate-950/5 relative">
                {selectedActivityId === 'all' ? (
                  <div className="text-center max-w-sm space-y-3">
                    <ShieldAlert className="h-12 w-12 text-[#D4AF37] animate-pulse mx-auto" />
                    <h3 className="text-sm font-black uppercase text-slate-800">Scanner Locked</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase leading-normal">
                      Please select an active activity session in the header dropdown list first to configure your scanner logic.
                    </p>
                  </div>
                ) : !scannerActive ? (
                  <div className="text-center max-w-sm space-y-4">
                    <Camera className="h-10 w-10 text-slate-400 mx-auto" />
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-700">Camera stream offline</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Activate scanning permissions to capture codes.</p>
                    </div>
                    <Button 
                      onClick={startScanning} 
                      className="h-10 bg-[#1B6535] hover:bg-[#16542c] font-black uppercase tracking-wider text-[10px] rounded-xl px-6"
                    >
                      Initialize Scan Camera
                    </Button>
                  </div>
                ) : (
                  /* Scanner Reader element mount */
                  <div className="w-full max-w-sm space-y-4">
                    <div id="reader-container" className="w-full bg-black rounded-2xl overflow-hidden shadow-xl border-2 border-emerald-500/30" />
                    <Button 
                      onClick={stopScanning} 
                      variant="destructive"
                      className="w-full h-10 font-black uppercase tracking-wider text-[10px] rounded-xl"
                    >
                      Disconnect Camera
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Validation Panel Feed */}
            <Card className="shadow-md border-slate-200/80 lg:col-span-1 flex flex-col justify-between">
              <CardHeader className="bg-slate-50/50 border-b py-3">
                <CardTitle className="text-xs font-black uppercase text-slate-700">Scan Validation Result</CardTitle>
                <CardDescription className="text-[10px] text-slate-500">Real-time authentication feedback.</CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6 flex-1 flex flex-col justify-center">
                {scanResult.status === 'none' ? (
                  <div className="text-center py-10 space-y-2 opacity-40">
                    <Info className="h-8 w-8 text-slate-400 mx-auto" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                      {scanResult.message}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status Alert Graphic */}
                    <div className={`p-4 rounded-2xl border text-center space-y-2 ${
                      scanResult.status === 'success' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : scanResult.status === 'warning' 
                        ? 'bg-amber-50 border-amber-250 text-amber-800' 
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      <div className="flex justify-center">
                        {scanResult.status === 'success' ? (
                          <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-bounce" />
                        ) : scanResult.status === 'warning' ? (
                          <Clock className="h-10 w-10 text-amber-600 animate-pulse" />
                        ) : (
                          <XCircle className="h-10 w-10 text-rose-600 animate-pulse" />
                        )}
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-wider">
                        {scanResult.status === 'success' ? 'Scanned Successfully' : scanResult.status === 'warning' ? 'Scan Warning' : 'Scan Rejected'}
                      </h4>
                      <p className="text-[11px] font-bold leading-normal italic">
                        "{scanResult.message}"
                      </p>
                    </div>

                    {/* Attendee Details */}
                    {scanResult.details && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                        <div className="flex justify-between items-center border-b pb-1.5 text-[9px] font-black uppercase text-slate-400">
                          <span>User Verified</span>
                          <Badge className={`${
                            scanResult.details.status === 'ON TIME' 
                              ? 'bg-emerald-100 text-emerald-800 border-none' 
                              : scanResult.details.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800 border-none'
                              : 'bg-slate-200 text-slate-800 border-none'
                          } text-[8px] font-black uppercase px-2`}>
                            {scanResult.details.status}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Employee Name:</span>
                          <span className="text-xs font-black text-slate-800 uppercase block">{scanResult.details.name}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Office / Unit:</span>
                          <span className="text-[11px] font-bold text-slate-600 uppercase block">{scanResult.details.office}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Timestamp:</span>
                          <span className="text-[10px] font-mono font-bold text-slate-500 block">{scanResult.details.time}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t bg-slate-50/50 p-4 justify-center">
                <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Verification engine active (2026 EOMS)</span>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== SUB-TAB 3: ATTENDANCE RECORDS ==================== */}
        <TabsContent value="records" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-md border-slate-200/80">
            <CardHeader className="bg-slate-50/50 border-b py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xs font-black uppercase text-slate-700">Attendance Logbook Entries</CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Showing logs for: <span className="font-extrabold text-[#1B6535]">{activeActivity ? activeActivity.name : "All sessions"}</span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {activeActivity && activeActivity.sessions && activeActivity.sessions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-500">Filter Session:</span>
                    <select
                      value={selectedSessionIdFilter}
                      onChange={(e) => setSelectedSessionIdFilter(e.target.value)}
                      className="h-8 px-2 bg-white font-extrabold text-[11px] text-slate-800 border shadow-sm rounded-xl outline-none"
                    >
                      <option value="all">📁 All Sessions</option>
                      {activeActivity.sessions.map(s => (
                        <option key={s.id} value={s.id}>📍 {s.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <Button 
                  size="sm" 
                  onClick={handlePrintAttendanceSheet}
                  disabled={!activeActivity || activeActivity.status !== 'COMPLETED'}
                  className="h-8 text-[9.5px] font-black uppercase tracking-wider bg-white border border-[#1B6535]/25 hover:bg-slate-50 text-[#1B6535] shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
                  title={!activeActivity ? "Please select a specific completed activity from the dropdown above to print." : activeActivity.status !== 'COMPLETED' ? "Print attendance sheet is locked until the activity has ended." : "Print attendance sheet"}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1 text-amber-500" /> Print Official Sheet
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleExportCSV}
                  className="h-8 text-[9.5px] font-black uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800 text-white border-none"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Export to CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase pl-4">Name</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Unit/Office</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Contact Number</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Sex</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">{activeActivity?.requiresLogout ? 'Login Time' : 'Scanned Time'}</TableHead>
                    {activeActivity?.requiresLogout && (
                      <TableHead className="font-black text-[10px] uppercase">Logout Time</TableHead>
                    )}
                    <TableHead className="font-black text-[10px] uppercase text-center font-bold">Device Binding</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-right pr-4">Lateness status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!sortedLogs || sortedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={activeActivity?.requiresLogout ? 8 : 7} className="text-center py-16 text-slate-400 font-bold uppercase italic text-xs">
                        No attendance entries logged for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-slate-50/50">
                        <TableCell className="pl-4 py-3 font-extrabold text-xs text-slate-800 uppercase">
                          {log.userName}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-650 uppercase">
                          {log.unitName}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-600">
                          {log.contactNumber || 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-500">
                          {log.sex || 'Did not specify'}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-500">
                          {log.scannedAt?.toDate 
                            ? format(log.scannedAt.toDate(), 'MM/dd/yyyy hh:mm a') 
                            : 'N/A'}
                        </TableCell>
                        {activeActivity?.requiresLogout && (
                          <TableCell className="text-xs font-semibold text-slate-500">
                            {log.logoutAt?.toDate
                              ? format(log.logoutAt.toDate(), 'MM/dd/yyyy hh:mm a')
                              : log.logoutAt ? format(new Date(log.logoutAt), 'MM/dd/yyyy hh:mm a') : 'Not logged out'}
                          </TableCell>
                        )}
                        <TableCell className="text-center py-3 text-[10px] font-mono text-slate-400">
                          {log.deviceFingerprint?.substring(0, 15)}...
                        </TableCell>
                        <TableCell className="text-right pr-4 py-3">
                          <Badge className={`${
                            log.status === 'ON_TIME' 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                              : log.status === 'LATE'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-250'
                          } text-[8.5px] font-black uppercase px-2.5 py-0.5 rounded-full`}>
                            {log.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== SUB-TAB 4: DEVICE LOCK REGISTRY ==================== */}
        <TabsContent value="registry" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-md border-slate-200/80">
            <CardHeader className="bg-slate-50/50 border-b py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xs font-black uppercase text-slate-700">Official Device Registry</CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Enforces strict one account per physical device lock mapping.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search registered user name or office..."
                  value={bindingSearch}
                  onChange={(e) => setBindingSearch(e.target.value)}
                  className="h-8 text-xs font-bold w-[250px] bg-white border-slate-200"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase pl-4">Locked Name</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Office / Unit</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Device Fingerprint Hash</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Registration Date</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-right pr-4">Reset Control</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingBindings ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2 block">Loading device bindings...</span>
                      </TableCell>
                    </TableRow>
                  ) : filteredBindings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16 text-slate-400 font-bold uppercase italic text-xs">
                        No registered device bindings matching criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBindings.map((bind) => (
                      <TableRow key={bind.id} className="hover:bg-slate-50/50">
                        <TableCell className="pl-4 py-3 font-extrabold text-xs text-slate-800 uppercase flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-[#D4AF37]" /> {bind.userName}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-600 uppercase">{bind.unitName}</TableCell>
                        <TableCell className="text-xs font-mono font-bold text-slate-400">
                          {bind.id}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-500">
                          {bind.boundAt?.toDate 
                            ? format(bind.boundAt.toDate(), 'MM/dd/yyyy hh:mm a') 
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right pr-4 py-3">
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleResetBinding(bind.id, bind.userName)}
                            className="h-8 text-[9px] font-black uppercase tracking-widest px-3 flex items-center gap-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Unlock Device
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== SUB-TAB 5: DECISION SUPPORT ANALYTICS ==================== */}
        <TabsContent value="analytics" className="space-y-6 animate-in fade-in duration-500">
          {selectedActivityId === 'all' ? (
            <Card className="shadow-md border-slate-200/80 p-12 text-center space-y-4">
              <Sparkles className="h-12 w-12 text-amber-500 animate-pulse mx-auto" />
              <h3 className="text-sm font-black uppercase text-slate-800">Analytics Lock</h3>
              <p className="text-[11px] font-bold text-slate-500 uppercase leading-normal max-w-md mx-auto">
                Please select a specific activity from the dropdown at the top of the page to unlock session analytics, demographics profiling, and participant feedback evaluations.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Average Ratings Dashboard Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {[
                  { id: 'perfQuality', title: 'Quality of Service', val: averageRatingsObj.perfQuality },
                  { id: 'perfTimeliness', title: 'Timeliness of Service', val: averageRatingsObj.perfTimeliness },
                  { id: 'perfStaff', title: 'Staff Behavior', val: averageRatingsObj.perfStaff },
                  { id: 'venue', title: 'Venue Quality', val: averageRatingsObj.venue },
                  { id: 'facility', title: 'Facility Quality', val: averageRatingsObj.facility },
                  { id: 'food', title: 'Food Quality', val: averageRatingsObj.food },
                  { id: 'materials', title: 'Material Quality', val: averageRatingsObj.materials },
                  { id: 'overall', title: 'Overall Rating', val: averageRatingsObj.overall },
                  { id: 'objectives', title: 'Objectives Met', val: averageRatingsObj.objectives },
                  { id: 'speaker', title: 'Speaker Delivery', val: averageRatingsObj.speaker },
                  { id: 'topic', title: 'Topic Relevance', val: averageRatingsObj.topic },
                ].filter(item => {
                  if (item.id === 'topic') return focusList.includes('speaker');
                  return focusList.includes(item.id);
                }).map((item, idx) => (
                  <Card key={idx} className="shadow-sm border-slate-200 bg-white">
                    <CardHeader className="p-4 pb-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.title}</p>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800 tracking-tight">{item.val > 0 ? item.val.toFixed(1) : 'N/A'}</span>
                        {item.val > 0 && <span className="text-xs text-amber-500">★</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart 1: Punctuality */}
                <Card className="shadow-sm border-slate-200 bg-white">
                  <CardHeader className="bg-slate-50/50 border-b py-3">
                    <CardTitle className="text-xs font-black uppercase text-slate-700">Attendee Punctuality Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 h-[250px] flex items-center justify-center">
                    {punctualityData.length === 0 ? (
                      <p className="text-xs font-bold text-slate-400 uppercase italic">No attendance data logged</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={punctualityData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={pieLabel}
                          >
                            {punctualityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Chart 2: Demographics */}
                <Card className="shadow-sm border-slate-200 bg-white">
                  <CardHeader className="bg-slate-50/50 border-b py-3">
                    <CardTitle className="text-xs font-black uppercase text-slate-700">Gender/Sex Demographics</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 h-[250px] flex items-center justify-center">
                    {genderData.length === 0 ? (
                      <p className="text-xs font-bold text-slate-400 uppercase italic">No attendee records found</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={genderData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={pieLabel}
                          >
                            {genderData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Chart 3: Evaluation Ratings */}
                <Card className="shadow-sm border-slate-200 bg-white md:col-span-2">
                  <CardHeader className="bg-slate-50/50 border-b py-3">
                    <CardTitle className="text-xs font-black uppercase text-slate-700">Evaluation Categories Ratings</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 h-[250px]">
                    {averageRatings.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-xs font-bold text-slate-400 uppercase italic">No participant reviews submitted</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={averageRatings} layout="vertical">
                          <XAxis type="number" domain={[0, 5]} />
                          <YAxis dataKey="category" type="category" width={150} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <Tooltip />
                          <Bar dataKey="rating" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                            {averageRatings.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === averageRatings.length - 1 ? '#10b981' : '#3b82f6'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Generate Evaluation Summary Button */}
              {filteredEvaluations.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowSummaryModal(true)}
                    className="h-10 text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 rounded-xl flex items-center gap-2 px-5"
                  >
                    <FileText className="h-4 w-4" />
                    Generate Evaluation Summary
                  </Button>
                </div>
              )}

              {/* Feedback Comments list */}
              <Card className="shadow-sm border-slate-200 bg-white">
                <CardHeader className="bg-slate-50/50 border-b py-3 flex flex-row justify-between items-center">
                  <CardTitle className="text-xs font-black uppercase text-slate-700">Participant Feedback Remarks</CardTitle>
                  <Badge className="bg-amber-100 text-amber-800 border-none text-[9px] font-black">{filteredEvaluations.length} Reviews</Badge>
                </CardHeader>
                <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                  {filteredEvaluations.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-bold uppercase italic text-xs">
                      No remarks recorded.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredEvaluations.map((evalItem) => (
                        <div 
                          key={evalItem.id} 
                          className="p-4 space-y-1 hover:bg-slate-100/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedEvaluation(evalItem)}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-extrabold text-slate-700 uppercase flex items-center gap-1.5">
                              {evalItem.participantName || 'Anonymous'}
                              {evalItem.ratingOverall && (
                                <span className="text-[10px] text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  ★ {evalItem.ratingOverall}
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              {evalItem.submittedAt?.toDate
                                ? format(evalItem.submittedAt.toDate(), 'MM/dd/yyyy hh:mm a')
                                : 'N/A'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium line-clamp-2">
                            {evalItem.comments || evalItem.commentsOverall || evalItem.ansTakeaways || "Click to view detailed feedback ratings & open-ended comments."}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ================================================================== */}
      {/* EDIT ACTIVITY MODAL                                                 */}
      {/* ================================================================== */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-blue-500" />
                  Edit Activity
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{editingActivity.name}</p>
              </div>
              <button
                onClick={() => setEditingActivity(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditActivity} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
                {/* Activity Name */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Activity Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. QMS Audit Briefing"
                    className="h-10 text-xs font-bold bg-white border-slate-200"
                  />
                </div>

                {/* Late Threshold */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Late Threshold (minutes)</label>
                  <Input
                    type="number"
                    min="0"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(e.target.value)}
                    className="h-10 text-xs font-bold bg-white border-slate-200"
                  />
                </div>

                {/* Edit Documents Section */}
                <div className="space-y-2 pt-2 border-t border-slate-150">
                  <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Document Links (Google Drive)</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Description"
                      value={editDocDesc}
                      onChange={(e) => setEditDocDesc(e.target.value)}
                      className="text-xs h-9 bg-white"
                    />
                    <Input
                      placeholder="Google Drive Link"
                      value={editDocLink}
                      onChange={(e) => setEditDocLink(e.target.value)}
                      className="text-xs h-9 bg-white"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (!editDocDesc.trim() || !editDocLink.trim()) return;
                        setEditActivityDocs([...editActivityDocs, { description: editDocDesc.trim(), googleDriveLink: editDocLink.trim() }]);
                        setEditDocDesc('');
                        setEditDocLink('');
                      }}
                      className="h-9 px-3 bg-[#1B6535] hover:bg-[#154e29]"
                    >
                      +
                    </Button>
                  </div>
                  {editActivityDocs.length > 0 && (
                    <div className="p-2 border rounded-xl bg-slate-50 space-y-1">
                      {editActivityDocs.map((doc, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-slate-700">
                          <span className="truncate max-w-[300px]">{doc.description}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setEditActivityDocs(editActivityDocs.filter((_, i) => i !== idx))}
                            className="h-5 w-5 p-0 text-rose-600 hover:text-rose-800"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit Sessions Section */}
                <div className="space-y-3 pt-2 border-t border-slate-150">
                  <div className="flex justify-between items-center">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Sessions ({editActivitySessions.length})</label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddEditSession}
                      className="h-7 text-[9px] font-black uppercase px-2.5 bg-white border-slate-200"
                    >
                      + Add Session
                    </Button>
                  </div>

                  {editActivitySessions.length === 0 ? (
                    <p className="text-[9.5px] text-slate-400 italic">No sessions added yet. Please add at least one session.</p>
                  ) : (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                      {editActivitySessions.map((session, idx) => (
                        <div key={session.id} className="p-3 border rounded-xl bg-slate-50 space-y-2 relative">
                          <button
                            type="button"
                            onClick={() => handleRemoveEditSession(session.id)}
                            className="absolute top-2 right-2 text-rose-500 hover:text-rose-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-500 uppercase">Label</label>
                              <Input
                                value={session.label}
                                onChange={(e) => handleUpdateEditSession(session.id, 'label', e.target.value)}
                                className="h-8 text-xs font-bold bg-white"
                                placeholder="Day 1 AM"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-500 uppercase">Date</label>
                              <Input
                                type="date"
                                value={session.date}
                                onChange={(e) => handleUpdateEditSession(session.id, 'date', e.target.value)}
                                className="h-8 text-xs font-bold bg-white"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-500 uppercase">Start Time</label>
                              <Input
                                type="time"
                                value={session.startTime}
                                onChange={(e) => handleUpdateEditSession(session.id, 'startTime', e.target.value)}
                                className="h-8 text-xs font-bold bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-500 uppercase">End Time</label>
                              <Input
                                type="time"
                                value={session.endTime}
                                onChange={(e) => handleUpdateEditSession(session.id, 'endTime', e.target.value)}
                                className="h-8 text-xs font-bold bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-500 uppercase">Type</label>
                              <select
                                value={session.sessionType}
                                onChange={(e) => handleUpdateEditSession(session.id, 'sessionType', e.target.value)}
                                className="h-8 px-2 bg-white text-xs font-bold border rounded-md w-full"
                              >
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                                <option value="WHOLE_DAY">Whole Day</option>
                              </select>
                            </div>
                          </div>
                          <label className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-slate-600 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={session.requiresLogout}
                              onChange={(e) => handleUpdateEditSession(session.id, 'requiresLogout', e.target.checked)}
                              className="h-3.5 w-3.5 accent-[#1B6535]"
                            />
                            Requires Logout
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingActivity(null)}
                  className="h-9 px-5 text-[10px] font-black uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingEdit}
                  className="h-9 px-6 bg-blue-600 hover:bg-blue-700 border-none text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
                >
                  {isSavingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVALUATION STRATEGY WIZARD DIALOG */}
      <Dialog open={isEvalWizardOpen} onOpenChange={setIsEvalWizardOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 rounded-2xl shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-[#D4AF37]/5 border-b border-[#D4AF37]/10 p-6">
            <DialogTitle className="text-base font-black uppercase text-slate-800 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#D4AF37] animate-pulse" />
              Evaluation Strategy Wizard
            </DialogTitle>
            <DialogDescription className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Configure and strategize participant feedback collection
            </DialogDescription>
          </DialogHeader>

          {/* Wizard step progress indicator */}
          <div className="px-6 pt-4 flex items-center gap-3">
            <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-[#D4AF37] transition-all duration-300"
                style={{ width: `${(wizardStep / 3) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400">Step {wizardStep} of 3</span>
          </div>

          <div className="p-6 space-y-6">
            {wizardStep === 1 && (
              /* Step 1: Security & PIN Settings */
              <div className="space-y-5">
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Step 1: Security & Identity Strategy</h4>
                  <p className="text-[10px] text-slate-400">Establish access credentials to prevent unauthorized or spam feedback submissions.</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={evalRequirePin}
                      onCheckedChange={(checked) => setEvalRequirePin(!!checked)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-black uppercase text-slate-800">Require Submission PIN</span>
                      <p className="text-[9.5px] text-slate-400 leading-normal">
                        Participants must enter a 4-digit PIN code displayed on screen/projector to submit their reviews.
                      </p>
                    </div>
                  </label>

                  {evalRequirePin && (
                    <div className="pl-7 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                      <Label className="text-[9px] font-black uppercase text-slate-500 pl-1">Event Entry PIN</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          maxLength={4}
                          value={evalPinCode}
                          onChange={(e) => setEvalPinCode(e.target.value.replace(/\D/g, ''))}
                          className="w-24 text-center font-mono font-bold tracking-widest text-sm h-9 bg-white"
                          placeholder="7788"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEvalPinCode(Math.floor(1000 + Math.random() * 9000).toString())}
                          className="h-9 text-[10px] font-black uppercase tracking-wider"
                        >
                          Regenerate PIN
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="text-xs font-black uppercase text-slate-800 block">Demographics Identity Strategy</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEvalFormMode('open')}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5",
                        evalFormMode === 'open' 
                          ? "bg-amber-50 border-[#D4AF37] text-amber-900 shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span className="text-[10px] font-black uppercase">Open/Anonymous</span>
                      <span className="text-[9px] opacity-60 leading-normal font-medium">Names are optional</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvalFormMode('strict')}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5",
                        evalFormMode === 'strict' 
                          ? "bg-amber-50 border-[#D4AF37] text-amber-900 shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span className="text-[10px] font-black uppercase">Strict Verification</span>
                      <span className="text-[9px] opacity-60 leading-normal font-medium">Require name & contact</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              /* Step 2: Custom Focus Areas */
              <div className="space-y-5">
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Step 2: Customize Feedback Focus</h4>
                  <p className="text-[10px] text-slate-400">Select the specific evaluation aspects you want participants to rate for this activity.</p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { id: 'perfQuality', label: '1. Quality of Delivery of Service', desc: 'Assess if the service provided was high quality.' },
                    { id: 'perfTimeliness', label: '2. Timeliness of Service', desc: 'Assess the speed and timeliness of the service.' },
                    { id: 'perfStaff', label: '3. Staff Behavior', desc: 'Assess professional attitude and helpfulness of the team.' },
                    { id: 'venue', label: '4. Venue Quality', desc: 'Assess physical venue and comfort level.' },
                    { id: 'facility', label: '5. Facility Quality', desc: 'Assess equipment, tools, and technical amenities.' },
                    { id: 'food', label: '6. Food Quality', desc: 'Assess food and refreshments served.' },
                    { id: 'materials', label: '7. Material Quality', desc: 'Assess references, digital guides, and printed handouts.' },
                    { id: 'overall', label: '8. Overall Satisfaction', desc: 'Capture net satisfaction with this activity.' },
                    { id: 'objectives', label: 'Legacy: Objectives Met', desc: 'Assess objectives met (legacy schema).' },
                    { id: 'speaker', label: 'Legacy: Speaker & Facilitator', desc: 'Assess speakers and facilitators (legacy schema).' }
                  ].map((cat) => {
                    const isChecked = evalFeedbackFocus.includes(cat.id);
                    return (
                      <label 
                        key={cat.id}
                        className={cn(
                          "p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5",
                          isChecked 
                            ? "bg-slate-50 border-slate-300"
                            : "bg-white border-slate-100 hover:bg-slate-50/50"
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEvalFeedbackFocus([...evalFeedbackFocus, cat.id]);
                            } else {
                              // Always keep at least one category checked to prevent empty forms
                              if (evalFeedbackFocus.length > 1) {
                                setEvalFeedbackFocus(evalFeedbackFocus.filter(f => f !== cat.id));
                              } else {
                                toast({
                                  title: 'Selection Locked',
                                  description: 'At least one focus category must be selected.',
                                  variant: 'destructive'
                                });
                              }
                            }
                          }}
                          className="mt-0.5"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-extrabold text-slate-800">{cat.label}</span>
                          <p className="text-[9.5px] text-slate-400 leading-normal font-medium">{cat.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              /* Step 3: Success & Launch Options */
              <div className="space-y-6 text-center py-4">
                <div className="h-16 w-16 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Check className="h-8 w-8" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-black uppercase text-slate-800 tracking-tight">Evaluation Strategy Deployed!</h4>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold max-w-xs mx-auto">
                    Your evaluation settings have been synchronized. The portal is ready to receive structured ratings.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2.5 max-w-sm mx-auto text-xs font-semibold">
                  <div className="flex justify-between border-b pb-1.5 uppercase font-black text-[9.5px] text-slate-400">
                    <span>Configured Strategy</span>
                    <span>Status</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Submission Mode:</span>
                    <span className="font-bold uppercase text-slate-700">{evalFormMode === 'strict' ? 'Verified Demographics' : 'Anonymous Open'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">PIN Security:</span>
                    <span className="font-bold text-slate-700">{evalRequirePin ? `Required (Code: ${evalPinCode})` : 'Disabled'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Aspects Selected:</span>
                    <span className="font-bold text-[#1B6535]">{evalFeedbackFocus.length} categories active</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 max-w-xs mx-auto">
                  <Button
                    type="button"
                    onClick={() => {
                      window.open(`/unit-activity/evaluate/kiosk?activityId=${selectedEvalActivity?.id}`, '_blank');
                    }}
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 border-none text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-lg flex items-center justify-center gap-2"
                  >
                    <Maximize2 className="h-4 w-4 text-[#D4AF37]" />
                    Launch Fullscreen Kiosk
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEvalWizardOpen(false);
                    }}
                    className="w-full h-11 text-xs font-black uppercase tracking-wider text-slate-600 border-slate-200"
                  >
                    Done & Close
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons for step 1 & 2 */}
          {wizardStep < 3 && (
            <DialogFooter className="bg-slate-50 border-t border-slate-100 p-4 flex gap-2 sm:justify-end">
              {wizardStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWizardStep(wizardStep - 1)}
                  className="h-10 text-[10px] font-black uppercase tracking-wider"
                >
                  Back
                </Button>
              )}
              {wizardStep === 1 ? (
                <Button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="h-10 px-5 text-[10px] font-black uppercase tracking-wider"
                >
                  Continue Focus Focus
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isSavingStrategy}
                  onClick={handleSaveStrategy}
                  className="h-10 px-6 bg-[#1B6535] hover:bg-[#154e29] border-none text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                >
                  {isSavingStrategy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Deploy Strategy
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* EVALUATION DETAIL DIALOG */}
      {/* ================================================================== */}
      {/* EVALUATION SUMMARY MODAL                                           */}
      {/* ================================================================== */}
      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-emerald-700 to-teal-700 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-black uppercase text-white tracking-tight">
                    Evaluation Discussion Summary
                  </DialogTitle>
                  <DialogDescription className="text-[10px] text-emerald-200 font-bold uppercase tracking-widest mt-0.5">
                    {activeActivity?.name} • {filteredEvaluations.length} Respondents • Names Hidden
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[10px] font-black uppercase tracking-wider border-white/20 text-white bg-white/10 hover:bg-white/20 rounded-lg"
                  onClick={() => {
                    const el = document.getElementById('eval-summary-content');
                    if (el) navigator.clipboard.writeText(el.innerText).then(() => {});
                  }}
                >
                  <ClipboardCopy className="h-3.5 w-3.5 mr-1" /> Copy Text
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[10px] font-black uppercase tracking-wider border-white/20 text-white bg-white/10 hover:bg-white/20 rounded-lg"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5 mr-1" /> Print
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable content */}
          <div id="eval-summary-content" className="overflow-y-auto flex-1 p-6 space-y-8 bg-white text-slate-800">

            {/* ---- Cover / Title Block ---- */}
            <div className="text-center space-y-2 pb-6 border-b-2 border-emerald-600">
              <div className="flex justify-center mb-3">
                <img src="/rsulogo.png" alt="RSU" className="h-16 w-16 object-contain opacity-80" />
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">Activity Evaluation Summary Report</h1>
              <h2 className="text-base font-bold text-emerald-700 uppercase">{activeActivity?.name}</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Total Respondents: {filteredEvaluations.length} &nbsp;|&nbsp; Report Generated: {format(new Date(), 'MMMM d, yyyy')}
              </p>
              <p className="text-[10px] text-slate-400 italic">
                Note: Individual respondent identities are withheld in this report to ensure impartial and candid evaluation.
              </p>
            </div>

            {/* ---- I. RATINGS SUMMARY TABLE ---- */}
            <section className="space-y-3">
              <h3 className="text-sm font-black uppercase text-emerald-700 border-b border-emerald-200 pb-1 tracking-wider">
                I. Summary of Evaluation Ratings
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The table below presents the mean ratings per evaluation category based on responses gathered from {filteredEvaluations.length} participant{filteredEvaluations.length !== 1 ? 's' : ''}.
                Ratings are on a 5-point scale where <strong>1 = Poor</strong>, <strong>2 = Fair</strong>, <strong>3 = Satisfactory</strong>, <strong>4 = Very Satisfactory</strong>, and <strong>5 = Excellent</strong>.
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-emerald-600 text-white">
                      <th className="text-left px-4 py-2.5 font-black uppercase tracking-wide">Evaluation Category</th>
                      <th className="text-center px-4 py-2.5 font-black uppercase tracking-wide">Mean Rating</th>
                      <th className="text-center px-4 py-2.5 font-black uppercase tracking-wide">Verbal Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {([
                      { id: 'objectives', label: 'Objectives Met', val: averageRatingsObj.objectives },
                      { id: 'speaker', label: 'Speaker & Facilitator Delivery', val: averageRatingsObj.speaker },
                      { id: 'topic', label: 'Topic Relevance & Presentation', val: averageRatingsObj.topic },
                      { id: 'perfQuality', label: 'Quality of Delivery of Service', val: averageRatingsObj.perfQuality },
                      { id: 'perfTimeliness', label: 'Timeliness of Service', val: averageRatingsObj.perfTimeliness },
                      { id: 'perfStaff', label: 'Staff Behavior', val: averageRatingsObj.perfStaff },
                      { id: 'venue', label: 'Venue', val: averageRatingsObj.venue },
                      { id: 'facility', label: 'Facility', val: averageRatingsObj.facility },
                      { id: 'food', label: 'Food & Catering', val: averageRatingsObj.food },
                      { id: 'materials', label: 'Learning Materials', val: averageRatingsObj.materials },
                      { id: 'overall', label: 'Overall Satisfaction', val: averageRatingsObj.overall },
                    ] as { id: string; label: string; val: number }[]).filter(item => {
                      if (item.id === 'topic') return focusList.includes('speaker');
                      return focusList.includes(item.id);
                    }).map((item, idx) => {
                      const vi = item.val >= 4.5 ? 'Excellent' : item.val >= 3.5 ? 'Very Satisfactory' : item.val >= 2.5 ? 'Satisfactory' : item.val >= 1.5 ? 'Fair' : item.val > 0 ? 'Poor' : 'N/A';
                      const viColor = item.val >= 4.5 ? 'text-emerald-700' : item.val >= 3.5 ? 'text-blue-700' : item.val >= 2.5 ? 'text-amber-700' : item.val > 0 ? 'text-rose-700' : 'text-slate-400';
                      return (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-4 py-2.5 font-semibold text-slate-700">{item.label}</td>
                          <td className="px-4 py-2.5 text-center font-black text-slate-800">
                            {item.val > 0 ? item.val.toFixed(2) : '—'}
                          </td>
                          <td className={`px-4 py-2.5 text-center font-black uppercase tracking-wide ${viColor}`}>{vi}</td>
                        </tr>
                      );
                    })}
                    {/* Overall weighted average */}
                    {(() => {
                      const vals = [
                        focusList.includes('objectives') ? averageRatingsObj.objectives : null,
                        focusList.includes('speaker') ? averageRatingsObj.speaker : null,
                        focusList.includes('speaker') ? averageRatingsObj.topic : null,
                        focusList.includes('perfQuality') ? averageRatingsObj.perfQuality : null,
                        focusList.includes('perfTimeliness') ? averageRatingsObj.perfTimeliness : null,
                        focusList.includes('perfStaff') ? averageRatingsObj.perfStaff : null,
                        focusList.includes('venue') ? averageRatingsObj.venue : null,
                        focusList.includes('facility') ? averageRatingsObj.facility : null,
                        focusList.includes('food') ? averageRatingsObj.food : null,
                        focusList.includes('materials') ? averageRatingsObj.materials : null,
                        focusList.includes('overall') ? averageRatingsObj.overall : null,
                      ].filter(v => v !== null && v > 0) as number[];
                      const grand = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                      const vi = grand >= 4.5 ? 'Excellent' : grand >= 3.5 ? 'Very Satisfactory' : grand >= 2.5 ? 'Satisfactory' : grand >= 1.5 ? 'Fair' : 'Poor';
                      return grand > 0 ? (
                        <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                          <td className="px-4 py-2.5 font-black uppercase text-emerald-800">Grand Mean (All Categories)</td>
                          <td className="px-4 py-2.5 text-center font-black text-emerald-800 text-sm">{grand.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-center font-black text-emerald-700 uppercase tracking-wide">{vi}</td>
                        </tr>
                      ) : null;
                    })()}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ---- II. DISCUSSION PER CATEGORY ---- */}
            <section className="space-y-6">
              <h3 className="text-sm font-black uppercase text-emerald-700 border-b border-emerald-200 pb-1 tracking-wider">
                II. Evaluation Discussion by Category
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The following discussion presents a synthesis of the quantitative ratings and qualitative comments per evaluation category.
                Comments are listed verbatim as submitted by respondents and analyzed to surface common themes and patterns.
              </p>

              {([
                {
                  id: 'objectives', label: 'Objectives Met', val: averageRatingsObj.objectives,
                  comments: filteredEvaluations.map(e => e.commentsObjectives).filter(Boolean) as string[],
                },
                {
                  id: 'speaker', label: 'Speaker & Facilitator Delivery', val: averageRatingsObj.speaker,
                  comments: filteredEvaluations.map(e => e.commentsSpeaker).filter(Boolean) as string[],
                  extra: averageRatingsObj.topic > 0 ? `Topic Relevance & Presentation Content sub-criterion received a mean of ${averageRatingsObj.topic.toFixed(2)}.` : null,
                },
                {
                  id: 'perfQuality', label: 'Quality of Delivery of Service', val: averageRatingsObj.perfQuality,
                  comments: filteredEvaluations.map(e => e.commentsPerfQuality).filter(Boolean) as string[],
                },
                {
                  id: 'perfTimeliness', label: 'Timeliness of Service', val: averageRatingsObj.perfTimeliness,
                  comments: filteredEvaluations.map(e => e.commentsPerfTimeliness).filter(Boolean) as string[],
                },
                {
                  id: 'perfStaff', label: 'Staff Behavior', val: averageRatingsObj.perfStaff,
                  comments: filteredEvaluations.map(e => e.commentsPerfStaff).filter(Boolean) as string[],
                },
                {
                  id: 'venue', label: 'Venue', val: averageRatingsObj.venue,
                  comments: filteredEvaluations.map(e => e.commentsVenue).filter(Boolean) as string[],
                },
                {
                  id: 'facility', label: 'Facility', val: averageRatingsObj.facility,
                  comments: filteredEvaluations.map(e => e.commentsFacility).filter(Boolean) as string[],
                },
                {
                  id: 'food', label: 'Food & Catering', val: averageRatingsObj.food,
                  comments: filteredEvaluations.map(e => e.commentsFood).filter(Boolean) as string[],
                },
                {
                  id: 'materials', label: 'Learning Materials', val: averageRatingsObj.materials,
                  comments: filteredEvaluations.map(e => e.commentsMaterials).filter(Boolean) as string[],
                },
                {
                  id: 'overall', label: 'Overall Satisfaction', val: averageRatingsObj.overall,
                  comments: [
                    ...filteredEvaluations.map(e => e.commentsOverall).filter(Boolean) as string[],
                    ...filteredEvaluations.map(e => e.comments).filter(Boolean) as string[],
                  ],
                },
              ] as { id: string; label: string; val: number; comments: string[]; extra?: string | null }[])
                .filter(cat => {
                  if (cat.id === 'topic') return false;
                  return focusList.includes(cat.id);
                })
                .map((cat, catIdx) => {
                  const vi = cat.val >= 4.5 ? 'Excellent' : cat.val >= 3.5 ? 'Very Satisfactory' : cat.val >= 2.5 ? 'Satisfactory' : cat.val >= 1.5 ? 'Fair' : cat.val > 0 ? 'Poor' : null;
                  const tone = cat.val >= 4.5 ? 'an excellent' : cat.val >= 3.5 ? 'a very satisfactory' : cat.val >= 2.5 ? 'a satisfactory' : cat.val >= 1.5 ? 'a fair' : 'a poor';
                  const discussion = cat.val > 0
                    ? `The ${cat.label} category obtained a mean rating of ${cat.val.toFixed(2)}, which is interpreted as ${vi} (${tone} level of performance). ${
                        cat.comments.length > 0
                          ? `Qualitative feedback from respondents further substantiates this rating. A review of the comments reveals that participants generally ${
                              cat.val >= 3.5
                                ? 'expressed positive sentiments and satisfaction with this aspect of the activity.'
                                : cat.val >= 2.5
                                ? 'found this aspect to be adequate, though some areas for improvement were noted.'
                                : 'identified specific concerns and areas requiring attention and improvement.'
                            } The comments, listed below for reference, provide additional context and specific observations from the respondents.`
                          : 'No specific written comments were provided for this category.'
                      }${ cat.extra ? ' ' + cat.extra : '' }`
                    : null;

                  return (
                    <div key={cat.id} className="space-y-3">
                      <div className="flex items-baseline gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase w-6 shrink-0">{catIdx + 1}.</span>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{cat.label}</h4>
                        {cat.val > 0 && (
                          <span className={`ml-auto text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ${
                            cat.val >= 4.5 ? 'bg-emerald-100 text-emerald-700' :
                            cat.val >= 3.5 ? 'bg-blue-100 text-blue-700' :
                            cat.val >= 2.5 ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {cat.val.toFixed(2)} — {vi}
                          </span>
                        )}
                      </div>

                      {/* Narrative discussion paragraph */}
                      {discussion ? (
                        <p className="text-xs text-slate-700 leading-relaxed pl-9">{discussion}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic pl-9">No data collected for this category.</p>
                      )}

                      {/* Anonymous comments */}
                      {cat.comments.length > 0 && (
                        <div className="pl-9 space-y-1.5">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Respondent Comments ({cat.comments.length}):</p>
                          <ul className="space-y-1.5">
                            {cat.comments.map((c, ci) => (
                              <li key={ci} className="flex items-start gap-2 text-xs text-slate-600">
                                <span className="shrink-0 h-4 w-4 bg-slate-100 rounded-full flex items-center justify-center text-[9px] font-black text-slate-500 mt-0.5">{ci + 1}</span>
                                <span className="leading-relaxed italic">&ldquo;{c}&rdquo;</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
            </section>

            {/* ---- III. OPEN-ENDED FEEDBACK ---- */}
            {filteredEvaluations.some(e => e.ansTakeaways || e.ansExpectations || e.ansMissed || e.ansSuggestions) && (
              <section className="space-y-6">
                <h3 className="text-sm font-black uppercase text-emerald-700 border-b border-emerald-200 pb-1 tracking-wider">
                  III. Open-Ended Qualitative Feedback
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The following section compiles verbatim responses to the open-ended questions included in the evaluation form.
                  These responses offer deeper qualitative insights into participant experiences, expectations, and suggestions.
                </p>

                {([
                  {
                    q: '1. What was your single biggest takeaway or most valuable part of this activity, and why?',
                    key: 'ansTakeaways' as keyof ActivityEvaluation,
                  },
                  {
                    q: '2. Did this activity meet your expectations and how did it make you feel?',
                    key: 'ansExpectations' as keyof ActivityEvaluation,
                  },
                  {
                    q: '3. Was there a specific topic or activity you wish had been included?',
                    key: 'ansMissed' as keyof ActivityEvaluation,
                  },
                  {
                    q: '4. If you could change one thing, or what suggestions do you have for next time?',
                    key: 'ansSuggestions' as keyof ActivityEvaluation,
                  },
                ]).map((item, qi) => {
                  const answers = filteredEvaluations
                    .map(e => (e[item.key] as string | undefined)?.trim())
                    .filter(Boolean) as string[];
                  if (answers.length === 0) return null;
                  return (
                    <div key={qi} className="space-y-2">
                      <p className="text-xs font-black text-slate-700">{item.q}</p>
                      <ul className="space-y-1.5 pl-4">
                        {answers.map((ans, ai) => (
                          <li key={ai} className="flex items-start gap-2 text-xs text-slate-600">
                            <span className="shrink-0 h-4 w-4 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-[9px] font-black text-emerald-700 mt-0.5">{ai + 1}</span>
                            <span className="leading-relaxed">{ans}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </section>
            )}

            {/* ---- IV. CONCLUSIONS & RECOMMENDATIONS ---- */}
            <section className="space-y-3">
              <h3 className="text-sm font-black uppercase text-emerald-700 border-b border-emerald-200 pb-1 tracking-wider">
                IV. Conclusions and Recommendations
              </h3>
              {(() => {
                const allVals = [
                  focusList.includes('objectives') ? averageRatingsObj.objectives : 0,
                  focusList.includes('speaker') ? averageRatingsObj.speaker : 0,
                  focusList.includes('perfQuality') ? averageRatingsObj.perfQuality : 0,
                  focusList.includes('perfTimeliness') ? averageRatingsObj.perfTimeliness : 0,
                  focusList.includes('perfStaff') ? averageRatingsObj.perfStaff : 0,
                  focusList.includes('venue') ? averageRatingsObj.venue : 0,
                  focusList.includes('facility') ? averageRatingsObj.facility : 0,
                  focusList.includes('food') ? averageRatingsObj.food : 0,
                  focusList.includes('materials') ? averageRatingsObj.materials : 0,
                  focusList.includes('overall') ? averageRatingsObj.overall : 0,
                ].filter(v => v > 0);
                const grand = allVals.length > 0 ? allVals.reduce((a, b) => a + b, 0) / allVals.length : 0;
                const vi = grand >= 4.5 ? 'Excellent' : grand >= 3.5 ? 'Very Satisfactory' : grand >= 2.5 ? 'Satisfactory' : grand >= 1.5 ? 'Fair' : 'Poor';
                const lowest = [
                  { label: 'Objectives', val: averageRatingsObj.objectives, id: 'objectives' },
                  { label: 'Speaker & Facilitation', val: averageRatingsObj.speaker, id: 'speaker' },
                  { label: 'Quality of Service', val: averageRatingsObj.perfQuality, id: 'perfQuality' },
                  { label: 'Timeliness', val: averageRatingsObj.perfTimeliness, id: 'perfTimeliness' },
                  { label: 'Staff Behavior', val: averageRatingsObj.perfStaff, id: 'perfStaff' },
                  { label: 'Venue', val: averageRatingsObj.venue, id: 'venue' },
                  { label: 'Facility', val: averageRatingsObj.facility, id: 'facility' },
                  { label: 'Food & Catering', val: averageRatingsObj.food, id: 'food' },
                  { label: 'Materials', val: averageRatingsObj.materials, id: 'materials' },
                  { label: 'Overall Satisfaction', val: averageRatingsObj.overall, id: 'overall' },
                ].filter(x => focusList.includes(x.id) && x.val > 0 && x.val < 3.5)
                  .sort((a, b) => a.val - b.val)
                  .slice(0, 3);
                return (
                  <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                    <p>
                      Based on the evaluation results gathered from <strong>{filteredEvaluations.length}</strong> respondent{filteredEvaluations.length !== 1 ? 's' : ''}, the
                      activity <strong>&ldquo;{activeActivity?.name}&rdquo;</strong> obtained a grand mean rating of <strong>{grand.toFixed(2)}</strong>,
                      which is interpreted as <strong>{vi}</strong>. This indicates that the activity was {grand >= 3.5 ? 'well-received and effectively delivered,' : grand >= 2.5 ? 'moderately received by participants, though improvements are warranted,' : 'in need of significant review and improvement,'} as
                      reflected in the overall satisfaction of the participants.
                    </p>
                    {lowest.length > 0 && (
                      <div className="space-y-2">
                        <p>The following area{lowest.length > 1 ? 's' : ''} obtained ratings below the Very Satisfactory threshold and are recommended for improvement in future activities:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {lowest.map(l => (
                            <li key={l.id}><strong>{l.label}</strong> — Mean: {l.val.toFixed(2)} ({l.val >= 2.5 ? 'Satisfactory' : l.val >= 1.5 ? 'Fair' : 'Poor'})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p>
                      It is recommended that the unit consider the qualitative feedback provided by participants when planning the next activity,
                      particularly the open-ended responses which offer constructive insights on what participants found most valuable and areas they wish were addressed.
                    </p>
                    <p className="text-slate-500 italic">
                      <em>Prepared by: _____________________________ &nbsp;&nbsp; Position: _____________________________</em>
                    </p>
                    <p className="text-slate-500 italic">
                      <em>Date: _______________________ &nbsp;&nbsp; Approved by: _____________________________</em>
                    </p>
                  </div>
                );
              })()}
            </section>

          </div>

          <DialogFooter className="px-6 py-3 border-t bg-slate-50 shrink-0">
            <Button variant="outline" onClick={() => setShowSummaryModal(false)} className="text-xs font-black uppercase">
              Close
            </Button>
            <Button
              onClick={() => window.print()}
              className="text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Printer className="h-4 w-4 mr-1.5" /> Print / Save as PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEvaluation} onOpenChange={(open) => { if (!open) setSelectedEvaluation(null); }}>
        <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900 rounded-2xl shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-[#D4AF37]/5 border-b border-[#D4AF37]/10 p-6">
            <DialogTitle className="text-base font-black uppercase text-slate-800 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#D4AF37]" />
              Participant Evaluation Details
            </DialogTitle>
            <DialogDescription className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              Submitted by {selectedEvaluation?.participantName || 'Anonymous'} on {selectedEvaluation?.submittedAt?.toDate ? format(selectedEvaluation.submittedAt.toDate(), 'MM/dd/yyyy hh:mm a') : 'N/A'}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Demographics Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-3 gap-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Participant Name</p>
                <p className="text-xs font-bold text-slate-800 uppercase mt-0.5">{selectedEvaluation?.participantName || 'Anonymous'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Office</p>
                <p className="text-xs font-bold text-slate-800 uppercase mt-0.5">{selectedEvaluation?.participantOffice || 'Not Provided'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Position</p>
                <p className="text-xs font-bold text-slate-800 uppercase mt-0.5">{selectedEvaluation?.participantPosition || 'Not Provided'}</p>
              </div>
            </div>

            {/* Structured Ratings */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Structured Category Ratings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Quality of Service', rating: selectedEvaluation?.ratingPerfQuality, comment: selectedEvaluation?.commentsPerfQuality },
                  { label: 'Timeliness of Service', rating: selectedEvaluation?.ratingPerfTimeliness, comment: selectedEvaluation?.commentsPerfTimeliness },
                  { label: 'Staff Behavior', rating: selectedEvaluation?.ratingPerfStaff, comment: selectedEvaluation?.commentsPerfStaff },
                  { label: 'Venue Quality', rating: selectedEvaluation?.ratingVenue, comment: selectedEvaluation?.commentsVenue },
                  { label: 'Facility Quality', rating: selectedEvaluation?.ratingFacility, comment: selectedEvaluation?.commentsFacility },
                  { label: 'Food Quality', rating: selectedEvaluation?.ratingFood, comment: selectedEvaluation?.commentsFood },
                  { label: 'Material Quality', rating: selectedEvaluation?.ratingMaterials, comment: selectedEvaluation?.commentsMaterials },
                  { label: 'Overall Satisfaction', rating: selectedEvaluation?.ratingOverall, comment: selectedEvaluation?.commentsOverall },
                  // Legacy Fallbacks
                  { label: 'Objectives Met', rating: selectedEvaluation?.ratingObjectives, comment: selectedEvaluation?.commentsObjectives },
                  { label: 'Speaker & Facilitator', rating: selectedEvaluation?.ratingSpeaker, comment: selectedEvaluation?.commentsSpeaker },
                  { label: 'Topic Relevance (Speaker Sub-Criteria)', rating: selectedEvaluation?.ratingTopic }
                ].filter(r => r.rating !== undefined && r.rating > 0).map((r, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-extrabold text-slate-700">{r.label}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star 
                            key={s} 
                            className={cn(
                              "h-3.5 w-3.5", 
                              s <= (r.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200"
                            )} 
                          />
                        ))}
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-[11px] text-slate-600 italic bg-slate-50/50 p-2 rounded-lg border border-slate-50">
                        "{r.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Qualitative Feedback Answers */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Qualitative Feedback Responses</h4>
              <div className="divide-y divide-slate-100 bg-slate-50 rounded-xl border border-slate-200/60 overflow-hidden">
                {[
                  { q: '1. What was your single biggest takeaway or most valuable part of this activity, and why?', val: selectedEvaluation?.ansTakeaways || selectedEvaluation?.ansValuable },
                  { q: '2. Did this activity meet your expectations and how did it make you feel? Why or why not?', val: selectedEvaluation?.ansExpectations || selectedEvaluation?.ansFeelings },
                  { q: '3. Was there a specific topic or activity you wish had been included?', val: selectedEvaluation?.ansMissed },
                  { q: '4. If you could change one thing, or what suggestions do you have to make our next activity even better?', val: selectedEvaluation?.ansSuggestions || selectedEvaluation?.ansChange }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 space-y-1.5 hover:bg-slate-100/30 transition-colors">
                    <p className="text-xs font-bold text-slate-700">{item.q}</p>
                    {item.val ? (
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border shadow-sm whitespace-pre-line leading-relaxed font-medium">
                        {item.val}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No answer provided.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* General comments */}
            {selectedEvaluation?.comments && (
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">General Comments & Suggestions</h4>
                <p className="text-xs text-slate-600 italic bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl shadow-inner whitespace-pre-line leading-relaxed font-semibold">
                  "{selectedEvaluation.comments}"
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="bg-slate-50 border-t border-slate-100 p-4">
            <Button
              type="button"
              onClick={() => setSelectedEvaluation(null)}
              className="h-10 px-6 font-black uppercase tracking-wider text-xs w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
