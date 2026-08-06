'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from '@/firebase/firestore-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wrench, Camera, CheckCircle2 } from 'lucide-react';
import { logFiamoActivity } from '@/lib/fiamo-activity-log';
import type { RepairCategory } from '@/lib/types';

const formSchema = z.object({
  category: z.enum(['Ceiling', 'Roofing', 'ComfortRoom', 'Walls', 'Other'] as const, {
    required_error: 'Please select a repair category.',
  }),
  location: z.string().min(3, 'Please describe the location (building, room, area).'),
  description: z.string().min(10, 'Please describe the repair needed in detail.'),
  photoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

interface RepairRequestFormProps {
  onCreated?: () => void;
  campusId?: string;
  unitId?: string;
}

export function RepairRequestForm({ onCreated, campusId, unitId }: RepairRequestFormProps) {
  const { userProfile, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: 'Other',
      location: '',
      description: '',
      photoUrl: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    try {
      const reqData = {
        requestedBy: userProfile.id,
        requestedByName: `${userProfile.firstName} ${userProfile.lastName}`,
        category: values.category,
        description: values.description,
        location: values.location,
        status: 'Submitted',
        photos: values.photoUrl ? [values.photoUrl] : [],
        createdAt: serverTimestamp(),
        campusId: campusId || userProfile.campusId,
        unitId: unitId || userProfile.unitId,
      };
      const ref = await addDoc(collection(firestore, 'repairRequests'), reqData);

      await logFiamoActivity({
        firestore,
        type: 'repair_request_created',
        module: 'RepairRequest',
        recordId: ref.id,
        userId: userProfile.id,
        userName: `${userProfile.firstName} ${userProfile.lastName}`,
        userRole: userRole || 'Unit Head',
        description: `Repair request created: ${values.category} at ${values.location}`,
        details: { category: values.category, location: values.location },
        campusId: reqData.campusId,
        unitId: reqData.unitId,
      });

      toast({
        title: 'Repair Request Submitted',
        description: 'Your request has been sent to the Unit Coordinator for review.',
      });
      form.reset();
      onCreated?.();
    } catch (error) {
      console.error('Error submitting repair request:', error);
      toast({
        title: 'Submission Failed',
        description: 'Could not submit the repair request.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="bg-primary/5 border-b">
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="h-5 w-5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Repair Request</span>
        </div>
        <CardTitle>Submit a Repair Request</CardTitle>
        <CardDescription>
          Report a facility issue that needs repair. Your Unit Coordinator will review and assign it.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-5 pt-6">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repair Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 font-bold">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(['Ceiling', 'Roofing', 'ComfortRoom', 'Walls', 'Other'] as RepairCategory[]).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. CET Building, Room 201 (Ceiling)" className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description of Repair Needed</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Describe the issue in detail..." rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" /> Photo Attachment URL (optional)
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://drive.google.com/... or storage URL" className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="bg-muted/10 border-t py-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px]"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Submit Repair Request
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
