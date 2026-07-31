'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from '@/firebase/firestore-wrapper';
import type { EqaOfiMonitoring, Campus, Unit, EqaOfiStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  ExternalLink,
  Trash2,
  PlusCircle,
  ListChecks,
  Info,
  Edit,
  Calendar,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Link as LinkIcon,
  Filter,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

interface EqaOfiMonitoringTabProps {
  campuses: Campus[];
  units: Unit[];
  canManage: boolean;
}

const ofiSchema = z.object({
  unitId: z.string().min(1, 'Unit is required'),
  campusId: z.string().min(1, 'Campus is required'),
  certifyingBody: z.string().min(1, 'Certifying body is required'),
  standard: z.string().min(1, 'Standard is required'),
  auditDate: z.string().min(1, 'Audit date is required'),
  ofiStatement: z.string().min(5, 'OFI statement must be at least 5 characters'),
  actionTaken: z.string().min(1, 'Action taken / action plan is required'),
  targetDate: z.string().optional(),
  status: z.enum(['Pending', 'In Progress', 'Completed', 'Verified']),
  evidenceLink: z.string().url('Invalid URL').optional().or(z.literal('')),
  remarks: z.string().optional(),
});

const statusColors: Record<EqaOfiStatus, string> = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-300',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Verified: 'bg-purple-100 text-purple-800 border-purple-300',
};

