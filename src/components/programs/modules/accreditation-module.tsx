
'use client';

import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Calendar, Link as LinkIcon, Award, Layers, PlusCircle, Trash2, Calculator, Check, ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const accreditationLevels = [
  "Non Accredited",
  "Preliminary Survey Visit (PSV)",
  "Level I Accredited",
  "Level I Re-accredited",
  "Level II Accredited",
  "Level II Re-accredited",
  "Level III Accredited",
  "Level III Re-accredited",
  "Level III - Phase 1 Accredited",
  "Level III - Phase 1 Re-accredited",
  "Level III - Phase 2 Accredited",
  "Level III - Phase 2 Re-accredited",
  "Level IV Accredited",
  "Level IV Re-accredited",
  "Level IV - Phase 1 Accredited",
  "Level IV - Phase 1 Re-accredited",
  "Level IV - Phase 2 Accredited",
  "Level IV - Phase 2 Re-accredited",
];

const standardAreas = [
  { code: 'Area I', name: 'Vision, Mission, Goals and Objectives' },
  { code: 'Area II', name: 'Faculty' },
  { code: 'Area III', name: 'Curriculum and Instruction' },
  { code: 'Area IV', name: 'Support to Students' },
  { code: 'Area V', name: 'Research' },
  { code: 'Area VI', name: 'Extension and Community Involvement' },
  { code: 'Area VII', name: 'Library' },
  { code: 'Area VIII', name: 'Physical Plant and Facilities' },
  { code: 'Area IX', name: 'Laboratories' },
  { code: 'Area X', name: 'Administration' },
];

const months = [
  { value: 0, label: 'January' }, { value: 1, label: 'February' }, { value: 2, label: 'March' },
  { value: 3, label: 'April' }, { value: 4, label: 'May' }, { value: 5, label: 'June' },
  { value: 6, label: 'July' }, { value: 7, label: 'August' }, { value: 8, label: 'September' },
  { value: 9, label: 'October' }, { value: 10, label: 'November' }, { value: 11, label: 'December' },
];

const yearsList = Array.from({ length: 20 }, (_, i) => 2024 + i);

