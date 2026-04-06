'use client';

import { Calendar, Clock, ClipboardList, Info } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AuditSchedule } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * UNIT AUDIT SCHEDULE COMPONENT
 * Displays upcoming IQA sessions for the user's unit or campus.
 * Per requirement: Auditor name is NOT displayed.
 * Constrained to ~10 lines with scrollable area for dashboard cleanliness.
 */
export function UnitAuditSchedule({ schedules, isLoading }: { schedules: AuditSchedule[] | null, isLoading: boolean }) {
  if (isLoading) return <Skeleton className="h-32 w-full rounded-2xl" />;
  if (!schedules || schedules.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-md animate-in slide-in-from-top-4 duration-500 overflow-hidden">
      <CardHeader className="pb-3 bg-primary/10 border-b">
        <CardTitle className="text-sm font-black uppercase text-primary flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Active IQA Itinerary Entries
        </CardTitle>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
          Official internal quality audit sessions for your scope.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[450px]">
            <div className="divide-y divide-primary/10 bg-white/50">
                {schedules.map(schedule => {
                    const date = schedule.scheduledDate instanceof Timestamp ? schedule.scheduledDate.toDate() : new Date(schedule.scheduledDate);
                    return (
                        <div key={schedule.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white transition-colors gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-white border border-primary/10 text-primary shrink-0 shadow-sm">
                                    <span className="text-[9px] font-black uppercase leading-none mb-0.5">{format(date, 'MMM')}</span>
                                    <span className="text-lg font-black leading-none">{format(date, 'dd')}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-900 uppercase truncate" title={schedule.targetName}>{schedule.targetName}</p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                                            <Clock className="h-3 w-3 text-primary/60" />
                                            {format(date, 'hh:mm a')}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium italic truncate max-w-[250px]">
                                            <ClipboardList className="h-3 w-3 text-primary/40" />
                                            {schedule.procedureDescription}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <Badge className={cn(
                                    "h-5 text-[9px] font-black uppercase border-none px-3 shadow-sm",
                                    schedule.status === 'In Progress' ? "bg-blue-600 text-white animate-pulse" : "bg-amber-50 text-amber-950"
                                )}>
                                    {schedule.status}
                                </Badge>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="bg-muted/5 border-t py-3 px-6">
          <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[9px] text-muted-foreground italic leading-tight">
                  <strong>Auditee Preparation:</strong> Ensure all evidence logs and registered forms are accessible for verification. Refer to the <strong>Evidence Log Sheet</strong> instructions in the full Audit Hub for standard requirements.
              </p>
          </div>
      </CardFooter>
    </Card>
  );
}
