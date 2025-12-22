
'use client';

import { useMemo, useState } from 'react';
import type { Unit, Submission, User as AppUser, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, AlertCircle, Send, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT } from '@/app/(dashboard)/dashboard/page';
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
  onUnitClick: (unitId: string) => void;
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
}: UnitsWithoutSubmissionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);


  const incompleteSubmissionsByCampus = useMemo(() => {
    if (!allUnits || !allSubmissions || !allCampuses) {
      return [];
    }

    const currentYear = new Date().getFullYear();

    // Create a map of units grouped by campusId
    const unitsByCampus = allUnits.reduce((acc, unit) => {
      unit.campusIds?.forEach(campusId => {
        if (!acc[campusId]) {
          acc[campusId] = [];
        }
        acc[campusId].push(unit);
      });
      return acc;
    }, {} as Record<string, Unit[]>);
    
    // Determine which campuses to show
    let relevantCampuses = allCampuses;
    if (isCampusSupervisor && userProfile?.campusId) {
        relevantCampuses = allCampuses.filter(c => c.id === userProfile.campusId);
    }

    // Process each campus
    return relevantCampuses.map(campus => {
        const campusUnits = unitsByCampus[campus.id] || [];
        const incompleteUnits = campusUnits.map(unit => {
            const unitSubmissions = allSubmissions.filter(s => s.unitId === unit.id && s.year === currentYear);
            // A unique submission is a combination of report type and cycle
            const uniqueSubmissions = new Set(unitSubmissions.map(s => `${s.reportType}-${s.cycleId}`));
            return {
                id: unit.id,
                name: unit.name,
                count: uniqueSubmissions.size
            };
        }).filter(unit => unit.count < TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT);
        
        return {
            campusId: campus.id,
            campusName: campus.name,
            incompleteUnits: incompleteUnits.sort((a,b) => a.count - b.count)
        };
    }).filter(campus => campus.incompleteUnits.length > 0); // Only include campuses with incomplete units

  }, [allUnits, allCampuses, allSubmissions, isCampusSupervisor, userProfile]);
  
  const handleSendReminders = async () => {
    if (!firestore || incompleteSubmissionsByCampus.length === 0) return;
    setIsSendingReminders(true);

    const batch = writeBatch(firestore);
    const reminderMessage = `Reminder: Please ensure all ${TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT} required EOMS reports for ${new Date().getFullYear()} are submitted as soon as possible.`;

    const campusIdsToRemind = incompleteSubmissionsByCampus.map(c => c.campusId);

    for (const campusId of campusIdsToRemind) {
        const settingRef = doc(firestore, 'campusSettings', campusId);
        batch.set(settingRef, { id: campusId, announcement: reminderMessage }, { merge: true });
    }

    try {
        await batch.commit();
        toast({
            title: 'Reminders Sent',
            description: `A reminder announcement has been posted to ${campusIdsToRemind.length} campus(es).`
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
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
            <CardTitle className="flex items-center gap-2">
                <AlertCircle className="text-destructive" />
                Incomplete Submissions by Campus
            </CardTitle>
            <CardDescription>
            The following campuses have units that have not completed all {TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT} required submissions for {new Date().getFullYear()}.
            </CardDescription>
        </div>
        {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setIsReminderDialogOpen(true)}>
                <Send className="mr-2 h-4 w-4"/>
                Send Reminders
            </Button>
        )}
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
            {incompleteSubmissionsByCampus.map(campus => (
                 <AccordionItem value={campus.campusId} key={campus.campusId}>
                    <AccordionTrigger className="font-medium">
                        {campus.campusName} ({campus.incompleteUnits.length} units)
                    </AccordionTrigger>
                    <AccordionContent>
                         <List>
                          {campus.incompleteUnits.map(unit => (
                            <ListItem key={unit.id}>
                              <Button
                                variant="ghost"
                                className="flex h-auto w-full cursor-pointer items-center justify-between p-0 hover:bg-transparent"
                                onClick={() => onUnitClick(unit.id)}
                              >
                                  <div className="flex items-center gap-3">
                                    <Building className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{unit.name}</span>
                                  </div>
                                  <Badge variant={unit.count === 0 ? 'destructive' : 'secondary'}>
                                    {unit.count} of {TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT}
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
                <AlertDialogTitle>Confirm Reminders</AlertDialogTitle>
                <AlertDialogDescription>
                    This will post a standard reminder announcement to the dashboard of all users in the {incompleteSubmissionsByCampus.length} campus(es) listed with incomplete submissions. Are you sure?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSendReminders} disabled={isSendingReminders}>
                    {isSendingReminders ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                    Yes, Send Reminders
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
