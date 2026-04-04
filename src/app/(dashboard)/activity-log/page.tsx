
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, Timestamp, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { EmployeeActivity, Unit } from '@/lib/types';
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
    ShieldCheck
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ActivityLogFormDialog } from '@/components/activity-log/activity-log-form-dialog';
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
import { cn } from '@/lib/utils';

export default function EmployeeActivityLogPage() {
  const { user, userProfile, isAdmin, isUserLoading, userRole, isSupervisor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<EmployeeActivity | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); 
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [viewScope, setViewScope] = useState<'personal' | 'unit' | 'campus'>('personal');

  // Defer default date to mount to avoid hydration mismatch
  useEffect(() => {
    const now = new Date();
    setDateFilter(format(now, 'yyyy-MM-dd'));
    setMonthFilter(format(now, 'yyyy-MM'));
  }, []);

  /**
   * SILENT GATED QUERY
   */
  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    
    const baseRef = collection(firestore, 'employeeActivities');
    
    if (viewScope === 'personal') {
        return query(baseRef, where('userId', '==', user.uid));
    }
    
    if (viewScope === 'unit' && userProfile?.unitId) {
        return query(baseRef, where('unitId', '==', userProfile.unitId));
    }
    
    if (viewScope === 'campus' && userProfile?.campusId) {
        return query(baseRef, where('campusId', '==', userProfile.campusId));
    }

    return query(baseRef, where('userId', '==', user.uid));
  }, [firestore, user, userProfile, viewScope, isUserLoading]);

  const { data: rawActivities, isLoading: isLoadingActivities } = useCollection<EmployeeActivity>(activitiesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);
  const unitMap = useMemo(() => new Map(units?.map(u => [u.id, u.name])), [units]);

  const filteredActivities = useMemo(() => {
    if (!rawActivities) return [];
    
    return rawActivities.filter(activity => {
        const matchesSearch = 
            activity.activityParticular.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (activity.output || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (activity.userName || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
        
        const aDate = activity.date instanceof Timestamp ? activity.date.toDate() : new Date(activity.date);
        const matchesDate = !dateFilter || format(aDate, 'yyyy-MM-dd') === dateFilter;

        return matchesSearch && matchesStatus && matchesDate;
    }).sort((a, b) => {
        const timeA = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date).getTime();
        const timeB = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date).getTime();
        return timeB - timeA;
    });
  }, [rawActivities, searchTerm, statusFilter, dateFilter]);

  const handleApprove = async (id: string) => {
    if (!firestore || !userProfile) return;
    setIsProcessing(true);
    try {
        await updateDoc(doc(firestore, 'employeeActivities', id), {
            isApproved: true,
            approvedBy: userProfile.id,
            approvedByName: `${userProfile.firstName} ${userProfile.lastName}`,
            approvedAt: serverTimestamp()
        });
        toast({ title: 'Task Approved', description: 'Institutional record verified.' });
    } catch (e) {
        toast({ title: 'Approval Failed', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleBatchApprove = async () => {
    if (!firestore || !userProfile || filteredActivities.length === 0) return;
    setIsProcessing(true);
    try {
        const batch = writeBatch(firestore);
        const toApprove = filteredActivities.filter(a => !a.isApproved && a.userId !== user?.uid);
        
        if (toApprove.length === 0) {
            toast({ title: 'No tasks to approve' });
            setIsProcessing(false);
            return;
        }

        toApprove.forEach(a => {
            batch.update(doc(firestore, 'employeeActivities', a.id), {
                isApproved: true,
                approvedBy: userProfile.id,
                approvedByName: `${userProfile.firstName} ${userProfile.lastName}`,
                approvedAt: serverTimestamp()
            });
        });

        await batch.commit();
        toast({ title: 'Batch Complete', description: `${toApprove.length} tasks verified.` });
    } catch (e) {
        toast({ title: 'Batch Failed', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !window.confirm('Delete this log entry permanently?')) return;
    try {
        await deleteDoc(doc(firestore, 'employeeActivities', id));
        toast({ title: 'Record Deleted' });
    } catch (e) {
        toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handlePrintReport = (type: 'Daily' | 'Monthly') => {
    if (!userProfile || !rawActivities) return;

    let itemsToPrint = [];
    let periodLabel = '';

    if (type === 'Daily') {
        itemsToPrint = filteredActivities.filter(a => a.isApproved || a.userId === user?.uid);
        periodLabel = dateFilter ? format(new Date(dateFilter), 'PPPP') : 'Selected Date';
    } else {
        // Monthly logic
        const [year, month] = monthFilter.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = endOfMonth(start);
        
        itemsToPrint = rawActivities.filter(a => {
            const d = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
            const isInMonth = d >= start && d <= end;
            const isMineOrApproved = a.isApproved || a.userId === user?.uid;
            return isInMonth && isMineOrApproved;
        }).sort((a, b) => {
            const timeA = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date).getTime();
            const timeB = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date).getTime();
            return timeA - timeB;
        });
        
        periodLabel = format(start, 'MMMM yyyy');
    }

    if (itemsToPrint.length === 0) {
        toast({ title: 'No data to print', description: 'Only approved tasks or your own tasks can be printed.', variant: 'destructive' });
        return;
    }

    try {
        const reportHtml = renderToStaticMarkup(
            <AccomplishmentReportTemplate 
                activities={itemsToPrint}
                userName={`${userProfile.firstName} ${userProfile.lastName}`}
                unitName={unitMap.get(userProfile.unitId) || 'University Office'}
                periodLabel={periodLabel}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Accomplishment Report - ${type}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print { body { background: white; margin: 0; padding: 0; } .no-print { display: none !important; } }
                        body { font-family: serif; padding: 40px; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest">Click to Print ${type} Report</button>
                    </div>
                    ${reportHtml}
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (e) {
        console.error(e);
        toast({ title: 'Print Error', variant: 'destructive' });
    }
  };

  if (isUserLoading) {
    return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing Session...</p>
        </div>
    );
  }

  const isCurrentViewApproval = viewScope !== 'personal';
  const canViewUnit = isAdmin || isSupervisor || userRole?.toLowerCase().includes('coordinator') || userRole?.toLowerCase().includes('odimo');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserCheck className="h-8 w-8 text-primary" />
            Employee Activity Log
          </h2>
          <p className="text-muted-foreground">Log daily tasks and generate institutional accomplishment reports.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex bg-muted p-1 rounded-lg border mr-2">
                <Input 
                    type="month" 
                    value={monthFilter} 
                    onChange={(e) => setMonthFilter(e.target.value)} 
                    className="h-8 w-32 text-[10px] font-bold border-none bg-transparent" 
                />
                <Button variant="ghost" size="sm" onClick={() => handlePrintReport('Monthly')} className="h-8 text-[10px] font-black uppercase">
                    Monthly
                </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => handlePrintReport('Daily')} disabled={filteredActivities.length === 0} className="h-10 bg-white border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest gap-2 shadow-sm">
                <Printer className="h-4 w-4" /> Daily Report
            </Button>
            <Button onClick={() => { setEditingActivity(null); setIsFormOpen(true); }} className="h-10 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest">
                <PlusCircle className="mr-2 h-4 w-4" /> Log Today's Task
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-3 border-primary/10 shadow-sm bg-muted/10">
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                          <Calendar className="h-2.5 w-2.5" /> Date Selection
                      </label>
                      <Input 
                        type="date" 
                        value={dateFilter} 
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="h-10 text-xs bg-white" 
                      />
                  </div>
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                          <History className="h-2.5 w-2.5" /> Status Filter
                      </label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-10 text-xs bg-white">
                              <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">All Items</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Open">Open</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                          <Search className="h-2.5 w-2.5" /> Search Tasks
                      </label>
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                              placeholder="Search activities..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-9 h-10 text-xs bg-white"
                          />
                      </div>
                  </div>
              </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-sm bg-muted/10">
              <CardContent className="p-4 flex flex-col h-full justify-end">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1.5 flex items-center gap-1.5">
                      <LayoutList className="h-2.5 w-2.5" /> Management Perspective
                  </label>
                  <Select value={viewScope} onValueChange={(v: any) => setViewScope(v)}>
                      <SelectTrigger className="h-10 text-xs bg-white font-bold">
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="personal">My Personal Logbook</SelectItem>
                          {canViewUnit && <SelectItem value="unit">Unit Monitoring View</SelectItem>}
                          {(isAdmin || userRole?.toLowerCase().includes('director')) && <SelectItem value="campus">Campus Monitoring View</SelectItem>}
                      </SelectContent>
                  </Select>
              </CardContent>
          </Card>
      </div>

      <Card className="shadow-md border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
              <div className="flex items-center justify-between">
                  <div className="space-y-1">
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Daily Task Registry</CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Displaying tasks for {dateFilter ? format(new Date(dateFilter), 'PPPP') : 'Selected Period'}.
                      </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    {isCurrentViewApproval && (
                        <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleBatchApprove} 
                            disabled={isProcessing || filteredActivities.length === 0}
                            className="h-8 font-black uppercase text-[9px] tracking-widest bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Batch Approve All
                        </Button>
                    )}
                    {isLoadingActivities ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary opacity-20" />
                    ) : (
                        <Badge variant="outline" className="h-6 px-3 font-black text-[10px] bg-white border-primary/20 text-primary uppercase">
                            {filteredActivities.length} ENTRIES LOGGED
                        </Badge>
                    )}
                  </div>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <Table>
                  <TableHeader className="bg-muted/30">
                      <TableRow>
                          <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Time & Verification</TableHead>
                          <TableHead className="text-[10px] font-black uppercase py-3">Activity Particulars</TableHead>
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
                                  <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center gap-2">
                                          <Clock className="h-3.5 w-3.5 text-primary" />
                                          <span className="text-xs font-black text-slate-800 uppercase tabular-nums">
                                              {activity.startTime} - {activity.endTime}
                                          </span>
                                      </div>
                                      {activity.isApproved ? (
                                          <Badge className="bg-emerald-600 text-white border-none h-4 px-1.5 text-[8px] font-black w-fit gap-1">
                                              <ShieldCheck className="h-2.5 w-2.5" /> VERIFIED
                                          </Badge>
                                      ) : (
                                          <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-black w-fit opacity-40">PENDING</Badge>
                                      )}
                                  </div>
                              </TableCell>
                              <TableCell className="max-w-xs py-4">
                                  <div className="flex flex-col gap-1">
                                      <p className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">{activity.activityParticular}</p>
                                      <p className="text-[10px] text-muted-foreground italic line-clamp-1">{activity.remarks || 'No additional remarks.'}</p>
                                      {viewScope !== 'personal' && (
                                          <div className="flex items-center gap-1.5 mt-1.5">
                                              <UserCheck className="h-3 w-3 text-primary" />
                                              <span className="text-[9px] font-black text-primary uppercase">{activity.userName}</span>
                                          </div>
                                      )}
                                  </div>
                              </TableCell>
                              <TableCell>
                                  <div className="flex items-center gap-2">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 opacity-40" />
                                      <span className="text-xs font-medium text-slate-600">{activity.output || 'Continuous Task'}</span>
                                  </div>
                              </TableCell>
                              <TableCell className="text-center">
                                  {activity.googleDriveLink ? (
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" asChild title="Open Evidence">
                                          <a href={activity.googleDriveLink} target="_blank" rel="noopener noreferrer">
                                              <ExternalLink className="h-4 w-4" />
                                          </a>
                                      </Button>
                                  ) : (
                                      <span className="text-[10px] text-muted-foreground opacity-20 italic">None</span>
                                  )}
                              </TableCell>
                              <TableCell className="text-center">
                                  <Badge 
                                      className={cn(
                                          "text-[9px] font-black uppercase border-none px-2 shadow-sm",
                                          activity.status === 'Completed' ? "bg-emerald-600 text-white" : 
                                          activity.status === 'In Progress' ? "bg-blue-600 text-white" : 
                                          "bg-amber-50 text-amber-950"
                                      )}
                                  >
                                      {activity.status}
                                  </Badge>
                              </TableCell>
                              <TableCell className="text-right pr-6 whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {isCurrentViewApproval && !activity.isApproved && activity.userId !== user?.uid && (
                                          <Button size="sm" onClick={() => handleApprove(activity.id)} disabled={isProcessing} className="h-7 text-[9px] font-black uppercase bg-emerald-600 hover:bg-emerald-700">
                                              {isProcessing ? <Loader2 className="h-3 w-3 animate-spin"/> : <Check className="h-3 w-3 mr-1" />}
                                              Approve
                                          </Button>
                                      )}
                                      {activity.userId === user?.uid && !activity.isApproved && (
                                          <>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingActivity(activity); setIsFormOpen(true); }}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(activity.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </>
                                      )}
                                  </div>
                              </TableCell>
                          </TableRow>
                      ))}
                      {filteredActivities.length === 0 && !isLoadingActivities && (
                          <TableRow>
                              <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                  <div className="flex flex-col items-center gap-2 opacity-20">
                                      <UserCheck className="h-10 w-10" />
                                      <p className="text-[10px] font-black uppercase tracking-widest">No activities logged for this date</p>
                                  </div>
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
          <CardFooter className="bg-muted/5 border-t py-3 px-6">
              <div className="flex items-start gap-3">
                  <InfoIcon className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                      <strong>Institutional Compliance:</strong> Daily tasks must be verified by the Unit Coordinator to be included in monthly accomplishment reports. Approved records constitute valid institutional evidence for external quality audits.
                  </p>
              </div>
          </CardFooter>
      </Card>

      <ActivityLogFormDialog 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        activity={editingActivity} 
      />
    </div>
  );
}
