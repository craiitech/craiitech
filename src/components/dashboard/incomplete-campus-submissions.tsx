'use client';

import { useMemo } from 'react';
import type { Submission, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning, School, CheckCircle, Building } from 'lucide-react';
import { TOTAL_REPORTS_PER_CYCLE } from '@/app/(dashboard)/dashboard/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

interface IncompleteCampusSubmissionsProps {
  allSubmissions: Submission[] | null;
  allCampuses: Campus[] | null;
  allUnits: Unit[] | null;
  isLoading: boolean;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export function IncompleteCampusSubmissions({
  allSubmissions,
  allCampuses,
  allUnits,
  isLoading,
  selectedYear,
  onYearChange,
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
        const submissionsForUnitAndYear = allSubmissions.filter(s => s.unitId === unit.id && s.year === selectedYear);

        // --- FIRST CYCLE ---
        const firstCycleSubmissions = submissionsForUnitAndYear.filter(s => s.cycleId === 'first');
        const firstCycleSubmittedTypes = new Set(firstCycleSubmissions.map(s => s.reportType));
        const firstRegistry = firstCycleSubmissions.find(s => s.reportType === 'Risk and Opportunity Registry');
        const firstIsActionPlanNA = firstRegistry?.riskRating === 'low';
        
        let requiredInFirst = TOTAL_REPORTS_PER_CYCLE;
        if (firstIsActionPlanNA) {
          requiredInFirst = TOTAL_REPORTS_PER_CYCLE - 1;
        }

        let submittedInFirst = firstCycleSubmittedTypes.size;
        if (firstIsActionPlanNA && firstCycleSubmittedTypes.has('Risk and Opportunity Action Plan')) {
          submittedInFirst = submittedInFirst - 1;
        }

        const missingFirst = Math.max(0, requiredInFirst - submittedInFirst);

        // --- FINAL CYCLE ---
        const finalCycleSubmissions = submissionsForUnitAndYear.filter(s => s.cycleId === 'final');
        const finalCycleSubmittedTypes = new Set(finalCycleSubmissions.map(s => s.reportType));
        const finalRegistry = finalCycleSubmissions.find(s => s.reportType === 'Risk and Opportunity Registry');
        const finalIsActionPlanNA = finalRegistry?.riskRating === 'low';

        let requiredInFinal = TOTAL_REPORTS_PER_CYCLE;
        if (finalIsActionPlanNA) {
          requiredInFinal = TOTAL_REPORTS_PER_CYCLE - 1;
        }
        
        let submittedInFinal = finalCycleSubmittedTypes.size;
        if (finalIsActionPlanNA && finalCycleSubmittedTypes.has('Risk and Opportunity Action Plan')) {
          submittedInFinal = submittedInFinal - 1;
        }

        const missingFinal = Math.max(0, requiredInFinal - submittedInFinal);

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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                 <CardTitle className="flex items-center gap-2">
                    <FileWarning className="text-destructive" />
                    Incomplete Submissions
                </CardTitle>
                <CardDescription>
                A list of units that have not completed all required submissions for {selectedYear}.
                </CardDescription>
            </div>
            <div className="w-[120px]">
                <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
                    <SelectTrigger>
                    <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {incompleteSubmissionsByCampus.length > 0 ? (
            <Accordion type="multiple" className="w-full" defaultValue={incompleteSubmissionsByCampus.map(c => c.campusId)}>
            {incompleteSubmissionsByCampus.map(campus => (
                <AccordionItem value={campus.campusId} key={campus.campusId}>
                <AccordionTrigger className="font-medium hover:no-underline">
                    <div className="flex items-center gap-3">
                        <School className="h-4 w-4 text-muted-foreground" />
                        <span>{campus.campusName} ({campus.incompleteUnits.length} Incomplete Units)</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
                        {campus.incompleteUnits.map(unit => (
                            <li key={unit.unitId} className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              <span className="font-semibold text-card-foreground">{unit.unitName}</span> - 
                              <span className="text-destructive">{unit.missingCount} report(s) missing</span>
                            </li>
                        ))}
                    </ul>
                </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
        ) : (
             <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground h-40">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <p className="font-semibold">All Compliant!</p>
                <p>All units across all campuses have submitted their required reports for {selectedYear}.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}