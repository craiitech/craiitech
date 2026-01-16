
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import type { EomsPolicyManual } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const manualSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  googleDriveLink: z.string().url('Please enter a valid Google Drive link.'),
  revisionNumber: z.string().min(1, 'Revision number is required.'),
  pageCount: z.coerce.number().min(1, 'Number of pages is required.'),
  executionYear: z.string({ required_error: 'Year is required.' }),
  executionMonth: z.string({ required_error: 'Month is required.' }),
  executionDay: z.string({ required_error: 'Day is required.' }),
});

const sections = Array.from({ length: 10 }, (_, i) => ({
  id: `section-${i + 1}`,
  number: i + 1,
}));

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
const months = [
  { value: '0', label: 'January' }, { value: '1', label: 'February' }, { value: '2', label: 'March' },
  { value: '3', label: 'April' }, { value: '4', label: 'May' }, { value: '5', label: 'June' },
  { value: '6', label: 'July' }, { value: '7', label: 'August' }, { value: '8', label: 'September' },
  { value: '9', label: 'October' }, { value: '10', label: 'November' }, { value: '11', label: 'December' },
];
const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

export function EomsPolicyManualManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSection, setSelectedSection] = useState<{ id: string; number: number } | null>(null);

  const [manuals, setManuals] = useState<EomsPolicyManual[]>([]);
  const [isLoadingManuals, setIsLoadingManuals] = useState(true);

  useEffect(() => {
    if (!firestore) return;
    setIsLoadingManuals(true);
    const fetchManuals = async () => {
      try {
        const sectionIds = Array.from({ length: 10 }, (_, i) => `section-${i + 1}`);
        const promises = sectionIds.map(id => getDoc(doc(firestore, 'eomsPolicyManuals', id)));
        const docSnapshots = await Promise.all(promises);
        const fetchedManuals = docSnapshots
          .filter(snap => snap.exists())
          .map(snap => snap.data() as EomsPolicyManual);
        setManuals(fetchedManuals);
      } catch (error) {
        console.error("Error fetching EOMS manuals:", error);
        toast({ title: 'Error', description: 'Could not load manual data.', variant: 'destructive' });
      } finally {
        setIsLoadingManuals(false);
      }
    };
    fetchManuals();
  }, [firestore, isSubmitting, toast]);

  const manualMap = useMemo(() => {
    return new Map(manuals.map(m => [m.id, m]));
  }, [manuals]);

  const form = useForm<z.infer<typeof manualSchema>>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      title: '',
      googleDriveLink: '',
      revisionNumber: '',
    }
  });

  const handleOpenDialog = (section: { id: string; number: number }) => {
    setSelectedSection(section);
    const existingManual = manualMap.get(section.id);
    const executionDate = existingManual?.executionDate?.toDate();
    form.reset({
      title: existingManual?.title || `Section ${section.number}`,
      googleDriveLink: existingManual?.googleDriveLink || '',
      revisionNumber: existingManual?.revisionNumber || '',
      pageCount: existingManual?.pageCount || undefined,
      executionYear: executionDate ? String(executionDate.getFullYear()) : undefined,
      executionMonth: executionDate ? String(executionDate.getMonth()) : undefined,
      executionDay: executionDate ? String(executionDate.getDate()) : undefined,
    });
  };

  const handleCloseDialog = () => {
    setSelectedSection(null);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof manualSchema>) => {
    if (!firestore || !selectedSection) return;
    setIsSubmitting(true);

    const manualRef = doc(firestore, 'eomsPolicyManuals', selectedSection.id);
    const manualData = {
      title: values.title,
      googleDriveLink: values.googleDriveLink,
      revisionNumber: values.revisionNumber,
      pageCount: values.pageCount,
      executionDate: new Date(Number(values.executionYear), Number(values.executionMonth), Number(values.executionDay)),
      id: selectedSection.id,
      sectionNumber: selectedSection.number,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(manualRef, manualData, { merge: true });
      toast({ title: 'Success', description: `Manual Section ${selectedSection.number} has been saved.` });
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving manual section:', error);
      toast({ title: 'Error', description: 'Could not save the manual section.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>EOMS Policy Manual</CardTitle>
          <CardDescription>
            Manage the 10 sections of the official EOMS Policy Manual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Revision No.</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Execution Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => {
                  if (isLoadingManuals) {
                    return (
                      <TableRow key={section.id}>
                        <TableCell className="font-medium">{section.number}</TableCell>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-9 w-24" />
                        </TableCell>
                      </TableRow>
                    )
                  }
                  const manual = manualMap.get(section.id);
                  return (
                    <TableRow key={section.id}>
                      <TableCell className="font-medium">{section.number}</TableCell>
                      <TableCell>{manual?.title || 'Not Set'}</TableCell>
                      <TableCell>{manual?.revisionNumber || '-'}</TableCell>
                      <TableCell>{manual?.pageCount || '-'}</TableCell>
                      <TableCell>{manual?.executionDate ? format(manual.executionDate.toDate(), 'PPP') : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(section)}>
                          <Edit className="mr-2 h-4 w-4" /> {manual ? 'Edit' : 'Add'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedSection} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Manual Section {selectedSection?.number}</DialogTitle>
            <DialogDescription>
              Enter the details for this section of the EOMS Policy Manual.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="googleDriveLink" render={({ field }) => (
                <FormItem><FormLabel>Google Drive Link</FormLabel><FormControl><Input placeholder="https://drive.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="revisionNumber" render={({ field }) => (
                  <FormItem><FormLabel>Revision No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pageCount" render={({ field }) => (
                  <FormItem><FormLabel>No. of Pages</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              
              <div className="space-y-2">
                <FormLabel>Execution Date</FormLabel>
                <div className="grid grid-cols-3 gap-2">
                  <FormField control={form.control} name="executionMonth" render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="executionDay" render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{days.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="executionYear" render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Section
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
