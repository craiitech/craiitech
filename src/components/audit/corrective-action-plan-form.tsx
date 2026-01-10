
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, serverTimestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { User } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface CorrectiveActionPlanFormProps {
  findingId: string;
}

const formSchema = z.object({
  rootCauseAnalysis: z.string().min(1, 'Root cause analysis is required.'),
  correctionPlan: z.string().min(1, 'Immediate correction plan is required.'),
  correctiveAction: z.string().min(1, 'Long-term corrective action is required.'),
  responsiblePersonId: z.string().min(1, 'Please assign a responsible person.'),
  targetDate: z.date({ required_error: 'A target date is required.' }),
});

export function CorrectiveActionPlanForm({ findingId }: CorrectiveActionPlanFormProps) {
  const { user, userProfile, firestore } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usersQuery = useMemoFirebase(() => {
      if (!firestore || !userProfile) return null;
      return query(collection(firestore, 'users'), where('unitId', '==', userProfile.unitId));
  }, [firestore, userProfile]);

  const { data: unitUsers, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !user || !userProfile || !unitUsers) return;
    setIsSubmitting(true);

    const responsiblePerson = unitUsers.find(u => u.id === values.responsiblePersonId);

    const capData = {
      ...values,
      findingId: findingId,
      status: 'Submitted',
      authorId: user.uid,
      createdAt: serverTimestamp(),
      responsiblePersonName: responsiblePerson ? `${responsiblePerson.firstName} ${responsiblePerson.lastName}` : '',
    };

    try {
        await addDoc(collection(firestore, 'correctiveActionPlans'), capData);
        toast({ title: 'Success', description: 'Corrective Action Plan submitted.' });
        router.push('/audit');
    } catch(error) {
        console.error("Error submitting CAP:", error);
        toast({ title: 'Error', description: 'Could not submit the plan.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="rootCauseAnalysis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Root Cause Analysis</FormLabel>
              <FormControl><Textarea {...field} placeholder="Analyze and describe the root cause of the non-conformance..." /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="correctionPlan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Immediate Correction Plan</FormLabel>
              <FormControl><Textarea {...field} placeholder="Describe the immediate actions that will be taken to correct the issue." /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="correctiveAction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Long-Term Corrective Action</FormLabel>
              <FormControl><Textarea {...field} placeholder="Describe the long-term actions to prevent recurrence of this issue." /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="responsiblePersonId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Responsible Person</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingUsers}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a person from your unit" /></SelectTrigger></FormControl>
                            <SelectContent>{unitUsers?.map(u => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Target Completion Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
                )}
            />
        </div>
         <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Plan
            </Button>
        </div>
      </form>
    </Form>
  );
}
