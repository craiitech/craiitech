'use client';

import { useMemo, useState } from 'react';
import type { AuditPlan, AuditSchedule, Campus, User, Unit, Signatories, AuditGroup, AuditFinding, ISOClause } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Edit, CalendarPlus, Building2, ClipboardCheck, Clock, UserCheck, ChevronRight, Settings2, User as UserIcon, Calendar, ShieldCheck, Flag, ListChecks, Trash2, Globe, Printer, Search, ArrowUpDown, Users, FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Timestamp, doc } from 'firebase/firestore';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditPlanPrintTemplate } from './audit-plan-print-template';
import { ConsolidatedAuditReportTemplate } from './consolidated-audit-report-template';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

interface AuditPlanListProps {
  plans: AuditPlan[];
  schedules: AuditSchedule[];
  findings: AuditFinding[];
  isoClauses: ISOClause[];
  campuses: Campus[];
  users: User[];
  units: Unit[];
  onEditPlan: (plan: AuditPlan) => void;
  onDeletePlan: (plan: AuditPlan) => void;
  onScheduleAudit: (plan: AuditPlan) => void;
  onEditSchedule: (plan: AuditPlan, schedule: AuditSchedule) => void;
  onDeleteSchedule: (schedule: AuditSchedule) => void;
}

type SortKey = 'scheduledDate' | 'processCategory' | 'targetName' | 'status';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

/**
 * Sub-component to handle local search and sort for a specific plan's itinerary.
 */