export function EqaOfiMonitoringTab({ campuses, units, canManage }: EqaOfiMonitoringTabProps) {
  const { isAdmin, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingOfi, setEditingOfi] = useState<EqaOfiMonitoring | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const ofiQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'eqaOfiMonitoring') : null), [firestore]);
  const { data: rawOfis, isLoading } = useCollection<EqaOfiMonitoring>(ofiQuery);

  const sortedOfis = useMemo(() => {
    if (!rawOfis) return [];
    return [...rawOfis].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return dateB - dateA;
    });
  }, [rawOfis]);

  const filteredOfis = useMemo(() => {
    return sortedOfis.filter((item) => {
      if (campusFilter !== 'all' && item.campusId !== campusFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        const matchesUnit = item.unitName?.toLowerCase().includes(lower);
        const matchesBody = item.certifyingBody?.toLowerCase().includes(lower);
        const matchesStatement = item.ofiStatement?.toLowerCase().includes(lower);
        const matchesAction = item.actionTaken?.toLowerCase().includes(lower);
        if (!matchesUnit && !matchesBody && !matchesStatement && !matchesAction) return false;
      }
      return true;
    });
  }, [sortedOfis, campusFilter, statusFilter, searchTerm]);

  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);

  const stats = useMemo(() => {
    const total = sortedOfis.length;
    const pending = sortedOfis.filter((o) => o.status === 'Pending').length;
    const inProgress = sortedOfis.filter((o) => o.status === 'In Progress').length;
    const completed = sortedOfis.filter((o) => o.status === 'Completed' || o.status === 'Verified').length;
    return { total, pending, inProgress, completed };
  }, [sortedOfis]);

  const form = useForm<z.infer<typeof ofiSchema>>({
    resolver: zodResolver(ofiSchema),
    defaultValues: {
      unitId: '',
      campusId: '',
      certifyingBody: 'TÜV Rheinland',
      standard: 'ISO 21001:2018',
      auditDate: format(new Date(), 'yyyy-MM-dd'),
      ofiStatement: '',
      actionTaken: '',
      targetDate: '',
      status: 'Pending',
      evidenceLink: '',
      remarks: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof ofiSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const unitName = unitMap.get(values.unitId) || 'Unit';
      const dataToSave = {
        unitId: values.unitId,
        unitName,
        campusId: values.campusId,
        certifyingBody: values.certifyingBody.trim(),
        standard: values.standard.trim(),
        auditDate: values.auditDate ? Timestamp.fromDate(new Date(values.auditDate)) : serverTimestamp(),
        ofiStatement: values.ofiStatement.trim(),
        actionTaken: values.actionTaken.trim(),
        targetDate: values.targetDate ? Timestamp.fromDate(new Date(values.targetDate)) : null,
        status: values.status,
        evidenceLink: values.evidenceLink?.trim() || '',
        remarks: values.remarks?.trim() || '',
        updatedAt: serverTimestamp(),
      };

      if (editingOfi) {
        await updateDoc(doc(firestore, 'eqaOfiMonitoring', editingOfi.id), dataToSave);
        toast({ title: 'OFI Action Record Updated', description: 'Monitoring details updated successfully.' });
      } else {
        await addDoc(collection(firestore, 'eqaOfiMonitoring'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'OFI Action Record Created', description: 'External audit OFI logged for action monitoring.' });
      }

      setIsDialogOpen(false);
      setEditingOfi(null);
      form.reset();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to save OFI monitoring record.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !window.confirm('Are you sure you want to delete this OFI record?')) return;
    try {
      await deleteDoc(doc(firestore, 'eqaOfiMonitoring', id));
      toast({ title: 'Record Deleted', description: 'OFI record removed.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete record.', variant: 'destructive' });
    }
  };

  const handleEdit = (ofi: EqaOfiMonitoring) => {
    setEditingOfi(ofi);
    const safeDate = (d: any) =>
      d?.toDate ? format(d.toDate(), 'yyyy-MM-dd') : d ? format(new Date(d), 'yyyy-MM-dd') : '';

    form.reset({
      unitId: ofi.unitId,
      campusId: ofi.campusId,
      certifyingBody: ofi.certifyingBody || 'TÜV Rheinland',
      standard: ofi.standard || 'ISO 21001:2018',
      auditDate: safeDate(ofi.auditDate),
      ofiStatement: ofi.ofiStatement,
      actionTaken: ofi.actionTaken,
      targetDate: safeDate(ofi.targetDate),
      status: ofi.status,
      evidenceLink: ofi.evidenceLink || '',
      remarks: ofi.remarks || '',
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            External Audit OFI Actions Taken Monitoring
          </h3>
          <p className="text-xs text-muted-foreground">
            Systematic tracking of corrective actions and improvements for External Quality Audit (EQA) observations.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditingOfi(null);
              form.reset();
              setIsDialogOpen(true);
            }}
            size="sm"
            className="shadow-lg shadow-primary/20 shrink-0 font-black uppercase text-[10px] tracking-widest"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Log External OFI
          </Button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-primary/10 shadow-sm bg-slate-50 dark:bg-slate-800/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total EQA OFIs</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.total}</p>
            </div>
            <ListChecks className="h-8 w-8 text-primary opacity-30" />
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Pending Actions</p>
              <p className="text-2xl font-black text-amber-900">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-600 opacity-40" />
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-800">In Progress</p>
              <p className="text-2xl font-black text-blue-900">{stats.inProgress}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-blue-600 opacity-40" />
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Completed & Verified</p>
              <p className="text-2xl font-black text-emerald-900">{stats.completed}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-600 opacity-40" />
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-muted/20 p-3 rounded-xl border">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search unit, body, OFI statement..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          <Select value={campusFilter} onValueChange={setCampusFilter}>
            <SelectTrigger className="h-8 text-[11px] w-[150px] bg-white">
              <SelectValue placeholder="All Campuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campuses</SelectItem>
              {campuses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-[11px] w-[140px] bg-white">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Verified">Verified</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Table */}
      <Card className="shadow-sm border-primary/10 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
            </div>
          ) : filteredOfis.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase pl-6">Unit & Campus</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase">External Body & Standard</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase w-[30%]">External OFI Statement</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase w-[30%]">
                      Action Taken / Action Plan
                    </TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-center">Status</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOfis.map((ofi) => (
                    <TableRow key={ofi.id} className="hover:bg-muted/30 transition-colors group">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs uppercase text-slate-900 dark:text-slate-100">
                            {ofi.unitName}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">
                            {campusMap.get(ofi.campusId) || 'Site Context'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>{ofi.certifyingBody || 'TÜV Rheinland'}</span>
                          </div>
                          {ofi.standard && (
                            <Badge
                              variant="outline"
                              className="w-max text-[8px] h-4 border-primary/20 text-primary font-black uppercase"
                            >
                              {ofi.standard}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 line-clamp-3 italic">
                          "{ofi.ofiStatement}"
                        </p>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-xs font-medium leading-relaxed text-slate-900 dark:text-slate-100 line-clamp-3">
                            {ofi.actionTaken || <span className="text-slate-400 italic">No action logged yet.</span>}
                          </p>
                          {ofi.evidenceLink && (
                            <a
                              href={ofi.evidenceLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-black text-primary hover:underline uppercase tracking-tighter"
                            >
                              <LinkIcon className="h-3 w-3" /> View Action Evidence
                            </a>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn('text-[9px] font-black uppercase h-5 px-2 border', statusColors[ofi.status])}
                        >
                          {ofi.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right pr-6 space-x-1 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(ofi)}
                          className="h-8 text-[10px] font-bold text-primary hover:bg-primary/10"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" /> Update Action
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(ofi.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <ListChecks className="h-12 w-12 opacity-20 mb-2" />
              <p className="font-bold text-xs uppercase tracking-widest">No External OFI Records Found</p>
              <p className="text-[10px] mt-1 italic">
                Log opportunities for improvement given by external auditors to monitor corrective actions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry Dialog Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {editingOfi
                ? 'Update External OFI Action Monitoring'
                : 'Log External Audit Opportunity for Improvement (OFI)'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record the external auditor's recommendation and document the unit's action plan and evidence.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        Target Unit / Department
                      </FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          const selUnit = units.find((u) => u.id === val);
                          if (selUnit && selUnit.campusIds && selUnit.campusIds.length > 0) {
                            form.setValue('campusId', selUnit.campusIds[0]);
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select Unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id} className="text-xs">
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
                  name="campusId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        Campus Site
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select Campus" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {campuses.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="certifyingBody"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        Certifying Body / Auditor
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. TÜV Rheinland" className="h-9 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="standard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        Audit Standard
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. ISO 21001:2018" className="h-9 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="auditDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        Audit Conduct Date
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="h-9 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ofiStatement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                      External Auditor OFI Statement
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter the exact recommendation or opportunity for improvement given by external auditors..."
                        className="min-h-20 text-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actionTaken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                      Action Taken / Action Plan by Unit
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Detail the corrective steps or improvements undertaken by the unit..."
                        className="min-h-20 text-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        Action Monitoring Status
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pending">Pending Action</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Verified">Verified by QAO</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        Target Completion Date
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="h-9 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="evidenceLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                      Evidence Google Drive Link (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://drive.google.com/file/d/..."
                        className="h-9 text-xs font-mono"
                      />
                    </FormControl>
                    <FormDescription className="text-[9px]">
                      Provide a public link to the verification proof or evidence document.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="text-xs font-black uppercase tracking-wider">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingOfi ? 'Save Updates' : 'Log OFI Record'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
