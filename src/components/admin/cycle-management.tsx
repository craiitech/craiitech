'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Edit } from 'lucide-react';
import type { Cycle } from '@/lib/types';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
const months = [
  { value: 0, label: 'January' }, { value: 1, label: 'February' }, { value: 2, label: 'March' },
  { value: 3, label: 'April' }, { value: 4, label: 'May' }, { value: 5, label: 'June' },
  { value: 6, label: 'July' }, { value: 7, label: 'August' }, { value: 8, label: 'September' },
  { value: 9, label: 'October' }, { value: 10, label: 'November' }, { value: 11, label: 'December' },
];
const days = Array.from({ length: 31 }, (_, i) => i + 1);


const cycleSchema = z.object({
  name: z.enum(['first', 'final']),
  year: z.number().min(new Date().getFullYear() - 5).max(new Date().getFullYear() + 5),
  startYear: z.string().min(1),
  startMonth: z.string().min(1),
  startDay: z.string().min(1),
  endYear: z.string().min(1),
  endMonth: z.string().min(1),
  endDay: z.string().min(1),
}).refine(data => {
    const startDate = new Date(Number(data.startYear), Number(data.startMonth), Number(data.startDay));
    const endDate = new Date(Number(data.endYear), Number(data.endMonth), Number(data.endDay));
    return endDate > startDate;
}, {
  message: 'End date must be after start date.',
  path: ['endDay'], // Assign error to a field
});


export function CycleManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);

  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: cycles, isLoading } = useCollection<Cycle>(cyclesQuery);
  
  const sortedCycles = useMemo(() => {
    if (!cycles) return [];
    return [...cycles].sort((a,b) => b.year - a.year || a.name.localeCompare(b.name));
  }, [cycles]);

  const form = useForm<z.infer<typeof cycleSchema>>({
    resolver: zodResolver(cycleSchema),
    defaultValues: { year: currentYear },
  });
  
  const handleOpenDialog = (cycle: Cycle | null = null) => {
    setEditingCycle(cycle);
    if (cycle) {
      const startDate = cycle.startDate?.toDate();
      const endDate = cycle.endDate?.toDate();
      form.reset({
        name: cycle.name as 'first' | 'final',
        year: cycle.year,
        startYear: startDate ? String(startDate.getFullYear()) : undefined,
        startMonth: startDate ? String(startDate.getMonth()) : undefined,
        startDay: startDate ? String(startDate.getDate()) : undefined,
        endYear: endDate ? String(endDate.getFullYear()) : undefined,
        endMonth: endDate ? String(endDate.getMonth()) : undefined,
        endDay: endDate ? String(endDate.getDate()) : undefined,
      });
    } else {
      form.reset({
          name: undefined,
          year: currentYear,
          startYear: undefined, startMonth: undefined, startDay: undefined,
          endYear: undefined, endMonth: undefined, endDay: undefined,
      });
    }
    setIsDialogOpen(true);
  }

  const onSubmit = async (values: z.infer<typeof cycleSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const cycleId = `${values.name}-${values.year}`;
    const cycleRef = doc(firestore, 'cycles', cycleId);
    
    const cycleData = {
        id: cycleId,
        name: values.name,
        year: values.year,
        startDate: new Date(Number(values.startYear), Number(values.startMonth), Number(values.startDay)),
        endDate: new Date(Number(values.endYear), Number(values.endMonth), Number(values.endDay)),
    };

    try {
        await setDoc(cycleRef, cycleData, { merge: true });
        toast({ title: 'Success', description: `Cycle '${cycleData.name} ${cycleData.year}' saved.` });
        setIsDialogOpen(false);
    } catch (error) {
        console.error("Error saving cycle:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: cycleRef.path,
            operation: 'write',
            requestResourceData: cycleData,
        }));
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Cycles & Deadlines</CardTitle>
            <CardDescription>Manage submission cycles and their official start and end dates.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Cycle
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCycles?.map((cycle) => (
                  <TableRow key={cycle.id}>
                    <TableCell className="font-medium capitalize">{cycle.name}</TableCell>
                    <TableCell>{cycle.year}</TableCell>
                    <TableCell>{cycle.startDate ? format(cycle.startDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell>{cycle.endDate ? format(cycle.endDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cycle)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingCycle ? 'Edit Cycle' : 'Create New Cycle'}</DialogTitle>
                <DialogDescription>Set the start and end dates for a submission cycle.</DialogDescription>
            </DialogHeader>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cycle</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!!editingCycle}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a cycle" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="first">First Cycle</SelectItem>
                                            <SelectItem value="final">Final Cycle</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="year"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Year</FormLabel>
                                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)} disabled={!!editingCycle}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a year" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {years.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    
                    <div>
                        <FormLabel>Start Date</FormLabel>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                             <FormField control={form.control} name="startMonth" render={({field}) => (
                                <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Month"/></SelectTrigger></FormControl><SelectContent>{months.map(m=><SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                             )}/>
                             <FormField control={form.control} name="startDay" render={({field}) => (
                                <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Day"/></SelectTrigger></FormControl><SelectContent>{days.map(d=><SelectItem key={d} value={String(d)}>{d}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                             )}/>
                             <FormField control={form.control} name="startYear" render={({field}) => (
                                <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Year"/></SelectTrigger></FormControl><SelectContent>{years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                             )}/>
                        </div>
                    </div>
                    
                     <div>
                        <FormLabel>End Date</FormLabel>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            <FormField control={form.control} name="endMonth" render={({field}) => (
                                <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Month"/></SelectTrigger></FormControl><SelectContent>{months.map(m=><SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                            )}/>
                            <FormField control={form.control} name="endDay" render={({field}) => (
                                <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Day"/></SelectTrigger></FormControl><SelectContent>{days.map(d=><SelectItem key={d} value={String(d)}>{d}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                            )}/>
                            <FormField control={form.control} name="endYear" render={({field}) => (
                                <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Year"/></SelectTrigger></FormControl><SelectContent>{years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                            )}/>
                        </div>
                        <FormMessage>{form.formState.errors.endDay?.message}</FormMessage>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </form>
             </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
