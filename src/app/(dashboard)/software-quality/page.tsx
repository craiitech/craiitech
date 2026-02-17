
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { SoftwareEvaluation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, MonitorCheck, History, BarChart3, PlusCircle, ArrowLeft } from 'lucide-react';
import { Iso25010Form } from '@/components/evaluation/iso-25010-form';
import { EvaluationResults } from '@/components/evaluation/evaluation-results';
import Link from 'next/link';

/**
 * ADMIN SOFTWARE QUALITY DASHBOARD
 * Accessible at /software-quality (Within Dashboard Group)
 * Displays aggregate analytics and audit history for authorized users.
 */
export default function SoftwareQualityDashboardPage() {
  const { isAdmin, isUserLoading, userRole } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState('audit');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const canSeeResults = isAdmin || userRole === 'Auditor';

  const evaluationsQuery = useMemoFirebase(
    () => (firestore && canSeeResults ? query(collection(firestore, 'softwareEvaluations'), orderBy('timestamp', 'desc')) : null),
    [firestore, canSeeResults]
  );
  const { data: evaluations, isLoading: isLoadingEvaluations } = useCollection<SoftwareEvaluation>(evaluationsQuery);

  const isLoading = isUserLoading || (canSeeResults && isLoadingEvaluations);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canSeeResults) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground">Only Administrators and Auditors can view detailed software quality analytics.</p>
        <Button asChild><Link href="/dashboard">Return to Dashboard</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                  <Link href="/dashboard"><ArrowLeft className="h-4 w-4"/></Link>
              </Button>
              <div>
                  <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                      <MonitorCheck className="h-8 w-8 text-primary" />
                      Software Quality Maturity Dashboard
                  </h2>
                  <p className="text-muted-foreground">
                      ISO/IEC 25010 Aggregate Results & Historical Audit Records.
                  </p>
              </div>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="shadow-lg shadow-primary/20">
              <PlusCircle className="mr-2 h-4 w-4" />
              Conduct New Evaluation
          </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
              <TabsTrigger value="audit" className="gap-2 px-6">
                  <BarChart3 className="h-4 w-4" /> Quality Profile
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2 px-6">
                  <History className="h-4 w-4" /> Historical Log
              </TabsTrigger>
          </TabsList>

          <TabsContent value="audit">
              <EvaluationResults evaluations={evaluations || []} />
          </TabsContent>

          <TabsContent value="history">
              <Card className="shadow-md overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b">
                      <CardTitle>Stakeholder Evaluation Log</CardTitle>
                      <CardDescription>A chronological record of quality audits performed on the system.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                      <div className="divide-y">
                          {evaluations && evaluations.length > 0 ? (
                              evaluations.map((evaluation) => (
                                  <div key={evaluation.id} className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors">
                                      <div className="space-y-1">
                                          <p className="font-bold text-slate-900">Audit by {evaluation.userName}</p>
                                          <p className="text-xs text-muted-foreground flex items-center gap-2 uppercase tracking-widest font-semibold">
                                              <History className="h-3 w-3" />
                                              {evaluation.timestamp?.toDate ? evaluation.timestamp.toDate().toLocaleString() : new Date(evaluation.timestamp).toLocaleString()}
                                          </p>
                                      </div>
                                      <div className="text-right">
                                          <div className="text-3xl font-black text-primary tabular-nums tracking-tighter">
                                              {evaluation.overallScore.toFixed(1)}
                                          </div>
                                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Score / 5.0</p>
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <div className="text-center py-20 text-muted-foreground">
                                  <MonitorCheck className="h-12 w-12 mx-auto opacity-10 mb-4" />
                                  <p className="font-medium">No evaluations recorded yet.</p>
                              </div>
                          )}
                      </div>
                  </CardContent>
              </Card>
          </TabsContent>
      </Tabs>

      <Iso25010Form isOpen={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}
