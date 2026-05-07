'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Campus, Unit } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, Users, ClipboardCheck, ShieldCheck, Presentation, BarChart3, ListTodo } from 'lucide-react';
import { AuditReportsTab } from '@/components/qa-reports/audit-reports-tab';
import { ManagementReviewTab } from '@/components/qa-reports/management-review-tab';
import { CorrectiveActionRequestTab } from '@/components/qa-reports/corrective-action-request-tab';
import { QaAnalyticsTab } from '@/components/qa-reports/qa-analytics-tab';
import { ActionableDecisionsTab } from '@/components/qa-reports/actionable-decisions-tab';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function QaReportsPage() {
  const { isAdmin, userRole, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

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
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        {/* Sticky Header and Tabs */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b space-y-4">
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

            <ScrollArea className="w-full">
                <TabsList className="bg-muted p-1 border shadow-sm flex md:inline-flex w-max min-w-max h-10 animate-tab-highlight rounded-md">
                  <TabsTrigger value="overview" className="gap-2 px-6 font-bold uppercase text-[10px] h-8">
                    <BarChart3 className="h-4 w-4" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="decisions" className="gap-2 px-6 font-bold uppercase text-[10px] h-8">
                    <ListTodo className="h-4 w-4" /> Actionable Decisions
                  </TabsTrigger>
                  <TabsTrigger value="car" className="gap-2 px-6 font-bold uppercase text-[10px] h-8">
                    <ClipboardCheck className="h-4 w-4" /> CAR Registry
                  </TabsTrigger>
                  <TabsTrigger value="iqa" className="gap-2 px-6 font-bold uppercase text-[10px] h-8">
                    <FileText className="h-4 w-4" /> IQA Reports
                  </TabsTrigger>
                  <TabsTrigger value="eqa" className="gap-2 px-6 font-bold uppercase text-[10px] h-8">
                    <Presentation className="h-4 w-4" /> EQA Reports
                  </TabsTrigger>
                  <TabsTrigger value="mr" className="gap-2 px-6 font-bold uppercase text-[10px] h-8">
                    <Users className="h-4 w-4" /> Management Review
                  </TabsTrigger>
                </TabsList>
            </ScrollArea>
        </div>

        <TabsContent value="overview" className="animate-in fade-in duration-500">
          <QaAnalyticsTab />
        </TabsContent>

        <TabsContent value="decisions" className="animate-in fade-in duration-500">
          <ActionableDecisionsTab campuses={campuses || []} units={units || []} />
        </TabsContent>

        <TabsContent value="car" className="animate-in fade-in duration-500">
          <CorrectiveActionRequestTab campuses={campuses || []} units={units || []} canManage={canManage} />
        </TabsContent>

        <TabsContent value="iqa" className="animate-in fade-in duration-500">
          <AuditReportsTab type="IQA" campuses={campuses || []} canManage={canManage} />
        </TabsContent>

        <TabsContent value="eqa" className="animate-in fade-in duration-500">
          <AuditReportsTab type="EQA" campuses={campuses || []} canManage={canManage} />
        </TabsContent>

        <TabsContent value="mr" className="animate-in fade-in duration-500">
          <ManagementReviewTab campuses={campuses || []} units={units || []} canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
