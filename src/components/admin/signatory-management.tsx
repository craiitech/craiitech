
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, UserCheck, Award, Save } from 'lucide-react';
import type { Signatories } from '@/lib/types';

const signatorySchema = z.object({
  qaoDirector: z.string().min(1, 'Director name is required.'),
  qmsHead: z.string().min(1, 'QMS Head name is required.'),
  accreditationHead: z.string().min(1, 'Accreditation Head name is required.'),
});

export function SignatoryManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: currentSignatories, isLoading } = useDoc<Signatories>(signatoryRef);

  const form = useForm<z.infer<typeof signatorySchema>>({
    resolver: zodResolver(signatorySchema),
    defaultValues: {
      qaoDirector: '',
      qmsHead: '',
      accreditationHead: '',
    },
  });

  useEffect(() => {
    if (currentSignatories) {
      form.reset({
        qaoDirector: currentSignatories.qaoDirector || '',
        qmsHead: currentSignatories.qmsHead || '',
        accreditationHead: currentSignatories.accreditationHead || '',
      });
    }
  }, [currentSignatories, form]);

  const onSubmit = async (values: z.infer<typeof signatorySchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await setDoc(doc(firestore, 'system', 'signatories'), {
        ...values,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast({ title: 'Signatories Updated', description: 'Institutional signatures have been successfully updated across all reports.' });
    } catch (error) {
      console.error('Error updating signatories:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update signatories. Please check your permissions.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="max-w-2xl border-primary/20 shadow-md">
      <CardHeader className="bg-primary/5 border-b">
        <div className="flex items-center gap-2 mb-1">
            <UserCheck className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Institutional Authority Configuration</span>
        </div>
        <CardTitle>Institutional Signatories</CardTitle>
        <CardDescription>
          Configure the authorized names that appear on official printed notices, audit logs, and compliance certificates.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            <FormField
              control={form.control}
              name="qaoDirector"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-slate-700">Director, Quality Assurance Office</FormLabel>
                  <FormControl>
                    <div className="relative">
                        <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                        <Input placeholder="e.g., DR. MARVIN RICK G. FORCADO" {...field} className="pl-9 font-bold" />
                    </div>
                  </FormControl>
                  <FormDescription className="text-[10px]">Primary signatory for Notices of Compliance and official QA directives.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="qmsHead"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-slate-700">Head, QMS Unit</FormLabel>
                    <FormControl>
                        <Input placeholder="Enter name" {...field} className="font-semibold" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="accreditationHead"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-slate-700">Head, Accreditation Unit</FormLabel>
                    <FormControl>
                        <Input placeholder="Enter name" {...field} className="font-semibold" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t py-4">
            <Button type="submit" disabled={isSubmitting} className="shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px]">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Apply Changes Universally
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
