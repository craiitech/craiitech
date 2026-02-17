
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import type { QaAuditReport, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, Trash2, PlusCircle, FileText, Eye, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface AuditReportsTabProps {
  type: 'IQA' | 'EQA';
  campuses: Campus[];
  canManage: boolean;
}

const reportSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  reportDate: z.string().min(1, 'Date is required'),
  googleDriveLink: z.string().url('Invalid URL'),
  campusId: z.string().min(1, 'Campus is required'),
});

export function AuditReportsTab({ type, campuses, canManage }: AuditReportsTabProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewReport, setPreviewDoc] = useState<QaAuditReport | null>(null);

  const reportsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'qaAuditReports'), where('type', '==', type), orderBy('reportDate', 'desc')) : null),
    [firestore, type]
  );
  const { data: reports, isLoading } = useCollection<QaAuditReport>(reportsQuery);

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: { title: '', reportDate: '', googleDriveLink: '', campusId: '' }
  });

  const onSubmit = async (values: z.infer<typeof reportSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'qaAuditReports'), {
        ...values,
        type,
        reportDate: new Date(values.reportDate),
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'Report uploaded successfully.' });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to upload report.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteDoc(doc(firestore, 'qaAuditReports', id));
      toast({ title: 'Success', description: 'Report deleted.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' });
    }
  };

  const campusMap = new Map(campuses.map(c => [c.id, c.name]));

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">{type} Documentation Vault</h3>
        {canManage && (
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Report
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Title</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>Audit Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports?.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {report.title}
                      </div>
                    </TableCell>
                    <TableCell>{campusMap.get(report.campusId) || '...'}</TableCell>
                    <TableCell>
                      {report.reportDate?.toDate ? format(report.reportDate.toDate(), 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setPreviewDoc(report)}>
                        <Eye className="mr-2 h-4 w-4" /> Preview
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={report.googleDriveLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      {canManage && (
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(report.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && reports?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No reports found in this category.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {type} Report</DialogTitle>
            <DialogDescription>Provide documentation details and link.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Report Title</FormLabel><FormControl><Input {...field} placeholder="e.g., Annual IQA Summary 2025" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="reportDate" render={({ field }) => (
                <FormItem><FormLabel>Audit Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="campusId" render={({ field }) => (
                <FormItem><FormLabel>Campus</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                    <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="googleDriveLink" render={({ field }) => (
                <FormItem><FormLabel>Google Drive Link</FormLabel><FormControl><Input {...field} placeholder="https://drive.google.com/..." /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Report
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewReport} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>{previewReport?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-muted relative">
            {previewReport && (
              <iframe src={getEmbedUrl(previewReport.googleDriveLink)} className="absolute inset-0 w-full h-full border-none" allow="autoplay" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
