'use client';

import { useMemo, useState } from 'react';
import type { Unit, Submission, User as AppUser, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, AlertCircle, Send, Loader2, FileX, Info, School, CheckCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { TOTAL_REPORTS_PER_CYCLE } from '@/app/(dashboard)/dashboard/page';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UnitsWithoutSubmissionsProps {
  allUnits: Unit[] | null;
  allCampuses: Campus[] | null;
  allSubmissions: Submission[] | null;
  isLoading: boolean;
  userProfile: AppUser | null;
  isAdmin: boolean;
  isCampusSupervisor: boolean;
  onUnitClick: (unitId: string, campusId: string) => void;
  selectedYear: number;
}

export function UnitsWithoutSubmissions({
  allUnits,
  allCampuses,
  allSubmissions,
  isLoading,
  userProfile,
  isAdmin,
  isCampusSupervisor,
  onUnitClick,
  selectedYear,
}: UnitsWithoutSubmissionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);


  const incompleteSubmissionsByCampus = useMemo(() => {
    if (!allUnits || !allSubmissions || !allCampuses) {
      return [];
    }

    const unitsByCampus = allUnits.reduce((acc, unit) => {
      unit.campusIds?.forEach(campusId => {
        if (!acc[campusId]) {
          acc[campusId] = [];
        }
        acc[campusId].push(unit);
      });
      return acc;
    }, {} as Record<string, Unit[]>);
    
    let relevantCampuses = allCampuses;
    if (isCampusSupervisor && userProfile?.campusId) {
        relevantCampuses = allCampuses.filter(c => c.id === userProfile.campusId);
    }

    return relevantCampuses.map(campus => {
        const campusUnits = unitsByCampus[campus.id] || [];
        const incompleteUnits = campusUnits.map(unit => {
            const unitSubmissions = allSubmissions.filter(s => s.unitId === unit.id && s.campusId === campus.id && s.year === selectedYear);
            
            const firstCycleRegistry = unitSubmissions.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry');
            const requiredFirst = firstCycleRegistry?.riskRating === 'low' ? TOTAL_REPORTS_PER_CYCLE - 1 : TOTAL_REPORTS_PER_CYCLE;

            const finalCycleRegistry = unitSubmissions.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry');
            const requiredFinal = finalCycleRegistry?.riskRating === 'low' ? TOTAL_REPORTS_PER_CYCLE - 1 : TOTAL_REPORTS_PER_CYCLE;

            const totalRequired = requiredFirst + requiredFinal;

            const approvedSubmissions = new Set(
                unitSubmissions.filter(s => s.statusId === 'approved').map(s => `${s.reportType}-${s.cycleId}`)
            );
            
            return {
                id: unit.id,
                name: unit.name,
                count: approvedSubmissions.size,
                totalRequired: totalRequired
            };
        }).filter(unit => unit.count === 0); // Strictly zero approved
        
        return {
            campusId: campus.id,
            campusName: campus.name,
            incompleteUnits: incompleteUnits
        };
    }).filter(campus => campus.incompleteUnits.length > 0);

  }, [allUnits, allCampuses, allSubmissions, isCampusSupervisor, userProfile, selectedYear]);
  
  const handleSendReminders = async () => {
    if (!firestore || incompleteSubmissionsByCampus.length === 0) return;
    setIsSendingReminders(true);

    const batch = writeBatch(firestore);
    const reminderMessage = `Compliance Reminder: Please ensure all required EOMS reports for ${selectedYear} are submitted and revised for final approval.`;

    const campusIdsToRemind = incompleteSubmissionsByCampus.map(c => c.campusId);

    for (const campusId of campusIdsToRemind) {
        const settingRef = doc(firestore, 'campusSettings', campusId);
        batch.set(settingRef, { id: campusId, announcement: reminderMessage }, { merge: true });
    }

    try {
        await batch.commit();
        toast({
            title: 'Reminders Sent',
            description: `A verification reminder has been posted to ${campusIdsToRemind.length} campus(es).`
        });
    } catch(e) {
        console.error("Error sending reminders:", e);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'campusSettings',
            operation: 'write',
            requestResourceData: { announcement: reminderMessage },
        }));
    } finally {
        setIsSendingReminders(false);
        setIsReminderDialogOpen(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (incompleteSubmissionsByCampus.length === 0) {
    return null;
  }

  return (
    <>
    <Card className="border-destructive/20 bg-destructive/5 h-fit flex flex-col shadow-sm">
      <CardHeader className="bg-destructive/10 border-b pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <CardTitle className="text-sm font-black uppercase text-destructive flex items-center gap-2">
                    <FileX className="h-4 w-4" />
                    Zero-Approved Units
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                Units with no verified documentation.
                </CardDescription>
            </div>
            {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setIsReminderDialogOpen(true)} className="h-7 text-[9px] font-black uppercase bg-white">
                    <Send className="mr-1.5 h-3 w-3"/> Remind All
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[450px]">
            <div className="p-4">
                <Accordion type="single" collapsible className="w-full">
                    {incompleteSubmissionsByCampus.map(campus => (
                        <AccordionItem value={campus.campusId} key={campus.campusId} className="border-none">
                            <AccordionTrigger className="font-bold hover:no-underline py-2 px-2 hover:bg-muted/50 rounded-md transition-colors text-xs">
                                <div className="flex items-center gap-2">
                                    <School className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="uppercase tracking-tighter truncate max-w-[140px]">{campus.campusName}</span>
                                    <Badge variant="destructive" className="h-4 text-[8px] font-black">{campus.incompleteUnits.length}</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                                <ul className="space-y-1 pl-2">
                                {campus.incompleteUnits.map(unit => (
                                    <li key={unit.id}>
                                    <Button
                                        variant="ghost"
                                        className="flex h-auto w-full cursor-pointer items-center justify-between p-2 hover:bg-background group"
                                        onClick={() => onUnitClick(unit.id, campus.campusId)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileX className="h-3 w-3 text-muted-foreground group-hover:text-destructive" />
                                            <span className="text-[11px] font-bold text-slate-700 truncate text-left">{unit.name}</span>
                                        </div>
                                        <Badge variant="destructive" className="text-[8px] font-black h-4">0%</Badge>
                                    </Button>
                                    </li>
                                ))}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="bg-muted/5 border-t py-3">
          <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-[9px] text-muted-foreground italic leading-tight">
                  Units that have not yet received an <strong>Approved</strong> status for any mandatory documents in {selectedYear}.
              </p>
          </div>
      </CardFooter>
    </Card>

    <AlertDialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Verification Reminders</AlertDialogTitle>
                <AlertDialogDescription>
                    This will post a compliance reminder to the dashboard of all users in the {incompleteSubmissionsByCampus.length} campus(es) with zero-approved submissions for {selectedYear}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSendReminders} disabled={isSendingReminders} className="bg-primary">
                    {isSendingReminders ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                    Yes, Send Reminders
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
