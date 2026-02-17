
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import type { EomsPolicyManual } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Edit, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const manualSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  googleDriveLink: z.string().url('Please enter a valid Google Drive link.'),
  revisionNumber: z.string().min(1, 'Revision number is required.'),
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSection, setSelectedSection] = useState<{ id: string; number: number } | null>(null);
  const [isLoadingManuals, setIsLoadingManuals] = useState(true);
  const [manuals, setManuals] = useState<Map<string, EomsPolicyManual>>(new Map());

  useEffect(() => {
    const fetchManuals = async () => {
      if (!firestore) return;
      setIsLoadingManuals(true);
      try {
        const manualPromises = sections.map(section => 
          getDoc(doc(firestore, 'eomsPolicyManuals', section.id))
        );
        const manualSnapshots = await Promise.all(manualPromises);
        
        const fetchedManuals = manualSnapshots
          .filter(snap => snap.exists())
          .map(snap => snap.data() as EomsPolicyManual);

        const map = new Map<string, EomsPolicyManual>();
        fetchedManuals.forEach(m => map.set(m.id, m));
        setManuals(map);
      } catch (error) {
        console.error("EOMS Policy Manual fetch error:", error);
      } finally {
        setIsLoadingManuals(false);
      }
    };

    fetchManuals();
  }, [firestore]);

  const form = useForm<z.infer<typeof manualSchema>>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      title: '',
      googleDriveLink: '',
      revisionNumber: '',
      pageCount: 0,
      executionDate: '',
    }
  });

  const handleOpenDialog = (section: { id: string; number: number }) => {
    setSelectedSection(section);
    const existingManual = manuals.get(section.id);
    form.reset({
      title: existingManual?.title || `Section ${section.number}`,
      googleDriveLink: existingManual?.googleDriveLink || '',
      revisionNumber: existingManual?.revisionNumber || '00',
      pageCount: existingManual?.pageCount || 0,
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
    const manualData = {
      ...values,
      id: selectedSection.id,
      sectionNumber: selectedSection.number,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(manualRef, manualData, { merge: true });
      toast({ title: 'Success', description: `Manual Section ${selectedSection.number} has been updated.` });
      
      const newManuals = new Map(manuals);
      newManuals.set(selectedSection.id, { ...manualData, updatedAt: new Date() } as any);
      setManuals(newManuals);
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
          <CardTitle>RSU EOMS Manual Administration</CardTitle>
          <CardDescription>
            Populate and maintain the 10 core sections of the official RSU EOMS Manual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Section</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Revision</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => {
                  if (isLoadingManuals) {
                    return (
                      <TableRow key={section.id}>
                        <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
                      </TableRow>
                    )
                  }
                  const manual = manuals.get(section.id);
                  return (
                    <TableRow key={section.id}>
                      <TableCell className="font-bold">{section.number}</TableCell>
                      <TableCell className="font-medium">{manual?.title || `Section ${section.number} (Untitled)`}</TableCell>
                      <TableCell>
                        {manual ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground gap-1 border-dashed">
                            <AlertCircle className="h-3 w-3" /> Not Set
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Rev {manual?.revisionNumber || '--'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(section)}>
                          <Edit className="mr-2 h-4 w-4" /> {manual ? 'Edit Section' : 'Set Content'}
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
            <div className="flex items-center gap-2 text-primary mb-1">
                <FileText className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Manual Section {selectedSection?.number}</span>
            </div>
            <DialogTitle>Content Configuration</DialogTitle>
            <DialogDescription>
              Configure the meta-data and file link for this policy section.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Section Title</FormLabel>
                  <FormControl><Input placeholder="e.g., Quality Management System Scope" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="googleDriveLink" render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Drive Link</FormLabel>
                  <FormControl><Input placeholder="https://drive.google.com/..." {...field} /></FormControl>
                  <FormDescription className="text-[10px]">Ensure the sharing is set to 'Anyone with the link can view'.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="revisionNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revision No.</FormLabel>
                    <FormControl><Input placeholder="00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="pageCount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Pages</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="executionDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Execution</FormLabel>
                  <FormControl><Input placeholder="e.g., January 15, 2025" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Publish Section
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
