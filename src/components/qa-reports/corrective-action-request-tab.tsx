'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, deleteDoc, doc, addDoc, serverTimestamp, updateDoc, Timestamp, arrayUnion, orderBy } from 'firebase/firestore';
import type { CorrectiveActionRequest, Campus, Unit, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Loader2, 
    PlusCircle, 
    Calendar, 
    ExternalLink, 
    Trash2, 
    ListChecks, 
    History, 
    Info, 
    User, 
    ShieldCheck, 
    Hash, 
    ChevronRight, 
    Edit, 
    Gavel, 
    MessageSquare, 
    Search, 
    ArrowUpDown, 
    ClipboardList, 
    Undo2, 
    Printer, 
    Target, 
    Filter, 
    Building2, 
    Activity, 
    Link as LinkIcon,
    Save,
    Clock,
    ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditorNCManager } from '@/components/audit/auditor-nc-manager';

interface CorrectiveActionRequestTabProps {
  campuses: Campus[];
  units: Unit[];
  canManage: boolean;
}

const carSchema = z.object({
  carNumber: z.string().min(1, 'CAR Number is required'),
  ncReportNumber: z.string().optional(),
  source: z.enum(['Audit Finding', 'Legal Non-compliance', 'Non-conforming Service', 'Others']),
  procedureTitle: z.string().min(1, 'Title of Procedure is required'),
  initiator: z.string().min(1, 'Initiator is required'),
  natureOfFinding: z.enum(['NC', 'OFI']),
  concerningClause: z.string().min(1, 'ISO Clause is required'),
  concerningTopManagementName: z.string().min(1, 'Top Management reference is required'),
  timeLimitForReply: z.string().min(1, 'Time limit for reply is required.'),
  unitId: z.string().min(1, 'Responsible unit is required'),
  campusId: z.string().min(1, 'Campus is required'),
  unitHead: z.string().min(1, 'Head of Unit is required'),
  descriptionOfNonconformance: z.string().min(1, 'Description is required'),
  requestDate: z.string().min(1, 'Request date is required'),
  preparedBy: z.string().min(1, 'Prepared by is required'),
  approvedBy: z.string().min(1, 'Approved by is required'),
  rootCauseAnalysis: z.string().optional().or(z.literal('')),
  actionSteps: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    type: z.enum(['Immediate Correction', 'Long-term Corrective Action']),
    completionDate: z.string().min(1, 'Date is required'),
    status: z.enum(['Pending', 'Completed']),
  })).optional(),
  effectivenessAudits: z.array(z.object({
    result: z.string().min(1, 'Effectiveness result is required'),
    verifiedBy: z.string().min(1, 'Required'),
    date: z.string().min(1, 'Required'),
    action: z.enum(['Effective', 'Not Effective', 'Close the NC', 'Continue Monitoring the NC']),
    remarks: z.string().optional().or(z.literal('')),
  })).optional(),
  status: z.enum(['Open', 'In Progress', 'Awaiting Response/Update', 'For Final Verification', 'Closed']),
  findingId: z.string().optional(),
});

