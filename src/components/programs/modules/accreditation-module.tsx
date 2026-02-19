'use client';

import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Calendar, Link as LinkIcon, Award, Layers, PlusCircle, Trash2, Calculator, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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

const level34MandatoryAreas = [
  { code: 'Area III', name: 'Instruction' },
  { code: 'Area VI', name: 'Extension' },
];

const level34OptionalAreas = [
  { code: 'Area V', name: 'Research' },
  { code: 'Area XI', name: 'Licensure Examination Performance' },
  { code: 'Area XII', name: 'Faculty Development' },
  { code: 'Area XIII', name: 'Linkages' },
];

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
                Accreditation Registry
            </h3>
            <p className="text-[10px] text-muted-foreground font-medium">Log independent milestones for specific majors or the entire program.</p>
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
                    areas: [],
                    ratingsSummary: { grandMean: 0, descriptiveRating: '' }
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
                canEdit={canEdit} 
                onRemove={() => remove(index)}
                programSpecializations={programSpecializations}
            />
        ))}
        {fields.length === 0 && (
            <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/5">
                <Award className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No Milestones Logged</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Add Milestone" to track the program or major's quality status.</p>
            </div>
        )}
      </div>
    </div>
  );
}

function AccreditationRecordCard({ index, canEdit, onRemove, programSpecializations }: { index: number; canEdit: boolean; onRemove: () => void, programSpecializations?: { id: string, name: string }[] }) {
    const { control, setValue } = useFormContext();
    
    const selectedLevel = useWatch({ control, name: `accreditationRecords.${index}.level` });
    const selectedComponents = useWatch({ control, name: `accreditationRecords.${index}.components` }) || [];

    const isLevel3Or4 = selectedLevel?.includes('Level III') || selectedLevel?.includes('Level IV');
    const isPSVToLevel2 = selectedLevel === 'Preliminary Survey Visit (PSV)' || selectedLevel?.includes('Level I') || selectedLevel?.includes('Level II');

    useEffect(() => {
        if (isPSVToLevel2) {
            const initial = standardAreas.map(area => ({ areaCode: area.code, areaName: area.name, googleDriveLink: '', taskForce: '' }));
            setValue(`accreditationRecords.${index}.areas`, initial);
        } else if (isLevel3Or4) {
            const initial = [...level34MandatoryAreas, ...level34OptionalAreas].map(area => ({ areaCode: area.code, areaName: area.name, googleDriveLink: '', taskForce: '' }));
            setValue(`accreditationRecords.${index}.areas`, initial);
        }
    }, [selectedLevel, isPSVToLevel2, isLevel3Or4, index, setValue]);

    const toggleMajor = (spec: { id: string, name: string }) => {
        const current = [...selectedComponents];
        const idx = current.findIndex(c => c.id === spec.id);
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
                    Record #{index + 1}
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
                            Target Level & Status
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
                        <FormField control={control} name={`accreditationRecords.${index}.typeOfVisit`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-bold uppercase">Type of Visit</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="e.g., Formal Visit" className="h-9 text-xs" disabled={!canEdit} /></FormControl></FormItem>
                        )} />
                        <FormField control={control} name={`accreditationRecords.${index}.result`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-primary">Official Result (Output)</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="e.g., Level II Re-accredited" className="h-9 text-xs font-bold border-primary/20 bg-primary/5" disabled={!canEdit} /></FormControl><FormDescription className="text-[9px]">This result string is displayed in institutional summaries.</FormDescription></FormItem>
                        )} />
                        <FormField control={control} name={`accreditationRecords.${index}.lifecycleStatus`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-bold uppercase">Milestone State</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                                    <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="TBA">To Be Assigned</SelectItem>
                                        <SelectItem value="Undergoing">Undergoing Survey</SelectItem>
                                        <SelectItem value="Completed">Completed / Passed</SelectItem>
                                        <SelectItem value="Current">Official Current Level</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-1 gap-4 pt-2">
                            <FormField control={control} name={`accreditationRecords.${index}.dateOfSurvey`} render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-bold uppercase">Date of Survey</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="Oct 12-14, 2024" className="h-9 text-xs" disabled={!canEdit} /></FormControl></FormItem>
                            )} />
                            <FormField control={control} name={`accreditationRecords.${index}.statusValidityDate`} render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-bold uppercase">Validity Period</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="Valid until..." className="h-9 text-xs" disabled={!canEdit} /></FormControl></FormItem>
                            )} />
                        </div>
                        <FormField control={control} name={`accreditationRecords.${index}.certificateLink`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-bold uppercase">GDrive Certificate Link</FormLabel><FormControl>
                                <div className="relative"><LinkIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input {...field} value={field.value || ''} className="pl-9 h-9 text-xs" disabled={!canEdit} /></div>
                            </FormControl></FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-primary/10 shadow-sm overflow-hidden flex flex-col">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Layers className="h-4 w-4 text-primary" />
                            Scope / Majors Evaluated
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-6 pt-6">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Select Majors Covered by this Level</p>
                            <div className="flex flex-wrap gap-2">
                                {programSpecializations && programSpecializations.length > 0 ? (
                                    programSpecializations.map(spec => {
                                        const isSelected = selectedComponents.some(c => c.id === spec.id);
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
                                        <p className="text-[10px] text-muted-foreground italic">No majors defined in Program Registry. This record applies to the overall program.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> Milestone Accountability
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {(useWatch({ control, name: `accreditationRecords.${index}.areas` }) || []).map((area: any, areaIdx: number) => (
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
                                                <FormControl><Input {...inputField} value={inputField.value || ''} placeholder="GDrive" className="h-7 text-[9px] w-20 bg-white" disabled={!canEdit} /></FormControl>
                                            )} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Calculator className="h-4 w-4" /> Final Milestone Summary
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={control} name={`accreditationRecords.${index}.ratingsSummary.grandMean`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[9px] font-black uppercase text-slate-500">Grand Mean Score</FormLabel>
                                        <FormControl><Input type="number" step="0.01" {...field} value={field.value || 0} className="h-9 text-lg font-black tabular-nums bg-slate-50" disabled={!canEdit} /></FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={control} name={`accreditationRecords.${index}.ratingsSummary.descriptiveRating`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[9px] font-black uppercase text-slate-500">Official Status String</FormLabel>
                                        <FormControl><Input {...field} value={field.value || ''} placeholder="e.g., Very Satisfactory" className="h-9 text-xs font-bold uppercase bg-slate-50" disabled={!canEdit} /></FormControl>
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
