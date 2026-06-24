'use client';

import { useState, useMemo, useEffect } from 'react';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, doc, updateDoc, arrayUnion, Timestamp, getDocs, where, limit, deleteDoc } from '@/firebase/firestore-wrapper';
import type { Campus, Unit, Communication, CommunicationKind } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mail,
  Plus,
  Edit2,
  Search,
  Building2,
  User,
  Globe,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Check,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Info,
  Lightbulb,
  Layers,
  X,
  Loader2,
  BookOpen,
  ChevronDown,
  Volume2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useVoice } from '@/components/voice/voice-provider';
import { cn } from '@/lib/utils';

function incrementReferenceNumber(refNum: string): string {
  if (!refNum) return '';
  const match = refNum.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = parseInt(numStr, 10) + 1;
    const paddedNum = nextNum.toString().padStart(numStr.length, '0');
    return prefix + paddedNum;
  }
  const anyDigitsMatch = refNum.match(/(\d+)(?!.*\d)/);
  if (anyDigitsMatch) {
    const numStr = anyDigitsMatch[1];
    const index = anyDigitsMatch.index || 0;
    const prefix = refNum.substring(0, index);
    const suffix = refNum.substring(index + numStr.length);
    const nextNum = parseInt(numStr, 10) + 1;
    const paddedNum = nextNum.toString().padStart(numStr.length, '0');
    return prefix + paddedNum + suffix;
  }
  return refNum + '-1';
}

