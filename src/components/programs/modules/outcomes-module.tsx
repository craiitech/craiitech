
'use client';

import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { BarChart3, TrendingUp, Calendar, Users } from 'lucide-react';

export function OutcomesModule({ canEdit }: { canEdit: boolean }) {
  const { control } = useFormContext();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Board Examination Performance
          </CardTitle>
          <CardDescription>Professional licensure results for the academic year.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={control}
            name="boardPerformance.examDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Examination Date</FormLabel>
                <FormControl><Input {...field} placeholder="e.g., September 2024" disabled={!canEdit} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={control}
              name="boardPerformance.firstTakersPassRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Takers Passing Rate (%)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} disabled={!canEdit} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="boardPerformance.retakersPassRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retakers Passing Rate (%)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} disabled={!canEdit} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="boardPerformance.overallPassRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Passing Rate (%)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} className="font-bold" disabled={!canEdit} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="boardPerformance.nationalPassingRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>National Passing Rate (%)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} disabled={!canEdit} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Graduate Tracer Data
          </CardTitle>
          <CardDescription>Employability and career status of program graduates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={control}
              name="tracer.totalGraduates"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Graduates (Reference)</FormLabel>
                  <FormControl><Input type="number" {...field} disabled={!canEdit} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="tracer.tracedCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Graduates Traced</FormLabel>
                  <FormControl><Input type="number" {...field} disabled={!canEdit} /></FormControl>
                  <FormDescription className="text-[10px]">Total number of respondents in the tracer study.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="tracer.employmentRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment Rate (%)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} className="font-bold text-green-600" disabled={!canEdit} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="p-6 rounded-lg border bg-muted/30 flex flex-col items-center justify-center text-center">
            <Users className="h-10 w-10 text-primary/20 mb-2" />
            <p className="text-sm font-semibold">Post-Graduation Tracking</p>
            <p className="text-xs text-muted-foreground mt-1">
              Maintaining high tracer rates is a key indicator of program effectiveness and its impact on university career outcomes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
