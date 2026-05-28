'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
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
    Clock
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

export function CorrectiveActionRequestTab({ campuses, units, canManage: initialCanManage }: CorrectiveActionRequestTabProps) {
  const { userProfile, isAdmin, isAuditor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<CorrectiveActionRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isInstitutionalViewer = isAdmin || isAuditor;

  const carQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'correctiveActionRequests'), orderBy('createdAt', 'desc')) : null), [firestore]);
  const { data: rawCars, isLoading } = useCollection<CorrectiveActionRequest>(carQuery);

  const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

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
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black uppercase text-slate-900">Corrective Action Registry</h3>
        {isInstitutionalViewer && <Button onClick={() => { setEditingCar(null); form.reset(); setIsDialogOpen(true); }} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Issue New CAR</Button>}
      </div>

      <Card className="shadow-md border-primary/10 overflow-hidden">
        <Table>
            <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead className="text-[10px] font-black uppercase pl-6">CAR Number</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Responsibility</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rawCars?.map(car => (
                    <TableRow key={car.id} className="hover:bg-muted/20">
                        <TableCell className="pl-6 py-4 font-black text-primary">{car.carNumber}</TableCell>
                        <TableCell className="text-xs font-bold">{unitMap.get(car.unitId)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase">{car.status}</Badge></TableCell>
                        <TableCell className="text-right pr-6"><Button size="sm" variant="ghost" onClick={() => handleEdit(car)}>Manage</Button></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0"><DialogTitle className="font-black uppercase">Corrective Action Lifecycle</DialogTitle></DialogHeader>
          <ScrollArea className="flex-1">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <FormField control={form.control} name="carNumber" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase">CAR Number</FormLabel><FormControl><Input {...field} className="bg-slate-50 font-black h-11" /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="timeLimitForReply" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-rose-600">Reply Deadline</FormLabel><FormControl><Input type="date" {...field} className="bg-rose-50/30 border-rose-100 font-bold h-11" /></FormControl></FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="descriptionOfNonconformance" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Statement of Non-Conformance</FormLabel><FormControl><Textarea {...field} rows={4} className="bg-slate-50 italic" /></FormControl></FormItem>
                    )} />
                    <Separator />
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary border-b pb-1">Effectiveness Audit Log</h4>
                        {effectivenessFields.map((field, idx) => (
                            <div key={field.id} className="p-4 rounded-xl border bg-emerald-50/30 space-y-4">
                                <FormField control={form.control} name={`effectivenessAudits.${idx}.result`} render={({ field: iF }) => (
                                    <FormItem><FormLabel className="text-[9px] font-black uppercase">Audit Determination</FormLabel><FormControl><Textarea {...iF} rows={2} className="bg-white text-xs" /></FormControl></FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name={`effectivenessAudits.${idx}.action`} render={({ field: iF }) => (
                                        <FormItem><Select onValueChange={iF.onChange} value={iF.value}><FormControl><SelectTrigger className="h-8 text-[9px] bg-white"><SelectValue placeholder="Action" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Effective">Effective (Close)</SelectItem><SelectItem value="Not Effective">Not Effective</SelectItem></SelectContent></Select></FormItem>
                                    )} />
                                    <FormField control={form.control} name={`effectivenessAudits.${idx}.date`} render={({ field: iF }) => (
                                        <FormItem><FormControl><Input type="date" {...iF} className="h-8 text-[9px] bg-white" /></FormControl></FormItem>
                                    )} />
                                </div>
                            </div>
                        ))}
                        {isInstitutionalViewer && <Button type="button" variant="outline" size="sm" onClick={() => appendEffectiveness({ result: '', verifiedBy: '', date: format(new Date(), 'yyyy-MM-dd'), action: 'Effective' })} className="w-full h-10 border-dashed text-[9px] font-black uppercase"><PlusCircle className="h-3.5 w-3.5 mr-2" /> Add Effectiveness Result</Button>}
                    </div>
                </form>
            </Form>
          </ScrollArea>
          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0"><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Commit Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
