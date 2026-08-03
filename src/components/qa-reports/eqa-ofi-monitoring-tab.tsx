'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from '@/firebase/firestore-wrapper';
import { useFieldArray } from 'react-hook-form';
import type { EqaOfiMonitoring, EqaOfiTargetUnit, Campus, Unit, EqaOfiStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Trash2,
  PlusCircle,
  ListChecks,
  Edit,
  Calendar,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Link as LinkIcon,
  Plus,
  X,
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

const targetUnitSchema = z.object({
  id: z.string(),
  unitId: z.string().min(1, 'Unit is required'),
  campusId: z.string().min(1, 'Campus is required'),
  actionTaken: z.string().optional(),
  status: z.enum(['Pending Action', 'In Progress', 'Completed', 'Verified by QAO']),
  targetDate: z.string().optional(),
  evidenceLink: z.string().optional(),
});

const ofiSchema = z.object({
  certifyingBody: z.string().min(1, 'Certifying body is required'),
  standard: z.string().min(1, 'Standard is required'),
  auditDate: z.string().min(1, 'Audit date is required'),
  ofiStatement: z.string().min(5, 'OFI statement must be at least 5 characters'),
  remarks: z.string().optional(),
  targetUnits: z.array(targetUnitSchema).min(1, 'Add at least one target unit.'),
});

type OfiFormValues = z.infer<typeof ofiSchema>;

const statusColors: Record<EqaOfiStatus, string> = {
  'Pending Action': 'bg-amber-100 text-amber-800 border-amber-300',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Verified by QAO': 'bg-purple-100 text-purple-800 border-purple-300',
};

const genId = () => Math.random().toString(36).substr(2, 9);

export function EqaOfiMonitoringTab({ campuses, units, canManage }: EqaOfiMonitoringTabProps) {
  const { isAdmin, isAuditor, userRole, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingOfi, setEditingOfi] = useState<EqaOfiMonitoring | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const isInstitutionalViewer =
    isAdmin ||
    isAuditor ||
    userRole?.toLowerCase().includes('president') ||
    userRole?.toLowerCase().includes('quality management') ||
    userRole?.toLowerCase().includes('qms');

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

  // Flatten each target unit into a display row
  const rows = useMemo(() => {
    const list: { ofi: EqaOfiMonitoring; target: EqaOfiTargetUnit }[] = [];
    sortedOfis.forEach((ofi) => {
      const targets = ofi.targetUnits?.length ? ofi.targetUnits : [];
      targets.forEach((t) => list.push({ ofi, target: t }));
    });
    return list;
  }, [sortedOfis]);

  const filteredRows = useMemo(() => {
    return rows.filter(({ ofi, target }) => {
      if (!isInstitutionalViewer) {
        const isCampusSupervisor =
          userRole === 'Campus Director' ||
          userRole === 'Campus ODIMO' ||
          userRole?.toLowerCase().includes('vice president');
        if (isCampusSupervisor) {
          if (target.campusId !== userProfile?.campusId) return false;
        } else {
          if (target.unitId !== userProfile?.unitId) return false;
        }
      }
      if (campusFilter !== 'all' && target.campusId !== campusFilter) return false;
      if (statusFilter !== 'all' && target.status !== statusFilter) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        const matchesUnit = target.unitName?.toLowerCase().includes(lower);
        const matchesBody = ofi.certifyingBody?.toLowerCase().includes(lower);
        const matchesStatement = ofi.ofiStatement?.toLowerCase().includes(lower);
        const matchesAction = target.actionTaken?.toLowerCase().includes(lower);
        if (!matchesUnit && !matchesBody && !matchesStatement && !matchesAction) return false;
      }
      return true;
    });
  }, [rows, campusFilter, statusFilter, searchTerm, isInstitutionalViewer, userRole, userProfile]);

  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);

  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => r.target.status === 'Pending Action').length;
    const inProgress = rows.filter((r) => r.target.status === 'In Progress').length;
    const completed = rows.filter(
      (r) => r.target.status === 'Completed' || r.target.status === 'Verified by QAO',
    ).length;
    return { total, pending, inProgress, completed };
  }, [rows]);

  const form = useForm<OfiFormValues>({
    resolver: zodResolver(ofiSchema),
    defaultValues: {
      certifyingBody: 'TÜV Rheinland',
      standard: 'ISO 21001:2018',
      auditDate: format(new Date(), 'yyyy-MM-dd'),
      ofiStatement: '',
      remarks: '',
      targetUnits: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'targetUnits',
  });

  const addTargetUnit = () => {
    append({
      id: genId(),
      unitId: '',
      campusId: '',
      actionTaken: '',
      status: 'Pending Action',
      targetDate: '',
      evidenceLink: '',
    });
  };

  const onSubmit = async (values: OfiFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const targetUnits: Array<{
        id: string;
        unitId: string;
        unitName: string;
        campusId: string;
        actionTaken: string;
        status: EqaOfiStatus;
        targetDate: ReturnType<typeof Timestamp.fromDate> | null;
        evidenceLink: string;
        updatedAt: ReturnType<typeof serverTimestamp>;
      }> = [];
      for (const t of values.targetUnits) {
        if (!t.unitId) continue;
        targetUnits.push({
          id: t.id,
          unitId: t.unitId,
          unitName: unitMap.get(t.unitId) || 'Unit',
          campusId: t.campusId,
          actionTaken: t.actionTaken?.trim() || '',
          status: (t.status as EqaOfiStatus) || 'Pending Action',
          targetDate: t.targetDate ? Timestamp.fromDate(new Date(t.targetDate)) : null,
          evidenceLink: t.evidenceLink?.trim() || '',
          updatedAt: serverTimestamp(),
        });
      }

      if (targetUnits.length === 0) {
        toast({ title: 'No Target Unit', description: 'Please add at least one target unit.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      const dataToSave = {
        certifyingBody: values.certifyingBody.trim(),
        standard: values.standard.trim(),
        auditDate: values.auditDate ? Timestamp.fromDate(new Date(values.auditDate)) : serverTimestamp(),
        ofiStatement: values.ofiStatement.trim(),
        remarks: values.remarks?.trim() || '',
        targetUnits,
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
    } catch {
      console.error('Failed to save OFI monitoring record.');
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
    } catch {
      toast({ title: 'Error', description: 'Failed to delete record.', variant: 'destructive' });
    }
  };

  const openCreate = () => {
    setEditingOfi(null);
    form.reset({
      certifyingBody: 'TÜV Rheinland',
      standard: 'ISO 21001:2018',
      auditDate: format(new Date(), 'yyyy-MM-dd'),
      ofiStatement: '',
      remarks: '',
      targetUnits: [],
    });
    addTargetUnit();
    setIsDialogOpen(true);
  };

  // Unit-level action fields (plan/date/evidence) may ONLY be filled by the
  // assigned unit — never by the admin/auditor who registered the OFI.
  const isMyAssignedRow = (index: number) => form.getValues(`targetUnits.${index}.unitId`) === userProfile?.unitId;

  const canFillUnitAction = (index: number) => !isInstitutionalViewer && isMyAssignedRow(index);

  // Monitoring status may be set by the assigned unit OR confirmed by QAO/admin.
  const canSetStatus = (index: number) => isInstitutionalViewer || isMyAssignedRow(index);

  // Row indices the current user may see/doc: units see only their own row.
  const visibleFieldIndexes = fields
    .map((_, i) => i)
    .filter((i) => (isInstitutionalViewer ? true : isMyAssignedRow(i)));

  const openEdit = (ofi: EqaOfiMonitoring) => {
    setEditingOfi(ofi);
    const safeDate = (d: any) =>
      d?.toDate ? format(d.toDate(), 'yyyy-MM-dd') : d ? format(new Date(d), 'yyyy-MM-dd') : '';

    const targets = (ofi.targetUnits || []).map((t) => ({
      id: t.id || genId(),
      unitId: t.unitId,
      campusId: t.campusId,
      actionTaken: t.actionTaken || '',
      status: (t.status as EqaOfiStatus) || 'Pending Action',
      targetDate: safeDate(t.targetDate),
      evidenceLink: t.evidenceLink || '',
    }));

    form.reset({
      certifyingBody: ofi.certifyingBody || 'TÜV Rheinland',
      standard: ofi.standard || 'ISO 21001:2018',
      auditDate: safeDate(ofi.auditDate),
      ofiStatement: ofi.ofiStatement,
      remarks: ofi.remarks || '',
      targetUnits: targets,
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
            onClick={openCreate}
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
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Total Assigned Gaps
              </p>
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
            <SelectTrigger className="h-8 text-[11px] w-[150px] bg-white">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending Action">Pending Action</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Verified by QAO">Verified by QAO</SelectItem>
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
          ) : filteredRows.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase pl-6">Unit & Campus</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase">External Body & Standard</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase w-[24%]">External OFI Statement</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase w-[24%]">
                      Action Taken / Action Plan by Unit
                    </TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-center">Status</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map(({ ofi, target }) => (
                    <TableRow key={`${ofi.id}-${target.id}`} className="hover:bg-muted/30 transition-colors group">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs uppercase text-slate-900 dark:text-slate-100">
                            {target.unitName || unitMap.get(target.unitId) || 'Unit'}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {campusMap.get(target.campusId) || 'Site Context'}
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
                            {target.actionTaken || <span className="text-slate-400 italic">No action logged yet.</span>}
                          </p>
                          {target.evidenceLink && (
                            <a
                              href={target.evidenceLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-black text-primary hover:underline uppercase tracking-tighter"
                            >
                              <LinkIcon className="h-3 w-3" /> View Action Evidence
                            </a>
                          )}
                          {target.targetDate && (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                              <Calendar className="h-3 w-3" />
                              Due:{' '}
                              {target.targetDate?.toDate
                                ? format(target.targetDate.toDate(), 'MM/dd/yyyy')
                                : target.targetDate}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] font-black uppercase h-5 px-2 border',
                            statusColors[target.status || 'Pending Action'],
                          )}
                        >
                          {target.status || 'Pending Action'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right pr-6 space-x-1 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(ofi)}
                          className="h-8 text-[10px] font-bold text-primary hover:bg-primary/10"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" /> Update Action
                        </Button>
                        {isInstitutionalViewer && (
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
        <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {editingOfi
                ? 'Update External OFI Action Monitoring'
                : 'Log External Audit Opportunity for Improvement (OFI)'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Log the external auditor's recommendation and assign target units. Each assigned unit documents its own
              action plan and evidence.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="certifyingBody"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        Certifying Body / Auditor
                      </FormLabel>
                      <Input
                        {...field}
                        placeholder="e.g. TÜV Rheinland"
                        className="h-9 text-xs"
                        disabled={!isInstitutionalViewer}
                      />
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
                      <Input
                        {...field}
                        placeholder="e.g. ISO 21001:2018"
                        className="h-9 text-xs"
                        disabled={!isInstitutionalViewer}
                      />
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
                        <Input {...field} type="date" className="h-9 text-xs" disabled={!isInstitutionalViewer} />
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
                        className="min-h-16 text-xs"
                        disabled={!isInstitutionalViewer}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Target Units */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                    Target Units (each unit responds with its own action plan)
                  </FormLabel>
                  {(isInstitutionalViewer || !editingOfi) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addTargetUnit}
                      className="h-7 text-[10px] font-black uppercase tracking-widest"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add Target Unit
                    </Button>
                  )}
                </div>

                {visibleFieldIndexes.map((index) => {
                  return (
                    <div key={fields[index].id} className="rounded-lg border bg-muted/10 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          Target Unit #{index + 1}
                        </span>
                        {isInstitutionalViewer && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            onClick={() => remove(index)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`targetUnits.${index}.campusId`}
                          render={({ field: cField }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                                Target Campus
                              </FormLabel>
                              <Select
                                onValueChange={cField.onChange}
                                value={cField.value}
                                disabled={!isInstitutionalViewer}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-9 text-xs" disabled={!isInstitutionalViewer}>
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

                        <FormField
                          control={form.control}
                          name={`targetUnits.${index}.unitId`}
                          render={({ field: uField }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                                Target Unit / Department
                              </FormLabel>
                              <Select
                                onValueChange={(val) => {
                                  if (isInstitutionalViewer) uField.onChange(val);
                                }}
                                value={uField.value}
                                disabled={!isInstitutionalViewer}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-9 text-xs" disabled={!isInstitutionalViewer}>
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
                      </div>

                      <FormField
                        control={form.control}
                        name={`targetUnits.${index}.actionTaken`}
                        render={({ field: aField }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                              Action Taken / Action Plan by Unit
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...aField}
                                placeholder="Detail the corrective steps or improvements undertaken by the unit..."
                                className="min-h-16 text-xs"
                                disabled={!canFillUnitAction(index)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <FormField
                          control={form.control}
                          name={`targetUnits.${index}.status`}
                          render={({ field: sField }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                                Action Monitoring Status
                              </FormLabel>
                              <Select
                                onValueChange={sField.onChange}
                                value={sField.value}
                                disabled={!canSetStatus(index)}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-9 text-xs" disabled={!canSetStatus(index)}>
                                    <SelectValue placeholder="Select Status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Pending Action">Pending Action</SelectItem>
                                  <SelectItem value="In Progress">In Progress</SelectItem>
                                  <SelectItem value="Completed">Completed</SelectItem>
                                  <SelectItem value="Verified by QAO">Verified by QAO</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`targetUnits.${index}.targetDate`}
                          render={({ field: dField }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                                Target Completion Date
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...dField}
                                  type="date"
                                  className="h-9 text-xs"
                                  disabled={!canFillUnitAction(index)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`targetUnits.${index}.evidenceLink`}
                        render={({ field: eField }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                              Evidence Google Drive Link (Optional)
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...eField}
                                placeholder="https://drive.google.com/file/d/..."
                                className="h-9 text-xs font-mono"
                                disabled={!canFillUnitAction(index)}
                              />
                            </FormControl>
                            <FormDescription className="text-[9px]">
                              Entered by the unit involved. Provide a public link to the verification proof or evidence
                              document.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  );
                })}

                {form.formState.errors.targetUnits?.message && (
                  <p className="text-xs text-destructive">{form.formState.errors.targetUnits.message}</p>
                )}
              </div>

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
