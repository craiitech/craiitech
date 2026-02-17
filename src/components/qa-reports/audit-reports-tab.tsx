
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, deleteDoc, doc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { QaAuditReport, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, Trash2, PlusCircle, FileText, Eye, Globe, Building2, ShieldCheck, Calendar, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
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
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  googleDriveLink: z.string().url('Invalid URL'),
  campusId: z.string().min(1, 'Campus is required'),
  eqaCategory: z.string().optional(),
  certifyingBody: z.string().optional(),
  standard: z.string().min(1, 'Standard is required'),
});

const UNIVERSITY_WIDE_ID = 'university-wide';

export function AuditReportsTab({ type, campuses, canManage }: AuditReportsTabProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewReport, setPreviewDoc] = useState<QaAuditReport | null>(null);

  const reportsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'qaAuditReports'), where('type', '==', type)) : null),
    [firestore, type]
  );
  const { data: rawReports, isLoading } = useCollection<QaAuditReport>(reportsQuery);

  const reports = useMemo(() => {
    if (!rawReports) return [];
    return [...rawReports].sort((a, b) => {
        const dateA = a.startDate instanceof Timestamp ? a.startDate.toMillis() : new Date(a.startDate).getTime();
        const dateB = b.startDate instanceof Timestamp ? b.startDate.toMillis() : new Date(b.startDate).getTime();
        return dateB - dateA;
    });
  }, [rawReports]);

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: { 
      title: '', 
      startDate: '', 
      endDate: '', 
      googleDriveLink: '', 
      campusId: '', 
      eqaCategory: 'Certification / Re-Certification Audit', 
      certifyingBody: '',
      standard: 'ISO 21001:2018'
    }
  });

  const onSubmit = async (values: z.infer<typeof reportSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const dataToSave: any = {
        ...values,
        type,
        startDate: Timestamp.fromDate(new Date(values.startDate)),
        endDate: Timestamp.fromDate(new Date(values.endDate)),
        createdAt: serverTimestamp(),
      };

      if (type === 'IQA') {
          delete dataToSave.eqaCategory;
          delete dataToSave.certifyingBody;
          // Note: Standard is now kept for IQA
      }

      await addDoc(collection(firestore, 'qaAuditReports'), dataToSave);
      toast({ title: 'Success', description: 'Report uploaded successfully.' });
      setIsDialogOpen(false);
      form.reset({
        title: '',
        startDate: '',
        endDate: '',
        googleDriveLink: '',
        campusId: '',
        eqaCategory: 'Certification / Re-Certification Audit',
        certifyingBody: '',
        standard: 'ISO 21001:2018'
      });
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

  const campusMap = useMemo(() => {
    const map = new Map(campuses.map(c => [c.id, c.name]));
    map.set(UNIVERSITY_WIDE_ID, 'University-Wide');
    return map;
  }, [campuses]);

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
            <h3 className="text-lg font-black uppercase tracking-tight">{type} Documentation Vault</h3>
            <p className="text-xs text-muted-foreground">Official repository for institutional {type} records.</p>
        </div>
        {canManage && (
          <Button onClick={() => setIsDialogOpen(true)} size="sm" className="shadow-lg shadow-primary/20">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Report
          </Button>
        )}
      </div>

      <Card className="shadow-sm border-primary/10 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase">Report Details</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase">Campus Scope</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-center">Audit Period</TableHead>
                    {type === 'EQA' && <TableHead className="font-bold text-[10px] uppercase">Auditor / Body</TableHead>}
                    <TableHead className="text-right font-bold text-[10px] uppercase">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reports?.map((report) => (
                    <TableRow key={report.id} className="hover:bg-muted/30">
                        <TableCell>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-900">{report.title}</span>
                            <div className="flex items-center gap-2 mt-1">
                                {report.standard && (
                                    <Badge variant="secondary" className="text-[9px] h-4 bg-primary/5 text-primary font-black border-none">{report.standard}</Badge>
                                )}
                                {type === 'EQA' && report.eqaCategory && (
                                    <Badge variant="outline" className="text-[9px] h-4 border-primary/30 text-primary font-bold">{report.eqaCategory}</Badge>
                                )}
                            </div>
                        </div>
                        </TableCell>
                        <TableCell>
                        {report.campusId === UNIVERSITY_WIDE_ID ? (
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 gap-1 h-5 text-[10px] font-black uppercase tracking-tighter">
                            <Globe className="h-3 w-3" />
                            UNIVERSITY-WIDE
                            </Badge>
                        ) : (
                            <div className="flex items-center gap-2 text-xs font-medium">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                {campusMap.get(report.campusId) || '...'}
                            </div>
                        )}
                        </TableCell>
                        <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3 opacity-50" />
                                    {report.startDate?.toDate ? format(report.startDate.toDate(), 'PP') : 'N/A'}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3" /> {/* Spacer */}
                                    to {report.endDate?.toDate ? format(report.endDate.toDate(), 'PP') : 'N/A'}
                                </div>
                            </div>
                        </TableCell>
                        {type === 'EQA' && (
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                    <span className="text-xs font-bold text-emerald-700">{report.certifyingBody || 'Not Specified'}</span>
                                </div>
                            </TableCell>
                        )}
                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={() => setPreviewDoc(report)} className="h-8 text-[10px] font-bold">
                            PREVIEW
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" asChild>
                            <a href={report.googleDriveLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            </a>
                        </Button>
                        {canManage && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(report.id)}>
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                        </TableCell>
                    </TableRow>
                    ))}
                    {!isLoading && reports?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={type === 'EQA' ? 5 : 4} className="h-32 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                                <FileText className="h-8 w-8 opacity-10" />
                                <p className="text-xs italic font-medium">No reports found in this vault.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {type} Record</DialogTitle>
            <DialogDescription>Capture documentation parameters and external file reference.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider">Report Title</FormLabel><FormControl><Input {...field} placeholder={`e.g., Annual ${type} Summary 2025`} className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
              )} />
              
              <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="standard" render={({ field }) => (
                      <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider">Audit Standard</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select Standard" /></SelectTrigger></FormControl>
                              <SelectContent>
                                  <SelectItem value="ISO 9001:2015">ISO 9001:2015</SelectItem>
                                  <SelectItem value="ISO 21001:2018">ISO 21001:2018</SelectItem>
                              </SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                  )} />
                  {type === 'EQA' ? (
                      <FormField control={form.control} name="eqaCategory" render={({ field }) => (
                          <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider">Audit Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                      <SelectItem value="Certification / Re-Certification Audit">Certification / Re-Certification Audit</SelectItem>
                                      <SelectItem value="Surveillance Audit">Surveillance Audit</SelectItem>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                      )} />
                  ) : (
                      <div /> // Placeholder for grid alignment
                  )}
              </div>

              {type === 'EQA' && (
                  <FormField control={form.control} name="certifyingBody" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider">Partner Certifying Body</FormLabel><FormControl><Input {...field} placeholder="e.g., TUV Rheinland, SOCOTEC" className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
                  )} />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider">Audit Start Date</FormLabel><FormControl><Input type="date" {...field} className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider">Audit End Date</FormLabel><FormControl><Input type="date" {...field} className="h-9 text-sm" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              
              <FormField control={form.control} name="campusId" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider">Site Scope</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select Scope" /></SelectTrigger></FormControl>
                      <SelectContent>
                      <SelectItem value={UNIVERSITY_WIDE_ID} className="font-bold text-primary italic">University-Wide (Institutional)</SelectItem>
                      {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="googleDriveLink" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider">Google Drive Reference</FormLabel>
                    <FormControl><Input {...field} placeholder="https://drive.google.com/..." className="h-9 text-sm" /></FormControl>
                    <FormDescription className="text-[10px]">Must be accessible to 'Anyone with the link'.</FormDescription>
                    <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Submit to Vault
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewReport} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-4 border-b bg-slate-50 shrink-0">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <DialogTitle className="text-sm font-black uppercase tracking-tight">{previewReport?.title}</DialogTitle>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Digital Audit Evidence Preview</p>
                </div>
                <Badge variant="secondary" className="h-5 text-[9px] font-bold bg-primary/10 text-primary border-primary/20">{type} REPORT</Badge>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-muted relative">
            {previewReport && (
              <iframe 
                src={getEmbedUrl(previewReport.googleDriveLink)} 
                className="absolute inset-0 w-full h-full border-none bg-white" 
                allow="autoplay" 
                title="QA Document Preview"
              />
            )}
          </div>
          <div className="p-3 border-t bg-card shrink-0 flex justify-between items-center px-6">
              <p className="text-[9px] text-muted-foreground italic">Source: {previewReport?.googleDriveLink}</p>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-primary" asChild>
                  <a href={previewReport?.googleDriveLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open in Drive
                  </a>
              </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
