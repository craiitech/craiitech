
'use client';

/**
 * @fileOverview A component for batch data entry of program metrics.
 */

import { useState, useMemo } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Users, 
    GraduationCap, 
    TrendingUp, 
    BarChart3, 
    Edit, 
    Check, 
    Activity, 
    Info, 
    ShieldCheck, 
    ChevronRight,
    ArrowUpRight,
    Calculator,
    School,
    Building2,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BatchEntryDialog } from './batch-entry-dialog';

interface BatchDataHubProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
  isLoading: boolean;
  canEdit: boolean;
}

type DataMode = 'enrollment' | 'graduation' | 'board' | 'tracer';

export function BatchDataHub({ programs, compliances, campuses, units, selectedYear, isLoading, canEdit }: BatchDataHubProps) {
  const [dataMode, setDataMode] = useState<DataMode>('enrollment');
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);

  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  const activePrograms = useMemo(() => programs.filter(p => p.isActive), [programs]);

  const stats = useMemo(() => {
    return activePrograms.map(p => {
        const record = compliances.find(c => c.programId === p.id);
        
        // Enrollment summary
        const sumEnrollment = (term: any) => {
            if (!term) return 0;
            return Object.values(term).reduce((acc: number, level: any) => acc + (Number(level?.total) || 0), 0);
        };
        const sem1 = sumEnrollment(record?.stats?.enrollment?.firstSemester);
        const sem2 = sumEnrollment(record?.stats?.enrollment?.secondSemester);

        // Outcomes summary
        const grads = record?.graduationRecords?.reduce((acc, r) => acc + (r.count || 0), 0) || 0;
        const tracerCount = record?.tracerRecords?.length || 0;
        const latestBoard = record?.boardPerformance?.[record.boardPerformance.length - 1]?.overallPassRate || 0;

        return {
            id: p.id,
            name: p.name,
            abbreviation: p.abbreviation,
            campus: campusMap.get(p.campusId) || '...',
            sem1,
            sem2,
            grads,
            tracerCount,
            latestBoard,
            hasRecord: !!record
        };
    });
  }, [activePrograms, compliances, campusMap]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex bg-muted p-1 rounded-lg border shadow-sm w-full md:w-auto overflow-x-auto">
            <Button 
                variant={dataMode === 'enrollment' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDataMode('enrollment')}
                className="h-8 text-[10px] font-black uppercase px-4"
            >
                <Users className="h-3.5 w-3.5 mr-1.5" /> Enrollment
            </Button>
            <Button 
                variant={dataMode === 'graduation' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDataMode('graduation')}
                className="h-8 text-[10px] font-black uppercase px-4"
            >
                <GraduationCap className="h-3.5 w-3.5 mr-1.5" /> Graduation
            </Button>
            <Button 
                variant={dataMode === 'board' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDataMode('board')}
                className="h-8 text-[10px] font-black uppercase px-4"
            >
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Board Exam
            </Button>
            <Button 
                variant={dataMode === 'tracer' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDataMode('tracer')}
                className="h-8 text-[10px] font-black uppercase px-4"
            >
                <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Tracer Study
            </Button>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
            <Info className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-tighter">
                Context: AY {selectedYear} Registry
            </span>
        </div>
      </div>

      <Card className="shadow-lg border-primary/10 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {dataMode === 'enrollment' && <Users className="h-5 w-5 text-primary" />}
                    {dataMode === 'graduation' && <GraduationCap className="h-5 w-5 text-primary" />}
                    {dataMode === 'board' && <TrendingUp className="h-5 w-5 text-primary" />}
                    {dataMode === 'tracer' && <BarChart3 className="h-5 w-5 text-primary" />}
                    <CardTitle className="text-sm font-black uppercase tracking-tight">
                        Batch Data Entry: {dataMode.toUpperCase()}
                    </CardTitle>
                </div>
                <Badge variant="secondary" className="h-5 text-[9px] font-black uppercase bg-primary/5 text-primary border-none">
                    {activePrograms.length} ACTIVE PROGRAMS
                </Badge>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Academic Offering</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Campus Site</TableHead>
                            
                            {dataMode === 'enrollment' && (
                                <>
                                    <TableHead className="text-center text-[10px] font-black uppercase">1st Sem Total</TableHead>
                                    <TableHead className="text-center text-[10px] font-black uppercase">2nd Sem Total</TableHead>
                                </>
                            )}

                            {dataMode === 'graduation' && (
                                <TableHead className="text-center text-[10px] font-black uppercase">Total Grads</TableHead>
                            )}

                            {dataMode === 'board' && (
                                <TableHead className="text-center text-[10px] font-black uppercase">Latest Pass Rate</TableHead>
                            )}

                            {dataMode === 'tracer' && (
                                <TableHead className="text-center text-[10px] font-black uppercase">Employment Data</TableHead>
                            )}

                            <TableHead className="text-center text-[10px] font-black uppercase">Record Status</TableHead>
                            <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.map(stat => (
                            <TableRow key={stat.id} className="hover:bg-muted/20 transition-colors group">
                                <TableCell className="pl-8 py-5">
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm text-slate-900 group-hover:text-primary transition-colors">{stat.name}</span>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{stat.abbreviation}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs font-bold text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <School className="h-3.5 w-3.5 opacity-30" />
                                        {stat.campus}
                                    </div>
                                </TableCell>

                                {dataMode === 'enrollment' && (
                                    <>
                                        <TableCell className="text-center font-black tabular-nums text-slate-700">{stat.sem1 || '--'}</TableCell>
                                        <TableCell className="text-center font-black tabular-nums text-slate-700">{stat.sem2 || '--'}</TableCell>
                                    </>
                                )}

                                {dataMode === 'graduation' && (
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="font-black tabular-nums bg-emerald-50 text-emerald-700 border-emerald-100">{stat.grads} GRADS</Badge>
                                    </TableCell>
                                )}

                                {dataMode === 'board' && (
                                    <TableCell className="text-center">
                                        <span className={cn("font-black tabular-nums", stat.latestBoard >= 70 ? "text-emerald-600" : "text-slate-700")}>
                                            {stat.latestBoard ? `${stat.latestBoard}%` : '--'}
                                        </span>
                                    </TableCell>
                                )}

                                {dataMode === 'tracer' && (
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="text-[9px] font-black">{stat.tracerCount} RECORDS</Badge>
                                    </TableCell>
                                )}

                                <TableCell className="text-center">
                                    {stat.hasRecord ? (
                                        <Badge variant="secondary" className="h-5 text-[8px] font-black uppercase bg-emerald-100 text-emerald-700 border-none">
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> VERIFIED
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-rose-600 border-rose-200 bg-rose-50">
                                            NO LOG FOUND
                                        </Badge>
                                    )}
                                </TableCell>

                                <TableCell className="text-right pr-8">
                                    <Button 
                                        size="sm" 
                                        variant="default" 
                                        className="h-8 text-[9px] font-black uppercase tracking-widest bg-primary shadow-sm px-4"
                                        onClick={() => setActiveProgramId(stat.id)}
                                        disabled={!canEdit}
                                    >
                                        <Edit className="h-3.5 w-3.5 mr-1.5" /> {stat.hasRecord ? 'Update' : 'Start Log'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
        <CardFooter className="bg-muted/5 border-t py-3 px-8">
            <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[9px] text-muted-foreground italic leading-tight">
                    <strong>Administrative Accelerator:</strong> This view is designed for rapid institutional data collection. Use the sub-tabs to switch between modules and the "Update" button to access a focused entry wizard for the Academic Year {selectedYear}.
                </p>
            </div>
        </CardFooter>
      </Card>

      <BatchEntryDialog 
        isOpen={!!activeProgramId}
        onOpenChange={(open) => !open && setActiveProgramId(null)}
        program={programs.find(p => p.id === activeProgramId) || null}
        mode={dataMode}
        selectedYear={selectedYear}
      />
    </div>
  );
}
