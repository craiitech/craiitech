'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, setDoc } from '@/firebase/firestore-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Search,
  ArrowUpDown,
  X,
  Building2,
  MapPin,
  Folder,
  ExternalLink,
  Pencil,
  Plus,
  FolderCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Campus } from '@/lib/types';
import { extractDriveFolderId, cn } from '@/lib/utils';

const campusSchema = z.object({
  name: z.string().min(3, 'Campus name must be at least 3 characters.'),
  location: z.string().min(3, 'Location must be at least 3 characters.'),
  submissionDriveFolderUrl: z.string().url('Please enter a valid Google Drive URL').optional().or(z.literal('')),
});

const editCampusSchema = z.object({
  name: z.string().min(3, 'Campus name must be at least 3 characters.'),
  location: z.string().min(3, 'Location must be at least 3 characters.'),
  submissionDriveFolderUrl: z.string().url('Please enter a valid Google Drive URL').optional().or(z.literal('')),
});

type SortConfig = {
  key: 'name' | 'location';
  direction: 'ascending' | 'descending';
} | null;

export function CampusManagement() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const firestore = useFirestore();
  const { toast } = useToast();

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading } = useCollection<Campus>(campusesQuery);

  const form = useForm<z.infer<typeof campusSchema>>({
    resolver: zodResolver(campusSchema),
    defaultValues: { name: '', location: '', submissionDriveFolderUrl: '' },
  });

  const editForm = useForm<z.infer<typeof editCampusSchema>>({
    resolver: zodResolver(editCampusSchema),
    defaultValues: { name: '', location: '', submissionDriveFolderUrl: '' },
  });

  const handleOpenEdit = (campus: Campus) => {
    setEditingCampus(campus);
    editForm.reset({
      name: campus.name || '',
      location: campus.location || '',
      submissionDriveFolderUrl: campus.submissionDriveFolderUrl || '',
    });
    setIsEditDialogOpen(true);
  };

  const onEditSubmit = async (values: z.infer<typeof editCampusSchema>) => {
    if (!firestore || !editingCampus) return;
    setIsSavingEdit(true);
    try {
      const folderUrl = values.submissionDriveFolderUrl?.trim() || '';
      const folderId = folderUrl ? extractDriveFolderId(folderUrl) : '';
      const now = new Date().toISOString();

      // Update campuses collection
      await updateDoc(doc(firestore, 'campuses', editingCampus.id), {
        name: values.name.trim(),
        location: values.location.trim(),
        submissionDriveFolderUrl: folderUrl || null,
        submissionDriveFolderId: folderId || null,
        submissionDriveUpdatedAt: folderUrl ? now : null,
      });

      // Also synchronize campusSettings doc for this campus
      await setDoc(
        doc(firestore, 'campusSettings', editingCampus.id),
        {
          id: editingCampus.id,
          submissionDriveFolderUrl: folderUrl,
          submissionDriveFolderId: folderId,
          submissionDriveUpdatedAt: folderUrl ? now : '',
        },
        { merge: true },
      );

      toast({
        title: 'Campus Updated',
        description: `Settings and Google Drive repository saved for ${values.name}.`,
      });
      setIsEditDialogOpen(false);
      setEditingCampus(null);
    } catch (error: any) {
      console.error('Error updating campus:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not update campus.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof campusSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const folderUrl = values.submissionDriveFolderUrl?.trim() || '';
      const folderId = folderUrl ? extractDriveFolderId(folderUrl) : '';
      const now = new Date().toISOString();

      const docRef = await addDoc(collection(firestore, 'campuses'), {
        name: values.name.trim(),
        location: values.location.trim(),
        submissionDriveFolderUrl: folderUrl || undefined,
        submissionDriveFolderId: folderId || undefined,
        submissionDriveUpdatedAt: folderUrl ? now : undefined,
        createdAt: serverTimestamp(),
      });

      if (folderUrl) {
        await setDoc(
          doc(firestore, 'campusSettings', docRef.id),
          {
            id: docRef.id,
            submissionDriveFolderUrl: folderUrl,
            submissionDriveFolderId: folderId,
            submissionDriveUpdatedAt: now,
          },
          { merge: true },
        );
      }

      toast({ title: 'Success', description: `New campus "${values.name}" created.` });
      form.reset();
    } catch (error: any) {
      console.error('Error creating campus:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not create campus.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestSort = (key: 'name' | 'location') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedCampuses = useMemo(() => {
    if (!campuses) return [];
    let list = [...campuses];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.location && c.location.toLowerCase().includes(q)),
      );
    }

    if (sortConfig) {
      list.sort((a, b) => {
        const valA = (a[sortConfig.key] || '').toLowerCase();
        const valB = (b[sortConfig.key] || '').toLowerCase();
        return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    return list;
  }, [campuses, searchTerm, sortConfig]);

  const watchedEditFolderUrl = editForm.watch('submissionDriveFolderUrl');
  const extractedEditFolderId = useMemo(() => {
    return watchedEditFolderUrl ? extractDriveFolderId(watchedEditFolderUrl) : '';
  }, [watchedEditFolderUrl]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* ADD NEW CAMPUS CARD */}
      <Card className="shadow-md border-primary/10">
        <CardHeader className="bg-primary/5 border-b py-6">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Building2 className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Provisioning</span>
          </div>
          <CardTitle>Add New Campus</CardTitle>
          <CardDescription>
            Create a new campus site and link its official Google Drive submission folder.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 pt-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase">Campus Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Campus" {...field} className="h-10 font-bold" />
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
                    <FormLabel className="text-[10px] font-bold uppercase">Location / Municipality</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Odiongan, Romblon" {...field} className="h-10 text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="submissionDriveFolderUrl"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-[10px] font-bold uppercase">
                        Submission Google Drive Folder (Optional)
                      </FormLabel>
                      <span className="text-[9px] text-muted-foreground font-semibold">Institutional Custody</span>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="https://drive.google.com/drive/folders/..."
                          {...field}
                          className="h-10 text-xs font-mono pr-8"
                        />
                        <Folder className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-60 pointer-events-none" />
                      </div>
                    </FormControl>
                    <FormDescription className="text-[10px]">
                      The designated Google Drive folder where official report submissions from units under this campus
                      will be archived.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full shadow-lg shadow-primary/20 font-black uppercase text-xs tracking-widest"
              >
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

      {/* EXISTING CAMPUSES CARD */}
      <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
        <CardHeader className="bg-muted/30 border-b py-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-tight">Existing Campuses</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                List of registered university campus sites and their Google Drive repositories.
              </CardDescription>
            </div>
            {campuses && (
              <Badge variant="outline" className="h-6 text-[10px] font-black uppercase px-2 w-fit">
                {filteredAndSortedCampuses.length} of {campuses.length} Campuses
              </Badge>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search campuses by name or location..."
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
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 opacity-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAndSortedCampuses.length > 0 ? (
            <ScrollArea className="h-[460px]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase pl-6 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 text-[10px] font-black uppercase tracking-wider hover:bg-transparent"
                        onClick={() => requestSort('name')}
                      >
                        Campus Name
                        <ArrowUpDown className="ml-1.5 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase py-3">Drive Repository</TableHead>
                    <TableHead className="text-[10px] font-black uppercase pr-6 py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedCampuses.map((campus) => {
                    const hasDrive = Boolean(campus.submissionDriveFolderUrl);
                    return (
                      <TableRow key={campus.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="pl-6 font-bold text-xs uppercase tracking-tight py-3.5">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary shrink-0 opacity-70" />
                            <div>
                              <p className="font-bold text-xs">{campus.name}</p>
                              <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 shrink-0 opacity-60" />
                                {campus.location}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          {hasDrive ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[9px] font-black uppercase px-1.5 py-0 h-4">
                                  <FolderCheck className="h-2.5 w-2.5 mr-1" />
                                  Drive Linked
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-5 px-1.5 text-[10px] font-bold text-primary hover:bg-primary/10"
                                >
                                  <a
                                    href={campus.submissionDriveFolderUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open Google Drive Folder"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                              </div>
                              <p className="font-mono text-[9px] text-muted-foreground truncate max-w-[180px]">
                                {campus.submissionDriveFolderId ||
                                  extractDriveFolderId(campus.submissionDriveFolderUrl)}
                              </p>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[9px] font-black uppercase tracking-wider h-4 px-1.5"
                            >
                              <AlertTriangle className="h-2.5 w-2.5 mr-1 text-amber-600" />
                              Not Set
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="pr-6 py-3.5 text-right">
                          <Button
                            variant={hasDrive ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => handleOpenEdit(campus)}
                            className={cn(
                              'h-7 text-[10px] font-bold uppercase tracking-wider',
                              !hasDrive && 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
                            )}
                          >
                            {hasDrive ? (
                              <>
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3 mr-1" />
                                Set Drive
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-center p-4">
              <Building2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-bold text-muted-foreground">No campuses found</p>
              {searchTerm && (
                <p className="text-[11px] text-muted-foreground/70 mt-1">No campus matches &quot;{searchTerm}&quot;.</p>
              )}
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="mt-3 h-7 text-[10px] font-bold"
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* EDIT CAMPUS & DRIVE FOLDER DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md border-primary/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Building2 className="h-5 w-5 text-primary" />
              Configure Campus &amp; Drive Folder
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update details and link the official Google Drive repository folder for this campus site.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase">Campus Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Campus" {...field} className="h-9 font-bold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase">Location / Municipality</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Odiongan, Romblon" {...field} className="h-9 text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="submissionDriveFolderUrl"
                render={({ field }) => (
                  <FormItem className="rounded-xl border p-3.5 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-[10px] font-bold uppercase text-primary flex items-center gap-1.5">
                        <Folder className="h-3.5 w-3.5" />
                        Submission Google Drive Folder
                      </FormLabel>
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-6 px-1.5 text-[10px] font-bold text-primary"
                        >
                          <a href={field.value} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open
                          </a>
                        </Button>
                      )}
                    </div>
                    <FormControl>
                      <Input
                        placeholder="https://drive.google.com/drive/folders/..."
                        {...field}
                        className="h-9 text-xs font-mono bg-background"
                      />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Units submitting documents under this campus will automatically upload files directly into this
                      Google Drive folder.
                    </p>
                    {extractedEditFolderId && (
                      <div className="flex items-center gap-2 pt-1 text-[10px] text-emerald-700 dark:text-emerald-300 font-mono">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>Folder ID: {extractedEditFolderId}</span>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isSavingEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingEdit}
                  className="font-bold uppercase text-[10px] tracking-wider"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
