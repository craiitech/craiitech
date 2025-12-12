
'use client';
import { useMemo } from 'react';
import type { Submission, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '../ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Campus } from '@/lib/types';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';


interface SubmissionAnalyticsProps {
  allSubmissions: Submission[] | null;
  allUnits: Unit[] | null;
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'hsl(var(--chart-1))',
  approved: 'hsl(var(--chart-2))',
  rejected: 'hsl(var(--chart-3))',
};

export function SubmissionAnalytics({ allSubmissions, allUnits, isLoading }: SubmissionAnalyticsProps) {
  const firestore = useFirestore();
  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
  const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const submissionStatusData = useMemo(() => {
    if (!allSubmissions) return [];
    const statusCounts = allSubmissions.reduce((acc, submission) => {
      acc[submission.statusId] = (acc[submission.statusId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [allSubmissions]);
  
  const submissionsByCampusData = useMemo(() => {
      if (!allSubmissions || !allCampuses) return [];
      
      const campusMap = new Map(allCampuses.map(c => [c.id, c.name]));
      const campusCounts = allSubmissions.reduce((acc, submission) => {
        const campusName = campusMap.get(submission.campusId) || 'Unknown Campus';
        acc[campusName] = (acc[campusName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(campusCounts).map(([name, total]) => ({ name, total }));

  }, [allSubmissions, allCampuses]);

  const isDataLoading = isLoading || isLoadingCampuses;

  if (isDataLoading) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Submissions by Status</CardTitle>
          <CardDescription>A breakdown of all submissions by their current status.</CardDescription>
        </CardHeader>
        <CardContent>
           <ChartContainer config={{}} className="min-h-[200px] w-full aspect-square">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                    <Tooltip
                        cursor={{ fill: 'hsl(var(--muted))' }}
                        content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                        data={submissionStatusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                    {`${(percent * 100).toFixed(0)}%`}
                                </text>
                            );
                        }}
                    >
                        {submissionStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name.toLowerCase()] || '#cccccc'} />
                        ))}
                    </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Submissions by Campus</CardTitle>
          <CardDescription>Total number of submissions from each campus.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={{}} className="min-h-[200px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={submissionsByCampusData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                     <XAxis type="number" />
                     <YAxis dataKey="name" type="category" width={120} />
                     <Tooltip
                        cursor={{ fill: 'hsl(var(--muted))' }}
                        content={<ChartTooltipContent />}
                     />
                    <Bar dataKey="total" fill="hsl(var(--primary))" background={{ fill: 'hsl(var(--muted))' }} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
