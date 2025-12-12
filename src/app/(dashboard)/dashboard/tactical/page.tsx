
'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Submission, Unit, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Heatmap } from '@/components/dashboard/heatmap';
import { Overview } from '@/components/dashboard/overview';

export const submissionTypes = [
  'Operational Plans',
  'Objectives Monitoring',
  'Risk and Opportunity Registry Form',
  'Risk and Opportunity Action Plan',
  'Updated Needs and Expectation of Interested Parties',
  'SWOT Analysis',
];

export const TOTAL_REQUIRED_SUBMISSIONS_PER_CYCLE = 6;


export default function TacticalDashboardPage() {
  const firestore = useFirestore();
  const { userProfile, isAdmin } = useUser();

  const submissionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'submissions') : null, [firestore]);
  const { data: allSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
  const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const isLoading = isLoadingSubmissions || isLoadingUnits || isLoadingCampuses;

  const tacticalData = useMemo(() => {
    if (!allSubmissions || !allUnits) {
      return { complianceRate: 0, completionByUnit: [], completionByDoc: [] };
    }
    const currentYear = new Date().getFullYear();
    const relevantSubmissions = allSubmissions.filter(s => s.year === currentYear);

    const unitsWithCampus = allUnits.filter(u => u.campusId);

    let completedUnits = 0;
    const completionByUnit = unitsWithCampus.map(unit => {
      const firstCycleDocs = new Set(relevantSubmissions.filter(s => s.unitId === unit.id && s.cycleId === 'first').map(s => s.reportType));
      const finalCycleDocs = new Set(relevantSubmissions.filter(s => s.unitId === unit.id && s.cycleId === 'final').map(s => s.reportType));
      
      const isComplete = firstCycleDocs.size >= TOTAL_REQUIRED_SUBMISSIONS_PER_CYCLE && finalCycleDocs.size >= TOTAL_REQUIRED_SUBMISSIONS_PER_CYCLE;
      if (isComplete) {
        completedUnits++;
      }
      return {
        name: unit.name,
        firstCycleCount: firstCycleDocs.size,
        finalCycleCount: finalCycleDocs.size,
        isComplete,
      };
    });

    const complianceRate = unitsWithCampus.length > 0 ? (completedUnits / unitsWithCampus.length) * 100 : 0;

    const completionByDoc = submissionTypes.map(docType => {
      const unitsSubmitted = new Set(relevantSubmissions.filter(s => s.reportType === docType).map(s => s.unitId));
      return {
        name: docType,
        value: unitsSubmitted.size,
        total: unitsWithCampus.length,
      };
    });


    return { complianceRate, completionByUnit, completionByDoc };
  }, [allSubmissions, allUnits]);


  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40 col-span-2" />
          <Skeleton className="h-80 col-span-3" />
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-4 p-1">
         <div>
            <h2 className="text-2xl font-bold tracking-tight">Tactical Dashboard</h2>
            <p className="text-muted-foreground">
                Monitor progress, identify bottlenecks, and guide mid-level interventions.
            </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                 <CardHeader>
                    <CardTitle>System-Wide Compliance Rate</CardTitle>
                    <CardDescription>% of units that completed all submissions on time.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-5xl font-bold tracking-tighter">{tacticalData.complianceRate.toFixed(1)}%</div>
                    <Progress value={tacticalData.complianceRate} className="mt-2" />
                </CardContent>
            </Card>
            <Card className="lg:col-span-2">
                 <CardHeader>
                    <CardTitle>Document Completion Heatmap</CardTitle>
                    <CardDescription>Visual grid showing which document types are commonly submitted or delayed.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Heatmap data={tacticalData.completionByDoc} />
                </CardContent>
            </Card>
        </div>
         <Card>
            <CardHeader>
                <CardTitle>Trend of Submissions Over Time</CardTitle>
                <CardDescription>Weekly/monthly trend lines showing submission velocity.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Overview submissions={allSubmissions} isLoading={isLoading} />
            </CardContent>
        </Card>
    </div>
  );
}
