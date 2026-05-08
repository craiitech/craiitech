'use client';

import { useMemo } from 'react';
import type { Risk } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { isBefore } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface RiskOverdueWarningProps {
  risks: Risk[] | null;
  isLoading: boolean;
}

/**
 * RISK OVERDUE WARNING COMPONENT
 * Detects individual risk entries that are past their targetDate and not yet Closed.
 */
export function RiskOverdueWarning({ risks, isLoading }: RiskOverdueWarningProps) {
  const overdueCount = useMemo(() => {
    if (!risks || isLoading) return 0;
    const now = new Date();
    
    return risks.filter(r => {
      // We only flag items that are not Closed
      if (r.status === 'Closed' || !r.targetDate) return false;
      
      const target = r.targetDate instanceof Timestamp 
        ? r.targetDate.toDate() 
        : new Date(r.targetDate);
        
      return !isNaN(target.getTime()) && isBefore(target, now);
    }).length;
  }, [risks, isLoading]);

  if (isLoading || overdueCount === 0) return null;

  return (
    <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-500 shadow-md border-destructive/50 bg-destructive/5">
      <ShieldAlert className="h-5 w-5 text-destructive" />
      <AlertTitle className="font-black uppercase tracking-tight text-destructive">Urgent: Risk Treatment Overdue</AlertTitle>
      <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
        <span className="text-sm font-bold text-slate-800">
          <strong className="text-destructive">{overdueCount}</strong> Risk Treatment(s) have passed their target implementation date. Please update the <strong>Final Assessment</strong> immediately to maintain audit compliance.
        </span>
        <Button size="sm" variant="destructive" asChild className="h-9 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-destructive/20 shrink-0">
          <Link href="/risk-register" className="flex items-center gap-2">
            Update Registry Now
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
