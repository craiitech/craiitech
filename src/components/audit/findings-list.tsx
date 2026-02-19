'use client';

import { useMemo } from 'react';
import type { AuditFinding, AuditSchedule, CorrectiveActionPlan } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface FindingsListProps {
  findings: AuditFinding[];
  schedules: AuditSchedule[];
  correctiveActionPlans: CorrectiveActionPlan[];
  isAuditor: boolean;
}

const typeVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  'Non-Conformance': 'destructive',
  'Observation for Improvement': 'secondary',
  'Compliance': 'default',
};

export function FindingsList({ findings, schedules, correctiveActionPlans, isAuditor }: FindingsListProps) {
    const router = useRouter();

    const findingsBySchedule = useMemo(() => {
        return schedules.map(schedule => ({
            ...schedule,
            findings: findings.filter(f => f.auditScheduleId === schedule.id)
        })).filter(s => s.findings.length > 0)
        .sort((a,b) => b.scheduledDate.toMillis() - a.scheduledDate.toMillis());
    }, [schedules, findings]);

    const findCap = (findingId: string) => correctiveActionPlans.find(c => c.findingId === findingId);
    
    if (findingsBySchedule.length === 0) {
        return <div className="text-center text-muted-foreground py-10">No audit findings recorded yet.</div>;
    }

  return (
    <Accordion type="multiple" className="w-full">
      {findingsBySchedule.map(schedule => (
        <AccordionItem value={schedule.id} key={schedule.id}>
          <AccordionTrigger>
             <div className="flex justify-between items-center w-full pr-4">
                <div className="text-left">
                    <p className="font-semibold">{schedule.targetName}</p>
                    <p className="text-sm text-muted-foreground">
                        Audit Date: {format(schedule.scheduledDate.toDate(), 'PPP')}
                    </p>
                </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            {schedule.findings.map(finding => {
                const cap = findCap(finding.id);
                return (
                    <div key={finding.id} className="rounded-lg border p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <Badge variant={typeVariant[finding.type]}>{finding.type}</Badge>
                                <p className="font-semibold mt-2">ISO Clause: {finding.isoClause}</p>
                            </div>
                            {finding.type === 'Non-Conformance' && !isAuditor && (
                                <Button 
                                    size="sm" 
                                    variant={cap ? 'secondary' : 'default'}
                                    onClick={() => router.push(`/audit/cap/${finding.id}`)}
                                >
                                    {cap ? `View CAP (Status: ${cap.status})` : 'Submit Corrective Action Plan'}
                                </Button>
                            )}
                        </div>
                        <div className="mt-2 text-sm space-y-2">
                             <p><strong className="font-medium">Description:</strong> {finding.description}</p>
                             <p><strong className="font-medium">Evidence:</strong> {finding.evidence}</p>
                        </div>
                    </div>
                )
            })}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
