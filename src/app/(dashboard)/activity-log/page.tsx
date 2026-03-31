
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, doc, deleteDoc } from 'firebase/firestore';
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
    ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
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
  const { user, userProfile, isAdmin, isSupervisor, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<EmployeeActivity | null>(null);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); 
  const [viewScope, setViewScope] = useState<'personal' | 'unit' | 'campus'>('personal');

  // Defer default date to mount to avoid hydration mismatch
  useEffect(() => {
    setDateFilter(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const activitiesQuery = useMemoFirebase(() => {
    // CRITICAL: Silent mode until user is confirmed as Admin
    if (!firestore || !user || isUserLoading || !userProfile || !isAdmin) return null;
    
    const baseRef = collection(firestore, 'employeeActivities');
    
    if (viewScope === 'personal') {
        return query(baseRef, where('userId', '==', user.uid), orderBy('date', 'desc'));
    }
    
    if (viewScope === 'unit') {
        if (userProfile.unitId) {
            return query(baseRef, where('unitId', '==', userProfile.unitId), orderBy('date', 'desc'));
        }
        return isAdmin ? query(baseRef, orderBy('date', 'desc')) : null;
    }
    
    if (viewScope === 'campus') {
        if (userProfile.campusId) {
            return query(baseRef, where('campusId', '==', userProfile.campusId), orderBy('date', 'desc'));
        }
        return isAdmin ? query(baseRef, orderBy('date', 'desc')) : null;
    }

    return query(baseRef, where('userId', '==', user.uid), orderBy('date', 'desc'));
  }, [firestore, user, userProfile, viewScope, isUserLoading, isAdmin]);

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

  const handleDelete = async (id: string) => {
    if (!firestore || !window.confirm('Delete this log entry permanently?')) return;
    try {
        await deleteDoc(doc(firestore, 'employeeActivities', id));
        toast({ title: 'Record Deleted' });
    } catch (e) {
        toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handlePrintReport = () => {
    if (filteredActivities.length === 0 || !userProfile) return;

    try {
        const reportHtml = renderToStaticMarkup(
            <AccomplishmentReportTemplate 
                activities={filteredActivities}
                userName={`${userProfile.firstName} ${userProfile.lastName}`}
                unitName={unitMap.get(userProfile.unitId) || 'University Office'}
                periodLabel={dateFilter ? format(new Date(dateFilter), 'PPPP') : 'All Time'}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Accomplishment Report</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print { body { background: white; margin: 0; padding: 0; } .no-print { display: none !important; } }
                        body { font-family: serif; padding: 40px; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest">Click to Print Report</button>
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

  const isLoading = isUserLoading || isLoadingActivities || (isAdmin && !userProfile);

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing Activity Registry...</p>
        </div>
    );
  }

  // Access Denial for non-admins during testing
  if (!isAdmin) {
    return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <ShieldAlert className="h-12 w-12 text-destructive opacity-40" />
            <h2 className="text-2xl font-bold tracking-tight">Feature in Testing</h2>
            <p className="text-muted-foreground text-center max-w-md">
                The Employee Activity Log is currently restricted to Administrators for testing purposes.
            </p>
        </div>
    );
  }

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
            <Button variant="outline" size="sm" onClick={handlePrintReport} disabled={filteredActivities.length === 0} className="h-10 bg-white border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest gap-2">
                <Printer className="h-4 w-4" /> Print Report
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
                          <Calendar className="h-2.5 w-2.5" /> Specific Date
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
                              placeholder="Search tasks..."
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
                      <LayoutList className="h-2.5 w-2.5" /> View Perspective
                  </label>
                  <Select value={viewScope} onValueChange={(v: any) => setViewScope(v)}>
                      <SelectTrigger className="h-10 text-xs bg-white font-bold">
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="personal">My Personal Log</SelectItem>
                          <SelectItem value="unit">Unit-Wide Log</SelectItem>
                          <SelectItem value="campus">Campus-Wide Log</SelectItem>
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
                  <Badge variant="outline" className="h-6 px-3 font-black text-[10px] bg-white border-primary/20 text-primary">
                      {filteredActivities.length} ENTRIES LOGGED
                  </Badge>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <Table>
                  <TableHeader className="bg-muted/30">
                      <TableRow>
                          <TableHead className="text-[10px] font-black uppercase pl-6 py-3">Time & Timeline</TableHead>
                          <TableHead className="text-[10px] font-black uppercase py-3">Activity Particulars</TableHead>
                          <TableHead className="text-[10px] font-black uppercase py-3">Output</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center py-3">Status</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase pr-6 py-3">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredActivities.map((activity) => (
                          <TableRow key={activity.id} className="hover:bg-muted/20 transition-colors group">
                              <TableCell className="pl-6 py-4">
                                  <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                          <Clock className="h-3.5 w-3.5 text-primary" />
                                          <span className="text-xs font-black text-slate-800 uppercase tabular-nums">
                                              {activity.startTime} - {activity.endTime}
                                          </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                          <Calendar className="h-3 w-3" />
                                          {format(activity.date instanceof Timestamp ? activity.date.toDate() : new Date(activity.date), 'MMM dd, yyyy')}
                                      </div>
                                  </div>
                              </TableCell>
                              <TableCell className="max-w-xs py-4">
                                  <div className="flex flex-col gap-1">
                                      <p className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">{activity.activityParticular}</p>
                                      <p className="text-[10px] text-muted-foreground italic line-clamp-1">{activity.remarks || 'No additional remarks.'}</p>
                                  </div>
                              </TableCell>
                              <TableCell>
                                  <div className="flex items-center gap-2">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 opacity-40" />
                                      <span className="text-xs font-medium text-slate-600">{activity.output || 'Continuous Task'}</span>
                                  </div>
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
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingActivity(activity); setIsFormOpen(true); }}>
                                          <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(activity.id)}>
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </div>
                              </TableCell>
                          </TableRow>
                      ))}
                      {filteredActivities.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                                  <div className="flex flex-col items-center gap-2 opacity-20">
                                      <UserCheck className="h-10 w-10" />
                                      <p className="text-[10px] font-black uppercase tracking-widest">No activities logged</p>
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
                      <strong>Institutional Standard:</strong> Daily logs ensure accurate accomplishment reporting aligned with the EOMS operational plans.
                  </p>
              </div>
          </CardFooter>
      </Card>

      <ActivityLogLogFormDialog 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        activity={editingActivity} 
      />
    </div>
  );
}

// Rename dialog to avoid collision
function ActivityLogLogFormDialog({ isOpen, onOpenChange, activity }: { isOpen: boolean, onOpenChange: (o: boolean) => void, activity: EmployeeActivity | null }) {
    return <ActivityLogFormDialog isOpen={isOpen} onOpenChange={onOpenChange} activity={activity} />
}
