
'use client';
import { useMemo } from 'react';
import type { Submission, Unit, User as AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LabelList } from 'recharts';
import { Skeleton } from '../ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Campus } from '@/lib/types';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { Info, Zap, Target, Activity, Timer, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { submissionTypes } from '@/lib/constants';

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

  const efficiencyData = useMemo(() => {
    if (!yearSubmissions) return [];
    
    const revisionCounts = {
        'Rev 00 (Initial)': 0,
        'Rev 01 (Corrected)': 0,
        'Rev 02+ (Complex)': 0
    };

    yearSubmissions.forEach(s => {
        if (s.revision === 0) revisionCounts['Rev 00 (Initial)']++;
        else if (s.revision === 1) revisionCounts['Rev 01 (Corrected)']++;
        else revisionCounts['Rev 02+ (Complex)']++;
    });

    return Object.entries(revisionCounts).map(([name, count]) => ({ name, count }));
  }, [yearSubmissions]);

  // NEW: Accuracy Score (% of Approved Revisions that are Rev 00)
  const accuracyScoreData = useMemo(() => {
    const approved = yearSubmissions.filter(s => s.statusId === 'approved');
    if (approved.length === 0) return [];
    const firstTimeRight = approved.filter(s => s.revision === 0).length;
    const correctionsNeeded = approved.length - firstTimeRight;

    return [
        { name: 'First-Time-Right', value: firstTimeRight, fill: 'hsl(142 71% 45%)' },
        { name: 'Corrected Success', value: correctionsNeeded, fill: 'hsl(var(--chart-2))' }
    ];
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
              <p className="text-xl font-black text-muted-foreground uppercase tracking-widest">NO DATA YET!</p>
          </div>
      )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
            <CardTitle className="text-sm font-black uppercase tracking-tight">Lifecycle Status</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Workflow distribution for AY {selectedYear}.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex items-center justify-center">
            <ChartContainer config={{}} className="h-[250px] w-full">
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
                                outerRadius={80}
                                paddingAngle={5}
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                                {submissionStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.statusId] || '#cccccc'} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

        {/* NEW: First-Time-Right Verification Score */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-primary/5 border-b py-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">First-Time-Right Accuracy</CardTitle>
                </div>
                <CardDescription className="text-[10px]">Percentage of approved documents that required zero corrections.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex items-center justify-center">
                <ChartContainer config={{}} className="h-[250px] w-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie
                                data={accuracyScoreData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                dataKey="value"
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                                {accuracyScoreData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
            <CardTitle className="text-sm font-black uppercase tracking-tight">Contribution Volume</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Total revision count logged.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={{}} className="h-[250px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={submissionsByHierarchyData} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 8, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="total" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--primary))' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-primary/5 border-b py-4">
                <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Review Efficiency</CardTitle>
                </div>
                <CardDescription className="text-[10px]">Volume of submissions reaching approval on first try vs corrected revisions.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={efficiencyData} margin={{ top: 20, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={40}>
                                <LabelList dataKey="count" position="top" style={{ fontSize: '11px', fontWeight: '900', fill: 'hsl(var(--chart-2))' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-sm font-black uppercase tracking-tight">Distribution by Document Type</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Aggregate count across all cycles.</CardDescription>
            </CardHeader>
            <CardContent className="pt-10 flex-1">
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={submissionsByReportTypeData} layout="vertical" margin={{ left: 20, right: 40, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 8, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={12}>
                                {submissionsByReportTypeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={REPORT_TYPE_COLORS[entry.name] || '#cccccc'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
