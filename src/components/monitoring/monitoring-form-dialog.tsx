
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
import { Loader2, CalendarIcon, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '../ui/table';

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
  const { userProfile, isAdmin } = useUser();
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

  const isReadOnly = !isAdmin;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 border-b bg-card shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
                <ClipboardCheck className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-widest">IQA & Field Monitoring</span>
            </div>
            <DialogHeader>
                <DialogTitle className="text-xl">
                    {isReadOnly ? 'Viewing' : (record ? 'Edit' : 'New')} Unit Monitoring Record
                </DialogTitle>
                <DialogDescription>
                    {isReadOnly ? 'Findings from the on-site monitoring visit.' : 'Record objective observations and findings from on-site unit monitoring visits.'}
                </DialogDescription>
            </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">
                {/* Visit Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <FormField control={form.control} name="visitDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Visit</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild disabled={isReadOnly}>
                          <FormControl>
                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>
                              {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="campusId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campus</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select Campus" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="unitId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly || !selectedCampusId}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{unitsForCampus.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="roomNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office / Room #</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g., Room 101" disabled={isReadOnly} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Checklist Table */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">1</div>
                        Verification Checklist
                    </h3>
                    <div className="border rounded-lg overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[40%]">Monitoring Item / Document</TableHead>
                                    <TableHead className="w-[20%]">Status</TableHead>
                                    <TableHead className="w-[40%]">Remarks / Findings</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id} className="hover:bg-muted/20">
                                <TableCell className="font-medium text-sm py-3">{field.item}</TableCell>
                                <TableCell>
                                    <FormField control={form.control} name={`observations.${index}.status`} render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                                            <SelectTrigger className="h-8 text-xs bg-background">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Available">Available</SelectItem>
                                                <SelectItem value="Not Available">Not Available</SelectItem>
                                                <SelectItem value="For Improvement">For Improvement</SelectItem>
                                            </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )} />
                                </TableCell>
                                <TableCell>
                                    <FormField control={form.control} name={`observations.${index}.remarks`} render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input placeholder={isReadOnly ? "" : "Add findings..."} {...field} className="h-8 text-xs bg-background" disabled={isReadOnly} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )} />
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* General Remarks */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">2</div>
                        Final Assessment
                    </h3>
                    <FormField control={form.control} name="generalRemarks" render={({ field }) => (
                    <FormItem>
                        <FormLabel>General Remarks / Summary of Visit</FormLabel>
                        <FormControl>
                            <Textarea {...field} rows={5} placeholder={isReadOnly ? "" : "Provide an overall summary..."} disabled={isReadOnly} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )} />
                </div>
              </div>
            </ScrollArea>

            <div className="p-6 border-t bg-card shrink-0">
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        {isReadOnly ? 'Close' : 'Cancel'}
                    </Button>
                    {!isReadOnly && (
                        <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {record ? 'Update Record' : 'Save Monitoring Record'}
                        </Button>
                    )}
                </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
