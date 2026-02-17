'use client';

import { useMemo } from 'react';
import type { Submission, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning, School, CheckCircle, Building } from 'lucide-react';
import { TOTAL_REPORTS_PER_CYCLE } from '@/app/(dashboard)/dashboard/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const currentYear = new Date().getFullYear();
const yearsList = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

interface IncompleteCampusSubmissionsProps {
  allSubmissions: Submission[] | null;
  allCampuses: Campus[] | null;
  allUnits: Unit[] | null;
  isLoading: boolean;
  selectedYear: number;
  onYearChange: (year: number) => void;
  onUnitClick?: (unitId: string, campusId: string) => void; 
}

export function IncompleteCampusSubmissions({
  allSubmissions,
  allCampuses,
  allUnits,
  isLoading,
  selectedYear,
  onYearChange,
  onUnitClick
}: IncompleteCampusSubmissionsProps) {

  const incompleteSubmissionsByCampus = useMemo(() => {
    if (!allSubmissions || !allCampuses || !allUnits || !selectedYear) {
      return [];
    }

    const campusResults = allCampuses.map(campus => {
      const unitsInThisCampus = allUnits.filter(unit => unit.campusIds?.includes(campus.id));

      if (unitsInThisCampus.length === 0) {
        return null;
      }
      
      const incompleteUnits = unitsInThisCampus.map(unit => {
        const submissionsForUnitAndYear = allSubmissions.filter(s => s.unitId === unit.id && s.campusId === campus.id && s.year === selectedYear);

        // CRITICAL: Logic based on APPROVED status, excluding N/A
        
        // --- FIRST CYCLE ---
        const firstCycleApproved = submissionsForUnitAndYear.filter(s => s.cycleId === 'first' && s.statusId === 'approved');
        const firstCycleApprovedTypes = new Set(firstCycleApproved.map(s => s.reportType));
        const firstRegistry = submissionsForUnitAndYear.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry');
        const firstIsActionPlanNA = firstRegistry?.riskRating === 'low';
        
        let requiredInFirst = TOTAL_REPORTS_PER_CYCLE;
        if (firstIsActionPlanNA) {
          requiredInFirst = TOTAL_REPORTS_PER_CYCLE - 1;
        }

        const missingFirst = Math.max(0, requiredInFirst - firstCycleApprovedTypes.size);

        // --- FINAL CYCLE ---
        const finalCycleApproved = submissionsForUnitAndYear.filter(s => s.cycleId === 'final' && s.statusId === 'approved');
        const finalCycleApprovedTypes = new Set(finalCycleApproved.map(s => s.reportType));
        const finalRegistry = submissionsForUnitAndYear.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry');
        const finalIsActionPlanNA = finalRegistry?.riskRating === 'low';

        let requiredInFinal = TOTAL_REPORTS_PER_CYCLE;
        if (finalIsActionPlanNA) {
          requiredInFinal = TOTAL_REPORTS_PER_CYCLE - 1;
        }
        
        const missingFinal = Math.max(0, requiredInFinal - finalCycleApprovedTypes.size);

        // --- TOTAL ---
        const totalMissing = missingFirst + missingFinal;

        return {
          unitId: unit.id,
          unitName: unit.name,
          missingCount: totalMissing,
        };
      }).filter(unit => unit.missingCount > 0);

      if (incompleteUnits.length > 0) {
        return {
          campusId: campus.id,
          campusName: campus.name,
          incompleteUnits: incompleteUnits.sort((a,b) => b.missingCount - a.missingCount),
        };
      }
      
      return null;
    }).filter(Boolean as any);

    return campusResults;
  }, [allSubmissions, allCampuses, allUnits, selectedYear]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                 <CardTitle className="flex items-center gap-2 text-amber-700">
                    <FileWarning className="h-5 w-5" />
                    Pending Verification
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Units with reports awaiting upload or final approval.
                </CardDescription>
            </div>
            <div className="w-full sm:w-[120px]">
                <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                    {yearsList.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {incompleteSubmissionsByCampus.length > 0 ? (
            <Accordion type="multiple" className="w-full" defaultValue={incompleteSubmissionsByCampus.map(c => c.campusId)}>
            {incompleteSubmissionsByCampus.map(campus => (
                <AccordionItem value={campus.campusId} key={campus.campusId} className="border-none">
                <AccordionTrigger className="font-bold hover:no-underline py-3 px-2 hover:bg-muted/50 rounded-md">
                    <div className="flex items-center gap-3">
                        <School className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs uppercase tracking-tight">{campus.campusName}</span>
                        <Badge variant="outline" className="h-5 text-[9px] font-black">{campus.incompleteUnits.length} UNITS</Badge>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                    <ul className="space-y-1 pl-2">
                        {campus.incompleteUnits.map(unit => (
                            <li key={unit.unitId}>
                              <Button
                                variant="ghost"
                                className="flex h-auto w-full items-start justify-start gap-2 p-2 hover:bg-amber-50 group transition-colors"
                                onClick={() => onUnitClick?.(unit.unitId, campus.campusId)}
                              >
                                <Building className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground group-hover:text-amber-600" />
                                <div className="flex flex-col flex-1 items-start min-w-0">
                                    <span className="text-xs font-bold text-card-foreground leading-tight truncate w-full">{unit.unitName}</span>
                                    <span className="text-[10px] text-amber-600 font-black uppercase tracking-tighter">{unit.missingCount} REQUIRED ACTIONS</span>
                                </div>
                              </Button>
                            </li>
                        ))}
                    </ul>
                </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
        ) : (
             <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground h-40 border border-dashed rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2 opacity-20" />
                <p className="font-bold text-xs uppercase tracking-widest">Institutionally Compliant</p>
                <p className="text-[10px] max-w-[200px] mt-1">All units have achieved 100% verified approval for {selectedYear}.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
