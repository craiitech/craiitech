
'use client';

import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { BookOpen, Calendar, Link as LinkIcon, GraduationCap, Users } from 'lucide-react';
import { useEffect } from 'react';

export function CurriculumModule({ canEdit }: { canEdit: boolean }) {
  const { control, watch, setValue } = useFormContext();

  const enrollment = watch('stats.enrollment');

  // Auto-calculate totals for each year level
  useEffect(() => {
    const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear', 'fifthYear'];
    levels.forEach(level => {
        const male = Number(enrollment?.[level]?.male) || 0;
        const female = Number(enrollment?.[level]?.female) || 0;
        const total = male + female;
        if (enrollment?.[level] && enrollment[level].total !== total) {
            setValue(`stats.enrollment.${level}.total`, total);
        }
    });
  }, [enrollment, setValue]);

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
            Sex-Disaggregated Enrollment
          </CardTitle>
          <CardDescription>Student population breakdown per year level for the academic year.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].map((level, idx) => (
                <div key={level} className="space-y-2 p-3 rounded-lg border bg-muted/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{idx + 1}{idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} Year Enrollment</p>
                    <div className="grid grid-cols-3 gap-2">
                        <FormField
                            control={control}
                            name={`stats.enrollment.${level}.male`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Male</FormLabel>
                                    <FormControl><Input type="number" {...field} className="h-8 text-xs" disabled={!canEdit} /></FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name={`stats.enrollment.${level}.female`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Female</FormLabel>
                                    <FormControl><Input type="number" {...field} className="h-8 text-xs" disabled={!canEdit} /></FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name={`stats.enrollment.${level}.total`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Total</FormLabel>
                                    <FormControl><Input type="number" {...field} className="h-8 text-xs font-bold bg-muted/20" disabled /></FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            ))}
          </div>
          <FormField
            control={control}
            name="stats.graduationCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-primary font-bold">Total Program Graduates (Target/Current)</FormLabel>
                <FormControl><Input type="number" {...field} className="border-primary/50 text-lg font-bold" disabled={!canEdit} /></FormControl>
                <FormDescription className="text-[10px]">Overall output for the specified period.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
