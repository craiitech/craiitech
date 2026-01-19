'use client';

import { useMemo } from 'react';
import type { Submission, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';

interface UnitSubmissionDetailCardProps {
  unitId: string;
  allUnits: Unit[] | null;
  allSubmissions: Submission[] | null;
  onClose: () => void;
  selectedYear: number;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  approved: 'default',
  submitted: 'outline',
  rejected: 'destructive',
};

const getIconForStatus = (status?: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'rejected':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'submitted':
      return <Circle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

export function UnitSubmissionDetailCard({
  unitId,
  allUnits,
  allSubmissions,
  onClose,
  selectedYear,
}: UnitSubmissionDetailCardProps) {
  const unit = useMemo(() => allUnits?.find(u => u.id === unitId), [allUnits, unitId]);

  const unitSubmissions = useMemo(() => {
    if (!allSubmissions || !unitId) {
      return { firstCycle: new Map(), finalCycle: new Map() };
    }
    const submissionsForUnit = allSubmissions.filter(
      s => s.unitId === unitId && s.year === selectedYear
    );

    const firstCycle = new Map(
      submissionsForUnit
        .filter(s => s.cycleId === 'first')
        .map(s => [s.reportType, s.statusId])
    );
    const finalCycle = new Map(
      submissionsForUnit
        .filter(s => s.cycleId === 'final')
        .map(s => [s.reportType, s.statusId])
    );

    return { firstCycle, finalCycle };
  }, [allSubmissions, unitId, selectedYear]);
  
  if (!unit) return null;

  const renderSubmissionList = (cycleName: string, statusMap: Map<string, string>) => (
    <div>
        <h4 className="font-semibold mb-2 capitalize">{cycleName} Cycle</h4>
        <div className="space-y-2">
            {submissionTypes.map(reportType => {
                const status = statusMap.get(reportType);
                return (
                    <div key={reportType} className="flex items-center justify-between rounded-md border p-2">
                        <div className="flex items-center gap-2">
                            {getIconForStatus(status)}
                            <span className="text-sm">{reportType}</span>
                        </div>
                        {status ? (
                             <Badge variant={statusVariant[status] ?? 'secondary'} className="capitalize text-xs">
                                {status}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-xs">Not Submitted</Badge>
                        )}
                    </div>
                )
            })}
        </div>
    </div>
  );

  return (
    <Card className="sticky top-4">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{unit.name}</CardTitle>
          <CardDescription>Submission Status for {selectedYear}</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[45vh] pr-4">
            <div className="space-y-4">
                {renderSubmissionList('First', unitSubmissions.firstCycle)}
                {renderSubmissionList('Final', unitSubmissions.finalCycle)}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
