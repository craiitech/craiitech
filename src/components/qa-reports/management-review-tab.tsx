
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, addDoc, serverTimestamp, where, Timestamp } from 'firebase/firestore';
import type { ManagementReview, ManagementReviewOutput, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Calendar, ExternalLink, Trash2, ListChecks, ChevronRight, User, Users, Globe, Building2, FileText, Presentation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MultiSelectUnits } from './multi-select-units';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ManagementReviewTabProps {
  campuses: Campus[];
  units: Unit[];
  canManage: boolean;
}

const mrSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  minutesLink: z.string().url('Invalid URL'),
  campusId: z.string().min(1, 'Campus is required'),
});

const outputSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  initiator: z.string().min(1, 'Initiator is required'),
  concernedUnitIds: z.array(z.string()).min(1, 'At least one unit is required'),
  actionPlan: z.string().min(1, 'Action plan is required'),
  followUpDate: z.string().min(1, 'Follow-up date is required'),
  status: z.enum(['Open', 'On-going', 'Closed']),
});

const UNIVERSITY_WIDE_ID = 'university-wide';

const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

export function ManagementReviewTab({ campuses, units, canManage }: ManagementReviewTabProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedMr, setSelectedMr] = useState<ManagementReview | null>(null);
  const [isMrDialogOpen, setIsMrDialogOpen] = useState(false);
  const [isOutputDialogOpen, setIsOutputDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reviewsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'managementReviews'), orderBy('startDate', 'desc')) : null),
    [firestore]
  );
  const { data: reviews, isLoading: isLoadingReviews } = useCollection<ManagementReview>(reviewsQuery);

  const outputsQuery = useMemoFirebase(
    () => (firestore && selectedMr ? query(collection(firestore, 'managementReviewOutputs'), where('mrId', '==', selectedMr.id)) : null),
    [firestore, selectedMr]
  );
  const { data: outputs, isLoading: isLoadingOutputs } = useCollection<ManagementReviewOutput>(outputsQuery);

  const mrForm = useForm<z.infer<typeof mrSchema>>({
    resolver: zodResolver(mrSchema),
    defaultValues: { title: '', startDate: '', endDate: '', minutesLink: '', campusId: '' }
  });

  const outputForm = useForm<z.infer<typeof outputSchema>>({
    resolver: zodResolver(outputSchema),
    defaultValues: { description: '', initiator: '', concernedUnitIds: [], actionPlan: '', followUpDate: '', status: 'Open' }
  });

  const handleMrSubmit = async (values: z.infer<typeof mrSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'managementReviews'), {
        ...values,
        startDate: Timestamp.fromDate(new Date(values.startDate)),
        endDate: Timestamp.fromDate(new Date(values.endDate)),
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'Management Review session added.' });
      setIsMrDialogOpen(false);
      mrForm.reset();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add MR.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOutputSubmit = async (values: z.infer<typeof outputSchema>) => {
    if (!firestore || !selectedMr) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'managementReviewOutputs'), {
        ...values,
        mrId: selectedMr.id,
        followUpDate: Timestamp.fromDate(new Date(values.followUpDate)),
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'MR Output added.' });
      setIsOutputDialogOpen(false);
      outputForm.reset();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add output.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const campusMap = useMemo(() => {
    const map = new Map(campuses.map(c => [c.id, c.name]));
    map.set(UNIVERSITY_WIDE_ID, 'University-Wide');
    return map;
  }, [campuses]);

  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  const safeFormatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return format(d, 'PP');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Meeting Logs</h3>
          {canManage && (
            <Button onClick={() => setIsMrDialogOpen(true)} size="sm" variant="outline" className="h-8 text-[10px] font-bold">
              <PlusCircle className="h-3 w-3 mr-1.5" /> NEW SESSION
            </Button>
          )}
        </div>
        <ScrollArea className="h-[70vh]">
          <div className="space-y-2 pr-4">
            {reviews?.map(review => (
              <Card 
                key={review.id} 
                className={cn("cursor-pointer transition-all hover:shadow-md", selectedMr?.id === review.id ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:bg-muted/50")}
                onClick={() => setSelectedMr(review)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5 min-w-0">
                      <p className="font-bold text-sm truncate">{review.title}</p>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                            <Calendar className="h-3 w-3" />
                            {safeFormatDate(review.startDate)}
                            {review.endDate && ` - ${safeFormatDate(review.endDate)}`}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                            {review.campusId === UNIVERSITY_WIDE_ID ? (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 h-4 px-1.5 text-[8px] font-black uppercase">Institutional</Badge>
                            ) : (
                                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {campusMap.get(review.campusId) || '...'}</span>
                            )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 mt-1", selectedMr?.id === review.id && "text-primary")} />
                  </div>
                </CardContent>
              </Card>
            ))}
            {reviews?.length === 0 && (
                <div className="text-center py-20 border border-dashed rounded-xl bg-muted/10">
                    <Calendar className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">No sessions found</p>
                </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="lg:col-span-2">
        {selectedMr ? (
          <div className="h-full flex flex-col space-y-4">
            <Card className="shrink-0 border-primary/10 shadow-sm">
                <CardHeader className="py-4 border-b bg-muted/10">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg font-black uppercase tracking-tight">{selectedMr.title}</CardTitle>
                                {selectedMr.campusId === UNIVERSITY_WIDE_ID && (
                                    <Badge className="bg-primary text-white text-[8px] font-black h-4 px-1.5">INSTITUTIONAL</Badge>
                                )}
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Selected Management Review Session</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold" asChild>
                            <a href={selectedMr.minutesLink} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1.5" /> OPEN IN DRIVE
                            </a>
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <Tabs defaultValue="outputs" className="flex-1 flex flex-col min-h-0">
                <TabsList className="bg-muted p-1 border grid grid-cols-2 shrink-0">
                    <TabsTrigger value="outputs" className="text-[10px] font-black uppercase tracking-widest gap-2">
                        <ListChecks className="h-3.5 w-3.5" /> Decisions & Actions
                    </TabsTrigger>
                    <TabsTrigger value="minutes" className="text-[10px] font-black uppercase tracking-widest gap-2">
                        <FileText className="h-3.5 w-3.5" /> Minutes Preview
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="outputs" className="flex-1 min-h-0 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card className="h-full flex flex-col overflow-hidden">
                        <div className="p-4 border-b bg-muted/5 flex items-center justify-between shrink-0">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Decisions / Action Plans Registry</h4>
                            {canManage && (
                                <Button onClick={() => setIsOutputDialogOpen(true)} size="sm" className="h-7 text-[9px] font-black uppercase shadow-lg shadow-primary/20">
                                    <PlusCircle className="h-3 w-3 mr-1.5" /> ADD OUTPUT
                                </Button>
                            )}
                        </div>
                        <CardContent className="p-0 flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                {isLoadingOutputs ? (
                                    <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="text-[10px] font-black uppercase py-2">Decision / Description</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase py-2">Concerned Units</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase py-2 text-center">Follow-up</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase py-2 text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {outputs?.map(output => (
                                                <TableRow key={output.id} className="hover:bg-muted/20 transition-colors">
                                                    <TableCell className="max-w-xs py-4">
                                                        <p className="font-bold text-xs text-slate-800 leading-relaxed">{output.description}</p>
                                                        <div className="flex items-center gap-1.5 mt-2 opacity-60">
                                                            <User className="h-2.5 w-2.5" />
                                                            <span className="text-[9px] font-bold uppercase tracking-tighter">Initiator: {output.initiator}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {output.concernedUnitIds.map(uid => (
                                                                <Badge key={uid} variant="outline" className="text-[8px] font-bold border-primary/20 bg-background text-primary/80 h-4 py-0 uppercase">
                                                                    {unitMap.get(uid) || '...'}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="text-[10px] font-black tabular-nums text-slate-600">
                                                            {output.followUpDate?.toDate ? format(output.followUpDate.toDate(), 'MMM dd, yy') : 'N/A'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge 
                                                            className={cn(
                                                                "text-[9px] font-black uppercase border-none px-2 shadow-sm",
                                                                output.status === 'Open' ? "bg-rose-600 text-white" : 
                                                                output.status === 'On-going' ? "bg-amber-500 text-amber-950" : 
                                                                "bg-emerald-600 text-white"
                                                            )}
                                                        >
                                                            {output.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {outputs?.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-40 text-center">
                                                        <div className="flex flex-col items-center gap-2 opacity-20">
                                                            <Presentation className="h-10 w-10" />
                                                            <p className="text-[10px] font-black uppercase tracking-widest">No decisions logged</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="minutes" className="flex-1 min-h-0 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card className="h-full flex flex-col overflow-hidden border-primary/10">
                        <div className="p-4 border-b bg-muted/5 flex items-center justify-between shrink-0">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Minutes of the Meeting Preview</h4>
                            <p className="text-[9px] font-bold text-muted-foreground italic">Powered by Google Drive</p>
                        </div>
                        <div className="flex-1 bg-muted relative">
                            <iframe
                                src={getEmbedUrl(selectedMr.minutesLink)}
                                className="absolute inset-0 w-full h-full border-none bg-white"
                                allow="autoplay"
                                title="MR Minutes Preview"
                            />
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center border border-dashed rounded-2xl bg-muted/5 text-muted-foreground animate-in fade-in duration-500">
            <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mb-4">
                <Users className="h-10 w-10 opacity-20" />
            </div>
            <h4 className="font-black text-xs uppercase tracking-[0.2em]">MR Content Hub</h4>
            <p className="text-[10px] mt-2 max-w-[200px] text-center">Select a Management Review session from the meeting log to view minutes and decisions.</p>
          </div>
        )}
      </div>

      <Dialog open={isMrDialogOpen} onOpenChange={setIsMrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
                <Presentation className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Session Creation</span>
            </div>
            <DialogTitle className="text-xl font-bold">New Management Review</DialogTitle>
            <DialogDescription className="text-xs">Log an institutional review session into the registry.</DialogDescription>
          </DialogHeader>
          <Form {...mrForm}>
            <form onSubmit={mrForm.handleSubmit(handleMrSubmit)} className="space-y-4 pt-4">
              <FormField control={mrForm.control} name="title" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold uppercase">Meeting Title</FormLabel><FormControl><Input {...field} placeholder="e.g., 1st Quarter Management Review" className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={mrForm.control} name="startDate" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold uppercase">Start Date</FormLabel><FormControl><Input type="date" {...field} className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={mrForm.control} name="endDate" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold uppercase">End Date</FormLabel><FormControl><Input type="date" {...field} className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={mrForm.control} name="campusId" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold uppercase">Review Scope</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select Scope" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={UNIVERSITY_WIDE_ID} className="font-bold text-primary italic">University-Wide (Institutional)</SelectItem>
                      {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={mrForm.control} name="minutesLink" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold uppercase">Google Drive Minutes Link</FormLabel><FormControl><Input {...field} placeholder="https://drive.google.com/..." className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsMrDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[120px] shadow-lg shadow-primary/20">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-1.5" />}
                    Register Session
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isOutputDialogOpen} onOpenChange={setIsOutputDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
                <ListChecks className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Decision Registry</span>
            </div>
            <DialogTitle className="text-xl font-bold">Log Review Output</DialogTitle>
            <DialogDescription className="text-xs">Document actionable items or policy decisions from this session.</DialogDescription>
          </DialogHeader>
          <Form {...outputForm}>
            <form onSubmit={outputForm.handleSubmit(handleOutputSubmit)} className="space-y-6 pt-4">
              <FormField control={outputForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold uppercase">Decision Description / Statement</FormLabel><FormControl><Input {...field} placeholder="Summarize the decision or required action..." className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={outputForm.control} name="initiator" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold uppercase">Initiator / Responsible Party</FormLabel><FormControl><Input {...field} placeholder="Name or Office" className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={outputForm.control} name="followUpDate" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold uppercase">Follow-up Target Date</FormLabel><FormControl><Input type="date" {...field} className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={outputForm.control} name="concernedUnitIds" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold uppercase">Concerned Unit(s) / Offices</FormLabel>
                  <FormControl>
                    <MultiSelectUnits 
                      units={units} 
                      selectedIds={field.value} 
                      onSelect={(ids) => field.onChange(ids)} 
                    />
                  </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={outputForm.control} name="actionPlan" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold uppercase">Proposed Action Strategy</FormLabel><FormControl><Input {...field} placeholder="How will this be implemented?" className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={outputForm.control} name="status" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold uppercase text-primary">Initial Lifecycle Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="bg-primary/5 border-primary/20 font-black"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="On-going">On-going</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOutputDialogOpen(false)} disabled={isSubmitting}>Discard</Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[150px] shadow-xl shadow-primary/20 font-black">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4 mr-1.5" />}
                    Log MR Output
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
