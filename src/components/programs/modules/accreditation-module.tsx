
'use client';

import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Calendar, Link as LinkIcon, Award, Users, FileText, CheckCircle2, UserCircle, Calculator, Info, TrendingUp, PlusCircle, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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

export function AccreditationModule({ canEdit }: { canEdit: boolean }) {
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
            <p className="text-[10px] text-muted-foreground font-medium">Log all survey visits and status milestones for the program.</p>
        </div>
        {canEdit && (
            <Button 
                type="button" 
                size="sm" 
                onClick={() => append({ 
                    id: Math.random().toString(36).substr(2, 9),
                    level: 'Non Accredited',
                    lifecycleStatus: 'TBA',
                    areas: [],
                    ratingsSummary: { overallTotalWeight: 0, overallTotalWeightedMean: 0, grandMean: 0, descriptiveRating: '' }
                })}
                className="shadow-lg shadow-primary/20"
            >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Accreditation Milestone
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
            />
        ))}
        {fields.length === 0 && (
            <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/5">
                <Award className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No Accreditation Milestones Logged</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Add Accreditation Milestone" to begin tracking the program's lifecycle.</p>
            </div>
        )}
      </div>
    </div>
  );
}

function AccreditationRecordCard({ index, canEdit, onRemove }: { index: number; canEdit: boolean; onRemove: () => void }) {
    const { control, setValue } = useFormContext();
    
    // Watch fields for this specific record
    const watchedRecord = useWatch({ control, name: `accreditationRecords.${index}` });
    const selectedLevel = watchedRecord?.level;
    const watchedAreas = watchedRecord?.areas || [];

    const isLevel3Or4 = useMemo(() => {
        return selectedLevel?.includes('Level III') || selectedLevel?.includes('Level IV');
    }, [selectedLevel]);

    const isPSVToLevel2 = useMemo(() => {
        return selectedLevel === 'Preliminary Survey Visit (PSV)' || 
               selectedLevel?.includes('Level I') || 
               selectedLevel?.includes('Level II');
    }, [selectedLevel]);

    // Area Initialization per card
    useEffect(() => {
        if (!watchedAreas || watchedAreas.length === 0) {
            if (isPSVToLevel2) {
                const initial = standardAreas.map(area => ({
                    areaCode: area.code,
                    areaName: area.name,
                    googleDriveLink: '',
                    taskForce: '',
                    weight: 0,
                    mean: 0,
                    weightedMean: 0
                }));
                setValue(`accreditationRecords.${index}.areas`, initial);
            } else if (isLevel3Or4) {
                const mandatory = level34MandatoryAreas.map(area => ({
                    areaCode: area.code,
                    areaName: area.name,
                    googleDriveLink: '',
                    taskForce: '',
                    weight: 0,
                    mean: 0,
                    weightedMean: 0
                }));
                const optional = level34OptionalAreas.map(area => ({
                    areaCode: area.code,
                    areaName: area.name,
                    googleDriveLink: '',
                    taskForce: '',
                    weight: 0,
                    mean: 0,
                    weightedMean: 0
                }));
                setValue(`accreditationRecords.${index}.areas`, [...mandatory, ...optional]);
            }
        }
    }, [selectedLevel, isPSVToLevel2, isLevel3Or4, index, setValue]);

    // Local Score Engine for this card
    useEffect(() => {
        if (!watchedAreas || watchedAreas.length === 0) return;

        let totalWeight = 0;
        let totalWeightedMean = 0;

        watchedAreas.forEach((area: any, areaIdx: number) => {
            const weight = parseFloat(area.weight) || 0;
            const mean = parseFloat(area.mean) || 0;
            const weightedMean = parseFloat((weight * mean).toFixed(2));

            if (area.weightedMean !== weightedMean) {
                setValue(`accreditationRecords.${index}.areas.${areaIdx}.weightedMean`, weightedMean);
            }

            totalWeight += weight;
            totalWeightedMean += weightedMean;
        });

        const grandMean = totalWeight > 0 ? parseFloat((totalWeightedMean / totalWeight).toFixed(2)) : 0;

        setValue(`accreditationRecords.${index}.ratingsSummary.overallTotalWeight`, parseFloat(totalWeight.toFixed(2)));
        setValue(`accreditationRecords.${index}.ratingsSummary.overallTotalWeightedMean`, parseFloat(totalWeightedMean.toFixed(2)));
        setValue(`accreditationRecords.${index}.ratingsSummary.grandMean`, grandMean);

    }, [watchedAreas, index, setValue]);

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
                            Accreditation Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <FormField
                            control={control}
                            name={`accreditationRecords.${index}.level`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Target / Level</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                                        <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {accreditationLevels.map(lvl => <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name={`accreditationRecords.${index}.lifecycleStatus`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase">Lifecycle State</FormLabel>
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
                            )}
                        />
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

                <Card className="lg:col-span-2 border-primary/10 shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-primary" />
                            Task Force & Preparations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={control} name={`accreditationRecords.${index}.nextSchedule`} render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-bold uppercase">Upcoming Survey Plan</FormLabel><FormControl><Input {...field} value={field.value || ''} className="h-9" disabled={!canEdit} /></FormControl></FormItem>
                            )} />
                            <FormField control={control} name={`accreditationRecords.${index}.overallTaskForceHead`} render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] font-bold uppercase">Milestone Lead / Head</FormLabel><FormControl><Input {...field} value={field.value || ''} className="h-9" disabled={!canEdit} /></FormControl></FormItem>
                            )} />
                        </div>
                        <FormField control={control} name={`accreditationRecords.${index}.taskForce`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-bold uppercase">General Milestone Task Force</FormLabel><FormControl><Textarea {...field} value={field.value || ''} rows={3} disabled={!canEdit} /></FormControl></FormItem>
                        )} />
                    </CardContent>
                </Card>
            </div>

            {/* Area Ratings Section for this Milestone */}
            {(isPSVToLevel2 || isLevel3Or4) && (
                <Card className="border-primary/20 shadow-md">
                    <CardHeader className="bg-primary/5 border-b py-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calculator className="h-4 w-4 text-primary" />
                                    Ratings Summary & Area Distribution
                                </CardTitle>
                                <CardDescription className="text-xs">Milestone scores for {selectedLevel}.</CardDescription>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Grand Mean</p>
                                <p className="text-2xl font-black text-primary tabular-nums tracking-tighter">
                                    {watchedRecord?.ratingsSummary?.grandMean?.toFixed(2) || '0.00'}
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-[10px] font-black uppercase py-2">Evaluation Area</TableHead>
                                        <TableHead className="text-center text-[10px] font-black uppercase py-2 w-[100px]">Weight</TableHead>
                                        <TableHead className="text-center text-[10px] font-black uppercase py-2 w-[100px]">Mean</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase py-2 w-[120px]">Weighted Mean</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {watchedAreas.map((area: any, areaIdx: number) => (
                                        <TableRow key={areaIdx} className="hover:bg-muted/10 group">
                                            <TableCell className="py-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="h-4 text-[8px] font-black">{area.areaCode}</Badge>
                                                    <span className="text-[11px] font-bold text-slate-700">{area.areaName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <FormField control={control} name={`accreditationRecords.${index}.areas.${areaIdx}.weight`} render={({ field: inputField }) => (
                                                    <FormControl><Input type="number" step="0.01" {...inputField} className="h-7 text-[10px] font-bold text-center bg-muted/5" disabled={!canEdit} /></FormControl>
                                                )} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <FormField control={control} name={`accreditationRecords.${index}.areas.${areaIdx}.mean`} render={({ field: inputField }) => (
                                                    <FormControl><Input type="number" step="0.01" {...inputField} className="h-7 text-[10px] font-bold text-center bg-muted/5" disabled={!canEdit} /></FormControl>
                                                )} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="text-[11px] font-black tabular-nums text-primary pr-2">
                                                    {area.weightedMean?.toFixed(2) || '0.00'}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Milestone Accountability</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {watchedAreas.map((area: any, areaIdx: number) => (
                                        <div key={areaIdx} className="p-3 rounded-lg border bg-muted/5 flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase truncate max-w-[150px]">{area.areaName}</span>
                                            <div className="flex items-center gap-2">
                                                <FormField control={control} name={`accreditationRecords.${index}.areas.${areaIdx}.taskForce`} render={({ field: inputField }) => (
                                                    <FormControl><Input {...inputField} value={inputField.value || ''} placeholder="Head" className="h-7 text-[9px] w-24 bg-white" disabled={!canEdit} /></FormControl>
                                                )} />
                                                <FormField control={control} name={`accreditationRecords.${index}.areas.${areaIdx}.googleDriveLink`} render={({ field: inputField }) => (
                                                    <FormControl><Input {...inputField} value={inputField.value || ''} placeholder="Link" className="h-7 text-[9px] w-24 bg-white" disabled={!canEdit} /></FormControl>
                                                )} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Final Descriptive Profile</h4>
                                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 shadow-inner">
                                    <FormField control={control} name={`accreditationRecords.${index}.ratingsSummary.descriptiveRating`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] font-black uppercase text-slate-500">Official Rating String</FormLabel>
                                            <FormControl><Input {...field} value={field.value || ''} placeholder="e.g., Very Satisfactory" className="h-12 text-lg font-black uppercase tracking-tight bg-white" disabled={!canEdit} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10 flex items-center gap-3">
                                        <TrendingUp className="h-5 w-5 text-primary" />
                                        <p className="text-[10px] text-primary/70 leading-relaxed font-bold uppercase italic">Verified result for milestone #{index + 1}.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
