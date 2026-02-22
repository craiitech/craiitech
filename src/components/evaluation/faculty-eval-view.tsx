
'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { ComputedResult, EvaluationCycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Star, Award, ShieldCheck, Activity, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function FacultyEvalView() {
  const { userProfile } = useUser();
  const firestore = useFirestore();

  const resultsQuery = useMemoFirebase(
    () => (firestore && userProfile ? query(collection(firestore, 'computedResults'), where('facultyId', '==', userProfile.id)) : null),
    [firestore, userProfile]
  );
  const { data: results, isLoading } = useCollection<ComputedResult>(resultsQuery);

  const activeCycleQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'evaluationCycles'), where('status', '==', 'Active')) : null),
    [firestore]
  );
  const { data: activeCycles } = useCollection<EvaluationCycle>(activeCycleQuery);

  const latestResult = results && results.length > 0 ? results[0] : null;

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Analytics</h2>
          <p className="text-muted-foreground">Detailed summary of your institutional evaluation results.</p>
        </div>
        {activeCycles?.[0] && (
          <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20 h-9 px-4 font-black uppercase text-[10px] tracking-widest">
            {activeCycles[0].academicYear} &bull; {activeCycles[0].semester} Results Pending
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-primary/5 border-primary/10 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Award className="h-20 w-20 text-primary" /></div>
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-primary">Final Weighted Rating</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-2">
            <div className="text-6xl font-black text-slate-900 tabular-nums tracking-tighter">
              {latestResult?.finalScore.toFixed(2) || '0.00'}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Out of 5.0 Points</p>
            <Badge className="mt-4 px-6 py-1 text-xs font-black uppercase bg-emerald-600 text-white border-none shadow-lg">
              {latestResult?.interpretation || 'NOT YET COMPUTED'}
            </Badge>
          </CardContent>
        </Card>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-black uppercase tracking-widest">Student Satisfaction Mean</CardDescription>
              <CardTitle className="text-3xl font-black text-slate-800">{latestResult?.studentMean.toFixed(2) || '--'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={(latestResult?.studentMean || 0) * 20} className="h-1.5" />
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Based on verified student feedback</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-black uppercase tracking-widest">Supervisor Review Score</CardDescription>
              <CardTitle className="text-3xl font-black text-slate-800">{latestResult?.supervisorMean.toFixed(2) || '--'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={(latestResult?.supervisorMean || 0) * 20} className="h-1.5" />
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Validated by Dean/Director</p>
              </div>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2 shadow-sm border-dashed">
            <CardHeader className="py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-xs font-black uppercase tracking-tight text-emerald-800">Verbal Interpretation Key</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {[
                  { label: 'Outstanding', range: '4.50-5.00', color: 'bg-emerald-600' },
                  { label: 'Very Sat.', range: '3.50-4.49', color: 'bg-emerald-500' },
                  { label: 'Satisfactory', range: '2.50-3.49', color: 'bg-amber-500' },
                  { label: 'Fair', range: '1.50-2.49', color: 'bg-orange-500' },
                  { label: 'Poor', range: '1.00-1.49', color: 'bg-rose-600' }
                ].map(item => (
                  <div key={item.label} className="text-center space-y-1">
                    <div className={cn("h-1 w-full rounded-full", item.color)} />
                    <p className="text-[8px] font-black uppercase truncate">{item.label}</p>
                    <p className="text-[8px] font-mono opacity-50">{item.range}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-muted/10 border-b">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-black uppercase tracking-tight">Longitudinal Performance Trend</CardTitle>
          </div>
          <CardDescription className="text-xs">Visualizing your growth across the last 5 evaluation cycles.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[300px] w-full flex items-center justify-center border border-dashed rounded-lg text-muted-foreground text-xs uppercase font-bold tracking-widest opacity-20">
            <Activity className="h-8 w-8 mr-3" />
            Historic Data Synchronizing...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
