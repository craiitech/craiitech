
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import type { CorrectiveActionRequest, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, History, Trash2, Edit, Info, ShieldCheck, FileText, ClipboardCheck, UserCheck, Clock, UserPlus, ListTodo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  
  rootCauseAnalysis: z.string().optional(),
  
  actionSteps: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    type: z.enum(['Immediate Correction', 'Long-term Corrective Action']),
    completionDate: z.string().min(1, 'Date is required'),
    status: z.enum(['Pending', 'Completed']),
  })).optional(),

  verificationRecords: z.array(z.object({
    result: z.string().min(1, 'Verification result is required'),
    effectivenessResult: z.string().min(1, 'Verification of effectiveness is required'),
    remarks: z.string().optional(),
    verifiedBy: z.string().min(1, 'Verified by is required'),
    verificationDate: z.string().min(1, 'Date is required'),
  })).optional(),
  
  status: z.enum(['Open', 'In Progress', 'Closed']),
});

export function CorrectiveActionRequestTab({ campuses, units, canManage }: CorrectiveActionRequestTabProps) {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<CorrectiveActionRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const carQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'correctiveActionRequests'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: cars, isLoading } = useCollection<CorrectiveActionRequest>(carQuery);

  const form = useForm<z.infer<typeof carSchema>>({
    resolver: zodResolver(carSchema),
    defaultValues: { 
        source: 'Audit Finding', 
        natureOfFinding: 'NC', 
        status: 'Open',
        requestDate: format(new Date(), 'yyyy-MM-dd'),
        actionSteps: [],
        verificationRecords: []
    }
  });

  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({
    control: form.control,
    name: "actionSteps"
  });

  const { fields: verificationFields, append: appendVerification, remove: removeVerification } = useFieldArray({
    control: form.control,
    name: "verificationRecords"
  });

  const onSubmit = async (values: z.infer<typeof carSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const carData: any = {
        ...values,
        requestDate: Timestamp.fromDate(new Date(values.requestDate)),
        timeLimitForReply: Timestamp.fromDate(new Date(values.timeLimitForReply)),
        actionSteps: (values.actionSteps || []).map(step => ({
            ...step,
            completionDate: Timestamp.fromDate(new Date(step.completionDate))
        })),
        verificationRecords: (values.verificationRecords || []).map(rec => ({
            ...rec,
            verificationDate: Timestamp.fromDate(new Date(rec.verificationDate))
        })),
        updatedAt: serverTimestamp(),
      };

      if (editingCar) {
        await updateDoc(doc(firestore, 'correctiveActionRequests', editingCar.id), carData);
        toast({ title: 'Success', description: 'CAR record updated.' });
      } else {
        await addDoc(collection(firestore, 'correctiveActionRequests'), {
          ...carData,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'New CAR registered in system.' });
      }
      setIsDialogOpen(false);
      form.reset();
      setEditingCar(null);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to save CAR record.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (car: CorrectiveActionRequest) => {
    setEditingCar(car);
    const safeDate = (d: any) => d?.toDate ? format(d.toDate(), 'yyyy-MM-dd') : (d ? format(new Date(d), 'yyyy-MM-dd') : '');
    
    form.reset({
      ...car,
      requestDate: safeDate(car.requestDate),
      timeLimitForReply: safeDate(car.timeLimitForReply),
      actionSteps: (car.actionSteps || []).map(step => ({
          ...step,
          completionDate: safeDate(step.completionDate)
      })),
      verificationRecords: (car.verificationRecords || []).map(rec => ({
          ...rec,
          verificationDate: safeDate(rec.verificationDate)
      })),
    } as any);
    setIsDialogOpen(true);
  };

  const unitMap = new Map(units.map(u => [u.id, u.name]));
  const campusMap = new Map(campuses.map(c => [c.id, c.name]));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
            <h3 className="text-lg font-black uppercase tracking-tight">Institutional CAR Registry</h3>
            <p className="text-xs text-muted-foreground font-medium">Monitoring of non-conformance and improvement actions.</p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditingCar(null); form.reset({ source: 'Audit Finding', natureOfFinding: 'NC', status: 'Open', requestDate: format(new Date(), 'yyyy-MM-dd'), actionSteps: [], verificationRecords: [] }); setIsDialogOpen(true); }} size="sm" className="shadow-lg shadow-primary/20">
            <PlusCircle className="mr-2 h-4 w-4" /> Issue New CAR
          </Button>
        )}
      </div>

      <Card className="shadow-sm border-primary/10 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold text-[10px] uppercase">CAR No. & Unit</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase">Procedure / Findings</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase">Oversight</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-center">Status</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cars?.map((car) => (
                  <TableRow key={car.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-xs text-primary">{car.carNumber}</span>
                        <span className="text-[10px] font-bold text-slate-700 mt-0.5 truncate max-w-[150px]">{unitMap.get(car.unitId) || '...'}</span>
                        <span className="text-[9px] text-muted-foreground uppercase">{campusMap.get(car.campusId) || '...'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold truncate">{car.procedureTitle}</span>
                            <span className="text-[10px] text-muted-foreground line-clamp-1 italic">"{car.descriptionOfNonconformance}"</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="text-[10px] border-primary/20 text-primary font-bold w-fit">{car.concerningClause}</Badge>
                            <span className="text-[9px] font-bold text-slate-500 uppercase truncate max-w-[120px]">{car.concerningTopManagementName || 'Not Assigned'}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={car.status === 'Open' ? 'destructive' : car.status === 'In Progress' ? 'secondary' : 'default'} className="text-[9px] font-black uppercase shadow-sm border-none">
                        {car.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(car)} className="h-8 text-[10px] font-bold uppercase tracking-widest">
                        {canManage ? 'MANAGE' : 'VIEW DETAILS'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && cars?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                            <ClipboardCheck className="h-8 w-8 opacity-10" />
                            <p className="text-xs font-medium italic">Zero active Corrective Action Requests.</p>
                        </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
                <FileText className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Form QAO-00-018</span>
            </div>
            <DialogTitle className="text-xl font-bold">{editingCar ? 'Manage' : 'Issue'} Corrective Action Request</DialogTitle>
            <DialogDescription className="text-xs">Formalized tracking of non-conformities and institutional improvements.</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 bg-white">
            <div className="p-8">
                <Form {...form}>
                    <form id="car-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                        <Tabs defaultValue="identification" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 h-12 bg-slate-100 p-1 mb-8">
                                <TabsTrigger value="identification" className="text-xs font-bold uppercase"><Info className="h-3.5 w-3.5 mr-2" /> Identification</TabsTrigger>
                                <TabsTrigger value="nonconformance" className="text-xs font-bold uppercase"><ShieldCheck className="h-3.5 w-3.5 mr-2" /> Statement</TabsTrigger>
                                <TabsTrigger value="investigation" className="text-xs font-bold uppercase"><History className="h-3.5 w-3.5 mr-2" /> Action Registry</TabsTrigger>
                                <TabsTrigger value="verification" className="text-xs font-bold uppercase"><ClipboardCheck className="h-3.5 w-3.5 mr-2" /> Verification</TabsTrigger>
                            </TabsList>

                            <TabsContent value="identification" className="space-y-6 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="carNumber" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">CAR Number</FormLabel><FormControl><Input {...field} placeholder="e.g. 2021-124" className="bg-slate-50 font-black text-primary" disabled={!canManage} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="ncReportNumber" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">NC Report No.</FormLabel><FormControl><Input {...field} placeholder="e.g. 2021-179" className="bg-slate-50" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                    <FormField control={form.control} name="concerningTopManagementName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-primary flex items-center gap-2">
                                                <UserCheck className="h-3.5 w-3.5" /> Concerning (Top Management / VP)
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter name of VP or Director" className="bg-primary/5 border-primary/20 h-10 font-bold" disabled={!canManage} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="timeLimitForReply" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5" /> Time Limit for Reply (Deadline)
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} className="bg-slate-50 h-10" disabled={!canManage} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                    <FormField control={form.control} name="source" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Source of Finding</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!canManage}>
                                                <FormControl><SelectTrigger className="bg-slate-50 font-medium"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Audit Finding">Audit Finding</SelectItem>
                                                    <SelectItem value="Legal Non-compliance">Legal Non-compliance</SelectItem>
                                                    <SelectItem value="Non-conforming Service">Non-conforming Service</SelectItem>
                                                    <SelectItem value="Others">Others</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="procedureTitle" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Title of Procedure</FormLabel><FormControl><Input {...field} placeholder="e.g. Conduct of BOR Meeting" className="bg-slate-50 font-medium" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormField control={form.control} name="initiator" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Initiator</FormLabel><FormControl><Input {...field} className="bg-slate-50" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="natureOfFinding" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Nature of Finding</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!canManage}>
                                                <FormControl><SelectTrigger className="bg-slate-50 font-medium"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent><SelectItem value="NC">Non-Conformance (NC)</SelectItem><SelectItem value="OFI">Opportunity for Improvement (OFI)</SelectItem></SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="concerningClause" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Concerning ISO Clause</FormLabel><FormControl><Input {...field} placeholder="e.g. 7.5.3.1" className="bg-slate-50" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                    <FormField control={form.control} name="campusId" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Responsible Campus</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!canManage}>
                                                <FormControl><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                                                <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="unitId" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Responsible Unit</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!canManage}>
                                                <FormControl><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select Unit" /></SelectTrigger></FormControl>
                                                <SelectContent>{units.filter(u => u.campusIds?.includes(form.watch('campusId'))).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>
                            </TabsContent>

                            <TabsContent value="nonconformance" className="space-y-6 animate-in fade-in duration-300">
                                <FormField control={form.control} name="descriptionOfNonconformance" render={({ field }) => (
                                    <FormItem><FormLabel className="text-sm font-black text-slate-800">Statement of Non-Conformance</FormLabel><FormControl><Textarea {...field} rows={6} className="bg-slate-50 text-xs italic font-medium leading-relaxed" disabled={!canManage} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                    <FormField control={form.control} name="requestDate" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold text-muted-foreground uppercase">Request Date</FormLabel><FormControl><Input type="date" {...field} className="bg-slate-50" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="preparedBy" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold text-muted-foreground uppercase">Prepared By</FormLabel><FormControl><Input {...field} className="bg-slate-50" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="approvedBy" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold text-muted-foreground uppercase">Approved By (QA Head)</FormLabel><FormControl><Input {...field} className="bg-slate-50" disabled={!canManage} /></FormControl></FormItem>
                                    )} />
                                </div>
                            </TabsContent>

                            <TabsContent value="investigation" className="space-y-8 animate-in fade-in duration-300">
                                <FormField control={form.control} name="rootCauseAnalysis" render={({ field }) => (
                                    <FormItem><FormLabel className="text-sm font-black text-slate-800">Root Cause Analysis (Investigate cause of Non-Conformity)</FormLabel><FormControl><Textarea {...field} rows={4} className="bg-primary/5 border-primary/20" /></FormControl></FormItem>
                                )} />
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Proposed Action Strategy Registry</h4>
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => appendAction({ description: '', type: 'Immediate Correction', completionDate: format(new Date(), 'yyyy-MM-dd'), status: 'Pending' })}
                                            className="h-7 text-[9px] font-black uppercase bg-white shadow-sm"
                                        >
                                            <PlusCircle className="h-3 w-3 mr-1.5" /> Add Action Step
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {actionFields.map((field, index) => (
                                            <Card key={field.id} className="relative overflow-hidden group">
                                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAction(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                                    <FormField control={form.control} name={`actionSteps.${index}.type`} render={({ field: inputField }) => (
                                                        <FormItem className="md:col-span-1">
                                                            <FormLabel className="text-[9px] uppercase font-bold">Action Type</FormLabel>
                                                            <Select onValueChange={inputField.onChange} value={inputField.value}>
                                                                <FormControl><SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="Immediate Correction">Immediate Correction</SelectItem>
                                                                    <SelectItem value="Long-term Corrective Action">Long-term Action</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`actionSteps.${index}.description`} render={({ field: inputField }) => (
                                                        <FormItem className="md:col-span-1">
                                                            <FormLabel className="text-[9px] uppercase font-bold">Action Description</FormLabel>
                                                            <FormControl><Input {...inputField} className="h-8 text-[10px]" /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`actionSteps.${index}.completionDate`} render={({ field: inputField }) => (
                                                        <FormItem className="md:col-span-1">
                                                            <FormLabel className="text-[9px] uppercase font-bold">Target Completion</FormLabel>
                                                            <FormControl><Input type="date" {...inputField} className="h-8 text-[10px]" /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`actionSteps.${index}.status`} render={({ field: inputField }) => (
                                                        <FormItem className="md:col-span-1">
                                                            <FormLabel className="text-[9px] uppercase font-bold">Execution Status</FormLabel>
                                                            <Select onValueChange={inputField.onChange} value={inputField.value}>
                                                                <FormControl><SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="Pending">Pending</SelectItem>
                                                                    <SelectItem value="Completed">Completed</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )} />
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {actionFields.length === 0 && (
                                            <div className="py-10 text-center border border-dashed rounded-lg bg-muted/10">
                                                <ListTodo className="h-8 w-8 mx-auto text-muted-foreground opacity-20 mb-2" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No specific action steps defined</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-6 border-t">
                                    <FormField control={form.control} name="unitHead" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Head of Unit Signature (Typed)</FormLabel><FormControl><Input {...field} className="bg-slate-50 font-bold" /></FormControl></FormItem>
                                    )} />
                                </div>
                            </TabsContent>

                            <TabsContent value="verification" className="space-y-8 animate-in fade-in duration-300">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Verification & Follow-up History</h4>
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            onClick={() => appendVerification({ result: '', effectivenessResult: '', remarks: '', verifiedBy: '', verificationDate: format(new Date(), 'yyyy-MM-dd') })}
                                            className="h-7 text-[9px] font-black uppercase shadow-lg shadow-primary/20"
                                        >
                                            <UserPlus className="h-3 w-3 mr-1.5" /> Add Verification Record
                                        </Button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {verificationFields.map((field, index) => (
                                            <Card key={field.id} className="relative border-primary/10 overflow-hidden group">
                                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeVerification(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <CardHeader className="bg-muted/30 py-2 border-b">
                                                    <CardTitle className="text-[10px] font-black uppercase text-primary">Verification Cycle #{index + 1}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-4 space-y-4">
                                                    <FormField control={form.control} name={`verificationRecords.${index}.result`} render={({ field: inputField }) => (
                                                        <FormItem><FormLabel className="text-[10px] font-bold uppercase">Verification Finding / Result</FormLabel><FormControl><Textarea {...inputField} rows={2} className="text-xs bg-slate-50" /></FormControl></FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`verificationRecords.${index}.effectivenessResult`} render={({ field: inputField }) => (
                                                        <FormItem><FormLabel className="text-[10px] font-bold uppercase">Verification of Effectiveness of the Action Taken</FormLabel><FormControl><Textarea {...inputField} rows={2} className="text-xs bg-slate-50" /></FormControl></FormItem>
                                                    )} />
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <FormField control={form.control} name={`verificationRecords.${index}.verifiedBy`} render={({ field: inputField }) => (
                                                            <FormItem><FormLabel className="text-[10px] font-bold uppercase">Verified By</FormLabel><FormControl><Input {...inputField} className="h-8 text-[10px]" /></FormControl></FormItem>
                                                        )} />
                                                        <FormField control={form.control} name={`verificationRecords.${index}.verificationDate`} render={({ field: inputField }) => (
                                                            <FormItem><FormLabel className="text-[10px] font-bold uppercase">Date Verified</FormLabel><FormControl><Input type="date" {...inputField} className="h-8 text-[10px]" /></FormControl></FormItem>
                                                        )} />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {verificationFields.length === 0 && (
                                            <div className="py-16 text-center border border-dashed rounded-lg bg-muted/10">
                                                <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-2" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Awaiting initial verification</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-6 border-t space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Closure Determination</h4>
                                    <FormField control={form.control} name="status" render={({ field }) => (
                                        <FormItem className="max-w-xs">
                                            <FormLabel className="text-[10px] font-black uppercase text-primary">Current Lifecycle Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="bg-primary/5 border-primary/20 font-black h-10"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Open">Open</SelectItem>
                                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                                    <SelectItem value="Closed">Closed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="p-6 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-3">
                                    <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                                        As per ISO 21001 requirements, verification of effectiveness should ideally occur at regular intervals after implementation to ensure long-term stability of the correction. Multiple verification records help demonstrate sustainable improvement.
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </form>
                </Form>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0">
            <div className="flex w-full items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">RSU Quality Management System | Registry v2.0</p>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Discard</Button>
                    <Button type="submit" form="car-form" disabled={isSubmitting} className="min-w-[150px] shadow-xl shadow-primary/20 font-black">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
                        {editingCar ? 'Update Registry' : 'Issue Record'}
                    </Button>
                </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
