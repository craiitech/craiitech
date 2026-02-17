'use client';

import { useMemo } from 'react';
import type { Submission, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, Circle, AlertCircle, Eye } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { cn } from '@/lib/utils';

interface UnitSubmissionDetailCardProps {
  unitId: string;
  campusId: string;
  allUnits: Unit[] | null;
  allSubmissions: Submission[] | null;
  onClose: () => void;
  onViewSubmission: (id: string) => void;
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
      return <Circle className="h-4 w-4 text-muted-foreground opacity-20" />;
  }
};

export function UnitSubmissionDetailCard({
  unitId,
  campusId,
  allUnits,
  allSubmissions,
  onClose,
  onViewSubmission,
  selectedYear,
}: UnitSubmissionDetailCardProps) {
  const unit = useMemo(() => allUnits?.find(u => u.id === unitId), [allUnits, unitId]);

  const unitSubmissions = useMemo(() => {
    if (!allSubmissions || !unitId || !campusId) {
      return { firstCycle: new Map(), finalCycle: new Map() };
    }
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
        .map(s => [s.reportType, s])
    );
    const finalCycle = new Map(
      submissionsForUnit
        .filter(s => s.cycleId === 'final')
        .map(s => [s.reportType, s])
    );

    return { firstCycle, finalCycle, isFirstActionPlanNA, isFinalActionPlanNA };
  }, [allSubmissions, unitId, campusId, selectedYear]);
  
  if (!unit) return null;

  const renderSubmissionList = (cycleName: 'First' | 'Final', statusMap: Map<string, Submission>, isActionPlanNA: boolean) => (
    <div className="bg-background rounded-lg border p-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">{cycleName} Cycle Verification</h4>
        <div className="space-y-2">
            {submissionTypes.map(reportType => {
                const submission = statusMap.get(reportType);
                const status = submission?.statusId;
                const submissionId = submission?.id;
                const isNA = reportType === 'Risk and Opportunity Action Plan' && isActionPlanNA;
                return (
                    <div key={reportType} className={cn("flex items-center justify-between rounded-md border p-2 text-[11px]", isNA && "opacity-50 bg-muted/50")}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getIconForStatus(isNA ? 'n/a' : status)}
                            <span className={cn("font-medium truncate", !status && !isNA && "text-muted-foreground italic")}>{reportType}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                            {isNA ? (
                                <Badge variant="secondary" className="text-[9px] h-4 py-0">N/A</Badge>
                            ) : status ? (
                                <>
                                    <Badge variant={statusVariant[status] ?? 'secondary'} className="capitalize text-[9px] h-4 py-0 font-black">
                                        {status}
                                    </Badge>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6" 
                                        onClick={() => onViewSubmission(submissionId!)}
                                        title="View Submission"
                                    >
                                        <Eye className="h-3 w-3" />
                                    </Button>
                                </>
                            ) : (
                                <Badge variant="outline" className="text-[9px] h-4 py-0 text-destructive border-destructive/30">PENDING</Badge>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  );

  return (
    <Card className="sticky top-4 border-primary/30 shadow-xl animate-in slide-in-from-right-4 duration-300">
      <CardHeader className="flex flex-row items-start justify-between bg-primary/5 pb-4 rounded-t-lg border-b">
        <div className="min-w-0 pr-4">
          <CardTitle className="text-sm font-black uppercase tracking-tight truncate" title={unit.name}>{unit.name}</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Audit Registry Tracker &bull; {selectedYear}</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-6 bg-muted/5">
        <ScrollArea className="h-[55vh] pr-4">
            <div className="space-y-6">
                {renderSubmissionList('First', unitSubmissions.firstCycle, unitSubmissions.isFirstActionPlanNA)}
                {renderSubmissionList('Final', unitSubmissions.finalCycle, unitSubmissions.isFinalActionPlanNA)}
            </div>
        </ScrollArea>
      </CardContent>
      <div className="p-4 border-t bg-white rounded-b-lg">
        <p className="text-[9px] text-muted-foreground leading-relaxed italic">
            This workspace provides direct oversight of verified records. Only <strong>Approved</strong> documents are marked as compliant.
        </p>
      </div>
    </Card>
  );
}
