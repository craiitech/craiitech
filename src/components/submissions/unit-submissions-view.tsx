
'use client';

import { useState, useMemo } from 'react';
import type { Submission, Unit, User as AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Building, Eye } from 'lucide-react';
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

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline'
};

const getYearCycleRowColor = (year: number, cycle: string) => {
  const isFinal = cycle.toLowerCase() === 'final';
  const colors: Record<number, { first: string, final: string }> = {
    2024: { 
      first: 'bg-blue-50/20 hover:bg-blue-100/40 dark:bg-blue-900/5 dark:hover:bg-blue-900/10', 
      final: 'bg-blue-100/40 hover:bg-blue-200/50 dark:bg-blue-900/20 dark:hover:bg-blue-900/30' 
    },
    2025: { 
      first: 'bg-green-50/20 hover:bg-green-100/40 dark:bg-green-900/5 dark:hover:bg-green-900/10', 
      final: 'bg-green-100/40 hover:bg-green-200/50 dark:bg-green-900/20 dark:hover:bg-green-900/30' 
    },
    2026: { 
      first: 'bg-amber-50/20 hover:bg-amber-100/40 dark:bg-amber-900/5 dark:hover:bg-amber-900/10', 
      final: 'bg-amber-100/40 hover:bg-amber-200/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/30' 
    },
    2027: { 
      first: 'bg-purple-50/20 hover:bg-purple-100/40 dark:bg-purple-900/5 dark:hover:bg-purple-900/10', 
      final: 'bg-purple-100/40 hover:bg-purple-200/50 dark:bg-purple-900/20 dark:hover:bg-purple-900/30' 
    },
    2028: { 
      first: 'bg-rose-50/20 hover:bg-rose-100/40 dark:bg-rose-900/5 dark:hover:bg-rose-900/10', 
      final: 'bg-rose-100/40 hover:bg-rose-200/50 dark:bg-rose-900/20 dark:hover:bg-rose-900/30' 
    },
  };
  
  const yearColor = colors[year] || { 
    first: 'bg-slate-50/20 hover:bg-slate-100/40 dark:bg-slate-900/5 dark:hover:bg-slate-900/10', 
    final: 'bg-slate-100/40 hover:bg-slate-200/50 dark:bg-slate-900/20 dark:hover:bg-slate-900/30' 
  };
  
  return isFinal ? yearColor.final : yearColor.first;
};


interface UnitSubmissionsViewProps {
  allSubmissions: Submission[] | null;
  allUnits: Unit[] | null;
  userProfile: AppUser | null;
  isLoading: boolean;
}

export function UnitSubmissionsView({
  allSubmissions,
  allUnits,
  userProfile,
  isLoading,
}: UnitSubmissionsViewProps) {
  const router = useRouter();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const unitsWithSubmissions = useMemo(() => {
    if (!allUnits || !allSubmissions || !userProfile?.campusId) {
      return [];
    }
    const campusUnits = allUnits.filter(u => u.campusIds?.includes(userProfile.campusId));
    const submittedUnitIds = new Set(allSubmissions.map(s => s.unitId));
    return campusUnits
        .filter(unit => submittedUnitIds.has(unit.id))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUnits, allSubmissions, userProfile]);

  const selectedUnitSubmissions = useMemo(() => {
    if (!selectedUnitId || !allSubmissions || !userProfile?.campusId) {
      return { firstCycle: [], finalCycle: [] };
    }
    const unitSubmissions = allSubmissions.filter(s => 
        s.unitId === selectedUnitId && s.campusId === userProfile.campusId
    );
    return {
        firstCycle: unitSubmissions.filter(s => s.cycleId === 'first'),
        finalCycle: unitSubmissions.filter(s => s.cycleId === 'final'),
    }
  }, [selectedUnitId, allSubmissions, userProfile]);
  
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
        <CardTitle>Submissions by Unit</CardTitle>
        <CardDescription>
          Select a unit from the list to view all of their submissions for the current year in your campus.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <ScrollArea className="h-[60vh] rounded-md border">
                 {unitsWithSubmissions.length > 0 ? (
                    <div className="p-2">
                        {unitsWithSubmissions.map(unit => (
                        <Button
                            key={unit.id}
                            variant="ghost"
                            onClick={() => handleUnitSelect(unit.id)}
                            className={cn(
                                "w-full justify-start text-left h-auto p-3",
                                selectedUnitId === unit.id && "bg-muted"
                            )}
                        >
                            <Building className="mr-3 h-4 w-4 flex-shrink-0" />
                            <span>{unit.name}</span>
                        </Button>
                    ))}
                    </div>
                 ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-4">
                        No units in your campus have submitted documents yet.
                    </div>
                 )}
            </ScrollArea>
          </div>

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
                        Select a unit from the left to see their submissions.
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
                    <TableRow 
                      key={sub.id}
                      className={cn("transition-colors", getYearCycleRowColor(sub.year, sub.cycleId))}
                    >
                        <TableCell className="font-medium">{sub.reportType}</TableCell>
                        <TableCell>{format(sub.submissionDate, 'PP')}</TableCell>
                        <TableCell>
                            <Badge variant={statusVariant[sub.statusId]} className="bg-background/50">{sub.statusId}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                             <Button variant="outline" size="sm" onClick={() => onEyeClick(sub.id)} className="bg-background/50">
                                <Eye className="mr-2 h-4 w-4" /> View Submission
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
