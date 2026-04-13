
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
    Home, 
    Calendar, 
    Info, 
    Briefcase,
    GraduationCap,
    Activity,
    ClipboardCheck
} from 'lucide-react';
import { format } from 'date-fns';
import type { WfhActivity } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface WfhActivityFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activity: WfhActivity | null;
}

const formSchema = z.object({
  date: z.string().min(1, 'Date is required.'),
  type: z.enum(['Teaching', 'Non-Teaching']),
  natureOfAppointment: z.string().min(1, 'Nature of appointment is required.'),
  deliverables: z.string().min(5, 'Deliverables must be at least 5 characters.'),
  accomplishment: z.string().min(5, 'Accomplishment must be at least 5 characters.'),
  teachingLoad: z.string().optional(),
  subjectsTaught: z.string().optional(),
  officeAssignment: z.string().optional(),
  otherDesignations: z.string().optional(),
});

export function WfhActivityFormDialog({ isOpen, onOpenChange, activity }: WfhActivityFormDialogProps) {
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'Non-Teaching',
      natureOfAppointment: 'Permanent',
      deliverables: '',
      accomplishment: '',
      teachingLoad: '',
      subjectsTaught: '',
      officeAssignment: '',
      otherDesignations: '',
    }
  });

  const watchType = form.watch('type');

  useEffect(() => {
    if (activity && isOpen) {
      const aDate = activity.date instanceof Timestamp ? activity.date.toDate() : new Date(activity.date);
      form.reset({
        date: format(aDate, 'yyyy-MM-dd'),
        type: activity.type,
        natureOfAppointment: activity.natureOfAppointment,
        deliverables: activity.deliverables,
        accomplishment: activity.accomplishment,
        teachingLoad: activity.teachingLoad || '',
        subjectsTaught: activity.subjectsTaught || '',
        officeAssignment: activity.officeAssignment || '',
        otherDesignations: activity.otherDesignations || '',
      });
    } else if (!activity && isOpen) {
      form.reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'Non-Teaching',
        natureOfAppointment: 'Permanent',
        deliverables: '',
        accomplishment: '',
        teachingLoad: '',
        subjectsTaught: '',
        officeAssignment: '',
        otherDesignations: '',
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
        status: 'Pending',
        updatedAt: serverTimestamp(),
      };

      if (activity) {
        await setDoc(doc(firestore, 'wfhActivities', activity.id), data, { merge: true });
        toast({ title: 'Record Updated' });
      } else {
        await addDoc(collection(firestore, 'wfhActivities'), { ...data, createdAt: serverTimestamp() });
        toast({ title: 'WFH Activity Logged', description: 'Institutional remote record created.' });
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
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Work from Home Monitor</span>
          </div>
          <DialogTitle>{activity ? 'Edit' : 'Record'} WFH Activity</DialogTitle>
          <DialogDescription className="text-xs">Document your remote accomplishments for institutional monitoring.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Calendar className="h-3 w-3" /> Date
                        </FormLabel>
                        <FormControl><Input type="date" {...field} className="bg-slate-50 font-bold" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Activity className="h-3 w-3" /> Personnel Type
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="bg-primary/5 border-primary/20 font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Teaching">Teaching Faculty</SelectItem>
                                <SelectItem value="Non-Teaching">Non-Teaching Staff</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormItem>
                )} />
            </div>

            <div className="p-4 rounded-xl border bg-muted/5 space-y-4">
                <FormField control={form.control} name="natureOfAppointment" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-600">Nature of Appointment</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Permanent, Lecturer, Part-Time" className="bg-white h-9 text-xs" /></FormControl>
                    </FormItem>
                )} />

                {watchType === 'Teaching' ? (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                        <FormField control={form.control} name="teachingLoad" render={({ field }) => (
                            <FormItem><FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Teaching Load (Units)</FormLabel><FormControl><Input {...field} placeholder="e.g. 18" className="h-8 text-xs bg-white" /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="subjectsTaught" render={({ field }) => (
                            <FormItem><FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Subjects Taught</FormLabel><FormControl><Input {...field} placeholder="e.g. ITEC 101" className="h-8 text-xs bg-white" /></FormControl></FormItem>
                        )} />
                    </div>
                ) : (
                    <FormField control={form.control} name="officeAssignment" render={({ field }) => (
                        <FormItem className="animate-in fade-in duration-300"><FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Office Assignment</FormLabel><FormControl><Input {...field} placeholder="e.g. ACCT Office" className="h-8 text-xs bg-white" /></FormControl></FormItem>
                    )} />
                )}
                
                <FormField control={form.control} name="otherDesignations" render={({ field }) => (
                    <FormItem><FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Other Designations</FormLabel><FormControl><Input {...field} placeholder="e.g. QMS Coordinator" className="h-8 text-xs bg-white" /></FormControl></FormItem>
                )} />
            </div>

            <div className="space-y-4">
                <FormField control={form.control} name="deliverables" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <ClipboardCheck className="h-3.5 w-3.5" /> Deliverables
                        </FormLabel>
                        <FormControl><Textarea {...field} rows={3} placeholder="What was approved for this period?" className="bg-slate-50 text-xs" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="accomplishment" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Accomplishment
                        </FormLabel>
                        <FormControl><Textarea {...field} rows={3} placeholder="Specify actual results and evidence..." className="bg-emerald-50/10 border-emerald-100 text-xs font-medium" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-800 leading-relaxed italic">
                    <strong>Institutional Monitoring:</strong> WFH sheets are audited monthly. Ensure that deliverables are approved by your immediate head before execution.
                </p>
            </div>

            <DialogFooter className="pt-4 border-t mt-6">
                <Button type="button" variant="ghost" className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground" onClick={() => onOpenChange(false)}>Discard</Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[160px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] tracking-widest h-11">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 mr-1.5" />}
                    {activity ? 'Update Entry' : 'Log WFH Task'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
