'use client';

import { useState } from 'react';
import type { Campus, Unit } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditReportsTab } from './audit-reports-tab';
import { EqaOfiMonitoringTab } from './eqa-ofi-monitoring-tab';
import { CorrectiveActionRequestTab } from './corrective-action-request-tab';
import { FileText, ListChecks, ClipboardCheck, Presentation } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EqaReportsContainerProps {
  campuses: Campus[];
  units: Unit[];
  canManage: boolean;
}

export function EqaReportsContainer({ campuses, units, canManage }: EqaReportsContainerProps) {
  const [activeTab, setActiveTab] = useState('vault');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Presentation className="h-6 w-6 text-primary" />
              External Quality Audit (EQA) Reports & Action Hub
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Comprehensive institutional management of External Audit reports, OFI action monitoring, and EQA CARs.
            </p>
          </div>

          <ScrollArea className="w-full sm:w-auto">
            <TabsList className="bg-muted p-1 border shadow-sm flex w-max h-9 rounded-lg">
              <TabsTrigger value="vault" className="gap-2 px-4 font-black uppercase text-[10px] h-7">
                <FileText className="h-3.5 w-3.5" /> Document Vault
              </TabsTrigger>
              <TabsTrigger value="ofi" className="gap-2 px-4 font-black uppercase text-[10px] h-7">
                <ListChecks className="h-3.5 w-3.5" /> OFI Monitoring
              </TabsTrigger>
              <TabsTrigger value="car" className="gap-2 px-4 font-black uppercase text-[10px] h-7">
                <ClipboardCheck className="h-3.5 w-3.5" /> EQA CAR Registry
              </TabsTrigger>
            </TabsList>
          </ScrollArea>
        </div>

        {/* Tab 1: Document Vault (Current content of EQA) */}
        <TabsContent value="vault" className="animate-in fade-in duration-300">
          <AuditReportsTab type="EQA" campuses={campuses} canManage={canManage} />
        </TabsContent>

        {/* Tab 2: OFI Monitoring */}
        <TabsContent value="ofi" className="animate-in fade-in duration-300">
          <EqaOfiMonitoringTab campuses={campuses} units={units} canManage={canManage} />
        </TabsContent>

        {/* Tab 3: EQA CAR */}
        <TabsContent value="car" className="animate-in fade-in duration-300">
          <CorrectiveActionRequestTab campuses={campuses} units={units} canManage={canManage} auditTypeFilter="EQA" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
