
'use client';

import { useState, useMemo } from 'react';
import type { Unit, UnitForm, UnitFormRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    PlusCircle, 
    Loader2, 
    FileText, 
    History, 
    ExternalLink, 
    ListChecks, 
    Clock, 
    CheckCircle2, 
    ShieldCheck, 
    AlertCircle,
    Info,
    LayoutList,
    Download
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FormRegistrationDialog } from './form-registration-dialog';
import { FormRequestReviewDialog } from './form-request-review-dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface UnitFormsTabProps {
  unit: Unit;
}

const statusColors: Record<string, string> = {
    'Submitted': 'bg-blue-100 text-blue-700',
    'QA Review': 'bg-indigo-100 text-indigo-700',
    'Returned for Correction': 'bg-rose-100 text-rose-700',
    'Awaiting Presidential Approval': 'bg-amber-100 text-amber-700',
    'Approved & Registered': 'bg-emerald-100 text-emerald-700',
};

export function UnitFormsTab({ unit }: UnitFormsTabProps) {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const [isRegOpen, setIsRegOpen] = useState(false);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);

  const canRegister = isAdmin || (userProfile?.unitId === unit.id && (userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO'));

  const formsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'unitForms'), where('unitId', '==', unit.id)) : null),
    [firestore, unit.id]
  );
  const { data: forms, isLoading: isLoadingForms } = useCollection<UnitForm>(formsQuery);

  const requestsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'unitFormRequests'), where('unitId', '==', unit.id), orderBy('createdAt', 'desc')) : null),
    [firestore, unit.id]
  );
  const { data: requests, isLoading: isLoadingRequests } = useCollection<UnitFormRequest>(requestsQuery);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Unit Forms & Records Registry
            </h3>
            <p className="text-xs text-muted-foreground font-medium">Official controlled documents used for capturing evidence of EOMS processes.</p>
        </div>
        {canRegister && (
            <Button onClick={() => setIsRegOpen(true)} size="sm" className="h-9 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest gap-2">
                <PlusCircle className="h-4 w-4" />
                Register New Form
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-primary/10 overflow-hidden">
                <CardHeader className="bg-muted/10 border-b py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            <CardTitle className="text-sm font-black uppercase tracking-tight">Active Roster: List of Forms and Records</CardTitle>
                        </div>
                        <Badge variant="outline" className="bg-white font-black text-[10px]">{forms?.length || 0} FORMS</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingForms ? (
                        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase pl-6">Form Code</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Official Title</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Rev.</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase pr-6">Reference</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {forms?.sort((a,b) => a.formCode.localeCompare(b.formCode)).map(form => (
                                    <TableRow key={form.id} className="hover:bg-muted/20 transition-colors">
                                        <TableCell className="pl-6 font-mono text-xs font-bold text-primary">{form.formCode}</TableCell>
                                        <TableCell className="text-[13px] font-bold text-slate-800">{form.formName}</TableCell>
                                        <TableCell><Badge variant="secondary" className="h-4 text-[9px] font-bold uppercase">{form.revision}</Badge></TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" asChild>
                                                <a href={form.googleDriveLink} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {forms?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2 opacity-20">
                                                <FileText className="h-10 w-10" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Official roster is empty</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                <div className="p-4 bg-muted/10 border-t">
                    <div className="flex items-start gap-3">
                        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-muted-foreground italic leading-tight">
                            <strong>Standard Note:</strong> These forms are officially controlled under ISO 21001:2018. Units must ensure that only the latest approved revisions listed here are used for record-keeping.
                        </p>
                    </div>
                </div>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col h-full bg-background">
                <CardHeader className="bg-muted/10 border-b py-4">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Request Track & Trace</CardTitle>
                    </div>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lifecycle of form registrations.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-[500px]">
                        {isLoadingRequests ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary opacity-20" /></div>
                        ) : (
                            <div className="divide-y">
                                {requests?.map(req => (
                                    <div 
                                        key={req.id} 
                                        className="p-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                                        onClick={() => setReviewRequestId(req.id)}
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <Badge className={cn("text-[8px] font-black uppercase h-4 px-1.5 border-none shadow-none", statusColors[req.status])}>
                                                    {req.status}
                                                </Badge>
                                                <span className="text-[10px] font-mono text-muted-foreground">{format(req.createdAt?.toDate ? req.createdAt.toDate() : new Date(), 'MMM dd, yy')}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-black text-slate-800 uppercase leading-tight">Registration Request</p>
                                                <p className="text-[10px] text-muted-foreground font-medium">{req.requestedForms.length} Individual Forms Linked</p>
                                            </div>
                                            <div className="flex items-center justify-between pt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Current Holder: QA Office</span>
                                                </div>
                                                <ChevronRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {requests?.length === 0 && (
                                    <div className="py-20 text-center opacity-20 flex flex-col items-center gap-2">
                                        <Activity className="h-8 w-8" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No active requests</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
                <div className="p-4 bg-primary/5 border-t">
                    <p className="text-[9px] text-primary/70 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Target className="h-3 w-3" />
                        Target: 100% Control
                    </p>
                </div>
            </Card>
        </div>
      </div>

      <FormRegistrationDialog 
        isOpen={isRegOpen} 
        onOpenChange={setIsRegOpen} 
        unit={unit} 
      />

      {reviewRequestId && (
          <FormRequestReviewDialog
            requestId={reviewRequestId}
            isOpen={!!reviewRequestId}
            onOpenChange={(open) => !open && setReviewRequestId(null)}
          />
      )}
    </div>
  );
}