export function CorrectiveActionRequestTab({ campuses, units, canManage }: CorrectiveActionRequestTabProps) {
  const { userProfile, isAdmin, isAuditor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<CorrectiveActionRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters for CAR registry
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');

  const carQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'correctiveActionRequests'), orderBy('createdAt', 'desc')) : null), [firestore]);
  const { data: rawCars, isLoading: isLoadingCars } = useCollection<CorrectiveActionRequest>(carQuery);

  const findingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditFindings') : null), [firestore]);
  const { data: findings } = useCollection(findingsQuery);

  const schedulesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditSchedules') : null), [firestore]);
  const { data: schedules } = useCollection(schedulesQuery);

  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const filteredCars = useMemo(() => {
    if (!rawCars) return [];
    return rawCars.filter(car => {
        const matchesCampus = campusFilter === 'all' || car.campusId === campusFilter;
        const lowerSearch = searchTerm.toLowerCase();
        const matchesSearch = car.carNumber.toLowerCase().includes(lowerSearch) || 
                             unitMap.get(car.unitId)?.toLowerCase().includes(lowerSearch);
        return matchesCampus && matchesSearch;
    });
  }, [rawCars, campusFilter, searchTerm, unitMap]);

  const form = useForm<z.infer<typeof carSchema>>({
    resolver: zodResolver(carSchema),
    defaultValues: { status: 'Open', requestDate: format(new Date(), 'yyyy-MM-dd'), actionSteps: [], effectivenessAudits: [] }
  });

  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({ control: form.control, name: "actionSteps" });
  const { fields: effectivenessFields, append: appendEffectiveness, remove: removeEffectiveness } = useFieldArray({ control: form.control, name: "effectivenessAudits" });

  const handleEdit = (car: CorrectiveActionRequest) => {
    setEditingCar(car);
    const safeDate = (d: any) => d?.toDate ? format(d.toDate(), 'yyyy-MM-dd') : (d ? format(new Date(d), 'yyyy-MM-dd') : '');
    form.reset({
        ...car,
        requestDate: safeDate(car.requestDate),
        timeLimitForReply: safeDate(car.timeLimitForReply),
        actionSteps: (car.actionSteps || []).map(s => ({ ...s, completionDate: safeDate(s.completionDate) })),
        effectivenessAudits: (car.effectivenessAudits || []).map(a => ({ ...a, date: safeDate(a.date) }))
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof carSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    try {
        const carData = {
          ...values,
          requestDate: Timestamp.fromDate(new Date(values.requestDate)),
          timeLimitForReply: Timestamp.fromDate(new Date(values.timeLimitForReply)),
          actionSteps: (values.actionSteps || []).map(s => ({ ...s, completionDate: Timestamp.fromDate(new Date(s.completionDate)) })),
          effectivenessAudits: (values.effectivenessAudits || []).map(a => ({ ...a, date: Timestamp.fromDate(new Date(a.date)) })),
          updatedAt: serverTimestamp(),
        };

        if (editingCar) {
          await updateDoc(doc(firestore, 'correctiveActionRequests', editingCar.id), carData);
        } else {
          await addDoc(collection(firestore, 'correctiveActionRequests'), { ...carData, createdAt: serverTimestamp() });
        }
        setIsDialogOpen(false);
        toast({ title: 'Success', description: 'CAR Registry updated.' });
    } catch (e) { toast({ title: 'Error', variant: 'destructive' }); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
            <h3 className="text-xl font-black uppercase text-slate-900">Corrective Action Framework</h3>
            <p className="text-xs text-muted-foreground">Formalizing and tracking the closure of non-conformities.</p>
        </div>
        {(isAdmin || isAuditor) && (
            <Button onClick={() => { setEditingCar(null); form.reset(); setIsDialogOpen(true); }} size="sm" className="h-9 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest">
                <PlusCircle className="mr-2 h-4 w-4" /> Issue New CAR
            </Button>
        )}
      </div>

      <Tabs defaultValue="registry" className="space-y-6">
          <TabsList className="bg-muted p-1 border shadow-sm w-fit h-10 animate-tab-highlight rounded-md">
              <TabsTrigger value="registry" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                  <ListChecks className="h-4 w-4" /> Strategic CAR Registry
              </TabsTrigger>
              <TabsTrigger value="bridge" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                  <ShieldAlert className="h-4 w-4 text-rose-600" /> Finding Bridge / NC Manager
              </TabsTrigger>
          </TabsList>

          <TabsContent value="registry" className="space-y-6 animate-in fade-in duration-500">
              <Card className="border-primary/10 shadow-sm bg-muted/10">
                  <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Search Registry</label>
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="Search by CAR number or Unit..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 text-xs bg-white" />
                          </div>
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Campus Filter</label>
                          <Select value={campusFilter} onValueChange={setCampusFilter}>
                              <SelectTrigger className="h-10 text-xs bg-white font-bold"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Sites</SelectItem>
                                  {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                  </CardContent>
              </Card>

              <Card className="shadow-md border-primary/10 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="text-[10px] font-black uppercase pl-6 py-4">CAR No. & Procedure</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Accountable Unit</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase">Reply Deadline</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase">Status</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCars?.map(car => (
                            <TableRow key={car.id} className="hover:bg-muted/20 transition-colors group">
                                <TableCell className="pl-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-xs text-primary">{car.carNumber}</span>
                                        <span className="text-[10px] font-bold text-slate-600 truncate max-w-[250px]">{car.procedureTitle}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-xs font-bold">
                                        <Building2 className="h-3.5 w-3.5 opacity-30" />
                                        {unitMap.get(car.unitId)}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center text-[10px] font-black text-rose-700 tabular-nums">
                                    {car.timeLimitForReply?.toDate ? format(car.timeLimitForReply.toDate(), 'MMM dd, yyyy') : '--'}
                                </TableCell>
                                <TableCell className="text-center"><Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5 text-primary">{car.status}</Badge></TableCell>
                                <TableCell className="text-right pr-6"><Button size="sm" variant="ghost" className="h-8 font-black uppercase text-[10px]" onClick={() => handleEdit(car)}>Manage Record</Button></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </Card>
          </TabsContent>

          <TabsContent value="bridge" className="animate-in fade-in duration-500">
              <AuditorNCManager 
                findings={findings || []}
                schedules={schedules || []}
                cars={rawCars || []}
                campuses={campuses}
                units={units}
                signatories={signatories || undefined}
                campusFilter={campusFilter}
                searchTerm={searchTerm}
              />
          </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
                <Gavel className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Corrective Action Lifecycle</span>
            </div>
            <DialogTitle>{editingCar ? 'Update' : 'Initialize'} CAR Record</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 bg-white">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-10">
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2"><Info className="h-4 w-4 text-primary" /><h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">1. Administrative Context</h4></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="carNumber" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase">CAR Number</FormLabel><FormControl><Input {...field} className="bg-slate-50 font-black h-11" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="timeLimitForReply" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase text-rose-600">Reply Deadline</FormLabel><FormControl><Input type="date" {...field} className="bg-rose-50/30 border-rose-100 font-bold h-11" /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="procedureTitle" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase">Title of Procedure Affected</FormLabel><FormControl><Input {...field} className="bg-slate-50 font-bold" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="campusId" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase">Campus Site</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-slate-50 h-10"><SelectValue /></SelectTrigger></FormControl><SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></FormItem>
                            )} />
                            <FormField control={form.control} name="unitId" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-black uppercase">Responsible Unit</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!form.watch('campusId')}><FormControl><SelectTrigger className="bg-slate-50 h-10"><SelectValue /></SelectTrigger></FormControl><SelectContent>{units.filter(u => u.campusIds?.includes(form.watch('campusId'))).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></FormItem>
                            )} />
                        </div>
                    </section>

                    <section className="space-y-6 pt-6 border-t border-dashed">
                        <div className="flex items-center gap-2 border-b pb-2"><AlertTriangle className="h-4 w-4 text-rose-600" /><h4 className="text-[10px] font-black uppercase tracking-widest text-rose-800">2. Statement of Non-Conformance</h4></div>
                        <FormField control={form.control} name="descriptionOfNonconformance" render={({ field }) => (
                            <FormItem><FormControl><Textarea {...field} rows={6} className="bg-rose-50/10 border-rose-100 italic text-sm leading-relaxed" placeholder="Clearly describe the gap identified against the ISO standard..." /></FormControl><FormMessage /></FormItem>
                        )} />
                    </section>

                    <section className="space-y-6 pt-6 border-t border-dashed">
                        <div className="flex items-center gap-2 border-b pb-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-800">3. Effectiveness Audit & Verification</h4></div>
                        {effectivenessFields.map((field, idx) => (
                            <div key={field.id} className="p-6 rounded-2xl border bg-emerald-50/20 space-y-6 group relative">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeEffectiveness(idx)}><Trash2 className="h-4 w-4" /></Button>
                                <FormField control={form.control} name={`effectivenessAudits.${idx}.result`} render={({ field: iF }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-emerald-900">Audit Verification Outcome</FormLabel><FormControl><Textarea {...iF} rows={3} className="bg-white border-emerald-100 text-sm shadow-inner" /></FormControl></FormItem>
                                )} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name={`effectivenessAudits.${idx}.action`} render={({ field: iF }) => (
                                        <FormItem><FormLabel className="text-[9px] font-black uppercase text-emerald-600">Administrative Decision</FormLabel><Select onValueChange={iF.onChange} value={iF.value}><FormControl><SelectTrigger className="h-10 font-bold bg-white"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Effective">Effective (NC Closed)</SelectItem><SelectItem value="Not Effective">Not Effective (NC Stays Open)</SelectItem></SelectContent></Select></FormItem>
                                    )} />
                                    <FormField control={form.control} name={`effectivenessAudits.${idx}.date`} render={({ field: iF }) => (
                                        <FormItem><FormLabel className="text-[9px] font-black uppercase text-emerald-600">Verification Date</FormLabel><FormControl><Input type="date" {...iF} className="h-10 font-bold bg-white" /></FormControl></FormItem>
                                    )} />
                                </div>
                            </div>
                        ))}
                        {(isAdmin || isAuditor) && <Button type="button" variant="outline" size="sm" onClick={() => appendEffectiveness({ result: '', verifiedBy: userProfile?.firstName || 'Admin', date: format(new Date(), 'yyyy-MM-dd'), action: 'Effective', remarks: '' })} className="w-full h-12 border-dashed border-emerald-200 text-emerald-700 font-black uppercase text-[10px] tracking-widest"><PlusCircle className="h-4 w-4 mr-2" /> Add Final Verification Entry</Button>}
                    </section>
                </form>
            </Form>
          </ScrollArea>
          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <div className="flex w-full items-center justify-between">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-[10px] font-black uppercase">Cancel</Button>
                <div className="flex gap-2">
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting} className="min-w-[180px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] h-10 px-8 tracking-widest">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Commit CAR Registry Update
                    </Button>
                </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
