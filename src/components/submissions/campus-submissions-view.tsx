
'use client';

import { useState, useMemo } from 'react';
import type { Submission, Unit, Campus } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Building, Eye, School, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline'
};


interface CampusSubmissionsViewProps {
  allSubmissions: Submission[] | null;
  allUnits: Unit[] | null;
  allCampuses: Campus[] | null;
  isLoading: boolean;
}

export function CampusSubmissionsView({
  allSubmissions,
  allUnits,
  allCampuses,
  isLoading,
}: CampusSubmissionsViewProps) {
  const router = useRouter();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const campusesWithSubmissions = useMemo(() => {
    if (!allCampuses || !allUnits || !allSubmissions) {
      return [];
    }
    const submittedUnitIds = new Set(allSubmissions.map(s => s.unitId));
    
    return allCampuses.map(campus => {
        const unitsInCampus = allUnits.filter(u => u.campusIds?.includes(campus.id));
        const unitsWithSubmissions = unitsInCampus.filter(u => submittedUnitIds.has(u.id));
        return {
            ...campus,
            units: unitsWithSubmissions.sort((a, b) => a.name.localeCompare(b.name))
        }
    }).filter(campus => campus.units.length > 0);

  }, [allCampuses, allUnits, allSubmissions]);

  const selectedUnitSubmissions = useMemo(() => {
    if (!selectedUnitId || !allSubmissions) {
      return { firstCycle: [], finalCycle: [] };
    }
    const unitSubmissions = allSubmissions.filter(s => s.unitId === selectedUnitId);
    return {
        firstCycle: unitSubmissions.filter(s => s.cycleId === 'first'),
        finalCycle: unitSubmissions.filter(s => s.cycleId === 'final'),
    }
  }, [selectedUnitId, allSubmissions]);
  
  const handleUnitSelect = (unitId: string) => {
    setSelectedUnitId(unitId);
  }

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Column: Campus/Units List */}
      <div className="md:col-span-1">
        <ScrollArea className="h-[60vh] rounded-md border">
             {campusesWithSubmissions.length > 0 ? (
                <Accordion type="multiple" className="w-full">
                  {campusesWithSubmissions.map(campus => (
                    <AccordionItem value={campus.id} key={campus.id}>
                      <AccordionTrigger className="px-3 py-3 font-medium hover:no-underline">
                         <div className="flex items-center gap-3">
                            <School className="h-4 w-4 text-muted-foreground" />
                            <span>{campus.name}</span>
                         </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-1">
                        <div className="flex flex-col items-start px-2">
                            {campus.units.map(unit => (
                                <Button
                                    key={unit.id}
                                    variant="ghost"
                                    onClick={() => handleUnitSelect(unit.id)}
                                    className={cn(
                                        "w-full justify-start text-left h-auto py-2 pl-6",
                                        selectedUnitId === unit.id && "bg-muted"
                                    )}
                                >
                                    <Building className="mr-3 h-4 w-4 flex-shrink-0" />
                                    <span>{unit.name}</span>
                                </Button>
                            ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
             ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-4">
                    No campuses have any unit submissions yet.
                </div>
             )}
        </ScrollArea>
      </div>

      {/* Right Column: Submissions from Selected Unit */}
      <div className="md:col-span-2">
        <ScrollArea className="h-[60vh]">
            {selectedUnitId ? (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">First Cycle Submissions</h3>
                         <SubmissionTableForCycle submissions={selectedUnitSubmissions.firstCycle} onEyeClick={(id) => router.push(`/submissions/${id}`)} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Final Cycle Submissions</h3>
                         <SubmissionTableForCycle submissions={selectedUnitSubmissions.finalCycle} onEyeClick={(id) => router.push(`/submissions/${id}`)} />
                    </div>
                </div>
            ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Select a unit from a campus to see their submissions.
                </div>
            )}
        </ScrollArea>
      </div>
    </div>
  );
}


function SubmissionTableForCycle({ submissions, onEyeClick }: { submissions: Submission[], onEyeClick: (id: string) => void }) {
    if (submissions.length === 0) {
        return <p className="text-sm text-muted-foreground">No submissions for this cycle.</p>;
    }
    return (
         <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {submissions.map(sub => (
                    <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.reportType}</TableCell>
                        <TableCell>{format(sub.submissionDate, 'PP')}</TableCell>
                        <TableCell>
                            <Badge variant={statusVariant[sub.statusId]}>{sub.statusId}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                             <Button variant="ghost" size="icon" onClick={() => onEyeClick(sub.id)}>
                                <Eye className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
