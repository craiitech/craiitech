
'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { User, UserPlus, Trash2, ShieldCheck, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function FacultyModule({ canEdit }: { canEdit: boolean }) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "faculty.members"
  });

  const FacultyForm = ({ prefix, label, desc }: { prefix: string, label: string, desc: string }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border bg-card shadow-sm">
      <div className="md:col-span-3 border-b pb-2">
        <p className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> {label}
        </p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <FormField control={control} name={`${prefix}.name`} render={({ field }) => (
        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} placeholder="e.g., Dr. Jane Doe" disabled={!canEdit} /></FormControl></FormItem>
      )} />
      <FormField control={control} name={`${prefix}.highestEducation`} render={({ field }) => (
        <FormItem><FormLabel>Highest Degree</FormLabel><FormControl><Input {...field} placeholder="e.g., PhD in CS" disabled={!canEdit} /></FormControl></FormItem>
      )} />
      <FormField control={control} name={`${prefix}.isAlignedWithCMO`} render={({ field }) => (
        <FormItem><FormLabel>CMO Alignment</FormLabel>
          <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FacultyForm prefix="faculty.dean" label="Dean / Director" desc="Top academic officer responsible for the college/institute." />
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
            <Button type="button" size="sm" onClick={() => append({ id: Math.random().toString(36).substr(2, 9), name: '', highestEducation: '', category: 'Core', isAlignedWithCMO: 'Aligned' })}>
              Add Faculty Member
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 rounded-lg border bg-muted/5 items-end">
                <FormField control={control} name={`faculty.members.${index}.name`} render={({ field }) => (
                  <FormItem className="md:col-span-1"><FormLabel>Name</FormLabel><FormControl><Input {...field} disabled={!canEdit} /></FormControl></FormItem>
                )} />
                <FormField control={control} name={`faculty.members.${index}.highestEducation`} render={({ field }) => (
                  <FormItem className="md:col-span-1"><FormLabel>Highest Degree</FormLabel><FormControl><Input {...field} disabled={!canEdit} /></FormControl></FormItem>
                )} />
                <FormField control={control} name={`faculty.members.${index}.category`} render={({ field }) => (
                  <FormItem><FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                  <FormItem><FormLabel>CMO Alignment</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Aligned">Aligned</SelectItem>
                        <SelectItem value="Not Aligned">Not Aligned</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <div className="flex justify-end h-10 items-center">
                  {canEdit && (
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
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
