'use client';

import { useMemo, useState } from 'react';
import type { AuditPlan, AuditSchedule, Campus, User, Unit } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Edit, CalendarPlus, Building2, ClipboardCheck, Clock, UserCheck, ChevronRight, FileText, Settings2 } from 'lucide-react';
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
 * HIERARCHICAL AUDIT REGISTRY
 * Displays audit plans as top-level containers with nested unit schedules.
 */
export function AuditPlanList({ plans, schedules, campuses, users, units, onEditPlan, onScheduleAudit }: AuditPlanListProps) {
    
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  
  const sortedPlans = useMemo(() => {
    return [...plans].sort((a,b) => b.year - a.year || a.title.localeCompare(b.title));
  }, [plans]);

  if (plans.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-40">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground" />
            <p className="text-xs font-black uppercase tracking-[0.2em]">Framework Registry Empty</p>
            <p className="text-[10px] max-w-xs">Establish an audit plan to begin scheduling unit-level evaluations.</p>
        </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full space-y-4">
      {sortedPlans.map(plan => {
        const planSchedules = schedules.filter(s => s.auditPlanId === plan.id);
        const completedCount = planSchedules.filter(s => s.status === 'Completed').length;
        const progress = planSchedules.length > 0 ? (completedCount / planSchedules.length) * 100 : 0;

        return (
          <AccordionItem value={plan.id} key={plan.id} className="border rounded-xl shadow-sm overflow-hidden bg-background">
            <AccordionTrigger className="hover:no-underline px-6 py-4 data-[state=open]:bg-muted/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between w-full pr-4 text-left gap-4">
                    <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="font-black text-sm text-slate-900 uppercase tracking-tight truncate">{plan.title}</p>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-5 text-[9px] font-black">{plan.year}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {campusMap.get(plan.campusId) || '...'}</span>
                            <span className="flex items-center gap-1.5"><Settings2 className="h-3 w-3" /> {plan.auditeeType}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter mb-1">Execution Status</div>
                            <div className="flex items-center gap-2">
                                <div className="text-xs font-black tabular-nums">{completedCount}/{planSchedules.length}</div>
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-0 border-t bg-slate-50/30">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 max-w-xl">
                        <p className="text-[9px] font-black uppercase text-primary tracking-widest mb-1 flex items-center gap-1.5">
                            <FileText className="h-2.5 w-2.5" /> Scope of Engagement
                        </p>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed italic">{plan.scope}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEditPlan(plan); }} className="h-8 text-[10px] font-bold uppercase bg-white">
                            <Edit className="mr-2 h-3.5 w-3.5"/> Edit Plan
                        </Button>
                        <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); onScheduleAudit(plan); }} className="h-8 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/10">
                            <CalendarPlus className="mr-2 h-3.5 w-3.5"/> Schedule Auditee
                        </Button>
                    </div>
                </div>
                
                <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                    {planSchedules.length > 0 ? (
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-[10px] font-black uppercase py-2">Auditee (Unit/Office)</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-2">Provisioned Auditor</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-2 text-center">Date & Time</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-2 text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {planSchedules.sort((a,b) => a.scheduledDate.toMillis() - b.scheduledDate.toMillis()).map(schedule => (
                                <TableRow key={schedule.id} className="group hover:bg-muted/20">
                                    <TableCell className="py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                            </div>
                                            <span className="font-bold text-xs text-slate-800">{schedule.targetName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <div className="flex items-center gap-2">
                                            <UserCheck className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                                            <span className="text-xs font-medium">{schedule.auditorName || 'Pool (Unclaimed)'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-3">
                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                            <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 uppercase tracking-tighter">
                                                {format(schedule.scheduledDate.toDate(), 'MMM dd, yyyy')}
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                                                <Clock className="h-2.5 w-2.5" />
                                                {format(schedule.scheduledDate.toDate(), 'hh:mm a')}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right py-3 pr-6">
                                        <Badge 
                                            variant={schedule.status === 'Completed' ? 'default' : 'secondary'} 
                                            className={cn(
                                                "text-[9px] font-black uppercase border-none px-2",
                                                schedule.status === 'Scheduled' && "bg-amber-100 text-amber-700",
                                                schedule.status === 'In Progress' && "bg-blue-100 text-blue-700 animate-pulse",
                                                schedule.status === 'Completed' && "bg-emerald-100 text-emerald-700"
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
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
                        <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No Provisioned Schedules</p>
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
