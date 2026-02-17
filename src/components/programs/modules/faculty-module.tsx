
'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { User, UserPlus, Trash2, ShieldCheck, Info, UserCircle2, UserCheck, GraduationCap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

const academicRanks = {
  nonPermanent: [
    "Lecturer 1",
    "Lecturer 2",
    "Lecturer 3",
    "Lecturer 4",
    "Contract of Service",
    "Part-Timer"
  ],
  permanent: [
    "Instructor 1",
    "Instructor 2",
    "Instructor 3",
    "Assistant Professor 1",
    "Assistant Professor 2",
    "Assistant Professor 3",
    "Assistant Professor 4",
    "Associate Professor 1",
    "Associate Professor 2",
    "Associate Professor 3",
    "Associate Professor 4",
    "Associate Professor 5",
    "Professor 1",
    "Professor 2",
    "Professor 3",
    "Professor 4",
    "Professor 5",
    "Professor 6",
    "University Professor"
  ]
};

export function FacultyModule({ canEdit }: { canEdit: boolean }) {
  const { control, watch } = useFormContext();
  const hasAssociateDean = watch('faculty.hasAssociateDean');

  const { fields, append, remove } = useFieldArray({
    control,
    name: "faculty.members"
  });

  const FacultyForm = ({ prefix, label, desc, icon }: { prefix: string, label: string, desc: string, icon?: React.ReactNode }) => (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 rounded-lg border bg-card shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
      <div className="md:col-span-5 border-b pb-2">
        <p className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          {icon || <UserCircle2 className="h-4 w-4 text-primary" />} {label}
        </p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <FormField control={control} name={`${prefix}.name`} render={({ field }) => (
        <FormItem><FormLabel className="text-[10px] uppercase font-bold">Full Name</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="e.g., Dr. Jane Doe" className="h-8 text-xs" disabled={!canEdit} /></FormControl></FormItem>
      )} />
      <FormField control={control} name={`${prefix}.sex`} render={({ field }) => (
        <FormItem><FormLabel className="text-[10px] uppercase font-bold">Sex</FormLabel>
          <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
            <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      )} />
      <FormField control={control} name={`${prefix}.academicRank`} render={({ field }) => (
        <FormItem><FormLabel className="text-[10px] uppercase font-bold">Academic Rank</FormLabel>
          <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
            <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Rank" /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Non-Permanent</SelectLabel>
                {academicRanks.nonPermanent.map(rank => <SelectItem key={rank} value={rank}>{rank}</SelectItem>)}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Permanent</SelectLabel>
                {academicRanks.permanent.map(rank => <SelectItem key={rank} value={rank}>{rank}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormItem>
      )} />
      <FormField control={control} name={`${prefix}.highestEducation`} render={({ field }) => (
        <FormItem><FormLabel className="text-[10px] uppercase font-bold">Highest Degree</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="e.g., PhD in CS" className="h-8 text-xs" disabled={!canEdit} /></FormControl></FormItem>
      )} />
      <FormField control={control} name={`${prefix}.isAlignedWithCMO`} render={({ field }) => (
        <FormItem><FormLabel className="text-[10px] uppercase font-bold">CMO Alignment</FormLabel>
          <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
            <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="Aligned">Aligned</SelectItem>
              <SelectItem value="Not Aligned">Not Aligned</SelectItem>
              <SelectItem value="N/A">Not Applicable</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      )} />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <FacultyForm prefix="faculty.dean" label="Dean / Director" desc="Top academic officer responsible for the college/institute." />
        
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
            <div className="space-y-0.5">
                <FormLabel className="text-sm font-bold">Presence of Associate Dean</FormLabel>
                <FormDescription className="text-[10px]">Enable this if your unit has an officially designated Associate Dean.</FormDescription>
            </div>
            <FormField
                control={control}
                name="faculty.hasAssociateDean"
                render={({ field }) => (
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} /></FormControl>
                )}
            />
        </div>

        {hasAssociateDean && (
            <FacultyForm 
                prefix="faculty.associateDean" 
                label="Associate Dean" 
                desc="Assists the Dean in academic and administrative governance." 
                icon={<UserCheck className="h-4 w-4 text-primary" />}
            />
        )}

        <FacultyForm prefix="faculty.programChair" label="Program Chair" desc="Officer directly responsible for this specific academic program." />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between bg-muted/20">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Program Faculty Registry
            </CardTitle>
            <CardDescription>Register and categorize all faculty members teaching in this program.</CardDescription>
          </div>
          {canEdit && (
            <Button type="button" size="sm" onClick={() => append({ id: Math.random().toString(36).substr(2, 9), name: '', sex: 'Female', highestEducation: '', academicRank: 'Instructor 1', category: 'Core', isAlignedWithCMO: 'Aligned' })}>
              Add Faculty Member
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-7 gap-3 p-4 rounded-lg border bg-muted/5 items-end transition-colors hover:bg-muted/10 shadow-sm relative group">
                <FormField control={control} name={`faculty.members.${index}.name`} render={({ field }) => (
                  <FormItem className="md:col-span-1"><FormLabel className="text-[9px] uppercase font-bold">Name</FormLabel><FormControl><Input {...field} className="h-8 text-xs bg-background" disabled={!canEdit} /></FormControl></FormItem>
                )} />
                <FormField control={control} name={`faculty.members.${index}.sex`} render={({ field }) => (
                  <FormItem><FormLabel className="text-[9px] uppercase font-bold">Sex</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                      <FormControl><SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={control} name={`faculty.members.${index}.academicRank`} render={({ field }) => (
                  <FormItem className="md:col-span-1"><FormLabel className="text-[9px] uppercase font-bold">Rank</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                      <FormControl><SelectTrigger className="h-8 text-xs bg-background px-2"><SelectValue placeholder="Rank" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Non-Permanent</SelectLabel>
                          {academicRanks.nonPermanent.map(rank => <SelectItem key={rank} value={rank}>{rank}</SelectItem>)}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Permanent</SelectLabel>
                          {academicRanks.permanent.map(rank => <SelectItem key={rank} value={rank}>{rank}</SelectItem>)}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={control} name={`faculty.members.${index}.highestEducation`} render={({ field }) => (
                  <FormItem className="md:col-span-1"><FormLabel className="text-[9px] uppercase font-bold">Degree</FormLabel><FormControl><Input {...field} className="h-8 text-xs bg-background" disabled={!canEdit} /></FormControl></FormItem>
                )} />
                <FormField control={control} name={`faculty.members.${index}.category`} render={({ field }) => (
                  <FormItem><FormLabel className="text-[9px] uppercase font-bold">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                      <FormControl><SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Core">Core Faculty</SelectItem>
                        <SelectItem value="Professional Special">Professional Special</SelectItem>
                        <SelectItem value="General Education">General Education</SelectItem>
                        <SelectItem value="Staff">Support Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={control} name={`faculty.members.${index}.isAlignedWithCMO`} render={({ field }) => (
                  <FormItem><FormLabel className="text-[9px] uppercase font-bold">Alignment</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                      <FormControl><SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Aligned">Aligned</SelectItem>
                        <SelectItem value="Not Aligned">Not Aligned</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <div className="flex justify-end h-10 items-center">
                  {canEdit && (
                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {fields.length === 0 && (
              <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground text-sm">
                No additional faculty members registered yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-xs font-bold uppercase tracking-widest">CMO Compliance Requirement</AlertTitle>
        <AlertDescription className="text-[10px] leading-relaxed">
          As per CHED Memorandum Orders, Core and Professional Special faculty must have advanced degrees (Masters or Doctorate) in fields directly related to the program curriculum.
        </AlertDescription>
      </Alert>
    </div>
  );
}
