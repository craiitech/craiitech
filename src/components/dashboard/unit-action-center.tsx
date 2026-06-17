
'use client';

import { useMemo, useState } from 'react';
import type { Risk, CorrectiveActionRequest, ManagementReviewOutput, AuditSchedule, AuditPlan, AuditFinding, ISOClause, Signatories, Unit, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
    ShieldAlert, 
    ArrowRight, 
    HelpCircle, 
    ChevronDown, 
    ChevronUp, 
    Info, 
    ShieldCheck, 
    AlertTriangle, 
    Gavel, 
    Award, 
    ClipboardCheck,
    CheckCircle2,
    Building2,
    Target,
    Activity,
    Printer,
    FileText,
    Loader2
} from 'lucide-react';
import { Timestamp } from '@/firebase/firestore-wrapper';
import { isBefore } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsolidatedAuditReportTemplate } from '@/components/audit/consolidated-audit-report-template';
import { useToast } from '@/hooks/use-toast';

interface UnitActionCenterProps {
  risks: Risk[] | null;
  unitCars: CorrectiveActionRequest[] | null;
  unitMrOutputs: ManagementReviewOutput[] | null;
  unitRecommendations: any[];
  dashboardSchedules: AuditSchedule[] | null;
  plans: AuditPlan[];
  findings: AuditFinding[];
  isoClauses: ISOClause[];
  campuses: Campus[];
  units: Unit[];
  signatories?: Signatories;
  isLoading: boolean;
  unitName: string;
}

/**
 * UNIT ACTION CENTER v1.5
 * Now includes "Print IQA Audit Report" capability for units and campuses.
 */
