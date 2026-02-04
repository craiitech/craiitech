
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import type { UnitMonitoringRecord, Campus, Unit } from '@/lib/types';
import { monitoringChecklistItems } from '@/lib/monitoring-checklist-items';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableRow } from '../ui/table';

interface MonitoringFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  record: UnitMonitoringRecord | null;
  campuses: Campus[];
  units: Unit[];
}

const formSchema = z.object({
  visitDate: z.date({ required_error: 'Date of visit is required.' }),
  campusId: z.string().min(1, 'Please select a campus.'),
  unitId: z.string().min(1, 'Please select a unit.'),
  roomNumber: z.string().optional(),
  observations: z.array(z.object({
    item: z.string(),
    status: z.enum(['Available', 'Not Available', 'For Improvement']),
    remarks: z.string().optional(),
  })),
  generalRemarks: z.string().optional(),
});

export function MonitoringFormDialog({ isOpen, onOpenChange, record, campuses, units }: MonitoringFormDialogProps) {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      visitDate: new Date(),
      observations: monitoringChecklistItems.map(item => ({
        item,
        status: 'Available',
        remarks: ''
      })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'observations',
  });

  const selectedCampusId = form.watch('campusId');
  const unitsForCampus = useMemo(() => {
    if (!units) return [];
    return units.filter(u => u.campusIds?.includes(selectedCampusId));
  }, [units, selectedCampusId]);

  useEffect(() => {
    if (isOpen) {
      if (record) {
        const visitDate = record.visitDate instanceof Timestamp ? record.visitDate.toDate() : new Date(record.visitDate);
        form.reset({
          ...record,
          visitDate,
          observations: monitoringChecklistItems.map(item => {
            const existing = record.observations?.find(obs => obs.item === item);
            return {
              item,
              status: existing?.status || 'Available',
              remarks: existing?.remarks || '',
            };
          }),
        });
      } else {
        form.reset({
          visitDate: new Date(),
          campusId: '',
          unitId: '',
          roomNumber: '',
          generalRemarks: '',
          observations: monitoringChecklistItems.map(item => ({ item, status: 'Available', remarks: '' })),
        });
      }
    }
  }, [record, isOpen, form]);

  useEffect(() => {
    if(!record && isOpen) {
        // Only clear unitId if campus changes and we are NOT editing an existing record
        // Or if we are in a fresh 'New Visit' state.
        const currentUnitId = form.getValues('unitId');
        if (currentUnitId && !unitsForCampus.some(u => u.id === currentUnitId)) {
            form.setValue('unitId', '');
        }
    }
  }, [selectedCampusId, form, record, isOpen, unitsForCampus]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !userProfile) {
      toast({ title: 'Error', description: 'User not logged in.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    const recordData = {
      ...values,
      monitorId: userProfile.id,
      monitorName: `${userProfile.firstName} ${userProfile.lastName}`,
    };

    try {
      if (record) {
        const recordRef = doc(firestore, 'unitMonitoringRecords', record.id);
        await setDoc(recordRef, { ...recordData, createdAt: record.createdAt }, { merge: true });
        toast({ title: 'Success', description: 'Monitoring record updated.' });
      } else {
        const collectionRef = collection(firestore, 'unitMonitoringRecords');
        await addDoc(collectionRef, { ...recordData, createdAt: serverTimestamp() });
        toast({ title: 'Success', description: 'New monitoring record saved.' });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving monitoring record:", error);
      toast({ title: 'Error', description: 'Could not save record.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{record ? 'Edit' : 'New'} Unit Monitoring Record</DialogTitle>
          <DialogDescription>
            Fill out the form to log the findings from a unit visit.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden space-y-4">
            <ScrollArea className="flex-1 p-1">
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField control={form.control} name="visitDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Date of Visit</FormLabel>
                      <Popover><PopoverTrigger asChild>
                        <FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl>
                      </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent></Popover><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="campusId" render={({ field }) => (
                    <FormItem><FormLabel>Campus</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                        <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="unitId" render={({ field }) => (
                    <FormItem><FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCampusId}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger></FormControl>
                        <SelectContent>{unitsForCampus.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="roomNumber" render={({ field }) => (
                    <FormItem><FormLabel>Room #</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium w-[30%] text-sm">{field.item}</TableCell>
                          <TableCell className="w-[30%]">
                            <FormField control={form.control} name={`observations.${index}.status`} render={({ field }) => (
                              <FormItem><FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Available">Available</SelectItem>
                                    <SelectItem value="Not Available">Not Available</SelectItem>
                                    <SelectItem value="For Improvement">For Improvement</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl><FormMessage /></FormItem>
                            )} />
                          </TableCell>
                          <TableCell className="w-[40%]">
                            <FormField control={form.control} name={`observations.${index}.remarks`} render={({ field }) => (
                              <FormItem><FormControl><Input placeholder="Remarks..." {...field} className="h-8 text-xs" /></FormControl><FormMessage /></FormItem>
                            )} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <FormField control={form.control} name="generalRemarks" render={({ field }) => (
                  <FormItem><FormLabel>General Remarks</FormLabel><FormControl><Textarea {...field} placeholder="Add any overall comments or summaries here..."/></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </ScrollArea>
            <DialogFooter className="px-4 pb-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Record
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
