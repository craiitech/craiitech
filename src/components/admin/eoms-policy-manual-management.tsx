'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from '@/firebase/firestore-wrapper';
import type { EomsPolicyManual } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Edit, FileText, CheckCircle2, AlertCircle, Search, X, BookOpen } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'not_set'>('all');

  useEffect(() => {
    const fetchManuals = async () => {
      if (!firestore) return;
      setIsLoadingManuals(true);
      try {
        const manualPromises = sections.map((section) => getDoc(doc(firestore, 'eomsPolicyManuals', section.id)));
        const manualSnapshots = await Promise.all(manualPromises);

        const fetchedManuals = manualSnapshots
          .filter((snap) => snap.exists())
          .map((snap) => snap.data() as EomsPolicyManual);

        const map = new Map<string, EomsPolicyManual>();
        fetchedManuals.forEach((m) => map.set(m.id, m));
        setManuals(map);
      } catch (error) {
        console.error('EOMS Policy Manual fetch error:', error);
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
    },
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

  const filteredSections = useMemo(() => {
    return sections.filter((section) => {
      const manual = manuals.get(section.id);
      const isActive = Boolean(manual && manual.title);

      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'not_set' && isActive) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesNumber = `section ${section.number}`.includes(q) || String(section.number) === q;
        const matchesTitle = (manual?.title || `Section ${section.number} (Untitled)`).toLowerCase().includes(q);
        const matchesRevision = (manual?.revisionNumber || '').toLowerCase().includes(q);
        return matchesNumber || matchesTitle || matchesRevision;
      }

      return true;
    });
  }, [sections, manuals, statusFilter, searchTerm]);

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all';

  const activeCount = useMemo(() => {
    return sections.filter((s) => Boolean(manuals.get(s.id)?.title)).length;
  }, [sections, manuals]);

  return (
    <>
      <Card className="shadow-md border-primary/10">
        <CardHeader className="bg-muted/10 border-b py-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                RSU EOMS Manual Administration
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Populate and maintain the 10 core sections of the official RSU EOMS Manual.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="h-7 text-xs font-black uppercase px-3 bg-emerald-50 text-emerald-800 border-emerald-300"
              >
                {activeCount} of 10 Active
              </Badge>
              {hasActiveFilters && (
                <Badge variant="outline" className="h-7 text-xs font-black uppercase px-3 bg-background">
                  {filteredSections.length} Shown
                </Badge>
              )}
            </div>
          </div>

          {/* SEARCH & FILTER TOOLBAR */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search sections by number, title, or revision..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-8 h-9 text-xs bg-background"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={(v: 'all' | 'active' | 'not_set') => setStatusFilter(v)}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="not_set">Not Set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="h-9 text-[10px] font-black uppercase tracking-wider shrink-0 bg-background"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reset Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[60dvh]">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[100px] text-[10px] font-black uppercase pl-6 py-3">Section</TableHead>
                  <TableHead className="text-[10px] font-black uppercase py-3">Title</TableHead>
                  <TableHead className="text-[10px] font-black uppercase py-3">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase py-3">Revision</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase pr-6 py-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingManuals ? (
                  sections.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell className="pl-6">
                        <Skeleton className="h-5 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-12" />
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Skeleton className="h-8 w-20 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredSections.length > 0 ? (
                  filteredSections.map((section) => {
                    const manual = manuals.get(section.id);
                    return (
                      <TableRow key={section.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono font-bold text-xs pl-6 py-3.5">
                          Section {section.number}
                        </TableCell>
                        <TableCell className="font-medium text-xs py-3.5">
                          {manual?.title || `Section ${section.number} (Untitled)`}
                        </TableCell>
                        <TableCell className="py-3.5">
                          {manual ? (
                            <Badge
                              variant="default"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[10px]"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground gap-1 border-dashed text-[10px]">
                              <AlertCircle className="h-3 w-3" /> Not Set
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            Rev {manual?.revisionNumber || '--'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6 py-3.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(section)}
                            className="h-8 text-[10px] font-bold uppercase tracking-wider"
                          >
                            <Edit className="mr-1.5 h-3.5 w-3.5" /> {manual ? 'Edit Section' : 'Set Content'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                        <BookOpen className="h-8 w-8 opacity-30" />
                        <p className="text-xs font-bold">No sections match your search.</p>
                        {hasActiveFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchTerm('');
                              setStatusFilter('all');
                            }}
                            className="h-7 text-[10px] font-bold mt-2"
                          >
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
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
              <span className="text-xs font-bold uppercase tracking-widest">
                Manual Section {selectedSection?.number}
              </span>
            </div>
            <DialogTitle>Content Configuration</DialogTitle>
            <DialogDescription>Configure the meta-data and file link for this policy section.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Quality Management System Scope" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="googleDriveLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Drive Link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://drive.google.com/..." {...field} />
                    </FormControl>
                    <FormDescription className="text-[10px]">
                      Ensure the sharing is set to &apos;Anyone with the link can view&apos;.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="revisionNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revision No.</FormLabel>
                      <FormControl>
                        <Input placeholder="00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pageCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Pages</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="executionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Execution</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., January 15, 2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
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
