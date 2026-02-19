'use client';

import type { AuditSchedule, Campus, Unit } from '@/lib/types';
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
import { Check, Clock } from 'lucide-react';

interface AuditorScheduleListProps {
    schedules: AuditSchedule[];
    campuses: Campus[];
    units: Unit[];
    isClaimView: boolean;
    onClaimAudit?: (scheduleId: string) => void;
}

export function AuditorScheduleList({ schedules, campuses, units, isClaimView, onClaimAudit }: AuditorScheduleListProps) {
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
            <TableHead className="text-[10px] font-black uppercase">Auditee Unit/Office</TableHead>
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
                <TableCell className="text-xs font-bold text-slate-800">{getAuditeeName(schedule)}</TableCell>
                <TableCell>
                    <Badge variant="secondary" className="text-[9px] uppercase font-black px-2 shadow-none border-none">
                        {schedule.status}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    {isClaimView ? (
                        <Button variant="default" size="sm" onClick={() => onClaimAudit?.(schedule.id)} className="h-8 text-[10px] font-black uppercase tracking-widest shadow-md shadow-primary/10">
                            <Check className="h-3.5 w-3.5 mr-1.5" /> Claim Audit
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => router.push(`/audit/${schedule.id}`)} className="h-8 text-[10px] font-black uppercase tracking-widest bg-white">
                            Open Evidence Log
                        </Button>
                    )}
                </TableCell>
            </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
