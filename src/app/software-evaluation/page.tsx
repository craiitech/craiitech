'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { SoftwareEvaluation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, MonitorCheck, History, BarChart3, PlusCircle, ShieldCheck, ArrowLeft, Home } from 'lucide-react';
import { Iso25010Form } from '@/components/evaluation/iso-25010-form';
import { EvaluationResults } from '@/components/evaluation/evaluation-results';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Public Software Evaluation Page
 * Handles both public stakeholder participation and Admin analytical views.
 */
export default function PublicSoftwareEvaluationPage() {
  const { user, isAdmin, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState('audit');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Results are restricted to Admin role
  const canSeeResults = isAdmin;

  const evaluationsQuery = useMemoFirebase(
    () => (firestore && canSeeResults ? query(collection(firestore, 'softwareEvaluations'), orderBy('timestamp', 'desc')) : null),
    [firestore, canSeeResults]
  );
  const { data: evaluations, isLoading: isLoadingEvaluations } = useCollection<SoftwareEvaluation>(evaluationsQuery);

  const isLoading = isUserLoading || (canSeeResults && isLoadingEvaluations);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // GUEST VIEW: Instrument Only
  if (!canSeeResults) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
        <div className="fixed inset-0 -z-10 h-full w-full">
            <Image
                src="/rsupage.png"
                alt="RSU Background"
                fill
                priority
                className="object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-[4px]" />
        </div>

        <Card className="w-full max-w-2xl bg-white/95 backdrop-blur shadow-2xl border-none animate-in fade-in zoom-in duration-500">
            <CardHeader className="text-center pb-8 border-b">
                <div className="mx-auto bg-primary/10 h-20 w-20 rounded-full flex items-center justify-center mb-6">
                    <MonitorCheck className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-3xl font-black tracking-tight text-slate-900">Software Quality Audit</CardTitle>
                <CardDescription className="text-base text-slate-600">
                    ISO/IEC 25010 Quality Model Assessment for RSU EOMS Portal.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6 text-center">
                <div className="space-y-2">
                    <h3 className="font-bold text-lg text-slate-800">Stakeholder Participation</h3>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                        Your evaluation helps us measure the system's maturity across Functional Suitability, Usability, Security, and other key characteristics.
                    </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4">
                    {['Usability', 'Security', 'Reliability', 'Performance'].map(tag => (
                        <div key={tag} className="px-3 py-1.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200">
                            {tag}
                        </div>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pb-10 pt-4">
                <Button 
                    size="lg" 
                    className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20" 
                    onClick={() => setIsFormOpen(true)}
                >
                    <ShieldCheck className="mr-2 h-6 w-6" />
                    Start Quality Evaluation
                </Button>
                <Button variant="ghost" asChild className="text-slate-400 hover:text-slate-900">
                    <Link href="/">
                        <Home className="mr-2 h-4 w-4" /> Back to Home
                    </Link>
                </Button>
            </CardFooter>
        </Card>

        <Iso25010Form isOpen={isFormOpen} onOpenChange={setIsFormOpen} />
      </div>
    );
  }

  // ADMIN VIEW: Full Analytics Dashboard
  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
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
      </div>

      <Iso25010Form isOpen={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}