export function UnitActionCenter({ 
    risks, 
    unitCars, 
    unitMrOutputs, 
    unitRecommendations, 
    dashboardSchedules,
    plans,
    findings,
    isoClauses,
    campuses,
    units,
    signatories,
    isLoading,
    unitName 
}: UnitActionCenterProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPrintingReport, setIsPrintingReport] = useState(false);
  const { toast } = useToast();

  const overdueRisksCount = useMemo(() => {
    if (!risks || isLoading) return 0;
    const now = new Date();
    return risks.filter(r => {
      if (r.status === 'Closed' || !r.targetDate) return false;
      const target = r.targetDate instanceof Timestamp ? r.targetDate.toDate() : new Date(r.targetDate);
      return !isNaN(target.getTime()) && isBefore(target, now);
    }).length;
  }, [risks, isLoading]);

  const handlePrintAuditReport = () => {
    if (!dashboardSchedules?.length || !plans.length || !isoClauses.length) {
        toast({ title: "No Audit Data", description: "Your unit does not have any active audit records for the current year.", variant: "destructive" });
        return;
    }

    setIsPrintingReport(true);
    try {
        const firstSchedule = dashboardSchedules[0];
        const plan = plans.find(p => p.id === firstSchedule.auditPlanId);

        if (!plan) throw new Error("Plan not found");

        const scheduleIds = new Set(dashboardSchedules.map(s => s.id));
        const filteredFindings = findings.filter(f => scheduleIds.has(f.auditScheduleId));

        const reportHtml = renderToStaticMarkup(
            <ConsolidatedAuditReportTemplate 
                plan={plan}
                schedules={dashboardSchedules}
                findings={filteredFindings}
                clauses={isoClauses}
                units={units}
                campuses={campuses}
                signatories={signatories}
                campusName={unitName}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <html>
                <head>
                    <title>Audit Report - ${unitName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { size: 8.5in 13in !important; margin: 0.5in !important; }
                        @media print { 
                            body { margin: 0 !important; padding: 0 !important; background: white; -webkit-print-color-adjust: exact; } 
                            .no-print { display: none !important; } 
                        }
                        body { font-family: serif; background: #f9fafb; padding: 40px; color: black; font-size: 11pt; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Audit Report</button>
                    </div>
                    <div id="print-content">${reportHtml}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (e) {
        console.error(e);
        toast({ title: "Print error", description: "An error occurred generating the report.", variant: "destructive" });
    } finally {
        setIsPrintingReport(false);
    }
  };

  if (isLoading) {
    return (
        <Card className="border-primary/10 shadow-md">
            <CardHeader><div className="h-6 w-48 bg-muted animate-pulse rounded-md" /></CardHeader>
            <CardContent><div className="h-32 w-full bg-muted animate-pulse rounded-md" /></CardContent>
        </Card>
    );
  }

  const ActionPod = ({ icon, title, count, label, link, colorClass, customAction }: { icon: any, title: string, count: number, label: string, link: string, colorClass: string, customAction?: React.ReactNode }) => (
    <div className={cn("p-4 rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between group", colorClass)}>
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <Badge variant="outline" className="bg-white border-none font-black text-[10px] h-5 px-2">{count} ITEMS</Badge>
            </div>
            <div>
                <p className="text-xs font-black uppercase tracking-tight text-slate-900 leading-tight">{title}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 opacity-70">{label}</p>
            </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
            {customAction}
            <Button variant="link" asChild className="p-0 h-auto text-[10px] font-black uppercase justify-start group-hover:gap-2 transition-all">
                <Link href={link} className="flex items-center gap-1">Manage <ArrowRight className="h-3 w-3" /></Link>
            </Button>
        </div>
    </div>
  );

  return (
    <Card className="border-primary/20 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardHeader className="bg-primary/5 border-b py-4 px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Institutional Action Center
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                    Consolidated Priority Tracking for {unitName}
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white border-primary/20 text-primary h-6 font-black text-[9px] uppercase">
                    AY {new Date().getFullYear()} Cycle
                </Badge>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
          {/* CRITICAL ALERT LAYER (FUSED OVERDUE RISKS) */}
          {overdueRisksCount > 0 && (
              <div className="p-5 rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-200 animate-in slide-in-from-top-4 duration-500 overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldAlert className="h-20 w-20" /></div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
                              <AlertTriangle className="h-6 w-6 text-white animate-pulse" />
                          </div>
                          <div className="space-y-1">
                              <h4 className="text-lg font-black uppercase tracking-tight leading-none">Risk Treatment Overdue</h4>
                              <p className="text-xs font-medium text-white/80 leading-relaxed">
                                  You have <strong className="underline underline-offset-2">{overdueRisksCount}</strong> Risk Treatment(s) past their target implementation date. 
                                  Registry updates are required for audit closure.
                              </p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                          <Button variant="ghost" onClick={() => setIsHelpOpen(!isHelpOpen)} className="text-white hover:bg-white/10 font-black text-[10px] uppercase tracking-widest">
                              {isHelpOpen ? 'Hide Help' : 'Help?'}
                              {isHelpOpen ? <ChevronUp className="ml-1.5 h-3 w-3" /> : <ChevronDown className="ml-1.5 h-3 w-3" />}
                          </Button>
                          <Button asChild className="bg-white text-rose-600 hover:bg-slate-100 font-black text-[10px] uppercase tracking-widest px-8 shadow-xl">
                              <Link href="/risk-register">Update Register</Link>
                          </Button>
                      </div>
                  </div>

                  <Collapsible open={isHelpOpen}>
                      <CollapsibleContent className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="mt-4 p-5 rounded-xl bg-white/10 border border-white/20 space-y-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/90">Resolution Protocol:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] font-medium text-white/70">
                                  <p>1. Open <strong>Risk Registry</strong> module.</p>
                                  <p>2. Locate the overdue entries.</p>
                                  <p>3. Update <strong>Section #4 (Final Assessment)</strong>.</p>
                                  <p>4. Transition status to <strong>Closed</strong>.</p>
                              </div>
                          </div>
                      </CollapsibleContent>
                  </Collapsible>
              </div>
          )}

          {/* ACTION MODULES GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ActionPod 
                icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
                title="CAR Registry"
                count={unitCars?.filter(c => c.status !== 'Closed').length || 0}
                label="Non-Conformances"
                link="/qa-reports?tab=car"
                colorClass="bg-rose-50/50 border-rose-100 group-hover:bg-rose-50"
              />
              <ActionPod 
                icon={<Gavel className="h-4 w-4 text-amber-600" />}
                title="MR Decisions"
                count={unitMrOutputs?.filter(o => o.status !== 'Closed').length || 0}
                label="Actionable Items"
                link="/qa-reports?tab=decisions"
                colorClass="bg-amber-50/50 border-amber-100 group-hover:bg-amber-50"
              />
              <ActionPod 
                icon={<Award className="h-4 w-4 text-indigo-600" />}
                title="Quality Gaps"
                count={unitRecommendations?.filter(r => r.status !== 'Closed').length || 0}
                label="Accreditation Gaps"
                link="/academic-programs"
                colorClass="bg-indigo-50/50 border-indigo-100 group-hover:bg-indigo-50"
              />
              <ActionPod 
                icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
                title="IQA Evidence"
                count={dashboardSchedules?.length || 0}
                label="Audit Itinerary"
                link="/audit"
                colorClass="bg-emerald-50/50 border-emerald-100 group-hover:bg-emerald-50"
                customAction={
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handlePrintAuditReport} 
                        disabled={isPrintingReport}
                        className="h-6 px-2 text-[8px] font-black uppercase border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50"
                    >
                        {isPrintingReport ? <Loader2 className="h-2 w-2 animate-spin" /> : <Printer className="h-2 w-2" />}
                        Report
                    </Button>
                }
              />
          </div>
      </CardContent>
      <CardFooter className="bg-muted/10 border-t py-3 px-6">
          <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                  <strong>Operational Guide:</strong> This hub prioritizes items that directly impact your unit's **Quality Maturity Index**. All open CARs and MR Decisions should be transitioned to 'Closed' or 'In Progress' to satisfy audit criteria.
              </p>
          </div>
      </CardFooter>
    </Card>
  );
}
