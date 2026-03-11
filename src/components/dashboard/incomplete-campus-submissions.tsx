'use client';

import { useMemo } from 'react';
import type { Submission, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning, School, CheckCircle, Building, Info } from 'lucide-react';
import { TOTAL_REPORTS_PER_CYCLE } from '@/app/(dashboard)/dashboard/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    <Card className="border-amber-200 h-fit flex flex-col shadow-sm">
      <CardHeader className="bg-amber-50/30 border-b pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                 <CardTitle className="text-sm font-black uppercase text-amber-700 flex items-center gap-2">
                    <FileWarning className="h-4 w-4" />
                    Pending Verification
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                Gaps identified for AY {selectedYear}.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[450px]">
            <div className="p-4">
                {incompleteSubmissionsByCampus.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                    {incompleteSubmissionsByCampus.map(campus => (
                        <AccordionItem value={campus.campusId} key={campus.campusId} className="border-none">
                        <AccordionTrigger className="font-bold hover:no-underline py-2 px-2 hover:bg-muted/50 rounded-md transition-colors text-xs">
                            <div className="flex items-center gap-2">
                                <School className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="uppercase tracking-tighter truncate max-w-[140px]">{campus.campusName}</span>
                                <Badge variant="outline" className="h-4 text-[8px] font-black">{campus.incompleteUnits.length}</Badge>
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
                                        <Building className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground group-hover:text-amber-600" />
                                        <div className="flex flex-col flex-1 items-start min-w-0">
                                            <span className="text-[11px] font-bold text-card-foreground leading-tight truncate w-full">{unit.unitName}</span>
                                            <span className="text-[9px] text-amber-600 font-black uppercase tracking-tighter">{unit.missingCount} Gaps</span>
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
                    <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground py-10 opacity-20">
                        <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                        <p className="font-black text-xs uppercase tracking-widest">Compliant</p>
                    </div>
                )}
            </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="bg-muted/5 border-t py-3">
          <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[9px] text-muted-foreground italic leading-tight">
                  Identifies specific units with missing or rejected documents for AY {selectedYear}.
              </p>
          </div>
      </CardFooter>
    </Card>
  );
}
