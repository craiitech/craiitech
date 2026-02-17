
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { SoftwareEvaluation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, MonitorCheck, History, BarChart3, PlusCircle } from 'lucide-react';
import { Iso25010Form } from '@/components/evaluation/iso-25010-form';
import { EvaluationResults } from '@/components/evaluation/evaluation-results';

export default function SoftwareEvaluationPage() {
  const { user, userProfile, isAdmin, userRole, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState('audit');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const canEvaluate = isAdmin || userRole === 'Auditor';

  const evaluationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'softwareEvaluations'), orderBy('timestamp', 'desc')) : null),
    [firestore]
  );
  const { data: evaluations, isLoading: isLoadingEvaluations } = useCollection<SoftwareEvaluation>(evaluationsQuery);

  const isLoading = isUserLoading || isLoadingEvaluations;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MonitorCheck className="h-8 w-8 text-primary" />
            Software Quality Evaluation (ISO/IEC 25010)
          </h2>
          <p className="text-muted-foreground">
            Perform comprehensive software quality audits and analyze system maturity.
          </p>
        </div>
        {canEvaluate && (
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Conduct New Evaluation
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="audit" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Analytical Dashboard
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" /> Audit History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <EvaluationResults evaluations={evaluations || []} />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Log</CardTitle>
              <CardDescription>A chronological record of all quality audits performed on the RSU EOMS Portal.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {evaluations && evaluations.length > 0 ? (
                  evaluations.map((evaluation) => (
                    <div key={evaluation.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="space-y-1">
                        <p className="font-bold">Evaluation by {evaluation.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {evaluation.timestamp?.toDate ? evaluation.timestamp.toDate().toLocaleString() : new Date(evaluation.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-primary">{evaluation.overallScore.toFixed(1)}/5.0</div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Aggregate Quality Score</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No evaluations have been conducted yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Iso25010Form 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
      />
    </div>
  );
}
