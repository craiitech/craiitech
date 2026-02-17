
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { QaAuditReport, ManagementReview, ManagementReviewOutput, CorrectiveActionRequest, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, FileText, Users, ClipboardCheck, History, ShieldCheck, Presentation } from 'lucide-react';
import { AuditReportsTab } from '@/components/qa-reports/audit-reports-tab';
import { ManagementReviewTab } from '@/components/qa-reports/management-review-tab';
import { CorrectiveActionRequestTab } from '@/components/qa-reports/corrective-action-request-tab';

export default function QaReportsPage() {
  const { isAdmin, userRole, isUserLoading, userProfile } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState('iqa');

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
        <TabsList className="bg-white border shadow-sm grid grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="iqa" className="gap-2 px-4 py-2">
            <FileText className="h-4 w-4" /> IQA Reports
          </TabsTrigger>
          <TabsTrigger value="eqa" className="gap-2 px-4 py-2">
            <Presentation className="h-4 w-4" /> EQA Reports
          </TabsTrigger>
          <TabsTrigger value="mr" className="gap-2 px-4 py-2">
            <Users className="h-4 w-4" /> Management Review
          </TabsTrigger>
          <TabsTrigger value="car" className="gap-2 px-4 py-2">
            <ClipboardCheck className="h-4 w-4" /> CAR Registry
          </TabsTrigger>
        </TabsList>

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