export default function CommunicationsPage() {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();


  const [searchTermIncoming, setSearchTermIncoming] = useState('');
  const [searchTermOutgoing, setSearchTermOutgoing] = useState('');
  const [kindFilterIncoming, setKindFilterIncoming] = useState('all');
  const [kindFilterOutgoing, setKindFilterOutgoing] = useState('all');
  const [editingCommId, setEditingCommId] = useState<string | null>(null);
  const [deleteConfirmCommId, setDeleteConfirmCommId] = useState<string | null>(null);
  const [senderNameText, setSenderNameText] = useState('');

  // Form Panel State
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);
  const [detailContext, setDetailContext] = useState<'incoming' | 'outgoing'>('incoming');

  // Form State
  const [commsMode, setCommsMode] = useState<'digital' | 'manual'>('digital');
  const [kind, setKind] = useState<CommunicationKind>('Office Memorandum');
  const [customRefNum, setCustomRefNum] = useState('');
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [subject, setSubject] = useState('');
  const [driveLink, setDriveLink] = useState('');

  // Digital Send Specifics
  const [recipientType, setRecipientType] = useState<'unit' | 'campus' | 'campus-unit' | 'individual' | 'all'>('unit');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [currentRecipientSelection, setCurrentRecipientSelection] = useState('');

  // Manual Entry Specifics
  const [manualType, setManualType] = useState<'incoming' | 'outgoing'>('incoming');
  const [manualSenderText, setManualSenderText] = useState('');
  const [manualRecipientText, setManualRecipientText] = useState('');
  const [manualOriginRefNum, setManualOriginRefNum] = useState('');

  // Receive dialog state
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [commToReceive, setCommToReceive] = useState<Communication | null>(null);
  const [receivingRefNum, setReceivingRefNum] = useState('');
  const [isReceivingSubmitting, setIsReceivingSubmitting] = useState(false);

  // Fetch collections
  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);
  const unitMap = useMemo(() => new Map((units || []).map(u => [u.id, u.name])), [units]);

  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);
  const campusMap = useMemo(() => new Map((campuses || []).map(c => [c.id, c.name])), [campuses]);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users } = useCollection<any>(usersQuery);

  const commsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'communications'),
      orderBy('createdAt', 'desc'),
      limit(150)
    );
  }, [firestore]);
  const { data: rawComms, isLoading: isLoadingComms } = useCollection<Communication>(commsQuery);

  // Role permissions
  // Coordinators and ODIMOs can both receive and log communications
  const roleLower = userRole?.toLowerCase() || '';
  const isOdimo = isAdmin ||
    roleLower.includes('odimo') ||
    roleLower.includes('coordinator');
  const isCampusOdimo = roleLower === 'campus odimo';
  const isPresident = roleLower.includes('president') || isAdmin;

  /**
   * receivingKey: the Firestore field key used inside recipientRefNums.
   * - Campus ODIMO logs at the campus level (campusId)
   * - Everyone else logs at the unit level (unitId)
   */
  const receivingKey: string = isCampusOdimo
    ? (userProfile?.campusId || '')
    : (userProfile?.unitId || '');

  /**
   * receivingLabel: human-readable name for the receiving entity.
   */
  const receivingLabel: string = isCampusOdimo
    ? (campusMap.get(userProfile?.campusId || '') || 'your campus')
    : (unitMap.get(userProfile?.unitId || '') || 'your unit');

  const canManageComm = (comm: Communication): boolean => {
    if (!userProfile) return false;
    if (isAdmin) return true;
    if (!isOdimo) return false;
    if (isCampusOdimo) {
      return !!(
        comm.senderUnitId === userProfile.campusId ||
        comm.recipientIds?.includes(userProfile.campusId) ||
        (comm.manual && comm.recipientIds?.includes(userProfile.campusId))
      );
    }
    return !!(
      comm.senderUnitId === userProfile.unitId ||
      (comm.manual && comm.recipientIds?.includes(userProfile.unitId))
    );
  };

  // Filter and process communications
  const processedComms = useMemo(() => {
    if (!rawComms || !userProfile) return { incoming: [], outgoing: [] };

    const incoming: Communication[] = [];
    const outgoing: Communication[] = [];

    rawComms.forEach(c => {
      // Determine Outgoing matching:
      // Campus ODIMO: their senderUnitId is campusId; others: senderUnitId is unitId
      const myId = isCampusOdimo ? userProfile.campusId : userProfile.unitId;
      if (c.senderUnitId === myId) {
        outgoing.push(c);
      }

      // Determine Incoming matching:
      let isIncoming = false;
      if (isCampusOdimo) {
        // Campus ODIMO sees comms addressed to their campus or to any unit within their campus
        if (!c.manual && c.senderUnitId !== userProfile.campusId) {
          if (c.recipientType === 'all') {
            isIncoming = true;
          } else if (c.recipientType === 'campus' && c.recipientIds?.includes(userProfile.campusId)) {
            isIncoming = true;
          } else if (c.recipientType === 'unit') {
            // Check if any of the recipient units belong to this campus
            const campusUnitIds = units?.filter(u => u.campusIds?.includes(userProfile.campusId || '')).map(u => u.id) || [];
            isIncoming = c.recipientIds?.some(id => campusUnitIds.includes(id)) || false;
          } else if (c.recipientType === 'individual' && c.recipientIds?.includes(userProfile.id)) {
            isIncoming = true;
          }
        }
      } else {
        if (c.manual && c.manualType === 'incoming' && c.recipientIds?.includes(userProfile.unitId)) {
          isIncoming = true;
        } else if (!c.manual && c.senderUnitId !== userProfile.unitId) {
          if (c.recipientType === 'all') {
            isIncoming = true;
          } else if (c.recipientType === 'campus' && c.recipientIds?.includes(userProfile.campusId)) {
            isIncoming = true;
          } else if (c.recipientType === 'unit' && c.recipientIds?.includes(userProfile.unitId)) {
            isIncoming = true;
          } else if (c.recipientType === 'individual' && c.recipientIds?.includes(userProfile.id)) {
            isIncoming = true;
          }
        }
      }

      if (isIncoming) {
        // If not ODIMO/Coordinator, only show incoming comms that have been received/logged
        const isReceivedByUnit = !!c.recipientRefNums?.[receivingKey];
        if (isOdimo || isReceivedByUnit) {
          incoming.push(c);
        }
      }
    });

    return { incoming, outgoing };
  }, [rawComms, userProfile, isOdimo, isCampusOdimo, receivingKey, units]);

  const filterComms = (list: Communication[], search: string, kind: string) => {
    return list.filter(c => {
      const matchesSearch = c.subject?.toLowerCase().includes(search.toLowerCase()) ||
                            c.senderRefNum?.toLowerCase().includes(search.toLowerCase()) ||
                            c.recipientRefNums?.[receivingKey]?.toLowerCase().includes(search.toLowerCase());
      const matchesKind = kind === 'all' || c.kind === kind;
      return matchesSearch && matchesKind;
    });
  };

  const incomingFiltered = useMemo(() => filterComms(processedComms.incoming, searchTermIncoming, kindFilterIncoming), [processedComms.incoming, searchTermIncoming, kindFilterIncoming, receivingKey]);
  const outgoingFiltered = useMemo(() => filterComms(processedComms.outgoing, searchTermOutgoing, kindFilterOutgoing), [processedComms.outgoing, searchTermOutgoing, kindFilterOutgoing, receivingKey]);

  const unreadCount = useMemo(() => {
    if (!userProfile) return 0;
    return processedComms.incoming.filter(c => {
      const hasRead = c.readBy?.includes(userProfile.id) || (userProfile.unitId && c.readBy?.includes(userProfile.unitId));
      return !hasRead && c.senderUnitId !== userProfile.unitId;
    }).length;
  }, [processedComms.incoming, userProfile]);

  const handleAddRecipient = () => {
    if (currentRecipientSelection && !selectedRecipients.includes(currentRecipientSelection)) {
      setSelectedRecipients(prev => [...prev, currentRecipientSelection]);
      setCurrentRecipientSelection('');
    }
  };

  const handleRemoveRecipient = (id: string) => {
    setSelectedRecipients(prev => prev.filter(r => r !== id));
  };

  const resetForm = () => {
    setSubject('');
    setDriveLink('');
    setSelectedRecipients([]);
    setCurrentRecipientSelection('');
    setManualSenderText('');
    setManualRecipientText('');
    setManualOriginRefNum('');
    setKind('Office Memorandum');
    setCustomDate(format(new Date(), 'yyyy-MM-dd'));
    setEditingCommId(null);
    setSenderNameText('');
  };

  // Google Drive preview URL parser
  const getGoogleDrivePreviewUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return url;
  };

  const handleOpenDetail = async (comm: Communication, context: 'incoming' | 'outgoing') => {
    setSelectedComm(comm);
    setDetailContext(context);
    // Mark as read in Firestore if not read yet
    if (firestore && userProfile && comm.id) {
      const hasRead = comm.readBy?.includes(userProfile.id) || (userProfile.unitId && comm.readBy?.includes(userProfile.unitId));
      if (!hasRead) {
        try {
          await updateDoc(doc(firestore, 'communications', comm.id), {
            readBy: userProfile.unitId ? arrayUnion(userProfile.id, userProfile.unitId) : arrayUnion(userProfile.id)
          });
        } catch (e) {
          console.error('Error marking as read:', e);
        }
      }
    }
  };

  const getAutoReferenceNumber = (mode: 'digital' | 'manual', mType: 'incoming' | 'outgoing'): string => {
    if (!userProfile) return '';
    const currentYear = new Date().getFullYear();
    const isIncoming = (mode === 'manual' && mType === 'incoming');

    if (isIncoming) {
      // Use receivingKey (campusId for Campus ODIMO, unitId for others)
      const lastIncomingWithRef = processedComms.incoming.find(
        (c) => c.recipientRefNums?.[receivingKey]
      );
      if (lastIncomingWithRef?.recipientRefNums) {
        const lastRef = lastIncomingWithRef.recipientRefNums[receivingKey];
        if (lastRef) return incrementReferenceNumber(lastRef);
      }
      return `${currentYear}-001`;
    } else {
      const lastOutgoing = processedComms.outgoing[0];
      if (lastOutgoing) {
        const lastRef = lastOutgoing.senderRefNum || '';
        if (lastRef) {
          return incrementReferenceNumber(lastRef);
        }
      }
      return `${currentYear}-001`;
    }
  };

  const getNextIncomingRefNum = (): string => {
    if (!userProfile) return '';
    const currentYear = new Date().getFullYear();
    // Use receivingKey (campusId for Campus ODIMO, unitId for others)
    const lastIncomingWithRef = processedComms.incoming.find(
      (c) => c.recipientRefNums?.[receivingKey]
    );
    if (lastIncomingWithRef?.recipientRefNums) {
      const lastRef = lastIncomingWithRef.recipientRefNums[receivingKey];
      if (lastRef) return incrementReferenceNumber(lastRef);
    }
    return `${currentYear}-001`;
  };

  const handleOpenReceiveDialog = (comm: Communication) => {
    setCommToReceive(comm);
    const nextRef = getNextIncomingRefNum();
    setReceivingRefNum(nextRef);
    setIsReceiveDialogOpen(true);
  };

  const handleReceiveComm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !userProfile || !commToReceive?.id) return;
    if (!receivingRefNum.trim()) {
      toast({ title: 'Validation Error', description: 'Receiving reference number is required.', variant: 'destructive' });
      return;
    }

    // Validate that the receivingKey is valid — required for the Firestore field path
    const stampKey = receivingKey.trim();
    if (!stampKey) {
      toast({
        title: isCampusOdimo ? 'Missing Campus Assignment' : 'Missing Unit Assignment',
        description: isCampusOdimo
          ? 'Your account does not have a campus assigned. Please complete your profile or contact an administrator.'
          : 'Your account does not have a unit assigned. Please complete your profile or contact an administrator.',
        variant: 'destructive'
      });
      return;
    }

    setIsReceivingSubmitting(true);
    try {
      const docRef = doc(firestore, 'communications', commToReceive.id);
      const readByEntries: string[] = [userProfile.id, stampKey];

      await updateDoc(docRef, {
        [`recipientRefNums.${stampKey}`]: receivingRefNum.trim(),
        readBy: arrayUnion(...readByEntries)
      });

      toast({
        title: 'Communication Received & Stamped',
        description: `Successfully logged under Receiver's Ref: ${receivingRefNum} for ${receivingLabel}`,
      });
      setIsReceiveDialogOpen(false);
      setCommToReceive(null);
    } catch (err: any) {
      console.error('Error receiving communication:', err);
      toast({ title: 'Database Error', description: err.message || 'Failed to receive communication.', variant: 'destructive' });
    } finally {
      setIsReceivingSubmitting(false);
    }
  };

  useEffect(() => {
    if (isLogFormOpen && !editingCommId) {
      const nextRef = getAutoReferenceNumber(commsMode, manualType);
      setCustomRefNum(nextRef);
    }
  }, [commsMode, manualType, rawComms, isLogFormOpen, editingCommId]);

  useEffect(() => {
    if (isLogFormOpen && !editingCommId) {
      if (commsMode === 'manual' && manualType === 'incoming') {
        setSenderNameText('');
      } else if (userProfile && users) {
        const coordinatorName = getUnitHeadName(userProfile.unitId);
        setSenderNameText(coordinatorName || `${userProfile.firstName} ${userProfile.lastName}`);
      }
    }
  }, [commsMode, manualType, users, userProfile, isLogFormOpen, editingCommId]);

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !userProfile) return;

    if (!customRefNum.trim()) {
      toast({ title: 'Validation Error', description: 'Reference number is required.', variant: 'destructive' });
      return;
    }

    if (!subject.trim()) {
      toast({ title: 'Validation Error', description: 'Subject is required.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);

      let computedSenderRef = '';
      const computedRecipientRefs: Record<string, string> = {};

      if (commsMode === 'digital') {
        // Digital outbound: use the user-entered reference number
        computedSenderRef = customRefNum;
        // recipientRefNums will start empty for digital communications. Recipient units assign their own sequence upon receipt.
      } else {
        // Manual entries
        if (manualType === 'incoming') {
          if (!manualSenderText.trim()) {
            toast({ title: 'Validation Error', description: 'Sender details are required.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
          }
          if (!manualOriginRefNum.trim()) {
            toast({ title: 'Validation Error', description: "Origin's Reference Number is required for manual incoming.", variant: 'destructive' });
            setIsSubmitting(false);
            return;
          }
          // Use user-entered receiving reference number, keyed by receivingKey
          if (receivingKey) computedRecipientRefs[receivingKey] = customRefNum;
          // Use user-entered origin's reference number (stored in manualOriginRefNum)
          computedSenderRef = manualOriginRefNum;
        } else {
          if (!manualRecipientText.trim()) {
            toast({ title: 'Validation Error', description: 'Recipient details are required.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
          }
          // Use user-entered reference number
          computedSenderRef = customRefNum;
        }
      }

      // Assemble document payload
      const parsedDate = customDate ? new Date(customDate) : new Date();
      const now = new Date();
      parsedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      const payload: any = {
        kind,
        subject,
        driveLink: driveLink || null,
        createdAt: Timestamp.fromDate(parsedDate),
        manual: commsMode === 'manual',
        readBy: receivingKey ? [userProfile.id, receivingKey] : [userProfile.id],
        senderName: senderNameText.trim() || null,
      };

      if (commsMode === 'digital') {
        // Campus ODIMO sends on behalf of their campus (senderUnitId = campusId for routing purposes)
        payload.senderUnitId = isCampusOdimo ? userProfile.campusId : userProfile.unitId;
        payload.senderRefNum = computedSenderRef;
        payload.recipientRefNums = computedRecipientRefs;

        // Handle "campus-unit" pseudo-type: send to all units within the Campus ODIMO's campus
        if (recipientType === 'campus-unit') {
          const campusUnitIds = units?.filter(u => u.campusIds?.includes(userProfile.campusId || '')).map(u => u.id) || [];
          const campusName = campusMap.get(userProfile.campusId || '') || 'Campus';
          payload.recipientType = 'unit';
          payload.recipientIds = campusUnitIds;
          payload.toText = `All Units — ${campusName}`;
        } else {
          payload.recipientType = recipientType;
          payload.recipientIds = selectedRecipients;

          let toText = '';
          if (recipientType === 'all') {
            toText = 'University-Wide (All)';
          } else if (recipientType === 'unit') {
            toText = selectedRecipients.map(id => unitMap.get(id) || id).join(', ');
          } else if (recipientType === 'campus') {
            toText = selectedRecipients.map(id => campusMap.get(id) || id).join(', ');
          } else if (recipientType === 'individual') {
            toText = selectedRecipients.map(id => {
              const u = users?.find((x: any) => x.id === id);
              return u ? `${u.firstName} ${u.lastName}` : id;
            }).join(', ');
          }
          payload.toText = toText;
        }
        const resolvedSenderName = isCampusOdimo
          ? (campusMap.get(userProfile.campusId || '') || userProfile.campusId || '')
          : (units?.find(u => u.id === userProfile.unitId)?.name || userProfile.unitId || '');
        payload.senderText = resolvedSenderName;
      } else {
        // Manual entry
        payload.manualType = manualType;
        const resolvedSenderName = isCampusOdimo
          ? (campusMap.get(userProfile.campusId || '') || userProfile.campusId || '')
          : (units?.find(u => u.id === userProfile.unitId)?.name || userProfile.unitId || '');
        if (manualType === 'incoming') {
          payload.senderText = manualSenderText;
          payload.toText = resolvedSenderName;
          payload.recipientIds = receivingKey ? [receivingKey] : [];
          payload.recipientRefNums = computedRecipientRefs;
          payload.senderRefNum = computedSenderRef;
        } else {
          payload.senderUnitId = isCampusOdimo ? userProfile.campusId : userProfile.unitId;
          payload.senderText = resolvedSenderName;
          payload.senderRefNum = computedSenderRef;
          payload.toText = manualRecipientText;
        }
      }

      if (editingCommId) {
        await updateDoc(doc(firestore, 'communications', editingCommId), payload);
        toast({
          title: 'Communication Updated',
          description: `Successfully updated Reference Sequence: ${payload.senderRefNum || payload.recipientRefNums?.[receivingKey] || 'N/A'}`,
        });
      } else {
        await addDoc(collection(firestore, 'communications'), payload);
        toast({
          title: 'Communication Logged',
          description: `Successfully logged under Reference Sequence: ${payload.senderRefNum || payload.recipientRefNums?.[receivingKey] || 'N/A'}`,
        });
      }

      setIsLogFormOpen(false);
      resetForm();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Database Error', description: e.message || 'Failed to log communication.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUnitHeadName = (unitIdOrText: string): string => {
    if (!unitIdOrText || !users) return '';
    const isUnitId = units?.some(u => u.id === unitIdOrText);
    const targetUnitId = isUnitId ? unitIdOrText : (users.find((u: any) => u.unitId === unitIdOrText)?.unitId || '');
    if (!targetUnitId) return '';

    const coord = users.find((u: any) => u.unitId === targetUnitId && u.role === 'Unit Coordinator');
    if (coord) return `${coord.firstName} ${coord.lastName}`;

    const coordLike = users.find((u: any) => u.unitId === targetUnitId && u.role?.toLowerCase().includes('coordinator'));
    if (coordLike) return `${coordLike.firstName} ${coordLike.lastName}`;

    const directorLike = users.find((u: any) => u.unitId === targetUnitId && (u.role?.toLowerCase().includes('director') || u.role?.toLowerCase().includes('head')));
    if (directorLike) return `${directorLike.firstName} ${directorLike.lastName}`;

    const odimo = users.find((u: any) => u.unitId === targetUnitId && u.role === 'Unit ODIMO');
    if (odimo) return `${odimo.firstName} ${odimo.lastName}`;

    const anyUser = users.find((u: any) => u.unitId === targetUnitId);
    if (anyUser) return `${anyUser.firstName} ${anyUser.lastName}`;

    return '';
  };

  const resolveUnitName = (unitIdOrText: string): string => {
    if (!unitIdOrText) return 'N/A';
    if (unitMap.has(unitIdOrText)) {
      return unitMap.get(unitIdOrText) || unitIdOrText;
    }
    const matchingUnit = units?.find(u => u.id === unitIdOrText);
    if (matchingUnit) return matchingUnit.name;
    return unitIdOrText;
  };

  const getMonthYearRange = (comms: Communication[]) => {
    if (comms.length === 0) {
      return format(new Date(), 'MMMM yyyy');
    }
    const dates = comms.map(c => {
      if (c.createdAt?.toDate) return c.createdAt.toDate();
      if (c.createdAt?.seconds) return new Date(c.createdAt.seconds * 1000);
      return new Date(c.createdAt || Date.now());
    });
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const minStr = format(minDate, 'MMMM yyyy');
    const maxStr = format(maxDate, 'MMMM yyyy');
    return minStr === maxStr ? minStr : `${minStr} - ${maxStr}`;
  };

  const getRefNosRange = (comms: Communication[], isIncoming: boolean) => {
    if (comms.length === 0) return 'N/A';
    const refs = comms.map(c => {
      return isIncoming
        ? (c.recipientRefNums?.[receivingKey] || '')
        : (c.senderRefNum || '');
    }).filter(Boolean);
    if (refs.length === 0) return 'N/A';
    if (refs.length === 1) return refs[0];
    return `${refs[0]} - ${refs[refs.length - 1]}`;
  };

  const handlePrintLogbook = (type: 'incoming' | 'outgoing') => {
    if (!userProfile) return;

    const list = processedComms[type];
    const search = type === 'incoming' ? searchTermIncoming : searchTermOutgoing;
    const kind = type === 'incoming' ? kindFilterIncoming : kindFilterOutgoing;
    const printList = [...list].filter(c => {
      const matchesSearch = c.subject?.toLowerCase().includes(search.toLowerCase()) ||
                            c.senderRefNum?.toLowerCase().includes(search.toLowerCase()) ||
                            c.recipientRefNums?.[receivingKey]?.toLowerCase().includes(search.toLowerCase());
      const matchesKind = kind === 'all' || c.kind === kind;
      return matchesSearch && matchesKind;
    }).sort((a, b) => {
      const tA = a.createdAt?.seconds || 0;
      const tB = b.createdAt?.seconds || 0;
      return tA - tB;
    });

    if (printList.length === 0) {
      toast({
        title: 'No Records Found',
        description: `There are no ${type} communications to print under your current filters.`,
        variant: 'destructive'
      });
      return;
    }

    const monthYear = getMonthYearRange(printList);
    const refNos = getRefNosRange(printList, type === 'incoming');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Pop-up Blocked',
        description: 'Please allow pop-ups to print the logbook.',
        variant: 'destructive'
      });
      return;
    }

    const isIncoming = type === 'incoming';

    let blocksHtml = '';
    printList.forEach((comm) => {
      const dateOfReceipt = comm.createdAt?.toDate ? format(comm.createdAt.toDate(), 'MM/dd/yyyy') : 'N/A';
      const originRefNo = comm.senderRefNum || 'N/A';
      const receiverRefNo = isIncoming
        ? (comm.recipientRefNums?.[receivingKey] || 'Pending Receipt')
        : 'N/A';
      const nameOfAddressee = comm.toText || 'N/A';
      
      let nameOfSender = comm.senderName || 'N/A';
      let agencyOrCompany = 'N/A';
      const officeOrUnit = !isIncoming
        ? resolveUnitName(comm.senderUnitId || (isCampusOdimo ? userProfile.campusId : userProfile.unitId) || '')
        : 'N/A';

      if (isIncoming) {
        if (comm.manual) {
          agencyOrCompany = comm.senderText || 'N/A';
          if (nameOfSender === 'N/A') {
            if (comm.senderText && comm.senderText.includes('/')) {
              const parts = comm.senderText.split('/');
              agencyOrCompany = parts[0].trim();
              nameOfSender = parts[1].trim();
            } else {
              nameOfSender = comm.senderText || 'N/A';
            }
          }
        } else {
          const senderUnitId = comm.senderUnitId || comm.senderText;
          agencyOrCompany = resolveUnitName(senderUnitId);
          if (nameOfSender === 'N/A') {
            const headName = getUnitHeadName(senderUnitId);
            nameOfSender = headName || 'N/A';
          }
        }
      } else {
        if (nameOfSender === 'N/A') {
          const senderUnitId = comm.senderUnitId || userProfile.unitId;
          const headName = getUnitHeadName(senderUnitId);
          nameOfSender = headName || 'N/A';
        }
      }

      // Format sender name display as: Name of the Sender (office prefix removed to avoid redundancy)
      const resolvedSenderNameDisplay = nameOfSender;

      const address = 'Romblon State University, Main Campus, Odiongan, Romblon';
      const subject = comm.subject || 'N/A';

      blocksHtml += `
        <div class="page-block" style="page-break-inside: avoid; margin-bottom: 40px; max-width: 800px; margin-left: auto; margin-right: auto;">
          <!-- Header for individual block -->
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-family: sans-serif; margin-bottom: 4px; border-bottom: none;">
            <div>
              <div style="font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.2;">ROMBLON STATE UNIVERSITY</div>
              <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">${isIncoming ? 'INCOMING COMMUNICATION' : 'OUTGOING COMMUNICATION'}</div>
              <div style="margin-top: 4px;">
                <span style="font-weight: bold;">Month / Year:</span>
                <span style="border-bottom: 1px solid black; padding: 0 10px; font-weight: bold;">${monthYear}</span>
              </div>
            </div>
            <div style="align-self: flex-end; padding-bottom: 2px;">
              <span style="font-weight: bold;">Ref. Nos:</span>
              <span style="border-bottom: 1px solid black; padding: 0 10px; font-weight: bold;">${refNos}</span>
            </div>
          </div>

          <!-- Bordered Box containing the template -->
          <div class="border-box" style="border: 2px solid black; padding: 15px; font-family: sans-serif; font-size: 13px; background-color: #fff;">
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
              <tbody>
                <!-- Row 1: Date of Receipt & Reference No -->
                <tr style="border-bottom: 1px solid black;">
                  <td style="width: 50%; padding: 8px 0; border-right: 1px solid black; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    Date of Receipt: <span style="font-weight: normal; text-decoration: underline; padding-left: 5px;">${dateOfReceipt}</span>
                  </td>
                  <td style="width: 50%; padding: 8px 0; padding-left: 15px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${isIncoming ? `Receiver's Ref No: <span style="font-weight: bold; text-decoration: underline; padding-left: 5px; font-family: monospace;">${receiverRefNo}</span>` : `Reference No: <span style="font-weight: bold; text-decoration: underline; padding-left: 5px; font-family: monospace;">${originRefNo}</span>`}
                  </td>
                </tr>
                ${isIncoming ? `
                <tr style="border-bottom: 1px solid black;">
                  <td colspan="2" style="padding: 8px 0; font-weight: bold;">
                    Origin's Ref No: <span style="font-weight: normal; text-decoration: underline; padding-left: 5px; font-family: monospace;">${originRefNo}</span>
                  </td>
                </tr>
                ` : ''}

                <!-- Row 2: Name of Addressee -->
                <tr style="border-bottom: 1px solid black;">
                  <td colspan="2" style="padding: 8px 0; font-weight: bold;">
                    Name of Addressee: <span style="font-weight: normal; text-decoration: underline; padding-left: 5px;">${nameOfAddressee}</span>
                  </td>
                </tr>

                <!-- Row 3 & 4: Sender / Office/Unit -->
                ${isIncoming ? `
                <tr style="border-bottom: 1px solid black;">
                  <td colspan="2" style="padding: 8px 0; font-weight: bold;">
                    Name of Sender: <span style="font-weight: normal; text-decoration: underline; padding-left: 5px;">${resolvedSenderNameDisplay}</span>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid black;">
                  <td colspan="2" style="padding: 8px 0; font-weight: bold;">
                    Agency/Company: <span style="font-weight: normal; text-decoration: underline; padding-left: 5px;">${agencyOrCompany}</span>
                  </td>
                </tr>
                ` : `
                <tr style="border-bottom: 1px solid black;">
                  <td colspan="2" style="padding: 8px 0; font-weight: bold;">
                    Office / Unit: <span style="font-weight: normal; text-decoration: underline; padding-left: 5px;">${officeOrUnit}</span>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid black;">
                  <td colspan="2" style="padding: 8px 0; font-weight: bold;">
                    Name of Sender: <span style="font-weight: normal; text-decoration: underline; padding-left: 5px;">${resolvedSenderNameDisplay}</span>
                  </td>
                </tr>
                `}

                <!-- Row 5: Address -->
                <tr style="border-bottom: 1px solid black;">
                  <td colspan="2" style="padding: 8px 0; font-weight: bold;">
                    Address: <span style="font-weight: normal; text-decoration: underline; padding-left: 5px;">${address}</span>
                  </td>
                </tr>

                <!-- Row 6: Subject -->
                <tr ${!isIncoming ? 'style="border-bottom: 1px solid black;"' : ''}>
                  <td colspan="2" style="padding: 8px 0; font-weight: bold; vertical-align: top;">
                    <div style="display: flex; align-items: flex-start;">
                      <span style="flex-shrink: 0;">Subject:</span>
                      <div style="flex-grow: 1; padding-left: 10px; font-weight: normal; line-height: 1.8;">
                        <span style="text-decoration: underline; display: block; word-wrap: break-word;">${subject}</span>
                        <div style="border-bottom: 1px solid #ddd; height: 20px; margin-top: 5px;"></div>
                        <div style="border-bottom: 1px solid #ddd; height: 20px; margin-top: 5px;"></div>
                      </div>
                    </div>
                  </td>
                </tr>

                <!-- Row 7: Remarks (Outgoing only) -->
                ${!isIncoming ? `
                <tr>
                  <td colspan="2" style="padding: 12px 0 4px 0; font-weight: bold;">
                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 15px; font-size: 11px;">
                      <span>Remarks:</span>
                      <label style="display: flex; align-items: center; gap: 5px; font-weight: normal; margin-right: 15px;">
                        <span style="border: 1px solid black; display: inline-block; width: 12px; height: 12px; border-radius: 2px;"></span>
                        Delivered / Recieved
                      </label>
                      <label style="display: flex; align-items: center; gap: 5px; font-weight: normal; margin-right: 15px;">
                        <span style="border: 1px solid black; display: inline-block; width: 12px; height: 12px; border-radius: 2px;"></span>
                        Lost in Transit
                      </label>
                      <label style="display: flex; align-items: center; gap: 5px; font-weight: normal; margin-right: 15px;">
                        <span style="border: 1px solid black; display: inline-block; width: 12px; height: 12px; border-radius: 2px;"></span>
                        Returned to Senter
                      </label>
                      <label style="display: flex; align-items: center; gap: 5px; font-weight: normal;">
                        <span style="border: 1px solid black; display: inline-block; width: 12px; height: 12px; border-radius: 2px;"></span>
                        Addresee can't be located
                      </label>
                    </div>
                  </td>
                </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>
      `;
    });

    const title = `Communication ${isIncoming ? 'Incoming' : 'Outgoing'} Logbook`;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @media print {
              body {
                background: white;
                color: black;
                margin: 0.4in !important;
                padding: 0 !important;
              }
              .no-print {
                display: none !important;
              }
              .page-block {
                page-break-inside: avoid;
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #f8fafc;
              color: #1e293b;
              padding: 40px;
              margin: 0;
            }
            .no-print-bar {
              background-color: #1e1b4b;
              color: white;
              padding: 15px 25px;
              border-radius: 12px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              max-width: 800px;
              margin-left: auto;
              margin-right: auto;
            }
            .print-btn {
              background-color: #3b82f6;
              color: white;
              border: none;
              padding: 10px 20px;
              font-weight: 900;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.05em;
              border-radius: 8px;
              cursor: pointer;
              box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
              transition: all 0.2s;
            }
            .print-btn:hover {
              background-color: #2563eb;
              transform: translateY(-1px);
            }
          </style>
        </head>
        <body>
          <div class="no-print no-print-bar">
            <div>
              <div style="font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Logbook Print Preview</div>
              <div style="font-size: 11px; opacity: 0.8; font-weight: 500; margin-top: 2px;">Review layout and click the print button.</div>
            </div>
            <button onclick="window.print()" class="print-btn">Print Logbook</button>
          </div>
          <div id="print-content">
            ${blocksHtml}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleEditComm = (comm: Communication) => {
    setEditingCommId(comm.id);
    setSubject(comm.subject || '');
    setDriveLink(comm.driveLink || '');
    setKind(comm.kind);
    
    const formattedDate = comm.createdAt?.toDate 
      ? format(comm.createdAt.toDate(), 'yyyy-MM-dd') 
      : (comm.createdAt?.seconds 
          ? format(new Date(comm.createdAt.seconds * 1000), 'yyyy-MM-dd') 
          : format(new Date(), 'yyyy-MM-dd'));
    setCustomDate(formattedDate);

    setSenderNameText(comm.senderName || '');
    if (comm.manual) {
      setCommsMode('manual');
      setManualType(comm.manualType || 'incoming');
      if (comm.manualType === 'incoming') {
        setManualSenderText(comm.senderText || '');
        setManualOriginRefNum(comm.senderRefNum || '');
        const displayRefNum = comm.recipientRefNums?.[receivingKey] || '';
        setCustomRefNum(displayRefNum);
      } else {
        setManualRecipientText(comm.toText || '');
        setCustomRefNum(comm.senderRefNum || '');
      }
    } else {
      setCommsMode('digital');
      setCustomRefNum(comm.senderRefNum || '');
      setRecipientType(comm.recipientType || 'unit');
      setSelectedRecipients(comm.recipientIds || []);
    }
    
    setIsLogFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteComm = async (commId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'communications', commId));
      toast({
        title: 'Record Deleted',
        description: 'The communication record has been successfully deleted.'
      });
      setDeleteConfirmCommId(null);
      if (selectedComm?.id === commId) {
        setSelectedComm(null);
      }
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Error Deleting Record',
        description: e.message || 'Failed to delete communication.',
        variant: 'destructive'
      });
    }
  };

  const { speak: speakVoice, enabled: voiceEnabled } = useVoice();

  const renderCommTable = (comms: Communication[], tab: 'incoming' | 'outgoing', loading: boolean) => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-slate-200/60 shadow-md">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600 opacity-40" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading records...</span>
        </div>
      );
    }
    if (comms.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2 bg-white rounded-2xl border border-slate-200/60 shadow-md">
          <Mail className="h-8 w-8 text-slate-300 stroke-[1.5]" />
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">No logs recorded</h4>
            <p className="text-[9px] text-slate-400 font-medium mt-1">There are no records matching your current filter settings.</p>
          </div>
        </div>
      );
    }
    return (
      <Card className="shadow-md border-slate-200/60 overflow-hidden bg-white rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/70 border-b">
              <TableRow>
                <TableHead className="pl-6 py-3 text-[9px] font-black uppercase text-slate-500 tracking-wider">Reference No.</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Date Logged</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Category</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">{tab === 'incoming' ? 'From' : 'To'}</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider max-w-sm">Subject</TableHead>
                <TableHead className="text-right pr-6 text-[9px] font-black uppercase text-slate-500 tracking-wider">Document</TableHead>
                {isOdimo && (
                  <TableHead className="text-right pr-6 text-[9px] font-black uppercase text-slate-500 tracking-wider w-28">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comms.map((comm) => {
                const hasRead = comm.readBy?.includes(userProfile?.id || '') || (receivingKey && comm.readBy?.includes(receivingKey));
                const isUnread = tab === 'incoming' && !hasRead && comm.senderUnitId !== (isCampusOdimo ? userProfile?.campusId : userProfile?.unitId);
                const dateStr = comm.createdAt?.toDate ? format(comm.createdAt.toDate(), 'MMM dd, yyyy') : '...';
                const receiverRef = comm.recipientRefNums?.[receivingKey];
                const originRef = comm.senderRefNum;

                return (
                  <TableRow
                    key={comm.id}
                    onClick={() => handleOpenDetail(comm, tab)}
                    className={cn(
                      "cursor-pointer hover:bg-slate-50/80 transition-all border-b relative group",
                      isUnread && "bg-indigo-50/10 hover:bg-indigo-50/20 font-bold"
                    )}
                  >
                    <TableCell className="pl-6 py-3 relative">
                      {isUnread && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 rounded-r bg-indigo-600 transition-all" />
                      )}
                      <div className="flex flex-col gap-1">
                        {tab === 'incoming' ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              {isUnread && (
                                <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                              )}
                              <span className="text-[9px] font-black uppercase text-slate-400">Rec. Ref:</span>
                              {receiverRef ? (
                                <span className="font-mono font-black text-[10px] text-slate-800 uppercase tabular-nums transition-transform group-hover:translate-x-1">
                                  {receiverRef}
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[8px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-205">
                                  Pending Receipt
                                </span>
                              )}
                            </div>
                            {originRef && (
                              <div className="text-[9px] text-slate-500 font-medium">
                                <span className="uppercase text-slate-400 font-bold">Orig. Ref:</span>{' '}
                                <span className="font-mono">{originRef}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-[10px] text-slate-800 uppercase tabular-nums transition-transform group-hover:translate-x-1">
                              {originRef || 'N/A'}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-500 font-medium tabular-nums">{dateStr}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="h-4 text-[7px] font-black uppercase bg-slate-100 text-slate-700 border-none px-2 rounded-full">
                        {comm.kind}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-800 font-black">
                      {tab === 'incoming' ? (
                        comm.manual ? comm.senderText : resolveUnitName(comm.senderUnitId || comm.senderText)
                      ) : (
                        comm.toText
                      )}
                    </TableCell>
                    <TableCell className="max-w-md py-3">
                      <p className={cn("text-[10px] text-slate-700 truncate", isUnread ? "font-bold text-slate-900" : "font-medium")}>
                        {comm.subject}
                      </p>
                    </TableCell>
                    <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                      {comm.driveLink ? (
                        <a
                          href={comm.driveLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[8px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                        >
                          Open Drive <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : (
                        <span className="text-[8px] text-slate-400 font-bold uppercase italic">No Link</span>
                      )}
                    </TableCell>
                    {isOdimo && (
                      <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5 justify-end w-full">
                          {tab === 'incoming' && !comm.recipientRefNums?.[receivingKey] ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReceiveDialog(comm)}
                              className="h-7 px-2 text-[8px] font-black uppercase tracking-wider text-emerald-600 border-emerald-250 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg flex items-center gap-1 shrink-0"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Receive
                            </Button>
                          ) : null}
                          {canManageComm(comm) ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditComm(comm)}
                                className="h-7 w-7 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                              >
                                <Edit2 className="h-3.5 w-3.5 shrink-0" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirmCommId(comm.id)}
                                className="h-7 w-7 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg"
                              >
                                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                              </Button>
                            </>
                          ) : (
                            !(!comm.recipientRefNums?.[receivingKey] && tab === 'incoming') && (
                              <span className="text-[8px] text-slate-400 font-bold uppercase italic">Locked</span>
                            )
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-primary p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-5 w-5 text-white/80" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Institutional Correspondence Management</p>
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight">Communications Logbook</h3>
            <p className="text-sm text-white/70 font-medium mt-1">Official incoming and outgoing records for <span className="font-black text-white">{receivingLabel}</span></p>
            {voiceEnabled && (
              <button
                onClick={() => {
                  speakVoice('Communications Logbook. This page shows incoming and outgoing correspondence records. Use the search bar to filter by subject or reference number, and the category dropdown to filter by document type. Click any row to view full details. To log a new record, click the Log or Send Communication button.');
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white/90 transition-colors"
              >
                <Volume2 className="h-3.5 w-3.5" /> Listen to Guide
              </button>
            )}
          </div>
          {isOdimo && (
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                onClick={() => handlePrintLogbook('incoming')} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-wider py-5 px-4 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105"
              >
                <FileText className="h-4 w-4 shrink-0" />
                Print Incoming Logbook
              </Button>
              <Button 
                onClick={() => handlePrintLogbook('outgoing')} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-wider py-5 px-4 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105"
              >
                <FileText className="h-4 w-4 shrink-0" />
                Print Outgoing Logbook
              </Button>
              <Button 
                onClick={() => { setIsLogFormOpen(!isLogFormOpen); resetForm(); }} 
                className="bg-white hover:bg-slate-50 text-indigo-700 font-black uppercase text-xs tracking-wider py-5 px-6 rounded-xl shadow-lg border border-indigo-100 flex items-center gap-2 transition-all hover:scale-105"
              >
                {isLogFormOpen ? <X className="h-4.5 w-4.5 text-indigo-700 shrink-0" /> : <Plus className="h-4.5 w-4.5 text-indigo-700 shrink-0" />}
                {isLogFormOpen ? 'Close Logging Panel' : 'Log/Send Communication'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Inline Logging Form */}
      {isOdimo && isLogFormOpen && (
        <Card className="border-slate-200/80 shadow-md rounded-2xl bg-white overflow-hidden animate-in slide-in-from-top-4 duration-300 mb-6">
          <CardHeader className="bg-slate-50/70 border-b p-5">
            <CardTitle className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-600" /> {editingCommId ? 'Edit Correspondence Record' : 'Log / Send New Correspondence'}
            </CardTitle>
            <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {editingCommId ? `Modifying existing record with Reference Number: ${customRefNum}` : 'Compose a digital notification to system users, or manually log physical correspondence.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Comms Mode Switcher */}
            <div className="flex border p-0.5 rounded-lg bg-slate-100/50 mb-5 shrink-0">
              <button
                type="button"
                disabled={!!editingCommId}
                onClick={() => { setCommsMode('digital'); resetForm(); }}
                className={cn("flex-1 text-center py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all", commsMode === 'digital' ? "bg-white shadow text-slate-850" : "text-slate-500 hover:text-slate-800", !!editingCommId && "opacity-60 cursor-not-allowed")}
              >
                Direct Digital Send
              </button>
              <button
                type="button"
                disabled={!!editingCommId}
                onClick={() => { setCommsMode('manual'); resetForm(); }}
                className={cn("flex-1 text-center py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all", commsMode === 'manual' ? "bg-white shadow text-slate-850" : "text-slate-500 hover:text-slate-800", !!editingCommId && "opacity-60 cursor-not-allowed")}
              >
                Manual Registry Log
              </button>
            </div>

            {/* Operational Guide for Logging Form */}
            <div className="mb-5 border border-slate-100 rounded-xl bg-slate-50/50 p-4">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-650" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-705">
                      Operational Guide: {commsMode === 'digital' ? 'Direct Digital Send' : 'Manual Registry Log'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                
                <div className="mt-3.5 pt-3.5 border-t border-slate-200/60 text-xs text-slate-600 space-y-2.5 text-left">
                  {commsMode === 'digital' ? (
                    <>
                      <p className="font-semibold text-slate-700">
                        Use this tab to compose and dispatch official digital notifications directly to other offices, campuses, or individual personnel within the EOMS portal.
                      </p>
                      <ul className="list-disc pl-4 space-y-1.5 font-medium">
                        <li><strong>Correspondence Type:</strong> Select the official document classification. Memorandums are restricted by user role permissions.</li>
                        <li><strong>Reference Number:</strong> Automatically increments from the last record for convenience, but remains fully editable to align with local document control numbering.</li>
                        <li><strong>Recipient Scope:</strong> Target specific units, campuses, or select individual users directly to route the digital alert.</li>
                        <li><strong>Google Drive Link:</strong> Provide the shared cloud link containing the official file (ensure view permissions are open to authorized recipients).</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-700">
                        Use this tab to log paper-based, physical, or external correspondences received or sent outside EOMS to maintain institutional compliance records.
                      </p>
                      <ul className="list-disc pl-4 space-y-1.5 font-medium">
                        <li><strong>Log Direction:</strong> Categorize as <strong>Incoming</strong> (paper mail received) or <strong>Outgoing</strong> (sent externally) to adjust form parameters.</li>
                        <li><strong>Reference Numbers:</strong> For incoming letters, record the origin office's reference code alongside your locally generated receiving control number.</li>
                        <li><strong>Sender/Recipient Info:</strong> Log the names and departments of external correspondents involved in the exchange.</li>
                        <li><strong>Scan Link:</strong> Provide a scanned PDF copy link (e.g. Google Drive) for institutional trace and verification.</li>
                      </ul>
                    </>
                  )}
                </div>
              </details>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-4">
              {/* Log Direction (for Manual Registry Log, moved to top) */}
              {commsMode === 'manual' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Log Direction</label>
                  <Select value={manualType} onValueChange={(val: any) => { setManualType(val); resetForm(); }}>
                    <SelectTrigger className="h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl">
                      <SelectValue placeholder="Log Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incoming" className="text-xs font-medium">Incoming (Received Paper/Mail)</SelectItem>
                      <SelectItem value="outgoing" className="text-xs font-medium">Outgoing (Sent Paper/External)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* KIND */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Correspondence Type</label>
                <Select value={kind} onValueChange={(val) => setKind(val as CommunicationKind)}>
                  <SelectTrigger className="h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Memorandum Order" disabled={!isPresident} className="text-xs font-medium">
                      Memorandum Order {!isPresident && '(President Only)'}
                    </SelectItem>
                    <SelectItem value="Office Order" className="text-xs font-medium">Office Order</SelectItem>
                    <SelectItem value="Office Memorandum" className="text-xs font-medium">Office Memorandum</SelectItem>
                    <SelectItem value="Communication Letter / Request" className="text-xs font-medium">Communication Letter / Request</SelectItem>
                    <SelectItem value="Invitation" className="text-xs font-medium">Invitation</SelectItem>
                    <SelectItem value="Transmittal Document" className="text-xs font-medium">Transmittal Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* REFERENCE NUMBER INPUT(S) */}
              {commsMode === 'manual' && manualType === 'incoming' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      Origin's Reference Number
                    </label>
                    <Input
                      placeholder="e.g. CHED-2026-X88"
                      value={manualOriginRefNum}
                      onChange={(e) => setManualOriginRefNum(e.target.value)}
                      className="h-10 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-indigo-500 font-mono font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                      <span>Receiving Reference Number</span>
                      <span className="text-[9px] text-indigo-600 font-bold lowercase tracking-normal italic">(Auto-populated)</span>
                    </label>
                    <Input
                      placeholder="e.g. 2026-001"
                      value={customRefNum}
                      onChange={(e) => setCustomRefNum(e.target.value)}
                      className="h-10 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-indigo-500 font-mono font-bold"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                    <span>Reference Number</span>
                    <span className="text-[9px] text-indigo-600 font-bold lowercase tracking-normal italic">(Editable - Auto-increments from last entry)</span>
                  </label>
                  <Input
                    placeholder="e.g. 2026-001"
                    value={customRefNum}
                    onChange={(e) => setCustomRefNum(e.target.value)}
                    className="h-10 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-indigo-500 font-mono font-bold"
                  />
                </div>
              )}

              {/* DATE OF RECEIPT */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Date of Receipt</label>
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="h-10 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-indigo-500 font-bold"
                />
              </div>

              {commsMode === 'digital' ? (
                <>
                  {/* FROM */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">{isCampusOdimo ? 'From Campus' : 'From Office / Unit'}</label>
                    <Input value={receivingLabel} disabled className="h-10 text-xs bg-slate-100/50 border-slate-200 rounded-xl font-bold" />
                  </div>

                  {/* SENDER NAME */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Name of Sender</label>
                    <Input
                      placeholder="e.g. Dr. John Doe (Unit Coordinator)"
                      value={senderNameText}
                      onChange={(e) => setSenderNameText(e.target.value)}
                      className="h-10 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-indigo-500 font-bold"
                    />
                  </div>

                  {/* RECIPIENT TYPE */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Send To Recipients</label>
                    <Select value={recipientType} onValueChange={(val: any) => { setRecipientType(val); setSelectedRecipients([]); }}>
                      <SelectTrigger className="h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl">
                        <SelectValue placeholder="Select Scope" />
                      </SelectTrigger>
                      <SelectContent>
                        {isCampusOdimo ? (
                          <>
                            <SelectItem value="unit" className="text-xs font-medium">Specific Unit (within campus)</SelectItem>
                            <SelectItem value="campus-unit" className="text-xs font-medium">All Units in Campus</SelectItem>
                            <SelectItem value="individual" className="text-xs font-medium">Individual User (Direct)</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="unit" className="text-xs font-medium">Academic & Oversight Units</SelectItem>
                            <SelectItem value="campus" className="text-xs font-medium">Campus Sites</SelectItem>
                            <SelectItem value="individual" className="text-xs font-medium">Individual Users (Direct)</SelectItem>
                            <SelectItem value="all" disabled={!isPresident} className="text-xs font-medium">
                              University-Wide (All Officers) {!isPresident && '(President Only)'}
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* RECIPIENT LIST BUILDER */}
                  {recipientType !== 'all' && recipientType !== 'campus-unit' && (
                    <div className="space-y-2 border p-3.5 rounded-xl bg-slate-50/50 border-slate-200">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Add Recipients</label>
                      <div className="flex gap-2">
                        <Select value={currentRecipientSelection} onValueChange={setCurrentRecipientSelection}>
                          <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-lg flex-1">
                            <SelectValue placeholder={`Select ${recipientType}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {recipientType === 'unit' && (
                              // Campus ODIMO: only units within their campus; others: all units
                              isCampusOdimo
                                ? units
                                    ?.filter(u => u.campusIds?.includes(userProfile?.campusId || ''))
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(u => (
                                      <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}</SelectItem>
                                    ))
                                : units?.sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                                    <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}</SelectItem>
                                  ))
                            )}
                            {recipientType === 'campus' && campuses?.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                              <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                            ))}
                            {recipientType === 'individual' && (
                              // Campus ODIMO: only individuals within their campus; others: all users
                              isCampusOdimo
                                ? users
                                    ?.filter((u: any) => {
                                      const userUnit = units?.find(un => un.id === u.unitId);
                                      return userUnit?.campusIds?.includes(userProfile?.campusId || '') || u.campusId === userProfile?.campusId;
                                    })
                                    .sort((a: any, b: any) => a.firstName.localeCompare(b.firstName))
                                    .map((u: any) => (
                                      <SelectItem key={u.id} value={u.id} className="text-xs">{u.firstName} {u.lastName} ({u.role})</SelectItem>
                                    ))
                                : users?.sort((a: any, b: any) => a.firstName.localeCompare(b.firstName)).map((u: any) => (
                                    <SelectItem key={u.id} value={u.id} className="text-xs">{u.firstName} {u.lastName} ({u.role})</SelectItem>
                                  ))
                            )}
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={handleAddRecipient} size="sm" className="h-9 px-4 font-bold bg-indigo-600 rounded-lg shrink-0">
                          <Plus className="h-4 w-4" /> Add
                        </Button>
                      </div>

                      {/* Selected List */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60 empty:hidden">
                        {selectedRecipients.map(id => {
                          let labelText = id;
                          if (recipientType === 'unit') labelText = unitMap.get(id) || id;
                          else if (recipientType === 'campus') labelText = campusMap.get(id) || id;
                          else if (recipientType === 'individual') {
                            const u = users?.find(x => x.id === id);
                            labelText = u ? `${u.firstName} ${u.lastName}` : id;
                          }

                          return (
                            <Badge key={id} variant="outline" className="bg-white border-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1.5">
                              {labelText}
                              <button type="button" onClick={() => handleRemoveRecipient(id)} className="text-slate-400 hover:text-rose-600 focus:outline-none">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* MANUAL ENTRY LOG */}

                  {manualType === 'incoming' ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Sender (From Office/Person)</label>
                        <Input
                          placeholder="e.g. CHED Regional Office / Executive Director"
                          value={manualSenderText}
                          onChange={(e) => setManualSenderText(e.target.value)}
                          className="h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Name of Sender</label>
                        <Input
                          placeholder="e.g. Dr. John Smith (Executive Director)"
                          value={senderNameText}
                          onChange={(e) => setSenderNameText(e.target.value)}
                          className="h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl focus-visible:ring-indigo-500 font-bold"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Recipient (To Office/Person)</label>
                        <Input
                          placeholder="e.g. RSU President / Quality Assurance Committee"
                          value={manualRecipientText}
                          onChange={(e) => setManualRecipientText(e.target.value)}
                          className="h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Name of Sender</label>
                        <Input
                          placeholder="e.g. Jane Doe (Unit Coordinator)"
                          value={senderNameText}
                          onChange={(e) => setSenderNameText(e.target.value)}
                          className="h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl focus-visible:ring-indigo-500 font-bold"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* SUBJECT */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Subject / Purpose</label>
                <Input
                  placeholder="Brief summary of the communication..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl focus-visible:ring-indigo-500"
                />
              </div>

              {/* GOOGLE DRIVE LINK */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Google Drive Link (with view permissions)</label>
                <Input
                  placeholder="https://drive.google.com/file/d/..."
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  className="h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl focus-visible:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsLogFormOpen(false)} disabled={isSubmitting} className="h-10 font-bold text-xs uppercase tracking-wider rounded-xl">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white h-10 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/15">
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
                  ) : (
                    editingCommId ? 'Save Changes' : 'Log Record'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Primary Logbook Workspace - Dual Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* --- Incoming Column --- */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600">
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
              Incoming Logbook
              {unreadCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black tabular-nums">
                  {unreadCount}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search incoming..."
                  value={searchTermIncoming}
                  onChange={(e) => setSearchTermIncoming(e.target.value)}
                  className="pl-8 h-8 text-[10px] bg-white border-slate-200 focus-visible:ring-indigo-500 rounded-lg"
                />
              </div>
              <Select value={kindFilterIncoming} onValueChange={setKindFilterIncoming}>
                <SelectTrigger className="h-8 text-[10px] bg-white border-slate-200 rounded-lg w-[130px] focus:ring-0">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-bold">All Categories</SelectItem>
                  <SelectItem value="Memorandum Order" className="text-[10px] font-medium">Memorandum Order</SelectItem>
                  <SelectItem value="Office Order" className="text-[10px] font-medium">Office Order</SelectItem>
                  <SelectItem value="Office Memorandum" className="text-[10px] font-medium">Office Memorandum</SelectItem>
                  <SelectItem value="Communication Letter / Request" className="text-[10px] font-medium">Communication Letter / Request</SelectItem>
                  <SelectItem value="Invitation" className="text-[10px] font-medium">Invitation</SelectItem>
                  <SelectItem value="Transmittal Document" className="text-[10px] font-medium">Transmittal Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {renderCommTable(incomingFiltered, 'incoming', isLoadingComms)}
        </div>

        {/* --- Outgoing Column --- */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600">
              <ArrowUpRight className="h-4 w-4 text-indigo-600" />
              Outgoing Logbook
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search outgoing..."
                  value={searchTermOutgoing}
                  onChange={(e) => setSearchTermOutgoing(e.target.value)}
                  className="pl-8 h-8 text-[10px] bg-white border-slate-200 focus-visible:ring-indigo-500 rounded-lg"
                />
              </div>
              <Select value={kindFilterOutgoing} onValueChange={setKindFilterOutgoing}>
                <SelectTrigger className="h-8 text-[10px] bg-white border-slate-200 rounded-lg w-[130px] focus:ring-0">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-bold">All Categories</SelectItem>
                  <SelectItem value="Memorandum Order" className="text-[10px] font-medium">Memorandum Order</SelectItem>
                  <SelectItem value="Office Order" className="text-[10px] font-medium">Office Order</SelectItem>
                  <SelectItem value="Office Memorandum" className="text-[10px] font-medium">Office Memorandum</SelectItem>
                  <SelectItem value="Communication Letter / Request" className="text-[10px] font-medium">Communication Letter / Request</SelectItem>
                  <SelectItem value="Invitation" className="text-[10px] font-medium">Invitation</SelectItem>
                  <SelectItem value="Transmittal Document" className="text-[10px] font-medium">Transmittal Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {renderCommTable(outgoingFiltered, 'outgoing', isLoadingComms)}
        </div>
      </div>



      {/* Detail Viewer Modal */}
      <Dialog open={!!selectedComm} onOpenChange={(open) => !open && setSelectedComm(null)}>
        <DialogContent className="max-w-4xl h-[85dvh] bg-white border border-slate-200 rounded-2xl shadow-2xl p-0 overflow-hidden flex flex-col">
          {selectedComm && (
            <>
              {/* Modal Header */}
              <div className="bg-slate-50 border-b p-5 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-850 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">
                      {selectedComm.kind}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Reference: {detailContext === 'incoming' ? (selectedComm.recipientRefNums?.[receivingKey] || 'Pending') : (selectedComm.senderRefNum || 'N/A')}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 leading-snug uppercase">
                    {selectedComm.subject}
                  </h3>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Date Logged</p>
                  <p className="text-xs font-black text-slate-800 tabular-nums">
                    {selectedComm.createdAt?.toDate ? format(selectedComm.createdAt.toDate(), 'MMMM dd, yyyy - hh:mm a') : '...'}
                  </p>
                </div>
              </div>

              {/* Modal Body (Metadata & Preview Split) */}
              <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
                {/* Left side: Metadata details */}
                <div className="w-full md:w-80 border-r p-5 overflow-auto shrink-0 space-y-5 bg-slate-50/50">
                  <div>
                    <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Sender Office / Unit</h5>
                    <div className="flex items-center gap-2 bg-white border p-2.5 rounded-xl shadow-sm">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 whitespace-normal break-words flex-1 py-0.5">
                        {selectedComm.manual 
                          ? (selectedComm.senderText || 'N/A')
                          : resolveUnitName(selectedComm.senderUnitId || selectedComm.senderText)}
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const coordinator = selectedComm.senderName || (selectedComm.manual 
                      ? '' 
                      : getUnitHeadName(selectedComm.senderUnitId || selectedComm.senderText));
                    if (!coordinator || coordinator === 'N/A') return null;
                    return (
                      <div>
                        <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Sender Name</h5>
                        <div className="flex items-center gap-2 bg-white border p-2.5 rounded-xl shadow-sm">
                          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-700 whitespace-normal break-words flex-1 py-0.5">
                            {coordinator}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Recipient (To)</h5>
                    <div className="flex items-center gap-2 bg-white border p-2.5 rounded-xl shadow-sm">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <Globe className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 whitespace-normal break-words flex-1 py-0.5">{selectedComm.toText}</span>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Origin's Reference Number</h5>
                    <div className="flex items-center gap-2 bg-white border p-2.5 rounded-xl shadow-sm">
                      <span className="text-xs font-mono font-bold text-slate-700 whitespace-normal break-words py-0.5">
                        {selectedComm.senderRefNum || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Receiver's Reference Number</h5>
                    <div className="flex items-center gap-2 bg-white border p-2.5 rounded-xl shadow-sm">
                      <span className="text-xs font-mono font-bold text-slate-700 whitespace-normal break-words py-0.5">
                        {selectedComm.recipientRefNums?.[receivingKey] || 'Pending Receipt'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Original Documents</h5>
                    {selectedComm.driveLink ? (
                      <div className="space-y-2">
                        <a
                          href={selectedComm.driveLink}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none"
                        >
                          Open in Google Drive <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="text-[9px] text-slate-400 font-medium italic text-center">Open in new tab to download or comment.</p>
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-350 p-4 rounded-xl text-center bg-white">
                        <FileText className="h-6 w-6 text-slate-300 mx-auto stroke-[1.5] mb-1" />
                        <span className="text-[9px] text-slate-400 font-bold uppercase italic">No Link Provided</span>
                      </div>
                    )}
                  </div>

                  {detailContext === 'incoming' && isOdimo && !selectedComm.recipientRefNums?.[receivingKey] && (
                    <div className="pt-4 border-t space-y-2">
                      <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Incoming Receipt</h5>
                      <Button
                        onClick={() => {
                          handleOpenReceiveDialog(selectedComm);
                        }}
                        className="w-full h-9 bg-emerald-600 hover:bg-emerald-750 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none"
                      >
                        <CheckCircle2 className="h-4 w-4 text-white" /> Stamp & Receive
                      </Button>
                    </div>
                  )}

                  {canManageComm(selectedComm) && (
                    <div className="pt-4 border-t space-y-2">
                      <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Manage Record</h5>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedComm(null);
                            handleEditComm(selectedComm);
                          }}
                          className="flex-grow bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 h-9 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          onClick={() => {
                            setDeleteConfirmCommId(selectedComm.id);
                          }}
                          className="flex-grow bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 h-9 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right side: Drive Document Iframe Preview */}
                <div className="flex-1 min-w-0 bg-slate-900 flex flex-col justify-center relative">
                  {selectedComm.driveLink ? (
                    <iframe
                      src={getGoogleDrivePreviewUrl(selectedComm.driveLink)}
                      className="w-full h-full border-none"
                      allow="autoplay"
                      title="Google Drive Document Preview"
                    />
                  ) : (
                    <div className="text-center text-white/50 space-y-2 p-8">
                      <ShieldAlert className="h-10 w-10 text-white/20 mx-auto stroke-[1.5]" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider">No Document Preview Available</p>
                        <p className="text-[10px] text-white/30 font-medium mt-1">This communication is logged as metadata-only.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmCommId} onOpenChange={(open) => !open && setDeleteConfirmCommId(null)}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-600" /> Confirm Delete Record
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium pt-2">
              Are you sure you want to delete this communication record? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmCommId(null)}
              className="h-10 text-xs font-bold uppercase tracking-wider rounded-xl flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => deleteConfirmCommId && handleDeleteComm(deleteConfirmCommId)}
              className="bg-rose-600 hover:bg-rose-700 text-white h-10 text-xs font-bold uppercase tracking-wider rounded-xl flex-1 shadow-lg shadow-rose-600/15"
            >
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive & Stamp Confirmation Dialog */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={(open) => !open && setIsReceiveDialogOpen(false)}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Stamp & Receive Log
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium pt-2">
              Provide the unique receiving reference number for this communication. This logs the document in your unit's incoming records.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReceiveComm}>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Origin's Ref No</label>
                <Input
                  value={commToReceive?.senderRefNum || 'N/A'}
                  disabled
                  className="h-10 text-xs bg-slate-100/50 border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Subject</label>
                <Input
                  value={commToReceive?.subject || ''}
                  disabled
                  className="h-10 text-xs bg-slate-100/50 border-slate-200 rounded-xl font-bold truncate"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                  <span>Receiving Reference Number</span>
                  <span className="text-[9px] text-indigo-600 font-bold lowercase tracking-normal italic">(Auto-populated & editable)</span>
                </label>
                <Input
                  placeholder="e.g. 2026-001"
                  value={receivingRefNum}
                  onChange={(e) => setReceivingRefNum(e.target.value)}
                  className="h-10 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-indigo-500 font-mono font-bold"
                  required
                />
              </div>
            </div>
            <DialogFooter className="gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReceiveDialogOpen(false)}
                disabled={isReceivingSubmitting}
                className="h-10 text-xs font-bold uppercase tracking-wider rounded-xl flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isReceivingSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-xs font-bold uppercase tracking-wider rounded-xl flex-1 shadow-lg shadow-emerald-600/15"
              >
                {isReceivingSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Stamping...</>
                ) : (
                  'Stamp & Log'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
