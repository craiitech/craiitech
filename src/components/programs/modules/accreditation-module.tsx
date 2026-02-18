
'use client';

import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Calendar, Link as LinkIcon, Award, Users, FileText, CheckCircle2, UserCircle, Calculator, Info, TrendingUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  const { control, watch, setValue } = useFormContext();
  const selectedLevel = watch('accreditation.level');
  const existingAreas = watch('accreditation.areas');

  const isLevel3Or4 = useMemo(() => {
    return selectedLevel?.includes('Level III') || selectedLevel?.includes('Level IV');
  }, [selectedLevel]);

  const isPSVToLevel2 = useMemo(() => {
    return selectedLevel === 'Preliminary Survey Visit (PSV)' || 
           selectedLevel?.includes('Level I') || 
           selectedLevel?.includes('Level II');
  }, [selectedLevel]);

  // Synchronize area fields when level changes, but ONLY if we don't already have area data.
  useEffect(() => {
    if (!existingAreas || existingAreas.length === 0) {
        if (isPSVToLevel2) {
            const currentAreas = standardAreas.map(area => ({
                areaCode: area.code,
                areaName: area.name,
                googleDriveLink: '',
                taskForce: '',
                weight: 0,
                mean: 0,
                weightedMean: 0
            }));
            setValue('accreditation.areas', currentAreas);
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
            setValue('accreditation.areas', [...mandatory, ...optional]);
        }
    }
  }, [isPSVToLevel2, isLevel3Or4, setValue, existingAreas]);

  // Auto-calculation for weighted means and grand total
  useEffect(() => {
    if (!existingAreas) return;

    let totalWeight = 0;
    let totalWeightedMean = 0;

    existingAreas.forEach((area: any, index: number) => {
        const weight = Number(area.weight) || 0;
        const mean = Number(area.mean) || 0;
        const weightedMean = parseFloat((weight * mean).toFixed(2));

        if (area.weightedMean !== weightedMean) {
            setValue(`accreditation.areas.${index}.weightedMean`, weightedMean);
        }

        totalWeight += weight;
        totalWeightedMean += weightedMean;
    });

    const grandMean = totalWeight > 0 ? parseFloat((totalWeightedMean / totalWeight).toFixed(2)) : 0;

    setValue('accreditation.ratingsSummary.overallTotalWeight', totalWeight);
    setValue('accreditation.ratingsSummary.overallTotalWeightedMean', parseFloat(totalWeightedMean.toFixed(2)));
    setValue('accreditation.ratingsSummary.grandMean', grandMean);

  }, [existingAreas, setValue]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Accreditation Status
            </CardTitle>
            <CardDescription>Current program standing and timeline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={control}
              name="accreditation.level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accreditation Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {accreditationLevels.map(lvl => <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 pt-2">
                <FormField
                    control={control}
                    name="accreditation.dateOfSurvey"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Date of Survey</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} placeholder="e.g., Oct 12-14, 2024" disabled={!canEdit} /></FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="accreditation.dateOfAward"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Date of Award</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} placeholder="e.g., Dec 20, 2024" disabled={!canEdit} /></FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="accreditation.statusValidityDate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Status Validity Date</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} placeholder="e.g., Dec 20, 2028" disabled={!canEdit} /></FormControl>
                        <FormDescription className="text-[10px]">Date until when the current status is valid.</FormDescription>
                        </FormItem>
                    )}
                />
            </div>

            <FormField
              control={control}
              name="accreditation.certificateLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certificate Link (PDF)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input {...field} value={field.value || ''} placeholder="https://drive.google.com/..." className="pl-9" disabled={!canEdit} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Evaluation Schedule & Leadership
            </CardTitle>
            <CardDescription>Accreditation planning and overall task force management.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={control}
                    name="accreditation.nextSchedule"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Next Evaluation Schedule</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} placeholder="e.g., September 2028" disabled={!canEdit} /></FormControl>
                        <FormDescription className="text-[10px]">Planned month/year for the upcoming survey visit.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="accreditation.overallTaskForceHead"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2">
                            <UserCircle className="h-4 w-4 text-primary" />
                            Overall Task Force Head
                        </FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} placeholder="Name of Overall Head" disabled={!canEdit} /></FormControl>
                        <FormDescription className="text-[10px]">Primary lead for the accreditation preparations.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <FormField
              control={control}
              name="accreditation.taskForce"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    General Task Force Members
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                        {...field} 
                        value={field.value || ''}
                        placeholder="List other key members involved in the overall preparation..." 
                        rows={3}
                        disabled={!canEdit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>

      {/* Summary of Ratings Section */}
      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5 border-b py-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2 uppercase tracking-tighter">
                        <Calculator className="h-5 w-5 text-primary" />
                        Summary of Ratings
                    </CardTitle>
                    <CardDescription>Official scores derived from the accreditation survey instrument.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-white font-black text-[10px] uppercase">Official Results</Badge>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="overflow-x-auto rounded-lg border bg-background">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-black text-[10px] uppercase tracking-wider py-2">Area of Evaluation</TableHead>
                            <TableHead className="text-center font-black text-[10px] uppercase tracking-wider py-2 w-[100px]">Weight</TableHead>
                            <TableHead className="text-center font-black text-[10px] uppercase tracking-wider py-2 w-[100px]">Mean</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase tracking-wider py-2 w-[120px]">Weighted Mean</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {existingAreas?.map((area: any, index: number) => (
                            <TableRow key={area.areaCode} className="hover:bg-muted/10 group">
                                <TableCell className="py-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="h-5 text-[9px] font-bold shrink-0">{area.areaCode}</Badge>
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{area.areaName}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <FormField
                                        control={control}
                                        name={`accreditation.areas.${index}.weight`}
                                        render={({ field }) => (
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    step="0.01"
                                                    {...field} 
                                                    className="h-8 text-xs font-bold text-center bg-muted/5 group-hover:bg-white transition-colors" 
                                                    disabled={!canEdit || area.areaCode === 'Area I'} 
                                                />
                                            </FormControl>
                                        )}
                                    />
                                </TableCell>
                                <TableCell className="text-center">
                                    <FormField
                                        control={control}
                                        name={`accreditation.areas.${index}.mean`}
                                        render={({ field }) => (
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    step="0.01"
                                                    {...field} 
                                                    className="h-8 text-xs font-bold text-center bg-muted/5 group-hover:bg-white transition-colors" 
                                                    disabled={!canEdit} 
                                                />
                                            </FormControl>
                                        )}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="text-sm font-black tabular-nums text-primary pr-2">
                                        {area.weightedMean || '---'}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="bg-muted/30 font-black">
                            <TableCell className="text-[10px] uppercase tracking-widest text-right pr-4">Overall Totals</TableCell>
                            <TableCell className="text-center">
                                <div className="text-sm font-black tabular-nums text-slate-900 border-t-2 border-slate-900 pt-1">
                                    {watch('accreditation.ratingsSummary.overallTotalWeight') || 0}
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <div className="text-[9px] text-muted-foreground pt-1 opacity-50">---</div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="text-sm font-black tabular-nums text-primary border-t-2 border-primary pt-1 pr-2">
                                    {watch('accreditation.ratingsSummary.overallTotalWeightedMean') || 0}
                                </div>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-inner bg-slate-50 border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Institutional Grand Mean</p>
                                <div className="text-4xl font-black text-primary tabular-nums tracking-tighter">
                                    {watch('accreditation.ratingsSummary.grandMean') || '0.00'}
                                </div>
                            </div>
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <TrendingUp className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-inner bg-slate-50 border-slate-200">
                    <CardContent className="p-6">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Descriptive Rating</p>
                            <FormField
                                control={control}
                                name="accreditation.ratingsSummary.descriptiveRating"
                                render={({ field }) => (
                                    <FormControl>
                                        <Input 
                                            {...field} 
                                            value={field.value || ''} 
                                            placeholder="e.g., Very Satisfactory" 
                                            className="h-12 text-lg font-black uppercase tracking-tight bg-white border-slate-300"
                                            disabled={!canEdit}
                                        />
                                    </FormControl>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </CardContent>
      </Card>

      {/* Dynamic Areas of Documentation */}
      {(isPSVToLevel2 || isLevel3Or4) && (
        <Card className="border-primary/20">
            <CardHeader className="bg-primary/5 border-b py-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Documentation Context & Responsibilities
                        </CardTitle>
                        <CardDescription>
                            {isPSVToLevel2 ? 'Standard 10 Areas for PSV to Level II' : 'Mandatory & Selected Areas for Level III / IV'}
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white">
                        {isPSVToLevel2 ? '10 Areas Required' : 'Strategic Selection'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                    {watch('accreditation.areas')?.map((area: any, index: number) => {
                        const isMandatory = isLevel3Or4 && (area.areaName === 'Instruction' || area.areaName === 'Extension');
                        return (
                            <div key={area.areaCode} className="space-y-4 p-5 rounded-lg border bg-muted/5 relative group transition-all hover:border-primary/30 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="h-5 text-[10px] font-bold">{area.areaCode}</Badge>
                                        <span className="text-sm font-black uppercase tracking-tight">{area.areaName}</span>
                                    </div>
                                    {isMandatory && (
                                        <Badge variant="default" className="h-4 text-[8px] bg-green-600">MANDATORY</Badge>
                                    )}
                                </div>
                                
                                <div className="space-y-3">
                                    <FormField
                                        control={control}
                                        name={`accreditation.areas.${index}.taskForce`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                                    <Users className="h-3 w-3" /> Area Task Force / Head
                                                </FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        {...field} 
                                                        value={field.value || ''}
                                                        placeholder="Assigned person(s) for this area" 
                                                        className="h-8 text-xs bg-background" 
                                                        disabled={!canEdit} 
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name={`accreditation.areas.${index}.googleDriveLink`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                                    <LinkIcon className="h-3 w-3" /> Documentation Link
                                                </FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        {...field} 
                                                        value={field.value || ''}
                                                        placeholder="GDrive Folder/File Link" 
                                                        className="h-8 text-xs bg-background" 
                                                        disabled={!canEdit} 
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {isLevel3Or4 && (
                    <div className="mt-8 p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-blue-900">Level III/IV Requirement Guide</p>
                            <p className="text-[10px] text-blue-800/70 leading-relaxed">
                                Ensure links and task force assignments are provided for the Mandatory Areas (Instruction and Extension). Additionally, documentation for at least two (2) Other Areas (Research, Licensure, Faculty Dev, or Linkages) must be present.
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      )}
    </div>
  );
}
