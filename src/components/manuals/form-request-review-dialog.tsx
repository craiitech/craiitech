
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, writeBatch, collection, arrayUnion } from 'firebase/firestore';
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
    Hash,
    ChevronRight,
    CheckCircle2,
    Monitor,
    LayoutList,
    AlertTriangle,
    Link as LinkIcon,
    Eye
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
import type { UnitFormRequest, UnitFormRequestStatus } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

interface FormRequestReviewDialogProps {
  requestId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const commentSchema = z.object({
  comment: z.string().min(5, 'Please provide detailed feedback.'),
});

const adminChecklistItems = [
    { id: 'drf-signed', label: 'Is the DRF evidence log signed and complete?' },
    { id: 'code-match', label: 'Do form codes align with the Procedure Manual?' },
    { id: 'link-access', label: 'Are all individual form links public/viewable?' },
    { id: 'rev-correct', label: 'Is the revision history sequence accurate?' },
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
            Document Evidence Preview: {title}
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

export function FormRequestReviewDialog({ requestId, isOpen, onOpenChange }: FormRequestReviewDialogProps) {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeFormPreview, setActiveFormPreview] = useState<{ name: string; link: string } | null>(null);
  const [adminChecklist, setAdminChecklist] = useState<Record<string, boolean>>({});
  const [presidentialLink, setPresidentialLink] = useState('');

  const requestRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'unitFormRequests', requestId) : null),
    [firestore, requestId]
  );
  const { data: request, isLoading } = useDoc<UnitFormRequest>(requestRef);

  const form = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: { comment: '' }
  });

  useEffect(() => {
    if (request?.presidentialApprovalLink) {
        setPresidentialLink(request.presidentialApprovalLink);
    } else {
        setPresidentialLink('');
    }
  }, [request]);

  const isChecklistComplete = useMemo(() => {
    if (!request) return false;
    if (request.isDraft) return true;
    return adminChecklistItems.every(item => adminChecklist[item.id] === true);
  }, [adminChecklist, request]);

  const handleToggleChecklist = (id: string) => {
    setAdminChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdateStatus = async (newStatus: UnitFormRequestStatus, commentText?: string) => {
    if (!firestore || !request || !userProfile || !isAdmin) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(firestore);
      const reqDocRef = doc(firestore, 'unitFormRequests', request.id);

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

      if (newStatus === 'Approved & Registered' && presidentialLink) {
          updateData.presidentialApprovalLink = presidentialLink;
      }

      batch.update(reqDocRef, updateData);

      if (newStatus === 'Approved & Registered' && !request.isDraft) {
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
      toast({ title: 'Decision Logged', description: `Request status transitioned to ${newStatus}.` });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Operation Failed', description: 'Failed to update request state.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

  const isAwaitingPresident = request?.status === 'Awaiting Presidential Approval';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Gavel className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Oversight panel</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <DialogTitle className="text-xl font-bold uppercase tracking-tight">
                            {request?.isDraft ? 'Preliminary Draft Content Audit' : 'Final Form Registration Verification'}
                        </DialogTitle>
                        {request?.isDraft && <Badge className="bg-blue-600 text-white border-none h-5 px-2 text-[9px] font-black uppercase shadow-sm">DRAFT REVIEW MODE</Badge>}
                    </div>
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
                        <div className="p-8 space-y-10">
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
                                    <ShieldCheck className="h-4 w-4" /> 1. Registration Evidence (Signed DRF)
                                </h4>
                                <div className="aspect-video w-full rounded-2xl border-2 border-slate-100 bg-muted overflow-hidden shadow-inner relative group">
                                    <iframe 
                                        src={getEmbedUrl(request.scannedRegistrationFormLink)} 
                                        className="absolute inset-0 w-full h-full border-none bg-white"
                                        allow="autoplay"
                                        title="DRF Evidence Preview"
                                    />
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="sm" className="h-8 font-black uppercase text-[9px] shadow-lg" asChild>
                                            <a href={request.scannedRegistrationFormLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Full Source</a>
                                        </Button>
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            <section className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <FileText className="h-4 w-4" /> 2. Individual Form Analysis
                                    </h4>
                                    <p className="text-[9px] font-bold text-muted-foreground italic">Click code to inspect specific form content</p>
                                </div>
                                <div className="border rounded-2xl overflow-hidden shadow-md">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead className="text-[10px] font-black uppercase w-[150px] pl-6">Code</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">Official Title</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase text-center w-[80px]">Rev.</TableHead>
                                                <TableHead className="text-right text-[10px] font-black uppercase pr-6 w-[80px]">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {request.requestedForms.map((f, i) => (
                                                <TableRow key={i} className={cn("transition-colors cursor-pointer group", activeFormPreview?.link === f.link ? "bg-primary/5" : "hover:bg-muted/20")} onClick={() => setActiveFormPreview({ name: f.name, link: f.link })}>
                                                    <TableCell className="pl-6"><span className="font-mono text-[10px] font-black text-primary uppercase group-hover:underline underline-offset-4 decoration-primary/30">{f.code}</span></TableCell>
                                                    <TableCell className="text-[11px] font-bold text-slate-700">{f.name}</TableCell>
                                                    <TableCell className="text-center"><Badge variant="outline" className="h-4 text-[8px] font-black border-primary/20 bg-white">Rev {f.revision}</Badge></TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild onClick={(e) => e.stopPropagation()}>
                                                            <a href={f.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </section>

                            {activeFormPreview && (
                                <section className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Detailed Visual Inspection: {activeFormPreview.name}</h4>
                                        </div>
                                        <button onClick={() => setActiveFormPreview(null)} className="text-[9px] font-black uppercase text-muted-foreground hover:text-rose-600 transition-colors">Dismiss Viewer</button>
                                    </div>
                                    <div className="aspect-[16/10] w-full rounded-2xl border-4 border-emerald-50 bg-muted overflow-hidden shadow-2xl relative group">
                                        <iframe src={getEmbedUrl(activeFormPreview.link)} className="absolute inset-0 w-full h-full border-none bg-white" allow="autoplay" title="Form Preview" />
                                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="sm" className="h-8 bg-emerald-600 font-black uppercase text-[9px]" asChild>
                                                <a href={activeFormPreview.link} target="_blank" rel="noopener noreferrer">Inspect in GDrive</a>
                                            </Button>
                                        </div>
                                    </div>
                                </section>
                            )}
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
                                    <div className="p-6 space-y-8">
                                        {isAwaitingPresident ? (
                                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                                <Alert className="bg-amber-50 border-amber-200 shadow-sm">
                                                    <Gavel className="h-4 w-4 text-amber-600" />
                                                    <AlertTitle className="text-xs font-black uppercase tracking-tight text-amber-800">Final Executive Action Required</AlertTitle>
                                                    <AlertDescription className="text-[11px] leading-relaxed font-medium text-amber-700">
                                                        {isAdmin 
                                                            ? "This application has passed QA review. To complete the **Official Registration**, please provide the Google Drive link of the scanned/signed copy of the President's approval."
                                                            : "Your application has passed QA review and is currently awaiting the President's official approval. No further action is required from your unit at this time."}
                                                    </AlertDescription>
                                                </Alert>

                                                {isAdmin && (
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                                                                <LinkIcon className="h-3 w-3" /> Scanned Presidential Approval Link
                                                            </Label>
                                                            <Input 
                                                                value={presidentialLink} 
                                                                onChange={(e) => setPresidentialLink(e.target.value)} 
                                                                placeholder="https://drive.google.com/..." 
                                                                className="bg-white border-primary/20 h-11 font-bold shadow-inner"
                                                            />
                                                            <p className="text-[9px] text-muted-foreground italic">Provide the evidence of executive authority to finalize enrollment.</p>
                                                        </div>

                                                        <GDrivePreview url={presidentialLink} title="Presidential Approval Proof" />

                                                        <div className="pt-4 space-y-2">
                                                            <Button 
                                                                type="button" 
                                                                className="w-full h-12 font-black text-xs uppercase bg-emerald-600 text-white hover:bg-emerald-700 gap-2 shadow-xl shadow-emerald-200" 
                                                                onClick={() => handleUpdateStatus('Approved & Registered', 'Presidential approval verified. Forms officially enrolled in unit roster.')} 
                                                                disabled={isProcessing || !presidentialLink.startsWith('https://drive.google.com/')}
                                                            >
                                                                <ShieldCheck className="h-5 w-5" /> Finalize & Register All Forms
                                                            </Button>
                                                            <Button 
                                                                type="button" 
                                                                variant="outline"
                                                                className="w-full h-10 font-bold text-[10px] uppercase border-destructive/20 text-destructive hover:bg-destructive/5" 
                                                                onClick={() => handleUpdateStatus('Returned for Correction', 'Reverted from executive stage for corrective action.')} 
                                                                disabled={isProcessing}
                                                            >
                                                                <Undo2 className="h-3.5 w-3.5 mr-2" /> Revert to Unit
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {!isAdmin && request.presidentialApprovalLink && (
                                                    <div className="space-y-4">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Verification Evidence (Read-Only)</p>
                                                        <GDrivePreview url={request.presidentialApprovalLink} title="Presidential Approval Proof" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : isAdmin && !request.isDraft ? (
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
                                        ) : isAdmin && request.isDraft ? (
                                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2">
                                                <div className="flex items-center gap-2 text-blue-800">
                                                    <LayoutList className="h-4 w-4" />
                                                    <p className="text-[11px] font-black uppercase">Draft Content Audit Mode</p>
                                                </div>
                                                <p className="text-[10px] text-blue-700 leading-relaxed font-medium">Verify form content, layout, and coding accuracy. Strict compliance checklists and presidential approvals are bypassed for preliminary draft review.</p>
                                            </div>
                                        ) : (
                                            <div className="py-20 text-center opacity-40">
                                                <Clock className="h-10 w-10 mx-auto mb-3" />
                                                <p className="text-xs font-bold uppercase tracking-widest">Oversight Pending</p>
                                                <p className="text-[10px] mt-2 italic px-6">The Quality Assurance Office is currently evaluating this application.</p>
                                            </div>
                                        )}

                                        {isAdmin && !isAwaitingPresident && (
                                            <div className="space-y-4 pt-4 border-t">
                                                <div className="flex items-center gap-2">
                                                    <MessageSquare className="h-4 w-4 text-primary" />
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Official Findings / Comments</h4>
                                                </div>
                                                <Form {...form}>
                                                    <form className="space-y-4">
                                                        <FormField control={form.control} name="comment" render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl><Textarea {...field} placeholder="Enter review notes or required changes..." rows={4} className="text-xs italic bg-white shadow-inner" /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Button type="button" variant="outline" className="text-destructive font-black h-10 text-[10px] uppercase border-destructive/20 hover:bg-destructive/5 gap-1.5" onClick={() => { const c = form.getValues('comment'); if(!c) { form.setError('comment', { type: 'manual', message: 'Feedback required for rejection.' }); return; } handleUpdateStatus('Returned for Correction', c); }} disabled={isProcessing}><Undo2 className="h-3.5 w-3.5" /> REJECT</Button>
                                                            <Button type="button" variant="outline" className="h-10 font-black text-[10px] uppercase gap-1.5" onClick={() => { handleUpdateStatus('QA Review', form.getValues('comment') || 'Moved to active QA validation stage.'); }} disabled={isProcessing}><ShieldCheck className="h-3.5 w-3.5" /> START QA</Button>
                                                        </div>
                                                        <Separator />
                                                        <div className="space-y-2">
                                                            {!request.isDraft && (
                                                                <Button type="button" className="w-full h-11 font-black text-[10px] uppercase bg-amber-500 text-amber-950 hover:bg-amber-600 gap-2 shadow-lg shadow-amber-200" onClick={() => handleUpdateStatus('Awaiting Presidential Approval', 'Review complete. Endorsed for executive registration.')} disabled={isProcessing || !isChecklistComplete}><Monitor className="h-4 w-4" /> Endorse for Final Approval</Button>
                                                            )}
                                                            <Button type="button" className="w-full h-11 font-black text-[10px] uppercase bg-emerald-600 text-white hover:bg-emerald-700 gap-2 shadow-xl shadow-emerald-200" onClick={() => handleUpdateStatus('Approved & Registered', 'Verification complete. Forms now enrolled in institutional roster.')} disabled={isProcessing || !isChecklistComplete}>
                                                                <Check className="h-4 w-4" /> 
                                                                {request.isDraft ? 'Clear Draft as Satisfactory' : 'Register All Forms'}
                                                            </Button>
                                                        </div>
                                                        {!request.isDraft && (
                                                            <p className="text-[9px] text-muted-foreground italic text-center">Note: Final registration for non-drafts requires Presidential Approval Link at the next stage.</p>
                                                        )}
                                                    </form>
                                                </Form>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="history" className="h-full m-0 flex flex-col overflow-hidden">
                                <ScrollArea className="h-full">
                                    <div className="p-6 space-y-4">
                                        {request.comments?.length ? (
                                            <div className="space-y-4">
                                                {request.comments.slice().sort((a, b) => {
                                                    const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.toDate?.()?.getTime() || 0;
                                                    const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.toDate?.()?.getTime() || 0;
                                                    return dateB - dateA;
                                                }).map((c, i) => (
                                                    <div key={i} className="bg-white p-4 rounded-xl border border-primary/5 shadow-sm space-y-2 transition-all hover:border-primary/20">
                                                        <div className="flex items-center justify-between gap-2 border-b pb-1 mb-1">
                                                            <span className="text-[10px] font-black uppercase text-primary truncate max-w-[120px]">{c.authorName}</span>
                                                            <span className="text-[8px] font-mono text-muted-foreground">{format(c.createdAt instanceof Date ? c.createdAt : (c.createdAt as any).toDate(), 'MMM dd, p')}</span>
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
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        ) : (
            <div className="p-12 text-center text-muted-foreground font-black uppercase tracking-widest opacity-20">Request record not found</div>
        )}

        <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
            <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground" onClick={() => onOpenChange(false)}>Close Oversight Workspace</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
