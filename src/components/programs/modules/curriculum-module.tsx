'use client';

import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardFooter } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Link as LinkIcon, GraduationCap, HeartHandshake, Layers, PlusCircle, Trash2, CheckCircle2, Calendar, Info, Calculator, Users } from 'lucide-react';
import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CurriculumModuleProps {
  canEdit: boolean;
  programSpecializations?: { id: string, name: string }[];
  focusMode?: 'enrollment' | 'all';
}

function EnrollmentRecordCard({
    index,
    control,
    canEdit,
    onRemove,
    programSpecializations,
    setValue,
    watch
}: {
    index: number;
    control: any;
    canEdit: boolean;
    onRemove: () => void;
    programSpecializations?: { id: string, name: string }[];
    setValue: any;
    watch: any;
}) {
    const enrollment = watch(`enrollmentRecords.${index}`);

    useEffect(() => {
        const terms = ['firstSemester', 'secondSemester', 'midYearTerm'] as const;
        const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'] as const;
        
        terms.forEach(term => {
            levels.forEach(level => {
                const male = Number(enrollment?.[term]?.[level]?.male) || 0;
                const female = Number(enrollment?.[term]?.[level]?.female) || 0;
                const total = male + female;
                if (enrollment?.[term]?.[level] && enrollment[term][level].total !== total) {
                    setValue(`enrollmentRecords.${index}.${term}.${level}.total`, total);
                }
            });
        });
    }, [enrollment, index, setValue]);

    const renderTermInputs = (termKey: string) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].map((level, lIdx) => (
                <div key={level} className="p-3 rounded-lg border bg-muted/5 space-y-3">
                    <p className="text-[9px] font-black uppercase text-primary border-b pb-1">{lIdx + 1}{lIdx === 0 ? 'st' : lIdx === 1 ? 'nd' : lIdx === 2 ? 'rd' : 'th'} Year Level</p>
                    <div className="grid grid-cols-3 gap-2">
                        <FormField control={control} name={`enrollmentRecords.${index}.${termKey}.${level}.male`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[8px] uppercase font-bold text-muted-foreground">Male</FormLabel><FormControl><Input type="number" {...field} className="h-7 text-[10px]" disabled={!canEdit} /></FormControl></FormItem>
                        )} />
                        <FormField control={control} name={`enrollmentRecords.${index}.${termKey}.${level}.female`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[8px] uppercase font-bold text-muted-foreground">Female</FormLabel><FormControl><Input type="number" {...field} className="h-7 text-[10px]" disabled={!canEdit} /></FormControl></FormItem>
                        )} />
                        <FormItem><FormLabel className="text-[8px] uppercase font-black text-primary">Total</FormLabel><FormControl><Input type="number" value={enrollment?.[termKey]?.[level]?.total || 0} className="h-7 text-[10px] font-black bg-muted/20 text-center" disabled /></FormControl></FormItem>
                    </div>
                    <FormField control={control} name={`enrollmentRecords.${index}.${termKey}.${level}.specialNeeds`} render={({ field }) => (
                        <FormItem><FormLabel className="text-[8px] uppercase font-bold text-blue-600 flex items-center gap-1"><HeartHandshake className="h-2 w-2" /> Special Needs</FormLabel><FormControl><Input type="number" {...field} className="h-7 text-[10px] bg-blue-50 border-blue-100" disabled={!canEdit} /></FormControl></FormItem>
                    )} />
                </div>
            ))}
        </div>
    );

    return (
        <Card className="border-primary/10 shadow-md overflow-hidden animate-in slide-in-from-top-4 duration-500 relative group">
            {canEdit && (
                <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="absolute top-2 right-2 text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 className="h-4 w-4" /></Button>
            )}
            <CardHeader className="bg-primary/5 py-4 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-xs font-black uppercase text-primary flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />
                            Enrollment Data Log #{index + 1}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Year-Level Headcount Distribution</p>
                    </div>
                    <div className="w-full sm:w-[250px]">
                        <FormField control={control} name={`enrollmentRecords.${index}.majorId`} render={({ field: inputField }) => (
                            <FormItem>
                                <Select onValueChange={inputField.onChange} value={inputField.value} disabled={!canEdit}>
                                    <FormControl><SelectTrigger className="h-8 text-[10px] font-black uppercase bg-white"><SelectValue placeholder="Associate to Major" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="General" className="font-bold">General Program / All Majors</SelectItem>
                                        {programSpecializations?.map(spec => (
                                            <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs defaultValue="first" className="w-full">
                    <TabsList className="grid grid-cols-3 h-8 bg-muted/30 rounded-none border-b p-0">
                        <TabsTrigger value="first" className="text-[9px] font-black uppercase rounded-none border-r">1st Sem</TabsTrigger>
                        <TabsTrigger value="second" className="text-[9px] font-black uppercase rounded-none border-r">2nd Sem</TabsTrigger>
                        <TabsTrigger value="mid" className="text-[9px] font-black uppercase rounded-none">Summer</TabsTrigger>
                    </TabsList>
                    <div className="p-4">
                        <TabsContent value="first" className="mt-0">{renderTermInputs('firstSemester')}</TabsContent>
                        <TabsContent value="second" className="mt-0">{renderTermInputs('secondSemester')}</TabsContent>
                        <TabsContent value="mid" className="mt-0">{renderTermInputs('midYearTerm')}</TabsContent>
                    </div>
                </Tabs>
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-2 px-4 flex justify-between items-center">
                <p className="text-[8px] font-black uppercase text-primary/50">Disaggregated SDD Entry</p>
                <div className="flex gap-4 text-[9px] font-black text-slate-800">
                    <span>1ST SEM: {Object.values(enrollment?.firstSemester || {}).reduce((acc: number, level: any) => acc + (level.total || 0), 0)}</span>
                    <span>2ND SEM: {Object.values(enrollment?.secondSemester || {}).reduce((acc: number, level: any) => acc + (level.total || 0), 0)}</span>
                </div>
            </CardFooter>
        </Card>
    );
}

function CurriculumRecordCard({ 
  index, 
  control, 
  canEdit, 
  onRemove, 
  programSpecializations 
}: { 
  index: number; 
  control: any; 
  canEdit: boolean; 
  onRemove: () => void; 
  programSpecializations?: { id: string, name: string }[] 
}) {
  const isNotedByChed = useWatch({ control, name: `curriculumRecords.${index}.isNotedByChed` });
  const notationProofLinkVal = useWatch({ control, name: `curriculumRecords.${index}.notationProofLink` });

  return (
    <Card className="border-primary/10 shadow-sm overflow-hidden relative group">
      {canEdit && (
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          onClick={onRemove}
          className="absolute top-2 right-2 text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      <CardHeader className="bg-muted/30 py-3 border-b">
        <p className="text-xs font-black uppercase text-primary flex items-center gap-2">
          <Layers className="h-3.5 w-3.5" />
          Specialization/Major Curriculum & Notation Record #{index + 1}
        </p>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name={`curriculumRecords.${index}.majorId`}
            render={({ field: inputField }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-bold uppercase">Associated Specialization/Major</FormLabel>
                <Select onValueChange={inputField.onChange} value={inputField.value} disabled={!canEdit}>
                  <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="General" className="font-bold">General Program / All Specializations</SelectItem>
                    {programSpecializations?.map(spec => (
                      <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`curriculumRecords.${index}.revisionNumber`}
            render={({ field: inputField }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-bold uppercase">Revision Number</FormLabel>
                <FormControl><Input {...inputField} placeholder="e.g. 2024-Rev01" className="h-9 text-xs" disabled={!canEdit} /></FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
            control={control}
            name={`curriculumRecords.${index}.dateImplemented`}
            render={({ field: inputField }) => (
                <FormItem>
                <FormLabel className="text-[10px] font-bold uppercase">Date Implemented</FormLabel>
                <FormControl><Input {...inputField} placeholder="e.g. 1st Sem 2024" className="h-9 text-xs" disabled={!canEdit} /></FormControl>
                </FormItem>
            )}
        />

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <FormLabel className="text-xs font-black uppercase text-blue-800">CHED Program Notation Status</FormLabel>
              <p className="text-[9px] text-muted-foreground">Is this specialization/major's curriculum officially acknowledged by CHED?</p>
            </div>
            <FormField
              control={control}
              name={`curriculumRecords.${index}.isNotedByChed`}
              render={({ field: inputField }) => (
                <FormControl><Switch checked={inputField.value} onCheckedChange={inputField.onChange} disabled={!canEdit} /></FormControl>
              )}
            />
          </div>

          <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border bg-blue-50/20 transition-all duration-500", !isNotedByChed && "opacity-30 grayscale pointer-events-none")}>
            <FormField
              control={control}
              name={`curriculumRecords.${index}.notationProofLink`}
              render={({ field: inputField }) => (
                <FormItem>
                  <FormLabel className="text-[9px] font-black uppercase text-blue-700 flex items-center gap-2">
                    Proof of Content Noted (PDF)
                    {notationProofLinkVal && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-blue-400" />
                      <Input {...inputField} value={inputField.value || ''} placeholder="GDrive Proof Link..." className="pl-8 h-8 text-[10px] bg-white border-blue-100" disabled={!canEdit} />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`curriculumRecords.${index}.dateNoted`}
              render={({ field: inputField }) => (
                <FormItem>
                  <FormLabel className="text-[9px] font-black uppercase text-blue-700">Date of CHED Notation</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-blue-400" />
                      <Input {...inputField} value={inputField.value || ''} placeholder="e.g. Oct 24, 2024" className="pl-8 h-8 text-[10px] bg-white border-blue-100 font-bold" disabled={!canEdit} />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CurriculumModule({ canEdit, programSpecializations, focusMode = 'all' }: CurriculumModuleProps) {
  const { control, setValue, watch } = useFormContext();
  const programCmoLinkVal = watch('ched.programCmoLink');

  const { fields: curFields, append: appendCur, remove: removeCur } = useFieldArray({
    control,
    name: "curriculumRecords"
  });

  const { fields: enrollFields, append: appendEnroll, remove: removeEnroll } = useFieldArray({
    control,
    name: "enrollmentRecords"
  });

  const getEmptyYearLevel = () => ({
      male: 0, female: 0, total: 0, specialNeeds: 0
  });

  const getEmptyEnrollRecord = () => ({
      id: Math.random().toString(36).substr(2, 9),
      majorId: 'General',
      firstSemester: { firstYear: getEmptyYearLevel(), secondYear: getEmptyYearLevel(), thirdYear: getEmptyYearLevel(), fourthYear: getEmptyYearLevel() },
      secondSemester: { firstYear: getEmptyYearLevel(), secondYear: getEmptyYearLevel(), thirdYear: getEmptyYearLevel(), fourthYear: getEmptyYearLevel() },
      midYearTerm: { firstYear: getEmptyYearLevel(), secondYear: getEmptyYearLevel(), thirdYear: getEmptyYearLevel(), fourthYear: getEmptyYearLevel() },
  });

  const showRegistry = focusMode === 'all';
  const showEnrollment = focusMode === 'all' || focusMode === 'enrollment';

  return (
    <div className={cn("grid grid-cols-1 gap-8", showRegistry ? "lg:grid-cols-2" : "max-w-4xl mx-auto")}>
      {showRegistry && (
        <div className="space-y-8">
            <Card className="border-primary/20 shadow-sm overflow-hidden">
                <div className="bg-primary/5 border-b py-4 px-6">
                    <p className="text-xs font-black uppercase text-primary flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Program Standard Reference
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">The CHED Memorandum Order (CMO) that governs this entire degree program.</p>
                </div>
                <CardContent className="pt-6">
                    <FormField
                        control={control}
                        name="ched.programCmoLink"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase flex items-center gap-2">
                                    CHED Memorandum Order (CMO) Link
                                    {programCmoLinkVal && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                </FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input {...field} value={field.value || ''} placeholder="https://drive.google.com/..." className="pl-9" disabled={!canEdit} />
                                    </div>
                                </FormControl>
                                <FormDescription className="text-[9px]">A single institutional standard reference for all program specializations.</FormDescription>
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <div className="flex items-center justify-between bg-muted p-4 rounded-xl border border-primary/10 shadow-sm">
                <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Major-Specific Curriculum Registry
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-medium">Log notation status and implementation details per specialization/major.</p>
                </div>
                {canEdit && (
                    <Button 
                        type="button" 
                        size="sm" 
                        onClick={() => appendCur({ 
                            id: Math.random().toString(36).substr(2, 9),
                            majorId: 'General',
                            revisionNumber: '',
                            dateImplemented: '',
                            isNotedByChed: false,
                            notationProofLink: '',
                            dateNoted: ''
                        })}
                        className="shadow-lg shadow-primary/20 h-8 text-[10px] font-bold"
                    >
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Curriculum
                    </Button>
                )}
            </div>

            <div className="space-y-6">
                {curFields.map((field, index) => (
                    <CurriculumRecordCard 
                        key={field.id} 
                        index={index} 
                        control={control} 
                        canEdit={canEdit} 
                        onRemove={() => removeCur(index)} 
                        programSpecializations={programSpecializations} 
                    />
                ))}
                {curFields.length === 0 && (
                    <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/5">
                        <Layers className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
                        <p className="text-xs font-bold text-muted-foreground uppercase">No Curriculum Records Logged</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {showEnrollment && (
        <div className="space-y-8">
            <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10 shadow-sm">
                <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Major-Specific Enrollment Registry
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-medium">Disaggregated student statistics by Year Level and Semester.</p>
                </div>
                {canEdit && (
                    <Button 
                        type="button" 
                        size="sm" 
                        onClick={() => appendEnroll(getEmptyEnrollRecord())}
                        className="shadow-lg shadow-primary/20 h-8 text-[10px] font-bold"
                    >
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Major Count
                    </Button>
                )}
            </div>

            <div className="space-y-8">
                {enrollFields.map((field, index) => (
                    <EnrollmentRecordCard 
                        key={field.id}
                        index={index}
                        control={control}
                        canEdit={canEdit}
                        onRemove={() => removeEnroll(index)}
                        programSpecializations={programSpecializations}
                        setValue={setValue}
                        watch={watch}
                    />
                ))}
                {enrollFields.length === 0 && (
                    <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/5">
                        <Users className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
                        <p className="text-xs font-bold text-muted-foreground uppercase">No Enrollment Data Logged</p>
                    </div>
                )}
            </div>

            {showRegistry && (
                <Card className="bg-slate-50 border-dashed">
                    <div className="py-4 px-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <Calculator className="h-3.5 w-3.5" />
                            Institutional Totals (Summary)
                        </p>
                    </div>
                    <CardContent>
                        <FormField
                            control={control}
                            name="stats.graduationCount"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-primary">AY Graduation Target</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-10 text-lg font-black border-primary/30" disabled={!canEdit} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
      )}
    </div>
  );
}
