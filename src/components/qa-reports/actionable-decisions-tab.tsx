
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { ManagementReviewOutput, Campus, Unit, ManagementReview } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Loader2, 
    Calendar, 
    Send, 
    Building2, 
    ListChecks, 
    History, 
    Info, 
    User, 
    ShieldCheck, 
    Hash, 
    ChevronRight, 
    Eye, 
    LayoutList, 
    Target, 
    Filter, 
    BarChart3, 
    List,
    Search,
    ArrowUpDown,
    ClipboardList,
    Undo2,
    Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DecisionAnalytics } from './decision-analytics';

interface ActionableDecisionsTabProps {
  campuses: Campus[];
  units: Unit[];
}

const updateSchema = z.object({
  followUpRemarks: z.string().min(5, 'Please provide a descriptive update on actions taken.'),
  status: z.enum(['Open', 'On-going', 'Submit for Closure Verification', 'Closed']),
  actionDate: z.string().min(1, 'Date of action is required.'),
  actionTakenBy: z.string().min(1, 'Name of the person who executed the action is required.'),
  verificationRemarks: z.string().optional(),
  verificationDate: z.string().optional(),
});

const ALL_UNITS_ID = 'all-units';
const ALL_ACADEMIC_ID = 'all-academic-units';
const ALL_ADMIN_ID = 'all-admin-units';
const ALL_REDI_ID = 'all-redi-units';

type SortKey = 'description' | 'responsibility' | 'followUpDate' | 'status';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

