'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import type { EomsPolicyManual } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { logError } from '@/lib/actions';

const manualSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  googleDriveLink: z.string().url('Please enter a valid Google Drive link.'),
  revisionNumber: z.string().nonempty('Revision number is required.'),
  pageCount: z.coerce.number().min(1, 'Number of pages is required.'),
  executionDate: z.string().min(1, 'Execution Date is required.'),
});


const sections = Array.from({ length: 10 }, (_, i) => ({
  id: `section-${i + 1}`,
  number: i + 1,
}));

export function EomsPolicyManualManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, userProfile, userRole } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSection, setSelectedSection] = useState<{ id: string; number: number } | null>(null);

  const [manuals, setManuals] = useState<Map<string, EomsPolicyManual>>(new Map());
  const [isLoadingManuals, setIsLoadingManuals] = useState(true);

  // This effect fetches each document individually, avoiding the 'list' operation.
  useEffect(() => {
    if (!firestore || !user) return;

    const fetchAllManuals = async () => {
      setIsLoadingManuals(true);
      try {
        const promises = sections.map(section => 
          getDoc(doc(firestore, 'eomsPolicyManuals', section.id))
        );
        
        const docSnapshots = await Promise.all(promises);

        const fetchedMap = new Map<string, EomsPolicyManual>();
        docSnapshots.forEach(snap => {
          if (snap.exists()) {
            fetchedMap.set(snap.id, snap.data() as EomsPolicyManual);
          }
        });

        setManuals(fetchedMap);

      } catch (error: any) {
        console.error("EOMS Policy Manual fetch error:", error);
        logError({
            errorMessage: `Admin failed to fetch EOMS manuals: ${error.message}`,
            errorStack: error.stack,
            url: window.location.href,
            userId: user?.uid,
            userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : undefined,
            userRole: userRole || undefined,
            userEmail: userProfile?.email
        }).catch(e => console.error("Secondary error: could not log initial error.", e));
        toast({ title: 'Error', description: 'Could not load EOMS Policy Manual data.', variant: 'destructive' });
      } finally {
        setIsLoadingManuals(false);
      }
    };

    fetchAllManuals();
  }, [firestore, user, isSubmitting, toast, userProfile, userRole]); // Rerun on isSubmitting change to refresh data after save


  const form = useForm<z.infer<typeof manualSchema>>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      title: '',
      googleDriveLink: '',
      revisionNumber: '',
      pageCount: undefined,
      executionDate: '',
    }
  });

  const handleOpenDialog = (section: { id: string; number: number }) => {
    setSelectedSection(section);
    const existingManual = manuals.get(section.id);
    form.reset({
      title: existingManual?.title || `Section ${section.number}`,
      googleDriveLink: existingManual?.googleDriveLink || '',
      revisionNumber: existingManual?.revisionNumber || '',
      pageCount: existingManual?.pageCount,
      executionDate: existingManual?.executionDate || '',
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
    const manualData: Omit<EomsPolicyManual, 'updatedAt'> & { id: string, sectionNumber: number } = {
      title: values.title,
      googleDriveLink: values.googleDriveLink,
      revisionNumber: values.revisionNumber,
      pageCount: values.pageCount,
      executionDate: values.executionDate,
      id: selectedSection.id,
      sectionNumber: selectedSection.number,
    };

    try {
      await setDoc(manualRef, { ...manualData, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: 'Success', description: `Manual Section ${selectedSection.number} has been saved.` });
      handleCloseDialog();
      setIsSubmitting(false); // Set to false to trigger refetch via useEffect dependency
    } catch (error: any) {
      console.error('Error saving manual section:', error);
      logError({
          errorMessage: `Failed to save EOMS manual section ${selectedSection?.id}: ${error.message}`,
          errorStack: error.stack,
          url: window.location.href,
          userId: user?.uid,
          userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : undefined,
          userRole: userRole || undefined,
          userEmail: userProfile?.email
      }).catch(e => console.error("Secondary error: could not log initial error.", e));
      toast({ title: 'Error', description: 'Could not save the manual section.', variant: 'destructive' });
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
                  const manual = manuals.get(section.id);
                  return (
                    <TableRow key={section.id}>
                      <TableCell className="font-medium">{section.number}</TableCell>
                      <TableCell>{manual?.title || 'Not Set'}</TableCell>
                      <TableCell>{manual?.revisionNumber || '-'}</TableCell>
                      <TableCell>{manual?.pageCount || '-'}</TableCell>
                      <TableCell>{manual?.executionDate || '-'}</TableCell>
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
                  <FormItem><FormLabel>No. of Pages</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField
                control={form.control}
                name="executionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Execution Date</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="e.g., December 31, 2024" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the date as text.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
