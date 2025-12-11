'use client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Overview } from '@/components/dashboard/overview';
import { RecentSubmissions } from '@/components/dashboard/recent-submissions';
import { FileText, CheckCircle, Clock, PieChart } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Submission } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'submissions'));
  }, [firestore, user]);

  const { data: submissions, isLoading } = useCollection<Submission>(submissionsQuery);

  const stats = {
    total: submissions?.length ?? 0,
    approved: submissions?.filter(s => s.statusId === 'approved').length ?? 0,
    pending: submissions?.filter(s => ['pending', 'submitted'].includes(s.statusId)).length ?? 0,
    complianceRate: submissions?.length ? ((submissions?.filter(s => s.statusId === 'approved').length ?? 0) / submissions.length) * 100 : 0
  };

  const renderCard = (title: string, value: string | number, icon: React.ReactNode, description: string, isLoading: boolean) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-4 w-40" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  )

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports" disabled>
            Reports
          </TabsTrigger>
          <TabsTrigger value="notifications" disabled>
            Notifications
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {renderCard("Total Submissions", stats.total, <FileText className="h-4 w-4 text-muted-foreground" />, 'All reports you have submitted.', isLoading)}
            {renderCard("Approved Submissions", stats.approved, <CheckCircle className="h-4 w-4 text-muted-foreground" />, 'Your successfully approved reports.', isLoading)}
            {renderCard("Compliance Rate", `${stats.complianceRate.toFixed(1)}%`, <PieChart className="h-4 w-4 text-muted-foreground" />, 'Based on your approved submissions.', isLoading)}
            {renderCard("Pending Actions", stats.pending, <Clock className="h-4 w-4 text-muted-foreground" />, 'Reports awaiting review.', isLoading)}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
                <CardDescription>
                  Your last 5 submissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentSubmissions />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
