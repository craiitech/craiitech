
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, 
    ShieldCheck, 
    MessageSquare, 
    ExternalLink, 
    Building2, 
    History, 
    User, 
    ArrowRightCircle, 
    Gavel, 
    Undo2,
    Check,
    FileText,
    LayoutList,
    Hash,
    ChevronRight
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UnitFormRequest, UnitFormRequestStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface FormRequestReviewDialogProps {
  requestId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const commentSchema = z.object({
  comment: z.string().min(5, 'Please provide detailed feedback.'),
});

export function FormRequestReviewDialog({ requestId, isOpen, onOpenChange }: FormRequestReviewDialogProps) {
  const { userProfile, isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const requestRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'unitFormRequests', requestId) : null),
    [firestore, requestId]
  );
  const { data: request, isLoading } = useDoc<UnitFormRequest>(requestRef);

  const form = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: { comment: '' }
  });

  const handleUpdateStatus = async (newStatus: UnitFormRequestStatus, commentText?: string) => {
    if (!firestore || !request || !userProfile) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(firestore);
      const reqDocRef = doc(firestore, 'unitFormRequests', request.id);

      const logs = [...(request.comments || [])];
      if (commentText) {
          logs.push({
              text: commentText,
              authorId: userProfile.id,
              authorName: `${userProfile.firstName} ${userProfile.lastName}`,
              createdAt: new Date(),
          });
      }

      batch.update(reqDocRef, {
          status: newStatus,
          comments: logs,
          updatedAt: serverTimestamp()
      });

      // If approved, migrate forms to the official unitForms collection
      if (newStatus === 'Approved & Registered') {
          request.requestedForms.forEach(f => {
              const formDocRef = doc(collection(firestore, 'unitForms'));
              batch.set(formDocRef, {
                  unitId: request.unitId,
                  campusId: request.campusId,
                  formCode: f.code,
                  formName: f.name,
                  googleDriveLink: f.link,
                  revision: f.revision,
                  requestId: request.id,
                  createdAt: serverTimestamp()
              });
          });
      }

      await batch.commit();
      toast({ title: 'Status Updated', description: `Request moved to ${newStatus}.` });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to update request.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        {isLoading ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>
        ) : request ? (
            <>
                <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-primary mb-1">
                                <Gavel className="h-5 w-5" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Oversight Panel</span>
                            </div>
                            <DialogTitle className="text-xl font-bold uppercase tracking-tight">Reviewing Request: {request.id.substring(0, 8).toUpperCase()}</DialogTitle>
                        </div>
                        <Badge className="h-7 px-4 font-black uppercase text-[10px] tracking-widest bg-primary text-white border-none shadow-sm">{request.status}</Badge>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden bg-white">
                    <div className="flex-1 border-r flex flex-col min-w-0">
                        <ScrollArea className="flex-1">
                            <div className="p-8 space-y-10">
                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2">
                                        <Building2 className="h-4 w-4" /> Submitter & Origin
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl">
                                        <div>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Executing Unit</p>
                                            <p className="text-sm font-black text-slate-800">{request.unitName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Request Submitter</p>
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                                <User className="h-3.5 w-3.5 text-primary" />
                                                {request.submitterName}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2">
                                        <FileText className="h-4 w-4" /> Individual Roster Items
                                    </h4>
                                    <div className="border rounded-xl overflow-hidden shadow-sm">
                                        <Table>
                                            <TableHeader className="bg-slate-50">
                                                <TableRow>
                                                    <TableHead className="text-[10px] font-black uppercase">Code</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase">Official Title</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase">Rev.</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {request.requestedForms.map((f, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="font-mono text-xs font-bold text-primary">{f.code}</TableCell>
                                                        <TableCell className="text-xs font-bold">{f.name}</TableCell>
                                                        <TableCell><Badge variant="outline" className="h-4 text-[9px] font-bold">Rev {f.revision}</Badge></TableCell>
                                                        <TableCell className="text-right pr-6">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" asChild>
                                                                <a href={f.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2">
                                        <ShieldCheck className="h-4 w-4" /> Scanned Evidence (DRF)
                                    </h4>
                                    <div className="aspect-video w-full rounded-2xl border bg-muted overflow-hidden shadow-inner relative">
                                        <iframe 
                                            src={getEmbedUrl(request.scannedRegistrationFormLink)} 
                                            className="absolute inset-0 w-full h-full border-none"
                                            allow="autoplay"
                                        />
                                    </div>
                                </section>
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="w-[350px] flex flex-col bg-slate-50/50 shrink-0">
                        <div className="p-4 border-b font-black text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2 bg-white">
                            <MessageSquare className="h-4 w-4" /> Feedback & History
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-6">
                                {request.comments && request.comments.length > 0 ? (
                                    <div className="space-y-4">
                                        {request.comments.map((c, i) => (
                                            <div key={i} className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
                                                <div className="flex items-center justify-between gap-2 border-b pb-2 mb-2">
                                                    <span className="text-[10px] font-black uppercase text-primary">{c.authorName}</span>
                                                    <span className="text-[9px] text-muted-foreground">{format(c.createdAt instanceof Date ? c.createdAt : c.createdAt.toDate(), 'MMM dd, p')}</span>
                                                </div>
                                                <p className="text-xs text-slate-700 italic leading-relaxed">"{c.text}"</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center opacity-20 flex flex-col items-center gap-2">
                                        <MessageSquare className="h-8 w-8" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No comments logged</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                        
                        {isAdmin && (
                            <div className="p-6 border-t bg-white space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Institutional Controls</h4>
                                <Form {...form}>
                                    <form className="space-y-4">
                                        <FormField control={form.control} name="comment" render={({ field }) => (
                                            <FormItem>
                                                <FormControl><Textarea {...field} placeholder="Enter internal feedback or correction notes..." rows={3} className="text-xs bg-slate-50 border-slate-200" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                className="text-destructive h-9 font-black text-[10px] uppercase border-destructive/20 hover:bg-destructive/5 gap-1.5"
                                                onClick={() => {
                                                    const comment = form.getValues('comment');
                                                    if (!comment) { form.setError('comment', { type: 'manual', message: 'Feedback is required to return a request.' }); return; }
                                                    handleUpdateStatus('Returned for Correction', comment);
                                                }}
                                                disabled={isProcessing}
                                            >
                                                <Undo2 className="h-3 w-3" /> RETURN
                                            </Button>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-9 font-black text-[10px] uppercase gap-1.5"
                                                onClick={() => {
                                                    const comment = form.getValues('comment');
                                                    handleUpdateStatus('QA Review', comment || 'Undergoing initial QA validation.');
                                                }}
                                                disabled={isProcessing}
                                            >
                                                <ShieldCheck className="h-3 w-3" /> QA START
                                            </Button>
                                        </div>
                                        <Separator />
                                        <div className="space-y-2">
                                            <Button 
                                                type="button" 
                                                className="w-full h-10 font-black text-[10px] uppercase bg-amber-500 text-amber-950 hover:bg-amber-600 gap-2"
                                                onClick={() => handleUpdateStatus('Awaiting Presidential Approval', 'QA Review complete. Endorsed for final approval.')}
                                                disabled={isProcessing}
                                            >
                                                <ArrowRightCircle className="h-4 w-4" /> Endorse to President
                                            </Button>
                                            <Button 
                                                type="button" 
                                                className="w-full h-10 font-black text-[10px] uppercase bg-emerald-600 text-white hover:bg-emerald-700 gap-2 shadow-lg shadow-emerald-200"
                                                onClick={() => handleUpdateStatus('Approved & Registered', 'Institutional approval confirmed. Documents now enrolled in unit roster.')}
                                                disabled={isProcessing}
                                            >
                                                <Check className="h-4 w-4" /> Confirm & Register
                                            </Button>
                                        </div>
                                    </form>
                                </Form>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
                    <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest" onClick={() => onOpenChange(false)}>Close View</Button>
                </DialogFooter>
            </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
