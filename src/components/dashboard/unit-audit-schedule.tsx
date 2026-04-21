'use client';

import { useState } from 'react';
import { Calendar, Clock, ClipboardList, Info, Printer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AuditSchedule, AuditPlan, Signatories, AuditGroup } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditPlanPrintTemplate } from '@/components/audit/audit-plan-print-template';
import { useToast } from '@/hooks/use-toast';

interface UnitAuditScheduleProps {
  schedules: AuditSchedule[] | null;
  isLoading: boolean;
  plans?: AuditPlan[];
  signatories?: Signatories;
  campusName?: string;
  isSupervisor?: boolean;
}

/**
 * UNIT AUDIT SCHEDULE COMPONENT
 * Displays upcoming IQA sessions for the user's unit or campus.
 * Added: Print Audit Plan functionality for supervisors in the header.
 */
export function UnitAuditSchedule({ 
    schedules, 
    isLoading, 
    plans = [], 
    signatories, 
    campusName = 'Campus Site',
    isSupervisor = false 
}: UnitAuditScheduleProps) {
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);

  if (isLoading) return <Skeleton className="h-32 w-full rounded-2xl" />;
  if (!schedules || schedules.length === 0) return null;

  const handlePrintCampusPlan = () => {
    if (!plans.length || !schedules.length) return;

    setIsPrinting(true);
    try {
        // 1. Identify the relevant plan (use the first schedule's planId as a reference)
        const firstSchedule = schedules[0];
        const plan = plans.find(p => p.id === firstSchedule.auditPlanId);

        if (!plan) {
            toast({ title: "Print Failed", description: "Parent Audit Plan metadata not found.", variant: "destructive" });
            return;
        }

        // 2. Identify sections/groups in this campus's itinerary
        const sectionsToPrint = Array.from(new Set(
            schedules.map(s => s.processCategory).filter(Boolean) as AuditGroup[]
        ));

        // 3. Sort sections for standard layout
        const order = { 'Management Processes': 1, 'Operation Processes': 2, 'Support Processes': 3 };
        sectionsToPrint.sort((a, b) => (order[a as keyof typeof order] || 99) - (order[b as keyof typeof order] || 99));

        // 4. Generate the composite HTML
        const reportsHtml = sectionsToPrint.map(section => {
            const sectionSchedules = schedules.filter(s => s.processCategory === section && s.auditPlanId === plan.id);
            return renderToStaticMarkup(
                <div key={section} className="print-page-break mb-12">
                    <AuditPlanPrintTemplate 
                        plan={plan} 
                        schedules={sectionSchedules} 
                        campusName={campusName} 
                        signatories={signatories} 
                        section={section as AuditGroup}
                    />
                </div>
            );
        }).join('');

        // 5. Trigger Print Window
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Site Audit Plan - ${campusName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print { 
                            body { margin: 0; padding: 0; background: white; } 
                            .no-print { display: none !important; }
                            .print-page-break { page-break-after: always; }
                            .print-page-break:last-child { page-break-after: auto; }
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                        body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-indigo-600 text-white px-8 py-3 rounded shadow-xl hover:bg-indigo-700 font-black uppercase text-xs tracking-widest transition-all">Print Site Itinerary</button>
                    </div>
                    <div id="print-content">
                        ${reportsHtml}
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print error:", err);
        toast({ title: "Print error", variant: "destructive" });
    } finally {
        setIsPrinting(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-md animate-in slide-in-from-top-4 duration-500 overflow-hidden">
      <CardHeader className="pb-3 bg-primary/10 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
                <CardTitle className="text-sm font-black uppercase text-primary flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Active IQA Itinerary Entries
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                Official internal quality audit sessions for your scope.
                </CardDescription>
            </div>
            {isSupervisor && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrintCampusPlan} 
                    disabled={isPrinting}
                    className="h-8 bg-white border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest gap-2 shadow-sm"
                >
                    {isPrinting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                    Print Site Plan
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[450px]">
            <div className="divide-y divide-primary/10 bg-white/50">
                {schedules.map(schedule => {
                    const date = schedule.scheduledDate instanceof Timestamp ? schedule.scheduledDate.toDate() : new Date(schedule.scheduledDate);
                    return (
                        <div key={schedule.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white transition-colors gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-white border border-primary/10 text-primary shrink-0 shadow-sm">
                                    <span className="text-[9px] font-black uppercase leading-none mb-0.5">{format(date, 'MMM')}</span>
                                    <span className="text-lg font-black leading-none">{format(date, 'dd')}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-900 uppercase truncate" title={schedule.targetName}>{schedule.targetName}</p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                                            <Clock className="h-3 w-3 text-primary/60" />
                                            {format(date, 'hh:mm a')}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium italic truncate max-w-[250px]">
                                            <ClipboardList className="h-3 w-3 text-primary/40" />
                                            {schedule.procedureDescription}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <Badge className={cn(
                                    "h-5 text-[9px] font-black uppercase border-none px-3 shadow-sm",
                                    schedule.status === 'In Progress' ? "bg-blue-600 text-white animate-pulse" : "bg-amber-50 text-amber-950"
                                )}>
                                    {schedule.status}
                                </Badge>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="bg-muted/5 border-t py-3 px-6">
          <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[9px] text-muted-foreground italic leading-tight">
                  <strong>Auditee Preparation:</strong> Ensure all evidence logs and registered forms are accessible for verification. Refer to the <strong>Evidence Log Sheet</strong> instructions in the full Audit Hub for standard requirements.
              </p>
          </div>
      </CardFooter>
    </Card>
  );
}
