'use client';

import { useUser } from '@/firebase';
import { KpiDefinitionsManager } from '@/components/admin/kpi-definitions-manager';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function KpiDefinitionsPage() {
  const { isAdmin } = useUser();

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground">Only administrators can manage KPI definitions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="h-8">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="text-xs font-bold">Back to Settings</span>
          </Link>
        </Button>
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">KPI Definitions</h2>
        <p className="text-muted-foreground">
          Define and manage Key Performance Indicators for the institution.
        </p>
      </div>
      <KpiDefinitionsManager />
    </div>
  );
}
