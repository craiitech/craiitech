
'use client';

import { useMemo } from 'react';
import type { AcademicProgram, Campus, Unit } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, School, Layers, Activity, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProgramRegistryProps {
  programs: AcademicProgram[];
  campuses: Campus[];
  units: Unit[];
  onEdit: (program: AcademicProgram) => void;
  canManage: boolean;
}

export function ProgramRegistry({ programs, campuses, units, onEdit, canManage }: ProgramRegistryProps) {
  const router = useRouter();
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed bg-muted/30">
        <Layers className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <p className="text-sm font-medium text-muted-foreground">No academic programs registered.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program Name</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead>College / Unit</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((program) => (
              <TableRow key={program.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{program.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{program.abbreviation} &bull; {program.level}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="flex items-center gap-2">
                    <School className="h-3 w-3 text-muted-foreground" />
                    {campusMap.get(program.campusId) || '...'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold leading-tight">{unitMap.get(program.collegeId) || 'Unknown Unit'}</span>
                    <Badge variant="outline" className="text-[9px] h-4 w-fit py-0 uppercase tracking-tighter opacity-60">{program.collegeId}</Badge>
                  </div>
                </TableCell>
                <TableCell>
                    {program.isBoardProgram ? (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 h-5 text-[9px] uppercase font-bold">
                            <ShieldCheck className="h-2 w-2" /> Board
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-muted-foreground gap-1 h-5 text-[9px] uppercase font-bold">
                            <ShieldAlert className="h-2 w-2" /> Non-Board
                        </Badge>
                    )}
                </TableCell>
                <TableCell>
                  {program.isActive ? (
                    <Badge className="bg-green-500 hover:bg-green-600 gap-1 h-5 text-[9px] uppercase tracking-tighter">
                      <Activity className="h-2 w-2" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="h-5 text-[9px] uppercase tracking-tighter">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(program)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => router.push(`/academic-programs/${program.id}`)}>
                    Compliance
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
