'use client';

import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import type { AuditFinding } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft } from 'lucide-react';
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
      <div className="text-center">
        <h2 className="text-2xl font-bold">Finding Not Found</h2>
        <p className="text-muted-foreground">The audit finding you are looking for does not exist.</p>
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
      <div className="text-center">
        <h2 className="text-2xl font-bold">Invalid Action</h2>
        <p className="text-muted-foreground">Corrective Action Plans can only be submitted for Non-Conformance findings.</p>
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
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Corrective Action Plan</h2>
          <p className="text-muted-foreground">
            Submit a plan to address the Non-Conformance finding.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>CAP Submission Form</CardTitle>
                    <CardDescription>Please provide a detailed plan to address the non-conformance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CorrectiveActionPlanForm findingId={finding.id} />
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
             <Card className="sticky top-20">
                <CardHeader>
                    <CardTitle>Finding Details</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-2 text-sm">
                    <p><strong className="font-medium">Finding Type:</strong> {finding.type}</p>
                    <p><strong className="font-medium">ISO Clause:</strong> {finding.isoClause}</p>
                    <div>
                        <strong className="font-medium">Description:</strong>
                        <p className="text-muted-foreground">{finding.description}</p>
                    </div>
                     <div>
                        <strong className="font-medium">Evidence:</strong>
                        <p className="text-muted-foreground">{finding.evidence}</p>
                    </div>
                 </CardContent>
            </Card>
        </div>
      </div>

    </div>
  );
}
