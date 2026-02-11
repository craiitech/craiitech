
'use client';

import { useMemo } from 'react';
import type { Submission, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { cn } from '@/lib/utils';

interface UnitSubmissionDetailCardProps {
  unitId: string;
  campusId: string; // FIX: Added campusId to ensure correct site data
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
    case 'n/a':
      return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

export function UnitSubmissionDetailCard({
  unitId,
  campusId,
  allUnits,
  allSubmissions,
  onClose,
  selectedYear,
}: UnitSubmissionDetailCardProps) {
  const unit = useMemo(() => allUnits?.find(u => u.id === unitId), [allUnits, unitId]);

  const unitSubmissions = useMemo(() => {
    if (!allSubmissions || !unitId || !campusId) {
      return { firstCycle: new Map(), finalCycle: new Map() };
    }
    // FIX: Scope by both unit AND campus
    const submissionsForUnit = allSubmissions.filter(
      s => s.unitId === unitId && s.campusId === campusId && s.year === selectedYear
    );

    const firstCycleRegistry = submissionsForUnit.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry');
    const isFirstActionPlanNA = firstCycleRegistry?.riskRating === 'low';

    const finalCycleRegistry = submissionsForUnit.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry');
    const isFinalActionPlanNA = finalCycleRegistry?.riskRating === 'low';

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

    return { firstCycle, finalCycle, isFirstActionPlanNA, isFinalActionPlanNA };
  }, [allSubmissions, unitId, campusId, selectedYear]);
  
  if (!unit) return null;

  const renderSubmissionList = (cycleName: 'First' | 'Final', statusMap: Map<string, string>, isActionPlanNA: boolean) => (
    <div>
        <h4 className="font-semibold mb-2 capitalize">{cycleName} Cycle</h4>
        <div className="space-y-2">
            {submissionTypes.map(reportType => {
                const status = statusMap.get(reportType);
                const isNA = reportType === 'Risk and Opportunity Action Plan' && isActionPlanNA;
                return (
                    <div key={reportType} className={cn("flex items-center justify-between rounded-md border p-2", isNA && "opacity-50 bg-muted/50")}>
                        <div className="flex items-center gap-2">
                            {getIconForStatus(isNA ? 'n/a' : status)}
                            <span className="text-sm">{reportType}</span>
                        </div>
                        {isNA ? (
                            <Badge variant="secondary" className="text-xs">N/A</Badge>
                        ) : status ? (
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
    <Card className="sticky top-4 border-primary/20 shadow-md">
      <CardHeader className="flex flex-row items-start justify-between bg-muted/30 pb-4 rounded-t-lg">
        <div>
          <CardTitle className="text-lg">{unit.name}</CardTitle>
          <CardDescription className="text-xs">Audit Compliance Tracker &bull; {selectedYear}</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        <ScrollArea className="h-[45vh] pr-4">
            <div className="space-y-6">
                {renderSubmissionList('First', unitSubmissions.firstCycle, unitSubmissions.isFirstActionPlanNA)}
                {renderSubmissionList('Final', unitSubmissions.finalCycle, unitSubmissions.isFinalActionPlanNA)}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
