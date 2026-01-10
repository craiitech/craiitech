
'use client';

import { useMemo } from 'react';
import type { AuditPlan, AuditSchedule, Campus, User, Unit } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Edit, CalendarPlus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Separator } from '../ui/separator';

interface AuditPlanListProps {
  plans: AuditPlan[];
  schedules: AuditSchedule[];
  campuses: Campus[];
  users: User[];
  units: Unit[];
  onEditPlan: (plan: AuditPlan) => void;
  onScheduleAudit: (plan: AuditPlan) => void;
}

export function AuditPlanList({ plans, schedules, campuses, users, units, onEditPlan, onScheduleAudit }: AuditPlanListProps) {
    
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  
  const getAuditeeName = (schedule: AuditSchedule) => {
    if (schedule.targetType === 'Unit') {
      return units.find(u => u.id === schedule.targetId)?.name || 'Unknown Unit';
    }
    const user = users.find(u => u.id === schedule.targetId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  }

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a,b) => b.year - a.year || a.title.localeCompare(b.title));
  }, [plans]);

  if (plans.length === 0) {
    return <div className="text-center text-muted-foreground py-10">No audit plans created yet.</div>;
  }

  return (
    <Accordion type="multiple" className="w-full">
      {sortedPlans.map(plan => {
        const planSchedules = schedules.filter(s => s.auditPlanId === plan.id);
        return (
          <AccordionItem value={plan.id} key={plan.id}>
            <AccordionTrigger>
                <div className="flex justify-between items-center w-full pr-4">
                    <div className="text-left">
                        <p className="font-semibold">{plan.title}</p>
                        <p className="text-sm text-muted-foreground">
                            {campusMap.get(plan.campusId) || 'Unknown Campus'} &bull; Auditing: {plan.auditeeType}
                        </p>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-t pt-4">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEditPlan(plan); }}>
                        <Edit className="mr-2 h-4 w-4"/> Edit Plan
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onScheduleAudit(plan); }}>
                            <CalendarPlus className="mr-2 h-4 w-4"/> Schedule Audit
                    </Button>
                </div>
                
                {planSchedules.length > 0 ? (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Auditee</TableHead>
                              <TableHead>Auditor</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {planSchedules.map(schedule => (
                              <TableRow key={schedule.id}>
                                  <TableCell>{getAuditeeName(schedule)}</TableCell>
                                  <TableCell>{schedule.auditorName}</TableCell>
                                  <TableCell>{format(schedule.scheduledDate.toDate(), 'PPP')}</TableCell>
                                  <TableCell>{schedule.status}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
                ) : (
                  <div className="text-center text-sm text-muted-foreground p-4 border-t">
                      No audits have been scheduled for this plan yet.
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  );
}
