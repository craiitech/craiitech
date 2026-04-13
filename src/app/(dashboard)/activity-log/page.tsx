
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, Timestamp, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { EmployeeActivity, Unit, WfhActivity, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    PlusCircle, 
    Loader2, 
    UserCheck, 
    Calendar, 
    Printer, 
    Search, 
    History, 
    CheckCircle2, 
    Clock, 
    Edit,
    Trash2,
    LayoutList,
    Info as InfoIcon,
    ShieldAlert,
    ExternalLink,
    Check,
    FileCheck,
    ListChecks,
    ShieldCheck,
    Home,
    Monitor,
    Briefcase,
    GraduationCap,
    Download,
    Award
} from 'lucide-react';
import { format, endOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ActivityLogFormDialog } from '@/components/activity-log/activity-log-form-dialog';
import { WfhActivityFormDialog } from '@/components/activity-log/wfh-activity-form-dialog';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccomplishmentReportTemplate } from '@/components/activity-log/accomplishment-report-template';
import { WfhReportTemplate } from '@/components/activity-log/wfh-report-template';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function EmployeeActivityLogPage() {
  const { user, userProfile, isAdmin, isUserLoading, userRole, isSupervisor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isWfhFormOpen, setIsWfhFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<EmployeeActivity | null>(null);
  const [editingWfhActivity, setEditingWfhActivity] = useState<WfhActivity | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); 
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [viewScope, setViewScope] = useState<'personal' | 'unit' | 'campus'>('personal');

  // Print States
  const [isWfhPrintDialogOpen, setIsWfhPrintDialogOpen] = useState(false);
  const [wfhPrintType, setWfhPrintType] = useState<'Teaching' | 'Non-Teaching'>('Non-Teaching');

  // Defer default date to mount to avoid hydration mismatch
  useEffect(() => {
    const now = new Date();
    setDateFilter(format(now, 'yyyy-MM-dd'));
    setMonthFilter(format(now, 'yyyy-MM'));
  }, []);

  /**
   * ACTIVITY REGISTRY QUERIES
   */
  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    const baseRef = collection(firestore, 'employeeActivities');
    if (viewScope === 'personal') return query(baseRef, where('userId', '==', user.uid));
    if (viewScope === 'unit' && userProfile?.unitId) return query(baseRef, where('unitId', '==', userProfile.unitId));
    if (viewScope === 'campus' && userProfile?.campusId) return query(baseRef, where('campusId', '==', userProfile.campusId));
    return query(baseRef, where('userId', '==', user.uid));
  }, [firestore, user, userProfile, viewScope, isUserLoading]);

  const { data: rawActivities, isLoading: isLoadingActivities } = useCollection<EmployeeActivity>(activitiesQuery);

  const wfhQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    const baseRef = collection(firestore, 'wfhActivities');
    if (viewScope === 'personal') return query(baseRef, where('userId', '==', user.uid));
    if (viewScope === 'unit' && userProfile?.unitId) return query(baseRef, where('unitId', '==', userProfile.unitId));
    if (viewScope === 'campus' && userProfile?.campusId) return query(baseRef, where('campusId', '==', userProfile.campusId));
    return query(baseRef, where('userId', '==', user.uid));
  }, [firestore, user, userProfile, viewScope, isUserLoading]);

  const { data: rawWfhActivities, isLoading: isLoadingWfh } = useCollection<WfhActivity>(wfhQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);
  const unitMap = useMemo(() => new Map(units?.map(u => [u.id, u.name])), [units]);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);
  const campusMap = useMemo(() => new Map(campuses?.map(c => [c.id, c.name])), [campuses]);

  const filteredActivities = useMemo(() => {
    if (!rawActivities) return [];
    return rawActivities.filter(activity => {
        const matchesSearch = activity.activityParticular.toLowerCase().includes(searchTerm.toLowerCase()) || (activity.output || '').toLowerCase().includes(searchTerm.toLowerCase()) || (activity.userName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
        const aDate = activity.date instanceof Timestamp ? activity.date.toDate() : new Date(activity.date);
        const matchesDate = !dateFilter || format(aDate, 'yyyy-MM-dd') === dateFilter;
        return matchesSearch && matchesStatus && matchesDate;
    }).sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
  }, [rawActivities, searchTerm, statusFilter, dateFilter]);

  const filteredWfhActivities = useMemo(() => {
    if (!rawWfhActivities) return [];
    return rawWfhActivities.filter(activity => {
        const matchesSearch = activity.deliverables.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (activity.accomplishment || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (activity.userName || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const aDate = activity.date instanceof Timestamp ? activity.date.toDate() : new Date(activity.date);
        
        // Use monthFilter for WFH activities instead of dateFilter
        const matchesMonth = !monthFilter || format(aDate, 'yyyy-MM') === monthFilter;
        
        return matchesSearch && matchesMonth;
    }).sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
  }, [rawWfhActivities, searchTerm, monthFilter]);

  const handleApprove = async (id: string, isWfh = false) => {
    if (!firestore || !userProfile) return;
    setIsProcessing(true);
    const col = isWfh ? 'wfhActivities' : 'employeeActivities';
    try {
        await updateDoc(doc(firestore, col, id), {
            isApproved: true,
            status: isWfh ? 'Verified' : 'Completed',
            approvedBy: userProfile.id,
            approvedByName: `${userProfile.firstName} ${userProfile.lastName}`,
            approvedAt: serverTimestamp()
        });
        toast({ title: 'Task Verified', description: 'Institutional record updated.' });
    } catch (e) {
        toast({ title: 'Approval Failed', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handlePrintDaily = () => {
    if (!userProfile || !rawActivities) return;
    const itemsToPrint = filteredActivities.filter(a => a.isApproved || a.userId === user?.uid);
    const periodLabel = dateFilter ? format(new Date(dateFilter), 'PPPP') : 'Selected Date';

    if (itemsToPrint.length === 0) {
        toast({ title: 'No data to print', variant: 'destructive' });
        return;
    }

    const reportHtml = renderToStaticMarkup(
        <AccomplishmentReportTemplate 
            activities={itemsToPrint}
            userName={`${userProfile.firstName} ${userProfile.lastName}`}
            unitName={unitMap.get(userProfile.unitId) || 'University Office'}
            periodLabel={periodLabel}
        />
    );
    triggerPrint(reportHtml, `Accomplishment_Report_${dateFilter}`);
  };

  const handlePrintMonthly = () => {
    if (!userProfile || !rawActivities) return;
    const [year, month] = monthFilter.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = endOfMonth(start);
    
    const itemsToPrint = rawActivities.filter(a => {
        const d = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
        return d >= start && d <= end && (a.isApproved || a.userId === user?.uid);
    }).sort((a, b) => (a.date?.toMillis?.() || 0) - (b.date?.toMillis?.() || 0));

    if (itemsToPrint.length === 0) {
        toast({ title: 'No monthly data found', variant: 'destructive' });
        return;
    }

    const reportHtml = renderToStaticMarkup(
        <AccomplishmentReportTemplate 
            activities={itemsToPrint}
            userName={`${userProfile.firstName} ${userProfile.lastName}`}
            unitName={unitMap.get(userProfile.unitId) || 'University Office'}
            periodLabel={format(start, 'MMMM yyyy')}
        />
    );
    triggerPrint(reportHtml, `Monthly_Report_${monthFilter}`);
  };

  const handlePrintWfh = () => {
    if (!userProfile || !rawWfhActivities) return;
    const [year, month] = monthFilter.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = endOfMonth(start);
    
    const itemsToPrint = rawWfhActivities.filter(a => {
        const d = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
        return d >= start && d <= end && (a.status === 'Verified' || a.userId === user?.uid);
    }).sort((a, b) => (a.date?.toMillis?.() || 0) - (b.date?.toMillis?.() || 0));

    if (itemsToPrint.length === 0) {
        toast({ title: 'No WFH data for this month', variant: 'destructive' });
        return;
    }

    const reportHtml = renderToStaticMarkup(
        <WfhReportTemplate 
            activities={itemsToPrint}
            userName={`${userProfile.firstName} ${userProfile.lastName}`}
            campusName={campusMap.get(userProfile.campusId) || 'Romblon State University'}
            type={wfhPrintType}
        />
    );
    triggerPrint(reportHtml, `WFH_Monitoring_${wfhPrintType}_${monthFilter}`);
    setIsWfhPrintDialogOpen(false);
  };

  const triggerPrint = (html: string, title: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`<html><head><title>${title}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print { body { background: white; margin: 0; padding: 0; } .no-print { display: none !important; } } body { font-family: serif; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl font-black uppercase text-xs tracking-widest">Click to Print Report</button></div>${html}</body></html>`);
        printWindow.document.close();
    }
  };

  if (isUserLoading) return <div className="flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /><p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing Registry...</p></div>;

  const canViewManagement = isAdmin || isSupervisor || userRole?.toLowerCase().includes('coordinator') || userRole?.toLowerCase().includes('odimo');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserCheck className="h-8 w-8 text-primary" />
            Institutional Activity Registry
          </h2>
          <p className="text-muted-foreground">Log daily tasks or remote WFH accomplishments for quality auditing.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex bg-muted p-1 rounded-lg border mr-2">
                <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="h-8 w-32 text-[10px] font-bold border-none bg-transparent" />
            </div>
            <Select value={viewScope} onValueChange={(v: any) => setViewScope(v)}>
                <SelectTrigger className="h-10 w-48 text-xs font-bold bg-white">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="personal">My Personal Logbook</SelectItem>
                    {canViewManagement && <SelectItem value="unit">Unit Monitoring View</SelectItem>}
                    {(isAdmin || userRole?.toLowerCase().includes('director')) && <SelectItem value="campus">Campus Monitoring View</SelectItem>}
                </SelectContent>
            </Select>
        </div>
      </div>

      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList className="bg-muted p-1 border shadow-sm w-fit h-10 animate-tab-highlight rounded-md">
            <TabsTrigger value="daily" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                <Briefcase className="h-3.5 w-3.5" /> Employee Activity Log
            </TabsTrigger>
            <TabsTrigger value="wfh" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                <Home className="h-3.5 w-3.5" /> Work From Home (WFH)
            </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[300px] flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search activities..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 text-xs bg-white" />
                    </div>
                    <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-10 w-40 text-xs bg-white" />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrintDaily} className="h-10 bg-white border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest gap-2">
                        <Printer className="h-4 w-4" /> Daily Report
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrintMonthly} className="h-10 bg-white border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest gap-2">
                        <Download className="h-4 w-4" /> Monthly Log
                    </Button>
                    <Button onClick={() => { setEditingActivity(null); setIsFormOpen(true); }} className="h-10 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest">
                        <PlusCircle className="mr-2 h-4 w-4" /> Log Task
                    </Button>
                </div>
            </div>

            <Card className="shadow-md border-primary/10 overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Conduct Period</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-3">Task Particulars</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-3">Output</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-center py-3">Evidence</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-center py-3">Status</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase pr-6 py-3">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredActivities.map((activity) => (
                                <TableRow key={activity.id} className="hover:bg-muted/20 transition-colors group">
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-black text-slate-800 uppercase tabular-nums">{format(activity.date instanceof Timestamp ? activity.date.toDate() : new Date(activity.date), 'MM/dd/yy')}</span>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{activity.startTime} - {activity.endTime}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs py-4">
                                        <div className="flex flex-col gap-1">
                                            <p className="font-bold text-sm text-slate-900 leading-tight">{activity.activityParticular}</p>
                                            {viewScope !== 'personal' && <span className="text-[9px] font-black text-primary uppercase">{activity.userName}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell><span className="text-xs font-medium text-slate-600">{activity.output || '--'}</span></TableCell>
                                    <TableCell className="text-center">
                                        {activity.googleDriveLink ? <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" asChild><a href={activity.googleDriveLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button> : <span className="text-[9px] text-muted-foreground opacity-20">None</span>}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={cn("text-[9px] font-black uppercase border-none px-2 shadow-sm", activity.status === 'Completed' ? "bg-emerald-600" : activity.status === 'In Progress' ? "bg-blue-600" : "bg-amber-500")}>{activity.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6 whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {viewScope !== 'personal' && !activity.isApproved && (
                                                <Button size="sm" onClick={() => handleApprove(activity.id)} className="h-7 text-[9px] font-black uppercase bg-emerald-600">Verify</Button>
                                            )}
                                            {activity.userId === user?.uid && !activity.isApproved && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingActivity(activity); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="wfh" className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[300px] flex gap-2">
                    <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="h-10 w-48 text-xs bg-white" />
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search WFH tasks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 text-xs bg-white" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsWfhPrintDialogOpen(true)} className="h-10 bg-white border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest gap-2">
                        <Printer className="h-4 w-4" /> Generate Monitoring Sheet
                    </Button>
                    <Button onClick={() => { setEditingWfhActivity(null); setIsWfhFormOpen(true); }} className="h-10 shadow-lg shadow-primary/20 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest">
                        <PlusCircle className="mr-2 h-4 w-4" /> Log WFH Task
                    </Button>
                </div>
            </div>

            <Card className="shadow-md border-primary/10 overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Date</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-3">Target Deliverables</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-3">Actual Accomplishment</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-center py-3">Designation</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-center py-3">Status</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase pr-6 py-3">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredWfhActivities.map((activity) => (
                                <TableRow key={activity.id} className="hover:bg-muted/20 transition-colors group">
                                    <TableCell className="pl-6 py-4">
                                        <span className="text-xs font-black text-slate-800 uppercase tabular-nums">{format(activity.date instanceof Timestamp ? activity.date.toDate() : new Date(activity.date), 'MM/dd/yy')}</span>
                                    </TableCell>
                                    <TableCell className="max-w-xs py-4"><p className="text-xs font-bold text-slate-900 leading-snug">{activity.deliverables}</p></TableCell>
                                    <TableCell className="max-w-xs py-4"><p className="text-xs font-medium text-slate-600 italic leading-snug">{activity.accomplishment}</p></TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/30 text-primary">{activity.type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={cn("text-[9px] font-black uppercase border-none px-2", activity.status === 'Verified' ? "bg-emerald-600" : "bg-amber-50")}>{activity.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6 whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {viewScope !== 'personal' && activity.status !== 'Verified' && (
                                                <Button size="sm" onClick={() => handleApprove(activity.id, true)} className="h-7 text-[9px] font-black uppercase bg-emerald-600">Verify</Button>
                                            )}
                                            {activity.userId === user?.uid && activity.status !== 'Verified' && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingWfhActivity(activity); setIsWfhFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* --- WFH Print Wizard --- */}
      <Dialog open={isWfhPrintDialogOpen} onOpenChange={setIsWfhPrintDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <div className="flex items-center gap-2 text-primary mb-1">
                    <Printer className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Report Wizard</span>
                </div>
                <DialogTitle>Generate WFH Monitoring Sheet</DialogTitle>
                <DialogDescription>Select the personnel template to generate for the selected month ({monthFilter}).</DialogDescription>
            </DialogHeader>
            <div className="py-6">
                <RadioGroup value={wfhPrintType} onValueChange={(v: any) => setWfhPrintType(v)} className="grid grid-cols-2 gap-4">
                    <Label htmlFor="type-teaching" className={cn("flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 cursor-pointer transition-all hover:bg-muted", wfhPrintType === 'Teaching' ? "border-primary bg-primary/5" : "border-slate-100")}>
                        <RadioGroupItem value="Teaching" id="type-teaching" className="sr-only" />
                        <GraduationCap className={cn("h-8 w-8", wfhPrintType === 'Teaching' ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-xs font-black uppercase">Teaching</span>
                    </Label>
                    <Label htmlFor="type-nonteaching" className={cn("flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 cursor-pointer transition-all hover:bg-muted", wfhPrintType === 'Non-Teaching' ? "border-primary bg-primary/5" : "border-slate-100")}>
                        <RadioGroupItem value="Non-Teaching" id="type-nonteaching" className="sr-only" />
                        <Briefcase className={cn("h-8 w-8", wfhPrintType === 'Non-Teaching' ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-xs font-black uppercase">Non-Teaching</span>
                    </Label>
                </RadioGroup>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsWfhPrintDialogOpen(false)} className="font-bold text-[10px] uppercase">Cancel</Button>
                <Button onClick={handlePrintWfh} className="font-black uppercase text-[10px] tracking-widest px-8">Generate & Print</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActivityLogFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} activity={editingActivity} />
      <WfhActivityFormDialog isOpen={isWfhFormOpen} onOpenChange={setIsWfhFormOpen} activity={editingWfhActivity} />
    </div>
  );
}
