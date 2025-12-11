
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Campus } from '@/lib/types';

const campusSchema = z.object({
  name: z.string().min(3, 'Campus name must be at least 3 characters.'),
  location: z.string().min(3, 'Location must be at least 3 characters.'),
});

export function CampusManagement() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const campusesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'campuses') : null),
    [firestore]
  );
  const { data: campuses, isLoading } = useCollection<Campus>(campusesQuery);

  const form = useForm<z.infer<typeof campusSchema>>({
    resolver: zodResolver(campusSchema),
    defaultValues: { name: '', location: '' },
  });

  const onSubmit = async (values: z.infer<typeof campusSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'campuses'), {
        ...values,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'New campus created.' });
      form.reset();
    } catch (error) {
      console.error('Error creating campus:', error);
      toast({
        title: 'Error',
        description: 'Could not create campus.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add New Campus</CardTitle>
          <CardDescription>
            Create a new campus to be used in the system.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campus Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Campus" {...field} />
                    </FormControl>
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
                      <Input placeholder="e.g., Odiongan, Romblon" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Campus'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Existing Campuses</CardTitle>
          <CardDescription>
            A list of all campuses currently in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campuses?.map((campus) => (
                  <TableRow key={campus.id}>
                    <TableCell>{campus.name}</TableCell>
                    <TableCell>{campus.location}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
