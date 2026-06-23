'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, deleteDoc, setDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import type { ChedAnnouncement } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Megaphone, 
  Calendar, 
  PlusCircle, 
  Trash2, 
  Edit, 
  Loader2, 
  ExternalLink, 
  Info,
  FolderLock
} from 'lucide-react';
import { format } from 'date-fns';

const formSchema = z.object({
  date: z.string().min(1, 'Date is required.'),
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  description: z.string().min(5, 'Description must be at least 5 characters.'),
  additionalInstructions: z.string().optional(),
  googleDriveLink: z.string().url('Must be a valid URL.').or(z.literal('')),
});

export function ChedAnnouncements() {
  const { isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<ChedAnnouncement | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<ChedAnnouncement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load announcements
  const announcementsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'chedAnnouncements') : null),
    [firestore]
  );
  const { data: rawAnnouncements, isLoading } = useCollection<ChedAnnouncement>(announcementsQuery);

  // Sort descending by date, then createdAt
  const announcements = useMemo(() => {
    if (!rawAnnouncements) return [];
    return [...rawAnnouncements].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  }, [rawAnnouncements]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      title: '',
      description: '',
      additionalInstructions: '',
      googleDriveLink: '',
    },
  });

  // Reset form when editing changes or dialog opens
  useEffect(() => {
    if (editingAnnouncement) {
      form.reset({
        date: editingAnnouncement.date,
        title: editingAnnouncement.title,
        description: editingAnnouncement.description,
        additionalInstructions: editingAnnouncement.additionalInstructions || '',
        googleDriveLink: editingAnnouncement.googleDriveLink || '',
      });
    } else {
      form.reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        title: '',
        description: '',
        additionalInstructions: '',
        googleDriveLink: '',
      });
    }
  }, [editingAnnouncement, isDialogOpen, form]);

  const handleOpenAdd = () => {
    setEditingAnnouncement(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (announcement: ChedAnnouncement) => {
    setEditingAnnouncement(announcement);
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const id = editingAnnouncement ? editingAnnouncement.id : doc(collection(firestore, 'dummy')).id;
    const docRef = doc(firestore, 'chedAnnouncements', id);

    const data = {
      id,
      ...values,
      updatedAt: serverTimestamp(),
      ...(editingAnnouncement ? {} : { createdAt: serverTimestamp() }),
    };

    try {
      await setDoc(docRef, data, { merge: true });
      toast({
        title: editingAnnouncement ? 'Announcement Updated' : 'Announcement Created',
        description: `Successfully ${editingAnnouncement ? 'updated' : 'published'} the announcement.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast({
        title: 'Error',
        description: 'Could not save announcement.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || !deletingAnnouncement) return;
    setIsSubmitting(true);
    const docRef = doc(firestore, 'chedAnnouncements', deletingAnnouncement.id);
    try {
      await deleteDoc(docRef);
      toast({
        title: 'Announcement Deleted',
        description: 'Successfully removed the announcement.',
      });
      setDeletingAnnouncement(null);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: 'Error',
        description: 'Could not delete announcement.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-amber-500" />
            JC03 Announcements & Updates
          </h3>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-0.5">
            Directives, advisories, and Google Drive upload folders for CHED Program Monitoring.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenAdd} size="sm" className="h-9 font-bold uppercase tracking-tight shadow-md">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Announcement
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
        </div>
      ) : announcements.length === 0 ? (
        <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
          <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mb-4">
            <Megaphone className="h-8 w-8 text-muted-foreground opacity-60" />
          </div>
          <CardTitle className="text-xl font-black uppercase text-slate-700">No Announcements Yet</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-2 text-xs font-medium uppercase tracking-wider">
            All JC03 directives and updates for CHED Program Monitoring will be displayed here.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-6">
          {announcements.map((ann) => {
            const formattedDate = () => {
              try {
                return format(new Date(ann.date), 'MMMM dd, yyyy');
              } catch (e) {
                return ann.date;
              }
            };

            return (
              <Card key={ann.id} className="shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-amber-500 overflow-hidden">
                <CardHeader className="pb-3 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground tracking-wider">
                        <Calendar className="h-3.5 w-3.5 text-amber-500" />
                        <span>{formattedDate()}</span>
                      </div>
                      <CardTitle className="text-lg font-black text-slate-800 leading-tight uppercase tracking-tight">
                        {ann.title}
                      </CardTitle>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-slate-100"
                          onClick={() => handleOpenEdit(ann)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-destructive/5"
                          onClick={() => setDeletingAnnouncement(ann)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                    {ann.description}
                  </div>

                  {ann.additionalInstructions && (
                    <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-700 uppercase tracking-widest">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        Additional Instructions
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed font-semibold whitespace-pre-wrap">
                        {ann.additionalInstructions}
                      </p>
                    </div>
                  )}

                  {ann.googleDriveLink && (
                    <div className="pt-2">
                      <a
                        href={ann.googleDriveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 font-bold text-xs uppercase tracking-wider transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <FolderLock className="h-4 w-4 shrink-0 text-indigo-600" />
                          Google Drive Submission Link
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0">
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <Megaphone className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Announcement Configuration</span>
            </div>
            <DialogTitle>{editingAnnouncement ? 'Modify' : 'Publish'} JC03 Announcement</DialogTitle>
            <DialogDescription>
              Set the announcement details and link Google Drive upload folders.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase">Effective Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-11 font-bold" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase">Announcement Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., submission deadline extension" className="h-11 font-bold" {...field} />
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
                      <FormLabel className="text-[10px] font-bold uppercase">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide the detailed contents of the announcement..."
                          className="min-h-[120px] resize-none font-medium leading-relaxed"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase">Additional Instructions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Specific files, naming conventions, or templates to use..."
                          className="min-h-[80px] resize-none font-medium leading-relaxed"
                          {...field}
                        />
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
                      <FormLabel className="text-[10px] font-bold uppercase">Google Drive Link (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://drive.google.com/drive/folders/..." className="h-11 font-bold text-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="p-6 border-t bg-slate-50 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[140px] shadow-lg shadow-amber-500/25">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingAnnouncement ? 'Update Announcement' : 'Publish Announcement'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingAnnouncement} onOpenChange={(open) => !open && setDeletingAnnouncement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and will remove <strong>{deletingAnnouncement?.title}</strong> from the CHED Program Monitoring Workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