function PlanItineraryRegistry({ 
    plan, 
    schedules, 
    onEdit, 
    onDelete 
}: { 
    plan: AuditPlan; 
    schedules: AuditSchedule[];
    onEdit: (plan: AuditPlan, s: AuditSchedule) => void;
    onDelete: (s: AuditSchedule) => void;
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'scheduledDate', direction: 'asc' });

    const processedSchedules = useMemo(() => {
        let result = [...schedules];

        // 1. Filtering
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(s => 
                s.targetName.toLowerCase().includes(lower) ||
                (s.auditorName || '').toLowerCase().includes(lower) ||
                s.procedureDescription.toLowerCase().includes(lower) ||
                (s.processCategory || '').toLowerCase().includes(lower) ||
                (s.auditeeHeadName || '').toLowerCase().includes(lower)
            );
        }

        // 2. Sorting
        if (sortConfig) {
            const { key, direction } = sortConfig;
            result.sort((a, b) => {
                let valA: any, valB: any;
                
                switch(key) {
                    case 'scheduledDate':
                        valA = a.scheduledDate?.toMillis?.() || new Date(a.scheduledDate).getTime();
                        valB = b.scheduledDate?.toMillis?.() || new Date(b.scheduledDate).getTime();
                        break;
                    case 'processCategory':
                        valA = a.processCategory || '';
                        valB = b.processCategory || '';
                        break;
                    case 'targetName':
                        valA = a.targetName || '';
                        valB = b.targetName || '';
                        break;
                    case 'status':
                        valA = a.status || '';
                        valB = b.status || '';
                        break;
                    default:
                        valA = ''; valB = '';
                }

                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [schedules, searchTerm, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => {
        return (
            <ArrowUpDown className={cn(
                "h-3 w-3 ml-1.5 transition-colors",
                sortConfig?.key === key ? "text-primary opacity-100" : "opacity-20"
            )} />
        );
    };

    return (
        <div className="space-y-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search itinerary..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white shadow-sm border-primary/10"
                />
            </div>

            <div className="rounded-2xl border bg-white shadow-lg overflow-hidden">
                {processedSchedules.length > 0 ? (
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="py-4 pl-8">
                                <Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('scheduledDate')}>
                                    Timeline & Focus {getSortIcon('scheduledDate')}
                                </Button>
                            </TableHead>
                            <TableHead className="text-center">
                                <Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent mx-auto" onClick={() => requestSort('processCategory')}>
                                    Process Type {getSortIcon('processCategory')}
                                </Button>
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase py-4">ISO Clauses</TableHead>
                            <TableHead>
                                <Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('targetName')}>
                                    Procedure / Personnel {getSortIcon('targetName')}
                                </Button>
                            </TableHead>
                            <TableHead className="text-right">
                                <Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent ml-auto" onClick={() => requestSort('status')}>
                                    Status {getSortIcon('status')}
                                </Button>
                            </TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase py-4 pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedSchedules.map(schedule => (
                            <TableRow key={schedule.id} className="group hover:bg-slate-50/50 transition-colors">
                                <TableCell className="py-6 pl-8">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5 text-primary" />
                                            <span className="font-black text-sm text-slate-800 tabular-nums">{format(schedule.scheduledDate.toDate(), 'MM/dd/yyyy')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-muted/20 w-fit px-2 py-1 rounded border border-slate-100">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                                                {format(schedule.scheduledDate.toDate(), 'hh:mm a')}
                                                {schedule.endScheduledDate && <span className="mx-1 text-slate-300">to</span>}
                                                {schedule.endScheduledDate && format(schedule.endScheduledDate.toDate(), 'hh:mm a')}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-6 text-center">
                                    {schedule.processCategory ? (
                                        <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5 text-primary whitespace-nowrap">
                                            {schedule.processCategory.replace(' Processes', '')}
                                        </Badge>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground italic">Not set</span>
                                    )}
                                </TableCell>
                                <TableCell className="py-6">
                                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                                        {schedule.isoClausesToAudit.map((cls, clsIdx) => (
                                            <Badge key={`${schedule.id}-${cls}-${clsIdx}`} variant="outline" className="text-[9px] font-black bg-white border-slate-200 h-4 px-1">{cls}</Badge>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="py-6">
                                    <div className="space-y-3 max-w-xs">
                                        <div className="p-3 rounded-lg border bg-muted/10 border-dashed group-hover:bg-white transition-colors">
                                            <p className="text-[10px] font-black uppercase text-primary mb-1">Procedure / Focus</p>
                                            <p className="text-xs font-medium text-slate-600 leading-relaxed line-clamp-3">{schedule.procedureDescription || 'No description provided.'}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-0.5">
                                                <p className="text-[8px] font-bold text-muted-foreground uppercase">Auditor</p>
                                                <div className="flex items-center gap-1">
                                                    <UserCheck className="h-2.5 w-2.5 text-primary" />
                                                    <span className="text-[10px] font-black text-slate-700 truncate">{schedule.auditorName || 'UNCLAIMED'}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[8px] font-bold text-muted-foreground uppercase">Auditee & Head</p>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1">
                                                        <Building2 className="h-2.5 w-2.5 text-primary" />
                                                        <span className="text-[10px] font-black text-slate-700 truncate">{schedule.targetName}</span>
                                                    </div>
                                                    {schedule.auditeeHeadName && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <UserIcon className="h-2.5 w-2.5 text-slate-400" />
                                                            <span className="text-[9px] font-medium text-slate-500 italic truncate">({schedule.auditeeHeadName})</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right py-6">
                                    <Badge 
                                        className={cn(
                                            "text-[9px] font-black uppercase border-none px-3 shadow-sm",
                                            schedule.status === 'Scheduled' && "bg-amber-100 text-amber-700",
                                            schedule.status === 'In Progress' && "bg-blue-600 text-white animate-pulse",
                                            schedule.status === 'Completed' && "bg-emerald-600 text-white"
                                        )}
                                    >
                                        {schedule.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right py-6 pr-8 whitespace-nowrap">
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-primary hover:bg-primary/5"
                                            onClick={() => onEdit(plan, schedule)}
                                        >
                                            <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-destructive hover:bg-destructive/5"
                                            onClick={() => onDelete(schedule)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-20">
                    <Clock className="h-12 w-12 text-muted-foreground" />
                    <p className="text-xs font-black uppercase tracking-[0.2em]">{searchTerm ? 'No matching entries found' : 'Itinerary Provisioning Required'}</p>
                </div>
                )}
            </div>
        </div>
    );
}

export function AuditPlanList({ 
    plans, 
    schedules, 
    findings,
    isoClauses,
    campuses, 
    users,
    units, 
    onEditPlan, 
    onDeletePlan,
    onScheduleAudit, 
    onEditSchedule,
    onDeleteSchedule
}: AuditPlanListProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { systemSettings } = useUser();
    
  const campusMap = useMemo(() => {
    const map = new Map(campuses.map(c => [c.id, c.name]));
    map.set('university-wide', 'University-Wide Audit');
    return map;
  }, [campuses]);

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);
  
  const sortedPlans = useMemo(() => {
    return [...plans].sort((a,b) => b.year - a.year || a.title.localeCompare(b.title));
  }, [plans]);

  const safeFormatDateTime = (d: any) => {
      if (!d) return 'TBA';
      
      let date: Date;
      if (d && typeof d.toDate === 'function') {
          date = d.toDate();
      } 
      else if (d && typeof d.seconds === 'number') {
          date = new Date(d.seconds * 1000);
      }
      else {
          date = new Date(d);
      }

      if (isNaN(date.getTime())) return 'TBA';
      return format(date, 'MM/dd/yyyy | hh:mm a');
  };

  const handlePrintPlan = (plan: AuditPlan) => {
    const planSchedules = schedules.filter(s => s.auditPlanId === plan.id);
    const cName = campusMap.get(plan.campusId) || 'Institutional';

    const sectionsToPrint = Array.from(new Set([
        ...(plan.auditeeType || []),
        ...(planSchedules.map(s => s.processCategory).filter(Boolean) as AuditGroup[])
    ]));

    const order = { 'Management Processes': 1, 'Operation Processes': 2, 'Support Processes': 3 };
    sectionsToPrint.sort((a, b) => (order[a as keyof typeof order] || 99) - (order[b as keyof typeof order] || 99));

    try {
        const reportsHtml = sectionsToPrint.map(section => {
            const sectionSchedules = planSchedules.filter(s => s.processCategory === section);
            return renderToStaticMarkup(
                <div key={section} className="print-page-break mb-12">
                    <AuditPlanPrintTemplate 
                        plan={plan} 
                        schedules={sectionSchedules} 
                        campusName={cName} 
                        signatories={signatories || undefined} 
                        section={section as AuditGroup}
                    />
                </div>
            );
        }).join('');

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Audit Plan - ${plan.auditNumber}</title>
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
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Detailed Audit Plan</button>
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
        toast({ title: "Print Failed", description: "Could not generate the plan template.", variant: "destructive" });
    }
  };

  const handlePrintConsolidatedReport = (plan: AuditPlan) => {
    const planSchedules = schedules.filter(s => s.auditPlanId === plan.id);
    const scheduleIds = new Set(planSchedules.map(s => s.id));
    const planFindings = findings.filter(f => scheduleIds.has(f.auditScheduleId));

    try {
        const reportHtml = renderToStaticMarkup(
            <ConsolidatedAuditReportTemplate 
                plan={plan}
                schedules={planSchedules}
                findings={planFindings}
                clauses={isoClauses}
                units={units}
                campuses={campuses}
                signatories={signatories || undefined}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Consolidated Audit Report - ${plan.auditNumber}</title>
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
                        <button onclick="window.print()" class="bg-indigo-600 text-white px-8 py-3 rounded shadow-xl hover:bg-indigo-700 font-black uppercase text-xs tracking-widest transition-all">Print Consolidated Institutional Report</button>
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
        console.error("Consolidation error:", err);
        toast({ title: "Report Generation Failed", description: "Could not consolidate institutional findings.", variant: "destructive" });
    }
  };

  if (plans.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-40">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground" />
            <p className="text-xs font-black uppercase tracking-[0.2em]">Institutional Framework Registry Empty</p>
            <p className="text-[10px] max-w-xs">Establish an audit plan to begin scheduling unit-level itineraries.</p>
        </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full space-y-6">
      {sortedPlans.map(plan => {
        const planSchedules = schedules.filter(s => s.auditPlanId === plan.id);
        const completedCount = planSchedules.filter(s => s.status === 'Completed').length;
        const progress = planSchedules.length > 0 ? (completedCount / planSchedules.length) * 100 : 0;

        const teamAuditors = Array.from(new Set(
            planSchedules
                .map(s => s.auditorName)
                .filter((name): name is string => !!name && name !== plan.leadAuditorName)
        )).sort();

        return (
          <AccordionItem value={plan.id} key={plan.id} className="border-none rounded-2xl shadow-xl overflow-hidden bg-background">
            <AccordionTrigger className="hover:no-underline px-8 py-6 data-[state=open]:bg-slate-50 border-b transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between w-full pr-6 text-left gap-6">
                    <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono text-primary border-primary/30 h-6 px-2 text-[10px] font-black uppercase bg-primary/5">
                                NO: {plan.auditNumber || '--'}
                            </Badge>
                            <p className="font-black text-lg text-slate-900 uppercase tracking-tight truncate">{plan.title}</p>
                        </div>
                        <div className="flex items-center gap-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <span className="flex items-center gap-1.5">
                                {plan.campusId === 'university-wide' ? <Globe className="h-3.5 w-3.5 text-primary" /> : <Building2 className="h-3.5 w-3.5 text-primary" />} 
                                {campusMap.get(plan.campusId) || '...'}
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                                <Settings2 className="h-3.5 w-3.5 text-primary mr-1" />
                                {Array.isArray(plan.auditeeType) ? (
                                    plan.auditeeType.map((type, idx) => (
                                        <Badge key={`${plan.id}-${type}-${idx}`} variant="secondary" className="h-4 px-1.5 text-[8px] font-black uppercase bg-primary/10 text-primary border-none">{type}</Badge>
                                    ))
                                ) : (
                                    <Badge variant="secondary" className="h-4 px-1.5 text-[8px] font-black uppercase bg-primary/10 text-primary border-none">{plan.auditeeType}</Badge>
                                )}
                            </div>
                            <span className="flex items-center gap-1.5"><Flag className="h-3.5 w-3.5 text-primary" /> {plan.auditType}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-8 shrink-0">
                        <div className="text-right hidden lg:block border-l pl-8 border-slate-200">
                            <div className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.1em] mb-1.5">Execution Milestone</div>
                            <div className="flex items-center gap-3">
                                <div className="text-sm font-black tabular-nums text-slate-800">{completedCount} <span className="text-[10px] text-muted-foreground font-medium">/ {planSchedules.length}</span></div>
                                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                                    <div className="h-full bg-primary transition-all duration-1000 shadow-lg" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-0 bg-white">
              <div className="p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-white p-5 space-y-4">
                        <div className="space-y-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Audit Team</p>
                            <div className="flex items-center gap-3 bg-primary/5 p-3 rounded-lg border border-primary/10 shadow-sm">
                                <UserCheck className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-[10px] font-black text-primary leading-none uppercase tracking-tighter">Lead Auditor</p>
                                    <p className="text-sm font-bold text-slate-900 mt-1">{plan.leadAuditorName || 'TBA'}</p>
                                </div>
                            </div>

                            {teamAuditors.length > 0 && (
                                <div className="pl-11 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-3 w-3 text-muted-foreground" />
                                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Assigned Team Auditors</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {teamAuditors.map((auditor, aIdx) => (
                                            <Badge key={aIdx} variant="outline" className="h-5 text-[9px] font-bold border-slate-200 text-slate-600 bg-slate-50 uppercase shadow-sm">
                                                {auditor}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Meeting Milestones</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-muted/10 rounded-lg border border-slate-100">
                                    <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Opening Meeting</p>
                                    <p className="text-[10px] font-bold text-slate-700">{safeFormatDateTime(plan.openingMeetingDate)}</p>
                                </div>
                                <div className="p-3 bg-muted/10 rounded-lg border border-slate-100">
                                    <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Closing Meeting</p>
                                    <p className="text-[10px] font-bold text-slate-700">{safeFormatDateTime(plan.closingMeetingDate)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-5 space-y-4">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Audit Reference Document</p>
                            <div className="flex items-center gap-3 bg-primary/5 p-3 rounded-lg border border-primary/10">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                <p className="text-xs font-black text-primary">{plan.referenceDocument || 'ISO 21001:2018'}</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Scope & Criteria</p>
                            <div className="p-3 bg-slate-50 rounded-lg border min-h-[84px]">
                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">{plan.scope}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-primary" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Audit Itinerary Entries</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handlePrintConsolidatedReport(plan); }} 
                            className="h-9 text-[10px] font-black uppercase tracking-widest bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 gap-2"
                        >
                            <FileText className="h-3.5 w-3.5"/> Consolidate Report
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handlePrintPlan(plan); }} 
                            className="h-9 text-[10px] font-black uppercase tracking-widest bg-white shadow-sm gap-2 text-primary border-primary/20 hover:bg-primary/5"
                        >
                            <Printer className="h-3.5 w-3.5"/> Print Audit Plan
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); onEditPlan(plan); }} 
                            className="h-9 text-[10px] font-black uppercase tracking-widest bg-white shadow-sm gap-2"
                        >
                            <Edit className="h-3.5 w-3.5"/> Edit Plan
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); onDeletePlan(plan); }} 
                            className="h-9 text-[10px] font-black uppercase tracking-widest bg-white shadow-sm gap-2 text-destructive border-destructive/20 hover:bg-destructive/5"
                        >
                            <Trash2 className="h-3.5 w-3.5"/> Delete
                        </Button>
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); onScheduleAudit(plan); }} 
                            className="h-9 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 gap-2"
                        >
                            <CalendarPlus className="h-3.5 w-3.5"/> Add Entry
                        </Button>
                    </div>
                </div>
                
                <PlanItineraryRegistry 
                    plan={plan}
                    schedules={planSchedules}
                    onEdit={onEditSchedule}
                    onDelete={onDeleteSchedule}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  );
}
