
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { EomsPolicyManual } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Edit, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

const manualSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  googleDriveLink: z.string().url('Please enter a valid Google Drive link.'),
  revisionNumber: z.string().min(1, 'Revision number is required.'),
  pageCount: z.coerce.number().min(1, 'Number of pages is required.'),
  executionDate: z.date({ required_error: 'An execution date is required.'}),
});

const sections = Array.from({ length: 10 }, (_, i) => ({
  id: `section-${i + 1}`,
  number: i + 1,
}));

export function EomsPolicyManualManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSection, setSelectedSection] = useState<{id: string; number: number} | null>(null);

  const manualsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'eomsPolicyManuals') : null), [firestore]);
  const { data: manuals, isLoading: isLoadingManuals } = useCollection<EomsPolicyManual>(manualsQuery);
  
  const manualMap = useMemo(() => {
    if (!manuals) return new Map();
    return new Map(manuals.map(m => [m.id, m]));
  }, [manuals]);

  const form = useForm<z.infer<typeof manualSchema>>({
    resolver: zodResolver(manualSchema),
  });
  
  const handleOpenDialog = (section: {id: string; number: number}) => {
    setSelectedSection(section);
    const existingManual = manualMap.get(section.id);
    form.reset({
        title: existingManual?.title || `Section ${section.number}`,
        googleDriveLink: existingManual?.googleDriveLink || '',
        revisionNumber: existingManual?.revisionNumber || '',
        pageCount: existingManual?.pageCount || undefined,
        executionDate: existingManual?.executionDate?.toDate(),
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
      ...values,
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
            )}/>
             <FormField control={form.control} name="googleDriveLink" render={({ field }) => (
                <FormItem><FormLabel>Google Drive Link</FormLabel><FormControl><Input placeholder="https://drive.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="revisionNumber" render={({ field }) => (
                    <FormItem><FormLabel>Revision No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="pageCount" render={({ field }) => (
                    <FormItem><FormLabel>No. of Pages</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </div>
            <FormField control={form.control} name="executionDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Execution Date</FormLabel>
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
            )}/>
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
