
'use client';

import { useMemo } from 'react';
import type { Unit, Submission, User as AppUser, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Heart, CheckCircle2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { TOTAL_REPORTS_PER_CYCLE } from '@/app/(dashboard)/dashboard/page';
import { Badge } from '../ui/badge';

interface CompletedSubmissionsProps {
  allUnits: Unit[] | null;
  allCampuses: Campus[] | null;
  allSubmissions: Submission[] | null;
  isLoading: boolean;
  userProfile: AppUser | null;
  isCampusSupervisor: boolean;
  selectedYear: number;
}

export function CompletedSubmissions({
  allUnits,
  allCampuses,
  allSubmissions,
  isLoading,
  userProfile,
  isCampusSupervisor,
  selectedYear,
}: CompletedSubmissionsProps) {
  
  const completedSubmissionsByCampus = useMemo(() => {
    if (!allUnits || !allSubmissions || !allCampuses) {
      return [];
    }

    const unitsByCampus = allUnits.reduce((acc, unit) => {
      unit.campusIds?.forEach(campusId => {
        if (!acc[campusId]) {
          acc[campusId] = [];
        }
        acc[campusId].push(unit);
      });
      return acc;
    }, {} as Record<string, Unit[]>);
    
    let relevantCampuses = allCampuses;
    if (isCampusSupervisor && userProfile?.campusId) {
        relevantCampuses = allCampuses.filter(c => c.id === userProfile.campusId);
    }

    return relevantCampuses.map(campus => {
        const campusUnits = unitsByCampus[campus.id] || [];
        const completedUnits = campusUnits.map(unit => {
            const unitSubmissions = allSubmissions.filter(s => s.unitId === unit.id && s.year === selectedYear);
            
            const firstCycleRegistry = unitSubmissions.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry');
            const isFirstActionPlanNA = firstCycleRegistry?.riskRating === 'low';
            const requiredFirst = isFirstActionPlanNA ? TOTAL_REPORTS_PER_CYCLE - 1 : TOTAL_REPORTS_PER_CYCLE;
            
            const firstCycleApproved = new Set(
                unitSubmissions.filter(s => s.cycleId === 'first' && s.statusId === 'approved').map(s => s.reportType)
            ).size;

            const finalCycleRegistry = unitSubmissions.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry');
            const isFinalActionPlanNA = finalCycleRegistry?.riskRating === 'low';
            const requiredFinal = isFinalActionPlanNA ? TOTAL_REPORTS_PER_CYCLE - 1 : TOTAL_REPORTS_PER_CYCLE;
            
            const finalCycleApproved = new Set(
                unitSubmissions.filter(s => s.cycleId === 'final' && s.statusId === 'approved').map(s => s.reportType)
            ).size;

            const isComplete = firstCycleApproved >= requiredFirst && finalCycleApproved >= requiredFinal;
            
            return {
                id: unit.id,
                name: unit.name,
                isComplete,
            };
        }).filter(unit => unit.isComplete);
        
        return {
            campusId: campus.id,
            campusName: campus.name,
            completedUnits: completedUnits
        };
    }).filter(campus => campus.completedUnits.length > 0);

  }, [allUnits, allCampuses, allSubmissions, isCampusSupervisor, userProfile, selectedYear]);


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

  if (completedSubmissionsByCampus.length === 0) {
    return null;
  }

  return (
    <Card className="border-green-200 bg-green-50/10 shadow-sm">
      <CardHeader className="bg-green-50/50 border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            Verified Compliant Units
        </CardTitle>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-green-600/70">
            Units with 100% <strong>Approved</strong> documents for {selectedYear}.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Accordion type="multiple" className="w-full" defaultValue={completedSubmissionsByCampus.map(c => c.campusId)}>
            {completedSubmissionsByCampus.map(campus => (
                 <AccordionItem value={campus.campusId} key={campus.campusId} className="border-none">
                    <AccordionTrigger className="font-bold hover:no-underline hover:bg-green-100/50 rounded-md px-2 py-3 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="text-xs uppercase tracking-tight">{campus.campusName}</span>
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 h-5 text-[9px] font-black">{campus.completedUnits.length} UNITS</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                         <List className="pl-2">
                          {campus.completedUnits.map(unit => (
                            <ListItem key={unit.id} className="flex justify-between items-center border-none p-2 hover:bg-green-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <Building className="h-3.5 w-3.5 text-green-600" />
                                <span className="text-xs font-bold text-slate-700">{unit.name}</span>
                              </div>
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            </ListItem>
                          ))}
                        </List>
                    </AccordionContent>
                 </AccordionItem>
            ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