function AccreditationRecordCard({ 
  index, 
  control,
  canEdit, 
  onRemove, 
  programSpecializations 
}: { 
  index: number; 
  control: any;
  canEdit: boolean; 
  onRemove: () => void, 
  programSpecializations?: { id: string, name: string }[] 
}) {
    const { setValue } = useFormContext();
    
    const selectedComponents = useWatch({ control, name: `accreditationRecords.${index}.components` }) || [];
    const areas = useWatch({ control, name: `accreditationRecords.${index}.areas` }) || [];
    const certificateLinkVal = useWatch({ control, name: `accreditationRecords.${index}.certificateLink` });
    const validityTextVal = useWatch({ control, name: `accreditationRecords.${index}.statusValidityDate` });

    const toggleMajor = (spec: { id: string, name: string }) => {
        const current = [...selectedComponents];
        const idx = current.findIndex((c: any) => c.id === spec.id);
        if (idx > -1) {
            current.splice(idx, 1);
        } else {
            current.push(spec);
        }
        setValue(`accreditationRecords.${index}.components`, current);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <Badge variant="secondary" className="px-4 py-1 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
                    Milestone Record #{index + 1}
                </Badge>
                {canEdit && (
                    <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:bg-destructive/10 h-7 text-[10px] font-bold uppercase">
                        <Trash2 className="h-3 w-3 mr-1.5" /> Remove
                    </Button>
                )}
                <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border-primary/10 shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Award className="h-4 w-4 text-primary" />
                            Target Level & Schedule
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <FormField control={control} name={`accreditationRecords.${index}.level`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-bold uppercase">Accreditation Level</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                                    <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{accreditationLevels.map(lvl => <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        
                        <FormField control={control} name={`accreditationRecords.${index}.statusValidityDate`} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                                    Next Schedule / Validity Period
                                    {validityTextVal && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                </FormLabel>
                                <FormControl><Input {...field} value={field.value || ''} placeholder="e.g. Oct 2025" className="h-10 text-sm font-bold border-primary/20 bg-primary/5" disabled={!canEdit} /></FormControl>
                                <FormDescription className="text-[9px]">Enter the text to be displayed as the Next Accreditation Schedule.</FormDescription>
                            </FormItem>
                        )} />

                        <div className="space-y-4 bg-primary/5 p-4 rounded-lg border border-primary/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Clock className="h-4 w-4" /> System Alert Mapping
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField control={control} name={`accreditationRecords.${index}.nextScheduleMonth`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[9px] uppercase font-bold text-slate-500">Target Month</FormLabel>
                                        <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value !== undefined ? String(field.value) : undefined} disabled={!canEdit}>
                                            <FormControl><SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Month" /></SelectTrigger></FormControl>
                                            <SelectContent>{months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                                <FormField control={control} name={`accreditationRecords.${index}.nextScheduleYear`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[9px] uppercase font-bold text-slate-500">Target Year</FormLabel>
                                        <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value !== undefined ? String(field.value) : undefined} disabled={!canEdit}>
                                            <FormControl><SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Year" /></SelectTrigger></FormControl>
                                            <SelectContent>{yearsList.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                            </div>
                            <FormDescription className="text-[9px] italic font-medium leading-relaxed">
                                <strong>Required:</strong> These fields enable the automated 'Overdue' warnings. Please align them with the text provided above.
                            </FormDescription>
                        </div>

                        <Separator />

                        <FormField control={control} name={`accreditationRecords.${index}.lifecycleStatus`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-bold uppercase">Milestone Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                                    <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="TBA">Archive / Historical</SelectItem>
                                        <SelectItem value="Undergoing">Ongoing Survey</SelectItem>
                                        <SelectItem value="Completed">Recently Completed</SelectItem>
                                        <SelectItem value="Waiting for Official Result">Waiting for Official Result</SelectItem>
                                        <SelectItem value="Current" className="font-bold text-primary">Official Current Level</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        
                        <FormField control={control} name={`accreditationRecords.${index}.dateOfSurvey`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-bold uppercase">Date of Survey</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="Oct 12-14, 2024" className="h-9 text-xs" disabled={!canEdit} /></FormControl></FormItem>
                        )} />

                        <FormField control={control} name={`accreditationRecords.${index}.certificateLink`} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase flex items-center gap-2">
                                    GDrive Certificate Link
                                    {certificateLinkVal && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                </FormLabel>
                                <FormControl>
                                    <div className="relative"><LinkIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input {...field} value={field.value || ''} className="pl-9 h-9 text-xs" disabled={!canEdit} /></div>
                                </FormControl>
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-primary/10 shadow-sm overflow-hidden flex flex-col">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Layers className="h-4 w-4 text-primary" />
                            Target Scope / Majors
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-6 pt-6">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Which majors were covered by this evaluation?</p>
                            <div className="flex flex-wrap gap-2">
                                {programSpecializations && programSpecializations.length > 0 ? (
                                    programSpecializations.map(spec => {
                                        const isSelected = selectedComponents.some((c: any) => c.id === spec.id);
                                        return (
                                            <Button 
                                                key={spec.id} 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                disabled={!canEdit}
                                                onClick={() => toggleMajor(spec)}
                                                className={cn(
                                                    "h-8 text-[10px] font-bold uppercase transition-all",
                                                    isSelected ? "bg-primary text-white border-primary shadow-md" : "bg-white text-muted-foreground border-slate-200"
                                                )}
                                            >
                                                {isSelected && <Check className="h-3 w-3 mr-1.5" />}
                                                {spec.name}
                                            </Button>
                                        );
                                    })
                                ) : (
                                    <div className="p-4 rounded-lg bg-muted/10 border border-dashed w-full text-center">
                                        <p className="text-[10px] text-muted-foreground italic">No specific majors defined. This record applies institutional quality to the overall program.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> Milestone Accountability Registry
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {areas.map((area: any, areaIdx: number) => (
                                    <div key={areaIdx} className="p-2 rounded-lg border bg-muted/5 flex items-center justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[9px] font-black text-primary leading-none mb-1">{area.areaCode}</p>
                                            <p className="text-[10px] font-bold text-slate-700 truncate">{area.areaName}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <FormField control={control} name={`accreditationRecords.${index}.areas.${areaIdx}.taskForce`} render={({ field: inputField }) => (
                                                <FormControl><Input {...inputField} value={inputField.value || ''} placeholder="Head" className="h-7 text-[9px] w-20 bg-white" disabled={!canEdit} /></FormControl>
                                            )} />
                                            <FormField control={control} name={`accreditationRecords.${index}.areas.${areaIdx}.googleDriveLink`} render={({ field: inputField }) => (
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input {...inputField} value={inputField.value || ''} placeholder="GDrive" className={cn("h-7 text-[9px] w-20 bg-white pr-5", inputField.value && "border-green-200")} disabled={!canEdit} />
                                                        {inputField.value && <CheckCircle2 className="absolute right-1.5 top-2 h-2.5 w-2.5 text-green-500" />}
                                                    </div>
                                                </FormControl>
                                            )} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Calculator className="h-4 w-4" /> Final Assessment Result
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={control} name={`accreditationRecords.${index}.ratingsSummary.grandMean`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[9px] font-black uppercase text-slate-500">Official Grand Mean Score</FormLabel>
                                        <FormControl><Input type="number" step="0.01" {...field} value={field.value || 0} className="h-9 text-lg font-black tabular-nums bg-slate-50" disabled={!canEdit} /></FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={control} name={`accreditationRecords.${index}.ratingsSummary.descriptiveRating`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[9px] font-black uppercase text-slate-500">Official Result String</FormLabel>
                                        <FormControl><Input {...field} value={field.value || ''} placeholder="e.g., Highly Satisfactory" className="h-9 text-xs font-bold uppercase bg-slate-50" disabled={!canEdit} /></FormControl>
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-full border-primary/10 shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <ClipboardList className="h-4 w-4 text-primary" />
                            Accreditor's Recommendations & Compliance Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={control} name={`accreditationRecords.${index}.mandatoryRequirements`} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-destructive">1. Mandatory Requirements (to be complied with before the award)</FormLabel>
                                    <FormControl><Textarea {...field} value={field.value || ''} placeholder="List critical deficiencies that must be addressed immediately..." rows={4} className="bg-slate-50 text-xs" disabled={!canEdit} /></FormControl>
                                    <FormDescription className="text-[9px]">Critical items requiring resolution for certification.</FormDescription>
                                </FormItem>
                            )} />
                            <FormField control={control} name={`accreditationRecords.${index}.enhancementRecommendations`} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-blue-700">2. Enhancement Recommendations (may be complied with after the award)</FormLabel>
                                    <FormControl><Textarea {...field} value={field.value || ''} placeholder="List opportunities for continuous improvement during the accreditation cycle..." rows={4} className="bg-slate-50 text-xs" disabled={!canEdit} /></FormControl>
                                    <FormDescription className="text-[9px]">Suggestions for qualitative growth post-survey.</FormDescription>
                                </FormItem>
                            )} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export function AccreditationModule({ canEdit, programSpecializations }: { canEdit: boolean, programSpecializations?: { id: string, name: string }[] }) {
  const { control } = useFormContext();
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: "accreditationRecords"
  });

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10 shadow-sm">
        <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Independent Accreditation Registry
            </h3>
            <p className="text-[10px] text-muted-foreground font-medium">Log distinct quality milestones for each major or the overall program offering.</p>
        </div>
        {canEdit && (
            <Button 
                type="button" 
                size="sm" 
                onClick={() => append({ 
                    id: Math.random().toString(36).substr(2, 9),
                    level: 'Non Accredited',
                    typeOfVisit: '',
                    result: '',
                    components: [],
                    lifecycleStatus: 'TBA',
                    areas: standardAreas.map(area => ({ areaCode: area.code, areaName: area.name, googleDriveLink: '', taskForce: '' })),
                    ratingsSummary: { grandMean: 0, descriptiveRating: '' },
                    mandatoryRequirements: '',
                    enhancementRecommendations: '',
                    nextScheduleMonth: new Date().getMonth(),
                    nextScheduleYear: new Date().getFullYear() + 3
                })}
                className="shadow-lg shadow-primary/20"
            >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Milestone
            </Button>
        )}
      </div>

      <div className="space-y-12">
        {fields.map((field, index) => (
            <AccreditationRecordCard 
                key={field.id} 
                index={index} 
                control={control}
                canEdit={canEdit} 
                onRemove={() => remove(index)}
                programSpecializations={programSpecializations}
            />
        ))}
        {fields.length === 0 && (
            <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/5">
                <Award className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No Records Logged</p>
                <p className="text-xs text-muted-foreground mt-1">Independent track records will synchronize here for each specialization.</p>
            </div>
        )}
      </div>
    </div>
  );
}
