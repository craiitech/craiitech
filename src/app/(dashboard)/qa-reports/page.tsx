
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { QaAuditReport, ManagementReview, ManagementReviewOutput, CorrectiveActionRequest, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, FileText, Users, ClipboardCheck, History, ShieldCheck, Presentation, BarChart3 } from 'lucide-react';
import { AuditReportsTab } from '@/components/qa-reports/audit-reports-tab';
import { ManagementReviewTab } from '@/components/qa-reports/management-review-tab';
import { CorrectiveActionRequestTab } from '@/components/qa-reports/corrective-action-request-tab';
import { QaAnalyticsTab } from '@/components/qa-reports/qa-analytics-tab';

export default function QaReportsPage() {
  const { isAdmin, userRole, isUserLoading, userProfile } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState('analytics');

  const canManage = isAdmin || userRole === 'Auditor';

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const isLoading = isUserLoading || isLoadingCampuses || isLoadingUnits;

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
            <ShieldCheck className="h-8 w-8 text-primary" />
            Institutional QA Reports
          </h2>
          <p className="text-muted-foreground">
            Central repository for IQA, EQA, Management Reviews, and Corrective Actions.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border shadow-sm grid grid-cols-2 md:grid-cols-5 h-auto p-1">
          <TabsTrigger value="analytics" className="gap-2 px-4 py-2 font-bold uppercase text-[10px]">
            <BarChart3 className="h-3.5 w-3.5" /> Visual Insights
          </TabsTrigger>
          <TabsTrigger value="iqa" className="gap-2 px-4 py-2 font-bold uppercase text-[10px]">
            <FileText className="h-3.5 w-3.5" /> IQA Reports
          </TabsTrigger>
          <TabsTrigger value="eqa" className="gap-2 px-4 py-2 font-bold uppercase text-[10px]">
            <Presentation className="h-3.5 w-3.5" /> EQA Reports
          </TabsTrigger>
          <TabsTrigger value="mr" className="gap-2 px-4 py-2 font-bold uppercase text-[10px]">
            <Users className="h-3.5 w-3.5" /> Management Review
          </TabsTrigger>
          <TabsTrigger value="car" className="gap-2 px-4 py-2 font-bold uppercase text-[10px]">
            <ClipboardCheck className="h-3.5 w-3.5" /> CAR Registry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="animate-in fade-in duration-500">
          <QaAnalyticsTab />
        </TabsContent>

        <TabsContent value="iqa">
          <AuditReportsTab type="IQA" campuses={campuses || []} canManage={canManage} />
        </TabsContent>

        <TabsContent value="eqa">
          <AuditReportsTab type="EQA" campuses={campuses || []} canManage={canManage} />
        </TabsContent>

        <TabsContent value="mr">
          <ManagementReviewTab campuses={campuses || []} units={units || []} canManage={canManage} />
        </TabsContent>

        <TabsContent value="car">
          <CorrectiveActionRequestTab campuses={campuses || []} units={units || []} canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
