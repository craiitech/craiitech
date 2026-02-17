
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, addDoc, serverTimestamp, where, Timestamp } from 'firebase/firestore';
import type { ManagementReview, ManagementReviewOutput, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Calendar, ExternalLink, Trash2, ListChecks, ChevronRight, User, Users, Globe, Building2 } from 'lucide-react';
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
    () => (firestore && selectedMr ? query(collection(firestore, 'managementReviewOutputs'), where('mrId', '==', selectedMr.id), orderBy('createdAt', 'desc')) : null),
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

  const unitMap = new Map(units.map(u => [u.id, u.name]));

  const safeFormatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return format(d, 'PP');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold">Meeting Logs</h3>
          {canManage && (
            <Button onClick={() => setIsMrDialogOpen(true)} size="sm" variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" /> New Session
            </Button>
          )}
        </div>
        <ScrollArea className="h-[60vh]">
          <div className="space-y-2">
            {reviews?.map(review => (
              <Card 
                key={review.id} 
                className={cn("cursor-pointer transition-colors hover:bg-muted/50", selectedMr?.id === review.id && "border-primary bg-primary/5")}
                onClick={() => setSelectedMr(review)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-sm">{review.title}</p>
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase">
                            <Calendar className="h-3 w-3" />
                            {safeFormatDate(review.startDate)}
                            {review.endDate && ` - ${safeFormatDate(review.endDate)}`}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase">
                            {review.campusId === UNIVERSITY_WIDE_ID ? (
                                <>
                                    <Globe className="h-3 w-3 text-primary" />
                                    <span className="text-primary italic">Institutional</span>
                                </>
                            ) : (
                                <>
                                    <Building2 className="h-3 w-3" />
                                    <span>{campusMap.get(review.campusId) || '...'}</span>
                                </>
                            )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground", selectedMr?.id === review.id && "text-primary")} />
                  </div>
                </CardContent>
              </Card>
            ))}
            {reviews?.length === 0 && <p className="text-center text-xs text-muted-foreground py-10 border border-dashed rounded-lg">No sessions recorded.</p>}
          </div>
        </ScrollArea>
      </div>

      <div className="lg:col-span-2">
        {selectedMr ? (
          <Card className="h-full">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{selectedMr.title}</CardTitle>
                    {selectedMr.campusId === UNIVERSITY_WIDE_ID && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary text-[9px] font-black h-4">UNIVERSITY-WIDE</Badge>
                    )}
                </div>
                <CardDescription>
                  <Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild>
                    <a href={selectedMr.minutesLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" /> View Minutes of Meeting
                    </a>
                  </Button>
                </CardDescription>
              </div>
              {canManage && (
                <Button onClick={() => setIsOutputDialogOpen(true)} size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" /> Log Output
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingOutputs ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Output Description</TableHead>
                      <TableHead>Concerned Units</TableHead>
                      <TableHead>Follow-up</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outputs?.map(output => (
                      <TableRow key={output.id}>
                        <TableCell className="max-w-xs">
                          <p className="font-bold text-xs">{output.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Initiator: {output.initiator}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {output.concernedUnitIds.map(uid => (
                              <Badge key={uid} variant="secondary" className="text-[9px]">{unitMap.get(uid) || '...'}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px]">
                          {output.followUpDate?.toDate ? format(output.followUpDate.toDate(), 'PP') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={output.status === 'Open' ? 'destructive' : output.status === 'On-going' ? 'secondary' : 'default'} className="text-[9px] uppercase font-bold">
                            {output.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {outputs?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs italic">No outputs logged for this session.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="h-full flex flex-col items-center justify-center border border-dashed rounded-lg text-muted-foreground">
            <Users className="h-12 w-12 opacity-10 mb-2" />
            <p className="text-sm">Select a Management Review session to view its outputs.</p>
          </div>
        )}
      </div>

      <Dialog open={isMrDialogOpen} onOpenChange={setIsMrDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Management Review Session</DialogTitle></DialogHeader>
          <Form {...mrForm}>
            <form onSubmit={mrForm.handleSubmit(handleMrSubmit)} className="space-y-4">
              <FormField control={mrForm.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Meeting Title</FormLabel><FormControl><Input {...field} placeholder="e.g., 1st Quarter Management Review" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={mrForm.control} name="startDate" render={({ field }) => (
                  <FormItem><FormLabel>Start of Meeting</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={mrForm.control} name="endDate" render={({ field }) => (
                  <FormItem><FormLabel>End of Meeting</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={mrForm.control} name="campusId" render={({ field }) => (
                <FormItem><FormLabel>Campus Scope</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Scope" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={UNIVERSITY_WIDE_ID} className="font-bold text-primary italic">University-Wide (Institutional)</SelectItem>
                      {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={mrForm.control} name="minutesLink" render={({ field }) => (
                <FormItem><FormLabel>GDrive Minutes Link</FormLabel><FormControl><Input {...field} placeholder="https://drive.google.com/..." /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter><Button type="submit" disabled={isSubmitting}>Save Session</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isOutputDialogOpen} onOpenChange={setIsOutputDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Log MR Output Entry</DialogTitle></DialogHeader>
          <Form {...outputForm}>
            <form onSubmit={outputForm.handleSubmit(handleOutputSubmit)} className="space-y-4">
              <FormField control={outputForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Output Description / Statement</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={outputForm.control} name="initiator" render={({ field }) => (
                  <FormItem><FormLabel>Initiator</FormLabel><FormControl><Input {...field} placeholder="Name or Office" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={outputForm.control} name="followUpDate" render={({ field }) => (
                  <FormItem><FormLabel>Follow-up Schedule</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={outputForm.control} name="concernedUnitIds" render={({ field }) => (
                <FormItem><FormLabel>Unit(s) Concerned</FormLabel>
                  <FormControl>
                    <MultiSelectUnits 
                      units={units} 
                      selectedIds={field.value} 
                      onSelect={(ids) => field.onChange(ids)} 
                    />
                  </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={outputForm.control} name="actionPlan" render={({ field }) => (
                <FormItem><FormLabel>Proposed Action Plans</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={outputForm.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Initial Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="On-going">On-going</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <DialogFooter><Button type="submit" disabled={isSubmitting}>Log Output</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
