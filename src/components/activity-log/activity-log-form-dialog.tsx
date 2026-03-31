
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, 
    Save, 
    ShieldCheck, 
    Clock, 
    Calendar, 
    CheckCircle2, 
    Info, 
    Target,
    Activity
} from 'lucide-react';
import { format } from 'date-fns';
import type { EmployeeActivity } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ActivityLogFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activity: EmployeeActivity | null;
}

const formSchema = z.object({
  date: z.string().min(1, 'Date is required.'),
  startTime: z.string().min(1, 'Start time is required.'),
  endTime: z.string().min(1, 'End time is required.'),
  activityParticular: z.string().min(5, 'Description must be at least 5 characters.'),
  status: z.enum(['Completed', 'In Progress', 'Open', 'Postponed']),
  output: z.string().optional(),
  remarks: z.string().optional(),
});

export function ActivityLogFormDialog({ isOpen, onOpenChange, activity }: ActivityLogFormDialogProps) {
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '08:00',
      endTime: '17:00',
      status: 'Completed',
      activityParticular: '',
      output: '',
      remarks: '',
    }
  });

  useEffect(() => {
    if (activity && isOpen) {
      const aDate = activity.date instanceof Timestamp ? activity.date.toDate() : new Date(activity.date);
      form.reset({
        date: format(aDate, 'yyyy-MM-dd'),
        startTime: activity.startTime,
        endTime: activity.endTime,
        activityParticular: activity.activityParticular,
        status: activity.status,
        output: activity.output || '',
        remarks: activity.remarks || '',
      });
    } else if (!activity && isOpen) {
      form.reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '08:00',
        endTime: '17:00',
        status: 'Completed',
        activityParticular: '',
        output: '',
        remarks: '',
      });
    }
  }, [activity, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !user || !userProfile) return;
    setIsSubmitting(true);
    try {
      const data = {
        ...values,
        userId: user.uid,
        userName: `${userProfile.firstName} ${userProfile.lastName}`,
        unitId: userProfile.unitId,
        campusId: userProfile.campusId,
        date: Timestamp.fromDate(new Date(values.date)),
        updatedAt: serverTimestamp(),
      };

      if (activity) {
        await setDoc(doc(firestore, 'employeeActivities', activity.id), data, { merge: true });
        toast({ title: 'Task Updated' });
      } else {
        await addDoc(collection(firestore, 'employeeActivities'), { ...data, createdAt: serverTimestamp() });
        toast({ title: 'Task Logged', description: 'Institutional activity recorded.' });
      }
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl border-primary/20 shadow-2xl overflow-hidden p-0">
        <DialogHeader className="bg-slate-50 p-6 border-b shrink-0">
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Work log</span>
          </div>
          <DialogTitle>{activity ? 'Edit' : 'Record'} Daily Activity</DialogTitle>
          <DialogDescription className="text-xs">Document your tasks and accomplishments for institutional tracking.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Calendar className="h-3 w-3" /> Conduct Date
                        </FormLabel>
                        <FormControl><Input type="date" {...field} className="bg-slate-50 font-bold" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Activity className="h-3 w-3" /> Execution Status
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="bg-primary/5 border-primary/20 font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Open">Open (Planned)</SelectItem>
                                <SelectItem value="Postponed">Postponed</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-2 gap-6 p-4 rounded-xl border border-dashed bg-muted/10">
                <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-2.5 w-2.5" /> Start Time
                        </FormLabel>
                        <FormControl><Input type="time" {...field} className="bg-white h-9 text-xs font-black tabular-nums" /></FormControl>
                    </FormItem>
                )} />
                <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-2.5 w-2.5" /> End Time
                        </FormLabel>
                        <FormControl><Input type="time" {...field} className="bg-white h-9 text-xs font-black tabular-nums" /></FormControl>
                    </FormItem>
                )} />
            </div>

            <FormField control={form.control} name="activityParticular" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Activity Particulars / Description</FormLabel>
                    <FormControl><Textarea {...field} rows={3} placeholder="Describe the task executed..." className="bg-slate-50" /></FormControl>
                    <FormDescription className="text-[9px]">Specify the actual work performed during this session.</FormDescription>
                    <FormMessage />
                </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="output" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Target Output
                        </FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Approved Minutes" className="bg-emerald-50/20 border-emerald-100 text-xs font-bold" /></FormControl>
                    </FormItem>
                )} />
                <FormField control={form.control} name="remarks" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">Additional Remarks</FormLabel>
                        <FormControl><Input {...field} placeholder="Internal notes..." className="bg-slate-50 text-xs" /></FormControl>
                    </FormItem>
                )} />
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-800 leading-relaxed italic">
                    <strong>Institutional Efficiency:</strong> Ensure activities are aligned with your unit's current **Operational Plan**. Verified logs contribute to your annual performance assessment.
                </p>
            </div>

            <DialogFooter className="pt-4 border-t mt-6">
                <Button type="button" variant="ghost" className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground" onClick={() => onOpenChange(false)}>Discard</Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[160px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] tracking-widest h-11">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 mr-1.5" />}
                    {activity ? 'Update Log' : 'Commit to Logbook'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
