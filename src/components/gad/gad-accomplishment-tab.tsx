'use client';

import { useState, useMemo } from 'react';
import type { GADPlan, GADActivity, Campus, Unit, Signatories, GadSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Printer,
  ChevronRight,
  FileText,
  History,
  CheckCircle2,
  TrendingUp,
  Target,
  Activity,
  Info,
  Search,
  PlusCircle,
} from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GADAccomplishmentReportTemplate } from './gad-print-templates';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from '@/firebase/firestore-wrapper';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface GADAccomplishmentTabProps {
  plans: GADPlan[];
  activities: GADActivity[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
  selectedUnitId: string;
}

export function GADAccomplishmentTab({
  plans,
  activities,
  campuses,
  units,
  selectedYear,
  selectedUnitId,
}: GADAccomplishmentTabProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const signatoryRef = useMemoFirebase(
    () => (firestore && userProfile ? doc(firestore, 'system', 'signatories') : null),
    [firestore, userProfile],
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const gadSettingsRef = useMemoFirebase(
    () => (firestore && userProfile ? doc(firestore, 'system', 'gadSettings') : null),
    [firestore, userProfile],
  );
  const { data: gadSettings } = useDoc<GadSettings>(gadSettingsRef);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);
  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);

  const arData = useMemo(() => {
    return plans
      .map((plan) => {
        // Find all activities linked to this plan by PAP matching or explicit ID
        const linkedActivities = activities.filter(
          (a) =>
            a.planId === plan.id ||
            (a.activityName && plan.pap && a.activityName.toLowerCase().includes(plan.pap.toLowerCase())),
        );

        const actualMale = linkedActivities.reduce((acc, a) => acc + (a.participants?.male || 0), 0);
        const actualFemale = linkedActivities.reduce((acc, a) => acc + (a.participants?.female || 0), 0);
        const actualBudgetFromActivities = linkedActivities.reduce((acc, a) => acc + (a.actualBudgetUsed || 0), 0);

        const actualBudget = actualBudgetFromActivities > 0 ? actualBudgetFromActivities : plan.budget || 0;

        const varianceBudget = (plan.budget || 0) - actualBudget;

        // Extract implementation details from the latest activity
        const latestActivity = linkedActivities.length > 0 ? linkedActivities[linkedActivities.length - 1] : null;
        const driveLink =
          latestActivity?.driveLink || plan.driveLink || linkedActivities.find((a) => a.driveLink)?.driveLink || '';

        const implementationStatus =
          latestActivity?.implementationStatus ||
          (plan as any).implementationStatus ||
          (linkedActivities.length > 0 ? 'Done' : 'On-going');

        return {
          ...plan,
          actualMale,
          actualFemale,
          actualBudget,
          varianceBudget,
          actualOutput: latestActivity?.actualOutput || plan.targets || '',
          varianceAnalysis: latestActivity?.varianceAnalysis || '',
          implementationStatus,
          driveLink,
          activitiesCount: linkedActivities.length,
          isCompleted: linkedActivities.length > 0 || implementationStatus === 'Done',
          isAuditRisk: implementationStatus === 'Yet to be implemented' && actualBudget > 0,
        };
      })
      .filter((d) => d.pap && d.pap.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [plans, activities, searchTerm]);

  const auditSummary = useMemo(() => {
    const totalReported = arData.reduce((acc, item) => acc + item.actualBudget, 0);
    const totalRecognized = arData
      .filter(
        (item) => item.implementationStatus !== 'Yet to be implemented' && item.implementationStatus !== 'Not Done',
      )
      .reduce((acc, item) => acc + item.actualBudget, 0);
    const unfulfilledRiskAmount = arData
      .filter(
        (item) => item.implementationStatus === 'Yet to be implemented' || item.implementationStatus === 'Not Done',
      )
      .reduce((acc, item) => acc + item.actualBudget, 0);

    const clientTotal = arData
      .filter((item) => !item.category || item.category === 'CLIENT-FOCUSED ACTIVITIES')
      .reduce((acc, item) => acc + item.actualBudget, 0);
    const orgTotal = arData
      .filter((item) => item.category === 'ORGANIZATION-FOCUSED ACTIVITIES')
      .reduce((acc, item) => acc + item.actualBudget, 0);
    const attributedTotal = arData
      .filter((item) => item.category === 'ATTRIBUTED PROGRAM')
      .reduce((acc, item) => acc + item.actualBudget, 0);

    return {
      totalReported,
      totalRecognized,
      unfulfilledRiskAmount,
      clientTotal,
      orgTotal,
      attributedTotal,
    };
  }, [arData]);

  const handlePrint = () => {
    if (!arData.length) {
      toast({
        title: 'Registry Empty',
        description: 'There is no accomplishment data to print for the selected year/unit.',
        variant: 'destructive',
      });
      return;
    }

    const unitName = selectedUnitId === 'all' ? 'UNIVERSITY-WIDE' : unitMap.get(selectedUnitId) || 'UNIT';

    // Logic: If 'all', use Institutional. If specific unit, find its campus correctly.
    const selectedUnitObj = units.find((u) => u.id === selectedUnitId);
    const targetCampusId = selectedUnitObj?.campusIds?.[0] || userProfile?.campusId || '';
    const campusName = selectedUnitId === 'all' ? 'Institutional' : campusMap.get(targetCampusId) || 'RSU';

    try {
      const reportHtml = renderToStaticMarkup(
        <GADAccomplishmentReportTemplate
          data={arData}
          unitName={unitName}
          campusName={campusName}
          year={selectedYear}
          signatories={signatories || undefined}
          gadSettings={gadSettings || undefined}
        />,
      );

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
                <html>
                <head>
                    <title>GAD Accomplishment Report - ${unitName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print { 
                            @page { size: landscape; margin: 0.4in; }
                            body { margin: 0; padding: 0; background: white; } 
                            .no-print { display: none !important; }
                        }
                        body { font-family: serif; background: #f9fafb; padding: 20px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Official 12-Column GAD AR</button>
                    </div>
                    <div id="print-content">
                        ${reportHtml}
                    </div>
                </body>
                </html>
            `);
        printWindow.document.close();
      }
    } catch (e) {
      console.error('GAD Print Error:', e);
      toast({
        title: 'Print Failed',
        description: 'An error occurred during report generation.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* AUDIT SUMMARY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 text-white shadow-md">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Total Reported Actual
              </span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-black tabular-nums">₱{auditSummary.totalReported.toLocaleString()}</p>
              <p className="text-[9px] text-slate-400 italic">Combined reported expenditure</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-950 text-white border-emerald-800/40 shadow-md">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                PCW Recognized Actual
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-black tabular-nums text-emerald-200">
                ₱{auditSummary.totalRecognized.toLocaleString()}
              </p>
              <p className="text-[9px] text-emerald-300/80 italic">Excludes unimplemented infrastructure</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-rose-950 text-white border-rose-800/40 shadow-md">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">
                COA / PCW Audit Risk
              </span>
              <Info className="h-4 w-4 text-rose-300" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-black tabular-nums text-rose-200">
                ₱{auditSummary.unfulfilledRiskAmount.toLocaleString()}
              </p>
              <p className="text-[9px] text-rose-300/80 italic">Unimplemented / Not done entries</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-950 text-white border-blue-800/40 shadow-md">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                Attributed Program Share
              </span>
              <Target className="h-4 w-4 text-blue-300" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-black tabular-nums text-blue-200">
                ₱{auditSummary.attributedTotal.toLocaleString()}
              </p>
              <p className="text-[9px] text-blue-300/80 italic">HGDG Attributed Infrastructure</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by Project title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 shadow-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => router.push('/gad-corner?tab=activities')}
            className="h-10 px-5 font-black uppercase text-[10px] tracking-widest gap-2 shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            Log Event Activity
          </Button>
          <Button
            onClick={() => router.push('/gad-corner?tab=gpb')}
            variant="outline"
            className="h-10 px-5 font-black uppercase text-[10px] tracking-widest bg-white border-primary/20 text-primary gap-2 shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            Add GPB Target
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="h-10 px-5 font-black uppercase text-[10px] tracking-widest bg-white border-primary/20 text-primary gap-2 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Print PCW 12-Col GAD AR
          </Button>
        </div>
      </div>

      <Card className="shadow-lg border-primary/10 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b py-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-black uppercase tracking-tight">
              GAD Accomplishment Registry (PCW Audit View)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[60dvh]">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Category & PAP</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Planned vs Actual Output</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase">Actual Reach (M/F)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Budget Utilization</TableHead>
                  <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Status & PCW Audit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20 transition-colors group">
                    <TableCell className="pl-8 py-5">
                      <div className="space-y-1.5">
                        <Badge
                          variant="outline"
                          className="text-[8px] font-black uppercase bg-slate-100 dark:bg-slate-800 border-slate-300"
                        >
                          {item.category || 'CLIENT-FOCUSED ACTIVITIES'}
                        </Badge>
                        <p className="font-black text-sm text-slate-900 dark:text-slate-100 leading-tight uppercase group-hover:text-primary transition-colors">
                          {item.pap}
                        </p>
                        <p className="text-[9px] font-bold text-muted-foreground line-clamp-1 italic">
                          "{item.genderIssue}"
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 max-w-[250px]">
                        <p className="text-[9px] font-bold uppercase text-slate-400">
                          Targets: {item.performanceIndicators}
                        </p>
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                          {item.targets}
                        </p>
                        {item.isCompleted && (
                          <div className="pt-1.5 flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span className="text-[9px] font-black text-emerald-700 uppercase">
                              Fulfillment Verified
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 shadow-inner">
                        <span className="text-[10px] font-black text-indigo-600 tabular-nums">
                          M: {item.actualMale}
                        </span>
                        <span className="text-slate-200">|</span>
                        <span className="text-[10px] font-black text-rose-600 tabular-nums">
                          F: {item.actualFemale}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-emerald-600 tabular-nums">
                          ₱{item.actualBudget.toLocaleString()}
                        </span>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase">
                          Utilized of ₱{item.budget.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          className={cn(
                            'h-5 text-[9px] font-black uppercase border-none px-2 shadow-sm',
                            item.implementationStatus === 'Done'
                              ? 'bg-emerald-600 text-white'
                              : item.implementationStatus === 'Yet to be implemented'
                                ? 'bg-rose-700 text-white'
                                : 'bg-amber-500 text-white',
                          )}
                        >
                          {item.implementationStatus || 'Done'}
                        </Badge>
                        {item.isAuditRisk && (
                          <Badge variant="destructive" className="text-[7.5px] font-black uppercase animate-pulse">
                            ⚠️ COA/PCW Risk: Unimplemented
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {arData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center py-12">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                        <Activity className="h-10 w-10 text-primary opacity-30" />
                        <p className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          No GAD Accomplishment Entries Found
                        </p>
                        <p className="text-xs text-muted-foreground italic leading-relaxed">
                          GAD Accomplishment Reports (GAD AR) dynamically merge planned GPB targets with actual event
                          activities logged in the Event Registry.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => router.push('/gad-corner?tab=activities')}
                            className="h-9 font-black uppercase text-[10px] gap-1.5"
                          >
                            <PlusCircle className="h-3.5 w-3.5" /> Log Event Activity
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push('/gad-corner?tab=gpb')}
                            className="h-9 font-black uppercase text-[10px] gap-1.5"
                          >
                            <PlusCircle className="h-3.5 w-3.5" /> Add GPB Target
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t py-3 px-8">
          <div className="flex items-start gap-4">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[9px] text-muted-foreground italic leading-relaxed">
              <strong>PCW Compliance Audit Notice:</strong> Under PCW-NEDA-DBM Joint Circulars, infrastructure projects
              tagged as
              <em> "Yet to be implemented"</em> cannot claim actual expenditure accomplishments. CRAIITECH automatically
              calculates your recognized GAD expenditure to safeguard against COA audit disallowances.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
