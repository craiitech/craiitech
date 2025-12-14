
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, setDoc } from 'firebase/firestore';
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
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Edit, CalendarIcon, Trash2 } from 'lucide-react';
import type { Cycle } from '@/lib/types';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '../ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const cycleSchema = z.object({
  name: z.enum(['first', 'final']),
  year: z.number().min(new Date().getFullYear() - 5).max(new Date().getFullYear() + 5),
  startDate: z.date(),
  endDate: z.date(),
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date.',
  path: ['endDate'],
});

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

export function CycleManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  
  const [isStartPickerOpen, setIsStartPickerOpen] = useState(false);
  const [isEndPickerOpen, setIsEndPickerOpen] = useState(false);

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
      form.reset({
        name: cycle.name as 'first' | 'final',
        year: cycle.year,
        startDate: cycle.startDate?.toDate(),
        endDate: cycle.endDate?.toDate(),
      });
    } else {
      form.reset({ year: currentYear, name: undefined, startDate: undefined, endDate: undefined });
    }
    setIsDialogOpen(true);
  }

  const onSubmit = (values: z.infer<typeof cycleSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const cycleId = `${values.name}-${values.year}`;
    const cycleRef = doc(firestore, 'cycles', cycleId);
    
    const cycleData = {
        id: cycleId,
        ...values
    };

    setDocumentNonBlocking(cycleRef, cycleData, { merge: true });

    toast({ title: 'Success', description: `Cycle '${cycleData.name} ${cycleData.year}' saved.` });
    
    setIsSubmitting(false);
    setIsDialogOpen(false);
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
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Start Date</FormLabel>
                                <Popover open={isStartPickerOpen} onOpenChange={setIsStartPickerOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar 
                                            mode="single" 
                                            selected={field.value} 
                                            onSelect={(date) => {
                                                field.onChange(date);
                                                setIsStartPickerOpen(false);
                                            }}
                                            initialFocus 
                                            captionLayout="dropdown-nav"
                                            fromYear={currentYear - 5}
                                            toYear={currentYear + 5}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>End Date</FormLabel>
                                <Popover open={isEndPickerOpen} onOpenChange={setIsEndPickerOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar 
                                            mode="single" 
                                            selected={field.value} 
                                            onSelect={(date) => {
                                                field.onChange(date);
                                                setIsEndPickerOpen(false);
                                            }}
                                            disabled={(date) => date < form.getValues('startDate')} 
                                            initialFocus 
                                            captionLayout="dropdown-nav"
                                            fromYear={currentYear - 5}
                                            toYear={currentYear + 5}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
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
