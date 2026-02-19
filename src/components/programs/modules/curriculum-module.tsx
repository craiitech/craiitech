'use client';

import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Link as LinkIcon, GraduationCap, HeartHandshake, Layers, PlusCircle, Trash2, CheckCircle2, Calendar } from 'lucide-react';
import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface CurriculumModuleProps {
  canEdit: boolean;
  programSpecializations?: { id: string, name: string }[];
}

export function CurriculumModule({ canEdit, programSpecializations }: CurriculumModuleProps) {
  const { control, setValue, watch } = useFormContext();
  const enrollment = watch('stats.enrollment');

  const { fields, append, remove } = useFieldArray({
    control,
    name: "curriculumRecords"
  });

  const hasSpecializations = programSpecializations && programSpecializations.length > 0;

  // Auto-calculate totals for each year level in all terms
  useEffect(() => {
    const terms = ['firstSemester', 'secondSemester', 'midYearTerm'];
    const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'];
    
    terms.forEach(term => {
        levels.forEach(level => {
            const male = Number(enrollment?.[term]?.[level]?.male) || 0;
            const female = Number(enrollment?.[term]?.[level]?.female) || 0;
            const total = male + female;
            if (enrollment?.[term]?.[level] && enrollment[term][level].total !== total) {
                setValue(`stats.enrollment.${term}.${level}.total`, total);
            }
        });
    });
  }, [enrollment, setValue]);

  const renderEnrollmentSection = (termKey: string) => (
    <div className="space-y-4 pt-4">
        {['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].map((level, idx) => (
            <div key={`${termKey}-${level}`} className="space-y-3 p-4 rounded-lg border bg-muted/5 relative">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary">{idx + 1}{idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} Year Registry</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <FormField
                        control={control}
                        name={`stats.enrollment.${termKey}.${level}.male`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Male</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-8 text-xs bg-background" disabled={!canEdit} /></FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`stats.enrollment.${termKey}.${level}.female`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Female</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-8 text-xs bg-background" disabled={!canEdit} /></FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`stats.enrollment.${termKey}.${level}.specialNeeds`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[9px] uppercase font-bold text-primary flex items-center gap-1">
                                    <HeartHandshake className="h-2.5 w-2.5" />
                                    Sp. Needs
                                </FormLabel>
                                <FormControl><Input type="number" {...field} className="h-8 text-xs bg-primary/5 border-primary/20" disabled={!canEdit} /></FormControl>
                            </FormItem>
                        )}
                    />
                    <FormItem>
                        <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Total</FormLabel>
                        <FormControl><Input type="number" value={enrollment?.[termKey]?.[level]?.total || 0} className="h-8 text-xs font-black bg-muted/20 text-center" disabled /></FormControl>
                    </FormItem>
                </div>
            </div>
        ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10 shadow-sm">
            <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Curriculum & CHED Program Contents
                </h3>
                <p className="text-[10px] text-muted-foreground font-medium">Register the official curriculum and its proof of notation by CHED.</p>
            </div>
            {canEdit && (
                <Button 
                    type="button" 
                    size="sm" 
                    onClick={() => append({ 
                        id: Math.random().toString(36).substr(2, 9),
                        majorId: 'General',
                        revisionNumber: '',
                        dateImplemented: '',
                        isNotedByChed: false,
                        cmoLink: '',
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
            {fields.map((field, index) => (
                <Card key={field.id} className="border-primary/10 shadow-sm overflow-hidden relative group">
                    {canEdit && (
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => remove(index)}
                            className="absolute top-2 right-2 text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                    <CardHeader className="bg-muted/30 py-3 border-b">
                        <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-2">
                            <Layers className="h-3.5 w-3.5" />
                            Curriculum Record #{index + 1}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={control}
                                name={`curriculumRecords.${index}.majorId`}
                                render={({ field: inputField }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase">Associated Major / Track</FormLabel>
                                        <Select onValueChange={inputField.onChange} value={inputField.value} disabled={!canEdit}>
                                            <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="General" className="font-bold">General Program / All Tracks</SelectItem>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={control}
                                name={`curriculumRecords.${index}.dateImplemented`}
                                render={({ field: inputField }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase">Implementation Date</FormLabel>
                                        <FormControl><Input {...inputField} placeholder="e.g. 1st Sem 2024" className="h-9 text-xs" disabled={!canEdit} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`curriculumRecords.${index}.cmoLink`}
                                render={({ field: inputField }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase flex items-center gap-1.5">
                                            <LinkIcon className="h-2.5 w-2.5" /> CMO Reference (PDF)
                                        </FormLabel>
                                        <FormControl><Input {...inputField} placeholder="GDrive Link..." className="h-9 text-xs" disabled={!canEdit} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-xs font-black uppercase text-blue-800">CHED Program Notation Status</FormLabel>
                                    <p className="text-[9px] text-muted-foreground">Is this curriculum version officially acknowledged by CHED?</p>
                                </div>
                                <FormField
                                    control={control}
                                    name={`curriculumRecords.${index}.isNotedByChed`}
                                    render={({ field: inputField }) => (
                                        <FormControl><Switch checked={inputField.value} onCheckedChange={inputField.onChange} disabled={!canEdit} /></FormControl>
                                    )}
                                />
                            </div>

                            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border bg-blue-50/20 transition-all duration-500", !useWatch({ control, name: `curriculumRecords.${index}.isNotedByChed` }) && "opacity-30 grayscale pointer-events-none")}>
                                <FormField
                                    control={control}
                                    name={`curriculumRecords.${index}.notationProofLink`}
                                    render={({ field: inputField }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] font-black uppercase text-blue-700">Proof of Content Noted (PDF)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <CheckCircle2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-blue-400" />
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
            ))}
            {fields.length === 0 && (
                <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/5">
                    <BookOpen className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
                    <p className="text-xs font-bold text-muted-foreground uppercase">No Curricula Logged</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Register the program or major curricula to ensure alignment.</p>
                </div>
            )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Student Statistics Breakdown
          </CardTitle>
          <CardDescription>Sex-disaggregated enrollment and special needs tracking by semester.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="firstSemester" className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-9 p-1 bg-muted">
                <TabsTrigger value="firstSemester" className="text-[10px] font-black uppercase tracking-wider">1st Sem</TabsTrigger>
                <TabsTrigger value="secondSemester" className="text-[10px] font-black uppercase tracking-wider">2nd Sem</TabsTrigger>
                <TabsTrigger value="midYearTerm" className="text-[10px] font-black uppercase tracking-wider">Summer</TabsTrigger>
            </TabsList>
            <TabsContent value="firstSemester">{renderEnrollmentSection('firstSemester')}</TabsContent>
            <TabsContent value="secondSemester">{renderEnrollmentSection('secondSemester')}</TabsContent>
            <TabsContent value="midYearTerm">{renderEnrollmentSection('midYearTerm')}</TabsContent>
          </Tabs>

          <div className="pt-4 border-t mt-4">
            <FormField
                control={control}
                name="stats.graduationCount"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-primary font-bold">Total Program Graduates (Current Year Target)</FormLabel>
                    <FormControl><Input type="number" {...field} className="border-primary/50 text-lg font-bold" disabled={!canEdit} /></FormControl>
                    <FormDescription className="text-[10px]">Overall expected graduate output for the academic year.</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
