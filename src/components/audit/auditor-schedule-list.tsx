
'use client';

import type { AuditSchedule, Campus, Unit, ISOClause, Signatories, AuditPlan } from '@/lib/types';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { Check, Clock, User, Printer, FileText } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditPrintTemplate } from './audit-print-template';

interface AuditorScheduleListProps {
    schedules: AuditSchedule[];
    plans: AuditPlan[];
    campuses: Campus[];
    units: Unit[];
    isoClauses: ISOClause[];
    signatories?: Signatories;
    isClaimView: boolean;
    onClaimAudit?: (scheduleId: string) => void;
}

export function AuditorScheduleList({ 
    schedules, 
    plans,
    campuses, 
    units, 
    isoClauses, 
    signatories,
    isClaimView, 
    onClaimAudit 
}: AuditorScheduleListProps) {
  const router = useRouter();
  
  const getAuditeeName = (schedule: AuditSchedule) => {
    if (schedule.targetType === 'Unit') {
      const unit = units.find(u => u.id === schedule.targetId);
      if (!unit) return 'Unknown Unit';
      const campus = campuses.find(c => unit.campusIds?.includes(c.id));
      return `${unit.name} (${campus?.name || '...'})`;
    }
    return schedule.targetName;
  }
  
  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a,b) => a.scheduledDate.toMillis() - b.scheduledDate.toMillis());
  }, [schedules]);

  const handlePrintTemplate = (schedule: AuditSchedule) => {
    const clausesInScope = isoClauses.filter(c => schedule.isoClausesToAudit.includes(c.id));
    const parentPlan = plans.find(p => p.id === schedule.auditPlanId);

    try {
        const reportHtml = renderToStaticMarkup(
            <AuditPrintTemplate 
                schedule={schedule}
                findings={[]} // Pass empty findings for blank template
                clauses={clausesInScope}
                signatories={signatories}
                leadAuditorName={parentPlan?.leadAuditorName}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Audit Evidence Template - ${schedule.targetName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print { 
                            body { margin: 0; padding: 0; background: white; } 
                            .no-print { display: none !important; }
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                        body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Blank Evidence Log</button>
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
            <TableHead className="text-[10px] font-black uppercase">Conduct Schedule</TableHead>
            <TableHead className="text-[10px] font-black uppercase">Auditee Unit & Lead</TableHead>
            <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedSchedules.map(schedule => (
            <TableRow key={schedule.id}>
                <TableCell>
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
                <TableCell>
                    <Badge variant="secondary" className="text-[9px] uppercase font-black px-2 shadow-none border-none">
                        {schedule.status}
                    </Badge>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                        {!isClaimView && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handlePrintTemplate(schedule)}
                                className="h-8 text-[10px] font-black uppercase tracking-widest bg-white border-primary/20 text-primary"
                                title="Print Blank Template for Offline Use"
                            >
                                <Printer className="h-3.5 w-3.5 mr-1.5" />
                                Print Template
                            </Button>
                        )}
                        {isClaimView ? (
                            <Button variant="default" size="sm" onClick={() => onClaimAudit?.(schedule.id)} className="h-8 text-[10px] font-black uppercase tracking-widest shadow-md shadow-primary/10">
                                <Check className="h-3.5 w-3.5 mr-1.5" /> Claim Audit
                            </Button>
                        ) : (
                            <Button variant="default" size="sm" onClick={() => router.push(`/audit/${schedule.id}`)} className="h-8 text-[10px] font-black uppercase tracking-widest shadow-md shadow-primary/10 px-4">
                                Open Evidence Log
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
