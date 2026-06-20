'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, writeBatch, arrayUnion } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, 
    ShieldCheck, 
    MessageSquare, 
    ExternalLink, 
    Building2, 
    History as HistoryIcon, 
    User, 
    Gavel, 
    Undo2,
    Check,
    FileText,
    ChevronRight,
    CheckCircle2,
    Monitor,
    AlertTriangle,
    Link as LinkIcon,
    Eye,
    Clock,
    Edit,
    Send
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProcedureRevisionRequest, ProcedureRevisionRequestStatus } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

interface ProcedureRevisionReviewDialogProps {
  requestId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClick?: (request: ProcedureRevisionRequest) => void;
}

const commentSchema = z.object({
  comment: z.string().min(5, 'Please provide detailed feedback.'),
});

const adminChecklistItems = [
    { id: 'drrf-signed', label: 'Is the DRRF scanned copy signed and complete?' },
    { id: 'docx-alignment', label: 'Does the Word manual match the detailed revisions list?' },
    { id: 'link-access', label: 'Are both Google Drive links public and accessible?' },
];

function GDrivePreview({ url, title }: { url?: string; title: string }) {
  if (!url || !url.startsWith('https://drive.google.com/')) return null;
  const embedUrl = url.replace('/view', '/preview').replace('?usp=sharing', '');
  return (
    <Card className="col-span-full border-primary/10 shadow-md overflow-hidden bg-muted/5 animate-in fade-in slide-in-from-top-4 duration-500">
      <CardHeader className="py-3 px-4 border-b bg-white flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">
            Preview: {title}
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </CardHeader>
      <CardContent className="p-0 relative aspect-video bg-white shadow-inner">
        <iframe 
          src={embedUrl} 
          className="absolute inset-0 w-full h-full border-none"
          allow="autoplay"
          title={`${title} Preview`}
        />
      </CardContent>
    </Card>
  );
}

const getCommentTime = (createdAt: any): number => {
  if (!createdAt) return 0;
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof createdAt.toDate === 'function') return createdAt.toDate().getTime();
  if (typeof createdAt.seconds === 'number') return createdAt.seconds * 1000;
  const d = new Date(createdAt);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

const getFormattedCommentDate = (createdAt: any): string => {
  if (!createdAt) return 'N/A';
  try {
    if (createdAt instanceof Date) {
      return format(createdAt, 'MMM dd, p');
    }
    if (typeof createdAt.toDate === 'function') {
      return format(createdAt.toDate(), 'MMM dd, p');
    }
    if (typeof createdAt.seconds === 'number') {
      return format(new Date(createdAt.seconds * 1000), 'MMM dd, p');
    }
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return format(d, 'MMM dd, p');
    }
    return 'N/A';
  } catch (e) {
    console.error('Error formatting comment date:', e);
    return 'N/A';
  }
};

