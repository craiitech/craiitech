'use client';

import { useMemo, useState } from 'react';
import type { Risk, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    ShieldCheck, 
    AlertCircle, 
    CheckCircle, 
    Users, 
    Info, 
    HelpCircle, 
    ChevronDown, 
    ChevronUp, 
    ChevronRight,
    MousePointer2, 
    ClipboardCheck 
} from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

interface RiskStatusOverviewProps {
  risks: Risk[] | null;
  units: Unit[] | null;
  isLoading: boolean;
  selectedYear: number;
  onYearChange: (year: number) => void;
  isSupervisor: boolean;
}

export function RiskStatusOverview({ risks, units, isLoading, selectedYear, onYearChange, isSupervisor }: RiskStatusOverviewProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const stats = useMemo(() => {
    const defaultStats = {
        openRisks: 0,
        closedRisks: 0,
        highRatedRisks: 0,
        participatingUnits: [],
    };
    if (!risks) return defaultStats;
    
    const yearRisks = risks.filter(r => Number(r.year) === Number(selectedYear));

    const openRisks = yearRisks.filter(r => r.status === 'Open' || r.status === 'In Progress').length;
    const closedRisks = yearRisks.filter(r => r.status === 'Closed').length;
    const highRatedRisks = yearRisks.filter(r => r.preTreatment.rating === 'High' && r.status !== 'Closed').length;

    if (isSupervisor) {
        const participatingUnitIds = new Set(yearRisks.map(r => r.unitId));
        const participatingUnits = units ? units.filter(u => participatingUnitIds.has(u.id)) : [];
        return { openRisks, closedRisks, highRatedRisks, participatingUnits };
    }
    
    return { openRisks, closedRisks, highRatedRisks, participatingUnits: [] };
  }, [risks, units, selectedYear, isSupervisor]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
         <CardFooter>
            <Skeleton className="h-10 w-32" />
        </CardFooter>
      </Card>
    );
  }
  
  const StatCard = ({ title, value, icon, description }: { title: string, value: number, icon: React.ReactNode, description: string }) => (
    <div className="rounded-lg border bg-card-foreground/5 p-4 shadow-sm group hover:border-primary/30 transition-colors">
        <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
            {icon}
        </div>
        <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
         <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase">{description}</p>
    </div>
  );


  return (
    <Card className="shadow-md border-primary/10">
      <CardHeader className="flex flex-row items-start justify-between bg-muted/5 border-b py-4">
        <div>
          <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Risk Management Overview
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {isSupervisor 
              ? `Aggregated risk posture for the Academic Year ${selectedYear}.`
              : `Your unit's risk registry health for AY ${selectedYear}.`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
            {!isSupervisor && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsHelpOpen(!isHelpOpen)}
                    className="h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                >
                    <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                    Need Help?
                </Button>
            )}
            <div className="w-[120px]">
            <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
                <SelectTrigger className="h-8 bg-white text-xs font-bold">
                <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
            </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isSupervisor ? (
                <>
                    <StatCard 
                        title="Active Units" 
                        value={stats.participatingUnits.length} 
                        icon={<Users className="h-4 w-4 text-primary opacity-40"/>}
                        description="Units with entries"
                    />
                    <StatCard 
                        title="Open Factors" 
                        value={stats.openRisks} 
                        icon={<AlertCircle className="h-4 w-4 text-amber-500 opacity-40"/>}
                        description="In-progress actions"
                    />
                    <StatCard 
                        title="High Magnitude" 
                        value={stats.highRatedRisks} 
                        icon={<AlertCircle className="h-4 w-4 text-destructive"/>}
                        description="Priority mitigation"
                    />
                    <StatCard 
                        title="Verified Closed" 
                        value={stats.closedRisks} 
                        icon={<CheckCircle className="h-4 w-4 text-green-500"/>}
                        description="Residual risk low"
                    />
                </>
            ) : (
                <>
                    <StatCard 
                        title="Open Risks" 
                        value={stats.openRisks} 
                        icon={<AlertCircle className="h-4 w-4 text-amber-500 opacity-40"/>}
                        description="Treatment ongoing"
                    />
                    <StatCard 
                        title="High Rated" 
                        value={stats.highRatedRisks} 
                        icon={<AlertCircle className="h-4 w-4 text-destructive"/>}
                        description="Priority actions"
                    />
                    <StatCard 
                        title="Verified Closed" 
                        value={stats.closedRisks} 
                        icon={<CheckCircle className="h-4 w-4 text-green-500"/>}
                        description="Completed treatment"
                    />
                    <div className="flex flex-col items-center justify-center p-4">
                        <Button asChild size="sm" className="w-full font-black text-[10px] uppercase">
                            <Link href="/risk-register">Open Registry</Link>
                        </Button>
                    </div>
                </>
            )}
        </div>

        {/* --- DYNAMIC HELP SECTION --- */}
        {!isSupervisor && (
            <Collapsible open={isHelpOpen} onOpenChange={setIsHelpOpen} className="animate-in fade-in slide-in-from-top-2 duration-300">
                <CollapsibleContent>
                    <div className="p-5 rounded-2xl border-2 border-primary/20 bg-primary/5 space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <ShieldCheck className="h-4 w-4" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest">Guidance: Updating Your Risk Registry</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-primary shadow-sm shrink-0">1</div>
                                    <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                                        Ensure that your unit has <strong>taken action</strong> on the identified risk and that these actions are fully documented.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-primary shadow-sm shrink-0">2</div>
                                    <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                                        Navigate to the <strong>Risk & Opportunity Registry</strong> module from the sidebar.
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-primary shadow-sm shrink-0">3</div>
                                    <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                                        Select the specific <strong>Risk or Opportunity</strong> you want to update from your unit list.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-primary shadow-sm shrink-0">4</div>
                                    <p className="text-[11px] text-slate-700 leading-relaxed font-bold">
                                        Provide the necessary updates in <strong>Section #4 (Final Assessment)</strong> based on your actual ROR documents and implementation results.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="pt-2 flex justify-end">
                            <Button size="sm" asChild className="h-7 text-[9px] font-black uppercase tracking-widest px-6 shadow-md shadow-primary/20">
                                <Link href="/risk-register">
                                    Proceed to Registry <ChevronRight className="h-3 w-3 ml-1" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        )}
      </CardContent>
      <CardFooter className="bg-muted/10 border-t py-3">
          <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                  {isSupervisor 
                    ? "Institutional Perspective: A concentration of High Rated risks across units identifies key areas where site-level resources should be prioritized."
                    : "Unit Perspective: Use this overview to monitor your treatment velocity. All 'High' and 'Medium' risks must be moved to 'Closed' status by the final cycle."}
              </p>
          </div>
      </CardFooter>
    </Card>
  );
}
