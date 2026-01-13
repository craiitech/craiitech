
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
import { Check } from 'lucide-react';

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
            <TableHead>Date</TableHead>
            <TableHead>Auditee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedSchedules.map(schedule => (
            <TableRow key={schedule.id}>
                <TableCell>{format(schedule.scheduledDate.toDate(), 'PPP')}</TableCell>
                <TableCell>{getAuditeeName(schedule)}</TableCell>
                <TableCell><Badge>{schedule.status}</Badge></TableCell>
                <TableCell className="text-right">
                    {isClaimView ? (
                        <Button variant="default" size="sm" onClick={() => onClaimAudit?.(schedule.id)}>
                            <Check className="mr-2 h-4 w-4" /> Claim Audit
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => router.push(`/audit/${schedule.id}`)}>
                            Start Audit
                        </Button>
                    )}
                </TableCell>
            </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
