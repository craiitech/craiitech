'use client';

import { useState } from 'react';
import type { Campus } from '@/lib/types';
import { FileText, ListChecks } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditReportsTab } from './audit-reports-tab';
import { IqaOfiRegisterTab } from './iqa-ofi-register-tab';

interface IqaReportsContainerProps {
  campuses: Campus[];
  canManage: boolean;
}

export function IqaReportsContainer({ campuses, canManage }: IqaReportsContainerProps) {
  const [activeTab, setActiveTab] = useState('vault');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
      <ScrollArea className="w-full">
        <TabsList className="flex h-9 w-max rounded-lg border bg-muted p-1">
          <TabsTrigger value="vault" className="h-7 gap-2 px-4 text-[10px] font-black uppercase">
            <FileText className="h-3.5 w-3.5" /> IQA Vault
          </TabsTrigger>
          <TabsTrigger value="ofi" className="h-7 gap-2 px-4 text-[10px] font-black uppercase">
            <ListChecks className="h-3.5 w-3.5" /> Specific OFI for Each Year
          </TabsTrigger>
        </TabsList>
      </ScrollArea>

      <TabsContent value="vault" className="animate-in fade-in duration-300">
        <AuditReportsTab type="IQA" campuses={campuses} canManage={canManage} />
      </TabsContent>
      <TabsContent value="ofi" className="animate-in fade-in duration-300">
        <IqaOfiRegisterTab campuses={campuses} />
      </TabsContent>
    </Tabs>
  );
}
