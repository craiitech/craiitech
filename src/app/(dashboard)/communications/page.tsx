'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, doc, updateDoc, arrayUnion, Timestamp, getDocs, where, limit } from 'firebase/firestore';
import type { Campus, Unit, Communication, CommunicationKind } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function CommunicationsPage() {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState('all');

  // Dialog State
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);

  // Form State
  const [commsMode, setCommsMode] = useState<'digital' | 'manual'>('digital');
  const [kind, setKind] = useState<CommunicationKind>('Office Memorandum');
  const [subject, setSubject] = useState('');
  const [driveLink, setDriveLink] = useState('');

  // Digital Send Specifics
  const [recipientType, setRecipientType] = useState<'unit' | 'campus' | 'individual' | 'all'>('unit');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [currentRecipientSelection, setCurrentRecipientSelection] = useState('');

  // Manual Entry Specifics
  const [manualType, setManualType] = useState<'incoming' | 'outgoing'>('incoming');
  const [manualSenderText, setManualSenderText] = useState('');
  const [manualRecipientText, setManualRecipientText] = useState('');

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
  const isOdimo = userRole === 'Unit ODIMO' || userRole === 'Campus ODIMO' || isAdmin;
  const isPresident = userRole?.toLowerCase().includes('president') || isAdmin;

  // Filter and process communications
  const processedComms = useMemo(() => {
    if (!rawComms || !userProfile) return { incoming: [], outgoing: [] };

    const incoming: Communication[] = [];
    const outgoing: Communication[] = [];

    rawComms.forEach(c => {
      // Determine Outgoing matching:
      // Sourced by our unit
      if (c.senderUnitId === userProfile.unitId) {
        outgoing.push(c);
      }

      // Determine Incoming matching:
      let isIncoming = false;
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

      if (isIncoming) {
        incoming.push(c);
      }
    });

    return { incoming, outgoing };
  }, [rawComms, userProfile]);

  const filteredComms = useMemo(() => {
    const list = processedComms[activeTab];
    return list.filter(c => {
      const matchesSearch = c.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.senderRefNum?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.recipientRefNums?.[userProfile?.unitId || '']?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesKind = kindFilter === 'all' || c.kind === kindFilter;
      return matchesSearch && matchesKind;
    });
  }, [processedComms, activeTab, searchTerm, kindFilter, userProfile?.unitId]);

  const unreadCount = useMemo(() => {
    if (!userProfile) return 0;
    return processedComms.incoming.filter(c => !c.readBy?.includes(userProfile.id) && c.senderUnitId !== userProfile.unitId).length;
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
    setKind('Office Memorandum');
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

  const handleOpenDetail = async (comm: Communication) => {
    setSelectedComm(comm);
    // Mark as read in Firestore if not read yet
    if (firestore && userProfile && comm.id && !comm.readBy?.includes(userProfile.id) && comm.senderUnitId !== userProfile.unitId) {
      try {
        await updateDoc(doc(firestore, 'communications', comm.id), {
          readBy: arrayUnion(userProfile.id)
        });
      } catch (e) {
        console.error('Error marking as read:', e);
      }
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !userProfile) return;

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
        // Digital outbound: calculate sender's outgoing control number
        const outgoingSnap = await getDocs(query(
          collection(firestore, 'communications'),
          where('senderUnitId', '==', userProfile.unitId),
          where('createdAt', '>=', Timestamp.fromDate(startOfYear))
        ));
        const outgoingCount = outgoingSnap.docs.filter(doc => {
          const data = doc.data();
          return !data.manual || data.manualType !== 'incoming';
        }).length;
        computedSenderRef = `${currentYear}-${(outgoingCount + 1).toString().padStart(3, '0')}`;

        // Compute incoming references for each recipient unit
        if (recipientType === 'unit') {
          for (const unitId of selectedRecipients) {
            const incomingSnap = await getDocs(query(
              collection(firestore, 'communications'),
              where('createdAt', '>=', Timestamp.fromDate(startOfYear))
            ));
            const incomingCount = incomingSnap.docs.filter(doc => {
              const data = doc.data();
              const isTarget = (data.recipientType === 'unit' && data.recipientIds?.includes(unitId)) ||
                               (data.recipientType === 'all') ||
                               (data.manual && data.manualType === 'incoming' && data.recipientIds?.includes(unitId));
              return isTarget;
            }).length;
            computedRecipientRefs[unitId] = `${currentYear}-${(incomingCount + 1).toString().padStart(3, '0')}`;
          }
        } else if (recipientType === 'individual') {
          for (const userId of selectedRecipients) {
            const targetUser = users?.find(u => u.id === userId);
            const targetUnitId = targetUser?.unitId;
            if (targetUnitId) {
              const incomingSnap = await getDocs(query(
                collection(firestore, 'communications'),
                where('createdAt', '>=', Timestamp.fromDate(startOfYear))
              ));
              const incomingCount = incomingSnap.docs.filter(doc => {
                const data = doc.data();
                const isTarget = (data.recipientType === 'unit' && data.recipientIds?.includes(targetUnitId)) ||
                                 (data.recipientType === 'individual' && data.recipientIds?.includes(userId)) ||
                                 (data.recipientType === 'all') ||
                                 (data.manual && data.manualType === 'incoming' && data.recipientIds?.includes(targetUnitId));
                return isTarget;
              }).length;
              computedRecipientRefs[targetUnitId] = `${currentYear}-${(incomingCount + 1).toString().padStart(3, '0')}`;
            }
          }
        }
      } else {
        // Manual entries
        if (manualType === 'incoming') {
          if (!manualSenderText.trim()) {
            toast({ title: 'Validation Error', description: 'Sender details are required.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
          }
          // Calculate recipient unit's incoming reference number
          const incomingSnap = await getDocs(query(
            collection(firestore, 'communications'),
            where('createdAt', '>=', Timestamp.fromDate(startOfYear))
          ));
          const incomingCount = incomingSnap.docs.filter(doc => {
            const data = doc.data();
            const isTarget = (data.recipientType === 'unit' && data.recipientIds?.includes(userProfile.unitId)) ||
                             (data.recipientType === 'all') ||
                             (data.manual && data.manualType === 'incoming' && data.recipientIds?.includes(userProfile.unitId));
            return isTarget;
          }).length;
          computedRecipientRefs[userProfile.unitId] = `${currentYear}-${(incomingCount + 1).toString().padStart(3, '0')}`;
        } else {
          if (!manualRecipientText.trim()) {
            toast({ title: 'Validation Error', description: 'Recipient details are required.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
          }
          // Calculate sender unit's outgoing reference number
          const outgoingSnap = await getDocs(query(
            collection(firestore, 'communications'),
            where('senderUnitId', '==', userProfile.unitId),
            where('createdAt', '>=', Timestamp.fromDate(startOfYear))
          ));
          const outgoingCount = outgoingSnap.docs.filter(doc => {
            const data = doc.data();
            return !data.manual || data.manualType !== 'incoming';
          }).length;
          computedSenderRef = `${currentYear}-${(outgoingCount + 1).toString().padStart(3, '0')}`;
        }
      }

      // Assemble document payload
      const payload: any = {
        kind,
        subject,
        driveLink: driveLink || null,
        createdAt: Timestamp.now(),
        manual: commsMode === 'manual',
        readBy: [userProfile.id],
      };

      if (commsMode === 'digital') {
        payload.senderUnitId = userProfile.unitId;
        payload.senderRefNum = computedSenderRef;
        payload.recipientType = recipientType;
        payload.recipientIds = selectedRecipients;
        payload.recipientRefNums = computedRecipientRefs;
        
        let toText = '';
        if (recipientType === 'all') {
          toText = 'University-Wide (All)';
        } else if (recipientType === 'unit') {
          toText = selectedRecipients.map(id => unitMap.get(id) || id).join(', ');
        } else if (recipientType === 'campus') {
          toText = selectedRecipients.map(id => campusMap.get(id) || id).join(', ');
        } else if (recipientType === 'individual') {
          toText = selectedRecipients.map(id => {
            const u = users?.find(x => x.id === id);
            return u ? `${u.firstName} ${u.lastName}` : id;
          }).join(', ');
        }
        payload.toText = toText;
        payload.senderText = unitMap.get(userProfile.unitId) || userProfile.unitId;
      } else {
        // Manual entry
        payload.manualType = manualType;
        if (manualType === 'incoming') {
          payload.senderText = manualSenderText;
          payload.toText = unitMap.get(userProfile.unitId) || userProfile.unitId;
          payload.recipientIds = [userProfile.unitId];
          payload.recipientRefNums = computedRecipientRefs;
        } else {
          payload.senderUnitId = userProfile.unitId;
          payload.senderText = unitMap.get(userProfile.unitId) || userProfile.unitId;
          payload.senderRefNum = computedSenderRef;
          payload.toText = manualRecipientText;
        }
      }

      await addDoc(collection(firestore, 'communications'), payload);

      toast({
        title: 'Communication Logged',
        description: `Successfully logged under Reference Sequence: ${payload.senderRefNum || payload.recipientRefNums[userProfile.unitId]}`,
      });

      setIsLogDialogOpen(false);
      resetForm();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Database Error', description: e.message || 'Failed to log communication.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
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
            <p className="text-sm text-white/70 font-medium mt-1">Official incoming and outgoing records for {unitMap.get(userProfile?.unitId || '') || 'your unit'}</p>
          </div>
          {isOdimo && (
            <div>
              <Button onClick={() => setIsLogDialogOpen(true)} className="bg-white hover:bg-slate-50 text-indigo-700 font-black uppercase text-xs tracking-wider py-5 px-6 rounded-xl shadow-lg border border-indigo-100 flex items-center gap-2 transition-all hover:scale-105">
                <Plus className="h-4.5 w-4.5 text-indigo-700 shrink-0" />
                Log/Send Communication
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Primary Logbook Workspace */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <TabsList className="bg-slate-100 p-1 border rounded-xl h-10 w-max shadow-sm">
            <TabsTrigger value="incoming" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8 rounded-lg">
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
              Incoming Logbook
              {unreadCount > 0 && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black tabular-nums transition-all hover:scale-105">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8 rounded-lg">
              <ArrowUpRight className="h-4 w-4 text-indigo-600" /> Outgoing Logbook
            </TabsTrigger>
          </TabsList>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by subject or ref number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-white border-slate-200 focus-visible:ring-indigo-500 rounded-xl"
              />
            </div>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="h-9 w-[160px] text-xs bg-white border-slate-200 rounded-xl">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-bold">All Categories</SelectItem>
                <SelectItem value="Memorandum Order" className="text-xs font-medium">Memorandum Order</SelectItem>
                <SelectItem value="Office Order" className="text-xs font-medium">Office Order</SelectItem>
                <SelectItem value="Office Memorandum" className="text-xs font-medium">Office Memorandum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tab Contents */}
        <Card className="shadow-md border-slate-200/60 overflow-hidden bg-white rounded-2xl">
          <CardContent className="p-0">
            {isLoadingComms ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 opacity-40" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading records...</span>
              </div>
            ) : filteredComms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3 bg-slate-50/50">
                <Mail className="h-10 w-10 text-slate-300 stroke-[1.5]" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">No logs recorded</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">There are no records matching your current filter settings.</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/70 border-b">
                  <TableRow>
                    <TableHead className="pl-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Reference No.</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Date Logged</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Category</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">{activeTab === 'incoming' ? 'From' : 'To'}</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider max-w-sm">Subject</TableHead>
                    <TableHead className="text-right pr-6 text-[10px] font-black uppercase text-slate-500 tracking-wider">Document</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComms.map((comm) => {
                    const isUnread = activeTab === 'incoming' && !comm.readBy?.includes(userProfile?.id || '') && comm.senderUnitId !== userProfile?.unitId;
                    const dateStr = comm.createdAt?.toDate ? format(comm.createdAt.toDate(), 'MMM dd, yyyy') : '...';
                    const displayRefNum = activeTab === 'incoming' 
                      ? comm.recipientRefNums?.[userProfile?.unitId || ''] || comm.senderRefNum || 'N/A'
                      : comm.senderRefNum || 'N/A';

                    return (
                      <TableRow
                        key={comm.id}
                        onClick={() => handleOpenDetail(comm)}
                        className={cn(
                          "cursor-pointer hover:bg-slate-50/80 transition-all border-b relative group",
                          isUnread && "bg-indigo-50/10 hover:bg-indigo-50/20 font-bold"
                        )}
                      >
                        <TableCell className="pl-6 py-4 relative">
                          {isUnread && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 rounded-r bg-indigo-600 transition-all" />
                          )}
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                            )}
                            <span className="font-black text-xs text-slate-800 tabular-nums uppercase transition-transform group-hover:translate-x-1">{displayRefNum}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-medium tabular-nums">{dateStr}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="h-5 text-[8px] font-black uppercase bg-slate-100 text-slate-700 border-none px-2 rounded-full">
                            {comm.kind}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-800 font-black">
                          {activeTab === 'incoming' ? comm.senderText : comm.toText}
                        </TableCell>
                        <TableCell className="max-w-md py-4">
                          <p className={cn("text-xs text-slate-700 truncate", isUnread ? "font-bold text-slate-900" : "font-medium")}>
                            {comm.subject}
                          </p>
                        </TableCell>
                        <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                          {comm.driveLink ? (
                            <a
                              href={comm.driveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                            >
                              Open Drive <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-bold uppercase italic">No Link</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Log / Compose Modal */}
      <Dialog open={isLogDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsLogDialogOpen(open); }}>
        <DialogContent className="max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-slate-800 flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-600" /> Log / Send New Correspondence
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Compose a digital notification to system users, or manually log physical correspondence.
            </DialogDescription>
          </DialogHeader>

          {/* Comms Mode Switcher */}
          <div className="flex border p-0.5 rounded-lg bg-slate-100/50 mb-5 shrink-0">
            <button
              type="button"
              onClick={() => { setCommsMode('digital'); resetForm(); }}
              className={cn("flex-1 text-center py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all", commsMode === 'digital' ? "bg-white shadow text-slate-850" : "text-slate-500 hover:text-slate-800")}
            >
              Direct Digital Send
            </button>
            <button
              type="button"
              onClick={() => { setCommsMode('manual'); resetForm(); }}
              className={cn("flex-1 text-center py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all", commsMode === 'manual' ? "bg-white shadow text-slate-850" : "text-slate-500 hover:text-slate-800")}
            >
              Manual Registry Log
            </button>
          </div>

          <form onSubmit={handleLogSubmit} className="space-y-4">
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
                </SelectContent>
              </Select>
            </div>

            {commsMode === 'digital' ? (
              <>
                {/* FROM */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">From Office / Unit</label>
                  <Input value={unitMap.get(userProfile?.unitId || '') || '...'} disabled className="h-10 text-xs bg-slate-100/50 border-slate-200 rounded-xl font-bold" />
                </div>

                {/* RECIPIENT TYPE */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Send To Recipients</label>
                  <Select value={recipientType} onValueChange={(val: any) => { setRecipientType(val); setSelectedRecipients([]); }}>
                    <SelectTrigger className="h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl">
                      <SelectValue placeholder="Select Scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit" className="text-xs font-medium">Academic & Oversight Units</SelectItem>
                      <SelectItem value="campus" className="text-xs font-medium">Campus Sites</SelectItem>
                      <SelectItem value="individual" className="text-xs font-medium">Individual Users (Direct)</SelectItem>
                      <SelectItem value="all" disabled={!isPresident} className="text-xs font-medium">
                        University-Wide (All Officers) {!isPresident && '(President Only)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* RECIPIENT LIST BUILDER */}
                {recipientType !== 'all' && (
                  <div className="space-y-2 border p-3.5 rounded-xl bg-slate-50/50 border-slate-200">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Add Recipients</label>
                    <div className="flex gap-2">
                      <Select value={currentRecipientSelection} onValueChange={setCurrentRecipientSelection}>
                        <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-lg flex-1">
                          <SelectValue placeholder={`Select ${recipientType}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {recipientType === 'unit' && units?.sort((a,b) => a.name.localeCompare(b.name)).map(u => (
                            <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}</SelectItem>
                          ))}
                          {recipientType === 'campus' && campuses?.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                          ))}
                          {recipientType === 'individual' && users?.sort((a,b) => a.firstName.localeCompare(b.firstName)).map(u => (
                            <SelectItem key={u.id} value={u.id} className="text-xs">{u.firstName} {u.lastName} ({u.role})</SelectItem>
                          ))}
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

                {manualType === 'incoming' ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Sender (From Office/Person)</label>
                    <Input
                      placeholder="e.g. CHED Regional Office / Executive Director"
                      value={manualSenderText}
                      onChange={(e) => setManualSenderText(e.target.value)}
                      className="h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Recipient (To Office/Person)</label>
                    <Input
                      placeholder="e.g. RSU President / Quality Assurance Committee"
                      value={manualRecipientText}
                      onChange={(e) => setManualRecipientText(e.target.value)}
                      className="h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl"
                    />
                  </div>
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

            <DialogFooter className="pt-4 border-t gap-2">
              <Button type="button" variant="outline" onClick={() => setIsLogDialogOpen(false)} disabled={isSubmitting} className="h-10 font-bold text-xs uppercase tracking-wider rounded-xl">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white h-10 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/15">
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Logging...</>
                ) : (
                  'Log Record'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Viewer Modal */}
      <Dialog open={!!selectedComm} onOpenChange={(open) => !open && setSelectedComm(null)}>
        <DialogContent className="max-w-4xl h-[85vh] bg-white border border-slate-200 rounded-2xl shadow-2xl p-0 overflow-hidden flex flex-col">
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
                      Reference: {activeTab === 'incoming' ? (selectedComm.recipientRefNums?.[userProfile?.unitId || ''] || selectedComm.senderRefNum || 'N/A') : (selectedComm.senderRefNum || 'N/A')}
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
                    <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Sender (From)</h5>
                    <div className="flex items-center gap-2 bg-white border p-2.5 rounded-xl shadow-sm">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 truncate">{selectedComm.senderText}</span>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Recipient (To)</h5>
                    <div className="flex items-center gap-2 bg-white border p-2.5 rounded-xl shadow-sm">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <Globe className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 truncate">{selectedComm.toText}</span>
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
    </div>
  );
}
