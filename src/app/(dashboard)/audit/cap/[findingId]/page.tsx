'use client';

import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import type { AuditFinding } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorrectiveActionPlanForm } from '@/components/audit/corrective-action-plan-form';

export default function CorrectiveActionPlanPage() {
  const { findingId } = useParams();
  const firestore = useFirestore();
  const router = useRouter();

  const findingDocRef = useMemoFirebase(
    () => (firestore && findingId ? doc(firestore, 'auditFindings', findingId as string) : null),
    [firestore, findingId]
  );
  const { data: finding, isLoading: isLoadingFinding } = useDoc<AuditFinding>(findingDocRef);

  if (isLoadingFinding) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!finding) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Finding Not Found</h2>
        <p className="text-muted-foreground mt-2">The audit finding you are looking for does not exist.</p>
        <Button asChild className="mt-4" onClick={() => router.back()}>
            <span>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </span>
        </Button>
      </div>
    );
  }
  
  if (finding.type !== 'Non-Conformance') {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Invalid Action</h2>
        <p className="text-muted-foreground mt-2">Corrective Action Plans can only be submitted for Non-Conformance findings.</p>
        <Button asChild className="mt-4" onClick={() => router.back()}>
            <span>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </span>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sticky Header Enforced */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Corrective Action Plan</h2>
          <p className="text-muted-foreground text-sm">
            Submit a formal plan to address the Non-Conformance finding.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card className="shadow-lg border-primary/10">
                <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg font-black uppercase tracking-tight">CAP Submission Form</CardTitle>
                    <CardDescription className="text-xs font-medium">Please provide a detailed plan to address the non-conformance.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                    <CorrectiveActionPlanForm findingId={finding.id} />
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
             <Card className="sticky top-40 shadow-md border-rose-100">
                <CardHeader className="bg-rose-50 border-b">
                    <CardTitle className="text-xs font-black uppercase text-rose-700 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        Audit Finding Reference
                    </CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4 text-sm pt-6">
                    <div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">ISO Clause Requirement</p>
                        <p className="font-mono text-xs font-bold text-primary">Clause {finding.isoClause}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Auditor Observation</p>
                        <p className="text-slate-600 leading-relaxed italic text-xs">"{finding.description}"</p>
                    </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Objective Evidence</p>
                        <p className="text-slate-600 text-xs">{finding.evidence}</p>
                    </div>
                 </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
