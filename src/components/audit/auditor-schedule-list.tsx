'use client';

import type { AuditSchedule, Campus, Unit, ISOClause, Signatories, AuditPlan, AuditFinding } from '@/lib/types';
import { useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { Check, Clock, User, Printer, FileText, UserMinus, ShieldAlert, ChevronRight } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditPrintTemplate } from './audit-print-template';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface AuditorScheduleListProps {
    schedules: AuditSchedule[];
    plans: AuditPlan[];
    campuses: Campus[];
    units: Unit[];
    isoClauses: ISOClause[];
    findings: AuditFinding[];
    signatories?: Signatories;
    isClaimView: boolean;
    onClaimAudit?: (scheduleId: string) => void;
    onUnclaimAudit?: (scheduleId: string) => void;
}

export function AuditorScheduleList({ 
    schedules, 
    plans,
    campuses, 
    units, 
    isoClauses, 
    findings,
    signatories,
    isClaimView, 
    onClaimAudit,
    onUnclaimAudit
}: AuditorScheduleListProps) {
  const isOnline = useNetworkStatus();
  const { toast } = useToast();
  const router = useRouter();
  
  const campusMap = useMemo(() => {
    const map = new Map(campuses.map(c => [c.id, c.name]));
    map.set('university-wide', 'Institutional');
    return map;
  }, [campuses]);

  const getAuditeeName = (schedule: AuditSchedule) => {
    const campusName = campusMap.get(schedule.campusId) || '...';
    return `${schedule.targetName} (${campusName})`;
  }
  
  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a,b) => {
        const timeA = a.scheduledDate?.toMillis?.() || new Date(a.scheduledDate).getTime();
        const timeB = b.scheduledDate?.toMillis?.() || new Date(b.scheduledDate).getTime();
        return timeA - timeB;
    });
  }, [schedules]);

  const handleRestrictedAction = (actionName: string) => {
      toast({
          variant: "destructive",
          title: "Action Restricted",
          description: `${actionName} is not part of the offline workspace. Please connect to the internet to perform this task.`,
      });
  };

  const hasEvidence = (scheduleId: string) => {
    const hasFindings = findings.some(f => f.auditScheduleId === scheduleId);
    const schedule = schedules.find(s => s.id === scheduleId);
    const hasSummary = schedule ? !!(schedule.summaryCommendable || schedule.summaryCompliance || schedule.summaryOFI || schedule.summaryNC) : false;
    return hasFindings || hasSummary;
  };

  const handlePrintTemplate = (schedule: AuditSchedule, withData: boolean = false) => {
    if (!isOnline) {
        handleRestrictedAction("Printing official documents");
        return;
    }

    if (withData && !hasEvidence(schedule.id)) {
        toast({
            variant: "destructive",
            title: "No Evidence Logged",
            description: "Print failed: This unit has not been audited yet. No evidence logs are available to print.",
        });
        return;
    }

    const clausesInScope = isoClauses.filter(c => schedule.isoClausesToAudit.includes(c.id));
    const parentPlan = plans.find(p => p.id === schedule.auditPlanId);
    const campusName = campusMap.get(schedule.campusId) || 'Institutional';
    
    const scheduleFindings = withData 
        ? findings.filter(f => f.auditScheduleId === schedule.id)
        : [];

    try {
        const reportHtml = renderToStaticMarkup(
            <AuditPrintTemplate 
                schedule={schedule}
                findings={scheduleFindings}
                clauses={clausesInScope}
                signatories={signatories}
                leadAuditorName={parentPlan?.leadAuditorName}
                campusName={campusName}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Audit Evidence Log - ${schedule.targetName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { 
                            size: 8.5in 13in !important; 
                            margin: 0.5in !important; 
                        }
                        @media print { 
                            body { margin: 0 !important; padding: 0 !important; background: white; width: 100% !important; -webkit-print-color-adjust: exact; } 
                            .no-print { display: none !important; }
                            table { page-break-inside: auto; width: 100% !important; border-collapse: collapse; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                        body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print ${withData ? 'Evidence Log' : 'Blank Template'}</button>
                    </div>
                    <div id="print-content">
                        ${reportHtml}
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print error:", err);
    }
  };

  if (schedules.length === 0) {
    return <div className="text-center text-muted-foreground py-10">
        {isClaimView ? 'No audits are available to be claimed.' : 'You have no audits scheduled.'}
    </div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
            <TableHead className="text-[10px] font-black uppercase pl-6">Conduct Schedule</TableHead>
            <TableHead className="text-[10px] font-black uppercase">Auditee Unit & Site Context</TableHead>
            <TableHead className="text-center text-[10px] font-black uppercase">Status</TableHead>
            {!isClaimView && (
                <TableHead className="text-center text-[10px] font-black uppercase">Print Options</TableHead>
            )}
            <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedSchedules.map(schedule => (
            <TableRow key={schedule.id} className="hover:bg-muted/10 transition-colors">
                <TableCell className="pl-6 py-4">
                    <div className="flex flex-col">
                        <span className="font-black text-xs text-slate-700">{format(schedule.scheduledDate.toDate(), 'MM/dd/yyyy')}</span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                            <Clock className="h-2.5 w-2.5" />
                            {format(schedule.scheduledDate.toDate(), 'hh:mm a')}
                            {schedule.endScheduledDate && ` - ${format(schedule.endScheduledDate.toDate(), 'hh:mm a')}`}
                        </span>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-800 leading-tight">{getAuditeeName(schedule)}</span>
                        {schedule.auditeeHeadName && (
                            <div className="flex items-center gap-1.5 opacity-60">
                                <User className="h-2.5 w-2.5" />
                                <span className="text-[10px] font-medium italic">Head: {schedule.auditeeHeadName}</span>
                            </div>
                        )}
                    </div>
                </TableCell>
                <TableCell className="text-center">
                    <Badge variant="secondary" className="text-[9px] uppercase font-black px-3 shadow-none border-none">
                        {schedule.status}
                    </Badge>
                </TableCell>
                {!isClaimView && (
                    <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handlePrintTemplate(schedule, false)}
                                className="h-8 text-[10px] font-black uppercase tracking-widest bg-white border-primary/20 text-primary hover:bg-primary/5"
                                title={isOnline ? "Print Template" : "Restricted: Offline"}
                            >
                                {isOnline ? <Printer className="h-3.5 w-3.5 mr-1.5" /> : <ShieldAlert className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/30" />}
                                Print Template
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handlePrintTemplate(schedule, true)}
                                className="h-8 text-[10px] font-black uppercase tracking-widest bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                title={isOnline ? "Print Evidence Log" : "Restricted: Offline"}
                            >
                                {isOnline ? <Printer className="h-3.5 w-3.5 mr-1.5" /> : <ShieldAlert className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/30" />}
                                Print Evidence
                            </Button>
                        </div>
                    </TableCell>
                )}
                <TableCell className="text-right pr-6 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                        {!isClaimView && !hasEvidence(schedule.id) && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => onUnclaimAudit?.(schedule.id)}
                                className="h-8 text-[10px] font-black uppercase tracking-widest bg-white border-rose-200 text-rose-600 hover:bg-rose-50"
                                title="Unclaim this unit (Remove from My Audits)"
                            >
                                <UserMinus className="h-3.5 w-3.5 mr-1.5" />
                                Remove
                            </Button>
                        )}
                        {isClaimView ? (
                            <Button variant="default" size="sm" onClick={() => onClaimAudit?.(schedule.id)} className="h-8 text-[10px] font-black uppercase tracking-widest shadow-md shadow-primary/10">
                                <Check className="h-3.5 w-3.5 mr-1.5" /> Claim Audit
                            </Button>
                        ) : (
                            <Button 
                                variant="default" 
                                size="sm" 
                                asChild
                                className="h-8 text-[10px] font-black uppercase tracking-widest shadow-md shadow-primary/10 px-4 gap-2"
                            >
                                <Link href={`/audit/${schedule.id}`} prefetch={true}>
                                    Open Evidence Log
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        )}
                    </div>
                </TableCell>
            </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
