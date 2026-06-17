'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from '@/firebase/firestore-wrapper';
import type { GADActivity, Campus, Unit, GADSector } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    PlusCircle, 
    Search, 
    Trash2, 
    Edit, 
    Users, 
    Target, 
    ShieldCheck, 
    CalendarCheck,
    Info,
    LayoutList,
    Building2,
    Activity as ActivityIcon
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

const sectors: GADSector[] = ['Solo Parent', 'PWD', 'Senior Citizen', 'Youth/Student', 'Employee', 'LGBTQA++', 'Indigenous People'];

const activitySchema = z.object({
  activityName: z.string().min(5, 'Please provide the full name of the event.'),
  activityId: z.string().min(1, 'Official Activity ID/Code is required.'),
  campusId: z.string().min(1, 'Please select the host campus.'),
  implementingUnitId: z.string().min(1, 'Please select the office organizing this event.'),
  male: z.coerce.number().min(0),
  female: z.coerce.number().min(0),
  actualBudgetUsed: z.coerce.number().min(0),
  actualOutput: z.string().optional(),
  varianceAnalysis: z.string().optional(),
  sectors: z.record(z.string(), z.object({
    male: z.coerce.number().min(0),
    female: z.coerce.number().min(0),
  })),
});

interface GADActivitiesTabProps {
  activities: GADActivity[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
}

export function GADActivitiesTab({ activities, campuses, units, selectedYear }: GADActivitiesTabProps) {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingActivity, setEditingActivity] = useState<GADActivity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activityName: '',
      activityId: '',
      campusId: userProfile?.campusId || '',
      implementingUnitId: userProfile?.unitId || '',
      male: 0,
      female: 0,
      actualBudgetUsed: 0,
      actualOutput: '',
      varianceAnalysis: '',
      sectors: sectors.reduce((acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }), {}),
    }
  });

  const watchCampusId = form.watch('campusId');
  const watchMale = form.watch('male');
  const watchFemale = form.watch('female');

  const filteredActivities = useMemo(() => {
    return activities.filter(a => 
      a.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.activityId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activities, searchTerm]);

  const onSubmit = async (values: z.infer<typeof activitySchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const data = {
        ...values,
        year: selectedYear,
        updatedAt: serverTimestamp(),
      };

      if (editingActivity) {
        await updateDoc(doc(firestore, 'gadActivities', editingActivity.id), data);
        toast({ title: 'Event Record Updated' });
      } else {
        await addDoc(collection(firestore, 'gadActivities'), { ...data, createdAt: serverTimestamp(), creatorId: userProfile?.id });
        toast({ title: 'Event Registered', description: 'Participant data has been successfully logged.' });
      }
      setIsDialogOpen(false);
      setEditingActivity(null);
      form.reset();
    } catch (e) {
      toast({ title: 'Error', description: 'Could not save activity.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (activity: GADActivity) => {
    setEditingActivity(activity);
    form.reset({
      activityName: activity.activityName,
      activityId: activity.activityId,
      campusId: activity.campusId,
      implementingUnitId: activity.implementingUnitId,
      male: activity.participants.male,
      female: activity.participants.female,
      actualBudgetUsed: activity.actualBudgetUsed || 0,
      actualOutput: activity.actualOutput || '',
      varianceAnalysis: activity.varianceAnalysis || '',
      sectors: activity.participants.sectors || sectors.reduce((acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }), {}),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !isAdmin || !window.confirm('Delete this event record?')) return;
    try {
      await deleteDoc(doc(firestore, 'gadActivities', id));
      toast({ title: 'Record Removed' });
    } catch (e) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activities or codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 shadow-sm"
          />
        </div>
        <Button onClick={() => { setEditingActivity(null); form.reset(); setIsDialogOpen(true); }} className="h-10 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest">
            <PlusCircle className="mr-2 h-4 w-4" /> Log Event Participant Data
        </Button>
      </div>

      <Card className="shadow-md border-primary/10 overflow-hidden">
          <Table>
              <TableHeader className="bg-muted/50">
                  <TableRow>
                      <TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Event & Implementing Unit</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Date Logged</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase">Reach (M/F)</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Budget Used</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Action</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredActivities.map(a => (
                      <TableRow key={a.id} className="hover:bg-muted/20 transition-colors group">
                          <TableCell className="pl-8 py-5">
                              <div className="space-y-1">
                                  <p className="font-black text-sm text-slate-900 leading-tight uppercase group-hover:text-primary transition-colors">{a.activityName}</p>
                                  <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="h-4 text-[8px] font-black uppercase bg-primary/5 text-primary border-none">{a.activityId}</Badge>
                                      <span className="text-[9px] font-bold text-muted-foreground">{unitMap.get(a.implementingUnitId)}</span>
                                  </div>
                              </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-600">
                              {a.createdAt?.toDate ? format(a.createdAt.toDate(), 'PP p') : '--'}
                          </TableCell>
                          <TableCell className="text-center">
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-inner">
                                  <span className="text-[10px] font-black text-indigo-600 tabular-nums">M: {a.participants.male}</span>
                                  <span className="text-slate-200">|</span>
                                  <span className="text-[10px] font-black text-rose-600 tabular-nums">F: {a.participants.female}</span>
                              </div>
                          </TableCell>
                          <TableCell className="text-right font-black text-emerald-600 tabular-nums">
                              â‚±{(a.actualBudgetUsed || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right pr-8">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(a)}><Edit className="h-4 w-4" /></Button>
                                  {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4" /></Button>}
                              </div>
                          </TableCell>
                      </TableRow>
                  ))}
                  {filteredActivities.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={5} className="h-40 text-center opacity-20">
                              <ActivityIcon className="h-10 w-10 mx-auto mb-2" />
                              <p className="text-[10px] font-black uppercase tracking-widest">No events registered for {selectedYear}</p>
                          </TableCell>
                      </TableRow>
                  )}
              </TableBody>
          </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
                <CalendarCheck className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Institutional Activity Log</span>
            </div>
            <DialogTitle>{editingActivity ? 'Update' : 'Register'} Event SDD Report</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 bg-white">
            <div className="p-8">
                <Form {...form}>
                    <form id="activity-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2"><Info className="h-4 w-4" /> 1. Activity Context</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="activityId" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Official Activity Code</FormLabel><FormControl><Input {...field} placeholder="e.g. QAO-2025-001" className="bg-slate-50 font-mono font-bold" /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="activityName" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Event Title</FormLabel><FormControl><Input {...field} placeholder="e.g. Gender Sensitivity Seminar" className="bg-slate-50 font-bold" /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="campusId" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Host Site</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={!isAdmin}>
                                            <FormControl><SelectTrigger className="h-11 bg-slate-50"><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                                            <SelectContent modal={false}>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="implementingUnitId" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Implementing Office</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={!isAdmin && !!userProfile?.unitId}>
                                            <FormControl><SelectTrigger className="h-11 bg-slate-50"><SelectValue placeholder="Select Office" /></SelectTrigger></FormControl>
                                            <SelectContent modal={false}>{units.filter(u => u.campusIds?.includes(watchCampusId)).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                            </div>
                        </section>

                        <section className="space-y-6 pt-6 border-t border-dashed">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2"><Users className="h-4 w-4" /> 2. Participant Headcount (SDD)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="male" render={({ field }) => (
                                    <FormItem className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col items-center">
                                        <FormLabel className="text-xs font-black uppercase text-indigo-700 mb-4">Total Male</FormLabel>
                                        <FormControl><Input type="number" {...field} className="h-14 text-3xl font-black text-center bg-white border-none shadow-inner" /></FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="female" render={({ field }) => (
                                    <FormItem className="p-6 rounded-2xl bg-rose-50 border border-rose-100 flex flex-col items-center">
                                        <FormLabel className="text-xs font-black uppercase text-rose-700 mb-4">Total Female</FormLabel>
                                        <FormControl><Input type="number" {...field} className="h-14 text-3xl font-black text-center bg-white border-none shadow-inner" /></FormControl>
                                    </FormItem>
                                )} />
                                <div className="p-6 rounded-2xl bg-slate-900 border-none flex flex-col items-center justify-center text-white">
                                    <p className="text-xs font-black uppercase opacity-60 mb-2">Grand Total</p>
                                    <span className="text-4xl font-black tabular-nums">{watchMale + watchFemale}</span>
                                    <span className="text-[10px] font-bold opacity-40 mt-1 uppercase tracking-tighter">Participants Counted</span>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6 pt-6 border-t border-dashed">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2"><LayoutList className="h-4 w-4" /> 3. Sectoral Distribution</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sectors.map((sector) => (
                                    <div key={sector} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-4 group hover:border-primary/20 transition-all">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-black uppercase text-slate-600">{sector}</p>
                                            <Badge variant="secondary" className="h-5 text-[8px] font-black bg-white border-none shadow-sm">{(form.watch(`sectors.${sector}.male`) || 0) + (form.watch(`sectors.${sector}.female`) || 0)} TOTAL</Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name={`sectors.${sector}.male`} render={({ field }) => (
                                                <div className="space-y-1">
                                                    <Label className="text-[9px] font-black uppercase text-indigo-400">Male</Label>
                                                    <Input type="number" {...field} className="h-8 text-xs font-black text-center bg-white" onChange={(e) => field.onChange(Number(e.target.value))} />
                                                </div>
                                            )} />
                                            <FormField control={form.control} name={`sectors.${sector}.female`} render={({ field }) => (
                                                <div className="space-y-1">
                                                    <Label className="text-[9px] font-black uppercase text-rose-400">Female</Label>
                                                    <Input type="number" {...field} className="h-8 text-xs font-black text-center bg-white" onChange={(e) => field.onChange(Number(e.target.value))} />
                                                </div>
                                            )} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-6 pt-6 border-t border-dashed">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2"><Target className="h-4 w-4" /> 4. Outcome & Budget</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="actualBudgetUsed" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Actual Budget Expended (â‚±)</FormLabel><FormControl><Input type="number" {...field} className="h-11 bg-emerald-50/30 border-emerald-100 font-mono font-black" /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="actualOutput" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Actual Output Status</FormLabel><FormControl><Input {...field} placeholder="e.g. Conducted sensitivity workshop" className="h-11 bg-slate-50" /></FormControl></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="varianceAnalysis" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-black uppercase">Variance / Implementation Remarks</FormLabel><FormControl><Textarea {...field} rows={3} placeholder="Explain any deviations from the original plan..." className="bg-slate-50 italic" /></FormControl></FormItem>
                            )} />
                        </section>
                    </form>
                </Form>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <div className="flex w-full items-center justify-between">
                <Button type="button" variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                <Button type="submit" form="activity-form" disabled={isSubmitting} className="min-w-[200px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] h-11">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    {editingActivity ? 'Update Event Record' : 'Commit to Registry'}
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
