
'use client';

import { useMemo, useState } from 'react';
import type { Unit, Submission, User as AppUser, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, AlertCircle, Send, Loader2, FileX } from 'lucide-react';
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

            // CRITICAL: Compliance based on APPROVED count
            const approvedSubmissions = new Set(
                unitSubmissions.filter(s => s.statusId === 'approved').map(s => `${s.reportType}-${s.cycleId}`)
            );
            
            return {
                id: unit.id,
                name: unit.name,
                count: approvedSubmissions.size,
                totalRequired: totalRequired
            };
        }).filter(unit => unit.count < unit.totalRequired);
        
        return {
            campusId: campus.id,
            campusName: campus.name,
            incompleteUnits: incompleteUnits.sort((a,b) => a.count - b.count)
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
    <Card className="border-destructive/20 bg-destructive/5">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div>
            <CardTitle className="flex items-center gap-2 text-destructive">
                <FileX className="h-5 w-5" />
                Zero-Approved Units
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Units with no verified documentation for {selectedYear}.
            </CardDescription>
        </div>
        {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setIsReminderDialogOpen(true)} className="h-8 bg-white">
                <Send className="mr-2 h-3.5 w-3.5"/>
                Remind All
            </Button>
        )}
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full" defaultValue={incompleteSubmissionsByCampus.map(c => c.campusId)}>
            {incompleteSubmissionsByCampus.map(campus => (
                 <AccordionItem value={campus.campusId} key={campus.campusId} className="border-none">
                    <AccordionTrigger className="font-bold hover:no-underline hover:bg-muted/50 rounded-md px-2 py-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs uppercase tracking-tight">{campus.campusName}</span>
                            <Badge variant="destructive" className="h-5 text-[9px] font-black">{campus.incompleteUnits.length} UNITS</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                         <List className="pl-2">
                          {campus.incompleteUnits.map(unit => (
                            <ListItem key={unit.id} className="p-0 border-none">
                              <Button
                                variant="ghost"
                                className="flex h-auto w-full cursor-pointer items-center justify-between p-2 hover:bg-background group"
                                onClick={() => onUnitClick(unit.id, campus.campusId)}
                              >
                                  <div className="flex items-center gap-3">
                                    <Building className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive" />
                                    <span className="text-xs font-bold text-slate-700 truncate">{unit.name}</span>
                                  </div>
                                  <Badge variant={unit.count === 0 ? 'destructive' : 'secondary'} className="text-[9px] font-black h-5">
                                    {unit.count} / {unit.totalRequired}
                                  </Badge>
                              </Button>
                            </ListItem>
                          ))}
                        </List>
                    </AccordionContent>
                 </AccordionItem>
            ))}
        </Accordion>
      </CardContent>
    </Card>

    <AlertDialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Verification Reminders</AlertDialogTitle>
                <AlertDialogDescription>
                    This will post a compliance reminder to the dashboard of all users in the {incompleteSubmissionsByCampus.length} campus(es) with unverified submissions for {selectedYear}. This emphasizes <strong>Approval</strong> over mere submission.
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
