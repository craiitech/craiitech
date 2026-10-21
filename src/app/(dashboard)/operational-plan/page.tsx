'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { OperationalPlanWorkspace } from '@/components/operational-plan/operational-plan-workspace';
import { EomsComplianceWizard } from '@/components/wizard/eoms-compliance-wizard';
import { UnitKpiTracker } from '@/components/operational-plan/unit-kpi-tracker';
import { useUser } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Info, ArrowRight, Sparkles, FileSpreadsheet, Target } from 'lucide-react';

export default function OperationalPlanPage() {
  const { systemSettings } = useUser();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'grid';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const [wizardTarget, setWizardTarget] = useState<{
    step: 1 | 2 | 3 | 4 | 5 | 6;
    itemId?: string;
    month?: number;
  } | null>(null);

  const handleNavigateToWizard = (step: 1 | 2 | 3 | 4 | 5 | 6, itemId?: string, month?: number) => {
    setWizardTarget({ step, itemId, month });
    setActiveTab('wizard');
  };

  const isLegacyMode = systemSettings?.operationalPlanMode === 'legacy_link';

  return (
    <div className="space-y-6">
      {isLegacyMode && (
        <Alert className="border-amber-300 bg-amber-50/70 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertTitle className="font-bold">Legacy Submission Mode is Active in Settings</AlertTitle>
          <AlertDescription className="text-xs mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              The system administrator has currently set the operational plan mode to Legacy Link. You can still prepare
              and print Form QAO-01-025 here, or submit via the standard Google Drive link repository.
            </span>
            <Button asChild size="sm" variant="outline" className="text-xs h-7 whitespace-nowrap">
              <Link href="/submissions/new?type=Operational%20Plan">
                Go to Link Submissions <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Mode Switcher Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="bg-muted p-1 rounded-xl">
            <TabsTrigger value="grid" className="text-xs font-bold gap-1.5 px-4">
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" /> Quality Objectives Monitoring
            </TabsTrigger>
            <TabsTrigger value="kpis" className="text-xs font-bold gap-1.5 px-4">
              <Target className="h-3.5 w-3.5 text-emerald-600" /> Unit Deliverables &amp; Implementation Tracker
            </TabsTrigger>
            <TabsTrigger value="wizard" className="text-xs font-bold gap-1.5 px-4">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Guided Compliance Wizard (All-in-One)
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="grid" className="space-y-4">
          <OperationalPlanWorkspace onNavigateToWizard={handleNavigateToWizard} />
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          <UnitKpiTracker />
        </TabsContent>

        <TabsContent value="wizard" className="space-y-4">
          <EomsComplianceWizard
            initialStep={wizardTarget?.step || 1}
            targetItemId={wizardTarget?.itemId}
            targetMonth={wizardTarget?.month}
            onClearTarget={() => setWizardTarget(null)}
            onNavigateBackToMonitoring={() => setActiveTab('grid')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
