'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from '@/firebase/firestore-wrapper';
import { useMemo } from 'react';
import type { Submission, User as AppUser, Campus } from '@/lib/types';
import { format } from 'date-fns';
import { Loader2, ClipboardCheck, LayoutList, User, Building2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const getYearRowColor = (year: number) => {
  const colors: Record<number, string> = {
    2024: 'bg-blue-50/50 hover:bg-blue-100/50',
    2025: 'bg-green-50/50 hover:bg-green-100/50',
    2026: 'bg-amber-50/50 hover:bg-amber-100/50',
  };
  return colors[year] || 'bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/50';
};

export default function ApprovalsPage() {
  const { userProfile, isUserLoading, isAdmin, userRole, isSupervisor } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // REAL-TIME SUBMISSIONS LISTENER
  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || !isSupervisor) return null;
    const baseRef = collection(firestore, 'submissions');
    
    const isGlobalViewer = isAdmin || userRole?.toLowerCase().includes('president') || userRole?.toLowerCase().includes('quality management') || userRole?.toLowerCase().includes('qms');
    
    if (isGlobalViewer) {
        return query(baseRef, where('statusId', '==', 'submitted'));
    }
    
    return query(
        baseRef, 
        where('statusId', '==', 'submitted'),
        where('campusId', '==', userProfile.campusId)
    );
  }, [firestore, userProfile, isAdmin, isSupervisor, userRole]);

  const { data: rawSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: allUsers } = useCollection<AppUser>(usersQuery);
  const userMap = useMemo(() => new Map(allUsers?.map(u => [u.id, u])), [allUsers]);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);
  const campusMap = useMemo(() => new Map(campuses?.map(c => [c.id, c.name])), [campuses]);

  const filteredSubmissions = useMemo(() => {
    return rawSubmissions || [];
  }, [rawSubmissions]);

  if (isUserLoading || isLoadingSubmissions) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest">Synchronizing Approval Queue...</p>
      </div>
    );
  }
  
  if (!isSupervisor) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-black uppercase text-slate-900 dark:text-slate-100">Access Denied</h2>
        <p className="text-muted-foreground text-sm mt-2">You do not have administrative oversight permissions.</p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b">
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Institutional Approvals</h2>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
            Review and act on submissions awaiting your verification.
          </p>
        </div>

        <Card className="shadow-lg border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-6">
            <CardTitle className="text-lg">Approval Queue</CardTitle>
            <CardDescription className="text-xs">
              Review {filteredSubmissions.length} active applications. Only <strong>Approved</strong> documents achieve quality maturity index status.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase pl-6">Document Type</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Submitter & Origin</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Submitted At</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Cycle Info</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => {
                  const submitter = userMap.get(submission.userId);
                  const subDate = submission.submissionDate instanceof Date ? submission.submissionDate : (submission.submissionDate as any)?.toDate?.() || new Date();
                  
                  return (
                    <TableRow 
                        key={submission.id}
                        className={cn("transition-colors group", getYearRowColor(submission.year))}
                    >
                        <TableCell className="pl-6 py-5">
                            <div className="flex flex-col gap-1">
                                <span className="font-black text-sm text-slate-900 dark:text-slate-100 uppercase group-hover:text-primary transition-colors">{submission.reportType}</span>
                                {submission.isDraft && (
                                    <Badge className="bg-blue-600 text-white border-none h-4 px-1 text-[8px] font-black uppercase w-fit">DRAFT</Badge>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-bold text-xs">{submitter ? `${submitter.firstName} ${submitter.lastName}` : '...'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-primary/60 uppercase tracking-tighter">
                                    <Building2 className="h-2.5 w-2.5" />
                                    {submission.unitName} &bull; {campusMap.get(submission.campusId)}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {format(subDate, 'PPp')}
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="h-4 text-[8px] font-black uppercase w-fit bg-white">{submission.year}</Badge>
                                <span className="text-[10px] font-bold capitalize text-muted-foreground">{submission.cycleId} Cycle</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                            <Button
                                variant={submission.isDraft ? "secondary" : "default"}
                                size="sm"
                                onClick={() => router.push(`/submissions/${submission.id}`)}
                                className="h-8 text-[10px] font-black uppercase tracking-widest shadow-md"
                            >
                                {submission.isDraft ? <LayoutList className="mr-1.5 h-3 w-3" /> : <ClipboardCheck className="mr-1.5 h-3 w-3" />}
                                {submission.isDraft ? 'Audit Draft' : 'Evaluate'}
                            </Button>
                        </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredSubmissions.length === 0 && (
              <div className="text-center py-20 text-muted-foreground flex flex-col items-center justify-center gap-3 opacity-20">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                <p className="text-xs font-black uppercase tracking-[0.2em]">Zero Pending Verifications</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
