
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, serverTimestamp, where, Timestamp, updateDoc } from 'firebase/firestore';
import type { ManagementReview, ManagementReviewOutput, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    PlusCircle, 
    Calendar, 
    ExternalLink, 
    Trash2, 
    ListChecks, 
    ChevronRight, 
    User, 
    Building2, 
    FileText, 
    Presentation, 
    Hash, 
    Edit, 
    Info, 
    Target, 
    ShieldCheck,
    ChevronLeft,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

interface ManagementReviewTabProps {
  campuses: Campus[];
  units: Unit[];
  canManage: boolean;
}

const mrSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  minutesLink: z.string().url('Invalid URL'),
  campusId: z.string().min(1, 'Campus is required'),
});

const outputSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  initiator: z.string().min(1, 'Initiator is required'),
  lineNumber: z.string().optional(),
  assignments: z.array(z.object({
    campusId: z.string().min(1, 'Campus is required'),
    unitId: z.string().min(1, 'Unit is required'),
  })).min(1, 'At least one assignment is required'),
  actionPlan: z.string().optional(),
  followUpDate: z.string().min(1, 'Follow-up date is required'),
  status: z.enum(['Open', 'On-going', 'Submit for Closure Verification', 'Closed']),
});

const UNIVERSITY_WIDE_ID = 'university-wide';
const ALL_UNITS_ID = 'all-units';
const ALL_ACADEMIC_ID = 'all-academic-units';
const ALL_ADMIN_ID = 'all-admin-units';
const ALL_REDI_ID = 'all-redi-units';

const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

