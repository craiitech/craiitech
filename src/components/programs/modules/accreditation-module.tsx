
'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Calendar, Link as LinkIcon, Award, Users, FileText, CheckCircle2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

const accreditationLevels = [
  "Non Accredited",
  "Preliminary Survey Visit (PSV)",
  "Level I Accredited",
  "Level II Accredited",
  "Level III Accredited",
  "Level III - Phase 1 Accredited",
  "Level III - Phase 2 Accredited",
  "Level IV Accredited",
  "Level IV - Phase 1 Accredited",
  "Level IV - Phase 2 Accredited",
];

const standardAreas = [
  { code: 'Area I', name: 'Mission, Vision, Goals, and Objectives' },
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

  const isLevel3Or4 = useMemo(() => {
    return selectedLevel?.includes('Level III') || selectedLevel?.includes('Level IV');
  }, [selectedLevel]);

  const isPSVToLevel2 = useMemo(() => {
    return selectedLevel === 'Preliminary Survey Visit (PSV)' || 
           selectedLevel === 'Level I Accredited' || 
           selectedLevel === 'Level II Accredited';
  }, [selectedLevel]);

  // Synchronize area fields when level changes
  useEffect(() => {
    if (isPSVToLevel2) {
      const currentAreas = standardAreas.map(area => ({
        areaCode: area.code,
        areaName: area.name,
        googleDriveLink: ''
      }));
      setValue('accreditation.areas', currentAreas);
    } else if (isLevel3Or4) {
      const mandatory = level34MandatoryAreas.map(area => ({
        areaCode: area.code,
        areaName: area.name,
        googleDriveLink: ''
      }));
      const optional = level34OptionalAreas.map(area => ({
        areaCode: area.code,
        areaName: area.name,
        googleDriveLink: ''
      }));
      setValue('accreditation.areas', [...mandatory, ...optional]);
    } else {
      setValue('accreditation.areas', []);
    }
  }, [isPSVToLevel2, isLevel3Or4, setValue]);

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
                    name="accreditation.dateOfVisit"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Date of Visit</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g., Oct 12-14, 2024" disabled={!canEdit} /></FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="accreditation.dateOfAward"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Date of Award</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g., Dec 20, 2024" disabled={!canEdit} /></FormControl>
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
                      <Input {...field} placeholder="https://drive.google.com/..." className="pl-9" disabled={!canEdit} />
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
              Evaluation Schedule & Task Force
            </CardTitle>
            <CardDescription>Preparedness for the next accreditation cycle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={control}
              name="accreditation.nextSchedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Evaluation Schedule</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., September 2028" disabled={!canEdit} /></FormControl>
                  <FormDescription className="text-[10px]">Planned month/year for the upcoming survey visit.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={control}
              name="accreditation.taskForce"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Accreditation Task Force
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                        {...field} 
                        placeholder="List members of the Task Force or committees involved..." 
                        rows={4}
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

      {/* Dynamic Areas of Documentation */}
      {(isPSVToLevel2 || isLevel3Or4) && (
        <Card className="border-primary/20">
            <CardHeader className="bg-primary/5 border-b py-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Areas of Documentation
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {watch('accreditation.areas')?.map((area: any, index: number) => {
                        const isMandatory = isLevel3Or4 && (area.areaName === 'Instruction' || area.areaName === 'Extension');
                        return (
                            <div key={area.areaCode} className="space-y-2 p-4 rounded-lg border bg-muted/5 relative group transition-all hover:border-primary/30">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="h-5 text-[10px] font-bold">{area.areaCode}</Badge>
                                        <span className="text-xs font-black uppercase tracking-tight">{area.areaName}</span>
                                    </div>
                                    {isMandatory && (
                                        <Badge variant="default" className="h-4 text-[8px] bg-green-600">MANDATORY</Badge>
                                    )}
                                </div>
                                <FormField
                                    control={control}
                                    name={`accreditation.areas.${index}.googleDriveLink`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                    <Input 
                                                        {...field} 
                                                        placeholder="GDrive Folder/File Link" 
                                                        className="h-9 text-xs pl-8 bg-background" 
                                                        disabled={!canEdit} 
                                                    />
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        );
                    })}
                </div>
                
                {isLevel3Or4 && (
                    <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-blue-900">Level III/IV Requirement Guide</p>
                            <p className="text-[10px] text-blue-800/70 leading-relaxed">
                                Ensure links are provided for the Mandatory Areas (Instruction and Extension). Additionally, documentation for at least two (2) Other Areas (Research, Licensure, Faculty Dev, or Linkages) must be present.
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