export function ActionableDecisionsTab({ campuses, units }: ActionableDecisionsTabProps) {
  const { userProfile, isAdmin, userRole, isAuditor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedOutput, setSelectedOutput] = useState<ManagementReviewOutput | null>(null);
  const [previewOutput, setPreviewOutput] = useState<ManagementReviewOutput | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  
  // UI Functional States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'followUpDate', direction: 'asc' });

  const outputsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(collection(firestore, 'managementReviewOutputs'), orderBy('createdAt', 'desc'));
  }, [firestore, userProfile]);

  const { data: rawOutputs, isLoading: isLoadingOutputs } = useCollection<ManagementReviewOutput>(outputsQuery);

  const reviewsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'managementReviews') : null), [firestore]);
  const { data: reviews, isLoading: isLoadingReviews } = useCollection<ManagementReview>(reviewsQuery);

  const myUnit = useMemo(() => {
    if (!userProfile?.unitId || !units) return null;
    return units.find(u => u.id === userProfile.unitId);
  }, [userProfile?.unitId, units]);

  const campusMap = useMemo(() => {
    const map = new Map(campuses.map(c => [c.id, c.name]));
    map.set('university-wide', 'University-Wide');
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

  const reviewMap = useMemo(() => {
    const map = new Map<string, { title: string; year: string }>();
    reviews?.forEach(r => {
      const date = r.startDate instanceof Timestamp ? r.startDate.toDate() : new Date(r.startDate);
      map.set(r.id, { 
        title: r.title, 
        year: date.getFullYear().toString() 
      });
    });
    return map;
  }, [reviews]);

  const availableYears = useMemo(() => {
    if (!reviews) return [];
    const years = new Set<string>();
    reviews.forEach(r => {
      const date = r.startDate instanceof Timestamp ? r.startDate.toDate() : new Date(r.startDate);
      years.add(date.getFullYear().toString());
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [reviews]);

  /**
   * DATA PROCESSING PIPELINE
   */
  const processedOutputs = useMemo(() => {
    if (!rawOutputs || !userProfile) return [];
    
    const isInstitutionalViewer = isAdmin || isAuditor;
    const isCampusSupervisor = userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president');
    const isUnitLevel = userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO';

    let result = rawOutputs.map(output => {
        const visibleAssignments = (output.assignments || []).filter(a => {
            if (isInstitutionalViewer) return true;
            const isInstitutionalTarget = a.campusId === 'university-wide';
            const isMyCampus = a.campusId === userProfile.campusId;
            if (isCampusSupervisor) return isInstitutionalTarget || isMyCampus;
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

        if (visibleAssignments.length === 0 && !isInstitutionalViewer) return null;

        if (selectedYear !== 'all') {
            const reviewData = reviewMap.get(output.mrId);
            if (reviewData?.year !== selectedYear) return null;
        }

        return { ...output, assignments: visibleAssignments };
    }).filter(Boolean as any) as ManagementReviewOutput[];

    // 1. Apply Search
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(o => 
            o.description.toLowerCase().includes(lower) ||
            o.initiator.toLowerCase().includes(lower) ||
            o.assignments?.some(a => 
                (campusMap.get(a.campusId) || '').toLowerCase().includes(lower) ||
                (unitMap.get(a.unitId) || '').toLowerCase().includes(lower)
            )
        );
    }

    // 2. Apply Status Filter
    if (statusFilter !== 'all') {
        result = result.filter(o => o.status === statusFilter);
    }

    // 3. Apply Sorting
    if (sortConfig) {
        const { key, direction } = sortConfig;
        result.sort((a, b) => {
            let valA: any, valB: any;
            
            switch(key) {
                case 'description': valA = a.description; valB = b.description; break;
                case 'status': valA = a.status; valB = b.status; break;
                case 'followUpDate': 
                    valA = a.followUpDate?.toMillis?.() || new Date(a.followUpDate).getTime();
                    valB = b.followUpDate?.toMillis?.() || new Date(b.followUpDate).getTime();
                    break;
                case 'responsibility':
                    valA = a.assignments?.[0]?.unitId || '';
                    valB = b.assignments?.[0]?.unitId || '';
                    break;
                default: valA = ''; valB = '';
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return result;
  }, [rawOutputs, userProfile, isAdmin, isAuditor, userRole, myUnit, selectedYear, reviewMap, searchTerm, statusFilter, sortConfig, campusMap, unitMap]);

  const updateForm = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: { 
        status: 'Open', 
        followUpRemarks: '', 
        actionDate: format(new Date(), 'yyyy-MM-dd'), 
        actionTakenBy: '',
        verificationRemarks: '',
        verificationDate: format(new Date(), 'yyyy-MM-dd')
    }
  });

  const handleOpenUpdate = (output: ManagementReviewOutput) => {
    setSelectedOutput(output);
    const safeDate = (d: any) => d?.toDate ? format(d.toDate(), 'yyyy-MM-dd') : (d ? format(new Date(d), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    
    updateForm.reset({
        status: output.status,
        followUpRemarks: output.followUpRemarks || '',
        actionDate: safeDate(output.actionDate),
        actionTakenBy: output.actionTakenBy || (userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : ''),
        verificationRemarks: output.verificationRemarks || '',
        verificationDate: safeDate(output.verificationDate)
    });
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateStatusSubmit = async (values: z.infer<typeof updateSchema>) => {
    if (!firestore || !selectedOutput) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(firestore, 'managementReviewOutputs', selectedOutput.id);
      const updateData: any = {
        ...values,
        actionDate: Timestamp.fromDate(new Date(values.actionDate)),
        updatedAt: serverTimestamp(),
      };

      if (isAdmin && values.status === 'Closed') {
          updateData.verificationDate = Timestamp.fromDate(new Date(values.verificationDate || new Date()));
          updateData.verifiedBy = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Admin';
      }

      await updateDoc(docRef, updateData);
      toast({ title: 'Update Recorded', description: 'Your action update has been successfully logged.' });
      setIsUpdateDialogOpen(false);
    } catch (error) {
      toast({ title: 'Update Failed', description: 'Could not save the update.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    return <ArrowUpDown className={cn("h-3 w-3 ml-1.5 transition-colors", sortConfig?.key === key ? "text-primary opacity-100" : "opacity-20")} />;
  };

  const safeFormatDateLocal = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return format(d, 'PP');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-slate-900">
                <ShieldCheck className="h-6 w-6 text-primary" />
                Actionable Decisions Hub
            </h3>
            <p className="text-xs text-muted-foreground font-medium">Monitoring and implementation of institutional management directives.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1.5 flex items-center gap-1">
                    <Filter className="h-2.5 w-2.5" /> Review Year Filter
                </label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[160px] h-9 bg-white font-bold shadow-sm">
                        <SelectValue placeholder="All Sessions" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sessions</SelectItem>
                        {availableYears.map(y => <SelectItem key={y} value={y}>Review Year {y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="bg-muted p-1 border shadow-sm w-fit h-10">
            <TabsTrigger value="insights" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                <BarChart3 className="h-3.5 w-3.5" /> Strategic Insights
            </TabsTrigger>
            <TabsTrigger value="registry" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                <List className="h-3.5 w-3.5" /> My Assignments Registry
            </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="animate-in fade-in duration-500">
            <DecisionAnalytics 
                outputs={processedOutputs}
                reviews={reviews || []}
                campuses={campuses}
                units={units}
                isLoading={isLoadingOutputs || isLoadingReviews}
                selectedYear={selectedYear}
            />
        </TabsContent>

        <TabsContent value="registry" className="animate-in fade-in duration-500 space-y-4">
            {/* SEARCH & FILTER BAR */}
            <Card className="border-primary/10 shadow-sm bg-muted/10">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                            <Search className="h-2.5 w-2.5" /> Search Decisions
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by description, initiator, or unit..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-10 text-xs bg-white"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                            <History className="h-2.5 w-2.5" /> Implementation Status
                        </label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 text-xs bg-white">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="On-going">On-going</SelectItem>
                                <SelectItem value="Submit for Closure Verification">Verification Pending</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-md border-primary/10 overflow-hidden">
                <CardContent className="p-0">
                {isLoadingOutputs ? (
                    <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                            <TableHead className="font-bold text-[10px] uppercase w-[40px] pl-6">#</TableHead>
                            <TableHead>
                                <Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('description')}>
                                    Decision & Source {getSortIcon('description')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('responsibility')}>
                                    Responsibility {getSortIcon('responsibility')}
                                </Button>
                            </TableHead>
                            <TableHead className="text-center">
                                <Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent mx-auto" onClick={() => requestSort('followUpDate')}>
                                    Deadline {getSortIcon('followUpDate')}
                                </Button>
                            </TableHead>
                            <TableHead className="text-right">
                                <Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent ml-auto" onClick={() => requestSort('status')}>
                                    Status {getSortIcon('status')}
                                </Button>
                            </TableHead>
                            <TableHead className="text-right font-bold text-[10px] uppercase pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processedOutputs.map((output, index) => (
                            <TableRow 
                                key={output.id} 
                                className="hover:bg-muted/30 cursor-pointer transition-colors group"
                                onClick={() => setPreviewOutput(output)}
                            >
                                <TableCell className="text-[10px] font-black text-muted-foreground text-center pl-6">{index + 1}</TableCell>
                                <TableCell>
                                <div className="flex flex-col gap-1 max-w-xs">
                                    <span className="font-bold text-sm text-slate-900 leading-snug group-hover:text-primary transition-colors">{output.description}</span>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-primary/60 uppercase tracking-tighter">
                                            <History className="h-2.5 w-2.5" />
                                            From: {reviewMap.get(output.mrId)?.title || 'MR Session'}
                                        </div>
                                        {output.lineNumber && (
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">
                                                <Hash className="h-2 w-2" />
                                                Line: {output.lineNumber}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        {(output.assignments || []).map((a, i) => (
                                            <div key={i} className="flex items-center gap-1">
                                                <Badge variant="secondary" className="text-[8px] h-4 font-black bg-primary/5 text-primary border-none">
                                                    {campusMap.get(a.campusId) || a.campusId}
                                                </Badge>
                                                <Badge variant="outline" className={cn(
                                                    "text-[8px] h-4 font-bold border-muted-foreground/20",
                                                    a.unitId === ALL_UNITS_ID ? "bg-blue-50 text-blue-700" :
                                                    a.unitId === ALL_ACADEMIC_ID ? "bg-slate-50 text-slate-700" :
                                                    a.unitId === ALL_ADMIN_ID ? "bg-slate-50 text-slate-700" :
                                                    a.unitId === ALL_REDI_ID ? "bg-purple-50 text-purple-700" :
                                                    "text-muted-foreground bg-white"
                                                )}>
                                                    {unitMap.get(a.unitId) || a.unitId}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-600">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        {safeFormatDateLocal(output.followUpDate)}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge 
                                        className={cn(
                                            "text-[9px] font-black uppercase border-none px-2 shadow-sm whitespace-nowrap",
                                            output.status === 'Open' ? "bg-rose-600 text-white" : 
                                            output.status === 'On-going' ? "bg-amber-500 text-amber-950" : 
                                            output.status === 'Submit for Closure Verification' ? "bg-blue-600 text-white animate-pulse" :
                                            "bg-emerald-600 text-white"
                                        )}
                                    >
                                        {output.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6 whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => handleOpenUpdate(output)} 
                                            className="h-8 text-[10px] font-black uppercase tracking-widest bg-white shadow-sm"
                                        >
                                            UPDATE
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            ))}
                            {!isLoadingOutputs && processedOutputs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                        <ListChecks className="h-10 w-10" />
                                        <p className="text-xs font-bold uppercase tracking-widest">
                                            {searchTerm || statusFilter !== 'all' ? "No results match your search filters" : "No assignments found"}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* --- Dialogs --- */}

      <Dialog open={!!previewOutput} onOpenChange={(open) => !open && setPreviewOutput(null)}>
        <DialogContent className="max-w-2xl overflow-hidden p-0 border-none shadow-2xl">
            {previewOutput && (
                <>
                    <DialogHeader className="p-6 bg-slate-50 border-b shrink-0">
                        <div className="flex items-center gap-2 text-primary mb-1">
                            <LayoutList className="h-5 w-5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Management Decision Review</span>
                        </div>
                        <DialogTitle className="text-xl font-bold">Action Item Details</DialogTitle>
                        <DialogDescription className="text-xs">Comprehensive view of the institutional requirement and assigned responsibilities.</DialogDescription>
                    </DialogHeader>
                    
                    <ScrollArea className="max-h-[60vh]">
                        <div className="p-8 space-y-8">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Requirement Statement</h4>
                                    {previewOutput.lineNumber && (
                                        <Badge variant="outline" className="h-5 text-[9px] font-black border-primary/20 text-primary">
                                            LINE NO: {previewOutput.lineNumber}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-lg font-bold text-slate-900 leading-relaxed italic">
                                    "{previewOutput.description}"
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <User className="h-3 w-3" /> Origin & Authority
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Initiator</p>
                                            <p className="text-xs font-bold text-slate-700">{previewOutput.initiator}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Source Session</p>
                                            <p className="text-xs font-bold text-slate-700">{reviewMap.get(previewOutput.mrId)?.title || 'Management Review'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Target className="h-3 w-3" /> Targets & Deadlines
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Current Status</p>
                                            <Badge 
                                                className={cn(
                                                    "text-[9px] font-black uppercase border-none h-5 px-2 mt-1",
                                                    previewOutput.status === 'Open' ? "bg-rose-600 text-white" : 
                                                    previewOutput.status === 'On-going' ? "bg-amber-500 text-amber-950" : 
                                                    previewOutput.status === 'Submit for Closure Verification' ? "bg-blue-600 text-white" :
                                                    "bg-emerald-600 text-white"
                                                )}
                                            >
                                                {previewOutput.status}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Follow-up Deadline</p>
                                            <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">
                                                {safeFormatDateLocal(previewOutput.followUpDate)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Accountability Matrix</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {(previewOutput.assignments || []).map((a, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-3.5 w-3.5 text-primary/60" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-primary leading-none mb-1">{campusMap.get(a.campusId)}</span>
                                                    <span className="text-[11px] font-bold text-slate-700 truncate max-w-[180px]">{unitMap.get(a.unitId)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {previewOutput.actionPlan && (
                                <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">Proposed Action Strategy</h4>
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                        {previewOutput.actionPlan}
                                    </p>
                                </div>
                            )}

                            {previewOutput.followUpRemarks && (
                                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 mb-3">Implementation Progress</h4>
                                    <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap italic">
                                        "{previewOutput.followUpRemarks}"
                                    </p>
                                    <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-700 uppercase">Action by: {previewOutput.actionTakenBy}</span>
                                        <span className="text-[10px] font-bold text-slate-700 uppercase">{safeFormatDateLocal(previewOutput.actionDate)}</span>
                                    </div>
                                </div>
                            )}

                            {previewOutput.status === 'Closed' && previewOutput.verificationRemarks && (
                                <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 mb-3 flex items-center gap-2">
                                        <ShieldCheck className="h-3.5 w-3.5" /> Institutional Verification
                                    </h4>
                                    <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-wrap">
                                        {previewOutput.verificationRemarks}
                                    </p>
                                    <div className="mt-4 pt-4 border-t border-emerald-200 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-emerald-700 uppercase">Verified by: {previewOutput.verifiedBy}</span>
                                        <span className="text-[10px] font-bold text-emerald-700 uppercase">{safeFormatDateLocal(previewOutput.verificationDate)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 border-t bg-slate-50 shrink-0">
                        <div className="flex w-full justify-between items-center">
                            <Button variant="ghost" size="sm" onClick={() => setPreviewOutput(null)} className="text-[10px] font-bold uppercase tracking-widest">
                                Close Preview
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={() => { setPreviewOutput(null); handleOpenUpdate(previewOutput); }}
                                className="shadow-lg shadow-primary/20 text-[10px] font-black uppercase tracking-widest px-6"
                            >
                                <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> UPDATE STATUS
                            </Button>
                        </div>
                    </DialogFooter>
                </>
            )}
        </DialogContent>
      </Dialog>

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
                <Send className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Decision Follow-up</span>
            </div>
            <DialogTitle>Provide Action Update</DialogTitle>
            <DialogDescription className="text-xs">Update the status and provide progress notes for this assigned review output.</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
                <div className="p-4 bg-muted/30 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Management Decision</p>
                        {selectedOutput?.lineNumber && (
                            <Badge variant="outline" className="text-[9px] h-4 font-bold border-primary/30 text-primary uppercase">Minutes Line: {selectedOutput.lineNumber}</Badge>
                        )}
                    </div>
                    <p className="text-sm font-bold leading-relaxed">{selectedOutput?.description}</p>
                    <div className="flex items-center gap-4 pt-2">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Info className="h-3 w-3" /> Target: {safeFormatDateLocal(selectedOutput?.followUpDate)}
                        </span>
                    </div>
                </div>

                <Form {...updateForm}>
                    <form onSubmit={updateForm.handleSubmit(handleUpdateStatusSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <History className="h-3 w-3" /> Unit Progress Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={updateForm.control} name="actionDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase">Date of Action</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} className="bg-slate-50 h-9 text-xs" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={updateForm.control} name="actionTakenBy" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase">Executed By</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Name of Person" className="bg-slate-50 h-9 text-xs font-bold" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <FormField control={updateForm.control} name="followUpRemarks" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase">Action Taken / Unit Progress Summary</FormLabel>
                                <FormControl>
                                    <Textarea {...field} placeholder="Describe the steps taken by your unit to address this MR decision..." rows={4} className="bg-slate-50 text-xs" />
                                </FormControl>
                                <FormDescription className="text-[9px]">Provide evidence of completion or reasons for ongoing status.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <ClipboardList className="h-3 w-3" /> Workflow Transition
                        </h4>
                        <FormField control={updateForm.control} name="status" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-primary">Select Next Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="bg-primary/5 border-primary/20 font-black h-10"><SelectValue /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Open">Open (No Action Yet)</SelectItem>
                                        <SelectItem value="On-going">On-going (Implementation in progress)</SelectItem>
                                        <SelectItem value="Submit for Closure Verification" className="font-bold text-blue-600">Submit for Closure Verification</SelectItem>
                                        {isAdmin && <SelectItem value="Closed" className="font-bold text-emerald-600">Closed (Institutional Verification Complete)</SelectItem>}
                                    </SelectContent>
                                </Select>
                                <FormDescription className="text-[9px]">
                                    {isAdmin ? "Only administrators can move an item to 'Closed' status." : "Select 'Submit for Closure Verification' once your unit has completed the action."}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    {isAdmin && updateForm.watch('status') === 'Closed' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                                <ShieldCheck className="h-3 w-3" /> Admin Verification Details
                            </h4>
                            <Card className="border-emerald-200 bg-emerald-50/20">
                                <CardContent className="p-4 space-y-4">
                                    <FormField control={updateForm.control} name="verificationDate" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-emerald-700">Verification Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} className="bg-white h-9 text-xs border-emerald-100" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={updateForm.control} name="verificationRemarks" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-emerald-700">Verification Findings / Description</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} placeholder="Record findings from closure verification audit..." rows={3} className="bg-white text-xs border-emerald-100" />
                                            </FormControl>
                                            <FormDescription className="text-[9px] text-emerald-600/70">Required for official closure of institutional decision items.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => setIsUpdateDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="min-w-[150px] shadow-xl shadow-primary/20 font-black">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-1.5" />}
                            Log Progress
                        </Button>
                    </DialogFooter>
                    </form>
                </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
