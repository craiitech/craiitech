
'use client';

import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Calendar, Link as LinkIcon, Award } from 'lucide-react';

export function AccreditationModule({ canEdit }: { canEdit: boolean }) {
  const { control } = useFormContext();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Accreditation Level
          </CardTitle>
          <CardDescription>Current program standing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={control}
            name="accreditation.level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Accreditation Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Not Accredited">Not Accredited</SelectItem>
                    <SelectItem value="Candidate Status">Candidate Status</SelectItem>
                    <SelectItem value="Level I">Level I Accredited</SelectItem>
                    <SelectItem value="Level II">Level II Re-accredited</SelectItem>
                    <SelectItem value="Level III">Level III Re-accredited</SelectItem>
                    <SelectItem value="Level IV">Level IV Re-accredited</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="accreditation.certificateLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GDrive Link: Certificate (PDF)</FormLabel>
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
            Accreditation Schedule
          </CardTitle>
          <CardDescription>Validity dates and upcoming evaluation cycles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={control}
              name="accreditation.dateOfAward"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Award</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., Oct 2024" disabled={!canEdit} /></FormControl>
                  <FormDescription className="text-[10px]">When the current level was granted.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="accreditation.nextSchedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Evaluation Schedule</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., Sept 2028" disabled={!canEdit} /></FormControl>
                  <FormDescription className="text-[10px]">Planned date for the next accreditation visit.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="p-6 rounded-lg border border-dashed bg-muted/10 flex flex-col items-center justify-center text-center">
            <ShieldCheck className="h-12 w-12 text-primary/20 mb-2" />
            <p className="text-sm font-semibold">Accreditation Quality Assurance</p>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Maintaining high accreditation levels demonstrates the program's commitment to academic excellence and standardized educational management.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
