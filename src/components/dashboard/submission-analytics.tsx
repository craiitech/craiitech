
'use client';
import { useMemo } from 'react';
import type { Submission, Unit, User as AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LabelList } from 'recharts';
import { Skeleton } from '../ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Campus } from '@/lib/types';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { Info, Zap, Target, Activity } from 'lucide-react';

interface SubmissionAnalyticsProps {
  allSubmissions: Submission[] | null;
  allUnits: Unit[] | null;
  isLoading: boolean;
  isAdmin: boolean;
  userProfile: AppUser | null;
  selectedYear: number;
}

const STATUS_COLORS: Record<string, string> = {
  approved: 'hsl(142 71% 45%)',
  submitted: 'hsl(var(--chart-1))',
  rejected: 'hsl(var(--destructive))',
};

const REPORT_TYPE_COLORS: Record<string, string> = {
    'Operational Plan': 'hsl(var(--chart-1))',
    'Quality Objectives Monitoring': 'hsl(var(--chart-2))',
    'Risk and Opportunity Registry': 'hsl(var(--chart-3))',
    'Risk and Opportunity Action Plan': 'hsl(var(--chart-4))',
    'Needs and Expectation of Interested Parties': 'hsl(var(--chart-5))',
    'SWOT Analysis': 'hsl(var(--chart-1))',
}

export function SubmissionAnalytics({ allSubmissions, allUnits, isLoading, isAdmin, userProfile, selectedYear }: SubmissionAnalyticsProps) {
  const firestore = useFirestore();
  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
  const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const yearSubmissions = useMemo(() => {
    if (!allSubmissions) return [];
    return allSubmissions.filter(s => s.year === selectedYear);
  }, [allSubmissions, selectedYear]);

  const submissionStatusData = useMemo(() => {
    if (!yearSubmissions) return [];
    const statusCounts = yearSubmissions.reduce((acc, submission) => {
      const name = submission.statusId === 'submitted' ? 'Awaiting Approval' : submission.statusId.charAt(0).toUpperCase() + submission.statusId.slice(1);
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([name, value]) => ({ 
        name, 
        value,
        statusId: name.toLowerCase().replace('awaiting approval', 'submitted')
    }));
  }, [yearSubmissions]);
  
  const submissionsByHierarchyData = useMemo(() => {
      if (!yearSubmissions) return [];
      
      if (isAdmin && allCampuses) {
          const campusMap = new Map(allCampuses.map(c => [c.id, c.name]));
          const campusCounts = yearSubmissions.reduce((acc, submission) => {
            const campusName = campusMap.get(submission.campusId) || 'Unknown Campus';
            acc[campusName] = (acc[campusName] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          return Object.entries(campusCounts).map(([name, total]) => ({ name, total }));
      } else if (allUnits && userProfile?.campusId) {
          const campusUnits = allUnits.filter(u => u.campusIds?.includes(userProfile.campusId));
          const unitMap = new Map(campusUnits.map(u => [u.id, u.name]));
          const unitCounts = yearSubmissions.reduce((acc, submission) => {
            if (unitMap.has(submission.unitId)) {
              const unitName = submission.unitName || 'Unknown Unit';
              acc[unitName] = (acc[unitName] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>);
          return Object.entries(unitCounts).map(([name, total]) => ({ name, total }));
      }
      return [];
  }, [yearSubmissions, allCampuses, allUnits, isAdmin, userProfile]);
  
  const submissionsByReportTypeData = useMemo(() => {
    if (!yearSubmissions) return [];

    const reportTypeCounts = yearSubmissions.reduce((acc, submission) => {
        acc[submission.reportType] = (acc[submission.reportType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    return submissionTypes.map(type => ({
        name: type,
        total: reportTypeCounts[type] || 0,
    }));
  }, [yearSubmissions]);

  if (isLoading || isLoadingCampuses) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(3)].map((_, i) => (
                 <Card key={i} className="h-[400px]"><Skeleton className="h-full w-full" /></Card>
            ))}
        </div>
    )
  }

  if (yearSubmissions.length === 0) {
      return (
          <div className="py-20 text-center border rounded-xl border-dashed bg-muted/5">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No analytic data for {selectedYear}</p>
          </div>
      )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
        <CardHeader className="bg-muted/10 border-b py-4">
          <CardTitle className="text-sm font-black uppercase tracking-tight">Submissions by Lifecycle Status</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Workflow distribution for AY {selectedYear}.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 flex-1 flex items-center justify-center">
           <ChartContainer config={{}} className="h-[300px] w-full">
                <ResponsiveContainer>
                    <PieChart>
                        <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                            data={submissionStatusData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                            {submissionStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.statusId] || '#cccccc'} />
                            ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
        <CardFooter className="bg-muted/5 border-t py-3">
            <div className="flex items-start gap-3">
                <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    <strong>Guidance:</strong> Measures the "Health" of the review cycle. A large segment of "Approved" indicates high documentation quality and efficient administrative verification.
                </p>
            </div>
        </CardFooter>
      </Card>

       <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
        <CardHeader className="bg-muted/10 border-b py-4">
          <CardTitle className="text-sm font-black uppercase tracking-tight">{isAdmin ? "Campus Contribution Volume" : "Unit Contribution Volume"}</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Total revision count logged in AY {selectedYear}.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 flex-1">
            <ChartContainer config={{}} className="h-[300px] w-full">
                <ResponsiveContainer>
                    <BarChart data={submissionsByHierarchyData} layout="vertical" margin={{ right: 40, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                            <LabelList dataKey="total" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--primary))' }} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
        <CardFooter className="bg-muted/5 border-t py-3">
            <div className="flex items-start gap-3">
                <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    <strong>Guidance:</strong> Tracks activity density. Units with very low counts may be facing technical barriers or delays in document preparation.
                </p>
            </div>
        </CardFooter>
      </Card>
      
      <Card className="md:col-span-2 shadow-md border-primary/10 overflow-hidden flex flex-col">
        <CardHeader className="bg-muted/10 border-b py-4">
            <CardTitle className="text-sm font-black uppercase tracking-tight">Distribution by Core Document Type</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Aggregate count across all cycles for AY {selectedYear}.</CardDescription>
        </CardHeader>
        <CardContent className="pt-10 flex-1">
             <ChartContainer config={{}} className="h-[350px] w-full">
                <ResponsiveContainer>
                    <BarChart data={submissionsByReportTypeData} margin={{ bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} angle={-45} textAnchor="end" interval={0} height={80} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                         <RechartsTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={40}>
                             <LabelList dataKey="total" position="top" style={{ fontSize: '11px', fontWeight: '900', fill: 'hsl(var(--foreground))' }} />
                             {submissionsByReportTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={REPORT_TYPE_COLORS[entry.name] || '#cccccc'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
        <CardFooter className="bg-muted/5 border-t py-4 px-6">
            <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                    <strong>Analytical Perspective:</strong> This visualization identifies "Document Friction". If one type (e.g., Risk Action Plans) is significantly lagging behind others, it suggests a need for targeted training or clarification on that specific EOMS requirement.
                </p>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
