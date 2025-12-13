
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-4">
       <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Generate and view system reports.
          </p>
        </div>
      <Card className="flex h-[450px] w-full items-center justify-center border-dashed">
        <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Reports Generated</h3>
            <p className="mt-2 text-sm text-muted-foreground">
                This section is under development. Reporting features will be available here soon.
            </p>
        </div>
      </Card>
    </div>
  );
}
