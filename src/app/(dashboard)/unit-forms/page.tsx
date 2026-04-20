'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, updateDoc, addDoc } from 'firebase/firestore';
import type { Unit, UnitForm, CampusSetting, UnitFormRequest, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
    Loader2, 
    Download, 
    ShieldCheck, 
    Building, 
    Search, 
    ChevronLeft, 
    ChevronRight,
    Link as LinkIcon,
    FolderKanban,
    Save,
    Layers,
    FileText,
    FilePlus,
    Eye,
    Info,
    ListChecks,
    ExternalLink,
    Hash,
    Calendar,
    PlusCircle,
    Activity,
    Send,
    Inbox,
    History,
    User,
    Edit,
    PanelLeftClose,
    PanelLeftOpen,
    Clock,
    CheckCircle2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FormRegistrationDialog } from '@/components/manuals/form-registration-dialog';
import { FormDownloadDialog } from '@/components/manuals/form-download-dialog';
import { FormRequestReviewDialog } from '@/components/manuals/form-request-review-dialog';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

const SHARED_ACADEMIC_ID = 'academic-shared';

const statusColors: Record<string, string> = {
    'Submitted': 'bg-blue-100 text-blue-700',
    'QA Review': 'bg-indigo-100 text-indigo-700',
    'Returned for Correction': 'bg-rose-100 text-rose-700',
    'Awaiting Presidential Approval': 'bg-amber-100 text-amber-700',
    'Approved & Registered': 'bg-emerald-100 text-emerald-700',
};