export function ManagementReviewTab({ campuses, units, canManage }: ManagementReviewTabProps) {
  const { userProfile, isAdmin, userRole, isAuditor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedMr, setSelectedMr] = useState<ManagementReview | null>(null);
  const [isMrDialogOpen, setIsMrDialogOpen] = useState(false);
  const [isOutputDialogOpen, setIsOutputDialogOpen] = useState(false);
  const [editingOutput, setEditingOutput] = useState<ManagementReviewOutput | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const reviewsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'managementReviews'), orderBy('startDate', 'desc')) : null),
    [firestore]
  );
  const { data: reviews, isLoading: isLoadingReviews } = useCollection<ManagementReview>(reviewsQuery);

  const outputsQuery = useMemoFirebase(
    () => (firestore && selectedMr ? query(collection(firestore, 'managementReviewOutputs'), where('mrId', '==', selectedMr.id)) : null),
    [firestore, selectedMr]
  );
  const { data: rawOutputs, isLoading: isLoadingOutputs } = useCollection<ManagementReviewOutput>(outputsQuery);

  const myUnit = useMemo(() => {
    if (!userProfile?.unitId || !units) return null;
    return units.find(u => u.id === userProfile.unitId);
  }, [userProfile?.unitId, units]);

  /**
   * VISIBILITY LOGIC FOR UNIT COORDINATORS & ODIMOS
   * Filters the outputs of a selected MR based on user's authorized scope.
   */
  const processedOutputs = useMemo(() => {
    if (!rawOutputs || !userProfile) return [];
    
    const isInstitutionalViewer = isAdmin || isAuditor;
    const isCampusSupervisor = userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president');
    const isUnitLevel = userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO';

    return rawOutputs.filter(output => {
        if (isInstitutionalViewer) return true;

        const visibleAssignments = (output.assignments || []).filter(a => {
            const isInstitutionalTarget = a.campusId === UNIVERSITY_WIDE_ID;
            const isMyCampus = a.campusId === userProfile.campusId;

            if (isCampusSupervisor) {
                return isInstitutionalTarget || isMyCampus;
            }

            if (isUnitLevel) {
                if (!isInstitutionalTarget && !isMyCampus) return false;
                if (a.unitId === ALL_UNITS_ID) return true;
                if (a.unitId === ALL_ACADEMIC_ID && myUnit?.category === 'Academic') return true;
                if (a.unitId === ALL_ADMIN_ID && myUnit?.category === 'Administrative') return true;
                if (a.unitId === ALL_REDI_ID && myUnit?.category === 'Research') return true;
                if (a.unitId === userProfile.unitId) return true;
            }
            return false;
        });

        return visibleAssignments.length > 0;
    });
  }, [rawOutputs, userProfile, isAdmin, isAuditor, userRole, myUnit]);

  const mrForm = useForm<z.infer<typeof mrSchema>>({
    resolver: zodResolver(mrSchema),
    defaultValues: { title: '', startDate: '', endDate: '', minutesLink: '', campusId: '' }
  });

  const outputForm = useForm<z.infer<typeof outputSchema>>({
    resolver: zodResolver(outputSchema),
    defaultValues: { 
        description: '', 
        initiator: '', 
        lineNumber: '',
        assignments: [{ campusId: '', unitId: '' }], 
        actionPlan: '', 
        followUpDate: '', 
        status: 'Open' 
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: outputForm.control,
    name: "assignments"
  });

  const handleMrSubmit = async (values: z.infer<typeof mrSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'managementReviews'), {
        ...values,
        startDate: Timestamp.fromDate(new Date(values.startDate)),
        endDate: Timestamp.fromDate(new Date(values.endDate)),
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'Management Review session added.' });
      setIsMrDialogOpen(false);
      mrForm.reset();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add MR.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOutputSubmit = async (values: z.infer<typeof outputSchema>) => {
    if (!firestore || !selectedMr) return;
    setIsSubmitting(true);
    try {
      const campusIds = Array.from(new Set(values.assignments.map(a => a.campusId)));
      const concernedUnitIds = Array.from(new Set(values.assignments.map(a => a.unitId)));

      const dataToSave = {
        ...values,
        lineNumber: values.lineNumber || '',
        actionPlan: values.actionPlan || '',
        mrId: selectedMr.id,
        campusIds,
        concernedUnitIds,
        followUpDate: Timestamp.fromDate(new Date(values.followUpDate)),
        updatedAt: serverTimestamp(),
      };

      if (editingOutput) {
        await updateDoc(doc(firestore, 'managementReviewOutputs', editingOutput.id), dataToSave);
        toast({ title: 'Success', description: 'Decision updated.' });
      } else {
        await addDoc(collection(firestore, 'managementReviewOutputs'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Decision logged.' });
      }
      
      setIsOutputDialogOpen(false);
      setEditingOutput(null);
      outputForm.reset();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to save output.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenOutputDialog = (output: ManagementReviewOutput | null = null) => {
    setEditingOutput(output);
    if (output) {
        const safeDate = (d: any) => d?.toDate ? format(d.toDate(), 'yyyy-MM-dd') : (d ? format(new Date(d), 'yyyy-MM-dd') : '');
        outputForm.reset({
            description: output.description,
            initiator: output.initiator,
            lineNumber: output.lineNumber || '',
            assignments: output.assignments || [{ campusId: '', unitId: '' }],
            actionPlan: output.actionPlan || '',
            followUpDate: safeDate(output.followUpDate),
            status: output.status
        });
    } else {
        outputForm.reset({ 
            description: '', 
            initiator: '', 
            lineNumber: '',
            assignments: [{ campusId: '', unitId: '' }], 
            actionPlan: '', 
            followUpDate: '', 
            status: 'Open' 
        });
    }
    setIsOutputDialogOpen(true);
  };

  const campusMap = useMemo(() => {
    const map = new Map(campuses.map(c => [c.id, c.name]));
    map.set(UNIVERSITY_WIDE_ID, 'University-Wide');
    return map;
  }, [campuses]);

  const unitMap = useMemo(() => {
    const map = new Map(units.map(u => [u.id, u.name]));
    map.set(ALL_UNITS_ID, 'All Units / Institutional');
    map.set(ALL_ACADEMIC_ID, 'All Academic Units');
    map.set(ALL_ADMIN_ID, 'All Administrative Units');
    map.set(ALL_REDI_ID, 'All REDi Units');
    return map;
  }, [units]);

  const safeFormatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return format(d, 'PP');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
            <h3 className="text-lg font-black uppercase tracking-tight">Management Review Sessions</h3>
            <p className="text-xs text-muted-foreground">Select a session from the log to view official outputs and minutes.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                className="h-9 px-4 font-black uppercase text-[10px] tracking-widest bg-white border-primary/20 text-primary hover:bg-primary/5"
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            >
                {isSidebarVisible ? <PanelLeftClose className="mr-2 h-4 w-4" /> : <PanelLeftOpen className="mr-2 h-4 w-4" />}
                {isSidebarVisible ? 'Hide Logs' : 'Show Logs'}
            </Button>
            {canManage && (
                <Button onClick={() => setIsMrDialogOpen(true)} size="sm" className="h-9 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Session
                </Button>
            )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-20rem)]">
        <div className={cn(
            "transition-all duration-300 overflow-hidden flex flex-col gap-2",
            isSidebarVisible ? "w-full lg:w-1/4 opacity-100" : "w-0 opacity-0 lg:-mr-6"
        )}>
            <Card className="flex flex-col h-[400px] lg:h-full shadow-sm border-primary/10 bg-muted/5">
                <CardHeader className="pb-4 border-b">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Meeting Log Archive</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-2">
                    <ScrollArea className="h-full">
                        <div className="space-y-2 pr-2">
                            {reviews?.map(review => (
                            <Card 
                                key={review.id} 
                                className={cn(
                                    "cursor-pointer transition-all hover:shadow-md border-transparent", 
                                    selectedMr?.id === review.id ? "bg-primary/10 border-primary/20 shadow-sm" : "hover:bg-muted/50 bg-white"
                                )}
                                onClick={() => setSelectedMr(review)}
                            >
                                <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-1.5 min-w-0">
                                            <p className={cn("text-xs font-bold leading-tight truncate", selectedMr?.id === review.id ? "text-primary" : "text-slate-700")}>{review.title}</p>
                                            <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-black uppercase tracking-tighter">
                                                <Calendar className="h-2.5 w-2.5" />
                                                {safeFormatDate(review.startDate)}
                                            </div>
                                        </div>
                                        <ChevronRight className={cn("h-3 w-3 mt-1 shrink-0 transition-transform", selectedMr?.id === review.id ? "text-primary rotate-90" : "text-muted-foreground opacity-30")} />
                                    </div>
                                </CardContent>
                            </Card>
                            ))}
                            {reviews?.length === 0 && (
                                <div className="text-center py-20 opacity-20">
                                    <Presentation className="h-10 w-10 mx-auto mb-2" />
                                    <p className="text-[10px] font-black uppercase">Log is empty</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        <div className="flex-1 min-w-0 flex flex-col relative">
            <Button
                variant="secondary"
                size="icon"
                className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full border shadow-md hidden lg:flex hover:bg-primary hover:text-white transition-colors"
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                title={isSidebarVisible ? "Hide Logs" : "Show Logs"}
            >
                {isSidebarVisible ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            {selectedMr ? (
                <div className="h-full flex flex-col space-y-4">
                    <Card className="shrink-0 border-primary/10 shadow-md">
                        <CardHeader className="py-4 border-b bg-muted/10">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg font-black uppercase tracking-tight">{selectedMr.title}</CardTitle>
                                        <Badge className="bg-primary text-white text-[8px] font-black h-4 px-1.5 uppercase">
                                            {selectedMr.campusId === UNIVERSITY_WIDE_ID ? 'Institutional' : 'Site-Specific'}
                                        </Badge>
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Selected Management Review Session</p>
                                </div>
                                <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold" asChild>
                                    <a href={selectedMr.minutesLink} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3 w-3 mr-1.5" /> OPEN MINUTES
                                    </a>
                                </Button>
                            </div>
                        </CardHeader>
                        <div className="p-3 bg-white/50 border-t">
                            <div className="flex items-start gap-3">
                                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <p className="text-[9px] text-muted-foreground italic leading-tight">
                                    <strong>Guide:</strong> Management Reviews (MR) are top-level evaluations of performance. The decisions logged here are the official outputs of the University President and the Board of Regents.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Tabs defaultValue="outputs" className="flex-1 flex flex-col min-h-0">
                        <TabsList className="bg-muted p-1 border grid grid-cols-2 shrink-0 h-10 w-[400px]">
                            <TabsTrigger value="outputs" className="text-[10px] font-black uppercase tracking-widest gap-2">
                                <ListChecks className="h-3.5 w-3.5" /> Decisions & Actions
                            </TabsTrigger>
                            <TabsTrigger value="minutes" className="text-[10px] font-black uppercase tracking-widest gap-2">
                                <FileText className="h-3.5 w-3.5" /> Minutes Preview
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-hidden pt-2">
                            <TabsContent value="outputs" className="h-full m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Card className="h-full flex flex-col overflow-hidden shadow-lg border-primary/10 bg-white">
                                    <div className="p-4 border-b bg-muted/5 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-2">
                                            <Target className="h-4 w-4 text-primary" />
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Decisions / Action Plans Registry</h4>
                                        </div>
                                        {canManage && (
                                            <Button onClick={() => handleOpenOutputDialog()} size="sm" className="h-7 text-[9px] font-black uppercase shadow-lg shadow-primary/20">
                                                <PlusCircle className="h-3 w-3 mr-1.5" /> LOG MR OUTPUT
                                            </Button>
                                        )}
                                    </div>
                                    <CardContent className="p-0 flex-1 overflow-hidden">
                                        <ScrollArea className="h-full">
                                            {isLoadingOutputs ? (
                                                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
                                            ) : (
                                                <Table>
                                                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                                        <TableRow className="hover:bg-transparent">
                                                            <TableHead className="text-[10px] font-black uppercase py-2 w-[40px] text-center">#</TableHead>
                                                            <TableHead className="text-[10px] font-black uppercase py-2">Decision / Description</TableHead>
                                                            <TableHead className="text-[10px] font-black uppercase py-2">Assigned Responsibilities</TableHead>
                                                            <TableHead className="text-[10px] font-black uppercase py-2 text-center">Follow-up</TableHead>
                                                            <TableHead className="text-[10px] font-black uppercase py-2 text-right">Status</TableHead>
                                                            <TableHead className="text-[10px] font-black uppercase py-2 text-right pr-6">Action</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {processedOutputs?.map((output, index) => (
                                                            <TableRow key={output.id} className="hover:bg-muted/20 transition-colors">
                                                                <TableCell className="text-[10px] font-black text-muted-foreground text-center">{index + 1}</TableCell>
                                                                <TableCell className="max-w-xs py-4">
                                                                    <div className="flex flex-col gap-1">
                                                                        <p className="font-bold text-xs text-slate-800 leading-relaxed">{output.description}</p>
                                                                        <div className="flex flex-wrap items-center gap-3 mt-2 opacity-60">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <User className="h-2.5 w-2.5" />
                                                                                <span className="text-[9px] font-bold uppercase tracking-tighter">Initiator: {output.initiator}</span>
                                                                            </div>
                                                                            {output.lineNumber && (
                                                                                <div className="flex items-center gap-1.5 text-primary">
                                                                                    <Hash className="h-2.5 w-2.5" />
                                                                                    <span className="text-[9px] font-black uppercase tracking-tighter">Line: {output.lineNumber}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col gap-1.5">
                                                                        {(output.assignments || []).map((a, idx) => (
                                                                            <div key={idx} className="flex flex-wrap items-center gap-1">
                                                                                <Badge variant="secondary" className="text-[8px] h-4 py-0 uppercase bg-primary/5 text-primary border-none">
                                                                                    {campusMap.get(a.campusId) || a.campusId}
                                                                                </Badge>
                                                                                <ChevronRight className="h-2.5 w-2.5 opacity-30" />
                                                                                <Badge variant="outline" className={cn(
                                                                                    "text-[8px] h-4 py-0 uppercase",
                                                                                    a.unitId === ALL_ACADEMIC_ID ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                                                    a.unitId === ALL_ADMIN_ID ? "bg-slate-50 text-slate-700 border-slate-200" :
                                                                                    a.unitId === ALL_REDI_ID ? "bg-purple-50 text-purple-700 border-purple-200" :
                                                                                    "border-primary/20"
                                                                                )}>
                                                                                    {unitMap.get(a.unitId) || a.unitId}
                                                                                </Badge>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <span className="text-[10px] font-black tabular-nums text-slate-600">
                                                                        {output.followUpDate?.toDate ? format(output.followUpDate.toDate(), 'MMM dd, yy') : 'N/A'}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Badge 
                                                                        className={cn(
                                                                            "text-[9px] font-black uppercase border-none px-2 shadow-sm whitespace-nowrap",
                                                                            output.status === 'Open' ? "bg-rose-600 text-white" : 
                                                                            output.status === 'On-going' ? "bg-amber-50 text-amber-950" : 
                                                                            output.status === 'Submit for Closure Verification' ? "bg-blue-600 text-white animate-pulse" :
                                                                            "bg-emerald-600 text-white"
                                                                        )}
                                                                    >
                                                                        {output.status}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right pr-6">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-8 w-8 text-primary hover:bg-primary/5"
                                                                        onClick={() => handleOpenOutputDialog(output)}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {processedOutputs?.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                                                        <Presentation className="h-10 w-10" />
                                                                        <p className="text-[10px] font-black uppercase tracking-widest">No decisions logged for your scope</p>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="minutes" className="h-full m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Card className="h-full flex flex-col overflow-hidden border-primary/10 shadow-lg bg-white">
                                    <div className="p-4 border-b bg-muted/5 flex items-center justify-between shrink-0">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Minutes of the Meeting Preview</h4>
                                        <p className="text-[9px] font-bold text-muted-foreground italic">Powered by Google Drive Preview</p>
                                    </div>
                                    <div className="flex-1 bg-muted relative">
                                        <iframe
                                            src={getEmbedUrl(selectedMr.minutesLink)}
                                            className="absolute inset-0 w-full h-full border-none bg-white"
                                            allow="autoplay"
                                            title="MR Minutes Preview"
                                        />
                                    </div>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center border border-dashed rounded-2xl bg-muted/5 text-muted-foreground animate-in fade-in duration-500">
                    <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mb-4">
                        <Presentation className="h-10 w-10 opacity-20" />
                    </div>
                    <h4 className="font-black text-xs uppercase tracking-[0.2em]">Management Review Content Hub</h4>
                    <p className="text-[10px] mt-2 max-w-[250px] text-center font-medium leading-relaxed">Select a session from the Meeting Log Archive on the left to analyze decisions and review minutes.</p>
                </div>
            )}
        </div>
      </div>

      {/* --- Dialogs --- */}

      <Dialog open={isMrDialogOpen} onOpenChange={setIsMrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
                <Presentation className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Session Creation</span>
            </div>
            <DialogTitle>New Management Review</DialogTitle>
            <DialogDescription>Log an institutional review session into the registry.</DialogDescription>
          </DialogHeader>
          <Form {...mrForm}>
            <form onSubmit={mrForm.handleSubmit(handleMrSubmit)} className="space-y-4 pt-4">
              <FormField control={mrForm.control} name="title" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold uppercase">Meeting Title</FormLabel><FormControl><Input {...field} placeholder="e.g., 1st Quarter Management Review" className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={mrForm.control} name="startDate" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold uppercase">Start Date</FormLabel><FormControl><Input type="date" {...field} className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={mrForm.control} name="endDate" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold uppercase">End Date</FormLabel><FormControl><Input type="date" {...field} className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={mrForm.control} name="campusId" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold uppercase">Review Scope</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select Scope" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={UNIVERSITY_WIDE_ID} className="font-bold text-primary italic">University-Wide (Institutional)</SelectItem>
                      {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={mrForm.control} name="minutesLink" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold uppercase">Google Drive Minutes Link</FormLabel><FormControl><Input {...field} placeholder="https://drive.google.com/..." className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsMrDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[120px] shadow-lg shadow-primary/20">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-1.5" />}
                    Register Session
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isOutputDialogOpen} onOpenChange={(open) => { setIsOutputDialogOpen(open); if (!open) setEditingOutput(null); }}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
                <ListChecks className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Action Registry</span>
            </div>
            <DialogTitle>{editingOutput ? 'Edit' : 'Log'} Review Output</DialogTitle>
            <DialogDescription>Assign decisions to specific campuses and units.</DialogDescription>
          </DialogHeader>
          <Form {...outputForm}>
            <form onSubmit={outputForm.handleSubmit(handleOutputSubmit)} className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-3">
                            <FormField control={outputForm.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-black uppercase text-slate-700">Decision Description / Statement</FormLabel><FormControl><Input {...field} placeholder="Summarize the decision or required action..." className="bg-slate-50 h-11" /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={outputForm.control} name="lineNumber" render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-black uppercase text-primary">MR Line Number</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground opacity-50" />
                                        <Input {...field} placeholder="e.g., 42" className="bg-slate-50 h-11 pl-9 font-mono" />
                                    </div>
                                </FormControl>
                                <FormDescription className="text-[9px]">Reference line from minutes</FormDescription>
                            </FormItem>
                        )} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <FormField control={outputForm.control} name="initiator" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-black uppercase text-slate-700">Initiator / Responsible Party</FormLabel><FormControl><Input {...field} placeholder="Name or Office" className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={outputForm.control} name="followUpDate" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-black uppercase text-slate-700">Follow-up Target Date</FormLabel><FormControl><Input type="date" {...field} className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-primary">Responsibility Assignments</h4>
                            <p className="text-[10px] font-bold text-muted-foreground italic">Campus + Unit coupling required per entry</p>
                        </div>
                        
                        <div className="space-y-3">
                            {fields.map((field, index) => {
                                const currentCampusId = outputForm.watch(`assignments.${index}.campusId`);
                                const filteredUnits = currentCampusId === UNIVERSITY_WIDE_ID 
                                    ? [] 
                                    : units.filter(u => u.campusIds?.includes(currentCampusId));

                                return (
                                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 rounded-lg border bg-muted/5 group relative transition-all hover:border-primary/30">
                                        <div className="md:col-span-5 space-y-1.5">
                                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Responsible Campus</Label>
                                            <FormField control={outputForm.control} name={`assignments.${index}.campusId`} render={({ field: cField }) => (
                                                <Select onValueChange={(val) => { cField.onChange(val); outputForm.setValue(`assignments.${index}.unitId`, ''); }} value={cField.value}>
                                                    <FormControl><SelectTrigger className="bg-background h-9 text-xs font-bold"><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value={UNIVERSITY_WIDE_ID} className="font-bold text-primary italic">University-Wide (Institutional)</SelectItem>
                                                        {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            )} />
                                        </div>
                                        <div className="md:col-span-6 space-y-1.5">
                                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Concerned Unit / Office</Label>
                                            <FormField control={outputForm.control} name={`assignments.${index}.unitId`} render={({ field: uField }) => (
                                                <Select onValueChange={uField.onChange} value={uField.value} disabled={!currentCampusId}>
                                                    <FormControl><SelectTrigger className="bg-background h-9 text-xs font-bold"><SelectValue placeholder={currentCampusId ? "Select Unit" : "Select Campus First"} /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value={ALL_UNITS_ID} className="font-bold text-emerald-600 italic">All Relevant Units / Offices</SelectItem>
                                                        <SelectItem value={ALL_ACADEMIC_ID} className="font-bold text-blue-600 italic">All Academic Units</SelectItem>
                                                        <SelectItem value={ALL_ADMIN_ID} className="font-bold text-slate-600 italic">All Administrative Units</SelectItem>
                                                        <SelectItem value={ALL_REDI_ID} className="font-bold text-purple-600 italic">All REDi Units</SelectItem>
                                                        {filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            )} />
                                        </div>
                                        <div className="md:col-span-1 flex justify-end">
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-9 w-9 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" 
                                                onClick={() => remove(index)}
                                                disabled={fields.length === 1}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="w-full border-dashed h-10 font-bold text-xs uppercase gap-2 hover:bg-primary/5 hover:text-primary hover:border-primary/50"
                            onClick={() => append({ campusId: '', unitId: '' })}
                            disabled={!outputForm.watch(`assignments.${fields.length - 1}.campusId`) || !outputForm.watch(`assignments.${fields.length - 1}.unitId`)}
                        >
                            <PlusCircle className="h-4 w-4" />
                            Add Campus + Unit Concerned
                        </Button>
                    </div>

                    <FormField control={outputForm.control} name="actionPlan" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-black uppercase text-slate-700">Proposed Action Strategy (Optional)</FormLabel>
                            <FormControl><Input {...field} value={field.value || ''} placeholder="Brief suggestion on implementation..." className="bg-slate-50" /></FormControl>
                            <FormDescription className="text-[9px]">Leave blank if the unit will propose their own plan based on the decision.</FormDescription>
                        </FormItem>
                    )} />

                    <FormField control={outputForm.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-black uppercase text-primary">Initial Lifecycle Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="bg-primary/5 border-primary/20 font-black"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="On-going">On-going</SelectItem>
                                <SelectItem value="Submit for Closure Verification">Submit for Closure Verification</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                </div>
              </ScrollArea>

              <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsOutputDialogOpen(false)} disabled={isSubmitting}>Discard</Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[180px] shadow-xl shadow-primary/20 font-black text-xs uppercase tracking-widest">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4 mr-1.5" />}
                    {editingOutput ? 'Update Decision' : 'Log MR Output'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
