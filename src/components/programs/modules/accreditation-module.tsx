'use client';

import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    ShieldCheck, 
    Calendar, 
    Link as LinkIcon, 
    Award, 
    Layers, 
    PlusCircle, 
    Trash2, 
    Calculator, 
    Check, 
    ClipboardList, 
    CheckCircle2, 
    ListChecks, 
    Building2,
    Eye,
    ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Unit } from '@/lib/types';
import { MultiSelector } from '@/components/qa-reports/multi-selector';

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

function GDrivePreview({ url, title }: { url?: string; title: string }) {
  if (!url || !url.startsWith('https://drive.google.com/')) return null;
  const embedUrl = url.replace('/view', '/preview').replace('?usp=sharing', '');
  return (
    <Card className="col-span-full border-primary/10 shadow-md overflow-hidden bg-muted/5 animate-in fade-in slide-in-from-top-4 duration-500">
      <CardHeader className="py-3 px-4 border-b bg-white flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">
            Document Evidence Preview: {title}
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </CardHeader>
      <CardContent className="p-0 relative aspect-video bg-white shadow-inner">
        <iframe 
          src={embedUrl} 
          className="absolute inset-0 w-full h-full border-none"
          allow="autoplay"
          title={`${title} Preview`}
        />
      </CardContent>
    </Card>
  );
}

function AccreditationRecordCard({ 
  index, 
  control,
  canEdit, 
  onRemove, 
  programSpecializations,
  units
}: { 
  index: number; 
  control: any;
  canEdit: boolean; 
  onRemove: () => void, 
  programSpecializations?: { id: string, name: string }[],
  units: Unit[]
}) {
    const { setValue } = useFormContext();
    
    const selectedComponents = useWatch({ control, name: `accreditationRecords.${index}.components` }) || [];
    const areas = useWatch({ control, name: `accreditationRecords.${index}.areas` }) || [];
    const certificateLinkVal = useWatch({ control, name: `accreditationRecords.${index}.certificateLink` });
    const validityTextVal = useWatch({ control, name: `accreditationRecords.${index}.statusValidityDate` });
    const currentLevel = useWatch({ control, name: `accreditationRecords.${index}.level` });

    const { fields: recoFields, append: appendReco, remove: removeReco } = useFieldArray({
        control,
        name: `accreditationRecords.${index}.recommendations`
    });

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

    const unitOptions = units.map(u => ({ id: u.id, name: u.name }));

    return (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <Badge variant="secondary" className="px-4 py-1 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
                    Milestone Record #{index + 1}
                </Badge>
                {canEdit && (
                    <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:bg-destructive/10 h-7 text-[10px] font-bold uppercase">
                        <Trash2 className="h-3 w-3 mr-1.5" /> Remove Milestone
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
                                <FormDescription className="text-[9px]">Enter the official accreditation schedule or validity text.</FormDescription>
                            </FormItem>
                        )} />

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

                <GDrivePreview url={certificateLinkVal} title={`${currentLevel} Evidence`} />

                <Card className="col-span-full border-primary/10 shadow-lg overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b py-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-sm uppercase font-black text-slate-900">
                                <ClipboardList className="h-5 w-5 text-primary" />
                                Accreditor's Recommendations & Compliance Status
                            </CardTitle>
                            {canEdit && (
                                <div className="flex gap-2">
                                    <Button type="button" size="sm" onClick={() => appendReco({ id: Math.random().toString(36).substr(2, 9), type: 'Mandatory', text: '', assignedUnitIds: [], status: 'Open' })} className="h-8 text-[9px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700">
                                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Mandatory
                                    </Button>
                                    <Button type="button" size="sm" onClick={() => appendReco({ id: Math.random().toString(36).substr(2, 9), type: 'Enhancement', text: '', assignedUnitIds: [], status: 'Open' })} className="h-8 text-[9px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700">
                                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Enhancement / Recommendations
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            {recoFields.map((reco, recoIdx) => {
                                const type = recoFields[recoIdx].type;
                                return (
                                    <div key={reco.id} className={cn(
                                        "p-5 rounded-2xl border transition-all relative group",
                                        type === 'Mandatory' ? "bg-rose-50/30 border-rose-100" : "bg-blue-50/30 border-blue-100"
                                    )}>
                                        {canEdit && (
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute top-2 right-2 text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" 
                                                onClick={() => removeReco(recoIdx)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                            <div className="md:col-span-7 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <Badge className={cn("text-[8px] font-black uppercase h-4 px-1.5 border-none", type === 'Mandatory' ? "bg-rose-600" : "bg-blue-600")}>
                                                        {type === 'Mandatory' ? 'REQUIREMENT' : 'ENHANCEMENT'}
                                                    </Badge>
                                                    <FormField control={control} name={`accreditationRecords.${index}.recommendations.${recoIdx}.status`} render={({ field: inputField }) => (
                                                        <Select onValueChange={inputField.onChange} value={inputField.value} disabled={!canEdit}>
                                                            <FormControl><SelectTrigger className="h-6 w-32 text-[9px] font-bold bg-white"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="Open">Open</SelectItem>
                                                                <SelectItem value="In Progress">In Progress</SelectItem>
                                                                <SelectItem value="Closed">Closed / Complied</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )} />
                                                </div>
                                                <FormField control={control} name={`accreditationRecords.${index}.recommendations.${recoIdx}.text`} render={({ field: inputField }) => (
                                                    <FormItem>
                                                        <FormControl><Textarea {...inputField} rows={3} placeholder="Enter the recommendation text here..." className="bg-white border-transparent shadow-sm text-xs font-medium leading-relaxed" disabled={!canEdit} /></FormControl>
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <div className="md:col-span-5 space-y-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                                                        <Building2 className="h-3 w-3" />
                                                        Assigned Responsibility (Offices)
                                                    </Label>
                                                    <FormField control={control} name={`accreditationRecords.${index}.recommendations.${recoIdx}.assignedUnitIds`} render={({ field: inputField }) => (
                                                        <MultiSelector 
                                                            items={unitOptions}
                                                            selectedIds={inputField.value || []}
                                                            onSelect={inputField.onChange}
                                                            placeholder="Search units..."
                                                            label="Select Responsible Units"
                                                        />
                                                    )} />
                                                </div>
                                                <FormField control={control} name={`accreditationRecords.${index}.recommendations.${recoIdx}.additionalInfo`} render={({ field: inputField }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Additional Action Notes / Area of Accreditation</FormLabel>
                                                        <FormControl><Input {...inputField} value={inputField.value || ''} placeholder="Internal tracking notes..." className="h-8 text-[10px] bg-white" disabled={!canEdit} /></FormControl>
                                                    </FormItem>
                                                )} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {recoFields.length === 0 && (
                                <div className="py-12 border border-dashed rounded-2xl flex flex-col items-center justify-center text-center opacity-20 bg-muted/5">
                                    <ListChecks className="h-10 w-10 text-muted-foreground" />
                                    <p className="text-xs font-black uppercase mt-2">No Recommendations Logged</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export function AccreditationModule({ canEdit, programSpecializations }: { canEdit: boolean, programSpecializations?: { id: string, name: string }[] }) {
  const firestore = useFirestore();
  const { control } = useFormContext();
  
  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

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
                    recommendations: [],
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
                units={units || []}
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
