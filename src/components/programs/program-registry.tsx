'use client';

import { useMemo } from 'react';
import type { AcademicProgram, Campus, Unit, ProgramComplianceRecord } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, School, Layers, Activity, ShieldCheck, ShieldAlert, BookOpen, Trash2, Calendar, CheckCircle2, Clock, AlertTriangle, Hash, Check, X, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ProgramRegistryProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  onEdit: (program: AcademicProgram) => void;
  onDelete: (program: AcademicProgram) => void;
  canManage: boolean;
}

export function ProgramRegistry({ programs, compliances, campuses, units, onEdit, onDelete, canManage }: ProgramRegistryProps) {
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
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">There are no programs currently registered within your authorized scope.</p>
      </div>
    );
  }

  const isShowingActive = programs[0]?.isActive ?? true;

  return (
    <Card className="shadow-sm overflow-hidden border-primary/10">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase pl-6 py-4">Program Name & Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase py-4">Campus</TableHead>
              <TableHead className="text-[10px] font-black uppercase py-4">College / Unit</TableHead>
              <TableHead className="text-[10px] font-black uppercase py-4">Majors / Type</TableHead>
              
              {isShowingActive && (
                <>
                  <TableHead className="text-[10px] font-black uppercase py-4">Board Approval</TableHead>
                  <TableHead className="text-[10px] font-black uppercase py-4"># of Faculty (M/F (TOTAL))</TableHead>
                </>
              )}

              <TableHead className="text-[10px] font-black uppercase py-4">Date of COPC Award</TableHead>
              <TableHead className="text-[10px] font-black uppercase py-4">Next Visit (AACCUP)</TableHead>
              
              {!isShowingActive && (
                <TableHead className="text-[10px] font-black uppercase py-4">Board Referendum No.</TableHead>
              )}

              <TableHead className="text-[10px] font-black uppercase py-4">Status</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase pr-6 py-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((program) => {
              // Robust matching between program and its compliance record
              const record = compliances.find(c => String(c.programId).trim() === String(program.id).trim());
              
              const copcStatus = record?.ched?.copcStatus;
              const copcAwardDate = record?.ched?.copcAwardDate || 'N/A';
              
              // Logic for Board Approval across specializations
              const hasBoardApproval = !!(record?.ched?.boardApprovalLink || (record?.ched?.majorBoardApprovals && record.ched.majorBoardApprovals.length > 0 && record.ched.majorBoardApprovals.some(a => a.link)));

              let accLabel = '';
              let nextVisit = 'TBA';

              if (program.isNewProgram) {
                  accLabel = 'New Program Offering';
                  nextVisit = 'NEW PROGRAM';
              } else if (record?.accreditationRecords && record.accreditationRecords.length > 0) {
                  const milestones = record.accreditationRecords;
                  const current = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
                  accLabel = current?.level || 'Non-Accredited';
                  nextVisit = current?.statusValidityDate || 'TBA';
              } else {
                  accLabel = 'Non-Accredited';
                  nextVisit = 'TBA';
              }

              // Faculty Aggregation Logic
              const facultyStats = (() => {
                if (!record?.faculty) return { m: 0, f: 0, total: 0 };
                const { dean, associateDean, hasAssociateDean, programChair, members } = record.faculty;
                const roster = [];
                if (dean?.name) roster.push(dean);
                if (hasAssociateDean && associateDean?.name) roster.push(associateDean);
                if (programChair?.name) roster.push(programChair);
                if (members) roster.push(...members);

                const m = roster.filter(p => p.sex === 'Male').length;
                const f = roster.filter(p => p.sex === 'Female').length;
                return { m, f, total: m + f };
              })();

              return (
                <TableRow 
                    key={program.id} 
                    className={cn(
                        "transition-colors group",
                        program.isActive ? "hover:bg-muted/30" : "bg-slate-50/50 opacity-70 grayscale-[0.5] hover:bg-slate-100/50"
                    )}
                >
                  <TableCell className="pl-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold text-sm leading-tight", program.isActive ? "text-slate-900" : "text-slate-500")}>
                            {program.name}
                        </span>
                        {!program.isActive && (
                            <Badge variant="destructive" className="h-3.5 text-[7px] font-black px-1 uppercase tracking-tighter">CLOSED</Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{program.abbreviation} & bull; {program.level}</span>
                      
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {/* COPC Indicator */}
                          {copcStatus === 'With COPC' && (
                              <span className="text-[9px] font-black uppercase text-green-600">With COPC</span>
                          )}
                          {copcStatus === 'No COPC' && (
                              <span className="text-[9px] font-black uppercase text-red-600">No COPC</span>
                          )}
                          
                          {(copcStatus === 'With COPC' || copcStatus === 'No COPC') && (
                              <span className="text-[9px] text-muted-foreground opacity-30">|</span>
                          )}

                          {/* Accreditation Level or New Program flag */}
                          <span className={cn(
                              "text-[9px] font-black uppercase",
                              program.isNewProgram ? "text-amber-600" : "text-primary"
                          )}>
                              {accLabel}
                          </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <School className="h-3.5 w-3.5 text-primary opacity-40" />
                      <span className="text-xs font-medium">{campusMap.get(program.campusId) || '...'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-slate-700 leading-tight">{unitMap.get(program.collegeId) || 'Unknown Unit'}</span>
                      <Badge variant="outline" className="text-[8px] h-3.5 w-fit py-0 uppercase tracking-tighter opacity-60 font-mono border-muted-foreground/20">{program.collegeId}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
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
                                      <ShieldCheck className="h-2.5 w-2.5" /> Board
                                  </Badge>
                              ) : (
                                  <Badge variant="outline" className="text-muted-foreground gap-1 h-4 text-[8px] uppercase font-bold border-dashed px-1.5">
                                      <ShieldAlert className="h-2.5 w-2.5" /> Non-Board
                                  </Badge>
                              )}
                          </div>
                      </div>
                  </TableCell>

                  {isShowingActive && (
                    <>
                      <TableCell className="py-4">
                          {hasBoardApproval ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 h-5 text-[9px] font-black gap-1">
                                  <Check className="h-2.5 w-2.5" /> YES
                              </Badge>
                          ) : (
                              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 h-5 text-[9px] font-black gap-1">
                                  <X className="h-2.5 w-2.5" /> NO
                              </Badge>
                          )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-primary/40" />
                          <div className="flex flex-col">
                            <span className="text-xs font-black tabular-nums text-slate-800">
                              {facultyStats.m} / {facultyStats.f}
                            </span>
                            <span className="text-[10px] font-bold text-primary">({facultyStats.total} TOTAL)</span>
                          </div>
                        </div>
                      </TableCell>
                    </>
                  )}
                  
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1">
                        <span className={cn("text-xs font-black tabular-nums", copcAwardDate === 'N/A' ? "text-muted-foreground/40" : "text-emerald-600")}>
                            {copcAwardDate}
                        </span>
                        {copcStatus === 'With COPC' && <Badge variant="outline" className="h-3 text-[7px] font-black border-emerald-200 text-emerald-600 bg-emerald-50 w-fit">VERIFIED</Badge>}
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1">
                        <span className={cn(
                            "text-xs font-black tabular-nums uppercase",
                            nextVisit === 'NEW PROGRAM' ? "text-amber-600" : (nextVisit === 'TBA' ? "text-muted-foreground/40" : "text-primary")
                        )}>
                            {nextVisit}
                        </span>
                        {nextVisit !== 'TBA' && nextVisit !== 'NEW PROGRAM' && (
                            <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground uppercase">
                                <Clock className="h-2.5 w-2.5" /> Scheduled
                            </div>
                        )}
                    </div>
                  </TableCell>

                  {!isShowingActive && (
                    <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                            <Hash className="h-3 w-3 text-primary opacity-40" />
                            <span className="text-xs font-black font-mono text-slate-700">
                                {record?.ched?.closureReferendumNumber || '--'}
                            </span>
                        </div>
                    </TableCell>
                  )}

                  <TableCell className="py-4">
                    {program.isActive ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 gap-1 h-5 text-[9px] uppercase tracking-tighter font-black">
                        <Activity className="h-2.5 w-2.5" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1 h-5 text-[9px] uppercase tracking-tighter font-black">
                        <AlertTriangle className="h-2.5 w-2.5" /> Closed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap pr-6 py-4">
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="h-8 text-[10px] font-black uppercase tracking-widest bg-primary shadow-sm"
                      onClick={() => router.push(`/academic-programs/${program.id}`)}
                    >
                      Workspace
                    </Button>
                    {canManage && (
                      <div className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
