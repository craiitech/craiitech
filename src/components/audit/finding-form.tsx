
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { ISOClause } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface FindingFormProps {
  scheduleId: string;
  clausesToAudit: ISOClause[];
}

const formSchema = z.object({
  type: z.enum(['Non-Conformance', 'Observation for Improvement', 'Commendation']),
  isoClause: z.string().min(1, 'Please select an ISO clause.'),
  description: z.string().min(1, 'Description is required.'),
  evidence: z.string().min(1, 'Evidence is required.'),
});

export function FindingForm({ scheduleId, clausesToAudit }: FindingFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !user) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(firestore, 'auditFindings'), {
        ...values,
        auditScheduleId: scheduleId,
        authorId: user.uid,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'New finding has been recorded.' });
      form.reset({ type: values.type, isoClause: '', description: '', evidence: ''});
    } catch (error) {
      console.error("Error logging finding:", error);
      toast({ title: 'Error', description: 'Could not record the finding.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type of Finding</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Non-Conformance">Non-Conformance</SelectItem>
                    <SelectItem value="Observation for Improvement">Observation for Improvement</SelectItem>
                    <SelectItem value="Commendation">Commendation</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="isoClause"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ISO Clause</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a clause" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {clausesToAudit.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.id} - {c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} placeholder="Describe the finding in detail..."/></FormControl>
                <FormMessage />
              </FormItem>
            )}
        />
         <FormField
            control={form.control}
            name="evidence"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Evidence</FormLabel>
                <FormControl><Textarea {...field} placeholder="Describe or link to the evidence..."/></FormControl>
                <FormMessage />
              </FormItem>
            )}
        />
        <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Finding
            </Button>
        </div>
      </form>
    </Form>
  );
}