export function ProcedureRevisionReviewDialog({ requestId, isOpen, onOpenChange, onEditClick }: ProcedureRevisionReviewDialogProps) {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePreview, setActivePreview] = useState<{ name: string; link: string } | null>(null);
  const [adminChecklist, setAdminChecklist] = useState<Record<string, boolean>>({});
  
  // Fields for finalization stage
  const [approvedDRRFLink, setApprovedDRRFLink] = useState('');
  const [manualRevisionNumber, setManualRevisionNumber] = useState('');
  const [manualDateImplemented, setManualDateImplemented] = useState('');
  const [manualDriveLink, setManualDriveLink] = useState('');
  const [discussionComment, setDiscussionComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const handlePostDiscussionComment = async () => {
    if (!firestore || !request || !userProfile || !discussionComment.trim()) return;
    setIsPostingComment(true);
    try {
      const reqDocRef = doc(firestore, 'procedureRevisionRequests', request.id);
      await updateDoc(reqDocRef, {
        comments: arrayUnion({
          text: discussionComment.trim(),
          authorId: userProfile.id,
          authorName: `${userProfile.firstName} ${userProfile.lastName}`,
          authorRole: userRole || 'Member',
          createdAt: new Date(),
        }),
        updatedAt: serverTimestamp()
      });
      setDiscussionComment('');
      toast({ title: 'Comment Posted', description: 'Your message has been added to the discussion.' });
    } catch (e) {
      toast({ title: 'Failed to Post', description: 'Could not submit comment.', variant: 'destructive' });
    } finally {
      setIsPostingComment(false);
    }
  };

  const requestRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'procedureRevisionRequests', requestId) : null),
    [firestore, requestId]
  );
  const { data: request, isLoading } = useDoc<ProcedureRevisionRequest>(requestRef);

  const form = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: { comment: '' }
  });

  // Prefill finalization parameters when request loads
  useEffect(() => {
    if (request) {
      setApprovedDRRFLink(request.approvedDRRFLink || '');
      setManualDriveLink(request.revisedManualDocxLink || '');
    }
  }, [request]);

  const isChecklistComplete = useMemo(() => {
    return adminChecklistItems.every(item => adminChecklist[item.id] === true);
  }, [adminChecklist]);

  const handleToggleChecklist = (id: string) => {
    setAdminChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdateStatus = async (newStatus: ProcedureRevisionRequestStatus, commentText?: string) => {
    if (!firestore || !request || !userProfile || !isAdmin) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(firestore);
      const reqDocRef = doc(firestore, 'procedureRevisionRequests', request.id);

      const updateData: any = {
          status: newStatus,
          updatedAt: serverTimestamp()
      };

      if (commentText) {
          updateData.comments = arrayUnion({
              text: commentText,
              authorId: userProfile.id,
              authorName: `${userProfile.firstName} ${userProfile.lastName}`,
              authorRole: userRole || 'Admin',
              createdAt: new Date(),
          });
      }

      if (newStatus === 'Approved & Registered' && approvedDRRFLink) {
          updateData.approvedDRRFLink = approvedDRRFLink;
      }

      batch.update(reqDocRef, updateData);

      // Perform final update to procedureManuals settings
      if (newStatus === 'Approved & Registered') {
          const manualRef = doc(firestore, 'procedureManuals', request.unitId);
          batch.set(manualRef, {
              id: request.unitId,
              unitName: request.unitName,
              googleDriveLink: manualDriveLink || request.revisedManualDocxLink,
              revisionNumber: manualRevisionNumber || '00',
              dateImplemented: manualDateImplemented || format(new Date(), 'MMM yyyy'),
              updatedAt: serverTimestamp()
          }, { merge: true });
      }

      await batch.commit();
      toast({ title: 'Decision Logged', description: `Request status transitioned to ${newStatus}.` });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Operation Failed', description: 'Failed to update request state.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');
  const isAwaitingPresident = request?.status === 'Awaiting Presidential Approval';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[92dvh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Gavel className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Oversight Panel</span>
                    </div>
                    <DialogTitle className="text-xl font-bold uppercase tracking-tight">
                        Procedure Revision Review Panel
                    </DialogTitle>
                    <p className="text-[10px] font-black font-mono text-muted-foreground tracking-tighter uppercase">
                        {request?.controlNumber || (isLoading ? '...' : `REQ-${requestId.substring(0,8)}`)}
                    </p>
                </div>
                {request && <Badge className="h-8 px-5 font-black uppercase text-[10px] tracking-widest bg-primary text-white border-none shadow-md">{request.status}</Badge>}
            </div>
        </DialogHeader>

        {isLoading ? (
            <div className="flex-1 flex items-center justify-center bg-white"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>
        ) : request ? (
            <div className="flex-1 flex overflow-hidden bg-white">
                <div className="flex-1 border-r flex flex-col min-w-0">
                    <ScrollArea className="flex-1">
                        <div className="p-8 space-y-8">
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-5 rounded-2xl border border-primary/5">
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Requesting Unit</p>
                                    <p className="text-sm font-black text-slate-800 uppercase flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-primary opacity-40" />{request.unitName}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Institutional Submitter</p>
                                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><User className="h-3.5 w-3.5 text-primary opacity-40" />{request.submitterName}</p>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2">
                                    <ShieldCheck className="h-4 w-4" /> 1. Revision Evidence (Signed DRRF)
                                </h4>
                                <div className="aspect-video w-full rounded-2xl border-2 border-slate-100 bg-muted overflow-hidden shadow-inner relative group">
                                    <iframe 
                                        src={getEmbedUrl(request.scannedDRRFLink)} 
                                        className="absolute inset-0 w-full h-full border-none bg-white"
                                        allow="autoplay"
                                        title="DRRF Evidence Preview"
                                    />
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="sm" className="h-8 font-black uppercase text-[9px] shadow-lg" asChild>
                                            <a href={request.scannedDRRFLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Full Source</a>
                                        </Button>
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2">
                                    <FileText className="h-4 w-4" /> 2. Detailed Revised Parts
                                </h4>
                                <div className="border rounded-2xl overflow-hidden shadow-md">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead className="text-[10px] font-black uppercase pl-6 w-[200px]">Section / Part</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase w-[120px]">Item No.</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">Description of Changes</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {request.revisedParts.map((part, i) => (
                                                <TableRow key={i} className="hover:bg-muted/10 transition-colors">
                                                    <TableCell className="pl-6"><span className="text-xs font-black text-primary">{part.part}</span></TableCell>
                                                    <TableCell className="text-[11px] font-bold text-slate-700">{part.itemNumber}</TableCell>
                                                    <TableCell className="text-[11px] text-muted-foreground italic py-3">{part.itemContents}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </section>

                            <Separator />

                            <section className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <FileText className="h-4 w-4" /> 3. Revised Process Manual Document (.docx)
                                    </h4>
                                    <Button size="sm" className="h-8 font-black uppercase text-[9px]" asChild>
                                        <a href={request.revisedManualDocxLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Inspect Word File</a>
                                    </Button>
                                </div>
                                <div className="aspect-[16/10] w-full rounded-2xl border-2 border-slate-100 bg-muted overflow-hidden shadow-inner relative">
                                    <iframe 
                                        src={getEmbedUrl(request.revisedManualDocxLink)} 
                                        className="absolute inset-0 w-full h-full border-none bg-white"
                                        allow="autoplay"
                                        title="Revised Word Manual Preview"
                                    />
                                </div>
                            </section>
                        </div>
                    </ScrollArea>
                </div>

                <div className="w-[400px] flex flex-col bg-slate-50/50 shrink-0">
                    <Tabs defaultValue="actions" className="flex-1 flex flex-col min-h-0">
                        <TabsList className="grid grid-cols-2 bg-white rounded-none border-b shrink-0 h-12">
                            <TabsTrigger value="actions" className="text-[10px] font-black uppercase tracking-widest gap-2"><CheckCircle2 className="h-4 w-4" /> Review Actions</TabsTrigger>
                            <TabsTrigger value="history" className="text-[10px] font-black uppercase tracking-widest gap-2"><HistoryIcon className="h-4 w-4" /> Discussion</TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-hidden">
                            <TabsContent value="actions" className="h-full m-0 flex flex-col">
                                <ScrollArea className="flex-1">
                                    <div className="p-6 space-y-6">
                                        {isAwaitingPresident ? (
                                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                                <Alert className="bg-amber-50 border-amber-200 shadow-sm">
                                                    <Gavel className="h-4 w-4 text-amber-600" />
                                                    <AlertTitle className="text-xs font-black uppercase tracking-tight text-amber-800">Final Executive Action Required</AlertTitle>
                                                    <AlertDescription className="text-[11px] leading-relaxed font-medium text-amber-700">
                                                        {isAdmin 
                                                            ? "This revision request has been approved. To commit changes to settings, please upload the signed Presidential approval link and configure the manual settings."
                                                            : "This revision has been approved by the Admin and is currently awaiting the President's signature."}
                                                    </AlertDescription>
                                                </Alert>

                                                {isAdmin && (
                                                    <div className="space-y-4">
                                                        <div className="space-y-2 border-b pb-4">
                                                            <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                                                                <LinkIcon className="h-3 w-3" /> Scanned Presidential Approval Link
                                                            </Label>
                                                            <Input 
                                                                value={approvedDRRFLink} 
                                                                onChange={(e) => setApprovedDRRFLink(e.target.value)} 
                                                                placeholder="https://drive.google.com/..." 
                                                                className="bg-white border-primary/20 h-10 font-bold text-xs"
                                                            />
                                                            <p className="text-[9px] text-muted-foreground italic">Provide the signed and scanned DRRF indicating executive approval.</p>
                                                        </div>

                                                        <div className="space-y-3 pt-2">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">Update Official Manual Settings</p>
                                                            <div className="space-y-1">
                                                                <Label className="text-[9px] font-black uppercase text-muted-foreground">Revision Word Document Link</Label>
                                                                <Input 
                                                                    value={manualDriveLink} 
                                                                    onChange={(e) => setManualDriveLink(e.target.value)} 
                                                                    placeholder="https://drive.google.com/..." 
                                                                    className="bg-white h-9 text-xs"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <Label className="text-[9px] font-black uppercase text-muted-foreground">New Rev No.</Label>
                                                                    <Input 
                                                                        value={manualRevisionNumber} 
                                                                        onChange={(e) => setManualRevisionNumber(e.target.value)} 
                                                                        placeholder="e.g. 01" 
                                                                        className="bg-white h-9 text-xs"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Effective Date</Label>
                                                                    <Input 
                                                                        value={manualDateImplemented} 
                                                                        onChange={(e) => setManualDateImplemented(e.target.value)} 
                                                                        placeholder="e.g. Oct 2024" 
                                                                        className="bg-white h-9 text-xs"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <GDrivePreview url={approvedDRRFLink} title="OP Approval Scanned DRRF" />

                                                        <div className="pt-4 space-y-2">
                                                            <Button 
                                                                type="button" 
                                                                className="w-full h-12 font-black text-xs uppercase bg-emerald-600 text-white hover:bg-emerald-700 gap-2 shadow-xl shadow-emerald-200" 
                                                                onClick={() => handleUpdateStatus('Approved & Registered', 'Presidential approval verified. Manual revision officially committed.')} 
                                                                disabled={isProcessing || !approvedDRRFLink.startsWith('https://drive.google.com/') || !manualRevisionNumber.trim() || !manualDateImplemented.trim()}
                                                            >
                                                                <ShieldCheck className="h-5 w-5" /> Finalize & Commit Revision
                                                            </Button>
                                                            <Button 
                                                                type="button" 
                                                                variant="outline"
                                                                className="w-full h-10 font-bold text-[10px] uppercase border-destructive/20 text-destructive hover:bg-destructive/5" 
                                                                onClick={() => handleUpdateStatus('Returned for Revision', 'Returned to unit coordinator from presidential approval stage.')} 
                                                                disabled={isProcessing}
                                                            >
                                                                <Undo2 className="h-3.5 w-3.5 mr-2" /> Revert to Unit
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : isAdmin ? (
                                            <div className="space-y-6">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck className="h-4 w-4 text-primary" />
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Compliance Checklist</h4>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {adminChecklistItems.map(item => (
                                                            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border bg-white shadow-sm transition-all hover:border-primary/30 cursor-pointer" onClick={() => handleToggleChecklist(item.id)}>
                                                                <Checkbox id={`check-${item.id}`} checked={adminChecklist[item.id] || false} onCheckedChange={() => handleToggleChecklist(item.id)} />
                                                                <Label htmlFor={`check-${item.id}`} className="text-xs font-medium leading-relaxed cursor-pointer">{item.label}</Label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-4 pt-4 border-t">
                                                    <div className="flex items-center gap-2">
                                                        <MessageSquare className="h-4 w-4 text-primary" />
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Official Findings / Comments</h4>
                                                    </div>
                                                    <Form {...form}>
                                                        <form className="space-y-4">
                                                            <FormField control={form.control} name="comment" render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl><Textarea {...field} placeholder="Enter review feedback or required changes..." rows={4} className="text-xs italic bg-white shadow-inner" /></FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )} />
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <Button type="button" variant="outline" className="text-destructive font-black h-10 text-[10px] uppercase border-destructive/20 hover:bg-destructive/5 gap-1.5" onClick={() => { const c = form.getValues('comment'); if(!c) { form.setError('comment', { type: 'manual', message: 'Feedback required for return.' }); return; } handleUpdateStatus('Returned for Revision', c); }} disabled={isProcessing}><Undo2 className="h-3.5 w-3.5" /> REVISE</Button>
                                                                <Button type="button" variant="outline" className="text-rose-600 border-rose-200 font-black h-10 text-[10px] uppercase hover:bg-rose-50 gap-1.5" onClick={() => { const c = form.getValues('comment'); if(!c) { form.setError('comment', { type: 'manual', message: 'Feedback required for rejection.' }); return; } handleUpdateStatus('Rejected', c); }} disabled={isProcessing}><AlertTriangle className="h-3.5 w-3.5" /> REJECT</Button>
                                                            </div>
                                                            <Separator />
                                                            <Button type="button" className="w-full h-11 font-black text-[10px] uppercase bg-emerald-600 text-white hover:bg-emerald-700 gap-2 shadow-xl shadow-emerald-200" onClick={() => handleUpdateStatus('Awaiting Presidential Approval', form.getValues('comment') || 'Review complete. Approved by Admin. Endorsed for executive signature.')} disabled={isProcessing || !isChecklistComplete}>
                                                                <Check className="h-4 w-4" /> Endorse (Forward to OP)
                                                            </Button>
                                                        </form>
                                                    </Form>
                                                </div>
                                            </div>
                                        ) : !isAdmin && request.status === 'Returned for Revision' ? (
                                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                                <Alert className="bg-rose-50 border-rose-200 shadow-sm">
                                                    <AlertTriangle className="h-4 w-4 text-rose-600 animate-bounce" />
                                                    <AlertTitle className="text-xs font-black uppercase tracking-tight text-rose-800">Revisions Required</AlertTitle>
                                                    <AlertDescription className="text-[11px] leading-relaxed font-medium text-rose-700">
                                                        This application has been returned for revision. Please review the comments and findings under the discussion tab to see what changes are needed, then resubmit.
                                                    </AlertDescription>
                                                </Alert>
                                                {onEditClick && (
                                                    <Button 
                                                        type="button" 
                                                        className="w-full h-11 font-black text-[10px] uppercase bg-rose-600 hover:bg-rose-700 text-white gap-2 shadow-xl shadow-rose-200" 
                                                        onClick={() => {
                                                            onEditClick(request);
                                                            onOpenChange(false);
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" /> Edit & Resubmit Wizard
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="py-20 text-center opacity-40">
                                                <Clock className="h-10 w-10 mx-auto mb-3" />
                                                <p className="text-xs font-bold uppercase tracking-widest">Oversight Pending</p>
                                                <p className="text-[10px] mt-2 italic px-6">The Quality Assurance Office is currently evaluating this revision application.</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="history" className="h-full m-0 flex flex-col overflow-hidden">
                                <ScrollArea className="flex-1">
                                    <div className="p-6 space-y-4">
                                        {request.comments?.length ? (
                                            <div className="space-y-4">
                                                {request.comments.slice().sort((a, b) => {
                                                    return getCommentTime(b.createdAt) - getCommentTime(a.createdAt);
                                                }).map((c, i) => (
                                                    <div key={i} className="bg-white p-4 rounded-xl border border-primary/5 shadow-sm space-y-2 transition-all hover:border-primary/20">
                                                        <div className="flex items-center justify-between gap-2 border-b pb-1 mb-1">
                                                            <span className="text-[10px] font-black uppercase text-primary truncate max-w-[120px]">{c.authorName}</span>
                                                            <span className="text-[8px] font-mono text-muted-foreground">{getFormattedCommentDate(c.createdAt)}</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-700 italic leading-relaxed whitespace-pre-wrap">"{c.text}"</p>
                                                        <p className="text-[8px] font-bold text-muted-foreground uppercase text-right">{c.authorRole}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-20 text-center opacity-10 flex flex-col items-center gap-3">
                                                <MessageSquare className="h-12 w-12" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">No conversation history</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                                <div className="p-4 border-t bg-white shrink-0">
                                    <div className="space-y-2">
                                        <Textarea
                                            value={discussionComment}
                                            onChange={(e) => setDiscussionComment(e.target.value)}
                                            placeholder="Write a message to the discussion..."
                                            rows={3}
                                            className="text-xs italic bg-slate-50 border-slate-200"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={handlePostDiscussionComment}
                                            disabled={isPostingComment || !discussionComment.trim()}
                                            className="w-full h-8 text-[10px] font-black uppercase tracking-wider"
                                        >
                                            {isPostingComment ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Send className="h-3 w-3 mr-1.5" />}
                                            Post Message
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        ) : (
            <div className="p-12 text-center text-muted-foreground font-black uppercase tracking-widest opacity-20">Revision request not found</div>
        )}

        <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
            <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground" onClick={() => onOpenChange(false)}>Close Oversight Workspace</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
