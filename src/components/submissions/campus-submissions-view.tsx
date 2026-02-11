
'use client';

import { useState, useMemo } from 'react';
import type { Submission, Unit, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Building, Eye, School } from 'lucide-react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline'
};


interface CampusSubmissionsViewProps {
  allSubmissions: Submission[] | null;
  allCampuses: Campus[] | null;
  allUnits: Unit[] | null;
  isLoading: boolean;
}

export function CampusSubmissionsView({
  allSubmissions,
  allCampuses,
  allUnits,
  isLoading,
}: CampusSubmissionsViewProps) {
  const router = useRouter();
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const campusesWithSubmissions = useMemo(() => {
    if (!allCampuses || !allSubmissions) return [];
    const submittedCampusIds = new Set(allSubmissions.map(s => s.campusId));
    return allCampuses
        .filter(campus => submittedCampusIds.has(campus.id))
        .sort((a,b) => a.name.localeCompare(b.name));
  }, [allCampuses, allSubmissions]);
  
  const unitsInSelectedCampus = useMemo(() => {
    if (!selectedCampusId || !allUnits || !allSubmissions) return [];

    const unitsForCampus = allUnits.filter(unit =>
        unit.campusIds?.includes(selectedCampusId)
    );

    const submittedUnitIds = new Set(allSubmissions.map(s => s.unitId));

    return unitsForCampus
        .filter(unit => submittedUnitIds.has(unit.id))
        .sort((a, b) => a.name.localeCompare(b.name));

  }, [selectedCampusId, allUnits, allSubmissions]);


  const selectedUnitSubmissions = useMemo(() => {
    if (!selectedUnitId || !selectedCampusId || !allSubmissions) {
      return { firstCycle: [], finalCycle: [] };
    }
    const unitSubmissions = allSubmissions.filter(s => 
        s.unitId === selectedUnitId && s.campusId === selectedCampusId
    );
    return {
        firstCycle: unitSubmissions.filter(s => s.cycleId === 'first'),
        finalCycle: unitSubmissions.filter(s => s.cycleId === 'final'),
    }
  }, [selectedUnitId, selectedCampusId, allSubmissions]);
  
  const handleCampusSelect = (campusId: string) => {
    setSelectedCampusId(prev => (prev === campusId ? null : campusId));
    setSelectedUnitId(null);
  }
  
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
    <Card>
      <CardHeader>
        <CardTitle>Submissions by Campus</CardTitle>
        <CardDescription>
          Select a campus, then a unit, to view their submissions for the current year.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <ScrollArea className="h-[60vh] rounded-md border">
                 {campusesWithSubmissions.length > 0 ? (
                    <Accordion type="single" collapsible value={selectedCampusId || ''} onValueChange={handleCampusSelect}>
                        {campusesWithSubmissions.map(campus => (
                            <AccordionItem value={campus.id} key={campus.id}>
                                <AccordionTrigger 
                                    className="p-3 hover:no-underline hover:bg-muted/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <School className="mr-3 h-4 w-4 flex-shrink-0" />
                                        <span className="font-medium">{campus.name}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-0">
                                    <div className="pl-4">
                                    {unitsInSelectedCampus.map(unit => (
                                        <Button
                                            key={unit.id}
                                            variant="ghost"
                                            onClick={() => handleUnitSelect(unit.id)}
                                            className={cn(
                                                "w-full justify-start text-left h-auto p-3",
                                                selectedUnitId === unit.id && "bg-muted font-semibold"
                                            )}
                                        >
                                            <Building className="mr-3 h-4 w-4 flex-shrink-0" />
                                            <span>{unit.name}</span>
                                        </Button>
                                    ))}
                                    {selectedCampusId === campus.id && unitsInSelectedCampus.length === 0 && (
                                        <div className="p-3 text-xs text-muted-foreground">No units with submissions in this campus.</div>
                                    )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                 ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-4">
                        No campuses have submitted documents yet.
                    </div>
                 )}
            </ScrollArea>
          </div>

          <div className="md:col-span-2">
            <ScrollArea className="h-[60vh]">
                {selectedUnitId ? (
                    <div className="space-y-6">
                        <div className="font-semibold text-lg">
                            Submissions for: {allUnits?.find(u => u.id === selectedUnitId)?.name}
                        </div>
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
                        Select a campus and a unit from the left to see their submissions.
                    </div>
                )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
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
                             <Button variant="outline" size="sm" onClick={() => onEyeClick(sub.id)}>
                                <Eye className="mr-2 h-4 w-4" /> View Submission
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
