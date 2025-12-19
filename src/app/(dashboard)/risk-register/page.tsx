
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export default function RiskRegisterPage() {

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Risk & Opportunity Register</h2>
        <p className="text-muted-foreground">
          A centralized module for logging, tracking, and monitoring risks and opportunities for your unit.
        </p>
      </div>
      <Card className="min-h-[400px] flex items-center justify-center">
        <CardContent className="text-center">
            <ShieldCheck className="mx-auto h-16 w-16 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">
                The Risk Register table will be displayed here.
            </p>
            <p className="text-sm text-muted-foreground">
                Implementation is in progress.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
