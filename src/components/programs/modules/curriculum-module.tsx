
'use client';

import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { BookOpen, Link as LinkIcon, GraduationCap, HeartHandshake, Layers } from 'lucide-react';
import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function CurriculumModule({ canEdit }: { canEdit: boolean }) {
  const { control, watch, setValue } = useFormContext();

  const enrollment = watch('stats.enrollment');

  // Auto-calculate totals for each year level in all terms
  useEffect(() => {
    const terms = ['firstSemester', 'secondSemester', 'midYearTerm'];
    const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'];
    
    terms.forEach(term => {
        levels.forEach(level => {
            const male = Number(enrollment?.[term]?.[level]?.male) || 0;
            const female = Number(enrollment?.[term]?.[level]?.female) || 0;
            const total = male + female;
            if (enrollment?.[term]?.[level] && enrollment[term][level].total !== total) {
                setValue(`stats.enrollment.${term}.${level}.total`, total);
            }
        });
    });
  }, [enrollment, setValue]);

  const renderEnrollmentSection = (termKey: string) => (
    <div className="space-y-4 pt-4">
        {['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].map((level, idx) => (
            <div key={`${termKey}-${level}`} className="space-y-3 p-4 rounded-lg border bg-muted/5 relative">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary">{idx + 1}{idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} Year Registry</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <FormField
                        control={control}
                        name={`stats.enrollment.${termKey}.${level}.male`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Male</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-8 text-xs bg-background" disabled={!canEdit} /></FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`stats.enrollment.${termKey}.${level}.female`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Female</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-8 text-xs bg-background" disabled={!canEdit} /></FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`stats.enrollment.${termKey}.${level}.specialNeeds`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[9px] uppercase font-bold text-primary flex items-center gap-1">
                                    <HeartHandshake className="h-2.5 w-2.5" />
                                    Sp. Needs
                                </FormLabel>
                                <FormControl><Input type="number" {...field} className="h-8 text-xs bg-primary/5 border-primary/20" disabled={!canEdit} /></FormControl>
                            </FormItem>
                        )}
                    />
                    <FormItem>
                        <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Total</FormLabel>
                        <FormControl><Input type="number" value={enrollment?.[termKey]?.[level]?.total || 0} className="h-8 text-xs font-black bg-muted/20 text-center" disabled /></FormControl>
                    </FormItem>
                </div>
            </div>
        ))}
    </div>
  );

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
            Student Statistics Breakdown
          </CardTitle>
          <CardDescription>Sex-disaggregated enrollment and special needs tracking by semester.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="firstSemester" className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-9 p-1 bg-muted">
                <TabsTrigger value="firstSemester" className="text-[10px] font-black uppercase tracking-wider">1st Sem</TabsTrigger>
                <TabsTrigger value="secondSemester" className="text-[10px] font-black uppercase tracking-wider">2nd Sem</TabsTrigger>
                <TabsTrigger value="midYearTerm" className="text-[10px] font-black uppercase tracking-wider">Summer</TabsTrigger>
            </TabsList>
            <TabsContent value="firstSemester">{renderEnrollmentSection('firstSemester')}</TabsContent>
            <TabsContent value="secondSemester">{renderEnrollmentSection('secondSemester')}</TabsContent>
            <TabsContent value="midYearTerm">{renderEnrollmentSection('midYearTerm')}</TabsContent>
          </Tabs>

          <div className="pt-4 border-t mt-4">
            <FormField
                control={control}
                name="stats.graduationCount"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-primary font-bold">Total Program Graduates (Current Year Target)</FormLabel>
                    <FormControl><Input type="number" {...field} className="border-primary/50 text-lg font-bold" disabled={!canEdit} /></FormControl>
                    <FormDescription className="text-[10px]">Overall expected graduate output for the academic year.</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