export default function UnitFormsPage() {
  const { userProfile, isAdmin, userRole, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
  const [isRegOpen, setIsRegOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<UnitFormRequest | null>(null);
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editRosterLink, setEditRosterLink] = useState('');
  const [editRosterRevision, setEditRosterRevision] = useState('');
  const [editRosterDate, setEditRosterDate] = useState('');
  
  const [editMasterlistLink, setEditMasterlistLink] = useState('');
  const [editMasterlistRevision, setEditMasterlistRevision] = useState('');
  const [editMasterlistDate, setEditMasterlistDate] = useState('');
  
  const [downloadingForm, setDownloadingForm] = useState<UnitForm | null>(null);
  const [isRosterLogOpen, setIsRosterLogOpen] = useState(false);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [isHistoryActive, setIsHistoryActive] = useState(false);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  /**
   * GLOBAL REQUESTS QUERY (ADMIN)
   * Note: orderBy is removed from the Firestore query to bypass composite index requirements.
   * Sorting is performed in memory via sortedAllRequests memo.
   */
  const allRequestsQuery = useMemoFirebase(
    () => (firestore && isAdmin && isHistoryActive ? collection(firestore, 'unitFormRequests') : null),
    [firestore, isAdmin, isHistoryActive]
  );
  const { data: allRequests, isLoading: isLoadingAllRequests } = useCollection<UnitFormRequest>(allRequestsQuery);

  /**
   * UNIT-SPECIFIC REQUESTS QUERY
   * Note: orderBy is removed from the Firestore query to bypass composite index requirements.
   * Sorting is performed in memory via sortedUnitRequests memo.
   */
  const unitRequestsQuery = useMemoFirebase(
    () => {
        if (!firestore || !userProfile?.unitId || !isHistoryActive) return null;
        const unitObj = allUnits?.find(u => u.id === userProfile.unitId);
        const targetId = (unitObj?.category === 'Academic') ? SHARED_ACADEMIC_ID : userProfile.unitId;
        return query(collection(firestore, 'unitFormRequests'), where('unitId', '==', targetId));
    },
    [firestore, userProfile?.unitId, allUnits, isHistoryActive]
  );
  const { data: unitRequests, isLoading: isLoadingUnitRequests } = useCollection<UnitFormRequest>(unitRequestsQuery);

  // In-memory sorting for Admin Inbox
  const sortedAllRequests = useMemo(() => {
    if (!allRequests) return [];
    return [...allRequests].sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || new Date(a.createdAt).getTime();
        const dateB = b.createdAt?.toMillis?.() || new Date(b.createdAt).getTime();
        return dateB - dateA;
    });
  }, [allRequests]);

  // In-memory sorting for Unit History
  const sortedUnitRequests = useMemo(() => {
    if (!unitRequests) return [];
    return [...unitRequests].sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || new Date(a.createdAt).getTime();
        const dateB = b.createdAt?.toMillis?.() || new Date(b.createdAt).getTime();
        return dateB - dateA;
    });
  }, [unitRequests]);

  const sidebarUnits = useMemo(() => {
    if (!allUnits || !userProfile || isUserLoading) return [];
    
    let filtered = allUnits.filter(u => u.category !== 'Academic');
    
    if (!isAdmin && userRole !== 'Auditor') {
        filtered = filtered.filter(u => u.campusIds?.includes(userProfile.campusId));
        if (userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO') {
            filtered = filtered.filter(u => u.id === userProfile.unitId);
        }
    }

    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        filtered = filtered.filter(u => u.name.toLowerCase().includes(lower));
    }

    const items = filtered.map(u => ({ id: u.id, name: u.name, category: u.category, isShared: false }));

    const hasAcademic = allUnits.some(u => u.category === 'Academic');
    if (hasAcademic) {
        const myUnit = allUnits.find(u => u.id === userProfile.unitId);
        const canSeeAcademic = isAdmin || userRole === 'Auditor' || myUnit?.category === 'Academic';
        
        if (canSeeAcademic) {
            items.unshift({ id: SHARED_ACADEMIC_ID, name: 'Academic Units (Shared Registry)', category: 'Academic', isShared: true });
        }
    }

    return items.sort((a, b) => (a.isShared ? -1 : b.isShared ? 1 : a.name.localeCompare(b.name)));
  }, [allUnits, userProfile, isAdmin, userRole, isUserLoading, searchTerm]);

  useEffect(() => {
    if (userProfile && !selectedUnitId && !isUserLoading && !isAdmin) {
        const myUnit = allUnits?.find(u => u.id === userProfile.unitId);
        if (myUnit?.category === 'Academic') {
            setSelectedUnitId(SHARED_ACADEMIC_ID);
        } else {
            setSelectedUnitId(userProfile.unitId || null);
        }
    }
  }, [userProfile, allUnits, selectedUnitId, isUserLoading, isAdmin]);

  const selectedUnit = useMemo(() => {
      if (selectedUnitId === SHARED_ACADEMIC_ID) {
          return { id: SHARED_ACADEMIC_ID, name: 'Academic Units (Shared Registry)', category: 'Academic' as const, isShared: true };
      }
      return allUnits?.find(u => u.id === selectedUnitId);
  }, [allUnits, selectedUnitId]);

  const academicSharedRef = useMemoFirebase(() => (firestore ? doc(firestore, 'campusSettings', 'academic-shared') : null), [firestore]);
  const { data: sharedSettings } = useDoc<CampusSetting>(academicSharedRef);

  const activeRosterData = useMemo(() => {
      if (selectedUnitId === SHARED_ACADEMIC_ID) return { 
          link: sharedSettings?.formsDriveLink || '', 
          rev: sharedSettings?.formsDriveRevision || '00', 
          date: sharedSettings?.formsDriveUpdatedAt || 'TBA' 
      };
      const unit = selectedUnit as Unit;
      return { 
          link: unit?.formsDriveLink || '', 
          rev: unit?.formsDriveRevision || '00', 
          date: unit?.formsDriveUpdatedAt || 'TBA' 
      };
  }, [selectedUnitId, sharedSettings, selectedUnit]);

  const activeMasterlistData = useMemo(() => {
      if (selectedUnitId === SHARED_ACADEMIC_ID) return { 
          link: sharedSettings?.masterlistPdfLink || '', 
          rev: sharedSettings?.masterlistRevision || '00', 
          date: sharedSettings?.masterlistUpdatedAt || 'TBA' 
      };
      const unit = selectedUnit as Unit;
      return { 
          link: unit?.masterlistPdfLink || '', 
          rev: unit?.masterlistRevision || '00', 
          date: unit?.masterlistUpdatedAt || 'TBA' 
      };
  }, [selectedUnitId, sharedSettings, selectedUnit]);

  useEffect(() => {
      setEditRosterLink(activeRosterData.link);
      setEditRosterRevision(activeRosterData.rev);
      setEditRosterDate(activeRosterData.date === 'TBA' ? format(new Date(), 'yyyy-MM-dd') : activeRosterData.date);
      
      setEditMasterlistLink(activeMasterlistData.link);
      setEditMasterlistRevision(activeMasterlistData.rev);
      setEditMasterlistDate(activeMasterlistData.date === 'TBA' ? format(new Date(), 'yyyy-MM-dd') : activeMasterlistData.date);
  }, [activeRosterData, activeMasterlistData]);

  const formsQuery = useMemoFirebase(
    () => (firestore && selectedUnitId ? query(collection(firestore, 'unitForms'), where('unitId', '==', selectedUnitId)) : null),
    [firestore, selectedUnitId]
  );
  const { data: forms, isLoading: isLoadingForms } = useCollection<UnitForm>(formsQuery);

  const handleSaveAdminLinks = async () => {
      if (!firestore) return;
      setIsSubmitting(true);
      setIsSavingLinks(true);
      try {
          const links = { 
              formsDriveLink: editRosterLink, 
              formsDriveRevision: editRosterRevision,
              formsDriveUpdatedAt: editRosterDate,
              masterlistPdfLink: editMasterlistLink, 
              masterlistRevision: editMasterlistRevision,
              masterlistUpdatedAt: editMasterlistDate
          };

          if (selectedUnitId === SHARED_ACADEMIC_ID) {
              await setDoc(doc(firestore, 'campusSettings', 'academic-shared'), links, { merge: true });
          } else if (selectedUnitId) {
              await setDoc(doc(firestore, 'units', selectedUnitId!), links, { merge: true });
          }
          toast({ title: 'Repository Updated', description: 'Institutional repository parameters saved.' });
      } catch (e) {
          toast({ title: 'Error', description: 'Failed to update links.', variant: 'destructive' });
      } finally {
          setIsSubmitting(false);
          setIsSavingLinks(false);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Unit Forms & Records</h2>
          <p className="text-muted-foreground text-sm">Access official operating forms for verified university units.</p>
        </div>
        <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setIsSidebarVisible(!isSidebarVisible)}>
          {isSidebarVisible ? <PanelLeftClose className="mr-2 h-4 w-4" /> : <PanelLeftOpen className="mr-2 h-4 w-4" />}
          {isSidebarVisible ? 'Hide Units' : 'Show Units'}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-h-0 lg:h-[calc(100vh-20rem)]">
          <div className={cn("transition-all duration-300 overflow-hidden flex flex-col gap-2 shrink-0", isSidebarVisible ? "w-full lg:w-1/4 opacity-100" : "w-0 opacity-0 lg:-mr-6")}>
              <Card className="flex flex-col h-[300px] lg:h-full shadow-sm border-primary/10">
                  <CardHeader className="bg-muted/30 border-b pb-4 shrink-0">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Unit Selection</CardTitle>
                    <div className="relative pt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search units..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 text-xs bg-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-hidden">
                    {isLoadingUnits ? <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div> : (
                      <ScrollArea className="h-full">
                        <div className="flex flex-col">
                            {sidebarUnits.map(unit => (
                            <button key={unit.id} onClick={() => setSelectedUnitId(unit.id)} className={cn("w-full text-left py-2.5 px-4 text-xs border-l-2 transition-all", selectedUnitId === unit.id ? "bg-primary/5 text-primary border-primary font-bold shadow-inner" : "border-transparent text-muted-foreground hover:bg-muted/30")}>
                                <div className="flex items-center gap-3">
                                    {unit.isShared ? <Layers className="h-3.5 w-3.5 shrink-0 text-primary" /> : <Building className="h-3.5 w-3.5 shrink-0 opacity-40" />}
                                    <span className={cn("truncate", unit.isShared && "font-black uppercase tracking-tighter")}>{unit.name}</span>
                                </div>
                            </button>
                            ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
              </Card>

              {!isAdmin && (
                  <Card className="flex flex-col overflow-hidden shadow-sm border-primary/10 bg-muted/5 min-h-0 h-1/2">
                      <CardHeader className="pb-3 border-b py-4">
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                  <History className="h-4 w-4 text-primary" />
                                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">My Requests</CardTitle>
                              </div>
                              {!isHistoryActive && (
                                  <Button variant="ghost" size="sm" onClick={() => setIsHistoryActive(true)} className="h-6 text-[9px] font-black uppercase text-primary">Load History</Button>
                              )}
                          </div>
                      </CardHeader>
                      <CardContent className="p-0 flex-1 overflow-hidden">
                          <ScrollArea className="h-full">
                              {isLoadingUnitRequests ? <div className="p-10 text-center"><Loader2 className="h-4 w-4 animate-spin text-primary opacity-20 mx-auto" /></div> : sortedUnitRequests.length > 0 ? (
                                  <div className="divide-y divide-primary/5">
                                      {sortedUnitRequests.map(req => (
                                          <div key={req.id} className="p-3 hover:bg-white transition-colors group cursor-pointer" onClick={() => setReviewRequestId(req.id)}>
                                              <div className="flex justify-between items-start gap-2 mb-1.5">
                                                  <Badge className={cn("text-[7px] font-black uppercase h-3.5 px-1 border-none", statusColors[req.status])}>{req.status}</Badge>
                                                  <span className="text-[8px] font-mono text-muted-foreground">{req.createdAt?.toDate ? format(req.createdAt.toDate(), 'MM/dd/yy') : '--'}</span>
                                              </div>
                                              <p className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-1">{req.requestedForms.length} Forms Application</p>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="py-10 text-center opacity-20 text-[9px] font-black uppercase tracking-widest">{isHistoryActive ? 'No history' : 'Click "Load History" to view'}</div>
                              )}
                          </ScrollArea>
                      </CardContent>
                  </Card>
              )}
          </div>

          <div className="flex-1 min-0 flex flex-col relative">
              <Button variant="secondary" size="icon" className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full border shadow-md hidden lg:flex hover:bg-primary hover:text-white transition-colors" onClick={() => setIsSidebarVisible(!isSidebarVisible)}>
                  {isSidebarVisible ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>

              {selectedUnit ? (
                  <Tabs defaultValue="roster" className="flex-1 flex flex-col min-h-0">
                      <div className="bg-background flex flex-col sm:flex-row items-center justify-between border-b pb-2 shrink-0 gap-2">
                          <TabsList className="bg-muted p-1 h-10 w-full sm:w-auto animate-tab-highlight rounded-md">
                              <TabsTrigger value="roster" className="flex-1 sm:flex-none gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><ListChecks className="h-3.5 w-3.5" /> Unit Forms</TabsTrigger>
                              <TabsTrigger value="register" className="flex-1 sm:flex-none gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><FilePlus className="h-3.5 w-3.5" /> Apply for New Form</TabsTrigger>
                          </TabsList>
                          <Badge variant="outline" className="h-6 font-black text-[10px] uppercase border-primary/20 bg-primary/5 text-primary max-w-full truncate">{selectedUnit.name}</Badge>
                      </div>

                      <div className="flex-1 overflow-hidden pt-4">
                          <TabsContent value="roster" className="h-full m-0 animate-in fade-in slide-in-from-left-2 duration-300">
                              <ScrollArea className="h-full pr-4">
                                  <div className="space-y-8 pb-10">
                                      <Card className="border-primary/20 bg-primary/5 shadow-md overflow-hidden">
                                          <CardHeader className="bg-primary/10 border-b py-4">
                                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                                  <div className="flex items-center gap-2">
                                                      <FolderKanban className="h-5 w-5 text-primary" />
                                                      <CardTitle className="text-sm font-black uppercase tracking-tight">Official Roster Access</CardTitle>
                                                  </div>
                                                  <div className="flex gap-2">
                                                      <Badge variant="secondary" className="h-5 text-[9px] font-black uppercase border-none bg-white/50">Rev {activeRosterData.rev}</Badge>
                                                      <Badge variant="outline" className="h-5 text-[9px] font-bold border-primary/20 bg-white">{activeRosterData.date}</Badge>
                                                  </div>
                                              </div>
                                          </CardHeader>
                                          <CardContent className="p-6 space-y-6">
                                              <div className="flex flex-col xl:flex-row items-start justify-between gap-6">
                                                  <div className="space-y-4 flex-1 w-full">
                                                      <div className="p-4 bg-white rounded-xl border border-dashed flex gap-4">
                                                          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                                          <div className="space-y-1">
                                                              <p className="text-xs font-black uppercase text-slate-800">Operational Continuity</p>
                                                              <p className="text-[11px] text-muted-foreground leading-relaxed italic">This folder contains the complete roster of forms for <strong>{selectedUnit.name}</strong>.</p>
                                                          </div>
                                                      </div>
                                                      {activeRosterData.link ? (
                                                          <Button onClick={() => setIsRosterLogOpen(true)} className="w-full md:w-auto h-11 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                                                              <ExternalLink className="h-4 w-4 mr-2" /> Access Official Roster
                                                          </Button>
                                                      ) : <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-3"><Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" /><p className="text-[10px] text-amber-700 font-bold uppercase">Pending Repository Setup</p></div>}
                                                  </div>
                                                  {isAdmin && (
                                                      <div className="w-full xl:w-[450px] p-5 bg-white rounded-2xl border border-primary/20 shadow-xl space-y-4">
                                                          <div className="flex items-center gap-2 border-b pb-2 mb-2"><PlusCircle className="h-4 w-4 text-primary" /><h4 className="text-[10px] font-black uppercase text-slate-900">Log New Roster Revision</h4></div>
                                                          <div className="space-y-3">
                                                              <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-primary">Folder Link</Label><Input value={editRosterLink} onChange={(e) => setEditRosterLink(e.target.value)} className="h-8 text-[10px]" /></div>
                                                              <div className="grid grid-cols-2 gap-3">
                                                                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-primary">Rev No.</Label><Input value={editRosterRevision} onChange={(e) => setEditRosterRevision(e.target.value)} className="h-8 text-[10px]" /></div>
                                                                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-primary">Effective</Label><Input type="date" value={editRosterDate} onChange={(e) => setEditRosterDate(e.target.value)} className="h-8 text-[10px]" /></div>
                                                              </div>
                                                          </div>
                                                          <Button size="sm" onClick={handleSaveAdminLinks} disabled={isSubmitting} className="w-full h-9 font-black uppercase text-[10px]">{isSavingLinks ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}Commit Update</Button>
                                                      </div>
                                                  )}
                                              </div>
                                          </CardContent>
                                      </Card>

                                      <Card className="shadow-lg border-primary/10 overflow-hidden">
                                          <CardHeader className="bg-muted/10 border-b py-4">
                                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                                  <div className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /><CardTitle className="text-sm font-black uppercase tracking-tight">Unit Masterlist Preview</CardTitle></div>
                                                  <Badge variant="secondary" className="h-5 text-[9px] font-black uppercase border-none bg-primary/5 text-primary">Rev {activeMasterlistData.rev}</Badge>
                                              </div>
                                          </CardHeader>
                                          <CardContent className="p-0 bg-slate-100 min-h-[500px] relative shadow-inner">
                                              {activeMasterlistData.link ? <iframe src={activeMasterlistData.link.replace('/view', '/preview').replace('?usp=sharing', '')} className="absolute inset-0 h-full w-full border-none bg-white" allow="autoplay" title="Unit Masterlist Preview" /> : <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground opacity-20 text-center gap-3"><FileText className="h-16 w-16" /><p className="text-sm font-black uppercase tracking-widest">Masterlist Unavailable</p></div>}
                                          </CardContent>
                                      </Card>

                                      <Card className="shadow-sm border-primary/10 overflow-hidden">
                                          <CardHeader className="bg-muted/10 border-b py-4"><CardTitle className="text-xs font-black uppercase tracking-tight">Enrolled Controlled Forms Log</CardTitle></CardHeader>
                                          <CardContent className="p-0">
                                              <Table>
                                                  <TableHeader className="bg-muted/30">
                                                      <TableRow>
                                                          <TableHead className="text-[10px] font-black uppercase pl-6">Code</TableHead>
                                                          <TableHead className="text-[10px] font-black uppercase">Official Title</TableHead>
                                                          <TableHead className="text-[10px] font-black uppercase text-center">Rev.</TableHead>
                                                          <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                                                      </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                      {isLoadingForms ? <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary opacity-20 mx-auto" /></TableCell></TableRow> : forms?.length ? forms.sort((a,b) => a.formCode.localeCompare(b.formCode)).map(form => (
                                                          <TableRow key={form.id} className="hover:bg-muted/20 transition-colors">
                                                              <TableCell className="pl-6 font-mono text-xs font-bold text-primary">{form.formCode}</TableCell>
                                                              <TableCell className="text-[12px] font-bold text-slate-800">{form.formName}</TableCell>
                                                              <TableCell className="text-center"><Badge variant="secondary" className="h-4 text-[8px] font-bold uppercase">{form.revision}</Badge></TableCell>
                                                              <TableCell className="text-right pr-6"><Button variant="default" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest gap-1.5" onClick={() => setDownloadingForm(form)}><Download className="h-3 w-3" /> Request Download</Button></TableCell>
                                                          </TableRow>
                                                      )) : <TableRow><TableCell colSpan={4} className="h-32 text-center text-[10px] font-bold text-muted-foreground uppercase opacity-20 italic">No individual forms enrolled.</TableCell></TableRow>}
                                                  </TableBody>
                                              </Table>
                                          </CardContent>
                                      </Card>
                                  </div>
                              </ScrollArea>
                          </TabsContent>

                          <TabsContent value="register" className="h-full m-0 animate-in fade-in slide-in-from-right-2 duration-300">
                              <ScrollArea className="flex-1 rounded-xl border bg-background shadow-sm">
                                  <div className="p-6 space-y-8">
                                      <div className="space-y-2"><h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Application for Form Registration</h3><p className="text-xs text-muted-foreground font-medium">Submit evidence for new or revised controlled forms.</p></div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <Card className="bg-primary/5 border-primary/10"><CardContent className="p-6 flex flex-col items-center text-center gap-4"><div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white"><Download className="h-6 w-6" /></div><p className="text-xs font-black uppercase text-slate-800">1. Download Template</p><Button type="button" size="sm" className="w-full font-black text-[10px] uppercase" asChild><a href="https://drive.google.com/file/d/1yPdJGXQT1yhyXkENhtDHLaIMlxTnHYx3/view?usp=sharing" target="_blank" rel="noopener noreferrer">Access DRF Template</a></Button></CardContent></Card>
                                          <Card className="bg-indigo-50 border-indigo-100"><CardContent className="p-6 flex flex-col items-center text-center gap-4"><div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white"><Send className="h-6 w-6" /></div><p className="text-xs font-black uppercase text-slate-800">2. Submit Application</p><Button size="sm" variant="outline" className="w-full bg-white font-black text-[10px] uppercase border-indigo-200 text-indigo-700" onClick={() => setIsRegOpen(true)}>Launch Wizard</Button></CardContent></Card>
                                      </div>
                                  </div>
                              </ScrollArea>
                          </TabsContent>
                      </div>
                  </Tabs>
              ) : <div className="h-full flex flex-col items-center justify-center border border-dashed rounded-2xl bg-muted/5 text-muted-foreground p-12"><Building className="h-12 w-12 opacity-10 mb-4" /><h4 className="font-black text-xs uppercase tracking-[0.2em]">Form Control Hub</h4><p className="text-[10px] mt-2 max-w-[250px] text-center leading-relaxed">Select a unit from the directory to access its quality forms registry.</p></div>}
          </div>
      </div>

      {isAdmin && (
          <div className="mt-8">
              <Tabs defaultValue="inbox" className="space-y-6">
                  <TabsList className="bg-muted p-1 border shadow-sm w-fit h-10 animate-tab-highlight rounded-md">
                      <TabsTrigger value="inbox" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8"><Inbox className="h-3.5 w-3.5" /> Registration Review Inbox</TabsTrigger>
                  </TabsList>
                  <TabsContent value="inbox" className="animate-in fade-in duration-500">
                      {!isHistoryActive ? (
                          <div className="p-12 text-center bg-white border rounded-2xl shadow-sm"><Button onClick={() => setIsHistoryActive(true)} className="font-black uppercase tracking-widest text-xs">Load Active Inbox & Review History</Button></div>
                      ) : (
                          <Card className="shadow-md border-primary/10 overflow-hidden">
                              <CardHeader className="bg-primary/5 border-b py-4"><CardTitle className="text-sm font-black uppercase tracking-tight">Form Registration Inbox</CardTitle></CardHeader>
                              <CardContent className="p-0">
                                  <Table>
                                      <TableHeader className="bg-muted/30">
                                        <TableRow>
                                          <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Date</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase">Unit</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase">Submitter</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase text-center">Status</TableHead>
                                          <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                          {sortedAllRequests.map(req => (
                                              <TableRow key={req.id} className="hover:bg-muted/20">
                                                  <TableCell className="pl-6 py-4 font-mono text-xs">{req.createdAt?.toDate ? format(req.createdAt.toDate(), 'MM/dd/yy') : '--'}</TableCell>
                                                  <TableCell className="font-bold text-xs uppercase">{req.unitName}</TableCell>
                                                  <TableCell className="text-xs">{req.submitterName}</TableCell>
                                                  <TableCell className="text-center"><Badge className={cn("text-[8px] font-black uppercase h-4", statusColors[req.status])}>{req.status}</Badge></TableCell>
                                                  <TableCell className="text-right pr-6"><Button size="sm" onClick={() => setReviewRequestId(req.id)} className="h-7 text-[9px] font-black uppercase tracking-widest">Review</Button></TableCell>
                                              </TableRow>
                                          ))}
                                      </TableBody>
                                  </Table>
                              </CardContent>
                          </Card>
                      )}
                  </TabsContent>
              </Tabs>
          </div>
      )}

      {selectedUnit && <FormRegistrationDialog isOpen={isRegOpen} onOpenChange={(open) => { setIsRegOpen(open); if (!open) setEditingRequest(null); }} unit={selectedUnit as any} request={editingRequest} />}
      {downloadingForm && <FormDownloadDialog form={downloadingForm} unitId={selectedUnitId!} isOpen={!!downloadingForm} onOpenChange={(open) => !open && setDownloadingForm(null)} />}
      {isRosterLogOpen && selectedUnitId && activeRosterData.link && <FormDownloadDialog form={{ id: 'roster-folder', formName: 'Official Roster & Forms Folder', formCode: 'MASTER-ROSTER', googleDriveLink: activeRosterData.link, unitId: selectedUnitId, campusId: userProfile?.campusId || '', revision: activeRosterData.rev, requestId: 'system', createdAt: new Date() } as any} unitId={selectedUnitId} isOpen={isRosterLogOpen} onOpenChange={setIsRosterLogOpen} />}
      {reviewRequestId && <FormRequestReviewDialog requestId={reviewRequestId} isOpen={!!reviewRequestId} onOpenChange={(open) => !open && setReviewRequestId(null)} />}
    </div>
  );
}