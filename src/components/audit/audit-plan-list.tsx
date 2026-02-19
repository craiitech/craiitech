'use client';

import { useMemo, useState } from 'react';
import type { AuditPlan, AuditSchedule, Campus, User, Unit } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Edit, CalendarPlus, Building2, ClipboardCheck, Clock, UserCheck, ChevronRight, FileText, Settings2, User as UserIcon, Calendar, ArrowRight, ShieldCheck, Flag, ListChecks } from 'lucide-react';
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
import { Timestamp } from 'firebase/firestore';

interface AuditPlanListProps {
  plans: AuditPlan[];
  schedules: AuditSchedule[];
  campuses: Campus[];
  users: User[];
  units: Unit[];
  onEditPlan: (plan: AuditPlan) => void;
  onScheduleAudit: (plan: AuditPlan) => void;
}

/**
 * INSTITUTIONAL AUDIT REGISTRY
 * Displays detailed audit plans mapped to the RSU template.
 */
export function AuditPlanList({ plans, schedules, campuses, users, units, onEditPlan, onScheduleAudit }: AuditPlanListProps) {
    
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  
  const sortedPlans = useMemo(() => {
    return [...plans].sort((a,b) => b.year - a.year || a.title.localeCompare(b.title));
  }, [plans]);

  const safeFormatDateTime = (d: any) => {
      if (!d) return 'TBA';
      
      let date: Date;
      // Handle Firestore Timestamp object
      if (d && typeof d.toDate === 'function') {
          date = d.toDate();
      } 
      // Handle serialized timestamp {seconds, nanoseconds}
      else if (d && typeof d.seconds === 'number') {
          date = new Date(d.seconds * 1000);
      }
      // Handle standard Date or ISO string
      else {
          date = new Date(d);
      }

      if (isNaN(date.getTime())) return 'TBA';
      return format(date, 'MM/dd/yyyy | hh:mm a');
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
                            <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary" /> {campusMap.get(plan.campusId) || '...'}</span>
                            <span className="flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5 text-primary" /> {plan.auditeeType}</span>
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
                {/* --- Template-Aligned Header Section --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-white p-5 space-y-4">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Audit Team</p>
                            <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-lg border border-primary/5">
                                <UserCheck className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-xs font-black text-slate-900 leading-none">Lead Auditor</p>
                                    <p className="text-xs font-medium text-primary mt-1">{plan.leadAuditorName || 'TBA'}</p>
                                </div>
                            </div>
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
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEditPlan(plan); }} className="h-9 text-[10px] font-black uppercase tracking-widest bg-white shadow-sm gap-2">
                            <Settings2 className="h-3.5 w-3.5"/> Plan Config
                        </Button>
                        <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); onScheduleAudit(plan); }} className="h-9 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 gap-2">
                            <CalendarPlus className="h-3.5 w-3.5"/> Add Itinerary Entry
                        </Button>
                    </div>
                </div>
                
                <div className="rounded-2xl border bg-white shadow-lg overflow-hidden">
                    {planSchedules.length > 0 ? (
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-[10px] font-black uppercase py-4 pl-8">Timeline & Itinerary Focus</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-4">ISO Clauses</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-4">Procedure / Personnel</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-4 text-right pr-8">Lifecycle Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {planSchedules.sort((a,b) => a.scheduledDate.toMillis() - b.scheduledDate.toMillis()).map(schedule => (
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
                                    <TableCell className="py-6">
                                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                                            {schedule.isoClausesToAudit.map(cls => (
                                                <Badge key={cls} variant="outline" className="text-[9px] font-black bg-white border-slate-200 h-4 px-1">{cls}</Badge>
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
                                                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Auditee</p>
                                                    <div className="flex items-center gap-1">
                                                        <Building2 className="h-2.5 w-2.5 text-primary" />
                                                        <span className="text-[10px] font-black text-slate-700 truncate">{schedule.targetName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right py-6 pr-8">
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
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-20">
                        <Clock className="h-12 w-12 text-muted-foreground" />
                        <p className="text-xs font-black uppercase tracking-[0.2em]">Itinerary Provisioning Required</p>
                    </div>
                    )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  );
}
