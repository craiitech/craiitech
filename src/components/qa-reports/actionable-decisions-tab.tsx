
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, where, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { ManagementReviewOutput, Campus, Unit, ManagementReview } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, ClipboardList, Send, Building2, ListChecks, History, Info, User, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ActionableDecisionsTabProps {
  campuses: Campus[];
  units: Unit[];
}

const updateSchema = z.object({
  followUpRemarks: z.string().min(5, 'Please provide a descriptive update on actions taken.'),
  status: z.enum(['Open', 'On-going', 'Closed']),
  actionDate: z.string().min(1, 'Date of action is required.'),
  actionTakenBy: z.string().min(1, 'Name of the person who executed the action is required.'),
});

export function ActionableDecisionsTab({ campuses, units }: ActionableDecisionsTabProps) {
  const { userProfile, isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedOutput, setSelectedOutput] = useState<ManagementReviewOutput | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scoped Query
  const outputsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(collection(firestore, 'managementReviewOutputs'), orderBy('createdAt', 'desc'));
  }, [firestore, userProfile]);

  const { data: rawOutputs, isLoading: isLoadingOutputs } = useCollection<ManagementReviewOutput>(outputsQuery);

  const reviewsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'managementReviews') : null), [firestore]);
  const { data: reviews } = useCollection<ManagementReview>(reviewsQuery);

  const filteredOutputs = useMemo(() => {
    if (!rawOutputs || !userProfile) return [];
    if (isAdmin) return rawOutputs;

    return rawOutputs.filter(output => {
        // Precise matching based on assignments
        return (output.assignments || []).some(a => {
            const isInstitutional = a.campusId === 'university-wide';
            const isMyCampusAllUnits = a.campusId === userProfile.campusId && a.unitId === 'all-units';
            const isMySpecificUnit = a.campusId === userProfile.campusId && a.unitId === userProfile.unitId;
            
            return isInstitutional || isMyCampusAllUnits || isMySpecificUnit;
        });
    });
  }, [rawOutputs, userProfile, isAdmin]);

  const form = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: { status: 'Open', followUpRemarks: '', actionDate: format(new Date(), 'yyyy-MM-dd'), actionTakenBy: '' }
  });

  const handleOpenUpdate = (output: ManagementReviewOutput) => {
    setSelectedOutput(output);
    const safeDate = (d: any) => d?.toDate ? format(d.toDate(), 'yyyy-MM-dd') : (d ? format(new Date(d), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    
    form.reset({
        status: output.status,
        followUpRemarks: output.followUpRemarks || '',
        actionDate: safeDate(output.actionDate),
        actionTakenBy: output.actionTakenBy || (userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '')
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof updateSchema>) => {
    if (!firestore || !selectedOutput) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(firestore, 'managementReviewOutputs', selectedOutput.id);
      await updateDoc(docRef, {
        ...values,
        actionDate: Timestamp.fromDate(new Date(values.actionDate)),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Update Recorded', description: 'Your action update has been successfully logged.' });
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Update Failed', description: 'Could not save the update.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const campusMap = new Map(campuses.map(c => [c.id, c.name]));
  campusMap.set('university-wide', 'University-Wide');
  
  const unitMap = new Map(units.map(u => [u.id, u.name]));
  unitMap.set('all-units', 'All Units / Institutional');
  
  const reviewMap = new Map(reviews?.map(r => [r.id, r.title]));

  const safeFormatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return format(d, 'PP');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-black uppercase tracking-tight">Assigned MR Action Items</h3>
        <p className="text-xs text-muted-foreground font-medium">Decisions from Management Reviews requiring action from your unit or campus.</p>
      </div>

      <Card className="shadow-sm border-primary/10 overflow-hidden">
        <CardContent className="p-0">
          {isLoadingOutputs ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase">Decision & Source</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase">Responsibility</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase">Proposed Strategy</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-center">Deadline</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-right">Status</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredOutputs.map((output) => (
                    <TableRow key={output.id} className="hover:bg-muted/30">
                        <TableCell>
                        <div className="flex flex-col gap-1 max-w-xs">
                            <span className="font-bold text-sm text-slate-900 leading-snug">{output.description}</span>
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-primary/60 uppercase tracking-tighter">
                                <History className="h-2.5 w-2.5" />
                                From: {reviewMap.get(output.mrId) || 'Management Review'}
                            </div>
                            {output.actionTakenBy && (
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Action by: {output.actionTakenBy} ({safeFormatDate(output.actionDate)})
                                </div>
                            )}
                        </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                {(output.assignments || []).map((a, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                        <Badge variant="secondary" className="text-[8px] h-4 font-black bg-primary/5 text-primary border-none">
                                            {campusMap.get(a.campusId) || a.campusId}
                                        </Badge>
                                        <Badge variant="outline" className="text-[8px] h-4 font-bold border-muted-foreground/20 text-muted-foreground">
                                            {unitMap.get(a.unitId) || a.unitId}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                            <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                                {output.actionPlan ? `"${output.actionPlan}"` : "Unit defined plan"}
                            </p>
                        </TableCell>
                        <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-600">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {safeFormatDate(output.followUpDate)}
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <Badge 
                                className={cn(
                                    "text-[9px] font-black uppercase border-none px-2 shadow-sm",
                                    output.status === 'Open' ? "bg-rose-600 text-white" : 
                                    output.status === 'On-going' ? "bg-amber-500 text-amber-950" : 
                                    "bg-emerald-600 text-white"
                                )}
                            >
                                {output.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleOpenUpdate(output)} 
                            className="h-8 text-[10px] font-black uppercase tracking-widest bg-primary shadow-lg shadow-primary/10"
                        >
                            UPDATE ACTION
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                    {!isLoadingOutputs && filteredOutputs.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2 opacity-20">
                                <ListChecks className="h-10 w-10" />
                                <p className="text-xs font-bold uppercase tracking-widest">No action items assigned to you</p>
                            </div>
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
                <Send className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Decision Follow-up</span>
            </div>
            <DialogTitle className="text-xl font-bold">Provide Action Update</DialogTitle>
            <DialogDescription className="text-xs">Update the status and provide progress notes for this assigned review output.</DialogDescription>
          </DialogHeader>
          
          <div className="p-4 bg-muted/30 rounded-lg border mb-4 space-y-2">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Management Decision</p>
            <p className="text-sm font-bold leading-relaxed">{selectedOutput?.description}</p>
            <div className="flex items-center gap-4 pt-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Info className="h-3 w-3" /> Target: {safeFormatDate(selectedOutput?.followUpDate)}
                </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="actionDate" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Date of Action</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} className="bg-slate-50" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="actionTakenBy" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Executed By</FormLabel>
                        <FormControl>
                            <Input {...field} placeholder="Name of Person" className="bg-slate-50 font-bold" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="followUpRemarks" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Action Taken / Unit Progress</FormLabel>
                    <FormControl>
                        <Textarea {...field} placeholder="Describe the steps taken by your unit to address this MR decision..." rows={5} className="bg-slate-50" />
                    </FormControl>
                    <FormDescription className="text-[10px]">Provide evidence of completion or reasons for ongoing status.</FormDescription>
                    <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-primary">Current Lifecycle Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger className="bg-primary/5 border-primary/20 font-black"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Open">Open (No Action Yet)</SelectItem>
                            <SelectItem value="On-going">On-going (Implementation in progress)</SelectItem>
                            <SelectItem value="Closed">Closed (Implementation verified)</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[150px] shadow-xl shadow-primary/20 font-black">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-1.5" />}
                    Log Progress
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
