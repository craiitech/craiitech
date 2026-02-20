
'use client';

import { useMemo } from 'react';
import type { AcademicProgram, Campus, Unit } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, School, Layers, Activity, ShieldCheck, ShieldAlert, BookOpen, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProgramRegistryProps {
  programs: AcademicProgram[];
  campuses: Campus[];
  units: Unit[];
  onEdit: (program: AcademicProgram) => void;
  onDelete: (program: AcademicProgram) => void;
  canManage: boolean;
}

export function ProgramRegistry({ programs, campuses, units, onEdit, onDelete, canManage }: ProgramRegistryProps) {
  const router = useRouter();
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed bg-muted/30 p-8 text-center">
        <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground opacity-40" />
        </div>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">No Programs Found</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">There are no academic programs currently registered within your authorized scope.</p>
      </div>
    );
  }

  return (
    <Card className="shadow-sm overflow-hidden border-primary/10">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Program Name</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead>College / Unit</TableHead>
              <TableHead>Majors / Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((program) => (
              <TableRow key={program.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-slate-900">{program.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{program.abbreviation} &bull; {program.level}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="flex items-center gap-2">
                    <School className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{campusMap.get(program.campusId) || '...'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-slate-700 leading-tight">{unitMap.get(program.collegeId) || 'Unknown Unit'}</span>
                    <Badge variant="outline" className="text-[8px] h-3.5 w-fit py-0 uppercase tracking-tighter opacity-60 font-mono border-muted-foreground/20">{program.collegeId}</Badge>
                  </div>
                </TableCell>
                <TableCell>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap gap-1">
                            {program.hasSpecializations ? (
                                program.specializations?.map(spec => (
                                    <Badge key={spec.id} variant="secondary" className="text-[8px] h-3.5 bg-blue-50 text-blue-700 border-blue-100 font-bold">{spec.name}</Badge>
                                ))
                            ) : (
                                <Badge variant="outline" className="text-[8px] h-3.5 text-muted-foreground font-medium">Standard</Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {program.isBoardProgram ? (
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200 gap-1 h-4 text-[8px] uppercase font-black px-1.5">
                                    <ShieldCheck className="h-2 w-2" /> Board
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-muted-foreground gap-1 h-4 text-[8px] uppercase font-bold border-dashed px-1.5">
                                    <ShieldAlert className="h-2 w-2" /> Non-Board
                                </Badge>
                            )}
                        </div>
                    </div>
                </TableCell>
                <TableCell>
                  {program.isActive ? (
                    <Badge className="bg-green-600 hover:bg-green-700 gap-1 h-5 text-[9px] uppercase tracking-tighter font-black">
                      <Activity className="h-2.5 w-2.5" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="h-5 text-[9px] uppercase tracking-tighter font-black bg-slate-200">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                  <Button 
                    size="sm" 
                    variant="default" 
                    className="h-8 text-[10px] font-black uppercase tracking-widest bg-primary shadow-sm"
                    onClick={() => router.push(`/academic-programs/${program.id}`)}
                  >
                    Compliance Workspace
                  </Button>
                  {canManage && (
                    <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5" onClick={() => onEdit(program)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={() => onDelete(program)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
