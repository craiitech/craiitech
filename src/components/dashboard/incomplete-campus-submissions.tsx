
'use client';

import { useMemo } from 'react';
import type { Submission, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning, School, CheckCircle, Building } from 'lucide-react';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT } from '@/app/(dashboard)/dashboard/page';
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
    if (!allSubmissions || !allCampuses || !allUnits) {
      return [];
    }

    const unitsByCampus = allUnits.reduce((acc, unit) => {
      if (unit.campusIds) {
        unit.campusIds.forEach(campusId => {
          if (!acc[campusId]) {
            acc[campusId] = [];
          }
          acc[campusId].push(unit);
        });
      }
      return acc;
    }, {} as Record<string, Unit[]>);
    

    return allCampuses.map(campus => {
      const campusUnits = unitsByCampus[campus.id] || [];
      if (campusUnits.length === 0) return null;

      const incompleteUnits = campusUnits.map(unit => {
        const unitSubmissionsForYear = allSubmissions.filter(
          s => s.unitId === unit.id && s.year === selectedYear
        );

        const firstCycleRegistry = unitSubmissionsForYear.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry Form');
        const isFirstActionPlanNA = firstCycleRegistry?.riskRating === 'low';
        const firstCycleSubmitted = new Set(unitSubmissionsForYear.filter(s => s.cycleId === 'first').map(s => s.reportType));
        const missingFirst = submissionTypes.filter(type => {
            if (isFirstActionPlanNA && type === 'Risk and Opportunity Action Plan') return false;
            return !firstCycleSubmitted.has(type);
        });
        
        const finalCycleRegistry = unitSubmissionsForYear.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry Form');
        const isFinalActionPlanNA = finalCycleRegistry?.riskRating === 'low';
        const finalCycleSubmitted = new Set(unitSubmissionsForYear.filter(s => s.cycleId === 'final').map(s => s.reportType));
        const missingFinal = submissionTypes.filter(type => {
            if (isFinalActionPlanNA && type === 'Risk and Opportunity Action Plan') return false;
            return !finalCycleSubmitted.has(type);
        });

        const missingCount = missingFirst.length + missingFinal.length;
        
        if (missingCount > 0) {
          return {
            unitId: unit.id,
            unitName: unit.name,
            missingCount,
          };
        }
        return null;
      }).filter((u): u is { unitId: string; unitName: string; missingCount: number } => u !== null);

      if (incompleteUnits.length > 0) {
        return {
          campusId: campus.id,
          campusName: campus.name,
          incompleteUnits,
        };
      }
      return null;

    }).filter((c): c is { campusId: string; campusName: string; incompleteUnits: { unitId: string; unitName: string; missingCount: number; }[] } => c !== null);
    
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
            <Accordion type="multiple" className="w-full">
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
