'use client';

import { Badge } from '@/components/ui/badge';
import type { RepairRequestStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<
  RepairRequestStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  Submitted: { label: 'Submitted', variant: 'secondary' },
  Reviewed: { label: 'Reviewed', variant: 'outline' },
  Assigned: { label: 'Assigned', variant: 'default' },
  InProgress: { label: 'In Progress', variant: 'default' },
  Completed: { label: 'Completed', variant: 'secondary' },
  Filed: { label: 'Filed', variant: 'outline' },
};

export function FiamoStatusBadge({ status, className }: { status: RepairRequestStatus; className?: string }) {
  const style = STATUS_STYLES[status] || { label: status, variant: 'outline' as const };
  return (
    <Badge variant={style.variant} className={cn('font-bold text-[9px] uppercase tracking-wider', className)}>
      {style.label}
    </Badge>
  );
}
