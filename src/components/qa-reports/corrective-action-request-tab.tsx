
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { CorrectiveActionRequest, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, ClipboardCheck, History, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';

interface CorrectiveActionRequestTabProps {
  campuses: Campus[];
  units: Unit[];
  canManage: boolean;
}

const carSchema = z.object({
  carNumber: z.string().min(1, 'CAR Number is required'),
  source: z.string().min(1, 'Source is required'),
  description: z.string().min(1, 'Description is required'),
  unitId: z.string().min(1, 'Unit is required'),
  campusId: z.string().min(1, 'Campus is required'),
  actionPlan: z.string().optional(),
  targetDate: z.string().min(1, 'Target date is required'),
  status: z.enum(['Open', 'In Progress', 'Closed']),
});

export function CorrectiveActionRequestTab({ campuses, units, canManage }: CorrectiveActionRequestTabProps) {
  const firestore = useFirestore();
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
    defaultValues: { carNumber: '', source: 'IQA', description: '', unitId: '', campusId: '', actionPlan: '', targetDate: '', status: 'Open' }
  });

  const onSubmit = async (values: z.infer<typeof carSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const carData = {
        ...values,
        targetDate: new Date(values.targetDate),
        updatedAt: serverTimestamp(),
      };

      if (editingCar) {
        await updateDoc(doc(firestore, 'correctiveActionRequests', editingCar.id), carData);
        toast({ title: 'Success', description: 'CAR updated.' });
      } else {
        await addDoc(collection(firestore, 'correctiveActionRequests'), {
          ...carData,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'New CAR registered.' });
      }
      setIsDialogOpen(false);
      form.reset();
      setEditingCar(null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save CAR.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (car: CorrectiveActionRequest) => {
    setEditingCar(car);
    const tDate = car.targetDate?.toDate ? car.targetDate.toDate() : new Date(car.targetDate);
    form.reset({
      carNumber: car.carNumber,
      source: car.source,
      description: car.description,
      unitId: car.unitId,
      campusId: car.campusId,
      actionPlan: car.actionPlan || '',
      targetDate: format(tDate, 'yyyy-MM-dd'),
      status: car.status,
    });
    setIsDialogOpen(true);
  };

  const unitMap = new Map(units.map(u => [u.id, u.name]));
  const campusMap = new Map(campuses.map(c => [c.id, c.name]));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">CAR Registry & Monitoring</h3>
        {canManage && (
          <Button onClick={() => { setEditingCar(null); form.reset(); setIsDialogOpen(true); }} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Issue New CAR
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CAR No. & Source</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Unit / Campus</TableHead>
                  <TableHead>Target Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cars?.map((car) => (
                  <TableRow key={car.id}>
                    <TableCell>
                      <p className="font-bold text-xs">{car.carNumber}</p>
                      <Badge variant="outline" className="text-[9px] mt-1">{car.source}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs">{car.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold">{unitMap.get(car.unitId) || '...'}</span>
                        <span className="text-[9px] text-muted-foreground uppercase">{campusMap.get(car.campusId) || '...'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {car.targetDate?.toDate ? format(car.targetDate.toDate(), 'PP') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={car.status === 'Open' ? 'destructive' : car.status === 'In Progress' ? 'secondary' : 'default'} className="text-[9px] font-black uppercase">
                        {car.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(car)}>
                        <Edit className="h-4 w-4 mr-2" /> {canManage ? 'Edit' : 'Update'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && cars?.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-xs italic">No Corrective Action Requests registered.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingCar ? 'Update' : 'Issue New'} Corrective Action Request</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="carNumber" render={({ field }) => (
                  <FormItem><FormLabel>CAR Number</FormLabel><FormControl><Input {...field} placeholder="e.g. CAR-2025-001" disabled={!canManage} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="source" render={({ field }) => (
                  <FormItem><FormLabel>Source of Finding</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canManage}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="IQA">Internal Audit (IQA)</SelectItem><SelectItem value="EQA">External Audit (EQA)</SelectItem><SelectItem value="Monitoring">Unit Monitoring</SelectItem><SelectItem value="Others">Others</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description of Non-Conformance</FormLabel><FormControl><Textarea {...field} disabled={!canManage} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="campusId" render={({ field }) => (
                  <FormItem><FormLabel>Campus</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canManage}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="unitId" render={({ field }) => (
                  <FormItem><FormLabel>Responsible Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canManage}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{units.filter(u => u.campusIds?.includes(form.watch('campusId'))).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="actionPlan" render={({ field }) => (
                <FormItem><FormLabel>Proposed Action Plan / Mitigation</FormLabel><FormControl><Textarea {...field} placeholder="What actions will the unit take?" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="targetDate" render={({ field }) => (
                  <FormItem><FormLabel>Target Completion Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Current Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <DialogFooter><Button type="submit" disabled={isSubmitting}>{editingCar ? 'Update CAR' : 'Register CAR'}</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
