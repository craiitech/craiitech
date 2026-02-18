'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, where, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { ManagementReviewOutput, Campus, Unit, ManagementReview } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, ClipboardList, Send, Building2, ListChecks, History, Info, User, CheckCircle2, Hash, ChevronRight, Eye, LayoutList, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ActionableDecisionsTabProps {
  campuses: Campus[];
  units: Unit[];
}

const updateSchema = z.object({
  followUpRemarks: z.string().min(5, 'Please provide a descriptive update on actions taken.'),
  status: z.enum(['Open', 'On-going', 'Closed']),
  actionDate: z.string().min(1, 'Date of action is required.'),
  actionTakenBy: z.string().min(1, 'Name of the person who executed the action is required.'),
});

const ALL_UNITS_ID = 'all-units';
const ALL_ACADEMIC_ID = 'all-academic-units';
const ALL_ADMIN_ID = 'all-admin-units';
const ALL_REDI_ID = 'all-redi-units';

export function ActionableDecisionsTab({ campuses, units }: ActionableDecisionsTabProps) {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedOutput, setSelectedOutput] = useState<ManagementReviewOutput | null>(null);
  const [previewOutput, setPreviewOutput] = useState<ManagementReviewOutput | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scoped Query - Fetch all outputs and filter in-memory for precision hierarchy
  const outputsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(collection(firestore, 'managementReviewOutputs'), orderBy('createdAt', 'desc'));
  }, [firestore, userProfile]);

  const { data: rawOutputs, isLoading: isLoadingOutputs } = useCollection<ManagementReviewOutput>(outputsQuery);

  const reviewsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'managementReviews') : null), [firestore]);
  const { data: reviews } = useCollection<ManagementReview>(reviewsQuery);

  const myUnit = useMemo(() => {
    if (!userProfile?.unitId || !units) return null;
    return units.find(u => u.id === userProfile.unitId);
  }, [userProfile?.unitId, units]);

  const filteredOutputs = useMemo(() => {
    if (!rawOutputs || !userProfile) return [];
    if (isAdmin) return rawOutputs;

    const isCampusLevel = userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president');
    const isUnitLevel = userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO';

    return rawOutputs.filter(output => {
        return (output.assignments || []).some(a => {
            const isInstitutional = a.campusId === 'university-wide';
            const isMyCampus = a.campusId === userProfile.campusId;
            
            if (!isInstitutional && !isMyCampus) return false;

            if (isCampusLevel) return true;

            if (isUnitLevel) {
                if (a.unitId === ALL_UNITS_ID) return true;
                if (a.unitId === ALL_ACADEMIC_ID && myUnit?.category === 'Academic') return true;
                if (a.unitId === ALL_ADMIN_ID && myUnit?.category === 'Administrative') return true;
                if (a.unitId === ALL_REDI_ID && myUnit?.category === 'Research') return true;
                if (a.unitId === userProfile.unitId) return true;
            }
            return true;
        });
    });
  }, [rawOutputs, userProfile, isAdmin, userRole, myUnit]);

  const form = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: { status: 'Open', followUpRemarks: '', actionDate: format(new Date(), 'yyyy-MM-dd'), actionTakenBy: '' }
  });

  const handleOpenUpdate = (output: ManagementReviewOutput) => {
    setSelectedOutput(output);
    const safeDate = (d: any) => d?.toDate ? format(d.toDate(), 'yyyy-MM-dd') : (d ? format(new Date(d), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    
    form.reset({
        status: output.status,
        followUpRemarks: output.followUpRemarks || '',
        actionDate: safeDate(output.actionDate),
        actionTakenBy: output.actionTakenBy || (userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '')
    });
    setIsUpdateDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof updateSchema>) => {
    if (!firestore || !selectedOutput) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(firestore, 'managementReviewOutputs', selectedOutput.id);
      await updateDoc(docRef, {
        ...values,
        actionDate: Timestamp.fromDate(new Date(values.actionDate)),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Update Recorded', description: 'Your action update has been successfully logged.' });
      setIsUpdateDialogOpen(false);
    } catch (error) {
      toast({ title: 'Update Failed', description: 'Could not save the update.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const campusMap = useMemo(() => {
    const map = new Map(campuses.map(c => [c.id, c.name]));
    map.set('university-wide', 'University-Wide');
    return map;
  }, [campuses]);
  
  const unitMap = useMemo(() => {
    const map = new Map(units.map(u => [u.id, u.name]));
    map.set(ALL_UNITS_ID, 'All Units / Institutional');
    map.set(ALL_ACADEMIC_ID, 'All Academic Units');
    map.set(ALL_ADMIN_ID, 'All Administrative Units');
    map.set(ALL_REDI_ID, 'All REDi Units');
    return map;
  }, [units]);
  
  const reviewMap = new Map(reviews?.map(r => [r.id, r.title]));

  const safeFormatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return format(d, 'PP');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-black uppercase tracking-tight">Assigned MR Action Items</h3>
        <p className="text-xs text-muted-foreground font-medium">Decisions from Management Reviews requiring action from your unit or campus.</p>
      </div>

      <Card className="shadow-sm border-primary/10 overflow-hidden">
        <CardContent className="p-0">
          {isLoadingOutputs ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase w-[40px]">#</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase">Decision & Source</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase">Responsibility</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-center">Deadline</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-right">Status</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredOutputs.map((output, index) => (
                    <TableRow 
                        key={output.id} 
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setPreviewOutput(output)}
                    >
                        <TableCell className="text-[10px] font-black text-muted-foreground text-center">{index + 1}</TableCell>
                        <TableCell>
                        <div className="flex flex-col gap-1 max-w-xs">
                            <span className="font-bold text-sm text-slate-900 leading-snug">{output.description}</span>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-primary/60 uppercase tracking-tighter">
                                    <History className="h-2.5 w-2.5" />
                                    From: {reviewMap.get(output.mrId) || 'Management Review'}
                                </div>
                                {output.lineNumber && (
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">
                                        <Hash className="h-2 w-2" />
                                        Line: {output.lineNumber}
                                    </div>
                                )}
                            </div>
                        </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                {(output.assignments || []).map((a, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                        <Badge variant="secondary" className="text-[8px] h-4 font-black bg-primary/5 text-primary border-none">
                                            {campusMap.get(a.campusId) || a.campusId}
                                        </Badge>
                                        <Badge variant="outline" className={cn(
                                            "text-[8px] h-4 font-bold border-muted-foreground/20",
                                            a.unitId === ALL_UNITS_ID ? "bg-blue-50 text-blue-700" :
                                            a.unitId === ALL_ADMIN_ID ? "bg-slate-50 text-slate-700" :
                                            a.unitId === ALL_REDI_ID ? "bg-purple-50 text-purple-700" :
                                            "text-muted-foreground"
                                        )}>
                                            {unitMap.get(a.unitId) || a.unitId}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </TableCell>
                        <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-600">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {safeFormatDate(output.followUpDate)}
                            </div>
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
                        <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setPreviewOutput(output)} 
                                    className="h-8 text-[10px] font-bold uppercase tracking-widest gap-1.5"
                                >
                                    <Eye className="h-3.5 w-3.5" /> PREVIEW
                                </Button>
                                <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={() => handleOpenUpdate(output)} 
                                    className="h-8 text-[10px] font-black uppercase tracking-widest bg-primary shadow-lg shadow-primary/10"
                                >
                                    UPDATE
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                    ))}
                    {!isLoadingOutputs && filteredOutputs.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2 opacity-20">
                                <ListChecks className="h-10 w-10" />
                                <p className="text-xs font-bold uppercase tracking-widest">No action items assigned to you</p>
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

      {/* --- PREVIEW DIALOG --- */}
      <Dialog open={!!previewOutput} onOpenChange={(open) => !open && setPreviewOutput(null)}>
        <DialogContent className="max-w-2xl overflow-hidden p-0 border-none shadow-2xl">
            {previewOutput && (
                <>
                    <DialogHeader className="p-6 bg-slate-50 border-b shrink-0">
                        <div className="flex items-center gap-2 text-primary mb-1">
                            <LayoutList className="h-5 w-5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Management Decision Review</span>
                        </div>
                        <DialogTitle className="text-xl font-bold">Action Item Details</DialogTitle>
                        <DialogDescription className="text-xs">Comprehensive view of the institutional requirement and assigned responsibilities.</DialogDescription>
                    </DialogHeader>
                    
                    <ScrollArea className="max-h-[60vh]">
                        <div className="p-8 space-y-8">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Requirement Statement</h4>
                                    {previewOutput.lineNumber && (
                                        <Badge variant="outline" className="h-5 text-[9px] font-black border-primary/20 text-primary">
                                            LINE NO: {previewOutput.lineNumber}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-lg font-bold text-slate-900 leading-relaxed italic">
                                    "{previewOutput.description}"
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <User className="h-3 w-3" /> Origin & Authority
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Initiator</p>
                                            <p className="text-xs font-bold text-slate-700">{previewOutput.initiator}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Source Session</p>
                                            <p className="text-xs font-bold text-slate-700">{reviewMap.get(previewOutput.mrId) || 'Management Review'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Target className="h-3 w-3" /> Targets & Deadlines
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Current Status</p>
                                            <Badge 
                                                className={cn(
                                                    "text-[9px] font-black uppercase border-none h-5 px-2 mt-1",
                                                    previewOutput.status === 'Open' ? "bg-rose-600 text-white" : 
                                                    previewOutput.status === 'On-going' ? "bg-amber-500 text-amber-950" : 
                                                    "bg-emerald-600 text-white"
                                                )}
                                            >
                                                {previewOutput.status}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Follow-up Deadline</p>
                                            <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">
                                                {safeFormatDate(previewOutput.followUpDate)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Accountability Matrix</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {(previewOutput.assignments || []).map((a, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-3.5 w-3.5 text-primary/60" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-primary leading-none mb-1">{campusMap.get(a.campusId)}</span>
                                                    <span className="text-[11px] font-bold text-slate-700 truncate max-w-[180px]">{unitMap.get(a.unitId)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {previewOutput.actionPlan && (
                                <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">Proposed Action Strategy</h4>
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                        {previewOutput.actionPlan}
                                    </p>
                                </div>
                            )}

                            {previewOutput.followUpRemarks && (
                                <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 mb-3">Implementation Progress</h4>
                                    <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-wrap italic">
                                        "{previewOutput.followUpRemarks}"
                                    </p>
                                    <div className="mt-4 pt-4 border-t border-emerald-200 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-emerald-700 uppercase">Action by: {previewOutput.actionTakenBy}</span>
                                        <span className="text-[10px] font-bold text-emerald-700 uppercase">{safeFormatDate(previewOutput.actionDate)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 border-t bg-slate-50 shrink-0">
                        <div className="flex w-full justify-between items-center">
                            <Button variant="ghost" size="sm" onClick={() => setPreviewOutput(null)} className="text-[10px] font-bold uppercase tracking-widest">
                                Close Preview
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={() => { setPreviewOutput(null); handleOpenUpdate(previewOutput); }}
                                className="shadow-lg shadow-primary/20 text-[10px] font-black uppercase tracking-widest px-6"
                            >
                                <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> UPDATE STATUS
                            </Button>
                        </div>
                    </DialogFooter>
                </>
            )}
        </DialogContent>
      </Dialog>

      {/* --- UPDATE DIALOG --- */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
                <Send className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Decision Follow-up</span>
            </div>
            <DialogTitle className="text-xl font-bold">Provide Action Update</DialogTitle>
            <DialogDescription className="text-xs">Update the status and provide progress notes for this assigned review output.</DialogDescription>
          </DialogHeader>
          
          <div className="p-4 bg-muted/30 rounded-lg border mb-4 space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Management Decision</p>
                {selectedOutput?.lineNumber && (
                    <Badge variant="outline" className="text-[9px] h-4 font-bold border-primary/30 text-primary uppercase">Minutes Line: {selectedOutput.lineNumber}</Badge>
                )}
            </div>
            <p className="text-sm font-bold leading-relaxed">{selectedOutput?.description}</p>
            <div className="flex items-center gap-4 pt-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Info className="h-3 w-3" /> Target: {safeFormatDate(selectedOutput?.followUpDate)}
                </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="actionDate" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Date of Action</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} className="bg-slate-50" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="actionTakenBy" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Executed By</FormLabel>
                        <FormControl>
                            <Input {...field} placeholder="Name of Person" className="bg-slate-50 font-bold" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="followUpRemarks" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Action Taken / Unit Progress</FormLabel>
                    <FormControl>
                        <Textarea {...field} placeholder="Describe the steps taken by your unit to address this MR decision..." rows={5} className="bg-slate-50" />
                    </FormControl>
                    <FormDescription className="text-[10px]">Provide evidence of completion or reasons for ongoing status.</FormDescription>
                    <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-primary">Current Lifecycle Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger className="bg-primary/5 border-primary/20 font-black"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Open">Open (No Action Yet)</SelectItem>
                            <SelectItem value="On-going">On-going (Implementation in progress)</SelectItem>
                            <SelectItem value="Closed">Closed (Implementation verified)</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsUpdateDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[150px] shadow-xl shadow-primary/20 font-black">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-1.5" />}
                    Log Progress
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
