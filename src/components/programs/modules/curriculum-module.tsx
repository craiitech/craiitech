
'use client';

import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { BookOpen, Calendar, Link as LinkIcon, GraduationCap } from 'lucide-react';

export function CurriculumModule({ canEdit }: { canEdit: boolean }) {
  const { control } = useFormContext();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Curriculum Status
          </CardTitle>
          <CardDescription>Revision history and CHED alignment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={control}
              name="curriculum.revisionNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revision #</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., 2024-Rev01" disabled={!canEdit} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="curriculum.dateImplemented"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Implementation Date</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., 1st Sem 2024" disabled={!canEdit} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
            <div className="space-y-0.5">
              <FormLabel>Officially Noted by CHED</FormLabel>
              <FormDescription className="text-[10px]">Verification that CHED has acknowledged the curriculum revision.</FormDescription>
            </div>
            <FormField
              control={control}
              name="curriculum.isNotedByChed"
              render={({ field }) => (
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} /></FormControl>
              )}
            />
          </div>

          <FormField
            control={control}
            name="curriculum.cmoLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GDrive Link: Program CMO (PDF)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input {...field} placeholder="https://drive.google.com/..." className="pl-9" disabled={!canEdit} />
                  </div>
                </FormControl>
                <FormDescription className="text-[10px]">Official CHED Memorandum Order for this program.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Student Statistics
          </CardTitle>
          <CardDescription>Enrollment and graduation data for the academic year.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={control}
              name="stats.enrollment.firstYear"
              render={({ field }) => (<FormItem><FormLabel>1st Year</FormLabel><FormControl><Input type="number" {...field} disabled={!canEdit} /></FormControl></FormItem>)}
            />
            <FormField
              control={control}
              name="stats.enrollment.secondYear"
              render={({ field }) => (<FormItem><FormLabel>2nd Year</FormLabel><FormControl><Input type="number" {...field} disabled={!canEdit} /></FormControl></FormItem>)}
            />
            <FormField
              control={control}
              name="stats.enrollment.thirdYear"
              render={({ field }) => (<FormItem><FormLabel>3rd Year</FormLabel><FormControl><Input type="number" {...field} disabled={!canEdit} /></FormControl></FormItem>)}
            />
            <FormField
              control={control}
              name="stats.enrollment.fourthYear"
              render={({ field }) => (<FormItem><FormLabel>4th Year</FormLabel><FormControl><Input type="number" {...field} disabled={!canEdit} /></FormControl></FormItem>)}
            />
          </div>
          <FormField
            control={control}
            name="stats.graduationCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-primary font-bold">Total Graduates for this Academic Year</FormLabel>
                <FormControl><Input type="number" {...field} className="border-primary/50 text-lg font-bold" disabled={!canEdit} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
