'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, PlusCircle, Trash2, GraduationCap, BarChart3, Star, Calculator } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react';

interface OutcomesModuleProps {
  canEdit: boolean;
  isBoardProgram?: boolean;
}

const semesterOptions = [
  { value: '1st Semester', label: '1st Semester' },
  { value: '2nd Semester', label: '2nd Semester' },
  { value: 'Summer / Midyear', label: 'Summer / Midyear' },
];

export function OutcomesModule({ canEdit, isBoardProgram }: OutcomesModuleProps) {
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

  // Automatically calculate board exam percentages when taker/passer counts change
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

  return (
    <div className="space-y-8">
      {/* 1. Board Examination Performance (Conditional & Dynamic) */}
      {isBoardProgram && (
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="bg-primary/5 border-b py-4 flex flex-row items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-primary">
                <TrendingUp className="h-5 w-5" />
                Board Examination Performance Registry
                </CardTitle>
                <CardDescription>Professional licensure results with automatic calculations.</CardDescription>
            </div>
            {canEdit && (
                <Button 
                    type="button" 
                    size="sm" 
                    onClick={() => appendBoard({
                        examDate: '',
                        firstTakersCount: 0,
                        firstTakersPassed: 0,
                        firstTakersPassRate: 0,
                        retakersCount: 0,
                        retakersPassed: 0,
                        retakersPassRate: 0,
                        overallPassRate: 0,
                        nationalPassingRate: 0
                    })}
                    className="h-8 gap-1"
                >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Add Exam
                </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
                <TableHeader>
                    <TableRow className="text-[10px] uppercase font-bold text-muted-foreground bg-muted/20">
                        <TableHead className="w-[150px]">Date/Period</TableHead>
                        <TableHead className="text-center">First Takers (Pass/Total)</TableHead>
                        <TableHead className="text-center">Retakers (Pass/Total)</TableHead>
                        <TableHead className="text-center">School %</TableHead>
                        <TableHead className="text-center">National %</TableHead>
                        {canEdit && <TableHead className="w-[40px]"></TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {boardFields.map((field, index) => (
                        <TableRow key={field.id} className="hover:bg-muted/30">
                            <TableCell>
                                <FormField control={control} name={`boardPerformance.${index}.examDate`} render={({ field }) => (
                                    <FormControl><Input {...field} placeholder="e.g. Sept 2024" className="h-8 text-xs font-bold" disabled={!canEdit} /></FormControl>
                                )} />
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1 justify-center">
                                    <FormField control={control} name={`boardPerformance.${index}.firstTakersPassed`} render={({ field }) => (
                                        <FormControl><Input type="number" {...field} className="h-8 w-16 text-center text-xs" title="Passed" disabled={!canEdit} /></FormControl>
                                    )} />
                                    <span className="text-xs text-muted-foreground">/</span>
                                    <FormField control={control} name={`boardPerformance.${index}.firstTakersCount`} render={({ field }) => (
                                        <FormControl><Input type="number" {...field} className="h-8 w-16 text-center text-xs" title="Total" disabled={!canEdit} /></FormControl>
                                    )} />
                                    <Badge variant="secondary" className="h-5 text-[9px] font-mono ml-1">
                                        {watchBoard?.[index]?.firstTakersPassRate || 0}%
                                    </Badge>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1 justify-center">
                                    <FormField control={control} name={`boardPerformance.${index}.retakersPassed`} render={({ field }) => (
                                        <FormControl><Input type="number" {...field} className="h-8 w-16 text-center text-xs" title="Passed" disabled={!canEdit} /></FormControl>
                                    )} />
                                    <span className="text-xs text-muted-foreground">/</span>
                                    <FormField control={control} name={`boardPerformance.${index}.retakersCount`} render={({ field }) => (
                                        <FormControl><Input type="number" {...field} className="h-8 w-16 text-center text-xs" title="Total" disabled={!canEdit} /></FormControl>
                                    )} />
                                    <Badge variant="secondary" className="h-5 text-[9px] font-mono ml-1">
                                        {watchBoard?.[index]?.retakersPassRate || 0}%
                                    </Badge>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <FormField control={control} name={`boardPerformance.${index}.overallPassRate`} render={({ field }) => (
                                    <FormControl><Input type="number" step="0.01" {...field} className="h-8 w-20 text-center text-xs font-black text-primary border-primary/30" disabled /></FormControl>
                                )} />
                            </TableCell>
                            <TableCell className="text-center">
                                <FormField control={control} name={`boardPerformance.${index}.nationalPassingRate`} render={({ field }) => (
                                    <FormControl><Input type="number" step="0.01" {...field} className="h-8 w-20 text-center text-xs" disabled={!canEdit} /></FormControl>
                                )} />
                            </TableCell>
                            {canEdit && (
                                <TableCell>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeBoard(index)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                    {boardFields.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic text-xs">No board exam records added for this period.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 2. Graduation Registry (Dynamic) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
              Graduation Outcomes Registry
            </CardTitle>
            <CardDescription>Track total graduates per year and semester.</CardDescription>
          </div>
          {canEdit && (
            <Button 
              type="button" 
              size="sm" 
              onClick={() => appendGrad({ year: new Date().getFullYear(), semester: '1st Semester', count: 0 })}
              className="h-8 gap-1"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Record
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-1/4">Year</TableHead>
                <TableHead className="w-1/3">Semester</TableHead>
                <TableHead className="w-1/4">Graduate Count</TableHead>
                {canEdit && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {gradFields.map((field, index) => (
                <TableRow key={field.id} className="hover:bg-muted/30">
                  <TableCell>
                    <FormField control={control} name={`graduationRecords.${index}.year`} render={({ field }) => (
                      <FormControl><Input type="number" {...field} className="h-8 text-xs" disabled={!canEdit} /></FormControl>
                    )} />
                  </TableCell>
                  <TableCell>
                    <FormField control={control} name={`graduationRecords.${index}.semester`} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                        <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{semesterOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </TableCell>
                  <TableCell>
                    <FormField control={control} name={`graduationRecords.${index}.count`} render={({ field }) => (
                      <FormControl><Input type="number" {...field} className="h-8 text-xs font-bold" disabled={!canEdit} /></FormControl>
                    )} />
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeGrad(index)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {gradFields.length === 0 && (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic text-xs">No graduation records encoded for this period.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. Tracer Registry (Dynamic) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Graduate Tracer Study Registry
            </CardTitle>
            <CardDescription>Employability status and tracing coverage.</CardDescription>
          </div>
          {canEdit && (
            <Button 
              type="button" 
              variant="outline"
              size="sm" 
              onClick={() => appendTracer({ year: new Date().getFullYear(), semester: '1st Semester', totalGraduates: 0, tracedCount: 0, employmentRate: 0 })}
              className="h-8 gap-1 border-green-200 text-green-700 hover:bg-green-50"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Tracer
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Period</TableHead>
                <TableHead>Graduates</TableHead>
                <TableHead>Traced</TableHead>
                <TableHead>Employment %</TableHead>
                {canEdit && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracerFields.map((field, index) => {
                const rate = Number(formContextValues(`tracerRecords.${index}.employmentRate`)) || 0;
                return (
                  <TableRow key={field.id} className="hover:bg-muted/30">
                    <TableCell className="min-w-[180px]">
                      <div className="grid grid-cols-2 gap-1">
                        <FormField control={control} name={`tracerRecords.${index}.year`} render={({ field }) => (
                          <FormControl><Input type="number" {...field} className="h-8 text-xs" disabled={!canEdit} /></FormControl>
                        )} />
                        <FormField control={control} name={`tracerRecords.${index}.semester`} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                            <FormControl><SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{semesterOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                          </Select>
                        )} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <FormField control={control} name={`tracerRecords.${index}.totalGraduates`} render={({ field }) => (
                        <FormControl><Input type="number" {...field} className="h-8 text-xs" disabled={!canEdit} /></FormControl>
                      )} />
                    </TableCell>
                    <TableCell>
                      <FormField control={control} name={`tracerRecords.${index}.tracedCount`} render={({ field }) => (
                        <FormControl><Input type="number" {...field} className="h-8 text-xs" disabled={!canEdit} /></FormControl>
                      )} />
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="space-y-1">
                        <FormField control={control} name={`tracerRecords.${index}.employmentRate`} render={({ field }) => (
                          <FormControl><Input type="number" step="0.01" {...field} className="h-8 text-xs font-bold text-green-600" disabled={!canEdit} /></FormControl>
                        )} />
                        <Progress value={rate} className="h-1 bg-muted" />
                      </div>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTracer(index)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {tracerFields.length === 0 && (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic text-xs">No tracer study results recorded.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to get form values for visual indicators
function formContextValues(name: string) {
    const { getValues } = useFormContext();
    return getValues(name);
}
