'use client';

import { useState, useMemo } from 'react';
import type { GADPlan, GADActivity, Campus, Unit, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    Search
} from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GADAccomplishmentReportTemplate } from './gad-print-templates';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
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

export function GADAccomplishmentTab({ plans, activities, campuses, units, selectedYear, selectedUnitId }: GADAccomplishmentTabProps) {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const arData = useMemo(() => {
    return plans.map(plan => {
      // Find all activities linked to this plan by PAP matching or explicit ID
      const linkedActivities = activities.filter(a => 
        a.planId === plan.id || 
        (a.activityName && plan.pap && a.activityName.toLowerCase().includes(plan.pap.toLowerCase()))
      );

      const actualMale = linkedActivities.reduce((acc, a) => acc + (a.participants?.male || 0), 0);
      const actualFemale = linkedActivities.reduce((acc, a) => acc + (a.participants?.female || 0), 0);
      const actualBudget = linkedActivities.reduce((acc, a) => acc + (a.actualBudgetUsed || 0), 0);
      
      const varianceBudget = plan.budget - actualBudget;

      // Extract implementation details from the latest activity
      const latestActivity = linkedActivities.length > 0 ? linkedActivities[linkedActivities.length - 1] : null;

      return {
        ...plan,
        actualMale,
        actualFemale,
        actualBudget,
        varianceBudget,
        actualOutput: latestActivity?.actualOutput || '',
        varianceAnalysis: latestActivity?.varianceAnalysis || '',
        activitiesCount: linkedActivities.length,
        isCompleted: linkedActivities.length > 0
      };
    }).filter(d => d.pap && d.pap.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [plans, activities, searchTerm]);

  const handlePrint = () => {
    if (!arData.length) {
        toast({ title: "Registry Empty", description: "There is no accomplishment data to print for the selected year/unit.", variant: "destructive" });
        return;
    }
    
    const unitName = selectedUnitId === 'all' ? 'UNIVERSITY-WIDE' : unitMap.get(selectedUnitId) || 'UNIT';
    
    // Logic: If 'all', use Institutional. If specific unit, find its campus correctly.
    const selectedUnitObj = units.find(u => u.id === selectedUnitId);
    const targetCampusId = selectedUnitObj?.campusIds?.[0] || userProfile?.campusId || '';
    const campusName = selectedUnitId === 'all' ? 'Institutional' : (campusMap.get(targetCampusId) || 'RSU');

    try {
        const reportHtml = renderToStaticMarkup(
            <GADAccomplishmentReportTemplate 
                data={arData}
                unitName={unitName}
                campusName={campusName}
                year={selectedYear}
                signatories={signatories || undefined}
            />
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
                            @page { size: landscape; margin: 0.5in; }
                            body { margin: 0; padding: 0; background: white; } 
                            .no-print { display: none !important; }
                        }
                        body { font-family: serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print GAD AR</button>
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
        console.error("GAD Print Error:", e);
        toast({ title: "Print Failed", description: "An error occurred during report generation.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
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
        <Button onClick={handlePrint} variant="outline" className="h-10 px-6 font-black uppercase text-[10px] tracking-widest bg-white border-primary/20 text-primary gap-2 shadow-sm">
            <Printer className="h-4 w-4" />
            Print GAD AR
        </Button>
      </div>

      <Card className="shadow-lg border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
              <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm font-black uppercase tracking-tight">GAD Accomplishment Registry (Actuals)</CardTitle>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                  <Table>
                      <TableHeader className="bg-muted/30 sticky top-0 z-10">
                          <TableRow>
                              <TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Program / Activity (PAP)</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Planned vs Actual Output</TableHead>
                              <TableHead className="text-center text-[10px] font-black uppercase">Actual Reach (M/F)</TableHead>
                              <TableHead className="text-right text-[10px] font-black uppercase">Budget Utilization</TableHead>
                              <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Status</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {arData.map(item => (
                              <TableRow key={item.id} className="hover:bg-muted/20 transition-colors group">
                                  <TableCell className="pl-8 py-5">
                                      <div className="space-y-1">
                                          <p className="font-black text-sm text-slate-900 leading-tight uppercase group-hover:text-primary transition-colors">{item.pap}</p>
                                          <p className="text-[9px] font-bold text-muted-foreground line-clamp-1 italic">"{item.genderIssue}"</p>
                                      </div>
                                  </TableCell>
                                  <TableCell>
                                      <div className="space-y-1 max-w-[250px]">
                                          <p className="text-[9px] font-bold uppercase text-slate-400">Targets: {item.performanceIndicators}</p>
                                          <p className="text-[10px] font-bold text-slate-700 leading-tight">{item.targets}</p>
                                          {item.isCompleted && (
                                              <div className="pt-1.5 flex items-center gap-2">
                                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                  <span className="text-[9px] font-black text-emerald-700 uppercase">Fulfillment Detected</span>
                                              </div>
                                          )}
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-inner">
                                          <span className="text-[10px] font-black text-indigo-600 tabular-nums">M: {item.actualMale}</span>
                                          <span className="text-slate-200">|</span>
                                          <span className="text-[10px] font-black text-rose-600 tabular-nums">F: {item.actualFemale}</span>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <div className="flex flex-col items-end">
                                          <span className="text-xs font-black text-emerald-600 tabular-nums">₱{item.actualBudget.toLocaleString()}</span>
                                          <span className="text-[8px] font-bold text-muted-foreground uppercase">Utilized of ₱{item.budget.toLocaleString()}</span>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right pr-8">
                                      <Badge className={cn(
                                          "h-5 text-[9px] font-black uppercase border-none px-2 shadow-sm",
                                          item.isCompleted ? "bg-emerald-600 text-white" : "bg-amber-50 text-amber-950"
                                      )}>
                                          {item.isCompleted ? 'COMPLETED' : 'INCOMPLETE'}
                                      </Badge>
                                  </TableCell>
                              </TableRow>
                          ))}
                          {arData.length === 0 && (
                              <TableRow>
                                  <TableCell colSpan={5} className="h-40 text-center opacity-20">
                                      <Activity className="h-10 w-10 mx-auto mb-2" />
                                      <p className="text-[10px] font-black uppercase tracking-widest">No GPB entries found to analyze</p>
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
                      <strong>Automatic Synchronization:</strong> This report dynamically aggregates participant data from activity registries. Ensure all project codes in Section 1 match the official GAD activities logged via device-based entry.
                  </p>
              </div>
          </CardFooter>
      </Card>
    </div>
  );
}
