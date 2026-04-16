
'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, PlusCircle, Trash2, GraduationCap, BarChart3, Star, Calculator, Layers } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react';
import type { AcademicProgram } from '@/lib/types';

interface OutcomesModuleProps {
  canEdit: boolean;
  isBoardProgram?: boolean;
  program?: AcademicProgram;
}

const semesterOptions = [
  { value: '1st Semester', label: '1st Semester' },
  { value: '2nd Semester', label: '2nd Semester' },
  { value: 'Summer / Midyear', label: 'Summer / Midyear' },
];

export function OutcomesModule({ canEdit, isBoardProgram, program }: OutcomesModuleProps) {
  const { control, watch, setValue } = useFormContext();

  const { fields: gradFields, append: appendGrad, remove: removeGrad } = useFieldArray({
    control,
    name: "graduationRecords"
  });

  const { fields: tracerFields, append: appendTracer, remove: removeTracer } = useFieldArray({
    control,
    name: "tracerRecords"
  });

  const { fields: boardFields, append: appendBoard, remove: removeBoard } = useFieldArray({
    control,
    name: "boardPerformance"
  });

  const hasMajors = program?.hasSpecializations && (program?.specializations?.length || 0) > 0;

  // Sync graduation totals
  const watchGrads = watch("graduationRecords");
  useEffect(() => {
    if (!watchGrads || !Array.isArray(watchGrads)) return;
    watchGrads.forEach((item, index) => {
        const male = Number(item.maleCount) || 0;
        const female = Number(item.femaleCount) || 0;
        const total = male + female;
        if (item.count !== total) {
            setValue(`graduationRecords.${index}.count`, total);
        }
    });
  }, [watchGrads, setValue]);

  // Automatically calculate board exam percentages
  const watchBoard = watch("boardPerformance");
  useEffect(() => {
    if (!watchBoard || !Array.isArray(watchBoard)) return;

    watchBoard.forEach((item, index) => {
      const fTakers = Number(item.firstTakersCount) || 0;
      const fPassed = Number(item.firstTakersPassed) || 0;
      const rTakers = Number(item.retakersCount) || 0;
      const rPassed = Number(item.retakersPassed) || 0;

      const fRate = fTakers > 0 ? parseFloat(((fPassed / fTakers) * 100).toFixed(2)) : 0;
      const rRate = rTakers > 0 ? parseFloat(((rPassed / rTakers) * 100).toFixed(2)) : 0;
      const totalTakers = fTakers + rTakers;
      const totalPassed = fPassed + rPassed;
      const overallRate = totalTakers > 0 ? parseFloat(((totalPassed / totalTakers) * 100).toFixed(2)) : 0;

      if (item.firstTakersPassRate !== fRate) setValue(`boardPerformance.${index}.firstTakersPassRate`, fRate);
      if (item.retakersPassRate !== rRate) setValue(`boardPerformance.${index}.retakersPassRate`, rRate);
      if (item.overallPassRate !== overallRate) setValue(`boardPerformance.${index}.overallPassRate`, overallRate);
    });
  }, [watchBoard, setValue]);

  const MajorSelector = ({ name }: { name: string }) => (
    <FormField control={control} name={name} render={({ field }) => (
        <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit || !hasMajors}>
            <FormControl><SelectTrigger className="h-7 text-[9px] font-black uppercase bg-white border-primary/20"><SelectValue placeholder="General" /></SelectTrigger></FormControl>
            <SelectContent>
                <SelectItem value="General">General Program</SelectItem>
                {program?.specializations?.map(spec => <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>)}
            </SelectContent>
        </Select>
    )} />
  );

  return (
    <div className="space-y-8">
      {/* 1. Board Examination Performance */}
      {isBoardProgram && (
        <Card className="border-primary/20 shadow-sm overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-4 flex flex-row items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-primary text-sm font-black uppercase tracking-tight">
                <TrendingUp className="h-4 w-4" />
                Disaggregated Board Examination Registry
                </CardTitle>
                <CardDescription className="text-[10px]">Professional licensure results per specialization track.</CardDescription>
            </div>
            {canEdit && (
                <Button type="button" size="sm" onClick={() => appendBoard({ majorId: 'General', examDate: '', firstTakersCount: 0, firstTakersPassed: 0, firstTakersPassRate: 0, retakersCount: 0, retakersPassed: 0, retakersPassRate: 0, overallPassRate: 0, nationalPassingRate: 0 })} className="h-8 text-[10px] font-black uppercase">
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Exam
                </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow className="text-[9px] uppercase font-black text-muted-foreground">
                        <TableHead className="w-[120px] pl-6">Major / Track</TableHead>
                        <TableHead className="w-[120px]">Exam Period</TableHead>
                        <TableHead className="text-center">First Takers (P/T)</TableHead>
                        <TableHead className="text-center">Retakers (P/T)</TableHead>
                        <TableHead className="text-center">Passing %</TableHead>
                        {canEdit && <TableHead className="w-[40px] pr-6"></TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {boardFields.map((field, index) => (
                        <TableRow key={field.id} className="hover:bg-muted/30">
                            <TableCell className="pl-6"><MajorSelector name={`boardPerformance.${index}.majorId`} /></TableCell>
                            <TableCell>
                                <FormField control={control} name={`boardPerformance.${index}.examDate`} render={({ field }) => (
                                    <FormControl><Input {...field} placeholder="e.g. Sept 2024" className="h-8 text-[10px] font-bold" disabled={!canEdit} /></FormControl>
                                )} />
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1 justify-center">
                                    <FormField control={control} name={`boardPerformance.${index}.firstTakersPassed`} render={({ field }) => (
                                        <FormControl><Input type="number" {...field} className="h-7 w-12 text-center text-[10px]" disabled={!canEdit} /></FormControl>
                                    )} />
                                    <span className="text-[10px] opacity-20">/</span>
                                    <FormField control={control} name={`boardPerformance.${index}.firstTakersCount`} render={({ field }) => (
                                        <FormControl><Input type="number" {...field} className="h-7 w-12 text-center text-[10px]" disabled={!canEdit} /></FormControl>
                                    )} />
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1 justify-center">
                                    <FormField control={control} name={`boardPerformance.${index}.retakersPassed`} render={({ field }) => (
                                        <FormControl><Input type="number" {...field} className="h-7 w-12 text-center text-[10px]" disabled={!canEdit} /></FormControl>
                                    )} />
                                    <span className="text-[10px] opacity-20">/</span>
                                    <FormField control={control} name={`boardPerformance.${index}.retakersCount`} render={({ field }) => (
                                        <FormControl><Input type="number" {...field} className="h-7 w-12 text-center text-[10px]" disabled={!canEdit} /></FormControl>
                                    )} />
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant="secondary" className="h-6 text-[10px] font-black tabular-nums bg-primary/5 text-primary border-none">
                                    {watchBoard?.[index]?.overallPassRate || 0}%
                                </Badge>
                            </TableCell>
                            {canEdit && (
                                <TableCell className="pr-6">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeBoard(index)} className="h-7 w-7 text-destructive opacity-20 hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                    {boardFields.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-[10px] font-bold text-muted-foreground uppercase opacity-20 italic">No board exam records encoded.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 2. Graduation Registry */}
      <Card className="shadow-sm border-primary/10 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b py-4 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-slate-900">
              <GraduationCap className="h-4 w-4 text-primary" />
              Major-Disaggregated Graduation Registry
            </CardTitle>
            <CardDescription className="text-[10px]">Track degree completion per specialization.</CardDescription>
          </div>
          {canEdit && (
            <Button type="button" size="sm" onClick={() => appendGrad({ majorId: 'General', year: new Date().getFullYear(), semester: '1st Semester', maleCount: 0, femaleCount: 0, count: 0 })} className="h-8 text-[10px] font-black uppercase">
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Record
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[9px] font-black uppercase text-muted-foreground">
                <TableHead className="w-[150px] pl-6">Associated Major</TableHead>
                <TableHead className="w-[180px]">Year / Semester</TableHead>
                <TableHead className="text-center">Male</TableHead>
                <TableHead className="text-center">Female</TableHead>
                <TableHead className="text-center">Total Output</TableHead>
                {canEdit && <TableHead className="w-[50px] pr-6"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {gradFields.map((field, index) => (
                <TableRow key={field.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6"><MajorSelector name={`graduationRecords.${index}.majorId`} /></TableCell>
                  <TableCell>
                    <div className="grid grid-cols-2 gap-1">
                        <FormField control={control} name={`graduationRecords.${index}.year`} render={({ field }) => (
                        <FormControl><Input type="number" {...field} className="h-8 text-[11px] font-bold" disabled={!canEdit} /></FormControl>
                        )} />
                        <FormField control={control} name={`graduationRecords.${index}.semester`} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                            <FormControl><SelectTrigger className="h-8 text-[9px] font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{semesterOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                        )} />
                    </div>
                  </TableCell>
                  <TableCell><FormField control={control} name={`graduationRecords.${index}.maleCount`} render={({ field }) => (<FormControl><Input type="number" {...field} className="h-8 text-xs text-center" disabled={!canEdit} /></FormControl>)} /></TableCell>
                  <TableCell><FormField control={control} name={`graduationRecords.${index}.femaleCount`} render={({ field }) => (<FormControl><Input type="number" {...field} className="h-8 text-xs text-center" disabled={!canEdit} /></FormControl>)} /></TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="h-6 px-4 text-[10px] font-black tabular-nums bg-white border-primary/20 text-primary">
                        {watchGrads?.[index]?.count || 0}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="pr-6 text-right">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeGrad(index)} className="h-7 w-7 text-destructive opacity-20 hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. Tracer Registry */}
      <Card className="shadow-sm border-primary/10 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b py-4 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-slate-900">
              <BarChart3 className="h-4 w-4 text-primary" />
              Disaggregated Tracer Study Log
            </CardTitle>
            <CardDescription className="text-[10px]">Employment statistics disaggregated by sex and major.</CardDescription>
          </div>
          {canEdit && (
            <Button type="button" size="sm" onClick={() => appendTracer({ majorId: 'General', year: new Date().getFullYear(), semester: '1st Semester', totalGraduates: 0, tracedCount: 0, employmentRate: 0, maleTraced: 0, femaleTraced: 0, maleEmployed: 0, femaleEmployed: 0 })} className="h-8 text-[10px] font-black uppercase">
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Tracer Record
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[9px] font-black uppercase text-muted-foreground">
                <TableHead className="w-[120px] pl-6">Associated Major</TableHead>
                <TableHead className="w-[150px]">Period</TableHead>
                <TableHead className="text-center">Traced (M/F)</TableHead>
                <TableHead className="text-center">Employed (M/F)</TableHead>
                <TableHead className="w-[100px] text-right pr-6">Employment %</TableHead>
                {canEdit && <TableHead className="w-[40px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracerFields.map((field, index) => {
                const rate = Number(watch(`tracerRecords.${index}.employmentRate`)) || 0;
                return (
                  <TableRow key={field.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6"><MajorSelector name={`tracerRecords.${index}.majorId`} /></TableCell>
                    <TableCell>
                      <div className="grid grid-cols-2 gap-1">
                        <FormField control={control} name={`tracerRecords.${index}.year`} render={({ field }) => (
                          <FormControl><Input type="number" {...field} className="h-8 text-[11px] font-bold" disabled={!canEdit} /></FormControl>
                        )} />
                        <FormField control={control} name={`tracerRecords.${index}.semester`} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                            <FormControl><SelectTrigger className="h-8 text-[9px] font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{semesterOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                          </Select>
                        )} />
                      </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex gap-1 justify-center">
                            <FormField control={control} name={`tracerRecords.${index}.maleTraced`} render={({ field }) => (<FormControl><Input type="number" {...field} className="h-7 w-12 text-center text-[10px]" disabled={!canEdit} /></FormControl>)} />
                            <FormField control={control} name={`tracerRecords.${index}.femaleTraced`} render={({ field }) => (<FormControl><Input type="number" {...field} className="h-7 w-12 text-center text-[10px]" disabled={!canEdit} /></FormControl>)} />
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex gap-1 justify-center">
                            <FormField control={control} name={`tracerRecords.${index}.maleEmployed`} render={({ field }) => (<FormControl><Input type="number" {...field} className="h-7 w-12 text-center text-[10px]" disabled={!canEdit} /></FormControl>)} />
                            <FormField control={control} name={`tracerRecords.${index}.femaleEmployed`} render={({ field }) => (<FormControl><Input type="number" {...field} className="h-7 w-12 text-center text-[10px]" disabled={!canEdit} /></FormControl>)} />
                        </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="space-y-1">
                        <FormField control={control} name={`tracerRecords.${index}.employmentRate`} render={({ field }) => (
                          <FormControl><Input type="number" step="0.01" {...field} className="h-7 text-[10px] font-black text-right text-emerald-600 border-none bg-transparent" disabled={!canEdit} /></FormControl>
                        )} />
                        <Progress value={rate} className="h-1 bg-muted" />
                      </div>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="pr-4">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTracer(index)} className="h-7 w-7 text-destructive opacity-20 hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
