
'use client';

import { useMemo, useState } from 'react';
import type { Risk } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, ArrowRight, HelpCircle, ChevronDown, ChevronUp, Info, ShieldCheck } from 'lucide-react';
import { Timestamp } from '@/firebase/firestore-wrapper';
import { isBefore } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface RiskOverdueWarningProps {
  risks: Risk[] | null;
  isLoading: boolean;
}

/**
 * RISK OVERDUE WARNING COMPONENT
 * Detects individual risk entries that are past their targetDate and not yet Closed.
 * Now includes a contextual help section for guided resolution.
 */
export function RiskOverdueWarning({ risks, isLoading }: RiskOverdueWarningProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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
    <div className="space-y-4">
      <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-500 shadow-md border-destructive/50 bg-destructive/5 overflow-hidden">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <AlertTitle className="font-black uppercase tracking-tight text-destructive">Urgent: Risk Treatment Overdue</AlertTitle>
        <AlertDescription className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
            <span className="text-sm font-bold text-slate-800">
              <strong className="text-destructive">{overdueCount}</strong> Risk Treatment(s) have passed their target implementation date. Please update the <strong>Final Assessment</strong> immediately to maintain audit compliance.
            </span>
            <div className="flex items-center gap-2 shrink-0">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsHelpOpen(!isHelpOpen)}
                    className="h-9 px-4 font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/10"
                >
                    <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                    You Need Help?
                    {isHelpOpen ? <ChevronUp className="ml-1.5 h-3 w-3" /> : <ChevronDown className="ml-1.5 h-3 w-3" />}
                </Button>
                <Button size="sm" variant="destructive" asChild className="h-9 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-destructive/20">
                    <Link href="/risk-register" className="flex items-center gap-2">
                        Update Registry Now
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </div>
          </div>

          <Collapsible open={isHelpOpen}>
            <CollapsibleContent className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="mt-4 p-5 rounded-2xl border-2 border-destructive/20 bg-white space-y-4 shadow-inner">
                    <div className="flex items-center gap-2 text-destructive">
                        <ShieldCheck className="h-4 w-4" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Protocol: Resolution of Overdue Risks</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center text-[10px] font-black text-destructive shrink-0">1</div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black uppercase text-slate-800">Execution Check</p>
                                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium italic">
                                        Confirm that your unit has already <strong>taken action</strong> on the Risk and that the implementation is fully documented with evidence.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center text-[10px] font-black text-destructive shrink-0">2</div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black uppercase text-slate-800">Registry Navigation</p>
                                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium italic">
                                        Navigate to the <strong>Risk & Opportunity Registry</strong> module from the main sidebar.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center text-[10px] font-black text-destructive shrink-0">3</div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black uppercase text-slate-800">Entry Selection</p>
                                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium italic">
                                        Locate and select the specific <strong>Risk or Opportunity</strong> from your unit list that requires the update.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center text-[10px] font-black text-destructive shrink-0">4</div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black uppercase text-slate-800">Final Assessment</p>
                                    <p className="text-[10px] text-slate-900 leading-relaxed font-bold">
                                        Provide the necessary updates in <strong>Section #4 (Final Assessment)</strong> based on your actual ROR documents and actions.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-800 font-medium italic">
                            <strong>Note:</strong> Closing the risk digitally is a prerequisite for achieving full maturity index status in the institutional dashboard.
                        </p>
                    </div>
                </div>
            </CollapsibleContent>
          </Collapsible>
        </AlertDescription>
      </Alert>
    </div>
  );
}
